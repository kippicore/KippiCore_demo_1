import type {
  COP,
  FechaHoraISO,
  FechaISO,
  Id,
  InsumosLiquidacion,
  LiquidacionNomina,
  MesISO,
  PeriodoNomina,
  SobreComando,
} from '@/dominio/tipos';
import { calcularInsumos, nominaAprobar, ventasDelMes } from '@/dominio/comandos/nomina';
import { crearContexto } from '@/dominio/comandos/tx';
import { esFalloDominio } from '@/dominio/errores';
import { calcularComision } from '@/dominio/reglas/comisiones';
import { diasDelMes, mesDe, sumarMesesAMes } from '@/dominio/reglas/fechas';
import {
  insumosPactado,
  liquidarLaboral,
  liquidarPrestacion,
  periodosDelMes,
  type ResultadoLaboral,
  type ResultadoPrestacion,
} from '@/dominio/reglas/nomina';
import { crearSelector } from './memo';

/** Nómina (PLAN 6.23 `nomina.ts`, 6.20.5–6.20.6, W6, P15). */

const TABLAS_NOMINA = [
  'empleados',
  'contratos',
  'esquemasComision',
  'metas',
  'ventas',
  'devoluciones',
  'turnos',
  'marcaciones',
  'novedades',
  'liquidaciones',
  'parametros',
  'agregados',
] as const;

/** Periodos abiertos (sin liquidación) más antiguos con inicio ≤ hoy, por periodicidad. */
export const selPeriodoAbierto = crearSelector<{ hoy: FechaISO }, { quincenal: PeriodoNomina | null; mensual: PeriodoNomina | null }>(
  'selPeriodoAbierto',
  ['liquidaciones'],
  (e, { hoy }) => {
    const liquidado = (p: PeriodoNomina) =>
      Object.values(e.liquidaciones).some((l) => l.periodo.inicio === p.inicio && l.periodo.fin === p.fin && l.periodo.tipo === p.tipo);
    const buscar = (tipo: 'quincenal' | 'mensual') => {
      const mes = mesDe(hoy);
      for (const m of [sumarMesesAMes(mes, -1), mes])
        for (const p of periodosDelMes(m, tipo)) if (p.inicio <= hoy && !liquidado(p)) return p;
      return null;
    };
    return { quincenal: buscar('quincenal'), mensual: buscar('mensual') };
  },
);

export interface VistaPreviaNomina {
  /** La liquidación que se aprobaría (instantánea que escribiría `nomina.aprobar`), o null. */
  liquidacion: LiquidacionNomina | null;
  /** Mensaje en español si no se puede liquidar (periodo ya aprobado, sin empleados). */
  error: string | null;
}

/**
 * Vista previa del periodo abierto (P4, C1): EXACTAMENTE lo que escribiría `nomina.aprobar` (se ejecuta su
 * validación, que es pura), con ambas modalidades y la exoneración pedida.
 */
export const selVistaPreviaNomina = crearSelector<
  { periodo: PeriodoNomina; exoneracion: boolean; ahora: FechaHoraISO },
  VistaPreviaNomina
>('selVistaPreviaNomina', [...TABLAS_NOMINA, 'cuentasPorPagar', 'gastos', 'meta', 'locales', 'proveedores', 'usuarios', 'empresa', 'cuentas'], (e, { periodo, exoneracion, ahora }) => {
  const sobre: SobreComando = {
    id: 'vista-previa',
    ts: ahora,
    marcaAgua: ahora,
    usuarioId: 'u_dueno',
    rol: 'dueno',
    origen: 'usuario',
    comando: { tipo: 'nomina.aprobar', datos: { liquidacionId: 'lq_vista_previa', periodo, exoneracion114: exoneracion, insumos: null } },
  };
  try {
    const plan = nominaAprobar.validar(
      e,
      { liquidacionId: 'lq_vista_previa', periodo, exoneracion114: exoneracion, insumos: null },
      crearContexto(sobre, null),
    );
    return { liquidacion: plan.liquidacion, error: null };
  } catch (x) {
    if (esFalloDominio(x)) return { liquidacion: null, error: x.error.mensaje };
    throw x;
  }
});

export type ModoCosto = 'pactado' | 'mes_actual';

export interface CostoEmpleado {
  empleadoId: Id;
  modo: ModoCosto;
  tipo: 'laboral' | 'prestacion_servicios';
  laboral: ResultadoLaboral | null;
  prestacion: ResultadoPrestacion | null;
  insumos: InsumosLiquidacion;
  comisiones: COP;
  /** Lo que le cuesta al negocio en un mes. */
  costo: COP;
  /** Lo que recibe la persona (neto). */
  neto: COP;
  /** Barra apilada (W6): salario, comisiones, recargos, auxilio, aportes, prestaciones. */
  barras: { salario: COP; comisiones: COP; recargos: COP; auxilio: COP; aportes: COP; prestaciones: COP };
  /** Simulación con prestación de servicios por el mismo valor (comparativo lado a lado). */
  simulacionPrestacion: ResultadoPrestacion | null;
}

/**
 * Costo para el negocio de un empleado (W6, 6.20.5): 'pactado' = un mes completo con insumos en cero (el número
 * del guion: $ 2.990.941 con exoneración); 'mes_actual' = insumos reales del mes en curso hasta hoy,
 * mensualizados (comisiones, extras y recargos generan aportes y prestaciones).
 */
export const selCostoEmpleado = crearSelector<
  { empleadoId: Id; modo: ModoCosto; exoneracion: boolean; hoy: FechaISO; ahora?: FechaHoraISO; simularPrestacion?: boolean },
  CostoEmpleado | null
>('selCostoEmpleado', TABLAS_NOMINA, (e, { empleadoId, modo, exoneracion, hoy, ahora, simularPrestacion }) => {
  const em = e.empleados[empleadoId];
  const c = em ? e.contratos[em.contratoVigenteId] : undefined;
  if (!em || !c) return null;
  const p = e.parametros.nomina;
  const mes = mesDe(hoy);
  let insumos: InsumosLiquidacion;
  let comisiones = 0;
  if (modo === 'pactado') insumos = insumosPactado(30);
  else {
    const periodo = periodosDelMes(mes, 'mensual')[0] as PeriodoNomina;
    const base = calcularInsumos(e, em, c, periodo, ventasDelMes(e, mes), ahora ?? `${hoy}T23:59:00`);
    // Mensualizar lo que va del mes (horas y ventas): factor = días del mes / día de hoy.
    const factor = diasDelMes(mes) / Math.max(1, Number(hoy.slice(8, 10)));
    insumos = {
      ...base,
      horasExtraDiurnas: base.horasExtraDiurnas * factor,
      horasExtraNocturnas: base.horasExtraNocturnas * factor,
      horasRecargoNocturno: base.horasRecargoNocturno * factor,
      horasDominicalFestivo: base.horasDominicalFestivo * factor,
      ventasComisionables: Math.round(base.ventasComisionables * factor),
      ventasLocalMes: Math.round(base.ventasLocalMes * factor),
    };
    const esquema = c.esquemaComisionId ? e.esquemasComision[c.esquemaComisionId] : undefined;
    if (esquema)
      comisiones = calcularComision(esquema, {
        base: insumos.ventasComisionables,
        ventasLocalMes: insumos.ventasLocalMes,
        metaLocalMes: insumos.metaLocalMes,
      }).total;
  }
  if (c.tipo === 'laboral') {
    const r = liquidarLaboral({ contrato: c, insumos, parametros: p, exoneracion, comisiones, bonos: 0, fecha: hoy });
    const d = r.desglose;
    const sim =
      simularPrestacion && c.salarioBase
        ? liquidarPrestacion({ contrato: { honorarios: c.salarioBase, retencionFuente: null }, insumos: insumosPactado(30), parametros: p, comisiones, pilaVerificada: true })
        : null;
    return {
      empleadoId,
      modo,
      tipo: 'laboral',
      laboral: r,
      prestacion: null,
      insumos,
      comisiones,
      costo: r.costoEmpleador,
      neto: r.neto,
      barras: {
        salario: d.devengados.salario + d.devengados.incapacidad + d.devengados.vacaciones,
        comisiones: d.devengados.comisiones + d.devengados.bonos,
        recargos: d.devengados.horasExtraDiurnas + d.devengados.horasExtraNocturnas + d.devengados.recargoNocturno + d.devengados.recargoDominicalFestivo,
        auxilio: d.devengados.auxilioTransporte,
        aportes: d.totalAportes,
        prestaciones: d.totalProvisiones,
      },
      simulacionPrestacion: sim,
    };
  }
  const r = liquidarPrestacion({ contrato: c, insumos, parametros: p, comisiones, pilaVerificada: true });
  return {
    empleadoId,
    modo,
    tipo: 'prestacion_servicios',
    laboral: null,
    prestacion: r,
    insumos,
    comisiones,
    costo: r.costoEmpleador,
    neto: r.neto,
    barras: { salario: r.desglose.honorarios, comisiones: r.desglose.comisiones, recargos: 0, auxilio: 0, aportes: 0, prestaciones: 0 },
    simulacionPrestacion: null,
  };
});

export interface ComparativoModalidades {
  laboral: ResultadoLaboral;
  prestacion: ResultadoPrestacion;
  /** Diferencia de costo para el negocio (laboral − prestación). */
  diferenciaCosto: COP;
  /** Lo que le queda a la persona en cada modalidad. */
  quedaLaboral: COP;
  quedaPrestacion: COP;
}

/** "¿Cuánto me cuesta en cada modalidad?" (W6): el mismo valor mensual como salario y como honorarios. */
export const selComparativoModalidades = crearSelector<
  { valorMensual: COP; exoneracion: boolean; fecha: FechaISO; riesgoArl?: 1 | 2 | 3 | 4 | 5 },
  ComparativoModalidades
>('selComparativoModalidades', ['parametros'], (e, { valorMensual, exoneracion, fecha, riesgoArl }) => {
  const p = e.parametros.nomina;
  const laboral = liquidarLaboral({
    contrato: { salarioBase: valorMensual, riesgoArl: riesgoArl ?? 1 },
    insumos: insumosPactado(30),
    parametros: p,
    exoneracion,
    comisiones: 0,
    bonos: 0,
    fecha,
  });
  const prestacion = liquidarPrestacion({
    contrato: { honorarios: valorMensual, retencionFuente: null },
    insumos: insumosPactado(30),
    parametros: p,
    comisiones: 0,
    pilaVerificada: true,
  });
  return {
    laboral,
    prestacion,
    diferenciaCosto: laboral.costoEmpleador - prestacion.costoEmpleador,
    quedaLaboral: laboral.neto,
    quedaPrestacion: prestacion.loQueLeQueda,
  };
});

export interface CostoNominaLocal {
  localId: Id | 'general';
  nombre: string;
  costo: COP;
  ventas: COP;
  /** costo / ventas (P15). */
  porcentaje: number | null;
}

/**
 * Costo de la nómina por local en un mes (P15): costo empleador de las liquidaciones con fin en el mes, sobre
 * las ventas con IVA del local en ese mes (ventas reconocidas por su total, como la medición de referencia).
 */
export const selCostoNominaPorLocal = crearSelector<{ mes: MesISO }, { locales: CostoNominaLocal[]; total: COP }>(
  'selCostoNominaPorLocal',
  ['liquidaciones', 'ventas', 'locales'],
  (e, { mes }) => {
    const costo = new Map<string, number>();
    let total = 0;
    for (const l of Object.values(e.liquidaciones)) {
      if (!l.periodo.fin.startsWith(mes)) continue;
      for (const x of l.lineas) {
        const k = x.localId ?? 'general';
        costo.set(k, (costo.get(k) ?? 0) + x.costoEmpleador);
        total += x.costoEmpleador;
      }
    }
    const ventas = new Map<string, number>();
    for (const v of Object.values(e.ventas)) {
      if (v.anulacion || v.separado?.cerrado?.resultado === 'cancelado' || !v.ts.startsWith(mes)) continue;
      ventas.set(v.localId, (ventas.get(v.localId) ?? 0) + v.total);
    }
    const locales: CostoNominaLocal[] = Object.values(e.locales)
      .filter((l) => !l.eliminadoEn)
      .sort((a, b) => a.orden - b.orden)
      .map((l) => {
        const c = costo.get(l.id) ?? 0;
        const v = ventas.get(l.id) ?? 0;
        return { localId: l.id, nombre: l.nombre, costo: c, ventas: v, porcentaje: l.vende && v > 0 ? c / v : null };
      });
    if (costo.has('general')) locales.push({ localId: 'general', nombre: 'Administración', costo: costo.get('general') ?? 0, ventas: 0, porcentaje: null });
    return { locales, total };
  },
);

export const selLiquidacion = crearSelector<{ liquidacionId: Id }, LiquidacionNomina | null>(
  'selLiquidacion',
  ['liquidaciones'],
  (e, { liquidacionId }) => e.liquidaciones[liquidacionId] ?? null,
);

/** Historial de liquidaciones (más recientes primero). */
export const selLiquidaciones = crearSelector<void, LiquidacionNomina[]>('selLiquidaciones', ['liquidaciones'], (e) =>
  Object.values(e.liquidaciones).sort((a, b) => (a.periodo.fin < b.periodo.fin ? 1 : a.periodo.fin > b.periodo.fin ? -1 : a.periodo.tipo < b.periodo.tipo ? -1 : 1)),
);

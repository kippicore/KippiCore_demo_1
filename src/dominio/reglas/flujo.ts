import type { COP, DiaSemana, FechaISO, Id, MesISO, ParametrosObligaciones } from '../tipos';
import { prorratearMayorResiduo } from './dinero';
import {
  diaHabilDelMes,
  diaSemana,
  diferenciaDias,
  diasDelMes,
  esDiaHabil,
  lunesDe,
  mesDe,
  rangoFechas,
  siguienteDiaHabil,
  sumarDias,
  sumarMesesAMes,
} from './fechas';

/**
 * Flujo de caja proyectado (PLAN 6.20.9). Funciones puras: el selector reúne los datos, estas funciones
 * arman los movimientos SIN duplicar (recurrentes ya generados, aportes solo en la PILA) y la serie diaria.
 * Lo usa también la calibración del generador (7.10).
 */
export type TipoMovimientoFlujo =
  | 'ventas'
  | 'datafono'
  | 'separados'
  | 'cuenta_por_pagar'
  | 'recurrente'
  | 'nomina_neto'
  | 'pila'
  | 'prima'
  | 'cesantias'
  | 'intereses'
  | 'iva'
  | 'retencion'
  | 'ica';

export interface MovimientoFlujo {
  fecha: FechaISO;
  /** Con signo: + ingreso, − egreso. */
  valor: COP;
  tipo: TipoMovimientoFlujo;
  concepto: string;
  refId: Id | null;
}

export interface PuntoFlujo {
  fecha: FechaISO;
  ingresos: COP;
  egresos: COP;
  saldo: COP;
}

export interface ResultadoFlujo {
  serie: PuntoFlujo[];
  puntoBajo: PuntoFlujo;
  /** Egresos de la semana del punto bajo, de mayor a menor (la explicación la redacta el selector). */
  semanaPuntoBajo: { lunes: FechaISO; egresos: MovimientoFlujo[] };
}

/** Serie diaria desde mañana hasta hoy + días; los movimientos vencidos (fecha ≤ hoy) se cargan mañana. */
export function proyectarFlujo(e: {
  hoy: FechaISO;
  dias: number;
  saldoInicial: COP;
  movimientos: readonly MovimientoFlujo[];
}): ResultadoFlujo {
  const desde = sumarDias(e.hoy, 1);
  const hasta = sumarDias(e.hoy, e.dias);
  const porDia = new Map<FechaISO, { ingresos: number; egresos: number; movs: MovimientoFlujo[] }>();
  for (const f of rangoFechas(desde, hasta)) porDia.set(f, { ingresos: 0, egresos: 0, movs: [] });
  for (const m of e.movimientos) {
    if (m.fecha > hasta) continue;
    const dia = porDia.get(m.fecha < desde ? desde : m.fecha);
    if (!dia) continue;
    if (m.valor >= 0) dia.ingresos += m.valor;
    else dia.egresos += -m.valor;
    dia.movs.push(m);
  }
  let saldo = e.saldoInicial;
  const serie: PuntoFlujo[] = [];
  let puntoBajo: PuntoFlujo = { fecha: e.hoy, ingresos: 0, egresos: 0, saldo };
  for (const [fecha, d] of porDia) {
    saldo += d.ingresos - d.egresos;
    const p = { fecha, ingresos: d.ingresos, egresos: d.egresos, saldo };
    serie.push(p);
    if (saldo < puntoBajo.saldo) puntoBajo = p;
  }
  const lunes = lunesDe(puntoBajo.fecha);
  const domingo = sumarDias(lunes, 6);
  const egresos: MovimientoFlujo[] = [];
  for (const [fecha, d] of porDia) {
    if (fecha >= lunes && fecha <= domingo) for (const m of d.movs) if (m.valor < 0) egresos.push(m);
  }
  egresos.sort((a, b) => a.valor - b.valor);
  return { serie, puntoBajo, semanaPuntoBajo: { lunes, egresos } };
}

/** Ingresos de ventas proyectados: promedio por día de la semana × (índice del mes / índice del mes actual). */
export function ingresosVentas(e: {
  hoy: FechaISO;
  dias: number;
  /** Cobros de contado que no son datáfono (efectivo, billeteras, transferencias), promedio por día de la semana. */
  promedioContado: Record<DiaSemana, COP>;
  /** Cobrado con datáfono, neto de comisión y retenciones, promedio por día de la semana (se desplaza al abono). */
  promedioDatafonoNeto: Record<DiaSemana, COP>;
  indiceMes: Record<number, number>;
  diasCerrados: readonly string[];
  festivos: ReadonlySet<FechaISO>;
}): MovimientoFlujo[] {
  const r: MovimientoFlujo[] = [];
  const indiceActual = e.indiceMes[Number(e.hoy.slice(5, 7))] ?? 1;
  for (const f of rangoFechas(sumarDias(e.hoy, 1), sumarDias(e.hoy, e.dias))) {
    if (e.diasCerrados.includes(f.slice(5, 10))) continue;
    const factor = (e.indiceMes[Number(f.slice(5, 7))] ?? 1) / indiceActual;
    const ds = diaSemana(f);
    const contado = Math.round((e.promedioContado[ds] ?? 0) * factor);
    if (contado)
      r.push({ fecha: f, valor: contado, tipo: 'ventas', concepto: 'Ventas de contado', refId: null });
    const tarjeta = Math.round((e.promedioDatafonoNeto[ds] ?? 0) * factor);
    if (tarjeta) {
      r.push({
        fecha: siguienteDiaHabil(f, e.festivos),
        valor: tarjeta,
        tipo: 'datafono',
        concepto: 'Abono del datáfono',
        refId: null,
      });
    }
  }
  return r;
}

/** Abonos esperados de separados: el saldo repartido por igual hasta su fecha límite. */
export function ingresosSeparados(
  hoy: FechaISO,
  separados: readonly { ventaId: Id; saldo: COP; fechaLimite: FechaISO }[],
): MovimientoFlujo[] {
  const r: MovimientoFlujo[] = [];
  for (const s of separados) {
    if (s.saldo <= 0) continue;
    const desde = sumarDias(hoy, 1);
    const hasta = s.fechaLimite < desde ? desde : s.fechaLimite;
    const dias = rangoFechas(desde, hasta);
    const partes = prorratearMayorResiduo(
      s.saldo,
      dias.map(() => 1),
    );
    dias.forEach((f, i) => {
      const v = partes[i] ?? 0;
      if (v)
        r.push({ fecha: f, valor: v, tipo: 'separados', concepto: 'Abonos de separados', refId: s.ventaId });
    });
  }
  return r;
}

/** Cuentas por pagar pendientes en `programadaPara ?? fechaVencimiento` (saldo en COP a la tasa vigente). */
export function egresosCuentasPorPagar(
  cxps: readonly { id: Id; saldoCop: COP; fecha: FechaISO; concepto: string }[],
): MovimientoFlujo[] {
  return cxps
    .filter((c) => c.saldoCop > 0)
    .map((c) => ({
      fecha: c.fecha,
      valor: -c.saldoCop,
      tipo: 'cuenta_por_pagar' as const,
      concepto: c.concepto,
      refId: c.id,
    }));
}

/**
 * Gastos recurrentes futuros, EXCLUYENDO los (recurrente, mes) que ya tienen gasto o cuenta por pagar
 * generada: así un arriendo ya causado no se cuenta dos veces.
 */
export function egresosRecurrentes(e: {
  hoy: FechaISO;
  dias: number;
  recurrentes: readonly {
    id: Id;
    nombre: string;
    valor: COP;
    diaDelMes: number;
    diasPlazo: number;
    desde: MesISO;
    hasta: MesISO | null;
    activo: boolean;
  }[];
  /** Claves `${recurrenteId}|${mes}` ya generadas. */
  generados: ReadonlySet<string>;
}): MovimientoFlujo[] {
  const r: MovimientoFlujo[] = [];
  const hasta = sumarDias(e.hoy, e.dias);
  for (let mes = mesDe(e.hoy); `${mes}-01` <= hasta; mes = sumarMesesAMes(mes, 1)) {
    for (const g of e.recurrentes) {
      if (!g.activo || mes < g.desde || (g.hasta !== null && mes > g.hasta)) continue;
      if (e.generados.has(`${g.id}|${mes}`)) continue;
      const dia = Math.min(g.diaDelMes, diasDelMes(mes));
      const fecha = sumarDias(`${mes}-${dia < 10 ? `0${dia}` : dia}`, g.diasPlazo);
      if (fecha <= e.hoy || fecha > hasta) continue;
      r.push({ fecha, valor: -g.valor, tipo: 'recurrente', concepto: g.nombre, refId: g.id });
    }
  }
  return r;
}

/**
 * Nómina como se paga (6.20.9): neto de cada quincena (días 15 y último; los mensuales, el último),
 * seguridad social en la PILA (día hábil `pilaDiaHabil` del mes siguiente), prima en sus dos fechas, cesantías e
 * intereses en las suyas. Las provisiones no se pagan cada quincena y los aportes no se suman dos veces.
 */
export function egresosNomina(e: {
  hoy: FechaISO;
  dias: number;
  /** Neto a pagar por periodo (de la última liquidación o de la vista previa). */
  netoQuincena: COP;
  /** Neto de la 2.ª quincena (lleva las comisiones del mes); por defecto, `netoQuincena`. */
  netoSegundaQuincena?: COP;
  netoMensual: COP;
  /** Seguridad social de un mes completo: aportes del empleador + deducciones del trabajador. */
  pilaMensual: COP;
  primaSemestral: COP;
  cesantiasAnuales: COP;
  interesesAnuales: COP;
  obligaciones: ParametrosObligaciones;
  festivos: ReadonlySet<FechaISO>;
  /** Fechas en que ya existe la cuenta por pagar (no se proyectan otra vez). */
  yaCausadas: ReadonlySet<string>;
}): MovimientoFlujo[] {
  const r: MovimientoFlujo[] = [];
  const hasta = sumarDias(e.hoy, e.dias);
  // Lo de hoy que aún no se causó (la nómina de las 6:00 p. m.) también cuenta: se carga mañana.
  const dentro = (f: FechaISO) => f >= e.hoy && f <= hasta;
  const push = (fecha: FechaISO, valor: COP, tipo: TipoMovimientoFlujo, concepto: string) => {
    if (valor && dentro(fecha) && !e.yaCausadas.has(`${tipo}|${fecha}`))
      r.push({ fecha, valor: -valor, tipo, concepto, refId: null });
  };
  for (let mes = sumarMesesAMes(mesDe(e.hoy), -1); `${mes}-01` <= hasta; mes = sumarMesesAMes(mes, 1)) {
    const ultimo = `${mes}-${diasDelMes(mes)}`;
    push(`${mes}-15`, e.netoQuincena, 'nomina_neto', 'Nómina · 1.ª quincena');
    push(ultimo, (e.netoSegundaQuincena ?? e.netoQuincena) + e.netoMensual, 'nomina_neto', 'Nómina · 2.ª quincena');
    const siguiente = sumarMesesAMes(mes, 1);
    push(
      diaHabilDelMes(siguiente, e.obligaciones.pilaDiaHabil, e.festivos),
      e.pilaMensual,
      'pila',
      'Seguridad social (PILA)',
    );
    const md = mes.slice(5, 7);
    for (const fp of e.obligaciones.primaFechas)
      if (fp.slice(0, 2) === md)
        push(`${mes}-${fp.slice(3, 5)}`, e.primaSemestral, 'prima', 'Prima de servicios');
    if (e.obligaciones.cesantiasFecha.slice(0, 2) === md)
      push(
        `${mes}-${e.obligaciones.cesantiasFecha.slice(3, 5)}`,
        e.cesantiasAnuales,
        'cesantias',
        'Cesantías',
      );
    if (e.obligaciones.interesesCesantiasFecha.slice(0, 2) === md)
      push(
        `${mes}-${e.obligaciones.interesesCesantiasFecha.slice(3, 5)}`,
        e.interesesAnuales,
        'intereses',
        'Intereses sobre cesantías',
      );
  }
  return r.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
}

/** Vencimientos tributarios ilustrativos entre dos fechas (IVA e ICA bimestrales, retención mensual). */
export function vencimientosTributarios(
  desde: FechaISO,
  hasta: FechaISO,
  o: ParametrosObligaciones,
): { tipo: 'iva' | 'retencion' | 'ica'; fecha: FechaISO; periodo: MesISO[] }[] {
  const r: { tipo: 'iva' | 'retencion' | 'ica'; fecha: FechaISO; periodo: MesISO[] }[] = [];
  const dia = (mes: MesISO, d: number) => `${mes}-${String(Math.min(d, diasDelMes(mes))).padStart(2, '0')}`;
  for (let mes = sumarMesesAMes(mesDe(desde), -1); `${mes}-01` <= hasta; mes = sumarMesesAMes(mes, 1)) {
    const siguiente = sumarMesesAMes(mes, 1);
    const ret = dia(siguiente, o.retencionVencimientoDia);
    if (ret >= desde && ret <= hasta) r.push({ tipo: 'retencion', fecha: ret, periodo: [mes] });
    if (Number(mes.slice(5, 7)) % 2 === 0) {
      const periodo = [sumarMesesAMes(mes, -1), mes];
      const iva = dia(siguiente, o.ivaVencimientoDia);
      const ica = dia(siguiente, o.icaVencimientoDia);
      if (iva >= desde && iva <= hasta) r.push({ tipo: 'iva', fecha: iva, periodo });
      if (ica >= desde && ica <= hasta) r.push({ tipo: 'ica', fecha: ica, periodo });
    }
  }
  return r.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
}

/** Días desde hoy hasta una fecha (para "en 2 semanas"). */
export function diasHasta(hoy: FechaISO, fecha: FechaISO): number {
  return diferenciaDias(hoy, fecha);
}

export { esDiaHabil };

import type { COP, EstadoDominio, FechaISO, Id } from '../tipos';
import { NOMBRES_OBLIGACIONES } from '@/config/obligaciones';
import { saldoCxP } from './cuentas';
import { calcularCostoAterrizado } from './costeo';
import { copDeCentavos } from './dinero';
import { diaSemana, mesDe, sumarDias } from './fechas';
import {
  egresosCuentasPorPagar,
  egresosNomina,
  egresosRecurrentes,
  ingresosSeparados,
  ingresosVentas,
  type MovimientoFlujo,
  proyectarFlujo,
  type ResultadoFlujo,
  vencimientosTributarios,
} from './flujo';
import { totalPagado } from './ventas';

/**
 * Flujo de caja proyectado a partir del estado (PLAN 6.20.9, 7.10, P19, N13). Reúne los insumos de las
 * funciones puras de `flujo.ts` sin duplicar: lo causado (cuentas por pagar, liquidaciones, gastos recurrentes
 * del mes) no se vuelve a proyectar. La usan la calibración del generador (ancla − 3) y `selFlujoProyectado`
 * (F2-B), así la cifra que calibra el generador es la misma que ve el dueño.
 */
export interface OpcionesFlujoEstado {
  hoy: FechaISO;
  dias: number;
  /** Índice estacional por mes (1 = enero). */
  indiceMes: Record<number, number>;
  /** 'MM-DD' de los días cerrados. */
  diasCerrados: readonly string[];
  festivos: ReadonlySet<FechaISO>;
  /** Semanas de historia para el promedio de cobros por día de la semana (por defecto 8). */
  semanasHistoria?: number;
  /**
   * Hora actual ('HH:mm'): lo que falta por vender hoy también se proyecta (proporcional a la parte del horario
   * que queda), así el punto bajo no salta a lo largo del día. Sin hora, el día de hoy se da por cerrado.
   */
  hora?: string;
}

export interface FlujoEstado extends ResultadoFlujo {
  saldoInicial: COP;
  movimientos: MovimientoFlujo[];
}

const MEDIOS_CONTADO = new Set([
  'efectivo',
  'nequi',
  'daviplata',
  'transferencia',
  'qr_bre_b',
  'credito_financiera',
  'pasarela_web',
]);

function tasaVigente(estado: EstadoDominio, moneda: 'USD' | 'CNY', fecha: FechaISO): number {
  let mejor: { fecha: string; valor: number } | null = null;
  for (const t of Object.values(estado.tasas))
    if (t.moneda === moneda && t.fecha <= fecha && (!mejor || t.fecha > mejor.fecha)) mejor = t;
  return mejor?.valor ?? 0;
}

/**
 * Lo que falta girar de las importaciones en curso y aún no es cuenta por pagar: tributos aduaneros al iniciar la
 * nacionalización (M8), flete al embarcar, agente y bodegaje al levante y transporte a Bogotá, en sus fechas
 * estimadas (valores de la importación, convertidos con la tasa vigente).
 */
export function egresosImportacionesEnCurso(estado: EstadoDominio, hoy: FechaISO, dias: number): MovimientoFlujo[] {
  const r: MovimientoFlujo[] = [];
  const hasta = sumarDias(hoy, dias);
  const causadas = new Map<Id, Set<string>>();
  for (const c of Object.values(estado.cuentasPorPagar)) {
    if (c.eliminadoEn || c.documento?.tipo !== 'importacion') continue;
    const s = causadas.get(c.documento.id) ?? new Set<string>();
    s.add(c.categoria);
    causadas.set(c.documento.id, s);
  }
  for (const imp of Object.values(estado.importaciones)) {
    if (imp.eliminadoEn || imp.estado === 'recibido_bodega' || imp.estado === 'cotizado') continue;
    const ya = causadas.get(imp.id) ?? new Set<string>();
    const tasa = tasaVigente(estado, imp.moneda, hoy) || imp.tasaPedido;
    const costeo = calcularCostoAterrizado({
      lineas: imp.lineas,
      costos: imp.costos,
      moneda: imp.moneda,
      metodoProrrateo: imp.metodoProrrateo,
      tasaCosteo: tasa,
    });
    const agregar = (categoria: string, fecha: FechaISO, valor: COP, concepto: string) => {
      if (ya.has(categoria) || valor <= 0) return;
      const f = fecha <= hoy ? sumarDias(hoy, 1) : fecha;
      if (f > hasta) return;
      r.push({ fecha: f, valor: -valor, tipo: 'cuenta_por_pagar', concepto: `${concepto} ${imp.numero}`, refId: imp.id });
    };
    const h = imp.hitos;
    agregar('tributos_aduaneros', h.en_nacionalizacion.real ?? h.en_nacionalizacion.estimada, costeo.tributos, 'Tributos aduaneros');
    agregar('agente_carga', sumarDias(h.embarcado.real ?? h.embarcado.estimada, 15), costeo.flete, 'Flete internacional');
    agregar('agente_aduanas', sumarDias(h.nacionalizado.real ?? h.nacionalizado.estimada, 10), imp.costos.honorariosAgente + imp.costos.bodegajePuerto, 'Agente de aduanas y bodegaje');
    agregar('transporte', sumarDias(h.en_transporte_bogota.real ?? h.en_transporte_bogota.estimada, 15), imp.costos.transporteInterno, 'Transporte a Bogotá');
  }
  return r;
}

/** Prima semestral, cesantías e intereses anuales estimados de los contratos laborales vigentes. */
export function prestacionesEstimadas(
  estado: EstadoDominio,
  fecha: FechaISO,
): { primaSemestral: COP; cesantiasAnuales: COP; interesesAnuales: COP } {
  const p = estado.parametros.nomina;
  let base = 0;
  for (const e of Object.values(estado.empleados)) {
    if (e.eliminadoEn || e.fechaIngreso > fecha || (e.fechaRetiro !== null && e.fechaRetiro < fecha)) continue;
    const c = estado.contratos[e.contratoVigenteId];
    if (!c || c.tipo !== 'laboral' || c.salarioBase === null) continue;
    const auxilio = c.salarioBase <= p.smmlv * p.topeAuxilioSMMLV ? p.auxilioTransporte : 0;
    base += c.salarioBase + auxilio;
  }
  const cesantias = Math.round(base);
  return {
    primaSemestral: Math.round(base / 2),
    cesantiasAnuales: cesantias,
    interesesAnuales: Math.round(cesantias * p.provisiones.interesesCesantiasAnual),
  };
}

export function proyeccionFlujoEstado(estado: EstadoDominio, o: OpcionesFlujoEstado): FlujoEstado {
  const { hoy, dias } = o;
  let saldoInicial = 0;
  for (const c of Object.values(estado.cuentas)) {
    if (c.eliminadoEn) continue;
    saldoInicial += estado.agregados.saldosCuentas[c.id] ?? 0;
  }

  // Cobros promedio por día de la semana (últimas semanas): contado y datáfono neto.
  const semanas = o.semanasHistoria ?? 8;
  const desde = sumarDias(hoy, -7 * semanas);
  const contado: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const datafono: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const separados: { ventaId: Id; saldo: COP; fechaLimite: FechaISO }[] = [];
  for (const v of Object.values(estado.ventas)) {
    if (v.anulacion) continue;
    if (v.tipo === 'separado' && v.separado && !v.separado.cerrado) {
      const saldo = v.total - totalPagado(v);
      if (saldo > 0) separados.push({ ventaId: v.id, saldo, fechaLimite: v.separado.fechaLimite });
    }
    const f = v.ts.slice(0, 10);
    if (f < desde || f >= hoy) continue;
    const ds = diaSemana(f);
    for (const p of v.pagos) {
      if (p.tipo !== 'pago') continue;
      if (p.medio === 'datafono_debito' || p.medio === 'datafono_credito')
        datafono[ds] = (datafono[ds] ?? 0) + p.valor;
      else if (MEDIOS_CONTADO.has(p.medio)) contado[ds] = (contado[ds] ?? 0) + p.valor;
    }
  }
  const d = estado.parametros.datafono;
  const iva = estado.parametros.impuestos.ivaGeneral;
  const netoDatafono =
    1 -
    (0.6 * d.comisionDebito + 0.4 * d.comisionCredito) -
    (d.retenciones.fuente + d.retenciones.ica) / (1 + iva) -
    (d.retenciones.iva * iva) / (1 + iva);
  const promedioContado = {} as Record<0 | 1 | 2 | 3 | 4 | 5 | 6, COP>;
  const promedioDatafonoNeto = {} as Record<0 | 1 | 2 | 3 | 4 | 5 | 6, COP>;
  for (let ds = 0; ds < 7; ds++) {
    promedioContado[ds as 0] = Math.round((contado[ds] ?? 0) / semanas);
    promedioDatafonoNeto[ds as 0] = Math.round(((datafono[ds] ?? 0) * netoDatafono) / semanas);
  }

  // Cuentas por pagar pendientes.
  const cxps: { id: Id; saldoCop: COP; fecha: FechaISO; concepto: string }[] = [];
  const yaCausadas = new Set<string>();
  const ultimos: Record<'iva' | 'retencion' | 'ica', { fecha: FechaISO; valor: COP } | null> = {
    iva: null,
    retencion: null,
    ica: null,
  };
  let pilaMes = '';
  let pilaMensual = 0;
  for (const c of Object.values(estado.cuentasPorPagar)) {
    if (c.eliminadoEn) continue;
    if (c.categoria === 'seguridad_social') {
      yaCausadas.add(`pila|${c.fechaVencimiento}`);
      const mes = mesDe(c.fechaEmision);
      if (mes > pilaMes) {
        pilaMes = mes;
        pilaMensual = 0;
      }
      if (mes === pilaMes) pilaMensual += c.valor;
    }
    if (c.categoria === 'prestaciones') {
      if (c.concepto.startsWith(NOMBRES_OBLIGACIONES.prima)) yaCausadas.add(`prima|${c.fechaVencimiento}`);
      if (c.concepto.startsWith(NOMBRES_OBLIGACIONES.cesantias)) yaCausadas.add(`cesantias|${c.fechaVencimiento}`);
      if (c.concepto.startsWith(NOMBRES_OBLIGACIONES.interesesCesantias))
        yaCausadas.add(`intereses|${c.fechaVencimiento}`);
    }
    if (c.categoria === 'impuestos') {
      for (const tipo of ['iva', 'retencion', 'ica'] as const) {
        if (!c.concepto.startsWith(NOMBRES_OBLIGACIONES[tipo])) continue;
        yaCausadas.add(`${tipo}|${c.fechaVencimiento}`);
        const u = ultimos[tipo];
        if (!u || c.fechaVencimiento > u.fecha) ultimos[tipo] = { fecha: c.fechaVencimiento, valor: c.valor };
      }
    }
    const saldo = saldoCxP(c);
    if (saldo <= 0) continue;
    const saldoCop = c.moneda === 'COP' ? saldo : copDeCentavos(saldo, tasaVigente(estado, c.moneda, hoy));
    cxps.push({ id: c.id, saldoCop, fecha: c.programadaPara ?? c.fechaVencimiento, concepto: c.concepto });
  }

  // Nómina: neto de la última liquidación de cada periodicidad.
  let netoQuincena = 0;
  let netoSegundaQuincena = 0;
  let netoMensual = 0;
  let finQ = '';
  let finQ2 = '';
  let finM = '';
  for (const l of Object.values(estado.liquidaciones)) {
    yaCausadas.add(`nomina_neto|${l.periodo.fin}`);
    const primera = l.periodo.fin.slice(8, 10) === '15';
    if (l.periodo.tipo === 'quincenal' && primera && l.periodo.fin > finQ) {
      finQ = l.periodo.fin;
      netoQuincena = l.totales.neto;
    }
    if (l.periodo.tipo === 'quincenal' && !primera && l.periodo.fin > finQ2) {
      finQ2 = l.periodo.fin;
      netoSegundaQuincena = l.totales.neto;
    }
    if (l.periodo.tipo === 'mensual' && l.periodo.fin > finM) {
      finM = l.periodo.fin;
      netoMensual = l.totales.neto;
    }
  }
  const generados = new Set<string>();
  for (const g of Object.values(estado.gastos))
    if (g.recurrenteId && !g.eliminadoEn) generados.add(`${g.recurrenteId}|${mesDe(g.fecha)}`);
  const recurrentes = Object.values(estado.gastosRecurrentes)
    .filter((r) => !r.eliminadoEn)
    .map((r) => ({
      id: r.id,
      nombre: r.nombre,
      valor: r.valor,
      diaDelMes: r.diaDelMes,
      diasPlazo: r.formaPago === 'debito_automatico' ? 0 : r.diasPlazo,
      desde: r.desde,
      hasta: r.hasta,
      activo: r.activo,
    }));
  const prest = prestacionesEstimadas(estado, hoy);

  // Lo que falta vender hoy (entre las 10:00 a. m. y las 8:00 p. m., en proporción al tiempo que queda).
  const restanteHoy: MovimientoFlujo[] = [];
  if (o.hora && !o.diasCerrados.includes(hoy.slice(5, 10))) {
    const min = Number(o.hora.slice(0, 2)) * 60 + Number(o.hora.slice(3, 5));
    const queda = Math.max(0, Math.min(1, (20 * 60 - min) / 600));
    const ds = diaSemana(hoy) as 0;
    const contadoHoy = Math.round((promedioContado[ds] ?? 0) * queda);
    const tarjetaHoy = Math.round((promedioDatafonoNeto[ds] ?? 0) * queda);
    if (contadoHoy) restanteHoy.push({ fecha: hoy, valor: contadoHoy, tipo: 'ventas', concepto: 'Ventas de contado', refId: null });
    if (tarjetaHoy) {
      let f = sumarDias(hoy, 1);
      while (diaSemana(f) === 0 || diaSemana(f) === 6 || o.festivos.has(f)) f = sumarDias(f, 1);
      restanteHoy.push({ fecha: f, valor: tarjetaHoy, tipo: 'datafono', concepto: 'Abono del datáfono', refId: null });
    }
  }

  const movimientos: MovimientoFlujo[] = [
    ...restanteHoy,
    ...ingresosVentas({
      hoy,
      dias,
      promedioContado,
      promedioDatafonoNeto,
      indiceMes: o.indiceMes,
      diasCerrados: o.diasCerrados,
      festivos: o.festivos,
    }),
    ...ingresosSeparados(hoy, separados),
    ...egresosCuentasPorPagar(cxps),
    ...egresosRecurrentes({ hoy, dias, recurrentes, generados }),
    ...egresosNomina({
      hoy,
      dias,
      netoQuincena,
      netoSegundaQuincena: netoSegundaQuincena || netoQuincena,
      netoMensual,
      pilaMensual,
      primaSemestral: prest.primaSemestral,
      cesantiasAnuales: prest.cesantiasAnuales,
      interesesAnuales: prest.interesesAnuales,
      obligaciones: estado.parametros.obligaciones,
      festivos: o.festivos,
      yaCausadas,
    }),
  ];
  movimientos.push(...egresosImportacionesEnCurso(estado, hoy, dias));
  for (const v of vencimientosTributarios(sumarDias(hoy, 1), sumarDias(hoy, dias), estado.parametros.obligaciones)) {
    if (yaCausadas.has(`${v.tipo}|${v.fecha}`)) continue;
    const valor = ultimos[v.tipo]?.valor ?? 0;
    if (valor > 0)
      movimientos.push({ fecha: v.fecha, valor: -valor, tipo: v.tipo, concepto: NOMBRES_OBLIGACIONES[v.tipo], refId: null });
  }
  const r = proyectarFlujo({ hoy, dias, saldoInicial, movimientos });
  return { ...r, saldoInicial, movimientos };
}

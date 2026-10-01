import type {
  AbonoDatafono,
  CategoriaCxP,
  COP,
  CuentaDinero,
  CuentaPorCobrar,
  CuentaPorPagar,
  FechaHoraISO,
  FechaISO,
  Id,
  MedioPago,
  MovimientoCuenta,
  PagoVenta,
} from '@/dominio/tipos';
import { diasParaVencer, estadoCxC, estadoCxP, type EstadoCxP, saldoCxP, saldoCxPCop } from '@/dominio/reglas/cuentas';
import { calcularAbonoDatafono } from '@/dominio/reglas/datafono';
import { proyeccionFlujoEstado, type FlujoEstado } from '@/dominio/reglas/flujo-estado';
import { conjuntoFestivos } from '@/dominio/reglas/festivos';
import { lunesDe, sumarDias } from '@/dominio/reglas/fechas';
import { saldoVenta } from '@/dominio/reglas/ventas';
import { DIAS_CERRADOS } from '@/config/locales';
import { INDICE_MES } from '@/seed/estacionalidad';
import { crearSelector } from './memo';
import { selTasaVigente } from './base';
import { selDevolucionesPorVenta } from './ventas';
import { enumerar, montoExtranjero, pesosEnPalabras, relativaDias } from './texto';

/** Plata: por pagar, por cobrar, cuentas, conciliación, datáfono y flujo (PLAN 6.23 `finanzas.ts`). */

export interface FilaCxP {
  cxp: CuentaPorPagar;
  estado: EstadoCxP;
  /** Saldo en su moneda (COP: pesos; USD/CNY: centavos). */
  saldoOrigen: number;
  /** Saldo en COP (USD/CNY a la tasa vigente). */
  saldoCop: COP;
  /** programadaPara ?? fechaVencimiento. */
  fechaPago: FechaISO;
  diasParaVencer: number;
}

export const selCuentasPorPagar = crearSelector<
  {
    hoy: FechaISO;
    estado?: EstadoCxP | 'pendientes';
    categoria?: CategoriaCxP;
    localId?: Id | 'todos';
    desde?: FechaISO;
    hasta?: FechaISO;
    proveedorId?: Id;
  },
  { filas: FilaCxP[]; totalCop: COP; vencidoCop: COP }
>('selCuentasPorPagar', ['cuentasPorPagar', 'tasas'], (e, f) => {
  const filas: FilaCxP[] = [];
  let totalCop = 0;
  let vencidoCop = 0;
  for (const c of Object.values(e.cuentasPorPagar)) {
    if (c.eliminadoEn) continue;
    if (f.categoria && c.categoria !== f.categoria) continue;
    if (f.proveedorId && c.proveedorId !== f.proveedorId) continue;
    if (f.localId && f.localId !== 'todos' && c.localId !== f.localId) continue;
    const est = estadoCxP(c, f.hoy);
    if (f.estado === 'pendientes' ? est === 'pagado' : f.estado && est !== f.estado) continue;
    const fechaPago = c.programadaPara ?? c.fechaVencimiento;
    if (f.desde && fechaPago < f.desde) continue;
    if (f.hasta && fechaPago > f.hasta) continue;
    const tasa = c.moneda === 'COP' ? null : selTasaVigente(e, { moneda: c.moneda, fecha: f.hoy });
    const saldoCop = saldoCxPCop(c, tasa);
    filas.push({ cxp: c, estado: est, saldoOrigen: saldoCxP(c), saldoCop, fechaPago, diasParaVencer: diasParaVencer(c.fechaVencimiento, f.hoy) });
    if (est !== 'pagado') totalCop += saldoCop;
    if (est === 'vencido') vencidoCop += saldoCop;
  }
  filas.sort((a, b) => (a.fechaPago < b.fechaPago ? -1 : a.fechaPago > b.fechaPago ? 1 : a.cxp.numero < b.cxp.numero ? -1 : 1));
  return { filas, totalCop, vencidoCop };
});

/** Por cobrar (100 % derivado de ventas): separados y créditos con saldo (6.12, V3). */
export const selCuentasPorCobrar = crearSelector<
  { hoy: FechaISO; filtro?: 'separados-por-vencer' | 'vencidos' | 'credito'; localId?: Id | 'todos' },
  { filas: CuentaPorCobrar[]; saldo: COP }
>('selCuentasPorCobrar', ['ventas', 'devoluciones'], (e, { hoy, filtro, localId }) => {
  const devs = selDevolucionesPorVenta(e);
  const filas: CuentaPorCobrar[] = [];
  for (const v of Object.values(e.ventas)) {
    if (v.anulacion) continue;
    if (localId && localId !== 'todos' && v.localId !== localId) continue;
    const esSeparado = v.tipo === 'separado' && v.separado && !v.separado.cerrado;
    const esCredito = v.tipo === 'credito';
    if (!esSeparado && !esCredito) continue;
    const ds = devs[v.id] ?? [];
    const saldo = saldoVenta(v, ds);
    if (saldo <= 0) continue;
    const fechaLimite = v.separado?.fechaLimite ?? null;
    const estado = estadoCxC(saldo, fechaLimite, hoy);
    const fila: CuentaPorCobrar = {
      ventaId: v.id,
      numeroVenta: v.numero,
      clienteId: v.clienteId,
      localId: v.localId,
      tipo: esSeparado ? 'separado' : 'credito',
      total: v.total,
      abonado: v.pagos.reduce((a, p) => a + p.valor, 0),
      saldo,
      fechaVenta: v.ts.slice(0, 10),
      fechaLimite,
      estado,
      diasParaVencer: fechaLimite ? diasParaVencer(fechaLimite, hoy) : null,
    };
    if (filtro === 'separados-por-vencer' && !(fila.tipo === 'separado' && fechaLimite && fechaLimite >= hoy && fechaLimite <= sumarDias(hoy, 6))) continue;
    if (filtro === 'vencidos' && estado !== 'vencido') continue;
    if (filtro === 'credito' && fila.tipo !== 'credito') continue;
    filas.push(fila);
  }
  filas.sort((a, b) => ((a.fechaLimite ?? '9999') < (b.fechaLimite ?? '9999') ? -1 : 1));
  return { filas, saldo: filas.reduce((a, x) => a + x.saldo, 0) };
});

export interface SaldoCuenta {
  cuenta: CuentaDinero;
  saldo: COP;
}

/** Saldos de las cuentas (V7): agregado `saldosCuentas`. */
export const selSaldosCuentas = crearSelector<{ localId?: Id | 'todos' } | void, { cuentas: SaldoCuenta[]; total: COP }>(
  'selSaldosCuentas',
  ['cuentas', 'agregados'],
  (e, p) => {
    const cuentas = Object.values(e.cuentas)
      .filter((c) => !c.eliminadoEn && (!p?.localId || p.localId === 'todos' || c.localId === p.localId || c.localId === null))
      .sort((a, b) => a.orden - b.orden)
      .map((c) => ({ cuenta: c, saldo: e.agregados.saldosCuentas[c.id] ?? 0 }));
    return { cuentas, total: cuentas.reduce((a, x) => a + x.saldo, 0) };
  },
);

export interface MovimientoLibro {
  id: Id;
  ts: FechaHoraISO;
  valor: COP;
  descripcion: string;
  tipo: MovimientoCuenta['tipo'] | 'pago_venta';
  ventaId: Id | null;
  conciliado: boolean;
  saldo: COP;
}

/** Libro de una cuenta (pagos de ventas + movimientos) con saldo acumulado; el saldo final = agregado (V7). */
export const selLibroCuenta = crearSelector<{ cuentaId: Id; desde?: FechaISO; hasta?: FechaISO }, { filas: MovimientoLibro[]; saldoInicial: COP; saldoFinal: COP }>(
  'selLibroCuenta',
  ['cuentas', 'movimientosCuenta', 'ventas'],
  (e, { cuentaId, desde, hasta }) => {
    const c = e.cuentas[cuentaId];
    const todos: Omit<MovimientoLibro, 'saldo'>[] = [];
    for (const m of Object.values(e.movimientosCuenta))
      if (m.cuentaId === cuentaId) todos.push({ id: m.id, ts: m.ts, valor: m.valor, descripcion: m.descripcion, tipo: m.tipo, ventaId: null, conciliado: m.conciliado });
    for (const v of Object.values(e.ventas))
      for (const p of v.pagos)
        if (p.cuentaId === cuentaId)
          todos.push({ id: p.id, ts: p.ts, valor: p.valor, descripcion: `${p.tipo === 'reembolso' ? 'Reembolso' : 'Pago'} de la venta ${v.numero}`, tipo: 'pago_venta', ventaId: v.id, conciliado: p.conciliado });
    todos.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : a.id < b.id ? -1 : 1));
    let saldo = c?.saldoInicial ?? 0;
    let saldoInicial = saldo;
    const filas: MovimientoLibro[] = [];
    for (const m of todos) {
      saldo += m.valor;
      const f = m.ts.slice(0, 10);
      if (desde && f < desde) {
        saldoInicial = saldo;
        continue;
      }
      if (hasta && f > hasta) continue;
      filas.push({ ...m, saldo });
    }
    return { filas, saldoInicial, saldoFinal: filas.length ? (filas[filas.length - 1]?.saldo ?? saldo) : saldoInicial };
  },
);

export interface PendienteConciliar {
  tipo: 'pago_venta' | 'movimiento';
  id: Id;
  ventaId: Id | null;
  cuentaId: Id;
  ts: FechaHoraISO;
  valor: COP;
  descripcion: string;
}

/** Pagos y movimientos sin conciliar (contador de pendientes de B3). */
export const selPendientesConciliar = crearSelector<void, PendienteConciliar[]>(
  'selPendientesConciliar',
  ['ventas', 'movimientosCuenta'],
  (e) => {
    const r: PendienteConciliar[] = [];
    for (const v of Object.values(e.ventas))
      for (const p of v.pagos as PagoVenta[])
        if (!p.conciliado && p.cuentaId) r.push({ tipo: 'pago_venta', id: p.id, ventaId: v.id, cuentaId: p.cuentaId, ts: p.ts, valor: p.valor, descripcion: `Venta ${v.numero}` });
    for (const m of Object.values(e.movimientosCuenta))
      if (!m.conciliado) r.push({ tipo: 'movimiento', id: m.id, ventaId: null, cuentaId: m.cuentaId, ts: m.ts, valor: m.valor, descripcion: m.descripcion });
    return r.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  },
);

export interface ConciliacionDatafono {
  mes: string;
  localId: Id | 'todos';
  /** Vendido con tarjeta en el mes (bruto, agregado `datafonoDia`). */
  vendido: COP;
  /** Abonos de las ventas del mes. */
  abonado: { bruto: COP; comision: COP; retenciones: { fuente: COP; iva: COP; ica: COP }; neto: COP };
  /** Lo vendido con tarjeta del mes que aún no se ha abonado (bruto). */
  pendientePorAbonar: COP;
  /** Lo que costaría lo pendiente (estimado con los parámetros). */
  pendienteEstimado: { comision: COP; retenciones: COP; neto: COP };
  abonos: AbonoDatafono[];
}

/** "Vendiste $ X con tarjeta, te consignaron $ Y" (6.20.12, P10, C16). */
export const selConciliacionDatafono = crearSelector<{ mes: string; localId: Id | 'todos' }, ConciliacionDatafono>(
  'selConciliacionDatafono',
  ['agregados', 'abonosDatafono', 'parametros'],
  (e, { mes, localId }) => {
    let vendido = 0;
    let pendDeb = 0;
    let pendCred = 0;
    for (const [k, x] of Object.entries(e.agregados.datafonoDia)) {
      const [l, f] = k.split('@') as [Id, FechaISO];
      if (!f.startsWith(mes) || (localId !== 'todos' && l !== localId)) continue;
      vendido += x.debito + x.credito;
      if (!e.agregados.abonosDatafonoDia[k]) {
        pendDeb += x.debito;
        pendCred += x.credito;
      }
    }
    const abonos = Object.values(e.abonosDatafono).filter((a) => a.ventasDe.startsWith(mes) && (localId === 'todos' || a.localId === localId));
    const abonado = { bruto: 0, comision: 0, retenciones: { fuente: 0, iva: 0, ica: 0 }, neto: 0 };
    for (const a of abonos) {
      abonado.bruto += a.bruto;
      abonado.comision += a.comision;
      abonado.retenciones.fuente += a.retenciones.fuente;
      abonado.retenciones.iva += a.retenciones.iva;
      abonado.retenciones.ica += a.retenciones.ica;
      abonado.neto += a.neto;
    }
    const est = calcularAbonoDatafono({ debito: pendDeb, credito: pendCred }, e.parametros.datafono, e.parametros.impuestos.ivaGeneral);
    return {
      mes,
      localId,
      vendido,
      abonado,
      pendientePorAbonar: pendDeb + pendCred,
      pendienteEstimado: { comision: est.comision, retenciones: est.retenciones.fuente + est.retenciones.iva + est.retenciones.ica, neto: est.neto },
      abonos: abonos.sort((a, b) => (a.fecha < b.fecha ? 1 : -1)),
    };
  },
);

export interface FlujoProyectado extends FlujoEstado {
  /** Explicación en lenguaje sencillo del punto bajo (la escribe el selector, 6.20.9). */
  explicacion: string;
  /** Egresos más grandes de la semana del punto bajo (máx. 3). */
  principales: { concepto: string; valor: COP; fecha: FechaISO }[];
}

/**
 * Flujo de caja proyectado (6.20.9, W5, P19, N13). Es la MISMA función que calibra el generador
 * (`proyeccionFlujoEstado`), con la hora actual cuantizada: el punto bajo que ve el dueño es el que se calibró.
 */
export const selFlujoProyectado = crearSelector<{ dias: number; hoy: FechaISO; hora: string }, FlujoProyectado>(
  'selFlujoProyectado',
  ['cuentas', 'agregados', 'ventas', 'cuentasPorPagar', 'gastosRecurrentes', 'gastos', 'liquidaciones', 'empleados', 'contratos', 'importaciones', 'tasas', 'parametros', 'locales', 'devoluciones', 'proveedores'],
  (e, { dias, hoy, hora }) => {
    const anio = Number(hoy.slice(0, 4));
    const flujo = proyeccionFlujoEstado(e, {
      hoy,
      hora,
      dias,
      indiceMes: INDICE_MES,
      diasCerrados: DIAS_CERRADOS,
      festivos: conjuntoFestivos([anio - 1, anio, anio + 1]),
    });
    const egresos = flujo.semanaPuntoBajo.egresos.filter((m) => m.valor < 0);
    const principales = egresos.slice(0, 3).map((m) => ({ concepto: m.concepto, valor: -m.valor, fecha: m.fecha }));
    const lunes = flujo.semanaPuntoBajo.lunes || lunesDe(flujo.puntoBajo.fecha);
    const conceptos = principales.map((p) => {
      // Saldo a una fábrica: mostrar el monto de origen si la cuenta por pagar está en USD/CNY.
      const cxp = Object.values(e.cuentasPorPagar).find((c) => c.concepto === p.concepto && c.moneda !== 'COP');
      if (cxp && cxp.moneda !== 'COP') return `${p.concepto.toLowerCase().startsWith('saldo') ? 'el ' : ''}${p.concepto} (${montoExtranjero(saldoCxP(cxp), cxp.moneda)})`;
      return `${p.concepto} (${pesosEnPalabras(p.valor)})`;
    });
    const explicacion =
      principales.length > 0
        ? `La plata baja a ${pesosEnPalabras(flujo.puntoBajo.saldo)} ${relativaDias(flujo.puntoBajo.fecha, hoy)} porque la semana del ${lunes.slice(8, 10)}/${lunes.slice(5, 7)} pagas ${enumerar(conceptos)}.`
        : `La plata no baja de ${pesosEnPalabras(flujo.puntoBajo.saldo)} en los próximos ${dias} días.`;
    return { ...flujo, explicacion, principales };
  },
);

/** Medios de pago del día por cuenta (útil para la caja y la conciliación). */
export type ResumenMedios = Partial<Record<MedioPago, COP>>;

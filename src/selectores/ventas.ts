import type {
  Canal,
  Categoria,
  COP,
  Devolucion,
  EstadoDominio,
  Factura,
  FechaHoraISO,
  FechaISO,
  Id,
  LineaProducto,
  MedioPago,
  TipoVenta,
  Venta,
} from '@/dominio/tipos';
import { estadoVenta, type EstadoVenta, saldoVenta, totalPagado } from '@/dominio/reglas/ventas';
import { diaSemana, rangoFechas, sumarDias } from '@/dominio/reglas/fechas';
import { crearSelector } from './memo';

/**
 * Ventas (PLAN 6.23 `ventas.ts`). `hechosDeVenta` aplica la regla V4 en UNA pasada para todo el sistema:
 * toda venta no anulada suma en la fecha de su `ts` por su total con IVA; las devoluciones restan en SU fecha y
 * la cancelación de un separado también resta en su fecha. La venta de un bono no es venta (es un anticipo).
 *
 * Convenciones de las cifras: `ventas` = Σ total con IVA de las ventas reconocidas; `devoluciones` = Σ devuelto
 * y cancelado (positivo); `netas` = ventas − devoluciones; `numVentas` = ventas distintas (no aditivo);
 * `ticket` = ventas / numVentas (sobre ventas brutas, como los patrones P1 y P2); `unidades` netas.
 */
export type TipoHecho = 'venta' | 'devolucion' | 'cancelacion';

export interface HechoVenta {
  tipo: TipoHecho;
  ventaId: Id;
  fecha: FechaISO;
  ts: FechaHoraISO;
  /** 0–23 (hora de Bogotá). */
  hora: number;
  localId: Id;
  vendedorId: Id;
  clienteId: Id | null;
  canal: Canal;
  tipoVenta: TipoVenta;
  /** true si la venta es la nueva de un cambio (P1 la excluye del conteo por local). */
  esCambio: boolean;
  lineaId: Id;
  productoId: Id;
  varianteId: Id;
  categoria: Categoria | null;
  linea: LineaProducto | null;
  talla: string;
  colorId: Id;
  /** Con signo: + venta, − devolución o cancelación. */
  cantidad: number;
  /** Con IVA, con signo. */
  total: COP;
  base: COP;
  iva: COP;
  /** Costo de la mercancía con signo (en devoluciones solo si reingresa al inventario). */
  costo: COP;
  /** Descuento asignado (solo en hechos de venta). */
  descuento: COP;
}

export interface Rango {
  desde: FechaISO;
  hasta: FechaISO;
}

function hechosDeLaVenta(e: EstadoDominio, v: Venta, r: HechoVenta[]): void {
  const base = {
    ventaId: v.id,
    localId: v.localId,
    vendedorId: v.vendedorId,
    clienteId: v.clienteId,
    canal: v.canal,
    tipoVenta: v.tipo,
    esCambio: !!v.ventaOrigenCambioId,
  };
  const fecha = v.ts.slice(0, 10);
  const hora = Number(v.ts.slice(11, 13));
  for (const l of v.lineas) {
    const p = e.productos[l.productoId];
    const va = e.variantes[l.varianteId];
    r.push({
      ...base,
      tipo: 'venta',
      fecha,
      ts: v.ts,
      hora,
      lineaId: l.id,
      productoId: l.productoId,
      varianteId: l.varianteId,
      categoria: p?.categoria ?? null,
      linea: p?.linea ?? null,
      talla: va?.talla ?? '',
      colorId: va?.colorId ?? '',
      cantidad: l.cantidad,
      total: l.totalFinal,
      base: l.base,
      iva: l.iva,
      costo: l.costoUnitario * l.cantidad,
      descuento: l.descuentoAsignado,
    });
  }
  const cancelado = v.separado?.cerrado?.resultado === 'cancelado' ? v.separado.cerrado : null;
  if (cancelado) {
    const f = cancelado.ts.slice(0, 10);
    for (const l of v.lineas) {
      const p = e.productos[l.productoId];
      const va = e.variantes[l.varianteId];
      r.push({
        ...base,
        tipo: 'cancelacion',
        fecha: f,
        ts: cancelado.ts,
        hora: Number(cancelado.ts.slice(11, 13)),
        lineaId: l.id,
        productoId: l.productoId,
        varianteId: l.varianteId,
        categoria: p?.categoria ?? null,
        linea: p?.linea ?? null,
        talla: va?.talla ?? '',
        colorId: va?.colorId ?? '',
        cantidad: -l.cantidad,
        total: -l.totalFinal,
        base: -l.base,
        iva: -l.iva,
        costo: -l.costoUnitario * l.cantidad,
        descuento: 0,
      });
    }
  }
}

function hechosDeDevolucion(e: EstadoDominio, d: Devolucion, v: Venta, r: HechoVenta[]): void {
  const fecha = d.ts.slice(0, 10);
  const hora = Number(d.ts.slice(11, 13));
  for (const l of d.lineas) {
    const linea = v.lineas.find((x) => x.id === l.lineaId);
    const productoId = linea?.productoId ?? e.variantes[l.varianteId]?.productoId ?? '';
    const p = e.productos[productoId];
    const va = e.variantes[l.varianteId];
    r.push({
      tipo: 'devolucion',
      ventaId: v.id,
      fecha,
      ts: d.ts,
      hora,
      localId: v.localId,
      vendedorId: v.vendedorId,
      clienteId: v.clienteId,
      canal: v.canal,
      tipoVenta: v.tipo,
      esCambio: !!v.ventaOrigenCambioId,
      lineaId: l.lineaId,
      productoId,
      varianteId: l.varianteId,
      categoria: p?.categoria ?? null,
      linea: p?.linea ?? null,
      talla: va?.talla ?? '',
      colorId: va?.colorId ?? '',
      cantidad: -l.cantidad,
      total: -l.valor,
      base: -l.base,
      iva: -l.iva,
      costo: l.reingresa ? -l.costo : 0,
      descuento: 0,
    });
  }
}

/**
 * Hechos de venta (V4) con fecha en [desde, hasta], ordenados por ts. Recorre las ventas una vez (barato) y solo
 * arma los hechos del rango: Inicio y la app no pagan los 18 meses para mostrar hoy y este mes.
 */
export const hechosEnFechas = crearSelector<Rango, HechoVenta[]>(
  'hechosEnFechas',
  ['ventas', 'devoluciones', 'productos', 'variantes'],
  (e, { desde, hasta }) => {
    const r: HechoVenta[] = [];
    const dentro = (ts: string) => {
      const f = ts.slice(0, 10);
      return f >= desde && f <= hasta;
    };
    for (const id in e.ventas) {
      const v = e.ventas[id];
      if (!v || v.anulacion) continue;
      const enRango = dentro(v.ts);
      const cancelado = v.separado?.cerrado?.resultado === 'cancelado' && dentro(v.separado.cerrado.ts);
      if (!enRango && !cancelado) continue;
      const tmp: HechoVenta[] = [];
      hechosDeLaVenta(e, v, tmp);
      for (const h of tmp) if (h.fecha >= desde && h.fecha <= hasta) r.push(h);
    }
    for (const id in e.devoluciones) {
      const d = e.devoluciones[id];
      if (!d || !dentro(d.ts)) continue;
      const v = e.ventas[d.ventaId];
      if (!v || v.anulacion) continue;
      hechosDeDevolucion(e, d, v, r);
    }
    r.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
    return r;
  },
);

/** Hechos de venta (V4) de toda la historia, ordenados por ts. Una sola definición de "venta reconocida". */
export const hechosDeVenta = crearSelector<void, HechoVenta[]>(
  'hechosDeVenta',
  ['ventas', 'devoluciones', 'productos', 'variantes'],
  (e) => hechosEnFechas(e, { desde: '0000-00-00', hasta: '9999-12-31' }),
);

export interface ResumenVentas {
  /** Σ total con IVA de las ventas reconocidas del periodo. */
  ventas: COP;
  /** Σ devuelto y cancelado en el periodo (positivo). */
  devoluciones: COP;
  netas: COP;
  /** Base sin IVA neta (ventas − devoluciones). */
  baseNeta: COP;
  /** Ventas distintas (no aditivo). */
  numVentas: number;
  /** Unidades netas. */
  unidades: number;
  /** ventas / numVentas. */
  ticket: COP;
  descuentos: COP;
  /** Costo de la mercancía neto. */
  costo: COP;
  /** baseNeta − costo. */
  margen: COP;
  margenPct: number;
}

export function resumirHechos(hechos: Iterable<HechoVenta>): ResumenVentas {
  let ventas = 0;
  let devoluciones = 0;
  let baseNeta = 0;
  let unidades = 0;
  let descuentos = 0;
  let costo = 0;
  const distintas = new Set<Id>();
  for (const h of hechos) {
    if (h.tipo === 'venta') {
      ventas += h.total;
      distintas.add(h.ventaId);
      descuentos += h.descuento;
    } else devoluciones -= h.total;
    baseNeta += h.base;
    unidades += h.cantidad;
    costo += h.costo;
  }
  const numVentas = distintas.size;
  const margen = baseNeta - costo;
  return {
    ventas,
    devoluciones,
    netas: ventas - devoluciones,
    baseNeta,
    numVentas,
    unidades,
    ticket: numVentas ? Math.round(ventas / numVentas) : 0,
    descuentos,
    costo,
    margen,
    margenPct: baseNeta > 0 ? margen / baseNeta : 0,
  };
}

/** Hechos en un rango de fechas (ambos incluidos) y, si se indica, de un local. */
export function hechosEnRango(
  hechos: readonly HechoVenta[],
  desde: FechaISO,
  hasta: FechaISO,
  localId: Id | 'todos' = 'todos',
): HechoVenta[] {
  const r: HechoVenta[] = [];
  for (const h of hechos) {
    if (h.fecha < desde || h.fecha > hasta) continue;
    if (localId !== 'todos' && h.localId !== localId) continue;
    r.push(h);
  }
  return r;
}

/** Resumen de un rango y local (Inicio, comparativos, reportes). */
export const selResumenVentas = crearSelector<Rango & { localId: Id | 'todos' }, ResumenVentas>(
  'selResumenVentas',
  ['ventas', 'devoluciones', 'productos', 'variantes'],
  (e, { desde, hasta, localId }) => resumirHechos(hechosEnRango(hechosEnFechas(e, { desde, hasta }), desde, hasta, localId)),
);

export interface FiltroVentas {
  desde?: FechaISO;
  hasta?: FechaISO;
  localId?: Id | 'todos';
  vendedorId?: Id;
  /** 'consumidor_final' = sin cliente. */
  clienteId?: Id | 'consumidor_final';
  medio?: MedioPago;
  canal?: Canal;
  estado?: EstadoVenta;
  productoId?: Id;
  /** Número de venta, cliente o vendedor. */
  texto?: string;
}

export interface FilaVenta {
  id: Id;
  numero: string;
  ts: FechaHoraISO;
  localId: Id;
  vendedorId: Id;
  clienteId: Id | null;
  canal: Canal;
  tipo: TipoVenta;
  estado: EstadoVenta;
  total: COP;
  unidades: number;
  descuentos: COP;
  devuelto: COP;
  pagado: COP;
  saldo: COP;
  medios: MedioPago[];
  facturaId: Id | null;
}

export const selDevolucionesPorVenta = crearSelector<void, Record<Id, Devolucion[]>>(
  'selDevolucionesPorVenta',
  ['devoluciones'],
  (e) => {
    const r: Record<Id, Devolucion[]> = {};
    for (const d of Object.values(e.devoluciones)) (r[d.ventaId] ??= []).push(d);
    return r;
  },
);

function filaDe(v: Venta, devs: readonly Devolucion[]): FilaVenta {
  const medios: MedioPago[] = [];
  for (const p of v.pagos) if (p.tipo !== 'reembolso' && !medios.includes(p.medio)) medios.push(p.medio);
  return {
    id: v.id,
    numero: v.numero,
    ts: v.ts,
    localId: v.localId,
    vendedorId: v.vendedorId,
    clienteId: v.clienteId,
    canal: v.canal,
    tipo: v.tipo,
    estado: estadoVenta(v, devs),
    total: v.total,
    unidades: v.lineas.reduce((a, l) => a + l.cantidad, 0),
    descuentos: v.descuentos,
    devuelto: devs.reduce((a, d) => a + d.valorTotal, 0),
    pagado: totalPagado(v),
    saldo: saldoVenta(v, devs),
    medios,
    facturaId: v.facturaId,
  };
}

/**
 * Lista de ventas con filtros y totales (A3). Las FILAS son las ventas (también anuladas) con `ts` en el rango;
 * los TOTALES salen de `hechosDeVenta` con los mismos filtros (las devoluciones en su fecha, V4). Los filtros de
 * venta (medio, estado, texto) se aplican a los hechos por su venta.
 */
export const selVentas = crearSelector<FiltroVentas, { filas: FilaVenta[]; totales: ResumenVentas }>(
  'selVentas',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'clientes', 'empleados'],
  (e, f) => {
    const devs = selDevolucionesPorVenta(e);
    const texto = f.texto?.trim().toLowerCase() ?? '';
    const coincideVenta = (v: Venta, fila?: FilaVenta): boolean => {
      if (f.localId && f.localId !== 'todos' && v.localId !== f.localId) return false;
      if (f.vendedorId && v.vendedorId !== f.vendedorId) return false;
      if (f.clienteId === 'consumidor_final' ? v.clienteId !== null : f.clienteId && v.clienteId !== f.clienteId)
        return false;
      if (f.canal && v.canal !== f.canal) return false;
      if (f.medio && !v.pagos.some((p) => p.medio === f.medio && p.tipo !== 'reembolso')) return false;
      if (f.productoId && !v.lineas.some((l) => l.productoId === f.productoId)) return false;
      if (f.estado && (fila ?? filaDe(v, devs[v.id] ?? [])).estado !== f.estado) return false;
      if (texto) {
        const c = v.clienteId ? e.clientes[v.clienteId] : null;
        const vend = e.empleados[v.vendedorId];
        const t = `${v.numero} ${c ? `${c.nombres} ${c.apellidos}` : 'consumidor final'} ${vend ? `${vend.nombres} ${vend.apellidos}` : ''}`.toLowerCase();
        if (!t.includes(texto)) return false;
      }
      return true;
    };
    const filas: FilaVenta[] = [];
    for (const v of Object.values(e.ventas)) {
      const fv = v.ts.slice(0, 10);
      if (f.desde && fv < f.desde) continue;
      if (f.hasta && fv > f.hasta) continue;
      const fila = filaDe(v, devs[v.id] ?? []);
      if (!coincideVenta(v, fila)) continue;
      filas.push(fila);
    }
    filas.sort((a, b) => (a.ts > b.ts ? -1 : a.ts < b.ts ? 1 : 0));
    const cache = new Map<Id, boolean>();
    const base = f.desde || f.hasta ? hechosEnFechas(e, { desde: f.desde ?? '0000-00-00', hasta: f.hasta ?? '9999-12-31' }) : hechosDeVenta(e);
    const hechos = base.filter((h) => {
      if (f.desde && h.fecha < f.desde) return false;
      if (f.hasta && h.fecha > f.hasta) return false;
      if (f.productoId && h.productoId !== f.productoId) return false;
      let ok = cache.get(h.ventaId);
      if (ok === undefined) {
        const v = e.ventas[h.ventaId];
        ok = !!v && coincideVenta(v);
        cache.set(h.ventaId, ok);
      }
      return ok;
    });
    return { filas, totales: resumirHechos(hechos) };
  },
);

export interface DetalleVenta {
  venta: Venta;
  estado: EstadoVenta;
  devoluciones: Devolucion[];
  devuelto: COP;
  pagado: COP;
  saldo: COP;
  unidades: number;
  /** Margen bruto de la venta (sin IVA − costo instantáneo). */
  margen: COP;
  factura: Factura | null;
  /** Saldo a favor generado por esta venta (devoluciones o cancelación con saldo a favor). */
  saldoAFavorGenerado: COP;
}

export const selVentaDetalle = crearSelector<{ ventaId: Id }, DetalleVenta | null>(
  'selVentaDetalle',
  ['ventas', 'devoluciones', 'facturas'],
  (e, { ventaId }) => {
    const v = e.ventas[ventaId];
    if (!v) return null;
    const devs = selDevolucionesPorVenta(e)[ventaId] ?? [];
    const devuelto = devs.reduce((a, d) => a + d.valorTotal, 0);
    return {
      venta: v,
      estado: estadoVenta(v, devs),
      devoluciones: devs,
      devuelto,
      pagado: totalPagado(v),
      saldo: saldoVenta(v, devs),
      unidades: v.lineas.reduce((a, l) => a + l.cantidad, 0),
      margen: v.lineas.reduce((a, l) => a + l.base - l.costoUnitario * l.cantidad, 0),
      factura: v.facturaId ? (e.facturas[v.facturaId] ?? null) : null,
      saldoAFavorGenerado: devs.filter((d) => d.compensacion === 'saldo_favor').reduce((a, d) => a + d.valorTotal, 0),
    };
  },
);

export interface VentasDia {
  fecha: FechaISO;
  netas: COP;
  ventas: COP;
  numVentas: number;
  /** Por local (netas), si se pidió. */
  porLocal: Record<Id, COP>;
}

/** Serie diaria (todos los días del rango, también los sin ventas). */
export const selVentasPorDia = crearSelector<Rango & { localId: Id | 'todos'; porLocal?: boolean }, VentasDia[]>(
  'selVentasPorDia',
  ['ventas', 'devoluciones', 'productos', 'variantes'],
  (e, { desde, hasta, localId, porLocal }) => {
    const mapa = new Map<FechaISO, VentasDia>();
    for (const f of rangoFechas(desde, hasta)) mapa.set(f, { fecha: f, netas: 0, ventas: 0, numVentas: 0, porLocal: {} });
    const vistas = new Map<FechaISO, Set<Id>>();
    for (const h of hechosEnRango(hechosEnFechas(e, { desde, hasta }), desde, hasta, localId)) {
      const d = mapa.get(h.fecha);
      if (!d) continue;
      d.netas += h.total;
      if (h.tipo === 'venta') {
        d.ventas += h.total;
        let s = vistas.get(h.fecha);
        if (!s) vistas.set(h.fecha, (s = new Set()));
        s.add(h.ventaId);
      }
      if (porLocal) d.porLocal[h.localId] = (d.porLocal[h.localId] ?? 0) + h.total;
    }
    for (const [f, s] of vistas) {
      const d = mapa.get(f);
      if (d) d.numVentas = s.size;
    }
    return [...mapa.values()];
  },
);

export interface VentasHastaHora {
  hoy: ResumenVentas;
  /** El mismo día de la semana anterior hasta la misma hora. */
  semanaAnterior: ResumenVentas;
  /** (hoy.netas − semanaAnterior.netas) / semanaAnterior.netas; null si no hay base. */
  variacion: number | null;
}

/** Ventas de hoy hasta la hora actual y comparación con el mismo día de la semana anterior a la misma hora. */
export const selVentasHoyHastaHora = crearSelector<{ hoy: FechaISO; ahora: FechaHoraISO; localId: Id | 'todos' }, VentasHastaHora>(
  'selVentasHoyHastaHora',
  ['ventas', 'devoluciones', 'productos', 'variantes'],
  (e, { hoy, ahora, localId }) => {
    const hora = ahora.slice(11, 19);
    const antes = sumarDias(hoy, -7);
    const hechos = hechosEnFechas(e, { desde: antes, hasta: hoy });
    const deHoy = hechosEnRango(hechos, hoy, hoy, localId).filter((h) => h.ts.slice(11, 19) <= hora);
    const deAntes = hechosEnRango(hechos, antes, antes, localId).filter((h) => h.ts.slice(11, 19) <= hora);
    const a = resumirHechos(deHoy);
    const b = resumirHechos(deAntes);
    return { hoy: a, semanaAnterior: b, variacion: b.netas > 0 ? (a.netas - b.netas) / b.netas : null };
  },
);

export interface TopProducto {
  productoId: Id;
  referencia: string;
  nombre: string;
  unidades: number;
  valor: COP;
  margen: COP;
}

/** Top N productos por unidades, valor o margen (netos) en un rango. */
export const selTopProductos = crearSelector<
  Rango & { localId: Id | 'todos'; n: number; medida: 'unidades' | 'valor' | 'margen'; orden?: 'mas' | 'menos' },
  TopProducto[]
>('selTopProductos', ['ventas', 'devoluciones', 'productos', 'variantes'], (e, { desde, hasta, localId, n, medida, orden }) => {
  const m = new Map<Id, TopProducto>();
  for (const h of hechosEnRango(hechosEnFechas(e, { desde, hasta }), desde, hasta, localId)) {
    let t = m.get(h.productoId);
    if (!t) {
      const p = e.productos[h.productoId];
      t = { productoId: h.productoId, referencia: p?.referencia ?? '', nombre: p?.nombre ?? '', unidades: 0, valor: 0, margen: 0 };
      m.set(h.productoId, t);
    }
    t.unidades += h.cantidad;
    t.valor += h.total;
    t.margen += h.base - h.costo;
  }
  const clave = medida === 'unidades' ? 'unidades' : medida === 'valor' ? 'valor' : 'margen';
  const lista = [...m.values()].sort((a, b) => b[clave] - a[clave] || (a.referencia < b.referencia ? -1 : 1));
  return (orden === 'menos' ? lista.reverse() : lista).slice(0, n);
});

/** Índice del día de la semana de una fecha (utilidad para análisis). */
export const diaDeSemana = diaSemana;

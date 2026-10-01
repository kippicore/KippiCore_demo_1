import type {
  Categoria,
  COP,
  EstadoDominio,
  FechaHoraISO,
  FechaISO,
  Id,
  MovimientoInventario,
  Traslado,
} from '@/dominio/tipos';
import { ESTADOS_IMPORTACION } from '@/dominio/tipos';
import { sumarDias } from '@/dominio/reglas/fechas';
import { crearSelector } from './memo';
import { hechosEnFechas, type Rango } from './ventas';

/**
 * Inventario (PLAN 6.23 `inventario.ts`, 6.22). Las existencias son el agregado materializado
 * (`agregados.existencias`, I1); el kardex recorre el libro de movimientos en ORDEN DE APLICACIÓN (I2).
 */

export function existencia(e: EstadoDominio, varianteId: Id, localId: Id): number {
  return e.agregados.existencias[`${varianteId}@${localId}`] ?? 0;
}

export const selExistencia = crearSelector<{ varianteId: Id; localId: Id }, number>(
  'selExistencia',
  ['agregados'],
  (e, { varianteId, localId }) => existencia(e, varianteId, localId),
);

/** Locales con inventario (incluida la bodega), ordenados. */
function localesInventario(e: EstadoDominio) {
  return Object.values(e.locales)
    .filter((l) => !l.eliminadoEn)
    .sort((a, b) => a.orden - b.orden);
}

export interface EnCaminoVariante {
  unidades: number;
  /** Llegada estimada a bodega de la importación más próxima. */
  fechaEstimada: FechaISO;
  importacionId: Id;
  numero: string;
}

const IDX_RECIBIDO = ESTADOS_IMPORTACION.indexOf('recibido_bodega');
const IDX_CONFIRMADO = ESTADOS_IMPORTACION.indexOf('pedido_confirmado');

/** Unidades en camino por variante: importaciones confirmadas y aún no recibidas (6.20.13, "En camino" de A2). */
export const selEnCaminoPorVariante = crearSelector<void, Record<Id, EnCaminoVariante>>(
  'selEnCaminoPorVariante',
  ['importaciones'],
  (e) => {
    const r: Record<Id, EnCaminoVariante> = {};
    for (const imp of Object.values(e.importaciones)) {
      if (imp.eliminadoEn) continue;
      const i = ESTADOS_IMPORTACION.indexOf(imp.estado);
      if (i < IDX_CONFIRMADO || i >= IDX_RECIBIDO) continue;
      const llega = imp.hitos.recibido_bodega.estimada;
      for (const l of imp.lineas)
        for (const [v, n] of Object.entries(l.cantidades)) {
          if (n <= 0) continue;
          const a = r[v];
          if (!a) r[v] = { unidades: n, fechaEstimada: llega, importacionId: imp.id, numero: imp.numero };
          else {
            a.unidades += n;
            if (llega < a.fechaEstimada) {
              a.fechaEstimada = llega;
              a.importacionId = imp.id;
              a.numero = imp.numero;
            }
          }
        }
    }
    return r;
  },
);

export interface MatrizExistencias {
  productoId: Id;
  tallas: string[];
  colores: { id: Id; nombre: string; hex: string }[];
  locales: { id: Id; nombre: string; vende: boolean }[];
  /** Clave `${talla}|${colorId}` → varianteId. */
  variantes: Record<string, Id>;
  /** Clave `${talla}|${colorId}` → existencias por local. */
  celdas: Record<string, Record<Id, number>>;
  totalPorLocal: Record<Id, number>;
  totalPorVariante: Record<Id, number>;
  total: number;
  /** "En camino" (unidades y fecha estimada) por variante. */
  enCamino: Record<Id, EnCaminoVariante>;
  stockMinimo: number;
}

/** Matriz talla × color × local de un producto con totales y columna "En camino" (A2, POS, W2). */
export const selMatrizExistencias = crearSelector<{ productoId: Id }, MatrizExistencias | null>(
  'selMatrizExistencias',
  ['productos', 'variantes', 'colores', 'locales', 'agregados', 'importaciones'],
  (e, { productoId }) => {
    const p = e.productos[productoId];
    if (!p) return null;
    const vs = Object.values(e.variantes).filter((v) => v.productoId === productoId && !v.eliminadoEn);
    const tallas: string[] = [];
    const colores: MatrizExistencias['colores'] = [];
    for (const v of vs) {
      if (!tallas.includes(v.talla)) tallas.push(v.talla);
      if (!colores.some((c) => c.id === v.colorId)) {
        const c = e.colores[v.colorId];
        colores.push({ id: v.colorId, nombre: c?.nombre ?? v.colorId, hex: c?.hex ?? '#999999' });
      }
    }
    const locales = localesInventario(e).map((l) => ({ id: l.id, nombre: l.nombre, vende: l.vende }));
    const variantes: Record<string, Id> = {};
    const celdas: Record<string, Record<Id, number>> = {};
    const totalPorLocal: Record<Id, number> = {};
    const totalPorVariante: Record<Id, number> = {};
    let total = 0;
    const enCaminoTodo = selEnCaminoPorVariante(e);
    const enCamino: Record<Id, EnCaminoVariante> = {};
    for (const v of vs) {
      const k = `${v.talla}|${v.colorId}`;
      variantes[k] = v.id;
      const c: Record<Id, number> = {};
      for (const l of locales) {
        const n = existencia(e, v.id, l.id);
        c[l.id] = n;
        totalPorLocal[l.id] = (totalPorLocal[l.id] ?? 0) + n;
        totalPorVariante[v.id] = (totalPorVariante[v.id] ?? 0) + n;
        total += n;
      }
      celdas[k] = c;
      const ec = enCaminoTodo[v.id];
      if (ec) enCamino[v.id] = ec;
    }
    return {
      productoId,
      tallas,
      colores,
      locales,
      variantes,
      celdas,
      totalPorLocal,
      totalPorVariante,
      total,
      enCamino,
      stockMinimo: p.stockMinimo,
    };
  },
);

export interface FilaKardex {
  movimiento: MovimientoInventario;
  /** Saldo acumulado del alcance del filtro, en orden de aplicación. */
  saldo: number;
  /** Índice en el libro (orden de aplicación). */
  orden: number;
}

/**
 * Kardex con saldo acumulado en ORDEN DE APLICACIÓN (orden del libro, I2), no por ts. El saldo se acumula desde
 * el primer movimiento del alcance (producto/variante/local) aunque el rango muestre solo una parte.
 */
export const selKardex = crearSelector<
  { productoId?: Id; varianteId?: Id; localId?: Id | 'todos'; desde?: FechaISO; hasta?: FechaISO },
  { filas: FilaKardex[]; saldoInicial: number; saldoFinal: number; entradas: number; salidas: number }
>('selKardex', ['movimientos'], (e, { productoId, varianteId, localId, desde, hasta }) => {
  const filas: FilaKardex[] = [];
  let saldo = 0;
  let saldoInicial = 0;
  let entradas = 0;
  let salidas = 0;
  e.movimientos.forEach((m, orden) => {
    if (productoId && m.productoId !== productoId) return;
    if (varianteId && m.varianteId !== varianteId) return;
    if (localId && localId !== 'todos' && m.localId !== localId) return;
    saldo += m.cantidad;
    const f = m.ts.slice(0, 10);
    if (desde && f < desde) {
      saldoInicial = saldo;
      return;
    }
    if (hasta && f > hasta) return;
    if (m.cantidad > 0) entradas += m.cantidad;
    else salidas -= m.cantidad;
    filas.push({ movimiento: m, saldo, orden });
  });
  return { filas, saldoInicial, saldoFinal: filas.length ? (filas[filas.length - 1]?.saldo ?? saldo) : saldoInicial, entradas, salidas };
});

export interface StockBajo {
  varianteId: Id;
  productoId: Id;
  localId: Id;
  existencia: number;
  minimo: number;
  agotado: boolean;
}

/** Variantes por debajo del mínimo en los locales que venden (las agotadas incluidas), de productos activos. */
export const selStockBajo = crearSelector<{ localId: Id | 'todos' }, StockBajo[]>(
  'selStockBajo',
  ['productos', 'variantes', 'locales', 'agregados'],
  (e, { localId }) => {
    const r: StockBajo[] = [];
    const locales = Object.values(e.locales).filter((l) => l.vende && !l.eliminadoEn && (localId === 'todos' || l.id === localId));
    for (const v of Object.values(e.variantes)) {
      if (v.eliminadoEn) continue;
      const p = e.productos[v.productoId];
      if (!p || p.eliminadoEn) continue;
      for (const l of locales) {
        const n = existencia(e, v.id, l.id);
        if (n < p.stockMinimo) r.push({ varianteId: v.id, productoId: p.id, localId: l.id, existencia: n, minimo: p.stockMinimo, agotado: n <= 0 });
      }
    }
    return r;
  },
);

export interface Valorizacion {
  porLocal: { localId: Id; nombre: string; unidades: number; aCosto: COP; aPrecio: COP }[];
  porCategoria: Record<Categoria, { unidades: number; aCosto: COP; aPrecio: COP }>;
  total: { unidades: number; aCosto: COP; aPrecio: COP };
  metodo: 'Costo de reposición: última importación aplicada';
}

/** Valorización por local y bodega: unidades, a costo (`costoVigente`) y a precio de venta (con IVA). */
export const selValorizacion = crearSelector<{ localId: Id | 'todos' }, Valorizacion>(
  'selValorizacion',
  ['productos', 'variantes', 'locales', 'agregados'],
  (e, { localId }) => {
    const porLocal = new Map<Id, { localId: Id; nombre: string; unidades: number; aCosto: COP; aPrecio: COP }>();
    for (const l of localesInventario(e))
      if (localId === 'todos' || l.id === localId) porLocal.set(l.id, { localId: l.id, nombre: l.nombre, unidades: 0, aCosto: 0, aPrecio: 0 });
    const porCategoria = {} as Valorizacion['porCategoria'];
    const total = { unidades: 0, aCosto: 0, aPrecio: 0 };
    for (const [k, n] of Object.entries(e.agregados.existencias)) {
      if (n === 0) continue;
      const [vid, lid] = k.split('@') as [Id, Id];
      const fila = porLocal.get(lid);
      if (!fila) continue;
      const v = e.variantes[vid];
      const p = v ? e.productos[v.productoId] : undefined;
      if (!p) continue;
      fila.unidades += n;
      fila.aCosto += n * p.costoVigente;
      fila.aPrecio += n * p.precioVenta;
      const c = (porCategoria[p.categoria] ??= { unidades: 0, aCosto: 0, aPrecio: 0 });
      c.unidades += n;
      c.aCosto += n * p.costoVigente;
      c.aPrecio += n * p.precioVenta;
      total.unidades += n;
      total.aCosto += n * p.costoVigente;
      total.aPrecio += n * p.precioVenta;
    }
    return { porLocal: [...porLocal.values()], porCategoria, total, metodo: 'Costo de reposición: última importación aplicada' };
  },
);

export interface EnTransito {
  traslados: { traslado: Traslado; unidades: number }[];
  /** Unidades en traslados en tránsito por destino. */
  porDestino: Record<Id, number>;
  /** Unidades en importaciones confirmadas y no recibidas. */
  enImportaciones: number;
}

/** Mercancía en tránsito: traslados despachados sin recibir e importaciones en curso. */
export const selEnTransito = crearSelector<void, EnTransito>('selEnTransito', ['traslados', 'importaciones'], (e) => {
  const traslados: EnTransito['traslados'] = [];
  const porDestino: Record<Id, number> = {};
  for (const t of Object.values(e.traslados)) {
    if (t.estado !== 'en_transito') continue;
    const u = t.lineas.reduce((a, l) => a + l.cantidad, 0);
    traslados.push({ traslado: t, unidades: u });
    porDestino[t.destinoId] = (porDestino[t.destinoId] ?? 0) + u;
  }
  let enImportaciones = 0;
  for (const x of Object.values(selEnCaminoPorVariante(e))) enImportaciones += x.unidades;
  return { traslados, porDestino, enImportaciones };
});

export interface SinMovimiento {
  productoId: Id;
  referencia: string;
  nombre: string;
  unidades: number;
  aCosto: COP;
  /** Última venta (o null si nunca se vendió). */
  ultimaVenta: FechaISO | null;
}

/**
 * Referencias con existencias y sin ventas en los últimos `dias` días (definición de P6: ventas reconocidas con
 * fecha ≥ hoy − dias, incluido hoy).
 */
export const selSinMovimiento = crearSelector<{ dias: number; hoy: FechaISO }, SinMovimiento[]>(
  'selSinMovimiento',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'agregados'],
  (e, { dias, hoy }) => {
    const desde = sumarDias(hoy, -dias);
    const vendidos = new Set<Id>();
    const ultima = new Map<Id, FechaISO>();
    for (const v of Object.values(e.ventas)) {
      if (v.anulacion || v.separado?.cerrado?.resultado === 'cancelado') continue;
      const f = v.ts.slice(0, 10);
      for (const l of v.lineas) {
        if (f >= desde) vendidos.add(l.productoId);
        if (f > (ultima.get(l.productoId) ?? '')) ultima.set(l.productoId, f);
      }
    }
    const stock = new Map<Id, { u: number; costo: number }>();
    for (const [k, n] of Object.entries(e.agregados.existencias)) {
      if (n <= 0) continue;
      const va = e.variantes[k.split('@')[0] ?? ''];
      const p = va ? e.productos[va.productoId] : undefined;
      if (!p || p.eliminadoEn) continue;
      const a = stock.get(p.id) ?? { u: 0, costo: 0 };
      a.u += n;
      a.costo += n * p.costoVigente;
      stock.set(p.id, a);
    }
    return [...stock.entries()]
      .filter(([id]) => !vendidos.has(id))
      .map(([id, s]) => {
        const p = e.productos[id];
        return { productoId: id, referencia: p?.referencia ?? '', nombre: p?.nombre ?? '', unidades: s.u, aCosto: s.costo, ultimaVenta: ultima.get(id) ?? null };
      })
      .sort((a, b) => b.aCosto - a.aCosto || (a.referencia < b.referencia ? -1 : 1));
  },
);

export interface DiasInventario {
  categoria: Categoria | null;
  unidades: number;
  aCosto: COP;
  /** Unidades vendidas en los 90 días anteriores a hoy (sin hoy). */
  vendidas90: number;
  /** existencias / (vendidas90 / 90). */
  dias: number;
}

/** Días de inventario (definición de P5): existencias ÷ venta diaria de los últimos 90 días (sin hoy). */
export const selDiasInventario = crearSelector<{ categoria?: Categoria | null; hoy: FechaISO }, DiasInventario>(
  'selDiasInventario',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'agregados'],
  (e, { categoria, hoy }) => {
    const desde = sumarDias(hoy, -90);
    let vendidas = 0;
    // Como P5: ventas reconocidas (sin anuladas ni separados cancelados), unidades vendidas sin restar devoluciones.
    for (const h of hechosEnFechas(e, { desde, hasta: sumarDias(hoy, -1) }))
      if (h.tipo === 'venta' && (!categoria || h.categoria === categoria) && e.ventas[h.ventaId]?.separado?.cerrado?.resultado !== 'cancelado')
        vendidas += h.cantidad;
    let u = 0;
    let costo = 0;
    for (const [k, n] of Object.entries(e.agregados.existencias)) {
      if (n <= 0) continue;
      const va = e.variantes[k.split('@')[0] ?? ''];
      const p = va ? e.productos[va.productoId] : undefined;
      if (!p || (categoria && p.categoria !== categoria)) continue;
      u += n;
      costo += n * p.costoVigente;
    }
    return { categoria: categoria ?? null, unidades: u, aCosto: costo, vendidas90: vendidas, dias: u / Math.max(0.01, vendidas / 90) };
  },
);

/** Existencias de una variante en cada local (para "Traer de Zona Rosa (6 disponibles)"). */
export const selDisponibilidadOtrosLocales = crearSelector<{ varianteId: Id }, Record<Id, number>>(
  'selDisponibilidadOtrosLocales',
  ['locales', 'agregados'],
  (e, { varianteId }) => {
    const r: Record<Id, number> = {};
    for (const l of localesInventario(e)) r[l.id] = existencia(e, varianteId, l.id);
    return r;
  },
);

/** Traslados con filtros (A2). */
export const selTraslados = crearSelector<{ estado?: Traslado['estado']; localId?: Id | 'todos' }, Traslado[]>(
  'selTraslados',
  ['traslados'],
  (e, { estado, localId }) =>
    Object.values(e.traslados)
      .filter((t) => (!estado || t.estado === estado) && (!localId || localId === 'todos' || t.origenId === localId || t.destinoId === localId))
      .sort((a, b) => (a.fechas.solicitado < b.fechas.solicitado ? 1 : -1)),
);

/** Unidades vendidas por variante en un rango (rotación de la sugerencia de pedido y de tallas). */
export function vendidasPorVariante(e: EstadoDominio, r: Rango): Map<Id, number> {
  const m = new Map<Id, number>();
  for (const h of hechosEnFechas(e, r)) if (h.tipo === 'venta') m.set(h.varianteId, (m.get(h.varianteId) ?? 0) + h.cantidad);
  return m;
}

/** Instante del último movimiento de inventario (útil para "actualizado hace…"). */
export function ultimoMovimiento(e: EstadoDominio): FechaHoraISO | null {
  return e.movimientos[e.movimientos.length - 1]?.ts ?? null;
}

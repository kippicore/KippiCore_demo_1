import type { Categoria, COP, Id, Producto, Variante } from '@/dominio/tipos';
import { margenBruto } from '@/dominio/reglas/costeo';
import { normalizar } from '@/dominio/reglas/texto';
import { crearSelector } from './memo';
import { existencia } from './inventario';

/** Catálogo (PLAN 6.23 `catalogo.ts`). */

export type EstadoStock = 'agotado' | 'bajo' | 'normal';

export interface FiltroCatalogo {
  categoria?: Categoria;
  talla?: string;
  colorId?: Id;
  /** Existencias de este local (o 'todos'). */
  localId?: Id | 'todos';
  proveedorId?: Id;
  stock?: EstadoStock;
  /** Nombre, referencia, SKU o EAN (sin tildes). */
  texto?: string;
}

export interface FilaCatalogo {
  producto: Producto;
  variantes: number;
  /** Existencias en el local filtrado (o en todos, bodega incluida). */
  existencias: number;
  /** Variantes del filtro bajo el mínimo en el local (o en algún local que vende). */
  variantesBajas: number;
  estadoStock: EstadoStock;
  margenPct: number;
}

/** Catálogo filtrado (A2). Las existencias salen del agregado (I1). */
export const selCatalogo = crearSelector<FiltroCatalogo, FilaCatalogo[]>(
  'selCatalogo',
  ['productos', 'variantes', 'locales', 'agregados'],
  (e, f) => {
    const texto = f.texto ? normalizar(f.texto) : '';
    const locales = Object.values(e.locales).filter((l) => !l.eliminadoEn && (!f.localId || f.localId === 'todos' || l.id === f.localId));
    const vendedores = locales.filter((l) => l.vende);
    const porProducto = new Map<Id, Variante[]>();
    for (const v of Object.values(e.variantes)) {
      if (v.eliminadoEn) continue;
      if (f.talla && v.talla !== f.talla) continue;
      if (f.colorId && v.colorId !== f.colorId) continue;
      const lista = porProducto.get(v.productoId);
      if (lista) lista.push(v);
      else porProducto.set(v.productoId, [v]);
    }
    const r: FilaCatalogo[] = [];
    for (const p of Object.values(e.productos)) {
      if (p.eliminadoEn) continue;
      if (f.categoria && p.categoria !== f.categoria) continue;
      if (f.proveedorId && p.proveedorId !== f.proveedorId) continue;
      const vs = porProducto.get(p.id) ?? [];
      if ((f.talla || f.colorId) && vs.length === 0) continue;
      if (texto) {
        const hay =
          normalizar(p.nombre).includes(texto) ||
          normalizar(p.referencia).includes(texto) ||
          vs.some((v) => normalizar(v.sku).includes(texto) || v.ean13.includes(texto));
        if (!hay) continue;
      }
      let ex = 0;
      let bajas = 0;
      for (const v of vs) {
        for (const l of locales) ex += existencia(e, v.id, l.id);
        if (vendedores.some((l) => existencia(e, v.id, l.id) < p.stockMinimo)) bajas += 1;
      }
      const estadoStock: EstadoStock = ex <= 0 ? 'agotado' : bajas > 0 ? 'bajo' : 'normal';
      if (f.stock && f.stock !== estadoStock) continue;
      r.push({
        producto: p,
        variantes: vs.length,
        existencias: ex,
        variantesBajas: bajas,
        estadoStock,
        margenPct: p.costoVigente > 0 ? margenBruto(p.precioVenta, p.tarifaIva, p.costoVigente) : 0,
      });
    }
    return r.sort((a, b) => (a.producto.referencia < b.producto.referencia ? -1 : 1));
  },
);

export const selProductoPorReferencia = crearSelector<{ referencia: string }, Producto | null>(
  'selProductoPorReferencia',
  ['productos'],
  (e, { referencia }) => Object.values(e.productos).find((p) => p.referencia === referencia) ?? null,
);

export const selProductoPorSlug = crearSelector<{ slug: string }, Producto | null>(
  'selProductoPorSlug',
  ['productos'],
  (e, { slug }) => Object.values(e.productos).find((p) => p.slug === slug && !p.eliminadoEn) ?? null,
);

export interface MargenProducto {
  precio: COP;
  base: COP;
  costo: COP;
  margen: COP;
  margenPct: number;
  metodo: 'Costo de reposición: última importación aplicada';
}

/** Margen de un producto con su `costoVigente` (solo dueño: V5). */
export const selMargenProducto = crearSelector<{ productoId: Id }, MargenProducto | null>(
  'selMargenProducto',
  ['productos'],
  (e, { productoId }) => {
    const p = e.productos[productoId];
    if (!p) return null;
    const base = Math.round(p.precioVenta / (1 + p.tarifaIva));
    return {
      precio: p.precioVenta,
      base,
      costo: p.costoVigente,
      margen: base - p.costoVigente,
      margenPct: base > 0 ? (base - p.costoVigente) / base : 0,
      metodo: 'Costo de reposición: última importación aplicada',
    };
  },
);

export interface ResultadoBusqueda {
  producto: Producto;
  /** Variante exacta si se buscó por SKU o EAN. */
  variante: Variante | null;
  coincidencia: 'ean' | 'sku' | 'referencia' | 'nombre';
}

/** Búsqueda del POS por nombre, referencia, SKU o EAN (sin tildes; máx. `limite`). */
export const selBuscarProducto = crearSelector<{ texto: string; limite?: number }, ResultadoBusqueda[]>(
  'selBuscarProducto',
  ['productos', 'variantes'],
  (e, { texto, limite = 20 }) => {
    const t = normalizar(texto.trim());
    if (!t) return [];
    const r: ResultadoBusqueda[] = [];
    const vistos = new Set<Id>();
    for (const v of Object.values(e.variantes)) {
      if (v.eliminadoEn) continue;
      const p = e.productos[v.productoId];
      if (!p || p.eliminadoEn) continue;
      if (v.ean13 === t) r.unshift({ producto: p, variante: v, coincidencia: 'ean' });
      else if (normalizar(v.sku) === t) r.unshift({ producto: p, variante: v, coincidencia: 'sku' });
    }
    for (const x of r) vistos.add(x.producto.id);
    for (const p of Object.values(e.productos)) {
      if (p.eliminadoEn || vistos.has(p.id)) continue;
      if (normalizar(p.referencia).includes(t)) r.push({ producto: p, variante: null, coincidencia: 'referencia' });
      else if (normalizar(p.nombre).includes(t)) r.push({ producto: p, variante: null, coincidencia: 'nombre' });
      else continue;
      vistos.add(p.id);
    }
    return r.slice(0, limite);
  },
);

/** Variante por EAN-13 (lector de código de barras del POS). */
export const selVariantePorEan = crearSelector<{ ean: string }, Variante | null>(
  'selVariantePorEan',
  ['variantes'],
  (e, { ean }) => Object.values(e.variantes).find((v) => v.ean13 === ean.trim() && !v.eliminadoEn) ?? null,
);

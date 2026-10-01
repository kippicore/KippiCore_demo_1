import type { ClaveEstado } from '@/selectores';
import type { COP, EstadoDominio, FechaISO, Id, Local, MesISO, TipoPrenda } from '@/dominio/tipos';
import { sumarDias } from '@/dominio/reglas/fechas';
import {
  crearSelector,
  selComparativoLocales,
  selLocalesQueVenden,
  selSinMovimiento,
  selTopProductos,
  selVentasPorDia,
  type ComparativoLocal,
  type TopProducto,
} from '@/selectores';
import type { DiaPorLocal } from './calculos';

/**
 * Selectores locales de Inicio (D1): componen los compartidos (ventas por día, top de productos, mercancía sin
 * movimiento, comparativo de locales) y les agregan lo que la pantalla necesita (la "foto" de cada prenda, el id del
 * último cierre, el filtro por local). No repiten ninguna regla de negocio; cada uno declara TODAS las tablas que lee.
 */

const unir = (...sels: { tablas: readonly ClaveEstado[] }[]): ClaveEstado[] => [...new Set(sels.flatMap((s) => s.tablas))];

// ---------------------------------------------------------------------------------------------------------
// La "foto" de una prenda: tipo y color (hex del producto) de su primera variante
// ---------------------------------------------------------------------------------------------------------
export interface PrendaVista {
  tipo: TipoPrenda;
  color: string;
  patron: 'liso' | 'rayas' | 'cuadros';
  /** "Camisa Oxford entallada, azul cielo" (texto accesible de la ilustración). */
  nombre: string;
}

const COLOR_NEUTRO = '#C9C9C7';

function prendaDe(e: EstadoDominio, productoId: Id): PrendaVista | null {
  const p = e.productos[productoId];
  if (!p) return null;
  const v = Object.values(e.variantes).find((x) => x.productoId === productoId && !x.eliminadoEn);
  const c = v ? e.colores[v.colorId] : undefined;
  return { tipo: p.tipoPrenda, color: c?.hex ?? COLOR_NEUTRO, patron: c?.patron ?? 'liso', nombre: `${p.nombre}${c ? `, ${c.nombre.toLowerCase()}` : ''}` };
}

// ---------------------------------------------------------------------------------------------------------
// Ventas de los últimos 30 días por local
// ---------------------------------------------------------------------------------------------------------
export interface Ventas30Dias {
  dias: DiaPorLocal[];
  locales: Pick<Local, 'id' | 'nombre' | 'orden'>[];
  desde: FechaISO;
  hasta: FechaISO;
}

/** 30 días (hoy incluido) con las ventas netas de cada local; la suma de las barras cuadra con `selVentas`. */
export const selVentas30Dias = crearSelector<{ hoy: FechaISO }, Ventas30Dias>(
  'selVentas30Dias',
  unir(selVentasPorDia, selLocalesQueVenden),
  (e, { hoy }) => {
    const desde = sumarDias(hoy, -29);
    const locales = selLocalesQueVenden(e).map((l) => ({ id: l.id, nombre: l.nombre, orden: l.orden }));
    const dias = selVentasPorDia(e, { desde, hasta: hoy, localId: 'todos', porLocal: true }).map((d) => ({ fecha: d.fecha, total: d.netas, porLocal: d.porLocal }));
    return { dias, locales, desde, hasta: hoy };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Más vendidos del mes (con la foto de la prenda)
// ---------------------------------------------------------------------------------------------------------
export interface TopInicio extends TopProducto {
  prenda: PrendaVista | null;
}

export const selTopInicio = crearSelector<{ desde: FechaISO; hasta: FechaISO; localId: Id | 'todos'; medida: 'unidades' | 'valor' | 'margen'; n: number }, TopInicio[]>(
  'selTopInicio',
  unir(selTopProductos, { tablas: ['productos', 'variantes', 'colores'] }),
  (e, p) => selTopProductos(e, { ...p, orden: 'mas' }).map((t) => ({ ...t, prenda: prendaDe(e, t.productoId) })),
);

// ---------------------------------------------------------------------------------------------------------
// Mercancía sin movimiento (60 días), por local
// ---------------------------------------------------------------------------------------------------------
export interface DormidoInicio {
  productoId: Id;
  referencia: string;
  nombre: string;
  unidades: number;
  aCosto: COP;
  /** Última venta (en cualquier local) o null si nunca se vendió. */
  ultimaVenta: FechaISO | null;
  prenda: PrendaVista | null;
}

export interface DormidosInicio {
  /** Las `n` con más plata quieta. */
  items: DormidoInicio[];
  /** Cuántas referencias están dormidas en total. */
  total: number;
  aCosto: COP;
}

/** Las referencias sin movimiento del selector compartido `selSinMovimiento`, del local elegido, con su prenda. */
export const selDormidosInicio = crearSelector<{ dias: number; hoy: FechaISO; localId: Id | 'todos'; n: number }, DormidosInicio>(
  'selDormidosInicio',
  unir(selSinMovimiento, { tablas: ['colores'] }),
  (e, { dias, hoy, localId, n }) => {
    const lista = selSinMovimiento(e, { dias, hoy, localId });
    return {
      items: lista.slice(0, n).map((x) => ({ ...x, prenda: prendaDe(e, x.productoId) })),
      total: lista.length,
      aCosto: lista.reduce((a, x) => a + x.aCosto, 0),
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Tus tres locales (con el id del último cierre para enlazar al detalle de la caja)
// ---------------------------------------------------------------------------------------------------------
export interface LocalInicio extends ComparativoLocal {
  /** Sesión de caja del último cierre (para `rutas.caja({ sesion })`). */
  cierreSesionId: Id | null;
}

export const selLocalesInicio = crearSelector<{ mes: MesISO; hoy: FechaISO }, LocalInicio[]>(
  'selLocalesInicio',
  unir(selComparativoLocales, { tablas: ['sesionesCaja'] }),
  (e, p) => {
    const filas = selComparativoLocales(e, p);
    // Mismo criterio de `selComparativoLocales`: el cierre más reciente de cada local hasta hoy.
    const cerradas = Object.values(e.sesionesCaja)
      .filter((s) => s.cierre && s.cierre.ts.slice(0, 10) <= p.hoy)
      .sort((a, b) => ((a.cierre?.ts ?? '') < (b.cierre?.ts ?? '') ? 1 : -1));
    return filas.map((f) => ({ ...f, cierreSesionId: cerradas.find((s) => s.localId === f.localId)?.id ?? null }));
  },
);

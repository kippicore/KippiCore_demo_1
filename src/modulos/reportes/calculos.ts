import type { FechaHoraISO, FechaISO, Id, LiquidacionNomina, Local, Moneda, Rol } from '@/dominio/tipos';
import { dinero, entero, fecha, numero, porcentaje } from '@/lib/formato';
import { sumaColumna, type TipoColumnaExcel, type ValorCelda } from '@/lib/exportar/excel';
import { IDS_REPORTES, REPORTES, type FiltrosReporte, type HojaReporte, type IdReporte } from '@/reportes';
import { GRUPOS, type GrupoReportes } from './textos';

/**
 * Cálculos propios de la pantalla del centro de reportes (D4). Las FILAS y los TOTALES salen de las definiciones
 * únicas de `@/reportes` (aquí no se arma ninguna fila de reporte): esta capa solo decide qué reportes ve cada rol,
 * qué locales ofrece cada reporte, cómo se completan los filtros y cómo se recorta la vista previa.
 */

/** Filas de la vista previa por hoja. */
export const FILAS_VISTA_PREVIA = 8;

/** Reportes que además tienen sentido para la bodega (el único local que no vende). */
const REPORTES_CON_BODEGA: ReadonlySet<IdReporte> = new Set<IdReporte>(['inventario', 'kardex']);

export function reportesPermitidos(rol: Rol): IdReporte[] {
  return IDS_REPORTES.filter((id) => REPORTES[id].roles.includes(rol));
}

/** Grupos con solo los reportes del rol (los grupos vacíos desaparecen). `contador` no va en ningún grupo. */
export function gruposPermitidos(rol: Rol): GrupoReportes[] {
  const ok = new Set(reportesPermitidos(rol));
  return GRUPOS.map((g) => ({ ...g, ids: g.ids.filter((id) => ok.has(id)) })).filter((g) => g.ids.length > 0);
}

export function grupoDe(id: IdReporte): GrupoReportes | null {
  return GRUPOS.find((g) => g.ids.includes(id)) ?? null;
}

export type MotivoAjuste = 'desconocido' | 'sin_permiso' | null;

/**
 * Reporte abierto: `?reporte=` si es una definición y el rol la ve; si no, el primero del rol. `motivo` explica el
 * ajuste (la pantalla lo avisa con un toast discreto, CONTRATOS 5).
 */
export function resolverReporte(param: string | null, rol: Rol): { id: IdReporte; motivo: MotivoAjuste } {
  const permitidos = reportesPermitidos(rol);
  const primero = gruposPermitidos(rol)[0]?.ids[0] ?? permitidos[0] ?? 'ventas';
  if (!param) return { id: primero, motivo: null };
  const id = IDS_REPORTES.find((x) => x === param);
  if (!id) return { id: primero, motivo: 'desconocido' };
  if (!permitidos.includes(id)) return { id: primero, motivo: 'sin_permiso' };
  return { id, motivo: null };
}

export interface OpcionLocalReporte {
  valor: Id | 'todos';
  etiqueta: string;
}

/** Locales que ofrece un reporte: los que venden y, en inventario y kárdex, también la bodega. */
export function opcionesLocal(id: IdReporte, locales: readonly Local[]): OpcionLocalReporte[] {
  const conBodega = REPORTES_CON_BODEGA.has(id);
  return [
    { valor: 'todos', etiqueta: 'Todos los locales' },
    ...locales.filter((l) => l.vende || conBodega).map((l) => ({ valor: l.id, etiqueta: l.nombre })),
  ];
}

/** Local efectivo: el elegido en la pantalla, si no el de la barra superior, y si el reporte no lo ofrece, todos. */
export function resolverLocal(opciones: readonly OpcionLocalReporte[], elegido: string | null, global: string): Id | 'todos' {
  const existe = (v: string | null): v is string => !!v && opciones.some((o) => o.valor === v);
  if (existe(elegido)) return elegido;
  if (existe(global)) return global;
  return 'todos';
}

export interface EntradaFiltros {
  rango: { desde: FechaISO; hasta: FechaISO };
  localId: Id | 'todos';
  hoy: FechaISO;
  ahora: FechaHoraISO;
  rol: Rol;
  productoId?: Id | null;
  liquidacionId?: Id | 'todas' | null;
}

/** Los filtros que reciben las definiciones: solo los que el reporte usa (el resto no viaja). */
export function armarFiltros(id: IdReporte, e: EntradaFiltros): FiltrosReporte {
  const usa = REPORTES[id].filtros;
  const rango = usa.includes('rango') ? e.rango : { desde: `${e.hoy.slice(0, 7)}-01`, hasta: e.hoy };
  return {
    desde: rango.desde,
    hasta: rango.hasta,
    localId: usa.includes('local') ? e.localId : 'todos',
    hoy: e.hoy,
    ahora: e.ahora,
    rol: e.rol,
    productoId: usa.includes('producto') ? (e.productoId ?? null) : null,
    liquidacionId: usa.includes('liquidacion') && e.liquidacionId && e.liquidacionId !== 'todas' ? e.liquidacionId : null,
  };
}

// ---------------------------------------------------------------------------------------------------------
// Vista previa
// ---------------------------------------------------------------------------------------------------------
export interface VistaHoja {
  nombre: string;
  columnas: HojaReporte['columnas'];
  /** Las primeras filas, ya formateadas por columna (la misma regla del PDF). */
  filas: { indice: number; celdas: Record<string, string> }[];
  totalFilas: number;
  /** Fila de totales ya formateada (suma de TODAS las filas, no solo las que se ven). null = el reporte no trae. */
  totales: Record<string, string> | null;
  nota?: string;
}

const NUMERICOS: readonly TipoColumnaExcel[] = ['moneda', 'numero', 'entero', 'porcentaje'];
export const esNumerica = (t: TipoColumnaExcel) => NUMERICOS.includes(t);

/** Mismo formato que el PDF del reporte (src/reportes/exportar.ts): una sola regla visible. */
export function formatearCelda(v: ValorCelda | undefined, tipo: TipoColumnaExcel, moneda: Moneda): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'string') return tipo === 'fecha' && /^\d{4}-\d{2}-\d{2}/.test(v) ? fecha(v) : v;
  switch (tipo) {
    case 'moneda':
      return dinero(v, moneda);
    case 'porcentaje':
      return porcentaje(v);
    case 'entero':
      return entero(v);
    case 'numero':
      return numero(v, 2);
    default:
      return String(v);
  }
}

/**
 * Recorta las hojas ya convertidas a la moneda activa (`hojasParaExportar`: lo mismo que se escribe en el archivo)
 * a las primeras filas, con los totales de TODAS las filas calculados como los calcula el archivo (`SUM` o valor fijo).
 */
export function resumirHojas(hojas: readonly HojaReporte[], moneda: Moneda, max = FILAS_VISTA_PREVIA): VistaHoja[] {
  return hojas.map((h) => {
    const totales: Record<string, string> | null = h.totales
      ? Object.fromEntries(
          h.columnas.map((c, i) => {
            const t = h.totales?.[c.clave];
            if (t === 'suma') return [c.clave, formatearCelda(sumaColumna(h.filas, c.clave), c.tipo, moneda)];
            if (t !== undefined) return [c.clave, formatearCelda(t, c.tipo, moneda)];
            return [c.clave, i === 0 ? 'Total' : ''];
          }),
        )
      : null;
    return {
      nombre: h.nombre,
      columnas: h.columnas,
      filas: h.filas.slice(0, max).map((f, indice) => ({ indice, celdas: Object.fromEntries(h.columnas.map((c) => [c.clave, formatearCelda(f[c.clave], c.tipo, moneda)])) })),
      totalFilas: h.filas.length,
      totales,
      nota: h.nota,
    };
  });
}

/** ¿El reporte salió vacío en todas sus hojas? (la pantalla lo explica en vez de ofrecer un archivo sin nada). */
export function estaVacio(hojas: readonly Pick<VistaHoja, 'totalFilas'>[]): boolean {
  return hojas.every((h) => h.totalFilas === 0);
}

export function totalFilas(hojas: readonly Pick<VistaHoja, 'totalFilas'>[]): number {
  return hojas.reduce((a, h) => a + h.totalFilas, 0);
}

// ---------------------------------------------------------------------------------------------------------
// Nómina: periodo y desprendibles
// ---------------------------------------------------------------------------------------------------------
export interface OpcionLiquidacion {
  valor: Id | 'todas';
  etiqueta: string;
}

/** "Las del rango de fechas" más cada liquidación (la más reciente primero, como las entrega `selLiquidaciones`). */
export function opcionesLiquidacion(liquidaciones: readonly LiquidacionNomina[]): OpcionLiquidacion[] {
  return [{ valor: 'todas', etiqueta: 'Las que caen en las fechas' }, ...liquidaciones.map((l) => ({ valor: l.id, etiqueta: `${l.periodo.etiqueta} · ${l.numero}` }))];
}

/**
 * Liquidación de la que salen los desprendibles: la elegida o, si el reporte toma "las del rango", la más reciente
 * que termina dentro de las fechas y trae empleados del local elegido.
 */
export function liquidacionParaDesprendibles(
  liquidaciones: readonly LiquidacionNomina[],
  elegida: Id | 'todas',
  rango: { desde: FechaISO; hasta: FechaISO },
  localId: Id | 'todos',
): LiquidacionNomina | null {
  const conEmpleados = (l: LiquidacionNomina) => l.lineas.some((x) => localId === 'todos' || x.localId === localId);
  if (elegida !== 'todas') {
    const l = liquidaciones.find((x) => x.id === elegida);
    return l && conEmpleados(l) ? l : null;
  }
  return liquidaciones.find((l) => l.periodo.fin >= rango.desde && l.periodo.fin <= rango.hasta && conEmpleados(l)) ?? null;
}

/** Empleados de una liquidación (del local elegido) en el orden en que vienen en la liquidación. */
export function empleadosDeLiquidacion(l: LiquidacionNomina, localId: Id | 'todos'): Id[] {
  return l.lineas.filter((x) => localId === 'todos' || x.localId === localId).map((x) => x.empleadoId);
}

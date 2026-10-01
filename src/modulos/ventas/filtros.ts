import type { Canal, FechaISO, Id, MedioPago } from '@/dominio/tipos';
import type { EstadoVenta } from '@/dominio/reglas/ventas';
import { inicioMes } from '@/lib/fechas';
import { MEDIOS_PAGO } from '@/config/negocio';
import type { FiltroVentas } from '@/selectores';

/**
 * Filtros de la lista de ventas (A3) ↔ URL (CONTRATOS §5). Puro: la URL es la fuente de verdad; el contexto
 * (local de la barra superior, rol, reloj) solo completa lo que la URL no trae.
 */
export interface ParamsVentas {
  desde: FechaISO | null;
  hasta: FechaISO | null;
  local: string | null;
  vendedor: string | null;
  cliente: string | null;
  medio: string | null;
  canal: Canal | null;
  estado: EstadoVenta | null;
  producto: string | null;
  /** Búsqueda por número, cliente o vendedor (`?texto=`). */
  texto?: string | null;
  resaltar?: string | null;
}

export type ClaveFiltro =
  'fechas' | 'local' | 'vendedor' | 'cliente' | 'medio' | 'canal' | 'estado' | 'producto';

export interface ContextoFiltros {
  hoy: FechaISO;
  /** Local de la barra superior (`useFiltroLocal()`). */
  localSesion: Id | 'todos';
  /** Rol vendedor: solo sus ventas (y su local). */
  vendedorFijoId: Id | null;
  /** Fecha de la venta que se resalta: si cae fuera del rango por defecto, el rango la incluye. */
  fechaResaltada?: FechaISO | null;
}

export interface FiltrosResueltos {
  rango: { desde: FechaISO; hasta: FechaISO };
  /** true si el rango viene de la URL (no es el mes en curso por defecto). */
  rangoExplicito: boolean;
  localId: Id | 'todos';
  vendedorId: Id | null;
  clienteId: Id | 'consumidor_final' | null;
  medio: MedioPago | null;
  canal: Canal | null;
  estado: EstadoVenta | null;
  productoId: Id | null;
  /** Filtros que el usuario puso (los que van a la URL): alimentan los chips y el contador. */
  activos: ClaveFiltro[];
}

export const CLIENTE_CONSUMIDOR_FINAL = 'consumidor_final';

export function esMedioValido(v: string | null): v is MedioPago {
  return !!v && Object.prototype.hasOwnProperty.call(MEDIOS_PAGO, v);
}

/** Mes en curso hasta hoy. */
export function rangoPorDefecto(hoy: FechaISO): { desde: FechaISO; hasta: FechaISO } {
  return { desde: inicioMes(hoy.slice(0, 7)), hasta: hoy };
}

export function resolverFiltros(p: ParamsVentas, ctx: ContextoFiltros): FiltrosResueltos {
  const porDefecto = rangoPorDefecto(ctx.hoy);
  const activos: ClaveFiltro[] = [];
  let desde = p.desde;
  let hasta = p.hasta;
  const rangoExplicito = !!(desde || hasta);
  if (rangoExplicito) {
    activos.push('fechas');
    if (!hasta) hasta = ctx.hoy;
    if (!desde) desde = inicioMes(hasta.slice(0, 7));
    if (desde > hasta) [desde, hasta] = [hasta, desde];
  } else {
    desde = porDefecto.desde;
    hasta = porDefecto.hasta;
    // Enlace profundo a una venta más vieja que el mes en curso: el rango la incluye.
    if (ctx.fechaResaltada && ctx.fechaResaltada < desde) desde = inicioMes(ctx.fechaResaltada.slice(0, 7));
  }
  let localId: Id | 'todos' = ctx.localSesion;
  if (!ctx.vendedorFijoId && p.local) {
    localId = p.local;
    activos.push('local');
  }
  const vendedorId = ctx.vendedorFijoId ?? p.vendedor;
  if (!ctx.vendedorFijoId && p.vendedor) activos.push('vendedor');
  if (p.cliente) activos.push('cliente');
  const medio = esMedioValido(p.medio) ? p.medio : null;
  if (medio) activos.push('medio');
  if (p.canal) activos.push('canal');
  if (p.estado) activos.push('estado');
  if (p.producto) activos.push('producto');
  return {
    rango: { desde, hasta },
    rangoExplicito,
    localId,
    vendedorId: vendedorId ?? null,
    clienteId: p.cliente ?? null,
    medio,
    canal: p.canal,
    estado: p.estado,
    productoId: p.producto,
    activos,
  };
}

/** Parámetros del selector `selVentas` (solo lo que hay; los `undefined` no entran a la clave de caché). */
export function filtroDeSelector(r: FiltrosResueltos, texto: string): FiltroVentas {
  const f: FiltroVentas = { desde: r.rango.desde, hasta: r.rango.hasta, localId: r.localId };
  if (r.vendedorId) f.vendedorId = r.vendedorId;
  if (r.clienteId) f.clienteId = r.clienteId;
  if (r.medio) f.medio = r.medio;
  if (r.canal) f.canal = r.canal;
  if (r.estado) f.estado = r.estado;
  if (r.productoId) f.productoId = r.productoId;
  const t = texto.trim();
  if (t) f.texto = t;
  return f;
}

/** Nuevos parámetros de URL: los actuales con los cambios aplicados (null quita) y sin `resaltar`. */
export function paramsConCambios(actual: ParamsVentas, cambios: Partial<ParamsVentas>): ParamsVentas {
  return {
    desde: actual.desde,
    hasta: actual.hasta,
    local: actual.local,
    vendedor: actual.vendedor,
    cliente: actual.cliente,
    medio: actual.medio,
    canal: actual.canal,
    estado: actual.estado,
    producto: actual.producto,
    texto: actual.texto ?? null,
    ...cambios,
    resaltar: null,
  };
}

/** Filtros que cuentan para el botón "Filtros" (los de la píldora principal van aparte). */
export function contarEnPanel(activos: readonly ClaveFiltro[]): number {
  return activos.filter((k) => k !== 'fechas' && k !== 'local' && k !== 'estado').length;
}

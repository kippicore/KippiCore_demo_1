import type { CurvaTallas, EstadoTraslado, Id } from '@/dominio/tipos';
import { CURVAS_TALLAS } from '@/seed/tallas';

/**
 * Cálculos propios de las pantallas de Inventario (A2). Puros y sin estado: las reglas de negocio (costos, márgenes,
 * existencias, movimientos) viven en el dominio; aquí solo está lo que decide cómo se ve y qué se sugiere.
 */

// ---------------------------------------------------------------------------------------------------------
// Celdas de la matriz
// ---------------------------------------------------------------------------------------------------------
export type EstadoCelda = 'cero' | 'bajo' | 'normal';

/**
 * 0 → gris tramado; por debajo del mínimo → borde camel; si no, normal. La bodega no vende: no tiene mínimo.
 * Mismo criterio que `selStockBajo` (existencia < mínimo).
 */
export function estadoCelda(existencia: number, minimo: number, vende = true): EstadoCelda {
  if (existencia <= 0) return 'cero';
  if (vende && existencia < minimo) return 'bajo';
  return 'normal';
}

/** Tallas en el orden de su curva (S M L XL XXL, 28…40…); las desconocidas al final, en su orden de llegada. */
export function ordenarTallas(tallas: readonly string[], curva: CurvaTallas): string[] {
  const orden = CURVAS_TALLAS[curva];
  const pos = (t: string) => {
    const i = orden.indexOf(t);
    return i < 0 ? orden.length : i;
  };
  return [...tallas].sort((a, b) => pos(a) - pos(b));
}

// ---------------------------------------------------------------------------------------------------------
// Sugerencia de traslado (W2: "Traer de Zona Rosa (6 disponibles)")
// ---------------------------------------------------------------------------------------------------------
export interface LocalExistencia {
  id: Id;
  vende: boolean;
  existencia: number;
}

export interface SugerenciaOrigen {
  origenId: Id;
  /** Existencias que hay en el origen (lo que dice "6 disponibles"). */
  disponibles: number;
  /** Unidades que se pueden mover sin dejar al origen por debajo de su mínimo. */
  trasladables: number;
  /** Cantidad propuesta: lo que lleva al destino a dos veces su mínimo, sin pasar de lo trasladable. */
  cantidad: number;
}

/** Cuánto se puede sacar de un local: los que venden conservan su mínimo; la bodega puede vaciarse. */
export function trasladables(l: LocalExistencia, minimo: number): number {
  return Math.max(0, l.vende ? l.existencia - minimo : l.existencia);
}

/**
 * De dónde traer una prenda que se acabó en `destinoId`: primero el local que vende con más existencias y con
 * excedente sobre su mínimo; si ninguno tiene, la bodega; si tampoco, null. Con empate gana el orden de `locales`.
 */
export function sugerirOrigen(p: { destinoId: Id; minimo: number; locales: readonly LocalExistencia[] }): SugerenciaOrigen | null {
  const destino = p.locales.find((l) => l.id === p.destinoId);
  const actual = destino?.existencia ?? 0;
  const candidatos = p.locales.filter((l) => l.id !== p.destinoId && trasladables(l, p.minimo) > 0);
  const tiendas = candidatos.filter((l) => l.vende).sort((a, b) => b.existencia - a.existencia);
  const origen = tiendas[0] ?? candidatos.find((l) => !l.vende);
  if (!origen) return null;
  const t = trasladables(origen, p.minimo);
  const meta = Math.max(1, p.minimo * 2 - actual);
  return { origenId: origen.id, disponibles: origen.existencia, trasladables: t, cantidad: Math.min(t, meta) };
}

// ---------------------------------------------------------------------------------------------------------
// Traslados
// ---------------------------------------------------------------------------------------------------------
export interface AccionesTraslado {
  aprobar: boolean;
  despachar: boolean;
  recibir: boolean;
  cancelar: boolean;
}

/** Qué se puede hacer con un traslado según su estado y su aprobación (la regla de fondo la valida el dominio). */
export function accionesTraslado(t: { estado: EstadoTraslado; aprobacion: 'no_requerida' | 'pendiente' | 'aprobada' | 'rechazada' }): AccionesTraslado {
  const solicitado = t.estado === 'solicitado';
  return {
    aprobar: solicitado && t.aprobacion === 'pendiente',
    despachar: solicitado && (t.aprobacion === 'no_requerida' || t.aprobacion === 'aprobada'),
    recibir: t.estado === 'en_transito',
    cancelar: solicitado || t.estado === 'en_transito',
  };
}

/** Posición del estado en la línea de tiempo (0 solicitado, 1 en tránsito, 2 recibido); el cancelado no avanza. */
export function etapaTraslado(estado: EstadoTraslado): number {
  return estado === 'solicitado' ? 0 : estado === 'en_transito' ? 1 : estado === 'recibido' ? 2 : -1;
}

// ---------------------------------------------------------------------------------------------------------
// Conteo físico
// ---------------------------------------------------------------------------------------------------------
export type TipoDiferencia = 'sin_contar' | 'cuadra' | 'sobrante' | 'faltante';

export interface DiferenciaConteo {
  tipo: TipoDiferencia;
  /** contado − sistema; null si aún no se contó. */
  diferencia: number | null;
}

export function diferenciaConteo(sistema: number, contado: number | null): DiferenciaConteo {
  if (contado === null) return { tipo: 'sin_contar', diferencia: null };
  const d = contado - sistema;
  return { tipo: d === 0 ? 'cuadra' : d > 0 ? 'sobrante' : 'faltante', diferencia: d };
}

export interface ResumenConteo {
  total: number;
  contadas: number;
  sinContar: number;
  conDiferencia: number;
  unidadesSobrantes: number;
  unidadesFaltantes: number;
  /** Valor de las diferencias a costo (con signo); solo se muestra al dueño. */
  valorDiferencia: number;
}

export function resumirConteo(lineas: readonly { sistema: number; contado: number | null; costo: number }[]): ResumenConteo {
  const r: ResumenConteo = { total: lineas.length, contadas: 0, sinContar: 0, conDiferencia: 0, unidadesSobrantes: 0, unidadesFaltantes: 0, valorDiferencia: 0 };
  for (const l of lineas) {
    const { tipo, diferencia } = diferenciaConteo(l.sistema, l.contado);
    if (tipo === 'sin_contar') {
      r.sinContar += 1;
      continue;
    }
    r.contadas += 1;
    if (diferencia === null || diferencia === 0) continue;
    r.conDiferencia += 1;
    if (diferencia > 0) r.unidadesSobrantes += diferencia;
    else r.unidadesFaltantes += -diferencia;
    r.valorDiferencia += diferencia * l.costo;
  }
  return r;
}

// ---------------------------------------------------------------------------------------------------------
// Recepción: distribución propuesta por local
// ---------------------------------------------------------------------------------------------------------
/** Parte de lo recibido que se queda en bodega antes de repartir (reserva para reponer sobre la marcha). */
export const RESERVA_BODEGA = 0.2;

/**
 * Reparte `buenas` unidades entre los locales en proporción a lo que cada uno vendió (método del mayor resto,
 * así la suma es exacta). Sin ventas en ninguno, reparte parejo. Lo que no se reparte se queda en la bodega.
 */
export function proponerDistribucion(p: {
  buenas: number;
  destinos: readonly { id: Id; ventas: number }[];
  reserva?: number;
}): Record<Id, number> {
  const r: Record<Id, number> = {};
  for (const d of p.destinos) r[d.id] = 0;
  if (p.buenas <= 0 || p.destinos.length === 0) return r;
  const paraLocales = Math.floor(p.buenas * (1 - (p.reserva ?? RESERVA_BODEGA)));
  const total = p.destinos.reduce((a, d) => a + Math.max(0, d.ventas), 0);
  const pesos = p.destinos.map((d) => (total > 0 ? Math.max(0, d.ventas) / total : 1 / p.destinos.length));
  const base = pesos.map((w) => Math.floor(paraLocales * w));
  let faltan = paraLocales - base.reduce((a, b) => a + b, 0);
  const restos = pesos.map((w, i) => ({ i, resto: paraLocales * w - (base[i] ?? 0) })).sort((a, b) => b.resto - a.resto || a.i - b.i);
  for (const { i } of restos) {
    if (faltan <= 0) break;
    base[i] = (base[i] ?? 0) + 1;
    faltan -= 1;
  }
  p.destinos.forEach((d, i) => {
    r[d.id] = base[i] ?? 0;
  });
  return r;
}

// ---------------------------------------------------------------------------------------------------------
// Precio y margen (W4): el margen que se tenía antes del último cambio de costo
// ---------------------------------------------------------------------------------------------------------
export interface CambioDeCosto {
  costoAnterior: number;
  costoActual: number;
  /** Variación del costo (0,08 = subió 8 %). */
  variacion: number;
}

/** Último cambio de costo del historial (el más reciente respecto al inmediatamente anterior), o null. */
export function ultimoCambioDeCosto(historial: readonly { costo: number }[]): CambioDeCosto | null {
  const h = historial.filter((x) => x.costo > 0);
  if (h.length < 2) return null;
  let i = h.length - 1;
  while (i > 0 && h[i]?.costo === h[i - 1]?.costo) i -= 1;
  if (i === 0) return null;
  const actual = h[i]?.costo ?? 0;
  const anterior = h[i - 1]?.costo ?? 0;
  if (anterior <= 0) return null;
  return { costoAnterior: anterior, costoActual: actual, variacion: (actual - anterior) / anterior };
}

// ---------------------------------------------------------------------------------------------------------
// Variantes: talla y color de la referencia
// ---------------------------------------------------------------------------------------------------------
/** Clave `${talla}|${colorId}` de la matriz (la del selector compartido). */
export function claveVariante(talla: string, colorId: Id): string {
  return `${talla}|${colorId}`;
}

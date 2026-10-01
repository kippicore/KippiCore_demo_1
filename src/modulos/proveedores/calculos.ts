import type { FechaISO, Id, Importacion, ParametrosAduanas, Proveedor } from '@/dominio/tipos';
import { diferenciaDias } from '@/dominio/reglas/fechas';
import { hitosIniciales } from '@/dominio/reglas/importaciones';
import { normalizar } from '@/dominio/reglas/texto';
import { numero, plural } from '@/lib/formato';

/**
 * Cálculos propios de la pantalla de Proveedores (B2). Puros y sin React: se prueban en `calculos.test.ts`.
 * Las reglas de negocio (retraso contra la estimada original, defectos, costo por unidad) viven en
 * `selectores/proveedores.ts`; aquí solo se compone, se clasifica y se redacta lo que la pantalla muestra.
 */

// ---------------------------------------------------------------------------------------------------------
// Niveles de puntualidad y de defectos (parámetros de la pantalla, valores de ejemplo)
// ---------------------------------------------------------------------------------------------------------
export const UMBRALES = {
  /** Días de retraso promedio a partir de los cuales una fábrica merece atención / es crítica. */
  retrasoAtencion: 5,
  retrasoCritico: 10,
  /** Fracción de prendas defectuosas (0,02 = 2 %). */
  defectosAtencion: 0.02,
  defectosCritico: 0.04,
  /** Pedidos recibidos mínimos para sacar conclusiones de una fábrica. */
  pedidosMinimos: 2,
  /** A partir de cuántas veces los defectos de la mejor fábrica se habla de "veces más". */
  razonRelevante: 1.5,
} as const;

export type Nivel = 'bien' | 'atencion' | 'critico';

export function nivelRetraso(dias: number | null): Nivel | null {
  if (dias === null) return null;
  if (dias > UMBRALES.retrasoCritico) return 'critico';
  if (dias > UMBRALES.retrasoAtencion) return 'atencion';
  return 'bien';
}

export function nivelDefectos(fraccion: number | null): Nivel | null {
  if (fraccion === null) return null;
  if (fraccion > UMBRALES.defectosCritico) return 'critico';
  if (fraccion > UMBRALES.defectosAtencion) return 'atencion';
  return 'bien';
}

export type VeredictoFabrica = 'confiable' | 'reservas' | 'incumple' | 'sin_datos';

export interface MetricasFabrica {
  retrasoPromedio: number | null;
  defectos: number | null;
  pedidosRecibidos: number;
}

/** Veredicto de una fábrica: el peor de sus dos niveles. Con menos pedidos de los mínimos no se concluye. */
export function veredictoFabrica(f: MetricasFabrica): { veredicto: VeredictoFabrica; motivos: string[] } {
  const r = nivelRetraso(f.retrasoPromedio);
  const d = nivelDefectos(f.defectos);
  if ((r === null && d === null) || f.pedidosRecibidos === 0) return { veredicto: 'sin_datos', motivos: [] };
  const motivos: string[] = [];
  if (r === 'critico') motivos.push(`llega ${plural(Math.round(f.retrasoPromedio ?? 0), 'día')} tarde en promedio`);
  else if (r === 'atencion') motivos.push(`se atrasa ${plural(Math.round(f.retrasoPromedio ?? 0), 'día')} en promedio`);
  if (d === 'critico') motivos.push('tasa de defectos alta');
  else if (d === 'atencion') motivos.push('defectos por encima de lo normal');
  if (r === 'critico' || d === 'critico') return { veredicto: 'incumple', motivos };
  if (r === 'atencion' || d === 'atencion') return { veredicto: 'reservas', motivos };
  return { veredicto: 'confiable', motivos: ['llega a tiempo y con pocos defectos'] };
}

// ---------------------------------------------------------------------------------------------------------
// Entregas por pedido
// ---------------------------------------------------------------------------------------------------------
export interface EntregaPedido {
  importacionId: Id;
  numero: string;
  proveedorId: Id;
  fechaPedido: FechaISO;
  /** Fecha de llegada a bodega estimada al hacer el pedido (sin reprogramaciones). */
  estimadaOriginal: FechaISO;
  recibida: FechaISO;
  /** Días de retraso (negativo: llegó antes). */
  retraso: number;
  aTiempo: boolean;
  /** Días del pedido a la recepción. */
  diasEntrega: number;
  unidadesRecibidas: number;
  unidadesDefectuosas: number;
  tasaDefectos: number | null;
}

/** Entrega de un pedido ya recibido, con la definición de P14 (retraso contra la estimada ORIGINAL). */
export function entregaDe(imp: Importacion, dias: ParametrosAduanas['diasEstimadosEntreEstados']): EntregaPedido | null {
  if (!imp.recepcion || imp.eliminadoEn || imp.nota === 'Carga inicial de existencias') return null;
  const estimadaOriginal = hitosIniciales(imp.fechaPedido, dias).recibido_bodega.estimada;
  const retraso = diferenciaDias(estimadaOriginal, imp.recepcion.fecha);
  let recibidas = 0;
  let defectuosas = 0;
  for (const l of Object.values(imp.recepcion.lineas)) {
    recibidas += l.recibidas;
    defectuosas += l.defectuosas;
  }
  return {
    importacionId: imp.id,
    numero: imp.numero,
    proveedorId: imp.proveedorId,
    fechaPedido: imp.fechaPedido,
    estimadaOriginal,
    recibida: imp.recepcion.fecha,
    retraso,
    aTiempo: retraso <= 0,
    diasEntrega: diferenciaDias(imp.fechaPedido, imp.recepcion.fecha),
    unidadesRecibidas: recibidas,
    unidadesDefectuosas: defectuosas,
    tasaDefectos: recibidas > 0 ? defectuosas / recibidas : null,
  };
}

export interface ResumenEntregas {
  pedidos: number;
  retrasoPromedio: number | null;
  aTiempo: number | null;
  /** Defectuosas sobre recibidas de todos los pedidos (ponderada por unidades). */
  defectos: number | null;
  diasEntregaPromedio: number | null;
}

export function resumenEntregas(entregas: readonly EntregaPedido[]): ResumenEntregas {
  const n = entregas.length;
  let retraso = 0;
  let aTiempo = 0;
  let dias = 0;
  let recibidas = 0;
  let defectuosas = 0;
  for (const e of entregas) {
    retraso += e.retraso;
    if (e.aTiempo) aTiempo += 1;
    dias += e.diasEntrega;
    recibidas += e.unidadesRecibidas;
    defectuosas += e.unidadesDefectuosas;
  }
  return {
    pedidos: n,
    retrasoPromedio: n ? retraso / n : null,
    aTiempo: n ? aTiempo / n : null,
    defectos: recibidas ? defectuosas / recibidas : null,
    diasEntregaPromedio: n ? dias / n : null,
  };
}

// ---------------------------------------------------------------------------------------------------------
// Hallazgos del comparativo (el momento "qué fábrica llega tarde")
// ---------------------------------------------------------------------------------------------------------
export interface FabricaComparable extends MetricasFabrica {
  proveedorId: Id;
  nombre: string;
}

export interface Hallazgos<F extends FabricaComparable> {
  /** La que más tarde llega (por encima del umbral de atención); null si ninguna. */
  masTarde: F | null;
  /** La de mayor tasa de defectos (por encima del umbral de atención); null si ninguna. */
  masDefectos: F | null;
  /** La más puntual y la de menos defectos, como referencia. */
  masPuntual: F | null;
  menosDefectos: F | null;
  /** Defectos de `masDefectos` sobre los de `menosDefectos` (veces). */
  razonDefectos: number | null;
  /** Frase principal y frases de apoyo, listas para mostrar. */
  titular: string;
  apoyo: string[];
}

/** Hasta cuántos días de retraso (promedio o de un pedido) se sigue diciendo "a tiempo". */
export const RETRASO_A_TIEMPO = 0.5;

/** Redacta "14 días" o "1 día" con el redondeo que se lee bien en una frase. */
export function diasEnFrase(dias: number): string {
  return plural(Math.max(1, Math.round(dias)), 'día');
}

/** "4,2 veces" (una cifra decimal solo si hace falta). */
export function vecesEnFrase(razon: number): string {
  const r = Math.round(razon * 10) / 10;
  return `${numero(r, 1)} ${r === 1 ? 'vez' : 'veces'}`;
}

export function hallazgosComparativo<F extends FabricaComparable>(filas: readonly F[]): Hallazgos<F> {
  const validas = filas.filter((f) => f.pedidosRecibidos >= UMBRALES.pedidosMinimos);
  const conRetraso = validas.filter((f) => f.retrasoPromedio !== null);
  const conDefectos = validas.filter((f) => f.defectos !== null);
  const orden = <T,>(xs: readonly T[], clave: (x: T) => number, desc: boolean): T | null =>
    xs.length ? ([...xs].sort((a, b) => (desc ? clave(b) - clave(a) : clave(a) - clave(b)))[0] ?? null) : null;

  const peorRetraso = orden(conRetraso, (f) => f.retrasoPromedio ?? 0, true);
  const peorDefectos = orden(conDefectos, (f) => f.defectos ?? 0, true);
  const masPuntual = orden(conRetraso, (f) => f.retrasoPromedio ?? 0, false);
  const menosDefectos = orden(conDefectos, (f) => f.defectos ?? 0, false);

  const masTarde = peorRetraso && (peorRetraso.retrasoPromedio ?? 0) > UMBRALES.retrasoAtencion ? peorRetraso : null;
  const masDefectos = peorDefectos && (peorDefectos.defectos ?? 0) > UMBRALES.defectosAtencion ? peorDefectos : null;
  const razonDefectos =
    masDefectos && menosDefectos && menosDefectos.proveedorId !== masDefectos.proveedorId && (menosDefectos.defectos ?? 0) > 0
      ? (masDefectos.defectos ?? 0) / (menosDefectos.defectos ?? 1)
      : null;
  const hablaDeVeces = razonDefectos !== null && razonDefectos >= UMBRALES.razonRelevante;

  const apoyo: string[] = [];
  let titular: string;
  if (masTarde && masDefectos && masTarde.proveedorId === masDefectos.proveedorId) {
    titular = `${masTarde.nombre} llega en promedio ${diasEnFrase(masTarde.retrasoPromedio ?? 0)} tarde`;
    titular += hablaDeVeces && menosDefectos ? ` y tiene ${vecesEnFrase(razonDefectos)} más defectos que ${menosDefectos.nombre}.` : ' y además tiene una tasa de defectos alta.';
  } else if (masTarde) {
    titular = `${masTarde.nombre} es la que más tarde llega: ${diasEnFrase(masTarde.retrasoPromedio ?? 0)} de retraso en promedio.`;
    if (masDefectos)
      apoyo.push(
        `${masDefectos.nombre} tiene la mayor tasa de defectos${hablaDeVeces && menosDefectos ? `, ${vecesEnFrase(razonDefectos)} la de ${menosDefectos.nombre}` : ''}.`,
      );
  } else if (masDefectos) {
    titular = `${masDefectos.nombre} tiene la mayor tasa de defectos${hablaDeVeces && menosDefectos ? `: ${vecesEnFrase(razonDefectos)} la de ${menosDefectos.nombre}` : ''}.`;
  } else if (validas.length) {
    titular = 'Por ahora ninguna fábrica se sale de los márgenes de puntualidad y de defectos.';
  } else {
    titular = 'Todavía no hay pedidos recibidos suficientes para comparar a las fábricas.';
  }
  if (masTarde && masPuntual && masPuntual.proveedorId !== masTarde.proveedorId) {
    // Misma regla que `etiquetaRetraso` y la insignia de la tabla: hasta medio día de retraso promedio es "a tiempo".
    const retraso = masPuntual.retrasoPromedio ?? 0;
    apoyo.push(
      retraso <= RETRASO_A_TIEMPO
        ? `${masPuntual.nombre} es la más puntual: llega a tiempo en promedio.`
        : `${masPuntual.nombre} es la más puntual, con ${diasEnFrase(retraso)} de retraso en promedio.`,
    );
  }
  return { masTarde, masDefectos, masPuntual, menosDefectos, razonDefectos, titular, apoyo };
}

/** "A tiempo" o "+14 días" (retraso promedio o de un pedido). */
export function etiquetaRetraso(dias: number | null): string {
  if (dias === null) return '—';
  if (dias <= RETRASO_A_TIEMPO) return dias < -0.5 ? `${plural(Math.round(-dias), 'día')} antes` : 'A tiempo';
  return `+${plural(Math.round(dias), 'día')}`;
}

/** Saludo prellenado para un contacto de la cadena (en inglés para las fábricas; usted por defecto en Colombia). */
export function saludoContacto(c: { nombre: string; idioma: 'es' | 'en'; tratamiento: 'tu' | 'usted' }, marca: string): string {
  const primero = c.nombre.trim().split(/\s+/)[0] ?? c.nombre;
  if (c.idioma === 'en') return `Hello ${primero}, this is ${marca}. I would like to follow up on our orders.`;
  return c.tratamiento === 'usted'
    ? `Hola ${primero}, le escribo de ${marca} para hacerle seguimiento a nuestros pedidos.`
    : `Hola ${primero}, te escribo de ${marca} para hacerle seguimiento a nuestros pedidos.`;
}

/** Nombre corto para el eje de un gráfico: "Ningbo Weiye" → "Weiye". */
export function nombreEje(nombreCorto: string): string {
  const partes = nombreCorto.trim().split(/\s+/);
  return partes[partes.length - 1] ?? nombreCorto;
}

// ---------------------------------------------------------------------------------------------------------
// Filtros del directorio
// ---------------------------------------------------------------------------------------------------------
export interface FiltrosDirectorio {
  texto: string;
  tipo: Proveedor['tipo'] | 'todos';
  /** Local explícito (URL o filtro): solo los proveedores asociados a ese local. */
  local: Id | 'todos';
  /** Local de la barra superior: sus proveedores y los generales (sin local). */
  localBarra: Id | 'todos';
  pais: string;
  moneda: string;
}

export const SIN_FILTROS: FiltrosDirectorio = { texto: '', tipo: 'todos', local: 'todos', localBarra: 'todos', pais: 'todos', moneda: 'todos' };

export function filtrarDirectorio<F extends { proveedor: Proveedor; categoriaTexto: string }>(filas: readonly F[], f: FiltrosDirectorio): F[] {
  const t = f.texto.trim() ? normalizar(f.texto) : '';
  return filas.filter(({ proveedor: p, categoriaTexto }) => {
    if (f.tipo !== 'todos' && p.tipo !== f.tipo) return false;
    if (f.local !== 'todos' && p.localId !== f.local) return false;
    if (f.local === 'todos' && f.localBarra !== 'todos' && p.localId !== null && p.localId !== f.localBarra) return false;
    if (f.pais !== 'todos' && p.pais !== f.pais) return false;
    if (f.moneda !== 'todos' && p.moneda !== f.moneda) return false;
    if (t && !normalizar(`${p.nombre} ${p.nombreCorto} ${p.ciudad} ${p.pais} ${categoriaTexto}`).includes(t)) return false;
    return true;
  });
}

/** Opciones únicas (ordenadas) de un campo de los proveedores para los filtros de país y moneda. */
export function valoresUnicos(proveedores: readonly Proveedor[], campo: 'pais' | 'moneda'): string[] {
  return [...new Set(proveedores.map((p) => p[campo]))].sort((a, b) => a.localeCompare(b, 'es'));
}

// ---------------------------------------------------------------------------------------------------------
// Validación del formulario (las reglas son las del dominio; esto solo adelanta el mensaje junto al campo)
// ---------------------------------------------------------------------------------------------------------
const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_WHATSAPP = /^\+?[\d\s]{7,20}$/;

export interface ErroresContacto {
  nombre?: string;
  correo?: string;
  whatsapp?: string;
}

export function validarContacto(c: { nombre: string; correo: string; whatsapp: string }): ErroresContacto {
  const e: ErroresContacto = {};
  if (!c.nombre.trim()) e.nombre = 'Escribe el nombre del contacto.';
  if (!RE_CORREO.test(c.correo.trim())) e.correo = 'Escribe un correo válido.';
  if (!RE_WHATSAPP.test(c.whatsapp.trim())) e.whatsapp = 'Escribe el WhatsApp con indicativo, por ejemplo +57 310 123 4567.';
  return e;
}

export interface ErroresProveedor {
  nombre?: string;
  nombreCorto?: string;
  ciudad?: string;
  condicionesPago?: string;
}

export function validarProveedor(p: { nombre: string; nombreCorto: string; ciudad: string; condicionesPago: string }): ErroresProveedor {
  const e: ErroresProveedor = {};
  if (!p.nombre.trim()) e.nombre = 'Escribe el nombre del proveedor.';
  if (!p.nombreCorto.trim()) e.nombreCorto = 'Escribe un nombre corto.';
  if (!p.ciudad.trim()) e.ciudad = 'Escribe la ciudad.';
  if (!p.condicionesPago.trim()) e.condicionesPago = 'Escribe las condiciones de pago.';
  return e;
}

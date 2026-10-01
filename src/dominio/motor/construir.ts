import type { EntradaRegistro, EstadoDominio, FechaHoraISO, FechaISO, SobreComando } from '../tipos';
import { aplicarConstruccion } from './aplicar';

/**
 * Construcción del estado por días (PLAN 5.6.2, 5.6.4). El dominio no conoce al generador: recibe una
 * `FuenteGenerada` (F2-A2 la implementa con planGlobal, planificarDia y materializar). Los comandos del usuario
 * se intercalan por su marca de agua en el orden total (marcaAgua, ts, seq, id): un comando se aplica después de
 * todas las intenciones con ts ≤ marcaAgua y antes de las que tienen ts > marcaAgua, así se reaplica exacto.
 */
export interface Intencion {
  /** Estable: 'venta:2026-09-30:zr:014' (siembra su PRNG y su ID). */
  clave: string;
  ts: FechaHoraISO;
}

export interface FuenteGenerada<I extends Intencion = Intencion> {
  /** Días a recorrer en orden (incluida la víspera de la ventana, con la carga inicial). */
  dias: readonly FechaISO[];
  /** Intenciones del día ordenadas por ts; no lee el estado. */
  planificarDia(dia: FechaISO): readonly I[];
  /** Comandos de una intención contra el estado actual (aplica las guardas de 7.4). */
  materializar(intencion: I, estado: EstadoDominio): Iterable<SobreComando>;
}

export interface EntradaConstruccion<I extends Intencion = Intencion> {
  /** Estado inicial ya enriquecido por el generador (se muta). */
  estado: EstadoDominio;
  fuente: FuenteGenerada<I>;
  /** Instante hasta el que se construye (Bogotá). */
  ahora: FechaHoraISO;
  registro: readonly EntradaRegistro[];
  /** Diagnóstico opcional de comandos generados omitidos. */
  alOmitirGenerado?: (sobre: SobreComando, mensaje: string) => void;
}

export interface Progreso {
  dia: FechaISO;
  /** 0–100. */
  porcentaje: number;
}

/** Orden total del registro: (marcaAgua, ts, seq, id). */
export function compararEntradas(a: EntradaRegistro, b: EntradaRegistro): number {
  if (a.marcaAgua !== b.marcaAgua) return a.marcaAgua < b.marcaAgua ? -1 : 1;
  if (a.ts !== b.ts) return a.ts < b.ts ? -1 : 1;
  if (a.seq !== b.seq) return a.seq - b.seq;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function ordenarRegistro(entradas: readonly EntradaRegistro[]): EntradaRegistro[] {
  return [...entradas].sort(compararEntradas);
}

/** Marca de agua de un comando nuevo: max(generadoHasta de la sesión, mayor marca del registro) (monótona). */
export function marcaAguaNueva(
  generadoHasta: FechaHoraISO,
  registro: readonly Pick<EntradaRegistro, 'marcaAgua'>[],
): FechaHoraISO {
  let m = generadoHasta;
  for (const e of registro) if (e.marcaAgua > m) m = e.marcaAgua;
  return m;
}

/** Fusiona registros (otra pestaña, QR) por id de entrada, conservando el orden total. */
export function fusionarRegistros(
  a: readonly EntradaRegistro[],
  b: readonly EntradaRegistro[],
): EntradaRegistro[] {
  const porId = new Map<string, EntradaRegistro>();
  for (const e of a) porId.set(e.id, e);
  for (const e of b) if (!porId.has(e.id)) porId.set(e.id, e);
  return ordenarRegistro([...porId.values()]);
}

function aplicarUsuario(estado: EstadoDominio, entrada: EntradaRegistro): void {
  const r = aplicarConstruccion(estado, entrada);
  if (!r.ok) estado.meta.omitidosUsuario.push({ entradaId: entrada.id, motivo: r.error.mensaje });
}

export function* construir<I extends Intencion>(
  e: EntradaConstruccion<I>,
): Generator<Progreso, EstadoDominio, void> {
  const { estado, fuente, ahora } = e;
  const cola = ordenarRegistro(e.registro);
  let k = 0;
  const total = fuente.dias.length;
  let terminado = false;
  for (let i = 0; i < total && !terminado; i++) {
    const dia = fuente.dias[i];
    if (dia === undefined) continue;
    for (const intencion of fuente.planificarDia(dia)) {
      if (intencion.ts > ahora) {
        terminado = true;
        break;
      }
      while (k < cola.length && (cola[k]?.marcaAgua ?? '') < intencion.ts)
        aplicarUsuario(estado, cola[k++] as EntradaRegistro);
      for (const sobre of fuente.materializar(intencion, estado)) {
        const r = aplicarConstruccion(estado, sobre);
        if (!r.ok) {
          estado.meta.omitidosGenerador += 1;
          e.alOmitirGenerado?.(sobre, r.error.mensaje);
        }
      }
    }
    yield { dia, porcentaje: Math.round(((i + 1) * 100) / Math.max(1, total)) };
  }
  while (k < cola.length) aplicarUsuario(estado, cola[k++] as EntradaRegistro);
  estado.meta.generadoHasta = ahora;
  return estado;
}

/** Construcción completa sin ceder el control (Node, pruebas y respaldo en el hilo principal). */
export function construirSincrono<I extends Intencion>(e: EntradaConstruccion<I>): EstadoDominio {
  const g = construir(e);
  for (;;) {
    const paso = g.next();
    if (paso.done) return paso.value;
  }
}

import type { EntradaRegistro, FechaHoraISO } from '../tipos';

/**
 * Orden y fusión del registro de comandos del usuario (PLAN 5.6.4, 5.6.8). Separado de `construir.ts` (ajuste
 * F2-B) para que el hilo principal pueda fusionar registros y calcular la marca de agua sin cargar el motor
 * completo (los comandos y la semilla viajan en un chunk diferido).
 */
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


/**
 * CUFE / CUDE / CUNE simulados (PLAN 6.14): hash determinista de 96 hexadecimales. No es el algoritmo de la
 * DIAN (que usa SHA-384); es una mezcla de 32 bits con Math.imul, igual en todos los motores.
 */
function mezcla32(texto: string, semilla: number): number {
  let h = semilla >>> 0;
  for (let i = 0; i < texto.length; i++) {
    h = Math.imul(h ^ texto.charCodeAt(i), 0x5bd1e995);
    h ^= h >>> 13;
  }
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Hash hexadecimal de `longitud` caracteres (múltiplo de 8). */
export function hashHex(texto: string, longitud = 96): string {
  let s = '';
  for (let i = 0; s.length < longitud; i++)
    s += mezcla32(texto, 0x9e3779b9 + i * 0x7f4a7c15)
      .toString(16)
      .padStart(8, '0');
  return s.slice(0, longitud);
}

/** CUFE simulado de una factura o CUDE de un documento POS / nota crédito. */
export function codigoUnicoSimulado(campos: {
  numero: string;
  ts: string;
  total: number;
  iva: number;
  nitEmisor: string;
  adquirente: string;
}): string {
  return hashHex(
    `${campos.numero}|${campos.ts}|${campos.total}|${campos.iva}|${campos.nitEmisor}|${campos.adquirente}`,
  );
}

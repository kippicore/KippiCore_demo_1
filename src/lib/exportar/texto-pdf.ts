/**
 * Normalizador de texto para el PDF (PLAN 5.12): espacio angosto (U+202F) a espacio duro (U+00A0), comillas y
 * apóstrofos raros a tipográficos soportados, sin caracteres de control. Con la fuente de respaldo (Helvetica,
 * WinAnsi) además reemplaza el signo menos (U+2212) por el guion y quita lo que esté fuera de Latin-1.
 * Los caracteres se escriben por código (String.fromCharCode) para que el archivo no tenga espacios raros.
 */
const c = (...codigos: number[]) => String.fromCharCode(...codigos);
const clase = (desde: number, hasta: number) => `${c(desde)}-${c(hasta)}`;

const ANGOSTO = new RegExp(c(0x202f), 'g');
const COMILLA_SIMPLE_RARA = new RegExp(`[${c(0x2018, 0x201b, 0x2032)}]`, 'g');
const COMILLA_DOBLE_RARA = new RegExp(`[${c(0x201f, 0x2033)}]`, 'g');
const CONTROL = new RegExp(`[${clase(0, 8)}${c(0x0b, 0x0c)}${clase(0x0e, 0x1f)}${c(0x7f)}]`, 'g');
const MENOS = new RegExp(c(0x2212), 'g');
const RAYAS = new RegExp(`[${c(0x2013, 0x2014)}]`, 'g');
const SIMPLES = new RegExp(`[${c(0x2018, 0x2019)}]`, 'g');
const DOBLES = new RegExp(`[${c(0x201c, 0x201d)}]`, 'g');
const ELIPSIS = new RegExp(c(0x2026), 'g');
const VINETA = new RegExp(c(0x2022), 'g');
const FUERA_DE_LATIN1 = new RegExp(`[^${clase(0, 0xff)}${c(0x20ac)}]`, 'g');

export function normalizarTextoPdf(texto: string, respaldo = false): string {
  let t = texto
    .replace(ANGOSTO, c(0xa0))
    .replace(COMILLA_SIMPLE_RARA, c(0x2019))
    .replace(COMILLA_DOBLE_RARA, c(0x201d))
    .replace(CONTROL, '');
  if (respaldo) {
    t = t
      .replace(MENOS, '-')
      .replace(RAYAS, '-')
      .replace(SIMPLES, "'")
      .replace(DOBLES, '"')
      .replace(ELIPSIS, '...')
      .replace(VINETA, c(0xb7))
      .replace(FUERA_DE_LATIN1, '');
  }
  return t;
}

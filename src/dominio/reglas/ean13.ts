/**
 * EAN-13 (PLAN 7.13, 5.13): prefijo 20–29 de circulación interna, dígito de control y codificación en 95
 * módulos para dibujar el código como rectángulos vectoriales en el PDF.
 */

/** Dígito de control a partir de los 12 primeros dígitos: impares × 1 + pares × 3 (desde la izquierda). */
export function digitoControlEan13(doce: string): number {
  if (!/^\d{12}$/.test(doce)) throw new Error('Se esperaban 12 dígitos');
  let suma = 0;
  for (let i = 0; i < 12; i++) suma += Number(doce[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (suma % 10)) % 10;
}

export function esEan13Valido(ean: string): boolean {
  return /^\d{13}$/.test(ean) && digitoControlEan13(ean.slice(0, 12)) === Number(ean[12]);
}

/** '20' + empresa (3) + consecutivo de variante (7) + control. */
export function generarEan13(prefijo: string, empresa: string, consecutivo: number): string {
  const cuerpo = `${prefijo}${empresa}${String(consecutivo).padStart(7, '0')}`;
  if (cuerpo.length !== 12) throw new Error('Prefijo, empresa y consecutivo deben sumar 12 dígitos');
  return `${cuerpo}${digitoControlEan13(cuerpo)}`;
}

const L = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
];
const G = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
];
const R = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100',
];
/** Paridad del lado izquierdo según el primer dígito. */
const PARIDAD = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
];

/** Codifica un EAN-13 válido en 95 módulos ('1' barra, '0' espacio). */
export function codificarEan13(ean: string): string {
  if (!esEan13Valido(ean)) throw new Error(`EAN-13 inválido: ${ean}`);
  const d = ean.split('').map(Number);
  const paridad = PARIDAD[d[0] ?? 0] ?? 'LLLLLL';
  let s = '101';
  for (let i = 1; i <= 6; i++) s += (paridad[i - 1] === 'L' ? L : G)[d[i] ?? 0];
  s += '01010';
  for (let i = 7; i <= 12; i++) s += R[d[i] ?? 0];
  return `${s}101`;
}

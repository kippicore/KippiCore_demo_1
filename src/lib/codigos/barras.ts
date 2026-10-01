import { codificarEan13, esEan13Valido } from '@/dominio/reglas/ean13';

/**
 * EAN-13 (PLAN 5.13): en pantalla como SVG nítido y en PDF como rectángulos vectoriales (sin canvas), a partir de
 * los 95 módulos de `dominio/reglas/ean13.ts`.
 */
export interface Barra {
  /** Posición en módulos (0–94). */
  x: number;
  /** Ancho en módulos. */
  ancho: number;
  /** Barras de guarda (más largas). */
  guarda: boolean;
}

const GUARDAS = new Set([0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94]);

/** Barras de un EAN-13 (módulos negros agrupados). */
export function barrasEan13(ean: string): Barra[] {
  if (!esEan13Valido(ean)) throw new Error(`EAN-13 inválido: ${ean}`);
  const modulos = codificarEan13(ean);
  const barras: Barra[] = [];
  let i = 0;
  while (i < modulos.length) {
    if (modulos[i] === '1') {
      let j = i;
      while (j < modulos.length && modulos[j] === '1') j++;
      barras.push({ x: i, ancho: j - i, guarda: GUARDAS.has(i) });
      i = j;
    } else i++;
  }
  return barras;
}

/** SVG de un EAN-13 (con números legibles bajo las barras). */
export function ean13ASvg(ean: string, opciones: { altura?: number; conTexto?: boolean; color?: string } = {}): string {
  const altura = opciones.altura ?? 60;
  const color = opciones.color ?? '#0A0A0A';
  const conTexto = opciones.conTexto ?? true;
  const margen = 9;
  const ancho = 95 + margen * 2;
  const alto = altura + (conTexto ? 12 : 0);
  const rects = barrasEan13(ean)
    .map(
      (b) =>
        `<rect x="${b.x + margen}" y="0" width="${b.ancho}" height="${b.guarda && conTexto ? altura + 5 : altura}" />`,
    )
    .join('');
  const texto = conTexto
    ? `<g font-family="Figtree, sans-serif" font-size="9" text-anchor="middle">` +
      `<text x="${margen - 4}" y="${alto - 1}">${ean[0]}</text>` +
      `<text x="${margen + 3 + 21}" y="${alto - 1}">${ean.slice(1, 7)}</text>` +
      `<text x="${margen + 50 + 21}" y="${alto - 1}">${ean.slice(7)}</text></g>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${alto}" fill="${color}" role="img" aria-label="Código de barras ${ean}">${rects}${texto}</svg>`;
}

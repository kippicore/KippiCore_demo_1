/**
 * Coloreado de las ilustraciones de prenda (PLAN 8.8.3). En JS (no `color-mix`) para que sirva también en PDF y en
 * canvas. Los colores de entrada son los del PRODUCTO (seed/colores.ts, 8.1.4), no de la interfaz; las tintas de
 * mezcla (negro, blanco y el metal de hebillas) son constantes propias de la ilustración.
 */
export const TINTAS_PRENDA = { negro: '#000000', blanco: '#FFFFFF', metal: '#9A9A9A' } as const;

function aRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

function aHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** Mezcla `a` con `b` en proporción `t` (0 = a, 1 = b). */
export function mezcla(a: string, b: string, t: number): string {
  const x = aRgb(a);
  const y = aRgb(b);
  return aHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

/** Luminancia relativa (WCAG). */
export function luminancia(hex: string): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = aRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export interface ColoresPrenda {
  /** Relleno (color de la variante). */
  F: string;
  /** Trazo de la silueta. */
  S: string;
  /** Botones. */
  B: string;
  /** Forro e interiores (escote de blazer y abrigo, interior del cuello). */
  forro: string;
  /** Suela de zapato. */
  suela: string;
  /** Banda de volumen: negro o blanco al 6 %. */
  volumen: string;
  /** Color de las rayas y cuadros. */
  patron: string;
  oscuro: boolean;
}

export function coloresPrenda(hex: string): ColoresPrenda {
  const L = luminancia(hex);
  const oscuro = L < 0.18;
  const claro = L > 0.6;
  return {
    F: hex,
    S: oscuro ? mezcla(hex, TINTAS_PRENDA.blanco, 0.38) : mezcla(hex, TINTAS_PRENDA.negro, 0.55),
    B: claro ? mezcla(hex, TINTAS_PRENDA.negro, 0.12) : mezcla(hex, TINTAS_PRENDA.blanco, 0.2),
    forro: mezcla(hex, TINTAS_PRENDA.negro, 0.35),
    suela: mezcla(hex, TINTAS_PRENDA.negro, 0.6),
    volumen: oscuro ? TINTAS_PRENDA.blanco : TINTAS_PRENDA.negro,
    patron: claro ? mezcla(hex, TINTAS_PRENDA.negro, 0.35) : mezcla(hex, TINTAS_PRENDA.blanco, 0.45),
    oscuro,
  };
}

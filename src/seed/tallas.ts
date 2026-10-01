import type { CurvaTallas } from '@/dominio/tipos';

/** Curvas de tallas (PLAN 6.4) y su distribución de demanda (P3, P4, 7.6). */
export const CURVAS_TALLAS: Record<CurvaTallas, readonly string[]> = {
  superior: ['S', 'M', 'L', 'XL', 'XXL'],
  pantalon: ['28', '30', '32', '34', '36', '38', '40'],
  calzado: ['38', '39', '40', '41', '42', '43', '44'],
  sastreria: ['46', '48', '50', '52', '54', '56'],
  unica: ['Única'],
};

/**
 * Peso de demanda de cada talla (suma 1 por curva). Los pedidos a China se hacen casi parejos por talla,
 * por eso la M se agota (P3).
 */
export const DEMANDA_TALLAS: Record<CurvaTallas, Record<string, number>> = {
  superior: { S: 0.13, M: 0.38, L: 0.29, XL: 0.15, XXL: 0.05 },
  pantalon: { '28': 0.06, '30': 0.12, '32': 0.28, '34': 0.26, '36': 0.16, '38': 0.08, '40': 0.04 },
  calzado: { '38': 0.05, '39': 0.1, '40': 0.22, '41': 0.25, '42': 0.21, '43': 0.11, '44': 0.06 },
  sastreria: { '46': 0.1, '48': 0.24, '50': 0.3, '52': 0.22, '54': 0.1, '56': 0.04 },
  unica: { Única: 1 },
};

/**
 * Curva de los pedidos a la fábrica (7.9): más pareja que la demanda (la M se queda corta), pero no tanto como
 * para agotar la talla más vendida la mitad del tiempo (F2-A2: con la curva totalmente pareja la M vendida
 * caía muy por debajo del 38 % de P3).
 */
export const CURVA_PEDIDO: Record<CurvaTallas, Record<string, number>> = {
  superior: { S: 0.14, M: 0.33, L: 0.28, XL: 0.16, XXL: 0.09 },
  pantalon: { '28': 0.07, '30': 0.13, '32': 0.25, '34': 0.24, '36': 0.16, '38': 0.09, '40': 0.06 },
  calzado: { '38': 0.07, '39': 0.12, '40': 0.2, '41': 0.22, '42': 0.19, '43': 0.12, '44': 0.08 },
  sastreria: { '46': 0.12, '48': 0.22, '50': 0.27, '52': 0.21, '54': 0.12, '56': 0.06 },
  unica: { Única: 1 },
};

import type { COP, Moneda } from '@/dominio/tipos';
import { MONEDAS, TASA_EJEMPLO } from '@/config/monedas';
import { dinero, cifraCorta } from './formato';

/**
 * Conversión para mostrar (PLAN 6.20.11): todo se convierte de COP a la moneda activa con la tasa VIGENTE.
 * La tasa de la fecha de una operación solo se usa para registrar pagos, diferencia en cambio y costo aterrizado.
 */
export function convertirParaMostrar(cop: COP, moneda: Moneda, tasa: number | null): number {
  if (moneda === 'COP') return cop;
  if (!tasa || tasa <= 0) return 0;
  const v = cop / tasa;
  return Math.round(v * 100) / 100;
}

/** Cifra completa en la moneda activa desde un valor en COP. */
export function dineroEn(cop: COP, moneda: Moneda, tasa: number | null): string {
  return dinero(convertirParaMostrar(cop, moneda, tasa), moneda);
}

/** Cifra corta en la moneda activa desde un valor en COP. */
export function cifraCortaEn(cop: COP, moneda: Moneda, tasa: number | null): string {
  return cifraCorta(convertirParaMostrar(cop, moneda, tasa), moneda);
}

/** Monto original de una moneda extranjera (centavos → unidades): US$ 14.700,00. */
export function dineroOrigen(centavos: number, moneda: Exclude<Moneda, 'COP'>): string {
  return dinero(centavos / 100, moneda);
}

/** "Tasa de ejemplo: US$ 1 = $ 3.950 · CN¥ 1 = $ 548" (8.11.5). */
export function textoTasas(tasas: { USD: number; CNY: number } = TASA_EJEMPLO.valores): string {
  return `${TASA_EJEMPLO.etiqueta}: ${MONEDAS.USD.simbolo} 1 = ${dinero(tasas.USD)} · ${MONEDAS.CNY.simbolo} 1 = ${dinero(tasas.CNY)}`;
}

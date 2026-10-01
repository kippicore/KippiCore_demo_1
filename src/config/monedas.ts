import type { FechaISO, Moneda, MonedaExtranjera } from '@/dominio/tipos';

/** Monedas y la ÚNICA tasa de ejemplo (PLAN 5.8, D7, 6.20.11). */
export const MONEDAS: Record<Moneda, { codigo: Moneda; simbolo: string; nombre: string; decimales: 0 | 2 }> =
  {
    COP: { codigo: 'COP', simbolo: '$', nombre: 'Pesos colombianos', decimales: 0 },
    USD: { codigo: 'USD', simbolo: 'US$', nombre: 'Dólares estadounidenses', decimales: 2 },
    CNY: { codigo: 'CNY', simbolo: 'CN¥', nombre: 'Yuanes chinos', decimales: 2 },
  };

/**
 * Tasa de ejemplo única: US$ 1 = $ 3.950 y CN¥ 1 = $ 548 (≈ 7,21 CN¥ por dólar).
 * Antes de enviar el enlace, Miguel la pone en la TRM del día en este archivo. El historial generado de tasas
 * termina en este valor el día del ancla.
 */
export const TASA_EJEMPLO: {
  valores: Record<MonedaExtranjera, number>;
  fechaReferencia: FechaISO;
  etiqueta: string;
} = {
  valores: { USD: 3950, CNY: 548 },
  fechaReferencia: '2026-10-01',
  etiqueta: 'Tasa de ejemplo',
};

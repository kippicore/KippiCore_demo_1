import { describe, expect, it } from 'vitest';
import { SEED } from '@/seed';
import type { TipoPrenda } from '@/dominio/tipos';
import { construida } from './utilidades';

/**
 * catalogo.test.ts (PLAN 7.13, 7.14, T19, T25): toda referencia de la semilla tiene un tipo de prenda con
 * ilustración y nombre en español; todo lo que el generador vende existe en el catálogo y se vendió alguna vez.
 */
const ILUSTRADOS: readonly TipoPrenda[] = [
  'camisa',
  'blazer',
  'pantalon',
  'polo',
  'abrigo',
  'chaqueta',
  'sweater',
  'traje',
  'chaleco',
  'zapato',
  'cinturon',
  'corbata',
  'billetera',
];
const INGLES = /\b(slim|fit|stretch|sweater|shirt|jacket|suit|shoes?|belt|wallet|tie|menswear|oxford shirt)\b/i;

describe('catálogo de la semilla para el generador', () => {
  it('cada referencia tiene un tipo de prenda ilustrado y nombre en español', () => {
    for (const r of SEED.catalogo) {
      expect(ILUSTRADOS, r.id).toContain(r.tipoPrenda);
      expect(INGLES.test(r.nombre.replace('Oxford', '')), r.nombre).toBe(false);
      expect(r.precioVenta % 1000, r.id).toBe(900);
      expect(r.colorIds.length, r.id).toBeGreaterThan(0);
    }
  });

  it('el generador vende referencias del catálogo y todas, salvo las 5 sin movimiento, se venden en los últimos 60 días', () => {
    const e = construida('2026-09-30', '21:30');
    const vendidas = new Set<string>();
    for (const v of Object.values(e.ventas)) {
      for (const l of v.lineas) {
        expect(e.productos[l.productoId], l.productoId).toBeDefined();
        if (v.ts >= '2026-08-01') vendidas.add(l.productoId);
      }
    }
    const quietas = SEED.catalogo.filter((r) => !vendidas.has(r.id)).map((r) => r.id).sort();
    const esperadas = SEED.catalogo.filter((r) => r.narrativa === 'sin_movimiento').map((r) => r.id).sort();
    expect(quietas).toEqual(esperadas);
  });
});

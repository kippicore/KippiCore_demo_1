import { describe, expect, it } from 'vitest';
import { centavosDeCop, copDeCentavos, prorratearMayorResiduo, redondear } from './dinero';

describe('dinero', () => {
  it('redondea a peso mitad lejos de cero, sin −0', () => {
    expect(redondear(2.5)).toBe(3);
    expect(redondear(-2.5)).toBe(-3);
    expect(Object.is(redondear(-0.4), 0)).toBe(true);
  });

  it('prorratea con el mayor residuo y suma exacto', () => {
    const partes = prorratearMayorResiduo(100, [1, 1, 1]);
    expect(partes).toEqual([34, 33, 33]);
    expect(prorratearMayorResiduo(1_000_001, [3, 7, 11]).reduce((a, b) => a + b, 0)).toBe(1_000_001);
    expect(prorratearMayorResiduo(-10, [1, 3])).toEqual([-3, -7]);
    expect(prorratearMayorResiduo(-10, [1, 3]).reduce((a, b) => a + b, 0)).toBe(-10);
    expect(prorratearMayorResiduo(5, [0, 0])).toEqual([3, 2]);
    expect(prorratearMayorResiduo(7, [])).toEqual([]);
  });

  it('convierte centavos con la tasa (V10)', () => {
    expect(copDeCentavos(1140, 3950)).toBe(45_030);
    expect(copDeCentavos(1_470_000, 3950)).toBe(58_065_000);
    expect(centavosDeCop(58_065_000, 3950)).toBe(1_470_000);
  });
});

import { describe, expect, it } from 'vitest';
import { baseComisionableVenta, calcularComision, esquemaValido } from './comisiones';
import { baseSinIva } from './ventas';

describe('comisiones (6.20.4)', () => {
  it('3 % sobre la venta sin IVA: el chino de $ 199.900 deja $ 5.039 (W1)', () => {
    const base = baseComisionableVenta(
      { base: 'base_sin_iva' },
      { total: 199_900, base: baseSinIva(199_900, 0.19) },
    );
    expect(base).toBe(167_983);
    const r = calcularComision(
      { componentes: [{ tipo: 'porcentaje', porcentaje: 0.03 }] },
      { base, ventasLocalMes: 0, metaLocalMes: 0 },
    );
    expect(r.total).toBe(5_039);
  });

  it('escalonado total y marginal, y bono por meta del local', () => {
    const tramos = [
      { desde: 0, porcentaje: 0.02 },
      { desde: 10_000_000, porcentaje: 0.03 },
    ];
    const entrada = { base: 15_000_000, ventasLocalMes: 120_000_000, metaLocalMes: 100_000_000 };
    expect(
      calcularComision({ componentes: [{ tipo: 'escalonado', modo: 'total', tramos }] }, entrada).total,
    ).toBe(450_000);
    expect(
      calcularComision({ componentes: [{ tipo: 'escalonado', modo: 'marginal', tramos }] }, entrada).total,
    ).toBe(350_000);
    const bono = calcularComision(
      { componentes: [{ tipo: 'bono_meta_local', valor: 300_000, cumplimientoMinimo: 1 }] },
      entrada,
    );
    expect(bono.total).toBe(300_000);
    expect(
      calcularComision(
        { componentes: [{ tipo: 'bono_meta_local', valor: 300_000, cumplimientoMinimo: 1 }] },
        { ...entrada, ventasLocalMes: 90_000_000 },
      ).total,
    ).toBe(0);
  });

  it('valida tramos crecientes y porcentajes razonables', () => {
    expect(esquemaValido([{ tipo: 'porcentaje', porcentaje: 0.25 }])).not.toBeNull();
    expect(
      esquemaValido([
        {
          tipo: 'escalonado',
          modo: 'total',
          tramos: [
            { desde: 5, porcentaje: 0.01 },
            { desde: 1, porcentaje: 0.02 },
          ],
        },
      ]),
    ).not.toBeNull();
    expect(esquemaValido([{ tipo: 'porcentaje', porcentaje: 0.03 }])).toBeNull();
  });
});

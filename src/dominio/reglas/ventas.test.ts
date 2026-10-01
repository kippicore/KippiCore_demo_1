import { describe, expect, it } from 'vitest';
import type { Devolucion, LineaVenta, Venta } from '../tipos';
import { baseSinIva, calcularVenta, estadoVenta, saldoVenta, valoresDevolucionLinea } from './ventas';

describe('ventas (V1, 6.20.1)', () => {
  it('base e IVA por línea con IVA incluido', () => {
    const t = calcularVenta([{ precioLista: 199_900, cantidad: 1, descuento: null, tarifaIva: 0.19 }], null);
    expect(t.total).toBe(199_900);
    expect(t.base).toBe(167_983);
    expect(t.iva).toBe(31_917);
    expect(baseSinIva(219_900, 0.19)).toBe(184_790);
  });

  it('reparte el descuento global con el mayor residuo y no redondea a nivel de venta', () => {
    const t = calcularVenta(
      [
        { precioLista: 219_900, cantidad: 1, descuento: { tipo: 'porcentaje', valor: 0.1 }, tarifaIva: 0.19 },
        { precioLista: 139_900, cantidad: 2, descuento: null, tarifaIva: 0.19 },
        { precioLista: 129_900, cantidad: 1, descuento: { tipo: 'valor', valor: 500_000 }, tarifaIva: 0.19 },
      ],
      { tipo: 'porcentaje', valor: 0.05 },
    );
    const [a, b, c] = t.lineas;
    expect(a?.descuentoLinea).toBe(21_990);
    expect(c?.descuentoLinea).toBe(129_900);
    expect(t.subtotal).toBe(219_900 + 279_800 + 129_900);
    const netoSinGlobal = 219_900 - 21_990 + 279_800;
    expect(t.descuentoGlobal).toBe(Math.round(netoSinGlobal * 0.05));
    expect((a?.parteGlobal ?? 0) + (b?.parteGlobal ?? 0) + (c?.parteGlobal ?? 0)).toBe(t.descuentoGlobal);
    expect(t.total).toBe(t.lineas.reduce((s, l) => s + l.totalFinal, 0));
    expect(t.base + t.iva).toBe(t.total);
    expect(t.descuentos).toBe(t.subtotal - t.total);
  });

  it('las devoluciones de una línea suman exactamente su total (6.20.2)', () => {
    const linea: LineaVenta = {
      id: 'v-l1',
      productoId: 'p',
      varianteId: 'v',
      sku: 's',
      descripcion: 'd',
      cantidad: 3,
      precioLista: 33_333,
      descuentoLinea: null,
      descuentoAsignado: 0,
      totalFinal: 99_999,
      base: 84_033,
      iva: 15_966,
      costoUnitario: 10_000,
    };
    const primera = valoresDevolucionLinea(linea, 1, { cantidad: 0, valor: 0, base: 0, iva: 0, costo: 0 });
    const segunda = valoresDevolucionLinea(linea, 2, primera);
    expect(primera.valor + segunda.valor).toBe(99_999);
    expect(primera.base + segunda.base).toBe(84_033);
    expect(segunda.costo).toBe(20_000);
  });

  it('saldo y estado derivados (V3)', () => {
    const venta = {
      total: 300_000,
      pagos: [{ valor: 100_000 }],
      lineas: [{ cantidad: 2 }],
      tipo: 'separado',
      separado: { fechaLimite: '2026-10-20', cerrado: null },
      anulacion: null,
    } as unknown as Venta;
    expect(saldoVenta(venta, [])).toBe(200_000);
    expect(estadoVenta(venta, [])).toBe('separado');
    const dev = [{ valorTotal: 300_000, lineas: [{ cantidad: 2 }] }] as unknown as Devolucion[];
    expect(saldoVenta(venta, dev)).toBe(0);
    expect(estadoVenta(venta, dev)).toBe('devuelta');
  });
});

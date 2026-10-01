import { describe, expect, it } from 'vitest';
import type { CostosImportacion, LineaImportacion } from '../tipos';
import {
  calcularCostoAterrizado,
  margenBruto,
  precioSugerido,
  redondearA900,
  tasaCosteoPonderada,
} from './costeo';

const costos: CostosImportacion = {
  flete: { moneda: 'USD', valor: 93_000 },
  seguro: { moneda: 'USD', valor: 11_400 },
  honorariosAgente: 2_100_000,
  bodegajePuerto: 1_200_000,
  transporteInterno: 2_400_000,
  otros: 0,
  otrosTributosAduaneros: 0,
  arancelPct: 0.15,
  ivaImportacionPct: 0.19,
  ivaSumaAlCosto: false,
};
const lineas: LineaImportacion[] = [
  { id: 'l1', productoId: 'oxford', cantidades: { a: 600, b: 400 }, costoUnitarioOrigen: 1140 },
  { id: 'l2', productoId: 'popelina', cantidades: { c: 333 }, costoUnitarioOrigen: 960 },
  { id: 'l3', productoId: 'oxford', cantidades: { d: 7 }, costoUnitarioOrigen: 1140 },
];

describe('costo aterrizado (6.20.3, M4)', () => {
  it('la cascada suma el total y el reparto cuadra exacto por valor y por cantidad', () => {
    for (const metodo of ['valor', 'cantidad'] as const) {
      const r = calcularCostoAterrizado({
        lineas,
        costos,
        moneda: 'USD',
        metodoProrrateo: metodo,
        tasaCosteo: 3950,
      });
      expect(r.cascada.reduce((s, p) => s + p.valor, 0)).toBe(r.total);
      expect(r.porLinea.reduce((s, l) => s + l.costoLinea, 0)).toBe(r.total);
      expect(r.porProducto.oxford?.unidades).toBe(1007);
    }
    const r = calcularCostoAterrizado({
      lineas,
      costos,
      moneda: 'USD',
      metodoProrrateo: 'valor',
      tasaCosteo: 3950,
    });
    expect(r.fobOrigen).toBe(1007 * 1140 + 333 * 960);
    expect(r.fobCop).toBe(Math.round(((1007 * 1140 + 333 * 960) / 100) * 3950));
    expect(r.arancel).toBe(Math.round(r.cif * 0.15));
  });

  it('el IVA de importación suma al costo solo si el interruptor lo dice', () => {
    const sin = calcularCostoAterrizado({
      lineas,
      costos,
      moneda: 'USD',
      metodoProrrateo: 'valor',
      tasaCosteo: 3950,
    });
    const con = calcularCostoAterrizado({
      lineas,
      costos: { ...costos, ivaSumaAlCosto: true },
      moneda: 'USD',
      metodoProrrateo: 'valor',
      tasaCosteo: 3950,
    });
    expect(con.total - sin.total).toBe(sin.ivaImportacion);
    expect(sin.tributos).toBe(sin.arancel + sin.otrosTributos + sin.ivaImportacion);
  });

  it('con el dólar 10 % arriba el costo sube y el precio sugerido conserva el margen (W4)', () => {
    const base = calcularCostoAterrizado({
      lineas,
      costos,
      moneda: 'USD',
      metodoProrrateo: 'valor',
      tasaCosteo: 3950,
    });
    const alza = calcularCostoAterrizado({
      lineas,
      costos,
      moneda: 'USD',
      metodoProrrateo: 'valor',
      tasaCosteo: 4345,
    });
    expect(alza.porProducto.oxford!.costoUnitario).toBeGreaterThan(base.porProducto.oxford!.costoUnitario);
    // Ejemplo del plan: Oxford a $ 78.600 con margen objetivo de 61 % → $ 239.900.
    expect(precioSugerido(78_600, 0.61, 0.19)).toBe(239_900);
    expect(margenBruto(219_900, 0.19, 71_850)).toBeCloseTo(0.611, 3);
  });

  it('redondea a la terminación 900', () => {
    expect(redondearA900(239_831)).toBe(239_900);
    expect(redondearA900(239_900)).toBe(239_900);
    expect(redondearA900(239_901)).toBe(240_900);
  });

  it('tasa de costeo ponderada entre lo pagado y lo pendiente', () => {
    expect(tasaCosteoPonderada([{ centavos: 300, tasa: 3800 }], 1000, 4000)).toBeCloseTo(
      (300 * 3800 + 700 * 4000) / 1000,
      9,
    );
    expect(tasaCosteoPonderada([], 1000, 3950)).toBe(3950);
  });
});

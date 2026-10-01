import { describe, expect, it } from 'vitest';
import { PARAMETROS_ADUANAS } from '@/config/aduanas';
import {
  avanceRuta,
  hitosIniciales,
  partesPagoFabrica,
  redondearArriba5,
  reestimarHitos,
  retrasoDias,
  sugerirPedido,
  validarCambioEstado,
} from './importaciones';

describe('máquina de estados (M1, M2)', () => {
  it('avanza en orden, salta hacia adelante y retrocede un paso solo el dueño con nota', () => {
    const op = { esDueno: true, nota: null };
    expect(validarCambioEstado('en_puerto', 'en_nacionalizacion', op)).toBeNull();
    expect(validarCambioEstado('en_puerto', 'en_transporte_bogota', op)).toBeNull();
    expect(validarCambioEstado('en_puerto', 'en_puerto', op)).toBe('mismo_estado');
    expect(validarCambioEstado('en_puerto', 'embarcado', op)).toBe('retroceso_mayor');
    expect(validarCambioEstado('en_puerto', 'en_transito', op)).toBe('nota_obligatoria');
    expect(validarCambioEstado('en_puerto', 'en_transito', { esDueno: false, nota: 'error' })).toBe(
      'retroceso_sin_permiso',
    );
    expect(
      validarCambioEstado('en_puerto', 'en_transito', { esDueno: true, nota: 'Lo marqué por error' }),
    ).toBeNull();
    expect(validarCambioEstado('en_transporte_bogota', 'recibido_bodega', op)).toBe(
      'recepcion_por_inventario',
    );
  });
});

describe('hitos (M1, M3)', () => {
  it('≈ 102 días de pedido a bodega con los días de ejemplo', () => {
    const h = hitosIniciales('2026-06-01', PARAMETROS_ADUANAS.diasEstimadosEntreEstados);
    expect(h.cotizado.real).toBe('2026-06-01');
    expect(h.recibido_bodega.estimada).toBe('2026-09-11');
  });
  it('re-estima los hitos siguientes por el retraso y calcula el retraso del siguiente hito', () => {
    const h = hitosIniciales('2026-06-01', PARAMETROS_ADUANAS.diasEstimadosEntreEstados);
    const r = reestimarHitos(h, 'en_puerto', '2026-08-30');
    // Llegó al puerto 2 días después de lo estimado (28/08): los hitos siguientes se corren 2 días.
    expect(h.en_puerto.estimada).toBe('2026-08-28');
    expect(r.en_nacionalizacion.estimada).toBe('2026-09-02');
    expect(r.en_produccion.estimada).toBe(h.en_produccion.estimada);
    const imp = { estado: 'en_nacionalizacion' as const, hitos: h };
    expect(retrasoDias(imp, h.nacionalizado.estimada)).toBe(0);
    expect(retrasoDias(imp, '2026-09-30')).toBeGreaterThan(0);
  });
  it('avance del barco entre embarque y puerto', () => {
    const h = hitosIniciales('2026-06-01', PARAMETROS_ADUANAS.diasEstimadosEntreEstados);
    expect(avanceRuta({ estado: 'en_produccion', hitos: h }, '2026-07-01')).toBe(0);
    expect(avanceRuta({ estado: 'en_puerto', hitos: h }, '2026-07-01')).toBe(1);
    const medio = avanceRuta({ estado: 'en_transito', hitos: h }, '2026-08-12');
    expect(medio).toBeGreaterThan(0.3);
    expect(medio).toBeLessThan(0.7);
  });
});

describe('sugerencia de pedido (6.20.13, W12)', () => {
  it('rota más la M, descuenta lo que hay y lo que viene, y redondea a múltiplos de 5', () => {
    const v = (
      id: string,
      vendidas: number,
      insatisfecha: number,
      existencias: number,
      enCamino: number,
    ) => ({
      varianteId: id,
      productoId: 'oxford',
      vendidas12s: vendidas,
      insatisfecha12s: insatisfecha,
      existencias,
      enCamino,
      costoUnitarioOrigen: 1140,
      costoAterrizado: 71_850,
      precioVenta: 219_900,
      tarifaIva: 0.19,
    });
    const r = sugerirPedido({
      variantes: [v('M', 96, 12, 9, 48), v('L', 72, 0, 20, 0), v('XXL', 6, 0, 30, 0)],
      semanasCobertura: 16,
      factorEstacional: 1.1,
      tasaVigente: 3950,
    });
    const [m, l, xxl] = r.variantes;
    expect(m!.sugerida % 5).toBe(0);
    expect(m!.sugerida).toBe(redondearArriba5(((96 + 12) / 12) * 16 * 1.1 - 9 - 48));
    expect(m!.sugerida).toBeGreaterThan(l!.sugerida);
    expect(xxl!.sugerida).toBe(0);
    expect(r.unidades).toBe(m!.sugerida + l!.sugerida);
    expect(r.totalOrigen).toBe(r.unidades * 1140);
    expect(r.margenEsperado).toBeCloseTo((219_900 / 1.19 - 71_850) / (219_900 / 1.19), 6);
  });
  it('anticipo 30 % y saldo 70 % suman exacto', () => {
    expect(partesPagoFabrica(4_900_001, 0.3)).toEqual({ anticipo: 1_470_000, saldo: 3_430_001 });
  });
});

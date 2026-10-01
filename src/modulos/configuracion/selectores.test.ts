import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { activarVerificacionDeTablas, selTasaVigente } from '@/selectores';
import { estadoDe, HOY } from '@/selectores/pruebas/construir';
import { historialTasas, tasaVigenteDe } from './calculos';
import { selCajas, selCostosTipicos, selLocalesConfig, selParametros, selTasas, selUsuarios } from './selectores';

const e = estadoDe();

beforeAll(() => activarVerificacionDeTablas(true));
afterAll(() => activarVerificacionDeTablas(false));

describe('selectores de Configuración', () => {
  it('la tasa vigente del historial coincide con la que usa todo el sistema', () => {
    const tasas = selTasas(e);
    for (const m of ['USD', 'CNY'] as const) {
      expect(tasaVigenteDe(tasas, m, HOY)?.valor).toBe(selTasaVigente(e, { moneda: m, fecha: HOY }));
      expect(historialTasas(tasas, m, HOY).filter((f) => f.vigente)).toHaveLength(1);
    }
  });

  it('lista los tres locales que venden y la bodega, con lo necesario para decidir una eliminación', () => {
    const filas = selLocalesConfig(e);
    expect(filas.map((f) => f.local.id)).toEqual(['p93', 'usq', 'zr', 'bod']);
    const bodega = filas.find((f) => f.local.id === 'bod');
    expect(bodega?.unidades).toBeGreaterThan(0);
    expect(bodega?.impedimentos.join(' ')).toContain('unidades en existencia');
    for (const f of filas) expect(f.ventas).toBe(Object.values(e.ventas).filter((v) => v.localId === f.local.id).length);
    expect(filas.reduce((s, f) => s + f.unidades, 0)).toBe(Object.values(e.agregados.existencias).reduce((a, b) => a + b, 0));
  });

  it('los usuarios y los parámetros salen del estado', () => {
    expect(selUsuarios(e).map((u) => u.rol)).toEqual(['dueno', 'bodega', 'vendedor']);
    expect(selParametros(e)).toBe(e.parametros);
    expect(selCajas(e).every((c) => c.tipo === 'caja')).toBe(true);
  });

  it('los costos típicos de un pedido son promedios de las importaciones reales', () => {
    const t = selCostosTipicos(e);
    expect(t.pedidos).toBeGreaterThan(0);
    expect(t.honorarios).toBeGreaterThan(0);
    expect(t.unidades).toBeGreaterThan(0);
  });
});

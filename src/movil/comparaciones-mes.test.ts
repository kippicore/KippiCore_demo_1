import { describe, expect, it } from 'vitest';
import { avanceMeta, MIN_VENTAS_BASE, MIN_VENTAS_HOY, selKpisInicio, selVentasHoyHastaHora } from '@/selectores';
import { estadoDe } from '@/selectores/pruebas/construir';
import { fraseAvanceMeta } from '@/lib/avanceMeta';
import { selCifraHoy, selPeriodoVentas } from './selectores';

/**
 * La demo usa la fecha real: el cliente puede abrirla el día 1 del mes. Las comparaciones de Inicio (escritorio) y de
 * Hoy (/app) salen de los mismos selectores y no deben mostrar un negocio que se cae solo por ser comienzo de mes.
 */
const FECHAS = ['2026-10-01T15:30', '2026-10-15T15:30', '2026-09-30T15:30'] as const;

describe('comparaciones de Inicio y Hoy según el día del mes', () => {
  for (const f of FECHAS) {
    const ahora = `${f}:00`;
    const e = estadoDe(f.slice(0, 10), ahora);
    const dia = Number(f.slice(8, 10));

    it(`${f}: escritorio y app dicen lo mismo y el periodo del mes es coherente`, () => {
      const k = selKpisInicio(e, { localId: 'todos', ahora });
      const hoy = k.tarjetas[0];
      const mes = k.tarjetas.find((t) => t.id === 'ventas_mes');
      expect(mes).toBeDefined();
      const c = selCifraHoy(e, { ahora, localId: 'todos' });
      expect(c.valor).toBe(hoy?.valor);
      expect(c.variacion).toBe(hoy?.variacion);
      const p = selPeriodoVentas(e, { periodo: 'mes', ahora, localId: 'todos' });
      expect(p.variacion).toBe(mes?.variacion);
      expect(p.comparacion).toBe(mes?.comparacion);
      expect(p.desde).toBe(k.periodo.desde);
      if (dia < 7) {
        expect(k.periodo.modo).toBe('30d');
        expect(mes?.etiqueta).toMatch(/30 días/);
        expect(mes?.comparacion).toBe('vs. los 30 días anteriores');
        expect(p.ultimos30).toBe(true);
      } else {
        expect(k.periodo.modo).toBe('mes');
        expect(mes?.comparacion).toMatch(/^vs\. (agosto|septiembre) a la misma fecha$/);
        expect(k.periodo.desde).toBe(`${f.slice(0, 7)}-01`);
      }
      // Ninguna comparación sale absurda (el mes a la fecha o los 30 días nunca caen a la mitad en una demo sana).
      expect(mes?.variacion ?? 0).toBeGreaterThan(-0.5);
    });
  }

  it('hoy solo se compara con el mismo día de la semana anterior cuando hay muestra suficiente', () => {
    for (const hora of ['10:15', '11:30', '15:30']) {
      const ahora = `2026-10-01T${hora}:00`;
      const e = estadoDe('2026-10-01', ahora);
      const v = selVentasHoyHastaHora(e, { hoy: '2026-10-01', ahora, localId: 'todos' });
      if (v.variacion !== null) {
        expect(v.hoy.numVentas).toBeGreaterThanOrEqual(MIN_VENTAS_HOY);
        expect(v.semanaAnterior.numVentas).toBeGreaterThanOrEqual(MIN_VENTAS_BASE);
      }
    }
  });
});

describe('avance de la meta del mes frente a lo esperado a la fecha', () => {
  it('el día 1 solo avisa que el mes arranca (no "2 % de la meta")', () => {
    const a = avanceMeta(0.02, '2026-10-01T15:30:00', '2026-10');
    expect(a.modo).toBe('arranque');
    expect(a.vsEsperado).toBeNull();
    expect(fraseAvanceMeta(a, 0.02)).toBe('El mes apenas arranca');
  });
  it('a mitad de mes compara contra lo esperado a hoy', () => {
    const a = avanceMeta(0.47, '2026-10-15T20:00:00', '2026-10');
    expect(a.modo).toBe('ritmo');
    expect(a.transcurrido).toBeCloseTo(15 / 31, 5);
    expect(a.vsEsperado).toBeCloseTo(0.47 / (15 / 31), 5);
    expect(fraseAvanceMeta(a, 0.47)).toMatch(/^Vas al 97\s%\sde lo esperado a hoy$/);
  });
  it('un mes cerrado vuelve a "% de la meta"', () => {
    const a = avanceMeta(1.04, '2026-10-01T15:30:00', '2026-09');
    expect(a.modo).toBe('cierre');
    expect(fraseAvanceMeta(a, 1.04)).toMatch(/^104\s%\sde la meta$/);
  });
});

import { describe, expect, it } from 'vitest';
import { generarEstado } from '../fuente';

/**
 * rendimiento.test.ts (PLAN 7.1, 7.14): construcción de 18 meses < 3 s en CI (el objetivo real, < 1 s en el
 * portátil de referencia, lo mide `npm run medir`). La parte "construcción + clonación + primer render de /app
 * < 2,5 s con CPU ×4 en Chromium" se verifica en F2-B/F2-C cuando existan el worker y la interfaz.
 */
describe('rendimiento del generador', () => {
  it('construye 18 meses en menos de 3 s', () => {
    // performance.now() está disponible en Node y en el navegador (no es reloj de dominio).
    const t0 = performance.now();
    const e = generarEstado({ ancla: '2026-09-30', ahora: '2026-09-30T21:30:00' });
    const ms = performance.now() - t0;
    expect(e.meta.omitidosGenerador).toBe(0);
    expect(Object.keys(e.ventas).length).toBeGreaterThan(15_000);
    expect(ms).toBeLessThan(3_000);
  });

  it.todo('construcción + clonación + primer render de /app < 2,5 s con CPU ×4 en Chromium (F2-B/F2-C, e2e)');
});

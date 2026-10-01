import { describe, expect, it } from 'vitest';
import { generarEstado } from '../fuente';
import { hashEstado } from '../hash';
import { cyrb128, expNeg, Rng } from '../prng';

/**
 * determinismo.test.ts (PLAN 7.1, 7.2, 7.14): mismas entradas ⇒ misma huella; otra semilla ⇒ otra huella; el
 * generador usa solo aritmética exacta. La huella de referencia queda en un snapshot: `npm run test:tz` la
 * compara con TZ=UTC, Asia/Tokyo y America/Los_Angeles, y el e2e `determinismo.spec.ts` (WebKit y Firefox, F2-B)
 * la compara con la del navegador.
 */
const ENTRADA = { ancla: '2026-09-30', ahora: '2026-09-30T15:30:00' };

describe('determinismo del generador', () => {
  it('dos construcciones con las mismas entradas dan la misma huella (y la de referencia)', () => {
    const a = hashEstado(generarEstado(ENTRADA));
    const b = hashEstado(generarEstado(ENTRADA));
    expect(a).toBe(b);
    // Si cambia el generador o la semilla (y es intencional), actualizar con `npx vitest run -u` y subir
    // VERSION_GENERADOR en config/demo.ts si el enlace ya se envió (5.6.10).
    expect(a).toMatchSnapshot();
  });

  it('cambiar la semilla cambia la huella', () => {
    const a = hashEstado(generarEstado({ ...ENTRADA, ahora: '2026-09-30T09:00:00' }));
    const b = hashEstado(generarEstado({ ...ENTRADA, ahora: '2026-09-30T09:00:00', semilla: 'OTRA-SEMILLA' }));
    expect(a).not.toBe(b);
  });

  it('PRNG: sfc32 con cyrb128 da la misma secuencia de referencia', () => {
    expect(cyrb128('HALDEN-2026')).toMatchSnapshot();
    const r = new Rng('HALDEN-2026|plan|prueba');
    expect(Array.from({ length: 5 }, () => r.siguiente())).toMatchSnapshot();
  });

  it('expNeg aproxima e^(−x) con error relativo < 1e-12 sin Math.exp', () => {
    const conocidos: [number, number][] = [
      [0, 1],
      [0.5, 0.6065306597126334],
      [1, 0.36787944117144233],
      [2.5, 0.0820849986238988],
      [7, 0.0009118819655545162],
      [30, 9.357622968840175e-14],
    ];
    for (const [x, y] of conocidos) expect(Math.abs(expNeg(x) - y) / y).toBeLessThan(1e-12);
  });

  it('Poisson y normal tienen la media esperada', () => {
    const r = new Rng('pruebas');
    let s = 0;
    let n = 0;
    for (let i = 0; i < 20_000; i++) {
      s += r.poisson(9);
      n += r.normal(0, 1);
    }
    expect(s / 20_000).toBeGreaterThan(8.85);
    expect(s / 20_000).toBeLessThan(9.15);
    expect(Math.abs(n / 20_000)).toBeLessThan(0.03);
  });

  it('el generador no usa Math.log/exp/pow/sin/cos/random ni ** (aritmética exacta, también lo exige ESLint)', () => {
    const fuentes = import.meta.glob<string>(['../**/*.ts', '!../**/*.test.ts'], {
      query: '?raw',
      import: 'default',
      eager: true,
    });
    const archivos = Object.keys(fuentes);
    expect(archivos.length).toBeGreaterThan(10);
    const prohibido = /Math\.(log|log2|log10|exp|expm1|pow|sin|cos|tan|random)\s*\(|[^*/]\*\*[^*/]/;
    for (const a of archivos) {
      const texto = (fuentes[a] ?? '')
        .split('\n')
        .filter((l: string) => !/^\s*(\/\/|\*|\/\*)/.test(l))
        .join('\n');
      expect(prohibido.test(texto), a).toBe(false);
    }
  });
});

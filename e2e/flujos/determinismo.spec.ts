import { conHoy, expect, HOY_QA, test } from '../fixtures';
import { generarEstado, hashEstado } from '../../src/generador';

/**
 * Determinismo entre motores (PLAN 7.1, 7.14, 5.16): la huella del estado construido en el navegador
 * (Chromium, WebKit y Firefox: proyectos `webkit-hash` y `firefox-hash`, que solo corren las pruebas @hash) es la
 * misma que la de Node con las mismas entradas.
 *
 * PENDIENTE DE F2-B (activar): la app debe exponer en desarrollo y en el build de QA
 * `window.__kc.hashEstado(): Promise<string> | string`, que devuelve `hashEstado(estado)` (src/generador/hash.ts)
 * del store construido con `?hoy=<HOY_QA>`, registro vacío y ancla = la fecha de `?hoy=`. Mientras no exista,
 * esta prueba se salta con el motivo explícito (no es un omitido silencioso).
 */
test('@hash el estado del navegador tiene la misma huella que el de Node', async ({ page }) => {
  await page.goto(conHoy('/'));
  const hayKc = await page
    .waitForFunction(() => typeof (globalThis as unknown as { __kc?: { hashEstado?: unknown } }).__kc?.hashEstado === 'function', null, { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!hayKc, 'Pendiente de F2-B: la app aún no expone window.__kc.hashEstado()');
  const enNavegador = await page.evaluate(async () => {
    const kc = (globalThis as unknown as { __kc: { hashEstado: () => Promise<string> | string } }).__kc;
    return await kc.hashEstado();
  });
  const ancla = HOY_QA.slice(0, 10);
  const enNode = hashEstado(generarEstado({ ancla, ahora: `${HOY_QA}:00` }));
  expect(enNavegador).toBe(enNode);
});

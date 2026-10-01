import { conHoy, expect, HOY_QA, test } from '../fixtures';
import { esperarDatos } from '../kc';
import { generarEstado, hashEstado } from '../../src/generador';

/**
 * Determinismo entre motores (PLAN 7.1, 7.14, 5.16, R23): la huella del estado construido en el navegador
 * (Chromium, WebKit y Firefox: proyectos `webkit-hash` y `firefox-hash`, que solo corren las pruebas @hash) es la
 * misma que la de Node con las mismas entradas: `?hoy=<HOY_QA>`, registro vacío y ancla = la fecha de `?hoy=`.
 * Activada en F2-B: la app expone `window.__kc.hashEstado()` (src/estado/kc.ts) con `?hoy=`.
 */
test('@hash el estado del navegador tiene la misma huella que el de Node', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(conHoy('/'));
  await esperarDatos(page, 90_000);
  const enNavegador = await page.evaluate(() => {
    const kc = (globalThis as unknown as { __kc: { hashEstado: () => string } }).__kc;
    return kc.hashEstado();
  });
  const ancla = HOY_QA.slice(0, 10);
  const enNode = hashEstado(generarEstado({ ancla, ahora: `${HOY_QA}:00` }));
  expect(enNavegador).toBe(enNode);
});

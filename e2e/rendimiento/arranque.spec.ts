import { expect, test } from '@playwright/test';
import { HOY_QA } from '../fixtures';

/**
 * Presupuesto de arranque en un celular medio (PLAN 5.6.12, criterio de F2-A2/F2-B): primer render útil de /app
 * en menos de 2,5 s con la CPU estrangulada ×4 (Chromium, CDP). La construcción va por tramos en el hilo
 * principal (estrategia por defecto, medida en F2-B: docs/informes/F2-B.md). Mediana de 3 cargas en frío.
 */
test('@rendimiento primer render útil de /app < 2,5 s con CPU ×4', async ({ browser }) => {
  test.setTimeout(180_000);
  const tiempos: number[] = [];
  for (let i = 0; i < 3; i++) {
    const contexto = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await contexto.newPage();
    const cdp = await contexto.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(`/app?hoy=${encodeURIComponent(HOY_QA)}`, { waitUntil: 'commit' });
    await page.getByTestId('app-hoy').waitFor({ timeout: 60_000 });
    tiempos.push(await page.evaluate(() => performance.now()));
    await contexto.close();
  }
  tiempos.sort((a, b) => a - b);
  const mediana = tiempos[1] ?? Infinity;
  console.info(`Primer render útil de /app con CPU ×4: ${tiempos.map((t) => Math.round(t)).join(' · ')} ms (mediana ${Math.round(mediana)} ms)`);
  expect(mediana).toBeLessThan(2_500);
});

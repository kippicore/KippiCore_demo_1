import { expect, test, type Browser } from '@playwright/test';
import { HOY_QA } from '../fixtures';

/**
 * Presupuesto de arranque en un celular medio (PLAN 5.6.12, criterio de F2-A2/F2-B), medido en Chromium con la
 * CPU estrangulada ×4 (CDP `Emulation.setCPUThrottlingRate`), en frío (contexto nuevo: sin caché HTTP ni datos):
 * - primer render útil de `/app` (Hoy con cifras) < 2,5 s;
 * - primer render útil de `/panel/inicio` (las 6 tarjetas) < 4,5 s.
 * La construcción va por tramos en el hilo principal (estrategia por defecto, DECISIONES 01/10/2026 F2-B).
 * Mediana de 5 cargas, después de una carga de calentamiento que se descarta (arranque del proceso del navegador,
 * no de la app: cada carga usa un contexto nuevo). Proyecto `rendimiento` (sin trazas ni paralelismo).
 * Desglose por estrategia: `node scripts/medir-arranque.mjs` (docs/informes/F2-B.md).
 */
interface Medida {
  ms: number;
  construccion: number;
}

async function medir(browser: Browser, ruta: string, testId: string): Promise<Medida> {
  const contexto = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await contexto.newPage();
  const cdp = await contexto.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(`${ruta}?hoy=${encodeURIComponent(HOY_QA)}`, { waitUntil: 'commit' });
  await page.getByTestId(testId).first().waitFor({ timeout: 60_000 });
  const r = await page.evaluate(() => {
    const kc = (globalThis as unknown as { __kc?: { datos: { getState: () => { medicion: { msConstruccion: number } | null } } } }).__kc;
    return { ms: performance.now(), construccion: kc?.datos.getState().medicion?.msConstruccion ?? 0 };
  });
  await contexto.close();
  return r;
}

function mediana(xs: number[]): number {
  const o = [...xs].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)] ?? Infinity;
}

const CASOS = [
  { ruta: '/app', testId: 'app-hoy', limite: 2_500 },
  { ruta: '/panel/inicio', testId: 'kpis-inicio', limite: 4_500 },
] as const;

for (const { ruta, testId, limite } of CASOS) {
  test(`@rendimiento primer render útil de ${ruta} con CPU ×4 < ${limite} ms`, async ({ browser }, info) => {
    test.setTimeout(240_000);
    await medir(browser, ruta, testId); // calentamiento (se descarta)
    const medidas: Medida[] = [];
    for (let i = 0; i < 5; i++) medidas.push(await medir(browser, ruta, testId));
    const ms = mediana(medidas.map((m) => m.ms));
    const construccion = mediana(medidas.map((m) => m.construccion));
    const linea = `${ruta} con CPU ×4: ${medidas.map((m) => Math.round(m.ms)).join(' · ')} ms (mediana ${Math.round(ms)} ms; construcción ${Math.round(construccion)} ms)`;
    console.info(linea);
    info.annotations.push({ type: 'medicion', description: linea });
    expect(ms).toBeLessThan(limite);
  });
}

/**
 * Medición del arranque en Chromium con CPU ×4 (PLAN 5.6.12, F2-B): tiempo hasta el primer render útil de /app y
 * de /panel/inicio con cada estrategia del motor ('worker' = clonación estructurada, 'json' = texto transferido,
 * 'hilo' = construcción por tramos en el hilo principal), y la tarea larga más larga del hilo principal.
 *
 * El estrangulamiento con CDP (Emulation.setCPUThrottlingRate) solo aplica a páginas: con un worker responde
 * "Operation is only supported for pages, not workers". Por eso el worker simula la misma lentitud con
 * `?lentitudWorker=<tasa>` (espera activa de (tasa − 1) × lo que tarda cada paso) y el hilo principal se
 * estrangula con CDP.
 *
 * Uso: npx vite build && npx vite preview --port 4180 &  node scripts/medir-arranque.mjs [base] [repeticiones]
 */
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:4180';
const N = Number(process.argv[3] ?? 3);
const TASA = Number(process.env.CPU ?? 4);
const HOY = '2026-09-30T15:30';

const RUTAS = [
  { ruta: '/app', listo: '[data-testid=app-hoy]' },
  { ruta: '/panel/inicio', listo: '[data-testid=kpis-inicio]' },
];
const ESTRATEGIAS = (process.env.ESTRATEGIAS ?? 'worker,json,hilo').split(',');

async function medir(browser, ruta, listo, estrategia) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__largas = [];
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__largas.push(e.duration);
      }).observe({ type: 'longtask', buffered: true });
    } catch {
      /* sin longtask */
    }
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: TASA });
  // CDP no estrangula workers: el worker simula la misma lentitud (?lentitudWorker=).
  const url = `${BASE}${ruta}?hoy=${encodeURIComponent(HOY)}&motor=${estrategia}&lentitudWorker=${TASA}`;
  await page.goto(url, { waitUntil: 'commit' });
  await page.waitForSelector(listo, { timeout: 60_000 });
  const r = await page.evaluate(() => ({
    t: performance.now(),
    largas: window.__largas,
    medicion: window.__kc?.datos.getState().medicion ?? null,
  }));
  await context.close();
  const largas = r.largas ?? [];
  return {
    ms: Math.round(r.t),
    tareaMasLarga: Math.round(largas.length ? Math.max(...largas) : 0),
    tareasLargas: largas.length,
    construccion: Math.round(r.medicion?.msConstruccion ?? 0),
    serializacion: Math.round(r.medicion?.msSerializacion ?? 0),
    transferencia: Math.round(r.medicion?.msTransferencia ?? 0),
  };
}

const browser = await chromium.launch();
const filas = [];
for (const { ruta, listo } of RUTAS) {
  for (const estrategia of ESTRATEGIAS) {
    const ms = [];
    for (let i = 0; i < N; i++) ms.push(await medir(browser, ruta, listo, estrategia));
    const mediana = (k) => ms.map((x) => x[k]).sort((a, b) => a - b)[Math.floor(ms.length / 2)];
    filas.push({
      ruta,
      estrategia,
      'primer render útil (ms)': mediana('ms'),
      'construcción (ms)': mediana('construccion'),
      'serialización (ms)': mediana('serializacion'),
      'transferencia (ms)': mediana('transferencia'),
      'tarea más larga (ms)': mediana('tareaMasLarga'),
      'tareas largas': mediana('tareasLargas'),
    });
  }
}
await browser.close();
console.log(`CPU ×${TASA}, ${N} repeticiones (mediana)`);
console.table(filas);

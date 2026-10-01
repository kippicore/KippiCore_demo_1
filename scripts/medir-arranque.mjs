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
 * Uso: `npx vite build && npm run medir:arranque -- [repeticiones] [base]`. Sin `base`, el script levanta
 * `vite preview` en el puerto 4180 sobre `dist/` y lo cierra al terminar (también si falla).
 * Variables: CPU (tasa, por defecto 4), ESTRATEGIAS (por defecto worker,json,hilo).
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const N = Number(process.argv[2] ?? 3);
const PUERTO = 4180;
let BASE = process.argv[3];
let servidor = null;
if (!BASE) {
  BASE = `http://localhost:${PUERTO}`;
  servidor = spawn('npx', ['vite', 'preview', '--port', String(PUERTO), '--strictPort'], { stdio: 'ignore', detached: true });
  const cerrar = () => {
    try {
      process.kill(-servidor.pid, 'SIGTERM');
    } catch {
      /* ya cerrado */
    }
  };
  process.on('exit', cerrar);
  process.on('SIGINT', () => process.exit(130));
  process.on('SIGTERM', () => process.exit(143));
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {
      /* aún no escucha */
    }
    if (i > 100) throw new Error('vite preview no arrancó');
    await new Promise((r) => setTimeout(r, 200));
  }
}
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
    inicio: Math.round(r.medicion?.msInicio ?? 0),
    construccion: Math.round(r.medicion?.msConstruccion ?? 0),
    render: Math.round(r.t - (r.medicion?.msInicio ?? 0) - (r.medicion?.msTotal ?? 0)),
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
      'inicio de la construcción (ms)': mediana('inicio'),
      'construcción (ms)': mediana('construccion'),
      'serialización (ms)': mediana('serializacion'),
      'transferencia (ms)': mediana('transferencia'),
      'render tras el estado (ms)': mediana('render'),
      'tarea más larga (ms)': mediana('tareaMasLarga'),
      'tareas largas': mediana('tareasLargas'),
    });
  }
}
await browser.close();
console.log(`CPU ×${TASA}, ${N} repeticiones (mediana)`);
console.table(filas);
process.exit(0);

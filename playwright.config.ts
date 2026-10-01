import { defineConfig, devices } from '@playwright/test';

/** Cada paquete puede usar su propio PORT (tabla en docs/CONTRATOS.md) o el servidor compartido. */
const PORT = Number(process.env.PORT ?? 4173);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
  },
  // `vite build` + `vite preview` en un puerto fijo; Playwright lo levanta y lo cierra solo. `reuseExistingServer`
  // reutiliza un servidor que ya escuche en ese puerto: por eso cada paquete usa su PORT (docs/CONTRATOS.md).
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    { name: 'escritorio-1440', grepInvert: /@rendimiento/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'escritorio-1366', grepInvert: /@rendimiento/, use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 657 } } },
    { name: 'escritorio-1280', grepInvert: /@rendimiento/, use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    {
      name: 'celular-390',
      grepInvert: /@rendimiento/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    // Presupuesto de arranque con CPU ×4 (solo las pruebas @rendimiento). Corre DESPUÉS de los demás proyectos
    // (dependencias) para medir sin competir por la CPU, sin trazas ni paralelismo. Solo:
    // `npm run test:e2e:rendimiento` (= --project=rendimiento --no-deps).
    {
      name: 'rendimiento',
      grep: /@rendimiento/,
      fullyParallel: false,
      dependencies: ['escritorio-1440', 'escritorio-1366', 'escritorio-1280', 'celular-390', 'webkit-hash', 'firefox-hash'],
      use: { ...devices['Desktop Chrome'], trace: 'off', video: 'off', screenshot: 'off' },
    },
    // Determinismo entre motores (hash del estado): solo las pruebas marcadas @hash.
    { name: 'webkit-hash', grep: /@hash/, use: { ...devices['Desktop Safari'] } },
    { name: 'firefox-hash', grep: /@hash/, use: { ...devices['Desktop Firefox'] } },
  ],
});

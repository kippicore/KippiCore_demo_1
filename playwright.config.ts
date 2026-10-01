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
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    { name: 'escritorio-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'escritorio-1366', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 657 } } },
    { name: 'escritorio-1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    {
      name: 'celular-390',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    // Determinismo entre motores (hash del estado): solo las pruebas marcadas @hash.
    { name: 'webkit-hash', grep: /@hash/, use: { ...devices['Desktop Safari'] } },
    { name: 'firefox-hash', grep: /@hash/, use: { ...devices['Desktop Firefox'] } },
  ],
});

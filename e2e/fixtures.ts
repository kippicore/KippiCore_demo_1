import { test as base, expect } from '@playwright/test';

/** Fecha y hora fijas de QA (5.16): todas las cifras de las pruebas son reproducibles. */
export const HOY_QA = '2026-09-30T15:30';

/** Agrega `?hoy=` a una ruta, conservando su query. */
export function conHoy(ruta: string, hoy: string = HOY_QA): string {
  const separador = ruta.includes('?') ? '&' : '?';
  return `${ruta}${separador}hoy=${encodeURIComponent(hoy)}`;
}

export const test = base.extend<{ irA: (ruta: string) => Promise<void> }>({
  irA: async ({ page, context }, usar) => {
    await context.clearCookies();
    await usar(async (ruta: string) => {
      await page.goto(conHoy(ruta));
    });
  },
});

export { expect };

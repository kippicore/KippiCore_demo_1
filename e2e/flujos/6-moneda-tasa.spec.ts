import type { Page } from '@playwright/test';
import { abrir, abrirCelular, AHORA, aNumero, expect, HOY, sel, soloEscritorio1440, test } from './comun';

/**
 * Flujo 6 (PROMPT fase 4, W7): la tasa del dólar se edita en Configuración y la moneda pasa a US$ → todas las cifras
 * visibles cambian (Inicio, Inventario, Pagos, Nómina, Análisis y la app), con la tasa NUEVA. Ninguna pantalla de la
 * muestra deja una cifra en pesos.
 */
const TASA = 4100;
const usd = (cop: number) => {
  const v = Math.round((cop / TASA) * 100) / 100;
  return `US$ ${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`;
};
/** Cifra corta en US$ como `cifraCorta` (8.9.3): "US$ 1,2 mil", "US$ 13,5 mil", "US$ 1,1 M". */
const usdCorta = (cop: number) => {
  const a = Math.round((cop / TASA) * 100) / 100;
  const uno = (x: number) => String(Math.round(x * 10) / 10).replace('.', ',');
  if (a >= 1e6) return `US$ ${uno(a / 1e6)} M`;
  if (a >= 1e3) return `US$ ${uno(a / 1e3)} mil`;
  return `US$ ${Math.round(a)}`;
};
const limpio = (t: string | null) => (t ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

/** Cifras en pesos que queden en la página ("$ 1.234", "$ 12,4 M"), sin contar las de US$ ni las de la tasa. */
async function pesosVisibles(page: Page): Promise<string[]> {
  const texto = limpio(await page.getByTestId('pagina').innerText());
  return (texto.match(/(?<![A-Z¥$])\$ ?\d[\d.,]*( mil M| M| mil)?/g) ?? []).filter((x) => !texto.includes(`1 = ${x}`));
}

test('moneda y tasa: con US$ y la tasa editada cambian las cifras de Inicio, Inventario, Pagos, Nómina, Análisis y la app', async ({ page, context }, info) => {
  soloEscritorio1440(info);
  // 1. Configuración → Monedas: la tasa de ejemplo pasa a $ 4.100 (con fecha de hoy).
  await abrir(page, '/panel/configuracion/monedas');
  await expect(page.getByTestId('tasa-vigente-USD')).toContainText('3.950');
  await page.getByTestId('tasa-valor-USD').fill(String(TASA));
  await page.getByTestId('tasa-guardar-USD').click();
  await expect(page.getByTestId('tasa-vigente-USD')).toContainText('4.100');
  expect(await sel<number>(page, 'selTasaVigente', { moneda: 'USD', fecha: HOY })).toBe(TASA);

  // 2. La moneda del sistema pasa a US$ desde la barra superior; el tooltip ya dice la tasa vigente (E3.2).
  await page.getByTestId('moneda-USD').click();
  await expect(page.getByTestId('franja-moneda')).toContainText('4.100');

  // 3. Inicio: "Ventas de hoy" y "Ventas del mes" en dólares con la tasa nueva; ninguna cifra en pesos.
  await abrir(page, '/panel/inicio');
  const k = await sel<{ tarjetas: { id: string; valor: number }[] }>(page, 'selKpisInicio', { localId: 'todos', ahora: AHORA });
  const hoy = k.tarjetas.find((t) => t.id === 'ventas_hoy')!.valor;
  await expect(page.getByTestId('kpi-ventas_hoy')).toContainText('US$');
  await expect.poll(async () => limpio(await page.getByTestId('kpi-ventas_hoy').innerText())).toContain(usdCorta(hoy));
  await expect(page.getByTestId('kpi-ventas_mes')).toContainText('US$');
  expect(await pesosVisibles(page), 'Inicio sin cifras en pesos').toEqual([]);

  // 4. Inventario → Valorización: el valor a costo en US$ (corto, con la cifra completa en el título).
  await abrir(page, '/panel/inventario/valorizacion');
  const v = await sel<{ total: { aCosto: number } }>(page, 'selValorizacion', { localId: 'todos' });
  await expect(page.getByTestId('val-costo').locator('[data-valor]')).toHaveAttribute('title', usd(v.total.aCosto).replace(' ', ' '));
  expect(await pesosVisibles(page), 'Valorización sin cifras en pesos').toEqual([]);

  // 5. Pagos → Por pagar: el total en US$ con la tasa nueva.
  await abrir(page, '/panel/pagos/por-pagar');
  const cxp = await sel<{ totalCop: number }>(page, 'selCuentasPorPagar', { hoy: HOY, estado: 'pendientes' });
  await expect.poll(async () => limpio(await page.getByTestId('cxp-total').innerText())).toContain(usd(cxp.totalCop).slice(0, -3));
  expect(await pesosVisibles(page), 'Por pagar sin cifras en pesos').toEqual([]);

  // 6. Nómina: el costo del periodo en US$.
  await abrir(page, '/panel/personal/nomina');
  await expect(page.getByTestId('personal-totales-periodo')).toContainText('US$');
  expect(await pesosVisibles(page), 'Nómina sin cifras en pesos').toEqual([]);

  // 7. Análisis → Locales: las ventas de cada local en US$.
  await abrir(page, '/panel/analisis/locales');
  await expect(page.getByTestId('local-usq')).toContainText('US$');
  expect(await pesosVisibles(page), 'Análisis sin cifras en pesos').toEqual([]);

  // 8. App del dueño (otra pestaña: la moneda es de cada pestaña, la tasa es de los datos): en Más → Moneda se elige
  //    US$ con la tasa vigente nueva y la cifra de Hoy queda en dólares.
  const cel = await abrirCelular(context, '/app/mas/moneda');
  await expect(cel.getByTestId('pagina')).toContainText('Tasa vigente: US$ 1 = $ 4.100');
  await expect(cel.getByTestId('app-moneda-USD')).toContainText('US$ 1 = $ 4.100');
  await cel.getByTestId('app-moneda-USD').click();
  await cel.getByTestId('pestana-hoy').click();
  await expect(cel.getByTestId('app-ventas-hoy')).toContainText('US$');
  await expect.poll(async () => aNumero((await cel.getByTestId('app-ventas-hoy').textContent()) ?? '')).toBe(aNumero(usd(hoy)));
  expect(await pesosVisibles(cel), 'Hoy de la app sin cifras en pesos').toEqual([]);

  // 9. De vuelta a pesos: las cifras regresan.
  await page.getByTestId('moneda-COP').click();
  await expect(page.getByTestId('local-usq')).not.toContainText('US$');
});

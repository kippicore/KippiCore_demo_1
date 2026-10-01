import type { BrowserContext, Page, TestInfo } from '@playwright/test';
import { conHoy, expect as expectBase, HOY_QA, test as base } from '../fixtures';
import { conKc, esperarDatos as esperarDatosBase, type KcPagina } from '../kc';

/**
 * Utilidades de los flujos de integración (fase 4, PLAN 5.16): recorren pantallas de VARIOS paquetes y comparan lo que
 * se ve con los selectores (`window.__kc`). Cada flujo corre en 1440 × 900; su variante móvil abre `/app` a 390 × 844
 * en el MISMO contexto (comparte el registro de comandos del almacenamiento local, como dos pestañas del mismo
 * navegador) o, para el QR, en un contexto nuevo (otro aparato).
 *
 *   PORT=4400 npx playwright test e2e/flujos --project=escritorio-1440 --workers=2
 */
export const expect = expectBase.configure({ timeout: 20_000 });
export const HOY = HOY_QA.slice(0, 10);
export const AHORA = `${HOY_QA}:00`;
export { conHoy, conKc, type KcPagina };

/** Errores de consola y de página de TODAS las pestañas del contexto (criterio: ninguno en ningún flujo). */
export function vigilarContexto(context: BrowserContext): string[] {
  const errores: string[] = [];
  const vigilar = (p: Page) => {
    p.on('pageerror', (e) => errores.push(`${p.url()} · pageerror: ${e.message}`));
    p.on('console', (m) => {
      if (m.type() === 'error') errores.push(`${p.url()} · console: ${m.text()}`);
    });
  };
  for (const p of context.pages()) vigilar(p);
  context.on('page', vigilar);
  return errores;
}

export const test = base.extend<{ errores: string[] }>({
  errores: [
    async ({ context }, usar) => {
      const errores = vigilarContexto(context);
      await usar(errores);
      expect(errores, 'errores de consola o de página').toEqual([]);
    },
    { auto: true },
  ],
});

test.use({ actionTimeout: 20_000, navigationTimeout: 60_000 });
test.beforeEach(({ browserName: _n }, info) => {
  info.setTimeout(300_000);
});

/** Los flujos se verifican en 1440 × 900 (la variante móvil va dentro de cada prueba). */
export function soloEscritorio1440(info: TestInfo) {
  test.skip(info.project.name !== 'escritorio-1440', 'Los flujos de integración corren en 1440 × 900 con su variante móvil adentro.');
}

export const esperarDatos = (page: Page) => esperarDatosBase(page, 120_000);

export async function abrir(page: Page, ruta: string): Promise<void> {
  await page.goto(/[?&]hoy=/.test(ruta) ? ruta : conHoy(ruta));
  await esperarDatos(page);
}

/** Ejecuta un selector por nombre en la página. */
export function sel<T>(page: Page, nombre: string, params?: unknown): Promise<T> {
  return page.evaluate(
    ([n, p]) => (globalThis as unknown as { __kc: { sel: (n: string, p?: unknown) => unknown } }).__kc.sel(n as string, p),
    [nombre, params] as const,
  ) as Promise<T>;
}

/** Ejecuta `fn(kc, arg)` en la página (la función se serializa: no puede cerrar sobre variables). */
export function evaluar<T, A>(page: Page, fn: (kc: KcPagina, arg: A) => T | Promise<T>, arg: A): Promise<T> {
  return page.evaluate(`(${fn.toString()})(globalThis.__kc, ${JSON.stringify(arg)})`) as Promise<T>;
}

/** El texto de un `<Dinero>` sin símbolo ni separadores: "$ 5.223.200" → 5223200; "−$ 40.000" → -40000. */
export function aNumero(texto: string): number {
  const negativo = /[−-]/.test(texto);
  const n = Number(texto.replace(/[^\d]/g, ''));
  return negativo ? -n : n;
}

/** `data-valor` de la primera cifra `<Dinero>`/`<Cifra>` dentro del elemento. */
export async function valorDe(page: Page, testid: string): Promise<number> {
  const el = page.getByTestId(testid);
  const propio = await el.first().getAttribute('data-valor');
  if (propio !== null) return Number(propio);
  return Number(await el.first().locator('[data-valor]').first().getAttribute('data-valor'));
}

/** Pesos con el formato de la interfaz (sin símbolo): 1234567 → "1.234.567". */
export const miles = (n: number) => new Intl.NumberFormat('es-CO').format(Math.round(n));

/** Abre `/app` (u otra ruta de la app) a 390 × 844 en el MISMO contexto: lee el registro de comandos de la pestaña. */
export async function abrirCelular(context: BrowserContext, ruta = '/app'): Promise<Page> {
  const p = await context.newPage();
  await p.setViewportSize({ width: 390, height: 844 });
  await abrir(p, ruta);
  return p;
}

export const sinDesborde = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

export async function cambiarRol(page: Page, rol: 'dueno' | 'vendedor' | 'bodega') {
  await page.getByTestId('selector-rol').click();
  await page.getByTestId(`rol-${rol}`).click();
}

export async function cambiarLocal(page: Page, local: 'todos' | 'usq' | 'p93' | 'zr') {
  await page.getByTestId('selector-local').click();
  await page.getByTestId(`local-${local}`).click();
}

/** Venta en el POS como el dueño: el pantalón chino arena talla 32 en Usaquén, con Andrés Gutiérrez y Nequi. */
export const CHINO = 'va_pan_0305_are_32';
export async function venderEnPos(page: Page): Promise<{ ventaId: string; numero: string }> {
  const buscador = page.getByTestId('buscador-producto');
  await buscador.fill('HL-PAN-0305');
  await expect(page.getByRole('option').first()).toBeVisible();
  await buscador.press('Enter');
  await page.getByTestId(`pos-celda-${CHINO}`).click();
  await expect(page.getByTestId('pos-linea')).toHaveCount(1);
  await page.getByTestId('pos-cambiar-cliente').click();
  await page.getByTestId('buscador-cliente').fill('Gutiérrez Mejía');
  await page.getByRole('option', { name: /Andrés Gutiérrez Mejía/ }).first().click();
  await expect(page.getByTestId('pos-cliente-nombre')).toContainText('Andrés');
  await page.getByTestId('pos-medio-nequi').click();
  await page.getByTestId('pos-confirmar').click();
  await expect(page.getByTestId('pos-exito')).toBeVisible();
  const numero = (await page.getByTestId('pos-venta-numero').innerText()).trim();
  const ventaId = await evaluar(page, (kc) => (kc.datos.getState().registro.at(-1) as unknown as { comando: { datos: { ventaId: string } } }).comando.datos.ventaId, null);
  return { ventaId, numero };
}

import type { Page } from '@playwright/test';
import ExcelJS from 'exceljs';
import { readFile } from 'node:fs/promises';
import { conHoy, expect, test } from '../fixtures';
import { conKc, esperarDatos, registrarVentaDePrueba } from '../kc';
import { RUTAS, type NombreRuta } from '../../src/app/rutas';

/**
 * Fundaciones (PLAN 9.2 F2-B, criterio de salida): `window.__kc` expone estado y selectores; TODAS las rutas
 * cargan y recargan sin error sobre `vite preview`; exportar PDF y Excel; registrar venta → recargar → sigue
 * ahí; dos pestañas; modo memoria con localStorage bloqueado; el QR con una venta abre /app con la venta.
 * Corre en el proyecto escritorio-1440 (las demás resoluciones son de F2-C y de los paquetes).
 */
test.beforeEach(({ browserName: _navegador }, info) => {
  test.skip(info.project.name !== 'escritorio-1440', 'Las fundaciones se verifican una vez (1440 × 900).');
});

/** Parámetros de ejemplo para las rutas dinámicas, resueltos con el estado de la página. */
async function parametros(page: Page): Promise<Record<string, string>> {
  return conKc(page, (kc) => {
    const e = kc.estado();
    const n = e.meta.narrativa;
    const primero = (t: Record<string, { id: string }>) => Object.keys(t)[0] ?? '';
    const prod = e.productos[n.productoOxford ?? ''];
    return {
      ventaId: Object.keys(e.ventas)[100] ?? '',
      referencia: prod?.referencia ?? 'HL-CAM-0142',
      numero: e.importaciones[n.importacionEnPuerto ?? '']?.numero ?? '',
      trasladoId: primero(e.traslados),
      conteoId: primero(e.conteos),
      proveedorId: 'pr_huameng',
      cuentaId: primero(e.cuentas),
      liquidacionId: primero(e.liquidaciones),
      slug: 'sebastian-cardenas',
      clienteId: n.clienteVip ?? '',
      facturaId: primero(e.facturas),
      notaId: primero(e.notasCredito),
      sesionId: n.sesionCajaFaltante ?? '',
      categoria: 'camisas',
      slugTienda: prod?.slug ?? '',
    };
  });
}

const PESTANA: Partial<Record<NombreRuta, string>> = {
  productoPestana: 'kardex',
  importacionPestana: 'costo-aterrizado',
  empleadoPestana: 'costo',
};

function urlDe(nombre: NombreRuta, p: Record<string, string>): string {
  let url = RUTAS[nombre].patron;
  for (const param of RUTAS[nombre].params as readonly string[]) {
    const valor = param === 'pestana' ? (PESTANA[nombre] ?? '') : param === 'slug' && nombre === 'tiendaProducto' ? p.slugTienda : p[param];
    url = url.replace(`:${param}`, encodeURIComponent(valor ?? ''));
  }
  return url;
}

test('window.__kc expone estado, selectores, acciones y la huella', async ({ page, irA }) => {
  await irA('/panel/inicio');
  await esperarDatos(page);
  const r = await conKc(page, (kc) => ({
    ventas: Object.keys(kc.estado().ventas).length,
    selectores: typeof kc.selectores.selVentas,
    kpis: (kc.sel('selKpisInicio', { localId: 'todos', ahora: '2026-09-30T15:30:00' }) as { tarjetas: unknown[] }).tarjetas.length,
    huella: kc.hashEstado().length,
    acciones: typeof kc.acciones.registrarVenta,
  }));
  expect(r.ventas).toBeGreaterThan(15_000);
  expect(r.selectores).toBe('function');
  expect(r.kpis).toBe(6);
  expect(r.huella).toBeGreaterThan(10);
  expect(r.acciones).toBe('function');
  await expect(page.getByTestId('kpis-inicio')).toBeVisible();
});

test('todas las rutas cargan sin error y las profundas también al recargar', async ({ page, irA }) => {
  test.setTimeout(600_000);
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  await irA('/panel/inicio');
  await esperarDatos(page);
  const p = await parametros(page);
  const nombres = (Object.keys(RUTAS) as NombreRuta[]).filter((n) => n !== 'sistema' && n !== 'panel');
  const recargar = new Set<NombreRuta>(['producto', 'productoPestana', 'importacion', 'importacionPestana', 'venta', 'empleadoPestana', 'cliente', 'flujo', 'appCierre', 'seguimiento', 'tiendaProducto', 'liquidacion']);
  for (const n of nombres) {
    const url = urlDe(n, p);
    await page.goto(conHoy(url));
    await esperarDatos(page);
    await expect(page.getByTestId('error-ruta'), url).toHaveCount(0);
    await expect(page.getByTestId('no-encontrada'), url).toHaveCount(0);
    const esperado = n === 'entrada' ? 'entrada' : n === 'app' ? 'app-hoy' : 'pagina-esqueleto';
    await expect(page.getByTestId(esperado).first(), url).toBeVisible();
    if (recargar.has(n)) {
      await page.reload();
      await esperarDatos(page);
      await expect(page.getByTestId(esperado).first(), `${url} (recarga)`).toBeVisible();
    }
  }
  // Una ruta inexistente muestra la página de no encontrada.
  await page.goto(conHoy('/no-existe/en-ningun-lado'));
  await expect(page.getByTestId('no-encontrada')).toBeVisible();
  expect(errores).toEqual([]);
});

test('la guarda de rol lleva al vendedor a su inicio', async ({ page, irA }) => {
  await irA('/panel/inicio');
  await esperarDatos(page);
  await page.getByTestId('selector-rol').selectOption('vendedor');
  await expect(page).toHaveURL(/\/panel\/mi-dia/);
  await page.goto(conHoy('/panel/pagos/flujo'));
  await expect(page).toHaveURL(/\/panel\/mi-dia/);
  await expect(page.getByTestId('avisos')).toContainText('solo para el dueño');
});

test('exportar un PDF y un Excel de prueba (con totales en caché)', async ({ page, irA }) => {
  await irA('/panel/reportes');
  await esperarDatos(page);
  const fila = page.locator('[data-reporte="ventas"]');
  const [pdf] = await Promise.all([page.waitForEvent('download'), fila.locator('[data-formato="pdf"]').click()]);
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  const bytesPdf = await readFile((await pdf.path()) ?? '');
  expect(bytesPdf.subarray(0, 5).toString()).toBe('%PDF-');
  const [xls] = await Promise.all([page.waitForEvent('download'), fila.locator('[data-formato="excel"]').click()]);
  expect(xls.suggestedFilename()).toMatch(/\.xlsx$/);
  const libro = new ExcelJS.Workbook();
  const b = await readFile((await xls.path()) ?? '');
  await libro.xlsx.load(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
  const ws = libro.worksheets[0];
  const ultima = ws?.lastRow;
  const total = ultima?.getCell(10).value as { formula?: string; result?: number };
  expect(total.formula).toMatch(/^SUM\(/);
  expect(total.result).toBeGreaterThan(0);
});

test('registrar una venta, recargar y sigue ahí', async ({ page, irA }) => {
  await irA('/panel/inicio');
  await esperarDatos(page);
  const { ventaId, numero } = await registrarVentaDePrueba(page);
  expect(numero).toMatch(/^V-\d+/);
  await page.reload();
  await esperarDatos(page);
  const despues = await conKc(page, (kc) => ({ ventas: kc.estado().ventas, registro: kc.datos.getState().registro.length }));
  expect(despues.ventas[ventaId]?.numero).toBe(numero);
  expect(despues.registro).toBe(1);
});

test('dos pestañas: la venta de una llega a la otra (reconstrucción) con su aviso', async ({ context }) => {
  const a = await context.newPage();
  const b = await context.newPage();
  await a.goto(conHoy('/panel/inicio'));
  await b.goto(conHoy('/panel/inicio'));
  await esperarDatos(a);
  await esperarDatos(b);
  const { ventaId } = await registrarVentaDePrueba(a);
  await b.waitForFunction((id) => !!(globalThis as unknown as { __kc: { estado: () => { ventas: Record<string, unknown> } } }).__kc.estado().ventas[id], ventaId, { timeout: 30_000 });
  await expect(b.getByTestId('avisos')).toContainText('Nueva venta');
});

test('modo memoria con localStorage bloqueado: todo funciona en la pestaña', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Bloqueado', 'SecurityError');
      },
    });
  });
  await page.goto(conHoy('/panel/inicio'));
  await esperarDatos(page);
  expect(await conKc(page, (kc) => kc.datos.getState().modo)).toBe('memoria');
  const { ventaId } = await registrarVentaDePrueba(page);
  const r = await conKc(page, (kc) => kc.datos.getState().registro.length);
  expect(r).toBe(1);
  expect(ventaId).toMatch(/^vt_/);
  await expect(page.getByTestId('kpis-inicio')).toBeVisible();
});

test('el QR con una venta abre /app con la venta en un celular sin datos', async ({ page, irA, browser }) => {
  await irA('/panel/inicio');
  await esperarDatos(page);
  const { ventaId, numero } = await registrarVentaDePrueba(page);
  const url = await conKc(page, (kc) => kc.urlQr());
  expect(url).toMatch(/\/app\?hoy=.*#r=[zj]/);
  expect(url.split('#r=')[1]?.length ?? 999).toBeLessThanOrEqual(300);
  const celular = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await celular.newPage();
  await p.goto(url);
  await esperarDatos(p);
  await expect(p.getByTestId('app-hoy')).toBeVisible();
  await expect(p.locator(`[data-venta="${ventaId}"]`)).toContainText(numero);
  expect(await p.evaluate(() => (globalThis as unknown as { location: { hash: string } }).location.hash)).toBe('');
  const qr = await conKc(p, (kc) => (kc.datos.getState() as unknown as { qr: { resultado: string } }).qr.resultado);
  expect(qr).toBe('adoptado');
  await celular.close();
});

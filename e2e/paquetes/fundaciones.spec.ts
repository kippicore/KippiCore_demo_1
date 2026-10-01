import type { Page } from '@playwright/test';
import ExcelJS from 'exceljs';
import { strFromU8, unzipSync } from 'fflate';
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

/** Cada ruta se prueba con carga directa (enlace profundo) y recarga; en 4 grupos paralelos para no tardar. */
const NOMBRES_RUTAS = (Object.keys(RUTAS) as NombreRuta[]).filter((n) => n !== 'sistema' && n !== 'panel');
const GRUPOS = 4;
for (let g = 0; g < GRUPOS; g++) {
  const grupo = NOMBRES_RUTAS.filter((_, i) => i % GRUPOS === g);
  test(`todas las rutas cargan y recargan sin errores de consola (grupo ${g + 1}/${GRUPOS}: ${grupo.length} rutas)`, async ({ page, irA }) => {
    test.setTimeout(600_000);
    const errores: string[] = [];
    page.on('pageerror', (e) => errores.push(`${page.url()}: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errores.push(`${page.url()}: ${m.text()}`);
    });
    await irA('/panel/inicio');
    await esperarDatos(page);
    const p = await parametros(page);
    for (const n of grupo) {
      const url = urlDe(n, p);
      const esperado = n === 'entrada' ? 'entrada' : n === 'app' ? 'app-hoy' : 'pagina-esqueleto';
      for (const fase of ['carga', 'recarga'] as const) {
        if (fase === 'carga') await page.goto(conHoy(url));
        else await page.reload();
        await esperarDatos(page);
        await expect(page.getByTestId(esperado).first(), `${url} (${fase})`).toBeVisible();
        await expect(page.getByTestId('error-ruta'), `${url} (${fase})`).toHaveCount(0);
        await expect(page.getByTestId('no-encontrada'), `${url} (${fase})`).toHaveCount(0);
      }
    }
    if (g === 0) {
      // Una ruta inexistente muestra la página de no encontrada (sin error).
      await page.goto(conHoy('/no-existe/en-ningun-lado'));
      await expect(page.getByTestId('no-encontrada')).toBeVisible();
    }
    expect(errores).toEqual([]);
  });
}

test('la carga inicial no trae jsPDF ni ExcelJS (solo al exportar, 5.15)', async ({ page, irA }) => {
  const js: string[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('.js')) js.push(new URL(r.url()).pathname);
  });
  for (const ruta of ['/', '/panel/inicio', '/app']) {
    await irA(ruta);
    await esperarDatos(page);
  }
  const pesados = js.filter((u) => /\/assets\/(pdf|excel|index\.es|html2canvas|purify\.es)-/.test(u));
  expect(pesados).toEqual([]);
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

async function leerPdf(ruta: string | null): Promise<Buffer> {
  const b = await readFile(ruta ?? '');
  expect(b.subarray(0, 5).toString()).toBe('%PDF-');
  expect(b.subarray(-8).toString()).toContain('%%EOF');
  return b;
}

async function leerExcel(ruta: string | null): Promise<ExcelJS.Workbook> {
  const libro = new ExcelJS.Workbook();
  const b = await readFile(ruta ?? '');
  await libro.xlsx.load(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
  return libro;
}

/** Celdas con fórmula SUM de la última fila (la de totales): todas traen su resultado en caché. */
function totalesEnCache(ws: ExcelJS.Worksheet | undefined): { formula: string; result: unknown }[] {
  const fila = ws?.lastRow;
  const r: { formula: string; result: unknown }[] = [];
  fila?.eachCell((c) => {
    const v = c.value as { formula?: string; result?: unknown } | null;
    if (v && typeof v === 'object' && typeof v.formula === 'string') r.push({ formula: v.formula, result: v.result });
  });
  return r;
}

test('exportar un PDF y un Excel de prueba: se descargan y se pueden releer (totales en caché)', async ({ page, irA }) => {
  await irA('/panel/reportes');
  await esperarDatos(page);
  const fila = page.locator('[data-reporte="ventas"]');
  const [pdf] = await Promise.all([page.waitForEvent('download'), fila.locator('[data-formato="pdf"]').click()]);
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  const bytesPdf = await leerPdf(await pdf.path());
  expect(bytesPdf.length).toBeGreaterThan(5_000);
  // La fuente Figtree va embebida (tildes, − y espacio duro).
  expect(bytesPdf.toString('latin1')).toContain('Figtree');

  const [xls] = await Promise.all([page.waitForEvent('download'), fila.locator('[data-formato="excel"]').click()]);
  expect(xls.suggestedFilename()).toMatch(/\.xlsx$/);
  const libro = await leerExcel(await xls.path());
  const ws = libro.worksheets[0];
  expect(ws?.getCell('A1').value).toEqual(expect.stringContaining('HALDEN'));
  const totales = totalesEnCache(ws);
  expect(totales.length).toBeGreaterThan(0);
  for (const t of totales) {
    expect(t.formula).toMatch(/^SUM\(/);
    expect(typeof t.result).toBe('number');
  }
  expect(totales.some((t) => (t.result as number) > 0)).toBe(true);
  // fullCalcOnLoad queda en el XML del libro (ExcelJS no lo relee): Excel recalcula al abrir.
  const zip = unzipSync(new Uint8Array(await readFile((await xls.path()) ?? '')));
  expect(strFromU8(zip['xl/workbook.xml'] ?? new Uint8Array())).toMatch(/fullCalcOnLoad="1"/);

  // "Exportar para tu contador": un libro con varias hojas, todas legibles.
  const contador = page.locator('[data-reporte="contador"]');
  const [xc] = await Promise.all([page.waitForEvent('download'), contador.locator('[data-formato="excel"]').click()]);
  const libroContador = await leerExcel(await xc.path());
  expect(libroContador.worksheets.length).toBeGreaterThanOrEqual(5);

  // <BotonExportar> emite pdf_generado / excel_generado con el id del reporte (6.18).
  const eventos = await conKc(page, (kc) => kc.eventosUI().map((e) => `${e.tipo}:${String(e.datos.reporte)}`));
  expect(eventos).toEqual(['pdf_generado:ventas', 'excel_generado:ventas', 'excel_generado:contador']);
});

test('plantillas PDF únicas (desprendible, factura, POS, nota crédito, etiquetas) se descargan', async ({ page, irA }) => {
  await irA('/panel/reportes');
  await esperarDatos(page);
  const tipos = await page.locator('[data-plantilla]').evaluateAll((els) => els.map((e) => e.getAttribute('data-plantilla')));
  expect(tipos).toEqual(['desprendible', 'factura', 'pos', 'nota-credito', 'etiquetas']);
  for (const t of tipos) {
    const [d] = await Promise.all([page.waitForEvent('download'), page.locator(`[data-plantilla="${t}"] button`).click()]);
    expect(d.suggestedFilename(), t ?? '').toMatch(/\.pdf$/);
    await leerPdf(await d.path());
  }
});

test('registrar una venta, recargar y sigue ahí', async ({ page, irA }) => {
  await irA('/panel/inicio');
  await esperarDatos(page);
  const { ventaId, numero } = await registrarVentaDePrueba(page);
  expect(numero).toMatch(/^V-\d+/);
  // El bus entrega los eventos de dominio con su contexto (origen usuario, rol dueño).
  const ev = await conKc(page, (kc) => kc.eventosDominio().find((e) => e.tipo === 'VentaRegistrada'));
  expect(ev?.contexto).toMatchObject({ origen: 'usuario', rol: 'dueno' });
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

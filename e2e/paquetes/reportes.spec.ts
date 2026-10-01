import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import ExcelJS from 'exceljs';
import { strFromU8, unzipSync, unzlibSync } from 'fflate';
import { conHoy, expect, test } from '../fixtures';
import { conKc, esperarDatos } from '../kc';

/**
 * D4 · Centro de reportes (PLAN 9.4). Verifica solo `/panel/reportes`: las filas salen de las definiciones únicas,
 * la vista previa cuadra con los selectores, los archivos se descargan y se vuelven a leer (PDF con tildes, Excel
 * con totales en caché). Los efectos fuera de la pantalla se leen por `window.__kc`. Sin errores en consola.
 */
const miles = (n: number) => new Intl.NumberFormat('es-CO').format(Math.round(n));

let errores: string[] = [];
test.beforeEach(({ page }) => {
  errores = [];
  page.on('pageerror', (e) => errores.push(`${page.url()}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`${page.url()}: ${m.text()}`);
  });
});
test.afterEach(() => {
  expect(errores, 'errores de consola').toEqual([]);
});

async function abrir(page: Page, irA: (ruta: string) => Promise<void>, ruta = '/panel/reportes') {
  await irA(ruta);
  await esperarDatos(page);
  await expect(page.getByTestId('pagina')).toBeVisible();
  await esperarVista(page);
}

/** La vista previa ya se calculó (no queda esqueleto ni `aria-busy`). */
async function esperarVista(page: Page) {
  await expect(page.getByTestId('reportes-cargando')).toHaveCount(0);
  await expect(page.locator('[data-testid="reportes-vista"][aria-busy="true"]')).toHaveCount(0);
}

async function elegirReporte(page: Page, id: string, titulo: RegExp) {
  await page.getByTestId(`reporte-tarjeta-${id}`).click();
  await expect(page.getByTestId('reportes-panel-titulo')).toHaveText(titulo);
  await expect(page).toHaveURL(new RegExp(`reporte=${id}`));
  await esperarVista(page);
}

// ---------------------------------------------------------------------------------------------------------
// Lectura de los archivos descargados
// ---------------------------------------------------------------------------------------------------------
async function descargar(page: Page, clic: () => Promise<void>): Promise<{ nombre: string; datos: Buffer }> {
  const [d] = await Promise.all([page.waitForEvent('download'), clic()]);
  return { nombre: d.suggestedFilename(), datos: await readFile((await d.path()) ?? '') };
}

/**
 * Texto de un PDF de jsPDF con Figtree embebida (Identity-H): lee cada flujo de contenido y traduce los glifos con el
 * mapa ToUnicode de la fuente en uso. Si las tildes no estuvieran embebidas, aquí no aparecerían.
 */
function textoDePdf(buf: Buffer): string {
  expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(buf.subarray(-8).toString()).toContain('%%EOF');
  const latin = buf.toString('latin1');
  const objetos = new Map<number, { dict: string; datos: string | null }>();
  for (const m of latin.matchAll(/(\d+) 0 obj([\s\S]*?)endobj/g)) {
    const cuerpo = m[2] ?? '';
    const s = cuerpo.indexOf('stream');
    if (s < 0) {
      objetos.set(Number(m[1]), { dict: cuerpo, datos: null });
      continue;
    }
    const dict = cuerpo.slice(0, s);
    let ini = (m.index ?? 0) + m[0].indexOf('stream') + 6;
    if (latin[ini] === '\r') ini++;
    if (latin[ini] === '\n') ini++;
    const fin = latin.indexOf('endstream', ini);
    const crudo = buf.subarray(ini, fin);
    let datos: string | null;
    try {
      datos = /FlateDecode/.test(dict) ? Buffer.from(unzlibSync(new Uint8Array(crudo))).toString('latin1') : crudo.toString('latin1');
    } catch {
      datos = null;
    }
    objetos.set(Number(m[1]), { dict, datos });
  }
  const mapaDe = (id: number): Map<string, string> => {
    const mapa = new Map<string, string>();
    for (const x of (objetos.get(id)?.datos ?? '').matchAll(/<([0-9a-fA-F]{4})><([0-9a-fA-F]{4})>/g)) mapa.set((x[1] ?? '').toLowerCase(), String.fromCharCode(parseInt(x[2] ?? '0', 16)));
    return mapa;
  };
  const mapaPorObjeto = new Map<number, Map<string, string>>();
  for (const [id, o] of objetos) {
    const t = /\/Subtype\s*\/Type0[\s\S]*?\/ToUnicode (\d+) 0 R/.exec(o.dict);
    if (t) mapaPorObjeto.set(id, mapaDe(Number(t[1])));
  }
  const fuentes = new Map<string, Map<string, string>>();
  for (const m of latin.matchAll(/\/(F\d+) (\d+) 0 R/g)) {
    const mapa = mapaPorObjeto.get(Number(m[2]));
    if (mapa) fuentes.set(m[1] ?? '', mapa);
  }
  const piezas: string[] = [];
  for (const o of objetos.values()) {
    if (!o.datos || !/ Tf/.test(o.datos)) continue;
    let actual: Map<string, string> | undefined;
    for (const t of o.datos.matchAll(/\/(F\d+) [\d.]+ Tf|<([0-9a-fA-F]+)>\s*Tj|\(((?:\\.|[^\\)])*)\)\s*Tj/g)) {
      if (t[1]) actual = fuentes.get(t[1]);
      else if (t[2] && actual) piezas.push((t[2].toLowerCase().match(/.{4}/g) ?? []).map((c) => actual?.get(c) ?? '').join(''));
      else if (t[3]) piezas.push(t[3]);
    }
  }
  return piezas.join('\n');
}

async function leerExcel(datos: Buffer): Promise<ExcelJS.Workbook> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(datos.buffer.slice(datos.byteOffset, datos.byteOffset + datos.byteLength) as ArrayBuffer);
  return libro;
}

/** Celdas con fórmula de la última fila (la de totales): cada una trae su resultado en caché. */
function totalesEnCache(ws: ExcelJS.Worksheet | undefined): { columna: string; formula: string; result: unknown }[] {
  const r: { columna: string; formula: string; result: unknown }[] = [];
  ws?.lastRow?.eachCell((c, i) => {
    const v = c.value as { formula?: string; result?: unknown } | null;
    if (v && typeof v === 'object' && typeof v.formula === 'string') r.push({ columna: String(ws.getRow(4).getCell(i).value ?? ''), formula: v.formula, result: v.result });
  });
  return r;
}

function verificarExcel(libro: ExcelJS.Workbook, datos: Buffer, exigirTotales = true) {
  expect(libro.worksheets.length).toBeGreaterThan(0);
  const ws = libro.worksheets[0];
  expect(String(ws?.getCell('A1').value)).toContain('HALDEN');
  expect(String(ws?.getCell('A2').value)).toMatch(/Cifras en|COP|USD/);
  let hubo = false;
  for (const hoja of libro.worksheets) {
    for (const t of totalesEnCache(hoja)) {
      hubo = true;
      expect(t.formula).toMatch(/^SUM\(/);
      expect(typeof t.result).toBe('number');
    }
  }
  if (exigirTotales) expect(hubo, 'al menos una fila de totales con SUM').toBe(true);
  // fullCalcOnLoad queda en el XML del libro (ExcelJS no lo relee): Excel recalcula al abrir.
  expect(strFromU8(unzipSync(new Uint8Array(datos))['xl/workbook.xml'] ?? new Uint8Array())).toMatch(/fullCalcOnLoad="1"/);
}

function totalDeColumna(libro: ExcelJS.Workbook, hoja: string, titulo: string): number | null {
  const ws = libro.getWorksheet(hoja);
  return totalesEnCache(ws).find((t) => t.columna === titulo)?.result as number | null;
}

// ---------------------------------------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------------------------------------
test('el centro: tarjeta del contador, 12 reportes agrupados y vista previa con totales que cuadran con los selectores', async ({ page, irA }) => {
  await abrir(page, irA);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Reportes/i);
  await expect(page.getByTestId('reportes-contador')).toContainText('Exportar para tu contador');
  await expect(page.getByTestId('reportes-contador')).toContainText('Valores y fechas ilustrativos');
  await expect(page.locator('[data-testid^="reporte-tarjeta-"]')).toHaveCount(12);
  expect(await page.locator('[data-grupo]').evaluateAll((els) => els.map((e) => e.getAttribute('data-grupo')))).toEqual(['vender', 'mercancia', 'plata', 'equipo']);
  // Abre en el primero, con el mes en curso y todos los locales.
  await expect(page.getByTestId('reportes-panel-titulo')).toHaveText(/Ventas detalladas y resumidas/);
  await expect(page.getByTestId('reportes-filtros-texto')).toContainText('Del 01/09/2026 al 30/09/2026');
  await expect(page.getByTestId('reportes-filtros-texto')).toContainText('Todos los locales');
  const s = await conKc(page, (kc) => (kc.sel('selVentas', { desde: '2026-09-01', hasta: '2026-09-30', localId: 'todos' }) as { filas: unknown[]; totales: { ventas: number; netas: number } }));
  const panel = page.getByTestId('reportes-panel');
  await expect(panel).toContainText(`$ ${miles(s.totales.ventas)}`);
  await expect(page.getByTestId('reportes-conteo')).toContainText(`primeras 8 de ${miles(s.filas.length)} filas`);
  await expect(page.locator('[data-testid="reportes-tabla"] tbody tr')).toHaveCount(8);
  // La segunda hoja (resumen por día y local) suma lo mismo que las ventas netas del selector.
  await page.getByTestId('reportes-hoja-1').click();
  await expect(panel).toContainText(`$ ${miles(s.totales.netas)}`);
  // La pista de la tarjeta del contador existe y abre su texto.
  await page.getByTestId('pista-reportes.contador').click();
  await expect(page.getByRole('dialog', { name: 'Pista' })).toContainText('Un solo Excel');
});

test('filtros: el rango y el local cambian la vista previa y el texto del archivo', async ({ page, irA }) => {
  await abrir(page, irA);
  await page.getByTestId('reportes-filtro-fechas').click();
  await page.getByRole('button', { name: 'Mes anterior', exact: true }).click();
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.getByTestId('reportes-filtros-texto')).toContainText('Del 01/08/2026 al 31/08/2026');
  await page.getByTestId('reportes-filtro-local').click();
  await page.getByTestId('reportes-select-local').click();
  await page.getByRole('option', { name: 'Usaquén' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('reportes-filtros-texto')).toContainText('Usaquén');
  await esperarVista(page);
  const s = await conKc(page, (kc) => (kc.sel('selVentas', { desde: '2026-08-01', hasta: '2026-08-31', localId: 'usq' }) as { filas: unknown[]; totales: { ventas: number } }));
  expect(s.filas.length).toBeGreaterThan(8);
  await expect(page.getByTestId('reportes-panel')).toContainText(`$ ${miles(s.totales.ventas)}`);
  await expect(page.getByTestId('reportes-conteo')).toContainText(`de ${miles(s.filas.length)} filas`);
  // La tarjeta del contador usa el mismo periodo y local.
  await expect(page.getByTestId('reportes-contador-periodo')).toContainText('Mes anterior · Usaquén');
  // Un reporte que es foto de hoy lo dice y no usa las fechas.
  await page.getByTestId('reporte-tarjeta-inventario').click();
  await expect(page.getByTestId('reportes-panel-filtros')).toContainText('no depende de las fechas');
  await expect(page.getByTestId('reportes-filtros-texto')).toContainText('Corte al 30/09/2026');
});

test('?reporte= abre la tarjeta (kárdex con su referencia, nómina con su periodo y desprendibles); uno desconocido abre el primero y avisa', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/reportes?reporte=kardex');
  await expect(page.getByTestId('reportes-panel-titulo')).toHaveText(/Kárdex por referencia/);
  await expect(page.getByTestId('reporte-tarjeta-kardex')).toHaveAttribute('aria-current', 'true');
  await expect(page.getByTestId('reportes-select-referencia')).toContainText('HL-');
  await expect(page.getByTestId('reportes-hoja').first()).toHaveAttribute('data-hoja', /^Kardex HL-/);

  await page.goto(conHoy('/panel/reportes?reporte=nomina'));
  await esperarDatos(page);
  await esperarVista(page);
  await expect(page.getByTestId('reportes-panel-titulo')).toHaveText(/Nómina del periodo y desprendibles/);
  await expect(page.getByTestId('reportes-panel').locator('[data-nota-legal="nomina"]')).toBeVisible();
  await expect(page.getByTestId('reportes-desprendibles')).toContainText('Desprendibles de');

  await page.goto(conHoy('/panel/reportes?reporte=contador'));
  await esperarDatos(page);
  await esperarVista(page);
  await expect(page.getByTestId('reportes-panel-titulo')).toHaveText(/Exportar para tu contador/);
  await expect(page.getByTestId('reportes-hoja-0')).toBeVisible();
  await expect(page.getByTestId('reportes-hoja-4')).toBeVisible();
  await expect(page.getByTestId('reportes-panel').locator('[data-nota-legal="tributario"]')).toBeVisible();

  await page.goto(conHoy('/panel/reportes?reporte=no-existe'));
  await esperarDatos(page);
  await expect(page.getByTestId('reportes-panel-titulo')).toHaveText(/Ventas detalladas y resumidas/);
  await expect(page.getByText('Ese reporte ya no existe')).toBeVisible();
});

test('rol bodega: solo inventario y kárdex (y la bodega como local); ?reporte= de otro avisa', async ({ page, irA }) => {
  await abrir(page, irA);
  await page.getByTestId('selector-rol').click();
  await page.getByTestId('rol-bodega').click();
  await expect(page.locator('[data-testid^="reporte-tarjeta-"]')).toHaveCount(2);
  await expect(page.getByTestId('reporte-tarjeta-inventario')).toBeVisible();
  await expect(page.getByTestId('reporte-tarjeta-kardex')).toBeVisible();
  await expect(page.getByTestId('reportes-contador')).toHaveCount(0);
  await expect(page.getByTestId('reportes-documentos')).toHaveCount(0);
  await expect(page.getByTestId('reportes-panel-titulo')).toHaveText(/Inventario valorizado/);
  await page.getByTestId('reportes-filtro-local').click();
  await page.getByTestId('reportes-select-local').click();
  await expect(page.getByRole('option', { name: 'Bodega' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  // Un reporte que su rol no ve: abre el primero suyo y lo dice.
  await page.evaluate(
    "history.pushState({}, '', location.pathname + '?reporte=nomina&hoy=2026-09-30T15%3A30'); dispatchEvent(new PopStateEvent('popstate'));",
  );
  await expect(page.getByText('Ese reporte no está disponible para tu rol')).toBeVisible();
  await expect(page.getByTestId('reportes-panel-titulo')).toHaveText(/Inventario valorizado/);
});

test('la moneda activa se ve en la vista previa y en el archivo', async ({ page, irA }) => {
  await abrir(page, irA);
  await page.getByTestId('moneda-USD').click();
  await esperarVista(page);
  await expect(page.getByTestId('reportes-filtros-texto')).toContainText('Cifras en USD');
  await expect(page.getByTestId('reportes-panel')).toContainText('US$');
  const xls = await descargar(page, () => page.getByTestId('reportes-descargas').locator('[data-formato="excel"]').click());
  const libro = await leerExcel(xls.datos);
  expect(String(libro.worksheets[0]?.getCell('A2').value)).toContain('USD');
});

// ---------------------------------------------------------------------------------------------------------
// Descargas
// ---------------------------------------------------------------------------------------------------------
test('descarga en PDF y Excel cuatro reportes y se vuelven a leer: PDF con tildes, Excel con totales en caché', async ({ page, irA }) => {
  test.setTimeout(120_000);
  await abrir(page, irA);
  const botones = page.getByTestId('reportes-descargas');
  const s = await conKc(page, (kc) => (kc.sel('selVentas', { desde: '2026-09-01', hasta: '2026-09-30', localId: 'todos' }) as { totales: { ventas: number } }));

  // 1. Ventas
  let pdf = await descargar(page, () => botones.locator('[data-formato="pdf"]').click());
  expect(pdf.nombre).toBe('ventas-detalladas-y-resumidas-2026-09-30.pdf');
  expect(pdf.datos.length).toBeGreaterThan(5_000);
  let texto = textoDePdf(pdf.datos);
  expect(texto).toContain('VENTAS DETALLADAS Y RESUMIDAS');
  expect(texto).toContain('HALDEN');
  expect(texto).toContain('Generado con KippiCore CRM');
  expect(texto).toContain('Del 01/09/2026 al 30/09/2026');
  let xls = await descargar(page, () => botones.locator('[data-formato="excel"]').click());
  expect(xls.nombre).toBe('ventas-detalladas-y-resumidas-2026-09-30.xlsx');
  let libro = await leerExcel(xls.datos);
  verificarExcel(libro, xls.datos);
  expect(totalDeColumna(libro, 'Ventas detalladas', 'Total con IVA')).toBe(s.totales.ventas);

  // 2. Gastos por categoría (tilde en la Í del título) y su total contra el selector
  await elegirReporte(page, 'gastos', /Gastos por categoría/);
  const g = await conKc(page, (kc) => (kc.sel('selGastos', { desde: '2026-09-01', hasta: '2026-09-30', localId: 'todos' }) as { total: number }));
  pdf = await descargar(page, () => botones.locator('[data-formato="pdf"]').click());
  texto = textoDePdf(pdf.datos);
  expect(texto).toContain('GASTOS POR CATEGORÍA');
  xls = await descargar(page, () => botones.locator('[data-formato="excel"]').click());
  libro = await leerExcel(xls.datos);
  verificarExcel(libro, xls.datos);
  const detalle = libro.worksheets.find((w) => /Detalle/.test(w.name));
  expect(detalle).toBeDefined();
  expect(totalesEnCache(detalle).some((t) => t.result === g.total)).toBe(true);

  // 3. Estado de resultados
  await elegirReporte(page, 'resultados', /Estado de resultados simplificado/);
  pdf = await descargar(page, () => botones.locator('[data-formato="pdf"]').click());
  expect(textoDePdf(pdf.datos)).toContain('ESTADO DE RESULTADOS SIMPLIFICADO');
  xls = await descargar(page, () => botones.locator('[data-formato="excel"]').click());
  // El estado de resultados no suma columnas (son cifras ya calculadas por local): sin fila SUM.
  verificarExcel(await leerExcel(xls.datos), xls.datos, false);

  // 4. Kárdex de una referencia (Á en el título; el saldo final es un total no aditivo, valor fijo)
  await elegirReporte(page, 'kardex', /Kárdex por referencia/);
  pdf = await descargar(page, () => botones.locator('[data-formato="pdf"]').click());
  expect(textoDePdf(pdf.datos)).toContain('KÁRDEX POR REFERENCIA');
  xls = await descargar(page, () => botones.locator('[data-formato="excel"]').click());
  libro = await leerExcel(xls.datos);
  verificarExcel(libro, xls.datos);
  expect(libro.worksheets[0]?.name).toMatch(/^Kardex HL-/);

  // Cada descarga emitió su evento con el id del reporte (6.18).
  const eventos = await conKc(page, (kc) => kc.eventosUI().map((e) => `${e.tipo}:${String(e.datos.reporte)}`));
  expect(eventos).toEqual([
    'pdf_generado:ventas',
    'excel_generado:ventas',
    'pdf_generado:gastos',
    'excel_generado:gastos',
    'pdf_generado:resultados',
    'excel_generado:resultados',
    'pdf_generado:kardex',
    'excel_generado:kardex',
  ]);
});

test('"Exportar para tu contador": un clic descarga el Excel con sus hojas, IVA y totales; la vista del panel también sale en PDF', async ({ page, irA }) => {
  test.setTimeout(90_000);
  await abrir(page, irA);
  const hero = page.getByTestId('reportes-contador');
  const xls = await descargar(page, () => hero.locator('[data-formato="excel"]').click());
  expect(xls.nombre).toBe('exportar-para-tu-contador-2026-09-30.xlsx');
  const libro = await leerExcel(xls.datos);
  verificarExcel(libro, xls.datos);
  const nombres = libro.worksheets.map((w) => w.name);
  for (const n of ['Ventas', 'Compras e importaciones', 'Nómina', 'IVA generado y descontable']) expect(nombres).toContain(n);
  expect(nombres.some((n) => /^Gastos/.test(n))).toBe(true);
  // El IVA de ventas del Excel es el que sale de las ventas del periodo (IVA 19 % incluido en el total con IVA).
  const ivaVentas = totalDeColumna(libro, 'Ventas', 'IVA generado');
  const ventas = await conKc(page, (kc) => (kc.sel('selVentas', { desde: '2026-09-01', hasta: '2026-09-30', localId: 'todos' }) as { totales: { ventas: number } }).totales.ventas);
  expect(ivaVentas).not.toBeNull();
  expect(Math.abs((ivaVentas ?? 0) - ventas + ventas / 1.19)).toBeLessThan(ventas * 0.02);

  // Desde la tarjeta se abre su vista previa y se baja también en PDF (con tildes).
  await hero.getByTestId('reportes-contador-ver').click();
  await expect(page.getByTestId('reportes-panel-titulo')).toHaveText(/Exportar para tu contador/);
  await esperarVista(page);
  const pdf = await descargar(page, () => page.getByTestId('reportes-descargas').locator('[data-formato="pdf"]').click());
  const texto = textoDePdf(pdf.datos);
  expect(texto).toContain('EXPORTAR PARA TU CONTADOR');
  expect(texto).toContain('NÓMINA');
  const eventos = await conKc(page, (kc) => kc.eventosUI().map((e) => `${e.tipo}:${String(e.datos.reporte)}`));
  expect(eventos).toEqual(['excel_generado:contador', 'pdf_generado:contador']);
});

test('nómina: el desprendible de un empleado se descarga como PDF y los documentos de muestra también', async ({ page, irA }) => {
  test.setTimeout(90_000);
  await abrir(page, irA, '/panel/reportes?reporte=nomina');
  const d = await descargar(page, () => page.getByTestId('reportes-desprendibles').getByRole('button', { name: /Desprendible en PDF/ }).click());
  expect(d.nombre).toMatch(/\.pdf$/);
  expect(d.datos.subarray(0, 5).toString()).toBe('%PDF-');
  const tipos = await page.locator('[data-plantilla]').evaluateAll((els) => els.map((e) => e.getAttribute('data-plantilla')));
  expect(tipos).toEqual(['desprendible', 'factura', 'pos', 'nota-credito', 'etiquetas']);
  const e = await descargar(page, () => page.locator('[data-plantilla="etiquetas"] button').click());
  expect(e.nombre).toMatch(/\.pdf$/);
  const eventos = await conKc(page, (kc) => kc.eventosUI().map((x) => `${x.tipo}:${String(x.datos.reporte)}`));
  expect(eventos).toEqual(['pdf_generado:desprendible', 'pdf_generado:etiquetas']);
});

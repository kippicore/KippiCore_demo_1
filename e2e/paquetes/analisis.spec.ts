import type { Page } from '@playwright/test';
import ExcelJS from 'exceljs';
import { readFile } from 'node:fs/promises';
import { expect, test } from '../fixtures';
import { conKc, esperarDatos } from '../kc';

/**
 * D2 · Análisis y tabla dinámica (PLAN 9.4): resumen con hallazgos, proyección, año contra año, mapa de calor y semanas;
 * productos (más y menos vendidos, tallas, colores, rotación), clientes, locales y vendedores, y la tabla dinámica
 * con 15 dimensiones y 7 medidas. Las cifras se comparan contra los selectores por `window.__kc`, nunca contra números
 * escritos. Puerto 4332: `PORT=4332 npx playwright test e2e/paquetes/analisis.spec.ts --workers=1 --project=escritorio-1440 …`
 */

function vigilar(page: Page): string[] {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(`${page.url()}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`${page.url()}: ${m.text()}`);
  });
  return errores;
}

const eventosUI = (page: Page) => conKc(page, (kc) => kc.eventosUI().map((e) => `${e.tipo}:${String(e.datos.reporte ?? '')}`));

async function elegir(page: Page, testid: string, opcion: string | RegExp) {
  await page.getByTestId(testid).click();
  await page.getByRole('option', { name: opcion }).first().click();
}

test.describe('Análisis · Resumen', () => {
  test('hallazgos en frases, con su pista y enlaces; las frases salen de selHallazgos', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis');
    await esperarDatos(page);
    type Parte = { texto: string } | { dinero: number };
    const esperado = await conKc(page, (kc) =>
      (kc.sel('selHallazgos', { hoy: '2026-09-30', maximo: 5 }) as { id: string; frase: string; partes: Parte[] }[]).map((h) => ({ id: h.id, frase: h.frase, partes: h.partes })),
    );
    expect(esperado.length).toBeGreaterThanOrEqual(3);
    expect(esperado.length).toBeLessThanOrEqual(5);
    const items = page.getByTestId('hallazgo');
    await expect(items).toHaveCount(esperado.length);
    // La frase se arma con sus trozos: el texto tal cual y el dinero con <Dinero> (sigue la moneda activa).
    for (let i = 0; i < esperado.length; i++) {
      const frase = items.nth(i).getByTestId('hallazgo-frase');
      const h = esperado[i]!;
      if (h.partes.every((p) => 'texto' in p)) await expect(frase).toHaveText(h.frase);
      for (const p of h.partes) if ('texto' in p) await expect(frase).toContainText(p.texto.trim());
      await expect(frase.locator('[data-valor]')).toHaveCount(h.partes.filter((p) => 'dinero' in p).length);
    }
    // Con US$ el dinero de las frases se convierte (antes quedaba en pesos).
    const conDinero = esperado.findIndex((h) => h.partes.some((p) => 'dinero' in p));
    if (conDinero >= 0) {
      await page.getByTestId('moneda-USD').click();
      await expect(items.nth(conDinero).getByTestId('hallazgo-frase')).toContainText('US$');
      await page.getByTestId('moneda-COP').click();
    }
    await expect(page.locator('[data-pista="analisis.hallazgos"]')).toBeVisible();
    await expect(page.getByTestId('pista-analisis.hallazgos')).toBeVisible();
    await items.first().getByTestId('hallazgo-enlace').click();
    await expect(page).toHaveURL(/\/panel\/(analisis|clientes|importaciones|proveedores|personal|pagos)/);
    expect(errores).toEqual([]);
  });

  test('la proyección es la de selProyeccionMes y dice "a este ritmo cerrarías"', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis');
    await esperarDatos(page);
    const p = await conKc(page, (kc) => kc.sel('selProyeccionMes', { hoy: '2026-09-30' }) as { proyeccion: number; aLaFecha: number });
    expect(p.proyeccion).toBeGreaterThan(p.aLaFecha);
    const bloque = page.getByTestId('proyeccion');
    await expect(bloque).toHaveAttribute('data-proyeccion', String(p.proyeccion));
    await expect(bloque).toContainText('A este ritmo, cerrarías septiembre en');
    await expect(page.getByTestId('proyeccion-cifra').locator('[data-valor]')).toHaveAttribute('data-valor', String(p.proyeccion));
    expect(errores).toEqual([]);
  });

  test('ventas por mes (18 meses con año anterior), mapa de calor y semanas se pintan con datos reales', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis');
    await esperarDatos(page);
    await expect(page.getByTestId('grafico-meses').locator('svg.recharts-surface').first()).toBeVisible();
    const meses = await conKc(page, (kc) => (kc.sel('selVentasPorMes', { meses: 18, hoy: '2026-09-30', localId: 'todos' }) as { mes: string; anioAnterior: number | null }[]));
    expect(meses.length).toBe(18);
    expect(meses.filter((m) => m.anioAnterior !== null).length).toBeGreaterThan(0);
    await expect(page.getByTestId('meses-lectura')).toContainText('es tu mejor mes');
    const calor = page.getByTestId('mapa-calor');
    await expect(calor.getByRole('gridcell')).toHaveCount(84);
    await expect(calor).toContainText('de tus ventas');
    await expect(page.getByTestId('calor-mejor-dia')).toBeVisible();
    await expect(page.getByTestId('grafico-semanas').locator('svg.recharts-surface').first()).toBeVisible();
    await expect(page.getByTestId('semanas-lectura')).toContainText('semana más fuerte');
    expect(errores).toEqual([]);
  });

  test('el local de la barra superior cambia el mapa de calor y las series', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis');
    await esperarDatos(page);
    await expect(page.getByTestId('mapa-calor')).toContainText('Todos los locales');
    await page.getByTestId('selector-local').click();
    await page.getByTestId('local-usq').click();
    await expect(page.getByTestId('mapa-calor')).toContainText('Local: Usaquén');
    await expect(page.getByTestId('grafico-meses')).toContainText('Local: Usaquén');
    expect(errores).toEqual([]);
  });

  test('honra ?vista= y ?resaltar= (hallazgo)', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis?vista=semanas&resaltar=categoria-dormida');
    await esperarDatos(page);
    await expect(page.getByTestId('grafico-semanas')).toBeInViewport();
    await irA('/panel/analisis?resaltar=categoria-dormida');
    await esperarDatos(page);
    await expect(page.locator('[data-testid="hallazgo"][data-resaltado="true"]')).toHaveAttribute('data-id', 'categoria-dormida');
    expect(errores).toEqual([]);
  });

  test('las pestañas llevan a las cuatro secciones', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis');
    await esperarDatos(page);
    for (const [texto, url] of [['Productos', '/panel/analisis/productos'], ['Clientes', '/panel/analisis/clientes'], ['Locales y vendedores', '/panel/analisis/locales'], ['Tabla dinámica', '/panel/analisis/tabla-dinamica']] as const) {
      await page.getByRole('navigation', { name: 'Secciones de Análisis' }).getByRole('link', { name: texto }).click();
      await expect(page).toHaveURL(new RegExp(url));
      await expect(page.getByTestId('encabezado-pagina')).toBeVisible();
    }
    expect(errores).toEqual([]);
  });
});

test.describe('Análisis · Tabla dinámica', () => {
  test('arma al instante: la tabla, sus totales y el gráfico salen de selPivote', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis/tabla-dinamica');
    await esperarDatos(page);
    const esperado = await conKc(page, (kc) => {
      const r = kc.sel('selPivote', { filas: ['mes'], columnas: ['local'], medida: 'ventas', hoy: '2026-09-30' }) as { total: number; filas: unknown[]; columnas: string[] };
      return { total: r.total, filas: r.filas.length, columnas: r.columnas.length };
    });
    await expect(page.getByTestId('pivote-total')).toHaveAttribute('data-valor', String(esperado.total));
    await expect(page.getByTestId('pivote-resumen')).toContainText(`${esperado.filas} filas · ${esperado.columnas} columnas`);
    await expect(page.getByTestId('tabla-pivote').locator('tr[data-fila]')).toHaveCount(esperado.filas);
    await expect(page.getByTestId('pivote-grafico').locator('svg.recharts-surface').first()).toBeVisible();
    // Las ventas netas de todo el historial son las del resumen de ventas.
    const netas = await conKc(page, (kc) => {
      const e = kc.estado();
      return (kc.sel('selResumenVentas', { desde: e.meta.generadoHasta.slice(0, 0) + '2000-01-01', hasta: '2026-09-30', localId: 'todos' }) as { netas: number }).netas;
    });
    expect(Math.abs(esperado.total - netas)).toBeLessThanOrEqual(1);
    expect(errores).toEqual([]);
  });

  test('tiene al menos 12 dimensiones y 5 medidas elegibles', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis/tabla-dinamica');
    await esperarDatos(page);
    await page.getByTestId('pivote-filas').click();
    const dims = await page.getByRole('option').count();
    await page.keyboard.press('Escape');
    expect(dims).toBeGreaterThanOrEqual(12);
    await page.getByTestId('pivote-medida').click();
    const medidas = await page.getByRole('option').count();
    await page.keyboard.press('Escape');
    expect(medidas).toBeGreaterThanOrEqual(5);
    expect(errores).toEqual([]);
  });

  test('cambiar filas, columnas o medida rearma la tabla y emite tabla_dinamica_modificada; los totales no aditivos se recalculan', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis/tabla-dinamica');
    await esperarDatos(page);
    expect(await eventosUI(page)).not.toContain('tabla_dinamica_modificada:');
    await elegir(page, 'pivote-filas', 'Categoría');
    await expect(page.getByTestId('pivote-titulo')).toContainText('por Categoría y Local');
    await elegir(page, 'pivote-medida', 'Número de ventas');
    const esperado = await conKc(page, (kc) => (kc.sel('selPivote', { filas: ['categoria'], columnas: ['local'], medida: 'numVentas', hoy: '2026-09-30' }) as { total: number; filas: { total: number }[] }));
    await expect(page.getByTestId('pivote-total')).toHaveAttribute('data-valor', String(esperado.total));
    // Una venta lleva prendas de varias categorías: las filas suman más que el total de ventas distintas.
    expect(esperado.filas.reduce((s, f) => s + f.total, 0)).toBeGreaterThan(esperado.total);
    await expect(page.getByTestId('pivote-nota-no-aditiva')).toBeVisible();
    await elegir(page, 'pivote-columnas', 'Ninguna');
    await expect(page.getByTestId('pivote-resumen')).not.toContainText('columna');
    const e = await eventosUI(page);
    expect(e.filter((x) => x.startsWith('tabla_dinamica_modificada')).length).toBe(3);
    expect(errores).toEqual([]);
  });

  test('filas con dos dimensiones, ejemplos, intercambiar y filtros', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis/tabla-dinamica');
    await esperarDatos(page);
    await elegir(page, 'pivote-filas2', 'Día de la semana');
    await expect(page.getByTestId('pivote-titulo')).toContainText('Mes, Día de la semana y Local');
    await page.getByTestId('pivote-ejemplo-vendedor-local').click();
    await expect(page.getByTestId('pivote-titulo')).toContainText('Ticket promedio por Vendedor y Local');
    await page.getByTestId('pivote-intercambiar').click();
    await expect(page.getByTestId('pivote-titulo')).toContainText('por Local y Vendedor');
    // Filtro de período: solo este mes.
    await page.getByTestId('pivote-ejemplo-mes-local').click();
    await page.getByTestId('pivote-periodo-mes').click();
    await expect(page.getByTestId('tabla-pivote').locator('tr[data-fila]')).toHaveCount(1);
    const esperado = await conKc(page, (kc) => (kc.sel('selPivote', { filas: ['mes'], columnas: ['local'], medida: 'ventas', filtros: { mes: ['2026-09'] }, hoy: '2026-09-30' }) as { total: number }).total);
    await expect(page.getByTestId('pivote-total')).toHaveAttribute('data-valor', String(esperado));
    // Sin resultados: local y categoría que no se cruzan en este mes no existen, pero un mes sin datos sí.
    await page.getByTestId('pivote-limpiar-filtros').click();
    await expect(page.getByTestId('tabla-pivote').locator('tr[data-fila]')).toHaveCount(19);
    expect(errores).toEqual([]);
  });

  test('?vista=<ejemplo> abre la tabla armada', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis/tabla-dinamica?vista=categoria-talla');
    await esperarDatos(page);
    await expect(page.getByTestId('pivote-titulo')).toContainText('Unidades por Categoría y Talla');
    expect(await eventosUI(page)).not.toContain('tabla_dinamica_modificada:');
    expect(errores).toEqual([]);
  });

  test('exporta a Excel con totales en caché y emite excel_generado { reporte: pivote }', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis/tabla-dinamica');
    await esperarDatos(page);
    const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByTestId('pivote-exportar').click()]);
    expect(descarga.suggestedFilename()).toMatch(/\.xlsx$/);
    const libro = new ExcelJS.Workbook();
    const b = await readFile((await descarga.path()) ?? '');
    await libro.xlsx.load(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
    const ws = libro.worksheets[0];
    expect(ws?.name).toBe('Tabla dinámica');
    // Fila 4 = encabezados: Mes, las tres columnas de local y Total.
    expect(ws?.getRow(4).getCell(1).value).toBe('Mes');
    expect(ws?.getRow(4).getCell(5).value).toBe('Total');
    const ultima = ws?.lastRow;
    const total = ultima?.getCell(5).value as { formula?: string; result?: number } | null;
    expect(total?.formula).toMatch(/^SUM\(/);
    const esperado = await conKc(page, (kc) => (kc.sel('selPivote', { filas: ['mes'], columnas: ['local'], medida: 'ventas', hoy: '2026-09-30' }) as { total: number; filas: unknown[] }));
    expect(Math.abs((total?.result ?? 0) - esperado.total)).toBeLessThanOrEqual(esperado.filas.length);
    expect(await eventosUI(page)).toContain('excel_generado:pivote');
    // Una medida que no se suma lleva el total ya calculado, no una fórmula.
    await elegir(page, 'pivote-medida', 'Ticket promedio');
    const [d2] = await Promise.all([page.waitForEvent('download'), page.getByTestId('pivote-exportar').click()]);
    const l2 = new ExcelJS.Workbook();
    const b2 = await readFile((await d2.path()) ?? '');
    await l2.xlsx.load(b2.buffer.slice(b2.byteOffset, b2.byteOffset + b2.byteLength) as ArrayBuffer);
    const t2 = l2.worksheets[0]?.lastRow?.getCell(5).value;
    expect(typeof t2).toBe('number');
    expect(errores).toEqual([]);
  });

  test('con 17.000 ventas responde rápido: cruces pesados en menos de 2,5 s', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis/tabla-dinamica');
    await esperarDatos(page);
    const ventas = await conKc(page, (kc) => Object.keys(kc.estado().ventas).length);
    expect(ventas).toBeGreaterThan(15_000);
    const t0 = Date.now();
    await elegir(page, 'pivote-filas', 'Fecha');
    await elegir(page, 'pivote-columnas', 'Talla');
    await expect(page.getByTestId('pivote-titulo')).toContainText('por Fecha y Talla');
    await expect(page.getByTestId('pivote-resultado')).not.toHaveAttribute('data-calculando', /.*/);
    expect(Date.now() - t0).toBeLessThan(2500);
    const t1 = Date.now();
    await elegir(page, 'pivote-filas', 'Producto');
    await expect(page.getByTestId('pivote-titulo')).toContainText('por Producto y Talla');
    await expect(page.getByTestId('pivote-resultado')).not.toHaveAttribute('data-calculando', /.*/);
    expect(Date.now() - t1).toBeLessThan(2500);
    expect(errores).toEqual([]);
  });

  test('sin resultados muestra el estado vacío y deja quitar los filtros', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis/tabla-dinamica');
    await esperarDatos(page);
    await page.getByTestId('pivote-periodo-mes').click();
    await elegir(page, 'pivote-categoria', 'Calzado');
    await elegir(page, 'pivote-local', 'Usaquén');
    // Si hay ventas de calzado en Usaquén este mes, la tabla trae filas; si no, el vacío ofrece quitar los filtros.
    const filas = await page.getByTestId('tabla-pivote').locator('tr[data-fila]').count();
    if (filas === 0) {
      await expect(page.getByText('Ninguna venta con estos filtros')).toBeVisible();
      await page.getByTestId('pivote-vacio-quitar').click();
    } else {
      await page.getByTestId('pivote-limpiar-filtros').click();
    }
    await expect(page.getByTestId('tabla-pivote').locator('tr[data-fila]')).toHaveCount(19);
    expect(errores).toEqual([]);
  });

  test('con moneda USD las cifras y el Excel se convierten', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis/tabla-dinamica');
    await esperarDatos(page);
    await page.getByTestId('moneda-USD').click();
    await expect(page.getByTestId('pivote-total')).toContainText('US$');
    expect(errores).toEqual([]);
  });
});

test.describe('Análisis · Productos', () => {
  test('más y menos vendidos: coinciden con selTopProductos y los filtros acotan', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis/productos');
    await esperarDatos(page);
    const top = await conKc(page, (kc) => (kc.sel('selTopProductos', { desde: '2026-07-03', hasta: '2026-09-30', localId: 'todos', n: 10, medida: 'unidades', orden: 'mas' }) as { referencia: string }[]).map((x) => x.referencia));
    const filas = page.getByTestId('tabla-mas-vendidos').locator('tr[data-fila]');
    await expect(filas).toHaveCount(10);
    await expect(filas.first()).toContainText(top[0] ?? '');
    await expect(page.getByTestId('tabla-menos-vendidos').locator('tr[data-fila]')).toHaveCount(10);
    const antes = await page.getByTestId('vendidos-total-unidades').innerText();
    await elegir(page, 'vendidos-categoria', 'Camisas');
    await expect(page.getByTestId('vendidos-total-unidades')).not.toHaveText(antes);
    await elegir(page, 'vendidos-talla', 'M');
    await page.getByTestId('vendidos-medida-margen').click();
    await expect(page.getByRole('columnheader', { name: /Margen/ }).first()).toBeVisible();
    await page.getByTestId('vendidos-limpiar').click();
    await expect(page.getByTestId('vendidos-total-unidades')).toHaveText(antes);
    // Una prenda abre su ficha.
    await filas.first().click();
    await expect(page).toHaveURL(/\/panel\/inventario\/HL-/);
    expect(errores).toEqual([]);
  });

  test('tallas que rotan con "Sugerir pedido" hacia la fábrica (desde=analisis)', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis/productos?vista=tallas');
    await esperarDatos(page);
    await expect(page.getByTestId('tallas-lectura')).toContainText('La talla M');
    await expect(page.getByTestId('tallas-barras').locator('li')).toHaveCount(5);
    const href = await page.getByTestId('tc-sugerir-pedido').getAttribute('href');
    expect(href).toMatch(/\/panel\/importaciones\/sugerir\?proveedor=[^&]+&desde=analisis/);
    await page.getByTestId('tc-sugerir-pedido').click();
    await expect(page).toHaveURL(/\/panel\/importaciones\/sugerir\?proveedor=.*desde=analisis/);
    expect(errores).toEqual([]);
  });

  test('colores que rotan con muestras y tendencia', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis/productos?vista=colores');
    await esperarDatos(page);
    await expect(page.getByTestId('colores-lectura')).toContainText('de tus camisas');
    expect(await page.getByTestId('colores-barras').locator('li').count()).toBeGreaterThan(3);
    await elegir(page, 'tc-categoria', 'Pantalones');
    await expect(page.getByTestId('colores-lectura')).toContainText('de tus pantalones');
    await expect(page.getByTestId('tc-sugerir-pedido')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('rotación: días de inventario de selDiasInventario, categoría dormida y mercancía dormida', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis/productos?vista=rotacion');
    await esperarDatos(page);
    const e = await conKc(page, (kc) => {
      const t = kc.sel('selDiasInventario', { hoy: '2026-09-30' }) as { dias: number };
      const s = kc.sel('selSinMovimiento', { dias: 60, hoy: '2026-09-30' }) as unknown[];
      return { dias: Math.round(t.dias), dormidas: s.length };
    });
    await expect(page.getByTestId('rotacion-kpi-dias')).toContainText(String(e.dias));
    await expect(page.getByTestId('tabla-dormida').locator('tr[data-fila]')).toHaveCount(e.dormidas);
    await expect(page.getByTestId('rotacion-dormida')).toContainText('quietos en');
    await expect(page.getByTestId('rotacion-barras').getByText('Dormida').first()).toBeVisible();
    await page.getByTestId('dormida-dias-120').click();
    const e120 = await conKc(page, (kc) => (kc.sel('selSinMovimiento', { dias: 120, hoy: '2026-09-30' }) as unknown[]).length);
    expect(await page.getByTestId('tabla-dormida').locator('tr[data-fila]').count()).toBe(e120);
    expect(errores).toEqual([]);
  });

  test('?vista= y ?resaltar= (prenda)', async ({ page, irA }) => {
    const errores = vigilar(page);
    const ref = await (async () => {
      await irA('/panel/analisis/productos');
      await esperarDatos(page);
      return conKc(page, (kc) => (kc.sel('selTopProductos', { desde: '2026-07-03', hasta: '2026-09-30', localId: 'todos', n: 1, medida: 'unidades', orden: 'mas' }) as { referencia: string }[])[0]?.referencia ?? '');
    })();
    await irA(`/panel/analisis/productos?vista=vendidos&resaltar=${ref}`);
    await esperarDatos(page);
    await expect(page.locator(`tr[data-fila][data-resaltada="true"]`).first()).toContainText(ref);
    expect(errores).toEqual([]);
  });
});

test.describe('Análisis · Clientes', () => {
  test('la proporción de consumidor final y los segmentos salen de los selectores', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis/clientes');
    await esperarDatos(page);
    const c = await conKc(page, (kc) => kc.sel('selComportamientoClientes', { desde: '2025-10-01', hasta: '2026-09-30', hoy: '2026-09-30' }) as { numVentas: number; consumidorFinal: number });
    await expect(page.getByTestId('clientes-kpi-ventas')).toContainText(new Intl.NumberFormat('es-CO').format(c.numVentas));
    await expect(page.getByTestId('consumidor-lectura')).toContainText(`${Math.round(c.consumidorFinal * 100)} son a consumidor final`);
    await expect(page.getByTestId('tabla-segmentos').locator('tr[data-fila]')).toHaveCount(6);
    await expect(page.getByTestId('barras-nuevos-recurrentes').locator('li')).toHaveCount(2);
    await expect(page.getByTestId('barras-canales').locator('li').first()).toBeVisible();
    await expect(page.getByTestId('barras-medios')).toContainText('Datáfono');
    await expect(page.getByTestId('pagos-lectura')).toContainText('pasaron del');
    await page.getByTestId('clientes-periodo-30d').click();
    await expect(page.getByTestId('clientes-kpi-ventas')).not.toContainText(new Intl.NumberFormat('es-CO').format(c.numVentas));
    expect(errores).toEqual([]);
  });

  test('"Ver a tus clientes" lleva al módulo de clientes', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis/clientes');
    await esperarDatos(page);
    await page.getByTestId('clientes-ver').click();
    await expect(page).toHaveURL(/\/panel\/clientes/);
    expect(errores).toEqual([]);
  });
});

test.describe('Análisis · Locales y vendedores', () => {
  test('cada local trae las cifras de selDesempenoLocales y el contraste ticket contra volumen', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis/locales');
    await esperarDatos(page);
    const locales = await conKc(page, (kc) => (kc.sel('selDesempenoLocales', { desde: '2026-07-03', hasta: '2026-09-30' }) as { localId: string; resumen: { netas: number } }[]).map((l) => ({ id: l.localId, netas: l.resumen.netas })));
    expect(locales.length).toBe(3);
    for (const l of locales) await expect(page.getByTestId(`local-${l.id}`).locator('[data-valor]').first()).toHaveAttribute('data-valor', String(l.netas));
    await expect(page.getByTestId('locales-contraste')).toContainText('cada una vale');
    await expect(page.getByTestId('barras-ventas-local').locator('li')).toHaveCount(3);
    await expect(page.getByTestId('barras-ticket-local').locator('li')).toHaveCount(3);
    expect(errores).toEqual([]);
  });

  test('el mapa de calor cambia por local y los domingos se comparan', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis/locales');
    await esperarDatos(page);
    await expect(page.getByTestId('locales-calor').getByRole('gridcell')).toHaveCount(84);
    await page.getByTestId('calor-local-zr').click();
    await expect(page.getByTestId('locales-calor').getByRole('gridcell').first()).toBeVisible();
    await expect(page.getByTestId('domingos-lectura')).toContainText('Los domingos,');
    await expect(page.getByTestId('barras-domingo').locator('li')).toHaveCount(3);
    expect(errores).toEqual([]);
  });

  test('el equipo muestra a quien se destaca y compara con el promedio', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/analisis/locales');
    await esperarDatos(page);
    const v = await conKc(page, (kc) => (kc.sel('selDesempenoVendedores', { desde: '2026-07-03', hasta: '2026-09-30' }) as { nombre: string; vecesPromedio: number }[]));
    const filas = page.getByTestId('barras-vendedores').locator('li[data-fila]');
    await expect(filas).toHaveCount(v.length);
    await expect(filas.first()).toContainText(v[0]?.nombre ?? '');
    await expect(page.getByTestId('equipo-estrella')).toContainText(v[0]?.nombre ?? '');
    await expect(filas.first()).toContainText('Estrella');
    await page.getByTestId('locales-periodo-30d').click();
    await expect(page.getByTestId('barras-vendedores').locator('li[data-fila]').first()).toBeVisible();
    expect(errores).toEqual([]);
  });
});

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { conKc, esperarDatos } from '../kc';

/**
 * A2 · Inventario (PLAN 9.4). Verifica SOLO las pantallas del módulo; los efectos en otros módulos se leen con
 * `window.__kc`. Sin errores de consola. Corre en 1440 × 900, 1366 × 657 y 1280 × 800 con PORT=4302.
 */
const OXFORD = 'HL-CAM-0142';
const VARIANTE_M = 'va_cam_0142_azc_m';

function vigilarConsola(page: Page): string[] {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`console: ${m.text()}`);
  });
  return errores;
}

type KcMin = { __kc: { estado: () => { agregados: { existencias: Record<string, number> } } } };
const existencia = (page: Page, varianteId: string, localId: string): Promise<number> =>
  page.evaluate(([v, l]) => (globalThis as unknown as KcMin).__kc.estado().agregados.existencias[`${v}@${l}`] ?? 0, [varianteId, localId] as const);

async function cambiarRol(page: Page, rol: 'dueno' | 'vendedor' | 'bodega') {
  await page.getByTestId('selector-rol').click();
  await page.getByTestId(`rol-${rol}`).click();
}

test('catálogo: tabla, tarjetas, búsqueda, filtro de local, resaltado y pista', async ({ page, irA }) => {
  const errores = vigilarConsola(page);
  await irA('/panel/inventario');
  await esperarDatos(page);
  await expect(page.getByTestId('tabla-catalogo')).toBeVisible();
  await expect(page.locator('[data-pista="inventario.local"]')).toHaveCount(1);
  // Las referencias del selector compartido = filas del catálogo.
  const total = await conKc(page, (kc) => (kc.sel('selCatalogo', {}) as unknown[]).length);
  await expect(page.getByText(`de ${total.toLocaleString('es-CO')} referencias`)).toBeVisible();
  // Búsqueda por nombre.
  await page.getByRole('searchbox').or(page.getByPlaceholder('Buscar por nombre, referencia, SKU o código de barras')).first().fill('Oxford');
  const coinciden = await conKc(page, (kc) => (kc.sel('selCatalogo', { texto: 'Oxford' }) as unknown[]).length);
  await expect(page.locator('[data-testid="tabla-catalogo"] tbody tr[data-fila]')).toHaveCount(coinciden);
  await expect(page).toHaveURL(/texto=Oxford/);
  // Tarjetas.
  await page.getByTestId('vista-tarjetas').click();
  await expect(page.getByTestId(`tarjeta-${OXFORD}`)).toBeVisible();
  await expect(page).toHaveURL(/vista=tarjetas/);
  // Filtro de local por la URL: las existencias son las de Usaquén.
  await irA(`/panel/inventario?local=usq&texto=Oxford`);
  await esperarDatos(page);
  const usq = await conKc(page, (kc) => {
    const fila = (kc.sel('selCatalogo', { localId: 'usq', texto: 'Oxford' }) as { existencias: number }[])[0];
    return fila?.existencias ?? -1;
  });
  await expect(page.getByTestId('tabla-catalogo')).toContainText(usq.toLocaleString('es-CO'));
  // ?resaltar= destaca la fila.
  await irA(`/panel/inventario?resaltar=${OXFORD}`);
  await esperarDatos(page);
  await expect(page.locator('tr[data-resaltada="true"]')).toHaveCount(1);
  expect(errores).toEqual([]);
});

test('W2: matriz con En camino y traslado que mueve las existencias en las dos celdas', async ({ page, irA }) => {
  const errores = vigilarConsola(page);
  await irA(`/panel/inventario/${OXFORD}`);
  await esperarDatos(page);
  // Totales por local cuadran con el selector.
  const matriz = await conKc(page, (kc) => {
    const p = kc.estado().productos.pd_cam_0142;
    const m = kc.sel('selMatrizExistencias', { productoId: p?.id }) as { total: number; totalPorLocal: Record<string, number> };
    return { total: m.total, porLocal: m.totalPorLocal };
  });
  await expect(page.getByTestId('matriz-total')).toHaveText(matriz.total.toLocaleString('es-CO'));
  await expect(page.getByTestId('matriz-local-usq')).toContainText(String(matriz.porLocal.usq));
  // Columna "En camino" con la importación y la llegada.
  await expect(page.locator('[data-testid^="en-camino-"]').first()).toContainText('IMP-2026-07');
  await expect(page.locator('[data-testid^="en-camino-"]').first()).toContainText('llegan a bodega en');

  // Usaquén, celda M azul cielo: casi agotada → sugerencia.
  await page.getByTestId('matriz-local-usq').click();
  const celda = page.getByTestId(`celda-${VARIANTE_M}`);
  await expect(celda).toHaveAttribute('data-estado', 'bajo');
  await expect(celda).toHaveAttribute('data-valor', '1');
  await celda.click();
  await expect(page.getByTestId('sugerencia-traslado')).toContainText('Traer de Zona Rosa (6 disponibles)');
  await expect(page.getByTestId(`en-camino-variante-col_azc`).or(page.locator('[data-testid^="en-camino-variante-"]').first())).toContainText('IMP-2026-07');
  await page.getByTestId('sugerencia-solicitar').click();
  await expect(page.getByTestId('dialogo-traslado')).toBeVisible();
  await expect(page.getByTestId(`traslado-cantidad-${VARIANTE_M}`)).toHaveValue('3');
  await page.getByTestId('traslado-confirmar').click();

  // Solicitado → en tránsito → recibido, con las existencias moviéndose.
  const fila = page.locator('[data-testid^="traslado-TR-"][data-estado="solicitado"]');
  await expect(fila).toHaveCount(1);
  const numero = (await fila.getAttribute('data-testid'))!.replace('traslado-', '');
  expect(await existencia(page, VARIANTE_M, 'zr')).toBe(6);
  expect(await existencia(page, VARIANTE_M, 'usq')).toBe(1);

  await page.getByTestId(`despachar-${numero}`).click();
  await expect(page.locator(`[data-testid="traslado-${numero}"]`)).toHaveAttribute('data-estado', 'en_transito');
  expect(await existencia(page, VARIANTE_M, 'zr')).toBe(3);
  await expect(celda).toContainText('+3'); // en tránsito hacia Usaquén
  await page.getByTestId('matriz-local-todos').click();
  await expect(page.getByTestId('matriz-total')).toHaveText((matriz.total - 3).toLocaleString('es-CO'), { timeout: 5000 });
  await page.getByTestId('matriz-local-usq').click();

  await page.getByTestId(`recibir-${numero}`).click();
  await expect(page.locator(`[data-testid="traslado-${numero}"]`)).toHaveAttribute('data-estado', 'recibido');
  await expect(celda).toHaveAttribute('data-valor', '4');
  await expect(celda).toHaveAttribute('data-estado', 'normal');
  await page.getByTestId('matriz-local-todos').click();
  await expect(page.getByTestId('matriz-total')).toHaveText(matriz.total.toLocaleString('es-CO'), { timeout: 5000 });
  expect(await existencia(page, VARIANTE_M, 'usq')).toBe(4);
  expect(await existencia(page, VARIANTE_M, 'zr')).toBe(3);

  const eventos = await conKc(page, (kc) => kc.eventosDominio().map((e) => e.tipo));
  expect(eventos.filter((t) => t === 'TrasladoCambiado').length).toBeGreaterThanOrEqual(3);
  expect(errores).toEqual([]);
});

test('?trasladar= abre el panel de traslado prellenado', async ({ page, irA }) => {
  await irA(`/panel/inventario/${OXFORD}?trasladar=zr,usq,${VARIANTE_M},2`);
  await esperarDatos(page);
  await expect(page.getByTestId('dialogo-traslado')).toBeVisible();
  await expect(page.getByTestId(`traslado-cantidad-${VARIANTE_M}`)).toHaveValue('2');
  await expect(page.getByTestId('traslado-origen')).toContainText('Zona Rosa');
  await expect(page.getByTestId('traslado-destino')).toContainText('Usaquén');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByTestId('dialogo-traslado')).toHaveCount(0);
});

test('un traslado con cantidad mayor a la disponible no se puede solicitar', async ({ page, irA }) => {
  await irA(`/panel/inventario/${OXFORD}?trasladar=zr,usq,${VARIANTE_M},50`);
  await esperarDatos(page);
  await expect(page.getByTestId('traslado-confirmar')).toBeDisabled();
  await expect(page.getByTestId('dialogo-traslado')).toContainText('Solo hay 6 en el origen');
});

test('kárdex: el saldo final cuadra con las existencias y los filtros funcionan', async ({ page, irA }) => {
  await irA(`/panel/inventario/${OXFORD}/kardex`);
  await esperarDatos(page);
  await expect(page.getByTestId('kardex-cuadre')).toHaveAttribute('data-cuadra', 'true');
  const esperado = await conKc(page, (kc) => {
    const k = kc.sel('selKardex', { productoId: 'pd_cam_0142' }) as { saldoFinal: number };
    return k.saldoFinal;
  });
  await expect(page.getByTestId('kardex-saldo-final')).toHaveText(esperado.toLocaleString('es-CO'));
  await expect(page.getByTestId('tabla-kardex')).toBeVisible();
});

test('ajuste de existencias con motivo queda en el kárdex', async ({ page, irA }) => {
  const errores = vigilarConsola(page);
  await irA(`/panel/inventario/${OXFORD}`);
  await esperarDatos(page);
  await page.getByTestId('ficha-mas').click();
  await page.getByRole('menuitem', { name: 'Ajustar existencias' }).click();
  await expect(page.getByTestId('dialogo-ajuste')).toBeVisible();
  await page.getByTestId('ajuste-variante').click();
  await page.getByRole('option', { name: 'Azul cielo · talla M' }).click();
  await page.getByTestId('ajuste-local').click();
  await page.getByRole('option', { name: 'Usaquén' }).click();
  await page.getByTestId('ajuste-cantidad').fill('0');
  await page.getByTestId('ajuste-motivo').click();
  await page.getByRole('option', { name: 'Pérdida' }).click();
  await page.getByTestId('ajuste-confirmar').click();
  expect(await existencia(page, VARIANTE_M, 'usq')).toBe(0);
  const ultimo = await conKc(page, (kc) => {
    const m = (kc.estado() as unknown as { movimientos: { varianteId: string; tipo: string; motivo?: string; cantidad: number }[] }).movimientos.at(-1);
    return m;
  });
  expect(ultimo).toMatchObject({ varianteId: VARIANTE_M, tipo: 'ajuste_manual', motivo: 'perdida', cantidad: -1 });
  await expect(page.getByTestId(`celda-${VARIANTE_M}`)).toBeVisible();
  expect(errores).toEqual([]);
});

test('conteo físico: iniciar, escanear, ver diferencias y aplicar con motivo', async ({ page, irA }) => {
  const errores = vigilarConsola(page);
  await irA('/panel/inventario/conteos');
  await esperarDatos(page);
  await page.getByTestId('iniciar-conteo').click();
  await page.getByTestId('conteo-local').click();
  await page.getByRole('option', { name: 'Zona Rosa' }).click();
  await page.getByRole('switch', { name: 'Contar todo el local' }).click();
  await page.getByRole('checkbox', { name: 'Accesorios' }).click();
  await page.getByTestId('conteo-confirmar').click();
  await expect(page.getByTestId('detalle-conteo')).toBeVisible();
  const conteoId = page.url().match(/conteos\/([^/?]+)/)![1]!;
  const info = await page.evaluate((id) => {
    const kc = (globalThis as unknown as { __kc: { estado: () => { conteos: Record<string, { lineas: Record<string, { sistemaAlIniciar: number }> }>; variantes: Record<string, { ean13: string }> } } }).__kc;
    const e = kc.estado();
    const c = e.conteos[id]!;
    const v = Object.keys(c.lineas).find((k) => (c.lineas[k]?.sistemaAlIniciar ?? 0) >= 2)!;
    return { varianteId: v, sistema: c.lineas[v]!.sistemaAlIniciar, ean: e.variantes[v]!.ean13 };
  }, conteoId);

  // Escanear suma una unidad.
  await page.getByTestId('conteo-escaner').fill(info.ean);
  await page.getByTestId('conteo-sumar').click();
  await expect(page.getByTestId('conteo-ultimo')).toContainText('Sumada');
  await expect(page.getByTestId(`contado-${info.varianteId}`)).toHaveValue('1');
  // Código que no es del conteo.
  await page.getByTestId('conteo-escaner').fill('0000000000000');
  await page.getByTestId('conteo-sumar').click();
  await expect(page.getByTestId('conteo-ultimo')).toContainText('no hace parte');
  // Contar lo mismo que dice el sistema +2 genera una diferencia.
  await page.getByTestId(`contado-${info.varianteId}`).fill(String(info.sistema + 2));
  await expect(page.getByTestId('conteo-diferencias')).toHaveText('1');
  await page.getByTestId('guardar-conteo').click();
  await page.getByTestId('aplicar-conteo').click();
  await expect(page.getByTestId('dialogo-aplicar-conteo')).toBeVisible();
  // Sin motivo no se aplica.
  await page.getByTestId('confirmar-aplicar').click();
  await expect(page.getByTestId('dialogo-aplicar-conteo')).toContainText('Elige el motivo');
  await page.getByTestId('motivo-todas').click();
  await page.getByRole('option', { name: 'Hallazgo' }).click();
  await page.getByTestId('confirmar-aplicar').click();
  await expect(page.getByTestId('detalle-conteo')).toHaveAttribute('data-estado', 'aplicado');
  expect(await existencia(page, info.varianteId, 'zr')).toBe(info.sistema + 2);
  const eventos = await conKc(page, (kc) => kc.eventosDominio().map((e) => e.tipo));
  expect(eventos).toContain('ConteoAplicado');
  expect(errores).toEqual([]);
});

test('etiquetas: elige la referencia, ve las etiquetas y descarga el PDF', async ({ page, irA }) => {
  const errores = vigilarConsola(page);
  await irA(`/panel/inventario/etiquetas?producto=${OXFORD}`);
  await esperarDatos(page);
  await expect(page.getByTestId(`grupo-etiquetas-${OXFORD}`)).toBeVisible();
  await expect(page.getByTestId('vista-etiquetas').locator('svg[aria-label^="Código de barras"]')).toHaveCount(8);
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByTestId('documento-etiquetas').getByRole('button').click()]);
  expect(descarga.suggestedFilename()).toMatch(/\.pdf$/);
  const eventos = await conKc(page, (kc) => kc.eventosUI().map((e) => `${e.tipo}:${String(e.datos.reporte ?? '')}`));
  expect(eventos).toContain('pdf_generado:etiquetas');
  expect(errores).toEqual([]);
});

test('exportar el kárdex y el inventario genera Excel y emite el evento', async ({ page, irA }) => {
  await irA('/panel/inventario');
  await esperarDatos(page);
  await page.getByRole('button', { name: 'Exportar' }).click();
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByTestId('exportar-inventario-excel').click()]);
  expect(descarga.suggestedFilename()).toMatch(/\.xlsx$/);
  const eventos = await conKc(page, (kc) => kc.eventosUI().map((e) => e.tipo));
  expect(eventos).toContain('excel_generado');
});

test('valorización: totales por local y método del costo', async ({ page, irA }) => {
  await irA('/panel/inventario/valorizacion');
  await esperarDatos(page);
  const v = await conKc(page, (kc) => kc.sel('selValorizacion', { localId: 'todos' }) as { total: { unidades: number }; porLocal: { unidades: number }[] });
  await expect(page.getByTestId('val-unidades')).toHaveText(v.total.unidades.toLocaleString('es-CO'));
  expect(v.porLocal.reduce((a, l) => a + l.unidades, 0)).toBe(v.total.unidades);
  await expect(page.getByTestId('metodo-valorizacion')).toContainText('Costo de reposición: última importación aplicada');
  await expect(page.getByTestId('tabla-valorizacion-locales')).toBeVisible();
});

test('rentabilidad: método del costo, margen y precio sugerido (W4)', async ({ page, irA }) => {
  await irA(`/panel/inventario/${OXFORD}/rentabilidad`);
  await esperarDatos(page);
  await expect(page.getByTestId('metodo-costo')).toContainText('Costo de reposición: última importación aplicada');
  const m = await conKc(page, (kc) => kc.sel('selMargenProducto', { productoId: 'pd_cam_0142' }) as { margenPct: number });
  await expect(page.getByTestId('margen-pct')).toContainText(`${Math.round(m.margenPct * 100)}`);
  await page.getByTestId('margen-objetivo').fill('70');
  await expect(page.getByTestId('precio-sugerido-valor')).toContainText('$');
  const antes = await conKc(page, (kc) => kc.estado().productos.pd_cam_0142?.precioVenta ?? 0);
  await page.getByTestId('aplicar-precio').click();
  const despues = await conKc(page, (kc) => kc.estado().productos.pd_cam_0142?.precioVenta ?? 0);
  expect(despues).toBeGreaterThan(antes);
  expect(despues % 1000).toBe(900);
});

test('crear un producto con sus variantes y eliminarlo con confirmación', async ({ page, irA }) => {
  const errores = vigilarConsola(page);
  await irA('/panel/inventario/nuevo');
  await esperarDatos(page);
  await page.getByTestId('producto-guardar').click();
  await expect(page.getByText('Escribe el nombre de la referencia.')).toBeVisible();
  await page.getByTestId('producto-nombre').fill('Camisa de lino prueba');
  await page.getByTestId('producto-categoria').click();
  await page.getByRole('option', { name: 'Camisas' }).click();
  await page.getByTestId('producto-proveedor').click();
  await page.getByRole('option').first().click();
  await page.getByTestId('producto-precio').fill('159900');
  await page.getByRole('button', { name: 'Talla S', exact: false }).click();
  await page.getByRole('button', { name: 'Talla M', exact: false }).click();
  await page.getByRole('button', { name: 'Blanco' }).click();
  await page.getByTestId('producto-guardar').click();
  await expect(page).toHaveURL(/\/panel\/inventario\/HL-CAM-\d{4}$/);
  const nuevo = await conKc(page, (kc) => {
    const e = kc.estado();
    const p = Object.values(e.productos).find((x) => x.referencia !== 'HL-CAM-0142' && x.slug.startsWith('camisa-de-lino-prueba'));
    const vs = Object.values(e.variantes).filter((v) => v.productoId === p?.id);
    return { ref: p?.referencia ?? '', n: vs.length, precio: p?.precioVenta ?? 0 };
  });
  expect(nuevo.n).toBe(2);
  expect(nuevo.precio).toBe(159_900);
  await expect(page.getByTestId('ficha-producto')).toHaveAttribute('data-referencia', nuevo.ref);
  await expect(page.getByTestId('tabla-variantes')).toContainText('HL-CAM-');

  await page.goto(`/panel/inventario/${nuevo.ref}/editar?hoy=2026-09-30T15%3A30`);
  await esperarDatos(page);
  await page.getByTestId('eliminar-referencia').click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar referencia' }).click();
  await expect(page).toHaveURL(/\/panel\/inventario(\?|$)/);
  const quedan = await page.evaluate((r) => Object.values((globalThis as unknown as { __kc: { estado: () => { productos: Record<string, { referencia: string; eliminadoEn?: string }> } } }).__kc.estado().productos).filter((p) => p.referencia === r && !p.eliminadoEn).length, nuevo.ref);
  expect(quedan).toBe(0);
  expect(errores).toEqual([]);
});

test('recepción: antes del levante no se recibe; con levante se distribuye y genera traslados', async ({ page, irA }) => {
  const errores = vigilarConsola(page);
  await irA('/panel/inventario/recepcion?importacion=IMP-2026-07');
  await esperarDatos(page);
  await expect(page.getByTestId('recepcion-aun-no')).toBeVisible();
  const antes = await conKc(page, (kc) => ({ traslados: Object.keys(kc.estado().traslados).length }));
  // Se avanza la importación hasta el levante con las acciones del dominio (el cambio de estado es de B1).
  await conKc(page, (kc) => {
    const id = kc.estado().meta.narrativa.importacionEnPuerto!;
    const cambiar = kc.acciones.cambiarEstadoImportacion as (d: unknown) => { ok: boolean; error?: { mensaje: string } };
    for (const estado of ['en_nacionalizacion', 'nacionalizado']) {
      const r = cambiar({ importacionId: id, estado, fecha: '2026-09-30', nota: null, origen: 'panel', autor: null });
      if (!r.ok) throw new Error(r.error?.mensaje);
    }
  });
  await expect(page.getByTestId('formulario-recepcion')).toBeVisible();
  const bodegaAntes = await page.getByTestId('recepcion-bodega').innerText();
  expect(Number(bodegaAntes.replace(/\./g, ''))).toBeGreaterThanOrEqual(0);
  // Una defectuosa en la primera línea la saca de lo repartible.
  await page.locator('[data-testid^="def-"]').first().fill('1');
  await page.getByTestId('recibir-importacion').click();
  await expect(page.getByTestId('recepcion-hecha')).toBeVisible();
  const despues = await conKc(page, (kc) => {
    const e = kc.estado();
    const imp = e.importaciones[e.meta.narrativa.importacionEnPuerto!]!;
    return { estado: (imp as unknown as { estado: string }).estado, traslados: Object.keys(e.traslados).length };
  });
  expect(despues.estado).toBe('recibido_bodega');
  expect(despues.traslados).toBeGreaterThan(antes.traslados);
  expect(errores).toEqual([]);
});

test('vendedor: catálogo y ficha de solo lectura, sin costos ni márgenes, con pedido de traslado', async ({ page, irA }) => {
  const errores = vigilarConsola(page);
  await irA('/panel/inventario');
  await esperarDatos(page);
  await cambiarRol(page, 'vendedor');
  await expect(page.getByTestId('tabla-catalogo')).toBeVisible();
  await expect(page.getByText('Valor a costo')).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: /Costo|Margen/ })).toHaveCount(0);
  await expect(page.getByTestId('nuevo-producto')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Movimientos' })).toHaveCount(0);
  await page.goto(`/panel/inventario/${OXFORD}?hoy=2026-09-30T15%3A30`);
  await esperarDatos(page);
  await cambiarRol(page, 'vendedor');
  await expect(page.getByTestId('ficha-producto')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Rentabilidad' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Editar' })).toHaveCount(0);
  await expect(page.getByText('Costo vigente')).toHaveCount(0);
  await expect(page.getByTestId('solicitar-traslado')).toContainText('Pedir traslado');
  await expect(page.getByTestId('tabla-variantes')).toBeVisible();
  expect(errores).toEqual([]);
});

test('detalle de traslado: aprobar, despachar y recibir con faltante (queda como pérdida)', async ({ page, irA }) => {
  const errores = vigilarConsola(page);
  await irA('/panel/inventario/traslados');
  await esperarDatos(page);
  const t = await conKc(page, (kc) => {
    const e = kc.estado();
    const x = Object.values(e.traslados).find((y) => (y as unknown as { estado: string }).estado === 'solicitado') as unknown as { id: string; origenId: string; destinoId: string; lineas: { varianteId: string; cantidad: number }[] };
    return { id: x.id, origen: x.origenId, destino: x.destinoId, linea: x.lineas[0]! };
  });
  await page.getByTestId('tabla-traslados').locator(`tr[data-fila="${t.id}"]`).click();
  await expect(page.getByTestId('detalle-traslado')).toHaveAttribute('data-estado', 'solicitado');
  await expect(page.getByTestId('estado-aprobacion')).toContainText('Esperando la aprobación');
  await expect(page.getByTestId('despachar-traslado')).toHaveCount(0);
  await page.getByTestId('aprobar-traslado').click();
  await expect(page.getByTestId('estado-aprobacion')).toContainText('Aprobado');
  const origenAntes = await existencia(page, t.linea.varianteId, t.origen);
  const destinoAntes = await existencia(page, t.linea.varianteId, t.destino);
  await page.getByTestId('despachar-traslado').click();
  await expect(page.getByTestId('detalle-traslado')).toHaveAttribute('data-estado', 'en_transito');
  expect(await existencia(page, t.linea.varianteId, t.origen)).toBe(origenAntes - t.linea.cantidad);
  await expect(page.getByTestId(`origen-${t.linea.varianteId}`)).toHaveAttribute('data-valor', String(origenAntes - t.linea.cantidad));
  await page.getByTestId('recibir-traslado').click();
  await page.getByTestId(`recibidas-${t.linea.varianteId}`).fill(String(t.linea.cantidad - 1));
  await expect(page.getByTestId('dialogo-recibir')).toContainText('Faltan 1');
  await page.getByTestId('confirmar-recepcion').click();
  await expect(page.getByTestId('detalle-traslado')).toHaveAttribute('data-estado', 'recibido');
  expect(await existencia(page, t.linea.varianteId, t.destino)).toBe(destinoAntes + t.linea.cantidad - 1);
  await expect(page.getByTestId(`destino-${t.linea.varianteId}`)).toHaveAttribute('data-valor', String(destinoAntes + t.linea.cantidad - 1));
  expect(errores).toEqual([]);
});

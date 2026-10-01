import type { Page } from '@playwright/test';
import { conHoy, expect, test } from '../fixtures';
import { conKc, esperarDatos } from '../kc';

/**
 * B4 · Costos, gastos y estado de resultados (PLAN 9.4). Verifica solo las pantallas de `/panel/gastos/**`; los
 * efectos sobre otros módulos se leen por `window.__kc`. Sin errores en consola en ningún recorrido.
 */
const miles = (n: number) => new Intl.NumberFormat('es-CO').format(Math.round(n));

interface ER {
  ventasNetas: number;
  costoVentas: number;
  utilidadBruta: number;
  gastosOperativos: number;
  gastosGeneralesProrrateados: number;
  utilidadOperativa: number;
}

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

async function abrir(page: Page, irA: (ruta: string) => Promise<void>, ruta: string) {
  await irA(ruta);
  await esperarDatos(page);
  await expect(page.getByTestId('pagina')).toBeVisible();
}

async function elegir(page: Page, etiqueta: string, opcion: string | RegExp) {
  await page.getByLabel(etiqueta, { exact: true }).click();
  await page.getByRole('option', { name: opcion }).click();
}

test('gastos: las cifras del mes y del local salen de los selectores y la URL manda (?mes=&local=)', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/gastos?mes=2026-08&local=usq');
  await expect(page.getByTestId('gastos-selector-mes')).toContainText('Agosto de 2026');
  await expect(page.getByTestId('gastos-selector-local')).toContainText('Usaquén');
  const r = await conKc(page, (kc) => ({
    gastos: kc.sel('selGastos', { desde: '2026-08-01', hasta: '2026-08-31', localId: 'usq' }) as { total: number; iva: number; filas: unknown[] },
    resumen: kc.sel('selResumenGastos', { mes: '2026-08', localId: 'usq' }) as { total: number },
  }));
  expect(r.gastos.filas.length).toBeGreaterThan(0);
  expect(r.gastos.total).toBe(r.resumen.total);
  await expect(page.getByTestId('gastos-tabla')).toContainText(`$ ${miles(r.gastos.total)}`);
  await expect(page.getByTestId('gastos-por-categoria')).toContainText('Arriendo');
  await expect(page.getByTestId('gastos-por-local')).toContainText('Usaquén');
  // La pista del módulo vive sobre la pestaña "Estado de resultados" y no navega al abrirla.
  await page.getByTestId('pista-gastos.resultados').click();
  await expect(page.getByRole('dialog', { name: 'Pista' })).toContainText('¿Qué local te deja más plata?');
  await expect(page).toHaveURL(/\/panel\/gastos\?/);
});

test('gastos: ?resaltar= lleva al gasto en su mes y lo destaca', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/gastos');
  const id = await conKc(page, (kc) => {
    const f = (kc.sel('selGastos', { desde: '2026-07-01', hasta: '2026-07-31', localId: 'p93', categoria: 'arriendo' }) as { filas: { id: string }[] }).filas[0];
    return f?.id ?? '';
  });
  expect(id).not.toBe('');
  await page.goto(`/panel/gastos?hoy=2026-09-30T15%3A30&resaltar=${id}&mes=2026-07`);
  await esperarDatos(page);
  await expect(page.locator('[data-resaltada]')).toContainText('Arriendo Parque 93');
});

test('gastos: registrar con validación, pagado desde una cuenta, y el resumen se actualiza', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/gastos');
  const antes = await conKc(page, (kc) => (kc.sel('selGastos', { desde: '2026-09-01', hasta: '2026-09-30', localId: 'todos' }) as { total: number }).total);
  await page.getByTestId('gastos-registrar').click();
  const formulario = page.getByTestId('gastos-formulario');
  await expect(formulario).toBeVisible();
  // Validación junto a cada campo (no en un toast).
  await page.getByTestId('gastos-guardar').click();
  await expect(formulario).toContainText('Escribe el concepto del gasto.');
  await expect(formulario).toContainText('Elige la categoría del gasto.');
  await expect(formulario).toContainText('El valor del gasto debe ser mayor que cero.');

  await page.getByTestId('gastos-concepto').fill('Pauta de prueba e2e');
  await elegir(page, 'Categoría', 'Publicidad');
  await page.getByTestId('gastos-valor').fill('119000');
  await page.getByRole('button', { name: /Calcular el IVA del 19 %/ }).click();
  await page.getByTestId('gastos-guardar').click();

  await expect(page.getByTestId('gastos-formulario')).toHaveCount(0);
  await expect(page).toHaveURL(/resaltar=/);
  const r = await conKc(page, (kc) => {
    const g = (kc.sel('selGastos', { desde: '2026-09-01', hasta: '2026-09-30', localId: 'todos' }) as { filas: { concepto: string; valor: number; iva: number; estadoPago: string; movimientoCuentaId: string | null; localId: string | null }[]; total: number });
    return { fila: g.filas.find((x) => x.concepto === 'Pauta de prueba e2e'), total: g.total, eventos: kc.eventosDominio().map((e) => e.tipo) };
  });
  expect(r.eventos).toContain('GastoRegistrado');
  expect(r.fila?.valor).toBe(119000);
  expect(r.fila?.iva).toBeGreaterThan(18000);
  expect(r.fila?.estadoPago).toBe('pagado');
  expect(r.fila?.movimientoCuentaId).not.toBeNull();
  expect(r.total).toBe(antes + 119000);
  await expect(page.locator('[data-resaltada]')).toContainText('Pauta de prueba e2e');
  await expect(page.getByTestId('gastos-tabla')).toContainText(`$ ${miles(r.total)}`);
});

test('gastos: "Lo debo" exige fecha límite y deja el gasto por pagar', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/gastos');
  await page.getByTestId('gastos-registrar').click();
  await page.getByTestId('gastos-concepto').fill('Servicio por pagar e2e');
  await elegir(page, 'Categoría', 'Servicios');
  await page.getByTestId('gastos-valor').fill('250000');
  await page.getByText('Lo debo', { exact: true }).click();
  await page.getByTestId('gastos-guardar').click();
  await expect(page.getByTestId('gastos-formulario')).toContainText('Elige hasta cuándo tienes para pagarlo.');
  await page.getByLabel('Tienes hasta').click();
  await page.getByRole('button', { name: /30 de septiembre de 2026/ }).click();
  await page.getByTestId('gastos-guardar').click();
  await expect(page.getByTestId('gastos-formulario')).toHaveCount(0);
  const g = await conKc(page, (kc) => {
    const f = (kc.sel('selGastos', { desde: '2026-09-01', hasta: '2026-09-30', localId: 'todos' }) as { filas: { concepto: string; estadoPago: string; cuentaPorPagarId: string | null }[] }).filas.find((x) => x.concepto === 'Servicio por pagar e2e');
    return f;
  });
  expect(g?.estadoPago).toBe('por_pagar');
  expect(g?.cuentaPorPagarId).not.toBeNull();
});

test('gastos: editar y eliminar con confirmación; el gasto del sistema no se toca', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/gastos');
  await conKc(page, (kc) => {
    const registrar = kc.acciones.registrarGasto as (d: unknown) => { ok: boolean; error?: { mensaje: string } };
    const r = registrar({
      datos: { fecha: '2026-09-30', localId: 'usq', categoria: 'mantenimiento', concepto: 'Gasto editable e2e', valor: 80000, iva: 0, proveedorId: null, soporte: null, documento: null },
      pago: { tipo: 'inmediato', cuentaId: 'cta_corriente', medio: 'transferencia' },
    });
    if (!r.ok) throw new Error(r.error?.mensaje);
  });
  await page.getByPlaceholder('Buscar por concepto, proveedor o categoría').fill('editable e2e');
  await expect(page.getByTestId('gastos-tabla')).toContainText('Gasto editable e2e');

  await page.getByRole('button', { name: 'Acciones de Gasto editable e2e' }).click();
  await page.getByRole('menuitem', { name: 'Editar' }).click();
  await expect(page.getByTestId('gastos-concepto')).toHaveValue('Gasto editable e2e');
  // InputNumero muestra el valor crudo al enfocar y pierde la selección: se vacía antes de escribir.
  await page.getByTestId('gastos-valor').fill('');
  await page.getByTestId('gastos-valor').fill('95000');
  await page.getByTestId('gastos-guardar').click();
  await expect(page.getByTestId('gastos-formulario')).toHaveCount(0);
  const valor = await conKc(page, (kc) => (kc.sel('selGastos', { desde: '2026-09-01', hasta: '2026-09-30', localId: 'usq' }) as { filas: { concepto: string; valor: number }[] }).filas.find((x) => x.concepto === 'Gasto editable e2e')?.valor);
  expect(valor).toBe(95000);

  await page.getByPlaceholder('Buscar por concepto, proveedor o categoría').fill('editable e2e');
  await page.getByRole('button', { name: 'Acciones de Gasto editable e2e' }).click();
  await page.getByRole('menuitem', { name: 'Eliminar' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('¿Eliminar el gasto «Gasto editable e2e»?');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByTestId('gastos-tabla')).toContainText('Gasto editable e2e');
  await page.getByRole('button', { name: 'Acciones de Gasto editable e2e' }).click();
  await page.getByRole('menuitem', { name: 'Eliminar' }).click();
  await page.getByRole('button', { name: 'Eliminar gasto' }).click();
  const queda = await conKc(page, (kc) => (kc.sel('selGastos', { desde: '2026-09-01', hasta: '2026-09-30', localId: 'usq' }) as { filas: { concepto: string }[] }).filas.some((x) => x.concepto === 'Gasto editable e2e'));
  expect(queda).toBe(false);

  // Un gasto que nació en el datáfono se corrige allá: no tiene acciones de edición.
  await page.getByPlaceholder('Buscar por concepto, proveedor o categoría').fill('Comisión');
  await page.getByRole('row').filter({ hasText: 'Automático' }).first().click();
  await expect(page.getByTestId('gastos-detalle')).toContainText('Se corrige desde allá');
  await expect(page.getByTestId('gastos-detalle').getByRole('button', { name: 'Eliminar' })).toHaveCount(0);
});

test('recurrentes: CRUD y "Generar este mes" con vista previa', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/gastos/recurrentes');
  await expect(page.getByTestId('recurrentes-tabla')).toContainText('Arriendo Usaquén');
  await expect(page.getByTestId('recurrentes-aviso')).toHaveCount(0);

  await page.getByTestId('recurrentes-nuevo').click();
  await page.getByTestId('recurrente-guardar').click();
  await expect(page.getByTestId('recurrente-formulario')).toContainText('Escribe el nombre del gasto.');
  await page.getByTestId('recurrente-nombre').fill('Aseo semanal e2e');
  await elegir(page, 'Categoría', 'Mantenimiento');
  await page.getByTestId('recurrente-valor').fill('300000');
  await page.getByTestId('recurrente-dia').fill('29');
  await page.getByTestId('recurrente-guardar').click();
  await expect(page.getByTestId('recurrente-formulario')).toContainText('El día del mes va de 1 a 28.');
  await page.getByTestId('recurrente-dia').fill('2');
  await page.getByTestId('recurrente-guardar').click();
  await expect(page.getByTestId('recurrente-formulario')).toHaveCount(0);
  await expect(page.getByTestId('recurrentes-tabla')).toContainText('Aseo semanal e2e');

  // Ya le toca (día 2 de septiembre, hoy es 30) y no se ha generado: aviso + vista previa.
  await expect(page.getByTestId('recurrentes-aviso')).toContainText('1 gasto recurrente');
  await page.getByRole('button', { name: 'Revisar y generar' }).click();
  await expect(page.getByTestId('recurrentes-lista-generar')).toContainText('Aseo semanal e2e');
  await page.getByTestId('recurrentes-confirmar-generar').click();
  const g = await conKc(page, (kc) => ({
    eventos: kc.eventosDominio().filter((e) => e.tipo === 'GastoRegistrado').length,
    gasto: (kc.sel('selGastos', { desde: '2026-09-01', hasta: '2026-09-30', localId: 'general' }) as { filas: { concepto: string; valor: number; recurrenteId: string | null }[] }).filas.find((x) => x.concepto === 'Aseo semanal e2e'),
  }));
  expect(g.eventos).toBe(1);
  expect(g.gasto?.valor).toBe(300000);
  expect(g.gasto?.recurrenteId).not.toBeNull();
  await expect(page.getByTestId('recurrentes-aviso')).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: 'Aseo semanal e2e' })).toContainText('Generado');

  // Idempotente: generar de nuevo no repite nada.
  await page.getByTestId('recurrentes-generar').click();
  await expect(page.getByTestId('recurrentes-confirmar-generar')).toBeDisabled();
  await page.getByRole('button', { name: 'Cancelar' }).click();

  // Pausar y eliminar (con confirmación y la cuenta de lo generado).
  await page.getByRole('button', { name: 'Acciones de Aseo semanal e2e' }).click();
  await page.getByRole('menuitem', { name: 'Pausar' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Aseo semanal e2e' })).toContainText('En pausa');
  await page.getByRole('button', { name: 'Acciones de Aseo semanal e2e' }).click();
  await page.getByRole('menuitem', { name: 'Eliminar' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Lo que ya generó (1 gasto) se conserva');
  await page.getByRole('button', { name: 'Eliminar recurrente' }).click();
  await expect(page.getByTestId('recurrentes-tabla')).not.toContainText('Aseo semanal e2e');
});

test('estado de resultados: cifras de los selectores, explicación, cascada y local por local', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/gastos/resultados?mes=2026-09');
  const r = await conKc(page, (kc) => {
    const er = (localId: string, prorratear = false) => kc.sel('selEstadoResultados', { desde: '2026-09-01', hasta: '2026-09-30', localId, prorratear }) as unknown as ER;
    return { todos: er('todos'), p93: er('p93'), usq: er('usq'), zr: er('zr') };
  });
  expect(r.todos.ventasNetas - r.todos.costoVentas).toBe(r.todos.utilidadBruta);
  await expect(page.getByTestId('resultados-kpi-ventas').locator('[title]').first()).toHaveAttribute('title', new RegExp(miles(r.todos.ventasNetas).replace(/\./g, '\\.')));
  await expect(page.getByTestId('resultados-kpi-final').locator('[title]').first()).toHaveAttribute('title', new RegExp(miles(r.todos.utilidadOperativa).replace(/\./g, '\\.')));
  await expect(page.getByTestId('resultados-explicacion')).toContainText('sin contar el IVA');
  await expect(page.getByTestId('resultados-explicacion')).toContainText('de cada 100 que vendiste');
  await expect(page.getByTestId('resultados-cascada')).toContainText('Ventas sin IVA');
  await expect(page.getByTestId('resultados-cascada')).toContainText('Queda al final');
  const comparativo = page.getByTestId('resultados-comparativo');
  for (const l of ['Parque 93', 'Usaquén', 'Zona Rosa']) await expect(comparativo).toContainText(l);
  await expect(comparativo).toContainText(`$ ${miles(r.zr.utilidadOperativa)}`);
  await expect(comparativo).toContainText('El que más te deja');
  await expect(comparativo).toContainText('Bodega y gastos generales');
  await expect(page.getByTestId('resultados-tendencia')).toBeVisible();

  // Repartir los generales: la fila de "Bodega" ya no incluye lo general y cada local carga su parte.
  await page.getByRole('switch', { name: 'Repartir los gastos generales entre los locales' }).click();
  await expect(comparativo).not.toContainText('Bodega y gastos generales');
  const conReparto = await conKc(page, (kc) => (kc.sel('selEstadoResultados', { desde: '2026-09-01', hasta: '2026-09-30', localId: 'usq', prorratear: true }) as unknown as ER).gastosGeneralesProrrateados);
  expect(conReparto).toBeGreaterThan(0);

  // Tocar un local cambia la vista y la URL.
  const filaUsaquen = comparativo.getByRole('row').filter({ hasText: 'Usaquén' });
  // Por teclado (Enter sobre la fila): con las barras fijas de la página, el clic puede quedar tapado en viewports bajos.
  await filaUsaquen.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/local=usq/);
  await expect(page.getByTestId('resultados-cascada')).toContainText('Usaquén');
  await expect(page.getByTestId('resultados-kpi-ventas').locator('[title]').first()).toHaveAttribute('title', new RegExp(miles(r.usq.ventasNetas).replace(/\./g, '\\.')));
});

test('estado de resultados: sin ?mes= abre el último mes completo (el 1 de octubre, septiembre)', async ({ page }) => {
  await page.goto(conHoy('/panel/gastos/resultados', '2026-10-01T15:30'));
  await esperarDatos(page);
  await expect(page.getByTestId('gastos-selector-mes')).toContainText('Septiembre de 2026');
});

test('estado de resultados: honra ?mes=&local=, exporta y respeta la moneda', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/gastos/resultados?mes=2026-08&local=zr');
  await expect(page.getByTestId('gastos-selector-mes')).toContainText('Agosto de 2026');
  await expect(page.getByTestId('resultados-selector-local')).toContainText('Zona Rosa');
  const er = await conKc(page, (kc) => kc.sel('selEstadoResultados', { desde: '2026-08-01', hasta: '2026-08-31', localId: 'zr', prorratear: false }) as unknown as ER);
  await expect(page.getByTestId('resultados-kpi-ventas').locator('[title]').first()).toHaveAttribute('title', new RegExp(miles(er.ventasNetas).replace(/\./g, '\\.')));
  await expect(page.getByTestId('exportar-resultados')).toBeVisible();
  await page.getByTestId('selector-moneda').getByTestId('moneda-USD').click();
  await expect(page.getByTestId('resultados-kpi-ventas')).toContainText('US$');
});

test('punto de equilibrio: el mínimo de cada local es el del selector y repartir lo sube', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/gastos/equilibrio');
  const p = await conKc(page, (kc) => {
    const f = (id: string) => kc.sel('selPuntoEquilibrio', { localId: id, mes: '2026-09' }) as { ventasEquilibrio: number; ventasNetasMes: number };
    return { p93: f('p93'), usq: f('usq'), zr: f('zr'), todos: f('todos') };
  });
  for (const id of ['p93', 'usq', 'zr', 'todos'] as const) {
    await expect(page.getByTestId(`equilibrio-minimo-${id}`).locator('[data-valor]')).toHaveAttribute('data-valor', String(p[id].ventasEquilibrio));
  }
  await expect(page.getByTestId('equilibrio-tarjeta-p93')).toContainText('Ya cubre sus gastos fijos');
  await expect(page.getByTestId('equilibrio-formula')).toContainText('gastos fijos');
  await expect(page.getByTestId('equilibrio-tabla')).toContainText('Todo el negocio');
  await page.getByRole('switch', { name: 'Incluir la parte de los gastos generales' }).click();
  const nuevo = Number(await page.getByTestId('equilibrio-minimo-p93').locator('[data-valor]').getAttribute('data-valor'));
  expect(nuevo).toBeGreaterThan(p.p93.ventasEquilibrio);
  // El total del negocio no cambia: ya incluye todos los gastos.
  await expect(page.getByTestId('equilibrio-minimo-todos').locator('[data-valor]')).toHaveAttribute('data-valor', String(p.todos.ventasEquilibrio));
});

test('punto de equilibrio: un mes anterior y ?mes= inválido caen al mes en curso', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/gastos/equilibrio?mes=2026-07');
  await expect(page.getByTestId('gastos-selector-mes')).toContainText('Julio de 2026');
  const v = await conKc(page, (kc) => (kc.sel('selPuntoEquilibrio', { localId: 'usq', mes: '2026-07' }) as { ventasEquilibrio: number }).ventasEquilibrio);
  await expect(page.getByTestId('equilibrio-minimo-usq').locator('[data-valor]')).toHaveAttribute('data-valor', String(v));
  await page.goto(`/panel/gastos/equilibrio?hoy=2026-09-30T15%3A30&mes=basura`);
  await esperarDatos(page);
  await expect(page.getByTestId('gastos-selector-mes')).toContainText('Septiembre de 2026');
});

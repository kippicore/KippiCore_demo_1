import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { conKc, esperarDatos } from '../kc';

/**
 * B2 · Proveedores (PLAN 9.4): directorio, comparativo de fábricas y ficha. Verifica solo su pantalla; las cifras se
 * comparan contra los selectores por `window.__kc`, nunca contra números escritos (la calibración puede moverlas).
 * Puerto 4312: `PORT=4312 npx playwright test e2e/paquetes/proveedores.spec.ts --project=escritorio-1440 …`
 */

/** Errores de consola y de página de una prueba (deben quedar vacíos). */
function vigilar(page: Page): string[] {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(`${page.url()}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`${page.url()}: ${m.text()}`);
  });
  return errores;
}

/** Lleva un elemento al centro de la pantalla (la cabecera fija de la tabla tapa lo que queda arriba). */
async function centrar(l: Locator): Promise<void> {
  await l.evaluate((el) => el.scrollIntoView({ block: 'center' }));
}

const chip = (page: Page, texto: string) => page.getByText(texto, { exact: true }).last();
const filasDe = (page: Page, tabla: string) => page.getByTestId(tabla).locator('tr[data-fila]');

test.describe('Proveedores', () => {
  test('el directorio muestra a todos los proveedores y sus cifras salen de los selectores', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/proveedores');
    await esperarDatos(page);
    await expect(page.getByTestId('tabla-proveedores')).toBeVisible();
    const esperado = await conKc(page, (kc) => {
      const filas = kc.sel('selProveedores', { hoy: '2026-09-30' }) as { saldoCop: number; proveedor: { tipo: string } }[];
      return { n: filas.length, fabricas: filas.filter((f) => f.proveedor.tipo === 'fabrica').length, saldo: filas.reduce((a, f) => a + f.saldoCop, 0) };
    });
    expect(esperado.n).toBe(15);
    await expect(filasDe(page, 'tabla-proveedores')).toHaveCount(esperado.n);
    await expect(page.getByTestId('resumen-saldo')).toHaveAttribute('data-valor', String(esperado.saldo));
    await expect(page.getByTestId('resumen-proveedores')).toContainText(String(esperado.n));
    await expect(page.getByTestId('importar-excel')).toBeVisible();
    await expect(page.getByTestId('nuevo-proveedor')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('honra ?tipo=, ?local= y ?resaltar=', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/proveedores?tipo=fabrica');
    await esperarDatos(page);
    await expect(filasDe(page, 'tabla-proveedores')).toHaveCount(5);
    await expect(chip(page, 'Tipo: Fábricas')).toBeVisible();

    await page.goto('/panel/proveedores?local=usq&hoy=2026-09-30T15:30');
    await esperarDatos(page);
    await expect(filasDe(page, 'tabla-proveedores')).toHaveCount(1);
    await expect(page.getByTestId('proveedor-pr_arr_usq')).toBeVisible();

    await page.goto('/panel/proveedores?resaltar=pr_weiye&hoy=2026-09-30T15:30');
    await esperarDatos(page);
    await expect(page.locator('tr[data-fila="pr_weiye"][data-resaltada="true"]')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('buscar y filtrar por país se refleja en la tabla y se limpia', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/proveedores');
    await esperarDatos(page);
    const buscar = page.getByPlaceholder('Buscar por nombre, ciudad o categoría');
    await buscar.fill('weiye');
    await expect(filasDe(page, 'tabla-proveedores')).toHaveCount(1);
    await buscar.fill('zzzz');
    await expect(page.getByText('Ningún proveedor con estos filtros')).toBeVisible();
    await page.getByRole('button', { name: 'Limpiar filtros' }).first().click();
    await expect(filasDe(page, 'tabla-proveedores')).toHaveCount(15);

    await page.getByTestId('filtro-pais').click();
    await page.getByRole('combobox', { name: 'País' }).click();
    await page.getByRole('option', { name: 'China' }).click();
    await page.keyboard.press('Escape');
    await expect(filasDe(page, 'tabla-proveedores')).toHaveCount(5);
    await expect(chip(page, 'País: China')).toBeVisible();
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(filasDe(page, 'tabla-proveedores')).toHaveCount(15);
    expect(errores).toEqual([]);
  });

  test('vista por local: los tres locales lado a lado con su arrendador', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/proveedores');
    await esperarDatos(page);
    await page.getByTestId('vista-locales').click();
    const v = page.getByTestId('proveedores-por-local');
    await expect(v).toBeVisible();
    for (const [id, arrendador] of [['p93', 'Inmuebles Altamira 93'], ['usq', 'Rentas Casona de Usaquén'], ['zr', 'Paseo Granate']] as const) {
      const card = page.getByTestId(`proveedores-local-${id}`);
      await expect(card).toContainText(arrendador);
      await expect(card).toContainText('Arriendo mensual');
    }
    // Con un local en la barra superior se marca ese local.
    await page.getByTestId('selector-local').click();
    await page.getByTestId('local-usq').click();
    await expect(page.getByTestId('proveedores-local-usq')).toContainText('Local activo');
    expect(errores).toEqual([]);
  });

  test('el local de la barra deja ese local y los proveedores generales', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/proveedores');
    await esperarDatos(page);
    await page.getByTestId('selector-local').click();
    await page.getByTestId('local-usq').click();
    // 15 − arrendadores de los otros dos locales.
    await expect(filasDe(page, 'tabla-proveedores')).toHaveCount(13);
    await expect(page.getByTestId('proveedor-pr_arr_p93')).toHaveCount(0);
    await expect(page.getByTestId('proveedor-pr_arr_usq')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('comparativo: el hallazgo nombra a la fábrica que más tarde llega y la tabla la pone primero', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/proveedores/comparativo');
    await esperarDatos(page);
    const peor = await conKc(page, (kc) => {
      const filas = (kc.sel('selComparativoFabricas', { hoy: '2026-09-30' }) as { proveedorId: string; nombre: string; retrasoPromedio: number | null; pedidosRecibidos: number }[]).filter((f) => f.pedidosRecibidos >= 2 && f.retrasoPromedio !== null);
      filas.sort((a, b) => (b.retrasoPromedio ?? 0) - (a.retrasoPromedio ?? 0));
      return { id: filas[0]?.proveedorId ?? '', nombre: filas[0]?.nombre ?? '' };
    });
    expect(peor.id).not.toBe('');
    await expect(page.getByTestId('hallazgo-titular')).toContainText(peor.nombre);
    await expect(page.getByTestId('hallazgo-contraste')).toBeVisible();
    await expect(filasDe(page, 'tabla-comparativo')).toHaveCount(5);
    await expect(filasDe(page, 'tabla-comparativo').first()).toHaveAttribute('data-fila', peor.id);
    for (const g of ['grafico-retraso', 'grafico-defectos', 'grafico-costo']) await expect(page.getByTestId(g)).toBeVisible();
    // La historia de cada pedido: un bloque por pedido recibido.
    const recibidos = await conKc(page, (kc) => (kc.sel('selComparativoFabricas', { hoy: '2026-09-30' }) as { pedidosRecibidos: number }[]).reduce((a, f) => a + f.pedidosRecibidos, 0));
    await expect(page.getByTestId('comparativo-pedidos').locator('a[data-testid^="entrega-"]')).toHaveCount(recibidos);
    // Hacer clic en una fábrica lleva a su ficha.
    await page.getByTestId('hallazgo-ver-ficha').click();
    await expect(page).toHaveURL(new RegExp(`/panel/proveedores/${peor.id}`));
    await expect(page.getByTestId('proveedor-ficha')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('ficha de una fábrica: cifras, historial, "Sugerir próximo pedido" y saldo hacia Pagos', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/proveedores/pr_lanxin');
    await esperarDatos(page);
    await expect(page.getByTestId('proveedor-ficha')).toHaveAttribute('data-proveedor', 'pr_lanxin');
    const esperado = await conKc(page, (kc) => {
      const f = kc.sel('selFichaProveedor', { proveedorId: 'pr_lanxin', hoy: '2026-09-30' }) as { importaciones: unknown[]; saldoCop: number };
      const cxp = kc.sel('selCuentasPorPagar', { hoy: '2026-09-30', proveedorId: 'pr_lanxin', estado: 'pendientes' }) as { filas: { cxp: { id: string } }[] };
      return { pedidos: f.importaciones.length, saldo: f.saldoCop, primeraCuenta: cxp.filas[0]?.cxp.id ?? '' };
    });
    await expect(page.getByTestId('kpi-pedidos')).toContainText(String(esperado.pedidos));
    await expect(filasDe(page, 'ficha-historial')).toHaveCount(esperado.pedidos);
    expect(esperado.saldo).toBeGreaterThan(0);
    // El saldo enlaza a Pagos con la cuenta resaltada.
    await expect(page.getByTestId('kpi-saldo')).toHaveAttribute('href', `/panel/pagos/por-pagar?resaltar=${encodeURIComponent(esperado.primeraCuenta)}`);
    await expect(page.getByTestId(`cuenta-${esperado.primeraCuenta}`)).toBeVisible();
    // "Sugerir próximo pedido" produce el enlace del contrato de rutas.
    await expect(page.getByTestId('sugerir-pedido')).toHaveAttribute('href', '/panel/importaciones/sugerir?proveedor=pr_lanxin&desde=proveedor');
    await expect(page.getByTestId('sugerir-pedido-tarjeta')).toHaveAttribute('href', '/panel/importaciones/sugerir?proveedor=pr_lanxin&desde=proveedor');
    await expect(page.getByTestId('ficha-sugerencia')).toBeVisible();
    // Cada pedido del historial enlaza a su importación.
    const numero = await conKc(page, (kc) => ((kc.sel('selFichaProveedor', { proveedorId: 'pr_lanxin', hoy: '2026-09-30' }) as { importaciones: { numero: string }[] }).importaciones[0]?.numero) ?? '');
    await expect(page.getByTestId(`pedido-${numero}`)).toHaveAttribute('href', `/panel/importaciones/${numero}`);
    await expect(page.getByTestId('ficha-contactos')).toContainText('Vivian Zhou');
    expect(errores).toEqual([]);
  });

  test('ficha de un proveedor local: pagos recientes, sin sugerir pedido', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/proveedores/pr_arr_usq');
    await esperarDatos(page);
    await expect(page.getByTestId('proveedor-ficha')).toContainText('Rentas Casona de Usaquén');
    await expect(page.getByTestId('sugerir-pedido')).toHaveCount(0);
    await expect(page.getByTestId('ficha-sugerencia')).toHaveCount(0);
    await expect(filasDe(page, 'ficha-pagos').first()).toBeVisible();
    await expect(page.getByTestId('ficha-pagos-resumen')).toContainText('más recientes');
    // Un pago enlaza a Gastos con el gasto resaltado.
    const primero = await filasDe(page, 'ficha-pagos').first().getAttribute('data-fila');
    expect(primero).toBeTruthy();
    await expect(page.getByTestId('ficha-cuentas')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('una ficha inexistente muestra un estado diseñado', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/proveedores/no-existe');
    await esperarDatos(page);
    await expect(page.getByTestId('proveedor-no-encontrado')).toContainText('No encontramos a ese proveedor');
    await page.getByRole('link', { name: 'Ir al directorio' }).click();
    await expect(page.getByTestId('proveedores-directorio')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('crear, editar, calificar y eliminar un proveedor', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/proveedores');
    await esperarDatos(page);

    // Crear: valida junto al campo y luego guarda.
    await page.getByTestId('nuevo-proveedor').click();
    await page.getByTestId('guardar-proveedor').click();
    await expect(page.getByText('Escribe el nombre del proveedor.')).toBeVisible();
    await expect(page.getByText('Escribe un nombre corto.')).toBeVisible();
    await page.getByTestId('campo-nombre').fill('Dongguan Prueba Garments Co., Ltd.');
    await page.getByTestId('campo-nombre-corto').fill('Dongguan Prueba');
    await page.getByTestId('campo-ciudad').fill('Dongguan');
    await page.getByTestId('guardar-proveedor').click();
    await expect(page.getByText('Dongguan Prueba quedó en tu directorio')).toBeVisible();
    const creado = await conKc(page, (kc) => {
      const p = Object.values((kc.estado() as unknown as { proveedores: Record<string, { id: string; nombreCorto: string; tipo: string; moneda: string; pais: string }> }).proveedores).find((x) => x.nombreCorto === 'Dongguan Prueba');
      return p ? { id: p.id, tipo: p.tipo, moneda: p.moneda, pais: p.pais } : null;
    });
    expect(creado).toMatchObject({ tipo: 'fabrica', moneda: 'USD', pais: 'China' });
    // La fila nueva queda resaltada en la lista.
    await expect(page.locator(`tr[data-fila="${creado?.id}"][data-resaltada="true"]`)).toBeVisible();
    await expect(filasDe(page, 'tabla-proveedores')).toHaveCount(16);

    // Editar desde la ficha.
    await page.goto(`/panel/proveedores/${creado?.id}?hoy=2026-09-30T15:30`);
    await esperarDatos(page);
    await page.getByTestId('editar-proveedor').click();
    await page.getByTestId('campo-condiciones').fill('50 % anticipo, 50 % contra embarque');
    await page.getByTestId('guardar-proveedor').click();
    await expect(page.getByTestId('ficha-datos')).toContainText('50 % anticipo, 50 % contra embarque');

    // Calificar con las estrellas.
    await page.getByTestId('calificacion-2').click();
    const cal = await conKc(page, (kc) => (Object.values((kc.estado() as unknown as { proveedores: Record<string, { nombreCorto: string; calificacion: number }> }).proveedores).find((x) => x.nombreCorto === 'Dongguan Prueba'))?.calificacion);
    expect(cal).toBe(2);

    // Eliminar con confirmación y con consecuencias.
    await page.getByRole('button', { name: 'Más acciones de Dongguan Prueba' }).click();
    await page.getByTestId('eliminar-proveedor').click();
    await expect(page.getByText('¿Eliminar a Dongguan Prueba?')).toBeVisible();
    await page.getByRole('button', { name: 'Eliminar proveedor' }).click();
    await expect(page).toHaveURL(/\/panel\/proveedores$/);
    await expect(filasDe(page, 'tabla-proveedores')).toHaveCount(15);
    const eliminado = await conKc(page, (kc) => (Object.values((kc.estado() as unknown as { proveedores: Record<string, { nombreCorto: string; eliminadoEn?: string | null }> }).proveedores).find((x) => x.nombreCorto === 'Dongguan Prueba'))?.eliminadoEn ?? null);
    expect(eliminado).not.toBeNull();
    expect(errores).toEqual([]);
  });

  test('no deja eliminar a una fábrica con importaciones en curso y dice por qué', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/proveedores');
    await esperarDatos(page);
    const menu = page.getByRole('button', { name: 'Más acciones de Hangzhou Lanxin' });
    await centrar(menu);
    await menu.click();
    await page.getByRole('menuitem', { name: 'Eliminar' }).click();
    await expect(page.getByText('No puedes eliminar a Hangzhou Lanxin todavía')).toBeVisible();
    await expect(page.getByText(/en curso\./)).toBeVisible();
    await expect(page.getByTestId('proveedor-pr_lanxin')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('contactos: agregar con validación, editar y eliminar con confirmación', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/proveedores/pr_huameng');
    await esperarDatos(page);
    await page.getByTestId('agregar-contacto').click();
    await page.getByTestId('campo-contacto-nombre').fill('Amy Zhang');
    await page.getByTestId('campo-contacto-correo').fill('correo-sin-arroba');
    await page.getByTestId('campo-contacto-whatsapp').fill('+86 138 0000 1111');
    await page.getByTestId('guardar-contacto').click();
    await expect(page.getByText('Escribe un correo válido.')).toBeVisible();
    await page.getByTestId('campo-contacto-correo').fill('amy.zhang@huameng-garment.example');
    await page.getByTestId('guardar-contacto').click();
    const tarjeta = page.getByTestId('ficha-contactos');
    await expect(tarjeta).toContainText('Amy Zhang');
    await expect(tarjeta).toContainText('Lily Chen');

    await page.getByRole('button', { name: 'Editar a Amy Zhang' }).click();
    await page.getByTestId('campo-contacto-nombre').fill('Amy Zhang Li');
    await page.getByTestId('guardar-contacto').click();
    await expect(tarjeta).toContainText('Amy Zhang Li');

    await page.getByRole('button', { name: 'Eliminar a Amy Zhang Li' }).click();
    await expect(page.getByText('¿Eliminar a Amy Zhang Li?')).toBeVisible();
    await page.getByRole('button', { name: 'Eliminar contacto' }).click();
    await expect(tarjeta).not.toContainText('Amy Zhang Li');
    await expect(tarjeta).toContainText('Lily Chen');
    expect(errores).toEqual([]);
  });

  test('"Escribir" ofrece WhatsApp, correo y WeChat sin destinatario', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/proveedores/pr_weiye');
    await esperarDatos(page);
    await page.getByTestId('escribir-co_kevin_wang').click();
    for (const t of ['Abrir en WhatsApp', 'Abrir en correo', 'Copiar para WeChat']) await expect(page.getByRole('menuitem', { name: t })).toBeVisible();
    await page.keyboard.press('Escape');
    expect(errores).toEqual([]);
  });

  test('la moneda cambia las cifras a dólares y la pista de moneda existe', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/proveedores');
    await esperarDatos(page);
    await expect(page.getByTestId('pista-proveedores.moneda')).toBeVisible();
    await expect(page.getByTestId('resumen-saldo')).not.toContainText('US$');
    await page.getByTestId('proveedores-moneda-USD').click();
    await expect(page.getByTestId('resumen-saldo')).toContainText('US$');
    await expect(page.getByTestId('franja-moneda')).toBeVisible();
    await page.getByTestId('proveedores-moneda-COP').click();
    await expect(page.getByTestId('resumen-saldo')).not.toContainText('US$');
    expect(errores).toEqual([]);
  });

  test('las tablas caben sin desplazarse en horizontal (la cabecera fija depende de eso)', async ({ page }) => {
    const errores = vigilar(page);
    const cabe = (id: string) =>
      page.getByTestId(id).evaluate((el) => {
        const caja = el.querySelector('table')?.parentElement;
        return caja ? caja.scrollWidth <= caja.clientWidth + 1 : false;
      });
    for (const [ruta, tabla] of [
      ['/panel/proveedores', 'tabla-proveedores'],
      ['/panel/proveedores/comparativo', 'tabla-comparativo'],
      ['/panel/proveedores/pr_weiye', 'ficha-historial'],
      ['/panel/proveedores/pr_arr_usq', 'ficha-pagos'],
    ] as const) {
      await page.goto(`${ruta}?hoy=2026-09-30T15:30`);
      await esperarDatos(page);
      await expect(page.getByTestId(tabla)).toBeVisible();
      expect(await cabe(tabla), `${tabla} desborda`).toBe(true);
    }
    expect(errores).toEqual([]);
  });
});

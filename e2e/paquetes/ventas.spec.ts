import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { esperarDatos } from '../kc';

/**
 * A3 · Ventas (PRD 7.3 y 7.2, PLAN 9.4). Verifica solo la pantalla de Ventas: la lista con 16.000+ ventas, los totales
 * del filtro (= selVentas), los filtros en la URL, el recibo, las acciones de dueño y de vendedor, las devoluciones y
 * los cambios, y los abonos. Los efectos en otros módulos se leen por selectores con window.__kc.
 * Corre con: PORT=4303 npx playwright test e2e/paquetes/ventas.spec.ts --workers=1
 */
const HOY = '2026-09-30';

interface Totales {
  ventas: number;
  devoluciones: number;
  netas: number;
  unidades: number;
  ticket: number;
  descuentos: number;
  numVentas: number;
}

/** Lee un selector del catálogo con parámetros (window.__kc.sel). */
function sel<T = unknown>(page: Page, nombre: string, params?: unknown): Promise<T> {
  return page.evaluate(
    ([n, p]) =>
      (globalThis as unknown as { __kc: { sel: (n: string, p?: unknown) => unknown } }).__kc.sel(
        n as string,
        p,
      ),
    [nombre, params] as const,
  ) as Promise<T>;
}

function vigilarConsola(page: Page): string[] {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`console: ${m.text()}`);
  });
  return errores;
}

async function totalesEnPantalla(page: Page): Promise<Record<string, number>> {
  const claves = ['vendido', 'devoluciones', 'netas', 'unidades', 'ticket', 'descuentos'];
  const r: Record<string, number> = {};
  for (const k of claves) r[k] = Number(await page.getByTestId(`valor-${k}`).getAttribute('data-valor'));
  return r;
}

async function esperarTotales(page: Page, esperado: Totales): Promise<void> {
  await expect(page.getByTestId('valor-netas')).toHaveAttribute('data-valor', String(esperado.netas));
  const t = await totalesEnPantalla(page);
  expect(t).toEqual({
    vendido: esperado.ventas,
    devoluciones: esperado.devoluciones,
    netas: esperado.netas,
    unidades: esperado.unidades,
    ticket: esperado.ticket,
    descuentos: esperado.descuentos,
  });
}

interface VentaPrueba {
  ventaId: string;
  numero: string;
  total: number;
}

/** Registra una venta de prueba en Usaquén (nequi, sin factura). `unidades` en una sola línea; `tipo` contado o separado (con cliente). */
async function crearVenta(
  page: Page,
  o: { unidades?: number; tipo?: 'contado' | 'separado'; vendedorId?: string } = {},
): Promise<VentaPrueba> {
  return page.evaluate(
    ([unidades, tipo, vendedorId]) => {
      const kc = (
        globalThis as unknown as {
          __kc: {
            estado: () => Record<string, Record<string, Record<string, unknown>>> & {
              agregados: { existencias: Record<string, number> };
            };
            acciones: Record<string, (x: unknown) => { ok: boolean; error?: { mensaje: string } }>;
            datos: { getState: () => { registro: { comando: { datos: { ventaId: string } } }[] } };
          };
        }
      ).__kc;
      const e = kc.estado() as unknown as {
        variantes: Record<string, { id: string; productoId: string }>;
        productos: Record<string, { precioVenta: number }>;
        clientes: Record<string, { id: string }>;
        ventas: Record<string, { numero: string; total: number }>;
        agregados: { existencias: Record<string, number> };
      };
      const v = Object.values(e.variantes).find(
        (x) => (e.agregados.existencias[`${x.id}@usq`] ?? 0) >= (unidades as number) + 2,
      );
      if (!v) throw new Error('sin variante con existencias');
      const precio = e.productos[v.productoId]?.precioVenta ?? 0;
      const total = precio * (unidades as number);
      const cliente = tipo === 'separado' ? Object.values(e.clientes)[3]?.id : null;
      const r = kc.acciones.registrarVenta({
        ts: null,
        localId: 'usq',
        vendedorId,
        canal: 'local',
        tipo,
        clienteId: cliente ?? null,
        clienteNuevo: null,
        lineas: [{ varianteId: v.id, cantidad: unidades, precioLista: null, descuento: null }],
        descuentoGlobal: null,
        aprobacionDescuentoId: null,
        pagos: [
          {
            medio: 'nequi',
            valor: tipo === 'separado' ? Math.round(total * 0.5) : total,
            recibido: null,
            referencia: 'E2E-A3',
            sesionCajaId: null,
            bonoId: null,
          },
        ],
        fechaLimiteSeparado: tipo === 'separado' ? '2026-10-20' : null,
        ventaOrigenCambioId: null,
        facturaInmediata: null,
        nota: 'Venta de prueba A3',
      });
      if (!r.ok) throw new Error(r.error?.mensaje ?? 'no se registró');
      const ultima = kc.datos.getState().registro.at(-1);
      const ventaId = ultima?.comando.datos.ventaId ?? '';
      const actual = kc.estado() as unknown as { ventas: Record<string, { numero: string }> };
      return { ventaId, numero: actual.ventas[ventaId]?.numero ?? '', total };
    },
    [o.unidades ?? 1, o.tipo ?? 'contado', o.vendedorId ?? 'em_scardenas'] as const,
  );
}

/** Una venta reciente con factura, contado, sin devoluciones y dentro del plazo de devolución. */
async function ventaConFactura(page: Page): Promise<{ id: string; numero: string; lineas: number }> {
  return page.evaluate(() => {
    const kc = (
      globalThis as unknown as {
        __kc: {
          estado: () => {
            ventas: Record<
              string,
              {
                id: string;
                numero: string;
                ts: string;
                tipo: string;
                facturaId: string | null;
                anulacion: unknown;
                lineas: unknown[];
              }
            >;
            devoluciones: Record<string, { ventaId: string }>;
          };
        };
      }
    ).__kc;
    const e = kc.estado();
    const dev = new Set(Object.values(e.devoluciones).map((d) => d.ventaId));
    const v = Object.values(e.ventas)
      .filter(
        (x) =>
          x.tipo === 'contado' &&
          x.facturaId &&
          !x.anulacion &&
          !dev.has(x.id) &&
          x.ts >= '2026-09-15' &&
          x.lineas.length >= 2,
      )
      .sort((a, b) => (a.ts < b.ts ? 1 : -1))[0];
    if (!v) throw new Error('sin venta con factura');
    return { id: v.id, numero: v.numero, lineas: v.lineas.length };
  });
}

async function cambiarRol(page: Page, rol: 'dueno' | 'vendedor'): Promise<void> {
  await page.getByTestId('selector-rol').click();
  await page.getByTestId(`rol-${rol}`).click();
  await expect(page.getByTestId('selector-rol')).toHaveAttribute('data-valor', rol);
}

test.describe('Ventas · lista', () => {
  test('los totales son los del selector y cada filtro viaja a la URL', async ({ page, irA }) => {
    test.setTimeout(120_000);
    const errores = vigilarConsola(page);
    await irA('/panel/ventas');
    await esperarDatos(page);
    await expect(page.getByTestId('ventas-tabla')).toBeVisible();
    await expect(page.locator('[data-pista="ventas.totales"]')).toHaveCount(1);

    const mes = await sel<{ totales: Totales }>(page, 'selVentas', {
      desde: '2026-09-01',
      hasta: HOY,
      localId: 'todos',
    });
    await esperarTotales(page, mes.totales);
    await expect(page.getByTestId('tabla-total-netas')).toHaveAttribute(
      'data-valor',
      String(mes.totales.netas),
    );

    // Local → URL, totales nuevos, chip y recarga.
    await page.getByTestId('filtro-local').click();
    await page.getByTestId('filtro-local-select').click();
    await page.getByRole('option', { name: 'Usaquén' }).click();
    await expect(page).toHaveURL(/local=usq/);
    const usq = await sel<{ totales: Totales }>(page, 'selVentas', {
      desde: '2026-09-01',
      hasta: HOY,
      localId: 'usq',
    });
    await esperarTotales(page, usq.totales);
    expect(usq.totales.netas).toBeLessThan(mes.totales.netas);
    await expect(page.getByText('Local: Usaquén').last()).toBeVisible();
    await page.keyboard.press('Escape');

    // Estado y medio por la URL: se reflejan en los controles y en los totales.
    await page.goto(
      `/panel/ventas?local=usq&medio=nequi&estado=pagada&desde=2026-08-01&hasta=${HOY}&hoy=${HOY}T15:30`,
    );
    await esperarDatos(page);
    const nequi = await sel<{
      totales: Totales;
      filas: { estado: string; medios: string[]; localId: string }[];
    }>(page, 'selVentas', {
      desde: '2026-08-01',
      hasta: HOY,
      localId: 'usq',
      medio: 'nequi',
      estado: 'pagada',
    });
    expect(nequi.filas.length).toBeGreaterThan(5);
    expect(
      nequi.filas.every((f) => f.estado === 'pagada' && f.medios.includes('nequi') && f.localId === 'usq'),
    ).toBe(true);
    await esperarTotales(page, nequi.totales);
    await expect(page.getByText('Pago: Nequi')).toBeVisible();
    await expect(page.getByText('Estado: Pagada')).toBeVisible();
    await expect(page.getByTestId('filtro-mas')).toContainText('1');

    // Quitar un chip actualiza la URL; "Limpiar filtros" la deja limpia.
    await page.getByRole('button', { name: 'Quitar filtro Pago: Nequi' }).click();
    await expect(page).not.toHaveURL(/medio=/);
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(page).not.toHaveURL(/local=|estado=|desde=/);
    await esperarTotales(page, mes.totales);

    expect(errores, errores.join('\n')).toEqual([]);
  });

  test('con todo el historial (16.000+ ventas) ordena, pagina y busca sin trabarse', async ({
    page,
    irA,
  }) => {
    test.setTimeout(120_000);
    const errores = vigilarConsola(page);
    await irA('/panel/ventas');
    await esperarDatos(page);
    const dias = Object.keys(await sel<Record<string, string[]>>(page, 'selIndiceVentasPorDia')).sort();
    const historial = { desde: dias[0]!, hasta: dias[dias.length - 1]! };
    // El atajo "Todo el historial" escribe el rango completo en la URL.
    await page.getByTestId('filtro-fechas').click();
    await page.getByTestId('filtro-todo-historial').click();
    await expect(page).toHaveURL(new RegExp(`desde=${historial.desde}`));
    const todo = await sel<{ filas: unknown[]; totales: Totales }>(page, 'selVentas', {
      desde: historial.desde,
      hasta: historial.hasta,
      localId: 'todos',
    });
    expect(todo.filas.length).toBeGreaterThan(16_000);
    await esperarTotales(page, todo.totales);
    await expect(page.getByText(/de 1\d\.\d{3} ventas/)).toBeVisible();
    // Paginada: solo se pintan las filas de la página.
    expect(await page.locator('[data-fila]').count()).toBeLessThanOrEqual(50);

    // Ordenar por total y pasar de página responde en menos de 2,5 s con 17.000 filas.
    const t0 = Date.now();
    await page.getByRole('button', { name: 'Total' }).click();
    await expect(page.getByRole('columnheader', { name: /Total/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    await page.getByRole('button', { name: 'Página siguiente' }).click();
    await expect(page.getByText('Página 2 de')).toBeVisible();
    expect(Date.now() - t0).toBeLessThan(2_500);

    // Búsqueda por número: una sola venta, y los totales siguen siendo los de selVentas.
    const alguna = (
      await sel<{ filas: { numero: string }[] }>(page, 'selVentas', {
        desde: historial.desde,
        hasta: historial.hasta,
        localId: 'todos',
      })
    ).filas[4000]!;
    await page.getByPlaceholder('Buscar venta, cliente o vendedor').fill(alguna.numero);
    await expect(page.locator('[data-fila]')).toHaveCount(1);
    const unaSola = await sel<{ totales: Totales }>(page, 'selVentas', {
      desde: historial.desde,
      hasta: historial.hasta,
      localId: 'todos',
      texto: alguna.numero,
    });
    await esperarTotales(page, unaSola.totales);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test('?resaltar= lleva a la fila (aunque sea de otro mes) y un id inexistente avisa sin romper', async ({
    page,
    irA,
  }) => {
    const errores = vigilarConsola(page);
    await irA('/panel/ventas');
    await esperarDatos(page);
    const vieja = await page.evaluate(() => {
      const e = (
        globalThis as unknown as {
          __kc: { estado: () => { ventas: Record<string, { id: string; numero: string; ts: string }> } };
        }
      ).__kc.estado();
      return Object.values(e.ventas).find((v) => v.ts >= '2026-06-10' && v.ts < '2026-06-20')!;
    });
    await page.goto(`/panel/ventas?resaltar=${vieja.id}&hoy=${HOY}T15:30`);
    await esperarDatos(page);
    const fila = page.locator(`[data-fila="${vieja.id}"]`);
    await expect(fila).toBeVisible();
    await expect(fila).toHaveAttribute('data-resaltada', 'true');
    await expect(fila).toContainText(vieja.numero);

    await page.goto(`/panel/ventas?resaltar=vt_no_existe&hoy=${HOY}T15:30`);
    await esperarDatos(page);
    await expect(page.getByText('Esa venta ya no está en la lista.')).toBeVisible();
    await expect(page.getByTestId('ventas-tabla')).toBeVisible();
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test('sin resultados muestra el estado vacío y se sale de él con un clic', async ({ page, irA }) => {
    await irA(`/panel/ventas?canal=web&medio=bono_regalo&estado=anulada&desde=${HOY}&hasta=${HOY}`);
    await esperarDatos(page);
    await expect(page.getByText('Ninguna venta con estos filtros')).toBeVisible();
    await page.getByRole('button', { name: 'Limpiar filtros' }).last().click();
    await expect(page.locator('[data-fila]').first()).toBeVisible();
  });

  test('exportar el filtro a Excel y PDF con la definición única emite sus eventos', async ({
    page,
    irA,
  }) => {
    await irA('/panel/ventas?local=usq');
    await esperarDatos(page);
    await page
      .getByTestId('exportar-ventas')
      .getByRole('button', { name: /Exportar/ })
      .click();
    const [xls] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('exportar-ventas-excel').click(),
    ]);
    expect(xls.suggestedFilename()).toMatch(/\.xlsx$/);
    await page
      .getByTestId('exportar-ventas')
      .getByRole('button', { name: /Exportar/ })
      .click();
    const [pdf] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('exportar-ventas-pdf').click(),
    ]);
    expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
    const eventos = await page.evaluate(() =>
      (
        globalThis as unknown as {
          __kc: { eventosUI: () => { tipo: string; datos: { reporte?: string } }[] };
        }
      ).__kc
        .eventosUI()
        .map((e) => `${e.tipo}:${e.datos.reporte}`),
    );
    expect(eventos).toEqual(['excel_generado:ventas', 'pdf_generado:ventas']);
  });
});

test.describe('Ventas · recibo y acciones del dueño', () => {
  test('el detalle es un recibo que cuadra con el selector y se abre desde la lista', async ({
    page,
    irA,
  }) => {
    const errores = vigilarConsola(page);
    await irA('/panel/ventas');
    await esperarDatos(page);
    const v = await ventaConFactura(page);
    await page.getByPlaceholder('Buscar venta, cliente o vendedor').fill(v.numero);
    await page.locator(`[data-fila="${v.id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/panel/ventas/${v.id}`));
    const d = await sel<{
      venta: {
        total: number;
        subtotal: number;
        descuentos: number;
        iva: number;
        base: number;
        lineas: unknown[];
      };
      pagado: number;
      margen: number;
      factura: { numero: string } | null;
    }>(page, 'selVentaDetalle', { ventaId: v.id });
    await expect(page.getByTestId('recibo-numero')).toHaveText(v.numero);
    await expect(page.getByTestId('recibo-total')).toHaveAttribute('data-valor', String(d.venta.total));
    await expect(page.getByTestId('recibo-linea')).toHaveCount(d.venta.lineas.length);
    await expect(page.getByTestId('recibo-documentos')).toContainText(d.factura!.numero);
    await expect(page.getByTestId('recibo-pagos')).toBeVisible();
    await expect(page.getByTestId('panel-rentabilidad')).toBeVisible();
    await expect(page.getByTestId('historial-venta').locator('li').first()).toContainText(v.numero);
    // El recibo tiene su descarga del documento electrónico.
    const [pdf] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('recibo-documentos').getByRole('button', { name: 'Descargar PDF' }).first().click(),
    ]);
    expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
    // Un id que no existe: estado de error con salida.
    await page.goto(`/panel/ventas/vt_no_existe?hoy=${HOY}T15:30`);
    await esperarDatos(page);
    await expect(page.getByText('No encontramos esa venta')).toBeVisible();
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test('anular pide el motivo, muestra lo que cambia y deja la venta fuera de los totales', async ({
    page,
    irA,
  }) => {
    test.setTimeout(90_000);
    await irA('/panel/ventas');
    await esperarDatos(page);
    const v = await crearVenta(page, { unidades: 2 });
    const antes = await sel<{ totales: Totales }>(page, 'selVentas', {
      desde: HOY,
      hasta: HOY,
      localId: 'todos',
    });
    const existenciaAntes = await page.evaluate(
      () =>
        (
          globalThis as unknown as {
            __kc: { estado: () => { agregados: { existencias: Record<string, number> } } };
          }
        ).__kc.estado().agregados.existencias,
    );
    await page.goto(`/panel/ventas/${v.ventaId}?hoy=${HOY}T15:30`);
    await esperarDatos(page);
    await page.getByTestId('accion-mas').click();
    await page.getByTestId('accion-anular').click();
    const dialogo = page.getByTestId('dialogo-anular');
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByTestId('consecuencias-anulacion')).toContainText(
      'Vuelven 2 prendas al inventario de Usaquén',
    );
    // Sin motivo no se anula.
    await dialogo.getByTestId('confirmar-anular').click();
    await expect(dialogo.getByText('Escribe el motivo de la anulación.')).toBeVisible();
    await dialogo.getByTestId('anular-motivo').fill('El cliente se arrepintió, prendas sin uso');
    await dialogo.getByTestId('confirmar-anular').click();
    await expect(page.getByText(`Venta ${v.numero} anulada.`)).toBeVisible();
    await expect(page.getByTestId('sello-anulada')).toBeVisible();
    // Efectos por selectores: la venta es "anulada", el inventario volvió y los totales del día bajaron.
    const d = await sel<{
      estado: string;
      venta: { anulacion: { motivo: string } | null; pagos: { tipo: string; medio: string }[] };
    }>(page, 'selVentaDetalle', { ventaId: v.ventaId });
    expect(d.estado).toBe('anulada');
    expect(d.venta.anulacion?.motivo).toContain('arrepintió');
    expect(d.venta.pagos.some((p) => p.tipo === 'reembolso' && p.medio === 'nequi')).toBe(true);
    const despues = await sel<{ totales: Totales }>(page, 'selVentas', {
      desde: HOY,
      hasta: HOY,
      localId: 'todos',
    });
    expect(despues.totales.ventas).toBe(antes.totales.ventas - v.total);
    const existenciaDespues = await page.evaluate(
      () =>
        (
          globalThis as unknown as {
            __kc: { estado: () => { agregados: { existencias: Record<string, number> } } };
          }
        ).__kc.estado().agregados.existencias,
    );
    const sumar = (m: Record<string, number>) =>
      Object.entries(m)
        .filter(([k]) => k.endsWith('@usq'))
        .reduce((a, [, n]) => a + n, 0);
    expect(sumar(existenciaDespues)).toBe(sumar(existenciaAntes) + 2);
    // La anulada ya no ofrece acciones de venta vigente.
    await expect(page.getByTestId('accion-devolucion')).toHaveCount(0);
    await expect(page.getByTestId('accion-editar')).toHaveCount(0);
  });

  test('editar corrige vendedor, canal y nota, y no deja guardar sin cambios', async ({ page, irA }) => {
    await irA('/panel/ventas');
    await esperarDatos(page);
    const v = await crearVenta(page);
    await page.goto(`/panel/ventas/${v.ventaId}?hoy=${HOY}T15:30`);
    await esperarDatos(page);
    await page.getByTestId('accion-editar').click();
    const dialogo = page.getByTestId('dialogo-editar');
    await expect(dialogo.getByTestId('confirmar-editar')).toBeDisabled();
    await dialogo.getByTestId('editar-canal').click();
    await page.getByRole('option', { name: 'WhatsApp' }).click();
    await dialogo.getByTestId('editar-nota').fill('Pedido por WhatsApp, entregado en el local');
    await dialogo.getByTestId('editar-medio-0').click();
    await page.getByRole('option', { name: 'Daviplata' }).click();
    await dialogo.getByTestId('confirmar-editar').click();
    await expect(page.getByText(`Guardamos los cambios de ${v.numero}.`)).toBeVisible();
    const d = await sel<{ venta: { canal: string; nota: string; pagos: { medio: string }[] } }>(
      page,
      'selVentaDetalle',
      { ventaId: v.ventaId },
    );
    expect(d.venta.canal).toBe('whatsapp');
    expect(d.venta.nota).toContain('WhatsApp');
    expect(d.venta.pagos[0]?.medio).toBe('daviplata');
    await expect(page.getByTestId('recibo-pagos')).toContainText('Daviplata');
  });

  test('un abono baja el saldo del separado y cancelarlo devuelve las prendas', async ({ page, irA }) => {
    test.setTimeout(90_000);
    await irA('/panel/ventas');
    await esperarDatos(page);
    const v = await crearVenta(page, { tipo: 'separado' });
    await page.goto(`/panel/ventas/${v.ventaId}?hoy=${HOY}T15:30`);
    await esperarDatos(page);
    const antes = await sel<{ saldo: number; estado: string }>(page, 'selVentaDetalle', {
      ventaId: v.ventaId,
    });
    expect(antes.estado).toBe('separado');
    await expect(page.getByTestId('panel-saldo')).toBeVisible();
    await expect(page.getByTestId('recibo-saldo')).toHaveAttribute('data-valor', String(antes.saldo));

    await page.getByTestId('accion-abonar').click();
    const abono = page.getByTestId('dialogo-abono');
    const valor = abono.getByTestId('abono-valor');
    await valor.click();
    await valor.fill('');
    await valor.pressSequentially('50000');
    await abono.getByTestId('abono-medio').click();
    await page.getByRole('option', { name: 'Nequi' }).click();
    await abono.getByTestId('confirmar-abono').click();
    await expect(page.getByText(/Abono de nequi registrado/)).toBeVisible();
    const despues = await sel<{ saldo: number }>(page, 'selVentaDetalle', { ventaId: v.ventaId });
    expect(despues.saldo).toBe(antes.saldo - 50_000);
    await expect(page.getByTestId('recibo-saldo')).toHaveAttribute(
      'data-valor',
      String(antes.saldo - 50_000),
    );

    // Cancelar: reembolso en nequi; la venta pasa a anulada y resta en la fecha de la cancelación.
    await page.getByTestId('accion-mas').click();
    await page.getByTestId('accion-cancelar-separado').click();
    const cancelar = page.getByTestId('dialogo-cancelar-separado');
    await cancelar.getByRole('radio', { name: /Reembolsar/ }).click();
    await cancelar.getByTestId('cancelar-medio').click();
    await page.getByRole('option', { name: 'Nequi' }).click();
    await cancelar.getByTestId('confirmar-cancelar-separado').click();
    await expect(page.getByText(`Separado ${v.numero} cancelado.`)).toBeVisible();
    const final = await sel<{ estado: string; venta: { separado: { cerrado: { resultado: string } } } }>(
      page,
      'selVentaDetalle',
      { ventaId: v.ventaId },
    );
    expect(final.estado).toBe('anulada');
    expect(final.venta.separado.cerrado.resultado).toBe('cancelado');
  });
});

test.describe('Ventas · cambios y devoluciones', () => {
  test('devolver prendas con factura: reingresa, reembolsa y emite la nota crédito', async ({
    page,
    irA,
  }) => {
    test.setTimeout(90_000);
    const errores = vigilarConsola(page);
    await irA('/panel/ventas');
    await esperarDatos(page);
    const v = await ventaConFactura(page);
    const antes = await sel<{
      venta: {
        lineas: { id: string; cantidad: number; totalFinal: number; varianteId: string }[];
        pagos: { valor: number }[];
        localId: string;
      };
    }>(page, 'selVentaDetalle', { ventaId: v.id });
    const linea = antes.venta.lineas[0]!;
    const existencia = (p: Page) =>
      p.evaluate(
        ([vid, local]) =>
          (
            globalThis as unknown as {
              __kc: { estado: () => { agregados: { existencias: Record<string, number> } } };
            }
          ).__kc.estado().agregados.existencias[`${vid}@${local}`] ?? 0,
        [linea.varianteId, antes.venta.localId] as const,
      );
    const stockAntes = await existencia(page);

    await page.goto(`/panel/ventas/${v.id}/devolucion?hoy=${HOY}T15:30`);
    await esperarDatos(page);
    // Sin elegir prendas no se registra.
    await page.getByTestId('registrar-devolucion').click();
    await expect(page.getByText('Elige al menos una prenda para devolver.')).toBeVisible();
    await page.getByTestId('mas-l0').click();
    await expect(page.getByTestId('resumen-unidades')).toHaveText('1');
    const esperado = linea.totalFinal;
    // La vista previa vale lo que valdrá la devolución (una unidad de la línea, proporcional).
    const valorMostrado = Number(await page.getByTestId('resumen-valor').getAttribute('data-valor'));
    expect(valorMostrado).toBe(linea.cantidad === 1 ? esperado : Math.round(esperado / linea.cantidad));
    await page.getByTestId('devolucion-detalle').fill('Le quedó grande');
    await page.getByTestId('registrar-devolucion').click();
    await expect(page.getByTestId('resultado-devolucion')).toBeVisible();
    await expect(page.getByTestId('resultado-nota-credito')).toContainText('Nota crédito');
    // Efectos por selectores.
    const d = await sel<{
      estado: string;
      devuelto: number;
      devoluciones: { numero: string; compensacion: string; notaCreditoId: string | null; motivo: string }[];
    }>(page, 'selVentaDetalle', { ventaId: v.id });
    expect(d.devoluciones).toHaveLength(1);
    expect(d.devoluciones[0]?.compensacion).toBe('reembolso');
    expect(d.devoluciones[0]?.notaCreditoId).toBeTruthy();
    expect(d.devoluciones[0]?.motivo).toContain('Le quedó grande');
    expect(d.devuelto).toBe(valorMostrado);
    expect(await existencia(page)).toBe(stockAntes + 1);
    await expect(page.getByTestId('resultado-numero')).toContainText(d.devoluciones[0]!.numero);
    // De vuelta en el recibo: la devolución aparece con su valor y la prenda marcada.
    await page.getByTestId('resultado-ver-venta').click();
    await expect(page.getByTestId('recibo-devoluciones')).toContainText(d.devoluciones[0]!.numero);
    await expect(page.getByTestId('linea-devuelta').first()).toBeVisible();
    await expect(page.getByTestId('recibo-total-neto')).toBeVisible();
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test('a un consumidor final se le reembolsa; el saldo a favor o el cambio piden registrarlo y abren el POS', async ({
    page,
    irA,
  }) => {
    test.setTimeout(90_000);
    await irA('/panel/ventas');
    await esperarDatos(page);
    const v = await crearVenta(page, { unidades: 2 });
    await page.goto(`/panel/ventas/${v.ventaId}/devolucion?hoy=${HOY}T15:30`);
    await esperarDatos(page);
    await page.getByTestId('devolver-todo').click();
    await expect(page.getByTestId('resumen-unidades')).toHaveText('2');
    await page.getByRole('radio', { name: /Cambio por otra prenda/ }).click();
    await expect(page.getByTestId('cliente-nuevo')).toBeVisible();
    // Sin datos del cliente no avanza; con datos incompletos tampoco.
    await page.getByTestId('registrar-devolucion').click();
    await expect(page.getByText('Escribe el nombre del cliente.')).toBeVisible();
    await page.getByTestId('cliente-nombres').fill('Camila');
    await page.getByTestId('cliente-apellidos').fill('Restrepo Gil');
    await page.getByTestId('cliente-celular').fill('3105550199');
    await page.getByRole('checkbox').last().click();
    await page.getByTestId('registrar-devolucion').click();
    await expect(page.getByTestId('resultado-devolucion')).toBeVisible();
    // El cliente quedó creado y asociado a la venta, con el valor como saldo a favor.
    const d = await sel<{
      venta: { clienteId: string | null };
      devoluciones: { compensacion: string; valorTotal: number }[];
    }>(page, 'selVentaDetalle', { ventaId: v.ventaId });
    expect(d.venta.clienteId).toBeTruthy();
    expect(d.devoluciones[0]?.compensacion).toBe('cambio');
    const ficha = await sel<{ metricas: { saldoAFavor: number } }>(page, 'selCliente', {
      clienteId: d.venta.clienteId,
      hoy: HOY,
    });
    expect(ficha.metricas.saldoAFavor).toBe(v.total);
    // El cambio abre el punto de venta.
    await page.getByTestId('resultado-abrir-pos').click();
    await expect(page).toHaveURL(/\/panel\/pos/);
  });

  test('una venta anulada o fuera de plazo no admite devolución y lo explica', async ({ page, irA }) => {
    await irA('/panel/ventas');
    await esperarDatos(page);
    const vieja = await page.evaluate(() => {
      const e = (
        globalThis as unknown as {
          __kc: {
            estado: () => {
              ventas: Record<string, { id: string; ts: string; tipo: string; anulacion: unknown }>;
            };
          };
        }
      ).__kc.estado();
      return Object.values(e.ventas).find((v) => v.ts < '2026-07-01' && v.tipo === 'contado' && !v.anulacion)!
        .id;
    });
    await page.goto(`/panel/ventas/${vieja}/devolucion?hoy=${HOY}T15:30`);
    await esperarDatos(page);
    await expect(page.getByTestId('devolucion-bloqueada')).toContainText('plazo de devolución es de 30');
  });
});

test.describe('Ventas · rol vendedor', () => {
  test('ve solo sus ventas, no edita ni anula y pide la anulación que el dueño aprueba', async ({
    page,
    irA,
  }) => {
    test.setTimeout(120_000);
    const errores = vigilarConsola(page);
    await irA('/panel/ventas');
    await esperarDatos(page);
    const v = await crearVenta(page, { vendedorId: 'em_scardenas' });
    await cambiarRol(page, 'vendedor');
    await page.goto(`/panel/ventas?hoy=${HOY}T15:30`);
    await esperarDatos(page);
    // Solo lo suyo: totales = selVentas de su vendedor y su local; sin controles de otro vendedor o local.
    const suyas = await sel<{ totales: Totales }>(page, 'selVentas', {
      desde: '2026-09-01',
      hasta: HOY,
      localId: 'usq',
      vendedorId: 'em_scardenas',
    });
    await esperarTotales(page, suyas.totales);
    await expect(page.getByTestId('filtro-local')).toHaveCount(0);
    await page.getByTestId('filtro-mas').click();
    await expect(page.getByTestId('filtro-vendedor')).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.goto(`/panel/ventas/${v.ventaId}?hoy=${HOY}T15:30`);
    await esperarDatos(page);
    await expect(page.getByTestId('accion-editar')).toHaveCount(0);
    await expect(page.getByTestId('panel-rentabilidad')).toHaveCount(0);
    await page.getByTestId('accion-mas').click();
    await expect(page.getByTestId('accion-anular')).toHaveCount(0);
    await page.getByTestId('accion-pedir-anulacion').click();
    const dialogo = page.getByTestId('dialogo-anular');
    await dialogo.getByTestId('anular-motivo').fill('Cobré dos veces la misma prenda');
    await dialogo.getByTestId('confirmar-anular').click();
    await expect(page.getByTestId('solicitud-anulacion')).toContainText('Pediste anular esta venta');
    // La venta sigue vigente y hay una solicitud pendiente.
    const vigente = await sel<{ estado: string }>(page, 'selVentaDetalle', { ventaId: v.ventaId });
    expect(vigente.estado).toBe('pagada');
    const pendientes = await sel<{ tipo: string; datos: { ventaId?: string } }[]>(
      page,
      'selSolicitudesPendientes',
    );
    expect(pendientes.some((s) => s.tipo === 'anulacion' && s.datos.ventaId === v.ventaId)).toBe(true);

    // El dueño la ve en la venta y la aprueba: queda anulada.
    await cambiarRol(page, 'dueno');
    await expect(page.getByTestId('solicitud-anulacion')).toContainText('pidió anular esta venta');
    await page.getByTestId('aprobar-solicitud').click();
    await page.getByRole('button', { name: 'Aprobar y anular' }).last().click();
    await expect(page.getByTestId('sello-anulada')).toBeVisible();
    const fin = await sel<{ estado: string }>(page, 'selVentaDetalle', { ventaId: v.ventaId });
    expect(fin.estado).toBe('anulada');
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test('el vendedor no abre las ventas de otro', async ({ page, irA }) => {
    await irA('/panel/ventas');
    await esperarDatos(page);
    const ajena = await page.evaluate(() => {
      const e = (
        globalThis as unknown as {
          __kc: { estado: () => { ventas: Record<string, { id: string; ts: string; vendedorId: string }> } };
        }
      ).__kc.estado();
      return Object.values(e.ventas).find((v) => v.ts >= '2026-09-20' && v.vendedorId !== 'em_scardenas')!.id;
    });
    await cambiarRol(page, 'vendedor');
    await page.goto(`/panel/ventas/${ajena}?hoy=${HOY}T15:30`);
    await esperarDatos(page);
    await expect(page.getByText('Esta venta no es tuya')).toBeVisible();
  });
});

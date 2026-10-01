import { abrir, abrirCelular, AHORA, aNumero, evaluar, expect, HOY, miles, sel, soloEscritorio1440, test, valorDe } from './comun';

/**
 * Flujo 2 (PROMPT fase 4, W9): una compra en la tienda web `/tienda` (otra pestaña, como la abre "Prueba esto") llega
 * al sistema con canal "Web": Ventas, inventario de Parque 93 (el local que despacha), Inicio, Canales y la app.
 */
const SLUG = 'camisa-de-popelina-blanca';
const desde30 = '2026-09-01';

test('venta en la tienda web: aparece con canal Web en Ventas, descuenta inventario y sube Inicio, Canales y la app', async ({ page, context }, info) => {
  soloEscritorio1440(info);
  // El dueño tiene Inicio abierto en una pestaña.
  await abrir(page, '/panel/inicio');
  const kpiAntes = await valorDe(page, 'kpi-ventas_hoy');
  const webAntes = (await sel<{ totales: { numVentas: number; netas: number } }>(page, 'selVentas', { desde: '2026-09-01', hasta: HOY, canal: 'web' })).totales;
  const guiaAntes = await evaluar(page, (kc) => (kc as unknown as { guia: { getState: () => { completados: string[] } } }).guia.getState().completados, null);
  expect(guiaAntes).not.toContain('tienda');

  // La tienda en otra pestaña: una camisa de una talla con existencias en Parque 93.
  const tienda = await context.newPage();
  await abrir(tienda, `/tienda/producto/${SLUG}?color=bla`);
  await expect(tienda.getByTestId('tienda-producto')).toBeVisible();
  const ex = await evaluar(
    tienda,
    (kc, slug: string) => {
      const e = kc.estado();
      const p = Object.values(e.productos).find((x) => x.slug === slug)!;
      const r: { talla: string; varianteId: string; existencia: number }[] = [];
      for (const v of Object.values(e.variantes) as unknown as { id: string; productoId: string; talla: string; colorId: string }[])
        if (v.productoId === p.id && v.colorId === 'col_bla') r.push({ talla: v.talla, varianteId: v.id, existencia: e.agregados.existencias[`${v.id}@p93`] ?? 0 });
      return { r, precio: p.precioVenta, referencia: p.referencia };
    },
    SLUG,
  );
  const elegida = ex.r.find((x) => x.existencia >= 2)!;
  expect(elegida).toBeTruthy();
  await tienda.getByTestId(`tienda-talla-${elegida.talla}`).getByRole('button').click();
  await tienda.getByRole('button', { name: /Agregar a la bolsa/i }).click();
  await tienda.getByTestId('tienda-cajon-pagar').click();
  await expect(tienda.getByTestId('tienda-pago')).toBeVisible();
  await tienda.getByTestId('tienda-datos-ejemplo').click();
  await tienda.getByRole('checkbox').click();
  await tienda.getByTestId('tienda-pagar').click();
  await expect(tienda.getByTestId('tienda-pedido-canal')).toHaveText('Web');
  const numero = (await tienda.getByTestId('tienda-pedido-venta').innerText()).trim();
  const href = (await tienda.getByTestId('tienda-ver-en-kippicore').getAttribute('href')) ?? '';
  const ventaId = /resaltar=([^&]+)/.exec(href)?.[1] ?? '';
  expect(ventaId).toMatch(/^vt_/);

  // Inicio (la otra pestaña, sin recargar): "Ventas de hoy" sube el valor de la compra y la guía la cuenta.
  await page.bringToFront();
  await expect.poll(() => valorDe(page, 'kpi-ventas_hoy'), { timeout: 15_000 }).toBe(kpiAntes + ex.precio);
  await expect
    .poll(() => evaluar(page, (kc) => (kc as unknown as { guia: { getState: () => { completados: string[] } } }).guia.getState().completados, null), { timeout: 15_000 })
    .toContain('tienda');

  // Ventas: "Verla en KippiCore" abre la venta resaltada con canal Web; el filtro por canal la incluye.
  await abrir(page, href);
  const fila = page.locator(`[data-fila="${ventaId}"]`);
  await expect(fila).toHaveAttribute('data-resaltada', 'true');
  await expect(fila).toContainText(numero);
  await expect(fila).toContainText('Web');
  await expect(fila).toContainText('Parque 93');
  await abrir(page, `/panel/ventas?canal=web&desde=${HOY}&hasta=${HOY}`);
  await expect(page.locator(`[data-fila="${ventaId}"]`)).toContainText(numero);
  const webHoy = (await sel<{ totales: { netas: number } }>(page, 'selVentas', { desde: HOY, hasta: HOY, canal: 'web' })).totales;
  await expect(page.getByTestId('valor-netas')).toContainText(miles(webHoy.netas));

  // Inventario: la talla vendida tiene una unidad menos en Parque 93.
  await abrir(page, `/panel/inventario/${ex.referencia}`);
  await page.getByTestId('matriz-local-p93').click();
  await expect(page.getByTestId(`celda-${elegida.varianteId}`)).toHaveAttribute('data-valor', String(elegida.existencia - 1));

  // Canales → Vista web: los pedidos web de los últimos 30 días incluyen la compra.
  const web30 = (await sel<{ totales: { numVentas: number } }>(page, 'selVentas', { desde: '2026-09-01', hasta: HOY, canal: 'web' })).totales;
  expect(web30.numVentas).toBe(webAntes.numVentas + 1);
  await abrir(page, '/panel/canales/web');
  const n30 = (await sel<{ totales: { numVentas: number } }>(page, 'selVentas', { desde: desde30, hasta: HOY, canal: 'web' })).totales.numVentas;
  expect(n30).toBeGreaterThan(0);
  const ventana = (await sel<{ totales: { numVentas: number } }>(page, 'selVentas', { desde: '2026-09-01', hasta: HOY, canal: 'web' })).totales.numVentas;
  await expect(page.getByTestId('canales-web-indicadores')).toContainText(`${ventana} pedidos`);

  // App del dueño: la venta web está en las últimas ventas y la cifra de hoy es la del escritorio.
  const kpi = (await sel<{ tarjetas: { id: string; valor: number }[] }>(page, 'selKpisInicio', { localId: 'todos', ahora: AHORA })).tarjetas.find((t) => t.id === 'ventas_hoy')!;
  const cel = await abrirCelular(context);
  await expect.poll(async () => aNumero((await cel.getByTestId('app-ventas-hoy').textContent()) ?? '')).toBe(kpi.valor);
  await expect(cel.getByTestId('app-ultimas-ventas').locator(`[data-venta="${ventaId}"]`)).toContainText(numero);
});

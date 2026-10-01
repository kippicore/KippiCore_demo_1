import { abrir, abrirCelular, AHORA, aNumero, cambiarLocal, cambiarRol, conHoy, expect, HOY, miles, sel, soloEscritorio1440, test, valorDe } from './comun';

/**
 * Flujo 7 (PROMPT fase 4, W8): el selector de local y el cambio de rol (dueño ↔ vendedor ↔ bodega) mandan en todo el
 * sistema: navegación, permisos, cifras y la franja de rol. La app del dueño sigue el mismo local.
 */
test('local y rol: cifras por local en todo el sistema; el vendedor y la bodega ven solo lo suyo, con la franja de rol', async ({ page, context }, info) => {
  soloEscritorio1440(info);
  await abrir(page, '/panel/inicio');
  await expect(page.getByTestId('franja-rol')).toHaveCount(0);

  // 1. Dueño con el local Usaquén: Inicio, Ventas, Inventario y Análisis filtran por ese local.
  await cambiarLocal(page, 'usq');
  await expect(page.getByTestId('selector-local')).toHaveAttribute('data-valor', 'usq');
  const kUsq = await sel<{ tarjetas: { id: string; valor: number }[] }>(page, 'selKpisInicio', { localId: 'usq', ahora: AHORA });
  await expect.poll(() => valorDe(page, 'kpi-ventas_hoy')).toBe(kUsq.tarjetas.find((t) => t.id === 'ventas_hoy')!.valor);

  await page.getByTestId('menu-ventas').click();
  await expect(page).toHaveURL(/\/panel\/ventas/);
  const v = await sel<{ totales: { netas: number } }>(page, 'selVentas', { desde: `${HOY.slice(0, 7)}-01`, hasta: HOY, localId: 'usq' });
  await expect(page.getByTestId('valor-netas')).toContainText(miles(v.totales.netas));
  const filas = page.getByTestId('ventas-tabla').locator('[data-fila]');
  await expect(filas.first()).toBeVisible();
  for (const t of await filas.allInnerTexts()) expect(t).not.toMatch(/Parque 93|Zona Rosa/);

  await page.getByTestId('menu-inventario').click();
  await expect(page).toHaveURL(/\/panel\/inventario/);
  await expect(page.getByTestId('tabla-catalogo')).toBeVisible();

  // La app del dueño, en el mismo navegador, está en Usaquén y su cifra es la del local.
  const cel = await abrirCelular(context, '/app');
  await expect(cel.getByTestId('pagina')).toContainText('Usaquén');
  const cifraUsq = await sel<{ tarjetas: { id: string; valor: number }[] }>(cel, 'selKpisInicio', { localId: 'usq', ahora: AHORA });
  await expect.poll(async () => aNumero((await cel.getByTestId('app-ventas-hoy').textContent()) ?? '')).toBe(cifraUsq.tarjetas.find((t) => t.id === 'ventas_hoy')!.valor);
  await cel.close();

  await abrir(page, '/panel/inicio');
  await cambiarLocal(page, 'todos');
  await expect(page.getByTestId('selector-local')).toHaveAttribute('data-valor', 'todos');

  // 2. Vendedor (Sebastián, Usaquén): franja de rol, su inicio es "Mi día", el local queda fijo y no entra a lo del dueño.
  await cambiarRol(page, 'vendedor');
  await expect(page).toHaveURL(/\/panel\/mi-dia/);
  await expect(page.getByTestId('franja-rol')).toContainText('Vendedor');
  await expect(page.getByTestId('franja-rol')).toContainText('Usaquén');
  await expect(page.getByTestId('selector-local')).toHaveAttribute('data-valor', 'usq');
  await expect(page.getByTestId('selector-local')).toHaveAttribute('aria-disabled', 'true');
  const menu = page.getByTestId('barra-lateral');
  for (const m of ['pagos', 'personal', 'importaciones', 'configuracion', 'analisis']) await expect(menu.getByTestId(`menu-${m}`)).toHaveCount(0);
  await expect(menu.getByTestId('menu-pos')).toBeVisible();
  // Cifras propias: ventas de hoy de Sebastián.
  const mi = await sel<{ ventasHoy: { netas: number } }>(page, 'selMiDia', { empleadoId: 'em_scardenas', ahora: AHORA });
  await expect(page.getByTestId('mi-dia-resumen')).toContainText(miles(mi.ventasHoy.netas));
  // Permisos: una pantalla del dueño por URL lo devuelve a su inicio con un aviso.
  await page.goto(conHoy('/panel/pagos'));
  await expect(page).toHaveURL(/\/panel\/mi-dia/);
  await expect(page.getByText('Esta sección es solo para el dueño.')).toBeVisible();
  // Ventas: solo las de su local, sin costos ni márgenes.
  await page.goto(conHoy('/panel/ventas'));
  await expect(page.getByTestId('ventas-tabla')).toBeVisible();
  await expect(page.getByTestId('pagina')).not.toContainText(/margen|costo/i);
  for (const t of await page.getByTestId('ventas-tabla').locator('[data-fila]').allInnerTexts()) expect(t).not.toMatch(/Parque 93|Zona Rosa/);

  // 3. Bodega: franja, su inicio es Inventario, ve la recepción y no ve ventas ni plata.
  await cambiarRol(page, 'bodega');
  await expect(page).toHaveURL(/\/panel\/inventario/);
  await expect(page.getByTestId('franja-rol')).toContainText('Bodega');
  for (const m of ['ventas', 'pos', 'pagos', 'personal', 'inicio']) await expect(page.getByTestId('barra-lateral').getByTestId(`menu-${m}`)).toHaveCount(0);
  // La bodega ve el precio de venta (para las etiquetas), nunca costos ni márgenes.
  await expect(page.getByTestId('pagina')).not.toContainText(/costo|margen/i);
  await page.goto(conHoy('/panel/ventas'));
  await expect(page).toHaveURL(/\/panel\/inventario/);

  // 4. De vuelta al dueño: sin franja, todo el menú y las cifras del negocio completo.
  await cambiarRol(page, 'dueno');
  await expect(page.getByTestId('selector-rol')).toHaveAttribute('data-valor', 'dueno');
  await abrir(page, '/panel/inicio');
  await expect(page.getByTestId('franja-rol')).toHaveCount(0);
  for (const m of ['pagos', 'personal', 'importaciones', 'configuracion', 'analisis', 'ventas']) await expect(page.getByTestId('barra-lateral').getByTestId(`menu-${m}`)).toBeVisible();
  const kTodos = await sel<{ tarjetas: { id: string; valor: number }[] }>(page, 'selKpisInicio', { localId: 'todos', ahora: AHORA });
  await expect.poll(() => valorDe(page, 'kpi-ventas_hoy')).toBe(kTodos.tarjetas.find((t) => t.id === 'ventas_hoy')!.valor);
});

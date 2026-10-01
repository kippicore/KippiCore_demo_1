import {
  abrir,
  abrirCelular,
  AHORA,
  aNumero,
  CHINO,
  evaluar,
  expect,
  HOY,
  miles,
  sel,
  sinDesborde,
  soloEscritorio1440,
  test,
  valorDe,
  venderEnPos,
} from './comun';

/**
 * Flujo 1 (PROMPT fase 4, W1): una venta en el POS → inventario del local → Ventas → Inicio → ficha del cliente →
 * comisión del vendedor → caja → Análisis → app del dueño. Se navega por las pantallas reales (los enlaces de "Lo que
 * acaba de pasar") y cada cifra se compara con su selector antes y después de la venta.
 */
test('venta en el POS: la siguen inventario, ventas, inicio, cliente, comisión, caja, análisis y la app del dueño', async ({ page, context }, info) => {
  soloEscritorio1440(info);
  await abrir(page, '/panel/pos');
  await expect(page.getByTestId('pos')).toBeVisible();

  const antes = await evaluar(
    page,
    (kc, a: { id: string; ahora: string; hoy: string }) => {
      const n = kc.sel('selNarrativa', { hoy: a.hoy }) as { clienteFrecuente: string };
      const sesion = kc.sel('selSesionAbierta', { localId: 'usq' }) as { id: string };
      const comision = (kc.sel('selComisiones', { mes: a.hoy.slice(0, 7), hoy: a.hoy }) as { empleadoId: string; base: number; comision: { total: number } }[]).find((c) => c.empleadoId === 'em_scardenas');
      return {
        cliente: n.clienteFrecuente,
        existencia: kc.estado().agregados.existencias[`${a.id}@usq`] ?? 0,
        kpiHoy: (kc.sel('selKpisInicio', { localId: 'todos', ahora: a.ahora }) as { tarjetas: { id: string; valor: number }[] }).tarjetas.find((t) => t.id === 'ventas_hoy')?.valor ?? 0,
        compras: (kc.sel('selCliente', { clienteId: n.clienteFrecuente, hoy: a.hoy }) as { metricas: { compras: number } }).metricas.compras,
        comision: comision?.comision.total ?? 0,
        base: comision?.base ?? 0,
        sesionId: sesion.id,
        esperado: (kc.sel('selResumenSesion', { sesionId: sesion.id }) as { esperado: number }).esperado,
        localUsq: (kc.sel('selDesempenoLocales', { desde: '2026-07-03', hasta: a.hoy }) as { localId: string; resumen: { netas: number } }[]).find((l) => l.localId === 'usq')?.resumen.netas ?? 0,
      };
    },
    { id: CHINO, ahora: AHORA, hoy: HOY },
  );
  expect(antes.cliente).toBe('cl_andres_gutierrez');

  // 1. POS: la venta (dueño en Usaquén, Nequi, Andrés Gutiérrez).
  const { ventaId, numero } = await venderEnPos(page);
  expect(numero).toMatch(/^V-\d{6}$/);
  const precio = await evaluar(page, (kc, id: string) => kc.estado().ventas[id]?.total ?? 0, ventaId);
  expect(precio).toBe(199_900);

  // Los enlaces "Ver" de "Lo que acaba de pasar" (se siguen uno por uno).
  const ver: Record<string, string> = {};
  for (const k of ['inventario', 'ventas_hoy', 'cliente', 'comision', 'caja']) ver[k] = (await page.getByTestId(`pos-ver-${k}`).getAttribute('href')) ?? '';
  expect(ver.cliente).toContain(`/panel/clientes/${antes.cliente}`);
  expect(ver.comision).toMatch(/\/panel\/personal\/comisiones.*empleado=em_scardenas/);
  expect(ver.caja).toContain(`resaltar=${antes.sesionId}`);

  // 2. Inventario del local: el enlace "Ver" lleva a la ficha con la celda resaltada y una unidad menos en Usaquén.
  await page.getByTestId('pos-ver-inventario').click();
  await expect(page).toHaveURL(/\/panel\/inventario\/HL-PAN-0305/);
  await expect(page.getByTestId('ficha-producto')).toBeVisible();
  await page.getByTestId('matriz-local-usq').click();
  await expect(page.getByTestId(`celda-${CHINO}`)).toHaveAttribute('data-valor', String(antes.existencia - 1));

  // 3. Ventas: la venta está arriba, resaltada, con su número y su total.
  await abrir(page, ver.ventas_hoy!);
  await expect(page).toHaveURL(new RegExp(`/panel/ventas\\?.*resaltar=${ventaId}`));
  const fila = page.locator(`[data-fila="${ventaId}"]`);
  await expect(fila).toHaveAttribute('data-resaltada', 'true');
  await expect(fila).toContainText(numero);
  await expect(fila).toContainText(miles(199_900));

  // 4. Inicio: "Ventas de hoy" sube exactamente el total de la venta.
  await abrir(page, '/panel/inicio');
  await expect.poll(() => valorDe(page, 'kpi-ventas_hoy')).toBe(antes.kpiHoy + 199_900);

  // 5. Ficha del cliente: una compra más y la venta en su historial.
  await abrir(page, ver.cliente!);
  await expect(page.getByTestId('tab-compras')).toContainText(String(antes.compras + 1));
  await expect(page.getByTestId('historial-compras').locator('tbody tr[data-fila]').first()).toContainText(numero);

  // 6. Comisión del vendedor: Sebastián gana el porcentaje de la venta sin IVA.
  const comision = await sel<{ empleadoId: string; base: number; comision: { total: number } }[]>(page, 'selComisiones', { mes: HOY.slice(0, 7), hoy: HOY });
  const sebas = comision.find((c) => c.empleadoId === 'em_scardenas')!;
  expect(sebas.base - antes.base).toBe(Math.round(199_900 / 1.19));
  expect(sebas.comision.total).toBeGreaterThan(antes.comision);
  await abrir(page, ver.comision!);
  await expect(page.getByTestId('personal-cajon-comision').getByTestId('personal-componente-porcentaje')).toHaveAttribute('data-valor', String(sebas.comision.total));

  // 7. Caja: el resumen de la sesión abierta de Usaquén lleva la venta por Nequi (el esperado en efectivo no cambia).
  const resumen = await sel<{ esperado: number; porMedio: Record<string, number> }>(page, 'selResumenSesion', { sesionId: antes.sesionId });
  expect(resumen.esperado).toBe(antes.esperado);
  await abrir(page, ver.caja!);
  await expect(page.getByTestId('caja-tarjeta-usq')).toContainText(miles(resumen.esperado));
  // ?resaltar=<sesión> abre el detalle de esa caja.
  expect(resumen.porMedio.nequi ?? 0).toBeGreaterThanOrEqual(199_900);
  await expect(page.getByTestId('caja-detalle')).toContainText('Nequi');
  await expect(page.getByTestId('caja-detalle')).toContainText(miles(resumen.porMedio.nequi ?? 0));

  // 8. Análisis → Locales (últimos 90 días, hasta hoy): Usaquén suma la venta. (La proyección del mes cuenta solo días
  //    completos: la venta de hoy entra mañana.)
  const locales = await sel<{ localId: string; resumen: { netas: number } }[]>(page, 'selDesempenoLocales', { desde: '2026-07-03', hasta: HOY });
  const usq = locales.find((l) => l.localId === 'usq')!.resumen.netas;
  expect(usq - antes.localUsq).toBe(199_900);
  await abrir(page, '/panel/analisis/locales');
  await expect(page.getByTestId('local-usq').locator('[data-valor]').first()).toHaveAttribute('data-valor', String(usq));

  // 9. App del dueño (390 × 844, mismo navegador): la venta aparece en Hoy y la cifra es la del escritorio.
  const kpi = (await sel<{ tarjetas: { id: string; valor: number }[] }>(page, 'selKpisInicio', { localId: 'todos', ahora: AHORA })).tarjetas.find((t) => t.id === 'ventas_hoy')!;
  const cel = await abrirCelular(context, '/app');
  await expect(cel.getByTestId('app-hoy')).toBeVisible();
  await expect.poll(async () => aNumero((await cel.getByTestId('app-ventas-hoy').textContent()) ?? '')).toBe(kpi.valor);
  await expect(cel.getByTestId('app-ultimas-ventas').locator(`[data-venta="${ventaId}"]`)).toContainText(numero);
  await cel.getByTestId('pestana-ventas').click();
  await expect(cel.getByTestId('app-lista-ventas').locator(`[data-venta="${ventaId}"]`).first()).toContainText(numero);
  expect(await sinDesborde(cel)).toBe(true);
});

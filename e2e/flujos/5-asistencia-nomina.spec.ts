import { abrir, abrirCelular, AHORA, cambiarRol, evaluar, expect, HOY, miles, sel, soloEscritorio1440, test, valorDe } from './comun';

/**
 * Flujo 5 (PROMPT fase 4, W6 y W8): el vendedor marca en "Mi día" → el reporte de asistencia del dueño la trae → la
 * liquidación de la nómina del periodo usa esas horas → al aprobarla quedan las cuentas por pagar → el flujo de caja
 * las descuenta en su semana (y la app del dueño muestra la nómina).
 */
interface Periodo {
  inicio: string;
  fin: string;
  tipo: 'quincenal' | 'mensual';
  etiqueta: string;
}
interface Linea {
  empleadoId: string;
  netoAPagar: number;
  insumos: { horasExtraDiurnas: number; horasExtraNocturnas: number; horasRecargoNocturno: number; horasDominicalFestivo: number };
}
interface Previa {
  liquidacion: { totales: { costo: number; neto: number }; lineas: Linea[] } | null;
}

test('marcación en "Mi día" → asistencia → nómina del periodo → por pagar → flujo de caja', async ({ page, context }, info) => {
  soloEscritorio1440(info);
  await abrir(page, '/panel/inicio');

  // 1. El vendedor (Sebastián, Usaquén) marca su salida desde "Mi día".
  await cambiarRol(page, 'vendedor');
  await expect(page).toHaveURL(/\/panel\/mi-dia/);
  await expect(page.getByTestId('franja-rol')).toBeVisible();
  await expect(page.getByTestId('marcacion-boton')).toContainText('Marcar salida');
  await page.getByTestId('marcacion-boton').click();
  await expect(page.getByText('Salida registrada')).toBeVisible();
  const marcacion = await evaluar(
    page,
    (kc, hoy: string) =>
      Object.values((kc.estado() as unknown as { marcaciones: Record<string, { empleadoId: string; tipo: string; ts: string; localId: string; medio: string }> }).marcaciones).find(
        (m) => m.empleadoId === 'em_scardenas' && m.ts.startsWith(hoy) && m.tipo === 'salida',
      ),
    HOY,
  );
  expect(marcacion).toMatchObject({ ts: `${HOY}T15:30:00`, localId: 'usq', medio: 'boton' });

  // 2. El dueño ve la marcación en el reporte de asistencia.
  await cambiarRol(page, 'dueno');
  await abrir(page, `/panel/personal/asistencia?empleado=em_scardenas&desde=${HOY}&hasta=${HOY}`);
  const fila = page.getByTestId('asistencia-tabla-dias').locator('tbody tr').first();
  await expect(fila).toContainText('Sebastián Cárdenas');
  await expect(fila).toContainText('3:30 p. m.');

  // 3. Nómina del periodo abierto: la vista previa usa las horas de la asistencia (mismas reglas, mismas marcaciones).
  await abrir(page, '/panel/personal/nomina');
  const periodo = (await sel<{ quincenal: Periodo }>(page, 'selPeriodoAbierto', { hoy: HOY })).quincenal;
  expect(periodo.fin).toBe(HOY);
  const previa = await sel<Previa>(page, 'selVistaPreviaNomina', { periodo, exoneracion: true, ahora: AHORA });
  await expect(page.getByTestId('personal-totales-periodo')).toHaveAttribute('data-costo', String(previa.liquidacion?.totales.costo));
  const asistencia = await sel<{ dias: { empleadoId: string; horasExtraDiurnas: number; horasExtraNocturnas: number; horasRecargoNocturno: number; horasDominicalFestivo: number }[] }>(
    page,
    'selAsistencia',
    { desde: periodo.inicio, hasta: periodo.fin, empleadoId: 'em_scardenas', ahora: AHORA },
  );
  const suma = (k: 'horasExtraDiurnas' | 'horasExtraNocturnas' | 'horasRecargoNocturno' | 'horasDominicalFestivo') =>
    Math.round(asistencia.dias.reduce((a, d) => a + d[k], 0) * 100) / 100;
  const sebas = previa.liquidacion!.lineas.find((l) => l.empleadoId === 'em_scardenas')!;
  for (const k of ['horasExtraDiurnas', 'horasExtraNocturnas', 'horasRecargoNocturno', 'horasDominicalFestivo'] as const)
    expect(Math.round(sebas.insumos[k] * 100) / 100, k).toBe(suma(k));

  // 4. Aprobar: la liquidación queda con exactamente la vista previa.
  await page.getByTestId('personal-aprobar').click();
  await page.getByTestId('personal-confirmar-aprobar').click();
  await expect(page).toHaveURL(/\/panel\/personal\/nomina\/lq_/);
  const liqId = page.url().match(/nomina\/([^?]+)/)?.[1] ?? '';
  const liq = await sel<{ estado: string; totales: { costo: number; neto: number }; lineas: Linea[] }>(page, 'selLiquidacion', { liquidacionId: liqId });
  expect(liq.estado).toBe('aprobada');
  expect(liq.totales.costo).toBe(previa.liquidacion?.totales.costo);

  // 5. Pagos → Por pagar: una cuenta por persona con su neto, que vence el último día del periodo.
  const netoSebas = liq.lineas.find((l) => l.empleadoId === 'em_scardenas')!.netoAPagar;
  await abrir(page, '/panel/pagos/por-pagar');
  const cxp = page.getByTestId('tabla-cxp').locator('[data-fila]').filter({ hasText: `Nómina ${periodo.etiqueta} · Sebastián` });
  await expect(cxp).toHaveCount(1);
  await expect(cxp).toContainText(miles(netoSebas));
  const porPagar = await sel<{ totalCop: number }>(page, 'selCuentasPorPagar', { hoy: HOY, estado: 'pendientes' });
  expect(await valorDe(page, 'cxp-total')).toBe(porPagar.totalCop);

  // 6. Flujo de caja: la semana de hoy descuenta la nómina aprobada (ya no la estimada) y la marca como fecha fija.
  const flujo = await sel<{ explicacion: string; semanas: { lunes: string; salidas: number }[] }>(page, 'selFlujoProyectado', { dias: 90, hoy: HOY, hora: '15:30' });
  await abrir(page, '/panel/pagos/flujo?semana=2026-09-28');
  const semana = page.getByTestId('pagos-semana');
  await expect(semana).toContainText(`Nómina ${periodo.etiqueta}`);
  await expect(semana.getByTestId('pago-semana').filter({ hasText: `Nómina ${periodo.etiqueta} · Sebastián` })).toContainText(miles(netoSebas));
  await expect(page.getByTestId('punto-bajo-explicacion')).toHaveText(flujo.explicacion);

  // 7. App del dueño: Nómina dice que el periodo ya está aprobado.
  const cel = await abrirCelular(context, '/app/mas/nomina');
  await expect(cel.getByTestId('app-nomina')).toContainText(periodo.etiqueta);
  await expect(cel.getByTestId('app-nomina')).toContainText(/aprobada/i);
});

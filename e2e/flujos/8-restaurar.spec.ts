import { abrir, abrirCelular, AHORA, aNumero, evaluar, expect, HOY, sel, soloEscritorio1440, test, valorDe, venderEnPos } from './comun';

/**
 * Flujo 8 (PROMPT fase 4): después de hacer cosas en varios módulos (venta en el POS, traslado, cambio de estado de
 * una importación, tasa nueva, gasto y cliente), "Restaurar datos de demostración" deja el estado inicial EXACTO
 * (misma huella), en esta pestaña y en la app del dueño.
 */
test('restaurar datos: tras acciones en varios módulos vuelve al estado inicial exacto (hash) en el escritorio y en la app', async ({ page, context }, info) => {
  soloEscritorio1440(info);
  await abrir(page, '/panel/inicio');
  const inicial = await evaluar(page, (kc) => kc.hashEstado(), null);
  const kpiInicial = await valorDe(page, 'kpi-ventas_hoy');

  // Acciones en distintos módulos, por la interfaz y por las acciones del dominio (las mismas que usa la interfaz).
  await abrir(page, '/panel/pos');
  await venderEnPos(page);
  const r = await evaluar(
    page,
    (kc, hoy: string) => {
      const e = kc.estado();
      const a = kc.acciones as Record<string, (d: unknown) => { ok: boolean; error?: { mensaje: string } }>;
      const v = Object.values(e.variantes).find((x) => (e.agregados.existencias[`${x.id}@zr`] ?? 0) > 3)!;
      const resultados = [
        a.solicitarTraslado!({ trasladoId: 'tr_e2e_flujo8', origenId: 'zr', destinoId: 'usq', lineas: [{ varianteId: v.id, cantidad: 2 }], motivo: 'Prueba del flujo 8', requiereAprobacion: false, solicitudId: null }),
        a.cambiarEstadoImportacion!({ importacionId: e.meta.narrativa.importacionEnPuerto, estado: 'en_nacionalizacion', fecha: hoy, nota: null, origen: 'panel', autor: null }),
        a.registrarTasa!({ tasaId: 'ts_e2e_flujo8', moneda: 'USD', fecha: hoy, valor: 4200 }),
      ];
      return resultados.map((x) => (x.ok ? 'ok' : (x.error?.mensaje ?? 'error')));
    },
    HOY,
  );
  expect(r).toEqual(['ok', 'ok', 'ok']);
  // La moneda de la sesión no es parte de los datos: se deja en US$ para ver que Restaurar no depende de ella.
  await abrir(page, '/panel/inicio');
  await page.getByTestId('moneda-USD').click();
  const cambios = await evaluar(page, (kc) => kc.datos.getState().registro.length, null);
  expect(cambios).toBeGreaterThanOrEqual(4);
  expect(await evaluar(page, (kc) => kc.hashEstado(), null)).not.toBe(inicial);

  // Configuración → Datos de la demo: cuenta los cambios y restaura con la palabra clave.
  await abrir(page, '/panel/configuracion/datos');
  await expect(page.getByTestId('datos-cambios')).toHaveText(String(cambios));
  await page.getByTestId('datos-restaurar-boton').click();
  const dlg = page.getByRole('alertdialog');
  await dlg.getByLabel('Escribe RESTAURAR para confirmar').fill('restaurar');
  await dlg.getByRole('button', { name: 'Restaurar datos de demostración' }).click();
  await expect.poll(() => evaluar(page, (kc) => kc.datos.getState().registro.length === 0 && !kc.datos.getState().reconstruyendo, null)).toBe(true);
  await expect(page.getByTestId('datos-estado-inicial')).toBeVisible();
  expect(await evaluar(page, (kc) => kc.hashEstado(), null)).toBe(inicial);
  expect(await evaluar(page, (kc) => kc.estado().traslados.tr_e2e_flujo8 ?? null, null)).toBeNull();
  expect(await sel<number>(page, 'selTasaVigente', { moneda: 'USD', fecha: HOY })).toBe(3950);

  // Inicio vuelve a la cifra de antes; la app del dueño (otra pestaña) arranca del estado inicial.
  await abrir(page, '/panel/inicio');
  await page.getByTestId('moneda-COP').click();
  await expect.poll(() => valorDe(page, 'kpi-ventas_hoy')).toBe(kpiInicial);
  const cel = await abrirCelular(context, '/app');
  expect(await evaluar(cel, (kc) => kc.hashEstado(), null)).toBe(inicial);
  const k = await sel<{ tarjetas: { id: string; valor: number }[] }>(cel, 'selKpisInicio', { localId: 'todos', ahora: AHORA });
  await expect.poll(async () => aNumero((await cel.getByTestId('app-ventas-hoy').textContent()) ?? '')).toBe(k.tarjetas.find((t) => t.id === 'ventas_hoy')!.valor);
  expect(k.tarjetas.find((t) => t.id === 'ventas_hoy')!.valor).toBe(kpiInicial);
});

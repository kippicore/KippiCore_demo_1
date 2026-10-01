import type { Page } from '@playwright/test';
import { conHoy, expect as expectBase, test } from '../fixtures';
import { esperarDatos as esperarDatosBase, type KcPagina } from '../kc';

/**
 * A1 · Punto de venta y caja (PLAN 9.4, W1 y W11). Solo se verifica la pantalla del paquete; los efectos en otros
 * módulos se leen con `window.__kc` (selectores), nunca navegando a pantallas ajenas (eso va en e2e/flujos).
 *
 *   PORT=4301 npx playwright test e2e/paquetes/pos.spec.ts --project=escritorio-1440 --project=escritorio-1366 --project=escritorio-1280 --workers=1
 */
const expect = expectBase.configure({ timeout: 15_000 });
const CHINO = 'va_pan_0305_are_32';

/** Con varios agentes en la misma máquina la construcción del estado puede tardar: margen holgado. */
const esperarDatos = (page: Page) => esperarDatosBase(page, 120_000);
test.beforeEach(({ browserName: _n }, info) => {
  info.setTimeout(240_000);
});
const HOY = '2026-09-30';

/** Ejecuta `fn(kc, arg)` dentro de la página (la función se serializa: no puede cerrar sobre variables). */
async function evaluar<T, A>(page: Page, fn: (kc: KcPagina, arg: A) => T | Promise<T>, arg: A): Promise<T> {
  return page.evaluate(`(${fn.toString()})(globalThis.__kc, ${JSON.stringify(arg)})`) as Promise<T>;
}

/** Errores de consola y de página (cada prueba exige que no haya ninguno). */
function vigilar(page: Page): string[] {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`console: ${m.text()}`);
  });
  return errores;
}

/** Solo los flujos funcionales largos se corren en 1440 y 1366 (1280 verifica el encaje y la caja). */
function omitirEn1280(info: { project: { name: string } }) {
  test.skip(info.project.name === 'escritorio-1280', 'El flujo funcional se verifica en 1440 y 1366.');
}

async function entrarAlPos(page: Page, irA: (ruta: string) => Promise<void>) {
  await irA('/panel/pos');
  await esperarDatos(page);
  await expect(page.getByTestId('pos')).toBeVisible();
}

async function cambiarRol(page: Page, rol: 'vendedor' | 'dueno') {
  await page.getByTestId('selector-rol').click();
  await page.getByTestId(`rol-${rol}`).click();
}

/** Busca el pantalón chino y toca la celda Arena · 32. */
async function agregarChino(page: Page) {
  const buscador = page.getByTestId('buscador-producto');
  await buscador.fill('HL-PAN-0305');
  await expect(page.getByRole('option').first()).toBeVisible();
  await buscador.press('Enter');
  await page.getByTestId(`pos-celda-${CHINO}`).click();
  await expect(page.getByTestId('pos-linea')).toHaveCount(1);
}

/** Escribe una cifra en un campo numérico (el campo se selecciona al enfocarse). */
async function escribirCifra(page: Page, testid: string, valor: string) {
  const campo = page.getByTestId(testid);
  await campo.click();
  await page.waitForTimeout(120);
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(valor);
}

async function elegirCliente(page: Page, texto: string, nombreCompleto: string) {
  await page.getByTestId('pos-cambiar-cliente').click();
  await page.getByTestId('buscador-cliente').fill(texto);
  await page.getByRole('option', { name: new RegExp(nombreCompleto) }).first().click();
  await expect(page.getByTestId('pos-cliente-nombre')).toContainText(nombreCompleto.split(' ')[0] ?? '');
}

const valorDe = async (page: Page, testid: string): Promise<number> => Number(await page.getByTestId(testid).locator('[data-valor]').last().getAttribute('data-valor'));

// ---------------------------------------------------------------------------------------------------------
// Encaje y teclado
// ---------------------------------------------------------------------------------------------------------
test('el POS completo (carrito y confirmar) cabe sin desplazamiento, también con pago dividido y como vendedor', async ({ page, irA }) => {
  const errores = vigilar(page);
  await entrarAlPos(page, irA);
  // Foco inicial en el buscador (teclado).
  await expect(page.getByTestId('buscador-producto')).toBeFocused();
  await agregarChino(page);
  await page.getByTestId('pos-dividir-pago').click();
  await escribirCifra(page, 'pos-valor-pago-0', '100000');
  await expect(page.getByTestId('pos-valor-pago-1')).toHaveValue(/99\.900/);

  const medir = async () =>
    page.evaluate(`(() => {
      const b = document.querySelector('[data-testid="pos-confirmar"]')?.getBoundingClientRect();
      return { sh: document.documentElement.scrollHeight, ih: window.innerHeight, sw: document.documentElement.scrollWidth, iw: window.innerWidth, fondo: b ? b.bottom : null, visible: !!b && b.top >= 0 };
    })()`) as Promise<{ sh: number; ih: number; sw: number; iw: number; fondo: number | null; visible: boolean }>;
  const dueno = await medir();
  expect(dueno.sh, 'sin desplazamiento vertical (dueño)').toBeLessThanOrEqual(dueno.ih);
  expect(dueno.sw).toBeLessThanOrEqual(dueno.iw);
  expect(dueno.visible).toBe(true);
  expect(dueno.fondo ?? 0).toBeLessThanOrEqual(dueno.ih);

  // El vendedor tiene la franja de rol de 36 px encima: el POS sigue cabiendo.
  await cambiarRol(page, 'vendedor');
  await expect(page.getByTestId('pos-vendedor-fijo')).toBeVisible();
  await expect(page.getByTestId('pos-confirmar')).toBeVisible();
  // La franja de rol baja en 200 ms: se espera a que termine antes de medir.
  await expect.poll(async () => (await medir()).sh - (await medir()).ih, { message: 'sin desplazamiento vertical (vendedor)' }).toBeLessThanOrEqual(0);
  const vendedor = await medir();
  expect(vendedor.fondo ?? 0).toBeLessThanOrEqual(vendedor.ih);
  expect(errores).toEqual([]);
});

test('buscar por código de barras: Enter con un EAN-13 completo agrega la prenda; Esc cierra el menú de cliente', async ({ page, irA }, info) => {
  omitirEn1280(info);
  const errores = vigilar(page);
  await entrarAlPos(page, irA);
  const ean = await evaluar(page, (kc, id: string) => (kc.estado().variantes[id] as unknown as { ean13: string }).ean13, CHINO);
  expect(ean).toMatch(/^\d{13}$/);
  const buscador = page.getByTestId('buscador-producto');
  await buscador.fill(ean);
  await buscador.press('Enter');
  await expect(page.getByTestId('pos-linea')).toHaveCount(1);
  await expect(page.getByTestId('pos-linea')).toHaveAttribute('data-variante', CHINO);
  await expect(page.getByTestId('pos-ultimo-escaneo')).toContainText('Pantalón chino elástico');
  // Enter con el mismo código otra vez suma una unidad (no duplica la línea).
  await buscador.fill(ean);
  await buscador.press('Enter');
  await expect(page.getByTestId('pos-linea')).toHaveCount(1);
  await expect(page.getByTestId('pos-cantidad')).toHaveText('2');
  expect(errores).toEqual([]);
});

test('"Simular escaneo" agrega una prenda con existencias en el local y la pista pos.escaneo existe', async ({ page, irA }, info) => {
  omitirEn1280(info);
  const errores = vigilar(page);
  await entrarAlPos(page, irA);
  const pista = page.getByTestId('pista-pos.escaneo');
  await expect(pista).toBeVisible();
  await page.getByTestId('pos-simular-escaneo').click();
  await expect(page.getByTestId('pos-linea')).toHaveCount(1);
  const varianteId = await page.getByTestId('pos-linea').getAttribute('data-variante');
  const hay = await evaluar(page, (kc, id: string) => kc.estado().agregados.existencias[`${id}@usq`] ?? 0, varianteId ?? '');
  expect(hay).toBeGreaterThan(0);
  await expect(page.getByTestId('pos-ultimo-escaneo')).toContainText('Escaneado');
  expect(errores).toEqual([]);
});

// ---------------------------------------------------------------------------------------------------------
// W1
// ---------------------------------------------------------------------------------------------------------
test('W1: una venta mixta (efectivo + Nequi) mueve inventario, ventas, comisión, cliente y caja, con cifras exactas', async ({ page, irA }, info) => {
  omitirEn1280(info);
  const errores = vigilar(page);
  await entrarAlPos(page, irA);

  const antes = await evaluar(
    page,
    (kc, id: string) => {
      const n = kc.sel('selNarrativa', { hoy: '2026-09-30' }) as { clienteFrecuente: string };
      const sesion = kc.sel('selSesionAbierta', { localId: 'usq' }) as { id: string };
      const ahora = '2026-09-30T23:59:59';
      return {
        existencia: kc.estado().agregados.existencias[`${id}@usq`] ?? 0,
        ventasHoy: (kc.sel('selVentasHoyHastaHora', { hoy: '2026-09-30', ahora, localId: 'todos' }) as { hoy: { netas: number } }).hoy.netas,
        compras: (kc.sel('selCliente', { clienteId: n.clienteFrecuente, hoy: '2026-09-30' }) as { metricas: { compras: number } }).metricas.compras,
        esperado: (kc.sel('selResumenSesion', { sesionId: sesion.id }) as { esperado: number }).esperado,
        numVentas: Object.keys(kc.estado().ventas).length,
      };
    },
    CHINO,
  );

  await agregarChino(page);
  await elegirCliente(page, 'Gutiérrez Mejía', 'Andrés Gutiérrez Mejía');
  await page.getByTestId('pos-dividir-pago').click();
  await escribirCifra(page, 'pos-valor-pago-0', '100000');
  await expect(page.getByTestId('pos-valor-pago-1')).toHaveValue(/99\.900/);
  await expect(page.getByTestId('pos-medio-pago-1')).toContainText('Nequi');
  // El total en pantalla es el del motor: $ 199.900 (sin descuento), base y IVA desglosados.
  await expect(page.getByTestId('pos-total').locator('[data-valor]')).toHaveAttribute('data-valor', '199900');
  await expect(page.getByTestId('pos-subtotal')).toContainText('31.917');

  await page.getByTestId('pos-confirmar').click();
  await expect(page.getByTestId('pos-exito')).toBeVisible();
  await expect(page.getByTestId('pos-venta-numero')).toHaveText(/^V-\d{6}$/);

  // Cinco efectos: inventario, ventas de hoy, comisión, cliente y caja.
  for (const clave of ['inventario', 'ventas_hoy', 'comision', 'cliente', 'caja']) await expect(page.getByTestId(`pos-efecto-${clave}`)).toBeVisible();
  await expect(page.getByTestId('pos-efecto-comision')).toContainText('sobre la venta sin IVA');
  await expect(page.getByTestId('pos-efecto-caja-medios')).toContainText('Efectivo');
  await expect(page.getByTestId('pos-efecto-caja-medios')).toContainText('Nequi');

  // Después de 900 ms rodando, cada cifra llega a su valor exacto (antes → después) y coincide con los selectores.
  const despues = await evaluar(
    page,
    (kc, id: string) => {
      const n = kc.sel('selNarrativa', { hoy: '2026-09-30' }) as { clienteFrecuente: string };
      const sesion = kc.sel('selSesionAbierta', { localId: 'usq' }) as { id: string };
      return {
        existencia: kc.estado().agregados.existencias[`${id}@usq`] ?? 0,
        ventasHoy: (kc.sel('selVentasHoyHastaHora', { hoy: '2026-09-30', ahora: '2026-09-30T23:59:59', localId: 'todos' }) as { hoy: { netas: number } }).hoy.netas,
        compras: (kc.sel('selCliente', { clienteId: n.clienteFrecuente, hoy: '2026-09-30' }) as { metricas: { compras: number } }).metricas.compras,
        esperado: (kc.sel('selResumenSesion', { sesionId: sesion.id }) as { esperado: number }).esperado,
        numVentas: Object.keys(kc.estado().ventas).length,
        eventos: kc.eventosDominio().map((e) => e.tipo),
      };
    },
    CHINO,
  );
  expect(despues.numVentas).toBe(antes.numVentas + 1);
  expect(despues.existencia).toBe(antes.existencia - 1);
  expect(despues.ventasHoy - antes.ventasHoy).toBe(199_900);
  expect(despues.compras).toBe(antes.compras + 1);
  expect(despues.esperado - antes.esperado).toBe(100_000);
  expect(despues.eventos).toContain('VentaRegistrada');

  await expect(page.getByTestId('pos-efecto-inventario-cifras').locator('[data-valor]')).toHaveAttribute('data-valor', String(despues.existencia), { timeout: 5_000 });
  await expect.poll(() => valorDe(page, 'pos-efecto-ventas_hoy-cifras'), { timeout: 5_000 }).toBe(despues.ventasHoy);
  await expect.poll(() => valorDe(page, 'pos-efecto-cliente-cifras'), { timeout: 5_000 }).toBe(despues.compras);
  await expect.poll(() => valorDe(page, 'pos-efecto-caja-cifras'), { timeout: 5_000 }).toBe(despues.esperado);
  // La comisión sube y el total de la venta cuenta hasta $ 199.900.
  expect(await valorDe(page, 'pos-efecto-comision-cifras')).toBeGreaterThan(0);
  await expect.poll(() => valorDe(page, 'pos-exito-total'), { timeout: 5_000 }).toBe(199_900);

  // Cada "Ver" lleva al módulo con la fila cambiada resaltada (?resaltar=).
  const ventaId = await evaluar(page, (kc) => (kc.datos.getState().registro.at(-1) as unknown as { comando: { datos: { ventaId: string } } }).comando.datos.ventaId, null);
  await expect(page.getByTestId('pos-ver-ventas_hoy')).toHaveAttribute('href', new RegExp(`/panel/ventas\\?.*resaltar=${ventaId}`));
  await expect(page.getByTestId('pos-ver-inventario')).toHaveAttribute('href', /\/panel\/inventario\/HL-PAN-0305.*resaltar=va_pan_0305_are_32/);
  await expect(page.getByTestId('pos-ver-cliente')).toHaveAttribute('href', /\/panel\/clientes\/cl_andres_gutierrez/);
  await expect(page.getByTestId('pos-ver-comision')).toHaveAttribute('href', /\/panel\/personal\/comisiones.*empleado=em_scardenas/);
  await expect(page.getByTestId('pos-ver-caja')).toHaveAttribute('href', /\/panel\/pos\/caja.*resaltar=sc_/);

  // Documento POS electrónico (simulado): se emite y queda descargable; la factura ya no se ofrece.
  await page.getByTestId('pos-emitir-pos').click();
  await expect(page.getByTestId('pos-documento-emitido')).toContainText('Documento POS electrónico');
  await expect(page.getByTestId('pos-emitir-factura')).toHaveCount(0);
  const factura = await evaluar(page, (kc, id: string) => (kc.estado().ventas[id] as unknown as { facturaId: string | null }).facturaId, ventaId);
  expect(factura).not.toBeNull();

  // "Nueva venta" (atajo N) deja el POS listo con el foco en el buscador.
  await page.keyboard.press('n');
  await expect(page.getByTestId('pos-exito')).toHaveCount(0);
  await expect(page.getByTestId('pos-carrito-vacio')).toBeVisible();
  await expect(page.getByTestId('buscador-producto')).toBeFocused();
  expect(errores).toEqual([]);
});

test('W1 con rol vendedor: la venta queda a su nombre y no ve el efectivo esperado ni las ventas de los otros locales', async ({ page, irA }, info) => {
  omitirEn1280(info);
  const errores = vigilar(page);
  await entrarAlPos(page, irA);
  await cambiarRol(page, 'vendedor');
  await expect(page.getByTestId('pos-vendedor-fijo')).toContainText('Sebastián');
  await agregarChino(page);
  await page.getByTestId('pos-medio-nequi').click();
  await page.getByTestId('pos-confirmar').click();
  await expect(page.getByTestId('pos-exito')).toBeVisible();
  await expect(page.getByTestId('pos-efecto-ventas_hoy_local')).toBeVisible();
  await expect(page.getByTestId('pos-efecto-ventas_hoy')).toHaveCount(0);
  await expect(page.getByTestId('pos-efecto-caja-cifras')).toHaveCount(0);
  await expect(page.getByTestId('pos-efecto-caja-medios')).toContainText('Nequi');
  const v = await evaluar(page, (kc) => {
    const id = (kc.datos.getState().registro.at(-1) as unknown as { comando: { datos: { ventaId: string } } }).comando.datos.ventaId;
    return kc.estado().ventas[id] as unknown as { vendedorId: string; localId: string; pagos: { medio: string }[] };
  }, null);
  expect(v).toMatchObject({ vendedorId: 'em_scardenas', localId: 'usq' });
  expect(v.pagos.map((p) => p.medio)).toEqual(['nequi']);
  expect(errores).toEqual([]);
});

test('descuento global y por línea: los totales en pantalla son los de la regla de dominio', async ({ page, irA }, info) => {
  omitirEn1280(info);
  const errores = vigilar(page);
  await entrarAlPos(page, irA);
  await agregarChino(page);
  // 10 % global sobre $ 199.900 → $ 179.910 (IVA incluido).
  await page.getByTestId('pos-descuento-global').click();
  await page.getByTestId('pos-descuento-valor').click();
  await page.keyboard.type('10');
  await page.getByTestId('pos-descuento-aplicar').click();
  await expect(page.getByTestId('pos-total').locator('[data-valor]')).toHaveAttribute('data-valor', '179910');
  // Descuento de la línea en valor: $ 20.000 → 199.900 − 20.000 = 179.900 (reemplaza al global quitándolo).
  await page.getByTestId('pos-descuento-global').click();
  await page.getByTestId('pos-form-descuento').getByRole('button', { name: 'Quitar' }).click();
  await page.getByTestId('pos-descuento-linea').click();
  await page.getByRole('radio', { name: 'Valor en pesos' }).click();
  await page.getByTestId('pos-descuento-valor').click();
  await page.keyboard.type('20000');
  await page.getByTestId('pos-descuento-aplicar').click();
  await expect(page.getByTestId('pos-total').locator('[data-valor]')).toHaveAttribute('data-valor', '179900');
  // El total coincide con el que calcula la regla de dominio sobre las mismas líneas.
  const esperado = await evaluar(
    page,
    (kc, id: string) => {
      const v = kc.estado().variantes[id] as unknown as { productoId: string };
      const p = kc.estado().productos[v.productoId] as unknown as { precioVenta: number };
      return p.precioVenta - 20_000;
    },
    CHINO,
  );
  expect(esperado).toBe(179_900);
  expect(errores).toEqual([]);
});

test('separado: pide cliente, propone el abono mínimo del 20 % y deja la mercancía reservada', async ({ page, irA }, info) => {
  omitirEn1280(info);
  const errores = vigilar(page);
  await entrarAlPos(page, irA);
  await agregarChino(page);
  await page.getByTestId('pos-tipo-separado').click();
  await expect(page.getByTestId('pos-confirmar')).toBeDisabled();
  await expect(page.getByTestId('pos-motivo')).toContainText('cliente');
  await elegirCliente(page, 'Gutiérrez Mejía', 'Andrés Gutiérrez Mejía');
  await expect(page.getByTestId('pos-abono')).toHaveValue(/40\.000/);
  await expect(page.getByTestId('pos-confirmar')).toBeEnabled();
  // Un abono por debajo del mínimo bloquea.
  await escribirCifra(page, 'pos-abono', '10000');
  await expect(page.getByTestId('pos-confirmar')).toBeDisabled();
  await escribirCifra(page, 'pos-abono', '50000');
  await page.getByTestId('pos-medio-nequi').click();
  await page.getByTestId('pos-confirmar').click();
  await expect(page.getByTestId('pos-exito')).toBeVisible();
  const v = await evaluar(page, (kc) => {
    const id = (kc.datos.getState().registro.at(-1) as unknown as { comando: { datos: { ventaId: string } } }).comando.datos.ventaId;
    return kc.estado().ventas[id] as unknown as { tipo: string; separado: { fechaLimite: string } | null; pagos: { valor: number }[]; total: number };
  }, null);
  expect(v.tipo).toBe('separado');
  expect(v.pagos.reduce((a, p) => a + p.valor, 0)).toBe(50_000);
  expect(v.separado?.fechaLimite).toBe('2026-10-15');
  expect(errores).toEqual([]);
});

test('cliente nuevo en la misma venta: autorización de datos obligatoria y se crea con la venta', async ({ page, irA }, info) => {
  omitirEn1280(info);
  const errores = vigilar(page);
  await entrarAlPos(page, irA);
  await agregarChino(page);
  await page.getByTestId('pos-crear-cliente').click();
  await expect(page.getByTestId('pos-dialogo-cliente')).toBeVisible();
  await page.getByTestId('pos-cliente-guardar').click();
  await expect(page.getByTestId('pos-form-cliente')).toContainText('Escribe el nombre del cliente');
  await expect(page.getByTestId('pos-form-cliente')).toContainText('celular de 10 dígitos');
  await expect(page.getByTestId('pos-form-cliente')).toContainText('autorización de tratamiento de datos');
  await page.getByTestId('pos-cliente-nombres').fill('Laura');
  await page.getByTestId('pos-cliente-apellidos').fill('Prueba Uno');
  await page.getByTestId('pos-cliente-celular').fill('3001234999');
  await page.getByText('El cliente autoriza el tratamiento').click();
  await page.getByTestId('pos-cliente-guardar').click();
  await expect(page.getByTestId('pos-cliente-nombre')).toContainText('Laura Prueba Uno');
  await page.getByTestId('pos-medio-nequi').click();
  await page.getByTestId('pos-confirmar').click();
  await expect(page.getByTestId('pos-exito')).toBeVisible();
  await expect(page.getByTestId('pos-efecto-cliente')).toContainText('cliente nuevo');
  const nuevo = await evaluar(page, (kc) => (Object.values((kc.estado() as unknown as { clientes: Record<string, { celular: string; autorizacionDatos: { aceptada: boolean }; canalAlta: string }> }).clientes).find((x) => x.celular === '3001234999') ?? null), null);
  expect(nuevo).toMatchObject({ autorizacionDatos: { aceptada: true }, canalAlta: 'pos' });
  expect(errores).toEqual([]);
});

// ---------------------------------------------------------------------------------------------------------
// Aprobaciones, bonos, caja cerrada y devoluciones
// ---------------------------------------------------------------------------------------------------------
test('descuento > 15 % como vendedor: pide aprobación, queda pendiente y se habilita al aprobarse', async ({ page, irA }, info) => {
  omitirEn1280(info);
  const errores = vigilar(page);
  await entrarAlPos(page, irA);
  await cambiarRol(page, 'vendedor');
  await agregarChino(page);
  await page.getByTestId('pos-medio-nequi').click();
  // 20 % global: pasa del máximo del vendedor.
  await page.getByTestId('pos-descuento-global').click();
  await page.getByTestId('pos-descuento-valor').click();
  await page.keyboard.type('20');
  await page.getByTestId('pos-descuento-aplicar').click();
  await expect(page.getByTestId('pos-descuento-supera')).toContainText('pasa del 15');
  await expect(page.getByTestId('pos-confirmar')).toBeDisabled();
  await page.getByTestId('pos-pedir-aprobacion').click();
  await page.getByTestId('pos-aprobacion-motivo').fill('Cliente frecuente, lleva varias prendas');
  await page.getByTestId('pos-enviar-aprobacion').click();
  await expect(page.getByTestId('pos-aviso-descuento')).toContainText('Esperando al dueño');
  await expect(page.getByTestId('pos-confirmar')).toBeDisabled();
  // El dueño aprueba (desde la app o el escritorio): aquí con su acción.
  const solicitudId = await evaluar(
    page,
    (kc) => {
      const todas = (kc.estado() as unknown as { solicitudes: Record<string, { id: string; tipo: string; datos: { motivo?: string } }> }).solicitudes;
      return Object.values(todas).find((x) => x.tipo === 'descuento' && x.datos.motivo === 'Cliente frecuente, lleva varias prendas')?.id ?? '';
    },
    null,
  );
  expect(solicitudId).toMatch(/^so_/);
  const r = await evaluar(page, (kc, id: string) => (kc.acciones.resolverAprobacion as (d: unknown) => { ok: boolean })({ solicitudId: id, decision: 'aprobada', nota: null }).ok, solicitudId);
  expect(r).toBe(true);
  await expect(page.getByTestId('pos-aviso-descuento')).toContainText('aprobó');
  await expect(page.getByTestId('pos-confirmar')).toBeEnabled();
  await page.getByTestId('pos-confirmar').click();
  await expect(page.getByTestId('pos-exito')).toBeVisible();
  const v = await evaluar(page, (kc) => {
    const id = (kc.datos.getState().registro.at(-1) as unknown as { comando: { datos: { ventaId: string } } }).comando.datos.ventaId;
    return kc.estado().ventas[id] as unknown as { aprobacionDescuentoId: string | null; descuentos: number };
  }, null);
  expect(v.aprobacionDescuentoId).toBe(solicitudId);
  expect(v.descuentos).toBeGreaterThan(0);
  expect(errores).toEqual([]);
});

test('bono de regalo: se vende (queda como plata por anticipado) y se redime como medio de pago con su saldo', async ({ page, irA }, info) => {
  omitirEn1280(info);
  const errores = vigilar(page);
  await entrarAlPos(page, irA);
  await page.getByTestId('pos-abrir-bono').click();
  await escribirCifra(page, 'pos-bono-valor', '300000');
  await page.getByTestId('pos-bono-vender').click();
  const codigo = (await page.getByTestId('pos-bono-codigo-vendido').textContent())?.trim() ?? '';
  expect(codigo).toMatch(/^BR-\d{6}$/);
  await page.getByTestId('pos-bono-listo').click();
  // Redime $ 199.900 de ese bono.
  await agregarChino(page);
  await page.getByTestId('pos-medio-mas').click();
  await page.getByTestId('pos-medio-bono_regalo').click();
  await page.getByTestId('pos-bono-codigo').fill(codigo);
  await expect(page.getByTestId('pos-bono-saldo')).toContainText('300.000');
  await page.getByTestId('pos-confirmar').click();
  await expect(page.getByTestId('pos-exito')).toBeVisible();
  const saldo = await evaluar(page, (kc, c: string) => (kc.sel('selBonos', { hoy: '2026-09-30' }) as { codigo: string; saldo: number }[]).find((b) => b.codigo === c)?.saldo, codigo);
  expect(saldo).toBe(100_100);
  expect(errores).toEqual([]);
});

test('sin caja abierta: cobrar en efectivo bloquea y se ofrece abrir la caja en el mismo flujo', async ({ page }, info) => {
  omitirEn1280(info);
  const errores = vigilar(page);
  // A las 9:00 de la mañana las tres cajas de hoy todavía no se abren.
  await page.context().clearCookies();
  await page.goto(conHoy('/panel/pos', `${HOY}T09:00`));
  await esperarDatos(page);
  await expect(page.getByTestId('pos-estado-caja')).toHaveAttribute('data-estado', 'sin_abrir');
  await agregarChino(page);
  await expect(page.getByTestId('pos-confirmar')).toBeDisabled();
  await expect(page.getByTestId('pos-motivo')).toContainText('Abre la caja');
  await expect(page.getByTestId('pos-aviso-caja')).toBeVisible();
  await page.getByTestId('pos-abrir-caja-aviso').click();
  await expect(page.getByTestId('pos-base-inicial')).toHaveValue(/300\.000/);
  await page.getByTestId('pos-abrir-caja-confirmar').click();
  await expect(page.getByTestId('pos-estado-caja')).toHaveAttribute('data-estado', 'abierta');
  await expect(page.getByTestId('pos-confirmar')).toBeEnabled();
  await page.getByTestId('pos-confirmar').click();
  await expect(page.getByTestId('pos-exito')).toBeVisible();
  const sesion = await evaluar(page, (kc) => kc.sel('selSesionAbierta', { localId: 'usq' }) as { abierta: { baseInicial: number } } | null, null);
  expect(sesion?.abierta.baseInicial).toBe(300_000);
  expect(errores).toEqual([]);
});

test('cambios y devoluciones: se busca la venta por número y se abre su pantalla de devolución', async ({ page, irA }, info) => {
  omitirEn1280(info);
  const errores = vigilar(page);
  await entrarAlPos(page, irA);
  const venta = await evaluar(
    page,
    (kc) => {
      const f = (kc.sel('selVentas', { desde: '2026-09-30', hasta: '2026-09-30', localId: 'usq' }) as { filas: { id: string; numero: string; estado: string }[] }).filas.find((x) => x.estado === 'pagada');
      return f ?? null;
    },
    null,
  );
  expect(venta).not.toBeNull();
  await page.getByTestId('pos-abrir-devoluciones').click();
  await page.getByTestId('pos-devolucion-buscar').fill(venta?.numero ?? '');
  await expect(page.getByTestId('pos-devolucion-fila')).toHaveCount(1);
  await page.getByTestId('pos-devolucion-abrir').click();
  await expect(page).toHaveURL(new RegExp(`/panel/ventas/${venta?.id}/devolucion`));
  expect(errores).toEqual([]);
});

// ---------------------------------------------------------------------------------------------------------
// Caja (W11)
// ---------------------------------------------------------------------------------------------------------
test('W11: el dueño ve los cierres de anoche (Zona Rosa con faltante), abre el detalle y lo marca como revisado con una nota', async ({ page, irA }) => {
  const errores = vigilar(page);
  await irA('/panel/pos/caja');
  await esperarDatos(page);
  const sesionFaltante = await evaluar(page, (kc) => (kc.sel('selNarrativa', { hoy: '2026-09-30' }) as { sesionCajaFaltante: string }).sesionCajaFaltante, null);
  // Por defecto, el último día con cierres: anoche.
  await expect(page.getByTestId('caja-dia-2026-09-29')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('caja-tarjeta-zr')).toContainText('Zona Rosa');
  await expect(page.getByTestId('caja-resultado-zr')).toContainText('Faltan');
  await expect(page.getByTestId('caja-resultado-zr')).toContainText('40.000');
  await expect(page.getByTestId('caja-resultado-usq')).toContainText('Cuadró');
  await expect(page.getByTestId('caja-resultado-p93')).toContainText('Cuadró');
  await expect(page.getByTestId('caja-por-revisar')).toHaveText('3');
  await expect(page.getByTestId('caja-diferencia-total')).toContainText('40');
  // Hoy: las tres cajas siguen abiertas.
  await page.getByTestId(`caja-dia-${HOY}`).click();
  await expect(page.getByTestId('caja-tarjeta-usq')).toHaveAttribute('data-estado', 'abierta');
  await page.getByTestId('caja-dia-2026-09-29').click();

  await page.getByTestId('caja-tarjeta-zr').click();
  await expect(page.getByTestId('caja-detalle')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`sesion=${sesionFaltante}`));
  await expect(page.getByTestId('caja-detalle-esperado')).toContainText('360.000');
  await expect(page.getByTestId('caja-detalle-contado')).toContainText('320.000');
  await expect(page.getByTestId('caja-detalle-diferencia')).toContainText('40.000');
  await expect(page.getByTestId('caja-detalle-medios')).toContainText('Total vendido');
  await page.getByTestId('caja-nota-revision').fill('Hablé con Natalia; se descuenta del cambio de mañana');
  await page.getByTestId('caja-marcar-revisado').click();
  await expect(page.getByTestId('caja-revision-nota')).toContainText('se descuenta del cambio de mañana');
  const r = await evaluar(page, (kc, id: string) => ({ revision: ((kc.estado() as unknown as { sesionesCaja: Record<string, { revision: { nota: string } | null }> }).sesionesCaja[id])?.revision, eventos: kc.eventosDominio().map((e) => e.tipo) }), sesionFaltante);
  expect(r.revision?.nota).toBe('Hablé con Natalia; se descuenta del cambio de mañana');
  expect(r.eventos).toContain('CierreRevisado');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('caja-detalle')).toHaveCount(0);
  await expect(page.getByTestId('caja-tarjeta-zr')).toHaveAttribute('data-estado', 'revisada');
  await expect(page.getByTestId('caja-por-revisar')).toHaveText('2');
  expect(errores).toEqual([]);
});

test('caja: ?sesion= abre el detalle de ese cierre y ?resaltar= resalta su fila o tarjeta', async ({ page }) => {
  const errores = vigilar(page);
  await page.context().clearCookies();
  await page.goto(conHoy('/panel/pos/caja?sesion=sc_g_20260929_p93'));
  await esperarDatos(page);
  await expect(page.getByTestId('caja-detalle')).toBeVisible();
  await expect(page.getByTestId('caja-detalle')).toContainText('Parque 93');
  await page.keyboard.press('Escape');
  await page.goto(conHoy('/panel/pos/caja?resaltar=sc_g_20260929_usq'));
  await esperarDatos(page);
  // La tarjeta de Usaquén (y su fila del historial) destellan; las otras no.
  await expect(page.locator('[data-resaltada="true"]').filter({ has: page.getByTestId('caja-tarjeta-usq') })).toHaveCount(1);
  await expect(page.locator('[data-resaltada="true"]').filter({ has: page.getByTestId('caja-tarjeta-zr') })).toHaveCount(0);
  // Una sesión que no existe no rompe la pantalla.
  await page.goto(conHoy('/panel/pos/caja?sesion=sc_no_existe'));
  await esperarDatos(page);
  await expect(page.getByTestId('caja-detalle')).toContainText('No encontramos esa caja');
  expect(errores).toEqual([]);
});

test('caja del día: egreso, arqueo por denominación y cierre; el dueño ve el esperado mientras cuenta y la pista caja.arqueo existe', async ({ page, irA }, info) => {
  omitirEn1280(info);
  const errores = vigilar(page);
  await irA('/panel/pos/caja');
  await esperarDatos(page);
  await page.getByTestId('caja-pestana-caja').click();
  await expect(page.getByTestId('caja-abierta')).toBeVisible();
  await expect(page.getByTestId('caja-esperado-visible')).toBeVisible();
  await expect(page.getByTestId('pista-caja.arqueo')).toBeVisible();
  const sesionId = await evaluar(page, (kc) => (kc.sel('selSesionAbierta', { localId: 'usq' }) as { id: string }).id, null);
  const esperadoAntes = await evaluar(page, (kc, id: string) => (kc.sel('selResumenSesion', { sesionId: id }) as { esperado: number }).esperado, sesionId);

  // Egreso de caja: baja el esperado y queda en la lista.
  await page.getByTestId('caja-registrar-egreso').click();
  await page.getByTestId('caja-egreso-guardar').click();
  await expect(page.getByTestId('caja-dialogo-egreso')).toContainText('Escribe en qué se usó la plata');
  await page.getByTestId('caja-egreso-concepto').fill('Domicilio a Chapinero');
  await escribirCifra(page, 'caja-egreso-valor', '25000');
  await page.getByTestId('caja-egreso-guardar').click();
  await expect(page.getByTestId('caja-egresos')).toContainText('Domicilio a Chapinero');
  const esperado = await evaluar(page, (kc, id: string) => (kc.sel('selResumenSesion', { sesionId: id }) as { esperado: number }).esperado, sesionId);
  expect(esperado).toBe(esperadoAntes - 25_000);

  // Arqueo por denominación: el campo "Efectivo contado" suma solo.
  await escribirCifra(page, 'caja-den-100000', '2');
  await escribirCifra(page, 'caja-den-50000', '1');
  await escribirCifra(page, 'caja-den-monedas', '7500');
  await expect(page.getByTestId('caja-efectivo-contado')).toHaveValue(/257\.500/);
  await expect(page.getByTestId('caja-diferencia-previa')).toContainText('diferencia');
  await page.getByTestId('caja-cerrar').click();
  await expect(page.getByTestId('caja-confirmar-contado')).toContainText('257.500');
  await page.getByTestId('caja-confirmar-cierre').click();
  await expect(page.getByTestId('caja-cerrada')).toBeVisible();
  await expect(page.getByTestId('caja-cerrada-contado')).toContainText('257.500');
  const cierre = await evaluar(page, (kc, id: string) => ((kc.estado() as unknown as { sesionesCaja: Record<string, { cierre: { efectivoContado: number; efectivoEsperado: number; diferencia: number; ciego: boolean; denominaciones: Record<string, number> } }> }).sesionesCaja[id])?.cierre, sesionId);
  expect(cierre?.efectivoContado).toBe(257_500);
  expect(cierre?.efectivoEsperado).toBe(esperado);
  expect(cierre?.diferencia).toBe(257_500 - esperado);
  expect(cierre?.ciego).toBe(false);
  expect(cierre?.denominaciones).toEqual({ '100000': 2, '50000': 1, monedas: 7_500 });
  expect(errores).toEqual([]);
});

test('W11 arqueo ciego: el vendedor cuenta sin ver el esperado y lo ve solo después de confirmar el conteo', async ({ page, irA }, info) => {
  omitirEn1280(info);
  const errores = vigilar(page);
  await irA('/panel/pos/caja');
  await esperarDatos(page);
  // Una venta en efectivo de $ 199.900 para que el esperado tenga una cifra propia.
  const esperadoTexto = await evaluar(
    page,
    (kc) => {
      const sesion = kc.sel('selSesionAbierta', { localId: 'usq' }) as { id: string };
      const r = (kc.acciones.registrarVenta as (d: unknown) => { ok: boolean; error?: { mensaje: string } })({
        localId: 'usq',
        vendedorId: 'em_scardenas',
        canal: 'local',
        tipo: 'contado',
        clienteId: null,
        clienteNuevo: null,
        lineas: [{ varianteId: 'va_pan_0305_are_32', cantidad: 1, precioLista: null, descuento: null }],
        descuentoGlobal: null,
        aprobacionDescuentoId: null,
        pagos: [{ medio: 'efectivo', valor: 199_900, recibido: 200_000, referencia: null, sesionCajaId: null, bonoId: null }],
        fechaLimiteSeparado: null,
        ventaOrigenCambioId: null,
        facturaInmediata: null,
        nota: null,
      });
      if (!r.ok) throw new Error(r.error?.mensaje ?? 'no se registró');
      const esperado = (kc.sel('selResumenSesion', { sesionId: sesion.id }) as { esperado: number }).esperado;
      return new Intl.NumberFormat('es-CO').format(esperado);
    },
    null,
  );
  await cambiarRol(page, 'vendedor');
  await expect(page.getByTestId('caja-abierta')).toBeVisible();
  await expect(page.getByTestId('caja-esperado-oculto')).toBeVisible();
  await expect(page.getByTestId('caja-esperado-visible')).toHaveCount(0);
  // El esperado no aparece en ningún lado antes de contar (ni en las ventas por medio de pago).
  await expect(page.getByTestId('caja-medios')).toContainText('Se muestra al confirmar el conteo');
  expect(await page.getByTestId('caja').innerText()).not.toContain(esperadoTexto);
  await escribirCifra(page, 'caja-den-100000', '4');
  await escribirCifra(page, 'caja-den-50000', '2');
  await expect(page.getByTestId('caja-diferencia-previa')).toHaveCount(0);
  await page.getByTestId('caja-cerrar').click();
  expect(await page.getByTestId('caja-dialogo-cierre').innerText()).not.toContain(esperadoTexto);
  await page.getByTestId('caja-confirmar-cierre').click();
  await expect(page.getByTestId('caja-cerrada')).toBeVisible();
  await expect(page.getByTestId('caja-cerrada-esperado')).toContainText(esperadoTexto);
  await expect(page.getByTestId('caja-cerrada-contado')).toContainText('500.000');
  const cierre = await evaluar(page, (kc) => (kc.sel('selCierresDelDia', { fecha: '2026-09-30' }) as { localId: string; ciego: boolean; contado: number | null; estado: string }[]).find((f) => f.localId === 'usq'), null);
  expect(cierre).toMatchObject({ estado: 'cerrada', ciego: true, contado: 500_000 });
  expect(errores).toEqual([]);
});

test('?cliente= abre la venta con ese cliente y su saldo a favor como medio de pago (el cambio de Ventas)', async ({ page, irA }, info) => {
  omitirEn1280(info);
  const errores = vigilar(page);
  await entrarAlPos(page, irA);
  const c = await evaluar(
    page,
    (kc) => {
      const m = kc.sel('selMetricasClientes', { hoy: '2026-09-30' }) as Record<string, { saldoAFavor: number }>;
      const [id, x] = Object.entries(m).sort((a, b) => b[1].saldoAFavor - a[1].saldoAFavor)[0] ?? ['', { saldoAFavor: 0 }];
      const cl = (kc.estado() as unknown as { clientes: Record<string, { nombres: string }> }).clientes[id];
      return { id, saldo: x.saldoAFavor, nombres: cl?.nombres ?? '' };
    },
    null,
  );
  expect(c.saldo).toBeGreaterThan(0);
  await irA(`/panel/pos?cliente=${c.id}`);
  await esperarDatos(page);
  await expect(page.getByTestId('pos-cliente-nombre')).toContainText(c.nombres);
  // El parámetro se consume: recargar no vuelve a precargar.
  await expect(page).not.toHaveURL(/cliente=/);
  await agregarChino(page);
  await expect(page.getByTestId('pos')).toContainText('Sale del saldo a favor del cliente.');
  // Un id que no existe abre con Consumidor final y avisa.
  await irA('/panel/pos?cliente=cl_no_existe');
  await esperarDatos(page);
  await expect(page.getByText('Ese cliente ya no está')).toBeVisible();
  expect(errores).toEqual([]);
});

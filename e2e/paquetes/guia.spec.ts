import type { Page } from '@playwright/test';
import { expect as expectBase, test } from '../fixtures';
import { conKc, esperarDatos as esperarDatosBase, registrarVentaDePrueba } from '../kc';

/**
 * E2 · Entrada, guía ligera, ayuda y "Cómo arrancaríamos" (PLAN 9.4, 2.2–2.8). Se verifica la pantalla de entrada
 * (1440, 1366 y 390), la personalización, la lista "Prueba esto" (que se marca sola al hacer las acciones), que nada
 * tape el POS, el menú "?", las pistas y la página "Cómo arrancaríamos". Los efectos en otros módulos se leen con
 * `window.__kc`; los `EventoUI` que emiten otros paquetes se simulan con el bus (`__kcBus`), nunca navegando a sus
 * pantallas (eso va en e2e/flujos).
 *
 *   PORT=4342 npx playwright test e2e/paquetes/guia.spec.ts --project=escritorio-1440 --project=escritorio-1366 --project=escritorio-1280 --project=celular-390 --workers=1
 */
const expect = expectBase.configure({ timeout: 15_000 });
const esperarDatos = (page: Page) => esperarDatosBase(page, 120_000);
test.beforeEach(({ browserName: _n }, info) => {
  info.setTimeout(240_000);
});

const esCelular = (info: { project: { name: string } }) => info.project.name === 'celular-390';
function soloEscritorio(info: { project: { name: string } }) {
  test.skip(esCelular(info), 'Se verifica en los proyectos de escritorio.');
}
function soloCelular(info: { project: { name: string } }) {
  test.skip(!esCelular(info), 'Solo se verifica en el proyecto de celular.');
}
function omitirEn1280(info: { project: { name: string } }) {
  test.skip(info.project.name === 'escritorio-1280', 'El flujo funcional se verifica en 1440 y 1366.');
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

/** Simula un `EventoUI` que emite otro paquete (entrega el evento a los oyentes del bus, como `emitirUI`). */
async function emitir(page: Page, tipo: string, datos: Record<string, string | number | boolean | null> = {}) {
  await page.evaluate(
    ({ tipo, datos }) => {
      const bus = (globalThis as unknown as { __kcBus: { ui: Set<(e: unknown) => void> } }).__kcBus;
      for (const o of [...bus.ui]) o({ tipo, datos });
    },
    { tipo, datos },
  );
}

const completados = (page: Page) => conKc(page, (kc) => (kc as unknown as { guia: { getState: () => { completados: string[] } } }).guia.getState().completados);
const hecho = (page: Page, id: string) => expect(page.getByTestId(`guia-item-${id}`)).toHaveAttribute('data-hecho', 'si');
const pendiente = (page: Page, id: string) => expect(page.getByTestId(`guia-item-${id}`)).toHaveAttribute('data-hecho', 'no');

/** Una compra de la tienda web (canal `web`) en Parque 93, como la registra la tienda al pagar. */
async function registrarCompraWeb(page: Page) {
  await conKc(page, (kc) => {
    const e = kc.estado()!;
    const v = Object.values(e.variantes).find((x) => (e.agregados.existencias[`${x.id}@p93`] ?? 0) > 2)!;
    const p = e.productos[v.productoId]!;
    const r = kc.acciones.registrarVenta!({
      ts: null, localId: 'p93', vendedorId: 'em_scardenas', canal: 'web', tipo: 'contado', clienteId: null, clienteNuevo: null,
      lineas: [{ varianteId: v.id, cantidad: 1, precioLista: null, descuento: null }],
      descuentoGlobal: null, aprobacionDescuentoId: null,
      pagos: [{ medio: 'nequi', valor: p.precioVenta, recibido: null, referencia: 'WEB-PRUEBA', sesionCajaId: null, bonoId: null }],
      fechaLimiteSeparado: null, ventaOrigenCambioId: null, facturaInmediata: null, nota: 'Compra web de prueba (e2e)',
    });
    if (!r.ok) throw new Error(r.error?.mensaje ?? 'no se registró');
  });
}

/** Abre el menú "?" (espera a que el anterior se haya cerrado del todo). */
async function abrirMenuAyuda(page: Page) {
  await expect(page.getByRole('menu')).toHaveCount(0);
  await page.getByTestId('menu-ayuda').click();
  await expect(page.getByRole('menu')).toBeVisible();
}

/** Deja el panel "Prueba esto" desplegado, sea cual sea el estado en que esté (píldora o panel). */
async function desplegarPanel(page: Page) {
  const panel = page.getByTestId('guia-panel');
  const pildora = page.getByTestId('guia-pildora');
  await expect(panel.or(pildora)).toBeVisible();
  if (await pildora.isVisible()) await pildora.click();
  await expect(panel).toBeVisible();
}

/** Entra al panel desde la entrada y espera el panel "Prueba esto" desplegado. */
async function abrirInicioConGuia(page: Page, irA: (ruta: string) => Promise<void>) {
  await irA('/panel/inicio');
  await esperarDatos(page);
  await expect(page.getByTestId('guia-panel')).toBeVisible();
}

// ---------------------------------------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------------------------------------
test.describe('Entrada /', () => {
  test('computador: firma, marca de ejemplo, titular y las dos puertas a la vista, sin esperar los datos', async ({ page, irA }, info) => {
    soloEscritorio(info);
    const errores = vigilar(page);
    await irA('/');
    // Todo es estático: se ve antes de que existan los datos.
    await expect(page.getByTestId('entrada')).toBeVisible();
    await expect(page.getByText('KIPPICORE CRM · DEMO PARA HALDEN')).toBeVisible();
    await expect(page.getByTestId('entrada-wordmark')).toHaveText('HALDEN');
    await expect(page.getByText('Moda masculina · Bogotá')).toBeVisible();
    await expect(page.getByText('HALDEN es una marca de ejemplo.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Personalizar con el nombre de mi negocio' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Así se vería tu negocio con todo en un solo lugar' })).toBeVisible();
    await expect(page.getByText('Datos al miércoles 30 de septiembre de 2026')).toBeVisible();
    await expect(page.getByTestId('entrada-cartel')).toBeAttached();
    // Dos puertas, completas y dentro de la pantalla (también en 1366 × 657).
    await expect(page.getByText('EN EL COMPUTADOR')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'EL SISTEMA COMPLETO' })).toBeVisible();
    await expect(page.getByTestId('entrar-dueno')).toHaveText('ENTRAR COMO DUEÑO');
    await expect(page.getByTestId('entrar-dueno')).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId('entrar-vendedor')).toHaveText('o mira lo que ve un vendedor →');
    await expect(page.getByText('EN TU CELULAR')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'LA APP DEL DUEÑO' })).toBeVisible();
    await expect(page.getByTestId('entrada-qr').locator('svg, canvas, img').first()).toBeVisible();
    await expect(page.getByTestId('entrada-marco-celular')).toBeVisible();
    await expect(page.getByText('Demostración con datos ficticios')).toBeAttached();
    await expect(page.getByText('Desarrollado por KippiCore')).toBeAttached();
    // Sin desplazamiento horizontal.
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(desborde).toBeLessThanOrEqual(0);
    // Mientras se generan los datos: progreso discreto; al terminar, lo que encontrará.
    await esperarDatos(page);
    await expect(page.getByTestId('progreso-entrada')).toContainText('Todo listo: 3 locales');
    await expect(page.getByTestId('progreso-entrada')).toContainText('18 meses de historia');
    expect(errores).toEqual([]);
  });

  test('computador: "ábrela aquí en un marco de celular" abre el modal con la app y cuenta para "Prueba esto"', async ({ page, irA }, info) => {
    soloEscritorio(info);
    omitirEn1280(info);
    const errores = vigilar(page);
    await irA('/');
    await esperarDatos(page);
    await page.getByTestId('entrada-marco-celular').click();
    await expect(page.getByTestId('modal-app-dueno')).toBeVisible();
    expect((await conKc(page, (kc) => kc.eventosUI().map((e) => e.tipo))).filter((t) => t === 'qr_abierto')).toHaveLength(1);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('modal-app-dueno')).toHaveCount(0);
    // Al entrar al panel, la guía ya lo sabe: el ítem 8 queda marcado.
    await page.getByTestId('entrar-dueno').click();
    await expect(page.getByTestId('guia-panel')).toBeVisible();
    await hecho(page, 'celular');
    await expect(page.getByTestId('guia-contador')).toHaveText('1 de 8');
    expect(errores).toEqual([]);
  });

  test('computador: "Entrar como dueño" lleva a Inicio y "mira lo que ve un vendedor" abre Mi día con el rol Vendedor', async ({ page, irA }, info) => {
    soloEscritorio(info);
    omitirEn1280(info);
    const errores = vigilar(page);
    await irA('/');
    await esperarDatos(page);
    await page.getByTestId('entrar-vendedor').click();
    await expect(page).toHaveURL(/\/panel\/mi-dia/);
    await expect(page.getByTestId('selector-rol')).toHaveAttribute('data-valor', 'vendedor');
    expect(await completados(page)).toContain('rol');
    // Vuelve a la entrada y entra como dueño: el rol vuelve a Dueño.
    await page.goto('/?hoy=2026-09-30T15:30');
    await esperarDatos(page);
    await page.getByTestId('entrar-dueno').click();
    await expect(page).toHaveURL(/\/panel\/inicio/);
    await expect(page.getByTestId('selector-rol')).toHaveAttribute('data-valor', 'dueno');
    expect(errores).toEqual([]);
  });

  test('celular: titular corto, "Abrir la app del dueño" a /app y "Compartir / Copiar enlace"', async ({ page, irA, context }, info) => {
    soloCelular(info);
    const errores = vigilar(page);
    await irA('/');
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(page.url()).origin }).catch(() => undefined);
    await expect(page.getByTestId('entrada')).toBeVisible();
    await expect(page.getByText('KIPPICORE CRM · DEMO PARA HALDEN')).toBeVisible();
    await expect(page.getByTestId('entrada-wordmark')).toHaveText('HALDEN');
    await expect(page.getByText('HALDEN es una marca de ejemplo.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tu negocio, con todo en un solo lugar.' })).toBeVisible();
    await expect(page.getByTestId('abrir-app')).toHaveText('ABRIR LA APP DEL DUEÑO');
    await expect(page.getByTestId('abrir-app')).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('heading', { name: 'El sistema completo' })).toBeVisible();
    await expect(page.getByTestId('entrada-compartir')).toHaveText('COMPARTIR ENLACE');
    await expect(page.getByTestId('entrada-copiar')).toContainText('Copiar enlace');
    // No hay puertas de computador ni QR en el celular.
    await expect(page.getByTestId('entrar-dueno')).toBeHidden();
    await expect(page.getByTestId('entrada-qr')).toBeHidden();
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(desborde).toBeLessThanOrEqual(0);
    await page.getByTestId('entrada-copiar').click();
    await expect(page.getByTestId('entrada-copiar')).toContainText('Enlace copiado');
    await page.getByTestId('abrir-app').click();
    await expect(page).toHaveURL(/\/app/);
    expect(errores.filter((e) => !/clipboard/i.test(e))).toEqual([]);
  });

  test('visita repetida: "Continuar como dueño" con "Ibas en: …" y nunca una pantalla del vendedor', async ({ page, irA }, info) => {
    soloEscritorio(info);
    omitirEn1280(info);
    const errores = vigilar(page);
    await irA('/');
    await expect(page.getByTestId('entrar-dueno')).toHaveText('ENTRAR COMO DUEÑO');
    await expect(page.getByTestId('entrada-ibas-en')).toHaveCount(0);
    await esperarDatos(page);
    await page.getByTestId('entrar-dueno').click();
    await expect(page).toHaveURL(/\/panel\/inicio/);
    // Recuerda el último módulo visitado.
    await page.goto('/panel/importaciones?hoy=2026-09-30T15:30');
    await esperarDatos(page);
    await expect(page.getByTestId('pagina')).toBeVisible();
    await page.goto('/?hoy=2026-09-30T15:30');
    await expect(page.getByTestId('entrar-dueno')).toHaveText('CONTINUAR COMO DUEÑO');
    await expect(page.getByTestId('entrada-ibas-en')).toHaveText('Ibas en: Importaciones');
    await esperarDatos(page);
    await page.getByTestId('entrar-dueno').click();
    await expect(page).toHaveURL(/\/panel\/importaciones/);
    // Si lo último que vio fue la vista del vendedor, "Continuar" no lo manda a una pantalla que el dueño no puede ver.
    await page.goto('/?hoy=2026-09-30T15:30');
    await esperarDatos(page);
    await page.getByTestId('entrar-vendedor').click();
    await expect(page).toHaveURL(/\/panel\/mi-dia/);
    await page.goto('/?hoy=2026-09-30T15:30');
    await expect(page.getByTestId('entrar-dueno')).toHaveText('CONTINUAR COMO DUEÑO');
    await expect(page.getByTestId('entrada-ibas-en')).toHaveCount(0);
    await esperarDatos(page);
    await page.getByTestId('entrar-dueno').click();
    await expect(page).toHaveURL(/\/panel\/inicio/);
    expect(errores).toEqual([]);
  });
});

test.describe('Entrada en el navegador interno de WhatsApp', () => {
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/2.23.20' });

  test('franja discreta con "Copiar enlace", sin bloquear las puertas', async ({ page, irA }, info) => {
    await irA('/');
    const franja = page.getByTestId('aviso-navegador-interno');
    await expect(franja).toBeVisible();
    await expect(franja).toContainText('Para la mejor experiencia, ábrelo en Safari o Chrome');
    await expect(franja).toContainText('Allá podrás agregarlo a tu pantalla de inicio');
    await expect(franja.getByRole('button', { name: /Copiar enlace/ })).toBeVisible();
    expect((await franja.boundingBox())!.height).toBeLessThanOrEqual(96);
    await expect(page.getByTestId(esCelular(info) ? 'abrir-app' : 'entrar-dueno')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------------------------------------
// Personalización
// ---------------------------------------------------------------------------------------------------------
test.describe('Personalizar con el nombre de mi negocio', () => {
  test('el nombre escrito reemplaza a HALDEN (con vista previa), emite `marca_personalizada` y se puede quitar', async ({ page, irA }, info) => {
    soloEscritorio(info);
    omitirEn1280(info);
    const errores = vigilar(page);
    await irA('/');
    await esperarDatos(page);
    await page.getByTestId('entrada-personalizar-abrir').click();
    await expect(page.getByTestId('entrada-personalizar')).toBeVisible();
    // Vista previa mientras escribe (todavía no se guarda).
    await page.getByTestId('entrada-campo-negocio').fill('Boutique Alameda');
    await expect(page.getByTestId('entrada-wordmark')).toHaveText('Boutique Alameda');
    expect(await conKc(page, (kc) => (kc as unknown as { sesion: { getState: () => { marcaPersonalizada: { nombreNegocio: string | null } } } }).sesion.getState().marcaPersonalizada.nombreNegocio)).toBeNull();
    await page.getByTestId('entrada-campo-persona').fill('Andrea');
    await page.getByTestId('entrada-guardar-nombre').click();
    await expect(page.getByTestId('entrada-personalizar')).toHaveCount(0);
    await expect(page.getByTestId('entrada-wordmark')).toHaveText('Boutique Alameda');
    await expect(page.getByText('KIPPICORE CRM · DEMO PARA BOUTIQUE ALAMEDA')).toBeVisible();
    await expect(page.getByText('Demo personalizada para Boutique Alameda.')).toBeVisible();
    const guardada = await conKc(page, (kc) => (kc as unknown as { sesion: { getState: () => { marcaPersonalizada: { nombreNegocio: string | null; nombrePersona: string | null } } } }).sesion.getState().marcaPersonalizada);
    expect(guardada).toEqual({ nombreNegocio: 'Boutique Alameda', nombrePersona: 'Andrea' });
    expect((await conKc(page, (kc) => kc.eventosUI().map((e) => e.tipo))).filter((t) => t === 'marca_personalizada')).toHaveLength(1);
    // No fija el ancla ni escribe en el registro de comandos.
    expect(await conKc(page, (kc) => kc.datos.getState().registro.length)).toBe(0);
    // Llega al sistema: barra lateral, título de la pestaña y saludo.
    await page.getByTestId('entrar-dueno').click();
    await expect(page.locator('[data-marca="Boutique Alameda"]:visible').first()).toBeVisible();
    await expect(page).toHaveTitle(/Boutique Alameda/);
    // Se conserva al volver y se quita con "Volver a HALDEN".
    await page.goto('/?hoy=2026-09-30T15:30');
    await expect(page.getByTestId('entrada-wordmark')).toHaveText('Boutique Alameda');
    await page.getByTestId('entrada-personalizar-abrir').click();
    await expect(page.getByTestId('entrada-campo-negocio')).toHaveValue('Boutique Alameda');
    await page.getByTestId('entrada-volver-halden').click();
    await expect(page.getByTestId('entrada-wordmark')).toHaveText('HALDEN');
    await expect(page.getByText('HALDEN es una marca de ejemplo.')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('un nombre largo se achica solo y no se sale de la pantalla (1440 y 390)', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/');
    await page.getByTestId('entrada-personalizar-abrir').click();
    await page.getByTestId('entrada-campo-negocio').fill('Distribuidora Textil Andina');
    const medidas = await page.getByTestId('entrada-wordmark').evaluate((h) => ({
      contenido: h.scrollWidth,
      caja: (h.parentElement as HTMLElement).clientWidth,
      tamano: parseFloat(getComputedStyle(h).fontSize),
      alto: h.getBoundingClientRect().height,
    }));
    expect(medidas.contenido).toBeLessThanOrEqual(medidas.caja + 1);
    expect(medidas.tamano).toBeLessThan(64);
    expect(medidas.tamano).toBeGreaterThanOrEqual(20);
    // Un nombre largo se parte en dos renglones como máximo (no queda diminuto).
    expect(medidas.alto).toBeLessThanOrEqual(medidas.tamano * 2.3);
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(desborde).toBeLessThanOrEqual(0);
    expect(errores).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------
// "Prueba esto"
// ---------------------------------------------------------------------------------------------------------
test.describe('Prueba esto', () => {
  test('aparece desplegado 1,2 s después de llegar a Inicio con los 8 ítems, y se minimiza a una píldora', async ({ page, irA }, info) => {
    soloEscritorio(info);
    const errores = vigilar(page);
    await abrirInicioConGuia(page, irA);
    await expect(page.getByText('PRUEBA ESTO', { exact: true })).toBeVisible();
    await expect(page.getByText('8 cosas que puedes hacer en 10 minutos')).toBeVisible();
    await expect(page.getByTestId('guia-contador')).toHaveText('0 de 8');
    await expect(page.locator('[data-testid^="guia-item-"][data-hecho]')).toHaveCount(8);
    await expect(page.getByTestId('guia-item-venta')).toContainText('Registra una venta y mira todo lo que se mueve');
    await expect(page.getByTestId('guia-item-celular')).toContainText('Mira en tu celular cómo cerraron las cajas');
    // "Para ir más lejos" va plegado hasta completar 5.
    await expect(page.getByTestId('guia-mas-lejos')).toContainText('Para ir más lejos');
    await expect(page.getByTestId('guia-item-whatsapp')).toHaveCount(0);
    await page.getByTestId('guia-mas-lejos').click();
    await expect(page.locator('[data-testid^="guia-item-"][data-hecho]')).toHaveCount(14);
    // Cabe en la pantalla y no tapa la barra superior.
    const caja = await page.getByTestId('guia-panel').boundingBox();
    const vista = page.viewportSize()!;
    expect(caja!.y).toBeGreaterThan(70);
    expect(caja!.y + caja!.height).toBeLessThanOrEqual(vista.height);
    expect(caja!.width).toBe(320);
    // Se minimiza a "Prueba esto · 0/8" y se reabre.
    await page.getByTestId('guia-minimizar').click();
    await expect(page.getByTestId('guia-panel')).toHaveCount(0);
    await expect(page.getByTestId('guia-pildora')).toHaveText('Prueba esto · 0/8');
    await page.getByTestId('guia-pildora').click();
    await expect(page.getByTestId('guia-panel')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('cada ítem lleva al lugar exacto y deja el panel como píldora', async ({ page, irA }, info) => {
    soloEscritorio(info);
    omitirEn1280(info);
    const errores = vigilar(page);
    await abrirInicioConGuia(page, irA);
    const destinos: [string, RegExp][] = [
      ['venta', /\/panel\/pos$/],
      ['traslado', /\/panel\/inventario\/HL-[A-Z]{3}-\d{4}\?.*trasladar=/],
      ['importacion', /\/panel\/importaciones\/IMP-\d{4}-\d{2}\?resaltar=cambiar-estado/],
      ['flujo', /\/panel\/pagos\/flujo\?semana=\d{4}-\d{2}-\d{2}/],
      ['costo-empleado', /\/panel\/personal\/[a-z-]+\/costo/],
      ['pedido', /\/panel\/importaciones\/sugerir\?proveedor=.+desde=guia/],
    ];
    for (const [id, url] of destinos) {
      await page.goto('/panel/inicio?hoy=2026-09-30T15:30');
      await esperarDatos(page);
      await desplegarPanel(page);
      await page.getByTestId(`guia-item-${id}`).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByTestId('guia-panel')).toHaveCount(0);
    }
    // El ítem 6 resalta el selector de rol sin cambiar de pantalla; el 8 abre el modal de la app.
    await page.goto('/panel/inicio?hoy=2026-09-30T15:30');
    await esperarDatos(page);
    await desplegarPanel(page);
    await page.getByTestId('guia-item-rol').click();
    await expect(page).toHaveURL(/\/panel\/inicio\?.*resaltar=rol/);
    await expect(page).toHaveURL(/hoy=2026-09-30/);
    await desplegarPanel(page);
    await page.getByTestId('guia-item-celular').click();
    await expect(page.getByTestId('modal-app-dueno')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('se marca sola: venta, traslado y vista del vendedor; con 3 aparece "Hablar con KippiCore"', async ({ page, irA }, info) => {
    soloEscritorio(info);
    omitirEn1280(info);
    const errores = vigilar(page);
    await abrirInicioConGuia(page, irA);
    for (const id of ['venta', 'traslado', 'rol']) await pendiente(page, id);
    await expect(page.getByTestId('guia-linea-kippicore')).toHaveCount(0);

    // 1 · Una venta del usuario en el local (la acción de siempre: emite `VentaRegistrada`).
    await registrarVentaDePrueba(page);
    await hecho(page, 'venta');
    await expect(page.getByTestId('guia-contador')).toHaveText('1 de 8');
    await expect(page.getByText('Hecho: registraste una venta')).toBeVisible();

    // 2 · Un traslado entre locales (`TrasladoCambiado` → solicitado).
    const r = await conKc(page, (kc) => {
      const e = kc.estado();
      const v = Object.values(e.variantes).find((x) => (e.agregados.existencias[`${x.id}@zr`] ?? 0) > 2)!;
      const traslado = kc.acciones.solicitarTraslado!({ origenId: 'zr', destinoId: 'usq', lineas: [{ varianteId: v.id, cantidad: 1 }], motivo: null, requiereAprobacion: false });
      return { ok: traslado.ok, error: traslado.error?.mensaje ?? null };
    });
    expect(r).toEqual({ ok: true, error: null });
    await hecho(page, 'traslado');
    await expect(page.getByText('Hecho: pediste un traslado')).toBeVisible();
    await expect(page.getByTestId('guia-contador')).toHaveText('2 de 8');
    await expect(page.getByTestId('guia-linea-kippicore')).toHaveCount(0);

    // 6 · Cambiar el rol con el selector de la barra superior (`rol_cambiado` → vendedor): el panel pasa a píldora.
    await page.getByTestId('selector-rol').click();
    await page.getByTestId('rol-vendedor').click();
    await expect(page.getByTestId('guia-pildora')).toHaveText('Prueba esto · 3/8');
    await expect(page.getByTestId('guia-panel')).toHaveCount(0);
    await page.getByTestId('guia-pildora').click();
    await hecho(page, 'rol');
    await expect(page.getByTestId('guia-contador')).toHaveText('3 de 8');

    // Con 3 ítems: "¿Lo quieres con tus datos? Cómo arrancaríamos · Hablar con KippiCore", sin interrumpir.
    const linea = page.getByTestId('guia-linea-kippicore');
    await expect(linea).toContainText('¿Lo quieres con tus datos?');
    await expect(page.getByTestId('guia-como-arrancariamos')).toHaveText('Cómo arrancaríamos');
    await expect(page.getByTestId('guia-hablar')).toHaveText('Hablar con KippiCore');
    await expect(page.getByTestId('guia-hablar')).toHaveAttribute('href', /^https:\/\/wa\.me\//);
    await expect(page.getByTestId('guia-hablar')).toHaveAttribute('target', '_blank');

    // Lo que se marcó queda guardado en el navegador.
    expect(await completados(page)).toEqual(expect.arrayContaining(['venta', 'traslado', 'rol']));
    await page.reload();
    await esperarDatos(page);
    expect(await completados(page)).toEqual(expect.arrayContaining(['venta', 'traslado', 'rol']));
    expect(errores).toEqual([]);
  });

  test('los 8 ítems y los de "Para ir más lejos" se marcan por sus eventos; al completar 8 aparece la tarjeta de cierre', async ({ page, irA }, info) => {
    soloEscritorio(info);
    omitirEn1280(info);
    const errores = vigilar(page);
    await abrirInicioConGuia(page, irA);

    // Dominio: venta, traslado y estado de la importación (desde el panel).
    await registrarVentaDePrueba(page);
    const efectos = await conKc(page, (kc) => {
      const e = kc.estado()!;
      const n = kc.sel('selNarrativa', { hoy: '2026-09-30' }) as { importacionEnPuerto: string | null };
      const v = Object.values(e.variantes).find((x) => (e.agregados.existencias[`${x.id}@zr`] ?? 0) > 2)!;
      const t = kc.acciones.solicitarTraslado!({ origenId: 'zr', destinoId: 'usq', lineas: [{ varianteId: v.id, cantidad: 1 }], motivo: null, requiereAprobacion: false });
      const imp = e.importaciones[n.importacionEnPuerto as string] as unknown as { id: string; estado: string };
      const c = kc.acciones.cambiarEstadoImportacion!({ importacionId: imp.id, estado: 'en_nacionalizacion', fecha: '2026-09-30', nota: null, origen: 'panel', autor: null });
      return { traslado: t.ok, cambio: c.ok ? null : (c.error?.mensaje ?? 'error') };
    });
    expect(efectos).toEqual({ traslado: true, cambio: null });
    await hecho(page, 'venta');
    await hecho(page, 'traslado');
    await hecho(page, 'importacion');
    await expect(page.getByTestId('guia-contador')).toHaveText('3 de 8');

    // Interfaz: los que emiten los paquetes de cada pantalla (se simulan con el bus).
    await emitir(page, 'flujo_caja_visto');
    await hecho(page, 'flujo');
    await emitir(page, 'costo_empleador_visto', { empleadoId: 'em_scardenas' });
    await hecho(page, 'costo-empleado');
    // Cambiar a dueño NO cuenta como "ver como el vendedor".
    await emitir(page, 'rol_cambiado', { a: 'dueno' });
    await pendiente(page, 'rol');
    await emitir(page, 'rol_cambiado', { a: 'bodega' });
    await hecho(page, 'rol');
    await emitir(page, 'pedido_sugerido_visto', { proveedorId: 'pr_1' });
    await hecho(page, 'pedido');
    await expect(page.getByTestId('guia-contador')).toHaveText('7 de 8');
    await expect(page.getByTestId('guia-cierre')).toHaveCount(0);

    // "Para ir más lejos" se despliega solo con 5 y se marca igual, pero no cuenta para el 8/8.
    await expect(page.getByTestId('guia-item-whatsapp')).toBeVisible();
    await emitir(page, 'moneda_cambiada', { a: 'COP' });
    await pendiente(page, 'moneda');
    await emitir(page, 'moneda_cambiada', { a: 'USD' });
    await hecho(page, 'moneda');
    await emitir(page, 'whatsapp_respondido');
    await hecho(page, 'whatsapp');
    await emitir(page, 'excel_generado', { reporte: 'ventas' });
    await pendiente(page, 'contador');
    await emitir(page, 'excel_generado', { reporte: 'contador' });
    await hecho(page, 'contador');
    await emitir(page, 'tabla_dinamica_modificada');
    await hecho(page, 'tabla-dinamica');
    await emitir(page, 'portal_enviado', { numero: 'IMP-2026-06' });
    await hecho(page, 'portal');
    await registrarCompraWeb(page);
    await hecho(page, 'tienda');
    await expect(page.getByTestId('guia-contador')).toHaveText('7 de 8');
    await expect(page.getByTestId('guia-cierre')).toHaveCount(0);

    // 8 · Abrir la app del dueño (modal del QR): completa el octavo y el panel se transforma en la tarjeta de cierre.
    await page.getByTestId('ver-app-dueno').click();
    await expect(page.getByTestId('modal-app-dueno')).toBeVisible();
    await page.keyboard.press('Escape');
    const cierre = page.getByTestId('guia-cierre');
    await expect(cierre).toBeVisible();
    await expect(cierre).toContainText('ESO ES KIPPICORE CRM.');
    await expect(cierre).toContainText('Lo que acabas de ver funciona con datos de ejemplo.');
    await expect(page.getByTestId('guia-cierre-arrancar')).toHaveText('CÓMO ARRANCARÍAMOS');
    await expect(page.getByTestId('guia-cierre-hablar')).toHaveText('HABLAR CON KIPPICORE');
    await expect(page.getByTestId('guia-cierre-hablar')).toHaveAttribute('href', /^https:\/\/wa\.me\//);
    await expect(page.getByTestId('guia-cierre-seguir')).toHaveText('Seguir explorando');
    expect(await completados(page)).toEqual(
      expect.arrayContaining(['venta', 'traslado', 'importacion', 'flujo', 'costo-empleado', 'rol', 'pedido', 'celular', 'moneda', 'whatsapp', 'contador', 'tabla-dinamica', 'portal', 'tienda']),
    );
    // "Seguir explorando" la minimiza a "Prueba esto · 8/8"; "Cómo arrancaríamos" abre la página.
    await page.getByTestId('guia-cierre-seguir').click();
    await expect(page.getByTestId('guia-pildora')).toHaveText('Prueba esto · 8/8');
    await page.getByTestId('guia-pildora').click();
    await page.getByTestId('guia-cierre-arrancar').click();
    await expect(page).toHaveURL(/\/panel\/como-arrancariamos/);
    expect(errores).toEqual([]);
  });

  test('lo que se hizo en otra pestaña (la tienda) o antes de abrir el panel también cuenta', async ({ page, irA }, info) => {
    soloEscritorio(info);
    omitirEn1280(info);
    const errores = vigilar(page);
    // Se hace la compra web y el cambio de rol sin ningún panel montado (la entrada no lo lleva)…
    await irA('/');
    await esperarDatos(page);
    await registrarCompraWeb(page);
    // …y al entrar al panel, la guía ya lo sabe (la lista queda marcada sin avisos duplicados).
    await page.getByTestId('entrar-dueno').click();
    await expect(page.getByTestId('guia-panel')).toBeVisible();
    await page.getByTestId('guia-mas-lejos').click();
    await hecho(page, 'tienda');
    await pendiente(page, 'venta');
    await expect(page.getByTestId('guia-contador')).toHaveText('0 de 8');
    expect(errores).toEqual([]);
  });

  test('en el POS no tapa "Confirmar venta": se oculta allí y vuelve al salir', async ({ page, irA }, info) => {
    soloEscritorio(info);
    const errores = vigilar(page);
    await irA('/panel/pos');
    await esperarDatos(page);
    const confirmar = page.getByTestId('pos-confirmar');
    await expect(confirmar).toBeVisible();
    // Pasado de sobra el 1,2 s de la primera aparición: ni panel ni píldora sobre el POS.
    await page.waitForTimeout(2500);
    await expect(page.getByTestId('guia-panel')).toHaveCount(0);
    await expect(page.getByTestId('guia-pildora')).toHaveCount(0);
    // Ningún elemento de la guía existe en el POS: nada puede quedar encima del botón.
    await expect(page.locator('[data-testid^="guia-"]')).toHaveCount(0);
    const caja = await confirmar.boundingBox();
    expect(caja!.y + caja!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    // Desde el menú "?" → "Mostrar Prueba esto" sale a Inicio y la lista se ve.
    await abrirMenuAyuda(page);
    await page.getByRole('menuitem', { name: /Mostrar Prueba esto \(0 de 8\)/ }).click();
    await expect(page).toHaveURL(/\/panel\/inicio/);
    await expect(page.getByTestId('guia-panel')).toBeVisible();
    // Al volver al POS vuelve a desaparecer.
    await page.getByTestId('guia-item-venta').click();
    await expect(page).toHaveURL(/\/panel\/pos$/);
    await expect(page.getByTestId('guia-pildora')).toHaveCount(0);
    await expect(page.getByTestId('pos-confirmar')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('la píldora queda pequeña, en la esquina inferior derecha y a 24 px de los bordes', async ({ page, irA }, info) => {
    soloEscritorio(info);
    await irA('/panel/ventas');
    await esperarDatos(page);
    await expect(page.getByTestId('guia-pildora')).toBeVisible();
    const p = await page.getByTestId('guia-pildora').boundingBox();
    const vista = page.viewportSize()!;
    expect(p!.height).toBeLessThanOrEqual(40);
    expect(p!.width).toBeLessThanOrEqual(200);
    expect(vista.width - (p!.x + p!.width)).toBeGreaterThanOrEqual(24);
    expect(vista.height - (p!.y + p!.height)).toBeGreaterThanOrEqual(24);
  });
});

// ---------------------------------------------------------------------------------------------------------
// Menú "?" y pistas
// ---------------------------------------------------------------------------------------------------------
test.describe('Menú "?" y pistas contextuales', () => {
  test('el menú "?" reabre la entrada, la lista, la app y "Cómo arrancaríamos", y apaga las pistas', async ({ page, irA }, info) => {
    soloEscritorio(info);
    omitirEn1280(info);
    const errores = vigilar(page);
    await abrirInicioConGuia(page, irA);
    await page.getByTestId('guia-minimizar').click();
    await abrirMenuAyuda(page);
    for (const nombre of [/Ver la entrada otra vez/, /Mostrar Prueba esto \(0 de 8\)/, /Ver la app en el celular/, /Cómo arrancaríamos/, /Ocultar pistas/, /Restaurar datos de la demo/]) {
      await expect(page.getByRole('menuitem', { name: nombre })).toBeVisible();
    }
    // "Mostrar Prueba esto" reabre el panel minimizado.
    await page.getByRole('menuitem', { name: /Mostrar Prueba esto/ }).click();
    await expect(page.getByTestId('guia-panel')).toBeVisible();
    // "Ocultar pistas" ↔ "Mostrar pistas".
    await abrirMenuAyuda(page);
    await page.getByRole('menuitem', { name: 'Ocultar pistas' }).click();
    expect(await conKc(page, (kc) => (kc as unknown as { guia: { getState: () => { pistasOcultas: boolean } } }).guia.getState().pistasOcultas)).toBe(true);
    await abrirMenuAyuda(page);
    await expect(page.getByRole('menuitem', { name: 'Mostrar pistas' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Mostrar pistas' }).click();
    // "Ver la app en el celular" abre el modal del QR.
    await abrirMenuAyuda(page);
    await page.getByRole('menuitem', { name: 'Ver la app en el celular' }).click();
    await expect(page.getByTestId('modal-app-dueno')).toBeVisible();
    await page.keyboard.press('Escape');
    // "Cómo arrancaríamos" y "Ver la entrada otra vez".
    await abrirMenuAyuda(page);
    await page.getByRole('menuitem', { name: 'Cómo arrancaríamos' }).click();
    await expect(page).toHaveURL(/\/panel\/como-arrancariamos/);
    await abrirMenuAyuda(page);
    await page.getByRole('menuitem', { name: 'Ver la entrada otra vez' }).click();
    await expect(page).toHaveURL(/\/\?hoy=|\/$/);
    await expect(page.getByTestId('entrada')).toBeVisible();
    // Ya estuvo en el panel: la puerta dice "Continuar como dueño".
    await expect(page.getByTestId('entrar-dueno')).toHaveText('CONTINUAR COMO DUEÑO');
    expect(errores).toEqual([]);
  });

  test('la pista de Inicio sale en la primera visita con el texto final, se descarta con "Entendido" y no vuelve', async ({ page, irA }, info) => {
    soloEscritorio(info);
    omitirEn1280(info);
    const errores = vigilar(page);
    await abrirInicioConGuia(page, irA);
    // El panel está desplegado la primera vez: se minimiza para ver la pista.
    await page.getByTestId('guia-minimizar').click();
    const punto = page.getByTestId('pista-inicio.alertas');
    await expect(punto).toBeVisible();
    await punto.click();
    const globo = page.getByRole('dialog', { name: 'Pista' });
    await expect(globo).toContainText('Estas alertas salen solas de tus datos. Haz clic en cualquiera y te lleva directo a resolverla.');
    expect((await globo.innerText()).split(/\s+/).length).toBeLessThanOrEqual(30);
    await globo.getByRole('button', { name: 'Entendido' }).click();
    await expect(page.getByTestId('pista-inicio.alertas')).toHaveCount(0);
    await page.reload();
    await esperarDatos(page);
    await expect(page.getByTestId('pista-inicio.alertas')).toHaveCount(0);
    expect(errores).toEqual([]);
  });

  test('en la vista del vendedor no salen pistas (salvo la del POS)', async ({ page, irA }, info) => {
    soloEscritorio(info);
    omitirEn1280(info);
    await irA('/panel/mi-dia');
    await esperarDatos(page);
    await page.getByTestId('selector-rol').click();
    await page.getByTestId('rol-vendedor').click();
    await expect(page.getByTestId('selector-rol')).toHaveAttribute('data-valor', 'vendedor');
    await expect(page.locator('[data-testid^="pista-"]')).toHaveCount(0);
    // Y la lista arranca como píldora para no tapar nada.
    await page.waitForTimeout(1800);
    await expect(page.getByTestId('guia-panel')).toHaveCount(0);
    await expect(page.getByTestId('guia-pildora')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------------------------------------
// Cómo arrancaríamos
// ---------------------------------------------------------------------------------------------------------
test.describe('Cómo arrancaríamos /panel/como-arrancariamos', () => {
  test('etapas con semanas aproximadas, Excel, dispositivos, internet, datos, contador y "Hablar con KippiCore"', async ({ page, irA }, info) => {
    soloEscritorio(info);
    const errores = vigilar(page);
    await irA('/panel/como-arrancariamos');
    await esperarDatos(page);
    await expect(page.getByTestId('arrancar')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Cómo arrancaríamos' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Por etapas, con lo que más te duele primero' })).toBeVisible();
    for (const [n, titulo, semanas] of [
      [1, 'Punto de venta, inventario por local y cierre de caja', 'Semanas 1 a 4'],
      [2, 'Importaciones, proveedores y pagos', 'Semanas 5 a 8'],
      [3, 'Nómina, turnos y reportes para tu contador', 'Semanas 9 a 12'],
    ] as const) {
      const etapa = page.getByTestId(`arrancar-etapa-${n}`);
      await expect(etapa).toContainText(`Etapa ${n}`);
      await expect(etapa).toContainText(titulo);
      await expect(etapa).toContainText(semanas);
    }
    await expect(page.getByText('Semanas aproximadas; las fijamos contigo según tu operación.')).toBeVisible();
    await expect(page.getByTestId('arrancar-excel')).toContainText('Cargamos tus Excel nosotros');
    await expect(page.getByTestId('arrancar-dispositivos')).toContainText('Funciona en el computador del local, en una tablet y en el celular');
    await expect(page.getByTestId('arrancar-dispositivos')).toContainText('Tablet');
    await expect(page.getByTestId('arrancar-internet')).toContainText('Si se cae el internet en el local');
    await expect(page.getByTestId('arrancar-internet')).toContainText('En la implementación diseñamos contigo');
    await expect(page.getByTestId('arrancar-datos')).toContainText('Tus datos son tuyos');
    await expect(page.getByTestId('arrancar-contador')).toContainText('Convive con tu facturador y tu contador');
    // Sin promesas técnicas ni cifras de rendimiento.
    const texto = await page.getByTestId('arrancar').innerText();
    expect(texto).not.toMatch(/garantiz|99\s?%|milisegundos|segundos de respuesta|sin caídas/i);
    // "Trae tu Excel" abre el modal simulado.
    await page.getByTestId('importar-excel').click();
    await expect(page.getByRole('dialog')).toContainText('Trae tu Excel');
    await page.keyboard.press('Escape');
    // Emite `como_arrancariamos_visto`.
    expect((await conKc(page, (kc) => kc.eventosUI().map((e) => e.tipo))).filter((t) => t === 'como_arrancariamos_visto').length).toBeGreaterThanOrEqual(1);
    // CTA: `wa.me` (sin destinatario mientras no haya número configurado) y "Seguir explorando".
    const hablar = page.getByTestId('arrancar-hablar');
    await expect(hablar).toHaveText('HABLAR CON KIPPICORE');
    await expect(hablar).toHaveAttribute('href', /^https:\/\/wa\.me\/(\?text=|\d{8,15}\?text=)/);
    await expect(hablar).toHaveAttribute('target', '_blank');
    await expect(page.getByText('Agenda 20 minutos con Miguel')).toBeVisible();
    await page.getByTestId('arrancar-seguir').click();
    await expect(page).toHaveURL(/\/panel\/inicio/);
    // Sin desplazamiento horizontal.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    expect(errores).toEqual([]);
  });

  test('las etapas enlazan a la demo y el vendedor no ve enlaces a pantallas que no puede abrir', async ({ page, irA }, info) => {
    soloEscritorio(info);
    omitirEn1280(info);
    await irA('/panel/como-arrancariamos');
    await esperarDatos(page);
    await expect(page.getByTestId('arrancar-etapa-1').getByRole('link', { name: /Míralo en la demo/ })).toHaveAttribute('href', /\/panel\/pos/);
    await expect(page.getByTestId('arrancar-etapa-2').getByRole('link', { name: /Míralo en la demo/ })).toHaveAttribute('href', /\/panel\/importaciones/);
    await expect(page.getByTestId('arrancar-etapa-3').getByRole('link', { name: /Míralo en la demo/ })).toHaveAttribute('href', /\/panel\/personal\/nomina/);
    await page.getByTestId('selector-rol').click();
    await page.getByTestId('rol-vendedor').click();
    await expect(page.getByTestId('selector-rol')).toHaveAttribute('data-valor', 'vendedor');
    await expect(page.getByTestId('arrancar')).toBeVisible();
    await expect(page.getByTestId('arrancar-etapa-1').getByRole('link', { name: /Míralo en la demo/ })).toHaveCount(1);
    await expect(page.getByTestId('arrancar-etapa-2').getByRole('link')).toHaveCount(0);
    await expect(page.getByTestId('arrancar-etapa-3').getByRole('link')).toHaveCount(0);
  });
});

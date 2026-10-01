import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { conKc, esperarDatos, registrarVentaDePrueba } from '../kc';

/**
 * E3 · Configuración (PLAN 9.4). Verifica solo las pantallas de `/panel/configuracion/**`; los efectos en otros
 * módulos se leen por `window.__kc`. Sin errores en consola en ningún recorrido.
 */
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

/** Texto sin espacios duros, para comparar cifras. */
const limpio = (t: string | null) => (t ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

test('el hub muestra las ocho secciones con su estado y la navegación lateral lleva a cada una', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/configuracion');
  for (const id of ['empresa', 'locales', 'monedas', 'nomina', 'impuestos', 'aduanas', 'usuarios', 'datos']) {
    await expect(page.getByTestId(`config-tarjeta-${id}`)).toBeVisible();
  }
  await expect(page.getByTestId('config-tarjeta-monedas')).toContainText('tasa de ejemplo');
  await expect(page.getByTestId('config-tarjeta-empresa')).toContainText('Marca de ejemplo');
  await expect(page.getByTestId('config-tarjeta-datos')).toContainText('sin cambios');
  await page.getByTestId('config-tarjeta-aduanas').click();
  await expect(page).toHaveURL(/\/panel\/configuracion\/aduanas/);
  await expect(page.getByTestId('config-aduanas')).toBeVisible();
  for (const id of ['empresa', 'locales', 'monedas', 'nomina', 'impuestos', 'usuarios', 'datos']) {
    await page.getByTestId(`config-nav-${id}`).click();
    await expect(page.getByTestId(`config-${id}`)).toBeVisible();
  }
});

test('empresa: el nombre, el NIT y los colores cambian el sistema entero y emiten marca_personalizada', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/configuracion/empresa');
  await expect(page.getByTestId('config-marca')).toContainText('HALDEN es una marca de ejemplo.');
  await expect(page.getByTestId('config-insignia-ejemplo')).toBeVisible();

  // La vista previa responde al escribir, antes de guardar.
  await page.getByTestId('config-nombre-negocio').fill('Casa Ibarra');
  await expect(page.getByTestId('config-wordmark')).toContainText('Casa Ibarra');
  await expect(page.getByTestId('config-vista-previa')).toContainText('Casa Ibarra');
  await page.getByTestId('config-nombre-persona').fill('Marcela');

  // NIT: con nueve cifras se calcula el dígito de verificación; uno mal escrito se explica.
  await page.getByTestId('config-nit').fill('900123456');
  await page.getByTestId('config-nit').blur();
  await expect(page.getByTestId('config-nit')).toHaveValue('900.123.456-8');
  await page.getByTestId('config-nit').fill('900123456-1');
  await page.getByRole('button', { name: 'Guardar marca' }).click();
  await expect(page.getByTestId('config-datos-negocio')).toContainText('debería ser 8');
  await page.getByTestId('config-nit').fill('900123456');
  await page.getByTestId('config-nit').blur();

  await page.getByTestId('config-color-acento').fill('#2F6B4F');
  await page.getByTestId('config-derivar-tonos').click();
  await expect(page.getByTestId('config-color-texto')).not.toHaveValue('#7A5634');
  await page.getByTestId('config-color-tienda').fill('#222222');

  await page.getByRole('button', { name: 'Guardar marca' }).click();
  await expect(page.getByTestId('config-insignia-propia')).toBeVisible();
  await expect(page.getByTestId('config-volver-halden')).toBeVisible();

  const r = await conKc(page, (kc) => ({
    nit: kc.estado() && (kc.estado() as unknown as { empresa: { nit: string; colores: { acento: string; tiendaHero: string } } }).empresa.nit,
    acento: (kc.estado() as unknown as { empresa: { colores: { acento: string } } }).empresa.colores.acento,
    eventos: kc.eventosUI().map((e) => e.tipo),
    marca: JSON.stringify((kc as unknown as { sesion: { getState: () => { marcaPersonalizada: unknown } } }).sesion.getState().marcaPersonalizada),
  }));
  expect(r.nit).toBe('900.123.456-8');
  expect(r.acento).toBe('#2F6B4F');
  expect(r.eventos).toContain('marca_personalizada');
  expect(JSON.parse(r.marca)).toEqual({ nombreNegocio: 'Casa Ibarra', nombrePersona: 'Marcela' });

  // El nombre llega a la barra lateral y los colores a las variables CSS de toda la aplicación.
  await expect(page.locator('[data-marca="Casa Ibarra"]:visible').first()).toBeVisible();
  const color = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--marca-acento').trim().toUpperCase());
  expect(color).toBe('#2F6B4F');

  // Volver a HALDEN deja la marca y los colores de ejemplo.
  await page.getByTestId('config-volver-halden').click();
  await expect(page.getByTestId('config-insignia-ejemplo')).toBeVisible();
  await expect(page.getByTestId('config-marca')).toContainText('HALDEN es una marca de ejemplo.');
  const vuelta = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--marca-acento').trim().toUpperCase());
  expect(vuelta).toBe('#A67C52');
});

test('empresa: un NIT o un correo inválidos se explican junto al campo y no se guarda nada', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/configuracion/empresa');
  await page.getByTestId('config-correo').fill('sin-arroba');
  await page.getByTestId('config-nit').fill('123');
  await page.getByRole('button', { name: 'Guardar marca' }).click();
  await expect(page.getByTestId('config-datos-negocio')).toContainText('9 cifras');
  await expect(page.getByTestId('config-datos-negocio')).toContainText('correo válido');
  const n = await conKc(page, (kc) => kc.datos.getState().registro.length);
  expect(n).toBe(0);
});

test('empresa: las reglas de venta se editan y se guardan', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/configuracion/empresa');
  const reglas = page.getByTestId('config-reglas');
  await reglas.getByLabel('Descuento máximo del vendedor').fill('12,5');
  await expect(page.getByTestId('config-barra-reglas')).toContainText('1 cambio sin guardar');
  await page.getByTestId('config-barra-reglas').getByRole('button', { name: 'Guardar cambios' }).click();
  const v = await conKc(page, (kc) => (kc.estado() as unknown as { parametros: { ventas: { descuentoMaximoVendedor: number } } }).parametros.ventas.descuentoMaximoVendedor);
  expect(v).toBe(0.125);
});

test('locales: crear, editar y eliminar con confirmación y consecuencias explicadas', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/configuracion/locales');
  await expect(page.getByTestId('locales-tabla')).toContainText('Parque 93');
  await expect(page.getByTestId('locales-tabla')).toContainText('Bodega central');
  const antes = await conKc(page, (kc) => Object.values(kc.estado().cuentas).length);

  await page.getByTestId('locales-nuevo').click();
  await page.getByTestId('local-guardar').click();
  await expect(page.getByTestId('local-formulario')).toContainText('Escribe el nombre del local.');
  await page.getByTestId('local-nombre').fill('Andino');
  await page.getByTestId('local-codigo').fill('p93');
  await page.getByTestId('local-direccion').fill('Carrera 11 # 82-71');
  await page.getByTestId('local-arriendo').fill('12000000');
  await page.getByTestId('local-area').fill('85');
  await page.getByTestId('local-guardar').click();
  await expect(page.getByTestId('local-formulario')).toContainText('Ya hay un local con ese código.');
  await page.getByTestId('local-codigo').fill('and');
  await page.getByTestId('local-guardar').click();
  await expect(page.getByTestId('local-formulario')).toBeHidden();
  await expect(page.getByTestId('locales-tabla')).toContainText('Andino');

  const creado = await conKc(page, (kc) => {
    const e = kc.estado() as unknown as { locales: Record<string, { id: string; nombre: string; codigo: string; vende: boolean; cuentaCajaId: string | null; arriendoMensual: number }>; cuentas: Record<string, unknown> };
    const l = Object.values(e.locales).find((x) => x.codigo === 'AND');
    return { l, cuentas: Object.keys(e.cuentas).length };
  });
  expect(creado.l?.nombre).toBe('Andino');
  expect(creado.l?.arriendoMensual).toBe(12_000_000);
  expect(creado.l?.cuentaCajaId).toBeTruthy();
  expect(creado.cuentas).toBe(antes + 1);
  // Aparece en el selector de local de la barra superior.
  await page.getByTestId('selector-local').click();
  await expect(page.getByTestId(`local-${creado.l?.id}`)).toBeVisible();
  await page.keyboard.press('Escape');

  // Editar.
  await page.getByTestId('local-acciones-AND').click();
  await page.getByRole('menuitem', { name: 'Editar' }).click();
  await page.getByTestId('local-nombre').fill('Andino Plaza');
  await page.getByTestId('local-guardar').click();
  await expect(page.getByTestId('locales-tabla')).toContainText('Andino Plaza');

  // Eliminar: la confirmación explica qué pasa; Cancelar no cambia nada.
  await page.getByTestId('local-acciones-AND').click();
  await page.getByRole('menuitem', { name: 'Eliminar' }).click();
  const confirmacion = page.getByRole('alertdialog');
  await expect(confirmacion).toContainText('¿Eliminar Andino Plaza?');
  await expect(confirmacion).toContainText('Se conservan');
  await confirmacion.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByTestId('locales-tabla')).toContainText('Andino Plaza');
  await page.getByTestId('local-acciones-AND').click();
  await page.getByRole('menuitem', { name: 'Eliminar' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar local' }).click();
  await expect(page.getByTestId('locales-tabla')).not.toContainText('Andino Plaza');
});

test('locales: un local con mercancía no se puede eliminar y se explica por qué', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/configuracion/locales');
  await page.getByTestId('local-acciones-USQ').click();
  await page.getByRole('menuitem', { name: 'Eliminar' }).click();
  const d = page.getByTestId('local-bloqueado');
  await expect(d).toContainText('todavía no se puede eliminar');
  await expect(d).toContainText('unidades en existencia');
  await d.getByRole('button', { name: 'Entendido' }).click();
  const hay = await conKc(page, (kc) => (kc.estado() as unknown as { locales: Record<string, { eliminadoEn?: string }> }).locales.usq?.eliminadoEn ?? null);
  expect(hay).toBeNull();
});

test('monedas: la tasa de ejemplo se edita con fecha y las cifras cambian en todo el sistema', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/configuracion/monedas');
  await expect(page.getByTestId('tasas-aviso-ejemplo')).toContainText('de ejemplo');
  await expect(page.getByTestId('tasa-vigente-USD')).toContainText('3.950');
  await expect(page.getByTestId('tasa-vigente-CNY')).toContainText('548');
  await expect(page.getByTestId('tasa-tarjeta-USD').getByTestId('tasa-ejemplo')).toBeVisible();

  // En dólares: la cifra de ventas del mes cambia al escribir y, al guardar, en todo el sistema.
  await page.getByTestId('tasas-ver-USD').click();
  const celdaHoy = page.getByTestId('tasa-efecto-USD').locator('tbody tr').first().locator('td').nth(2);
  const celdaTuya = page.getByTestId('tasa-efecto-USD-ventas');
  const antes = limpio(await celdaHoy.textContent());
  await page.getByTestId('tasa-valor-USD').fill('4100');
  await expect.poll(async () => limpio(await celdaTuya.textContent())).not.toBe(antes);
  expect(limpio(await celdaHoy.textContent())).toBe(antes);
  await page.getByTestId('tasa-guardar-USD').click();
  await expect(page.getByTestId('tasa-vigente-USD')).toContainText('4.100');
  await expect(page.getByTestId('tasa-tarjeta-USD').getByTestId('tasa-propia')).toBeVisible();
  await expect.poll(async () => limpio(await celdaHoy.textContent())).not.toBe(antes);
  const r = await conKc(page, (kc) => ({
    usd: kc.sel('selTasaVigente', { moneda: 'USD', fecha: '2026-09-30' }),
    cny: kc.sel('selTasaVigente', { moneda: 'CNY', fecha: '2026-09-30' }),
    ev: kc.eventosDominio().map((e) => e.tipo),
  }));
  expect(r.usd).toBe(4100);
  expect(r.cny).toBe(548);
  expect(r.ev).toContain('TasaRegistrada');

  // Otra pantalla de Configuración, ahora en dólares, usa la tasa nueva (no la de ejemplo).
  const costoAntes = await conKc(page, (kc) => kc.sel('selComparativoModalidades', { valorMensual: 1_750_905, exoneracion: true, fecha: '2026-09-30' }) as { laboral: { costoEmpleador: number } });
  await page.getByTestId('config-nav-nomina').click();
  const texto = limpio(await page.getByTestId('nomina-prev-costo').textContent());
  const cop = costoAntes.laboral.costoEmpleador;
  const enUsd = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.round((cop / 4100) * 100) / 100);
  expect(texto).toContain(`US$ ${enUsd}`);
});

test('monedas: una tasa del historial se edita y se elimina, y la última de una moneda no se elimina', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/configuracion/monedas');
  const historial = page.getByTestId('tasas-historial');
  await expect(historial).toContainText('Historial de tasas');
  await expect(historial.getByText('En uso hoy')).toHaveCount(1);
  const n0 = await conKc(page, (kc) => Object.keys((kc.estado() as unknown as { tasas: object }).tasas).length);

  // Agregar una tasa de otra fecha.
  await page.getByTestId('tasas-agregar').click();
  await page.getByTestId('tasa-dialogo-valor').fill('0');
  await page.getByTestId('tasa-dialogo-guardar').click();
  await expect(page.getByTestId('tasa-dialogo')).toContainText('mayor que cero');
  await page.getByTestId('tasa-dialogo-valor').fill('3900,5');
  await page.getByTestId('tasa-dialogo-guardar').click();
  await expect(page.getByTestId('tasa-dialogo')).toBeHidden();
  // Esa fecha (hoy) ya tenía una: se reemplaza, así que el total no crece.
  const n1 = await conKc(page, (kc) => Object.keys((kc.estado() as unknown as { tasas: object }).tasas).length);
  expect(n1).toBe(n0);

  // Editar la segunda fila.
  await page.getByRole('button', { name: /Acciones de la tasa del/ }).nth(1).click();
  await page.getByRole('menuitem', { name: 'Editar' }).click();
  await page.getByTestId('tasa-dialogo-valor').fill('3930');
  await page.getByTestId('tasa-dialogo-guardar').click();
  await expect(historial).toContainText('3.930,00');

  // Eliminar la tercera.
  await page.getByRole('button', { name: /Acciones de la tasa del/ }).nth(2).click();
  await page.getByRole('menuitem', { name: 'Eliminar' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('usan la tasa anterior');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar tasa' }).click();
  const n2 = await conKc(page, (kc) => Object.keys((kc.estado() as unknown as { tasas: object }).tasas).length);
  expect(n2).toBe(n1 - 1);
});

test('nómina: los parámetros llevan la marca "verificar", la vista previa se recalcula en vivo y se guardan', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/configuracion/nomina');
  await expect(page.getByTestId('config-nomina').locator('[data-nota-legal="nomina"]')).toBeVisible();
  await expect(page.getByTestId('nomina-recargos')).toContainText('Valor ilustrativo · verificar');
  await expect(page.getByTestId('nomina-salario')).toContainText('Valor ilustrativo · verificar');
  const costo = page.getByTestId('nomina-prev-costo');
  const antes = limpio(await costo.textContent());

  await page.getByTestId('nomina-smmlv').fill('1900000');
  await expect.poll(async () => limpio(await costo.textContent())).not.toBe(antes);
  await page.getByTestId('nomina-recargo-dominical').fill('95');
  await expect(page.getByTestId('nomina-barra')).toContainText('2 cambios sin guardar');
  // Lo guardado no cambia hasta guardar.
  const sinGuardar = await conKc(page, (kc) => (kc.estado() as unknown as { parametros: { nomina: { smmlv: number } } }).parametros.nomina.smmlv);
  expect(sinGuardar).toBe(1_750_905);

  await page.getByTestId('config-guardar').click();
  const g = await conKc(page, (kc) => {
    const n = (kc.estado() as unknown as { parametros: { nomina: { smmlv: number; recargos: { dominicalFestivo: number } } } }).parametros.nomina;
    return { smmlv: n.smmlv, dom: n.recargos.dominicalFestivo, ev: kc.eventosDominio().map((e) => e.tipo) };
  });
  expect(g.smmlv).toBe(1_900_000);
  expect(g.dom).toBe(0.95);
  expect(g.ev).toContain('ParametrosEditados');
  await expect(page.getByTestId('nomina-barra')).toContainText('Todo guardado');

  // Volver a los valores de ejemplo y guardar deja todo como estaba.
  await page.getByTestId('config-valores-ejemplo').click();
  await expect(page.getByTestId('nomina-barra')).toContainText('cambios sin guardar');
  await page.getByTestId('config-guardar').click();
  const v = await conKc(page, (kc) => (kc.estado() as unknown as { parametros: { nomina: { smmlv: number } } }).parametros.nomina.smmlv);
  expect(v).toBe(1_750_905);
});

test('nómina: un porcentaje mal escrito se explica y el divisor manual cambia el valor de la hora', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/configuracion/nomina');
  await page.getByTestId('nomina-recargo-nocturno').fill('abc');
  await expect(page.getByTestId('nomina-recargos')).toContainText('Escribe un porcentaje');
  await page.getByTestId('nomina-recargo-nocturno').fill('35');
  await expect(page.getByTestId('nomina-prev-hora')).toContainText('210 horas');
  await page.getByRole('switch', { name: 'Calcular las horas del mes automáticamente' }).click();
  await page.getByTestId('nomina-divisor').fill('200');
  await expect(page.getByTestId('nomina-prev-hora')).toContainText('200 horas');
});

test('impuestos: el IVA y las fechas se editan; el ejemplo se recalcula', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/configuracion/impuestos');
  await expect(page.getByTestId('config-impuestos').locator('[data-nota-legal="tributario"]')).toBeVisible();
  await expect(page.getByTestId('impuestos-ejemplo-iva')).toContainText('159.580');
  await page.getByTestId('impuestos-iva-general').fill('16');
  await expect(page.getByTestId('impuestos-ejemplo-iva')).toContainText('163.707');
  await page.getByTestId('config-guardar').click();
  const iva = await conKc(page, (kc) => (kc.estado() as unknown as { parametros: { impuestos: { ivaGeneral: number } } }).parametros.impuestos.ivaGeneral);
  expect(iva).toBe(0.16);
});

test('aduanas: los tributos de ejemplo mueven el costo del pedido en vivo y se guardan', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/configuracion/aduanas');
  await expect(page.getByTestId('config-aduanas').locator('[data-nota-legal="aduanero"]')).toBeVisible();
  await expect(page.getByTestId('aduanas-tributos')).toContainText('Valor de ejemplo · se valida con tu agente de aduanas');
  const total = page.getByTestId('aduanas-sim-total');
  const antes = limpio(await total.textContent());
  await page.getByTestId('aduanas-arancel').fill('20');
  await expect.poll(async () => limpio(await total.textContent())).not.toBe(antes);
  await page.getByTestId('aduanas-otros').fill('300');
  await expect(page.getByTestId('aduanas-sim-otros_tributos')).not.toContainText('$ 0');
  await page.getByTestId('config-guardar').click();
  const a = await conKc(page, (kc) => (kc.estado() as unknown as { parametros: { aduanas: { arancelPct: number; otrosTributosPorUnidad: number } } }).parametros.aduanas);
  expect(a.arancelPct).toBe(0.2);
  expect(a.otrosTributosPorUnidad).toBe(300);
});

test('usuarios: la tabla de qué ve cada rol sale de las reglas reales y los usuarios se crean y eliminan', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/configuracion/usuarios');
  await expect(page.getByTestId('usuarios-tabla')).toContainText('Sebastián Cárdenas');
  const permitido = (permiso: string, rol: string) => page.getByTestId(`permiso-${permiso}-${rol}`).getAttribute('data-permitido');
  expect(await permitido('venta.anular', 'dueno')).toBe('true');
  expect(await permitido('venta.anular', 'vendedor')).toBe('false');
  expect(await permitido('ver.costos', 'vendedor')).toBe('false');
  expect(await permitido('ver.todosLosLocales', 'bodega')).toBe('true');
  expect(await permitido('configuracion', 'bodega')).toBe('false');
  expect(await permitido('restaurar', 'vendedor')).toBe('true');

  await page.getByTestId('usuarios-nuevo').click();
  await page.getByTestId('usuario-guardar').click();
  await expect(page.getByTestId('usuario-formulario')).toContainText('Escribe el nombre');
  await page.getByTestId('usuario-nombre').fill('Ana Prueba');
  await page.getByTestId('usuario-correo').fill('ana@minegocio.example');
  await page.getByTestId('usuario-guardar').click();
  await expect(page.getByTestId('usuarios-tabla')).toContainText('Ana Prueba');
  const n = await conKc(page, (kc) => Object.values((kc.estado() as unknown as { usuarios: Record<string, { nombre: string }> }).usuarios).filter((u) => u.nombre === 'Ana Prueba').length);
  expect(n).toBe(1);

  await page.getByRole('button', { name: 'Acciones de Ana Prueba' }).click();
  await page.getByRole('menuitem', { name: 'Eliminar' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar usuario' }).click();
  await expect(page.getByTestId('usuarios-tabla')).not.toContainText('Ana Prueba');

  // Las tres personas de la demo no se eliminan.
  await page.getByRole('button', { name: 'Acciones de Sebastián Cárdenas' }).click();
  await expect(page.getByRole('menuitem', { name: 'Eliminar' })).toHaveCount(0);
});

test('datos: restaurar regresa todo al estado inicial exacto (venta registrada → restaurar → hash inicial)', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/configuracion/datos');
  await expect(page.getByTestId('datos-estado-inicial')).toBeVisible();
  await expect(page.getByTestId('datos-cambios')).toHaveText('0');
  const hashInicial = await conKc(page, (kc) => kc.hashEstado());

  // El visitante registra una venta: aparece en el resumen y el estado ya no es el inicial.
  const venta = await registrarVentaDePrueba(page);
  await expect(page.getByTestId('datos-cambios')).toHaveText('1');
  await expect(page.getByTestId('datos-resumen')).toContainText('Ventas');
  expect(await conKc(page, (kc) => kc.hashEstado())).not.toBe(hashInicial);
  expect(await page.evaluate((id) => (globalThis as unknown as { __kc: { estado: () => { ventas: Record<string, unknown> } } }).__kc.estado().ventas[id] !== undefined, venta.ventaId)).toBe(true);

  // La pista de la pantalla está sobre el botón de restaurar.
  await page.getByTestId('pista-configuracion.restaurar').click();
  await expect(page.getByRole('dialog', { name: 'Pista' })).toContainText('empezar de cero, restaura la demo');
  await page.keyboard.press('Escape');

  // Confirmación con palabra clave: el botón no se habilita hasta escribirla; cancelar no cambia nada.
  await page.getByTestId('datos-restaurar-boton').click();
  const dlg = page.getByRole('alertdialog');
  await expect(dlg).toContainText('¿Restaurar los datos de demostración?');
  await expect(dlg).toContainText('Hoy hay 1 cambio tuyos');
  await expect(dlg.getByRole('button', { name: 'Restaurar datos de demostración' })).toBeDisabled();
  await dlg.getByRole('button', { name: 'Cancelar' }).click();
  expect(await conKc(page, (kc) => kc.datos.getState().registro.length)).toBe(1);

  await page.getByTestId('datos-restaurar-boton').click();
  await page.getByRole('alertdialog').getByLabel('Escribe RESTAURAR para confirmar').fill('restaurar');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Restaurar datos de demostración' }).click();

  await expect.poll(() => conKc(page, (kc) => kc.datos.getState().registro.length === 0 && !kc.datos.getState().reconstruyendo)).toBe(true);
  await esperarDatos(page);
  await expect(page.getByTestId('datos-estado-inicial')).toBeVisible();
  const despues = await conKc(page, (kc) => ({ hash: kc.hashEstado(), ventas: Object.keys(kc.estado().ventas) }));
  expect(despues.ventas).not.toContain(venta.ventaId);
  expect(despues.hash).toBe(hashInicial);
});

test('datos: muestra dónde se guardan los cambios, el espacio usado y las áreas que cambiaron', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/configuracion/datos');
  await expect(page.getByTestId('datos-modo')).toContainText('En este navegador');
  await registrarVentaDePrueba(page);
  // (No se devuelve el resultado: incluye el estado completo y serializarlo tarda decenas de segundos.)
  await conKc(page, (kc) => {
    (kc.acciones as Record<string, (d: unknown) => unknown>)['editarParametros']?.({ seccion: 'inventario', cambios: { stockMinimoPorDefecto: 3 } });
    return null;
  });
  await expect(page.getByTestId('datos-cambios')).toHaveText('2');
  await expect(page.getByTestId('datos-resumen')).toContainText('Configuración');
  await expect(page.getByTestId('datos-almacenamiento')).toContainText(/KB|B de/);
});

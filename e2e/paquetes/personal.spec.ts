import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { esperarDatos } from '../kc';

/**
 * C1 · Personal, nómina y comisiones (PLAN 9.4). Verifica solo las pantallas de `/panel/personal/**` y
 * `/panel/mis-comisiones`; los efectos sobre otros módulos se leen por `window.__kc`. Sin errores de consola.
 */
const HOY = '2026-09-30';
const AHORA = `${HOY}T15:30:00`;
const miles = (n: number) => new Intl.NumberFormat('es-CO').format(Math.round(n));
const pesos = (n: number) => `$\u00a0${miles(n)}`;

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

/** Un selector del catálogo con parámetros (no se pueden capturar variables dentro de `conKc`). */
function sel<T = unknown>(page: Page, nombre: string, params?: unknown): Promise<T> {
  return page.evaluate(([n, p]) => (globalThis as unknown as { __kc: { sel: (n: string, p: unknown) => unknown } }).__kc.sel(n as string, p), [nombre, params] as const) as Promise<T>;
}
function eventosUI(page: Page) {
  return page.evaluate(() => (globalThis as unknown as { __kc: { eventosUI: () => { tipo: string; datos: Record<string, unknown> }[] } }).__kc.eventosUI());
}
function eventosDominio(page: Page) {
  return page.evaluate(() => (globalThis as unknown as { __kc: { eventosDominio: () => { tipo: string }[] } }).__kc.eventosDominio().map((e) => e.tipo));
}

async function abrir(page: Page, irA: (ruta: string) => Promise<void>, ruta: string) {
  await irA(ruta);
  await esperarDatos(page);
  await expect(page.getByTestId('pagina')).toBeVisible();
}

async function elegir(page: Page, etiqueta: string, opcion: string | RegExp) {
  await page.getByLabel(etiqueta, { exact: true }).click();
  await page.getByRole('option', { name: opcion }).click();
}

interface Costo {
  costo: number;
  neto: number;
  comisiones: number;
  barras: { salario: number; comisiones: number; recargos: number; auxilio: number; aportes: number; prestaciones: number };
}
const costoDe = (page: Page, empleadoId: string, modo: 'pactado' | 'mes_actual', exoneracion: boolean) =>
  sel<Costo>(page, 'selCostoEmpleado', { empleadoId, modo, exoneracion, hoy: HOY, ahora: AHORA });

// ---------------------------------------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------------------------------------
test('lista: cada persona muestra su costo para el negocio del selector y la exoneración lo cambia en vivo', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/personal');
  await expect(page.getByTestId('personal-tabla')).toContainText('Sebastián Cárdenas Ruiz');
  const con = await costoDe(page, 'em_scardenas', 'pactado', true);
  const sin = await costoDe(page, 'em_scardenas', 'pactado', false);
  expect(con.costo).toBe(2_990_941);
  expect(sin.costo).toBe(3_254_191);
  const celda = page.getByTestId('personal-costo-em_scardenas');
  await expect(celda).toHaveAttribute('data-costo', String(con.costo));
  await expect(celda).toContainText(pesos(con.costo));

  // Apagar la exoneración sube el costo de cada empleado laboral.
  await page.getByRole('switch', { name: /Exoneración de aportes/ }).click();
  await expect(celda).toHaveAttribute('data-costo', String(sin.costo));

  // Modo "este mes, con comisiones y recargos".
  await page.getByTestId('personal-lista-modo-mes').click();
  const mes = await costoDe(page, 'em_scardenas', 'mes_actual', false);
  await expect(celda).toHaveAttribute('data-costo', String(mes.costo));
  expect(mes.costo).toBeGreaterThan(sin.costo);

  // La vista comparativa por local trae el costo de nómina sobre ventas de selCostoNominaPorLocal.
  const porLocal = await sel<{ locales: { localId: string; costo: number; porcentaje: number | null }[]; total: number }>(page, 'selCostoNominaPorLocal', { mes: '2026-08' });
  await expect(page.getByTestId('personal-por-local-total')).toHaveAttribute('data-total', String(porLocal.total));
  for (const l of porLocal.locales) await expect(page.getByTestId(`personal-local-${l.localId}`)).toHaveAttribute('data-costo', String(l.costo));
  await expect(page.getByTestId('personal-nota-nomina').first()).toContainText('Cálculo ilustrativo para la demo. Los valores se parametrizan y validan con el contador en la implementación.');
});

test('lista: la pista "Costo para el negocio" existe, el filtro por local y la búsqueda funcionan', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/personal?local=usq');
  await expect(page.getByTestId('personal-tabla')).toContainText('Sebastián Cárdenas Ruiz');
  await expect(page.getByTestId('personal-tabla')).not.toContainText('Valentina Gómez Arango');
  await page.getByTestId('pista-personal.costo').click();
  await expect(page.getByRole('dialog', { name: 'Pista' })).toContainText('Un salario no es lo que te cuesta un empleado');
  await page.getByRole('button', { name: 'Entendido' }).click();
  await page.getByPlaceholder('Buscar por nombre, cargo o documento').fill('hernando');
  await expect(page.getByTestId('personal-tabla')).toContainText('Hernando Beltrán Acosta');
  await expect(page.getByTestId('personal-tabla')).not.toContainText('Sebastián');
});

test('lista: ?resaltar= destaca a la persona', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/personal?resaltar=em_wdiaz');
  await expect(page.locator('[data-resaltada]')).toContainText('Wilson Díaz Forero');
});

test('?riesgo=contrato-realidad filtra a los contratistas con señales y abre la explicación con la nota prudente', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/personal?riesgo=contrato-realidad');
  const riesgos = await sel<{ empleadoId: string; nombre: string }[]>(page, 'selRiesgosContratacion', { hoy: HOY });
  expect(riesgos.length).toBeGreaterThan(0);
  const panel = page.getByTestId('personal-panel-riesgo');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Riesgo de contrato realidad');
  await expect(panel).toContainText('Revísalo con tu contador');
  for (const r of riesgos) {
    await expect(page.getByTestId(`personal-riesgo-${r.empleadoId}`)).toBeVisible();
    await expect(page.getByTestId('personal-tabla')).toContainText(r.nombre);
  }
  await expect(page.getByTestId('personal-tabla')).not.toContainText('Wilson Díaz Forero');
  // La exposición es la diferencia de costo entre ser contratista y ser empleado.
  const expo = await page.getByTestId('personal-exposicion-mes').innerText();
  expect(expo).toMatch(/\$\s?[\d.]+/);
  await page.getByTestId('personal-quitar-riesgo').click();
  await expect(page).not.toHaveURL(/riesgo=/);
  await expect(page.getByTestId('personal-tabla')).toContainText('Wilson Díaz Forero');
  await expect(page.getByTestId('personal-aviso-riesgo')).toBeVisible();
});

// ---------------------------------------------------------------------------------------------------------
// Ficha y W6
// ---------------------------------------------------------------------------------------------------------
test('W6: la pestaña "Costo para el negocio" desglosa el costo, cambia de modo y la exoneración mueve los aportes en vivo', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/personal/sebastian-cardenas/costo');
  const con = await costoDe(page, 'em_scardenas', 'pactado', true);
  const sin = await costoDe(page, 'em_scardenas', 'pactado', false);
  const panel = page.getByTestId('personal-costo');
  await expect(panel).toHaveAttribute('data-costo', '2990941');
  await expect(panel).toContainText('Un salario de');
  await expect(panel).toContainText(pesos(1_950_000));
  await expect(page.getByTestId('personal-costo-total')).toContainText(pesos(con.costo));
  expect(con.costo).toBe(2_990_941);

  // La barra apilada suma el costo y sus segmentos son los de selCostoEmpleado.
  const barra = page.getByTestId('personal-barra-costo');
  await expect(barra).toHaveAttribute('data-total', String(con.costo));
  await expect(page.getByTestId('personal-segmento-salario')).toHaveAttribute('data-valor', String(con.barras.salario));
  await expect(page.getByTestId('personal-segmento-aportes')).toHaveAttribute('data-valor', String(con.barras.aportes));
  await expect(page.getByTestId('personal-segmento-prestaciones')).toHaveAttribute('data-valor', String(con.barras.prestaciones));

  // Los cuatro grupos del desglose y los aportes exonerados (salud del empleador, ICBF y SENA).
  for (const g of ['devengados', 'deducciones', 'aportes', 'provisiones']) await expect(page.getByTestId(`personal-grupo-${g}`)).toBeVisible();
  for (const f of ['salud-e', 'icbf', 'sena']) await expect(page.getByTestId(`personal-fila-${f}`)).toHaveAttribute('data-valor', '0');
  await expect(page.getByTestId('personal-grupo-aportes')).toContainText('Exonerado');

  // Apagar la exoneración: vuelven salud 8,5 %, ICBF 3 % y SENA 2 % y el costo sube a $ 3.254.191.
  await page.getByRole('switch', { name: /Exoneración de aportes/ }).click();
  await expect(panel).toHaveAttribute('data-costo', String(sin.costo));
  expect(sin.costo).toBe(3_254_191);
  for (const f of ['salud-e', 'icbf', 'sena']) await expect(page.getByTestId(`personal-fila-${f}`)).not.toHaveAttribute('data-valor', '0');
  await expect(page.getByTestId('personal-grupo-aportes')).toContainText('8,5');
  await expect(page.getByTestId('personal-grupo-aportes')).not.toContainText('Exonerado');
  await page.getByRole('switch', { name: /Exoneración de aportes/ }).click();
  await expect(panel).toHaveAttribute('data-costo', String(con.costo));
  await expect(page.getByTestId('personal-ahorro-exoneracion')).toHaveAttribute('data-ahorro', String(sin.costo - con.costo));

  // Segundo modo: con la comisión del mes y los recargos.
  await page.getByTestId('personal-modo-mes').click();
  const mes = await costoDe(page, 'em_scardenas', 'mes_actual', true);
  await expect(panel).toHaveAttribute('data-costo', String(mes.costo));
  expect(mes.comisiones).toBeGreaterThan(0);
  expect(mes.barras.recargos).toBeGreaterThan(0);
  expect(mes.costo).toBeGreaterThan(con.costo);
  await expect(page.getByTestId('personal-que-entra')).toContainText('Comisión');
  await expect(page.getByTestId('personal-segmento-comisiones')).toHaveAttribute('data-valor', String(mes.barras.comisiones));
  await expect(page.getByTestId('personal-segmento-recargos')).toHaveAttribute('data-valor', String(mes.barras.recargos));

  // Comparativo con prestación de servicios y la nota prudente; la nota de nómina siempre visible.
  await expect(page.getByTestId('personal-comparativo')).toBeVisible();
  await expect(page.getByTestId('personal-cmp-nota-prudente')).toContainText('relación laboral');
  await expect(page.getByTestId('personal-nota-nomina')).toContainText('Cálculo ilustrativo para la demo');
  // Evento de la guía con la persona.
  const ev = (await eventosUI(page)).filter((e) => e.tipo === 'costo_empleador_visto');
  expect(ev.length).toBeGreaterThan(0);
  expect(ev[0]?.datos.empleadoId).toBe('em_scardenas');
});

test('ficha: contratista con riesgo muestra la alerta, su costo como prestación y lo que costaría como empleado', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/personal/daniela-moreno/costo');
  await expect(page.getByTestId('personal-riesgo-ficha')).toContainText('Riesgo de contrato realidad');
  await expect(page.getByTestId('personal-riesgo-ficha')).toContainText('Revísalo con tu contador');
  const c = await costoDe(page, 'em_dmoreno', 'pactado', true);
  await expect(page.getByTestId('personal-costo')).toHaveAttribute('data-costo', String(c.costo));
  expect(c.costo).toBe(1_900_000);
  await expect(page.getByTestId('personal-comparativo')).toBeVisible();
  await expect(page.getByTestId('personal-desglose-prestacion')).toContainText('Retención en la fuente');
});

test('ficha: datos, contrato y desprendibles; una persona inexistente muestra su estado vacío', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/personal/sebastian-cardenas');
  await expect(page.getByTestId('personal-pestana-datos')).toContainText('Contacto de emergencia');
  await expect(page.getByTestId('personal-pestana-datos')).toContainText('Cuenta para el pago');
  await page.getByRole('link', { name: 'Contrato', exact: true }).click();
  await expect(page.getByTestId('personal-contrato-vigente')).toContainText('$\u00a01.950.000');
  await expect(page.getByTestId('personal-contrato-esquema')).toContainText('3');
  await page.getByRole('link', { name: 'Desprendibles', exact: true }).click();
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByTestId('documento-desprendible').first().getByRole('button').click()]);
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  expect((await eventosUI(page)).some((e) => e.tipo === 'pdf_generado' && e.datos.reporte === 'desprendible')).toBe(true);
  await page.goto(`/panel/personal/no-existe-nadie?hoy=${HOY}T15%3A30`);
  await esperarDatos(page);
  await expect(page.getByTestId('personal-ficha-no-encontrada')).toContainText('No encontramos a esa persona');
});

test('empleado nuevo: valida junto a cada campo, calcula el costo mientras se llena y crea la persona con su contrato', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/personal/nuevo');
  await page.getByTestId('personal-crear').click();
  const form = page.getByTestId('personal-formulario-nuevo');
  await expect(form).toContainText('Escribe los nombres.');
  await expect(form).toContainText('Elige el cargo.');
  await expect(form).toContainText('Escribe un celular de 10 dígitos que empiece por 3.');
  await expect(form).toContainText('Escribe el salario mensual.');

  await page.getByTestId('personal-nombres').fill('Mariana');
  await page.getByTestId('personal-apellidos').fill('Peña Ortiz');
  await page.getByTestId('personal-documento').fill('1020304050');
  await page.getByTestId('personal-celular').fill('3101234567');
  await page.getByTestId('personal-correo').fill('mariana@ejemplo.co');
  await elegir(page, 'Cargo', 'Vendedor');
  await elegir(page, 'Local', 'Usaquén');
  for (const [etiqueta, valor] of [
    ['EPS', 'EPS Ceiba'],
    ['Fondo de pensión', 'Pensiones Altiplano'],
    ['Fondo de cesantías', 'Cesantías Altiplano'],
    ['ARL', 'ARL Resguardo'],
    ['Caja de compensación', 'Caja Sabana de Compensación'],
    ['Banco o billetera', 'Banco Meridiano'],
    ['Número de cuenta o celular de la billetera', '1234567890'],
  ] as const)
    await page.getByLabel(etiqueta, { exact: true }).fill(valor);
  await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Rosa Ortiz');
  await page.getByLabel('Parentesco').fill('Madre');
  await page.getByRole('textbox', { name: 'Celular', exact: true }).last().fill('3159876543');

  // El salario por debajo del mínimo se marca; con uno válido aparece lo que le costaría al negocio.
  await page.getByTestId('personal-salario').fill('1000000');
  await page.getByTestId('personal-crear').click();
  await expect(form).toContainText('El salario no puede ser menor que el salario mínimo.');
  await page.getByTestId('personal-salario').fill('1950000');
  const esperado = await sel<{ laboral: { costoEmpleador: number } }>(page, 'selComparativoModalidades', { valorMensual: 1_950_000, exoneracion: true, fecha: HOY, riesgoArl: 1 });
  await expect(page.getByTestId('personal-costo-contrato')).toHaveAttribute('data-costo', String(esperado.laboral.costoEmpleador));
  await page.getByTestId('personal-crear').click();

  await expect(page).toHaveURL(/\/panel\/personal\/mariana-pena/);
  const e = await sel<{ id: string; nombres: string; afiliaciones: { eps: string }; cuentaPago: { numeroEnmascarado: string } } | null>(page, 'selEmpleadoPorSlug', { slug: 'mariana-pena' });
  expect(e?.nombres).toBe('Mariana');
  expect(e?.cuentaPago.numeroEnmascarado).toBe('•••• 7890');
  expect(await eventosDominio(page)).toContain('EntidadCambiada');
  await expect(page.getByTestId('personal-ficha')).toContainText('Mariana Peña Ortiz');
});

test('editar, nuevo contrato y retirar con confirmación', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/personal/julian-torres');
  // Editar datos.
  await page.getByTestId('personal-editar').click();
  const dlg = page.getByTestId('personal-dialogo-editar');
  await dlg.getByTestId('personal-celular').fill('3001112233');
  await dlg.getByTestId('personal-guardar-datos').click();
  await expect(dlg).toHaveCount(0);
  const e = await sel<{ celular: string } | null>(page, 'selEmpleadoPorSlug', { slug: 'julian-torres' });
  expect(e?.celular).toBe('3001112233');

  // Nuevo contrato: el costo cambia.
  const antes = await costoDe(page, 'em_jtorres', 'pactado', true);
  await page.getByRole('link', { name: 'Contrato', exact: true }).click();
  await page.getByTestId('personal-reemplazar-contrato').click();
  const contrato = page.getByTestId('personal-dialogo-contrato');
  await contrato.getByTestId('personal-salario').fill('1800000');
  await contrato.getByTestId('personal-guardar-contrato').click();
  await expect(contrato).toHaveCount(0);
  const despues = await costoDe(page, 'em_jtorres', 'pactado', true);
  expect(despues.costo).toBeGreaterThan(antes.costo);
  await expect(page.getByTestId('personal-contrato-vigente')).toContainText('$\u00a01.800.000');
  await expect(page.getByTestId('personal-contrato-historial')).toContainText('$\u00a01.750.905');

  // Retirar: confirma con motivo y avisa de las consecuencias.
  await page.getByRole('button', { name: 'Más acciones de Julián Torres Duarte' }).click();
  await page.getByTestId('personal-retirar').click();
  const retiro = page.getByTestId('personal-dialogo-retiro');
  await retiro.getByTestId('personal-confirmar-retiro').click();
  await expect(retiro).toContainText('Escribe el motivo del retiro.');
  await retiro.getByTestId('personal-motivo-retiro').fill('Renuncia voluntaria');
  await retiro.getByTestId('personal-confirmar-retiro').click();
  await expect(retiro).toHaveCount(0);
  await expect(page.getByTestId('personal-ficha-retirada')).toBeVisible();
  const r = await sel<{ fechaRetiro: string | null } | null>(page, 'selEmpleadoPorSlug', { slug: 'julian-torres' });
  expect(r?.fechaRetiro).toBe(HOY);
});

test('PILA: un contratista sin planilla verificada queda pendiente y se verifica con soporte', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/personal/daniela-moreno/contrato');
  const mes = HOY.slice(0, 7);
  await expect(page.getByTestId(`personal-pila-${mes}`)).toHaveAttribute('data-verificada', 'no');
  await page.getByTestId(`personal-verificar-pila-${mes}`).click();
  await page.getByTestId('personal-confirmar-pila').click();
  await expect(page.getByTestId(`personal-pila-${mes}`)).toHaveAttribute('data-verificada', 'si');
  await expect(page.getByTestId(`personal-pila-${mes}`)).toContainText('Planilla PILA');
  const c = await page.evaluate(() => {
    const e = (globalThis as unknown as { __kc: { estado: () => { contratos: Record<string, { empleadoId: string; verificacionesPila: { periodo: string; verificada: boolean }[] }> } } }).__kc.estado();
    return Object.values(e.contratos).find((x) => x.empleadoId === 'em_dmoreno' && x.verificacionesPila.length > 0)?.verificacionesPila ?? [];
  });
  expect(c.some((v) => v.verificada)).toBe(true);
});

// ---------------------------------------------------------------------------------------------------------
// Comparativo
// ---------------------------------------------------------------------------------------------------------
test('comparativo: el mismo valor en las dos modalidades, con la nota prudente y el evento de la guía', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/personal/comparativo');
  await expect(page.getByTestId('personal-comparativo')).toBeVisible();
  await page.getByTestId('personal-comparativo-valor').fill('3000000');
  const cmp = await sel<{ diferenciaCosto: number; laboral: { costoEmpleador: number }; prestacion: { costoEmpleador: number } }>(page, 'selComparativoModalidades', { valorMensual: 3_000_000, exoneracion: true, fecha: HOY, riesgoArl: 1 });
  await expect(page.getByTestId('personal-cmp-diferencia')).toHaveAttribute('data-valor', String(cmp.diferenciaCosto));
  await expect(page.getByTestId('personal-cmp-costo')).toContainText(pesos(cmp.laboral.costoEmpleador));
  await expect(page.getByTestId('personal-cmp-costo')).toContainText(pesos(cmp.prestacion.costoEmpleador));
  await page.getByRole('switch', { name: /Exoneración de aportes/ }).click();
  const sin = await sel<{ diferenciaCosto: number }>(page, 'selComparativoModalidades', { valorMensual: 3_000_000, exoneracion: false, fecha: HOY, riesgoArl: 1 });
  await expect(page.getByTestId('personal-cmp-diferencia')).toHaveAttribute('data-valor', String(sin.diferenciaCosto));
  expect(sin.diferenciaCosto).toBeGreaterThan(cmp.diferenciaCosto);
  await expect(page.getByTestId('personal-cmp-nota-prudente')).toContainText('relación laboral');
  await expect(page.getByTestId('personal-nota-nomina')).toContainText('Cálculo ilustrativo para la demo');
  await expect(page.getByTestId('personal-comparativo-contratistas')).toContainText('2 personas por prestación de servicios');
  expect((await eventosUI(page)).some((e) => e.tipo === 'costo_empleador_visto' && e.datos.empleadoId === undefined)).toBe(true);
});

// ---------------------------------------------------------------------------------------------------------
// Nómina
// ---------------------------------------------------------------------------------------------------------
interface Periodo {
  inicio: string;
  fin: string;
  tipo: 'quincenal' | 'mensual';
  etiqueta: string;
}
interface Previa {
  liquidacion: { totales: { costo: number; neto: number; aportes: number }; lineas: { empleadoId: string; costoEmpleador: number }[] } | null;
  error: string | null;
}

test('nómina: la vista previa es la que escribiría nomina.aprobar y la exoneración la cambia; aprobar, desprendible, Excel y pagar', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/personal/nomina');
  const abiertos = await sel<{ quincenal: Periodo | null }>(page, 'selPeriodoAbierto', { hoy: HOY });
  const periodo = abiertos.quincenal as Periodo;
  await expect(page.getByTestId('personal-periodo-etiqueta')).toContainText('2.ª quincena de septiembre de 2026');
  const con = await sel<Previa>(page, 'selVistaPreviaNomina', { periodo, exoneracion: true, ahora: AHORA });
  const sin = await sel<Previa>(page, 'selVistaPreviaNomina', { periodo, exoneracion: false, ahora: AHORA });
  const totales = page.getByTestId('personal-totales-periodo');
  await expect(totales).toHaveAttribute('data-costo', String(con.liquidacion?.totales.costo));
  await page.getByRole('switch', { name: /Exoneración de aportes/ }).click();
  await expect(totales).toHaveAttribute('data-costo', String(sin.liquidacion?.totales.costo));
  expect(sin.liquidacion?.totales.costo as number).toBeGreaterThan(con.liquidacion?.totales.costo as number);
  await page.getByRole('switch', { name: /Exoneración de aportes/ }).click();

  // Cajón con el desglose de una persona.
  await page.getByTestId('personal-tabla-lineas').getByText('Sebastián Cárdenas Ruiz').click();
  const cajon = page.getByTestId('personal-cajon-linea');
  await expect(cajon).toContainText('Qué entró en este periodo');
  await expect(cajon.getByTestId('personal-grupo-aportes')).toBeVisible();
  await page.keyboard.press('Escape');

  // Aprobar con confirmación.
  await page.getByTestId('personal-aprobar').click();
  await expect(page.getByTestId('personal-dialogo-aprobar')).toContainText('Aprobar la nómina de 2.ª quincena de septiembre de 2026');
  await page.getByTestId('personal-confirmar-aprobar').click();
  await expect(page).toHaveURL(/\/panel\/personal\/nomina\/lq_/);
  const id = page.url().match(/nomina\/([^?]+)/)?.[1] as string;
  const liq = await sel<{ estado: string; totales: { costo: number; neto: number }; lineas: unknown[] } | null>(page, 'selLiquidacion', { liquidacionId: id });
  expect(liq?.estado).toBe('aprobada');
  expect(liq?.totales.costo).toBe(con.liquidacion?.totales.costo);
  expect(await eventosDominio(page)).toContain('NominaAprobada');
  await expect(page.getByTestId('personal-liquidacion-totales')).toHaveAttribute('data-costo', String(liq?.totales.costo));
  await expect(page.getByTestId('personal-nomina-electronica')).toContainText('Nómina electrónica: transmitida (simulación)');
  await expect(page.getByTestId('personal-nota-nomina')).toContainText('Cálculo ilustrativo para la demo');

  // Desprendible en PDF por empleado y resumen en Excel.
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByTestId('documento-desprendible').first().getByRole('button').click()]);
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  const [xls] = await Promise.all([page.waitForEvent('download'), page.getByTestId('exportar-nomina').locator('[data-formato="excel"]').click()]);
  expect(xls.suggestedFilename()).toMatch(/\.xlsx$/);
  const ui = await eventosUI(page);
  expect(ui.some((e) => e.tipo === 'pdf_generado' && e.datos.reporte === 'desprendible')).toBe(true);
  expect(ui.some((e) => e.tipo === 'excel_generado' && e.datos.reporte === 'nomina')).toBe(true);

  // Pagar.
  await page.getByTestId('personal-pagar').click();
  await page.getByTestId('personal-confirmar-pago').click();
  await expect(page.getByTestId('personal-dialogo-pagar')).toHaveCount(0);
  const pagada = await sel<{ estado: string } | null>(page, 'selLiquidacion', { liquidacionId: id });
  expect(pagada?.estado).toBe('pagada');
  expect(await eventosDominio(page)).toContain('NominaPagada');
  await expect(page.getByTestId('personal-anular-aprobacion')).toHaveCount(0);

  // El historial la trae y el periodo ya no está pendiente.
  await page.getByRole('link', { name: 'Nómina', exact: true }).first().click();
  await expect(page.getByTestId('personal-historial')).toContainText('2.ª quincena de septiembre de 2026');
  await page.getByTestId('personal-via-mensual').click();
  await expect(page.getByTestId('personal-periodo-etiqueta')).toContainText('Septiembre de 2026');
});

test('nómina: aprobar la mensual deja a los contratistas pendientes de PILA y se puede anular la aprobación', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/personal/nomina');
  await page.getByTestId('personal-via-mensual').click();
  await expect(page.getByTestId('personal-periodo-etiqueta')).toContainText('Septiembre de 2026');
  await expect(page.getByTestId('personal-aviso-pila-periodo')).toContainText('sin la planilla de seguridad social verificada');
  const previa = await sel<Previa>(page, 'selVistaPreviaNomina', { periodo: { inicio: '2026-09-01', fin: '2026-09-30', tipo: 'mensual', etiqueta: 'Septiembre de 2026' }, exoneracion: true, ahora: AHORA });
  await expect(page.getByTestId('personal-totales-periodo')).toHaveAttribute('data-neto', String(previa.liquidacion?.totales.neto));
  await page.getByTestId('personal-aprobar').click();
  await page.getByTestId('personal-confirmar-aprobar').click();
  await expect(page).toHaveURL(/\/panel\/personal\/nomina\/lq_/);
  const id = page.url().match(/nomina\/([^?]+)/)?.[1] as string;
  await page.getByRole('button', { name: /Más acciones de NOM-/ }).click();
  await page.getByTestId('personal-anular-aprobacion').click();
  await page.getByRole('button', { name: 'Anular aprobación' }).last().click();
  await expect(page).toHaveURL(/\/panel\/personal\/nomina$/);
  expect(await sel(page, 'selLiquidacion', { liquidacionId: id })).toBeNull();
});

test('nómina: una marcación nueva alimenta la vista previa', async ({ page, irA }) => {
  test.setTimeout(120_000);
  await abrir(page, irA, '/panel/personal/nomina');
  const abiertos = await sel<{ quincenal: Periodo | null }>(page, 'selPeriodoAbierto', { hoy: HOY });
  const periodo = abiertos.quincenal as Periodo;
  const antes = await sel<Previa>(page, 'selVistaPreviaNomina', { periodo, exoneracion: true, ahora: AHORA });
  // Un turno nuevo del vendedor del guion en un día libre del periodo (solo puede marcar lo suyo): entra a las
  // 14:00 y sale a las 23:30, mucho después de su hora final.
  const objetivo = await page.evaluate(([inicio, fin]) => {
    const kc = (globalThis as unknown as { __kc: { estado: () => { agregados: { turnosDia: Record<string, string[]> } }; acciones: { asignarTurno: (d: unknown) => { ok: boolean; error?: { mensaje: string } } } } }).__kc;
    const acciones = kc.acciones;
    const e = kc.estado();
    for (let d = Number((fin as string).slice(8)); d >= Number((inicio as string).slice(8)); d--) {
      const fecha = `${(fin as string).slice(0, 8)}${String(d).padStart(2, '0')}`;
      if (e.agregados.turnosDia[`em_scardenas@${fecha}`]?.length) continue;
      const r = acciones.asignarTurno({ empleadoId: 'em_scardenas', localId: 'usq', fecha, tipo: 'cierre', inicio: '14:00', fin: '20:00', descansoMin: 0, aceptarExceso: true });
      return r.ok ? { empleadoId: 'em_scardenas', localId: 'usq', fecha } : null;
    }
    return null;
  }, [periodo.inicio, periodo.fin] as const);
  expect(objetivo).not.toBeNull();
  const r = await page.evaluate(
    ([o]) => {
      const kc = (globalThis as unknown as { __kc: { accionesDe: (r: string) => { registrarMarcacion: (d: unknown) => { ok: boolean; error?: { mensaje: string } } } } }).__kc;
      const acciones = kc.accionesDe('vendedor');
      const x = o as { empleadoId: string; localId: string; fecha: string };
      acciones.registrarMarcacion({ empleadoId: x.empleadoId, localId: x.localId, tipo: 'entrada', ts: `${x.fecha}T14:00:00` });
      return acciones.registrarMarcacion({ empleadoId: x.empleadoId, localId: x.localId, tipo: 'salida', ts: `${x.fecha}T23:30:00` });
    },
    [objetivo] as const,
  );
  expect(r.ok, r.error?.mensaje).toBe(true);
  const despues = await sel<Previa>(page, 'selVistaPreviaNomina', { periodo, exoneracion: true, ahora: AHORA });
  const a = antes.liquidacion?.lineas.find((l) => l.empleadoId === objetivo?.empleadoId)?.costoEmpleador as number;
  const b = despues.liquidacion?.lineas.find((l) => l.empleadoId === objetivo?.empleadoId)?.costoEmpleador as number;
  expect(b).toBeGreaterThan(a);
  // La pantalla refleja el nuevo total sin recargar.
  await expect(page.getByTestId('personal-totales-periodo')).toHaveAttribute('data-costo', String(despues.liquidacion?.totales.costo));
});

// ---------------------------------------------------------------------------------------------------------
// Comisiones
// ---------------------------------------------------------------------------------------------------------
interface Comision {
  empleadoId: string;
  nombre: string;
  base: number;
  comision: { total: number };
}

test('comisiones: las cifras del mes salen de selComisiones, el detalle suma la comisión y ?mes=&empleado= abre el cajón', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/personal/comisiones');
  const c = await sel<Comision[]>(page, 'selComisiones', { mes: '2026-09', hoy: HOY });
  expect(c.length).toBeGreaterThan(5);
  const total = c.reduce((a, x) => a + x.comision.total, 0);
  await expect(page.getByTestId('personal-comisiones-total')).toBeVisible();
  await expect(page.getByTestId('personal-comisiones-tabla')).toContainText(pesos(total));
  for (const x of c) await expect(page.getByTestId('personal-comisiones-tabla')).toContainText(pesos(x.comision.total));

  const sebas = c.find((x) => x.empleadoId === 'em_scardenas') as Comision;
  await abrir(page, irA, '/panel/personal/comisiones?mes=2026-09&empleado=em_scardenas');
  const cajon = page.getByTestId('personal-cajon-comision');
  await expect(cajon).toContainText('Sebastián Cárdenas Ruiz');
  await expect(cajon).toContainText(pesos(sebas.comision.total));
  await expect(cajon.getByTestId('personal-detalle-comision')).toContainText(pesos(sebas.comision.total));
  await expect(cajon.getByTestId('personal-componente-porcentaje')).toHaveAttribute('data-valor', String(sebas.comision.total));

  // Un mes anterior cambia las cifras y la URL.
  await page.keyboard.press('Escape');
  await expect(page).not.toHaveURL(/empleado=/);
  await page.getByTestId('personal-selector-mes').click();
  await page.getByRole('option', { name: /Agosto de 2026/ }).click();
  await expect(page).toHaveURL(/mes=2026-08/);
  const ago = await sel<Comision[]>(page, 'selComisiones', { mes: '2026-08', hoy: HOY });
  await expect(page.getByTestId('personal-comisiones-tabla')).toContainText(pesos(ago.reduce((a, x) => a + x.comision.total, 0)));
});

test('comisiones: crear, editar y eliminar un esquema; fijar la meta de un local', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/personal/comisiones');
  await page.getByTestId('personal-nuevo-esquema').click();
  const dlg = page.getByTestId('personal-dialogo-esquema');
  await dlg.getByTestId('personal-guardar-esquema').click();
  await expect(dlg).toContainText('Escribe el nombre del esquema.');
  await dlg.getByTestId('personal-esquema-nombre').fill('2,5 % de prueba');
  await dlg.getByTestId('personal-esquema-porcentaje').fill('2,5');
  await expect(dlg.getByTestId('personal-esquema-vista')).toContainText('2,5');
  await dlg.getByTestId('personal-guardar-esquema').click();
  await expect(dlg).toHaveCount(0);
  const esquema = page.locator('[data-testid^="personal-esquema-esq_"]', { hasText: '2,5 % de prueba' });
  await expect(esquema).toBeVisible();
  await expect(esquema).toContainText('Todavía no lo usa nadie');

  // Editar: un porcentaje fuera de rango lo rechaza el dominio y se marca.
  await esquema.getByRole('button', { name: 'Acciones de 2,5 % de prueba' }).click();
  await page.getByRole('menuitem', { name: 'Editar' }).click();
  await dlg.getByTestId('personal-esquema-porcentaje').fill('50');
  await dlg.getByTestId('personal-guardar-esquema').click();
  await expect(dlg.getByTestId('personal-esquema-error')).toContainText('El porcentaje debe estar entre 0 % y 20 %.');
  await dlg.getByTestId('personal-esquema-porcentaje').fill('4');
  await dlg.getByTestId('personal-guardar-esquema').click();
  await expect(dlg).toHaveCount(0);
  await expect(esquema).toContainText('4');

  // Eliminar con confirmación (nadie lo usa).
  await esquema.getByRole('button', { name: 'Acciones de 2,5 % de prueba' }).click();
  await page.getByRole('menuitem', { name: 'Eliminar' }).click();
  await page.getByRole('button', { name: 'Eliminar esquema' }).click();
  await expect(page.locator('[data-testid^="personal-esquema-esq_"]', { hasText: '2,5 % de prueba' })).toHaveCount(0);
  // Uno en uso no se puede eliminar.
  await page.locator('[data-testid^="personal-esquema-esq_"]', { hasText: '3 % sobre tus ventas sin IVA' }).getByRole('button').first().click();
  await expect(page.getByRole('menuitem', { name: /En uso/ })).toHaveAttribute('data-disabled', '');
  await page.keyboard.press('Escape');

  // Meta del local.
  await page.getByTestId('personal-fijar-meta-usq').click();
  await page.getByTestId('personal-meta-valor').fill('90000000');
  await page.getByTestId('personal-guardar-meta').click();
  await expect(page.getByTestId('personal-meta-usq')).toHaveAttribute('data-meta', '90000000');
});

// ---------------------------------------------------------------------------------------------------------
// Rol vendedor
// ---------------------------------------------------------------------------------------------------------
test('mis comisiones: el vendedor ve solo lo suyo y no entra a la nómina', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/personal');
  await page.getByTestId('selector-rol').click();
  await page.getByTestId('rol-vendedor').click();
  await page.goto(`/panel/mis-comisiones?hoy=${HOY}T15%3A30`);
  await esperarDatos(page);
  const c = await sel<Comision[]>(page, 'selComisiones', { mes: '2026-09', hoy: HOY, empleadoId: 'em_scardenas' });
  expect(c).toHaveLength(1);
  await expect(page.getByTestId('personal-mi-comision')).toBeVisible();
  await expect(page.getByTestId('personal-mis-comisiones')).toContainText(pesos(c[0]?.comision.total as number));
  await expect(page.getByTestId('personal-mis-comisiones')).not.toContainText('Valentina');
  await expect(page.getByTestId('personal-mis-comisiones')).not.toContainText('Costo para el negocio');
  await expect(page.getByTestId('personal-mis-comisiones')).not.toContainText('Salario');
  await expect(page.getByTestId('personal-detalle-comision')).toBeVisible();
  // La nómina es solo del dueño.
  await page.goto(`/panel/personal/nomina?hoy=${HOY}T15%3A30`);
  await esperarDatos(page);
  await expect(page.getByTestId('personal-nomina')).toHaveCount(0);
});

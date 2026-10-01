import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { conKc, esperarDatos } from '../kc';

/**
 * C3 · Calendario y agenda (PLAN 9.4). Verifica solo `/panel/calendario`: las vistas, los filtros, crear, editar,
 * mover arrastrando y eliminar eventos, los eventos que vienen de otros módulos y los parámetros de la ruta. Los
 * efectos sobre turnos, importaciones y pagos se leen por `window.__kc` (no se navega a esos módulos). Sin errores de
 * consola en ningún recorrido.
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
  await expect(page.getByTestId('calendario-vista')).toBeVisible();
}

/**
 * Arrastra con el ratón (dnd-kit pide un movimiento mayor a 6 px antes de empezar). Centra el evento en la ventana
 * antes de tomarlo: cerca del borde de la ventana dnd-kit desplaza la página mientras se arrastra, como debe ser.
 */
async function arrastrar(page: Page, origen: Locator, destino: Locator) {
  await origen.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  await page.waitForTimeout(300);
  const a = await origen.boundingBox();
  const b = await destino.boundingBox();
  const alto = page.viewportSize()?.height ?? 800;
  if (!a || !b) throw new Error('sin cajas para arrastrar');
  const yDestino = Math.min(Math.max(b.y + Math.min(b.height / 2, 90), 150), alto - 150);
  await page.mouse.move(a.x + 14, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + 30, a.y + a.height / 2 + 12, { steps: 5 });
  await page.mouse.move(b.x + b.width / 2, yDestino, { steps: 14 });
  await page.mouse.up();
}

async function elegir(page: Page, disparador: Locator, opcion: string | RegExp) {
  await disparador.click();
  await page.getByRole('option', { name: opcion }).click();
}

interface EventoMin {
  id: string;
  titulo: string;
  inicio: string;
  fin: string | null;
  localId: string | null;
  tipo: string;
  subtipo: string;
  eliminadoEn?: string;
}

const crearEventoPrueba = (page: Page, id: string, titulo: string, inicio: string, fin: string | null = null) =>
  page.evaluate(
    ([eventoId, tit, ini, fi]) => {
      const kc = (globalThis as unknown as { __kc: { acciones: Record<string, (d: unknown) => { ok: boolean; error?: { mensaje: string } }> } }).__kc;
      const r = kc.acciones.crearEvento?.({
        eventoId,
        datos: { tipo: 'cita', subtipo: 'asesoria', titulo: tit, inicio: ini, fin: fi, todoElDia: false, localId: 'usq', clienteId: null, empleadoId: null, descripcion: null, recordatorioMin: null },
      });
      if (!r?.ok) throw new Error(r?.error?.mensaje ?? 'no se creó');
      return true;
    },
    [id, titulo, inicio, fin],
  );

const leerEvento = (page: Page, id: string) =>
  page.evaluate((eventoId) => {
    const kc = (globalThis as unknown as { __kc: { estado: () => { eventos: Record<string, EventoMin> } } }).__kc;
    return kc.estado().eventos[eventoId] ?? null;
  }, id);

// ---------------------------------------------------------------------------------------------------------
test('el mes trae todo en un solo lugar, con la leyenda de colores y sus conteos', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/calendario?fecha=2026-10-15');
  await expect(page.getByTestId('calendario-titulo')).toHaveText('Octubre de 2026');
  await expect(page.getByTestId('calendario-vista')).toHaveAttribute('data-vista', 'mes');
  const esperado = await conKc(page, (kc) => {
    const lista = kc.sel('selEventosCalendario', { desde: '2026-09-28', hasta: '2026-11-01' }) as { tipo: string }[];
    const n = (t: string) => lista.filter((x) => x.tipo === t).length;
    return { turno: n('turno'), importacion: n('importacion'), campana: n('campana'), cita: n('cita'), vencimiento: n('vencimiento') };
  });
  // Los conteos de la leyenda salen del calendario compartido (la agenda solo agrega obligaciones y pagos ya cumplidos).
  for (const t of ['turno', 'importacion', 'campana', 'cita'] as const) {
    await expect(page.getByTestId(`leyenda-${t}-conteo`)).toHaveText(String(esperado[t]));
  }
  expect(Number(await page.getByTestId('leyenda-vencimiento-conteo').textContent())).toBeGreaterThanOrEqual(esperado.vencimiento);
  // Cada tipo con su color: las llegadas (negro), los pagos (rojo suave), las citas (verde suave) están en la cuadrícula.
  await expect(page.locator('[data-tipo="importacion"]').first()).toBeVisible();
  await expect(page.locator('[data-tipo="vencimiento"]').first()).toBeVisible();
  await expect(page.locator('[data-tipo="cita"]').first()).toBeVisible();
  // Los turnos de cada día se resumen en una ficha.
  await expect(page.getByTestId('turnos-2026-10-07')).toContainText('turnos');
  // La nota de las obligaciones ilustrativas.
  await expect(page.getByTestId('calendario-nota')).toContainText('Valores y fechas ilustrativos · se validan con tu contador');
});

test('mes, semana y día: la URL manda (?vista=&fecha=) y se navega con anterior, siguiente y Hoy', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/calendario?vista=semana&fecha=2026-10-07');
  await expect(page.getByTestId('calendario-vista')).toHaveAttribute('data-vista', 'semana');
  await expect(page.getByTestId('calendario-titulo')).toHaveText('5 – 11 oct de 2026');
  await expect(page.getByTestId('dia-2026-10-05')).toBeVisible();
  await expect(page.getByTestId('dia-2026-10-11')).toBeVisible();
  await page.getByTestId('calendario-siguiente').click();
  await expect(page).toHaveURL(/vista=semana&fecha=2026-10-14/);
  await expect(page.getByTestId('calendario-titulo')).toHaveText('12 – 18 oct de 2026');
  await page.getByTestId('calendario-vista-dia').click();
  await expect(page).toHaveURL(/vista=dia&fecha=2026-10-14/);
  await expect(page.getByTestId('calendario-titulo')).toHaveText('Miércoles 14 de octubre de 2026');
  await page.getByTestId('calendario-anterior').click();
  await expect(page.getByTestId('calendario-titulo')).toHaveText('Martes 13 de octubre de 2026');
  await page.getByTestId('calendario-vista-mes').click();
  await expect(page.getByTestId('calendario-titulo')).toHaveText('Octubre de 2026');
  await page.getByTestId('calendario-siguiente').click();
  await expect(page.getByTestId('calendario-titulo')).toHaveText('Noviembre de 2026');
  await page.getByTestId('calendario-hoy').click();
  await expect(page.getByTestId('calendario-titulo')).toHaveText('Septiembre de 2026');
  await expect(page.getByTestId('dia-2026-09-30')).toHaveAttribute('data-hoy', 'true');
  // Un día del mes lleva a su vista de día; los parámetros inválidos no rompen nada.
  await page.getByTestId('dia-numero-2026-09-15').click();
  await expect(page.getByTestId('calendario-vista')).toHaveAttribute('data-vista', 'dia');
  await abrir(page, irA, '/panel/calendario?vista=trimestre&fecha=2026-13-45');
  await expect(page.getByTestId('calendario-vista')).toHaveAttribute('data-vista', 'mes');
  await expect(page.getByTestId('calendario-titulo')).toHaveText('Septiembre de 2026');
});

test('la vista de día agrupa lo de todo el día, lo que tiene hora y los turnos por local; un día sin eventos invita a agregar', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/calendario?vista=dia&fecha=2026-10-03');
  const lista = await conKc(page, (kc) => kc.sel('selEventosCalendario', { desde: '2026-10-03', hasta: '2026-10-03' }) as { tipo: string; titulo: string }[]);
  const citas = lista.filter((x) => x.tipo === 'cita');
  expect(citas.length).toBeGreaterThan(0);
  for (const c of citas) await expect(page.getByTestId('calendario-dia')).toContainText(c.titulo);
  const turnos = lista.filter((x) => x.tipo === 'turno').length;
  await expect(page.getByTestId('dia-turnos').locator('[data-tipo="turno"]')).toHaveCount(turnos);
  await expect(page.getByTestId('dia-turnos')).toContainText('Zona Rosa');

  await abrir(page, irA, '/panel/calendario?vista=dia&fecha=2027-03-03');
  await expect(page.getByTestId('calendario-dia')).toContainText('Un día sin eventos');
  await page.getByTestId('dia-vacio-agregar').click();
  await expect(page.getByTestId('calendario-formulario')).toBeVisible();
});

test('filtros: por tipo desde la leyenda y por local; la leyenda es la pista del módulo', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/calendario?vista=semana&fecha=2026-10-07');
  const turnos = page.locator('[data-tipo="turno"]');
  const todos = await conKc(page, (kc) => (kc.sel('selEventosCalendario', { desde: '2026-10-05', hasta: '2026-10-11', tipos: ['turno'] }) as unknown[]).length);
  await expect(turnos).toHaveCount(todos);
  // Por local (el filtro de la pantalla; la barra superior no cambia).
  await elegir(page, page.getByTestId('calendario-local'), 'Usaquén');
  const usq = await conKc(page, (kc) => (kc.sel('selEventosCalendario', { desde: '2026-10-05', hasta: '2026-10-11', tipos: ['turno'], localId: 'usq' }) as unknown[]).length);
  expect(usq).toBeLessThan(todos);
  await expect(turnos).toHaveCount(usq);
  await expect(page.getByTestId('leyenda-turno-conteo')).toHaveText(String(usq));
  await elegir(page, page.getByTestId('calendario-local'), 'Todos los locales');
  await expect(turnos).toHaveCount(todos);
  // Por tipo: apagar los turnos los quita; "Ver todos los tipos" los devuelve.
  await page.getByTestId('leyenda-turno').click();
  await expect(page.getByTestId('leyenda-turno')).toHaveAttribute('aria-pressed', 'false');
  await expect(turnos).toHaveCount(0);
  await expect(page.locator('[data-tipo="importacion"]').first()).toBeVisible();
  await page.getByTestId('leyenda-ver-todo').click();
  await expect(turnos).toHaveCount(todos);
  // Todo apagado: estado vacío con salida.
  for (const t of ['turno', 'importacion', 'vencimiento', 'campana', 'cita']) await page.getByTestId(`leyenda-${t}`).click();
  await expect(page.getByTestId('calendario-todo-oculto')).toContainText('Todo está oculto');
  await page.getByTestId('calendario-todo-oculto').getByRole('button', { name: 'Ver todos los tipos' }).click();
  await expect(turnos).toHaveCount(todos);
  // La pista `calendario.leyenda` vive sobre la leyenda.
  await page.getByTestId('pista-calendario.leyenda').click();
  await expect(page.getByRole('dialog', { name: 'Pista' })).toContainText('Arrastra un evento para moverlo de día');
});

test('crear un evento: valida junto a cada campo, lo guarda y lo muestra en su día', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/calendario?fecha=2026-10-15');
  const antes = await conKc(page, (kc) => Object.keys((kc.estado() as unknown as { eventos: object }).eventos).length);
  await page.getByTestId('dia-2026-10-20').hover();
  await page.getByTestId('dia-agregar-2026-10-20').click();
  const formulario = page.getByTestId('calendario-formulario');
  await expect(formulario).toBeVisible();
  await page.getByTestId('evento-guardar').click();
  await expect(formulario).toContainText('Escribe el título del evento.');
  await expect(formulario).toContainText('Elige qué tipo de evento es.');
  await page.getByTestId('evento-titulo').fill('Preventa para clientes VIP');
  await elegir(page, page.getByTestId('evento-clase'), 'Campaña de temporada');
  await page.getByLabel('Todo el día').click();
  await page.getByTestId('evento-guardar').click();
  await expect(formulario).toHaveCount(0);
  await expect(page).toHaveURL(/resaltar=ev_/);
  const r = await conKc(page, (kc) => {
    const e = kc.estado() as unknown as { eventos: Record<string, EventoMin & { todoElDia: boolean }> };
    const ev = Object.values(e.eventos).find((x) => x.titulo === 'Preventa para clientes VIP');
    return { total: Object.keys(e.eventos).length, ev, dominio: kc.eventosDominio().map((x) => x.tipo) };
  });
  expect(r.total).toBe(antes + 1);
  expect(r.ev).toMatchObject({ tipo: 'campana', subtipo: 'campana_temporada', inicio: '2026-10-20T00:00:00', todoElDia: true });
  expect(r.dominio).toContain('EntidadCambiada');
  await expect(page.getByTestId('dia-2026-10-20')).toContainText('Preventa para clientes VIP');
  await expect(page.locator('[data-resaltada]').first()).toContainText('Preventa para clientes VIP');
});

test('una cita lleva cliente y hora; editar y eliminar (con confirmación) funcionan desde el detalle', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/calendario?fecha=2026-10-15');
  await page.getByTestId('dia-2026-10-21').hover();
  await page.getByTestId('dia-agregar-2026-10-21').click();
  await page.getByTestId('evento-titulo').fill('Asesoría de imagen e2e');
  await elegir(page, page.getByTestId('evento-clase'), 'Asesoría de imagen');
  await page.getByTestId('evento-hora-inicio').fill('16:00');
  await page.getByTestId('evento-hora-fin').fill('15:00');
  await page.getByTestId('evento-guardar').click();
  await expect(page.getByTestId('calendario-formulario')).toContainText('La hora de fin debe ser después de la de inicio.');
  await page.getByTestId('evento-hora-fin').fill('17:00');
  // La cita lleva cliente: se busca por nombre.
  const cliente = await conKc(page, (kc) => {
    const e = kc.estado() as unknown as { clientes: Record<string, { id: string; nombres: string; apellidos: string }> };
    const c = Object.values(e.clientes).find((x) => x.id.startsWith('cl_ricardo') || x.id === 'cl_andres_gutierrez') ?? Object.values(e.clientes)[0];
    return { id: c?.id ?? '', nombre: `${c?.nombres ?? ''} ${c?.apellidos ?? ''}`.trim() };
  });
  await page.getByTestId('evento-cliente-buscar').fill(cliente.nombre.split(' ')[0] ?? '');
  await page.getByRole('option').first().click();
  await expect(page.getByTestId('evento-cliente-elegido')).toBeVisible();
  await elegir(page, page.getByTestId('evento-recordatorio'), '1 día antes');
  await page.getByTestId('evento-guardar').click();
  await expect(page.getByTestId('calendario-formulario')).toHaveCount(0);

  const creado = await conKc(page, (kc) => {
    const e = kc.estado() as unknown as { eventos: Record<string, EventoMin & { clienteId: string | null; recordatorioMin: number | null }> };
    return Object.values(e.eventos).find((x) => x.titulo === 'Asesoría de imagen e2e') ?? null;
  });
  expect(creado).toMatchObject({ tipo: 'cita', subtipo: 'asesoria', inicio: '2026-10-21T16:00:00', fin: '2026-10-21T17:00:00', recordatorioMin: 1440 });
  expect(creado?.clienteId).toBeTruthy();

  // Detalle: cuándo, cliente (enlace a su ficha) y recordatorio.
  const chip = page.getByTestId(`evento-ev:${creado?.id}`).first();
  await chip.click();
  const detalle = page.getByTestId('calendario-detalle');
  await expect(detalle).toContainText('Asesoría de imagen e2e');
  await expect(detalle).toContainText('Miércoles 21 de octubre de 2026');
  await expect(detalle).toContainText('1 día antes');
  await expect(page.getByTestId('detalle-cliente')).toHaveAttribute('href', new RegExp(`/panel/clientes/${creado?.clienteId}`));
  await expect(page.getByTestId('detalle-origen')).toHaveCount(0);

  // Editar: cambia el título y el local.
  await page.getByTestId('detalle-editar').click();
  await expect(page.getByTestId('evento-titulo')).toHaveValue('Asesoría de imagen e2e');
  await page.getByTestId('evento-titulo').fill('Asesoría de imagen corregida');
  await elegir(page, page.getByTestId('evento-local'), 'Zona Rosa');
  await page.getByTestId('evento-guardar').click();
  await expect(page.getByTestId('calendario-formulario')).toHaveCount(0);
  const editado = await leerEvento(page, creado?.id ?? '');
  expect(editado?.titulo).toBe('Asesoría de imagen corregida');
  expect(editado?.localId).toBe('zr');
  await expect(page.getByTestId('dia-2026-10-21')).toContainText('Asesoría de imagen corregida');

  // Eliminar: pide confirmación; cancelar no borra; confirmar lo quita del calendario.
  await page.getByTestId(`evento-ev:${creado?.id}`).first().click();
  await page.getByTestId('detalle-eliminar').click();
  const confirmar = page.getByRole('alertdialog');
  await expect(confirmar).toContainText('¿Eliminar «Asesoría de imagen corregida»?');
  await confirmar.getByRole('button', { name: 'Cancelar' }).click();
  expect((await leerEvento(page, creado?.id ?? ''))?.eliminadoEn).toBeUndefined();
  await page.getByTestId('detalle-eliminar').click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar evento' }).click();
  await expect(page.getByTestId('calendario-detalle')).toHaveCount(0);
  expect((await leerEvento(page, creado?.id ?? ''))?.eliminadoEn).toBeTruthy();
  await expect(page.getByTestId('dia-2026-10-21')).not.toContainText('Asesoría de imagen corregida');
});

test('arrastrar un evento guardado a otro día lo mueve y conserva su hora', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/calendario?fecha=2026-10-15');
  await crearEventoPrueba(page, 'ev_e2e_mover', 'Cita para mover e2e', '2026-10-20T10:00:00', '2026-10-20T11:00:00');
  const chip = page.getByTestId('dia-2026-10-20').getByTestId('evento-ev:ev_e2e_mover');
  await expect(chip).toBeVisible();
  await arrastrar(page, chip, page.getByTestId('dia-2026-10-23'));
  await expect(page.getByTestId('dia-2026-10-23').getByTestId('evento-ev:ev_e2e_mover')).toBeVisible();
  await expect(page.getByTestId('dia-2026-10-20').getByTestId('evento-ev:ev_e2e_mover')).toHaveCount(0);
  const ev = await leerEvento(page, 'ev_e2e_mover');
  expect(ev?.inicio).toBe('2026-10-23T10:00:00');
  expect(ev?.fin).toBe('2026-10-23T11:00:00');
  await expect(page.getByText('Moviste «Cita para mover e2e»')).toBeVisible();
});

test('una llegada de importación: se ve de dónde viene, no se edita aquí, se mueve y cambia en Importaciones', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/calendario');
  const llegada = await conKc(page, (kc) => {
    const e = kc.estado() as unknown as { importaciones: Record<string, { id: string; numero: string; estado: string; hitos: { recibido_bodega: { estimada: string } } }> };
    const l = Object.values(e.importaciones)
      .filter((i) => i.estado !== 'recibido_bodega' && i.estado !== 'cotizado')
      .sort((a, b) => (a.hitos.recibido_bodega.estimada < b.hitos.recibido_bodega.estimada ? -1 : 1))[0];
    return { id: l?.id ?? '', numero: l?.numero ?? '', fecha: l?.hitos.recibido_bodega.estimada ?? '' };
  });
  expect(llegada.id).not.toBe('');
  await abrir(page, irA, `/panel/calendario?fecha=${llegada.fecha}`);
  const chip = page.getByTestId(`dia-${llegada.fecha}`).getByTestId(`evento-imp:${llegada.id}`);
  await expect(chip).toContainText(llegada.numero);
  await chip.click();
  const detalle = page.getByTestId('calendario-detalle');
  await expect(detalle).toContainText('Llegada de importación');
  await expect(page.getByTestId('detalle-origen')).toContainText('Viene de Importaciones');
  await expect(page.getByTestId('detalle-editar')).toHaveCount(0);
  await expect(page.getByTestId('detalle-eliminar')).toHaveCount(0);
  await expect(page.getByTestId('detalle-abrir-origen')).toHaveAttribute('href', `/panel/importaciones/${llegada.numero}`);
  // Mover desde el detalle: la fecha estimada de la importación cambia.
  await page.getByLabel('Cambiar la fecha estimada de llegada').click();
  await page.getByRole('button', { name: /20 de octubre de 2026/ }).click();
  await page.getByTestId('detalle-mover-confirmar').click();
  const despues = await conKc(page, (kc) => {
    const e = kc.estado() as unknown as { importaciones: Record<string, { hitos: { recibido_bodega: { estimada: string } } }> };
    return Object.values(e.importaciones).map((i) => i.hitos.recibido_bodega.estimada);
  });
  expect(despues).toContain('2026-10-20');
  expect(despues).not.toContain(llegada.fecha);
  await expect(page.getByText(`${llegada.numero} llega el`)).toBeVisible();
});

test('arrastrar una llegada cambia la fecha estimada del pedido, y si cambia allá el calendario se actualiza solo', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/calendario');
  const llegada = await conKc(page, (kc) => {
    const e = kc.estado() as unknown as { importaciones: Record<string, { id: string; numero: string; estado: string; hitos: { recibido_bodega: { estimada: string } } }> };
    const l = Object.values(e.importaciones)
      .filter((i) => i.estado !== 'recibido_bodega' && i.estado !== 'cotizado')
      .sort((a, b) => (a.hitos.recibido_bodega.estimada < b.hitos.recibido_bodega.estimada ? -1 : 1))[0];
    return { id: l?.id ?? '', fecha: l?.hitos.recibido_bodega.estimada ?? '' };
  });
  await abrir(page, irA, `/panel/calendario?fecha=${llegada.fecha}`);
  const sumar = (f: string, n: number) => {
    const d = new Date(`${f}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const nueva = sumar(llegada.fecha, 2);
  await arrastrar(page, page.getByTestId(`dia-${llegada.fecha}`).getByTestId(`evento-imp:${llegada.id}`), page.getByTestId(`dia-${nueva}`));
  await expect(page.getByTestId(`dia-${nueva}`).getByTestId(`evento-imp:${llegada.id}`)).toBeVisible();
  const enEstado = await page.evaluate((id) => {
    const kc = (globalThis as unknown as { __kc: { estado: () => { importaciones: Record<string, { hitos: { recibido_bodega: { estimada: string } } }> } } }).__kc;
    return kc.estado().importaciones[id]?.hitos.recibido_bodega.estimada ?? null;
  }, llegada.id);
  expect(enEstado).toBe(nueva);

  // El cambio también puede venir de Importaciones: el calendario lo recoge solo, sin recargar.
  const otra = sumar(llegada.fecha, 4);
  await page.evaluate(
    ([id, fecha]) => {
      const kc = (globalThis as unknown as { __kc: { acciones: Record<string, (d: unknown) => { ok: boolean }> } }).__kc;
      const r = kc.acciones.actualizarHitosImportacion?.({ importacionId: id, estimadas: { recibido_bodega: fecha } });
      if (!r?.ok) throw new Error('no se actualizó');
    },
    [llegada.id, otra],
  );
  await expect(page.getByTestId(`dia-${otra}`).getByTestId(`evento-imp:${llegada.id}`)).toBeVisible();
  await expect(page.getByTestId(`dia-${nueva}`).getByTestId(`evento-imp:${llegada.id}`)).toHaveCount(0);
});

test('un vencimiento de pagos: viene de Pagos, se programa arrastrándolo y su monto respeta la moneda', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/calendario');
  const cuenta = await conKc(page, (kc) => {
    const e = kc.estado() as unknown as { cuentasPorPagar: Record<string, { id: string; moneda: string; fechaVencimiento: string; abonos: unknown[]; programadaPara: string | null }> };
    const c = Object.values(e.cuentasPorPagar)
      .filter((x) => x.abonos.length === 0 && x.fechaVencimiento >= '2026-09-30')
      .sort((a, b) => (a.fechaVencimiento < b.fechaVencimiento ? -1 : 1))[0];
    return { id: c?.id ?? '', fecha: c?.fechaVencimiento ?? '', moneda: c?.moneda ?? '' };
  });
  expect(cuenta.id).not.toBe('');
  await abrir(page, irA, `/panel/calendario?fecha=${cuenta.fecha}`);
  const chip = page.getByTestId(`dia-${cuenta.fecha}`).getByTestId(`evento-cxp:${cuenta.id}`);
  await chip.click();
  await expect(page.getByTestId('detalle-origen')).toContainText('Viene de Pagos');
  await expect(page.getByTestId('calendario-detalle')).toContainText('Pendiente');
  await expect(page.getByTestId('detalle-abrir-origen')).toHaveAttribute('href', new RegExp(`/panel/pagos/por-pagar\\?.*resaltar=`));
  await expect(page.getByTestId('detalle-editar')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('calendario-detalle')).toHaveCount(0);
  const sumar = (f: string, n: number) => {
    const d = new Date(`${f}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const nueva = sumar(cuenta.fecha, 2);
  await arrastrar(page, chip, page.getByTestId(`dia-${nueva}`));
  await expect(page.getByTestId(`dia-${nueva}`).getByTestId(`evento-cxp:${cuenta.id}`)).toBeVisible();
  const programada = await page.evaluate((id) => {
    const kc = (globalThis as unknown as { __kc: { estado: () => { cuentasPorPagar: Record<string, { programadaPara: string | null; fechaVencimiento: string }> } } }).__kc;
    const c = kc.estado().cuentasPorPagar[id];
    return { programadaPara: c?.programadaPara ?? null, vence: c?.fechaVencimiento ?? null };
  }, cuenta.id);
  expect(programada).toEqual({ programadaPara: nueva, vence: cuenta.fecha });
  await expect(page.getByText(/Pago programado para el/)).toBeVisible();
});

test('lo ya pagado se ve cumplido y el valor del detalle se muestra en la moneda activa', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/calendario?fecha=2026-09-10');
  const pagado = await conKc(page, (kc) => {
    const e = kc.estado() as unknown as { cuentasPorPagar: Record<string, { id: string; concepto: string; fechaVencimiento: string; valor: number }> };
    const c = Object.values(e.cuentasPorPagar).find((x) => x.concepto === 'Arriendo Usaquén' && x.fechaVencimiento === '2026-09-05');
    return { id: c?.id ?? '', valor: c?.valor ?? 0 };
  });
  expect(pagado.id).not.toBe('');
  await page.getByTestId('selector-moneda').getByTestId('moneda-USD').click();
  const chip = page.getByTestId(`evento-cxp:${pagado.id}`);
  await chip.click();
  const detalle = page.getByTestId('calendario-detalle');
  await expect(detalle).toContainText('Pagado');
  await expect(detalle).toContainText('US$');
  await expect(detalle.locator('[data-valor]').first()).toHaveAttribute('data-valor', String(pagado.valor));
  await expect(page.getByTestId('detalle-mover')).toHaveCount(0);
});

test('un turno viene de Turnos: se abre en su módulo y se mueve de día arrastrándolo en la semana', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/calendario?vista=semana&fecha=2026-10-07');
  const c = await conKc(page, (kc) => {
    const e = kc.estado() as unknown as { turnos: Record<string, { id: string; empleadoId: string; fecha: string }> };
    const semana = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];
    const todos = Object.values(e.turnos);
    for (const t of todos) {
      if (!semana.includes(t.fecha)) continue;
      const libre = semana.find((d) => d !== t.fecha && !todos.some((o) => o.empleadoId === t.empleadoId && o.fecha === d));
      if (libre) return { id: t.id, origen: t.fecha, destino: libre };
    }
    return null;
  });
  if (!c) throw new Error('sin un turno movible en la semana');
  await page.getByTestId(`evento-turno:${c.id}`).click();
  await expect(page.getByTestId('detalle-origen')).toContainText('Viene de Turnos');
  await expect(page.getByTestId('detalle-abrir-origen')).toHaveAttribute('href', /\/panel\/personal\/turnos\?.*semana=2026-10-05/);
  await expect(page.getByTestId('detalle-editar')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await arrastrar(page, page.getByTestId(`dia-${c.origen}`).getByTestId(`evento-turno:${c.id}`), page.getByTestId(`dia-${c.destino}`));
  // Si pasa de la jornada semanal pide confirmar las horas extra (no ocurre al cambiar de día dentro de la misma semana).
  await expect(page.getByTestId(`dia-${c.destino}`).getByTestId(`evento-turno:${c.id}`)).toBeVisible();
  const fecha = await page.evaluate((id) => {
    const kc = (globalThis as unknown as { __kc: { estado: () => { turnos: Record<string, { fecha: string }> } } }).__kc;
    return kc.estado().turnos[id]?.fecha ?? null;
  }, c.id);
  expect(fecha).toBe(c.destino);
  await expect(page.getByText(/Turno de .* movido al/)).toBeVisible();
});

test('una obligación del calendario ilustrativo lleva su nota y no se mueve', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/calendario?fecha=2026-10-15');
  const ilustrativa = page.locator('[data-testid^="evento-obl:"]').first();
  await expect(ilustrativa).toBeVisible();
  await ilustrativa.click();
  const detalle = page.getByTestId('calendario-detalle');
  await expect(detalle).toContainText('Obligación ilustrativa');
  await expect(detalle).toContainText('Valores y fechas ilustrativos · se validan con tu contador');
  await expect(page.getByTestId('detalle-origen')).toContainText('Viene de Pagos');
  await expect(page.getByTestId('detalle-mover')).toHaveCount(0);
  await expect(page.getByTestId('detalle-abrir-origen')).toHaveAttribute('href', /\/panel\/pagos\/flujo\?semana=/);
});

test('?resaltar= lleva al evento en su mes y lo destaca; si ya no existe, avisa', async ({ page, irA }) => {
  await abrir(page, irA, '/panel/calendario');
  const ids = await conKc(page, (kc) => {
    const e = kc.estado() as unknown as { eventos: Record<string, EventoMin>; importaciones: Record<string, { numero: string; estado: string }> };
    const navidad = Object.values(e.eventos).find((x) => x.inicio.startsWith('2026-12-01') && x.titulo.includes('Navidad'));
    const imp = Object.values(e.importaciones).find((i) => i.estado !== 'recibido_bodega' && i.estado !== 'cotizado');
    return { navidad: navidad?.id ?? '', numero: imp?.numero ?? '' };
  });
  expect(ids.navidad).not.toBe('');
  await page.goto(`/panel/calendario?hoy=2026-09-30T15%3A30&resaltar=${ids.navidad}`);
  await esperarDatos(page);
  await expect(page.getByTestId('calendario-titulo')).toHaveText('Diciembre de 2026');
  await expect(page.locator('[data-resaltada]').first()).toContainText('Temporada de Navidad');
  // Por el número de una importación.
  await page.goto(`/panel/calendario?hoy=2026-09-30T15%3A30&resaltar=${ids.numero}`);
  await esperarDatos(page);
  await expect(page.locator('[data-resaltada]').first()).toContainText(ids.numero);
  // Algo que no existe: se ve el mes de hoy y un aviso discreto.
  await page.goto('/panel/calendario?hoy=2026-09-30T15%3A30&resaltar=ev_no_existe');
  await esperarDatos(page);
  await expect(page.getByText('Ese evento ya no está en el calendario')).toBeVisible();
  await expect(page.getByTestId('calendario-titulo')).toHaveText('Septiembre de 2026');
});

test('la página queda dentro de la ventana: sin desbordes horizontales y con el encabezado a la vista', async ({ page, irA }, info) => {
  await abrir(page, irA, '/panel/calendario?fecha=2026-10-15');
  const ancho = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(ancho.scroll).toBeLessThanOrEqual(ancho.client + 1);
  await expect(page.getByRole('heading', { name: 'Calendario', level: 1 })).toBeVisible();
  await expect(page.getByTestId('calendario-barra')).toBeVisible();
  // Arriba del pliegue: el título, la barra de navegación y la leyenda (también a 1366 × 657).
  const caja = await page.getByTestId('calendario-leyenda').boundingBox();
  expect(caja).not.toBeNull();
  expect((caja?.y ?? 9999) + (caja?.height ?? 0)).toBeLessThanOrEqual(info.project.use.viewport?.height ?? 900);
});

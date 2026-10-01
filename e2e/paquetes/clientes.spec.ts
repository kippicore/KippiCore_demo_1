import type { Page } from '@playwright/test';
import { conHoy, expect, test } from '../fixtures';
import { conKc, esperarDatos } from '../kc';

/**
 * A4 · Clientes (PLAN 9.4, CONTRATOS §10). Verifica SOLO la pantalla de clientes: los efectos en otros módulos
 * se leen por selectores de `window.__kc`, nunca navegando a pantallas de paquetes paralelos.
 * Comando: PORT=4304 npx playwright test e2e/paquetes/clientes.spec.ts --project=escritorio-1440 \
 *   --project=escritorio-1366 --project=escritorio-1280 --workers=1
 */
const HOY = '2026-09-30';

/** Vista laxa del estado de dominio para leerlo desde las pruebas (los selectores dan los tipos de verdad). */
/* eslint-disable @typescript-eslint/no-explicit-any */
type EstadoA4 = Record<'clientes' | 'eventos' | 'mensajes' | 'ventas' | 'variantes' | 'productos' | 'agregados', any> & { meta: { narrativa: Record<string, string> & { clienteVip: string } } };
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Errores de consola y de página: cada prueba termina afirmando que no hubo ninguno. */
function vigilar(page: Page): string[] {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(`${page.url()}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`${page.url()}: ${m.text()}`);
  });
  return errores;
}

/** Los enlaces de WhatsApp no salen a internet en las pruebas. */
async function sinInternet(page: Page) {
  await page.context().route(/https:\/\/wa\.me\/.*/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>wa.me</body></html>' }));
}

const SUFIJO = '(mensaje de prueba desde la demo de KippiCore)';

async function clienteVip(page: Page): Promise<string> {
  return conKc(page, (kc) => (kc.estado() as unknown as EstadoA4).meta.narrativa.clienteVip as string);
}

test.describe('lista de clientes', () => {
  test('los chips de segmento cuentan lo mismo que el dominio y la tabla responde a ellos', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/clientes');
    await esperarDatos(page);
    await expect(page.getByTestId('tabla-clientes')).toBeVisible();
    const seg = await conKc(page, (kc) => kc.sel('selSegmentos', { hoy: '2026-09-30' }) as Record<string, number>);
    for (const [s, n] of Object.entries(seg)) await expect(page.getByTestId(`segmento-${s}`)).toContainText(new Intl.NumberFormat('es-CO').format(n));
    // La pista del paquete está sobre los filtros de segmento.
    await expect(page.locator('[data-pista="clientes.segmentos"]')).toHaveCount(1);
    // Elegir un segmento filtra la tabla y se refleja en la URL.
    await page.getByTestId('segmento-vip').click();
    await expect(page).toHaveURL(/segmento=vip/);
    await expect(page.getByTestId('segmento-vip')).toHaveAttribute('aria-pressed', 'true');
    const filas = page.getByTestId('tabla-clientes').locator('tbody tr[data-fila]');
    await expect(filas.first()).toContainText('VIP');
    // El total sale del dominio (la calibración cambió cuántos VIP hay: no se fija a mano).
    await expect(page.getByTestId('tabla-clientes').getByText(new RegExp(`Mostrando 1–\\d+ de ${seg.vip} clientes`))).toBeVisible();
    // Quitar el filtro con el chip activo.
    await page.getByTestId('segmento-vip').click();
    await expect(page).not.toHaveURL(/segmento=/);
    expect(errores).toEqual([]);
  });

  test('?segmento= y ?texto= se honran al entrar, y la búsqueda sin resultados muestra un vacío con salida', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/clientes?segmento=en_riesgo');
    await esperarDatos(page);
    await expect(page.getByTestId('segmento-en_riesgo')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('tabla-clientes').locator('tbody tr[data-fila]').first()).toContainText('En riesgo');
    await page.getByRole('searchbox', { name: 'Buscar clientes' }).or(page.getByPlaceholder(/Buscar por nombre/)).first().fill('zzzzzzzz');
    await expect(page.getByText('Ningún cliente con estos filtros')).toBeVisible();
    await page.getByRole('button', { name: 'Limpiar filtros' }).last().click();
    await expect(page.getByText('Ningún cliente con estos filtros')).toHaveCount(0);
    await expect(page.getByTestId('segmento-todos')).toHaveAttribute('aria-pressed', 'true');
    expect(errores).toEqual([]);
  });

  test('?resaltar=<clienteId> resalta la fila', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/clientes');
    await esperarDatos(page);
    const id = await clienteVip(page);
    await page.goto(conHoy(`/panel/clientes?resaltar=${id}`));
    await esperarDatos(page);
    await expect(page.locator(`tr[data-fila="${id}"]`)).toHaveAttribute('data-resaltada', 'true');
    expect(errores).toEqual([]);
  });

  test('la moneda activa se respeta en las cifras de la tabla', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/clientes');
    await esperarDatos(page);
    await page.getByTestId('selector-moneda').click();
    await page.getByTestId('moneda-USD').click();
    await expect(page.getByTestId('tabla-clientes').locator('tbody tr[data-fila]').first()).toContainText('US$');
    expect(errores).toEqual([]);
  });

  test('crear: pide la autorización de datos, avisa del celular repetido y deja al cliente con su trato', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/clientes');
    await esperarDatos(page);
    const existente = await conKc(page, (kc) => Object.values((kc.estado() as unknown as EstadoA4).clientes as Record<string, { celular: string }>)[0]?.celular ?? '');
    await page.getByTestId('nuevo-cliente').click();
    await expect(page.getByTestId('formulario-cliente')).toBeVisible();
    await page.getByTestId('cliente-nombres').fill('Mauricio');
    await page.getByTestId('cliente-apellidos').fill('Quintero Salazar');
    await page.getByTestId('cliente-celular').fill('3201112233');
    await page.getByTestId('cliente-guardar').click();
    // El dominio pide la autorización (el error queda junto al checkbox, no en un aviso).
    await expect(page.getByTestId('cliente-error-autorizacion')).toContainText('autorización');
    await page.getByRole('checkbox').click();
    // Un celular que ya es de otro cliente se marca en su campo.
    await page.getByTestId('cliente-celular').fill(existente);
    await page.getByTestId('cliente-guardar').click();
    await expect(page.getByText(/Ese celular ya es de/)).toBeVisible();
    // Con un celular libre y trato de usted, se crea y se abre su ficha.
    await page.getByTestId('cliente-celular').fill('3201112233');
    await page.getByRole('radio', { name: /usted/ }).click();
    await page.getByTestId('cliente-guardar').click();
    await expect(page).toHaveURL(/\/panel\/clientes\/cl_/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Mauricio Quintero Salazar');
    const id = new URL(page.url()).pathname.split('/').pop() ?? '';
    const creado = await page.evaluate((cid) => {
      const kc = (globalThis as unknown as { __kc: { estado: () => { clientes: Record<string, { tratamiento: string; celular: string; autorizacionDatos: { aceptada: boolean } }> } } }).__kc;
      return (kc.estado() as unknown as EstadoA4).clientes[cid] ?? null;
    }, id);
    expect(creado).toMatchObject({ tratamiento: 'usted', celular: '3201112233', autorizacionDatos: { aceptada: true } });
    // Cliente sin compras: el estado vacío del historial lo explica.
    await expect(page.getByText('Aún no tiene compras')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('el menú de la fila escribe, edita y elimina con confirmación', async ({ page, irA }) => {
    const errores = vigilar(page);
    await sinInternet(page);
    await irA('/panel/clientes?segmento=vip');
    await esperarDatos(page);
    const fila = page.getByTestId('tabla-clientes').locator('tbody tr[data-fila]').first();
    const id = (await fila.getAttribute('data-fila')) ?? '';
    await fila.getByRole('button', { name: /Acciones de/ }).click();
    await page.getByTestId('accion-escribir').click();
    await expect(page.getByTestId('modal-mensaje')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await fila.getByRole('button', { name: /Acciones de/ }).click();
    await page.getByRole('menuitem', { name: 'Eliminar cliente' }).click();
    // Primero se confirma: Cancelar no cambia nada.
    await expect(page.getByRole('alertdialog')).toContainText('¿Eliminar a');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar' }).click();
    expect(await page.evaluate((cid) => (globalThis as unknown as { __kc: { estado: () => { clientes: Record<string, { eliminadoEn?: string | null }> } } }).__kc.estado().clientes[cid]?.eliminadoEn ?? null, id)).toBeNull();
    await fila.getByRole('button', { name: /Acciones de/ }).click();
    await page.getByRole('menuitem', { name: 'Eliminar cliente' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar cliente' }).click();
    await expect(page.locator(`tr[data-fila="${id}"]`)).toHaveCount(0);
    expect(await page.evaluate((cid) => (globalThis as unknown as { __kc: { estado: () => { clientes: Record<string, { eliminadoEn?: string | null }> } } }).__kc.estado().clientes[cid]?.eliminadoEn ?? null, id)).not.toBeNull();
    expect(errores).toEqual([]);
  });

  test('el vendedor ve solo sus clientes y no puede eliminar', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/clientes');
    await esperarDatos(page);
    await page.getByTestId('selector-rol').click();
    await page.getByTestId('rol-vendedor').click();
    await expect(page).toHaveURL(/\/panel\/clientes/);
    const esperados = await conKc(page, (kc) => (kc.sel('selClientes', { hoy: '2026-09-30', vendedorId: 'em_scardenas', localId: 'usq' }) as unknown[]).length);
    await expect(page.getByTestId('segmento-todos')).toContainText(new Intl.NumberFormat('es-CO').format(esperados));
    await expect(page.getByTestId('filtro-vendedor')).toHaveCount(0);
    const fila = page.getByTestId('tabla-clientes').locator('tbody tr[data-fila]').first();
    await fila.getByRole('button', { name: /Acciones de/ }).click();
    await expect(page.getByRole('menuitem', { name: 'Eliminar cliente' })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: 'Escribir por WhatsApp' })).toBeVisible();
    expect(errores).toEqual([]);
  });
});

test.describe('ficha del cliente', () => {
  test('explica el segmento con las cifras del dominio y muestra el historial con la compra reciente arriba', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/clientes');
    await esperarDatos(page);
    const id = await clienteVip(page);
    await page.goto(conHoy(`/panel/clientes/${id}`));
    await esperarDatos(page);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Ricardo Peñuela');
    await expect(page.getByTestId('segmento-explicacion')).toContainText('Por qué es VIP');
    await expect(page.getByTestId('segmento-porque')).toContainText('Compró');
    await expect(page.getByTestId('segmento-porque')).toContainText('lo tratamos como VIP');
    // Las compras del historial salen del dominio.
    const compras = await conKc(page, (kc) => {
      const e = (kc.estado() as unknown as EstadoA4);
      return Object.values(e.ventas as Record<string, { clienteId: string | null }>).filter((v) => v.clienteId === e.meta.narrativa.clienteVip).length;
    });
    await expect(page.getByTestId('tab-compras')).toContainText(String(compras));
    await expect(page.getByTestId('lista-tallas')).toContainText('Camisa');
    // W1: una compra recién registrada aparece ARRIBA del historial y la ficha se actualiza sola.
    const nueva = await page.evaluate((cid) => {
      const kc = (globalThis as unknown as { __kc: { estado: () => { variantes: Record<string, { id: string; productoId: string }>; productos: Record<string, { precioVenta: number }>; agregados: { existencias: Record<string, number> }; ventas: Record<string, { numero: string }> }; acciones: Record<string, (d: unknown) => { ok: boolean; error?: { mensaje: string } }>; datos: { getState: () => { registro: unknown[] } } } }).__kc;
      const e = kc.estado();
      const v = Object.values(e.variantes).find((x) => (e.agregados.existencias[`${x.id}@usq`] ?? 0) > 2);
      if (!v) throw new Error('sin variante con existencias');
      const r = kc.acciones.registrarVenta!({
        ts: null,
        localId: 'usq',
        vendedorId: 'em_scardenas',
        canal: 'local',
        tipo: 'contado',
        clienteId: cid,
        clienteNuevo: null,
        lineas: [{ varianteId: v.id, cantidad: 1, precioLista: null, descuento: null }],
        descuentoGlobal: null,
        aprobacionDescuentoId: null,
        pagos: [{ medio: 'nequi', valor: e.productos[v.productoId]?.precioVenta ?? 0, recibido: null, referencia: 'PRUEBA', sesionCajaId: null, bonoId: null }],
        fechaLimiteSeparado: null,
        ventaOrigenCambioId: null,
        facturaInmediata: null,
        nota: 'Compra de prueba (e2e A4)',
      });
      if (!r.ok) throw new Error(r.error?.mensaje ?? 'no se registró');
      const ultima = kc.datos.getState().registro.at(-1) as { comando: { datos: { ventaId: string } } };
      return (kc.estado() as unknown as EstadoA4).ventas[ultima.comando.datos.ventaId]?.numero ?? '';
    }, id);
    expect(nueva).toMatch(/^V-\d+$/);
    const primera = page.getByTestId('historial-compras').locator('tbody tr[data-fila]').first();
    await expect(primera).toContainText(nueva);
    await expect(primera).toContainText('Recién hecha');
    await expect(page.getByTestId('tab-compras')).toContainText(String(compras + 1));
    expect(errores).toEqual([]);
  });

  test('WhatsApp prellenado: usa el trato del cliente, registra el mensaje y abre wa.me sin destinatario con el sufijo de prueba', async ({ page, irA }) => {
    const errores = vigilar(page);
    await sinInternet(page);
    await irA('/panel/clientes');
    await esperarDatos(page);
    const id = await clienteVip(page);
    await page.goto(conHoy(`/panel/clientes/${id}`));
    await esperarDatos(page);
    await page.getByTestId('ficha-escribir').click();
    const texto = page.getByTestId('mensaje-texto');
    // Ricardo prefiere "usted".
    await expect(texto).toHaveValue(/Ricardo, buen[ao]s (días|tardes|noches)\. Llegó la nueva colección a HALDEN: novedades en .*¿Le separamos algo en su talla\?/);
    await page.getByTestId('trato-tu').click();
    await expect(texto).toHaveValue(/¿Te separamos algo en tu talla\?/);
    await page.getByTestId('trato-usted').click();
    await page.getByRole('radio', { name: /Feliz cumpleaños/ }).click();
    await expect(texto).toHaveValue(/feliz cumpleaños\. En HALDEN le tenemos un detalle/);
    const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByTestId('mensaje-whatsapp').click()]);
    await popup.waitForLoadState();
    const url = new URL(popup.url());
    expect(url.origin + url.pathname).toBe('https://wa.me/');
    const enviado = url.searchParams.get('text') ?? '';
    expect(enviado).toContain('feliz cumpleaños');
    expect(enviado.endsWith(SUFIJO)).toBe(true);
    // Sin destinatario: la ruta no lleva número.
    expect(url.pathname).toBe('/');
    await popup.close();
    // Quedó registrado en el libro de mensajes y en la ficha.
    const registrados = await conKc(page, (kc) => (kc.estado() as unknown as EstadoA4).mensajes as unknown as { canal: string; cuerpo: string; origen: { tipo: string }; destinatario: { refId: string; telefono: string } }[]);
    expect(registrados).toHaveLength(1);
    expect(registrados[0]).toMatchObject({ canal: 'whatsapp', origen: { tipo: 'cumpleanos' }, destinatario: { refId: id } });
    expect(registrados[0]?.cuerpo.endsWith(SUFIJO)).toBe(true);
    await page.getByTestId('tab-mensajes').click();
    await expect(page.getByTestId('lista-mensajes')).toContainText('Enviado (simulación)');
    await expect(page.getByTestId('lista-mensajes')).toContainText('feliz cumpleaños');
    // Cumple años hoy: la ficha lo dice y ya no ofrece felicitarlo de nuevo.
    await expect(page.getByTestId('ficha-cumple')).toContainText('Ya lo felicitaste');
    expect(errores).toEqual([]);
  });

  test('?mensaje=cumpleanos abre el mensaje en el trato del cliente y limpia la URL; ?mensaje=cobro sin saldo avisa', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/clientes');
    await esperarDatos(page);
    const id = await clienteVip(page);
    await page.goto(conHoy(`/panel/clientes/${id}?mensaje=cumpleanos`));
    await esperarDatos(page);
    await expect(page.getByTestId('modal-mensaje')).toBeVisible();
    await expect(page.getByTestId('mensaje-texto')).toHaveValue(/Ricardo, feliz cumpleaños\./);
    await expect(page).not.toHaveURL(/mensaje=/);
    await page.keyboard.press('Escape');
    await page.goto(conHoy(`/panel/clientes/${id}?mensaje=cobro`));
    await esperarDatos(page);
    await expect(page.getByText(/no tiene saldos por cobrar/)).toBeVisible();
    await expect(page.getByTestId('modal-mensaje')).toHaveCount(0);
    expect(errores).toEqual([]);
  });

  test('?mensaje=cobro con un separado con saldo: recordatorio con el saldo y la fecha límite', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/clientes');
    await esperarDatos(page);
    const conSaldo = await conKc(page, (kc) => {
      const m = Object.values(kc.sel('selMetricasClientes', { hoy: '2026-09-30' }) as Record<string, { clienteId: string; porCobrar: number }>).find((x) => x.porCobrar > 0);
      return m?.clienteId ?? null;
    });
    expect(conSaldo).not.toBeNull();
    await page.goto(conHoy(`/panel/clientes/${conSaldo}?mensaje=cobro`));
    await esperarDatos(page);
    await expect(page.getByTestId('modal-mensaje')).toBeVisible();
    await expect(page.getByTestId('mensaje-texto')).toHaveValue(/tiene un saldo de \$\s?[\d.]+/);
    await expect(page.getByTestId('ficha-saldos')).toContainText('por cobrar');
    expect(errores).toEqual([]);
  });

  test('notas: se agregan a la ficha y quedan con su autor', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/clientes');
    await esperarDatos(page);
    const id = await clienteVip(page);
    await page.goto(conHoy(`/panel/clientes/${id}`));
    await esperarDatos(page);
    await page.getByTestId('tab-notas').click();
    await expect(page.getByTestId('notas-vacio')).toBeVisible();
    await page.getByTestId('ficha-nota').click();
    await page.getByTestId('nota-guardar').click();
    await expect(page.getByText('Escribe la nota.')).toBeVisible();
    await page.getByTestId('nota-texto').fill('Prefiere las camisas sin bolsillo.');
    await page.getByTestId('nota-guardar').click();
    await expect(page.getByTestId('lista-notas')).toContainText('Prefiere las camisas sin bolsillo.');
    await expect(page.getByTestId('lista-notas')).toContainText('Juan Camilo Ospina');
    expect(await conKc(page, (kc) => ((kc.estado() as unknown as EstadoA4).clientes[(kc.estado() as unknown as EstadoA4).meta.narrativa.clienteVip] as unknown as { notas: unknown[] }).notas.length)).toBe(1);
    expect(errores).toEqual([]);
  });

  test('seguimiento: se programa en el calendario (cita ligada al cliente) y se puede quitar con confirmación', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/clientes');
    await esperarDatos(page);
    const id = await clienteVip(page);
    await page.goto(conHoy(`/panel/clientes/${id}`));
    await esperarDatos(page);
    await page.getByTestId('tab-seguimientos').click();
    await expect(page.getByTestId('lista-seguimientos').or(page.getByTestId('seguimientos-vacio'))).toBeVisible();
    const antes = await conKc(page, (kc) => Object.values((kc.estado() as unknown as EstadoA4).eventos as Record<string, { clienteId: string | null }>).filter((x) => x.clienteId).length);
    await page.getByTestId('ficha-mas').click();
    await page.getByTestId('ficha-seguimiento').click();
    await expect(page.getByTestId('modal-seguimiento')).toBeVisible();
    await page.getByTestId('seguimiento-titulo').fill('Llamar a Ricardo por el blazer');
    await page.getByTestId('seguimiento-guardar').click();
    await expect(page.getByText('Seguimiento programado')).toBeVisible();
    const nuevo = await conKc(page, (kc) => Object.values((kc.estado() as unknown as EstadoA4).eventos as Record<string, { clienteId: string | null; tipo: string; subtipo: string; titulo: string; inicio: string }>).filter((x) => x.clienteId && x.subtipo === 'seguimiento' && x.titulo.startsWith('Llamar')));
    expect(nuevo).toHaveLength(1);
    expect(nuevo[0]).toMatchObject({ tipo: 'cita', subtipo: 'seguimiento' });
    expect((nuevo[0]?.inicio ?? '').slice(0, 10) > HOY).toBe(true);
    await page.getByTestId('tab-seguimientos').click();
    await expect(page.getByTestId('lista-seguimientos')).toContainText('Llamar a Ricardo por el blazer');
    expect(await conKc(page, (kc) => Object.values((kc.estado() as unknown as EstadoA4).eventos as Record<string, { clienteId: string | null }>).filter((x) => x.clienteId).length)).toBe(antes + 1);
    await page.getByTestId('lista-seguimientos').locator('li', { hasText: 'Llamar a Ricardo' }).getByRole('button', { name: 'Quitar' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('¿Quitar este seguimiento del calendario?');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Quitar seguimiento' }).click();
    await expect(page.getByTestId('lista-seguimientos')).not.toContainText('Llamar a Ricardo por el blazer');
    expect(errores).toEqual([]);
  });

  test('tallas: las declaradas son editables y mandan sobre las que se derivan de sus compras', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/clientes');
    await esperarDatos(page);
    const id = await clienteVip(page);
    await page.goto(conHoy(`/panel/clientes/${id}`));
    await esperarDatos(page);
    await page.getByTestId('editar-tallas').click();
    await expect(page.getByTestId('modal-tallas')).toBeVisible();
    await expect(page.getByTestId('talla-camisa')).toHaveValue('L');
    await page.getByTestId('talla-camisa').fill('xl');
    await page.getByTestId('tallas-guardar').click();
    await expect(page.getByTestId('lista-tallas')).toContainText('XL');
    await expect(page.getByTestId('lista-tallas')).toContainText('Declaró XL, compra L');
    expect(await conKc(page, (kc) => ((kc.estado() as unknown as EstadoA4).clientes[(kc.estado() as unknown as EstadoA4).meta.narrativa.clienteVip] as unknown as { tallasDeclaradas: { camisa: string } }).tallasDeclaradas.camisa)).toBe('XL');
    expect(errores).toEqual([]);
  });

  test('editar datos y eliminar desde la ficha (con confirmación)', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/clientes');
    await esperarDatos(page);
    const id = await clienteVip(page);
    await page.goto(conHoy(`/panel/clientes/${id}`));
    await esperarDatos(page);
    await page.getByTestId('ficha-mas').click();
    await page.getByTestId('ficha-editar').click();
    await expect(page.getByTestId('formulario-cliente')).toBeVisible();
    await page.getByTestId('cliente-correo').fill('correo-malo');
    await page.getByTestId('cliente-guardar').click();
    await expect(page.getByText('Escribe un correo válido.')).toBeVisible();
    await page.getByTestId('cliente-correo').fill('ricardo.nuevo@correo.example');
    await page.getByRole('radio', { name: /tú/ }).click();
    await page.getByTestId('cliente-guardar').click();
    await expect(page.getByTestId('tarjeta-datos')).toContainText('ricardo.nuevo@correo.example');
    await expect(page.getByTestId('tarjeta-datos')).toContainText('Tú');
    // Eliminar: la confirmación nombra al cliente y dice qué pasa con sus compras.
    await page.getByTestId('ficha-mas').click();
    await page.getByTestId('ficha-eliminar').click();
    await expect(page.getByRole('alertdialog')).toContainText('siguen en el historial de ventas');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar cliente' }).click();
    await expect(page).toHaveURL(/\/panel\/clientes(\?|$)/);
    await page.goto(conHoy(`/panel/clientes/${id}`));
    await esperarDatos(page);
    await expect(page.getByTestId('cliente-no-existe')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('el vendedor puede escribir pero no eliminar ni programar seguimientos', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/clientes');
    await esperarDatos(page);
    const id = await clienteVip(page);
    await page.goto(conHoy(`/panel/clientes/${id}`));
    await esperarDatos(page);
    await page.getByTestId('selector-rol').click();
    await page.getByTestId('rol-vendedor').click();
    await expect(page.getByTestId('ficha-escribir')).toBeVisible();
    await page.getByTestId('ficha-mas').click();
    await expect(page.getByTestId('ficha-eliminar')).toHaveCount(0);
    await expect(page.getByTestId('ficha-seguimiento')).toHaveAttribute('data-disabled', '');
    expect(errores).toEqual([]);
  });
});

test.describe('cumpleaños', () => {
  test('el mes lista a quienes cumplen con su mensaje sugerido; los de hoy van primero', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/clientes/cumpleanos');
    await esperarDatos(page);
    await expect(page.getByTestId('mes-actual')).toContainText('Septiembre de 2026');
    const esperados = await conKc(page, (kc) => (kc.sel('selCumpleanosMes', { mes: '2026-09', hoy: '2026-09-30' }) as unknown[]).length);
    await expect(page.getByTestId('tabla-cumpleanos').getByText(new RegExp(`de ${esperados} cumpleaños`))).toBeVisible();
    const primera = page.getByTestId('tabla-cumpleanos').locator('tbody tr[data-fila]').first();
    await expect(primera).toContainText('Hoy');
    await expect(primera).toContainText(/feliz cumpleaños/i);
    // Navegar de mes cambia la lista y la URL.
    await page.getByTestId('mes-siguiente').click();
    await expect(page).toHaveURL(/mes=2026-10/);
    await expect(page.getByTestId('mes-actual')).toContainText('Octubre de 2026');
    await page.getByTestId('mes-anterior').click();
    await page.getByTestId('mes-anterior').click();
    await expect(page.getByTestId('mes-actual')).toContainText('Agosto de 2026');
    expect(errores).toEqual([]);
  });

  test('?mes= se honra y la tabla filtra por segmento', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/clientes/cumpleanos?mes=2026-12');
    await esperarDatos(page);
    await expect(page.getByTestId('mes-actual')).toContainText('Diciembre de 2026');
    await expect(page.getByTestId('tabla-cumpleanos').locator('tbody tr[data-fila]').first()).toBeVisible();
    await page.getByPlaceholder('Buscar por nombre').fill('zzzzzzzz');
    await expect(page.getByText('Nadie cumple años con estos filtros')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('felicitar registra el saludo y marca al cliente como felicitado', async ({ page, irA }) => {
    const errores = vigilar(page);
    await sinInternet(page);
    await irA('/panel/clientes/cumpleanos');
    await esperarDatos(page);
    const primera = page.getByTestId('tabla-cumpleanos').locator('tbody tr[data-fila]').first();
    const id = (await primera.getAttribute('data-fila')) ?? '';
    await primera.getByRole('button', { name: 'Felicitar' }).click();
    await expect(page.getByTestId('modal-mensaje')).toBeVisible();
    await expect(page.getByRole('radio', { name: /Feliz cumpleaños/ })).toBeChecked();
    const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByTestId('mensaje-whatsapp').click()]);
    await popup.waitForLoadState();
    expect(new URL(popup.url()).searchParams.get('text')?.endsWith(SUFIJO)).toBe(true);
    await popup.close();
    await expect(page.locator(`tr[data-fila="${id}"]`)).toContainText('Felicitado');
    await expect(page.getByTestId('tabla-cumpleanos').locator('tbody tr[data-fila]').first()).not.toContainText('Felicitar');
    const m = await conKc(page, (kc) => (kc.estado() as unknown as EstadoA4).mensajes as unknown as { origen: { tipo: string; id: string } }[]);
    expect(m).toHaveLength(1);
    expect(m[0]?.origen).toEqual({ tipo: 'cumpleanos', id });
    expect(errores).toEqual([]);
  });
});

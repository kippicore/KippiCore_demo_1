import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { conKc, esperarDatos, registrarVentaDePrueba } from '../kc';

/**
 * D1 · Inicio, dashboard del dueño (PLAN 9.4). Solo verifica la pantalla de Inicio: los efectos se leen con selectores
 * por `window.__kc`, nunca navegando a pantallas de otros paquetes (los recorridos van en e2e/flujos). PORT=4331.
 */
const AHORA = '2026-09-30T15:30:00';

function vigilarConsola(page: Page): string[] {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`console: ${m.text()}`);
  });
  return errores;
}

async function entrar(page: Page, irA: (r: string) => Promise<void>) {
  await irA('/panel/inicio');
  await esperarDatos(page);
  await expect(page.getByTestId('inicio')).toBeVisible();
  await expect(page.getByTestId('kpis-inicio')).toBeVisible();
}

const sel = <T>(page: Page, nombre: string, params?: unknown): Promise<T> =>
  page.evaluate(([n, p]) => (globalThis as unknown as { __kc: { sel: (n: string, p?: unknown) => unknown } }).__kc.sel(n as string, p), [nombre, params]) as Promise<T>;

interface AlertaDatos {
  id: string;
  titulo: string;
  accion: { texto: string; ruta: string };
  nueva: boolean;
}

test.describe('Inicio (D1)', () => {
  test('carga completa, sin errores de consola y sin textos rotos', async ({ page, irA }) => {
    const errores = vigilarConsola(page);
    await entrar(page, irA);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Buenas tardes\.$/);
    await expect(page.getByTestId('inicio-frase')).toContainText('Hoy llevas');
    for (const bloque of ['inicio-ventas-30', 'inicio-alertas', 'inicio-locales', 'inicio-top', 'inicio-dormidos', 'inicio-eventos', 'inicio-hallazgo']) {
      await expect(page.getByTestId(bloque), bloque).toBeVisible();
    }
    const texto = await page.getByTestId('inicio').innerText();
    expect(texto).not.toMatch(/undefined|NaN|\[object|lorem|TODO|Próximamente/i);
    await expect(page.locator('[data-testid^="inicio-error-"]')).toHaveCount(0);
    expect(errores).toEqual([]);
  });

  test('seis tarjetas que cuadran con el selector y llevan a su módulo', async ({ page, irA }) => {
    await entrar(page, irA);
    const k = await sel<{ tarjetas: { id: string; valor: number }[]; mes: { netas: number; unidades: number } }>(page, 'selKpisInicio', { localId: 'todos', ahora: AHORA });
    expect(k.tarjetas.map((t) => t.id)).toEqual(['ventas_hoy', 'ventas_mes', 'ticket', 'unidades', 'margen', 'efectivo']);
    await expect(page.locator('[data-kpi]')).toHaveCount(6);
    // La suma directa de las ventas del mes (selVentas) es la cifra de la tarjeta.
    const ventas = await sel<{ totales: { netas: number; unidades: number } }>(page, 'selVentas', { desde: '2026-09-01', hasta: '2026-09-30' });
    expect(k.mes.netas).toBe(ventas.totales.netas);
    expect(k.mes.unidades).toBe(ventas.totales.unidades);
    const href = (id: string) => page.getByTestId(`kpi-${id}`).getAttribute('href');
    expect(await href('ventas_hoy')).toContain('/panel/ventas?');
    expect(await href('ventas_hoy')).toContain('desde=2026-09-30');
    expect(await href('ventas_mes')).toContain('desde=2026-09-01');
    expect(await href('margen')).toContain('/panel/gastos/resultados');
    expect(await href('efectivo')).toContain('/panel/pos/caja');
  });

  test('gráfico de 30 días: suma de las barras = suma de las ventas, con el nombre de cada local', async ({ page, irA }) => {
    await entrar(page, irA);
    const bloque = page.getByTestId('inicio-ventas-30');
    for (const local of ['Parque 93', 'Usaquén', 'Zona Rosa']) await expect(bloque.getByText(local, { exact: true }).first()).toBeVisible();
    const t = await sel<{ totales: { netas: number } }>(page, 'selVentas', { desde: '2026-09-01', hasta: '2026-09-30' });
    const v = await sel<{ netas: number }[]>(page, 'selVentasPorDia', { desde: '2026-09-01', hasta: '2026-09-30', localId: 'todos', porLocal: true });
    expect(v.reduce((a, d) => a + d.netas, 0)).toBe(t.totales.netas);
    await bloque.getByRole('button', { name: 'Ver como tabla' }).click();
    await expect(bloque.getByRole('table')).toBeVisible();
    await expect(bloque.getByRole('link', { name: /Ver ventas/ })).toHaveAttribute('href', /\/panel\/ventas\?.*desde=2026-09-01.*hasta=2026-09-30/);
  });

  test('"Requiere tu atención": cinco visibles, enlaces de selAlertas, ver todas, descartar y pista', async ({ page, irA }) => {
    await entrar(page, irA);
    const alertas = await sel<AlertaDatos[]>(page, 'selAlertas', { localId: 'todos', ahora: AHORA, descartadas: [], leidas: [] });
    expect(alertas.length).toBeGreaterThanOrEqual(8);
    const lista = page.getByTestId('inicio-alertas');
    await expect(lista.locator('[data-alerta]')).toHaveCount(5);
    // Cada alerta enlaza con la ruta que armó selAlertas (pista inicio.alertas).
    for (const a of alertas.slice(0, 5)) {
      const fila = lista.locator(`[data-alerta="${a.id}"]`);
      await expect(fila).toBeVisible();
      await expect(fila.getByRole('link', { name: a.accion.texto })).toHaveAttribute('href', a.accion.ruta);
    }
    // Las nuevas (de una acción o notificación) llevan su marca; solo las dos más recientes van arriba, y el stock
    // bajo (W2), el faltante de caja (W11) y la importación (W3) quedan entre las cinco primeras.
    const nuevas = alertas.slice(0, 5).filter((a) => a.nueva).length;
    expect(nuevas).toBeLessThanOrEqual(2);
    await expect(lista.locator('[data-nueva="si"]')).toHaveCount(nuevas);
    for (const tipo of ['stock_bajo', 'caja_con_diferencia', 'importacion_estado'])
      expect(alertas.slice(0, 5).map((a) => a.tipo)).toContain(tipo);
    // Ninguna alerta saca al dueño del escritorio.
    expect(alertas.every((a) => !a.accion.ruta.startsWith('/app'))).toBe(true);
    await expect(page.locator('[data-pista="inicio.alertas"]')).toHaveCount(1);
    // Ver todas.
    await lista.getByTestId('inicio-alertas-ver-todas').click();
    await expect(lista.locator('[data-alerta]')).toHaveCount(alertas.length);
    await lista.getByTestId('inicio-alertas-ver-todas').click();
    await expect(lista.locator('[data-alerta]')).toHaveCount(5);
    // Descartar: la alerta sale y entra la siguiente; es estado de interfaz (no hay comando de dominio).
    const primera = alertas[0]!;
    await lista.locator(`[data-alerta="${primera.id}"]`).getByRole('button', { name: 'Descartar alerta' }).click();
    await expect(lista.locator(`[data-alerta="${primera.id}"]`)).toHaveCount(0);
    await expect(lista.locator('[data-alerta]')).toHaveCount(5);
    await expect(page.getByTestId('inicio-alertas-total')).toHaveText(String(alertas.length - 1));
    const dominio = await conKc(page, (kc) => kc.eventosDominio().length);
    expect(dominio).toBe(0);
  });

  test('el descuento que pide un vendedor se aprueba desde la misma alerta, sin salir del escritorio', async ({ page, irA }) => {
    await entrar(page, irA);
    const alertas = await sel<(AlertaDatos & { aprobacion?: { solicitudId: string } })[]>(page, 'selAlertas', {
      localId: 'todos',
      ahora: AHORA,
      descartadas: [],
      leidas: [],
    });
    const descuento = alertas.find((a) => a.aprobacion);
    expect(descuento).toBeTruthy();
    const id = descuento!.aprobacion!.solicitudId;
    const fila = page.getByTestId('inicio-alertas').locator(`[data-alerta="${descuento!.id}"]`);
    await fila.getByTestId(`alerta-aprobar-${id}`).click();
    await expect(page.getByText('Aprobaste el descuento')).toBeVisible();
    const estado = await page.evaluate(
      (sid) =>
        (
          globalThis as unknown as { __kc: { estado: () => { solicitudes: Record<string, { estado: string }> } } }
        ).__kc.estado().solicitudes[sid]?.estado,
      id,
    );
    expect(estado).toBe('aprobada');
    await expect(fila.getByTestId(`alerta-aprobar-${id}`)).toHaveCount(0);
    expect(page.url()).toContain('/panel/inicio');
  });

  test('las alertas sembradas del guion están, con sus enlaces profundos', async ({ page, irA }) => {
    await entrar(page, irA);
    const alertas = await sel<AlertaDatos[]>(page, 'selAlertas', { localId: 'todos', ahora: AHORA, descartadas: [], leidas: [] });
    const tipos = (re: RegExp) => alertas.find((a) => re.test(a.accion.ruta));
    expect(tipos(/\/panel\/inventario\/HL-.*trasladar=/)).toBeTruthy();
    expect(tipos(/\/panel\/pos\/caja\?sesion=/)).toBeTruthy();
    expect(tipos(/\/panel\/importaciones\/IMP-/)).toBeTruthy();
    expect(tipos(/\/panel\/pagos\/flujo\?semana=/)).toBeTruthy();
    expect(tipos(/\/panel\/pagos\/por-cobrar\?filtro=separados-por-vencer/)).toBeTruthy();
    expect(tipos(/\/panel\/personal\?riesgo=contrato-realidad/)).toBeTruthy();
  });

  test('tus tres locales: ventas, margen, meta y estado del último cierre', async ({ page, irA }) => {
    await entrar(page, irA);
    for (const id of ['p93', 'usq', 'zr']) {
      const t = page.getByTestId(`inicio-local-${id}`);
      await expect(t).toBeVisible();
      await expect(t.getByRole('progressbar')).toHaveCount(1);
      await expect(t.getByTestId(`inicio-local-${id}-cierre`)).toHaveAttribute('href', /\/panel\/pos\/caja\?sesion=/);
    }
    await expect(page.getByTestId('inicio-local-zr-cierre')).toContainText(/Faltan/);
    await expect(page.getByTestId('inicio-local-usq-cierre')).toContainText('Cuadró');
  });

  test('más vendidos y sin movimiento: cinco con su prenda, enlazadas a la ficha', async ({ page, irA }) => {
    await entrar(page, irA);
    const top = page.getByTestId('inicio-top');
    await expect(top.locator('li')).toHaveCount(5);
    await expect(top.locator('svg[data-prenda]')).toHaveCount(5);
    await expect(top.locator('a[href^="/panel/inventario/HL-"]').first()).toBeVisible();
    await top.getByRole('radio', { name: 'Ventas' }).click();
    await expect(top.locator('li')).toHaveCount(5);
    const dormidos = page.getByTestId('inicio-dormidos');
    await expect(dormidos.locator('li')).toHaveCount(5);
    await expect(dormidos.locator('svg[data-prenda]')).toHaveCount(5);
    const total = await sel<unknown[]>(page, 'selSinMovimiento', { dias: 60, hoy: '2026-09-30' });
    await expect(page.getByTestId('inicio-dormidos-total')).toContainText(`${total.length} referencias`);
  });

  test('próximos eventos y hallazgo de la semana', async ({ page, irA }) => {
    await entrar(page, irA);
    const eventos = page.getByTestId('inicio-eventos').locator('[data-evento]');
    expect(await eventos.count()).toBeGreaterThanOrEqual(3);
    expect(await eventos.count()).toBeLessThanOrEqual(5);
    await expect(page.getByTestId('inicio-hallazgo-frase')).not.toBeEmpty();
    await expect(page.getByTestId('inicio-hallazgo-enlace')).toHaveAttribute('href', /^\/panel\//);
  });

  test('respeta el local y la moneda', async ({ page, irA }) => {
    await entrar(page, irA);
    await page.getByRole('button', { name: /Todos los locales/ }).click();
    await page.getByTestId('local-usq').click();
    const k = await sel<{ tarjetas: { id: string; valor: number }[] }>(page, 'selKpisInicio', { localId: 'usq', ahora: AHORA });
    const todos = await sel<{ tarjetas: { id: string; valor: number }[] }>(page, 'selKpisInicio', { localId: 'todos', ahora: AHORA });
    expect(k.tarjetas[1]?.valor).toBeLessThan(todos.tarjetas[1]?.valor ?? 0);
    await expect(page.getByTestId('inicio-frase')).toContainText('Hoy Usaquén lleva');
    await expect(page.getByTestId('inicio-local-usq')).toHaveAttribute('data-seleccionado', 'si');
    await page.getByTestId('moneda-USD').click();
    await expect(page.getByTestId('kpi-ventas_mes')).toContainText('US$');
    await expect(page.getByTestId('inicio-frase')).toContainText('US$');
    await expect(page.getByTestId('inicio-ventas-30')).toContainText('US$');
    // Las alertas se filtran por local: ninguna de otro local.
    const alertas = await sel<{ localId: string | null }[]>(page, 'selAlertas', { localId: 'usq', ahora: AHORA });
    expect(alertas.every((a) => a.localId === null || a.localId === 'usq')).toBe(true);
    await page.getByTestId('moneda-COP').click();
    await expect(page.getByTestId('kpi-ventas_mes')).not.toContainText('US$');
  });

  test('una venta registrada (aquí o en otra pestaña) mueve las cifras con <Cifra>', async ({ page, irA }) => {
    await entrar(page, irA);
    const tarjeta = page.getByTestId('kpi-ventas_hoy');
    const antes = await tarjeta.innerText();
    const antesFrase = await page.getByTestId('inicio-frase').innerText();
    const { ventaId } = await registrarVentaDePrueba(page);
    expect(ventaId).toMatch(/^vt_/);
    await expect.poll(async () => tarjeta.innerText(), { timeout: 10_000 }).not.toBe(antes);
    await expect.poll(async () => page.getByTestId('inicio-frase').innerText(), { timeout: 10_000 }).not.toBe(antesFrase);
    const k = await sel<{ hoy: { numVentas: number } }>(page, 'selKpisInicio', { localId: 'todos', ahora: AHORA });
    await expect(page.getByTestId('inicio-frase')).toContainText(`${k.hoy.numVentas} ventas`);
  });

  test('dos pestañas: la venta de una llega a Inicio en la otra', async ({ context }) => {
    const a = await context.newPage();
    const b = await context.newPage();
    const url = '/panel/inicio?hoy=2026-09-30T15:30';
    await a.goto(url);
    await b.goto(url);
    await esperarDatos(a);
    await esperarDatos(b);
    const frase = await b.getByTestId('inicio-frase').innerText();
    await registrarVentaDePrueba(a);
    await expect.poll(async () => b.getByTestId('inicio-frase').innerText(), { timeout: 30_000 }).not.toBe(frase);
  });

  test('arriba del pliegue: saludo, seis tarjetas y el inicio de "Requiere tu atención"', async ({ page, irA }, info) => {
    await entrar(page, irA);
    const alto = page.viewportSize()?.height ?? 0;
    const caja = async (id: string) => (await page.getByTestId(id).boundingBox())!;
    const h1 = (await page.getByRole('heading', { level: 1 }).boundingBox())!;
    expect(h1.y + h1.height).toBeLessThan(alto);
    const kpis = await caja('kpis-inicio');
    expect(kpis.y + kpis.height).toBeLessThan(alto);
    const alertas = await caja('inicio-alertas');
    // El título de la lista y la primera alerta completa se ven sin desplazarse.
    const primera = (await page.getByTestId('inicio-alertas').locator('[data-alerta]').first().boundingBox())!;
    expect(alertas.y + 40).toBeLessThan(alto);
    if (info.project.name !== 'escritorio-1366') expect(primera.y + primera.height).toBeLessThan(alto);
    // El gráfico empieza arriba del pliegue y, en pantallas altas, se ve entero.
    const grafico = await caja('inicio-ventas-30');
    expect(grafico.y + 80).toBeLessThan(alto);
    if (alto >= 900) expect(grafico.y + grafico.height).toBeLessThanOrEqual(alto + 8);
    // Sin desplazamiento horizontal.
    const ancho = (await page.evaluate('({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth })')) as { s: number; c: number };
    expect(ancho.s).toBeLessThanOrEqual(ancho.c);
  });

  test('los enlaces de Inicio llevan a rutas que existen (sin pantallas de error)', async ({ page, irA }) => {
    await entrar(page, irA);
    const hrefs = await page.getByTestId('inicio').locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    expect(hrefs.length).toBeGreaterThan(30);
    expect(hrefs.filter((h) => !/^\/(panel|app)\//.test(h))).toEqual([]);
  });
});

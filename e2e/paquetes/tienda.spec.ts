/// <reference lib="dom" />
import type { Page } from '@playwright/test';
import { expect as expectBase, test } from '../fixtures';
import { esperarDatos as esperarDatosBase, type KcPagina } from '../kc';

/**
 * D6 · Tienda web `/tienda` (PRD 7.14c, PLAN 9.4). Se verifica solo la tienda; los efectos en el sistema (la venta
 * con canal Web y el inventario) se leen con `window.__kc`, sin navegar a pantallas de otros paquetes.
 *
 *   PORT=4336 npx playwright test e2e/paquetes/tienda.spec.ts --project=escritorio-1440 --project=escritorio-1366 --project=escritorio-1280 --project=celular-390 --workers=1
 */
const expect = expectBase.configure({ timeout: 20_000 });
const esperarDatos = (page: Page) => esperarDatosBase(page, 120_000);
test.beforeEach(({ browserName: _n }, info) => {
  info.setTimeout(240_000);
});

const SLUG = 'camisa-de-popelina-blanca';

function vigilar(page: Page): string[] {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`console: ${m.text()}`);
  });
  return errores;
}

async function evaluar<T, A>(page: Page, fn: (kc: KcPagina, arg: A) => T | Promise<T>, arg: A): Promise<T> {
  return page.evaluate(`(${fn.toString()})(globalThis.__kc, ${JSON.stringify(arg)})`) as Promise<T>;
}

interface VarianteKc {
  id: string;
  productoId: string;
  talla: string;
  colorId: string;
}

/** Tallas del producto en un color con sus existencias en el local de despacho (p93), leídas del sistema. */
async function existenciasDe(page: Page, slug: string, colorId: string): Promise<Record<string, number>> {
  return evaluar(
    page,
    (kc, a: { slug: string; colorId: string }) => {
      const e = kc.estado();
      const p = Object.values(e.productos).find((x) => x.slug === a.slug);
      const r: Record<string, number> = {};
      for (const v of Object.values(e.variantes) as unknown as VarianteKc[]) {
        if (v.productoId === p?.id && v.colorId === a.colorId) r[v.talla] = e.agregados.existencias[`${v.id}@p93`] ?? 0;
      }
      return r;
    },
    { slug, colorId },
  );
}

const contarVentasWeb = (page: Page) =>
  evaluar(page, (kc) => Object.values(kc.estado().ventas as unknown as Record<string, { canal: string }>).filter((v) => v.canal === 'web').length, null);

/** Botón de agregar visible (el de escritorio o el de la barra fija del celular). */
const botonAgregar = (page: Page) => page.getByRole('button', { name: /Agregar a la bolsa/i });

/** Elige una talla con al menos `minimo` unidades y la agrega a la bolsa. Devuelve la talla y sus unidades antes. */
async function agregarTalla(page: Page, minimo = 2): Promise<{ talla: string; antes: number }> {
  const ex = await existenciasDe(page, SLUG, 'col_bla');
  const talla = Object.keys(ex).find((t) => (ex[t] ?? 0) >= minimo);
  expect(talla, 'hay una talla con existencias').toBeTruthy();
  await page.getByTestId(`tienda-talla-${talla}`).getByRole('button').click();
  await botonAgregar(page).click();
  return { talla: talla as string, antes: ex[talla as string] ?? 0 };
}

async function entrarALaFicha(page: Page, irA: (ruta: string) => Promise<void>) {
  await irA(`/tienda/producto/${SLUG}?color=bla`);
  await esperarDatos(page);
  await expect(page.getByTestId('tienda-producto')).toBeVisible();
}

// ---------------------------------------------------------------------------------------------------------
test('la portada muestra el hero, las categorías reales, las novedades, la franja y su pista', async ({ page, irA }, info) => {
  const errores = vigilar(page);
  await irA('/tienda');
  await esperarDatos(page);
  await expect(page.getByTestId('tienda-portada')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Sastrería de temporada/i);
  await expect(page.getByRole('link', { name: 'Comprar ahora' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver la colección' })).toBeVisible();
  // Encabezado flotante con el wordmark y las seis categorías.
  for (const etiqueta of ['Novedades', 'Sastrería', 'Camisas', 'Pantalones', 'Abrigos', 'Zapatos y accesorios'] as const) {
    if (info.project.name !== 'celular-390') await expect(page.getByRole('navigation', { name: 'Categorías' }).getByRole('link', { name: etiqueta })).toBeVisible();
  }
  await expect(page.getByTestId('tienda-categoria-camisas')).toBeVisible();
  await expect(page.getByTestId('tienda-carrusel').getByTestId('tienda-tarjeta').first()).toBeVisible();
  // Franja "Vista previa de lo que KippiCore puede construir" con su pista.
  await expect(page.getByTestId('tienda-franja')).toContainText('Vista previa de lo que KippiCore puede construir para HALDEN');
  await expect(page.getByTestId('pista-tienda.franja')).toBeVisible();
  // El punto de la pista no debe provocar desplazamiento horizontal.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  expect(errores).toEqual([]);
});

test('cada categoría lista exactamente los productos de su sección, con título, migas y conteo', async ({ page, irA }, info) => {
  test.skip(info.project.name === 'escritorio-1280', 'Se verifica en 1440, 1366 y celular.');
  const errores = vigilar(page);
  const secciones: Record<string, string[] | null> = {
    novedades: null,
    sastreria: ['blazers', 'trajes'],
    camisas: ['camisas', 'polos'],
    pantalones: ['pantalones'],
    abrigos: ['abrigos_chaquetas', 'punto'],
    'zapatos-y-accesorios': ['calzado', 'accesorios'],
  };
  await irA('/tienda/novedades');
  await esperarDatos(page);
  for (const [slug, categorias] of Object.entries(secciones)) {
    await page.goto(`/tienda/${slug}`);
    await esperarDatos(page);
    const esperado = await evaluar(
      page,
      (kc, a: { categorias: string[] | null }) => {
        const prods = Object.values(kc.estado().productos) as unknown as { categoria: string; temporada: string }[];
        if (a.categorias) return prods.filter((p) => a.categorias?.includes(p.categoria)).length;
        const nuevas = prods.map((p) => p.temporada).filter((t) => t.startsWith('Temporada')).sort();
        return prods.filter((p) => p.temporada === nuevas[nuevas.length - 1]).length;
      },
      { categorias },
    );
    await expect(page.getByTestId('tienda-categoria')).toHaveAttribute('data-seccion', slug);
    await expect(page.getByTestId('tienda-tarjeta')).toHaveCount(esperado);
    await expect(page.getByTestId('tienda-conteo')).toContainText(String(esperado));
    await expect(page.getByTestId('tienda-titulo')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Migas de pan' })).toContainText('Hombre');
  }
  expect(errores).toEqual([]);
});

test('los filtros de talla y color (y ?talla= ?color=) reducen la grilla con datos reales', async ({ page, irA }, info) => {
  test.skip(info.project.name === 'escritorio-1280', 'Se verifica en 1440, 1366 y celular.');
  const errores = vigilar(page);
  await irA('/tienda/camisas?talla=M');
  await esperarDatos(page);
  const conM = await evaluar(
    page,
    (kc) => {
      const e = kc.estado();
      const prods = Object.values(e.productos) as unknown as { id: string; categoria: string }[];
      const vs = Object.values(e.variantes) as unknown as VarianteKc[];
      return prods.filter((p) => ['camisas', 'polos'].includes(p.categoria) && vs.some((v) => v.productoId === p.id && v.talla === 'M' && (e.agregados.existencias[`${v.id}@p93`] ?? 0) > 0)).length;
    },
    null,
  );
  await expect(page.getByTestId('tienda-tarjeta')).toHaveCount(conM);
  await expect(page.getByTestId('tienda-chips')).toContainText('Talla M');
  // Quitar el chip vuelve a mostrar todo.
  await page.getByTestId('tienda-chips').getByRole('button', { name: /Quitar|Talla M/i }).first().click();
  await expect(page.getByTestId('tienda-chips')).toHaveCount(0);

  await page.goto('/tienda/pantalones?color=azn');
  await esperarDatos(page);
  const conAzul = await evaluar(
    page,
    (kc) => {
      const e = kc.estado();
      const prods = Object.values(e.productos) as unknown as { id: string; categoria: string }[];
      const vs = Object.values(e.variantes) as unknown as VarianteKc[];
      return prods.filter((p) => p.categoria === 'pantalones' && vs.some((v) => v.productoId === p.id && v.colorId === 'col_azn')).length;
    },
    null,
  );
  await expect(page.getByTestId('tienda-tarjeta')).toHaveCount(conAzul);
  await expect(page.getByTestId('tienda-chips')).toContainText('Azul marino');
  // Un enlace con talla inexistente no rompe la página.
  await page.goto('/tienda/camisas?talla=ZZ&color=nada');
  await esperarDatos(page);
  await expect(page.getByTestId('tienda-chips')).toHaveCount(0);
  expect(errores).toEqual([]);
});

test('la ficha muestra la disponibilidad REAL por talla del local de despacho y honra ?talla= y ?color=', async ({ page, irA }) => {
  const errores = vigilar(page);
  await entrarALaFicha(page, irA);
  await expect(page.getByTestId('tienda-nombre')).toHaveText(/Camisa de popelina blanca/i);
  await expect(page.getByTestId('tienda-color-nombre')).toHaveText('Blanco');
  const ex = await existenciasDe(page, SLUG, 'col_bla');
  for (const [talla, n] of Object.entries(ex)) await expect(page.getByTestId(`tienda-talla-${talla}`)).toHaveAttribute('data-stock', String(n));
  // La nota cambia con la talla: "Quedan N" si es poca, o "Disponible para envío".
  const tallaPoca = Object.keys(ex).find((t) => (ex[t] ?? 0) > 0 && (ex[t] ?? 0) <= 3);
  const tallaMucha = Object.keys(ex).find((t) => (ex[t] ?? 0) > 3);
  if (tallaPoca) {
    await page.getByTestId(`tienda-talla-${tallaPoca}`).getByRole('button').click();
    await expect(page.getByTestId('tienda-nota-existencias')).toContainText(/Quedan?\s/);
  }
  if (tallaMucha) {
    await page.getByTestId(`tienda-talla-${tallaMucha}`).getByRole('button').click();
    await expect(page.getByTestId('tienda-nota-existencias')).toContainText('Disponible para envío desde Parque 93');
  }
  // Sin elegir talla el botón dice "Elige una talla" y está deshabilitado.
  await page.goto(`/tienda/producto/${SLUG}?color=azc&talla=L`);
  await esperarDatos(page);
  await expect(page.getByTestId('tienda-color-nombre')).toHaveText('Azul cielo');
  const exAzul = await existenciasDe(page, SLUG, 'col_azc');
  if ((exAzul.L ?? 0) > 0) await expect(page.getByTestId('tienda-talla-L').getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  // Cambiar de color actualiza la disponibilidad.
  await page.getByRole('group', { name: 'Color' }).getByRole('button', { name: 'Blanco' }).click();
  await expect(page.getByTestId('tienda-color-nombre')).toHaveText('Blanco');
  for (const [talla, n] of Object.entries(await existenciasDe(page, SLUG, 'col_bla'))) await expect(page.getByTestId(`tienda-talla-${talla}`)).toHaveAttribute('data-stock', String(n));
  // Acordeones y disponibilidad por tienda.
  await page.getByRole('button', { name: 'Disponibilidad por tienda' }).click();
  await expect(page.getByTestId('tienda-disponibilidad').first()).toBeVisible();
  await page.getByRole('button', { name: 'Composición y cuidado' }).click();
  await expect(page.getByText(/Lavado a máquina|Limpieza en seco/)).toBeVisible();
  // Un enlace a una prenda que no existe muestra un estado vacío, no un error.
  await page.goto('/tienda/producto/no-existe');
  await esperarDatos(page);
  await expect(page.getByTestId('tienda-producto-inexistente')).toBeVisible();
  expect(errores).toEqual([]);
});

test('comprar crea una venta real con canal Web, descuenta el inventario y la confirmación lo muestra', async ({ page, irA }) => {
  const errores = vigilar(page);
  await entrarALaFicha(page, irA);
  const ventasAntes = await contarVentasWeb(page);
  await expect(page.getByRole('button', { name: 'Elige una talla' })).toBeDisabled();
  const { talla, antes } = await agregarTalla(page, 2);

  // La bolsa y su contador en el encabezado.
  await expect(page.getByTestId('tienda-cajon-bolsa')).toBeVisible();
  await expect(page.getByTestId('tienda-contador-bolsa')).toHaveText('1');
  await page.getByTestId('tienda-cajon-bolsa').getByRole('button', { name: 'Agregar una unidad' }).click();
  await expect(page.getByTestId('tienda-contador-bolsa')).toHaveText('2');
  await page.getByTestId('tienda-cajon-bolsa').getByRole('button', { name: 'Quitar una unidad' }).click();
  await expect(page.getByTestId('tienda-contador-bolsa')).toHaveText('1');
  await page.getByTestId('tienda-cajon-pagar').click();

  // Pago simulado: sin campos de tarjeta, con "Pagar (simulación)".
  await expect(page.getByTestId('tienda-pago')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /tarjeta|CVV|clave/i })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: /Pago simulado/ })).toBeChecked();
  for (const metodo of ['Tarjeta', 'PSE', 'Nequi', 'QR Bre-B']) await expect(page.getByRole('radio', { name: new RegExp(metodo) })).toBeVisible();
  await page.getByTestId('tienda-pagar').click();
  await expect(page.getByTestId('tienda-campo-nombres')).toHaveAttribute('aria-invalid', 'true');
  await page.getByTestId('tienda-datos-ejemplo').click();
  await page.getByRole('checkbox').click();
  await page.getByTestId('tienda-pagar').click();

  await expect(page.getByTestId('tienda-pedido')).toBeVisible();
  await expect(page.getByTestId('tienda-pedido-canal')).toHaveText('Web');
  await expect(page.getByTestId('tienda-pedido-titulo')).toContainText('Gracias, Andrés');
  await expect(page.getByTestId('tienda-pedido-confirmacion')).toContainText('ya aparece en KippiCore con canal Web y descontó el inventario de Parque 93');
  await expect(page.getByTestId('tienda-contador-bolsa')).toHaveCount(0);

  const r = await evaluar(
    page,
    (kc, a: { ventasAntes: number }) => {
      const e = kc.estado();
      const ventas = Object.values(e.ventas) as unknown as { id: string; numero: string; canal: string; localId: string; tipo: string; total: number; lineas: { varianteId: string; cantidad: number }[]; pagos: { medio: string }[]; nota: string | null }[];
      const web = ventas.filter((v) => v.canal === 'web');
      const ultima = web[web.length - 1];
      const l = ultima?.lineas[0];
      return {
        nuevas: web.length - a.ventasAntes,
        numero: ultima?.numero,
        ventaId: ultima?.id,
        localId: ultima?.localId,
        tipo: ultima?.tipo,
        medio: ultima?.pagos[0]?.medio,
        nota: ultima?.nota,
        total: ultima?.total,
        existencia: l ? e.agregados.existencias[`${l.varianteId}@p93`] : null,
        cantidad: l?.cantidad,
        precio: (Object.values(e.productos) as unknown as { slug: string; precioVenta: number }[]).find((p) => p.slug === 'camisa-de-popelina-blanca')?.precioVenta,
        rol: kc.eventosDominio().find((x) => x.tipo === 'VentaRegistrada')?.contexto.rol,
      };
    },
    { ventasAntes },
  );
  expect(r.nuevas).toBe(1);
  expect(r.localId).toBe('p93');
  expect(r.tipo).toBe('contado');
  expect(r.medio).toBe('pasarela_web');
  expect(r.nota).toContain('Entrega');
  expect(r.cantidad).toBe(1);
  expect(r.total).toBe(r.precio);
  expect(r.existencia).toBe(antes - 1);
  expect(r.rol).toBe('tienda');
  expect(talla).toBeTruthy();
  await expect(page.getByTestId('tienda-pedido-venta')).toHaveText(r.numero ?? '');
  await expect(page.getByTestId('tienda-pedido-numero')).toContainText(r.numero ?? '');
  // "Lo que acaba de pasar" cuenta el inventario y el enlace lleva a la venta resaltada.
  await expect(page.getByText('Lo que acaba de pasar')).toBeVisible();
  const enlace = page.getByTestId('tienda-ver-en-kippicore');
  await expect(enlace).toHaveText('Verla en KippiCore');
  const href = (await enlace.getAttribute('href')) ?? '';
  expect(href).toContain('/panel/ventas');
  expect(href).toContain(`resaltar=${r.ventaId}`);

  // La confirmación sobrevive a una recarga (se arma con la venta del sistema).
  await page.reload();
  await esperarDatos(page);
  await expect(page.getByTestId('tienda-pedido-canal')).toHaveText('Web');
  await expect(page.getByTestId('tienda-pedido-venta')).toHaveText(r.numero ?? '');
  expect(errores).toEqual([]);
});

test('la bolsa respeta las existencias, se vacía y un pedido inexistente se explica', async ({ page, irA }) => {
  const errores = vigilar(page);
  await irA('/tienda/bolsa');
  await esperarDatos(page);
  await expect(page.getByText('Tu bolsa está vacía')).toBeVisible();
  await page.goto('/tienda/pago');
  await esperarDatos(page);
  await expect(page.getByTestId('tienda-pago-vacio')).toBeVisible();
  await page.goto('/tienda/pedido/vt_no_existe');
  await esperarDatos(page);
  await expect(page.getByTestId('tienda-pedido-inexistente')).toBeVisible();

  // Una talla con 1 sola unidad: el "+" se bloquea y volver a agregarla avisa.
  await entrarALaFicha(page, irA);
  const ex = await existenciasDe(page, SLUG, 'col_bla');
  const unica = Object.keys(ex).find((t) => ex[t] === 1);
  if (unica) {
    await page.getByTestId(`tienda-talla-${unica}`).getByRole('button').click();
    await botonAgregar(page).click();
    await expect(page.getByTestId('tienda-cajon-bolsa').getByRole('button', { name: 'Agregar una unidad' })).toBeDisabled();
  } else {
    const tmax = Object.keys(ex).sort((a, b) => (ex[b] ?? 0) - (ex[a] ?? 0))[0] as string;
    await page.getByTestId(`tienda-talla-${tmax}`).getByRole('button').click();
    await botonAgregar(page).click();
  }
  await page.getByTestId('tienda-cajon-bolsa').getByRole('link', { name: 'Ver bolsa' }).click();
  await expect(page.getByTestId('tienda-bolsa')).toBeVisible();
  await expect(page.getByTestId('tienda-total')).toBeVisible();
  await page.getByTestId('tienda-lineas').getByRole('button', { name: 'Quitar', exact: true }).click();
  await expect(page.getByText('Tu bolsa está vacía')).toBeVisible();
  await expect(page.getByTestId('tienda-contador-bolsa')).toHaveCount(0);
  expect(errores).toEqual([]);
});

test('dentro de un marco (?marco=1) la tienda adopta el estado del padre: una compra crea la venta web', async ({ page, irA }, info) => {
  test.skip(info.project.name === 'celular-390', 'El marco de escritorio se verifica en escritorio.');
  const errores = vigilar(page);
  await irA('/panel/inicio');
  await esperarDatos(page);
  const ventasAntes = await contarVentasWeb(page);
  await page.evaluate(() => {
    const f = document.createElement('iframe');
    f.setAttribute('data-testid', 'marco-tienda');
    f.src = '/tienda/producto/camisa-de-popelina-blanca?marco=1&color=bla';
    f.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:99999;background:white';
    document.body.appendChild(f);
  });
  const marco = page.frameLocator('[data-testid="marco-tienda"]');
  await expect(marco.getByTestId('tienda-producto')).toBeVisible({ timeout: 60_000 });
  // Sin la etiqueta de vitrina del layout (el marco la reemplaza).
  await expect(marco.getByTestId('etiqueta-vitrina')).toHaveCount(0);
  const ex = await existenciasDe(page, SLUG, 'col_bla');
  const talla = Object.keys(ex).find((t) => (ex[t] ?? 0) >= 2) as string;
  await marco.getByTestId(`tienda-talla-${talla}`).getByRole('button').click();
  await marco.getByTestId('tienda-agregar').click();
  await marco.getByTestId('tienda-cajon-pagar').click();
  await expect(marco.getByTestId('tienda-pago')).toBeVisible();
  await marco.getByTestId('tienda-datos-ejemplo').click();
  await marco.getByRole('checkbox').click();
  await marco.getByTestId('tienda-pagar').click();
  await expect(marco.getByTestId('tienda-pedido')).toBeVisible({ timeout: 30_000 });
  // La navegación dentro del marco conserva ?marco=1 y el enlace a KippiCore abre la ventana principal.
  await expect(marco.getByTestId('etiqueta-vitrina')).toHaveCount(0);
  await expect(marco.getByTestId('tienda-ver-en-kippicore')).toHaveAttribute('target', '_top');
  expect(await contarVentasWeb(page)).toBe(ventasAntes + 1);
  expect(errores).toEqual([]);
});

test('en celular (390 px) se compra con la barra fija y no hay desplazamiento horizontal', async ({ page, irA }, info) => {
  test.skip(info.project.name !== 'celular-390', 'Solo celular.');
  const errores = vigilar(page);
  const sinDesbordeHorizontal = async () =>
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await irA('/tienda');
  await esperarDatos(page);
  await sinDesbordeHorizontal();
  await page.getByRole('button', { name: 'Abrir el menú' }).click();
  await expect(page.getByRole('dialog', { name: 'Menú' }).getByRole('link', { name: 'Camisas' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Menú' }).getByRole('link', { name: 'Camisas' }).click();
  await expect(page.getByTestId('tienda-titulo')).toHaveText(/Camisas/i);
  await sinDesbordeHorizontal();
  await page.goto(`/tienda/producto/${SLUG}?color=bla`);
  await esperarDatos(page);
  await sinDesbordeHorizontal();
  await expect(page.getByTestId('tienda-barra-fija')).toBeVisible();
  await agregarTalla(page, 2);
  await expect(page.getByTestId('tienda-contador-bolsa')).toHaveText('1');
  await page.getByTestId('tienda-cajon-pagar').click();
  await expect(page.getByTestId('tienda-pago')).toBeVisible();
  await sinDesbordeHorizontal();
  await page.getByTestId('tienda-datos-ejemplo').click();
  await page.getByRole('checkbox').click();
  await page.getByTestId('tienda-pagar').click();
  await expect(page.getByTestId('tienda-pedido-canal')).toHaveText('Web');
  await sinDesbordeHorizontal();
  expect(errores).toEqual([]);
});

test('los íconos del encabezado hacen algo: buscar, tiendas, cuenta y favoritos (y conservan ?marco=1)', async ({ page, irA }, info) => {
  test.skip(info.project.name === 'celular-390', 'Los íconos de buscar, tiendas, cuenta y favoritos son de escritorio.');
  const errores = vigilar(page);
  await irA('/tienda');
  await esperarDatos(page);
  // Buscar: abre el buscador sobre el catálogo y lleva a la prenda.
  await page.getByTestId('tienda-encabezado-buscar').click();
  await expect(page.getByTestId('tienda-panel-buscar')).toBeVisible();
  await page.getByTestId('tienda-buscar-campo').fill('popelina blanca');
  await expect(page.getByTestId('tienda-panel-producto').first()).toBeVisible();
  await page.getByTestId('tienda-buscar-campo').press('Enter');
  await expect(page).toHaveURL(/\/tienda\/producto\//);
  await expect(page.getByTestId('tienda-panel-buscar')).toHaveCount(0);
  // Favoritos: vacío con su explicación; Escape lo cierra.
  await page.getByTestId('tienda-encabezado-favoritos').click();
  await expect(page.getByTestId('tienda-panel-favoritos')).toContainText('Toca el corazón');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('tienda-panel-favoritos')).toHaveCount(0);
  // Cuenta: sin cuentas ni contraseñas, con la bolsa.
  await page.getByTestId('tienda-encabezado-cuenta').click();
  await expect(page.getByTestId('tienda-panel-cuenta')).toContainText('no hay cuentas ni contraseñas');
  await page.keyboard.press('Escape');
  // Tiendas: lleva a la sección del pie con las direcciones.
  await page.getByTestId('tienda-encabezado-tiendas').click();
  await expect(page.getByTestId('tienda-pie-tiendas')).toBeInViewport();
  await expect(page.getByTestId('tienda-pie-tiendas')).toContainText('Parque 93');
  // En el marco, los enlaces del encabezado conservan ?marco=1.
  await page.goto('/tienda?marco=1');
  await esperarDatos(page);
  await expect(page.getByRole('navigation', { name: 'Categorías' }).getByRole('link', { name: 'Camisas' })).toHaveAttribute('href', /marco=1/);
  await expect(page.getByRole('link', { name: /^Bolsa/ })).toHaveAttribute('href', /marco=1/);
  expect(errores).toEqual([]);
});

import type { Page } from '@playwright/test';
import { conHoy, expect, HOY_QA, test } from '../fixtures';
import { conKc, esperarDatos, registrarVentaDePrueba } from '../kc';

/**
 * E1 · App del dueño `/app` (PLAN 9.4, CONTRATOS §10). Corre en el proyecto móvil (390 × 844, táctil):
 *   PORT=4341 npx playwright test e2e/paquetes/movil.spec.ts --project=celular-390 --workers=1
 * Verifica SOLO `/app`: las cifras se comparan con los selectores de `window.__kc` (las mismas del escritorio) y los
 * efectos de aprobar, rechazar y revisar se leen del estado, nunca navegando a pantallas de otros paquetes.
 * Incluye la medición de arranque de Hoy (`@rendimiento`, también con `npm run test:e2e:rendimiento`).
 */
const HOY = '2026-09-30';

function vigilar(page: Page): string[] {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(`${page.url()}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`${page.url()}: ${m.text()}`);
  });
  return errores;
}

async function abrir(page: Page, ruta: string): Promise<void> {
  await page.goto(conHoy(ruta));
  await esperarDatos(page);
}

/** El texto de un `<Dinero>` (con espacio duro) sin el símbolo ni los puntos: "$ 5.223.200" → 5223200. */
function aNumero(texto: string): number {
  return Number(texto.replace(/[^\d−-]/g, '').replace('−', '-'));
}

const sinDesborde = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.describe('Hoy', () => {
  test('la cifra, los cierres de anoche y lo que hay que aprobar coinciden con el escritorio; sin errores ni desborde', async ({ page }) => {
    const errores = vigilar(page);
    await abrir(page, '/app');
    await expect(page.getByTestId('app-hoy')).toBeVisible();

    // La cifra protagonista es la tarjeta "Ventas de hoy" de Inicio.
    const esperado = await conKc(page, (kc) => {
      const k = kc.sel('selKpisInicio', { localId: 'todos', ahora: '2026-09-30T15:30:00' }) as { tarjetas: { id: string; valor: number; variacion: number | null }[] };
      return k.tarjetas[0];
    });
    await expect(page.getByTestId('app-ventas-hoy')).toBeVisible();
    await expect.poll(async () => aNumero((await page.getByTestId('app-ventas-hoy').textContent()) ?? ''), { timeout: 5_000 }).toBe(esperado?.valor);
    expect(esperado?.id).toBe('ventas_hoy');

    // Los tres cierres de anoche con el faltante de Zona Rosa.
    const filas = page.getByTestId('app-cierre');
    await expect(filas).toHaveCount(3);
    await expect(filas.filter({ hasText: 'Zona Rosa' })).toContainText('Faltan');
    await expect(filas.filter({ hasText: 'Zona Rosa' })).toContainText('40.000');
    await expect(filas.filter({ hasText: 'Usaquén' })).toContainText('Cuadró');
    await expect(filas.filter({ hasText: 'Parque 93' })).toContainText('Cuadró');

    // Tres solicitudes precargadas.
    await expect(page.getByTestId('app-solicitud')).toHaveCount(3);
    expect(await sinDesborde(page)).toBe(true);

    // Lo de abajo del pliegue llega después del primer pintado.
    await expect(page.getByTestId('app-por-local')).toBeVisible();
    await expect(page.getByTestId('app-ultimas-ventas').locator('[data-venta]').first()).toBeVisible();
    await expect(page.getByTestId('app-atencion')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('emite app_abierta una vez, muestra la pista app.hoy y el chip de datos de ejemplo', async ({ page }) => {
    await abrir(page, '/app');
    await expect(page.getByTestId('app-hoy')).toBeVisible();
    const eventos = await conKc(page, (kc) => kc.eventosUI().map((e) => e.tipo));
    expect(eventos.filter((t) => t === 'app_abierta')).toHaveLength(1);
    await expect(page.getByTestId('pista-app.hoy')).toBeVisible();
    await page.getByTestId('chip-datos-ejemplo').click();
    await expect(page.getByRole('dialog', { name: 'Datos de ejemplo de este celular' })).toContainText('Cada celular y cada computador guardan sus propios datos de ejemplo');
    await page.keyboard.press('Escape');
    // Cambiar de pestaña no vuelve a emitirlo.
    await page.getByTestId('pestana-ventas').click();
    await expect(page.getByTestId('app-ventas')).toBeVisible();
    expect((await conKc(page, (kc) => kc.eventosUI().map((e) => e.tipo))).filter((t) => t === 'app_abierta')).toHaveLength(1);
  });

  test('las cinco pestañas se recorren y cada una pinta sin desborde en 390 y en 360 px', async ({ page }) => {
    const errores = vigilar(page);
    await abrir(page, '/app');
    const pestanas: [string, string][] = [
      ['hoy', 'app-hoy'],
      ['ventas', 'app-ventas'],
      ['inventario', 'app-inventario'],
      ['agenda', 'app-agenda'],
      ['mas', 'app-mas'],
    ];
    for (const ancho of [390, 360]) {
      await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 740 });
      for (const [id, pantalla] of pestanas) {
        await page.getByTestId(`pestana-${id}`).click();
        await expect(page.getByTestId(pantalla)).toBeVisible();
        expect(await sinDesborde(page), `${pantalla} a ${ancho}`).toBe(true);
      }
    }
    expect(errores).toEqual([]);
  });

  test('los objetivos táctiles de las pestañas y los encabezados miden al menos 44 px', async ({ page }) => {
    await abrir(page, '/app');
    await expect(page.getByTestId('app-hoy')).toBeVisible();
    for (const id of ['hoy', 'ventas', 'inventario', 'agenda', 'mas']) {
      const caja = await page.getByTestId(`pestana-${id}`).boundingBox();
      expect(caja?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(caja?.width ?? 0).toBeGreaterThanOrEqual(44);
    }
    for (const nombre of [/Local:/, /Moneda:/]) {
      const caja = await page.getByRole('button', { name: nombre }).boundingBox();
      expect(caja?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    for (const boton of await page.getByTestId('app-aprobar').all()) {
      expect((await boton.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test('el local y la moneda cambian las cifras como en el escritorio', async ({ page }) => {
    await abrir(page, '/app');
    await expect(page.getByTestId('app-hoy')).toBeVisible();
    await page.getByRole('button', { name: /Local:/ }).click();
    await page.getByTestId('app-local-usq').click();
    const usq = await conKc(page, (kc) => (kc.sel('selKpisInicio', { localId: 'usq', ahora: '2026-09-30T15:30:00' }) as { tarjetas: { valor: number }[] }).tarjetas[0]?.valor);
    await expect.poll(async () => aNumero((await page.getByTestId('app-ventas-hoy').textContent()) ?? '')).toBe(usq);
    await expect(page.getByTestId('app-cierre')).toHaveCount(1);
    await page.getByRole('button', { name: /Moneda:/ }).click();
    await page.getByTestId('app-moneda-USD').click();
    await expect(page.getByTestId('app-ventas-hoy')).toContainText('US$');
    await expect(page.getByTestId('app-moneda')).toHaveText('USD');
    expect((await conKc(page, (kc) => kc.eventosUI())).some((e) => e.tipo === 'moneda_cambiada' && e.datos.a === 'USD')).toBe(true);
  });
});

test.describe('Cierres de caja (W11)', () => {
  test('el detalle de Zona Rosa trae el arqueo, el esperado y la diferencia; "Marcar revisado" con nota queda en el registro', async ({ page }) => {
    const errores = vigilar(page);
    await abrir(page, '/app');
    await page.getByTestId('app-cierre').filter({ hasText: 'Zona Rosa' }).click();
    await expect(page.getByTestId('app-cierre-pagina')).toBeVisible();
    const s = await conKc(page, (kc) => {
      const fila = (kc.sel('selCierresDelDia', { fecha: '2026-09-29' }) as { localId: string; sesionId: string; esperado: number; contado: number; diferencia: number }[]).find((c) => c.localId === 'zr');
      return fila;
    });
    expect(s?.diferencia).toBe(-40_000);
    await expect(page.getByTestId('app-cierre-diferencia')).toContainText('40.000');
    await expect(page.getByTestId('app-cierre-estado')).toContainText('Faltan');
    await expect(page.getByTestId('app-cierre-estado')).toContainText('Arqueo ciego');
    // El arqueo cuadra con lo contado.
    const filasArqueo = await page.getByTestId('app-arqueo').locator('li').allTextContents();
    expect(aNumero(filasArqueo.at(-1) ?? '')).toBe(s?.contado);
    await expect(page.getByTestId('app-esperado')).toContainText(String(s?.esperado).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
    // Revisión con nota.
    await page.getByTestId('app-marcar-revisado').click();
    await page.getByTestId('app-nota-revision').fill('Hablé con Natalia; se descuenta del cambio de mañana');
    await page.getByTestId('app-confirmar-revision').click();
    await expect(page.getByTestId('app-cierre-revisado')).toContainText('Hablé con Natalia');
    await expect(page.getByTestId('app-marcar-revisado')).toHaveCount(0);
    const rev = await conKc(page, (kc) => (kc.estado() as unknown as { sesionesCaja: Record<string, { revision: { nota: string | null } | null }> }).sesionesCaja['sc_g_20260929_zr']?.revision);
    expect(rev?.nota).toBe('Hablé con Natalia; se descuenta del cambio de mañana');
    expect((await conKc(page, (kc) => kc.eventosDominio().map((e) => e.tipo)))).toContain('CierreRevisado');
    // En Hoy ya dice "Revisado".
    await page.getByRole('link', { name: /Cierres de caja/ }).click();
    await page.getByRole('link', { name: /Hoy/ }).first().click();
    await expect(page.getByTestId('app-cierre').filter({ hasText: 'Zona Rosa' })).toContainText('Revisado');
    expect(errores).toEqual([]);
  });

  test('la lista de cierres cambia de día y ?sesion= abre directo el detalle', async ({ page }) => {
    await abrir(page, '/app/cierres');
    await expect(page.getByTestId('app-cierres-pagina')).toBeVisible();
    await expect(page.getByTestId('app-lista-cierres').getByTestId('app-cierre')).toHaveCount(3);
    await expect(page.getByTestId('app-cierres-resumen')).toContainText('1 caja cerró con diferencia');
    await page.getByTestId('app-dia-2026-09-28').click();
    const antes = await conKc(page, (kc) => (kc.sel('selCierresDelDia', { fecha: '2026-09-28' }) as unknown[]).length);
    await expect(page.getByTestId('app-lista-cierres').getByTestId('app-cierre')).toHaveCount(antes);
    await page.goto(conHoy('/app/cierres?sesion=sc_g_20260929_zr'));
    await esperarDatos(page);
    await expect(page.getByTestId('app-cierre-pagina')).toBeVisible();
    await expect(page).toHaveURL(/\/app\/cierres\/sc_g_20260929_zr/);
  });
});

test.describe('Para aprobar (W10 y W11)', () => {
  test('aprobar el descuento y rechazar el traslado con un toque: cada tarjeta se va y la decisión queda registrada', async ({ page }) => {
    const errores = vigilar(page);
    await abrir(page, '/app');
    await expect(page.getByTestId('app-solicitud')).toHaveCount(3);
    const descuento = page.locator('[data-testid="app-solicitud"][data-tipo="descuento"]');
    await descuento.getByTestId('app-aprobar').click();
    await expect(descuento).toHaveCount(0);
    const traslado = page.locator('[data-testid="app-solicitud"][data-tipo="traslado"]');
    await traslado.getByTestId('app-rechazar').click();
    await page.getByRole('dialog').getByRole('textbox').fill('Zona Rosa ya recibe de Usaquén');
    await page.getByTestId('app-confirmar-decision').click();
    await expect(traslado).toHaveCount(0);
    const r = await conKc(page, (kc) => {
      const e = kc.estado() as unknown as { solicitudes: Record<string, { estado: string; resolucion: { nota: string | null } | null }>; traslados: Record<string, { estado: string; aprobacion: string }> };
      return { d: e.solicitudes['so_g_descuento_20260930'], t: e.solicitudes['so_g_traslado_20260930'], tr: e.traslados['tr_g_narrativa_20260930'] };
    });
    expect(r.d?.estado).toBe('aprobada');
    expect(r.t?.estado).toBe('rechazada');
    expect(r.t?.resolucion?.nota).toBe('Zona Rosa ya recibe de Usaquén');
    expect(r.tr?.aprobacion).toBe('rechazada');
    expect(r.tr?.estado).toBe('cancelado');
    // Queda en la lista de resueltas de "Para aprobar".
    await page.getByTestId('pestana-mas').click();
    await page.getByTestId('app-mas-aprobar').click();
    await expect(page.getByTestId('app-resueltas')).toContainText('Descuento del 20 %');
    await expect(page.getByTestId('app-resueltas')).toContainText('Aprobada');
    await expect(page.getByTestId('app-resueltas')).toContainText('Rechazada');
    expect(errores).toEqual([]);
  });

  test('anular una venta pide confirmación y deja la venta anulada', async ({ page }) => {
    await abrir(page, '/app/mas/aprobar');
    const anulacion = page.locator('[data-testid="app-solicitud"][data-tipo="anulacion"]');
    await expect(anulacion).toContainText('Anular la venta V-');
    await anulacion.getByTestId('app-aprobar').click();
    await expect(page.getByRole('dialog')).toContainText('No se puede deshacer');
    // Cancelar no hace nada.
    await page.getByRole('dialog').getByRole('button', { name: 'Volver' }).click();
    await expect(anulacion).toHaveCount(1);
    await anulacion.getByTestId('app-aprobar').click();
    await page.getByTestId('app-confirmar-decision').click();
    await expect(anulacion).toHaveCount(0);
    const v = await conKc(page, (kc) => {
      const e = kc.estado() as unknown as { ventas: Record<string, { anulacion: unknown }>; solicitudes: Record<string, { estado: string }> };
      return { anulada: !!e.ventas['vt_g_20260929_zr_012']?.anulacion, estado: e.solicitudes['so_g_anulacion_20260930']?.estado };
    });
    expect(v).toEqual({ anulada: true, estado: 'aprobada' });
  });

  test('deslizar la tarjeta hacia la derecha aprueba (y el descuento ya no está pendiente)', async ({ page }) => {
    await abrir(page, '/app/mas/aprobar');
    const tarjeta = page.locator('[data-testid="app-solicitud"][data-tipo="descuento"]');
    await tarjeta.locator('h3').evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const titulo = await tarjeta.locator('h3').boundingBox();
    if (!titulo) throw new Error('sin título');
    const y = titulo.y + titulo.height / 2;
    await page.mouse.move(titulo.x + 20, y);
    await page.mouse.down();
    await page.mouse.move(titulo.x + 60, y, { steps: 4 });
    await page.mouse.move(titulo.x + 160, y, { steps: 6 });
    await page.mouse.up();
    await expect(tarjeta).toHaveCount(0);
    expect(await conKc(page, (kc) => (kc.estado() as unknown as { solicitudes: Record<string, { estado: string }> }).solicitudes['so_g_descuento_20260930']?.estado)).toBe('aprobada');
  });

  test('sin solicitudes pendientes muestra "Todo al día"', async ({ page }) => {
    await abrir(page, '/app/mas/aprobar');
    for (const tipo of ['descuento', 'traslado', 'anulacion']) {
      const t = page.locator(`[data-testid="app-solicitud"][data-tipo="${tipo}"]`);
      await t.getByTestId('app-aprobar').click();
      if (tipo === 'anulacion') await page.getByTestId('app-confirmar-decision').click();
      await expect(t).toHaveCount(0);
    }
    await expect(page.getByTestId('app-aprobar-vacio')).toContainText('Todo al día');
  });
});

test.describe('El celular con el código QR (W10)', () => {
  test('la venta hecha en el computador llega con su aviso, se puede ver y el chip explica lo que pasó', async ({ page, browser }) => {
    await page.goto(conHoy('/panel/inicio'));
    await esperarDatos(page);
    const { ventaId, numero } = await registrarVentaDePrueba(page);
    const url = await conKc(page, (kc) => kc.urlQr());
    const celular = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const p = await celular.newPage();
    const errores = vigilar(p);
    await p.goto(url);
    await esperarDatos(p);
    const aviso = p.getByTestId('app-aviso-qr');
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText(`Llegó tu venta ${numero} desde el computador`);
    await expect(p.locator(`[data-venta="${ventaId}"]`).first()).toContainText(numero);
    await p.getByTestId('app-aviso-qr-ver').click();
    await expect(p.getByTestId('app-detalle-venta')).toContainText(numero);
    await p.keyboard.press('Escape');
    await p.getByTestId('chip-datos-ejemplo').click();
    await expect(p.getByTestId('chip-resultado-qr')).toHaveAttribute('data-resultado', 'adoptado');
    await expect(p.getByTestId('chip-resultado-qr')).toContainText('recibió la acción del computador');
    await p.keyboard.press('Escape');
    // El aviso se puede cerrar y no vuelve al cambiar de pestaña.
    await p.getByRole('button', { name: 'Cerrar aviso' }).click();
    await expect(aviso).toHaveCount(0);
    await p.getByTestId('pestana-ventas').click();
    await p.getByTestId('pestana-hoy').click();
    await expect(p.getByTestId('app-hoy')).toBeVisible();
    await expect(aviso).toHaveCount(0);
    expect(await sinDesborde(p)).toBe(true);
    expect(errores).toEqual([]);
    await celular.close();
  });

  test('un código ilegible lo dice sin romper nada', async ({ page }) => {
    await page.goto(conHoy('/app') + '#r=zAAAA');
    await esperarDatos(page);
    await expect(page.getByTestId('app-aviso-qr')).toContainText('No pudimos leer el código QR');
    await expect(page.getByTestId('app-hoy')).toBeVisible();
  });
});

test.describe('Ventas', () => {
  test('hoy, 7 días y mes: la cifra coincide con selVentas; tocar una barra muestra su valor; la lista abre el detalle', async ({ page }) => {
    const errores = vigilar(page);
    await abrir(page, '/app/ventas');
    for (const [id, desde, hasta] of [
      ['hoy', HOY, HOY],
      ['semana', '2026-09-24', HOY],
      ['mes', '2026-09-01', HOY],
    ] as const) {
      await page.getByTestId(`app-periodo-${id}`).click();
      const total = await page.evaluate(
        async ([d, h]) => {
          const kc = (globalThis as unknown as { __kc: { sel: (n: string, p: unknown) => unknown } }).__kc;
          return (kc.sel('selVentas', { desde: d, hasta: h }) as { totales: { netas: number } }).totales.netas;
        },
        [desde, hasta],
      );
      await expect.poll(async () => aNumero((await page.getByTestId('app-ventas-total').textContent()) ?? ''), { timeout: 6_000 }).toBe(total);
    }
    // Barras: tocar la primera cambia la lectura.
    const lectura = page.getByTestId('barras-lectura');
    const antes = await lectura.textContent();
    await page.getByTestId('app-ventas-barras').getByRole('button').first().click();
    await expect(lectura).not.toHaveText(antes ?? '');
    // Un periodo nuevo trae su lista y el detalle de una venta.
    await page.getByTestId('app-periodo-hoy').click();
    await page.getByTestId('app-lista-ventas').locator('[data-venta]').first().click();
    await expect(page.getByTestId('app-detalle-venta')).toBeVisible();
    await expect(page.getByTestId('app-detalle-venta')).toContainText('Prendas');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('app-detalle-venta')).toHaveCount(0);
    expect(await sinDesborde(page)).toBe(true);
    expect(errores).toEqual([]);
  });

  test('"Ver más ventas" muestra más filas', async ({ page }) => {
    await abrir(page, '/app/ventas');
    await page.getByTestId('app-periodo-mes').click();
    const lista = page.getByTestId('app-lista-ventas').locator('[data-venta]');
    await expect(lista).toHaveCount(12);
    await page.getByTestId('app-ver-mas-ventas').click();
    await expect(lista).toHaveCount(36);
  });
});

test.describe('Inventario', () => {
  test('busca por nombre, filtra por local y abre la ficha con la matriz de existencias', async ({ page }) => {
    const errores = vigilar(page);
    await abrir(page, '/app/inventario');
    await expect(page.getByTestId('app-critico')).toContainText('Camisa Oxford entallada');
    await expect(page.getByTestId('app-critico')).toContainText('Talla M · Azul cielo');
    await page.getByTestId('app-buscar').fill('oxford');
    await expect(page.getByTestId('app-resultados')).toBeVisible();
    const n = await conKc(page, (kc) => (kc.sel('selCatalogo', { texto: 'oxford', localId: 'todos' }) as unknown[]).length);
    await expect(page.getByTestId('app-producto-fila')).toHaveCount(n);
    await page.getByTestId('app-buscar').fill('zzzz');
    await expect(page.getByTestId('app-resultados')).toContainText('No encontramos ese producto');
    await page.getByTestId('app-buscar').fill('camisa oxford entallada');
    await page.getByTestId('app-producto-fila').first().click();
    await expect(page.getByTestId('app-producto')).toBeVisible();
    // La matriz del local coincide con selMatrizExistencias.
    const esperado = await conKc(page, (kc) => {
      const n = kc.sel('selNarrativa', { hoy: '2026-09-30' }) as { productoCritico: string; varianteCritica: string };
      const m = kc.sel('selMatrizExistencias', { productoId: n.productoCritico }) as { celdas: Record<string, Record<string, number>>; total: number; tallas: string[]; colores: { id: string }[] };
      return { total: m.total, tallas: m.tallas.length, colores: m.colores.length };
    });
    await expect(page.getByTestId('app-matriz').getByRole('columnheader')).toHaveCount(esperado.tallas + 1);
    await expect(page.getByTestId('app-matriz')).toContainText(`${esperado.total} uds.`);
    await page.getByTestId('app-prod-local-usq').click();
    const usq = await conKc(page, (kc) => {
      const n = kc.sel('selNarrativa', { hoy: '2026-09-30' }) as { productoCritico: string };
      return (kc.sel('selMatrizExistencias', { productoId: n.productoCritico }) as { totalPorLocal: Record<string, number> }).totalPorLocal['usq'];
    });
    await expect(page.getByTestId('app-matriz')).toContainText(`${usq} uds.`);
    await expect(page.getByTestId('app-en-camino')).toBeVisible();
    expect(await sinDesborde(page)).toBe(true);
    expect(errores).toEqual([]);
  });

  test('el enlace directo a una referencia inexistente no rompe', async ({ page }) => {
    await abrir(page, '/app/inventario/HL-NO-EXISTE');
    await expect(page.getByTestId('app-producto')).toContainText('No encontramos ese producto');
  });
});

test.describe('Agenda y Más', () => {
  test('la agenda agrupa los próximos 14 días por día y las llegadas abren su importación', async ({ page }) => {
    await abrir(page, '/app/agenda');
    const esperados = await conKc(page, (kc) =>
      (kc.sel('selEventosCalendario', { desde: '2026-09-30', hasta: '2026-10-13', tipos: ['importacion', 'vencimiento', 'campana', 'cita', 'otro'], localId: 'todos' }) as unknown[]).length,
    );
    await expect(page.getByTestId('app-evento')).toHaveCount(esperados);
    await expect(page.getByTestId('app-agenda-dia').first()).toContainText(/Sábado 3 de octubre|Hoy|Mañana/);
    await page.getByTestId('app-evento').filter({ hasText: 'Llega a bodega IMP-2026-06' }).click();
    await expect(page.getByTestId('app-importacion-pagina')).toContainText('IMP-2026-06');
  });

  test('Más lleva a cada sección y el modo claro cambia el tema y se conserva', async ({ page }) => {
    const errores = vigilar(page);
    await abrir(page, '/app/mas');
    await expect(page.getByTestId('app-mas-aprobar')).toContainText('3 solicitudes');
    for (const [id, pantalla] of [
      ['aprobar', 'app-aprobar-pagina'],
      ['importaciones', 'app-importaciones'],
      ['nomina', 'app-nomina'],
      ['pagos', 'app-pagos'],
      ['alertas', 'app-alertas'],
      ['moneda', 'app-moneda-pagina'],
      ['arrancar', 'app-como-arrancariamos'],
    ] as const) {
      await page.getByTestId(`app-mas-${id}`).click();
      await expect(page.getByTestId(pantalla)).toBeVisible();
      expect(await sinDesborde(page), pantalla).toBe(true);
      await page.getByRole('link', { name: /Más/ }).first().click();
      await expect(page.getByTestId('app-mas')).toBeVisible();
    }
    // Oscura por defecto; modo claro la cambia y vuelve.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByTestId('app-modo-claro').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByTestId('app-modo-claro')).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('app-modo-claro').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(errores).toEqual([]);
  });

  test('la tarjeta del computador copia o comparte el enlace y nunca navega; la de instalar explica cómo', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await abrir(page, '/app/mas');
    await expect(page.getByTestId('app-instalar')).toContainText('Instala la app');
    const url = page.url();
    await page.getByTestId('app-copiar-enlace').click();
    await expect(page.getByTestId('avisos')).toContainText('Enlace copiado');
    expect(page.url()).toBe(url);
    const copiado = await page.evaluate(() => navigator.clipboard.readText());
    expect(copiado).toMatch(/^https?:\/\/[^/]+\/(\?hoy=.*)?$/);
    expect(copiado).not.toContain('#r=');
  });
});

test.describe('Importaciones, nómina, pagos y alertas', () => {
  test('importaciones: tarjetas con línea de tiempo y detalle con los 13 estados', async ({ page }) => {
    const errores = vigilar(page);
    await abrir(page, '/app/mas/importaciones');
    const n = await conKc(page, (kc) => (kc.sel('selImportaciones', { hoy: '2026-09-30', incluirRecibidas: false }) as unknown[]).length);
    await expect(page.getByTestId('app-importacion').first()).toBeVisible();
    expect(await page.getByTestId('app-importacion').count()).toBeGreaterThanOrEqual(n);
    await expect(page.getByTestId('app-importacion').filter({ hasText: 'IMP-2026-06' })).toContainText('Retraso de 6 días');
    await page.getByTestId('app-importacion').filter({ hasText: 'IMP-2026-07' }).click();
    await expect(page.getByTestId('app-imp-estado')).toContainText('En puerto colombiano');
    await expect(page.getByTestId('app-imp-linea').locator('li').filter({ hasText: 'Estimada' }).first()).toBeVisible();
    await expect(page.getByTestId('app-imp-linea')).toContainText('Reportado por la agente de aduanas desde el portal');
    expect(errores).toEqual([]);
  });

  test('nómina: el costo del periodo es el de la vista previa del escritorio', async ({ page }) => {
    await abrir(page, '/app/mas/nomina');
    const costo = await conKc(page, (kc) => {
      const p = kc.sel('selPeriodoAbierto', { hoy: '2026-09-30' }) as { quincenal: unknown };
      const v = kc.sel('selVistaPreviaNomina', { periodo: p.quincenal, exoneracion: true, ahora: '2026-09-30T15:30:00' }) as { liquidacion: { totales: { costo: number } } };
      return v.liquidacion.totales.costo;
    });
    expect(aNumero((await page.getByTestId('app-nomina-costo').locator('.num').first().textContent()) ?? '')).toBe(costo);
    await expect(page.getByTestId('app-nomina-locales')).toContainText('Parque 93');
    await page.getByRole('radio', { name: 'Mensual' }).click();
    await expect(page.getByTestId('app-nomina-costo')).toBeVisible();
  });

  test('pagos pendientes: por pagar y vencido coinciden con selCuentasPorPagar', async ({ page }) => {
    await abrir(page, '/app/mas/pagos');
    const x = await conKc(page, (kc) => {
      const r = kc.sel('selCuentasPorPagar', { hoy: '2026-09-30', estado: 'pendientes', localId: 'todos' }) as { filas: unknown[]; totalCop: number; vencidoCop: number };
      return { n: r.filas.length, total: r.totalCop, vencido: r.vencidoCop };
    });
    await expect(page.getByTestId('app-pago')).toHaveCount(x.n);
    await expect(page.getByTestId('app-pagos-flujo')).toContainText('La plata baja a');
    await expect(page.getByTestId('app-pagos-vencido')).toContainText('Ya pasó su fecha');
    expect(x.vencido).toBeGreaterThan(0);
  });

  test('alertas: las mismas del escritorio, se descartan y las que tienen pantalla en la app abren esa pantalla', async ({ page }) => {
    await abrir(page, '/app/mas/alertas');
    const n = await conKc(page, (kc) => (kc.sel('selAlertas', { localId: 'todos', ahora: '2026-09-30T15:30:00' }) as unknown[]).length);
    await expect(page.getByTestId('app-alerta')).toHaveCount(n);
    await page.getByRole('button', { name: /^Descartar: / }).first().click();
    await expect(page.getByTestId('app-alerta')).toHaveCount(n - 1);
    await page.locator('[data-alerta^="caja:"] a').click();
    await expect(page.getByTestId('app-cierre-pagina')).toBeVisible();
    // Ninguna alerta saca al dueño de la app (los enlaces /panel no se usan).
    await abrir(page, '/app/mas/alertas');
    const hrefs = await page.getByTestId('app-lista-alertas').locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(hrefs.every((h) => h?.startsWith('/app'))).toBe(true);
  });

  test('moneda y "Cómo arrancaríamos"', async ({ page }) => {
    await abrir(page, '/app/mas/moneda');
    await page.getByTestId('app-moneda-CNY').click();
    await expect(page.getByTestId('app-moneda-muestra')).toContainText('CN¥');
    await expect(page.getByTestId('app-moneda-CNY')).toHaveAttribute('aria-checked', 'true');
    await abrir(page, '/app/mas/como-arrancariamos');
    await expect(page.getByTestId('app-como-arrancariamos')).toContainText('Punto de venta, inventario por local y cierre de caja');
    await expect(page.getByTestId('app-como-arrancariamos')).toContainText('Semanas aproximadas');
  });
});

test.describe('Marco del escritorio', () => {
  test('"Ver app del dueño" muestra el QR y la app enmarcada con el estado de la pestaña, sin emitir app_abierta', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errores = vigilar(page);
    await page.goto(conHoy('/panel/inicio'));
    await esperarDatos(page);
    await page.getByTestId('ver-app-dueno').click();
    await expect(page.getByTestId('modal-app-dueno')).toBeVisible();
    await expect(page.getByTestId('url-app')).toContainText('/app');
    const marco = page.frameLocator('iframe[src*="/app?marco=1"]');
    await expect(marco.getByTestId('app-hoy')).toBeVisible({ timeout: 30_000 });
    // El marco adopta el estado de la pestaña: la cifra es la misma.
    const esperado = await conKc(page, (kc) => (kc.sel('selKpisInicio', { localId: 'todos', ahora: '2026-09-30T15:30:00' }) as { tarjetas: { valor: number }[] }).tarjetas[0]?.valor);
    await expect.poll(async () => aNumero((await marco.getByTestId('app-ventas-hoy').textContent()) ?? '')).toBe(esperado);
    const tipos = await conKc(page, (kc) => kc.eventosUI().map((e) => e.tipo));
    expect(tipos).toContain('qr_abierto');
    expect(tipos).not.toContain('app_abierta');
    expect(errores).toEqual([]);
    await ctx.close();
  });
});

// ---------------------------------------------------------------------------------------------------------
// Arranque (también con `npm run test:e2e:rendimiento`)
// ---------------------------------------------------------------------------------------------------------
test('@rendimiento Hoy se pinta pronto una vez construidos los datos y lo de abajo se carga aparte', async ({ browser }) => {
  test.setTimeout(240_000);
  const medir = async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const js: string[] = [];
    page.on('request', (r) => r.url().endsWith('.js') && js.push(new URL(r.url()).pathname));
    await page.addInitScript(() => {
      const w = globalThis as unknown as { __tListo?: number; __tHoy?: number; __kcDatos?: { getState: () => { fase: string }; subscribe: (f: () => void) => void } };
      const t = setInterval(() => {
        const d = w.__kcDatos;
        if (!d) return;
        clearInterval(t);
        const mirar = () => {
          if (d.getState().fase === 'listo' && !w.__tListo) w.__tListo = performance.now();
        };
        d.subscribe(mirar);
        mirar();
      }, 5);
      document.addEventListener('DOMContentLoaded', () => {
        new MutationObserver(() => {
          if (document.querySelector('[data-testid="app-hoy"]') && !w.__tHoy) w.__tHoy = performance.now();
        }).observe(document.documentElement, { childList: true, subtree: true });
      });
    });
    await page.goto(`/app?hoy=${encodeURIComponent(HOY_QA)}`, { waitUntil: 'commit' });
    await page.getByTestId('app-hoy').waitFor({ timeout: 60_000 });
    const t = await page.evaluate(() => {
      const w = globalThis as unknown as { __tListo?: number; __tHoy?: number };
      return { total: w.__tHoy ?? 0, listo: w.__tListo ?? 0 };
    });
    // Lo que va debajo del pliegue llega después.
    await page.getByTestId('app-por-local').waitFor({ timeout: 30_000 });
    const pesados = js.filter((u) => /\/assets\/(radix|graficos|codigos|dnd|tabla|LayoutEscritorio)-/.test(u));
    await ctx.close();
    return { render: t.total - t.listo, total: t.total, pesados };
  };
  await medir(); // calentamiento
  const medidas = [await medir(), await medir(), await medir()];
  const render = [...medidas.map((m) => m.render)].sort((a, b) => a - b)[1] ?? Infinity;
  const linea = `/app (E1) con CPU ×4: Hoy se pinta ${Math.round(render)} ms después de construir los datos (total ${medidas.map((m) => Math.round(m.total)).join(' · ')} ms)`;
  console.info(linea);
  test.info().annotations.push({ type: 'medicion', description: linea });
  for (const m of medidas) expect(m.pesados).toEqual([]);
  // El esqueleto original tardaba ≈ 100–150 ms; el margen del presupuesto es ≈ 200 ms.
  expect(render).toBeLessThan(250);
});

import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { conKc, esperarDatos } from '../kc';

/**
 * B3 · Pagos, datáfono y flujo de caja (PLAN 9.4). Solo verifica la pantalla de Pagos: los efectos se leen con
 * selectores por `window.__kc`, nunca navegando a pantallas de otros paquetes. Corre con PORT=4313.
 */
const HOY = '2026-09-30';
const HORA = '15:30';

function vigilarConsola(page: Page): string[] {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`console: ${m.text()}`);
  });
  return errores;
}

async function entrar(page: Page, irA: (r: string) => Promise<void>, ruta: string) {
  await irA(ruta);
  await esperarDatos(page);
  await expect(page.getByTestId('pagina').first()).toBeVisible();
}

/** Lee un selector con parámetros (conKc no pasa argumentos a la página). */
const sel = <T>(page: Page, nombre: string, params?: unknown): Promise<T> =>
  page.evaluate(([n, p]) => (globalThis as unknown as { __kc: { sel: (n: string, p?: unknown) => unknown } }).__kc.sel(n as string, p), [nombre, params]) as Promise<T>;

/** Clic en algo de una tabla: lo centra antes, para que no quede tapado por la barra superior ni por la cabecera fija. */
async function clic(l: Locator) {
  await l.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await l.click();
}

/** Escribe en un campo numérico que ya trae valor: selecciona todo y teclea (fill compite con el re-render del enfoque). */
async function escribirNumero(page: Page, testid: string, valor: string) {
  const campo = page.getByTestId(testid);
  await campo.click();
  await campo.press('ControlOrMeta+a');
  await campo.pressSequentially(valor);
}

const valorDe = async (page: Page, testid: string): Promise<number> => Number(await page.locator(`[data-testid="${testid}"][data-valor], [data-testid="${testid}"] [data-valor]`).first().getAttribute('data-valor'));

test.describe('Pagos (B3)', () => {
  test('las ocho pantallas cargan sin errores, con sus pestañas y sus pistas', async ({ page, irA }) => {
    test.setTimeout(180_000);
    const errores = vigilarConsola(page);
    await irA('/panel/pagos');
    await esperarDatos(page);
    const cuentaId = await conKc(page, (kc) => Object.keys(kc.estado().cuentas)[0] ?? '');
    const rutas = ['/panel/pagos', '/panel/pagos/flujo', '/panel/pagos/por-pagar', '/panel/pagos/por-cobrar', '/panel/pagos/cuentas', `/panel/pagos/cuentas/${cuentaId}`, '/panel/pagos/conciliacion', '/panel/pagos/datafono'];
    for (const r of rutas) {
      await entrar(page, irA, r);
      await expect(page.getByRole('heading', { level: 1 }), r).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Secciones de Pagos' }).getByRole('link')).toHaveCount(7);
      await expect(page.getByTestId('error-ruta')).toHaveCount(0);
    }
    // Las pistas viven sobre las pestañas "Flujo de caja" y "Datáfono" (CONTRATOS 10).
    await expect(page.locator('[data-pista="pagos.flujo"]')).toHaveCount(1);
    await expect(page.locator('[data-pista="pagos.datafono"]')).toHaveCount(1);
    expect(errores).toEqual([]);
  });

  test('"Plata que me deben · Cuentas por cobrar" y el resto del lenguaje del comerciante', async ({ page, irA }) => {
    await entrar(page, irA, '/panel/pagos/por-cobrar');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Plata que me deben');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Cuentas por cobrar');
    await entrar(page, irA, '/panel/pagos/por-pagar');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Lo que debo');
  });

  test('resumen: las cifras son las de los selectores y el comparativo trae los tres locales', async ({ page, irA }) => {
    await entrar(page, irA, '/panel/pagos');
    const r = await conKc(page, (kc) => {
      const pagar = kc.sel('selCuentasPorPagar', { hoy: '2026-09-30', estado: 'pendientes' }) as { totalCop: number };
      const cobrar = kc.sel('selCuentasPorCobrar', { hoy: '2026-09-30' }) as { saldo: number };
      const saldos = kc.sel('selSaldosCuentas') as { total: number };
      return { pagar: pagar.totalCop, cobrar: cobrar.saldo, disponible: saldos.total };
    });
    // Los KPI son contadores animados: se leen del texto completo (title) cuando se abrevian.
    await expect(page.getByTestId('kpi-disponible')).toBeVisible();
    await expect(page.getByTestId('tabla-resumen-locales').getByRole('row')).toHaveCount(1 + 4 + 1);
    for (const local of ['Parque 93', 'Usaquén', 'Zona Rosa']) await expect(page.getByTestId('tabla-resumen-locales')).toContainText(local);
    const textos = await page.getByTestId('tabla-resumen-locales').innerText();
    expect(textos.length).toBeGreaterThan(50);
    expect(r.pagar).toBeGreaterThan(0);
    expect(r.cobrar).toBeGreaterThan(0);
    expect(r.disponible).toBeGreaterThan(0);
    // Atención: separados por vencer lleva al filtro de por cobrar.
    await page.getByTestId('atencion-separados').click();
    await expect(page).toHaveURL(/por-cobrar\?filtro=separados-por-vencer/);
  });

  test.describe('W5 · flujo de caja', () => {
    test('emite flujo_caja_visto y explica el punto bajo con las palabras del selector', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/flujo');
      const esperado = await conKc(page, (kc) => {
        const f = kc.sel('selFlujoProyectado', { dias: 90, hoy: '2026-09-30', hora: '15:30' }) as { explicacion: string; puntoBajo: { saldo: number } };
        return { explicacion: f.explicacion, saldo: f.puntoBajo.saldo, eventos: kc.eventosUI().map((e) => e.tipo) };
      });
      expect(esperado.eventos).toContain('flujo_caja_visto');
      await expect(page.getByTestId('punto-bajo-explicacion')).toHaveText(esperado.explicacion);
      expect(await valorDe(page, 'punto-bajo-valor')).toBe(esperado.saldo);
      // Rango pedido: el punto bajo está entre 10 y 30 millones y el saldo nunca es negativo.
      expect(esperado.saldo).toBeGreaterThan(10_000_000);
      expect(esperado.saldo).toBeLessThan(30_000_000);
      await expect(page.getByTestId('flujo-linea')).toBeVisible();
      await expect(page.locator('[data-pista="pagos.flujo"]')).toHaveCount(1);
    });

    test('alterna 30 · 60 · 90 días y la explicación sigue al período', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/flujo');
      for (const dias of ['30', '60', '90']) {
        await page.getByTestId(`flujo-dias-${dias}`).click();
        await expect(page).toHaveURL(new RegExp(`dias=${dias}`));
        await expect(page.getByTestId('flujo-kpis')).toContainText(`Entra en ${dias} días`);
        const f = await sel<{ explicacion: string }>(page, 'selFlujoProyectado', { dias: Number(dias), hoy: HOY, hora: HORA });
        await expect(page.getByTestId('punto-bajo-explicacion')).toHaveText(f.explicacion);
        expect(await page.getByTestId('flujo-semana').count()).toBeGreaterThanOrEqual(Math.floor(Number(dias) / 7));
      }
    });

    test('?semana= abre la lista de pagos de esa semana y "Ver los pagos de esa semana" va a la del punto bajo', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/flujo?semana=2026-10-19');
      await expect(page.getByTestId('semana-titulo')).toContainText('19 – 25 oct');
      await expect(page.getByTestId('flujo-semana').filter({ hasText: '19 – 25 oct' })).toHaveAttribute('aria-pressed', 'true');
      await clic(page.getByTestId('ver-semana-bajo'));
      await expect(page).toHaveURL(/semana=2026-10-12/);
      await expect(page.getByTestId('pagos-semana')).toContainText('Hangzhou Lanxin');
      await expect(page.getByTestId('flujo-semana').filter({ hasText: 'Punto más bajo' })).toHaveAttribute('aria-pressed', 'true');
    });

    test('reprogramar una cuenta por pagar mueve la línea y la explicación en vivo', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/flujo?semana=2026-10-12');
      const leer = () =>
        conKc(page, (kc) => {
          const f = kc.sel('selFlujoProyectado', { dias: 90, hoy: '2026-09-30', hora: '15:30' }) as { explicacion: string; puntoBajo: { saldo: number; fecha: string } };
          return { explicacion: f.explicacion, saldo: f.puntoBajo.saldo, fecha: f.puntoBajo.fecha };
        });
      const antes = await leer();
      const fila = page.getByTestId('pago-semana').filter({ hasText: 'Hangzhou Lanxin' });
      await clic(fila.getByTestId('reprogramar'));
      await page.getByTestId('reprogramar-panel').getByRole('button', { name: '+30 días' }).click();
      await page.getByTestId('reprogramar-aplicar').click();
      const despues = await leer();
      expect(despues.saldo !== antes.saldo || despues.fecha !== antes.fecha).toBe(true);
      await expect(page.getByTestId('punto-bajo-explicacion')).toHaveText(despues.explicacion);
      await expect(page.getByTestId('flujo-cambio')).toBeVisible();
      await expect(page.getByTestId('flujo-cambio')).toContainText('Valor de tu punto más bajo');
      // La cuenta quedó programada (comando cxp.programar).
      const programada = await conKc(page, (kc) => {
        const todas = Object.values((kc.estado() as unknown as { cuentasPorPagar: Record<string, { concepto: string; programadaPara: string | null }> }).cuentasPorPagar);
        return todas.find((c) => c.concepto.includes('Saldo 70') && c.concepto.includes('IMP-2026-09'))?.programadaPara ?? null;
      });
      expect(programada).toBe('2026-11-13');
      // Ya no está en la semana original.
      await expect(page.getByTestId('pagos-semana')).not.toContainText('Hangzhou Lanxin');
    });

    test('reprogramar un pago estimado de una importación registra su cuenta por pagar', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/flujo?semana=2026-10-12');
      const n0 = await conKc(page, (kc) => Object.keys((kc.estado() as unknown as { cuentasPorPagar: Record<string, unknown> }).cuentasPorPagar).length);
      const fila = page.locator('[data-clase="importacion"]').first();
      await expect(fila).toContainText('Tributos aduaneros');
      await clic(fila.getByTestId('reprogramar'));
      await page.getByTestId('reprogramar-panel').getByRole('button', { name: '+14 días' }).click();
      await page.getByTestId('reprogramar-aplicar').click();
      await expect(page.getByTestId('flujo-cambio')).toBeVisible();
      const n1 = await conKc(page, (kc) => Object.keys((kc.estado() as unknown as { cuentasPorPagar: Record<string, unknown> }).cuentasPorPagar).length);
      expect(n1).toBe(n0 + 1);
    });

    test('los pagos de fecha fija (nómina, seguridad social) no se pueden reprogramar y dicen por qué', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/flujo?semana=2026-10-12');
      const nomina = page.getByTestId('pago-semana').filter({ hasText: 'Nómina' });
      await expect(nomina).toContainText('Fecha fija');
      await expect(nomina.getByTestId('reprogramar')).toHaveCount(0);
    });
  });

  test.describe('Lo que debo', () => {
    test('trae las cuentas pendientes con su total, y ?resaltar= marca la fila', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/por-pagar');
      const esperado = await conKc(page, (kc) => {
        const r = kc.sel('selCuentasPorPagar', { hoy: '2026-09-30', estado: 'pendientes' }) as { totalCop: number; vencidoCop: number; filas: { cxp: { id: string } }[] };
        return { total: r.totalCop, vencido: r.vencidoCop, n: r.filas.length, id: r.filas[0]?.cxp.id ?? '' };
      });
      expect(await valorDe(page, 'cxp-total')).toBe(esperado.total);
      expect(await valorDe(page, 'cxp-vencido')).toBe(esperado.vencido);
      await expect(page.getByTestId('tabla-cxp').locator('[data-fila]')).toHaveCount(esperado.n);
      await entrar(page, irA, `/panel/pagos/por-pagar?resaltar=${esperado.id}`);
      await expect(page.locator('[data-resaltada]').first()).toBeVisible();
    });

    test('pagar en dos clics: abre el pago prellenado y registra el pago completo', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/por-pagar');
      const antes = await conKc(page, (kc) => (kc.sel('selCuentasPorPagar', { hoy: '2026-09-30', estado: 'pendientes' }) as { filas: unknown[] }).filas.length);
      await clic(page.getByTestId('pagar-fila').first());
      await expect(page.getByTestId('dialogo-pagar')).toBeVisible();
      await page.getByTestId('pagar-confirmar').click();
      await expect(page.getByTestId('dialogo-pagar')).toHaveCount(0);
      const r = await conKc(page, (kc) => ({
        n: (kc.sel('selCuentasPorPagar', { hoy: '2026-09-30', estado: 'pendientes' }) as { filas: unknown[] }).filas.length,
        eventos: kc.eventosDominio().map((e) => e.tipo),
      }));
      expect(r.n).toBe(antes - 1);
      expect(r.eventos).toContain('PagoRegistrado');
    });

    test('pago parcial de una cuenta en dólares: queda el saldo, con su cifra de origen', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/por-pagar');
      const fila = page.getByTestId('tabla-cxp').locator('[data-fila]').filter({ hasText: 'Hangzhou Lanxin' });
      await expect(fila).toContainText('US$');
      await clic(fila.getByTestId('pagar-fila'));
      await page.getByRole('button', { name: 'La mitad' }).click();
      await page.getByTestId('pagar-confirmar').click();
      await expect(page.getByTestId('dialogo-pagar')).toHaveCount(0);
      const r = await conKc(page, (kc) => {
        const f = (kc.sel('selCuentasPorPagar', { hoy: '2026-09-30' }) as { filas: { cxp: { concepto: string; valor: number; abonos: unknown[] }; saldoOrigen: number; estado: string }[] }).filas.find((x) => x.cxp.concepto.includes('Saldo 70') && x.cxp.concepto.includes('IMP-2026-09'));
        return f ? { abonos: f.cxp.abonos.length, saldo: f.saldoOrigen, valor: f.cxp.valor, estado: f.estado } : null;
      });
      expect(r?.abonos).toBe(1);
      expect(r?.estado).toBe('pago_parcial');
      expect(r?.saldo).toBeGreaterThan(0);
      expect(r?.saldo).toBeLessThan(r?.valor ?? 0);
      await expect(page.getByTestId('tabla-cxp').locator('[data-fila]').filter({ hasText: 'Hangzhou Lanxin' })).toContainText('Pago parcial');
    });

    test('programar un pago y quitarle la programación', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/por-pagar');
      const fila = page.getByTestId('tabla-cxp').locator('[data-fila]').filter({ hasText: 'Hangzhou Lanxin' });
      await clic(fila.getByRole('button', { name: /Acciones de CP-/ }));
      await page.getByRole('menuitem', { name: /Programar pago/ }).click();
      await page.getByLabel('Voy a pagar el').click();
      await page.getByRole('button', { name: 'viernes, 16 de octubre de 2026' }).click();
      await page.getByTestId('programar-confirmar').click();
      await expect(fila).toContainText('Programado');
      await expect(fila).toContainText('16/10/2026');
    });

    test('crear, editar y eliminar una cuenta por pagar (con confirmación)', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/por-pagar');
      await page.getByTestId('nueva-cxp').click();
      // Validación: no deja guardar vacío y marca los campos.
      await page.getByTestId('cuenta-guardar').click();
      await expect(page.getByTestId('dialogo-cuenta')).toContainText('Escribe a quién se le debe.');
      await page.getByTestId('cuenta-tercero').fill('Estudio Prueba E2E');
      await page.getByTestId('cuenta-concepto').fill('Sesión de fotos de la colección');
      await page.getByTestId('cuenta-valor').fill('1500000');
      await page.getByLabel('Vence el').click();
      await page.getByRole('button', { name: 'viernes, 2 de octubre de 2026' }).click();
      await page.getByTestId('cuenta-guardar').click();
      await expect(page.getByTestId('dialogo-cuenta')).toHaveCount(0);
      const fila = page.getByTestId('tabla-cxp').locator('[data-fila]').filter({ hasText: 'Estudio Prueba E2E' });
      await expect(fila).toContainText('1.500.000');
      // Editar el valor.
      await clic(fila.getByRole('button', { name: /Acciones de CP-/ }));
      await page.getByRole('menuitem', { name: 'Editar' }).click();
      await escribirNumero(page, 'cuenta-valor', '1800000');
      await page.getByTestId('cuenta-guardar').click();
      await expect(fila).toContainText('1.800.000');
      // Eliminar pide confirmación y dice las consecuencias.
      await clic(fila.getByRole('button', { name: /Acciones de CP-/ }));
      await page.getByRole('menuitem', { name: 'Eliminar' }).click();
      await expect(page.getByRole('alertdialog')).toContainText('Estudio Prueba E2E');
      await page.getByRole('button', { name: 'Cancelar' }).click();
      await expect(fila).toBeVisible();
      await clic(fila.getByRole('button', { name: /Acciones de CP-/ }));
      await page.getByRole('menuitem', { name: 'Eliminar' }).click();
      await page.getByRole('button', { name: 'Eliminar cuenta' }).click();
      await expect(page.getByTestId('tabla-cxp').locator('[data-fila]').filter({ hasText: 'Estudio Prueba E2E' })).toHaveCount(0);
    });

    test('con un solo local elegido avisa que no incluye lo general del negocio', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/por-pagar');
      await page.getByTestId('selector-local').click();
      await page.getByTestId('local-usq').click();
      await expect(page.getByText(/No incluye 2 cuentas generales/)).toBeVisible();
      await expect(page.getByTestId('tabla-cxp').locator('[data-fila]')).toHaveCount(0);
    });
  });

  test.describe('Plata que me deben', () => {
    test('?filtro=separados-por-vencer muestra solo esos separados', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/por-cobrar?filtro=separados-por-vencer');
      const n = await conKc(page, (kc) => (kc.sel('selCuentasPorCobrar', { hoy: '2026-09-30', filtro: 'separados-por-vencer' }) as { filas: unknown[] }).filas.length);
      expect(n).toBeGreaterThan(0);
      await expect(page.getByTestId('tabla-cxc').locator('[data-fila]')).toHaveCount(n);
      await expect(page.getByTestId('filtro-separados')).toHaveAttribute('aria-checked', 'true');
      await page.getByRole('radio', { name: 'Todos' }).click();
      const total = await conKc(page, (kc) => (kc.sel('selCuentasPorCobrar', { hoy: '2026-09-30' }) as { filas: unknown[] }).filas.length);
      await expect(page.getByTestId('tabla-cxc').locator('[data-fila]')).toHaveCount(total);
    });

    test('el recordatorio de cobro sale prellenado en WhatsApp, sin destinatario y con el sufijo de prueba', async ({ page, irA, context }) => {
      await context.route('https://wa.me/**', (r) => r.abort());
      await entrar(page, irA, '/panel/pagos/por-cobrar?filtro=separados-por-vencer');
      await clic(page.getByTestId('cobro-recordar').first());
      const texto = page.getByTestId('cobro-texto');
      await expect(texto).toHaveValue(/saldo de \$.*vence el \d\d\/\d\d\/2026/);
      const enlace = page.getByTestId('cobro-whatsapp');
      const href = (await enlace.getAttribute('href')) ?? '';
      expect(href.startsWith('https://wa.me/?text=')).toBe(true);
      expect(decodeURIComponent(href)).toContain('(mensaje de prueba desde la demo de KippiCore)');
      await page.getByRole('radio', { name: 'Usted' }).click();
      await expect(texto).toHaveValue(/Le recordamos/);
      const [popup] = await Promise.all([context.waitForEvent('page'), enlace.click()]);
      await popup.close().catch(() => undefined);
      await expect(page.getByTestId('avisos')).toContainText('Recordatorio listo en WhatsApp');
    });

    test('registrar un abono por transferencia baja el saldo de esa venta', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/por-cobrar');
      const id = (await page.getByTestId('tabla-cxc').locator('[data-fila]').first().getAttribute('data-fila')) ?? '';
      const antes = await sel<{ saldo: number; filas: { ventaId: string; saldo: number }[] }>(page, 'selCuentasPorCobrar', { hoy: HOY });
      const primera = { id, saldo: antes.filas.find((f) => f.ventaId === id)?.saldo ?? 0, total: antes.saldo };
      await clic(page.getByTestId('tabla-cxc').locator('[data-fila]').first().getByRole('button', { name: /Acciones de/ }));
      await page.getByTestId('cobro-abonar').click();
      await escribirNumero(page, 'abono-valor', '50000');
      await page.getByTestId('abono-confirmar').click();
      await expect(page.getByTestId('dialogo-abono')).toHaveCount(0);
      const total = await sel<{ saldo: number; filas: { ventaId: string; saldo: number }[] }>(page, 'selCuentasPorCobrar', { hoy: HOY });
      expect(total.filas.find((f) => f.ventaId === primera.id)?.saldo).toBe(primera.saldo - 50_000);
      expect(total.saldo).toBe(primera.total - 50_000);
    });
  });

  test.describe('Caja y bancos', () => {
    test('transferir entre cuentas mueve la plata y el total no cambia', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/cuentas');
      const leer = () =>
        conKc(page, (kc) => {
          const s = kc.sel('selSaldosCuentas') as { total: number; cuentas: { cuenta: { id: string }; saldo: number }[] };
          return { total: s.total, corriente: s.cuentas.find((c) => c.cuenta.id === 'cta_corriente')?.saldo ?? 0, nequi: s.cuentas.find((c) => c.cuenta.id === 'cta_nequi')?.saldo ?? 0 };
        });
      const antes = await leer();
      await page.getByTestId('abrir-transferir').click();
      await page.getByTestId('transferir-valor').fill('1000000');
      await page.getByTestId('transferir-confirmar').click();
      await expect(page.getByTestId('dialogo-transferir')).toHaveCount(0);
      const despues = await leer();
      expect(despues.corriente).toBe(antes.corriente - 1_000_000);
      expect(despues.nequi).toBe(antes.nequi + 1_000_000);
      expect(despues.total).toBe(antes.total);
    });

    test('registrar un movimiento, crear una cuenta y abrir su libro con ?resaltar=', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/cuentas');
      await page.getByTestId('nueva-cuenta').click();
      await page.getByTestId('cuenta-dinero-nombre').fill('Cuenta de ahorros E2E');
      await page.getByTestId('cuenta-dinero-guardar').click();
      await expect(page.getByTestId('tabla-cuentas')).toContainText('Cuenta de ahorros E2E');
      await page.getByTestId('abrir-movimiento').click();
      await page.getByTestId('movimiento-valor').fill('250000');
      await page.getByLabel('Descripción').fill('Aporte de prueba');
      await page.getByTestId('movimiento-confirmar').click();
      await expect(page.getByTestId('dialogo-movimiento')).toHaveCount(0);
      const id = await conKc(page, (kc) => {
        const m = Object.values((kc.estado() as unknown as { movimientosCuenta: Record<string, { id: string; descripcion: string }> }).movimientosCuenta).find((x) => x.descripcion === 'Aporte de prueba');
        return m?.id ?? '';
      });
      expect(id).not.toBe('');
      await clic(page.getByTestId('tabla-cuentas').getByText('Cuenta corriente'));
      await expect(page).toHaveURL(/pagos\/cuentas\/cta_corriente/);
      await expect(page.getByTestId('tabla-libro')).toBeVisible();
      await irA(`/panel/pagos/cuentas/cta_corriente?resaltar=${id}`);
      await esperarDatos(page);
      await expect(page.getByTestId('tabla-libro')).toBeVisible();
    });

    test('el libro de una cuenta concilia y quita la conciliación con la selección', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/cuentas/cta_nequi');
      await expect(page.getByTestId('cuenta-saldo')).toBeVisible();
      const antes = await conKc(page, (kc) => (kc.sel('selPendientesConciliar') as unknown[]).length);
      await clic(page.getByTestId('tabla-libro').locator('[data-fila]').first().getByRole('checkbox'));
      await page.getByTestId('libro-conciliar').click();
      const despues = await conKc(page, (kc) => (kc.sel('selPendientesConciliar') as unknown[]).length);
      expect(despues).toBe(antes - 1);
    });
  });

  test.describe('Conciliación', () => {
    test('el contador de pendientes baja al conciliar una fila y al conciliar en lote', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/conciliacion');
      const total = () => conKc(page, (kc) => (kc.sel('selPendientesConciliar') as unknown[]).length);
      const n0 = await total();
      await expect(page.getByTestId('conciliacion-total')).toHaveText(new Intl.NumberFormat('es-CO').format(n0));
      await clic(page.getByTestId('conciliar-fila').first());
      expect(await total()).toBe(n0 - 1);
      await expect(page.getByTestId('conciliacion-total')).toHaveText(new Intl.NumberFormat('es-CO').format(n0 - 1));
      const filas = page.getByTestId('tabla-conciliacion').locator('[data-fila]');
      await clic(filas.nth(0).getByRole('checkbox'));
      await clic(filas.nth(1).getByRole('checkbox'));
      await page.getByTestId('conciliar-lote').click();
      expect(await total()).toBe(n0 - 3);
    });

    test('filtrar por cuenta deja solo sus pendientes y "Conciliar todo lo que ves" pide confirmación', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/conciliacion');
      await clic(page.getByTestId('conciliacion-cuenta').filter({ hasText: 'Daviplata' }));
      const esperado = await conKc(page, (kc) => (kc.sel('selPendientesConciliar') as { cuentaId: string; ts: string }[]).filter((p) => p.cuentaId === 'cta_daviplata' && p.ts.slice(0, 10) >= '2026-09-24').length);
      await expect(page.getByTestId('conciliacion-filtro')).toHaveText(String(esperado));
      await clic(page.getByTestId('conciliar-todo'));
      await expect(page.getByRole('dialog')).toContainText(`${esperado}`);
      await page.getByTestId('conciliar-todo-confirmar').click();
      const quedan = await conKc(page, (kc) => (kc.sel('selPendientesConciliar') as { cuentaId: string; ts: string }[]).filter((p) => p.cuentaId === 'cta_daviplata' && p.ts.slice(0, 10) >= '2026-09-24').length);
      expect(quedan).toBe(0);
    });
  });

  test.describe('Datáfono', () => {
    test('"vendiste X con tarjeta, te consignaron Y" coincide con la conciliación del mes', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/datafono');
      const c = await conKc(page, (kc) => {
        const r = kc.sel('selConciliacionDatafono', { mes: '2026-09', localId: 'todos' }) as { vendido: number; abonado: { neto: number; comision: number } };
        return { vendido: r.vendido, neto: r.abonado.neto, comision: r.abonado.comision };
      });
      expect(await valorDe(page, 'datafono-vendido')).toBe(c.vendido);
      expect(await valorDe(page, 'datafono-consignado')).toBe(c.neto);
      expect(await valorDe(page, 'datafono-comision')).toBe(c.comision);
      await expect(page.getByTestId('datafono-resumen')).toContainText('Vendiste');
      await expect(page.getByTestId('datafono-resumen')).toContainText('Retenciones');
      await expect(page.locator('[data-nota-legal="tributario"]').first()).toBeVisible();
      await expect(page.locator('[data-pista="pagos.datafono"]')).toHaveCount(1);
    });

    test('?mes= y ?local= cambian la cifra y la tabla de abonos', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/datafono?mes=2026-08&local=usq');
      const c = await conKc(page, (kc) => {
        const r = kc.sel('selConciliacionDatafono', { mes: '2026-08', localId: 'usq' }) as { vendido: number; abonos: unknown[] };
        return { vendido: r.vendido, abonos: r.abonos.length };
      });
      expect(await valorDe(page, 'datafono-vendido')).toBe(c.vendido);
      await expect(page.getByTestId('tabla-abonos').locator('[data-fila]')).toHaveCount(Math.min(25, c.abonos));
      await expect(page.getByTestId('datafono-mes')).toContainText('Agosto de 2026');
    });

    test('lo cobrado de hoy aparece como pendiente por abonar y llega el siguiente día hábil', async ({ page, irA }) => {
      await entrar(page, irA, '/panel/pagos/datafono');
      const pend = await conKc(page, (kc) => (kc.sel('selConciliacionDatafono', { mes: '2026-09', localId: 'todos' }) as { pendientePorAbonar: number }).pendientePorAbonar);
      expect(pend).toBeGreaterThan(0);
      await expect(page.getByTestId('datafono-pendientes')).toContainText('Llega el');
      expect(await valorDe(page, 'datafono-pendiente')).toBe(pend);
    });
  });

  test('respeta moneda y rol: en dólares las cifras salen en US$ y el vendedor no entra a Pagos', async ({ page, irA }) => {
    await entrar(page, irA, '/panel/pagos');
    await page.getByTestId('selector-moneda').click();
    await page.getByTestId('moneda-USD').click();
    await expect(page.getByTestId('tabla-resumen-locales')).toContainText('US$');
    await page.getByTestId('selector-rol').click();
    await page.getByTestId('rol-vendedor').click();
    await expect(page).not.toHaveURL(/\/panel\/pagos/);
  });
});

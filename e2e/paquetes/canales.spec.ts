import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { conKc, esperarDatos, type KcPagina } from '../kc';

/**
 * D5 · Canales digitales (PLAN 9.4, CONTRATOS §10). Verifica SOLO las cuatro vistas de Canales: las cifras salen de
 * los selectores de `window.__kc` (inventario real, ventas del día) y los efectos en otros módulos (el cliente que
 * crea Instagram, la venta web) se leen por selectores, nunca navegando a pantallas de otros paquetes.
 * Comando: PORT=4335 npx playwright test e2e/paquetes/canales.spec.ts --project=escritorio-1440 \
 *   --project=escritorio-1366 --project=escritorio-1280 --workers=1
 */
const HOY = '2026-09-30';
const ETIQUETA = 'Vista previa de lo que KippiCore puede construir para HALDEN';

function vigilar(page: Page): string[] {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(`${page.url()}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`${page.url()}: ${m.text()}`);
  });
  return errores;
}

/** Las existencias reales de la camisa crítica (Oxford entallada) en una talla y un color, por local que vende. */
async function existenciasOxford(page: Page, talla: string, color: string) {
  return page.evaluate(
    ([t, c, hoy]) => {
      const kc = (globalThis as unknown as { __kc: KcPagina }).__kc;
      const n = kc.sel('selNarrativa', { hoy }) as { productoCritico: string };
      const m = kc.sel('selMatrizExistencias', { productoId: n.productoCritico }) as {
        colores: { id: string; nombre: string }[];
        locales: { id: string; nombre: string; vende: boolean }[];
        celdas: Record<string, Record<string, number>>;
      };
      const col = m.colores.find((x) => x.nombre.toLowerCase() === c);
      const celda = (col && m.celdas[`${t}|${col.id}`]) || {};
      return {
        precio: kc.estado().productos[n.productoCritico]?.precioVenta ?? 0,
        filas: m.locales
          .filter((l) => l.vende)
          .map((l) => ({ id: l.id, nombre: l.nombre, n: celda[l.id] ?? 0 })),
      };
    },
    [talla, color, HOY] as const,
  );
}

function frase(filas: { nombre: string; n: number }[]): string {
  const f = filas
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre, 'es'))
    .map((x) => `${x.nombre} (${x.n})`);
  return f.length > 1 ? `${f.slice(0, -1).join(', ')} y ${f[f.length - 1]}` : (f[0] ?? '');
}

async function completar(page: Page, timeout = 60_000) {
  await expect(page.getByTestId('canales-fase')).toHaveAttribute('data-fase', 'completo', { timeout });
}

async function rapida(page: Page) {
  await page.getByTestId('canales-velocidad-rapida').click();
}

const eventosUI = (page: Page) => conKc(page, (kc) => kc.eventosUI());

test.describe('etiqueta de vitrina y navegación', () => {
  test('las cuatro vistas llevan la etiqueta con la marca y las pestañas de canales', async ({
    page,
    irA,
  }) => {
    const errores = vigilar(page);
    for (const ruta of [
      '/panel/canales',
      '/panel/canales/whatsapp',
      '/panel/canales/instagram',
      '/panel/canales/web',
    ]) {
      await irA(ruta);
      await esperarDatos(page);
      await expect(page.getByTestId('pagina')).toBeVisible();
      await expect(page.getByTestId('canales-etiqueta-vitrina').first()).toHaveText(ETIQUETA);
      await expect(page.getByRole('link', { name: 'WhatsApp', exact: true })).toBeVisible();
    }
    expect(errores).toEqual([]);
  });

  test('el resumen muestra una vista previa real de cada canal y enlaza a su demostración', async ({
    page,
    irA,
  }) => {
    const errores = vigilar(page);
    await irA('/panel/canales');
    await esperarDatos(page);
    await expect(page.getByTestId('canales-tarjetas').getByRole('heading', { level: 2 })).toHaveCount(3);
    // La vista previa de WhatsApp es la respuesta real del bot: trae las existencias de la camisa.
    const e = await existenciasOxford(page, 'M', 'azul cielo');
    await expect(page.getByTestId('canales-tarjeta-whatsapp')).toContainText(frase(e.filas));
    await page.getByTestId('canales-ver-whatsapp').click();
    await expect(page).toHaveURL(/\/panel\/canales\/whatsapp\?escenario=consulta-talla/);
    expect(errores).toEqual([]);
  });
});

test.describe('WhatsApp', () => {
  test('consulta de talla: responde con el inventario real por local y pasa a Valentina', async ({
    page,
    irA,
  }) => {
    const errores = vigilar(page);
    await irA('/panel/canales/whatsapp?escenario=consulta-talla');
    await esperarDatos(page);
    await expect(page.locator('[data-pista="canales.escenarios"]')).toHaveCount(1);
    await expect(page.getByTestId('escenario-consulta-talla')).toHaveAttribute('aria-checked', 'true');
    // Mientras el bot "piensa" el teléfono dice "escribiendo…" y el cerebro enciende sus nodos.
    await expect(page.getByTestId('canales-escribiendo')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('canales-estado-chat')).toHaveText('escribiendo…');
    await rapida(page);
    await completar(page);

    const e = await existenciasOxford(page, 'M', 'azul cielo');
    const bots = page.getByTestId('canales-mensaje-bot');
    await expect(bots.first()).toContainText(
      'Hola, Andrés. Sí: la Camisa Oxford entallada azul cielo en talla M está disponible en ',
    );
    await expect(bots.first()).toContainText(frase(e.filas));
    await expect(bots.first()).toContainText('¿Te la separo en alguno?');
    await expect(bots.last()).toContainText('Te paso con Valentina, ella te la separa');
    await expect(page.getByTestId('canales-mensaje-sistema').last()).toContainText(
      'Valentina Gómez tomó la conversación',
    );
    // Cada mensaje trae su hora y los del cliente, el doble check.
    await expect(page.getByTestId('canales-mensaje-cliente').first()).toContainText(
      /\d{1,2}:\d{2} [ap]\. m\./,
    );
    await expect(page.getByTestId('canales-mensaje-cliente').first().getByLabel('Leído')).toBeVisible();

    // El cerebro dejó a la vista la consulta con las mismas cifras por local y la regla que se activó.
    for (const f of e.filas) {
      const fila = page
        .getByTestId('canales-consulta-local')
        .filter({ has: page.locator(`[data-local="${f.id}"]`) });
      if (f.n > 0)
        await expect(
          page.locator(`[data-testid="canales-consulta-local"][data-local="${f.id}"]`),
        ).toContainText(String(f.n));
      else await expect(fila).toHaveCount(0);
    }
    await expect(page.locator('[data-regla="separar"]')).toHaveAttribute('data-activa', 'true');
    // Honra ?escenario= y emite el evento al terminar.
    const ev = await eventosUI(page);
    expect(
      ev.filter((x) => x.tipo === 'whatsapp_escenario_completado').map((x) => x.datos.escenario),
    ).toContain('consulta-talla');
    expect(errores).toEqual([]);
  });

  test('los seis escenarios se reproducen hasta el final y cada uno emite su evento', async ({
    page,
    irA,
  }) => {
    test.setTimeout(240_000);
    const errores = vigilar(page);
    await irA('/panel/canales/whatsapp');
    await esperarDatos(page);
    await rapida(page);
    const ids = [
      'consulta-talla',
      'separado-saldo',
      'nueva-coleccion',
      'cumpleanos',
      'resumen-dueno',
      'paso-persona',
    ];
    for (const id of ids) {
      await page.getByTestId(`escenario-${id}`).click();
      await expect(page).toHaveURL(new RegExp(`escenario=${id}`));
      // Al elegir otro escenario el teléfono se vacía y vuelve a empezar.
      if (id !== ids[0])
        await expect(page.getByTestId('canales-fase')).toHaveAttribute('data-fase', 'jugando');
      await completar(page);
      expect(await page.getByTestId('canales-mensaje-bot').count(), id).toBeGreaterThan(0);
    }
    const ev = await eventosUI(page);
    const hechos = ev.filter((x) => x.tipo === 'whatsapp_escenario_completado').map((x) => x.datos.escenario);
    for (const id of ids) expect(hechos, id).toContain(id);
    expect(errores).toEqual([]);
  });

  test('resumen al dueño: "Ventas de hoy" con la cifra real del día', async ({ page, irA }) => {
    await irA('/panel/canales/whatsapp?escenario=resumen-dueno');
    await esperarDatos(page);
    await rapida(page);
    await completar(page);
    const real = await conKc(page, (kc) => {
      const r = kc.sel('selVentasHoyHastaHora', {
        hoy: '2026-09-30',
        ahora: '2026-09-30T15:30:00',
        localId: 'todos',
      }) as { hoy: { netas: number; numVentas: number } };
      return { netas: r.hoy.netas, n: r.hoy.numVentas };
    });
    const primero = await page.getByTestId('canales-mensaje-bot').first().innerText();
    const cifra = primero.match(/Ventas de hoy: \$\s*([\d.]+)/i);
    expect(cifra, primero).not.toBeNull();
    expect(Number(cifra![1]!.replace(/\./g, ''))).toBe(real.netas);
    expect(primero).toContain(`${real.n} ventas`);
  });

  test('separado y saldo usa el saldo real del separado', async ({ page, irA }) => {
    await irA('/panel/canales/whatsapp?escenario=separado-saldo');
    await esperarDatos(page);
    await rapida(page);
    await completar(page);
    const s = await conKc(page, (kc) => {
      const r = kc.sel('selCuentasPorCobrar', { hoy: '2026-09-30', filtro: 'separados-por-vencer' }) as {
        filas: { numeroVenta: string; saldo: number }[];
      };
      return r.filas[0] ?? null;
    });
    expect(s).not.toBeNull();
    const texto = await page.getByTestId('canales-mensajes').innerText();
    expect(texto).toContain(s!.numeroVenta);
    expect(texto.replace(/\./g, '')).toContain(String(s!.saldo));
  });

  test('texto libre: producto, color con sinónimos y talla, precio, descuento y respuesta amable', async ({
    page,
    irA,
  }) => {
    const errores = vigilar(page);
    await irA('/panel/canales/whatsapp?escenario=libre');
    await esperarDatos(page);
    await rapida(page);
    await expect(page.getByTestId('canales-entrada')).toBeEnabled();
    const escribir = async (t: string) => {
      await page.getByTestId('canales-entrada').fill(t);
      await page.getByTestId('canales-enviar').click();
    };
    const e = await existenciasOxford(page, 'L', 'azul cielo');
    await escribir('Hola, ¿tienen la Oxford celeste en talla L?');
    await expect(page.getByTestId('canales-mensaje-bot').last()).toContainText('talla L', {
      timeout: 20_000,
    });
    const respuesta = await page.getByTestId('canales-mensaje-bot').last().innerText();
    if (frase(e.filas)) expect(respuesta).toContain(frase(e.filas));
    else expect(respuesta).toContain('agotada');
    // Precio sin negociar.
    await expect(page.getByTestId('canales-entrada')).toBeEnabled();
    await escribir('¿me hacen un descuento?');
    await expect(page.getByTestId('canales-mensaje-bot').last()).toContainText('no los negocio', {
      timeout: 20_000,
    });
    await expect(page.getByTestId('canales-mensaje-sistema').last()).toContainText('tomó la conversación');
    const ev = await eventosUI(page);
    expect(ev.filter((x) => x.tipo === 'whatsapp_respondido').length).toBe(2);
    expect(errores).toEqual([]);
  });

  test('texto libre: no entiende y responde con amabilidad, de tú o de usted según el cliente', async ({
    page,
    irA,
  }) => {
    await irA('/panel/canales/whatsapp?escenario=libre');
    await esperarDatos(page);
    await rapida(page);
    await page.getByTestId('canales-entrada').fill('asdf qwer');
    await page.getByTestId('canales-enviar').click();
    await expect(page.getByTestId('canales-mensaje-bot').last()).toContainText(
      '¿Me dices la talla y el color que buscas?',
      { timeout: 20_000 },
    );
    await page.getByTestId('canales-trato-usted').click();
    await expect(page.getByTestId('canales-contacto')).toBeVisible();
    await page.getByTestId('canales-entrada').fill('asdf qwer');
    await page.getByTestId('canales-enviar').click();
    await expect(page.getByTestId('canales-mensaje-bot').last()).toContainText(
      '¿Me dice la talla y el color que busca?',
      { timeout: 20_000 },
    );
    await expect(page.getByTestId('canales-mensaje-bot').last()).toContainText('Ricardo');
  });
});

test.describe('Instagram', () => {
  test('"precio?" en comentarios, catálogo por mensaje directo y creación del cliente en el CRM', async ({
    page,
    irA,
  }) => {
    test.setTimeout(120_000);
    const errores = vigilar(page);
    await irA('/panel/canales/instagram');
    await esperarDatos(page);
    await rapida(page);
    await completar(page);
    // Comentario público y respuesta automática.
    await page.getByTestId('canales-vista-comentarios').click();
    await expect(page.getByTestId('canales-comentario')).toHaveCount(1);
    await expect(page.getByTestId('canales-comentario')).toContainText('precio?');
    await expect(page.getByTestId('canales-comentario-bot')).toContainText('mensaje directo');
    // Catálogo por mensaje directo.
    await page.getByTestId('canales-vista-mensajes').click();
    await expect(page.getByTestId('canales-tarjeta-producto').first()).toBeVisible();
    // El cliente quedó creado de verdad, con origen Instagram.
    const clientes = await conKc(page, (kc) => {
      const f = kc.sel('selClientes', { hoy: '2026-09-30', texto: '3117400123' }) as {
        cliente: { nombres: string; apellidos: string; canalAlta: string; celular: string };
      }[];
      return f.map((x) => ({
        n: x.cliente.nombres + ' ' + x.cliente.apellidos,
        canal: x.cliente.canalAlta,
        cel: x.cliente.celular,
      }));
    });
    expect(clientes).toEqual([{ n: 'Camilo Rojas', canal: 'instagram', cel: '3117400123' }]);
    await expect(page.getByTestId('canales-enlace-ficha')).toBeVisible();
    const dominio = await conKc(
      page,
      (kc) => kc.eventosDominio().filter((e) => e.tipo === 'ClienteCreado').length,
    );
    expect(dominio).toBeGreaterThanOrEqual(1);

    // Repetir el escenario no duplica al cliente: el bot avisa que ya estaba.
    await page.getByTestId('canales-repetir').click();
    await expect(page.getByTestId('canales-fase')).toHaveAttribute('data-fase', 'jugando');
    await completar(page);
    await expect(page.getByTestId('canales-mensaje-sistema').last()).toContainText('ya estaba en el CRM');
    const total = await conKc(
      page,
      (kc) => (kc.sel('selClientes', { hoy: '2026-09-30', texto: '3117400123' }) as unknown[]).length,
    );
    expect(total).toBe(1);
    expect(errores).toEqual([]);
  });

  test('catálogo por mensaje directo: el cliente que deja su contacto queda en el CRM', async ({
    page,
    irA,
  }) => {
    await irA('/panel/canales/instagram');
    await esperarDatos(page);
    await rapida(page);
    await page.getByTestId('escenario-catalogo-dm').click();
    await completar(page);
    const n = await conKc(
      page,
      (kc) => (kc.sel('selClientes', { hoy: '2026-09-30', texto: '3105551420' }) as unknown[]).length,
    );
    expect(n).toBe(1);
  });

  test('?escenario= abre ese escenario de Instagram y elegir otro lo refleja en la URL', async ({ page, irA }) => {
    await irA('/panel/canales/instagram?escenario=catalogo-dm');
    await esperarDatos(page);
    await expect(page.getByTestId('escenario-catalogo-dm')).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('escenario-precio-comentario').click();
    await expect(page).toHaveURL(/\/panel\/canales\/instagram\?escenario=precio-comentario/);
    await expect(page.getByTestId('escenario-precio-comentario')).toHaveAttribute('aria-checked', 'true');
  });
});

test.describe('Página web', () => {
  test('marcos de escritorio y de celular con la tienda y la etiqueta', async ({ page, irA }) => {
    const errores = vigilar(page);
    await irA('/panel/canales/web');
    await esperarDatos(page);
    await expect(page.getByTestId('canales-marco-escritorio')).toBeVisible();
    await expect(page.getByTestId('canales-marco-celular')).toBeVisible();
    await expect(
      page.getByTestId('canales-marco-escritorio').getByTestId('canales-etiqueta-vitrina'),
    ).toHaveText(ETIQUETA);
    await expect(page.locator('iframe[src="/tienda?marco=1"]')).toHaveCount(2);
    await page.getByTestId('canales-web-celular').click();
    await expect(page.getByTestId('canales-marco-escritorio')).toHaveCount(0);
    await page.getByTestId('canales-web-escritorio').click();
    await expect(page.getByTestId('canales-marco-celular')).toHaveCount(0);
    await expect(page.locator('iframe[src="/tienda?marco=1"]')).toHaveCount(1);
    expect(errores).toEqual([]);
  });

  test('una compra web aparece como venta del canal Web y sube los pedidos de la vista', async ({
    page,
    irA,
  }) => {
    await irA('/panel/canales/web');
    await esperarDatos(page);
    const antes = await conKc(
      page,
      (kc) =>
        (
          kc.sel('selVentas', { desde: '2026-09-01', hasta: '2026-09-30', canal: 'web' }) as {
            totales: { numVentas: number };
          }
        ).totales.numVentas,
    );
    await conKc(page, (kc) => {
      const e = kc.estado();
      const v = Object.values(e.variantes).find((x) => (e.agregados.existencias[x.id + '@p93'] || 0) > 2)!;
      const p = e.productos[v.productoId]!;
      const registrar = kc.acciones.registrarVenta!;
      const r = registrar({
        ts: null,
        localId: 'p93',
        vendedorId: 'em_scardenas',
        canal: 'web',
        tipo: 'contado',
        clienteId: null,
        clienteNuevo: null,
        lineas: [{ varianteId: v.id, cantidad: 1, precioLista: null, descuento: null }],
        descuentoGlobal: null,
        aprobacionDescuentoId: null,
        pagos: [
          {
            medio: 'nequi',
            valor: p.precioVenta,
            recibido: null,
            referencia: 'WEB-PRUEBA',
            sesionCajaId: null,
            bonoId: null,
          },
        ],
        fechaLimiteSeparado: null,
        ventaOrigenCambioId: null,
        facturaInmediata: null,
        nota: 'Compra web de prueba (e2e)',
      });
      if (!r.ok) throw new Error(r.error ? r.error.mensaje : 'no se registró');
      return true;
    });
    const despues = await conKc(
      page,
      (kc) =>
        (
          kc.sel('selVentas', { desde: '2026-09-01', hasta: '2026-09-30', canal: 'web' }) as {
            totales: { numVentas: number };
          }
        ).totales.numVentas,
    );
    expect(despues).toBe(antes + 1);
    await expect(page.getByTestId('canales-web-indicadores')).toContainText(`${despues} pedidos`);
  });
});

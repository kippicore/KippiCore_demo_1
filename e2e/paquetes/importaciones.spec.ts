import type { Page } from '@playwright/test';
import { conHoy, expect, test } from '../fixtures';
import { conKc, esperarDatos } from '../kc';

/**
 * B1 · Importaciones, portal de seguimiento y Sugerir pedido (PLAN 9.4, W3, W4, W12). Verifica solo las pantallas de
 * B1: los efectos en otros módulos se leen con `window.__kc` (selectores), nunca navegando a pantallas ajenas.
 * PORT=4311 npx playwright test e2e/paquetes/importaciones.spec.ts --project=escritorio-1440 --project=escritorio-1366 --project=escritorio-1280 --workers=1
 */
/** Escucha errores de consola y de página (criterio de salida: sin errores). */
function vigilarConsola(page: Page): string[] {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`console: ${m.text()}`);
  });
  return errores;
}

interface Narrativa {
  enPuerto: string;
  retrasada: string;
  enTransito: string;
  enProduccion: string;
  proveedor: string;
}

/** Números de las importaciones del guion de HOY, resueltos por selector (nunca escritos a mano). */
async function narrativa(page: Page): Promise<Narrativa> {
  return conKc(page, (kc) => {
    const e = kc.estado() as unknown as { importaciones: Record<string, { numero: string }> };
    const n = kc.sel('selNarrativa', { hoy: '2026-09-30' }) as Record<string, string>;
    return {
      enPuerto: e.importaciones[n.importacionEnPuerto ?? '']?.numero ?? '',
      retrasada: e.importaciones[n.importacionRetrasada ?? '']?.numero ?? '',
      enTransito: e.importaciones[n.importacionEnTransito ?? '']?.numero ?? '',
      enProduccion: e.importaciones[n.importacionEnProduccion ?? '']?.numero ?? '',
      proveedor: n.proveedorSugerencia ?? '',
    };
  });
}

async function irADueno(page: Page, ruta: string): Promise<void> {
  await page.goto(conHoy(ruta));
  await esperarDatos(page);
}

test.describe('Importaciones (dueño)', () => {
  test('tablero por estado, lista y ruta con sus parámetros', async ({ page }) => {
    const errores = vigilarConsola(page);
    await irADueno(page, '/panel/importaciones');
    const n = await narrativa(page);
    await expect(page.getByTestId('pagina')).toBeVisible();
    await expect(page.getByTestId('kpis-importaciones')).toBeVisible();
    await expect(page.getByTestId('tablero-importaciones')).toBeVisible();
    // Las cuatro importaciones en curso están en el tablero, cada una en su fase.
    for (const num of [n.enPuerto, n.retrasada, n.enTransito, n.enProduccion])
      await expect(page.getByTestId(`tarjeta-${num}`)).toBeVisible();
    await expect(
      page.locator('section[aria-label="Aduana"]').getByTestId(`tarjeta-${n.retrasada}`),
    ).toBeVisible();
    await expect(
      page.locator('section[aria-label="Fábrica"]').getByTestId(`tarjeta-${n.enProduccion}`),
    ).toBeVisible();
    await expect(page.getByText('Retraso de 6 días').first()).toBeVisible();

    await page.getByTestId('vista-lista').click();
    await expect(page).toHaveURL(/vista=lista/);
    await expect(page.getByTestId('lista-importaciones')).toBeVisible();
    await expect(page.getByTestId('lista-importaciones').getByText(n.enPuerto).first()).toBeVisible();

    await page.getByTestId('vista-ruta').click();
    await expect(page.getByTestId('ruta-china')).toBeVisible();
    await expect(page.getByTestId(`barco-${n.enTransito}`)).toHaveAttribute('data-tramo', 'mar');
    await expect(page.getByTestId(`barco-${n.enPuerto}`)).toHaveAttribute('data-tramo', 'puerto');
    await expect(page.getByTestId(`barco-${n.enProduccion}`)).toHaveAttribute('data-tramo', 'fabrica');

    // ?vista= se honra al cargar.
    await irADueno(page, '/panel/importaciones?vista=lista');
    await expect(page.getByTestId('lista-importaciones')).toBeVisible();
    // ?resaltar=<numero> destaca la fila.
    await irADueno(page, `/panel/importaciones?vista=lista&resaltar=${n.enPuerto}`);
    await expect(page.locator('[data-resaltada="true"], tr[data-resaltada]').first()).toBeAttached();
    expect(errores).toEqual([]);
  });

  test('arrastrar un pedido a otra fase abre "Cambiar estado" y luego "Notificar a" (W3)', async ({
    page,
  }) => {
    await irADueno(page, '/panel/importaciones');
    const n = await narrativa(page);
    const tarjeta = page.getByTestId(`tarjeta-${n.enProduccion}`);
    const destino = page.locator('section[aria-label="Viaje"]');
    const a = await tarjeta.boundingBox();
    const b = await destino.boundingBox();
    if (!a || !b) throw new Error('sin cajas');
    await page.mouse.move(a.x + 10, a.y + 10);
    await page.mouse.down();
    await page.mouse.move(a.x + 30, a.y + 30, { steps: 5 });
    await page.mouse.move(b.x + 30, b.y + 60, { steps: 15 });
    await page.mouse.up();
    await expect(page.getByTestId('dialogo-cambiar-estado')).toBeVisible();
    await expect(page.getByTestId('select-estado')).toContainText('Embarcado');
    await page.getByTestId('guardar-estado').click();
    await expect(page.getByTestId('panel-notificar')).toBeVisible();
    await expect(page.getByTestId('aviso-agente_aduanas')).toBeVisible();
  });

  test('W3: cambiar el estado abre "Notificar a" con los destinatarios de la matriz, en usted, y deja la bandeja de salida', async ({
    page,
  }) => {
    const errores = vigilarConsola(page);
    await irADueno(page, '/panel/importaciones');
    const n = await narrativa(page);
    await irADueno(page, `/panel/importaciones/${n.enPuerto}?resaltar=cambiar-estado`);
    await expect(page.getByTestId('cambiar-estado')).toBeVisible();
    await expect(page.getByTestId('pista-importaciones.estado')).toBeVisible();
    await page.getByTestId('cambiar-estado').click();
    await expect(page.getByTestId('select-estado')).toContainText('En proceso de nacionalización');
    await expect(page.getByTestId('quien-recibe')).toContainText('Óscar Rincón');
    await page.getByTestId('guardar-estado').click();

    const panel = page.getByTestId('panel-notificar');
    await expect(panel).toBeVisible();
    // Destinatarios correctos: transportador, bodega y agente de aduanas; la fábrica NO recibe aviso de nacionalización.
    await expect(page.getByTestId('aviso-transportador')).toBeVisible();
    await expect(page.getByTestId('aviso-bodega')).toBeVisible();
    await expect(page.getByTestId('aviso-agente_aduanas')).toBeVisible();
    await expect(page.getByTestId('aviso-fabrica')).toHaveCount(0);
    const texto = page.getByTestId('texto-transportador');
    await expect(texto).toHaveValue(/Óscar, buenas (tardes|días|noches)\./);
    await expect(texto).toHaveValue(/entró hoy, 30\/09\/2026, a nacionalización/);
    // Enlaces reales sin destinatario y con el sufijo de prueba.
    const wa = await page.getByTestId('aviso-transportador-whatsapp').getAttribute('href');
    expect(wa).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(wa ?? '')).toContain('(mensaje de prueba desde la demo de KippiCore)');
    const correo = await page.getByTestId('aviso-transportador-correo').getAttribute('href');
    expect(correo).toMatch(/^mailto:\?subject=/);

    await page.getByTestId('enviar-avisos').click();
    await expect(panel).toBeHidden();
    const enviados = await conKc(page, (kc) => {
      const e = kc.estado() as unknown as {
        mensajes: {
          origen: { tipo: string };
          estado: string;
          idioma: string;
          destinatario: { nombre: string };
        }[];
      };
      return e.mensajes
        .filter((m) => m.origen.tipo === 'importacion')
        .slice(-3)
        .map((m) => ({ estado: m.estado, idioma: m.idioma, para: m.destinatario.nombre }));
    });
    expect(enviados).toHaveLength(3);
    expect(enviados.every((m) => m.estado === 'enviado_simulado' && m.idioma === 'es')).toBe(true);

    // La bandeja de salida los muestra como "Enviado (simulación)".
    await page.getByRole('link', { name: /^Mensajes/ }).click();
    await expect(page.getByTestId('bandeja-salida')).toContainText('Enviado (simulación)');
    await expect(page.getByTestId('bandeja-salida').getByText('Wilson Díaz Forero')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('W3: a la fábrica se le escribe en inglés cuando le toca actuar (saldo pagado) y se copia para WeChat', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined);
    await irADueno(page, '/panel/importaciones');
    const n = await narrativa(page);
    await irADueno(page, `/panel/importaciones/${n.enProduccion}`);
    await page.getByTestId('cambiar-estado').click();
    await page.getByTestId('select-estado').click();
    await page.getByRole('option', { name: /Saldo pagado/ }).click();
    await page.getByTestId('guardar-estado').click();
    await expect(page.getByTestId('aviso-fabrica')).toBeVisible();
    await expect(page.getByTestId('texto-fabrica')).toHaveValue(
      /Please release the cargo and send the BL and packing list/,
    );
    await expect(page.getByTestId('aviso-fabrica-wechat')).toBeVisible();
    await page.getByTestId('aviso-fabrica-wechat').click();
    await expect(page.getByText(/Mensaje copiado|No pudimos copiarlo/).first()).toBeVisible();
  });

  test('línea de tiempo con estimado vs real, retraso y diagrama de ruta con el barco en su lugar', async ({
    page,
  }) => {
    await irADueno(page, '/panel/importaciones');
    const n = await narrativa(page);
    await irADueno(page, `/panel/importaciones/${n.retrasada}`);
    await expect(page.getByTestId('card-linea-tiempo')).toContainText('Estimada');
    await expect(page.getByTestId('card-linea-tiempo')).toContainText('Real');
    await expect(page.getByTestId('card-linea-tiempo')).toContainText('Retraso de 6 días');
    await expect(page.getByTestId('card-linea-tiempo')).toContainText('Nacionalizado (levante)');
    await expect(page.getByTestId('card-linea-tiempo')).toContainText('Aforo físico');
    await expect(page.getByTestId(`barco-${n.retrasada}`)).toHaveAttribute('data-tramo', 'puerto');
    await expect(page.getByTestId('card-siguiente')).toContainText('Lo reporta');
  });

  test('W4: el simulador mueve el costo, aplica al inventario y sugiere el precio', async ({ page }) => {
    const errores = vigilarConsola(page);
    await irADueno(page, '/panel/importaciones');
    const n = await narrativa(page);
    await irADueno(page, `/panel/importaciones/${n.enPuerto}/costo-aterrizado`);
    await expect(page.getByTestId('calculadora-costo')).toContainText(
      'Costo de reposición: última importación aplicada',
    );
    await expect(page.getByTestId('calculadora-costo')).toContainText('Valor de ejemplo');
    await expect(page.getByTestId('cascada-costo')).toBeVisible();
    const costoInicial = await page.getByTestId('costo-prenda-activa').innerText();

    await page.getByTestId('simulador-tasa').fill('10');
    await expect(page.getByTestId('simulador-valor')).toHaveText(/\+10 %/);
    await expect.poll(async () => page.getByTestId('costo-prenda-activa').innerText()).not.toBe(costoInicial);
    await expect(page.getByTestId('precio-sugerido')).toBeVisible();
    await expect(page.getByTestId('precio-sugerido')).toContainText('Para mantener tu');
    await expect(page.getByTestId('precio-sugerido')).toContainText('900');

    await page.getByTestId('aplicar-inventario').click();
    await expect(page.getByTestId('resumen-margenes')).toContainText('Margen promedio de camisas');
    await expect(page.getByTestId('resumen-margenes')).toContainText('→');
    const antesCosto = await conKc(page, (kc) => {
      const e = kc.estado() as unknown as {
        productos: Record<string, { referencia: string; costoVigente: number }>;
      };
      return Object.values(e.productos).find((p) => p.referencia === 'HL-CAM-0142')?.costoVigente ?? 0;
    });
    await page.getByTestId('confirmar-aplicar').click();
    await expect(page.getByTestId('costos-aplicados')).toBeVisible();
    const despuesCosto = await conKc(page, (kc) => {
      const e = kc.estado() as unknown as {
        productos: Record<string, { referencia: string; costoVigente: number }>;
      };
      return Object.values(e.productos).find((p) => p.referencia === 'HL-CAM-0142')?.costoVigente ?? 0;
    });
    expect(despuesCosto).not.toBe(antesCosto);
    const eventos = await conKc(page, (kc) => kc.eventosDominio().map((x) => x.tipo));
    expect(eventos).toContain('CostosAplicados');

    // "Aplicar a la referencia" cambia el precio de venta.
    await page.getByTestId('aplicar-precio').click();
    const precio = await conKc(page, (kc) => {
      const e = kc.estado() as unknown as {
        productos: Record<string, { referencia: string; precioVenta: number }>;
      };
      return Object.values(e.productos).find((p) => p.referencia === 'HL-CAM-0142')?.precioVenta ?? 0;
    });
    expect(precio % 1000).toBe(900);
    expect(errores).toEqual([]);
  });

  test('W4: el interruptor "IVA descontable" y los parámetros se guardan y cambian el total', async ({
    page,
  }) => {
    await irADueno(page, '/panel/importaciones');
    const n = await narrativa(page);
    await irADueno(page, `/panel/importaciones/${n.enPuerto}/costo-aterrizado`);
    const total = () => page.getByTestId('kpis-costo').innerText();
    const antes = await total();
    await page.getByRole('switch', { name: /IVA descontable/ }).click();
    await expect.poll(total).not.toBe(antes);
    await page.getByTestId('editar-parametros').click();
    await expect(page.getByTestId('dialogo-parametros')).toBeVisible();
    await expect(page.getByTestId('preview-promedio')).toContainText('Costo promedio por prenda');
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByTestId('dialogo-parametros')).toBeHidden();
  });

  test('pagos: registrar un pago a la fábrica con su tasa del día y diferencia en cambio', async ({
    page,
  }) => {
    await irADueno(page, '/panel/importaciones');
    const n = await narrativa(page);
    await irADueno(page, `/panel/importaciones/${n.enProduccion}/pagos`);
    await expect(page.getByTestId('tab-pagos')).toContainText('Saldo');
    const botones = page.locator('[data-testid^="pagar-"]');
    await botones.first().click();
    await expect(page.getByTestId('dialogo-pago')).toBeVisible();
    await page.getByTestId('monto-pago').fill('1000');
    await expect(page.getByTestId('preview-pago')).toContainText('Equivale a');
    await page.getByTestId('confirmar-pago').click();
    await expect(page.getByTestId('dialogo-pago')).toBeHidden();
    await expect(page.getByTestId('tab-pagos').locator('table').first()).toBeVisible();
  });

  test('crear un pedido nuevo: fábrica, prendas y cadena; queda en Cotizado', async ({ page }) => {
    const errores = vigilarConsola(page);
    await irADueno(page, '/panel/importaciones/nueva');
    await page.getByTestId('select-fabrica').click();
    await page.getByRole('option').first().click();
    await page.getByTestId('paso-siguiente').click();
    await page.getByRole('button', { name: 'Agregar referencia' }).click();
    await page.getByRole('combobox', { name: 'Referencia' }).click();
    await page.getByRole('option').first().click();
    await page.locator('[data-testid="linea-0"] input').nth(1).fill('2');
    await page.getByTestId('paso-siguiente').click();
    await expect(page.getByTestId('resumen-pedido')).toBeVisible();
    await page.getByTestId('guardar-pedido').click();
    await expect(page).toHaveURL(/\/panel\/importaciones\/IMP-/);
    await expect(page.getByText('Cotizado').first()).toBeVisible();
    const numero = /IMP-\d{4}-\d{2}/.exec(page.url())?.[0] ?? '';
    const estado = await conKc(page, (kc) => {
      const e = kc.estado() as unknown as {
        importaciones: Record<string, { numero: string; estado: string }>;
      };
      return Object.values(e.importaciones).map((i) => `${i.numero}:${i.estado}`);
    });
    expect(estado).toContain(`${numero}:cotizado`);
    expect(errores).toEqual([]);
  });

  test('contactos de la cadena: crear, editar y eliminar con confirmación', async ({ page }) => {
    await irADueno(page, '/panel/importaciones/contactos');
    await expect(page.getByTestId('tabla-contactos')).toContainText('Carolina Mejía');
    await page.getByTestId('nuevo-contacto').click();
    await page.getByTestId('contacto-nombre').fill('Mónica Rey');
    await page.getByLabel('Empresa').fill('Cordillera Carga Internacional S.A.S.');
    await page.getByLabel('WhatsApp').fill('+57 311 555 0199');
    await page.getByLabel('Correo').fill('monica.rey@cordillera.example');
    await page.getByTestId('guardar-contacto').click();
    await expect(page.getByTestId('tabla-contactos')).toContainText('Mónica Rey');
    // Editar.
    await page.getByTestId('tabla-contactos').getByText('Mónica Rey').click();
    await page.getByTestId('contacto-nombre').fill('Mónica Rey Soto');
    await page.getByTestId('guardar-contacto').click();
    await expect(page.getByTestId('tabla-contactos')).toContainText('Mónica Rey Soto');
    // Eliminar con confirmación.
    await page.getByRole('button', { name: 'Acciones de Mónica Rey Soto' }).click();
    await page.getByRole('menuitem', { name: 'Eliminar' }).click();
    await expect(page.getByText('¿Eliminar a Mónica Rey Soto?')).toBeVisible();
    await page.getByRole('button', { name: 'Eliminar contacto' }).click();
    await expect(page.getByTestId('tabla-contactos')).not.toContainText('Mónica Rey Soto');
  });

  test('documentos: registrar un documento simulado', async ({ page }) => {
    await irADueno(page, '/panel/importaciones');
    const n = await narrativa(page);
    await irADueno(page, `/panel/importaciones/${n.enPuerto}/documentos`);
    await expect(page.getByTestId('tab-documentos')).toContainText('Proforma');
    await page.getByTestId('doc-declaracion_importacion').click();
    await page.getByLabel('Número del documento').fill('DI-2026-0001');
    await page.getByRole('button', { name: 'Guardar documento' }).click();
    await expect(page.getByTestId('tab-documentos')).toContainText('DI-2026-0001');
  });
});

test.describe('Sugerir pedido (W12)', () => {
  test('cantidades por talla y color, totales en US$ y COP, crear pedido en Cotizado y borrador en inglés', async ({
    page,
  }) => {
    const errores = vigilarConsola(page);
    await irADueno(page, '/panel/importaciones');
    const n = await narrativa(page);
    await irADueno(
      page,
      `/panel/importaciones/sugerir?proveedor=${n.proveedor}&cobertura=120&desde=analisis`,
    );
    await expect(page.getByTestId('tabla-sugerida')).toBeVisible();
    await expect(page.getByTestId('pista-importaciones.sugerir')).toBeVisible();
    // Evento de interfaz al mostrar la sugerencia calculada.
    const ui = await conKc(page, (kc) => kc.eventosUI());
    expect(ui.some((e) => e.tipo === 'pedido_sugerido_visto' && e.datos.proveedorId === n.proveedor)).toBe(
      true,
    );
    await expect(page.getByTestId('costo-estimado')).toContainText('US$');
    await expect(page.getByTestId('margen-esperado')).toContainText('%');
    // Coincide con el selector.
    const sugerido = await conKc(page, (kc) => {
      const prov = (kc.sel('selNarrativa', { hoy: '2026-09-30' }) as Record<string, string>)
        .proveedorSugerencia;
      return (
        kc.sel('selSugerenciaPedido', { proveedorId: prov, coberturaDias: 120, hoy: '2026-09-30' }) as {
          unidades: number;
        }
      ).unidades;
    });
    await expect(page.getByTestId('total-unidades')).toHaveText(
      new Intl.NumberFormat('es-CO').format(sugerido),
    );

    // Editar una cantidad cambia el total al instante.
    const totalAntes = Number((await page.getByTestId('total-unidades').innerText()).replace(/\D/g, ''));
    const celda = page.locator('[data-testid^="celda-"] input, input[data-testid^="celda-"]').first();
    await celda.fill('500');
    await expect
      .poll(async () => Number((await page.getByTestId('total-unidades').innerText()).replace(/\D/g, '')))
      .not.toBe(totalAntes);

    await page.getByTestId('ver-borrador').click();
    await expect(page.getByTestId('texto-borrador')).toContainText('please find below our next order');
    await expect(page.getByTestId('texto-borrador')).toContainText(
      'Please confirm unit price and production time.',
    );
    await page.getByRole('button', { name: 'Cerrar' }).first().click();

    const antes = await conKc(
      page,
      (kc) => Object.keys((kc.estado() as unknown as { importaciones: object }).importaciones).length,
    );
    await page.getByTestId('crear-pedido').click();
    await expect(page.getByTestId('pedido-creado')).toBeVisible();
    const despues = await conKc(page, (kc) => {
      const e = kc.estado() as unknown as {
        importaciones: Record<
          string,
          { numero: string; estado: string; origenSugerencia: { coberturaDias: number } | null }
        >;
        mensajes: { canal: string; idioma: string; origen: { tipo: string }; cuerpo: string }[];
      };
      const nuevas = Object.values(e.importaciones).filter((i) => i.origenSugerencia);
      return {
        total: Object.keys(e.importaciones).length,
        nueva: nuevas.at(-1) ?? null,
        mensaje: e.mensajes.filter((m) => m.origen.tipo === 'pedido_sugerido').at(-1) ?? null,
      };
    });
    expect(despues.total).toBe(antes + 1);
    expect(despues.nueva?.estado).toBe('cotizado');
    expect(despues.nueva?.origenSugerencia?.coberturaDias).toBe(120);
    expect(despues.mensaje?.canal).toBe('wechat');
    expect(despues.mensaje?.idioma).toBe('en');
    expect(despues.mensaje?.cuerpo).toContain('Best regards');
    // La importación nueva aparece en el tablero en Cotizado.
    await page.getByTestId('ver-en-tablero').click();
    await expect(
      page.locator('section[aria-label="Fábrica"]').getByTestId(`tarjeta-${despues.nueva?.numero}`),
    ).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('cambiar de fábrica y cobertura recalcula; la matriz tiene tres lentes', async ({ page }) => {
    await irADueno(page, '/panel/importaciones/sugerir');
    await expect(page.getByTestId('tabla-sugerida')).toBeVisible();
    const t90 = await page.getByTestId('total-unidades').innerText();
    await page.getByTestId('cobertura-150').click();
    await expect.poll(async () => page.getByTestId('total-unidades').innerText()).not.toBe(t90);
    await page.getByTestId('lente-rotacion').click();
    await expect(page.getByTestId('tabla-sugerida').locator('table').first()).toBeVisible();
    await page.getByTestId('lente-stock').click();
    await expect(page.getByTestId('tabla-sugerida')).toContainText('Total por talla');
  });
});

test.describe('Portal de seguimiento', () => {
  test('la agente reporta el levante: cambia el estado, genera la alerta al dueño y llega a la otra pestaña sin recargar', async ({
    context,
  }) => {
    const principal = await context.newPage();
    const errores = vigilarConsola(principal);
    await irADueno(principal, '/panel/importaciones');
    const n = await narrativa(principal);
    await irADueno(principal, `/panel/importaciones/${n.retrasada}`);
    await expect(principal.getByTestId('avisos-pendientes')).toHaveCount(0);

    const portal = await context.newPage();
    const erroresPortal = vigilarConsola(portal);
    await portal.goto(conHoy(`/seguimiento/${n.retrasada}`));
    await esperarDatos(portal);
    await expect(portal.getByTestId('portal-seguimiento')).toBeVisible();
    await expect(portal.getByTestId('portal-numero')).toHaveText(n.retrasada);
    await expect(portal.getByTestId('pista-portal.formulario')).toBeVisible();
    await expect(portal.getByTestId('portal-nombre')).toHaveValue('Carolina Mejía');
    await expect(portal.getByTestId('portal-estado')).toContainText('Nacionalizado (levante)');
    await portal.getByTestId('portal-nota').fill('Levante autorizado, recogen mañana');
    await portal.getByTestId('portal-enviar').click();
    await expect(portal.getByTestId('portal-confirmacion')).toBeVisible();

    // En el sistema: estado, origen portal, notificación y evento de interfaz.
    const r = await conKc(portal, (kc) => {
      const e = kc.estado() as unknown as {
        notificaciones: Record<string, { tipo: string; titulo: string }>;
      };
      return {
        notificaciones: Object.values(e.notificaciones).map((x) => x.titulo),
        ui: kc.eventosUI().map((x) => x.tipo),
      };
    });
    expect(r.ui).toContain('portal_enviado');
    expect(r.notificaciones.some((t) => t.includes('Carolina Mejía reportó el levante'))).toBe(true);
    const estado = await conKc(portal, (kc) => {
      const e = kc.estado() as unknown as {
        importaciones: Record<string, { numero: string; estado: string }>;
      };
      return Object.values(e.importaciones).map((i) => `${i.numero}:${i.estado}`);
    });
    expect(estado).toContain(`${n.retrasada}:nacionalizado`);

    // La otra pestaña se entera sin recargar: aviso inmediato, estado nuevo y avisos listos para Óscar y Wilson.
    await expect(principal.getByTestId('avisos-pendientes')).toBeVisible({ timeout: 15_000 });
    await expect(principal.getByTestId('avisos-pendientes')).toContainText(
      'Carolina Mejía reportó el levante',
    );
    await expect(principal.getByText('Nacionalizado (levante)').first()).toBeVisible();
    await principal.getByTestId('revisar-avisos').click();
    await expect(principal.getByTestId('aviso-transportador')).toBeVisible();
    await expect(principal.getByTestId('aviso-bodega')).toBeVisible();
    await expect(principal.getByTestId('texto-transportador')).toHaveValue(/Óscar, .*levante/s);
    // El levante avisa al dueño por alerta (sin mensaje) y nunca a la fábrica.
    await expect(principal.getByTestId('aviso-dueno')).toBeVisible();
    await expect(principal.getByTestId('aviso-fabrica')).toHaveCount(0);
    expect(errores).toEqual([]);
    expect(erroresPortal).toEqual([]);
  });

  test('un pedido en fábrica no tiene novedades por reportar y un número inexistente muestra un estado vacío', async ({
    page,
  }) => {
    await irADueno(page, '/panel/importaciones');
    const n = await narrativa(page);
    await page.goto(conHoy(`/seguimiento/${n.enProduccion}`));
    await esperarDatos(page);
    await expect(page.getByText('Todavía no hay novedades para reportar')).toBeVisible();
    await page.goto(conHoy('/seguimiento/IMP-9999-99'));
    await esperarDatos(page);
    await expect(page.getByTestId('portal-no-encontrado')).toBeVisible();
  });

  test('"Ver como la agente de aduanas" abre el portal del pedido en otra pestaña', async ({
    page,
    context,
  }) => {
    await irADueno(page, '/panel/importaciones');
    const n = await narrativa(page);
    await irADueno(page, `/panel/importaciones/${n.enPuerto}`);
    await page.getByTestId('menu-mas').click();
    const [nueva] = await Promise.all([
      context.waitForEvent('page'),
      page.getByTestId('ver-como-agente').click(),
    ]);
    await nueva.waitForLoadState();
    expect(nueva.url()).toContain(`/seguimiento/${n.enPuerto}`);
    expect(nueva.url()).toContain('hoy=');
  });
});

test.describe('Roles y moneda', () => {
  test('la bodega solo lee: sin crear, sin cambiar estado y sin plata; ve la recepción', async ({ page }) => {
    await irADueno(page, '/panel/importaciones');
    const n = await narrativa(page);
    await page.getByTestId('selector-rol').click();
    await page.getByTestId('rol-bodega').click();
    await page.goto(conHoy('/panel/importaciones'));
    await esperarDatos(page);
    await expect(page.getByTestId('kpis-importaciones')).toBeVisible();
    await expect(page.getByTestId('ir-nuevo-pedido')).toHaveCount(0);
    await expect(page.getByText('Falta pagar a fábricas')).toHaveCount(0);
    await expect(page.getByTestId('vista-tablero')).toHaveCount(0);
    await expect(page.getByTestId('lista-importaciones')).toBeVisible();
    await page.goto(conHoy(`/panel/importaciones/${n.enPuerto}`));
    await esperarDatos(page);
    await expect(page.getByTestId('resumen-importacion')).toBeVisible();
    await expect(page.getByTestId('cambiar-estado')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Costo aterrizado' })).toHaveCount(0);
    await expect(page.getByText('Valor de fábrica')).toHaveCount(0);
    // Las rutas del dueño lo devuelven al resumen.
    await page.goto(conHoy(`/panel/importaciones/${n.enPuerto}/costo-aterrizado`));
    await esperarDatos(page);
    await expect(page.getByTestId('calculadora-costo')).toHaveCount(0);
  });

  test('con la moneda en US$ todas las cifras del tablero se convierten', async ({ page }) => {
    await irADueno(page, '/panel/importaciones');
    await page.getByTestId('selector-moneda').click();
    await page.getByTestId('moneda-USD').click();
    await expect(page.getByTestId('kpis-importaciones')).toContainText('US$');
    await expect(page.getByTestId('kpis-importaciones')).not.toContainText('$ 58');
  });
});

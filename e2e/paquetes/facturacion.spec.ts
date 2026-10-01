import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { conKc, esperarDatos, registrarVentaDePrueba } from '../kc';

/**
 * D3 · Facturación simulada (PRD 7.13, PLAN 9.4). Verifica solo la pantalla de Facturación: la lista con sus filtros,
 * la vista previa del documento (emisor, resolución, adquirente, IVA, CUFE, QR y marca de agua), la emisión desde una
 * venta con su transición automática, las notas crédito y los PDF. Los efectos en el dominio se leen con window.__kc.
 * Corre con: PORT=4333 npx playwright test e2e/paquetes/facturacion.spec.ts --workers=1
 */
const HOY = '2026-09-30';
const CAPTURAS = process.env.CAPTURAS_DIR ?? '';

function vigilarConsola(page: Page): string[] {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`console: ${m.text()}`);
  });
  return errores;
}

async function capturar(page: Page, nombre: string): Promise<void> {
  if (!CAPTURAS) return;
  const vp = page.viewportSize();
  await page.screenshot({ path: `${CAPTURAS}/${nombre}-${vp?.width ?? 0}.png`, fullPage: false });
}

/** Total de una venta del dominio (registrarVentaDePrueba no lo devuelve). */
function totalDeVenta(page: Page, ventaId: string): Promise<number> {
  return page.evaluate((id) => (globalThis as unknown as { __kc: { estado: () => EstadoMin } }).__kc.estado().ventas[id]?.total ?? 0, ventaId);
}

async function cambiarRol(page: Page, rol: 'dueno' | 'vendedor'): Promise<void> {
  await page.getByTestId('selector-rol').click();
  await page.getByTestId(`rol-${rol}`).click();
  await expect(page.getByTestId('selector-rol')).toHaveAttribute('data-valor', rol);
}

interface DocPrueba {
  id: string;
  numero: string;
  tipo: string;
  ventaId: string;
  total: number;
  estado: string;
}

interface EstadoMin {
  facturas: Record<string, { id: string; numero: string; tipo: string; ventaId: string; total: number; estado: string; ts: string; cufe: string; qrTexto: string; adquirente: { tipo: string; nombre: string; documento: string | null }; historial: unknown[] }>;
  notasCredito: Record<string, { id: string; numero: string; facturaId: string; valor: number; ts: string; devolucionId: string | null; estado: string }>;
  ventas: Record<string, { id: string; numero: string; facturaId: string | null; total: number; vendedorId: string; anulacion: unknown }>;
}

/** Una factura del estado (generada por el generador) de un tipo y, si se pide, identificada o de (no) un vendedor. */
function facturaDelEstado(
  page: Page,
  o: { tipo: 'factura_electronica' | 'documento_equivalente_pos'; identificado?: boolean; vendedorId?: string; noVendedorId?: string },
): Promise<DocPrueba> {
  return page.evaluate(
    ([tipo, identificado, vendedorId, noVendedorId]) => {
      const e = (globalThis as unknown as { __kc: { estado: () => EstadoMin } }).__kc.estado();
      const f = Object.values(e.facturas)
        .sort((a, b) => (a.ts < b.ts ? 1 : -1))
        .find((x) => {
          if (x.tipo !== tipo) return false;
          if (identificado && x.adquirente.tipo !== 'identificado') return false;
          const v = e.ventas[x.ventaId];
          if (vendedorId && v?.vendedorId !== vendedorId) return false;
          if (noVendedorId && v?.vendedorId === noVendedorId) return false;
          return !Object.values(e.notasCredito).some((n) => n.facturaId === x.id);
        });
      if (!f) throw new Error('sin factura de ese tipo');
      return { id: f.id, numero: f.numero, tipo: f.tipo, ventaId: f.ventaId, total: f.total, estado: f.estado };
    },
    [o.tipo, o.identificado ?? false, o.vendedorId ?? '', o.noVendedorId ?? ''] as const,
  );
}

test.describe('Facturación · lista', () => {
  test('el resumen y los filtros salen de los documentos del dominio, y cada filtro se aplica', async ({ page, irA }) => {
    test.setTimeout(120_000);
    const errores = vigilarConsola(page);
    await irA('/panel/facturacion');
    await esperarDatos(page);
    await expect(page.getByTestId('facturacion-tabla')).toBeVisible();

    const esperado = await conKc(page, (kc) => {
      const e = kc.estado() as unknown as EstadoMin;
      const enMes = (ts: string) => ts.slice(0, 7) === '2026-09';
      const fs = Object.values(e.facturas).filter((f) => enMes(f.ts));
      const ns = Object.values(e.notasCredito).filter((n) => enMes(n.ts));
      return {
        documentos: fs.length + ns.length,
        facturas: fs.filter((f) => f.tipo === 'factura_electronica').length,
        pos: fs.filter((f) => f.tipo === 'documento_equivalente_pos').length,
        notas: ns.length,
        facturado: fs.reduce((s, f) => s + f.total, 0),
        acreditado: ns.reduce((s, n) => s + n.valor, 0),
      };
    });
    await expect(page.getByTestId('facturacion-resumen-documentos')).toHaveAttribute('data-valor', String(esperado.documentos));
    await expect(page.getByTestId('facturacion-resumen-facturado')).toHaveAttribute('data-valor', String(esperado.facturado));
    await expect(page.getByTestId('facturacion-resumen-acreditado')).toHaveAttribute('data-valor', String(esperado.acreditado));
    await capturar(page, 'lista');

    // Tipo: facturas, documentos POS, notas crédito (y la URL honra ?tipo=).
    await page.getByTestId('facturacion-tipo-factura_electronica').click();
    await expect(page).toHaveURL(/tipo=factura_electronica/);
    await expect(page.getByTestId('facturacion-resumen-documentos')).toHaveAttribute('data-valor', String(esperado.facturas));
    await page.getByTestId('facturacion-tipo-documento_equivalente_pos').click();
    await expect(page.getByTestId('facturacion-resumen-documentos')).toHaveAttribute('data-valor', String(esperado.pos));
    await expect(page.locator('tbody tr[data-fila]').first()).toContainText('Documento POS electrónico');
    await page.getByTestId('facturacion-tipo-notas').click();
    await expect(page).not.toHaveURL(/tipo=/);
    await expect(page.getByTestId('facturacion-resumen-documentos')).toHaveAttribute('data-valor', String(esperado.notas));
    if (esperado.notas > 0) await expect(page.locator('tbody tr[data-fila]').first()).toContainText('Afecta HAL-');
    await page.getByTestId('facturacion-tipo-todos').click();

    // Búsqueda por número: una sola fila.
    const f = await facturaDelEstado(page, { tipo: 'factura_electronica' });
    await page.getByPlaceholder('Buscar por número, cliente o venta').fill(f.numero);
    await expect(page.locator('tbody tr[data-fila]')).toHaveCount(1);
    await expect(page.locator('tbody tr[data-fila]').first()).toContainText(f.numero);
    await page.getByPlaceholder('Buscar por número, cliente o venta').fill('zzzz-sin-resultado');
    await expect(page.getByText('Ningún documento con estos filtros')).toBeVisible();
    await page.getByRole('table', { name: 'Documentos electrónicos' }).getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(page.getByTestId('facturacion-resumen-documentos')).toHaveAttribute('data-valor', String(esperado.documentos));

    // Estado: todos los del dominio están aceptados; "Generada" no deja ninguno.
    await page.getByTestId('facturacion-filtro-estado').click();
    await page.getByRole('radio', { name: 'Generada' }).click();
    await expect(page.getByTestId('facturacion-resumen-documentos')).toHaveAttribute('data-valor', '0');
    expect(errores).toEqual([]);
  });

  test('?tipo= se honra y ?resaltar= abre sin filtro de fechas y marca la fila', async ({ page, irA }) => {
    test.setTimeout(120_000);
    const errores = vigilarConsola(page);
    await irA('/panel/facturacion?tipo=documento_equivalente_pos');
    await esperarDatos(page);
    await expect(page.getByTestId('facturacion-tipo-documento_equivalente_pos')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('tbody tr[data-fila]').first()).toContainText('Documento POS electrónico');

    // Un documento fuera del mes en curso: con ?resaltar= la lista se abre completa y la fila queda marcada.
    const id = await page.evaluate(() => {
      const e = (globalThis as unknown as { __kc: { estado: () => EstadoMin } }).__kc.estado();
      return Object.values(e.facturas).filter((f) => f.tipo === 'factura_electronica' && f.ts < '2026-08-01').sort((a, b) => (a.ts < b.ts ? -1 : 1))[0]?.id ?? '';
    });
    expect(id).not.toBe('');
    await page.goto(`/panel/facturacion?resaltar=${id}&hoy=${encodeURIComponent(`${HOY}T15:30`)}`);
    await esperarDatos(page);
    await expect(page.locator(`tr[data-fila="${id}"][data-resaltada]`)).toBeVisible();
    expect(errores).toEqual([]);
  });
});

test.describe('Facturación · vista previa', () => {
  test('la factura muestra emisor, NIT, resolución, adquirente, IVA, CUFE, QR y la marca de agua', async ({ page, irA }) => {
    test.setTimeout(120_000);
    const errores = vigilarConsola(page);
    await irA('/panel/facturacion');
    await esperarDatos(page);
    const f = await facturaDelEstado(page, { tipo: 'factura_electronica', identificado: true });
    await page.getByPlaceholder('Buscar por número, cliente o venta').fill(f.numero);
    await page.locator(`tr[data-fila="${f.id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/panel/facturacion/${f.id}`));
    const hoja = page.getByTestId('factura-hoja');
    await expect(hoja).toBeVisible();
    await expect(page.locator('[data-pista="facturacion.marca"]')).toHaveCount(1);

    await expect(page.getByTestId('facturacion-marca-agua')).toHaveText('DOCUMENTO DE DEMOSTRACIÓN · SIN VALIDEZ FISCAL');
    await expect(page.getByTestId('hoja-numero')).toHaveText(f.numero);
    await expect(page.getByTestId('hoja-emisor')).toContainText('Halden Moda Masculina S.A.S.');
    await expect(hoja).toContainText('NIT 901.234.567-7');
    await expect(page.getByTestId('hoja-resolucion')).toContainText('18764000000000');
    await expect(page.getByTestId('hoja-resolucion')).toContainText('HAL-FE');
    await expect(page.getByTestId('hoja-resolucion')).toContainText('(ficticia)');
    await expect(page.getByTestId('hoja-adquirente')).not.toHaveText('Consumidor final');
    await expect(page.getByTestId('hoja-totales')).toContainText('IVA 19 %');
    await expect(page.getByTestId('hoja-estado')).toHaveAttribute('data-estado', 'aceptada');

    const datos = await page.evaluate((id) => {
      const e = (globalThis as unknown as { __kc: { estado: () => EstadoMin } }).__kc.estado();
      const x = e.facturas[id]!;
      return { cufe: x.cufe, qr: x.qrTexto, total: x.total };
    }, f.id);
    expect(datos.cufe).toMatch(/^[0-9a-f]{96}$/);
    const mostrado = ((await page.getByTestId('hoja-codigo').innerText()) ?? '').replace(/\s+/g, '');
    expect(mostrado).toBe(datos.cufe);
    // QR: el que lleva el documento, sin URL de la DIAN.
    await expect(hoja.locator('[data-qr]')).toHaveAttribute('data-qr', datos.qr);
    expect(datos.qr).not.toMatch(/https?:/);
    // El total de la hoja es el del documento.
    const mostradoTotal = await page.getByTestId('hoja-total').innerText();
    expect(mostradoTotal.replace(/\D/g, '')).toBe(String(datos.total));
    // Todos los pasos del recorrido están hechos.
    await expect(page.locator('[data-testid="factura-recorrido"] [data-situacion="hecho"]')).toHaveCount(3);
    await capturar(page, 'factura');
    if (CAPTURAS) await hoja.screenshot({ path: `${CAPTURAS}/factura-hoja-${page.viewportSize()?.width ?? 0}.png` });
    await page.getByRole('button', { name: 'Descargar PDF' }).focus();

    // PDF con la plantilla única + evento de interfaz.
    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar PDF' }).click();
    const d = await descarga;
    expect(d.suggestedFilename()).toMatch(/\.pdf$/);
    const ruta = await d.path();
    expect(ruta).toBeTruthy();
    const eventos = await conKc(page, (kc) => kc.eventosUI().map((x) => `${x.tipo}:${String(x.datos.reporte ?? '')}`));
    expect(eventos).toContain('pdf_generado:factura');
    expect(errores).toEqual([]);
  });

  test('el documento POS se ve como tirilla, con CUDE y la misma marca de agua', async ({ page, irA }) => {
    test.setTimeout(120_000);
    const errores = vigilarConsola(page);
    await irA('/panel/facturacion');
    await esperarDatos(page);
    const f = await facturaDelEstado(page, { tipo: 'documento_equivalente_pos' });
    await page.goto(`/panel/facturacion/${f.id}?hoy=${encodeURIComponent(`${HOY}T15:30`)}`);
    await esperarDatos(page);
    const hoja = page.getByTestId('factura-hoja');
    await expect(hoja).toHaveAttribute('data-tipo', 'documento_equivalente_pos');
    await expect(hoja).toContainText('Documento equivalente electrónico POS');
    await expect(hoja).toContainText('CUDE (simulado)');
    await expect(page.getByTestId('facturacion-marca-agua')).toBeVisible();
    const ancho = await hoja.evaluate((el) => el.getBoundingClientRect().width);
    expect(ancho).toBeLessThanOrEqual(401);
    await capturar(page, 'pos');
    if (CAPTURAS) await hoja.screenshot({ path: `${CAPTURAS}/pos-hoja-${page.viewportSize()?.width ?? 0}.png` });
    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar tirilla (80 mm)' }).click();
    expect((await descarga).suggestedFilename()).toMatch(/\.pdf$/);
    const eventos = await conKc(page, (kc) => kc.eventosUI().map((x) => `${x.tipo}:${String(x.datos.reporte ?? '')}`));
    expect(eventos).toContain('pdf_generado:pos');
    expect(errores).toEqual([]);
  });

  test('con marca personalizada el emisor es el negocio de la persona, no HALDEN', async ({ page, irA }) => {
    test.setTimeout(120_000);
    const errores = vigilarConsola(page);
    await irA('/panel/facturacion');
    await esperarDatos(page);
    const f = await facturaDelEstado(page, { tipo: 'factura_electronica' });
    await conKc(page, (kc) => {
      (kc as unknown as { sesion: { getState: () => { personalizarMarca: (m: unknown) => void } } }).sesion
        .getState()
        .personalizarMarca({ nombreNegocio: 'Casa Lúmina', nombrePersona: null });
    });
    await page.goto(`/panel/facturacion/${f.id}?hoy=${encodeURIComponent(`${HOY}T15:30`)}`);
    await esperarDatos(page);
    const hoja = page.getByTestId('factura-hoja');
    await expect(hoja).toContainText('Casa Lúmina');
    await expect(page.getByTestId('hoja-emisor')).not.toContainText('Halden');
    await expect(hoja.locator('[data-marca="Casa Lúmina"]')).toBeVisible();
    await expect(page.getByTestId('facturacion-marca-agua')).toBeVisible();
    expect(errores).toEqual([]);
  });
});

test.describe('Facturación · emitir desde una venta', () => {
  test('emitir una factura: la venta queda facturada y el documento pasa solo a aceptada', async ({ page, irA }) => {
    test.setTimeout(180_000);
    const errores = vigilarConsola(page);
    await irA('/panel/facturacion');
    await esperarDatos(page);
    const v = await registrarVentaDePrueba(page);
    await page.getByTestId('facturacion-emitir').click();
    const dialogo = page.getByTestId('facturacion-dialogo-emitir');
    await expect(dialogo).toBeVisible();
    await dialogo.locator(`[data-venta="${v.ventaId}"]`).click();
    await expect(page.getByTestId('facturacion-siguiente-numero')).toContainText('HAL-FE-');
    const numeroEsperado = (await page.getByTestId('facturacion-siguiente-numero').innerText()).trim();
    await capturar(page, 'emitir');
    await page.getByTestId('facturacion-confirmar-emitir').click();

    await expect(page).toHaveURL(/\/panel\/facturacion\/[^/?]+/);
    await expect(page.getByTestId('hoja-numero')).toHaveText(numeroEsperado);
    await expect(page.getByTestId('hoja-adquirente')).toHaveText('Consumidor final');
    // Generada → enviada a la DIAN (simulación) → aceptada, sola.
    await expect(page.getByTestId('hoja-estado')).toHaveAttribute('data-estado', 'aceptada', { timeout: 20_000 });
    const eventos = await conKc(page, (kc) => kc.eventosDominio().map((x) => x.tipo));
    expect(eventos).toEqual(expect.arrayContaining(['FacturaEmitida', 'FacturaEstado']));
    const doc = await page.evaluate((vid) => {
      const e = (globalThis as unknown as { __kc: { estado: () => EstadoMin } }).__kc.estado();
      const venta = e.ventas[vid]!;
      const f = venta.facturaId ? e.facturas[venta.facturaId] : null;
      return f ? { id: f.id, estado: f.estado, pasos: f.historial.length, numero: f.numero, adq: f.adquirente.tipo } : null;
    }, v.ventaId);
    expect(doc).toMatchObject({ estado: 'aceptada', pasos: 3, numero: numeroEsperado, adq: 'consumidor_final' });
    await capturar(page, 'factura-emitida');

    // Aparece en la lista, encima de todo, y la venta ya no se ofrece para emitir.
    await page.getByRole('link', { name: 'Facturación' }).first().click();
    await expect(page.locator(`tr[data-fila="${doc!.id}"]`)).toBeVisible();
    await page.getByTestId('facturacion-emitir').click();
    await expect(page.getByTestId('facturacion-dialogo-emitir').locator(`[data-venta="${v.ventaId}"]`)).toHaveCount(0);
    expect(errores).toEqual([]);
  });

  test('emitir un documento POS con un adquirente digitado: valida y emite', async ({ page, irA }) => {
    test.setTimeout(180_000);
    const errores = vigilarConsola(page);
    await irA('/panel/facturacion');
    await esperarDatos(page);
    const v = await registrarVentaDePrueba(page);
    await page.getByTestId('facturacion-emitir').click();
    const dialogo = page.getByTestId('facturacion-dialogo-emitir');
    await dialogo.locator(`[data-venta="${v.ventaId}"]`).click();
    await dialogo.getByText('Documento equivalente POS').click();
    await dialogo.getByRole('radio', { name: /Otro adquirente/ }).click();
    await page.getByTestId('facturacion-confirmar-emitir').click();
    await expect(dialogo.getByText('Escribe el nombre o la razón social del adquirente.')).toBeVisible();
    await page.getByTestId('facturacion-adq-nombre').fill('Taller Los Andes S.A.S.');
    await page.getByTestId('facturacion-adq-documento').fill('900123456');
    await page.getByTestId('facturacion-confirmar-emitir').click();
    await expect(page.getByTestId('factura-hoja')).toHaveAttribute('data-tipo', 'documento_equivalente_pos');
    await expect(page.getByTestId('hoja-adquirente')).toContainText('Taller Los Andes S.A.S.');
    const adq = await page.evaluate((vid) => {
      const e = (globalThis as unknown as { __kc: { estado: () => EstadoMin } }).__kc.estado();
      const f = e.ventas[vid]?.facturaId ? e.facturas[e.ventas[vid]!.facturaId!] : null;
      return f ? { tipo: f.adquirente.tipo, nombre: f.adquirente.nombre, doc: f.adquirente.documento, numero: f.numero } : null;
    }, v.ventaId);
    expect(adq).toMatchObject({ tipo: 'identificado', nombre: 'Taller Los Andes S.A.S.', doc: '900123456' });
    expect(adq?.numero).toMatch(/^HAL-POS-/);
    await capturar(page, 'pos-emitido');
    expect(errores).toEqual([]);
  });
});

test.describe('Facturación · notas crédito', () => {
  test('una nota crédito por el saldo deja el documento acreditado y se ve en la lista y en su vista previa', async ({ page, irA }) => {
    test.setTimeout(180_000);
    const errores = vigilarConsola(page);
    await irA('/panel/facturacion');
    await esperarDatos(page);
    const v = { ...(await registrarVentaDePrueba(page)), total: 0 };
    v.total = await totalDeVenta(page, v.ventaId);
    await page.getByTestId('facturacion-emitir').click();
    await page.getByTestId('facturacion-dialogo-emitir').locator(`[data-venta="${v.ventaId}"]`).click();
    await page.getByTestId('facturacion-confirmar-emitir').click();
    await expect(page.getByTestId('factura-hoja')).toBeVisible();
    const facturaUrl = page.url();

    await page.getByTestId('facturacion-emitir-nota').click();
    const dialogo = page.getByTestId('facturacion-dialogo-nota');
    await expect(dialogo).toBeVisible();
    // Sin motivo no emite.
    await page.getByTestId('facturacion-motivo-nota').fill('');
    await page.getByTestId('facturacion-confirmar-nota').click();
    await expect(dialogo.getByText('Escribe el motivo de la nota crédito.')).toBeVisible();
    await page.getByTestId('facturacion-motivo-nota').fill('Error en la talla facturada');
    expect((await page.getByTestId('facturacion-valor-nota').innerText()).replace(/\D/g, '')).toBe(String(v.total));
    await capturar(page, 'nota-dialogo');
    await page.getByTestId('facturacion-confirmar-nota').click();

    await expect(page).toHaveURL(/\/panel\/facturacion\/notas-credito\//);
    await expect(page.getByTestId('nota-hoja')).toBeVisible();
    await expect(page.getByTestId('hoja-motivo')).toHaveText('Error en la talla facturada');
    await expect(page.getByTestId('hoja-numero')).toContainText('HAL-NC-');
    await expect(page.getByTestId('facturacion-marca-agua')).toBeVisible();
    expect((await page.getByTestId('hoja-total').innerText()).replace(/\D/g, '')).toBe(String(v.total));
    // La nota recién emitida también recorre generada → enviada → aceptada, sola.
    await expect(page.getByTestId('pagina-nota-credito')).toHaveAttribute('data-estado', 'aceptada', { timeout: 20_000 });
    const nota = await conKc(page, (kc) => {
      const e = kc.estado() as unknown as EstadoMin;
      const n = Object.values(e.notasCredito).sort((a, b) => (a.ts < b.ts ? 1 : -1))[0]!;
      return { id: n.id, valor: n.valor, facturaId: n.facturaId, estado: (n as unknown as { estado: string }).estado, eventos: kc.eventosDominio().map((x) => x.tipo) };
    });
    expect(nota.valor).toBe(v.total);
    expect(nota.eventos).toContain('NotaCreditoEmitida');
    // Compartidos C-D: el avance es del dominio (notaCredito.avanzarEstado), no de la pestaña.
    expect(nota.estado).toBe('aceptada');
    expect(nota.eventos.filter((t) => t === 'NotaCreditoEstado')).toHaveLength(2);
    await capturar(page, 'nota');
    if (CAPTURAS) await page.getByTestId('nota-hoja').screenshot({ path: `${CAPTURAS}/nota-hoja-${page.viewportSize()?.width ?? 0}.png` });

    // PDF de la nota con la plantilla única.
    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar PDF' }).click();
    expect((await descarga).suggestedFilename()).toMatch(/\.pdf$/);
    const ev = await conKc(page, (kc) => kc.eventosUI().map((x) => `${x.tipo}:${String(x.datos.reporte ?? '')}`));
    expect(ev).toContain('pdf_generado:nota-credito');

    // La factura quedó acreditada por completo: sin saldo y sin botón de nueva nota.
    await page.goto(facturaUrl);
    await esperarDatos(page);
    await expect(page.getByTestId('hoja-acreditado')).toBeVisible();
    await expect(page.getByTestId('factura-saldo')).toContainText('0');
    await expect(page.getByTestId('facturacion-emitir-nota')).toBeDisabled();
    await expect(page.getByTestId('factura-notas').locator(`[data-nota="${nota.id}"]`)).toBeVisible();

    // En la lista la nota aparece con su documento afectado.
    await page.goto(`/panel/facturacion?resaltar=${nota.id}&hoy=${encodeURIComponent(`${HOY}T15:30`)}`);
    await esperarDatos(page);
    await expect(page.locator(`tr[data-fila="${nota.id}"][data-resaltada]`)).toContainText('Afecta HAL-FE-');
    expect(errores).toEqual([]);
  });

  test('una devolución que aún no tiene nota se ofrece como origen de la nota crédito', async ({ page, irA }) => {
    test.setTimeout(180_000);
    const errores = vigilarConsola(page);
    await irA('/panel/facturacion');
    await esperarDatos(page);
    const v = { ...(await registrarVentaDePrueba(page)), total: 0 };
    v.total = await totalDeVenta(page, v.ventaId);
    // La devolución se registra antes de facturar (por eso no genera nota crédito).
    const ok = await page.evaluate((vid) => {
      const kc = (globalThis as unknown as { __kc: { estado: () => { ventas: Record<string, { lineas: { id: string }[] }> }; acciones: Record<string, (d: unknown) => { ok: boolean; error?: { mensaje: string } }> } }).__kc;
      const linea = kc.estado().ventas[vid]!.lineas[0]!;
      const registrar = kc.acciones.registrarDevolucion as (d: unknown) => { ok: boolean; error?: { mensaje: string } };
      return registrar({
        ventaId: vid,
        lineas: [{ lineaId: linea.id, cantidad: 1, reingresa: true }],
        motivo: 'No le quedó bien',
        compensacion: 'reembolso',
        reembolso: { medio: 'nequi', sesionCajaId: null },
      });
    }, v.ventaId);
    expect(ok.ok, ok.error?.mensaje).toBe(true);

    // Facturar la venta de prueba y emitir la nota desde la devolución.
    await page.getByTestId('facturacion-emitir').click();
    const dialogo = page.getByTestId('facturacion-dialogo-emitir');
    await dialogo.locator(`[data-venta="${v.ventaId}"]`).click();
    await page.getByTestId('facturacion-confirmar-emitir').click();
    await expect(page.getByTestId('factura-hoja')).toBeVisible();
    await page.getByTestId('facturacion-emitir-nota').click();
    const nota = page.getByTestId('facturacion-dialogo-nota');
    await expect(nota.getByText(/Devolución DV-/)).toBeVisible();
    await expect(page.getByTestId('facturacion-motivo-nota')).toHaveValue('No le quedó bien');
    await page.getByTestId('facturacion-confirmar-nota').click();
    await expect(page.getByTestId('nota-hoja')).toBeVisible();
    await expect(page.getByTestId('nota-hoja')).toContainText('Devolución DV-');
    const n = await conKc(page, (kc) => {
      const e = kc.estado() as unknown as EstadoMin;
      const x = Object.values(e.notasCredito).sort((a, b) => (a.ts < b.ts ? 1 : -1))[0]!;
      return { devolucionId: x.devolucionId, valor: x.valor };
    });
    expect(n.devolucionId).toBeTruthy();
    expect(n.valor).toBe(v.total);
    expect(errores).toEqual([]);
  });
});

test.describe('Facturación · vendedor', () => {
  test('el vendedor ve el documento de su venta, sin notas crédito, y no el de otro', async ({ page, irA }) => {
    test.setTimeout(120_000);
    const errores = vigilarConsola(page);
    await irA('/panel/facturacion');
    await esperarDatos(page);
    const propia = await facturaDelEstado(page, { tipo: 'factura_electronica', vendedorId: 'em_scardenas' });
    const ajena = await facturaDelEstado(page, { tipo: 'factura_electronica', noVendedorId: 'em_scardenas' });
    const comoVendedor = async (id: string) => {
      await page.goto(`/panel/facturacion/${id}?hoy=${encodeURIComponent(`${HOY}T15:30`)}`);
      await esperarDatos(page);
      await cambiarRol(page, 'vendedor');
    };
    await comoVendedor(propia.id);
    await expect(page.getByTestId('factura-hoja')).toBeVisible();
    await expect(page.getByTestId('facturacion-emitir-nota')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Descargar PDF' })).toBeVisible();
    await comoVendedor(ajena.id);
    await expect(page.getByText('Este documento no es de una de tus ventas')).toBeVisible();
    await expect(page.getByTestId('factura-hoja')).toHaveCount(0);
    expect(errores).toEqual([]);
  });
});

import type { Page } from '@playwright/test';
import { abrir, abrirCelular, evaluar, expect, soloEscritorio1440, test } from './comun';

/**
 * Flujo 3 (PROMPT fase 4, W3 y W4): cambiar el estado de la importación en puerto → panel "Notificar a" con los
 * mensajes → enlaces wa.me / mailto sin destinatario → bandeja de salida → calendario con la llegada → al recibirse en
 * bodega, entrada de inventario con el costo aterrizado → márgenes de la referencia actualizados (y la app lo ve).
 */
interface Imp {
  id: string;
  numero: string;
  estado: string;
  llegada: string;
  costosAplicados: boolean;
  productos: string[];
}

const importacion = (page: Page, id: string) =>
  evaluar(
    page,
    (kc, a: { id: string }) => {
      const i = kc.estado().importaciones[a.id] as unknown as {
        id: string;
        numero: string;
        estado: string;
        hitos: { recibido_bodega: { estimada: string } };
        costosAplicados: unknown;
        lineas: { productoId: string }[];
      };
      return {
        id: i.id,
        numero: i.numero,
        estado: i.estado,
        llegada: i.hitos.recibido_bodega.estimada,
        costosAplicados: i.costosAplicados !== null,
        productos: [...new Set(i.lineas.map((l) => l.productoId))],
      };
    },
    { id },
  ) as Promise<Imp>;

async function cambiarEstado(page: Page, numero: string, estado: string, quien: string) {
  await abrir(page, `/panel/importaciones/${numero}?resaltar=cambiar-estado`);
  await page.getByTestId('cambiar-estado').click();
  await expect(page.getByTestId('select-estado')).toContainText(estado);
  await expect(page.getByTestId('quien-recibe')).toContainText(quien);
  await page.getByTestId('guardar-estado').click();
  await expect(page.getByTestId('panel-notificar')).toBeVisible();
}

test('importación: estado → "Notificar a" → wa.me/mailto → bandeja → calendario → recepción con costo aterrizado → márgenes', async ({ page, context }, info) => {
  soloEscritorio1440(info);
  await abrir(page, '/panel/importaciones');
  const id = await evaluar(page, (kc) => kc.estado().meta.narrativa.importacionEnPuerto ?? '', null);
  const antes = await importacion(page, id);
  expect(antes.estado).toBe('en_puerto');
  expect(antes.costosAplicados).toBe(false);
  const margenesAntes = await evaluar(
    page,
    (kc, ps: string[]) => Object.fromEntries(ps.map((p) => [p, (kc.sel('selMargenProducto', { productoId: p }) as { margenPct: number; costo: number }) ?? null])),
    antes.productos,
  );

  // 1. Cambio de estado (en puerto → en nacionalización) y panel "Notificar a" con los mensajes de la matriz (W3).
  await cambiarEstado(page, antes.numero, 'En proceso de nacionalización', 'Óscar Rincón');
  for (const quien of ['transportador', 'bodega', 'agente_aduanas']) await expect(page.getByTestId(`aviso-${quien}`)).toBeVisible();
  await expect(page.getByTestId('aviso-fabrica')).toHaveCount(0);
  await expect(page.getByTestId('texto-transportador')).toHaveValue(new RegExp(antes.numero));

  // 2. Enlaces reales sin destinatario (R14): el texto del mensaje va en el enlace.
  const texto = await page.getByTestId('texto-transportador').inputValue();
  const wa = (await page.getByTestId('aviso-transportador-whatsapp').getAttribute('href')) ?? '';
  expect(wa).toMatch(/^https:\/\/wa\.me\/\?text=/);
  expect(decodeURIComponent(wa.replace('https://wa.me/?text=', ''))).toContain(texto.slice(0, 40));
  const correo = (await page.getByTestId('aviso-transportador-correo').getAttribute('href')) ?? '';
  expect(correo).toMatch(/^mailto:\?subject=/);
  expect(decodeURIComponent(correo)).toContain(antes.numero);
  await page.getByTestId('enviar-avisos').click();
  await expect(page.getByTestId('panel-notificar')).toBeHidden();

  // 3. Bandeja de salida: los avisos quedan "Enviado (simulación)".
  await page.getByRole('link', { name: /^Mensajes/ }).click();
  await expect(page.getByTestId('bandeja-salida')).toContainText('Enviado (simulación)');
  await expect(page.getByTestId('bandeja-salida').getByText('Óscar Rincón').first()).toBeVisible();

  // 4. Calendario: la llegada a bodega está en su día (la fecha estimada vigente de la importación).
  const tras = await importacion(page, id);
  expect(tras.estado).toBe('en_nacionalizacion');
  await abrir(page, `/panel/calendario?fecha=${tras.llegada}`);
  await expect(page.getByTestId(`dia-${tras.llegada}`).getByTestId(`evento-imp:${id}`)).toContainText(antes.numero);

  // 5. Levante (nacionalizado) y recepción en bodega desde Inventario.
  await cambiarEstado(page, antes.numero, 'Nacionalizado', 'Óscar Rincón');
  await page.getByTestId('enviar-avisos').click();
  await abrir(page, `/panel/inventario/recepcion?importacion=${antes.numero}`);
  await expect(page.getByTestId('formulario-recepcion')).toBeVisible();
  await page.getByTestId('recibir-importacion').click();
  await expect(page.getByTestId('recepcion-hecha')).toBeVisible();

  // 6. Entrada de inventario con el costo aterrizado: cada entrada lleva el costo vigente nuevo de su referencia.
  const despues = await evaluar(
    page,
    (kc, a: { id: string; ps: string[] }) => {
      const e = kc.estado() as unknown as {
        importaciones: Record<string, { estado: string; costosAplicados: unknown }>;
        productos: Record<string, { costoVigente: number; referencia: string }>;
        movimientos: Record<string, { tipo: string; productoId: string; costoUnitario: number; documento: { id: string } | null }>;
      };
      const entradas = Object.values(e.movimientos).filter((m) => m.tipo === 'entrada_importacion' && m.documento?.id === a.id);
      return {
        estado: e.importaciones[a.id]?.estado,
        aplicados: e.importaciones[a.id]?.costosAplicados !== null,
        entradas: entradas.length,
        costosCoinciden: entradas.every((m) => m.costoUnitario === e.productos[m.productoId]?.costoVigente),
        referencia: e.productos[a.ps[0] ?? '']?.referencia ?? '',
        margenes: Object.fromEntries(a.ps.map((p) => [p, kc.sel('selMargenProducto', { productoId: p }) as { margenPct: number; costo: number }])),
      };
    },
    { id, ps: antes.productos },
  );
  expect(despues.estado).toBe('recibido_bodega');
  expect(despues.aplicados).toBe(true);
  expect(despues.entradas).toBeGreaterThan(0);
  expect(despues.costosCoinciden).toBe(true);
  // Al menos una referencia cambia de costo y de margen (W4: costo de reposición = última importación aplicada).
  const cambiadas = antes.productos.filter((p) => margenesAntes[p]?.margenPct !== despues.margenes[p]?.margenPct);
  expect(cambiadas.length).toBeGreaterThan(0);

  // 7. La ficha de rentabilidad de la referencia muestra el margen nuevo; el kárdex la entrada de la importación.
  const p = cambiadas[0]!;
  const ref = await evaluar(page, (kc, pid: string) => kc.estado().productos[pid]?.referencia ?? '', p);
  await abrir(page, `/panel/inventario/${ref}/rentabilidad`);
  await expect(page.getByTestId('margen-pct')).toContainText(`${Math.round((despues.margenes[p]?.margenPct ?? 0) * 100)}`);
  await abrir(page, `/panel/inventario/${ref}/kardex`);
  await expect(page.getByTestId('kardex-cuadre')).toHaveAttribute('data-cuadra', 'true');
  await expect(page.getByTestId('tabla-kardex')).toContainText(antes.numero);

  // 8. El calendario ya no espera esa llegada (se recibió).
  await abrir(page, `/panel/calendario?fecha=${tras.llegada}`);
  await expect(page.getByTestId(`evento-imp:${id}`)).toHaveCount(0);

  // 9. App del dueño: la importación aparece recibida.
  const cel = await abrirCelular(context, `/app/mas/importaciones/${antes.numero}`);
  await expect(cel.getByText(/Llegó a bodega el 30\/09\/2026/)).toBeVisible();
});

import type { Page } from '@playwright/test';

/**
 * Utilidades de las pruebas e2e para `window.__kc` (src/estado/kc.ts): esperar el estado construido, leer
 * selectores y ejecutar acciones como lo haría la interfaz. Los e2e de los paquetes verifican los efectos en
 * otros módulos por aquí (PLAN 5.16, 9.1.9).
 */
export async function esperarDatos(page: Page, timeout = 30_000): Promise<void> {
  await page.waitForFunction(() => typeof (globalThis as unknown as { __kc?: unknown }).__kc === 'object', null, { timeout });
  await page.evaluate(async () => {
    const kc = (globalThis as unknown as { __kc: { listo: () => Promise<unknown> } }).__kc;
    await kc.listo();
  });
}

/** Ejecuta una función con `__kc` dentro de la página. */
export function conKc<T>(page: Page, fn: (kc: KcPagina) => T | Promise<T>): Promise<T> {
  return page.evaluate(`(${fn.toString()})(globalThis.__kc)`) as Promise<T>;
}

/** Forma mínima de `__kc` que usan las pruebas (sin importar tipos de la app en Node). */
export interface KcPagina {
  estado: () => {
    ventas: Record<string, { id: string; numero: string; localId: string; total: number }>;
    variantes: Record<string, { id: string; productoId: string }>;
    productos: Record<string, { id: string; precioVenta: number; referencia: string; slug: string }>;
    importaciones: Record<string, { numero: string }>;
    liquidaciones: Record<string, { id: string }>;
    facturas: Record<string, { id: string }>;
    notasCredito: Record<string, { id: string }>;
    traslados: Record<string, { id: string }>;
    conteos: Record<string, { id: string }>;
    cuentas: Record<string, { id: string }>;
    agregados: { existencias: Record<string, number> };
    meta: { narrativa: Record<string, string>; generadoHasta: string };
  };
  datos: { getState: () => { registro: unknown[]; modo: string; ancla: string; reconstruyendo: boolean } };
  sel: (nombre: string, params?: unknown) => unknown;
  selectores: Record<string, unknown>;
  acciones: Record<string, (datos: unknown) => { ok: boolean; error?: { mensaje: string } }>;
  hashEstado: () => string;
  listo: () => Promise<unknown>;
  urlQr: () => Promise<string>;
  eventosUI: () => { tipo: string; datos: Record<string, unknown> }[];
  eventosDominio: () => { tipo: string; contexto: { origen: string; rol: string } }[];
}

/** Datos de una venta de contado con Nequi en Usaquén (una unidad de una variante con existencias). */
export async function registrarVentaDePrueba(page: Page): Promise<{ ventaId: string; numero: string }> {
  return conKc(page, (kc) => {
    const e = kc.estado();
    const v = Object.values(e.variantes).find((x) => (e.agregados.existencias[`${x.id}@usq`] ?? 0) > 2);
    if (!v) throw new Error('sin variante con existencias');
    const p = e.productos[v.productoId];
    const registrar = kc.acciones.registrarVenta as (d: unknown) => { ok: boolean; error?: { mensaje: string } };
    const r = registrar({
      ts: null,
      localId: 'usq',
      vendedorId: 'em_scardenas',
      canal: 'local',
      tipo: 'contado',
      clienteId: null,
      clienteNuevo: null,
      lineas: [{ varianteId: v.id, cantidad: 1, precioLista: null, descuento: null }],
      descuentoGlobal: null,
      aprobacionDescuentoId: null,
      pagos: [{ medio: 'nequi', valor: p?.precioVenta ?? 0, recibido: null, referencia: 'PRUEBA', sesionCajaId: null, bonoId: null }],
      fechaLimiteSeparado: null,
      ventaOrigenCambioId: null,
      facturaInmediata: null,
      nota: 'Venta de prueba (e2e)',
    });
    if (!r.ok) throw new Error(r.error?.mensaje ?? 'no se registró');
    const ultima = kc.datos.getState().registro.at(-1) as { comando: { datos: { ventaId: string } } };
    const ventaId = ultima.comando.datos.ventaId;
    return { ventaId, numero: kc.estado().ventas[ventaId]?.numero ?? '' };
  });
}

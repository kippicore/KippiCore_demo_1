import type { EntradaRegistro, EventoUI } from '@/dominio/tipos';
import { PRUEBA_ESTO } from '@/config/textos/guia';
import type { EventoDominioConContexto, EventoUIEmitido } from '@/estado';

/**
 * Detección de "Prueba esto" (PLAN 2.4, 6.18): puro. Cada función recibe un evento (o una entrada del registro) y
 * devuelve el id del ítem que completa, o null. Los ids son los de `PRUEBA_ESTO` (config/textos/guia.ts).
 *
 * Tres fuentes, todas idempotentes (completar dos veces es lo mismo que una):
 *  1. eventos de dominio en vivo (los emite el motor al ejecutar comandos),
 *  2. `EventoUI` (los emiten los paquetes dueños de cada pantalla),
 *  3. el registro de comandos del usuario: cubre lo que pasó en otra pestaña (tienda, portal) o antes de que la
 *     guía se montara (p. ej. una compra en `/tienda`, que no tiene el panel).
 */
export const IDS_PRINCIPALES: readonly string[] = PRUEBA_ESTO.items.map((i) => i.id);
export const IDS_EXTRA: readonly string[] = PRUEBA_ESTO.paraIrMasLejos.items.map((i) => i.id);
export const TOTAL_PRINCIPALES = IDS_PRINCIPALES.length;

/** Cuántos de los 8 ítems principales están completos (los de "Para ir más lejos" no cuentan). */
export function contarPrincipales(completados: readonly string[]): number {
  return IDS_PRINCIPALES.filter((id) => completados.includes(id)).length;
}

/** Cuántos de "Para ir más lejos". */
export function contarExtras(completados: readonly string[]): number {
  return IDS_EXTRA.filter((id) => completados.includes(id)).length;
}

/** Texto de "Hecho: …" de un ítem (principal o extra). */
export function textoHecho(id: string): string | null {
  const i = [...PRUEBA_ESTO.items, ...PRUEBA_ESTO.paraIrMasLejos.items].find((x) => x.id === id);
  return i?.hecho ?? null;
}

export function itemPorEventoUI(e: Pick<EventoUIEmitido, 'tipo' | 'datos'>): string | null {
  const tipo: EventoUI = e.tipo;
  switch (tipo) {
    case 'flujo_caja_visto':
      return 'flujo';
    case 'costo_empleador_visto':
      return 'costo-empleado';
    case 'rol_cambiado':
      return e.datos.a === 'vendedor' || e.datos.a === 'bodega' ? 'rol' : null;
    case 'pedido_sugerido_visto':
      return 'pedido';
    case 'qr_abierto':
    case 'app_abierta':
      return 'celular';
    case 'whatsapp_escenario_completado':
    case 'whatsapp_respondido':
      return 'whatsapp';
    case 'moneda_cambiada':
      return e.datos.a === 'USD' || e.datos.a === 'CNY' ? 'moneda' : null;
    case 'excel_generado':
      return e.datos.reporte === 'contador' ? 'contador' : null;
    case 'tabla_dinamica_modificada':
      return 'tabla-dinamica';
    case 'portal_enviado':
      return 'portal';
    default:
      return null;
  }
}

export function itemPorEventoDominio(e: EventoDominioConContexto): string | null {
  if (e.contexto.origen !== 'usuario') return null;
  switch (e.tipo) {
    case 'VentaRegistrada':
      if (e.canal === 'local') return 'venta';
      if (e.canal === 'web') return 'tienda';
      return null;
    case 'TrasladoCambiado':
      return e.estado === 'solicitado' ? 'traslado' : null;
    case 'ImportacionEstadoCambiado':
      if (e.origen === 'panel') return 'importacion';
      if (e.origen === 'portal') return 'portal';
      return null;
    default:
      return null;
  }
}

/** Lo que una entrada del registro del usuario completa (sin depender de que el evento se haya visto en vivo). */
export function itemPorEntradaRegistro(r: Pick<EntradaRegistro, 'origen' | 'comando'>): string | null {
  if (r.origen !== 'usuario') return null;
  const c = r.comando;
  switch (c.tipo) {
    case 'venta.registrar':
      if (c.datos.canal === 'local') return 'venta';
      if (c.datos.canal === 'web') return 'tienda';
      return null;
    case 'traslado.solicitar':
      return 'traslado';
    case 'importacion.cambiarEstado':
      if (c.datos.origen === 'panel') return 'importacion';
      if (c.datos.origen === 'portal') return 'portal';
      return null;
    default:
      return null;
  }
}

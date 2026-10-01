import type { Id, MensajeSaliente } from '@/dominio/tipos';
import { crearSelector } from './memo';

/** Tipo de origen de un mensaje saliente (importación, cobro, cumpleaños…). */
export type OrigenMensaje = MensajeSaliente['origen']['tipo'];

/**
 * Bandeja de salida filtrada (pedido B1, para A4, B1 y D5): los mensajes registrados (`registrarMensajes`) de un
 * origen (`origenId` y, si se dan, solo de esos `tipos`) o enviados a un destinatario (`destinatarioId`: cliente,
 * contacto o empleado), del más reciente al más antiguo. Sin filtros, toda la bandeja.
 *
 *   useSel(selMensajes, { origenId: imp.id, tipos: ['importacion', 'pedido_sugerido'] })   // bandeja de una importación
 *   useSel(selMensajes, { destinatarioId: clienteId })                                     // mensajes a un cliente
 */
export const selMensajes = crearSelector<{ origenId?: Id; tipos?: readonly OrigenMensaje[]; destinatarioId?: Id }, MensajeSaliente[]>(
  'selMensajes',
  ['mensajes'],
  (e, { origenId, tipos, destinatarioId }) =>
    e.mensajes
      .filter(
        (m) =>
          (origenId === undefined || m.origen.id === origenId) &&
          (!tipos || tipos.includes(m.origen.tipo)) &&
          (destinatarioId === undefined || m.destinatario.refId === destinatarioId),
      )
      .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0)),
);

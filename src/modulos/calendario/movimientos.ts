import { useCallback } from 'react';
import { avisar } from '@/ui';
import { useAcciones } from '@/estado';
import type { FechaISO } from '@/dominio/tipos';
import { sumarDias } from '@/lib/fechas';
import { fechaCorta, fechaLarga } from '@/lib/formato';
import { diasEntre, trasladarEvento } from './calculos';
import type { EventoAgenda } from './tipos';

/**
 * Mover un evento a otro día (arrastrando o desde el detalle). Cada tipo llama al comando de su origen (PLAN 9.4 C3):
 * guardado → `evento.editar`; turno → `turno.mover`; llegada → `importacion.actualizarHitos`; vencimiento →
 * `cxp.programar`. Los eventos derivados no se editan aquí: solo cambian de fecha, y el cambio queda en su módulo.
 */
export type ResultadoMover =
  /** Se movió (o ya estaba en ese día). */
  | { ok: true }
  /** El turno haría pasar al empleado de su jornada semanal: hay que confirmar las horas extra. */
  | { ok: false; exceso: true; mensaje: string }
  | { ok: false; exceso: false; mensaje: string };

/** Nueva fecha del origen del evento al soltarlo en `destino` habiéndolo tomado del día `desde`. */
export function fechaDestino(ev: Pick<EventoAgenda, 'fechaOrigen'>, desde: FechaISO, destino: FechaISO): FechaISO {
  return sumarDias(ev.fechaOrigen, diasEntre(desde, destino));
}

export function useMoverEvento() {
  const acciones = useAcciones();
  return useCallback(
    (ev: EventoAgenda, desde: FechaISO, destino: FechaISO, aceptarExceso = false): ResultadoMover => {
      const dias = diasEntre(desde, destino);
      if (dias === 0) return { ok: true };
      if (!ev.movible) return { ok: false, exceso: false, mensaje: 'Este evento no se puede mover.' };
      const nueva = fechaDestino(ev, desde, destino);
      const fallo = (mensaje: string): ResultadoMover => {
        avisar({ tipo: 'error', texto: 'No se pudo mover el evento', detalle: mensaje });
        return { ok: false, exceso: false, mensaje };
      };

      if (ev.origen === 'guardado') {
        const r = acciones.editarEvento({ eventoId: ev.fuente.id, cambios: trasladarEvento(ev, dias) });
        if (!r.ok) return fallo(r.error.mensaje);
        avisar({ tipo: 'exito', texto: `Moviste «${ev.titulo}»`, detalle: `Ahora es el ${fechaLarga(nueva).toLowerCase()}.` });
        return { ok: true };
      }

      if (ev.origen === 'turno' && ev.turno) {
        const t = ev.turno;
        const r = acciones.moverTurno({
          turnoId: t.turnoId,
          fecha: nueva,
          empleadoId: t.empleadoId,
          localId: t.localId,
          tipo: t.tipo,
          inicio: t.inicio,
          fin: t.fin,
          aceptarExceso,
        });
        if (!r.ok) {
          if (r.error.codigo === 'JORNADA_EXCEDIDA') return { ok: false, exceso: true, mensaje: r.error.mensaje };
          return fallo(r.error.mensaje);
        }
        avisar({ tipo: 'exito', texto: `Turno de ${t.empleadoCorto} movido al ${fechaCorta(nueva)}`, detalle: 'Se actualizó en Turnos.' });
        return { ok: true };
      }

      if (ev.origen === 'importacion') {
        const r = acciones.actualizarHitosImportacion({ importacionId: ev.fuente.id, estimadas: { recibido_bodega: nueva } });
        if (!r.ok) {
          const detalle =
            r.error.codigo === 'FECHAS_DESORDENADAS'
              ? 'La llegada a bodega no puede quedar antes de los pasos anteriores del pedido. Cambia primero esas fechas en Importaciones.'
              : r.error.mensaje;
          avisar({ tipo: 'error', texto: 'No se pudo mover la llegada', detalle, accion: { texto: 'Abrir la importación', a: ev.enlace } });
          return { ok: false, exceso: false, mensaje: detalle };
        }
        avisar({
          tipo: 'exito',
          texto: `${ev.importacionNumero ?? 'La importación'} llega el ${fechaCorta(nueva)}`,
          detalle: 'La fecha estimada también cambió en Importaciones.',
          accion: { texto: 'Ver importación', a: ev.enlace },
        });
        return { ok: true };
      }

      if (ev.origen === 'cuenta') {
        const r = acciones.programarCuentaPorPagar({ cxpId: ev.fuente.id, fecha: nueva });
        if (!r.ok) return fallo(r.error.mensaje);
        avisar({ tipo: 'exito', texto: `Pago programado para el ${fechaCorta(nueva)}`, detalle: 'Quedó programado en Por pagar.', accion: { texto: 'Ver en Por pagar', a: ev.enlace } });
        return { ok: true };
      }
      return fallo('Este evento no se puede mover.');
    },
    [acciones],
  );
}

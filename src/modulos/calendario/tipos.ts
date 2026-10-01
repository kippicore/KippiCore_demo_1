import type { Tono } from '@/config/estados';
import type { EventoCalendario, EventoVista, FechaISO, HoraHHmm, Id, TipoTurno } from '@/dominio/tipos';

/** De dónde sale un evento del calendario (C3): lo guardado aquí o lo que viene de otro módulo. */
export type OrigenEvento = 'guardado' | 'turno' | 'importacion' | 'cuenta' | 'obligacion';

/** Datos de un turno para moverlo con `moverTurno` (la acción pide el turno completo). */
export interface TurnoDeEvento {
  turnoId: Id;
  empleadoId: Id;
  empleadoNombre: string;
  /** Nombre y primer apellido ('Daniela Moreno'), para las fichas angostas. */
  empleadoCorto: string;
  localId: Id;
  tipo: TipoTurno;
  inicio: HoraHHmm;
  fin: HoraHHmm;
}

/**
 * Evento de la agenda: la forma unificada de `selEventosCalendario` más lo que la pantalla necesita para pintar el
 * detalle y mover el evento sin leer el estado de dominio (selector local `selAgenda`).
 */
export interface EventoAgenda extends EventoVista {
  origen: OrigenEvento;
  /** Subtipo del evento guardado (null en los derivados). */
  subtipo: EventoCalendario['subtipo'] | null;
  /** Obligación de la configuración que todavía no tiene cuenta por pagar: fecha y valor ilustrativos. */
  ilustrativo: boolean;
  /** Estado en palabras ("Pagado", "Vencido", "En puerto"…) y su tono, para la insignia del detalle. */
  estadoTexto: string | null;
  estadoTono: Tono | null;
  descripcion: string | null;
  clienteId: Id | null;
  clienteNombre: string | null;
  empleadoId: Id | null;
  empleadoNombre: string | null;
  recordatorioMin: number | null;
  /** Saldo en COP de una cuenta por pagar en pesos. */
  monto: number | null;
  /** Saldo de una cuenta por pagar en USD o CNY, ya formateado (nunca se convierte a mano). */
  montoOrigen: string | null;
  /** Línea corta bajo el título (proveedor, tercero, unidades…). */
  detalle: string | null;
  importacionNumero: string | null;
  /** Qué trae una importación: "Camisas Guangzhou Huameng · 1.186 uds.". */
  contenido: string | null;
  turno: TurnoDeEvento | null;
  /** Fecha del origen que se arrastra (la del hito, el vencimiento, el día del turno). */
  fechaOrigen: FechaISO;
}

export type Vista = 'mes' | 'semana' | 'dia';

import type { Eliminable, FechaHoraISO, Id, Trazabilidad } from './comunes';

/** Calendario (PLAN 6.13). */
export type TipoEvento = 'turno' | 'importacion' | 'vencimiento' | 'campana' | 'cita' | 'otro';
/** Solo campañas, citas, obligaciones y eventos libres se ALMACENAN. */
export interface EventoCalendario extends Trazabilidad, Eliminable {
  id: Id;
  tipo: Exclude<TipoEvento, 'turno' | 'importacion'>;
  subtipo:
    | 'obligacion_tributaria'
    | 'obligacion_laboral'
    | 'campana_temporada'
    | 'asesoria'
    | 'toma_medidas'
    | 'seguimiento'
    | 'otro';
  titulo: string;
  inicio: FechaHoraISO;
  fin: FechaHoraISO | null;
  todoElDia: boolean;
  localId: Id | null;
  clienteId: Id | null;
  empleadoId: Id | null;
  descripcion: string | null;
  recordatorioMin: number | null;
}
/** Forma unificada que entrega el selector (almacenados + derivados de turnos, importaciones y cuentas por pagar). */
export interface EventoVista {
  /** 'ev:<id>' · 'turno:<id>' · 'imp:<id>' · 'cxp:<id>' */
  id: string;
  tipo: TipoEvento;
  titulo: string;
  inicio: FechaHoraISO;
  fin: FechaHoraISO | null;
  todoElDia: boolean;
  localId: Id | null;
  fuente: { tipo: 'evento' | 'turno' | 'importacion' | 'cuenta_por_pagar'; id: Id };
  /** Arrastrar → comando de su fuente. */
  movible: boolean;
  /** Ruta al detalle. */
  enlace: string;
}

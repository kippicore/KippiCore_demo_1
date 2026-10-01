import type { COP, Eliminable, FechaHoraISO, Id, Trazabilidad } from './comunes';

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
  /** 'obligacion': fecha del calendario ilustrativo que aún no tiene cuenta por pagar (no se mueve). */
  fuente: { tipo: 'evento' | 'turno' | 'importacion' | 'cuenta_por_pagar' | 'obligacion'; id: Id };
  /** Arrastrar → comando de su fuente. */
  movible: boolean;
  /** Ruta al detalle. */
  enlace: string;
  /**
   * Saldo en pesos de un vencimiento en COP, para mostrarlo con `<Dinero>` en la moneda activa (el título es solo el
   * concepto; compartidos C-D).
   */
  monto: COP | null;
  /** Saldo de un vencimiento en US$ o CN¥, ya formateado en su moneda de origen (nunca se convierte). */
  montoOrigen: string | null;
  /** Línea corta bajo el título: qué trae la llegada ("Camisas Huameng · 1.186 uds.") o a quién se le paga. */
  detalle: string | null;
  /** Obligación del calendario ilustrativo (fecha y existencia ilustrativas, sin valor). */
  ilustrativo: boolean;
  /** Recordatorio del evento guardado, en minutos antes (Inicio y la app lo muestran). */
  recordatorioMin: number | null;
}

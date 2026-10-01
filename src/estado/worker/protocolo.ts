import type { EntradaRegistro, EstadoDominio, FechaHoraISO, FechaISO } from '@/dominio/tipos';

/** Mensajes entre el hilo principal y el worker del motor (PLAN 5.6.12). */
export interface EntradaWorker {
  ancla: FechaISO;
  ahora: FechaHoraISO;
  semilla: string;
  escala: number;
  registro: EntradaRegistro[];
  /** 'clon': postMessage del objeto (clonación estructurada); 'json': texto UTF-8 transferido como ArrayBuffer. */
  transferencia: 'clon' | 'json';
  /**
   * Solo medición (`?lentitudWorker=4`): CDP no puede estrangular la CPU de un worker ("only supported for
   * pages"), así que el worker simula un procesador N veces más lento esperando (N − 1) × lo que tarda cada paso.
   */
  lentitud?: number;
}

export type MensajeAlWorker = { tipo: 'construir'; id: number; entrada: EntradaWorker };

export type MensajeDelWorker =
  | { tipo: 'progreso'; id: number; porcentaje: number }
  | { tipo: 'listo'; id: number; estado: EstadoDominio; msConstruccion: number }
  | { tipo: 'listo-json'; id: number; buffer: ArrayBuffer; msConstruccion: number; msSerializacion: number }
  | { tipo: 'error'; id: number; mensaje: string };

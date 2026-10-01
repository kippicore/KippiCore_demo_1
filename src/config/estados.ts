import type { EstadoImportacion } from '@/dominio/tipos';

/** Mapa canónico estado → tono (PLAN 8.7.10). Ningún módulo decide colores por su cuenta. */
export type Tono = 'ink' | 'outline' | 'neutral' | 'muted' | 'success' | 'warning' | 'danger' | 'accent';
export interface EstiloEstado {
  etiqueta: string;
  tono: Tono;
}

export const ESTADOS_VENTA = {
  pagada: { etiqueta: 'Pagada', tono: 'success' },
  separado: { etiqueta: 'Separado', tono: 'accent' },
  credito: { etiqueta: 'Crédito', tono: 'outline' },
  devuelta: { etiqueta: 'Devuelta', tono: 'neutral' },
  devuelta_parcial: { etiqueta: 'Devuelta en parte', tono: 'neutral' },
  anulada: { etiqueta: 'Anulada', tono: 'muted' },
} as const satisfies Record<string, EstiloEstado>;

export const ESTADOS_POR_PAGAR = {
  pendiente: { etiqueta: 'Pendiente', tono: 'warning' },
  programado: { etiqueta: 'Programado', tono: 'outline' },
  pago_parcial: { etiqueta: 'Pago parcial', tono: 'accent' },
  pagado: { etiqueta: 'Pagado', tono: 'success' },
  vencido: { etiqueta: 'Vencido', tono: 'danger' },
} as const satisfies Record<string, EstiloEstado>;

export const ESTADOS_POR_COBRAR = {
  al_dia: { etiqueta: 'Al día', tono: 'outline' },
  por_vencer: { etiqueta: 'Por vencer', tono: 'warning' },
  vencido: { etiqueta: 'Vencido', tono: 'danger' },
  cobrado: { etiqueta: 'Cobrado', tono: 'success' },
} as const satisfies Record<string, EstiloEstado>;

export const ESTADOS_TRASLADO = {
  solicitado: { etiqueta: 'Solicitado', tono: 'warning' },
  en_transito: { etiqueta: 'En tránsito', tono: 'ink' },
  recibido: { etiqueta: 'Recibido', tono: 'success' },
  cancelado: { etiqueta: 'Cancelado', tono: 'muted' },
} as const satisfies Record<string, EstiloEstado>;

const FASE_TONO: Record<EstadoImportacion, Tono> = {
  cotizado: 'outline',
  pedido_confirmado: 'outline',
  anticipo_pagado: 'outline',
  en_produccion: 'outline',
  listo_despacho: 'outline',
  saldo_pagado: 'outline',
  embarcado: 'ink',
  en_transito: 'ink',
  en_puerto: 'ink',
  en_nacionalizacion: 'accent',
  nacionalizado: 'accent',
  en_transporte_bogota: 'neutral',
  recibido_bodega: 'success',
};
export const TONO_ESTADO_IMPORTACION = FASE_TONO;
export const INDICADORES_IMPORTACION = {
  retraso: { etiqueta: 'Retraso', tono: 'danger' },
  aforoFisico: { etiqueta: 'Aforo físico', tono: 'warning' },
  aforoDocumental: { etiqueta: 'Aforo documental', tono: 'warning' },
} as const satisfies Record<string, EstiloEstado>;

export const ESTADOS_CAJA = {
  abierta: { etiqueta: 'Abierta', tono: 'outline' },
  cuadro: { etiqueta: 'Cuadró', tono: 'success' },
  con_diferencia: { etiqueta: 'Con diferencia', tono: 'danger' },
  revisado: { etiqueta: 'Revisado', tono: 'neutral' },
} as const satisfies Record<string, EstiloEstado>;

export const ESTADOS_APROBACION = {
  pendiente: { etiqueta: 'Pendiente', tono: 'warning' },
  aprobada: { etiqueta: 'Aprobada', tono: 'success' },
  rechazada: { etiqueta: 'Rechazada', tono: 'muted' },
  vencida: { etiqueta: 'Vencida', tono: 'muted' },
} as const satisfies Record<string, EstiloEstado>;

export const ESTADOS_FACTURA = {
  generada: { etiqueta: 'Generada', tono: 'neutral' },
  enviada: { etiqueta: 'Enviada a la DIAN (simulación)', tono: 'outline' },
  aceptada: { etiqueta: 'Aceptada', tono: 'success' },
  nota_credito: { etiqueta: 'Nota crédito', tono: 'accent' },
} as const satisfies Record<string, EstiloEstado>;
export const TIPOS_DOCUMENTO_ELECTRONICO = {
  factura_electronica: { etiqueta: 'Factura electrónica', tono: 'outline' },
  documento_equivalente_pos: { etiqueta: 'Documento POS electrónico', tono: 'outline' },
} as const satisfies Record<string, EstiloEstado>;

export const ESTADO_NOMINA_ELECTRONICA = {
  transmitida_simulada: { etiqueta: 'Transmitida (simulación)', tono: 'success' },
} as const satisfies Record<string, EstiloEstado>;

export const ESTADOS_INVENTARIO = {
  agotado: { etiqueta: 'Agotado', tono: 'danger' },
  stock_bajo: { etiqueta: 'Stock bajo', tono: 'warning' },
} as const satisfies Record<string, EstiloEstado>;

export const ESTADOS_CONTEO = {
  en_curso: { etiqueta: 'En curso', tono: 'warning' },
  con_diferencias: { etiqueta: 'Con diferencias', tono: 'danger' },
  aplicado: { etiqueta: 'Aplicado', tono: 'success' },
  cancelado: { etiqueta: 'Cancelado', tono: 'muted' },
} as const satisfies Record<string, EstiloEstado>;

export const ESTADOS_PERSONAL = {
  laboral: { etiqueta: 'Laboral', tono: 'outline' },
  prestacion_servicios: { etiqueta: 'Prestación de servicios', tono: 'neutral' },
  riesgo_contrato_realidad: { etiqueta: 'Riesgo de contrato realidad', tono: 'warning' },
  vacaciones: { etiqueta: 'Vacaciones', tono: 'accent' },
  incapacidad: { etiqueta: 'Incapacidad', tono: 'warning' },
  retirado: { etiqueta: 'Retirado', tono: 'muted' },
} as const satisfies Record<string, EstiloEstado>;

export const ESTADOS_ASISTENCIA = {
  a_tiempo: { etiqueta: 'A tiempo', tono: 'success' },
  tarde: { etiqueta: 'Tarde', tono: 'warning' },
  ausente: { etiqueta: 'Ausente', tono: 'danger' },
  novedad: { etiqueta: 'Novedad', tono: 'accent' },
  sin_turno: { etiqueta: 'Sin turno', tono: 'neutral' },
  en_curso: { etiqueta: 'En turno', tono: 'outline' },
  pendiente: { etiqueta: 'Por llegar', tono: 'neutral' },
} as const satisfies Record<string, EstiloEstado>;

export const ESTADOS_CLIENTE = {
  vip: { etiqueta: 'VIP', tono: 'ink' },
  frecuente: { etiqueta: 'Frecuente', tono: 'outline' },
  ocasional: { etiqueta: 'Ocasional', tono: 'neutral' },
  en_riesgo: { etiqueta: 'En riesgo', tono: 'warning' },
  nuevo: { etiqueta: 'Nuevo', tono: 'accent' },
} as const satisfies Record<string, EstiloEstado>;

export const ESTADOS_MENSAJE = {
  enviado_simulado: { etiqueta: 'Enviado (simulación)', tono: 'success' },
  wechat_simulado: { etiqueta: 'WeChat (simulación)', tono: 'success' },
} as const satisfies Record<string, EstiloEstado>;

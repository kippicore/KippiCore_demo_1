import type { ParametrosSegmentacion } from '@/dominio/tipos';

/** Umbrales de segmentación (6.20.8). Orden de evaluación: nuevo, en riesgo, VIP, frecuente, ocasional. */
export const PARAMETROS_SEGMENTACION: ParametrosSegmentacion = {
  diasNuevo: 60,
  diasEnRiesgo: 90,
  vipValor12m: 3_000_000,
  frecuenteCompras12m: 3,
};

export type Segmento = 'vip' | 'frecuente' | 'ocasional' | 'en_riesgo' | 'nuevo';

export const SEGMENTOS: Record<Segmento, { etiqueta: string; descripcion: string }> = {
  vip: { etiqueta: 'VIP', descripcion: 'Te ha comprado $ 3 millones o más en los últimos 12 meses.' },
  frecuente: { etiqueta: 'Frecuente', descripcion: 'Tres o más compras en los últimos 12 meses.' },
  ocasional: { etiqueta: 'Ocasional', descripcion: 'Compra de vez en cuando.' },
  en_riesgo: { etiqueta: 'En riesgo', descripcion: 'No vuelve hace más de 90 días.' },
  nuevo: { etiqueta: 'Nuevo', descripcion: 'Llegó en los últimos 60 días.' },
};

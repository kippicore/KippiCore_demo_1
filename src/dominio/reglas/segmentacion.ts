import type { COP, FechaISO, ParametrosSegmentacion } from '../tipos';
import { diferenciaDias } from './fechas';

/** Segmentación de clientes (PLAN 6.20.8): nuevo, en riesgo, VIP, frecuente, ocasional, en ese orden. */
export type Segmento = 'vip' | 'frecuente' | 'ocasional' | 'en_riesgo' | 'nuevo';

export interface MetricasSegmento {
  /** Fecha de registro del cliente (alta). */
  registro: FechaISO;
  primeraCompra: FechaISO | null;
  ultimaCompra: FechaISO | null;
  /** Valor comprado en los últimos 12 meses (con IVA). */
  valor12m: COP;
  compras12m: number;
}

export function segmentoCliente(m: MetricasSegmento, hoy: FechaISO, p: ParametrosSegmentacion): Segmento {
  const desde = m.primeraCompra ?? m.registro;
  if (diferenciaDias(desde, hoy) <= p.diasNuevo) return 'nuevo';
  if (m.ultimaCompra && diferenciaDias(m.ultimaCompra, hoy) > p.diasEnRiesgo) return 'en_riesgo';
  if (m.valor12m >= p.vipValor12m) return 'vip';
  if (m.compras12m >= p.frecuenteCompras12m) return 'frecuente';
  return 'ocasional';
}

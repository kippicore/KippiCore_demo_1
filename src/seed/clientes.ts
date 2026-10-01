import type { Fraccion } from '@/dominio/tipos';

/**
 * Tipos latentes de clientes (PLAN 7.7, P11) con la regla vigente de DECISIONES (01/10/2026, última línea):
 * solo ≈ 15 % de las ventas tienen cliente identificado y la distribución es muy sesgada (VIP con 15 o más
 * compras; la mayoría con 1 a 3). Con escala 1: ≈ 450 clientes y ≈ 2.400 ventas con cliente en 18 meses.
 */
export interface TipoLatenteCliente {
  id: 'vip' | 'frecuente' | 'ocasional' | 'en_riesgo_alto' | 'en_riesgo' | 'nuevo';
  /** Fracción de los clientes registrados. */
  proporcion: Fraccion;
  /** Compras esperadas en 18 meses [mínimo, máximo]. */
  compras18m: [number, number];
  /** Factor sobre el ticket del local. */
  factorTicket: number;
  /** Días antes del ancla desde los que dejó de comprar (en riesgo); null si sigue activo. */
  abandonoDias: [number, number] | null;
  /** Alta en los últimos N días (nuevos); null si es anterior. */
  altaUltimosDias: number | null;
  /** Tratamiento por defecto en los mensajes. */
  tratamiento: 'tu' | 'usted';
}

export const TIPOS_LATENTES_CLIENTES: TipoLatenteCliente[] = [
  {
    id: 'vip',
    proporcion: 0.08,
    compras18m: [15, 24],
    factorTicket: 1.5,
    abandonoDias: null,
    altaUltimosDias: null,
    tratamiento: 'usted',
  },
  {
    id: 'frecuente',
    proporcion: 0.22,
    compras18m: [4, 7],
    factorTicket: 1.1,
    abandonoDias: null,
    altaUltimosDias: null,
    tratamiento: 'tu',
  },
  {
    id: 'ocasional',
    proporcion: 0.35,
    compras18m: [1, 3],
    factorTicket: 1.0,
    abandonoDias: null,
    altaUltimosDias: null,
    tratamiento: 'tu',
  },
  // ≈ 31 clientes que compraron más de $ 3 millones y no vuelven hace más de 90 días (P11).
  {
    id: 'en_riesgo_alto',
    proporcion: 0.07,
    compras18m: [8, 12],
    factorTicket: 1.4,
    abandonoDias: [95, 240],
    altaUltimosDias: null,
    tratamiento: 'usted',
  },
  {
    id: 'en_riesgo',
    proporcion: 0.18,
    compras18m: [1, 3],
    factorTicket: 0.9,
    abandonoDias: [95, 300],
    altaUltimosDias: null,
    tratamiento: 'tu',
  },
  {
    id: 'nuevo',
    proporcion: 0.1,
    compras18m: [1, 2],
    factorTicket: 1.0,
    abandonoDias: null,
    altaUltimosDias: 60,
    tratamiento: 'tu',
  },
];

/** Al elegir cliente, su local habitual pesa × 1,8 (7.7). */
export const PESO_LOCAL_HABITUAL = 1.8;

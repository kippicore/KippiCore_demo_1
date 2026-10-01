import type { ParametrosAduanas } from '@/dominio/tipos';

/*
 * Parámetros aduaneros de EJEMPLO (PLAN 6.3, 7.9, W4). Todo valor aduanero se presenta como
 * "Valor de ejemplo · se valida con tu agente de aduanas". Referencias para el agente (solo comentario):
 * arancel ad valorem de confecciones (con componente específico que aquí se resume en "Otros tributos
 * aduaneros"), IVA de importación del 19 % sobre CIF + arancel + otros tributos, seguro sobre FOB.
 */
export const PARAMETROS_ADUANAS: ParametrosAduanas = {
  arancelPct: 0.15,
  otrosTributosPorUnidad: 0,
  ivaImportacionPct: 0.19,
  ivaImportacionSumaAlCosto: false,
  seguroPctSobreFOB: 0.005,
  // Días desde el estado anterior (≈ 102 días de pedido a bodega, 7.9).
  diasEstimadosEntreEstados: {
    cotizado: 0,
    pedido_confirmado: 5,
    anticipo_pagado: 3,
    en_produccion: 2,
    listo_despacho: 35,
    saldo_pagado: 4,
    embarcado: 6,
    en_transito: 1,
    en_puerto: 32,
    en_nacionalizacion: 3,
    nacionalizado: 7,
    en_transporte_bogota: 2,
    recibido_bodega: 2,
  },
  sonEjemplo: true,
};

/** Porcentajes del pago a la fábrica (M6): anticipo al confirmar, saldo al quedar listo para despacho. */
export const PAGO_FABRICA = { anticipo: 0.3, saldo: 0.7 } as const;

/** Etiquetas de los 13 estados, agrupados en 5 fases para la línea de tiempo (W3). */
export const ETIQUETAS_ESTADO_IMPORTACION = {
  cotizado: 'Cotizado',
  pedido_confirmado: 'Pedido confirmado',
  anticipo_pagado: 'Anticipo pagado',
  en_produccion: 'En producción',
  listo_despacho: 'Listo para despacho',
  saldo_pagado: 'Saldo pagado',
  embarcado: 'Embarcado',
  en_transito: 'En tránsito marítimo',
  en_puerto: 'En puerto colombiano',
  en_nacionalizacion: 'En proceso de nacionalización',
  nacionalizado: 'Nacionalizado (levante)',
  en_transporte_bogota: 'En transporte a Bogotá',
  recibido_bodega: 'Recibido en bodega',
} as const;

export const FASES_IMPORTACION = [
  {
    id: 'fabrica',
    nombre: 'Fábrica',
    estados: [
      'cotizado',
      'pedido_confirmado',
      'anticipo_pagado',
      'en_produccion',
      'listo_despacho',
      'saldo_pagado',
    ],
  },
  { id: 'viaje', nombre: 'Viaje', estados: ['embarcado', 'en_transito', 'en_puerto'] },
  { id: 'aduana', nombre: 'Aduana', estados: ['en_nacionalizacion', 'nacionalizado'] },
  { id: 'entrega', nombre: 'Entrega', estados: ['en_transporte_bogota'] },
  { id: 'bodega', nombre: 'Bodega', estados: ['recibido_bodega'] },
] as const;

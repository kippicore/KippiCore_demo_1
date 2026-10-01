import type { ParametrosObligaciones } from '@/dominio/tipos';

/*
 * Calendario ILUSTRATIVO de obligaciones (PLAN 5.4, 6.20.9). Lo usan el flujo de caja, el calendario y el
 * generador. Todo es parametrizable y se presenta como "Valores y fechas ilustrativos · se validan con tu contador".
 */
export const PARAMETROS_OBLIGACIONES: ParametrosObligaciones = {
  pilaDiaHabil: 10,
  primaFechas: ['06-30', '12-20'],
  cesantiasFecha: '02-14',
  interesesCesantiasFecha: '01-31',
  ivaVencimientoDia: 14,
  retencionVencimientoDia: 14,
  icaVencimientoDia: 20,
  sonIlustrativas: true,
};

/** Bimestres de IVA e ICA: meses de cierre (el pago vence el mes siguiente). */
export const MESES_CIERRE_BIMESTRE = [2, 4, 6, 8, 10, 12] as const;

export const NOMBRES_OBLIGACIONES = {
  pila: 'Seguridad social (PILA)',
  prima: 'Prima de servicios',
  cesantias: 'Consignación de cesantías',
  interesesCesantias: 'Intereses sobre cesantías',
  iva: 'IVA bimestral',
  retencion: 'Retención en la fuente',
  ica: 'ICA bimestral',
} as const;

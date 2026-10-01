import type { ParametrosNomina } from '@/dominio/tipos';

/*
 * Parámetros de nómina ILUSTRATIVOS (PLAN 6.3, 6.20.5, P5). Todos editables en Configuración y marcados
 * "Valor ilustrativo · verificar". La interfaz NUNCA muestra números de leyes ni decretos.
 *
 * Referencias para el contador (solo comentario):
 * - Salario mínimo y auxilio de transporte 2026: valores del PRD.
 * - Jornada máxima semanal: reducción gradual a 42 h (desde el 15/07/2026), antes 44 h.
 * - Divisor de la hora: jornada / 6 × 30 (42 h → 210 h).
 * - Recargo dominical y festivo: incremento gradual (90 % desde el 01/07/2026, por verificar).
 * - Exoneración de aportes de salud (empleador), ICBF y SENA para salarios menores de 10 SMMLV.
 * - Fondo de solidaridad pensional desde 4 SMMLV.
 */
export const PARAMETROS_NOMINA: ParametrosNomina = {
  vigencia: 2026,
  smmlv: 1_750_905,
  auxilioTransporte: 249_095,
  topeAuxilioSMMLV: 2,
  baseTopeAuxilio: 'devengado',
  jornadaMaximaSemanal: { horas: 42, desde: '2026-07-15', horasAnterior: 44 },
  divisorHorasMes: null,
  jornadaNocturna: { inicio: '19:00', fin: '06:00' },
  recargos: {
    nocturno: 0.35,
    dominicalFestivo: 0.9,
    extraDiurna: 0.25,
    extraNocturna: 0.75,
  },
  trabajador: { salud: 0.04, pension: 0.04 },
  fondoSolidaridad: [
    { desdeSMMLV: 4, hastaSMMLV: 16, porcentaje: 0.01 },
    { desdeSMMLV: 16, hastaSMMLV: 17, porcentaje: 0.012 },
    { desdeSMMLV: 17, hastaSMMLV: 18, porcentaje: 0.014 },
    { desdeSMMLV: 18, hastaSMMLV: 19, porcentaje: 0.016 },
    { desdeSMMLV: 19, hastaSMMLV: 20, porcentaje: 0.018 },
    { desdeSMMLV: 20, hastaSMMLV: null, porcentaje: 0.02 },
  ],
  empleador: {
    salud: 0.085,
    pension: 0.12,
    caja: 0.04,
    icbf: 0.03,
    sena: 0.02,
    arl: { 1: 0.00522, 2: 0.01044, 3: 0.02436, 4: 0.0435, 5: 0.0696 },
  },
  provisiones: { cesantias: 0.0833, interesesCesantiasAnual: 0.12, prima: 0.0833, vacaciones: 0.0417 },
  exoneracion114: { activa: true, topeSMMLV: 10 },
  prestacionServicios: { retencionFuente: 0.1, ibcPorcentaje: 0.4, seguridadSocialContratista: 0.285 },
  incapacidad: { porcentajePago: 0.6667, diasACargoEmpleador: 2 },
  toleranciaLlegadaTardeMin: 10,
  riesgoContratoRealidad: { semanasRevisadas: 4, minimoTurnosPorSemana: 3 },
  porVerificar: [
    'smmlv',
    'auxilioTransporte',
    'topeAuxilioSMMLV',
    'baseTopeAuxilio',
    'jornadaMaximaSemanal',
    'divisorHorasMes',
    'jornadaNocturna',
    'recargos',
    'trabajador',
    'fondoSolidaridad',
    'empleador',
    'provisiones',
    'exoneracion114',
    'prestacionServicios',
    'incapacidad',
  ],
};

/** Palabras que un slug de empleado no puede usar (subrutas estáticas de /panel/personal, 5.5). */
export const SLUGS_RESERVADOS = [
  'nuevo',
  'nomina',
  'turnos',
  'asistencia',
  'novedades',
  'comparativo',
  'comisiones',
] as const;

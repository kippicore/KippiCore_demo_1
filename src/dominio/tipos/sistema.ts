import type { COP, FechaISO, Fraccion, HoraHHmm, Id, MonedaExtranjera } from './comunes';
import type { EstadoImportacion } from './compras';
import type { MedioPago } from './ventas';

/*
 * Parámetros (PLAN 6.3); valores iniciales en src/config/*.
 * TODOS son ilustrativos y editables. Las fuentes normativas de los valores iniciales se anotan solo como
 * comentarios en src/config/nomina.ts, src/config/negocio.ts y src/config/aduanas.ts; la interfaz NUNCA
 * muestra números de leyes ni decretos.
 */

export interface ParametrosNomina {
  vigencia: number;
  smmlv: COP;
  auxilioTransporte: COP;
  topeAuxilioSMMLV: number;
  /** 'devengado' por defecto (incluye comisiones y recargos habituales); en porVerificar. */
  baseTopeAuxilio: 'basico' | 'devengado';
  /** 42 desde 2026-07-15; antes 44. */
  jornadaMaximaSemanal: { horas: number; desde: FechaISO; horasAnterior: number };
  /** null = jornada / 6 × 30 (42 h → 210; 44 h → 220); editable. */
  divisorHorasMes: number | null;
  /** '19:00'–'06:00' (por verificar). */
  jornadaNocturna: { inicio: HoraHHmm; fin: HoraHHmm };
  recargos: {
    nocturno: Fraccion;
    dominicalFestivo: Fraccion;
    extraDiurna: Fraccion;
    extraNocturna: Fraccion;
  };
  trabajador: { salud: Fraccion; pension: Fraccion };
  /** 4–16 SMMLV: 1 %; tramos superiores. */
  fondoSolidaridad: { desdeSMMLV: number; hastaSMMLV: number | null; porcentaje: Fraccion }[];
  empleador: {
    salud: Fraccion;
    pension: Fraccion;
    caja: Fraccion;
    icbf: Fraccion;
    sena: Fraccion;
    arl: Record<1 | 2 | 3 | 4 | 5, Fraccion>;
  };
  provisiones: {
    cesantias: Fraccion;
    interesesCesantiasAnual: Fraccion;
    prima: Fraccion;
    vacaciones: Fraccion;
  };
  exoneracion114: { activa: boolean; topeSMMLV: number };
  prestacionServicios: {
    retencionFuente: Fraccion;
    ibcPorcentaje: Fraccion;
    seguridadSocialContratista: Fraccion;
  };
  incapacidad: { porcentajePago: Fraccion; diasACargoEmpleador: number };
  toleranciaLlegadaTardeMin: number;
  riesgoContratoRealidad: { semanasRevisadas: number; minimoTurnosPorSemana: number };
  /** Claves con marca "Verificar antes de presentar como cálculo real" (todas las legales). */
  porVerificar: string[];
}

export interface ParametrosImpuestos {
  ivaGeneral: Fraccion;
  /** true: el estado de resultados usa gastos sin IVA. */
  ivaGastosDescontable: boolean;
  retencionHonorarios: Fraccion;
  retencionCompras: Fraccion;
  /** Ilustrativa (Bogotá, comercio); por verificar. */
  icaTarifaPorMil: number;
  periodicidadIva: 'bimestral' | 'cuatrimestral';
  periodicidadIca: 'bimestral' | 'anual';
}

/** Calendario ilustrativo de obligaciones (config/obligaciones.ts): lo usan el flujo de caja, el calendario y el generador. */
export interface ParametrosObligaciones {
  pilaDiaHabil: number;
  /** ['06-30', '12-20'] (MM-DD) */
  primaFechas: [string, string];
  cesantiasFecha: string;
  interesesCesantiasFecha: string;
  /** Día del mes siguiente al bimestre (ilustrativo). */
  ivaVencimientoDia: number;
  /** Mensual (ilustrativo). */
  retencionVencimientoDia: number;
  /** Bimestral (ilustrativo). */
  icaVencimientoDia: number;
  sonIlustrativas: true;
}

export interface ParametrosAduanas {
  arancelPct: Fraccion;
  /** 0 por defecto; "Otros tributos aduaneros" (componente específico, ayuda en pantalla). */
  otrosTributosPorUnidad: COP;
  ivaImportacionPct: Fraccion;
  /** Interruptor "IVA descontable (no suma al costo)" (W4). */
  ivaImportacionSumaAlCosto: boolean;
  seguroPctSobreFOB: Fraccion;
  /** Días desde el estado anterior hasta este. */
  diasEstimadosEntreEstados: Record<EstadoImportacion, number>;
  sonEjemplo: true;
}

export interface ParametrosVentas {
  abonoMinimoSeparado: Fraccion;
  diasMaximoSeparado: number;
  descuentoMaximoVendedor: Fraccion;
  diasMaximoDevolucion: number;
  localDespachoWebId: Id;
  /** Datáfono → cuenta puente "Datáfono por abonar". */
  cuentaPorMedio: Record<MedioPago, Id | 'caja_del_local' | null>;
}

export interface ParametrosDatafono {
  comisionDebito: Fraccion;
  comisionCredito: Fraccion;
  /** Ilustrativas, "descontables · valida con tu contador". */
  retenciones: { fuente: Fraccion; iva: Fraccion; ica: Fraccion };
  /** El abono neto llega al día hábil siguiente. */
  diasAbono: number;
  /** Crédito con financiera aliada (genérica), ilustrativa. */
  comisionFinanciera: Fraccion;
}

export interface ParametrosSegmentacion {
  diasNuevo: number;
  diasEnRiesgo: number;
  vipValor12m: COP;
  frecuenteCompras12m: number;
}

export interface ParametrosInventario {
  stockMinimoPorDefecto: number;
  diasSinMovimiento: number;
}

export interface Parametros {
  nomina: ParametrosNomina;
  impuestos: ParametrosImpuestos;
  obligaciones: ParametrosObligaciones;
  aduanas: ParametrosAduanas;
  ventas: ParametrosVentas;
  datafono: ParametrosDatafono;
  segmentacion: ParametrosSegmentacion;
  inventario: ParametrosInventario;
}

export interface TasaCambio {
  /** Única por (moneda, fecha); fecha ≤ hoy. */
  id: Id;
  moneda: MonedaExtranjera;
  fecha: FechaISO;
  /** COP por 1 USD o 1 CNY. Ejemplo vigente: USD 3950 · CNY 548 (config/monedas.ts). */
  valor: number;
  fuente: 'ejemplo' | 'usuario';
}

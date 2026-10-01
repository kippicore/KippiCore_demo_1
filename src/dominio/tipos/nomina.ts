import type { COP, FechaHoraISO, FechaISO, Id, Trazabilidad } from './comunes';
import type { TipoVinculacion } from './personal';
import type { ParametrosNomina } from './sistema';

/** Nómina (PLAN 6.10). */
export interface PeriodoNomina {
  inicio: FechaISO;
  fin: FechaISO;
  tipo: 'quincenal' | 'mensual';
  /** '2.ª quincena de septiembre de 2026' */
  etiqueta: string;
}

/** Insumos de una liquidación por empleado (derivados de asistencia, novedades y ventas). */
export interface InsumosLiquidacion {
  /** 15 o 30 (mes comercial). */
  diasPeriodo: number;
  diasLaborados: number;
  diasIncapacidad: number;
  diasVacaciones: number;
  diasNoRemunerados: number;
  horasExtraDiurnas: number;
  horasExtraNocturnas: number;
  horasRecargoNocturno: number;
  horasDominicalFestivo: number;
  /** Del mes (se liquida en la 2.ª quincena o en el mes). */
  ventasComisionables: COP;
  ventasLocalMes: COP;
  metaLocalMes: COP;
}

export interface DesgloseLaboral {
  devengados: {
    salario: COP;
    incapacidad: COP;
    vacaciones: COP;
    auxilioTransporte: COP;
    horasExtraDiurnas: COP;
    horasExtraNocturnas: COP;
    recargoNocturno: COP;
    recargoDominicalFestivo: COP;
    comisiones: COP;
    bonos: COP;
  };
  totalDevengado: COP;
  /** Base de seguridad social (sin auxilio). */
  ibc: COP;
  deducciones: { salud: COP; pension: COP; fondoSolidaridad: COP };
  totalDeducciones: COP;
  aportesEmpleador: { salud: COP; pension: COP; arl: COP; caja: COP; icbf: COP; sena: COP };
  totalAportes: COP;
  provisiones: { cesantias: COP; interesesCesantias: COP; prima: COP; vacaciones: COP };
  totalProvisiones: COP;
  exonerado114: boolean;
}
export interface DesglosePrestacion {
  honorarios: COP;
  comisiones: COP;
  totalBruto: COP;
  retencionFuente: COP;
  pilaVerificada: boolean;
  /** Informativo: 40 % de lo pactado. */
  ibcContratista: COP;
}
export interface LiquidacionEmpleado {
  empleadoId: Id;
  contratoId: Id;
  tipo: TipoVinculacion;
  localId: Id | null;
  insumos: InsumosLiquidacion;
  laboral: DesgloseLaboral | null;
  prestacion: DesglosePrestacion | null;
  netoAPagar: COP;
  /** devengado + aportes + provisiones (laboral) · bruto (prestación). */
  costoEmpleador: COP;
}
export interface LiquidacionNomina extends Trazabilidad {
  id: Id;
  /** 'NOM-2026-18' */
  numero: string;
  periodo: PeriodoNomina;
  /** El borrador es DERIVADO (vista previa), no se guarda. */
  estado: 'aprobada' | 'pagada';
  /** Instantánea de los parámetros usados. */
  parametros: ParametrosNomina;
  exoneracion114: boolean;
  lineas: LiquidacionEmpleado[];
  totales: { devengado: COP; deducciones: COP; aportes: COP; provisiones: COP; neto: COP; costo: COP };
  aprobada: { ts: FechaHoraISO; por: Id };
  pagada: { ts: FechaHoraISO; por: Id; cuentaId: Id } | null;
  /** "Nómina electrónica: transmitida (simulación)". */
  nominaElectronica: { estado: 'transmitida_simulada'; ts: FechaHoraISO; cune: string } | null;
  /** Neto empleados, seguridad social (PILA), honorarios. */
  cuentasPorPagarIds: Id[];
  /** Gasto de nómina del periodo por local. */
  gastoIds: Id[];
}

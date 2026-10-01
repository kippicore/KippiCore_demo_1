import type {
  COP,
  Contrato,
  DesgloseLaboral,
  DesglosePrestacion,
  FechaISO,
  Fraccion,
  InsumosLiquidacion,
  MesISO,
  ParametrosNomina,
  PeriodoNomina,
} from '../tipos';
import { redondear } from './dinero';
import { diasDelMes, finMes, inicioMes } from './fechas';
import { jornadaMaximaVigente } from './jornada';

/**
 * Nómina ILUSTRATIVA (PLAN 6.20.5, 6.20.6, W6). Cada valor se redondea a peso. Se presenta siempre con
 * `<NotaLegal tipo="nomina">`.
 */

/** Horas del mes para el valor de la hora: divisor editable o jornada / 6 × 30 (42 h → 210). */
export function horasMes(parametros: ParametrosNomina, fecha: FechaISO): number {
  return parametros.divisorHorasMes ?? (jornadaMaximaVigente(parametros, fecha) / 6) * 30;
}

export function valorHora(salarioBase: COP, parametros: ParametrosNomina, fecha: FechaISO): number {
  return salarioBase / horasMes(parametros, fecha);
}

/** Porcentaje del fondo de solidaridad según el IBC mensual en SMMLV. */
export function porcentajeSolidaridad(ibcMensual: COP, parametros: ParametrosNomina): Fraccion {
  const enSmmlv = ibcMensual / parametros.smmlv;
  let pct = 0;
  for (const t of parametros.fondoSolidaridad) {
    if (enSmmlv >= t.desdeSMMLV && (t.hastaSMMLV === null || enSmmlv < t.hastaSMMLV)) pct = t.porcentaje;
  }
  return pct;
}

/** Insumos de un mes completo sin novedades ni horas adicionales (modo "Salario pactado"). */
export function insumosPactado(diasPeriodo = 30): InsumosLiquidacion {
  return {
    diasPeriodo,
    diasLaborados: diasPeriodo,
    diasIncapacidad: 0,
    diasVacaciones: 0,
    diasNoRemunerados: 0,
    horasExtraDiurnas: 0,
    horasExtraNocturnas: 0,
    horasRecargoNocturno: 0,
    horasDominicalFestivo: 0,
    ventasComisionables: 0,
    ventasLocalMes: 0,
    metaLocalMes: 0,
  };
}

export interface EntradaLaboral {
  contrato: Pick<Contrato, 'salarioBase' | 'riesgoArl'>;
  insumos: InsumosLiquidacion;
  parametros: ParametrosNomina;
  /** Interruptor de exoneración de aportes (W6); se combina con `parametros.exoneracion114.activa`. */
  exoneracion: boolean;
  /** Comisión del periodo (6.20.4), calculada fuera con el esquema del contrato. */
  comisiones: COP;
  bonos: COP;
  /** Fecha de referencia para la jornada vigente (divisor de la hora). */
  fecha: FechaISO;
}

export interface ResultadoLaboral {
  desglose: DesgloseLaboral;
  neto: COP;
  costoEmpleador: COP;
  valorHora: number;
}

export function liquidarLaboral(e: EntradaLaboral): ResultadoLaboral {
  const { parametros: p, insumos: i } = e;
  const salarioBase = e.contrato.salarioBase ?? 0;
  const valorDia = salarioBase / 30;
  const vh = valorHora(salarioBase, p, e.fecha);
  const factorMes = i.diasPeriodo > 0 ? 30 / i.diasPeriodo : 1;

  const salario = redondear((salarioBase * i.diasLaborados) / 30);
  const valorDiaIncapacidad = Math.max(valorDia * p.incapacidad.porcentajePago, p.smmlv / 30);
  const incapacidad = redondear(valorDiaIncapacidad * i.diasIncapacidad);
  const vacaciones = redondear((salarioBase * i.diasVacaciones) / 30);
  const extraDiurna = redondear(i.horasExtraDiurnas * vh * (1 + p.recargos.extraDiurna));
  const extraNocturna = redondear(i.horasExtraNocturnas * vh * (1 + p.recargos.extraNocturna));
  const recargoNocturno = redondear(i.horasRecargoNocturno * vh * p.recargos.nocturno);
  const recargoDominical = redondear(i.horasDominicalFestivo * vh * p.recargos.dominicalFestivo);
  const extras = extraDiurna + extraNocturna;
  const recargos = recargoNocturno + recargoDominical;

  const baseAuxilio =
    p.baseTopeAuxilio === 'devengado'
      ? (salario + e.comisiones + extras + recargos) * factorMes
      : salarioBase;
  const auxilio =
    baseAuxilio <= p.topeAuxilioSMMLV * p.smmlv ? redondear((p.auxilioTransporte * i.diasLaborados) / 30) : 0;

  const totalDevengado =
    salario + incapacidad + vacaciones + auxilio + extras + recargos + e.comisiones + e.bonos;
  const ibc = redondear(Math.max(totalDevengado - auxilio, (p.smmlv * i.diasPeriodo) / 30));
  const ibcMensual = ibc * factorMes;

  const salud = redondear(ibc * p.trabajador.salud);
  const pension = redondear(ibc * p.trabajador.pension);
  const fondoSolidaridad = redondear(ibc * porcentajeSolidaridad(ibcMensual, p));
  const totalDeducciones = salud + pension + fondoSolidaridad;

  const exonerado =
    e.exoneracion && p.exoneracion114.activa && ibcMensual < p.exoneracion114.topeSMMLV * p.smmlv;
  const aportesEmpleador = {
    salud: exonerado ? 0 : redondear(ibc * p.empleador.salud),
    pension: redondear(ibc * p.empleador.pension),
    arl: redondear(ibc * p.empleador.arl[e.contrato.riesgoArl]),
    caja: redondear(ibc * p.empleador.caja),
    icbf: exonerado ? 0 : redondear(ibc * p.empleador.icbf),
    sena: exonerado ? 0 : redondear(ibc * p.empleador.sena),
  };
  const totalAportes = Object.values(aportesEmpleador).reduce((a, b) => a + b, 0);

  const basePrestaciones = salario + incapacidad + vacaciones + extras + recargos + e.comisiones + auxilio;
  const cesantias = redondear(basePrestaciones * p.provisiones.cesantias);
  const provisiones = {
    cesantias,
    interesesCesantias: redondear(cesantias * p.provisiones.interesesCesantiasAnual),
    prima: redondear(basePrestaciones * p.provisiones.prima),
    vacaciones: redondear((salario + e.comisiones) * p.provisiones.vacaciones),
  };
  const totalProvisiones = Object.values(provisiones).reduce((a, b) => a + b, 0);

  const desglose: DesgloseLaboral = {
    devengados: {
      salario,
      incapacidad,
      vacaciones,
      auxilioTransporte: auxilio,
      horasExtraDiurnas: extraDiurna,
      horasExtraNocturnas: extraNocturna,
      recargoNocturno,
      recargoDominicalFestivo: recargoDominical,
      comisiones: e.comisiones,
      bonos: e.bonos,
    },
    totalDevengado,
    ibc,
    deducciones: { salud, pension, fondoSolidaridad },
    totalDeducciones,
    aportesEmpleador,
    totalAportes,
    provisiones,
    totalProvisiones,
    exonerado114: exonerado,
  };
  return {
    desglose,
    neto: totalDevengado - totalDeducciones,
    costoEmpleador: totalDevengado + totalAportes + totalProvisiones,
    valorHora: vh,
  };
}

export interface EntradaPrestacion {
  contrato: Pick<Contrato, 'honorarios' | 'retencionFuente'>;
  insumos: InsumosLiquidacion;
  parametros: ParametrosNomina;
  comisiones: COP;
  pilaVerificada: boolean;
}

export interface ResultadoPrestacion {
  desglose: DesglosePrestacion;
  neto: COP;
  costoEmpleador: COP;
  /** Lo que le queda a la persona después de retención y su seguridad social (comparativo de W6). */
  loQueLeQueda: COP;
}

/** Prestación de servicios (6.20.6). */
export function liquidarPrestacion(e: EntradaPrestacion): ResultadoPrestacion {
  const p = e.parametros;
  const honorarios = e.contrato.honorarios ?? 0;
  const honorariosPeriodo = redondear((honorarios * e.insumos.diasLaborados) / 30);
  const totalBruto = honorariosPeriodo + e.comisiones;
  const retencion = redondear(
    totalBruto * (e.contrato.retencionFuente ?? p.prestacionServicios.retencionFuente),
  );
  const ibcContratista = redondear(honorarios * p.prestacionServicios.ibcPorcentaje);
  const neto = totalBruto - retencion;
  const factor = e.insumos.diasPeriodo > 0 ? e.insumos.diasLaborados / 30 : 1;
  const seguridadSocial = redondear(
    ibcContratista * factor * p.prestacionServicios.seguridadSocialContratista,
  );
  return {
    desglose: {
      honorarios: honorariosPeriodo,
      comisiones: e.comisiones,
      totalBruto,
      retencionFuente: retencion,
      pilaVerificada: e.pilaVerificada,
      ibcContratista,
    },
    neto,
    costoEmpleador: totalBruto,
    loQueLeQueda: neto - seguridadSocial,
  };
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Periodos quincenales o mensuales de un mes (la 2.ª quincena termina el último día). */
export function periodosDelMes(mes: MesISO, tipo: 'quincenal' | 'mensual'): PeriodoNomina[] {
  const nombreMes = MESES[Number(mes.slice(5, 7)) - 1] ?? '';
  const anio = mes.slice(0, 4);
  if (tipo === 'mensual') {
    return [
      {
        inicio: inicioMes(mes),
        fin: finMes(mes),
        tipo,
        etiqueta: `${nombreMes[0]?.toUpperCase()}${nombreMes.slice(1)} de ${anio}`,
      },
    ];
  }
  return [
    { inicio: inicioMes(mes), fin: `${mes}-15`, tipo, etiqueta: `1.ª quincena de ${nombreMes} de ${anio}` },
    { inicio: `${mes}-16`, fin: finMes(mes), tipo, etiqueta: `2.ª quincena de ${nombreMes} de ${anio}` },
  ];
}

/** Días comerciales del periodo: 15 por quincena, 30 por mes (también en febrero y meses de 31). */
export function diasComercialesPeriodo(periodo: Pick<PeriodoNomina, 'tipo'>): number {
  return periodo.tipo === 'quincenal' ? 15 : 30;
}

/** ¿El periodo cierra el mes? (las comisiones y la PILA se liquidan en ese periodo). */
export function cierraMes(periodo: Pick<PeriodoNomina, 'fin'>): boolean {
  return Number(periodo.fin.slice(8, 10)) === diasDelMes(periodo.fin.slice(0, 7));
}

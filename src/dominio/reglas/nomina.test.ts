import { describe, expect, it } from 'vitest';
import { PARAMETROS_NOMINA } from '@/config/nomina';
import type { ParametrosNomina } from '../tipos';
import {
  horasMes,
  insumosPactado,
  liquidarLaboral,
  liquidarPrestacion,
  periodosDelMes,
  porcentajeSolidaridad,
  valorHora,
} from './nomina';

const P = PARAMETROS_NOMINA;
const contrato = { salarioBase: 1_950_000, riesgoArl: 1 as const };
const FECHA = '2026-09-30';

function pactado(exoneracion: boolean) {
  return liquidarLaboral({
    contrato,
    insumos: insumosPactado(),
    parametros: P,
    exoneracion,
    comisiones: 0,
    bonos: 0,
    fecha: FECHA,
  });
}

describe('nómina laboral (6.20.5)', () => {
  it('divisor de la hora: 42 h → 210 h y $ 9.286 la hora; 44 h → 220 h', () => {
    expect(horasMes(P, FECHA)).toBe(210);
    expect(Math.round(valorHora(1_950_000, P, FECHA))).toBe(9_286);
    expect(horasMes(P, '2026-06-30')).toBe(220);
    const conDivisor: ParametrosNomina = { ...P, divisorHorasMes: 240 };
    expect(horasMes(conDivisor, FECHA)).toBe(240);
  });

  it('W6 "Salario pactado": costo exacto con y sin exoneración', () => {
    const con = pactado(true);
    const sin = pactado(false);
    expect(con.desglose.devengados.salario).toBe(1_950_000);
    expect(con.desglose.devengados.auxilioTransporte).toBe(249_095);
    expect(con.desglose.totalDevengado).toBe(2_199_095);
    expect(con.desglose.ibc).toBe(1_950_000);
    expect(con.desglose.totalAportes).toBe(322_179);
    expect(con.desglose.provisiones).toEqual({
      cesantias: 183_185,
      interesesCesantias: 21_982,
      prima: 183_185,
      vacaciones: 81_315,
    });
    expect(con.costoEmpleador).toBe(2_990_941);
    expect(sin.costoEmpleador).toBe(3_254_191);
    expect(sin.costoEmpleador - con.costoEmpleador).toBe(165_750 + 58_500 + 39_000);
    expect(con.desglose.exonerado114).toBe(true);
    expect(sin.desglose.exonerado114).toBe(false);
    expect(con.neto).toBe(2_199_095 - 78_000 - 78_000);
  });

  it('W6 "Este mes": la comisión es salario y genera aportes y prestaciones; con recargos ronda $ 4,2 millones', () => {
    // Recargo nocturno de sus cierres (≈ 1 h después de las 7 p. m., tres veces por semana).
    const insumos = { ...insumosPactado(), horasRecargoNocturno: 13 };
    const r = liquidarLaboral({
      contrato,
      insumos,
      parametros: P,
      exoneracion: true,
      comisiones: 817_639,
      bonos: 0,
      fecha: FECHA,
    });
    expect(r.desglose.devengados.comisiones).toBe(817_639);
    expect(r.desglose.devengados.recargoNocturno).toBe(Math.round(13 * (1_950_000 / 210) * 0.35));
    expect(r.desglose.provisiones.prima).toBeGreaterThan(pactado(true).desglose.provisiones.prima);
    expect(r.costoEmpleador).toBeGreaterThan(4_100_000);
    expect(r.costoEmpleador).toBeLessThan(4_300_000);
    // Con más comisión el devengado pasa de 2 SMMLV y se pierde el auxilio (base del tope = devengado).
    const alta = liquidarLaboral({
      contrato,
      insumos,
      parametros: P,
      exoneracion: true,
      comisiones: 1_700_000,
      bonos: 0,
      fecha: FECHA,
    });
    expect(alta.desglose.devengados.auxilioTransporte).toBe(0);
  });

  it('auxilio de transporte: con salario mínimo sí, con base "básico" y salario alto no', () => {
    const minimo = liquidarLaboral({
      contrato: { salarioBase: P.smmlv, riesgoArl: 2 },
      insumos: insumosPactado(),
      parametros: P,
      exoneracion: true,
      comisiones: 0,
      bonos: 0,
      fecha: FECHA,
    });
    expect(minimo.desglose.devengados.auxilioTransporte).toBe(249_095);
    const alto = liquidarLaboral({
      contrato: { salarioBase: 3_600_000, riesgoArl: 1 },
      insumos: insumosPactado(),
      parametros: { ...P, baseTopeAuxilio: 'basico' },
      exoneracion: true,
      comisiones: 0,
      bonos: 0,
      fecha: FECHA,
    });
    expect(alto.desglose.devengados.auxilioTransporte).toBe(0);
  });

  it('quincena: la mitad del salario y del auxilio, IBC mínimo proporcional', () => {
    const q = liquidarLaboral({
      contrato,
      insumos: insumosPactado(15),
      parametros: P,
      exoneracion: true,
      comisiones: 0,
      bonos: 0,
      fecha: FECHA,
    });
    expect(q.desglose.devengados.salario).toBe(975_000);
    expect(q.desglose.devengados.auxilioTransporte).toBe(124_548);
  });

  it('fondo de solidaridad desde 4 SMMLV y sin exoneración desde 10 SMMLV', () => {
    expect(porcentajeSolidaridad(3 * P.smmlv, P)).toBe(0);
    expect(porcentajeSolidaridad(5 * P.smmlv, P)).toBe(0.01);
    expect(porcentajeSolidaridad(25 * P.smmlv, P)).toBe(0.02);
    const gerente = liquidarLaboral({
      contrato: { salarioBase: 11 * P.smmlv, riesgoArl: 1 },
      insumos: insumosPactado(),
      parametros: P,
      exoneracion: true,
      comisiones: 0,
      bonos: 0,
      fecha: FECHA,
    });
    expect(gerente.desglose.exonerado114).toBe(false);
    expect(gerente.desglose.deducciones.fondoSolidaridad).toBe(Math.round(11 * P.smmlv * 0.01));
  });

  it('incapacidad con mínimo de un SMMLV diario', () => {
    const r = liquidarLaboral({
      contrato: { salarioBase: P.smmlv, riesgoArl: 1 },
      insumos: { ...insumosPactado(), diasLaborados: 27, diasIncapacidad: 3 },
      parametros: P,
      exoneracion: true,
      comisiones: 0,
      bonos: 0,
      fecha: FECHA,
    });
    expect(r.desglose.devengados.incapacidad).toBe(Math.round((P.smmlv / 30) * 3));
  });
});

describe('prestación de servicios (6.20.6)', () => {
  it('bruto, retención y lo que le queda a la persona (≈ 11,4 % de seguridad social)', () => {
    const r = liquidarPrestacion({
      contrato: { honorarios: 1_900_000, retencionFuente: null },
      insumos: insumosPactado(),
      parametros: P,
      comisiones: 0,
      pilaVerificada: true,
    });
    expect(r.desglose.totalBruto).toBe(1_900_000);
    expect(r.desglose.retencionFuente).toBe(190_000);
    expect(r.neto).toBe(1_710_000);
    expect(r.desglose.ibcContratista).toBe(760_000);
    expect(r.loQueLeQueda).toBe(1_710_000 - 216_600);
    expect(r.costoEmpleador).toBe(1_900_000);
  });
});

describe('periodos', () => {
  it('quincenas con etiqueta en español', () => {
    const [q1, q2] = periodosDelMes('2026-09', 'quincenal');
    expect(q1).toMatchObject({
      inicio: '2026-09-01',
      fin: '2026-09-15',
      etiqueta: '1.ª quincena de septiembre de 2026',
    });
    expect(q2).toMatchObject({ inicio: '2026-09-16', fin: '2026-09-30' });
    expect(periodosDelMes('2026-02', 'mensual')[0]?.fin).toBe('2026-02-28');
  });
});

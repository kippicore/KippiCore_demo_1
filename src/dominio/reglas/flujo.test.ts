import { describe, expect, it } from 'vitest';
import { PARAMETROS_OBLIGACIONES } from '@/config/obligaciones';
import { conjuntoFestivos } from './festivos';
import {
  egresosCuentasPorPagar,
  egresosNomina,
  egresosRecurrentes,
  ingresosSeparados,
  ingresosVentas,
  proyectarFlujo,
  vencimientosTributarios,
} from './flujo';

const festivos = conjuntoFestivos([2026, 2027]);
const HOY = '2026-09-30';

describe('flujo de caja (6.20.9)', () => {
  it('no duplica un recurrente que ya tiene su cuenta por pagar generada', () => {
    const recurrentes = [
      {
        id: 'arr',
        nombre: 'Arriendo Parque 93',
        valor: 18_500_000,
        diaDelMes: 1,
        diasPlazo: 4,
        desde: '2025-03',
        hasta: null,
        activo: true,
      },
    ];
    const sin = egresosRecurrentes({ hoy: HOY, dias: 90, recurrentes, generados: new Set() });
    expect(sin.map((m) => m.fecha)).toEqual(['2026-10-05', '2026-11-05', '2026-12-05']);
    const con = egresosRecurrentes({ hoy: HOY, dias: 90, recurrentes, generados: new Set(['arr|2026-10']) });
    expect(con.map((m) => m.fecha)).toEqual(['2026-11-05', '2026-12-05']);
  });

  it('nómina como se paga: neto en las quincenas, aportes solo en la PILA, prima y cesantías en sus fechas', () => {
    const movs = egresosNomina({
      hoy: HOY,
      dias: 150,
      netoQuincena: 14_000_000,
      netoMensual: 6_000_000,
      pilaMensual: 9_000_000,
      primaSemestral: 15_000_000,
      cesantiasAnuales: 30_000_000,
      interesesAnuales: 3_600_000,
      obligaciones: PARAMETROS_OBLIGACIONES,
      festivos,
      yaCausadas: new Set(),
    });
    const quincenas = movs.filter((m) => m.tipo === 'nomina_neto');
    expect(quincenas.map((m) => m.fecha)).toEqual([
      '2026-10-15',
      '2026-10-31',
      '2026-11-15',
      '2026-11-30',
      '2026-12-15',
      '2026-12-31',
      '2027-01-15',
      '2027-01-31',
      '2027-02-15',
    ]);
    expect(quincenas.every((m) => m.valor === -14_000_000 || m.valor === -20_000_000)).toBe(true);
    const pila = movs.filter((m) => m.tipo === 'pila');
    // PILA de septiembre: día hábil 10 de octubre (el 12 es festivo) → 15 de octubre.
    expect(pila[0]?.fecha).toBe('2026-10-15');
    expect(pila.every((m) => m.valor === -9_000_000)).toBe(true);
    expect(movs.filter((m) => m.tipo === 'prima').map((m) => m.fecha)).toEqual(['2026-12-20']);
    expect(movs.filter((m) => m.tipo === 'intereses').map((m) => m.fecha)).toEqual(['2027-01-31']);
    expect(movs.filter((m) => m.tipo === 'cesantias').map((m) => m.fecha)).toEqual(['2027-02-14']);
    const causada = egresosNomina({
      hoy: HOY,
      dias: 30,
      netoQuincena: 1,
      netoMensual: 0,
      pilaMensual: 9,
      primaSemestral: 0,
      cesantiasAnuales: 0,
      interesesAnuales: 0,
      obligaciones: PARAMETROS_OBLIGACIONES,
      festivos,
      yaCausadas: new Set(['pila|2026-10-15']),
    });
    expect(causada.some((m) => m.tipo === 'pila')).toBe(false);
  });

  it('el datáfono llega al día hábil siguiente y los separados se reparten hasta su fecha límite', () => {
    const cero = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const ventas = ingresosVentas({
      hoy: '2026-10-09',
      dias: 1,
      promedioContado: { ...cero, 6: 1_000_000 },
      promedioDatafonoNeto: { ...cero, 6: 2_000_000 },
      indiceMes: { 10: 1 },
      diasCerrados: [],
      festivos,
    });
    expect(ventas).toEqual([
      { fecha: '2026-10-10', valor: 1_000_000, tipo: 'ventas', concepto: 'Ventas de contado', refId: null },
      {
        fecha: '2026-10-13',
        valor: 2_000_000,
        tipo: 'datafono',
        concepto: 'Abono del datáfono',
        refId: null,
      },
    ]);
    const sep = ingresosSeparados(HOY, [{ ventaId: 'v', saldo: 100_000, fechaLimite: '2026-10-03' }]);
    expect(sep.reduce((s, m) => s + m.valor, 0)).toBe(100_000);
    expect(sep).toHaveLength(3);
  });

  it('serie diaria y punto bajo con los egresos de esa semana', () => {
    const r = proyectarFlujo({
      hoy: HOY,
      dias: 30,
      saldoInicial: 50_000_000,
      movimientos: [
        ...egresosCuentasPorPagar([
          { id: 'saldo', saldoCop: 58_065_000, fecha: '2026-10-14', concepto: 'Saldo a Hangzhou Lanxin' },
          { id: 'vencida', saldoCop: 500_000, fecha: '2026-09-20', concepto: 'Vencida' },
        ]),
        { fecha: '2026-10-10', valor: 40_000_000, tipo: 'ventas', concepto: 'Ventas', refId: null },
      ],
    });
    expect(r.serie).toHaveLength(30);
    expect(r.serie[0]?.egresos).toBe(500_000);
    expect(r.puntoBajo.fecha).toBe('2026-10-14');
    expect(r.puntoBajo.saldo).toBe(50_000_000 - 500_000 + 40_000_000 - 58_065_000);
    expect(r.semanaPuntoBajo.lunes).toBe('2026-10-12');
    expect(r.semanaPuntoBajo.egresos[0]?.refId).toBe('saldo');
  });

  it('vencimientos tributarios ilustrativos', () => {
    const v = vencimientosTributarios('2026-10-01', '2026-12-31', PARAMETROS_OBLIGACIONES);
    expect(v.filter((x) => x.tipo === 'retencion').map((x) => x.fecha)).toEqual([
      '2026-10-14',
      '2026-11-14',
      '2026-12-14',
    ]);
    expect(v.find((x) => x.tipo === 'iva')).toEqual({
      tipo: 'iva',
      fecha: '2026-11-14',
      periodo: ['2026-09', '2026-10'],
    });
    expect(v.find((x) => x.tipo === 'ica')?.fecha).toBe('2026-11-20');
  });
});

import { describe, expect, it } from 'vitest';
import { DIAS_CERRADOS } from '@/config/locales';
import { NOMBRES_OBLIGACIONES } from '@/config/obligaciones';
import { INDICE_MES } from '@/seed/estacionalidad';
import { proyeccionFlujoEstado } from '@/dominio/reglas/flujo-estado';
import { saldoCxP } from '@/dominio/reglas/cuentas';
import { construida, planDe } from './utilidades';

/**
 * flujo.test.ts (PLAN 6.20.9, 7.10, 7.14): sin duplicar recurrentes con su cuenta por pagar, aportes solo en la
 * PILA, prima, cesantías e intereses en sus fechas, cuentas que se pagan a tiempo y punto bajo en rango.
 */
const A = '2026-09-30';

describe('plata generada y flujo de caja', () => {
  const e = construida(A, '15:30');

  it('cada gasto recurrente se causa una sola vez por mes y nunca con fecha futura', () => {
    const vistos = new Map<string, number>();
    for (const g of Object.values(e.gastos)) {
      if (!g.recurrenteId) continue;
      const k = `${g.recurrenteId}|${g.fecha.slice(0, 7)}`;
      vistos.set(k, (vistos.get(k) ?? 0) + 1);
      expect(g.fecha <= A, g.id).toBe(true);
    }
    expect([...vistos.values()].every((n) => n === 1)).toBe(true);
    expect(vistos.size).toBeGreaterThan(18 * 10);
  });

  it('los aportes a seguridad social solo están en la PILA (cuenta por pagar de la liquidación que cierra el mes)', () => {
    for (const c of Object.values(e.cuentasPorPagar)) {
      if (c.categoria !== 'seguridad_social') continue;
      expect(c.documento?.tipo, c.id).toBe('liquidacion');
      const l = e.liquidaciones[c.documento?.id ?? ''];
      expect(l?.periodo.fin.slice(8), c.id).not.toBe('15');
    }
    for (const g of Object.values(e.gastos))
      if (g.categoria === 'seguridad_social') expect(g.documento?.tipo, g.id).toBe('liquidacion');
  });

  it('prima, cesantías e intereses se causan y pagan en sus fechas ilustrativas', () => {
    const ob = e.parametros.obligaciones;
    const prest = Object.values(e.cuentasPorPagar).filter((c) => c.categoria === 'prestaciones');
    const fechas = (nombre: string) => prest.filter((c) => c.concepto.startsWith(nombre)).map((c) => c.fechaVencimiento.slice(5));
    expect(fechas(NOMBRES_OBLIGACIONES.prima).sort()).toEqual(expect.arrayContaining([...ob.primaFechas]));
    expect(fechas(NOMBRES_OBLIGACIONES.cesantias)).toContain(ob.cesantiasFecha);
    expect(fechas(NOMBRES_OBLIGACIONES.interesesCesantias)).toContain(ob.interesesCesantiasFecha);
    for (const c of prest) expect(saldoCxP(c), c.id).toBe(0);
  });

  it('las cuentas del generador se pagan a tiempo (salvo 1–2 vencidas pequeñas al ancla) y la PILA en el día hábil 10', () => {
    const plan = planDe(A);
    const vencidas = Object.values(e.cuentasPorPagar).filter((c) => !c.eliminadoEn && c.fechaVencimiento < A && saldoCxP(c) > 0);
    expect(vencidas.length).toBeLessThanOrEqual(2);
    for (const c of vencidas) expect(c.moneda === 'COP' && c.valor <= 4_000_000, c.id).toBe(true);
    const pila = Object.values(e.cuentasPorPagar).filter((c) => c.categoria === 'seguridad_social');
    expect(pila.length).toBeGreaterThan(30);
    for (const c of pila) {
      expect(c.fechaVencimiento).toBe(plan.calendario.diaHabilDelMes(c.fechaVencimiento.slice(0, 7), 10));
      const pago = c.abonos[0];
      if (pago) expect(pago.ts.slice(0, 10)).toBe(c.fechaVencimiento);
    }
  });

  it('obligaciones tributarias ilustrativas: retención mensual, IVA e ICA bimestrales', () => {
    const imp = Object.values(e.cuentasPorPagar).filter((c) => c.categoria === 'impuestos');
    const cuenta = (n: string) => imp.filter((c) => c.concepto.startsWith(n)).length;
    expect(cuenta(NOMBRES_OBLIGACIONES.retencion)).toBeGreaterThanOrEqual(17);
    expect(cuenta(NOMBRES_OBLIGACIONES.iva)).toBeGreaterThanOrEqual(8);
    expect(cuenta(NOMBRES_OBLIGACIONES.ica)).toBeGreaterThanOrEqual(8);
  });

  it('punto bajo de los próximos 90 días entre $ 10 y $ 30 millones, nunca negativo (P19, N13)', () => {
    const f = proyeccionFlujoEstado(e, {
      hoy: A,
      hora: '15:30',
      dias: 90,
      indiceMes: INDICE_MES,
      diasCerrados: DIAS_CERRADOS,
      festivos: planDe(A).calendario.festivos,
    });
    expect(f.puntoBajo.saldo).toBeGreaterThanOrEqual(10_000_000);
    expect(f.puntoBajo.saldo).toBeLessThanOrEqual(30_000_000);
    expect(f.serie.every((p) => p.saldo > 0)).toBe(true);
    // La semana del punto bajo tiene egresos que el selector puede explicar (el saldo a la fábrica, la PILA…).
    expect(f.semanaPuntoBajo.egresos.length).toBeGreaterThan(0);
  });
});

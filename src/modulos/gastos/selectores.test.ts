import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { activarVerificacionDeTablas, selEstadoResultados, selGastos, selPuntoEquilibrio, selResumenGastos } from '@/selectores';
import { estadoDe, HOY } from '@/selectores/pruebas/construir';
import {
  selEquilibrioLocales,
  selGastoPorId,
  selGastosDeRecurrente,
  selGastosPorLocal,
  selIvaGastosDescontable,
  selOpcionesGasto,
  selRecurrentes,
  selResultadosPorLocal,
  selResumenCategorias,
  selSerieUtilidad,
  selTarifaIva,
} from './selectores';

/** Los selectores locales de B4 componen los del dominio: aquí se comprueba que sus cifras cuadran con ellos. */
const MES = '2026-09';
const e = estadoDe();

beforeAll(() => activarVerificacionDeTablas(true));
afterAll(() => activarVerificacionDeTablas(false));

describe('selResultadosPorLocal', () => {
  it('cada local y el total salen de selEstadoResultados', () => {
    const v = selResultadosPorLocal(e, { mes: MES, prorratear: false });
    expect(v.locales.map((x) => x.local.id)).toEqual(['p93', 'usq', 'zr']);
    for (const x of v.locales) {
      expect(x.er).toEqual(selEstadoResultados(e, { desde: '2026-09-01', hasta: '2026-09-30', localId: x.local.id, prorratear: false }));
    }
    expect(v.total).toEqual(selEstadoResultados(e, { desde: '2026-09-01', hasta: '2026-09-30', localId: 'todos', prorratear: false }));
  });

  it('las ventas de los tres locales suman las del negocio y la cascada cuadra', () => {
    const v = selResultadosPorLocal(e, { mes: MES, prorratear: false });
    expect(v.locales.reduce((a, x) => a + x.er.ventasNetas, 0)).toBe(v.total.ventasNetas);
    expect(v.locales.reduce((a, x) => a + x.er.costoVentas, 0)).toBe(v.total.costoVentas);
    for (const er of [v.total, ...v.locales.map((x) => x.er)]) {
      expect(er.ventasNetas - er.costoVentas).toBe(er.utilidadBruta);
      expect(er.utilidadBruta - er.gastosOperativos - er.gastosGeneralesProrrateados).toBe(er.utilidadOperativa);
    }
  });

  it('sin repartir, la utilidad de los locales menos lo que no tienen asignado da la del negocio', () => {
    const v = selResultadosPorLocal(e, { mes: MES, prorratear: false });
    expect(v.sinAsignar).toBeGreaterThan(0);
    const suma = v.locales.reduce((a, x) => a + x.er.utilidadOperativa, 0) - v.sinAsignar;
    expect(suma).toBe(v.total.utilidadOperativa);
  });

  it('repartiendo, los generales y la bodega quedan en los locales: nada sin asignar y la suma es el negocio', () => {
    const sin = selResultadosPorLocal(e, { mes: MES, prorratear: false });
    const con = selResultadosPorLocal(e, { mes: MES, prorratear: true });
    expect(con.locales.every((x) => x.er.gastosGeneralesProrrateados > 0)).toBe(true);
    const bodega = selGastos(e, { desde: '2026-09-01', hasta: '2026-09-30', localId: 'bod' }).filas.reduce((a, g) => a + g.valor - g.iva, 0);
    expect(bodega).toBeGreaterThan(0);
    // Sin repartir, la bodega y los generales quedan aparte; repartiendo, solo el residuo del redondeo (que se ignora).
    expect(sin.sinAsignar).toBeGreaterThanOrEqual(bodega);
    expect(con.sinAsignar).toBe(0);
    const suma = con.locales.reduce((a, x) => a + x.er.utilidadOperativa, 0);
    expect(Math.abs(suma - con.total.utilidadOperativa)).toBeLessThanOrEqual(3);
  });
});

describe('selSerieUtilidad', () => {
  it('trae doce meses ordenados, uno por local, y el último coincide con el estado de resultados', () => {
    const s = selSerieUtilidad(e, { hasta: MES, meses: 12, prorratear: false });
    expect(s.filas).toHaveLength(12);
    expect(s.filas[0]!.mes).toBe('2025-10');
    expect(s.filas.at(-1)!.mes).toBe(MES);
    const usq = selEstadoResultados(e, { desde: '2026-09-01', hasta: '2026-09-30', localId: 'usq', prorratear: false }).utilidadOperativa;
    expect(s.filas.at(-1)!.usq).toBe(usq);
  });
});

describe('selEquilibrioLocales', () => {
  it('sin repartir coincide con selPuntoEquilibrio de cada local y del negocio', () => {
    const filas = selEquilibrioLocales(e, { mes: MES, repartirGenerales: false });
    expect(filas.map((f) => f.id)).toEqual(['p93', 'usq', 'zr', 'todos']);
    for (const f of filas) {
      const p = selPuntoEquilibrio(e, { localId: f.id, mes: MES });
      expect(f.gastosFijos).toBe(p.gastosFijos);
      expect(f.ventasEquilibrio).toBe(p.ventasEquilibrio);
      expect(f.ventasNetasMes).toBe(p.ventasNetasMes);
      expect(f.generalesRepartidos).toBe(0);
    }
  });

  it('repartiendo los generales sube el mínimo de cada local con la misma fórmula', () => {
    const sin = selEquilibrioLocales(e, { mes: MES, repartirGenerales: false });
    const con = selEquilibrioLocales(e, { mes: MES, repartirGenerales: true });
    for (const f of con.filter((x) => x.id !== 'todos')) {
      const antes = sin.find((x) => x.id === f.id)!;
      expect(f.generalesRepartidos).toBeGreaterThan(0);
      expect(f.gastosFijos).toBe(antes.gastosFijos + f.generalesRepartidos);
      expect(f.ventasEquilibrio).toBe(Math.round(f.gastosFijos / f.margenBruto));
    }
    expect(con.find((x) => x.id === 'todos')).toEqual(sin.find((x) => x.id === 'todos'));
  });

  it('el día de equilibrio cae dentro del mes cuando las ventas superan el mínimo', () => {
    for (const f of selEquilibrioLocales(e, { mes: MES, repartirGenerales: false })) {
      if (f.ventasEquilibrio !== null && f.ventasNetasMes >= f.ventasEquilibrio) {
        expect(f.diaEquilibrio).not.toBeNull();
        expect(f.diaEquilibrio!.startsWith(MES)).toBe(true);
      }
    }
  });
});

describe('gastos', () => {
  it('selGastosPorLocal (con la bodega y lo general) suma lo mismo que el resumen por categoría del negocio', () => {
    const p = selGastosPorLocal(e, { mes: MES });
    const r = selResumenGastos(e, { mes: MES, localId: 'todos' });
    expect(p.total).toBe(r.total);
    expect(p.totalAnterior).toBe(r.totalAnterior);
    expect(p.filas.map((f) => f.localId)).toEqual(expect.arrayContaining(['p93', 'usq', 'zr', 'bod', null]));
  });

  it('selResumenCategorias delega en el dominio y resume los generales por su cuenta', () => {
    expect(selResumenCategorias(e, { mes: MES, localId: 'usq' })).toEqual(selResumenGastos(e, { mes: MES, localId: 'usq' }));
    const g = selResumenCategorias(e, { mes: MES, localId: 'general' });
    expect(g.total).toBe(selGastos(e, { desde: '2026-09-01', hasta: '2026-09-30', localId: 'general' }).total);
    expect(g.categorias.reduce((a, c) => a + c.actual, 0)).toBe(g.total);
    expect(g.categorias.map((c) => c.actual)).toEqual([...g.categorias.map((c) => c.actual)].sort((a, b) => b - a));
  });

  it('selGastoPorId encuentra un gasto y devuelve null si no existe', () => {
    const uno = selGastos(e, { desde: '2026-09-01', hasta: '2026-09-30' }).filas[0]!;
    expect(selGastoPorId(e, { gastoId: uno.id })?.concepto).toBe(uno.concepto);
    expect(selGastoPorId(e, { gastoId: 'no_existe' })).toBeNull();
  });

  it('las opciones del formulario no ofrecen la cuenta puente ni proveedores de mercancía', () => {
    const o = selOpcionesGasto(e);
    expect(o.cuentas.some((c) => c.cuenta.tipo === 'puente')).toBe(false);
    expect(o.cuentas.length).toBeGreaterThan(0);
    expect(o.proveedores.every((p) => p.tipo === 'local')).toBe(true);
    expect(o.locales.map((l) => l.id)).toEqual(['p93', 'usq', 'zr', 'bod']);
  });

  it('parámetros: tarifa del IVA e IVA descontable', () => {
    expect(selTarifaIva(e)).toBe(e.parametros.impuestos.ivaGeneral);
    expect(selIvaGastosDescontable(e)).toBe(e.parametros.impuestos.ivaGastosDescontable);
  });
});

describe('selRecurrentes', () => {
  it('en el mes del ancla todo lo que ya le tocaba está generado (el generador lo causa hasta hoy)', () => {
    const v = selRecurrentes(e, { mes: MES, hoy: HOY });
    expect(v.filas.length).toBe(Object.values(e.gastosRecurrentes).filter((r) => !r.eliminadoEn).length);
    expect(v.porGenerar).toHaveLength(0);
    expect(v.valorPorGenerar).toBe(0);
    expect(v.filas.filter((f) => f.recurrente.activo).every((f) => f.estado === 'generado' || f.estado === 'proximo')).toBe(true);
  });

  it('el total mensual suma los activos y cada fila cuenta sus gastos generados', () => {
    const v = selRecurrentes(e, { mes: MES, hoy: HOY });
    expect(v.totalMensual).toBe(v.filas.filter((f) => f.recurrente.activo).reduce((a, f) => a + f.recurrente.valor, 0));
    const arriendo = v.filas.find((f) => f.recurrente.nombre === 'Arriendo Usaquén')!;
    expect(arriendo.generados).toBeGreaterThan(12);
    expect(arriendo.generados).toBe(selGastosDeRecurrente(e, { recurrenteId: arriendo.recurrente.id }));
    expect(arriendo.gastoDelMesId).not.toBeNull();
    expect(arriendo.localNombre).toBe('Usaquén');
  });

  it('un mes sin generar muestra lo que falta: antes de marzo de 2025 está fuera de vigencia', () => {
    const v = selRecurrentes(e, { mes: '2025-01', hoy: HOY });
    expect(v.filas.every((f) => f.estado === 'fuera_de_vigencia' || f.estado === 'pausado')).toBe(true);
  });

  it('un mes posterior al ancla: sin generar y con fecha ya pasada queda "por generar"', () => {
    const v = selRecurrentes(e, { mes: '2026-10', hoy: '2026-10-20' });
    const activos = v.filas.filter((f) => f.recurrente.activo);
    expect(activos.length).toBeGreaterThan(0);
    // Con la fecha del 20 de octubre toca todo lo que cae del 1 al 20 y falta lo de después.
    for (const f of activos) expect(f.estado).toBe(f.fechaPrevista <= '2026-10-20' ? 'por_generar' : 'proximo');
    expect(v.porGenerar.length).toBe(activos.filter((f) => f.fechaPrevista <= '2026-10-20').length);
    expect(v.valorPorGenerar).toBe(v.porGenerar.reduce((a, f) => a + f.recurrente.valor, 0));
  });
});

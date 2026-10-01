import {
  activarVerificacionDeTablas,
  hechosEnFechas,
  selComparativoLocales,
  selKpisInicio,
  selLocalesQueVenden,
  selSinMovimiento,
  selTopProductos,
  selVentas,
} from '@/selectores';
import { AHORA, estadoDe, HOY } from '@/selectores/pruebas/construir';
import { sumarDias } from '@/dominio/reglas/fechas';
import { lectura30Dias } from './calculos';
import { selDormidosInicio, selLocalesInicio, selTopInicio, selVentas30Dias } from './selectores';

const e = estadoDe();

beforeAll(() => activarVerificacionDeTablas(true));
afterAll(() => activarVerificacionDeTablas(false));

describe('selVentas30Dias (gráfico de Inicio)', () => {
  const v = selVentas30Dias(e, { hoy: HOY });
  it('trae 30 días terminando hoy y los locales que venden', () => {
    expect(v.dias).toHaveLength(30);
    expect(v.dias.at(-1)?.fecha).toBe(HOY);
    expect(v.locales.map((l) => l.id).sort()).toEqual(selLocalesQueVenden(e).map((l) => l.id).sort());
  });
  it('la suma de las barras cuadra con la suma directa de las ventas (selVentas)', () => {
    const t = selVentas(e, { desde: sumarDias(HOY, -29), hasta: HOY }).totales;
    expect(lectura30Dias(v.dias, v.locales).total).toBe(t.netas);
  });
  it('cada día suma lo de sus locales', () => {
    for (const d of v.dias) expect(Object.values(d.porLocal).reduce((a, x) => a + x, 0)).toBe(d.total);
  });
});

describe('selTopInicio', () => {
  const rango = { desde: `${HOY.slice(0, 7)}-01`, hasta: HOY, localId: 'todos' as const, medida: 'unidades' as const, n: 5 };
  const top = selTopInicio(e, rango);
  it('son los mismos cinco de selTopProductos, con su prenda', () => {
    const base = selTopProductos(e, { ...rango, orden: 'mas' });
    expect(top.map((t) => t.productoId)).toEqual(base.map((t) => t.productoId));
    expect(top).toHaveLength(5);
    for (const t of top) {
      expect(t.prenda?.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(t.prenda?.tipo).toBeTruthy();
    }
  });
  it('respeta el local: las unidades de un local no superan las de todos', () => {
    const usq = selTopInicio(e, { ...rango, localId: 'usq' });
    expect(usq.length).toBeGreaterThan(0);
    const todos = selTopProductos(e, { ...rango, n: 500, orden: 'mas' });
    for (const t of usq) expect(t.unidades).toBeLessThanOrEqual(todos.find((x) => x.productoId === t.productoId)?.unidades ?? 0);
  });
});

describe('selDormidosInicio', () => {
  it('con todos los locales es el selector compartido', () => {
    const d = selDormidosInicio(e, { dias: 60, hoy: HOY, localId: 'todos', n: 5 });
    const base = selSinMovimiento(e, { dias: 60, hoy: HOY });
    expect(d.total).toBe(base.length);
    expect(d.items.map((x) => x.productoId)).toEqual(base.slice(0, 5).map((x) => x.productoId));
    expect(d.aCosto).toBe(base.reduce((a, x) => a + x.aCosto, 0));
  });
  it('con un local solo cuenta lo que tiene existencias allí y no vendió allí en 60 días', () => {
    const d = selDormidosInicio(e, { dias: 60, hoy: HOY, localId: 'usq', n: 500 });
    const desde = sumarDias(HOY, -60);
    // Las devoluciones (cantidad negativa) no cuentan como venta en el local.
    const vendidosAhi = new Set(hechosEnFechas(e, { desde, hasta: HOY }).filter((h) => h.localId === 'usq' && h.cantidad > 0).map((h) => h.productoId));
    for (const x of d.items) {
      expect(vendidosAhi.has(x.productoId)).toBe(false);
      expect(x.unidades).toBeGreaterThan(0);
    }
    expect(d.items.every((x, i, a) => i === 0 || (a[i - 1]?.aCosto ?? 0) >= x.aCosto)).toBe(true);
  });
});

describe('selLocalesInicio', () => {
  it('trae el comparativo con el id del último cierre de cada local', () => {
    const filas = selLocalesInicio(e, { mes: HOY.slice(0, 7), hoy: HOY });
    const base = selComparativoLocales(e, { mes: HOY.slice(0, 7), hoy: HOY });
    expect(filas.map((f) => f.localId)).toEqual(base.map((f) => f.localId));
    for (const f of filas) {
      if (f.ultimoCierre) expect(e.sesionesCaja[f.cierreSesionId ?? '']?.localId).toBe(f.localId);
    }
  });
  it('las ventas del mes de los locales suman las de la tarjeta "Ventas del mes"', () => {
    const filas = selLocalesInicio(e, { mes: HOY.slice(0, 7), hoy: HOY });
    const kpis = selKpisInicio(e, { localId: 'todos', ahora: AHORA });
    expect(filas.reduce((a, f) => a + f.resumen.netas, 0)).toBe(kpis.mes.netas);
  });
});

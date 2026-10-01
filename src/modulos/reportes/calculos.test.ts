import { beforeAll, describe, expect, it } from 'vitest';
import type { EstadoDominio } from '@/dominio/tipos';
import { hojasParaExportar, IDS_REPORTES, REPORTES } from '@/reportes';
import { selLiquidaciones, selLocales, selVentas } from '@/selectores';
import { estadoDe, AHORA, HOY } from '@/selectores/pruebas/construir';
import {
  armarFiltros,
  empleadosDeLiquidacion,
  estaVacio,
  FILAS_VISTA_PREVIA,
  formatearCelda,
  gruposPermitidos,
  liquidacionParaDesprendibles,
  opcionesLiquidacion,
  opcionesLocal,
  reportesPermitidos,
  resolverLocal,
  resolverReporte,
  resumirHojas,
} from './calculos';
import { GRUPOS } from './textos';

let e: EstadoDominio;
beforeAll(() => {
  e = estadoDe();
});

describe('qué ve cada rol', () => {
  it('el dueño ve los 13 y los grupos cubren los 12 que no son el del contador', () => {
    expect(reportesPermitidos('dueno')).toHaveLength(13);
    const enGrupos = GRUPOS.flatMap((g) => g.ids);
    expect(new Set(enGrupos).size).toBe(12);
    expect([...enGrupos, 'contador'].sort()).toEqual([...IDS_REPORTES].sort());
  });

  it('la bodega solo ve inventario y kárdex', () => {
    expect(reportesPermitidos('bodega').sort()).toEqual(['inventario', 'kardex']);
    expect(
      gruposPermitidos('bodega')
        .flatMap((g) => g.ids)
        .sort(),
    ).toEqual(['inventario', 'kardex']);
  });

  it('?reporte= válido abre ese reporte; desconocido o sin permiso abre el primero y lo explica', () => {
    expect(resolverReporte('nomina', 'dueno')).toEqual({ id: 'nomina', motivo: null });
    expect(resolverReporte('contador', 'dueno')).toEqual({ id: 'contador', motivo: null });
    expect(resolverReporte(null, 'dueno')).toEqual({ id: 'ventas', motivo: null });
    expect(resolverReporte('no-existe', 'dueno')).toEqual({ id: 'ventas', motivo: 'desconocido' });
    expect(resolverReporte('nomina', 'bodega')).toEqual({ id: 'inventario', motivo: 'sin_permiso' });
    expect(resolverReporte('kardex', 'bodega')).toEqual({ id: 'kardex', motivo: null });
  });
});

describe('local de cada reporte', () => {
  it('la bodega solo se ofrece en inventario y kárdex', () => {
    const locales = selLocales(e, { incluirBodega: true });
    expect(opcionesLocal('ventas', locales).map((o) => o.valor)).not.toContain('bod');
    expect(opcionesLocal('inventario', locales).map((o) => o.valor)).toContain('bod');
    expect(opcionesLocal('kardex', locales).map((o) => o.valor)).toContain('bod');
  });

  it('resuelve: el elegido, si no el de la barra superior, y si el reporte no lo ofrece, todos', () => {
    const ops = opcionesLocal('ventas', selLocales(e, { incluirBodega: true }));
    expect(resolverLocal(ops, 'usq', 'p93')).toBe('usq');
    expect(resolverLocal(ops, null, 'p93')).toBe('p93');
    expect(resolverLocal(ops, null, 'bod')).toBe('todos');
    expect(resolverLocal(ops, 'bod', 'todos')).toBe('todos');
  });
});

describe('filtros que viajan a la definición', () => {
  const base = { rango: { desde: '2026-08-01', hasta: '2026-08-31' }, localId: 'usq', hoy: HOY, ahora: AHORA, rol: 'dueno' as const, productoId: 'p1', liquidacionId: 'liq1' };
  it('un reporte sin fechas o sin local no los recibe', () => {
    const inv = armarFiltros('inventario', base);
    expect(inv.desde).toBe(`${HOY.slice(0, 7)}-01`);
    expect(inv.localId).toBe('usq');
    const imp = armarFiltros('importaciones', base);
    expect(imp.localId).toBe('todos');
    expect(imp.desde).toBe('2026-08-01');
  });
  it('referencia solo en el kárdex y periodo solo en nómina ("todas" = por fechas)', () => {
    expect(armarFiltros('kardex', base).productoId).toBe('p1');
    expect(armarFiltros('ventas', base).productoId).toBeNull();
    expect(armarFiltros('nomina', base).liquidacionId).toBe('liq1');
    expect(armarFiltros('nomina', { ...base, liquidacionId: 'todas' }).liquidacionId).toBeNull();
    expect(armarFiltros('gastos', base).liquidacionId).toBeNull();
  });
});

describe('vista previa = definición única', () => {
  const rango = { desde: '2026-09-01', hasta: HOY };
  const filtros = armarFiltros('ventas', { rango, localId: 'todos', hoy: HOY, ahora: AHORA, rol: 'dueno' });

  it('recorta a las primeras filas pero cuenta y suma todas (= selVentas)', () => {
    const hojas = hojasParaExportar('ventas', e, filtros, { moneda: 'COP', tasa: 1 });
    const vista = resumirHojas(hojas, 'COP');
    const s = selVentas(e, { desde: rango.desde, hasta: rango.hasta, localId: 'todos' });
    const det = vista[0];
    expect(det?.nombre).toBe('Ventas detalladas');
    expect(det?.filas).toHaveLength(FILAS_VISTA_PREVIA);
    expect(det?.totalFilas).toBe(s.filas.length);
    expect(det?.totales?.total).toBe(formatearCelda(s.totales.ventas, 'moneda', 'COP'));
    expect(vista[1]?.totales?.netas).toBe(formatearCelda(s.totales.netas, 'moneda', 'COP'));
  });

  it('en dólares muestra lo mismo que escribe el archivo', () => {
    const hojas = hojasParaExportar('ventas', e, filtros, { moneda: 'USD', tasa: 4000 });
    const det = resumirHojas(hojas, 'USD')[0];
    expect(det?.filas[0]?.celdas.total).toMatch(/^US\$/);
    expect(det?.totales?.total).toMatch(/^US\$/);
  });

  it('los totales no aditivos del kárdex salen como el archivo (saldo final fijo)', () => {
    const f = armarFiltros('kardex', { rango, localId: 'todos', hoy: HOY, ahora: AHORA, rol: 'dueno', productoId: e.meta.narrativa.productoOxford });
    const hoja = hojasParaExportar('kardex', e, f, { moneda: 'COP', tasa: 1 })[0];
    const vista = resumirHojas(hoja ? [hoja] : [], 'COP')[0];
    expect(vista?.totales?.saldo).toBe(formatearCelda(hoja?.totales?.saldo as number, 'entero', 'COP'));
  });

  it('todos los reportes arman vista previa y el contador trae sus hojas', () => {
    for (const id of IDS_REPORTES) {
      const f = armarFiltros(id, { rango, localId: 'todos', hoy: HOY, ahora: AHORA, rol: 'dueno', productoId: e.meta.narrativa.productoOxford });
      const vista = resumirHojas(hojasParaExportar(id, e, f, { moneda: 'COP', tasa: 1 }), 'COP');
      expect(vista.length, id).toBeGreaterThan(0);
      for (const h of vista) expect(h.filas.length).toBeLessThanOrEqual(FILAS_VISTA_PREVIA);
    }
    expect(REPORTES.contador.hojas(e, armarFiltros('contador', { rango, localId: 'todos', hoy: HOY, ahora: AHORA, rol: 'dueno' })).length).toBeGreaterThanOrEqual(5);
  });

  it('un rango sin movimiento sale vacío', () => {
    const f = armarFiltros('ventas', { rango: { desde: '2020-01-01', hasta: '2020-01-02' }, localId: 'todos', hoy: HOY, ahora: AHORA, rol: 'dueno' });
    expect(estaVacio(resumirHojas(hojasParaExportar('ventas', e, f, { moneda: 'COP', tasa: 1 }), 'COP'))).toBe(true);
  });
});

describe('formato de celdas (la misma regla del PDF)', () => {
  it('vacíos, fechas, enteros, porcentajes y dinero', () => {
    expect(formatearCelda(null, 'moneda', 'COP')).toBe('—');
    expect(formatearCelda('2026-09-30', 'fecha', 'COP')).toBe('30/09/2026');
    expect(formatearCelda(1234, 'entero', 'COP')).toBe('1.234');
    expect(formatearCelda(0.19, 'porcentaje', 'COP')).toContain('19');
    expect(formatearCelda(1250000, 'moneda', 'COP')).toBe('$ 1.250.000');
    expect(formatearCelda('Camisa', 'texto', 'COP')).toBe('Camisa');
  });
});

describe('desprendibles', () => {
  it('toma la elegida o la más reciente del rango y lista a su gente', () => {
    const liqs = selLiquidaciones(e);
    const ultima = liqs[0];
    expect(ultima).toBeDefined();
    if (!ultima) return;
    expect(opcionesLiquidacion(liqs)[0]?.valor).toBe('todas');
    expect(opcionesLiquidacion(liqs)).toHaveLength(liqs.length + 1);
    expect(liquidacionParaDesprendibles(liqs, ultima.id, { desde: '2020-01-01', hasta: '2020-01-02' }, 'todos')?.id).toBe(ultima.id);
    const enRango = liquidacionParaDesprendibles(liqs, 'todas', { desde: '2026-09-01', hasta: HOY }, 'todos');
    expect(enRango).not.toBeNull();
    expect(enRango && enRango.periodo.fin >= '2026-09-01' && enRango.periodo.fin <= HOY).toBe(true);
    expect(liquidacionParaDesprendibles(liqs, 'todas', { desde: '2020-01-01', hasta: '2020-01-02' }, 'todos')).toBeNull();
    expect(empleadosDeLiquidacion(ultima, 'todos')).toHaveLength(ultima.lineas.length);
  });
});

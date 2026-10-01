import {
  activarVerificacionDeTablas,
  selCierresDelDia,
  selKpisInicio,
  selResumenSesion,
  selSolicitudesPendientes,
  selVentas,
  selVentasPorDia,
} from '@/selectores';
import { AHORA, estadoDe, HOY } from '@/selectores/pruebas/construir';
import { sumarDias } from '@/dominio/reglas/fechas';
import {
  nombreCorto,
  selCierresApp,
  selCifraHoy,
  selCriticoApp,
  selDetalleCierre,
  selDetalleVentaApp,
  selInventarioApp,
  selMetaMes,
  selPeriodoVentas,
  selProductoApp,
  selSolicitudesApp,
  selVentasPorHora,
  selVentasPorLocal,
} from './selectores';

const e = estadoDe();

beforeAll(() => activarVerificacionDeTablas(true));
afterAll(() => activarVerificacionDeTablas(false));

describe('cifra de Hoy', () => {
  it('es la misma tarjeta "Ventas de hoy" de Inicio (valor, variación y comparación)', () => {
    const c = selCifraHoy(e, { ahora: AHORA, localId: 'todos' });
    const k = selKpisInicio(e, { localId: 'todos', ahora: AHORA });
    expect(c.antesDeAbrir).toBe(k.antesDeAbrir);
    expect(c.valor).toBe(k.tarjetas[0]?.valor);
    expect(c.variacion).toBe(k.tarjetas[0]?.variacion);
    expect(c.comparacion).toBe(k.tarjetas[0]?.comparacion);
  });
  it('respeta el local', () => {
    const c = selCifraHoy(e, { ahora: AHORA, localId: 'usq' });
    const k = selKpisInicio(e, { localId: 'usq', ahora: AHORA });
    expect(c.valor).toBe(k.tarjetas[0]?.valor);
  });
  it('antes de abrir muestra ayer, como Inicio', () => {
    const temprano = `${HOY}T07:00:00`;
    const c = selCifraHoy(e, { ahora: temprano, localId: 'todos' });
    const k = selKpisInicio(e, { localId: 'todos', ahora: temprano });
    expect(c.antesDeAbrir).toBe(true);
    expect(c.valor).toBe(k.tarjetas[0]?.valor);
    expect(c.detalle).toBe(k.tarjetas[0]?.detalle);
  });
});

describe('ventas por hora y por local', () => {
  it('las horas suman lo vendido en el día (cuadra con selVentas)', () => {
    const horas = selVentasPorHora(e, { fecha: HOY, localId: 'todos' });
    const t = selVentas(e, { desde: HOY, hasta: HOY }).totales;
    expect(horas.reduce((a, h) => a + h.netas, 0)).toBe(t.netas);
  });
  it('con hastaHora no pasa de la hora actual', () => {
    const horas = selVentasPorHora(e, { fecha: HOY, localId: 'todos', hastaHora: 15 });
    expect(Math.max(...horas.map((h) => h.hora))).toBeLessThanOrEqual(15);
  });
  it('los tres locales suman el total', () => {
    const l = selVentasPorLocal(e, { desde: HOY, hasta: HOY });
    expect(l).toHaveLength(3);
    expect(l.reduce((a, x) => a + x.resumen.netas, 0)).toBe(selVentas(e, { desde: HOY, hasta: HOY }).totales.netas);
  });
  it('la meta del mes sale del comparativo de locales', () => {
    const m = selMetaMes(e, { mes: HOY.slice(0, 7), hoy: HOY, localId: 'todos' });
    expect(m.netas).toBeGreaterThan(0);
    if (m.meta) expect(m.cumplimiento).toBeCloseTo(m.netas / m.meta, 10);
  });
});

describe('periodo de Ventas', () => {
  it('"mes" trae la variación que ve Inicio', () => {
    const p = selPeriodoVentas(e, { periodo: 'mes', ahora: AHORA, localId: 'todos' });
    const k = selKpisInicio(e, { localId: 'todos', ahora: AHORA }).tarjetas.find((t) => t.id === 'ventas_mes');
    expect(p.variacion).toBe(k?.variacion);
    expect(p.comparacion).toBe(k?.comparacion);
    expect(p.desde).toBe(`${HOY.slice(0, 7)}-01`);
  });
  it('"semana" son 7 días y la serie suma lo vendido', () => {
    const p = selPeriodoVentas(e, { periodo: 'semana', ahora: AHORA, localId: 'todos' });
    expect(p.serie).toHaveLength(7);
    expect(p.hasta).toBe(HOY);
    expect(p.desde).toBe(sumarDias(HOY, -6));
    expect(p.serie.reduce((a, d) => a + d.netas, 0)).toBe(selVentas(e, { desde: p.desde, hasta: p.hasta }).totales.netas);
    expect(p.serie).toEqual(selVentasPorDia(e, { desde: p.desde, hasta: p.hasta, localId: 'todos' }).map((d) => ({ fecha: d.fecha, netas: d.netas, numVentas: d.numVentas })));
  });
});

describe('cierres de caja (W11)', () => {
  const ayer = sumarDias(HOY, -1);
  it('son los mismos tres cierres de selCierresDelDia, con la hora y el nombre corto', () => {
    const c = selCierresApp(e, { fecha: ayer });
    const base = selCierresDelDia(e, { fecha: ayer });
    expect(c.map((x) => x.localId)).toEqual(base.map((x) => x.localId));
    for (const x of c) {
      if (x.sesionId) expect(x.cerroEn).toBe(e.sesionesCaja[x.sesionId]?.cierre?.ts ?? null);
      expect(x.nombreCorto.split(' ').length).toBeLessThanOrEqual(3);
    }
  });
  it('Zona Rosa cerró con un faltante de $ 40.000 y el detalle lo explica', () => {
    const zr = selCierresApp(e, { fecha: ayer }).find((x) => x.localId === 'zr');
    expect(zr?.diferencia).toBe(-40_000);
    const d = selDetalleCierre(e, { sesionId: zr?.sesionId ?? '' });
    expect(d).not.toBeNull();
    if (!d || !zr) return;
    // Lo contado de las denominaciones es lo contado del cierre.
    expect(d.arqueo?.reduce((a, f) => a + f.subtotal, 0)).toBe(zr.contado);
    // base + efectivo del día − egresos = esperado (V8).
    expect(d.base + d.efectivoDelDia - d.resumen.egresos).toBe(d.resumen.esperado);
    expect(d.resumen.esperado).toBe(zr.esperado);
    // Las ventas por medio incluyen el efectivo del día.
    expect(d.medios.find((m) => m.medio === 'efectivo')?.valor).toBeGreaterThan(0);
    expect(selResumenSesion(e, { sesionId: zr.sesionId ?? '' })?.estado).toBe('cerrada');
  });
  it('un cierre inexistente no rompe', () => {
    expect(selDetalleCierre(e, { sesionId: 'no_existe' })).toBeNull();
  });
  it('nombreCorto quita el segundo apellido', () => {
    expect(nombreCorto('Laura Sofía Méndez Galvis')).toBe('Laura Sofía Méndez');
    expect(nombreCorto('Natalia Ríos Echeverry')).toBe('Natalia Ríos');
    expect(nombreCorto('Sebastián Cárdenas')).toBe('Sebastián Cárdenas');
  });
});

describe('para aprobar (W10 y W11)', () => {
  it('trae las mismas solicitudes pendientes que el escritorio, las tres del guion', () => {
    const app = selSolicitudesApp(e, { estado: 'pendiente' });
    const base = selSolicitudesPendientes(e);
    expect(app.map((s) => s.id)).toEqual(base.map((s) => s.id));
    expect(app.map((s) => s.tipo).sort()).toEqual(['anulacion', 'descuento', 'traslado']);
  });
  it('el descuento muestra lista, final y porcentaje; el traslado, las unidades; la anulación, su consecuencia', () => {
    const app = selSolicitudesApp(e, { estado: 'pendiente' });
    const d = app.find((s) => s.tipo === 'descuento');
    expect(d?.titulo).toBe('Descuento del 20 %');
    expect(d?.principal).toEqual({ dinero: 631_920 });
    expect(d?.datos.find((x) => x.etiqueta === 'Precio de lista')?.dinero).toBe(789_900);
    const t = app.find((s) => s.tipo === 'traslado');
    expect(t?.titulo).toBe('Traslado de 8 unidades');
    expect(t?.datos.find((x) => x.etiqueta === 'Sale de')?.valor).toBe('Parque 93');
    expect(t?.datos.find((x) => x.etiqueta === 'Llega a')?.valor).toBe('Zona Rosa');
    const a = app.find((s) => s.tipo === 'anulacion');
    expect(a?.titulo).toMatch(/^Anular la venta V-/);
    expect(a?.consecuencia).toMatch(/No se puede deshacer/);
    expect(a?.ventaId).toBeTruthy();
  });
  it('sin resueltas todavía no hay lista de resueltas', () => {
    expect(selSolicitudesApp(e, { estado: 'resueltas' })).toEqual([]);
  });
});

describe('inventario', () => {
  it('la búsqueda trae lo mismo que el catálogo, con la foto de la prenda', () => {
    const r = selInventarioApp(e, { texto: 'oxford', localId: 'todos', limite: 10 });
    expect(r.total).toBeGreaterThan(0);
    expect(r.filas[0]?.prenda).not.toBeNull();
    expect(r.filas.every((f) => f.nombre.toLowerCase().includes('oxford') || f.referencia.toLowerCase().includes('oxford') || f.variantes > 0)).toBe(true);
  });
  it('el crítico del guion es la Oxford azul cielo talla M en Usaquén', () => {
    const c = selCriticoApp(e, { hoy: HOY, localId: 'todos' });
    expect(c?.localId).toBe('usq');
    expect(c?.variante).toBe('Talla M · Azul cielo');
    expect(c?.surtido?.nombre).toBe('Zona Rosa');
    expect(selCriticoApp(e, { hoy: HOY, localId: 'zr' })).toBeNull();
  });
  it('la ficha trae la matriz y lo que viene en camino', () => {
    const c = selCriticoApp(e, { hoy: HOY, localId: 'todos' });
    const p = selProductoApp(e, { referencia: c?.referencia ?? '' });
    expect(p?.matriz.tallas.length).toBeGreaterThan(0);
    expect(p?.enCamino?.unidades).toBeGreaterThan(0);
    expect(selProductoApp(e, { referencia: 'HL-NO-EXISTE' })).toBeNull();
  });
});

describe('detalle de una venta', () => {
  it('compone selVentaDetalle: el total de las líneas es el de la venta', () => {
    const v = selVentas(e, { desde: HOY, hasta: HOY }).filas[0];
    const d = selDetalleVentaApp(e, { ventaId: v?.id ?? '' });
    expect(d?.numero).toBe(v?.numero);
    expect(d?.total).toBe(v?.total);
    expect(d?.lineas.reduce((a, l) => a + l.total, 0)).toBe(v?.total);
    expect(d?.estado).toBe(v?.estado);
  });
});

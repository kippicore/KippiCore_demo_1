import { beforeAll, describe, expect, it } from 'vitest';
import type { EstadoDominio } from '@/dominio/tipos';
import { activarVerificacionDeTablas, existencia, selNarrativa } from '@/selectores';
import { AHORA, estadoDe, HOY } from '@/selectores/pruebas/construir';
import {
  selDetalleConteo,
  selDetalleRecepcion,
  selDetalleTraslado,
  selEnCaminoPorProducto,
  selHistorialCosto,
  selInfoVariantes,
  selKardexVista,
  selMovimientoPendiente,
  selOpcionesCatalogo,
  selRecepciones,
  selTrasladosProducto,
  selVariantesDeProductos,
  selVariantesDetalle,
  selVentasReferencia,
  selVistaConteos,
  selVistaTraslados,
} from './selectores';

/** Los selectores locales corren con la verificación de tablas activa: fallan si leen una tabla sin declararla. */
let e: EstadoDominio;
beforeAll(() => {
  activarVerificacionDeTablas(true);
  e = estadoDe();
});

describe('variantes y matriz', () => {
  it('las variantes de la Oxford suman las existencias de todos los locales', () => {
    const p = e.productos[e.meta.narrativa.productoOxford ?? ''];
    expect(p).toBeTruthy();
    const filas = selVariantesDetalle(e, { productoId: p?.id ?? '' });
    expect(filas.length).toBe(15);
    for (const f of filas) {
      const suma = Object.keys(e.locales).reduce((a, l) => a + existencia(e, f.variante.id, l), 0);
      expect(f.total).toBe(suma);
    }
    // Orden de la curva: S, M, L, XL, XXL dentro de cada color.
    expect(filas.slice(0, 5).map((f) => f.variante.talla)).toEqual(['S', 'M', 'L', 'XL', 'XXL']);
  });

  it('"En camino" por producto coincide con la suma por variante', () => {
    const porProducto = selEnCaminoPorProducto(e);
    const p = e.meta.narrativa.productoOxford ?? '';
    const filas = selVariantesDetalle(e, { productoId: p });
    expect(porProducto[p]?.unidades).toBe(filas.reduce((a, f) => a + (f.enCamino?.unidades ?? 0), 0));
  });

  it('opciones del catálogo y datos de variantes sueltas', () => {
    const o = selOpcionesCatalogo(e);
    expect(o.tallas).toContain('M');
    expect(o.colores.length).toBeGreaterThan(5);
    expect(o.proveedores.length).toBe(5);
    const info = selInfoVariantes(e, { ids: [e.meta.narrativa.varianteOxfordM ?? ''] });
    expect(info[e.meta.narrativa.varianteOxfordM ?? '']?.existencias.zr).toBe(6);
    const g = selVariantesDeProductos(e, { productoIds: [e.meta.narrativa.productoOxford ?? ''] });
    expect(g[0]?.variantes.length).toBe(15);
  });
});

describe('kárdex', () => {
  it('el saldo final cuadra con las existencias de hoy (orden de aplicación)', () => {
    const p = e.meta.narrativa.productoOxford ?? '';
    const k = selKardexVista(e, { productoId: p, localId: 'todos' });
    expect(k.filas.length).toBeGreaterThan(50);
    expect(k.saldoFinal).toBe(k.existenciasActuales);
    // Por local también cuadra.
    for (const l of ['p93', 'usq', 'zr', 'bod']) {
      const kl = selKardexVista(e, { productoId: p, localId: l });
      expect(kl.saldoFinal).toBe(kl.existenciasActuales);
    }
  });

  it('filtra por tipo sin alterar el saldo', () => {
    const p = e.meta.narrativa.productoOxford ?? '';
    const todos = selKardexVista(e, { productoId: p });
    const ventas = selKardexVista(e, { productoId: p, tipos: ['salida_venta'] });
    expect(ventas.filas.every((f) => f.movimiento.tipo === 'salida_venta')).toBe(true);
    expect(ventas.filas.length).toBeLessThan(todos.filas.length);
    expect(ventas.saldoFinal).toBe(todos.saldoFinal);
  });
});

describe('traslados', () => {
  it('la lista incluye el traslado de la narrativa pendiente de aprobación y su detalle', () => {
    const lista = selVistaTraslados(e, {});
    const pendiente = lista.find((f) => f.traslado.estado === 'solicitado');
    expect(pendiente).toBeTruthy();
    const d = selDetalleTraslado(e, { trasladoId: pendiente?.traslado.id ?? '' });
    expect(d?.solicitudPendienteId).toBe(e.meta.narrativa.solicitudTraslado ?? 'so_g_traslado_20260930');
    expect(d?.unidades).toBe(pendiente?.unidades);
    expect(selVistaTraslados(e, { estado: 'recibido' }).every((f) => f.traslado.estado === 'recibido')).toBe(true);
  });

  it('en tránsito y solicitadas por producto', () => {
    const r = selMovimientoPendiente(e, { productoId: e.meta.narrativa.productoOxford ?? '' });
    expect(r.enTransito).toBeTypeOf('object');
    const t = selTrasladosProducto(e, { productoId: e.meta.narrativa.productoOxford ?? '' });
    expect(t.length).toBeLessThanOrEqual(3 + Object.values(e.traslados).filter((x) => x.estado === 'solicitado' || x.estado === 'en_transito').length);
  });
});

describe('conteos y recepción', () => {
  it('lista y detalle de un conteo aplicado', () => {
    const lista = selVistaConteos(e);
    expect(lista.length).toBe(Object.keys(e.conteos).length);
    const d = selDetalleConteo(e, { conteoId: lista[0]?.conteo.id ?? '' });
    expect(d?.lineas.length).toBe(lista[0]?.lineas);
  });

  it('la importación en puerto aún no se puede recibir; el detalle trae sus líneas', () => {
    const lista = selRecepciones(e);
    const imp07 = lista.find((r) => r.numero === 'IMP-2026-07');
    expect(imp07?.puedeRecibir).toBe(false);
    const d = selDetalleRecepcion(e, { importacionId: imp07?.importacionId ?? '', hoy: HOY });
    expect(d?.lineas.reduce((a, l) => a + l.esperadas, 0)).toBe(imp07?.unidades);
    expect(d?.locales.map((l) => l.id).sort()).toEqual(['p93', 'usq', 'zr']);
  });
});

describe('ventas y costos de la referencia', () => {
  it('las ventas de la Oxford en 90 días tienen unidades y margen coherentes con sus hechos', () => {
    const p = e.meta.narrativa.productoOxford ?? '';
    const v = selVentasReferencia(e, { productoId: p, desde: '2026-07-02', hasta: HOY });
    expect(v.unidades).toBeGreaterThan(0);
    expect(v.unidades).toBe(v.lineas.reduce((a, l) => a + l.hecho.cantidad, 0));
    expect(v.margen).toBe(v.base - v.costo);
    expect(v.porLocal.reduce((a, l) => a + l.unidades, 0)).toBe(v.unidades);
  });

  it('el historial de costo termina en el costo vigente', () => {
    const p = e.meta.narrativa.productoOxford ?? '';
    const h = selHistorialCosto(e, { productoId: p });
    expect(h.length).toBeGreaterThan(0);
    expect(h[0]?.costo).toBe(e.productos[p]?.costoVigente);
  });
});

describe('narrativa de W2', () => {
  it('la variante crítica se acaba en Usaquén y hay de dónde traer', () => {
    const n = selNarrativa(e, { hoy: HOY });
    expect(n.localEscasez).toBe('usq');
    expect(n.localSurtido).toBe('zr');
    expect(AHORA).toContain(HOY);
  });
});

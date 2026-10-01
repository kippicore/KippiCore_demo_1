import { describe, expect, it } from 'vitest';
import { existencia } from '../comandos/tx';
import { abastecer, hacer, intentar, nuevoEstado, OXFORD_M_AZC } from './fixtures';

describe('traslados (W2, I4)', () => {
  it('completo: solicitado → en tránsito → recibido con faltante como pérdida', () => {
    const e = nuevoEstado();
    abastecer(e, OXFORD_M_AZC, 'zr', 6);
    hacer(e, 'traslado.solicitar', {
      trasladoId: 'tr_1',
      origenId: 'zr',
      destinoId: 'usq',
      lineas: [{ varianteId: OXFORD_M_AZC, cantidad: 3 }],
      motivo: 'Reposición',
      requiereAprobacion: false,
      solicitudId: null,
    });
    expect(e.traslados.tr_1?.numero).toBe('TR-000001');
    expect(existencia(e, OXFORD_M_AZC, 'zr')).toBe(6);
    hacer(e, 'traslado.despachar', { trasladoId: 'tr_1' }, { rol: 'bodega' });
    expect(existencia(e, OXFORD_M_AZC, 'zr')).toBe(3);
    expect(e.traslados.tr_1?.estado).toBe('en_transito');
    hacer(e, 'traslado.recibir', { trasladoId: 'tr_1', recibidas: { [OXFORD_M_AZC]: 2 }, nota: null });
    expect(existencia(e, OXFORD_M_AZC, 'usq')).toBe(2);
    expect(e.movimientos.at(-1)).toMatchObject({
      tipo: 'ajuste_manual',
      motivo: 'perdida',
      cantidad: -1,
      localId: 'usq',
    });
    expect(e.traslados.tr_1?.lineas[0]?.recibida).toBe(2);
  });

  it('con aprobación: no se despacha hasta que el dueño apruebe; el rechazo lo cancela', () => {
    const e = nuevoEstado();
    abastecer(e, OXFORD_M_AZC, 'p93', 10);
    hacer(
      e,
      'traslado.solicitar',
      {
        trasladoId: 'tr_1',
        origenId: 'p93',
        destinoId: 'zr',
        lineas: [{ varianteId: OXFORD_M_AZC, cantidad: 8 }],
        motivo: null,
        requiereAprobacion: true,
        solicitudId: 'so_t',
      },
      { rol: 'bodega' },
    );
    expect(e.solicitudes.so_t?.resumen).toBe(
      'Wilson Díaz pide trasladar 8 unidades de Parque 93 a Zona Rosa',
    );
    expect(intentar(e, 'traslado.despachar', { trasladoId: 'tr_1' })).toMatchObject({
      ok: false,
      error: { codigo: 'SIN_APROBACION' },
    });
    hacer(e, 'aprobacion.resolver', { solicitudId: 'so_t', decision: 'aprobada', nota: null });
    hacer(e, 'traslado.despachar', { trasladoId: 'tr_1' });
    hacer(e, 'traslado.cancelar', { trasladoId: 'tr_1', motivo: 'Se necesitan en Parque 93' });
    expect(existencia(e, OXFORD_M_AZC, 'p93')).toBe(10);
    hacer(e, 'traslado.solicitar', {
      trasladoId: 'tr_2',
      origenId: 'p93',
      destinoId: 'zr',
      lineas: [{ varianteId: OXFORD_M_AZC, cantidad: 1 }],
      motivo: null,
      requiereAprobacion: true,
      solicitudId: 'so_t2',
    });
    hacer(e, 'aprobacion.resolver', { solicitudId: 'so_t2', decision: 'rechazada', nota: null });
    expect(e.traslados.tr_2?.estado).toBe('cancelado');
  });

  it('no deja traslados sin existencias en el origen', () => {
    const e = nuevoEstado();
    expect(
      intentar(e, 'traslado.solicitar', {
        trasladoId: 'tr_1',
        origenId: 'zr',
        destinoId: 'usq',
        lineas: [{ varianteId: OXFORD_M_AZC, cantidad: 1 }],
        motivo: null,
        requiereAprobacion: false,
        solicitudId: null,
      }),
    ).toMatchObject({
      ok: false,
      error: { codigo: 'SIN_EXISTENCIAS' },
    });
  });
});

describe('conteo físico y ajustes', () => {
  it('iniciar, guardar y aplicar con motivo por diferencia', () => {
    const e = nuevoEstado();
    abastecer(e, OXFORD_M_AZC, 'zr', 6);
    hacer(
      e,
      'conteo.iniciar',
      { conteoId: 'cf_1', localId: 'zr', categorias: ['camisas'] },
      { rol: 'bodega' },
    );
    expect(e.conteos.cf_1?.lineas[OXFORD_M_AZC]).toEqual({ sistemaAlIniciar: 6, contado: null });
    expect(
      intentar(e, 'conteo.iniciar', { conteoId: 'cf_2', localId: 'zr', categorias: null }),
    ).toMatchObject({ ok: false, error: { codigo: 'CONTEO_EN_CURSO' } });
    hacer(e, 'conteo.guardar', { conteoId: 'cf_1', cantidades: { [OXFORD_M_AZC]: 5 } });
    expect(intentar(e, 'conteo.aplicar', { conteoId: 'cf_1', motivos: {} })).toMatchObject({
      ok: false,
      error: { codigo: 'MOTIVO_REQUERIDO' },
    });
    const ev = hacer(e, 'conteo.aplicar', { conteoId: 'cf_1', motivos: { [OXFORD_M_AZC]: 'perdida' } });
    expect(existencia(e, OXFORD_M_AZC, 'zr')).toBe(5);
    expect(ev.find((x) => x.tipo === 'ConteoAplicado')).toMatchObject({ diferencias: 1 });
    expect(e.conteos.cf_1?.estado).toBe('aplicado');
  });

  it('el ajuste manual no deja negativos ni ajustes sin diferencia', () => {
    const e = nuevoEstado();
    expect(
      intentar(e, 'inventario.ajustar', {
        movimientoId: 'mv_1',
        varianteId: OXFORD_M_AZC,
        localId: 'zr',
        nuevaCantidad: -1,
        motivo: 'error',
        nota: null,
      }),
    ).toMatchObject({ ok: false });
    expect(
      intentar(e, 'inventario.ajustar', {
        movimientoId: 'mv_1',
        varianteId: OXFORD_M_AZC,
        localId: 'zr',
        nuevaCantidad: 0,
        motivo: 'error',
        nota: null,
      }),
    ).toMatchObject({ ok: false, error: { codigo: 'SIN_DIFERENCIA' } });
    expect(
      intentar(
        e,
        'inventario.ajustar',
        {
          movimientoId: 'mv_1',
          varianteId: OXFORD_M_AZC,
          localId: 'zr',
          nuevaCantidad: 3,
          motivo: 'error',
          nota: null,
        },
        { rol: 'vendedor' },
      ),
    ).toMatchObject({ ok: false, error: { codigo: 'SIN_PERMISO' } });
  });

  it('producto y variante: crear con SKU y EAN consecutivos, eliminar solo sin existencias (G4)', () => {
    const e = nuevoEstado();
    hacer(e, 'producto.crear', {
      productoId: 'pd_nuevo',
      varianteIds: { 'M|col_bla': 'va_n1', 'L|col_bla': 'va_n2' },
      referencia: '',
      nombre: 'Camisa de lino para playa',
      categoria: 'camisas',
      linea: 'casual',
      tipoPrenda: 'camisa',
      curvaTallas: 'superior',
      temporada: 'Temporada 2026-II',
      proveedorId: 'pr_huameng',
      material: '100 % lino',
      descripcion: 'Prueba',
      precioVenta: 189_900,
      tarifaIva: 0.19,
      stockMinimo: 2,
      publicadoEnTienda: false,
      destacado: false,
      etiquetas: [],
      tallas: ['M', 'L'],
      colorIds: ['col_bla'],
      costoManual: 60_000,
    });
    expect(e.productos.pd_nuevo?.referencia).toBe('HL-CAM-1001');
    expect(e.variantes.va_n1?.sku).toBe('HL-CAM-1001-BLA-M');
    expect(e.variantes.va_n1?.ean13.startsWith('204810000884')).toBe(true);
    abastecer(e, 'va_n1', 'p93', 1);
    expect(intentar(e, 'producto.eliminar', { productoId: 'pd_nuevo', motivo: null })).toMatchObject({
      ok: false,
      error: { codigo: 'CON_EXISTENCIAS' },
    });
    expect(
      intentar(
        e,
        'producto.editar',
        { productoId: 'pd_nuevo', cambios: { precioVenta: 199_900 } },
        { rol: 'bodega' },
      ),
    ).toMatchObject({ ok: false, error: { codigo: 'SIN_PERMISO' } });
    hacer(e, 'producto.editar', { productoId: 'pd_nuevo', cambios: { costoManual: 65_000, stockMinimo: 3 } });
    expect(e.productos.pd_nuevo?.costoVigente).toBe(65_000);
    expect(e.productos.pd_nuevo?.historialCosto).toHaveLength(2);
  });
});

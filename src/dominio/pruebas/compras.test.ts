import { describe, expect, it } from 'vitest';
import type { CostosImportacion, MapaComandos } from '../tipos';
import { existencia, saldoCuenta } from '../comandos/tx';
import { saldoCxP } from '../reglas/cuentas';
import { hitosAlCambiarEstado, llegadaABodega } from '../reglas/importaciones';
import { hacer, intentar, nuevoEstado, OXFORD_M_AZC } from './fixtures';

const costos: CostosImportacion = {
  flete: { moneda: 'USD', valor: 93_000 },
  seguro: { moneda: 'USD', valor: 11_400 },
  honorariosAgente: 2_100_000,
  bodegajePuerto: 1_200_000,
  transporteInterno: 2_400_000,
  otros: 0,
  otrosTributosAduaneros: 0,
  arancelPct: 0.15,
  ivaImportacionPct: 0.19,
  ivaSumaAlCosto: false,
};

function crear(numero: string | null = null): MapaComandos['importacion.crear'] {
  return {
    importacionId: 'im_1',
    numero,
    proveedorId: 'pr_huameng',
    moneda: 'USD',
    tasaPedido: 3_900,
    fechaPedido: '2026-06-01',
    carga: { tipo: 'consolidada', m3: 6.2 },
    puertoOrigen: 'Shenzhen (Yantian)',
    puertoDestino: 'Buenaventura',
    lineas: [
      {
        id: 'l1',
        productoId: 'pd_cam_0142',
        cantidades: { [OXFORD_M_AZC]: 48, va_cam_0142_azc_l: 52 },
        costoUnitarioOrigen: 1_140,
      },
    ],
    contactoIds: ['co_lily_chen', 'co_carolina_mejia'],
    costos,
    metodoProrrateo: 'valor',
    origenSugerencia: null,
    nota: null,
  };
}

describe('importaciones (M1–M8, W3, W4)', () => {
  it('crea el pedido numerado por año, con hitos estimados', () => {
    const e = nuevoEstado();
    hacer(e, 'importacion.crear', crear());
    expect(e.importaciones.im_1).toMatchObject({ numero: 'IMP-2026-01', estado: 'cotizado' });
    expect(e.importaciones.im_1?.hitos.recibido_bodega.estimada).toBe('2026-09-11');
    expect(
      intentar(e, 'importacion.crear', { ...crear('IMP-2026-01'), importacionId: 'im_2' }),
    ).toMatchObject({ ok: false, error: { codigo: 'NUMERO_DUPLICADO' } });
  });

  it('la llegada a bodega proyectada al cambiar de estado es la que queda guardada (una sola fecha en aviso y ficha)', () => {
    const e = nuevoEstado();
    hacer(e, 'importacion.crear', crear());
    const antes = structuredClone(e.importaciones.im_1!);
    hacer(e, 'importacion.cambiarEstado', {
      importacionId: 'im_1',
      estado: 'en_nacionalizacion',
      fecha: '2026-08-10',
      nota: null,
      origen: 'panel',
      autor: null,
    });
    const despues = e.importaciones.im_1!;
    const proyectados = hitosAlCambiarEstado(antes, 'en_nacionalizacion', '2026-08-10');
    expect(llegadaABodega({ hitos: proyectados })).toBe(llegadaABodega(despues));
    expect(proyectados.nacionalizado.estimada).toBe(despues.hitos.nacionalizado.estimada);
    // Un estado ya alcanzado no vuelve a correr las fechas.
    expect(hitosAlCambiarEstado(despues, 'en_nacionalizacion', '2026-08-10')).toBe(despues.hitos);
    expect(llegadaABodega(despues)).not.toBe(llegadaABodega(antes));
  });

  it('al confirmar nacen anticipo 30 % y saldo 70 % (vence en listo para despacho); al nacionalizar, los tributos', () => {
    const e = nuevoEstado();
    hacer(e, 'importacion.crear', crear());
    hacer(e, 'importacion.cambiarEstado', {
      importacionId: 'im_1',
      estado: 'pedido_confirmado',
      fecha: '2026-06-05',
      nota: null,
      origen: 'panel',
      autor: null,
    });
    const imp = e.importaciones.im_1!;
    const anticipo = e.cuentasPorPagar['im_1-cxp-anticipo']!;
    const saldo = e.cuentasPorPagar['im_1-cxp-saldo']!;
    expect(anticipo.valor + saldo.valor).toBe(100 * 1_140);
    expect(anticipo.valor).toBe(34_200);
    expect(saldo.fechaVencimiento).toBe(imp.hitos.listo_despacho.estimada);
    expect(imp.controlManualHasta).toBe(imp.hitos.anticipo_pagado.estimada);
    // Pago del anticipo en USD con diferencia en cambio contra la tasa del pedido (V10).
    hacer(e, 'importacion.registrarPago', {
      importacionId: 'im_1',
      cxpId: 'im_1-cxp-anticipo',
      abonoId: 'ab_1',
      centavos: 34_200,
      tasa: 4_000,
      fecha: '2026-06-06',
      cuentaId: 'cta_corriente',
    });
    const abono = e.cuentasPorPagar['im_1-cxp-anticipo']!.abonos[0]!;
    expect(abono.valorCOP).toBe(1_368_000);
    expect(abono.diferenciaCambio).toBe(1_368_000 - 1_333_800);
    expect(saldoCxP(e.cuentasPorPagar['im_1-cxp-anticipo']!)).toBe(0);
    expect(saldoCuenta(e, 'cta_corriente')).toBe(95_000_000 - 1_368_000);
    // Saltos hacia adelante y reporte del portal.
    hacer(
      e,
      'importacion.cambiarEstado',
      {
        importacionId: 'im_1',
        estado: 'en_transito',
        fecha: '2026-07-20',
        nota: null,
        origen: 'sistema',
        autor: null,
      },
      { rol: 'sistema' },
    );
    expect(e.importaciones.im_1?.hitos.embarcado.real).toBe('2026-07-20');
    expect(e.importaciones.im_1?.controlManualHasta).toBeNull();
    hacer(
      e,
      'importacion.cambiarEstado',
      {
        importacionId: 'im_1',
        estado: 'en_puerto',
        fecha: '2026-08-25',
        nota: null,
        origen: 'portal',
        autor: 'Carolina Mejía',
      },
      { rol: 'portal' },
    );
    const notif = Object.values(e.notificaciones).find((n) => n.tipo === 'portal_actualizacion');
    expect(notif?.titulo).toBe('Carolina Mejía reportó la llegada a puerto de IMP-2026-01');
    expect(notif?.enlace).toBe('/panel/importaciones/IMP-2026-01');
    hacer(e, 'importacion.cambiarEstado', {
      importacionId: 'im_1',
      estado: 'en_nacionalizacion',
      fecha: '2026-08-27',
      nota: null,
      origen: 'panel',
      autor: null,
    });
    const tributos = e.cuentasPorPagar['im_1-cxp-tributos']!;
    expect(tributos.categoria).toBe('tributos_aduaneros');
    expect(tributos.valor).toBeGreaterThan(0);
    expect(
      intentar(e, 'importacion.cambiarEstado', {
        importacionId: 'im_1',
        estado: 'recibido_bodega',
        fecha: '2026-09-01',
        nota: null,
        origen: 'panel',
        autor: null,
      }),
    ).toMatchObject({
      ok: false,
      error: { codigo: 'RECEPCION_POR_INVENTARIO' },
    });
    expect(
      intentar(e, 'importacion.cambiarEstado', {
        importacionId: 'im_1',
        estado: 'en_puerto',
        fecha: '2026-08-28',
        nota: null,
        origen: 'panel',
        autor: null,
      }),
    ).toMatchObject({
      ok: false,
      error: { codigo: 'NOTA_OBLIGATORIA' },
    });
    hacer(e, 'importacion.cambiarEstado', {
      importacionId: 'im_1',
      estado: 'en_puerto',
      fecha: '2026-08-28',
      nota: 'Me equivoqué de pedido',
      origen: 'panel',
      autor: null,
    });
    expect(e.importaciones.im_1?.hitos.en_nacionalizacion.real).toBeNull();
  });

  it('recibir: entra a bodega con costo aterrizado, aplica costos y distribuye por local', () => {
    const e = nuevoEstado();
    hacer(e, 'importacion.crear', crear());
    hacer(e, 'importacion.cambiarEstado', {
      importacionId: 'im_1',
      estado: 'nacionalizado',
      fecha: '2026-09-01',
      nota: null,
      origen: 'panel',
      autor: null,
    });
    expect(
      intentar(e, 'importacion.recibir', {
        importacionId: 'im_1',
        fecha: '2026-09-03',
        lineas: {},
        nota: null,
        distribucion: [
          { trasladoId: 'tr_1', destinoId: 'usq', lineas: [{ varianteId: OXFORD_M_AZC, cantidad: 60 }] },
        ],
      }),
    ).toMatchObject({
      ok: false,
      error: { codigo: 'SIN_EXISTENCIAS' },
    });
    hacer(e, 'importacion.recibir', {
      importacionId: 'im_1',
      fecha: '2026-09-03',
      lineas: { [OXFORD_M_AZC]: { recibidas: 48, defectuosas: 1 } },
      nota: null,
      distribucion: [
        { trasladoId: 'tr_1', destinoId: 'usq', lineas: [{ varianteId: OXFORD_M_AZC, cantidad: 20 }] },
        {
          trasladoId: 'tr_2',
          destinoId: 'p93',
          lineas: [
            { varianteId: OXFORD_M_AZC, cantidad: 15 },
            { varianteId: 'va_cam_0142_azc_l', cantidad: 30 },
          ],
        },
      ],
    });
    const imp = e.importaciones.im_1!;
    expect(imp.estado).toBe('recibido_bodega');
    expect(imp.recepcion?.lineas[OXFORD_M_AZC]).toEqual({ esperadas: 48, recibidas: 48, defectuosas: 1 });
    expect(imp.costosAplicados).not.toBeNull();
    const costo = e.productos.pd_cam_0142!.costoVigente;
    expect(costo).toBeGreaterThan(0);
    expect(e.productos.pd_cam_0142!.historialCosto.at(-1)).toMatchObject({
      importacionId: 'im_1',
      motivo: 'importacion',
    });
    expect(existencia(e, OXFORD_M_AZC, 'bod')).toBe(47 - 35);
    expect(existencia(e, 'va_cam_0142_azc_l', 'bod')).toBe(52 - 30);
    expect(e.traslados.tr_2?.estado).toBe('en_transito');
    expect(e.movimientos.find((m) => m.tipo === 'entrada_importacion')?.costoUnitario).toBe(costo);
  });

  it('aplicar costos con tasa simulada cambia el costo vigente (W4)', () => {
    const e = nuevoEstado();
    hacer(e, 'importacion.crear', crear());
    hacer(e, 'importacion.aplicarCostos', { importacionId: 'im_1', tasaCosteo: 3_950 });
    const c1 = e.productos.pd_cam_0142!.costoVigente;
    hacer(e, 'importacion.aplicarCostos', { importacionId: 'im_1', tasaCosteo: 4_345 });
    expect(e.productos.pd_cam_0142!.costoVigente).toBeGreaterThan(c1);
  });
});

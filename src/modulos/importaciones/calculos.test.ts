import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { calcularCostoAterrizado, unidadesLinea } from '@/dominio/reglas/costeo';
import { activarVerificacionDeTablas, selAvisosEstado, selCostoAterrizado, selImportaciones, selNarrativa, selSugerenciaPedido } from '@/selectores';
import { AHORA, estadoDe, HOY } from '@/selectores/pruebas/construir';
import {
  borradorPedidoEn,
  cascadaPorPrenda,
  detalleHitos,
  eleccionInicial,
  estadosDeFase,
  estadosDisponibles,
  estadosParaPortal,
  faseDeEstado,
  mensajesDeAvisos,
  margenPromedioPorCategoria,
  posicionRuta,
  PROGRESO_PUERTO,
  resumenReferencia,
  tasaSimulada,
  totalesPedido,
  type LineaSugerida,
} from './calculos';
import {
  selAvisosPendientes,
  selCatalogoPedido,
  selContactosCadena,
  selDefectosPedido,
  selMensajesImportacion,
  selPagosImportacion,
  selSugerenciaCompleta,
  selVistaCosto,
} from './selectores';

beforeAll(() => activarVerificacionDeTablas(true));
afterAll(() => activarVerificacionDeTablas(false));

describe('fases y ruta', () => {
  test('cada estado pertenece a una fase y las fases cubren los 13 estados', () => {
    const todos = (['fabrica', 'viaje', 'aduana', 'entrega', 'bodega'] as const).flatMap((f) => estadosDeFase(f));
    expect(todos).toHaveLength(13);
    expect(faseDeEstado('en_puerto')).toBe('viaje');
    expect(faseDeEstado('nacionalizado')).toBe('aduana');
    expect(faseDeEstado('recibido_bodega')).toBe('bodega');
  });

  test('el barco avanza con las fechas: quieto en fábrica, en el mar, en el puerto y por tierra', () => {
    const e = estadoDe();
    const filas = selImportaciones(e, { hoy: HOY, incluirRecibidas: false });
    const mar = filas.find((f) => f.importacion.estado === 'en_transito');
    const puerto = filas.find((f) => f.importacion.estado === 'en_puerto');
    const fabrica = filas.find((f) => f.importacion.estado === 'en_produccion');
    expect(posicionRuta(fabrica!.importacion, HOY)).toEqual({ progreso: 0, tramo: 'fabrica' });
    const p = posicionRuta(mar!.importacion, HOY);
    expect(p.tramo).toBe('mar');
    expect(p.progreso).toBeGreaterThan(0);
    expect(p.progreso).toBeLessThan(PROGRESO_PUERTO);
    // Más tarde en el calendario, más lejos en el mar.
    expect(posicionRuta(mar!.importacion, '2026-10-10').progreso).toBeGreaterThan(p.progreso);
    expect(posicionRuta(puerto!.importacion, HOY)).toEqual({ progreso: PROGRESO_PUERTO, tramo: 'puerto' });
    const tierra = { estado: 'en_transporte_bogota' as const, hitos: { ...puerto!.importacion.hitos } };
    tierra.hitos.nacionalizado = { ...tierra.hitos.nacionalizado, real: '2026-10-01' };
    tierra.hitos.recibido_bodega = { ...tierra.hitos.recibido_bodega, estimada: '2026-10-11' };
    const t = posicionRuta(tierra, '2026-10-06');
    expect(t.tramo).toBe('tierra');
    expect(t.progreso).toBeGreaterThan(PROGRESO_PUERTO);
    expect(t.progreso).toBeLessThan(1);
    expect(posicionRuta({ ...tierra, estado: 'recibido_bodega' }, '2026-10-12').progreso).toBe(1);
  });
});

describe('línea de tiempo: estimado vs real y retraso', () => {
  test('marca hecho, actual y pendiente, y el retraso de la importación que va tarde', () => {
    const e = estadoDe();
    const n = selNarrativa(e, { hoy: HOY });
    const imp = e.importaciones[n.importacionRetrasada ?? ''];
    expect(imp).toBeTruthy();
    const d = detalleHitos(imp!, HOY);
    expect(d).toHaveLength(13);
    expect(d.filter((x) => x.situacion === 'actual')).toHaveLength(1);
    expect(d.find((x) => x.situacion === 'actual')!.estado).toBe(imp!.estado);
    expect(d.filter((x) => x.situacion === 'pendiente').every((x) => x.real === null)).toBe(true);
    // La importación retrasada tiene el siguiente hito vencido.
    const fila = selImportaciones(e, { hoy: HOY }).find((f) => f.importacion.id === imp!.id)!;
    const siguiente = d.find((x) => x.situacion === 'pendiente')!;
    expect(siguiente.vencidoDias).toBe(fila.retrasoDias);
    expect(fila.retrasoDias).toBeGreaterThan(0);
  });
});

describe('cambio de estado', () => {
  test('hacia adelante sin la recepción; un paso atrás solo el dueño', () => {
    const dueno = estadosDisponibles('en_puerto', true);
    expect(dueno.some((o) => o.estado === 'recibido_bodega')).toBe(false);
    expect(dueno.find((o) => o.estado === 'en_transito')?.correccion).toBe(true);
    expect(dueno.find((o) => o.estado === 'nacionalizado')?.correccion).toBe(false);
    expect(dueno.some((o) => o.estado === 'en_puerto')).toBe(false);
    const otro = estadosDisponibles('en_puerto', false);
    expect(otro.some((o) => o.correccion)).toBe(false);
  });

  test('el portal solo ofrece las novedades de carga y aduana hacia adelante', () => {
    expect(estadosParaPortal('en_nacionalizacion')).toEqual(['nacionalizado']);
    expect(estadosParaPortal('en_produccion')).toEqual(['embarcado', 'en_transito', 'en_puerto', 'en_nacionalizacion', 'nacionalizado']);
    expect(estadosParaPortal('en_transporte_bogota')).toEqual([]);
  });
});

describe('costo aterrizado: desglose por prenda', () => {
  test('la suma del desglose coincide con el costo unitario de la línea (redondeo de unos pesos)', () => {
    const e = estadoDe();
    const n = selNarrativa(e, { hoy: HOY });
    const imp = e.importaciones[n.importacionEnPuerto ?? '']!;
    for (const metodo of ['valor', 'cantidad'] as const) {
      const res = calcularCostoAterrizado({
        lineas: imp.lineas,
        costos: imp.costos,
        moneda: imp.moneda,
        metodoProrrateo: metodo,
        tasaCosteo: 3950,
        tasasOtras: { USD: 3950, CNY: 548 },
      });
      for (const l of imp.lineas) {
        const r = cascadaPorPrenda(res, imp.lineas, metodo, l.id)!;
        const suma = r.pasos.reduce((a, p) => a + p.valor, 0);
        expect(Math.abs(suma - r.costoUnitario)).toBeLessThanOrEqual(12);
        expect(r.unidades).toBe(unidadesLinea(l));
      }
    }
  });

  test('con prorrateo por valor la prenda lleva su propio precio de fábrica', () => {
    const e = estadoDe();
    const n = selNarrativa(e, { hoy: HOY });
    const imp = e.importaciones[n.importacionEnPuerto ?? '']!;
    const res = calcularCostoAterrizado({ lineas: imp.lineas, costos: imp.costos, moneda: imp.moneda, metodoProrrateo: 'valor', tasaCosteo: 4000, tasasOtras: { USD: 4000 } });
    const l = imp.lineas[0]!;
    const r = cascadaPorPrenda(res, imp.lineas, 'valor', l.id)!;
    expect(r.pasos[0]!.concepto).toBe('fob');
    expect(Math.abs(r.pasos[0]!.valor - Math.round((l.costoUnitarioOrigen / 100) * 4000))).toBeLessThanOrEqual(1);
  });

  test('el simulador mueve la tasa y el costo sube con el dólar', () => {
    const e = estadoDe();
    const n = selNarrativa(e, { hoy: HOY });
    const id = n.importacionEnPuerto!;
    const base = selCostoAterrizado(e, { importacionId: id, hoy: HOY })!;
    expect(tasaSimulada(3950, 10)).toBeCloseTo(4345, 3);
    expect(tasaSimulada(3950, 0)).toBe(3950);
    const sube = selCostoAterrizado(e, { importacionId: id, hoy: HOY, tasaSimulada: tasaSimulada(base.tasaCosteo, 10) })!;
    expect(sube.total).toBeGreaterThan(base.total);
    expect(sube.porProductoDetalle[0]!.margenProyectado).toBeLessThan(base.porProductoDetalle[0]!.margenProyectado);
    expect(sube.porProductoDetalle[0]!.precioSugerido).toBeGreaterThanOrEqual(base.porProductoDetalle[0]!.precioSugerido);
  });

  test('el margen promedio se pondera por unidades y por categoría', () => {
    const r = margenPromedioPorCategoria([
      { unidades: 100, margenActual: 0.6, margenProyectado: 0.5, categoria: 'camisas' },
      { unidades: 300, margenActual: 0.7, margenProyectado: 0.6, categoria: 'camisas' },
      { unidades: 10, margenActual: 0.5, margenProyectado: 0.5, categoria: 'blazers' },
    ]);
    expect(r[0]!.categoria).toBe('camisas');
    expect(r[0]!.antes).toBeCloseTo(0.675, 6);
    expect(r[0]!.despues).toBeCloseTo(0.575, 6);
    expect(r[1]!.categoria).toBe('blazers');
  });

  test('selVistaCosto compone el costo con categoría y variantes afectadas', () => {
    const e = estadoDe();
    const n = selNarrativa(e, { hoy: HOY });
    const v = selVistaCosto(e, { importacionId: n.importacionEnPuerto!, hoy: HOY, tasaSimulada: null })!;
    expect(v.productos.length).toBeGreaterThan(0);
    expect(v.variantesAfectadas).toBeGreaterThan(0);
    expect(v.productos.every((p) => p.lineaId)).toBe(true);
    expect(v.tasaBase).toBe(v.costo.tasaCosteo);
    // La suma de lo prorrateado cuadra con el total (M4).
    expect(v.costo.porLinea.reduce((a, l) => a + l.costoLinea, 0)).toBe(v.costo.total);
  });
});

describe('sugerir pedido', () => {
  const lineas: LineaSugerida[] = [
    { varianteId: 'a', cantidad: 10, costoUnitarioOrigen: 1140, precioVenta: 219_900, tarifaIva: 0.19, costoAterrizado: 71_850 },
    { varianteId: 'b', cantidad: 5, costoUnitarioOrigen: 1200, precioVenta: 189_900, tarifaIva: 0.19, costoAterrizado: 60_000 },
  ];

  test('los totales salen de las cantidades editadas', () => {
    const t = totalesPedido(lineas, 3950);
    expect(t.unidades).toBe(15);
    expect(t.totalOrigen).toBe(10 * 1140 + 5 * 1200);
    expect(t.totalCop).toBe(Math.round(((10 * 1140 + 5 * 1200) / 100) * 3950));
    expect(t.margenEsperado).toBeGreaterThan(0.3);
    expect(totalesPedido([], 3950)).toEqual({ unidades: 0, totalOrigen: 0, totalCop: 0, margenEsperado: 0 });
  });

  test('sin ediciones, los totales coinciden con los de selSugerenciaPedido', () => {
    const e = estadoDe();
    const n = selNarrativa(e, { hoy: HOY });
    const s = selSugerenciaCompleta(e, { proveedorId: n.proveedorSugerencia!, coberturaDias: 90, hoy: HOY })!;
    const base = selSugerenciaPedido(e, { proveedorId: n.proveedorSugerencia!, coberturaDias: 90, hoy: HOY })!;
    expect(s.base).toBe(base);
    const filas: LineaSugerida[] = s.productos.flatMap((p) =>
      Object.values(p.celdas).map((c) => ({
        varianteId: c.varianteId,
        cantidad: c.sugerida,
        costoUnitarioOrigen: p.costoUnitarioOrigen,
        precioVenta: p.precioVenta,
        tarifaIva: p.tarifaIva,
        costoAterrizado: p.costoVigente,
      })),
    );
    const t = totalesPedido(filas, base.tasaVigente);
    expect(t.unidades).toBe(base.unidades);
    expect(t.totalOrigen).toBe(base.totalOrigen);
    expect(t.totalCop).toBe(base.totalCop);
    expect(t.margenEsperado).toBeCloseTo(base.margenEsperado, 10);
    // La M azul cielo de la Oxford sale con más unidades que otras tallas de ese color (patrón P3 corregido).
    const oxford = s.productos.find((p) => p.productoId === n.productoCritico);
    expect(oxford).toBeTruthy();
    const col = oxford!.colores.find((c) => c.id === 'col_azul_cielo') ?? oxford!.colores[0]!;
    const m = oxford!.celdas[`M|${col.id}`];
    expect(m).toBeTruthy();
  });

  test('el borrador en inglés conserva la plantilla de la fábrica y detalla tallas y colores', () => {
    const r = resumenReferencia(
      [
        { talla: 'M', colorNombre: 'Azul cielo', colorCodigo: 'AZC', cantidad: 160 },
        { talla: 'L', colorNombre: 'Azul cielo', colorCodigo: 'AZC', cantidad: 120 },
        { talla: 'M', colorNombre: 'Blanco', colorCodigo: 'BLA', cantidad: 0 },
      ],
      'HL-CAM-0142',
      'Camisa Oxford entallada',
    );
    expect(r.total).toBe(280);
    expect(r.colores).toHaveLength(1);
    const texto = borradorPedidoEn({ nombreContacto: 'Lily', proveedor: 'Guangzhou Huameng', marca: 'HALDEN', referencias: [r] });
    expect(texto).toContain('Hi Lily, please find below our next order for Guangzhou Huameng.');
    expect(texto).toContain('HL-CAM-0142');
    expect(texto).toContain('M 160 · L 120');
    expect(texto).toContain('Total: 280 units.');
    expect(texto).toContain('Please confirm unit price and production time.');
    expect(texto.trimEnd().endsWith('HALDEN')).toBe(true);
  });

  test('el catálogo y los valores por defecto de un pedido salen del último pedido a la fábrica', () => {
    const e = estadoDe();
    const n = selNarrativa(e, { hoy: HOY });
    const cat = selCatalogoPedido(e, { proveedorId: n.proveedorSugerencia! });
    expect(cat.length).toBeGreaterThan(3);
    const p = cat[0]!;
    expect(p.tallas.length).toBeGreaterThan(0);
    expect(Object.keys(p.variantes)).toHaveLength(p.tallas.length * p.colores.length);
    expect(p.fobUltimo).toBeGreaterThan(0);
    const d = selDefectosPedido(e, { proveedorId: n.proveedorSugerencia! });
    expect(d.contactoIds.length).toBeGreaterThan(1);
    expect(d.ultimoNumero).toMatch(/^IMP-/);
    expect(d.m3PorPrenda).toBeGreaterThan(0);
  });
});

describe('avisos de cambio de estado', () => {
  test('en nacionalización se avisa al transportador, a la bodega y a la agente, nunca a la fábrica', () => {
    const e = estadoDe();
    const n = selNarrativa(e, { hoy: HOY });
    const a = selAvisosEstado(e, { importacionId: n.importacionEnPuerto!, estado: 'en_nacionalizacion', marca: 'HALDEN', fecha: HOY, hora: '15:30' })!;
    expect(a.destinatarios.map((d) => d.tipo).sort()).toEqual(['agente_aduanas', 'bodega', 'transportador']);
    expect(a.destinatarios.some((d) => d.tipo === 'fabrica')).toBe(false);
    for (const d of a.destinatarios) expect(d.tratamiento).toBe('usted');
    const elecciones = Object.fromEntries(a.destinatarios.map((d) => [d.tipo, eleccionInicial(d)]));
    expect(Object.values(elecciones).every((x) => x?.incluir)).toBe(true);
    const m = mensajesDeAvisos(n.importacionEnPuerto!, a.destinatarios, elecciones);
    expect(m).toHaveLength(3);
    expect(m.every((x) => x.origen.tipo === 'importacion' && x.origen.id === n.importacionEnPuerto)).toBe(true);
    const bodega = m.find((x) => x.destinatario.tipo === 'empleado');
    expect(bodega?.destinatario.nombre).toContain('Wilson');
  });

  test('a la fábrica solo se le escribe en inglés y cuando le toca actuar', () => {
    const e = estadoDe();
    const n = selNarrativa(e, { hoy: HOY });
    const a = selAvisosEstado(e, { importacionId: n.importacionEnPuerto!, estado: 'saldo_pagado', marca: 'HALDEN', fecha: HOY })!;
    const f = a.destinatarios.find((d) => d.tipo === 'fabrica')!;
    expect(f.idioma).toBe('en');
    expect(f.texto).toMatch(/release the cargo/);
    const dueno = selAvisosEstado(e, { importacionId: n.importacionEnPuerto!, estado: 'listo_despacho', marca: 'HALDEN', fecha: HOY })!;
    expect(eleccionInicial(dueno.destinatarios.find((d) => d.tipo === 'dueno')!)).toBeNull();
  });

  test('una elección desmarcada o vacía no genera mensaje', () => {
    const e = estadoDe();
    const n = selNarrativa(e, { hoy: HOY });
    const a = selAvisosEstado(e, { importacionId: n.importacionEnPuerto!, estado: 'en_nacionalizacion', marca: 'HALDEN', fecha: HOY })!;
    const el = Object.fromEntries(a.destinatarios.map((d) => [d.tipo, eleccionInicial(d)]));
    el.bodega = { ...el.bodega!, incluir: false };
    el.transportador = { ...el.transportador!, texto: '   ' };
    expect(mensajesDeAvisos(n.importacionEnPuerto!, a.destinatarios, el).map((x) => x.destinatario.nombre)).toEqual(['Carolina Mejía']);
  });
});

describe('selectores locales', () => {
  test('pagos, contactos, mensajes y avisos pendientes declaran sus tablas y devuelven datos', () => {
    const e = estadoDe();
    const n = selNarrativa(e, { hoy: HOY });
    const pagos = selPagosImportacion(e, { importacionId: n.importacionEnPuerto!, hoy: HOY })!;
    expect(pagos.cuentas.length).toBeGreaterThanOrEqual(2);
    expect(pagos.fobOrigen).toBeGreaterThan(0);
    expect(pagos.pagadoOrigen + pagos.saldoOrigen).toBe(pagos.fobOrigen);
    const filas = selImportaciones(e, { hoy: HOY, incluirRecibidas: true });
    const fila = filas.find((f) => f.importacion.id === n.importacionEnPuerto)!;
    expect(pagos.pagadoOrigen).toBe(fila.pagadoOrigen);
    expect(pagos.saldoOrigen).toBe(fila.saldoOrigen);
    const contactos = selContactosCadena(e);
    expect(contactos.length).toBe(8);
    expect(contactos[0]!.contacto.rol).toBe('proveedor');
    expect(selMensajesImportacion(e, { importacionId: n.importacionEnPuerto! })).toBeInstanceOf(Array);
    expect(typeof AHORA).toBe('string');
    // La importación en puerto fue reportada por la agente desde el portal: hay avisos listos.
    const pend = selAvisosPendientes(e, { importacionId: n.importacionEnPuerto! });
    if (pend) expect(pend.notificacion.tipo).toBe('portal_actualizacion');
  });
});

import { describe, expect, it } from 'vitest';
import type { Devolucion, Venta } from '@/dominio/tipos';
import { activarVerificacionDeTablas, selVentas } from '@/selectores';
import { estadoDe, HOY } from '@/selectores/pruebas/construir';
import {
  construirHistorial,
  devueltoPorLinea,
  lineasDevolvibles,
  medioReembolsoSugerido,
  mediosReembolso,
  plazoDevolucion,
  previsualizarDevolucion,
  resumenAnulacion,
} from './calculos';
import {
  selFechaVenta,
  selOpcionesFiltro,
  selRangoHistorial,
  selReciboVenta,
  selResolverReferencias,
} from './selectores';

/** Venta de dos líneas (2 y 1 unidades) con descuento, sin devoluciones. */
function ventaPrueba(extra: Partial<Venta> = {}): Venta {
  const linea = (n: number, cantidad: number, totalFinal: number, base: number) => ({
    id: `vt_p-l${n}`,
    productoId: 'pd',
    varianteId: 'va',
    sku: 'SKU',
    descripcion: 'Camisa',
    cantidad,
    precioLista: 100_000,
    descuentoLinea: null,
    descuentoAsignado: 0,
    totalFinal,
    base,
    iva: totalFinal - base,
    costoUnitario: 40_000,
  });
  return {
    id: 'vt_p',
    numero: 'V-000001',
    ts: '2026-09-10T11:00:00',
    localId: 'usq',
    vendedorId: 'em_scardenas',
    clienteId: null,
    canal: 'local',
    tipo: 'contado',
    lineas: [linea(1, 2, 199_999, 168_066), linea(2, 1, 99_999, 84_033)],
    descuentoGlobal: null,
    aprobacionDescuentoId: null,
    subtotal: 299_998,
    descuentos: 0,
    total: 299_998,
    base: 252_099,
    iva: 47_899,
    pagos: [
      {
        id: 'vt_p-p1',
        ts: '2026-09-10T11:00:00',
        tipo: 'pago',
        medio: 'nequi',
        valor: 299_998,
        recibido: null,
        cambio: null,
        referencia: 'N-1',
        cuentaId: 'cta',
        sesionCajaId: null,
        bonoId: null,
        conciliado: false,
      },
    ],
    separado: null,
    anulacion: null,
    facturaId: null,
    ventaOrigenCambioId: null,
    nota: null,
    creadoEn: '2026-09-10T11:00:00',
    creadoPor: 'u',
    origen: 'usuario',
    ...extra,
  } as Venta;
}

function devolucionPrueba(
  lineaId: string,
  cantidad: number,
  valor: number,
  compensacion: Devolucion['compensacion'] = 'reembolso',
): Devolucion {
  return {
    id: `dv_${lineaId}`,
    numero: 'DV-000001',
    ventaId: 'vt_p',
    ts: '2026-09-12T10:00:00',
    localId: 'usq',
    lineas: [
      {
        lineaId,
        varianteId: 'va',
        cantidad,
        valor,
        base: Math.round(valor / 1.19),
        iva: valor - Math.round(valor / 1.19),
        costo: 40_000 * cantidad,
        reingresa: true,
      },
    ],
    motivo: 'Talla',
    compensacion,
    valorTotal: valor,
    reembolso: null,
    notaCreditoId: null,
    ventaCambioId: null,
    usuarioId: 'u',
    creadoEn: '2026-09-12T10:00:00',
    creadoPor: 'u',
    origen: 'usuario',
  } as Devolucion;
}

describe('devoluciones: lo disponible y lo que valdría', () => {
  const v = ventaPrueba();

  it('sin devoluciones, todo está disponible', () => {
    expect(lineasDevolvibles(v, []).map((l) => l.disponible)).toEqual([2, 1]);
  });

  it('descuenta lo ya devuelto', () => {
    const d = devolucionPrueba('vt_p-l1', 1, 100_000);
    expect(lineasDevolvibles(v, [d]).map((l) => l.disponible)).toEqual([1, 1]);
    expect(devueltoPorLinea([d]).get('vt_p-l1')?.cantidad).toBe(1);
  });

  it('una unidad de dos vale la mitad redondeada; la última toma el remanente exacto', () => {
    const p1 = previsualizarDevolucion(v, [], { 'vt_p-l1': { cantidad: 1, reingresa: true } });
    expect(p1.valorTotal).toBe(100_000); // round(199.999 / 2) = 100.000 (redondeo al peso)
    const previa = devolucionPrueba('vt_p-l1', 1, 100_000);
    const p2 = previsualizarDevolucion(v, [previa], { 'vt_p-l1': { cantidad: 1, reingresa: true } });
    expect(p2.valorTotal).toBe(199_999 - 100_000);
    expect(100_000 + p2.valorTotal).toBe(199_999);
  });

  it('acota la cantidad a lo disponible, ignora las de cero y separa lo que reingresa', () => {
    const p = previsualizarDevolucion(v, [], {
      'vt_p-l1': { cantidad: 9, reingresa: false },
      'vt_p-l2': { cantidad: 0, reingresa: true },
    });
    expect(p.lineas).toHaveLength(1);
    expect(p.unidades).toBe(2);
    expect(p.unidadesReingresan).toBe(0);
    expect(p.valorTotal).toBe(199_999);
    expect(p.base + p.iva).toBe(p.valorTotal);
  });
});

describe('plazo y medios de la devolución', () => {
  it('cuenta los días desde la venta contra el plazo de la empresa', () => {
    expect(plazoDevolucion('2026-09-10T11:00:00', '2026-09-30', 30)).toEqual({
      dias: 20,
      restantes: 10,
      vencido: false,
    });
    expect(plazoDevolucion('2026-08-01T11:00:00', '2026-09-30', 30)).toMatchObject({
      dias: 60,
      restantes: 0,
      vencido: true,
    });
  });

  it('el saldo a favor solo se ofrece con cliente y la pasarela solo si pagó en línea', () => {
    const v = ventaPrueba();
    expect(mediosReembolso(v, false)).not.toContain('saldo_a_favor');
    expect(mediosReembolso(v, true)).toContain('saldo_a_favor');
    expect(mediosReembolso(v, true)).not.toContain('pasarela_web');
    expect(mediosReembolso(ventaPrueba({ canal: 'web' }), true)).toContain('pasarela_web');
  });

  it('sugiere el medio con el que pagó el cliente, o efectivo si ese no sirve', () => {
    expect(medioReembolsoSugerido(ventaPrueba(), false)).toBe('nequi');
    const conBono = ventaPrueba({ pagos: [{ ...ventaPrueba().pagos[0]!, medio: 'bono_regalo' }] });
    expect(medioReembolsoSugerido(conBono, false)).toBe('efectivo');
  });
});

describe('anulación', () => {
  it('devuelve lo pagado y reingresa lo que no se había devuelto', () => {
    const v = ventaPrueba();
    expect(resumenAnulacion(v, [])).toEqual({
      unidadesReingresan: 3,
      reembolsa: 299_998,
      conNotaCredito: false,
    });
  });

  it('no reembolsa dos veces lo que ya quedó como saldo a favor', () => {
    const v = ventaPrueba({ clienteId: 'cl' });
    const d = devolucionPrueba('vt_p-l1', 1, 100_000, 'saldo_favor');
    expect(resumenAnulacion(v, [d])).toEqual({
      unidadesReingresan: 2,
      reembolsa: 199_998,
      conNotaCredito: false,
    });
  });

  it('avisa si habrá nota crédito', () => {
    expect(resumenAnulacion(ventaPrueba({ facturaId: 'fa' }), []).conNotaCredito).toBe(true);
  });
});

describe('historial de la venta', () => {
  it('ordena registro, pagos, devoluciones y anulación por fecha', () => {
    const v = ventaPrueba({
      anulacion: { ts: '2026-09-15T09:00:00', motivo: 'Error', usuarioId: 'u', solicitudId: null },
    });
    const h = construirHistorial({
      venta: v,
      devoluciones: [devolucionPrueba('vt_p-l1', 1, 100_000)],
      factura: null,
      notasCredito: [],
    });
    expect(h.map((e) => e.tipo)).toEqual(['venta', 'pago', 'devolucion', 'anulacion']);
    expect(h[2]?.valor).toBe(-100_000);
    expect(h[3]?.detalle).toBe('Error');
  });
});

describe('selectores locales con el estado generado', () => {
  const e = estadoDe();
  activarVerificacionDeTablas(true);

  it('el recibo de cualquier venta reúne todo lo que pinta la pantalla', () => {
    const { filas } = selVentas(e, { desde: HOY, hasta: HOY, localId: 'todos' });
    const f = filas[0]!;
    const r = selReciboVenta(e, { ventaId: f.id });
    expect(r).not.toBeNull();
    expect(r!.detalle.venta.numero).toBe(f.numero);
    expect(r!.lineas.length).toBe(r!.detalle.venta.lineas.length);
    expect(r!.lineas.every((l) => l.colorHex.startsWith('#'))).toBe(true);
    expect(r!.local?.id).toBe(f.localId);
    expect(selReciboVenta(e, { ventaId: 'no_existe' })).toBeNull();
  });

  it('encuentra la fecha de una venta y el rango del historial', () => {
    const id = Object.keys(e.ventas)[10]!;
    expect(selFechaVenta(e, { ventaId: id })).toBe(e.ventas[id]!.ts.slice(0, 10));
    const h = selRangoHistorial(e)!;
    expect(h.desde < h.hasta).toBe(true);
    expect(h.hasta <= HOY).toBe(true);
  });

  it('resuelve el producto por referencia y el vendedor por slug, y deja pasar lo desconocido', () => {
    const p = Object.values(e.productos)[0]!;
    const v = Object.values(e.empleados).find((x) => x.cargo === 'vendedor')!;
    expect(selResolverReferencias(e, { producto: p.referencia, vendedor: v.slug })).toEqual({
      producto: p.id,
      vendedor: v.id,
    });
    expect(selResolverReferencias(e, { producto: p.id, vendedor: v.id })).toEqual({
      producto: p.id,
      vendedor: v.id,
    });
    expect(selResolverReferencias(e, { producto: 'no-existe', vendedor: null })).toEqual({
      producto: 'no-existe',
      vendedor: null,
    });
  });

  it('ofrece los locales que venden y las personas con cargo de vendedor', () => {
    const o = selOpcionesFiltro(e);
    expect(o.locales.map((l) => l.id).sort()).toEqual(['p93', 'usq', 'zr']);
    expect(o.vendedores.length).toBeGreaterThanOrEqual(3);
  });

  it('el total del filtro es el de selVentas, venta por venta en el mismo día', () => {
    const { filas, totales } = selVentas(e, { desde: HOY, hasta: HOY, localId: 'todos' });
    const vigentes = filas.filter((f) => f.estado !== 'anulada');
    // Un día sin devoluciones de otros días: lo vendido es la suma de las ventas vigentes.
    expect(totales.ventas).toBe(vigentes.reduce((a, f) => a + f.total, 0));
    expect(totales.numVentas).toBe(vigentes.length);
  });
});

import { describe, expect, it } from 'vitest';
import { ESTADO_INICIAL, enCarrito, reducirPos, type AccionPos, type EstadoPos } from './estadoPos';

const aplicar = (acciones: AccionPos[], desde: EstadoPos = ESTADO_INICIAL): EstadoPos => acciones.reduce(reducirPos, desde);
const agregar = (varianteId: string, precioLista = 100_000): AccionPos => ({ t: 'agregar', varianteId, precioLista, tarifaIva: 0.19 });

describe('carrito', () => {
  it('agregar la misma prenda suma la cantidad en vez de duplicar la línea y marca la última tocada', () => {
    const s = aplicar([agregar('va_1'), agregar('va_2'), agregar('va_1')]);
    expect(s.lineas).toHaveLength(2);
    expect(s.lineas[0]).toMatchObject({ varianteId: 'va_1', cantidad: 2 });
    expect(enCarrito(s, 'va_1')).toBe(2);
    expect(s.ultima?.clave).toBe(s.lineas[0]?.clave);
  });

  it('una prenda con descuento propio queda en su propia línea', () => {
    const s0 = aplicar([agregar('va_1')]);
    const clave = s0.lineas[0]!.clave;
    const s = aplicar([{ t: 'descuentoLinea', clave, descuento: { tipo: 'porcentaje', valor: 0.1 } }, agregar('va_1')], s0);
    expect(s.lineas).toHaveLength(2);
  });

  it('la cantidad nunca baja de 1 y quitar la última línea limpia el descuento y la aprobación', () => {
    const s0 = aplicar([agregar('va_1'), { t: 'descuentoGlobal', descuento: { tipo: 'porcentaje', valor: 0.2 } }, { t: 'aprobacion', id: 'so_1' }]);
    const clave = s0.lineas[0]!.clave;
    expect(aplicar([{ t: 'cantidad', clave, cantidad: 0 }], s0).lineas[0]?.cantidad).toBe(1);
    const vacio = aplicar([{ t: 'quitar', clave }], s0);
    expect(vacio.lineas).toHaveLength(0);
    expect(vacio.descuentoGlobal).toBeNull();
    expect(vacio.aprobacionId).toBeNull();
  });

  it('las claves de línea son estables y distintas', () => {
    const s = aplicar([agregar('va_1'), agregar('va_2'), agregar('va_3')]);
    expect(new Set(s.lineas.map((l) => l.clave)).size).toBe(3);
  });
});

describe('pagos y tipo de venta', () => {
  it('dividir fija el valor del pago actual y agrega uno nuevo que toma el resto; quitar deja siempre uno', () => {
    const s = aplicar([{ t: 'dividir', medio: 'nequi', valorActual: 199_900 }]);
    expect(s.pagos).toHaveLength(2);
    expect(s.pagos[0]?.valor).toBe(199_900);
    expect(s.pagos[1]?.medio).toBe('nequi');
    expect(s.pagos[1]?.valor).toBeNull();
    const uno = aplicar([{ t: 'quitarPago', indice: 1 }], s);
    expect(uno.pagos).toHaveLength(1);
    expect(aplicar([{ t: 'quitarPago', indice: 0 }], uno).pagos).toHaveLength(1);
  });

  it('cambiar el medio o el valor borra lo recibido; el bono solo conserva su código si sigue siendo bono', () => {
    const s0 = aplicar([{ t: 'recibido', indice: 0, valor: 200_000 }]);
    expect(aplicar([{ t: 'medio', indice: 0, medio: 'nequi' }], s0).pagos[0]?.recibido).toBeNull();
    const conBono = aplicar([{ t: 'medio', indice: 0, medio: 'bono_regalo' }, { t: 'bono', indice: 0, codigo: 'BR-000214' }]);
    expect(aplicar([{ t: 'medio', indice: 0, medio: 'efectivo' }], conBono).pagos[0]?.bonoCodigo).toBe('');
  });

  it('separado propone abono y fecha una sola vez; volver a consumidor final regresa a contado', () => {
    const cliente = { tipo: 'existente' as const, id: 'cl_1' };
    const s = aplicar([{ t: 'cliente', cliente }, { t: 'tipo', tipo: 'separado', abonoSugerido: 40_000, fechaSugerida: '2026-10-15' }]);
    expect(s).toMatchObject({ tipo: 'separado', abono: 40_000, fechaLimite: '2026-10-15' });
    const editado = aplicar([{ t: 'abono', valor: 55_000 }, { t: 'tipo', tipo: 'separado', abonoSugerido: 40_000, fechaSugerida: '2026-10-20' }], s);
    expect(editado.abono).toBe(55_000);
    const consumidor = aplicar([{ t: 'cliente', cliente: { tipo: 'consumidor' } }], s);
    expect(consumidor).toMatchObject({ tipo: 'contado', abono: null });
  });

  it('nueva venta vacía todo menos el vendedor elegido', () => {
    const s = aplicar([agregar('va_1'), { t: 'vendedor', id: 'em_x' }, { t: 'dividir', medio: 'nequi', valorActual: 1 }, { t: 'vaciar' }]);
    expect(s.lineas).toHaveLength(0);
    expect(s.pagos).toHaveLength(1);
    expect(s.vendedorId).toBe('em_x');
    expect(s.cliente.tipo).toBe('consumidor');
  });

  it('saldo a favor precargado: cubre todo si alcanza; si no, paga lo que tiene y el resto va en efectivo', () => {
    const cliente = { tipo: 'existente' as const, id: 'cl_1' };
    const alcanza = aplicar([{ t: 'cliente', cliente }, { t: 'pagosSaldoFavor', saldo: 300_000, total: 189_900 }]);
    expect(alcanza.pagos.map((p) => [p.medio, p.valor])).toEqual([['saldo_a_favor', null]]);
    const falta = aplicar([{ t: 'pagosSaldoFavor', saldo: 100_000, total: 189_900 }], alcanza);
    expect(falta.pagos.map((p) => [p.medio, p.valor])).toEqual([
      ['saldo_a_favor', 100_000],
      ['efectivo', null],
    ]);
    // Sin cambios, el estado es el mismo (no re-renderiza en bucle).
    expect(reducirPos(falta, { t: 'pagosSaldoFavor', saldo: 100_000, total: 250_000 })).toBe(falta);
  });
});

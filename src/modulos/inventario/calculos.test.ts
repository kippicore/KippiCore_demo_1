import { describe, expect, it } from 'vitest';
import { accionesTraslado, diferenciaConteo, estadoCelda, etapaTraslado, ordenarTallas, proponerDistribucion, resumirConteo, sugerirOrigen, trasladables, ultimoCambioDeCosto } from './calculos';

describe('estado de una celda de la matriz', () => {
  it('cero, bajo el mínimo y normal; la bodega no tiene mínimo', () => {
    expect(estadoCelda(0, 2)).toBe('cero');
    expect(estadoCelda(1, 2)).toBe('bajo');
    expect(estadoCelda(2, 2)).toBe('normal');
    expect(estadoCelda(1, 2, false)).toBe('normal');
    expect(estadoCelda(0, 2, false)).toBe('cero');
  });

  it('ordena las tallas por su curva', () => {
    expect(ordenarTallas(['XL', 'S', 'M', 'XXL', 'L'], 'superior')).toEqual(['S', 'M', 'L', 'XL', 'XXL']);
    expect(ordenarTallas(['34', '28', '40', '32'], 'pantalon')).toEqual(['28', '32', '34', '40']);
  });
});

describe('sugerencia de traslado (W2)', () => {
  const locales = [
    { id: 'p93', vende: true, existencia: 2 },
    { id: 'usq', vende: true, existencia: 1 },
    { id: 'zr', vende: true, existencia: 6 },
    { id: 'bod', vende: false, existencia: 0 },
  ];

  it('trae de Zona Rosa (6 disponibles) lo que le falta a Usaquén', () => {
    const s = sugerirOrigen({ destinoId: 'usq', minimo: 2, locales });
    expect(s).toEqual({ origenId: 'zr', disponibles: 6, trasladables: 4, cantidad: 3 });
  });

  it('un local no queda por debajo de su mínimo al dar', () => {
    expect(trasladables({ id: 'p93', vende: true, existencia: 2 }, 2)).toBe(0);
    expect(trasladables({ id: 'bod', vende: false, existencia: 5 }, 2)).toBe(5);
  });

  it('sin excedente en las tiendas, ofrece la bodega; sin nada, null', () => {
    const conBodega = locales.map((l) => (l.id === 'zr' ? { ...l, existencia: 2 } : l.id === 'bod' ? { ...l, existencia: 10 } : l));
    expect(sugerirOrigen({ destinoId: 'usq', minimo: 2, locales: conBodega })?.origenId).toBe('bod');
    expect(sugerirOrigen({ destinoId: 'usq', minimo: 2, locales: locales.map((l) => ({ ...l, existencia: l.id === 'usq' || l.id === 'bod' ? 0 : 1 })) })).toBeNull();
  });

  it('la cantidad propuesta no pasa de lo trasladable', () => {
    const s = sugerirOrigen({ destinoId: 'usq', minimo: 5, locales: [{ id: 'usq', vende: true, existencia: 0 }, { id: 'zr', vende: true, existencia: 7 }] });
    expect(s?.cantidad).toBe(2);
  });
});

describe('traslados', () => {
  it('qué se puede hacer según el estado', () => {
    expect(accionesTraslado({ estado: 'solicitado', aprobacion: 'no_requerida' })).toEqual({ aprobar: false, despachar: true, recibir: false, cancelar: true });
    expect(accionesTraslado({ estado: 'solicitado', aprobacion: 'pendiente' })).toEqual({ aprobar: true, despachar: false, recibir: false, cancelar: true });
    expect(accionesTraslado({ estado: 'en_transito', aprobacion: 'aprobada' })).toEqual({ aprobar: false, despachar: false, recibir: true, cancelar: true });
    expect(accionesTraslado({ estado: 'recibido', aprobacion: 'no_requerida' })).toEqual({ aprobar: false, despachar: false, recibir: false, cancelar: false });
  });

  it('etapa de la línea de tiempo', () => {
    expect(['solicitado', 'en_transito', 'recibido', 'cancelado'].map((e) => etapaTraslado(e as never))).toEqual([0, 1, 2, -1]);
  });
});

describe('conteo físico', () => {
  it('clasifica cada diferencia', () => {
    expect(diferenciaConteo(5, null)).toEqual({ tipo: 'sin_contar', diferencia: null });
    expect(diferenciaConteo(5, 5)).toEqual({ tipo: 'cuadra', diferencia: 0 });
    expect(diferenciaConteo(5, 7)).toEqual({ tipo: 'sobrante', diferencia: 2 });
    expect(diferenciaConteo(5, 3)).toEqual({ tipo: 'faltante', diferencia: -2 });
  });

  it('resume contadas, diferencias y valor a costo', () => {
    const r = resumirConteo([
      { sistema: 5, contado: 5, costo: 100 },
      { sistema: 5, contado: 7, costo: 100 },
      { sistema: 4, contado: 1, costo: 50 },
      { sistema: 3, contado: null, costo: 80 },
    ]);
    expect(r).toEqual({ total: 4, contadas: 3, sinContar: 1, conDiferencia: 2, unidadesSobrantes: 2, unidadesFaltantes: 3, valorDiferencia: 2 * 100 - 3 * 50 });
  });
});

describe('distribución propuesta en la recepción', () => {
  it('reparte en proporción a las ventas, suma exacta y deja la reserva en bodega', () => {
    const r = proponerDistribucion({ buenas: 100, destinos: [{ id: 'p93', ventas: 50 }, { id: 'usq', ventas: 30 }, { id: 'zr', ventas: 20 }] });
    expect(r).toEqual({ p93: 40, usq: 24, zr: 16 });
    expect(Object.values(r).reduce((a, b) => a + b, 0)).toBe(80);
  });

  it('el método del mayor resto no pierde unidades', () => {
    const r = proponerDistribucion({ buenas: 7, destinos: [{ id: 'a', ventas: 1 }, { id: 'b', ventas: 1 }, { id: 'c', ventas: 1 }], reserva: 0 });
    expect(Object.values(r).reduce((a, b) => a + b, 0)).toBe(7);
    expect(Math.max(...Object.values(r)) - Math.min(...Object.values(r))).toBeLessThanOrEqual(1);
  });

  it('sin ventas reparte parejo y sin unidades deja todo en cero', () => {
    const r = proponerDistribucion({ buenas: 30, destinos: [{ id: 'a', ventas: 0 }, { id: 'b', ventas: 0 }], reserva: 0 });
    expect(r).toEqual({ a: 15, b: 15 });
    expect(proponerDistribucion({ buenas: 0, destinos: [{ id: 'a', ventas: 3 }] })).toEqual({ a: 0 });
  });
});

describe('cambio de costo (W4)', () => {
  it('detecta el último cambio respecto al anterior', () => {
    const c = ultimoCambioDeCosto([{ costo: 60_000 }, { costo: 66_000 }, { costo: 66_000 }]);
    expect(c).toEqual({ costoAnterior: 60_000, costoActual: 66_000, variacion: 0.1 });
  });
  it('sin historial suficiente no hay cambio', () => {
    expect(ultimoCambioDeCosto([{ costo: 60_000 }])).toBeNull();
    expect(ultimoCambioDeCosto([{ costo: 60_000 }, { costo: 60_000 }])).toBeNull();
    expect(ultimoCambioDeCosto([])).toBeNull();
  });
});

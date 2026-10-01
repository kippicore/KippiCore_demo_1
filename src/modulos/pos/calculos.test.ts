import { describe, expect, it } from 'vitest';
import {
  abonoMinimo,
  abonoSugerido,
  cambioPorMedio,
  cuentaEfectivo,
  denominacionesParaCierre,
  distanciaATurno,
  fraccionDescuento,
  lecturaDiferencia,
  motivoBloqueo,
  ordenarPorCercania,
  recibidoConBillete,
  superaMaximo,
  totalArqueo,
  totalesCarrito,
  valoresPagos,
  type EntradaValidacion,
  type LineaCarrito,
} from './calculos';

const chino: LineaCarrito = { clave: 'l1', varianteId: 'va_pan_0305_are_32', cantidad: 1, precioLista: 199_900, tarifaIva: 0.19, descuento: null };
const blazer: LineaCarrito = { clave: 'l2', varianteId: 'va_blz_0401_azn_50', cantidad: 1, precioLista: 789_900, tarifaIva: 0.19, descuento: null };

describe('totales del carrito (V1: la regla de dominio, no una copia)', () => {
  it('W1: un pantalón de $ 199.900 → base $ 167.983 e IVA $ 31.917', () => {
    const t = totalesCarrito([chino], null);
    expect(t.total).toBe(199_900);
    expect(t.base).toBe(167_983);
    expect(t.iva).toBe(31_917);
    expect(t.descuentos).toBe(0);
  });

  it('descuento global en porcentaje se reparte y los totales siguen sumando', () => {
    const t = totalesCarrito([chino, blazer], { tipo: 'porcentaje', valor: 0.1 });
    expect(t.subtotal).toBe(989_800);
    expect(t.descuentos).toBe(98_980);
    expect(t.total).toBe(890_820);
    expect(t.lineas.reduce((a, l) => a + l.totalFinal, 0)).toBe(t.total);
    expect(t.base + t.iva).toBe(t.total);
  });

  it('descuento por línea en valor y fracción efectiva del descuento', () => {
    const t = totalesCarrito([{ ...blazer, descuento: { tipo: 'valor', valor: 158_000 } }], null);
    expect(t.total).toBe(631_900);
    expect(fraccionDescuento(t)).toBeCloseTo(0.2, 3);
  });

  it('superaMaximo: hasta el 15 % no pide aprobación; por encima, sí', () => {
    const quince = totalesCarrito([blazer], { tipo: 'porcentaje', valor: 0.15 });
    const veinte = totalesCarrito([blazer], { tipo: 'porcentaje', valor: 0.2 });
    expect(superaMaximo(quince, 0.15)).toBe(false);
    expect(superaMaximo(veinte, 0.15)).toBe(true);
    expect(superaMaximo(totalesCarrito([blazer], null), 0.15)).toBe(false);
  });
});

describe('pagos: reparto, efectivo y billetes', () => {
  it('un solo pago cobra todo el objetivo; con varios, el último toma el resto', () => {
    expect(valoresPagos(199_900, [{ valor: null }])).toEqual([199_900]);
    expect(valoresPagos(199_900, [{ valor: 100_000 }, { valor: null }])).toEqual([100_000, 99_900]);
    expect(valoresPagos(199_900, [{ valor: 50_000 }, { valor: 50_000 }, { valor: null }])).toEqual([50_000, 50_000, 99_900]);
  });

  it('un pago que pasa del objetivo se acota y la suma nunca lo supera', () => {
    const v = valoresPagos(100_000, [{ valor: 150_000 }, { valor: null }]);
    expect(v).toEqual([100_000, 0]);
    expect(v.reduce((a, b) => a + b, 0)).toBe(100_000);
    expect(valoresPagos(0, [{ valor: 5 }])).toEqual([0]);
    expect(valoresPagos(100_000, [])).toEqual([]);
  });

  it('billetes: el menor número de billetes que cubre el valor', () => {
    expect(recibidoConBillete(189_900, 100_000)).toBe(200_000);
    expect(recibidoConBillete(189_900, 50_000)).toBe(200_000);
    expect(recibidoConBillete(189_900, 20_000)).toBe(200_000);
    expect(recibidoConBillete(30_000, 100_000)).toBe(100_000);
    expect(recibidoConBillete(100_000, 100_000)).toBe(100_000);
    expect(recibidoConBillete(0, 20_000)).toBe(20_000);
  });

  it('cambio y faltante de efectivo (sin recibido = exacto)', () => {
    expect(cuentaEfectivo(189_900, null)).toEqual({ recibido: 189_900, cambio: 0, falta: 0 });
    expect(cuentaEfectivo(189_900, 200_000)).toEqual({ recibido: 200_000, cambio: 10_100, falta: 0 });
    expect(cuentaEfectivo(189_900, 150_000)).toEqual({ recibido: 150_000, cambio: 0, falta: 39_900 });
  });

  it('separado: abono mínimo del 20 % y sugerido redondeado, sin llegar al total', () => {
    expect(abonoMinimo(199_900, 0.2)).toBe(39_980);
    expect(abonoSugerido(199_900, 0.2)).toBe(40_000);
    expect(abonoSugerido(199_900, 0.2)).toBeGreaterThanOrEqual(abonoMinimo(199_900, 0.2));
    expect(abonoSugerido(789_900, 0.2)).toBe(158_000);
    expect(abonoSugerido(1_000, 0.99)).toBeLessThan(1_000);
  });
});

const base: EntradaValidacion = {
  numLineas: 1,
  vendedorId: 'em_scardenas',
  tipo: 'contado',
  total: 199_900,
  objetivo: 199_900,
  abonoMinimo: 39_980,
  pagos: [{ medio: 'efectivo', valor: 199_900, recibido: null, bonoSaldo: null, bonoValido: false }],
  clienteIdentificado: false,
  fechaLimite: null,
  hoy: '2026-09-30',
  maximoFecha: '2026-10-30',
  efectivoSinCaja: false,
  descuentoSinAprobar: false,
};

describe('motivo por el que todavía no se puede confirmar', () => {
  it('una venta completa de contado en efectivo está lista', () => {
    expect(motivoBloqueo(base)).toBeNull();
  });

  it('carrito vacío, sin vendedor y descuento sin aprobar bloquean, en ese orden', () => {
    expect(motivoBloqueo({ ...base, numLineas: 0 })).toMatch(/prenda/);
    expect(motivoBloqueo({ ...base, vendedorId: null })).toMatch(/vendedor/);
    expect(motivoBloqueo({ ...base, descuentoSinAprobar: true })).toMatch(/aprobación/);
  });

  it('efectivo sin caja abierta bloquea; con Nequi no importa', () => {
    expect(motivoBloqueo({ ...base, efectivoSinCaja: true })).toMatch(/Abre la caja/);
    expect(motivoBloqueo({ ...base, efectivoSinCaja: true, pagos: [{ medio: 'nequi', valor: 199_900, recibido: null, bonoSaldo: null, bonoValido: false }] })).toBeNull();
  });

  it('efectivo recibido menor al valor bloquea', () => {
    expect(motivoBloqueo({ ...base, pagos: [{ medio: 'efectivo', valor: 199_900, recibido: 150_000, bonoSaldo: null, bonoValido: false }] })).toMatch(/no alcanza/);
  });

  it('bono: exige código válido y saldo suficiente', () => {
    const pago = (bonoValido: boolean, bonoSaldo: number | null) => ({ medio: 'bono_regalo' as const, valor: 199_900, recibido: null, bonoSaldo, bonoValido });
    expect(motivoBloqueo({ ...base, pagos: [pago(false, null)] })).toMatch(/bono válido/);
    expect(motivoBloqueo({ ...base, pagos: [pago(true, 100_000)] })).toMatch(/saldo/);
    expect(motivoBloqueo({ ...base, pagos: [pago(true, 250_000)] })).toBeNull();
  });

  it('separado: cliente, abono mínimo, abono menor al total y fecha dentro del plazo', () => {
    const sep = { ...base, tipo: 'separado' as const, objetivo: 60_000, fechaLimite: '2026-10-15', clienteIdentificado: true, pagos: [{ medio: 'efectivo' as const, valor: 60_000, recibido: null, bonoSaldo: null, bonoValido: false }] };
    expect(motivoBloqueo(sep)).toBeNull();
    expect(motivoBloqueo({ ...sep, clienteIdentificado: false })).toMatch(/cliente/);
    expect(motivoBloqueo({ ...sep, objetivo: 30_000 })).toMatch(/mínimo/);
    expect(motivoBloqueo({ ...sep, objetivo: 199_900 })).toMatch(/contado/);
    expect(motivoBloqueo({ ...sep, fechaLimite: '2026-12-01' })).toMatch(/plazo/);
    expect(motivoBloqueo({ ...sep, fechaLimite: '2026-09-01' })).toMatch(/plazo/);
  });
});

describe('vendedor de turno más cercano (W1)', () => {
  const turnos = [
    { empleadoId: 'em_a', inicio: '10:00', fin: '18:00' },
    { empleadoId: 'em_b', inicio: '12:00', fin: '20:00' },
    { empleadoId: 'em_c', inicio: '17:00', fin: '21:00' },
  ];

  it('distancia: 0 dentro del turno; si no, al inicio o al fin', () => {
    expect(distanciaATurno(turnos[1]!, '15:30')).toBe(0);
    expect(distanciaATurno(turnos[1]!, '11:30')).toBe(30);
    expect(distanciaATurno(turnos[1]!, '20:45')).toBe(45);
  });

  it('el de turno ahora va primero y, entre varios, el que empezó antes', () => {
    expect(ordenarPorCercania(turnos, '15:30').map((t) => t.empleadoId)).toEqual(['em_a', 'em_b', 'em_c']);
    expect(ordenarPorCercania(turnos, '19:00').map((t) => t.empleadoId)).toEqual(['em_b', 'em_c', 'em_a']);
    expect(ordenarPorCercania(turnos, '08:00').map((t) => t.empleadoId)[0]).toBe('em_a');
  });
});

describe('arqueo de caja (V8)', () => {
  it('suma billetes por cantidad y las monedas por valor', () => {
    expect(totalArqueo({ '100000': 11, '50000': 3, '20000': 1, monedas: 7_500 })).toBe(1_100_000 + 150_000 + 20_000 + 7_500);
    expect(totalArqueo({})).toBe(0);
  });

  it('el cierre manda solo lo contado, en el orden de las denominaciones', () => {
    expect(denominacionesParaCierre({ '50000': 2, '100000': 1, '20000': 0 })).toEqual({ '100000': 1, '50000': 2 });
    expect(denominacionesParaCierre({ '100000': 0 })).toBeNull();
    expect(denominacionesParaCierre({})).toBeNull();
  });

  it('la diferencia se lee como cuadró, faltante o sobrante', () => {
    expect(lecturaDiferencia(0)).toBe('cuadro');
    expect(lecturaDiferencia(-40_000)).toBe('faltante');
    expect(lecturaDiferencia(15_000)).toBe('sobrante');
  });

  it('lo que entra a la caja con una venta: solo los medios que cambian, efectivo primero', () => {
    const r = cambioPorMedio({ efectivo: 300_000, datafono_debito: 1_000_000 }, { efectivo: 400_000, datafono_debito: 1_000_000, nequi: 99_900 });
    expect(r).toEqual([
      { medio: 'efectivo', valor: 100_000 },
      { medio: 'nequi', valor: 99_900 },
    ]);
  });
});

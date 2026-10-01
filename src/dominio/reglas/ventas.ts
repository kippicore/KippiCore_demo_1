import type { COP, Descuento, Devolucion, Fraccion, LineaVenta, Venta } from '../tipos';
import { prorratearMayorResiduo, redondear } from './dinero';

/** Totales de ventas (PLAN 6.19 V1–V4, 6.20.1, 6.20.2). */

export interface EntradaLinea {
  precioLista: COP;
  cantidad: number;
  descuento: Descuento | null;
  tarifaIva: Fraccion;
}

export interface LineaCalculada {
  bruto: COP;
  descuentoLinea: COP;
  parteGlobal: COP;
  descuentoAsignado: COP;
  totalFinal: COP;
  base: COP;
  iva: COP;
}

export interface TotalesVenta {
  lineas: LineaCalculada[];
  subtotal: COP;
  descuentos: COP;
  descuentoGlobal: COP;
  total: COP;
  base: COP;
  iva: COP;
}

/** Valor de un descuento sobre un bruto: porcentaje redondeado o valor acotado al bruto. */
export function valorDescuento(bruto: COP, descuento: Descuento | null): COP {
  if (!descuento) return 0;
  if (descuento.tipo === 'porcentaje') return Math.min(bruto, redondear(bruto * descuento.valor));
  return Math.max(0, Math.min(redondear(descuento.valor), bruto));
}

/** Base sin IVA de un valor con IVA incluido (V1). */
export function baseSinIva(totalConIva: COP, tarifaIva: Fraccion): COP {
  return redondear(totalConIva / (1 + tarifaIva));
}

/**
 * Calcula las líneas y los totales de una venta (V1, 6.20.1). El descuento global se reparte entre líneas en
 * proporción a (bruto − descuento de línea) con el mayor residuo. Nunca se redondea a nivel de venta.
 */
export function calcularVenta(
  lineas: readonly EntradaLinea[],
  descuentoGlobal: Descuento | null,
): TotalesVenta {
  const brutos = lineas.map((l) => l.precioLista * l.cantidad);
  const descLinea = lineas.map((l, i) => valorDescuento(brutos[i] ?? 0, l.descuento));
  const netos = brutos.map((b, i) => b - (descLinea[i] ?? 0));
  const sumaNetos = netos.reduce((a, b) => a + b, 0);
  const global = valorDescuento(sumaNetos, descuentoGlobal);
  const partes = prorratearMayorResiduo(global, netos);
  const calculadas: LineaCalculada[] = lineas.map((l, i) => {
    const bruto = brutos[i] ?? 0;
    const dl = descLinea[i] ?? 0;
    const pg = partes[i] ?? 0;
    const totalFinal = bruto - dl - pg;
    const base = baseSinIva(totalFinal, l.tarifaIva);
    return {
      bruto,
      descuentoLinea: dl,
      parteGlobal: pg,
      descuentoAsignado: dl + pg,
      totalFinal,
      base,
      iva: totalFinal - base,
    };
  });
  const suma = (k: keyof LineaCalculada) => calculadas.reduce((a, c) => a + c[k], 0);
  return {
    lineas: calculadas,
    subtotal: suma('bruto'),
    descuentos: suma('descuentoAsignado'),
    descuentoGlobal: global,
    total: suma('totalFinal'),
    base: suma('base'),
    iva: suma('iva'),
  };
}

/** Descuento efectivo de la venta (fracción del subtotal), para la regla del máximo del vendedor. */
export function porcentajeDescuento(subtotal: COP, descuentos: COP): Fraccion {
  return subtotal > 0 ? descuentos / subtotal : 0;
}

/** Σ pagos (los reembolsos son negativos). */
export function totalPagado(venta: Pick<Venta, 'pagos'>): COP {
  let s = 0;
  for (const p of venta.pagos) s += p.valor;
  return s;
}

/** Σ valor de las devoluciones de la venta. */
export function totalDevuelto(devoluciones: readonly Pick<Devolucion, 'valorTotal'>[]): COP {
  let s = 0;
  for (const d of devoluciones) s += d.valorTotal;
  return s;
}

/** saldo(venta) = max(0, total − Σ devoluciones − Σ pagos) (V3). */
export function saldoVenta(
  venta: Pick<Venta, 'total' | 'pagos'>,
  devoluciones: readonly Pick<Devolucion, 'valorTotal'>[],
): COP {
  return Math.max(0, venta.total - totalDevuelto(devoluciones) - totalPagado(venta));
}

export type EstadoVenta = 'pagada' | 'separado' | 'credito' | 'devuelta' | 'devuelta_parcial' | 'anulada';

/** Estado derivado de una venta (6.6). Un separado cancelado se muestra como anulado. */
export function estadoVenta(venta: Venta, devoluciones: readonly Devolucion[]): EstadoVenta {
  if (venta.anulacion) return 'anulada';
  if (venta.separado?.cerrado?.resultado === 'cancelado') return 'anulada';
  const vendidas = venta.lineas.reduce((a, l) => a + l.cantidad, 0);
  const devueltas = devoluciones.reduce((a, d) => a + d.lineas.reduce((b, l) => b + l.cantidad, 0), 0);
  if (vendidas > 0 && devueltas >= vendidas) return 'devuelta';
  const saldo = saldoVenta(venta, devoluciones);
  if (venta.tipo === 'separado' && !venta.separado?.cerrado) return 'separado';
  if (venta.tipo === 'credito' && saldo > 0) return 'credito';
  if (devueltas > 0) return 'devuelta_parcial';
  return 'pagada';
}

export interface ValoresDevueltos {
  cantidad: number;
  valor: COP;
  base: COP;
  iva: COP;
  costo: COP;
}

/**
 * Valores de devolver `cantidad` unidades de una línea (6.20.2): proporcionales y redondeados; la última
 * devolución de la línea toma el remanente exacto (las devoluciones de una línea suman su total).
 */
export function valoresDevolucionLinea(
  linea: LineaVenta,
  cantidad: number,
  yaDevuelto: ValoresDevueltos,
): ValoresDevueltos {
  const costo = linea.costoUnitario * cantidad;
  if (yaDevuelto.cantidad + cantidad >= linea.cantidad) {
    const valor = linea.totalFinal - yaDevuelto.valor;
    const base = linea.base - yaDevuelto.base;
    return { cantidad, valor, base, iva: valor - base, costo };
  }
  const valor = redondear((linea.totalFinal * cantidad) / linea.cantidad);
  const base = redondear((linea.base * cantidad) / linea.cantidad);
  return { cantidad, valor, base, iva: valor - base, costo };
}

/** Margen bruto de una línea (V6): base − costo × cantidad. */
export function margenLinea(linea: Pick<LineaVenta, 'base' | 'costoUnitario' | 'cantidad'>): COP {
  return linea.base - linea.costoUnitario * linea.cantidad;
}

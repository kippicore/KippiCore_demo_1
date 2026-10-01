import type { COP, Descuento, Fraccion, Id, MedioPago } from '@/dominio/tipos';
import { calcularVenta, porcentajeDescuento, type TotalesVenta } from '@/dominio/reglas/ventas';
import { sumaDenominaciones } from '@/dominio/reglas/caja';
import { DENOMINACIONES } from '@/config/negocio';

/**
 * Cálculos propios del punto de venta y de la caja (A1). No reimplementan reglas de negocio: los totales de la
 * venta salen de `calcularVenta` (V1, idénticos a los del manejador) y el esperado de la caja de los selectores;
 * aquí solo viven las cuentas de la pantalla: reparto de pagos, cambio, billetes, abono mínimo, arqueo y turnos.
 */

// ---------------------------------------------------------------------------------------------------------
// Carrito y totales
// ---------------------------------------------------------------------------------------------------------
export interface LineaCarrito {
  clave: string;
  varianteId: Id;
  cantidad: number;
  /** Precio de lista unitario con IVA (el del producto). */
  precioLista: COP;
  tarifaIva: Fraccion;
  descuento: Descuento | null;
}

/** Totales del carrito con la regla de dominio (V1, 6.20.1): lo que ve el vendedor = lo que guarda el motor. */
export function totalesCarrito(lineas: readonly LineaCarrito[], descuentoGlobal: Descuento | null): TotalesVenta {
  return calcularVenta(
    lineas.map((l) => ({ precioLista: l.precioLista, cantidad: l.cantidad, descuento: l.descuento, tarifaIva: l.tarifaIva })),
    descuentoGlobal,
  );
}

/** Descuento efectivo de la venta como fracción del subtotal (regla del máximo del vendedor, 6.20.1). */
export function fraccionDescuento(t: Pick<TotalesVenta, 'subtotal' | 'descuentos'>): Fraccion {
  return porcentajeDescuento(t.subtotal, t.descuentos);
}

/** ¿El descuento de la venta supera el máximo del vendedor? Una milésima de holgura como el motor (1e-9). */
export function superaMaximo(t: Pick<TotalesVenta, 'subtotal' | 'descuentos'>, maximo: Fraccion): boolean {
  return fraccionDescuento(t) > maximo + 1e-9;
}

/** ¿El descuento es porcentual? (si no, es un valor en pesos). */
export function esPorcentaje(d: Descuento | null): d is Descuento & { tipo: 'porcentaje' } {
  return !!d && d.tipo === 'porcentaje';
}

// ---------------------------------------------------------------------------------------------------------
// Pagos
// ---------------------------------------------------------------------------------------------------------
export interface PagoEdicion {
  clave: string;
  medio: MedioPago;
  /** Valor manual; el último pago de la lista siempre toma el resto (valor ignorado). */
  valor: COP | null;
  /** Efectivo entregado por el cliente (null = exacto). */
  recibido: COP | null;
  referencia: string;
  /** Código escrito del bono de regalo ("BR-000214"). */
  bonoCodigo: string;
}

/**
 * Valor que cobra cada pago: los primeros, lo que escribió el vendedor (sin pasar del objetivo); el último, el
 * resto. Con un solo pago, todo el objetivo. La suma siempre es el objetivo (o menos si los primeros lo agotan).
 */
export function valoresPagos(objetivo: COP, pagos: readonly Pick<PagoEdicion, 'valor'>[]): COP[] {
  let resto = Math.max(0, objetivo);
  return pagos.map((p, i) => {
    if (i === pagos.length - 1) return resto;
    const v = Math.max(0, Math.min(p.valor ?? 0, resto));
    resto -= v;
    return v;
  });
}

export interface CuentaEfectivo {
  recibido: COP;
  cambio: COP;
  /** Falta efectivo para cubrir el valor del pago. */
  falta: COP;
}

/** Efectivo de un pago: lo recibido (por defecto, exacto), el cambio a devolver o lo que falta. */
export function cuentaEfectivo(valor: COP, recibido: COP | null): CuentaEfectivo {
  const r = recibido ?? valor;
  return { recibido: r, cambio: Math.max(0, r - valor), falta: Math.max(0, valor - r) };
}

/**
 * Efectivo recibido al tocar un billete: el menor número de billetes de esa denominación que cubre el valor
 * (189.900 con billetes de 100.000 → 200.000). Con valor 0, un billete.
 */
export function recibidoConBillete(valor: COP, billete: COP): COP {
  if (billete <= 0) return valor;
  return Math.max(1, Math.ceil(valor / billete)) * billete;
}

/** Abono mínimo de un separado (V2): `fraccion` del total, redondeado hacia arriba al peso. */
export function abonoMinimo(total: COP, fraccion: Fraccion): COP {
  return Math.ceil(total * fraccion);
}

/** Abono que se propone: el mínimo redondeado hacia arriba a mil pesos, sin llegar al total. */
export function abonoSugerido(total: COP, fraccion: Fraccion): COP {
  const minimo = abonoMinimo(total, fraccion);
  const redondeado = Math.ceil(minimo / 1000) * 1000;
  return Math.min(redondeado, Math.max(minimo, total - 1));
}

// ---------------------------------------------------------------------------------------------------------
// Confirmar
// ---------------------------------------------------------------------------------------------------------
export interface EntradaValidacion {
  numLineas: number;
  vendedorId: Id | null;
  tipo: 'contado' | 'separado';
  total: COP;
  /** Contado: el total. Separado: el abono inicial. */
  objetivo: COP;
  abonoMinimo: COP;
  pagos: readonly { medio: MedioPago; valor: COP; recibido: COP | null; bonoSaldo: COP | null; bonoValido: boolean }[];
  clienteIdentificado: boolean;
  fechaLimite: string | null;
  hoy: string;
  maximoFecha: string;
  efectivoSinCaja: boolean;
  descuentoSinAprobar: boolean;
}

/** Primer motivo por el que todavía no se puede confirmar (se muestra en el botón), o null si todo está listo. */
export function motivoBloqueo(e: EntradaValidacion): string | null {
  if (e.numLineas === 0) return 'Agrega al menos una prenda.';
  if (!e.vendedorId) return 'Elige el vendedor al que se le asigna la venta.';
  if (e.descuentoSinAprobar) return 'El descuento necesita la aprobación del dueño.';
  if (e.tipo === 'separado') {
    if (!e.clienteIdentificado) return 'Un separado necesita el cliente.';
    if (e.objetivo < e.abonoMinimo) return 'El abono no alcanza el mínimo del separado.';
    if (e.objetivo >= e.total) return 'Si paga todo, cóbrala de contado.';
    if (!e.fechaLimite || e.fechaLimite < e.hoy || e.fechaLimite > e.maximoFecha) return 'Elige una fecha límite dentro del plazo.';
  }
  if (e.objetivo <= 0) return 'Escribe cuánto se cobra.';
  if (e.pagos.some((p) => p.valor <= 0)) return 'Cada pago debe ser mayor que cero.';
  if (e.efectivoSinCaja && e.pagos.some((p) => p.medio === 'efectivo')) return 'Abre la caja para recibir efectivo.';
  for (const p of e.pagos) {
    if (p.medio === 'efectivo' && p.recibido !== null && p.recibido < p.valor) return 'El efectivo recibido no alcanza.';
    if (p.medio === 'bono_regalo') {
      if (!p.bonoValido) return 'Escribe un código de bono válido.';
      if ((p.bonoSaldo ?? 0) < p.valor) return 'El bono no tiene saldo suficiente.';
    }
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------
// Vendedor de turno
// ---------------------------------------------------------------------------------------------------------
export interface TurnoVendedor {
  empleadoId: Id;
  inicio: string;
  fin: string;
}

const aMinutos = (hhmm: string): number => {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
};

/** Distancia en minutos entre una hora y un turno: 0 si está dentro; si no, a su inicio o a su fin. */
export function distanciaATurno(t: Pick<TurnoVendedor, 'inicio' | 'fin'>, hhmm: string): number {
  const x = aMinutos(hhmm);
  const i = aMinutos(t.inicio);
  const f = aMinutos(t.fin);
  if (x >= i && x <= f) return 0;
  return x < i ? i - x : x - f;
}

/** Turnos ordenados del más cercano a la hora dada (el de turno ahora primero, luego el más próximo). */
export function ordenarPorCercania<T extends TurnoVendedor>(turnos: readonly T[], hhmm: string): T[] {
  return [...turnos].sort((a, b) => distanciaATurno(a, hhmm) - distanciaATurno(b, hhmm) || aMinutos(a.inicio) - aMinutos(b.inicio) || (a.empleadoId < b.empleadoId ? -1 : 1));
}

// ---------------------------------------------------------------------------------------------------------
// Caja y arqueo
// ---------------------------------------------------------------------------------------------------------
export type ClaveDenominacion = (typeof DENOMINACIONES)[number];

/** Valor de una denominación en pesos; las monedas se cuentan por valor (null). */
export function valorDenominacion(clave: string): number | null {
  return clave === 'monedas' ? null : Number(clave);
}

/** Σ del conteo (billetes por cantidad; 'monedas' ya viene en pesos). Misma regla del manejador (V8). */
export function totalArqueo(cantidades: Readonly<Record<string, number>>): COP {
  return sumaDenominaciones(cantidades as Record<string, number>);
}

/** Denominaciones con algo contado, para `caja.cerrar`; null si no se contó por denominación. */
export function denominacionesParaCierre(cantidades: Readonly<Record<string, number>>): Record<string, number> | null {
  const r: Record<string, number> = {};
  for (const clave of DENOMINACIONES) {
    const n = cantidades[clave] ?? 0;
    if (n > 0) r[clave] = n;
  }
  return Object.keys(r).length ? r : null;
}

export type ResultadoArqueo = 'cuadro' | 'faltante' | 'sobrante';

/** Lectura de la diferencia del arqueo (contado − esperado). */
export function lecturaDiferencia(diferencia: COP): ResultadoArqueo {
  return diferencia === 0 ? 'cuadro' : diferencia < 0 ? 'faltante' : 'sobrante';
}

/** Cambio por medio de pago entre dos instantáneas (efecto de la venta sobre la caja): solo los que cambian. */
export function cambioPorMedio(
  antes: Partial<Record<MedioPago, COP>>,
  despues: Partial<Record<MedioPago, COP>>,
): { medio: MedioPago; valor: COP }[] {
  const medios = new Set<MedioPago>([...(Object.keys(antes) as MedioPago[]), ...(Object.keys(despues) as MedioPago[])]);
  const r: { medio: MedioPago; valor: COP }[] = [];
  for (const m of medios) {
    const d = (despues[m] ?? 0) - (antes[m] ?? 0);
    if (d !== 0) r.push({ medio: m, valor: d });
  }
  // Efectivo primero, luego por valor.
  return r.sort((a, b) => (a.medio === 'efectivo' ? -1 : b.medio === 'efectivo' ? 1 : b.valor - a.valor));
}

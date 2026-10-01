import type { COP, Descuento, FechaISO, Fraccion, Id, MedioPago } from '@/dominio/tipos';
import type { LineaCarrito, PagoEdicion } from './calculos';

/**
 * Estado de la venta en curso del punto de venta (carrito, cliente, vendedor, pagos). Un reductor puro: se
 * prueba sin interfaz y la pantalla solo despacha acciones. Nada de esto se guarda en el estado de dominio hasta
 * confirmar con `registrarVenta`.
 */
export interface DatosClienteRapido {
  nombres: string;
  apellidos: string;
  celular: string;
  documento: string;
  correo: string;
}

export type ClienteSeleccionado =
  | { tipo: 'consumidor' }
  | { tipo: 'existente'; id: Id }
  | { tipo: 'nuevo'; datos: DatosClienteRapido };

export interface EstadoPos {
  lineas: LineaCarrito[];
  descuentoGlobal: Descuento | null;
  cliente: ClienteSeleccionado;
  /** null = el de turno más cercano (lo resuelve la pantalla). */
  vendedorId: Id | null;
  tipo: 'contado' | 'separado';
  abono: COP | null;
  fechaLimite: FechaISO | null;
  pagos: PagoEdicion[];
  /** Solicitud de aprobación de descuento en uso (vendedor). */
  aprobacionId: Id | null;
  /** Contador para claves estables y para disparar el destello de la última línea tocada. */
  seq: number;
  /** Clave de la última línea agregada o sumada (destello 900 ms). */
  ultima: { clave: string; n: number } | null;
}

export function pagoNuevo(clave: string, medio: MedioPago = 'efectivo'): PagoEdicion {
  return { clave, medio, valor: null, recibido: null, referencia: '', bonoCodigo: '' };
}

export const ESTADO_INICIAL: EstadoPos = {
  lineas: [],
  descuentoGlobal: null,
  cliente: { tipo: 'consumidor' },
  vendedorId: null,
  tipo: 'contado',
  abono: null,
  fechaLimite: null,
  pagos: [pagoNuevo('p1')],
  aprobacionId: null,
  seq: 1,
  ultima: null,
};

export type AccionPos =
  | { t: 'agregar'; varianteId: Id; precioLista: COP; tarifaIva: Fraccion; cantidad?: number }
  | { t: 'cantidad'; clave: string; cantidad: number }
  | { t: 'quitar'; clave: string }
  | { t: 'descuentoLinea'; clave: string; descuento: Descuento | null }
  | { t: 'descuentoGlobal'; descuento: Descuento | null }
  | { t: 'cliente'; cliente: ClienteSeleccionado }
  | { t: 'vendedor'; id: Id | null }
  | { t: 'tipo'; tipo: 'contado' | 'separado'; abonoSugerido: COP | null; fechaSugerida: FechaISO | null }
  | { t: 'abono'; valor: COP | null }
  | { t: 'fechaLimite'; fecha: FechaISO | null }
  | { t: 'medio'; indice: number; medio: MedioPago }
  | { t: 'valorPago'; indice: number; valor: COP | null }
  | { t: 'recibido'; indice: number; valor: COP | null }
  | { t: 'referencia'; indice: number; texto: string }
  | { t: 'bono'; indice: number; codigo: string }
  | { t: 'dividir'; medio: MedioPago; valorActual: COP }
  | { t: 'quitarPago'; indice: number }
  | { t: 'aprobacion'; id: Id | null }
  /** Cliente que llega con saldo a favor (`?cliente=`): el saldo paga primero y otro medio el resto, si falta. */
  | { t: 'pagosSaldoFavor'; saldo: COP; total: COP }
  | { t: 'vaciar' };

function sustituir<T>(lista: readonly T[], i: number, f: (x: T) => T): T[] {
  return lista.map((x, j) => (j === i ? f(x) : x));
}

export function reducirPos(s: EstadoPos, a: AccionPos): EstadoPos {
  switch (a.t) {
    case 'agregar': {
      const cantidad = Math.max(1, a.cantidad ?? 1);
      const existente = s.lineas.find((l) => l.varianteId === a.varianteId && l.descuento === null);
      if (existente) {
        return {
          ...s,
          lineas: s.lineas.map((l) => (l.clave === existente.clave ? { ...l, cantidad: l.cantidad + cantidad } : l)),
          ultima: { clave: existente.clave, n: (s.ultima?.n ?? 0) + 1 },
        };
      }
      const clave = `l${s.seq}`;
      return {
        ...s,
        seq: s.seq + 1,
        lineas: [...s.lineas, { clave, varianteId: a.varianteId, cantidad, precioLista: a.precioLista, tarifaIva: a.tarifaIva, descuento: null }],
        ultima: { clave, n: (s.ultima?.n ?? 0) + 1 },
      };
    }
    case 'cantidad':
      return { ...s, lineas: s.lineas.map((l) => (l.clave === a.clave ? { ...l, cantidad: Math.max(1, Math.round(a.cantidad)) } : l)) };
    case 'quitar': {
      const lineas = s.lineas.filter((l) => l.clave !== a.clave);
      return { ...s, lineas, descuentoGlobal: lineas.length ? s.descuentoGlobal : null, aprobacionId: lineas.length ? s.aprobacionId : null };
    }
    case 'descuentoLinea':
      return { ...s, lineas: s.lineas.map((l) => (l.clave === a.clave ? { ...l, descuento: a.descuento } : l)) };
    case 'descuentoGlobal':
      return { ...s, descuentoGlobal: a.descuento };
    case 'cliente': {
      // Un separado necesita cliente: si vuelve a consumidor final, regresa a contado.
      const vuelveContado = a.cliente.tipo === 'consumidor' && s.tipo === 'separado';
      return { ...s, cliente: a.cliente, tipo: vuelveContado ? 'contado' : s.tipo, abono: vuelveContado ? null : s.abono };
    }
    case 'vendedor':
      return { ...s, vendedorId: a.id };
    case 'tipo':
      return a.tipo === 'separado'
        ? { ...s, tipo: 'separado', abono: s.abono ?? a.abonoSugerido, fechaLimite: s.fechaLimite ?? a.fechaSugerida }
        : { ...s, tipo: 'contado', abono: null };
    case 'abono':
      return { ...s, abono: a.valor };
    case 'fechaLimite':
      return { ...s, fechaLimite: a.fecha };
    case 'medio':
      return { ...s, pagos: sustituir(s.pagos, a.indice, (p) => ({ ...p, medio: a.medio, recibido: null, bonoCodigo: a.medio === 'bono_regalo' ? p.bonoCodigo : '' })) };
    case 'valorPago':
      return { ...s, pagos: sustituir(s.pagos, a.indice, (p) => ({ ...p, valor: a.valor, recibido: null })) };
    case 'recibido':
      return { ...s, pagos: sustituir(s.pagos, a.indice, (p) => ({ ...p, recibido: a.valor })) };
    case 'referencia':
      return { ...s, pagos: sustituir(s.pagos, a.indice, (p) => ({ ...p, referencia: a.texto })) };
    case 'bono':
      return { ...s, pagos: sustituir(s.pagos, a.indice, (p) => ({ ...p, bonoCodigo: a.codigo })) };
    case 'dividir': {
      // El último pago (el "resto") pasa a tener valor propio y entra uno nuevo que toma lo que sobre.
      const ultimo = s.pagos.length - 1;
      const pagos = sustituir(s.pagos, ultimo, (p) => ({ ...p, valor: a.valorActual, recibido: null }));
      return { ...s, seq: s.seq + 1, pagos: [...pagos, pagoNuevo(`p${s.seq}`, a.medio)] };
    }
    case 'quitarPago':
      return s.pagos.length <= 1 ? s : { ...s, pagos: s.pagos.filter((_, i) => i !== a.indice) };
    case 'aprobacion':
      return { ...s, aprobacionId: a.id };
    case 'pagosSaldoFavor': {
      const alcanza = a.total <= a.saldo;
      const actual = s.pagos.map((p) => `${p.medio}:${p.valor ?? ''}`).join('|');
      const nuevo = alcanza ? 'saldo_a_favor:' : `saldo_a_favor:${a.saldo}|efectivo:`;
      if (actual === nuevo) return s;
      const pagos = alcanza
        ? [pagoNuevo(`p${s.seq}`, 'saldo_a_favor')]
        : [{ ...pagoNuevo(`p${s.seq}`, 'saldo_a_favor'), valor: a.saldo }, pagoNuevo(`p${s.seq + 1}`, 'efectivo')];
      return { ...s, seq: s.seq + 2, pagos };
    }
    case 'vaciar':
      return { ...ESTADO_INICIAL, seq: s.seq + 1, vendedorId: s.vendedorId };
  }
}

/** Cantidad de la variante que ya está en el carrito (todas sus líneas). */
export function enCarrito(s: Pick<EstadoPos, 'lineas'>, varianteId: Id): number {
  return s.lineas.filter((l) => l.varianteId === varianteId).reduce((n, l) => n + l.cantidad, 0);
}

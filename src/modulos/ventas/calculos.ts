import type {
  COP,
  Devolucion,
  Factura,
  FechaHoraISO,
  FechaISO,
  Id,
  LineaVenta,
  MedioPago,
  NotaCredito,
  Venta,
} from '@/dominio/tipos';
import { diferenciaDias, fechaDe } from '@/dominio/reglas/fechas';
import { totalPagado, valoresDevolucionLinea, type ValoresDevueltos } from '@/dominio/reglas/ventas';
import { etiquetaMedio } from './textos';

/**
 * Cálculos propios de la pantalla de Ventas (A3). Reutilizan las reglas del dominio (`valoresDevolucionLinea`,
 * `totalPagado`) para mostrar de antemano lo que va a hacer el comando; la autoridad sigue siendo el comando.
 */

const SIN_DEVOLVER: ValoresDevueltos = { cantidad: 0, valor: 0, base: 0, iva: 0, costo: 0 };

/** Lo ya devuelto por línea de venta (Σ de las devoluciones). */
export function devueltoPorLinea(devoluciones: readonly Devolucion[]): Map<Id, ValoresDevueltos> {
  const r = new Map<Id, ValoresDevueltos>();
  for (const d of devoluciones) {
    for (const l of d.lineas) {
      const a = r.get(l.lineaId) ?? SIN_DEVOLVER;
      r.set(l.lineaId, {
        cantidad: a.cantidad + l.cantidad,
        valor: a.valor + l.valor,
        base: a.base + l.base,
        iva: a.iva + l.iva,
        costo: a.costo + l.costo,
      });
    }
  }
  return r;
}

export interface LineaDevolvible {
  linea: LineaVenta;
  devuelta: number;
  disponible: number;
}

export function lineasDevolvibles(
  venta: Pick<Venta, 'lineas'>,
  devoluciones: readonly Devolucion[],
): LineaDevolvible[] {
  const ya = devueltoPorLinea(devoluciones);
  return venta.lineas.map((linea) => {
    const devuelta = ya.get(linea.id)?.cantidad ?? 0;
    return { linea, devuelta, disponible: Math.max(0, linea.cantidad - devuelta) };
  });
}

export interface SeleccionLinea {
  cantidad: number;
  reingresa: boolean;
}
export type SeleccionDevolucion = Record<Id, SeleccionLinea>;

export interface LineaDevolucionVista {
  lineaId: Id;
  cantidad: number;
  reingresa: boolean;
  valor: COP;
  base: COP;
  iva: COP;
  costo: COP;
}

export interface VistaPreviaDevolucion {
  lineas: LineaDevolucionVista[];
  unidades: number;
  unidadesReingresan: number;
  valorTotal: COP;
  base: COP;
  iva: COP;
}

/** Lo que valdría la devolución con la selección actual (las cantidades se acotan a lo disponible). */
export function previsualizarDevolucion(
  venta: Pick<Venta, 'lineas'>,
  devoluciones: readonly Devolucion[],
  seleccion: SeleccionDevolucion,
): VistaPreviaDevolucion {
  const ya = devueltoPorLinea(devoluciones);
  const lineas: LineaDevolucionVista[] = [];
  for (const l of venta.lineas) {
    const s = seleccion[l.id];
    if (!s) continue;
    const previo = ya.get(l.id) ?? SIN_DEVOLVER;
    const cantidad = Math.max(0, Math.min(Math.floor(s.cantidad), l.cantidad - previo.cantidad));
    if (cantidad === 0) continue;
    const v = valoresDevolucionLinea(l, cantidad, previo);
    lineas.push({
      lineaId: l.id,
      cantidad,
      reingresa: s.reingresa,
      valor: v.valor,
      base: v.base,
      iva: v.iva,
      costo: v.costo,
    });
  }
  return {
    lineas,
    unidades: lineas.reduce((a, l) => a + l.cantidad, 0),
    unidadesReingresan: lineas.filter((l) => l.reingresa).reduce((a, l) => a + l.cantidad, 0),
    valorTotal: lineas.reduce((a, l) => a + l.valor, 0),
    base: lineas.reduce((a, l) => a + l.base, 0),
    iva: lineas.reduce((a, l) => a + l.iva, 0),
  };
}

export interface PlazoDevolucion {
  dias: number;
  restantes: number;
  vencido: boolean;
}

/** Días transcurridos desde la venta y cuántos quedan del plazo de devolución (parámetro de la empresa). */
export function plazoDevolucion(tsVenta: FechaHoraISO, hoy: FechaISO, diasMaximo: number): PlazoDevolucion {
  const dias = diferenciaDias(fechaDe(tsVenta), hoy);
  return { dias, restantes: Math.max(0, diasMaximo - dias), vencido: dias > diasMaximo };
}

const MEDIOS_REEMBOLSO: readonly MedioPago[] = [
  'efectivo',
  'nequi',
  'daviplata',
  'transferencia',
  'qr_bre_b',
  'datafono_debito',
  'datafono_credito',
  'pasarela_web',
  'saldo_a_favor',
];

/** Medios con los que se devuelve plata (los mismos que acepta el comando). */
export function mediosReembolso(venta: Pick<Venta, 'canal' | 'pagos'>, hayCliente: boolean): MedioPago[] {
  const pagoWeb = venta.canal === 'web' || venta.pagos.some((p) => p.medio === 'pasarela_web');
  return MEDIOS_REEMBOLSO.filter((m) =>
    m === 'saldo_a_favor' ? hayCliente : m === 'pasarela_web' ? pagoWeb : true,
  );
}

/** Medio sugerido: el último con el que pagó el cliente, si sirve para devolver; si no, efectivo. */
export function medioReembolsoSugerido(
  venta: Pick<Venta, 'canal' | 'pagos'>,
  hayCliente: boolean,
): MedioPago {
  const permitidos = mediosReembolso(venta, hayCliente);
  for (let i = venta.pagos.length - 1; i >= 0; i--) {
    const p = venta.pagos[i];
    if (p && p.valor > 0 && p.medio !== 'saldo_a_favor' && permitidos.includes(p.medio)) return p.medio;
  }
  return 'efectivo';
}

export interface ResumenAnulacion {
  unidadesReingresan: number;
  /** Plata que se devuelve al cliente: lo pagado menos lo ya compensado con saldo a favor o cambio. */
  reembolsa: COP;
  conNotaCredito: boolean;
}

/** Consecuencias de anular una venta (misma cuenta que `venta.anular`). */
export function resumenAnulacion(venta: Venta, devoluciones: readonly Devolucion[]): ResumenAnulacion {
  const ya = devueltoPorLinea(devoluciones);
  const unidadesReingresan = venta.lineas.reduce(
    (a, l) => a + Math.max(0, l.cantidad - (ya.get(l.id)?.cantidad ?? 0)),
    0,
  );
  const creditos = devoluciones
    .filter((d) => d.compensacion !== 'reembolso')
    .reduce((a, d) => a + d.valorTotal, 0);
  return {
    unidadesReingresan,
    reembolsa: Math.max(0, totalPagado(venta) - creditos),
    conNotaCredito: !!venta.facturaId,
  };
}

export type TipoEventoHistorial =
  | 'venta'
  | 'pago'
  | 'abono'
  | 'reembolso'
  | 'devolucion'
  | 'factura'
  | 'nota_credito'
  | 'separado_completado'
  | 'separado_cancelado'
  | 'anulacion';

export interface EventoHistorial {
  id: string;
  ts: FechaHoraISO;
  tipo: TipoEventoHistorial;
  titulo: string;
  detalle?: string;
  /** Con signo (reembolsos y devoluciones negativos). */
  valor?: COP;
}

/** Línea de tiempo de una venta (más antiguo primero): registro, pagos, abonos, devoluciones, documentos y cierre. */
export function construirHistorial(a: {
  venta: Venta;
  devoluciones: readonly Devolucion[];
  factura: Factura | null;
  notasCredito: readonly NotaCredito[];
}): EventoHistorial[] {
  const { venta: v } = a;
  const r: EventoHistorial[] = [
    { id: `${v.id}-venta`, ts: v.ts, tipo: 'venta', titulo: `Venta ${v.numero} registrada`, valor: v.total },
  ];
  for (const p of v.pagos) {
    r.push({
      id: p.id,
      ts: p.ts,
      tipo: p.tipo === 'abono' ? 'abono' : p.tipo === 'reembolso' ? 'reembolso' : 'pago',
      titulo:
        p.tipo === 'abono'
          ? `Abono en ${etiquetaMedio(p.medio).toLowerCase()}`
          : p.tipo === 'reembolso'
            ? `Reembolso en ${etiquetaMedio(p.medio).toLowerCase()}`
            : `Pago en ${etiquetaMedio(p.medio).toLowerCase()}`,
      detalle: p.referencia ? `Ref. ${p.referencia}` : undefined,
      valor: p.valor,
    });
  }
  for (const d of a.devoluciones) {
    r.push({
      id: d.id,
      ts: d.ts,
      tipo: 'devolucion',
      titulo: `Devolución ${d.numero}`,
      detalle: d.motivo,
      valor: -d.valorTotal,
    });
  }
  if (a.factura) {
    r.push({
      id: a.factura.id,
      ts: a.factura.ts,
      tipo: 'factura',
      titulo: `${a.factura.tipo === 'factura_electronica' ? 'Factura electrónica' : 'Documento POS'} ${a.factura.numero}`,
    });
  }
  for (const n of a.notasCredito) {
    r.push({
      id: n.id,
      ts: n.ts,
      tipo: 'nota_credito',
      titulo: `Nota crédito ${n.numero}`,
      detalle: n.motivo,
      valor: -n.valor,
    });
  }
  const cierre = v.separado?.cerrado;
  if (cierre)
    r.push({
      id: `${v.id}-cierre`,
      ts: cierre.ts,
      tipo: cierre.resultado === 'completado' ? 'separado_completado' : 'separado_cancelado',
      titulo: cierre.resultado === 'completado' ? 'Separado completado' : 'Separado cancelado',
    });
  if (v.anulacion)
    r.push({
      id: `${v.id}-anulacion`,
      ts: v.anulacion.ts,
      tipo: 'anulacion',
      titulo: 'Venta anulada',
      detalle: v.anulacion.motivo,
    });
  // Orden estable: por instante y, a igual instante, el orden en que se armaron.
  return r
    .map((e, i) => ({ e, i }))
    .sort((x, y) => (x.e.ts < y.e.ts ? -1 : x.e.ts > y.e.ts ? 1 : x.i - y.i))
    .map((x) => x.e);
}

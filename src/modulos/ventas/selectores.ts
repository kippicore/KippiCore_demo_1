import type {
  Cliente,
  Empleado,
  FechaISO,
  Id,
  LineaVenta,
  Local,
  NotaCredito,
  SolicitudAprobacion,
  TipoPrenda,
} from '@/dominio/tipos';
import { crearSelector, selIndiceVentasPorDia, selVentaDetalle, type DetalleVenta } from '@/selectores';

/**
 * Selectores locales de Ventas (A3): componen los compartidos y añaden las búsquedas por id que la pantalla
 * necesita (nombres, miniaturas, solicitud de anulación). Declaran TODAS las tablas que leen.
 */

export interface LineaRecibo {
  linea: LineaVenta;
  referencia: string;
  nombreProducto: string;
  tipoPrenda: TipoPrenda | null;
  talla: string;
  colorNombre: string;
  colorHex: string;
  patron: 'liso' | 'rayas' | 'cuadros';
}

export interface ReciboVenta {
  detalle: DetalleVenta;
  local: Local | null;
  vendedor: Empleado | null;
  cliente: Cliente | null;
  lineas: LineaRecibo[];
  notasCredito: NotaCredito[];
  /** Solicitud de anulación pendiente (la creó un vendedor; el dueño decide). */
  solicitudAnulacion: SolicitudAprobacion | null;
  /** Nombre de quien pidió la anulación. */
  solicitante: string | null;
  /** Si la venta es la nueva de un cambio: la venta de origen. */
  ventaOrigen: { id: Id; numero: string } | null;
  /** Ventas nuevas que salieron de cambios de esta venta. */
  ventasDeCambio: { id: Id; numero: string }[];
}

export const selReciboVenta = crearSelector<{ ventaId: Id }, ReciboVenta | null>(
  'selReciboVenta',
  [
    'ventas',
    'devoluciones',
    'facturas',
    'productos',
    'variantes',
    'colores',
    'clientes',
    'empleados',
    'locales',
    'solicitudes',
    'notasCredito',
    'usuarios',
  ],
  (e, { ventaId }) => {
    const detalle = selVentaDetalle(e, { ventaId });
    if (!detalle) return null;
    const v = detalle.venta;
    const lineas: LineaRecibo[] = v.lineas.map((linea) => {
      const p = e.productos[linea.productoId];
      const va = e.variantes[linea.varianteId];
      const c = va ? e.colores[va.colorId] : undefined;
      return {
        linea,
        referencia: p?.referencia ?? '',
        nombreProducto: p?.nombre ?? linea.descripcion,
        tipoPrenda: p?.tipoPrenda ?? null,
        talla: va?.talla ?? '',
        colorNombre: c?.nombre ?? '',
        colorHex: c?.hex ?? '#CCCCCC',
        patron: c?.patron ?? 'liso',
      };
    });
    const notasCredito = Object.values(e.notasCredito)
      .filter((n) => n.facturaId === v.facturaId && v.facturaId !== null)
      .sort((a, b) => (a.ts < b.ts ? -1 : 1));
    const solicitudAnulacion =
      Object.values(e.solicitudes).find(
        (s) => s.estado === 'pendiente' && s.datos.tipo === 'anulacion' && s.datos.ventaId === v.id,
      ) ?? null;
    const solicitante = solicitudAnulacion
      ? (e.usuarios[solicitudAnulacion.solicitadoPor]?.nombre ?? null)
      : null;
    const origen = v.ventaOrigenCambioId ? e.ventas[v.ventaOrigenCambioId] : null;
    const ventasDeCambio = detalle.devoluciones
      .map((d) => (d.ventaCambioId ? e.ventas[d.ventaCambioId] : null))
      .filter((x): x is NonNullable<typeof x> => !!x)
      .map((x) => ({ id: x.id, numero: x.numero }));
    return {
      detalle,
      local: e.locales[v.localId] ?? null,
      vendedor: e.empleados[v.vendedorId] ?? null,
      cliente: v.clienteId ? (e.clientes[v.clienteId] ?? null) : null,
      lineas,
      notasCredito,
      solicitudAnulacion,
      solicitante,
      ventaOrigen: origen ? { id: origen.id, numero: origen.numero } : null,
      ventasDeCambio,
    };
  },
);

/** Fecha (AAAA-MM-DD) de una venta, o null si no existe (para ensanchar el rango de un enlace `?resaltar=`). */
export const selFechaVenta = crearSelector<{ ventaId: Id }, FechaISO | null>(
  'selFechaVenta',
  ['ventas'],
  (e, { ventaId }) => {
    const v = e.ventas[ventaId];
    return v ? v.ts.slice(0, 10) : null;
  },
);

/** Primer y último día con ventas (atajo "Todo el historial"). */
export const selRangoHistorial = crearSelector<void, { desde: FechaISO; hasta: FechaISO } | null>(
  'selRangoHistorial',
  ['ventas'],
  (e) => {
    const dias = Object.keys(selIndiceVentasPorDia(e)).sort();
    const desde = dias[0];
    const hasta = dias[dias.length - 1];
    return desde && hasta ? { desde, hasta } : null;
  },
);

export interface OpcionesFiltro {
  locales: { id: Id; nombre: string }[];
  vendedores: { id: Id; nombre: string }[];
}

/** Locales que venden y personas con cargo de vendedor (también las que ya se retiraron: sus ventas siguen ahí). */
export const selOpcionesFiltro = crearSelector<void, OpcionesFiltro>(
  'selOpcionesFiltro',
  ['locales', 'empleados'],
  (e) => ({
    locales: Object.values(e.locales)
      .filter((l) => !l.eliminadoEn && l.vende)
      .sort((a, b) => a.orden - b.orden)
      .map((l) => ({ id: l.id, nombre: l.nombre })),
    vendedores: Object.values(e.empleados)
      .filter((x) => !x.eliminadoEn && x.cargo === 'vendedor')
      .sort((a, b) => (`${a.nombres} ${a.apellidos}` < `${b.nombres} ${b.apellidos}` ? -1 : 1))
      .map((x) => ({ id: x.id, nombre: `${x.nombres} ${x.apellidos.split(' ')[0] ?? ''}`.trim() })),
  }),
);

/** Nombres para los chips de filtro (cliente y producto llegan por id en la URL). */
export const selEtiquetasFiltro = crearSelector<
  { clienteId?: Id | null; productoId?: Id | null },
  { cliente: string | null; producto: string | null }
>('selEtiquetasFiltro', ['clientes', 'productos'], (e, { clienteId, productoId }) => {
  const c = clienteId ? e.clientes[clienteId] : null;
  const p = productoId ? e.productos[productoId] : null;
  return {
    cliente: c ? `${c.nombres} ${c.apellidos}` : null,
    producto: p ? `${p.nombre} · ${p.referencia}` : null,
  };
});

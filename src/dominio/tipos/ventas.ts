import type { COP, Descuento, FechaHoraISO, FechaISO, Fraccion, Id, Trazabilidad } from './comunes';

/** Ventas, pagos, separados y devoluciones (PLAN 6.6). */
export type Canal = 'local' | 'whatsapp' | 'instagram' | 'web';
export type TipoVenta = 'contado' | 'separado' | 'credito';
export type MedioPago =
  | 'efectivo'
  | 'datafono_debito'
  | 'datafono_credito'
  | 'nequi'
  | 'daviplata'
  /** Etiqueta "Transferencia / llave Bre-B". */
  | 'transferencia'
  /** "QR Bre-B". */
  | 'qr_bre_b'
  /** Redención de un BonoRegalo (requiere bonoId). */
  | 'bono_regalo'
  /** "Crédito con financiera aliada" (genérico, sin marcas). */
  | 'credito_financiera'
  | 'pasarela_web'
  | 'saldo_a_favor';

export interface LineaVenta {
  /** `${ventaId}-l1` */
  id: Id;
  productoId: Id;
  varianteId: Id;
  sku: string;
  /** Instantánea: 'Camisa Oxford entallada · Azul cielo · M' */
  descripcion: string;
  cantidad: number;
  /** Unitario, IVA incluido. */
  precioLista: COP;
  descuentoLinea: Descuento | null;
  /** Descuento de línea + parte prorrateada del global. */
  descuentoAsignado: COP;
  /** IVA incluido = precioLista × cantidad − descuentoAsignado. */
  totalFinal: COP;
  /** Sin IVA. */
  base: COP;
  iva: COP;
  /** Instantánea de Producto.costoVigente al vender. */
  costoUnitario: COP;
}

export interface PagoVenta {
  /** `${ventaId}-p1` */
  id: Id;
  ts: FechaHoraISO;
  /** Reembolso: valor negativo. */
  tipo: 'pago' | 'abono' | 'reembolso';
  medio: MedioPago;
  /** Aplicado a la venta (efectivo: neto de cambio). */
  valor: COP;
  /** Efectivo entregado por el cliente. */
  recibido: COP | null;
  cambio: COP | null;
  /** Aprobación del datáfono, número Nequi… */
  referencia: string | null;
  /** Cuenta que recibe la plata (null para saldo a favor y bono; datáfono → cuenta puente). */
  cuentaId: Id | null;
  /** Efectivo en el local. */
  sesionCajaId: Id | null;
  /** Si medio = 'bono_regalo'. */
  bonoId: Id | null;
  /** Conciliación bancaria simple (los pagos generados con más de 3 días: derivado, siempre true). */
  conciliado: boolean;
}

export interface Venta extends Trazabilidad {
  id: Id;
  /** 'V-000482' (consecutivo global). */
  numero: string;
  ts: FechaHoraISO;
  localId: Id;
  /** Empleado (si vende el dueño, el que él elija; la cajera registra a nombre del vendedor). */
  vendedorId: Id;
  /** null = consumidor final (≈ 85 % de las ventas; DECISIONES 01/10/2026). */
  clienteId: Id | null;
  canal: Canal;
  tipo: TipoVenta;
  lineas: LineaVenta[];
  descuentoGlobal: Descuento | null;
  aprobacionDescuentoId: Id | null;
  /** Σ precioLista × cantidad. */
  subtotal: COP;
  /** Σ descuentoAsignado. */
  descuentos: COP;
  /** Σ totalFinal (IVA incluido). */
  total: COP;
  /** Σ base. */
  base: COP;
  /** Σ iva. */
  iva: COP;
  pagos: PagoVenta[];
  separado: {
    fechaLimite: FechaISO;
    cerrado: { ts: FechaHoraISO; resultado: 'completado' | 'cancelado' } | null;
  } | null;
  /** Solo el dueño anula. */
  anulacion: { ts: FechaHoraISO; motivo: string; usuarioId: Id; solicitudId: Id | null } | null;
  /** Factura electrónica o documento equivalente POS (Factura.tipo). */
  facturaId: Id | null;
  /** Si es la venta nueva de un cambio. */
  ventaOrigenCambioId: Id | null;
  nota: string | null;
  // derivado: estado (pagada | separado | credito | devuelta | devuelta_parcial | anulada),
  //           saldo pendiente, unidades, margen, comisión, fecha de reconocimiento
}

export type CompensacionDevolucion = 'reembolso' | 'saldo_favor' | 'cambio';
export interface Devolucion extends Trazabilidad {
  id: Id;
  /** 'DV-000045' */
  numero: string;
  ventaId: Id;
  ts: FechaHoraISO;
  localId: Id;
  lineas: {
    lineaId: Id;
    varianteId: Id;
    cantidad: number;
    valor: COP;
    base: COP;
    iva: COP;
    costo: COP;
    reingresa: boolean;
  }[];
  motivo: string;
  compensacion: CompensacionDevolucion;
  valorTotal: COP;
  reembolso: { medio: MedioPago; cuentaId: Id | null; sesionCajaId: Id | null } | null;
  notaCreditoId: Id | null;
  ventaCambioId: Id | null;
  usuarioId: Id;
}

/** Solicitud de aprobación (app del dueño y escritorio: "Para aprobar"). Las tres que usa la narrativa (W10, W11). */
export type TipoSolicitud = 'descuento' | 'traslado' | 'anulacion';
export interface SolicitudAprobacion extends Trazabilidad {
  id: Id;
  tipo: TipoSolicitud;
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'vencida';
  /** usuarioId */
  solicitadoPor: Id;
  ts: FechaHoraISO;
  /** 'Sebastián Cárdenas pide 20 % de descuento · Blazer de lana fría · $ 789.900 → $ 631.920' */
  resumen: string;
  datos:
    | {
        tipo: 'descuento';
        localId: Id;
        vendedorId: Id;
        varianteIds: Id[];
        valorLista: COP;
        porcentaje: Fraccion;
        valorFinal: COP;
        motivo: string;
      }
    | { tipo: 'traslado'; trasladoId: Id }
    | {
        tipo: 'anulacion';
        ventaId: Id;
        motivo: string;
        reembolso: { medio: MedioPago; sesionCajaId: Id | null } | null;
      };
  resolucion: { ts: FechaHoraISO; por: Id; nota: string | null } | null;
  /** Una aprobación de descuento se usa una sola vez. */
  usadaEnVentaId: Id | null;
}

/** Bono de regalo: plata recibida por anticipado (pasivo). No es venta reconocida al venderse; lo es la venta en que se redime. */
export interface BonoRegalo extends Trazabilidad {
  id: Id;
  /** 'BR-000214' */
  codigo: string;
  valor: COP;
  localId: Id;
  vendidoEn: FechaHoraISO;
  pago: {
    medio: Exclude<MedioPago, 'bono_regalo' | 'saldo_a_favor'>;
    cuentaId: Id | null;
    sesionCajaId: Id | null;
  };
  vence: FechaISO;
  // derivado: saldo = valor − Σ pagos con medio 'bono_regalo' y este bonoId; estado (activo | usado | vencido)
}

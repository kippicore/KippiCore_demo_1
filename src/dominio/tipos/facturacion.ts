import type { COP, FechaHoraISO, FechaISO, Id, Trazabilidad } from './comunes';

/** Facturación simulada (PLAN 6.14). */
/** Reemplaza al recibo de tirilla del PRD. */
export type TipoDocumentoElectronico = 'factura_electronica' | 'documento_equivalente_pos';
export interface ResolucionFacturacion {
  id: Id;
  /** A qué documento aplica (ajuste F2-A1: cada tipo tiene su resolución y su prefijo). */
  tipo: TipoDocumentoElectronico;
  /** Ficticio: '18764000000000' */
  numero: string;
  /** 'HAL-FE' · 'HAL-POS' */
  prefijo: string;
  desde: number;
  hasta: number;
  vigenteDesde: FechaISO;
  vigenteHasta: FechaISO;
}
/** Las generadas por el generador nacen 'aceptada' con su historial. */
export type EstadoFactura = 'generada' | 'enviada' | 'aceptada';
export interface Adquirente {
  tipo: 'consumidor_final' | 'identificado';
  clienteId: Id | null;
  /** 'Consumidor final' o nombre del cliente. */
  nombre: string;
  documento: string | null;
  correo: string | null;
}
export interface Factura extends Trazabilidad {
  id: Id;
  tipo: TipoDocumentoElectronico;
  /** 'HAL-FE-1043' · 'HAL-POS-20931' (resolución propia por tipo). */
  numero: string;
  resolucionId: Id;
  ventaId: Id;
  ts: FechaHoraISO;
  adquirente: Adquirente;
  /** Instantánea de la venta. */
  subtotal: COP;
  descuentos: COP;
  base: COP;
  iva: COP;
  total: COP;
  /** 96 hex simulados (CUFE en factura; CUDE en documento POS). */
  cufe: string;
  /** Texto del QR (sin URL de la DIAN). */
  qrTexto: string;
  estado: EstadoFactura;
  historial: { estado: EstadoFactura; ts: FechaHoraISO }[];
}
export interface NotaCredito extends Trazabilidad {
  id: Id;
  /** 'HAL-NC-0012' */
  numero: string;
  facturaId: Id;
  /** null si nace de una anulación. */
  devolucionId: Id | null;
  ts: FechaHoraISO;
  motivo: string;
  base: COP;
  iva: COP;
  valor: COP;
  cude: string;
  estado: EstadoFactura;
}

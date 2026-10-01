import type { COP, FechaHoraISO, Id, RefDocumento, Trazabilidad } from './comunes';
import type { Categoria } from './catalogo';

/** Inventario (PLAN 6.5). */
export type TipoMovimiento =
  /** + en bodega al recibir (incluida la carga inicial, fuera de la ventana visible). */
  | 'entrada_importacion'
  | 'salida_venta'
  /** − al crear el separado (la prenda sale del disponible). */
  | 'salida_separado'
  /** + al cancelar un separado. */
  | 'reingreso_separado'
  /** + al anular una venta. */
  | 'reingreso_anulacion'
  /** + devolución que reingresa. */
  | 'devolucion_cliente'
  /** − en origen al despachar. */
  | 'traslado_salida'
  /** + en destino al recibir (también en origen si se cancela en tránsito). */
  | 'traslado_entrada'
  | 'ajuste_conteo'
  | 'ajuste_manual';

export type MotivoAjuste = 'dano' | 'perdida' | 'error' | 'hallazgo' | 'otro';

/** Libro inmutable (arreglo). */
export interface MovimientoInventario {
  id: Id;
  ts: FechaHoraISO;
  varianteId: Id;
  /** Desnormalizado para el kardex. */
  productoId: Id;
  localId: Id;
  /** Con signo: + entra, − sale. */
  cantidad: number;
  tipo: TipoMovimiento;
  /** Costo vigente del producto en ese instante (entradas de importación: su costo aterrizado). */
  costoUnitario: COP;
  documento: RefDocumento;
  motivo?: MotivoAjuste;
  usuarioId: Id;
  nota?: string;
  // derivado: saldo acumulado del kardex, recorrido en ORDEN DE APLICACIÓN (orden del libro), no por ts
}

/** Clave del agregado materializado de existencias: `${varianteId}@${localId}`. */
export type ClaveExistencia = `${Id}@${Id}`;

export type EstadoTraslado = 'solicitado' | 'en_transito' | 'recibido' | 'cancelado';
export interface Traslado extends Trazabilidad {
  id: Id;
  /** 'TR-000123' */
  numero: string;
  origenId: Id;
  destinoId: Id;
  lineas: { varianteId: Id; cantidad: number; recibida: number | null }[];
  estado: EstadoTraslado;
  aprobacion: 'no_requerida' | 'pendiente' | 'aprobada' | 'rechazada';
  solicitadoPor: Id;
  fechas: {
    solicitado: FechaHoraISO;
    aprobado?: FechaHoraISO;
    despachado?: FechaHoraISO;
    recibido?: FechaHoraISO;
    cancelado?: FechaHoraISO;
  };
  /** 'Reposición' · 'Distribución IMP-2026-03' · … */
  motivo?: string;
  /** Si nace de la distribución de una importación. */
  importacionId?: Id;
  nota?: string;
}

/** El conteo no pasa por aprobación (sin uso en la narrativa). */
export type EstadoConteo = 'en_curso' | 'aplicado' | 'cancelado';
export interface ConteoFisico extends Trazabilidad {
  id: Id;
  /** 'CF-000031' */
  numero: string;
  localId: Id;
  /** null = todo el local. */
  categorias: Categoria[] | null;
  estado: EstadoConteo;
  responsableId: Id;
  iniciado: FechaHoraISO;
  /** Por varianteId. */
  lineas: Record<Id, { sistemaAlIniciar: number; contado: number | null }>;
  aplicado?: { ts: FechaHoraISO; por: Id; motivos: Record<Id, MotivoAjuste> };
  // derivado: diferencias contra la existencia actual, valor de las diferencias
}

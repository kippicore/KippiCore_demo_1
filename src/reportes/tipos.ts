import type { EstadoDominio, FechaHoraISO, FechaISO, Id, Moneda, Rol } from '@/dominio/tipos';
import type { TipoNotaLegal } from '@/config/textos/notas';
import type { TipoColumnaExcel, TotalExcel, ValorCelda } from '@/lib/exportar/excel';

/** Tipos de las definiciones únicas de reportes (PLAN 5.12, T9). */

export type IdReporte =
  | 'ventas'
  | 'cierre-caja'
  | 'inventario'
  | 'kardex'
  | 'importaciones'
  | 'cuentas'
  | 'gastos'
  | 'resultados'
  | 'nomina'
  | 'asistencia'
  | 'comisiones'
  | 'clientes'
  | 'contador';

export type FiltroReporte = 'rango' | 'local' | 'producto' | 'liquidacion';

export interface FiltrosReporte {
  desde: FechaISO;
  hasta: FechaISO;
  localId: Id | 'todos';
  /** Hoy y ahora (reloj cuantizado de la app). */
  hoy: FechaISO;
  ahora: FechaHoraISO;
  /** Kardex: referencia del producto (por defecto, la del guion). */
  productoId?: Id | null;
  /** Nómina: una liquidación (por defecto, las del rango). */
  liquidacionId?: Id | null;
  /** Rol de quien exporta (el vendedor solo ve lo suyo y nunca costos, 5.8). */
  rol?: Rol;
  /** Vendedor activo (filtro "sus ventas" para el rol vendedor). */
  vendedorId?: Id | null;
}

export interface ColumnaReporte {
  clave: string;
  titulo: string;
  tipo: TipoColumnaExcel;
  /** Ancho en mm en el PDF (opcional). */
  anchoPdf?: number;
}

export interface HojaReporte {
  nombre: string;
  columnas: ColumnaReporte[];
  /** Valores crudos: dinero en COP (la exportación convierte a la moneda activa), fechas 'AAAA-MM-DD'. */
  filas: Record<string, ValorCelda>[];
  /** 'suma' = fórmula con su resultado en caché; un número = total no aditivo ya calculado. */
  totales: Record<string, TotalExcel> | null;
  nota?: string;
}

export interface DefinicionReporte {
  id: IdReporte;
  titulo: string;
  /** Una línea para la tarjeta del centro de reportes. */
  descripcion: string;
  filtros: FiltroReporte[];
  roles: readonly Rol[];
  orientacion: 'vertical' | 'horizontal';
  notaLegal?: TipoNotaLegal;
  hojas: (estado: EstadoDominio, filtros: FiltrosReporte) => HojaReporte[];
}

export interface ContextoExportacion {
  /** Marca activa (HALDEN o la personalizada). */
  marca: string;
  descriptor: string;
  moneda: Moneda;
  /** COP por unidad de la moneda activa (1 para COP). */
  tasa: number;
  /** Nombre del local del filtro ('Todos los locales'). */
  nombreLocal: string;
}

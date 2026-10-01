import type { CategoriaCxP, CategoriaGasto } from '@/dominio/tipos';

/**
 * Nombre de cada categoría de gasto para personas (reportes, pantallas, PDF y Excel). Una sola fuente: el slug
 * (`comisiones_datafono`) nunca se muestra.
 */
export const ETIQUETA_CATEGORIA_GASTO: Record<CategoriaGasto, string> = {
  arriendo: 'Arriendo',
  servicios: 'Servicios',
  nomina: 'Nómina',
  seguridad_social: 'Seguridad social',
  publicidad: 'Publicidad',
  transporte: 'Transporte',
  mantenimiento: 'Mantenimiento',
  empaques: 'Empaques',
  comisiones_datafono: 'Comisión del datáfono',
  impuestos: 'Impuestos',
  otros: 'Otros',
};

export const etiquetaCategoriaGasto = (c: string): string => ETIQUETA_CATEGORIA_GASTO[c as CategoriaGasto] ?? c;

/** Nombre de cada categoría de cuenta por pagar (reporte `cuentas`, Pagos). */
export const ETIQUETA_CATEGORIA_CXP: Record<CategoriaCxP, string> = {
  proveedor_importacion: 'Proveedor de importación',
  tributos_aduaneros: 'Tributos aduaneros',
  proveedor_local: 'Proveedor local',
  arriendo: 'Arriendo',
  servicios: 'Servicios públicos',
  nomina: 'Nómina',
  seguridad_social: 'Seguridad social',
  prestaciones: 'Prestaciones',
  impuestos: 'Impuestos',
  agente_aduanas: 'Agente de aduanas',
  agente_carga: 'Agente de carga',
  transporte: 'Transporte',
  publicidad: 'Publicidad',
  otro: 'Otro',
};

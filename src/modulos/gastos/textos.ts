import type { CategoriaGasto } from '@/dominio/tipos';
import { ETIQUETA_CATEGORIA_GASTO } from '@/config/textos/categorias';

/** Copy de la interfaz de Costos y gastos (B4). Todo en español de Colombia, sin jerga contable. */

export const CATEGORIAS: readonly CategoriaGasto[] = [
  'arriendo',
  'servicios',
  'nomina',
  'seguridad_social',
  'publicidad',
  'transporte',
  'mantenimiento',
  'empaques',
  'comisiones_datafono',
  'impuestos',
  'otros',
];

/** Etiquetas compartidas (también las usa el reporte `gastos`). */
export const ETIQUETA_CATEGORIA: Record<CategoriaGasto, string> = ETIQUETA_CATEGORIA_GASTO;

export const AYUDA_CATEGORIA: Record<CategoriaGasto, string> = {
  arriendo: 'El canon del local o de la bodega.',
  servicios: 'Energía, agua, internet, vigilancia, software.',
  nomina: 'Salarios y comisiones del equipo.',
  seguridad_social: 'Aportes de salud, pensión, riesgos y cajas.',
  publicidad: 'Pauta en redes, material, fotografía.',
  transporte: 'Domicilios, fletes locales, mensajería.',
  mantenimiento: 'Arreglos, aseo, adecuaciones, dotación.',
  empaques: 'Bolsas, cajas, papel, etiquetas.',
  comisiones_datafono: 'Lo que cobra el banco por pagos con tarjeta.',
  impuestos: 'Impuestos que no son de las ventas (predial, ICA...).',
  otros: 'Honorarios del contador y lo que no encaja arriba.',
};

export const MEDIOS_PAGO: readonly { valor: string; etiqueta: string }[] = [
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'nequi', etiqueta: 'Nequi' },
  { valor: 'daviplata', etiqueta: 'Daviplata' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta' },
  { valor: 'débito automático', etiqueta: 'Débito automático' },
];

export const GENERAL = 'general';
export const ETIQUETA_GENERAL = 'General (todo el negocio)';
export const SIN_PROVEEDOR = 'sin-proveedor';

export const TEXTOS = {
  gastos: {
    titulo: 'Costos y gastos',
    subtitulo: 'En qué se va la plata de los tres locales, mes a mes.',
    vacioTitulo: 'Ningún gasto con estos filtros',
    vacioTexto: 'Cambia el mes, el local o la categoría, o registra un gasto nuevo.',
    mesEnCurso: 'El mes sigue en curso: la nómina y otros gastos todavía se están causando.',
    sistema: 'Este gasto nació en la caja, la nómina o el datáfono. Se corrige desde allá.',
  },
  recurrentes: {
    titulo: 'Gastos recurrentes',
    subtitulo: 'Lo que se repite cada mes: arriendo, servicios, vigilancia. Genera el del mes con un clic.',
    vacioTitulo: 'Todavía no hay gastos recurrentes',
    vacioTexto: 'Crea el arriendo, la luz o la vigilancia una sola vez y se generan solos cada mes.',
  },
  resultados: {
    titulo: 'Estado de resultados',
    subtitulo: 'Cuánto te dejó cada local después de pagar la mercancía y los gastos.',
    prorratear: 'Repartir los gastos generales entre los locales',
    prorratearAyuda:
      'La bodega (su arriendo, su nómina y su seguridad social), el contador, la vigilancia y la pauta no son de un local. Si lo activas, se reparten según lo que vendió cada uno.',
    nota:
      'Es un cálculo para entender tu negocio: va antes de impuestos de renta y no cuenta lo que pagas por mercancía nueva, porque esa plata se vuelve inventario y solo es costo cuando la vendes.',
  },
  equilibrio: {
    titulo: 'Punto de equilibrio',
    subtitulo: 'Lo que cada local tiene que vender al mes para no perder plata.',
    repartir: 'Incluir la parte de los gastos generales',
    repartirAyuda: 'Suma a cada local lo que le toca de la bodega (arriendo, nómina y seguridad social), el contador, la vigilancia y la pauta.',
    formula:
      'Se calcula dividiendo los gastos fijos del mes (arriendo, servicios, nómina y seguridad social) entre el margen bruto: lo que queda de cada venta después de pagar la mercancía.',
  },
} as const;

import type { Categoria, CurvaTallas, EstadoTraslado, MotivoAjuste, TipoMovimiento, TipoPrenda } from '@/dominio/tipos';

/** Copy de la interfaz de Inventario (A2). Español de Colombia, sin inglés de software. */

export const SUBTITULOS = {
  catalogo: 'Qué hay en cada local, qué viene en camino y cuánto vale, referencia por referencia.',
  movimientos: 'Cada entrada, salida, traslado y ajuste, en el orden en que ocurrió.',
  traslados: 'Mueve mercancía entre locales sin llamar a nadie: solicita, despacha y recibe.',
  conteos: 'Compara lo que hay en el estante con lo que dice el sistema y corrige las diferencias.',
  recepcion: 'Recibe lo que llegó de la importación y repártelo entre los locales.',
  etiquetas: 'Hoja de etiquetas con código de barras, referencia, talla, color y precio.',
  valorizacion: 'Cuánto tienes en inventario, a costo y a precio de venta, local por local.',
  nuevo: 'Crea la referencia con sus tallas y colores; el SKU y el código de barras salen solos.',
} as const;

export const METODO_COSTO = 'Costo de reposición: última importación aplicada';

export const CATEGORIAS_ORDEN: readonly Categoria[] = ['camisas', 'polos', 'pantalones', 'blazers', 'trajes', 'punto', 'abrigos_chaquetas', 'calzado', 'accesorios'];

export const TIPOS_PRENDA: Record<TipoPrenda, string> = {
  camisa: 'Camisa',
  blazer: 'Blazer',
  pantalon: 'Pantalón',
  polo: 'Polo',
  abrigo: 'Abrigo',
  chaqueta: 'Chaqueta',
  sweater: 'Suéter',
  traje: 'Traje',
  chaleco: 'Chaleco',
  zapato: 'Zapato',
  cinturon: 'Cinturón',
  corbata: 'Corbata',
  billetera: 'Billetera',
};

/** Tipos de prenda que tiene sentido ofrecer en cada categoría (de la semilla del catálogo). */
export const TIPOS_POR_CATEGORIA: Record<Categoria, readonly TipoPrenda[]> = {
  camisas: ['camisa'],
  polos: ['polo'],
  pantalones: ['pantalon'],
  blazers: ['blazer', 'chaleco'],
  trajes: ['traje'],
  punto: ['sweater'],
  abrigos_chaquetas: ['abrigo', 'chaqueta'],
  calzado: ['zapato'],
  accesorios: ['corbata', 'cinturon', 'billetera'],
};

/** Curva de tallas habitual de cada tipo de prenda. */
export const CURVA_POR_TIPO: Record<TipoPrenda, CurvaTallas> = {
  camisa: 'superior',
  polo: 'superior',
  sweater: 'superior',
  abrigo: 'superior',
  chaqueta: 'superior',
  chaleco: 'superior',
  pantalon: 'pantalon',
  blazer: 'sastreria',
  traje: 'sastreria',
  zapato: 'calzado',
  corbata: 'unica',
  cinturon: 'unica',
  billetera: 'unica',
};

export const NOMBRES_CURVA: Record<CurvaTallas, string> = {
  superior: 'Prendas superiores (S a XXL)',
  pantalon: 'Pantalones (28 a 40)',
  calzado: 'Calzado (38 a 44)',
  sastreria: 'Sastrería (46 a 56)',
  unica: 'Talla única',
};

export const TEMPORADAS = ['Colección permanente', 'Temporada 2026-I', 'Temporada 2026-II', 'Temporada 2027-I'] as const;

export const MOTIVOS_AJUSTE: Record<MotivoAjuste, string> = {
  dano: 'Daño',
  perdida: 'Pérdida',
  error: 'Error de registro',
  hallazgo: 'Hallazgo',
  otro: 'Otro',
};

export const MOTIVOS_TRASLADO = ['Reposición del local', 'Pedido de un cliente', 'Exhibición o vitrina', 'Balance entre locales', 'Otro'] as const;

export const TIPOS_MOVIMIENTO: Record<TipoMovimiento, string> = {
  entrada_importacion: 'Entrada por importación',
  salida_venta: 'Venta',
  salida_separado: 'Separado',
  reingreso_separado: 'Separado cancelado',
  reingreso_anulacion: 'Venta anulada',
  devolucion_cliente: 'Devolución de cliente',
  traslado_salida: 'Salida por traslado',
  traslado_entrada: 'Entrada por traslado',
  ajuste_conteo: 'Ajuste por conteo',
  ajuste_manual: 'Ajuste manual',
};

export const ETAPAS_TRASLADO: Record<Exclude<EstadoTraslado, 'cancelado'>, string> = {
  solicitado: 'Solicitado',
  en_transito: 'En tránsito',
  recibido: 'Recibido',
};

export const ESTADOS_STOCK = [
  { valor: 'agotado', etiqueta: 'Agotado' },
  { valor: 'bajo', etiqueta: 'Stock bajo' },
  { valor: 'normal', etiqueta: 'Normal' },
] as const;

export const VACIOS = {
  catalogo: { titulo: 'Ninguna referencia con estos filtros', texto: 'Cambia o quita algún filtro, o busca por nombre, referencia, SKU o código de barras.' },
  kardex: { titulo: 'Sin movimientos en este rango', texto: 'Amplía las fechas o quita algún filtro para ver las entradas y salidas de esta referencia.' },
  traslados: { titulo: 'Aún no hay traslados con este filtro', texto: 'Cuando muevas mercancía entre locales, cada traslado aparecerá aquí con su estado.' },
  conteos: { titulo: 'Todavía no has hecho un conteo físico', texto: 'Un conteo compara lo que hay en el estante con lo que dice el sistema y te muestra las diferencias.' },
  ventasReferencia: { titulo: 'Sin ventas en este rango', texto: 'Cuando se venda esta referencia en cualquier local, cada línea aparecerá aquí.' },
} as const;

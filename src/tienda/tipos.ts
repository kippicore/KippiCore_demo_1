import type { Categoria, COP, CurvaTallas, Id, LineaProducto, TipoPrenda } from '@/dominio/tipos';

/** Tipos de la tienda web (D6). Los arma `selCatalogoTienda` desde el inventario real; nada se guarda dos veces. */

export type PatronColor = 'liso' | 'rayas' | 'cuadros';

export interface ColorTienda {
  id: Id;
  nombre: string;
  /** 'AZN' (también sirve en `?color=`). */
  codigo: string;
  hex: string;
  patron: PatronColor;
  /** Unidades disponibles para envío (local de despacho). */
  unidades: number;
}

export interface TallaTienda {
  talla: string;
  unidades: number;
}

export interface ProductoTienda {
  id: Id;
  slug: string;
  referencia: string;
  nombre: string;
  categoria: Categoria;
  linea: LineaProducto;
  tipoPrenda: TipoPrenda;
  curvaTallas: CurvaTallas;
  temporada: string;
  material: string;
  descripcion: string;
  /** IVA incluido. */
  precio: COP;
  tarifaIva: number;
  destacado: boolean;
  /** De la temporada más reciente del catálogo. */
  nuevo: boolean;
  colores: ColorTienda[];
  tallas: TallaTienda[];
  /** Unidades disponibles para envío en todas las tallas y colores. */
  unidades: number;
}

export interface VarianteTienda {
  id: Id;
  productoId: Id;
  talla: string;
  colorId: Id;
  sku: string;
  /** Existencias del local de despacho de la tienda web. */
  stock: number;
}

export interface CatalogoTienda {
  /** Local del que salen los pedidos web (`parametros.ventas.localDespachoWebId`). */
  local: { id: Id; nombre: string };
  productos: ProductoTienda[];
  variantes: Record<Id, VarianteTienda>;
}

export type SlugSeccion = 'novedades' | 'sastreria' | 'camisas' | 'pantalones' | 'abrigos' | 'zapatos-y-accesorios';

export type OrdenProductos = 'destacados' | 'precio_asc' | 'precio_desc' | 'nombre';

export interface FiltroProductos {
  /** Categorías (tipo de prenda) permitidas; vacío = todas. */
  tipos: readonly Categoria[];
  talla: string | null;
  colorId: Id | null;
  soloDisponibles: boolean;
}

/** Datos del comprador y de la entrega (ficticios en la demostración). */
export interface DatosComprador {
  nombres: string;
  apellidos: string;
  correo: string;
  celular: string;
  direccion: string;
  complemento: string;
  barrio: string;
  ciudad: string;
  autorizacion: boolean;
}

export type MetodoPago = 'simulado' | 'tarjeta' | 'pse' | 'nequi' | 'qr_bre_b';

export type ErroresComprador = Partial<Record<keyof DatosComprador, string>>;

/** Una línea de la bolsa: solo la variante y la cantidad; el resto se lee del inventario en cada render. */
export interface LineaBolsa {
  varianteId: Id;
  cantidad: number;
}

export interface LineaBolsaDetalle {
  varianteId: Id;
  cantidad: number;
  producto: ProductoTienda;
  variante: VarianteTienda;
  color: ColorTienda;
  /** Precio unitario con IVA. */
  precio: COP;
  /** Precio × cantidad. */
  total: COP;
  /** Existencias del local de despacho. */
  stock: number;
}

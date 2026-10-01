import type { COP, Eliminable, FechaISO, Fraccion, Id, Trazabilidad } from './comunes';

/** Catálogo (PLAN 6.4). */
export type Categoria =
  | 'camisas'
  | 'blazers'
  | 'pantalones'
  | 'polos'
  | 'abrigos_chaquetas'
  | 'punto'
  | 'trajes'
  | 'calzado'
  | 'accesorios';
export type LineaProducto = 'sastreria' | 'casual' | 'sport';
/** Define la ilustración <Prenda> (8.8); TODOS tienen ilustración (prueba sobre seed/catalogo). 13 tipos; sin tenis ni medias. */
export type TipoPrenda =
  | 'camisa'
  | 'blazer'
  | 'pantalon'
  | 'polo'
  | 'abrigo'
  | 'chaqueta'
  | 'sweater'
  | 'traje'
  | 'chaleco'
  | 'zapato'
  | 'cinturon'
  | 'corbata'
  | 'billetera';
/** superior: S M L XL XXL · pantalon: 28–40 pares · calzado: 38–44 · sastreria: 46–56 pares · unica: 'Única' */
export type CurvaTallas = 'superior' | 'pantalon' | 'calzado' | 'sastreria' | 'unica';

export interface Color {
  id: Id;
  nombre: string;
  codigo: string;
  hex: string;
  patron: 'liso' | 'rayas' | 'cuadros';
}

export interface Producto extends Trazabilidad, Eliminable {
  id: Id;
  /** 'HL-CAM-0142' — única e inmutable (URL). */
  referencia: string;
  /** 'Camisa Oxford entallada' (en español). */
  nombre: string;
  /** 'camisa-oxford-entallada' (tienda). */
  slug: string;
  categoria: Categoria;
  linea: LineaProducto;
  tipoPrenda: TipoPrenda;
  curvaTallas: CurvaTallas;
  /** 'Colección permanente' · 'Temporada 2026-II' */
  temporada: string;
  proveedorId: Id;
  /** '100 % algodón Oxford' */
  material: string;
  descripcion: string;
  /** IVA incluido. */
  precioVenta: COP;
  tarifaIva: Fraccion;
  /** "Costo de reposición: última importación aplicada" (método nombrado en interfaz y reportes). */
  costoVigente: COP;
  historialCosto: {
    fecha: FechaISO;
    costo: COP;
    importacionId: Id | null;
    motivo: 'importacion' | 'manual';
  }[];
  /** Por variante y por local. */
  stockMinimo: number;
  publicadoEnTienda: boolean;
  destacado: boolean;
  etiquetas: string[];
  // derivado: margen, existencias, ventas, rotación, días sin movimiento
}

export interface Variante extends Trazabilidad, Eliminable {
  id: Id;
  productoId: Id;
  talla: string;
  colorId: Id;
  /** 'HL-CAM-0142-AZC-M' */
  sku: string;
  /** 13 dígitos, prefijo de circulación interna 20–29, dígito de control válido. */
  ean13: string;
}

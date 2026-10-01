/** Tipos comunes del dominio (PLAN 6.2). Todo dato es plano y serializable (5.1.6). */

export type Id = string;
/** 'AAAA-MM-DD' en hora de Bogotá. */
export type FechaISO = string;
/** 'AAAA-MM-DDTHH:mm:ss' en hora de Bogotá, sin zona. */
export type FechaHoraISO = string;
/** 'HH:mm' 24 h. */
export type HoraHHmm = string;
/** 'AAAA-MM'. */
export type MesISO = string;
/** Pesos colombianos enteros. */
export type COP = number;
/**
 * Trozo de una frase armada por un selector (hallazgos, alertas): texto tal cual o una cifra de dinero en COP que la
 * pantalla pinta con `<Dinero>` en la moneda activa (compartidos C-D).
 */
export type ParteFrase = { texto: string } | { dinero: COP; /** "$ 53,2 M" en lugar de "$ 53.177.420". */ corta?: boolean };
/** USD o CNY × 100, enteros. */
export type Centavos = number;
/** 0.19 = 19 %. */
export type Fraccion = number;
export type Tabla<T> = Record<Id, T>;
/** 0 = domingo (convención JS); la interfaz muestra lunes primero. */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Moneda = 'COP' | 'USD' | 'CNY';
export type MonedaExtranjera = Exclude<Moneda, 'COP'>;

export interface MontoExtranjero {
  moneda: MonedaExtranjera;
  centavos: Centavos;
}
/** Monto que nació en moneda extranjera y se convirtió a COP con la tasa de su fecha. */
export interface MontoConvertido extends MontoExtranjero {
  tasa: number;
  fechaTasa: FechaISO;
  cop: COP;
}
/** Monto que puede estar en cualquier moneda (fletes, honorarios). COP: pesos; USD/CNY: centavos. */
export interface MontoMoneda {
  moneda: Moneda;
  valor: number;
}

export type Origen = 'generado' | 'usuario';
export interface Trazabilidad {
  creadoEn: FechaHoraISO;
  /** usuarioId, o USUARIOS_SISTEMA.* */
  creadoPor: Id;
  actualizadoEn?: FechaHoraISO;
  actualizadoPor?: Id;
  origen: Origen;
}
export interface Eliminable {
  eliminadoEn?: FechaHoraISO;
  eliminadoPor?: Id;
  motivoEliminacion?: string;
}

export type TipoDocumento =
  | 'venta'
  | 'devolucion'
  | 'importacion'
  | 'traslado'
  | 'conteo'
  | 'ajuste'
  | 'gasto'
  | 'cuenta_por_pagar'
  | 'liquidacion'
  | 'sesion_caja'
  | 'factura'
  | 'nota_credito'
  | 'transferencia'
  | 'movimiento_cuenta'
  | 'bono'
  | 'abono_datafono';
export interface RefDocumento {
  tipo: TipoDocumento;
  id: Id;
}

/** Soporte simulado (no se sube ningún archivo). */
export interface Soporte {
  nombreArchivo: string;
  estado: 'adjunto' | 'pendiente';
  fecha?: FechaISO;
}

/** porcentaje: Fraccion; valor: COP. */
export interface Descuento {
  tipo: 'porcentaje' | 'valor';
  valor: number;
}

export const USUARIOS_SISTEMA = {
  sistema: 'sistema',
  portalAduanas: 'portal-aduanas',
  tiendaWeb: 'tienda-web',
  botWhatsapp: 'bot-whatsapp',
  botInstagram: 'bot-instagram',
} as const;

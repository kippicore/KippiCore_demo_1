import type {
  COP,
  Centavos,
  Eliminable,
  FechaHoraISO,
  FechaISO,
  Fraccion,
  Id,
  Moneda,
  MonedaExtranjera,
  MontoMoneda,
  Trazabilidad,
} from './comunes';
import type { Categoria } from './catalogo';

/** Proveedores, contactos e importaciones (PLAN 6.11). */
export type TipoProveedor = 'fabrica' | 'local';
export type CategoriaProveedorLocal =
  | 'arriendo'
  | 'servicios'
  | 'empaques'
  | 'publicidad'
  | 'sastreria'
  | 'vigilancia'
  | 'transporte'
  | 'mantenimiento'
  | 'tecnologia'
  | 'contabilidad'
  | 'aduanas'
  | 'carga';
export interface Proveedor extends Trazabilidad, Eliminable {
  id: Id;
  tipo: TipoProveedor;
  /** 'Guangzhou Huameng Garment Co., Ltd.' (ficticio, verificado). */
  nombre: string;
  /** 'Guangzhou Huameng' */
  nombreCorto: string;
  /** Locales. */
  nit: string | null;
  ciudad: string;
  pais: string;
  moneda: Moneda;
  /** '30 % anticipo, 70 % al quedar listo para despacho' */
  condicionesPago: string;
  diasEntregaPactados: number | null;
  categoriaLocal: CategoriaProveedorLocal | null;
  /** Arrendador de un local. */
  localId: Id | null;
  /** Fábricas. */
  categoriasProducto: Categoria[];
  calificacion: 1 | 2 | 3 | 4 | 5;
  contactoIds: Id[];
  nota: string | null;
  // derivado: total comprado, saldo pendiente, pedidos, tiempo promedio de entrega,
  //           cumplimiento de fechas, tasa de defectos (de las recepciones), costo promedio por unidad
}

export type RolContacto = 'proveedor' | 'agente_carga' | 'agente_aduanas' | 'transportador' | 'otro';
export interface Contacto extends Trazabilidad, Eliminable {
  id: Id;
  /** 'Carolina Mejía' */
  nombre: string;
  /** 'Agencia de Aduanas Litoral S.A.S. Nivel 2' */
  empresa: string;
  rol: RolContacto;
  proveedorId: Id | null;
  correo: string;
  /** Con indicativo: '+57 310 …', '+86 …' */
  whatsapp: string;
  pais: string;
  idioma: 'es' | 'en';
  /** 'usted' por defecto en la cadena de importación. */
  tratamiento: 'tu' | 'usted';
  /** WeChat es simulado: "Copiar para WeChat". */
  canalPreferido: 'whatsapp' | 'correo' | 'wechat';
  /** ID ficticio. */
  wechat: string | null;
}

export const ESTADOS_IMPORTACION = [
  'cotizado',
  'pedido_confirmado',
  'anticipo_pagado',
  'en_produccion',
  'listo_despacho',
  'saldo_pagado',
  'embarcado',
  'en_transito',
  'en_puerto',
  'en_nacionalizacion',
  'nacionalizado',
  'en_transporte_bogota',
  'recibido_bodega',
] as const;
export type EstadoImportacion = (typeof ESTADOS_IMPORTACION)[number];

export interface HitoImportacion {
  estimada: FechaISO;
  real: FechaISO | null;
  nota: string | null;
  /** Usuario o 'portal-aduanas'. */
  actualizadoPor: Id | null;
}
export type TipoDocumentoImportacion =
  | 'proforma'
  | 'factura_comercial'
  | 'lista_empaque'
  | 'bl'
  | 'guia_aerea'
  | 'declaracion_importacion'
  | 'declaracion_cambio'
  | 'declaracion_valor';
export interface DocumentoImportacion {
  tipo: TipoDocumentoImportacion;
  /** Ficticio, sin prefijos de navieras reales. */
  numero: string;
  /** 'Proforma_IMP-2026-07.pdf' (simulado). */
  nombreArchivo: string;
  estado: 'pendiente' | 'recibido' | 'aprobado';
  fecha: FechaISO | null;
}
export interface LineaImportacion {
  id: Id;
  productoId: Id;
  /** varianteId → unidades pedidas. */
  cantidades: Record<Id, number>;
  /** FOB por unidad en la moneda del pedido. */
  costoUnitarioOrigen: Centavos;
}
export interface CostosImportacion {
  flete: MontoMoneda;
  /** Por defecto: parámetro × FOB. */
  seguro: MontoMoneda;
  honorariosAgente: COP;
  bodegajePuerto: COP;
  transporteInterno: COP;
  otros: COP;
  /** "Otros tributos aduaneros" (componente específico del arancel; valor de ejemplo). */
  otrosTributosAduaneros: COP;
  /** Copia editable del parámetro. */
  arancelPct: Fraccion;
  ivaImportacionPct: Fraccion;
  ivaSumaAlCosto: boolean;
}
export type CargaImportacion =
  /** La mayoría: carga consolidada (LCL). */
  | { tipo: 'consolidada'; m3: number }
  /** Solo el pedido grande de temporada. */
  | { tipo: 'contenedor'; pies: 20 | 40 }
  | { tipo: 'aerea'; kg: number };
export interface Importacion extends Trazabilidad, Eliminable {
  id: Id;
  /** 'IMP-2026-07' — único e inmutable (URL). */
  numero: string;
  proveedorId: Id;
  moneda: MonedaExtranjera;
  /** Tasa usada al cotizar/confirmar. */
  tasaPedido: number;
  fechaPedido: FechaISO;
  carga: CargaImportacion;
  /** 'Ningbo' · 'Shenzhen (Yantian)' · 'Guangzhou (Nansha)' · 'Shanghái' */
  puertoOrigen: string;
  puertoDestino: 'Buenaventura' | 'Cartagena';
  lineas: LineaImportacion[];
  /** 'nacionalizado' se muestra como "Nacionalizado (levante)". */
  estado: EstadoImportacion;
  hitos: Record<EstadoImportacion, HitoImportacion>;
  /** "Le salió aforo físico (revisión de etiquetado)". */
  aforo: { tipo: 'automatico' | 'documental' | 'fisico'; motivo: string | null } | null;
  /** El usuario cambió el estado a mano: el generador no la avanza hasta esa fecha (siguiente hito estimado). */
  controlManualHasta: FechaISO | null;
  /** Creada desde "Sugerir pedido" (W12). */
  origenSugerencia: { ts: FechaHoraISO; coberturaDias: number } | null;
  documentos: DocumentoImportacion[];
  costos: CostosImportacion;
  metodoProrrateo: 'valor' | 'cantidad';
  costosAplicados: { ts: FechaHoraISO; tasaCosteo: number } | null;
  /** Cadena de esta importación (preseleccionados al notificar). */
  contactoIds: Id[];
  recepcion: {
    fecha: FechaISO;
    recibidoPor: Id;
    lineas: Record<Id, { esperadas: number; recibidas: number; defectuosas: number }>;
    nota: string | null;
  } | null;
  /** Anticipo y saldo FOB (USD/CNY) y servicios de la cadena. */
  cuentaPorPagarIds: Id[];
  nota: string | null;
  // derivado: FOB total, pagado, saldo, tasa de costeo, costo aterrizado y por prenda,
  //           retraso, posición en la ruta, evento de llegada en el calendario, margen proyectado
}

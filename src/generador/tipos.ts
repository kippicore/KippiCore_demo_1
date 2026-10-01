import type {
  CargaImportacion,
  Categoria,
  CostosImportacion,
  CurvaTallas,
  DatosCliente,
  EstadoImportacion,
  FechaHoraISO,
  FechaISO,
  Id,
  LineaImportacion,
  MonedaExtranjera,
} from '@/dominio/tipos';
import type { Intencion } from '@/dominio/motor/construir';

/** Tipos internos del generador (PLAN 7.4). */

export type TipoIntencion =
  | 'preparacion'
  | 'tasa'
  | 'dia.apertura'
  | 'caja.abrir'
  | 'caja.cerrar'
  | 'datafono.abono'
  | 'bono.venta'
  | 'turnos.semana'
  | 'marcacion'
  | 'venta'
  | 'venta.guion'
  | 'revision'
  | 'reposicion'
  | 'conteo'
  | 'traslados.recibir'
  | 'importacion.hito'
  | 'cxp.pagos'
  | 'cliente.alta'
  | 'nomina.periodo'
  | 'mes.cierre'
  | 'prestaciones'
  | 'gastos.ocasionales'
  | 'narrativa';

export interface IntencionGen extends Intencion {
  tipo: TipoIntencion;
  /** Datos planos de la intención: { localId: 'zr', indice: 14 }. */
  datos: Record<string, string | number>;
}

/** Referencia del catálogo con lo que el generador necesita (ids estables del estado inicial). */
export interface ProductoPlan {
  id: Id;
  categoria: Categoria;
  curva: CurvaTallas;
  proveedorId: Id;
  precio: number;
  pesoDemanda: number;
  sinMovimiento: boolean;
  colores: Id[];
  tallas: string[];
  /** varianteId por `${talla}|${colorId}`. */
  variantes: Record<string, Id>;
  fob: { moneda: MonedaExtranjera; centavos: number };
}

export type TipoLatente = 'vip' | 'frecuente' | 'ocasional' | 'en_riesgo_alto' | 'en_riesgo' | 'nuevo';

export interface ClientePlan {
  id: Id;
  tipo: TipoLatente;
  datos: DatosCliente;
  /** Alta (puede ser anterior a la ventana). */
  alta: FechaHoraISO;
  /** Desde cuándo puede comprar en la ventana. */
  activoDesde: FechaISO;
  /** Último día en que compra (en riesgo: antes del abandono). null = sigue activo. */
  activoHasta: FechaISO | null;
  /** Compras esperadas por día activo (sorteadas entre las ventas identificadas). */
  tasa: number;
  /**
   * Fechas de compras garantizadas (P11): la última compra reciente de VIP, frecuentes y ocasionales, las del
   * año de los frecuentes y ocasionales y la última antes del abandono de los "en riesgo". El plan las asigna a
   * una venta concreta del día en su local habitual.
   */
  garantizadas: FechaISO[];
  localHabitual: Id;
  tallas: { superior: string; pantalon: string; calzado: string; sastreria: string };
  colorFavorito: Id;
}

export interface CxPServicioPlan {
  sufijo: string;
  /** Estado en que nace. */
  estado: EstadoImportacion;
  categoria: 'agente_carga' | 'agente_aduanas' | 'transporte';
  proveedorId: Id | null;
  tercero: string;
  concepto: string;
  moneda: 'COP' | MonedaExtranjera;
  valor: number;
  diasPlazo: number;
}

export interface ImportacionPlan {
  id: Id;
  proveedorId: Id;
  moneda: MonedaExtranjera;
  fechaPedido: FechaISO;
  /** Fecha en que el generador la crea (el pedido o, si es anterior a la ventana, la víspera). */
  creacion: FechaISO;
  carga: CargaImportacion;
  puertoOrigen: string;
  lineas: LineaImportacion[];
  costos: CostosImportacion;
  /** Fecha real planeada de cada estado alcanzado (los futuros se completan al avanzar). */
  fechas: Partial<Record<EstadoImportacion, FechaISO>>;
  /** Carga inicial (recibida la víspera de la ventana). */
  cargaInicial: boolean;
  /** Clave narrativa (IMPORTACIONES_EN_CURSO) si es una de las cuatro en curso al ancla. */
  narrativa: 'en_produccion' | 'en_transito' | 'en_puerto' | 'en_nacionalizacion' | null;
  /** Fechas estimadas que fija la narrativa (importacion.actualizarHitos) y cuándo. */
  estimadasNarrativa: { fecha: FechaISO; estimadas: Partial<Record<EstadoImportacion, FechaISO>> } | null;
  /** Estado reportado desde el portal (N2). */
  portal: { estado: EstadoImportacion; autor: string } | null;
  aforo: { tipo: 'documental' | 'fisico'; motivo: string } | null;
  defectos: number;
  servicios: CxPServicioPlan[];
  /** Participación de cada local en la distribución (el resto queda en bodega). */
  contactoIds: Id[];
}

export interface PlanNarrativo {
  ancla: FechaISO;
  /** Separados guionados (N7): fechas límite fijas. */
  separados: { dia: FechaISO; localId: Id; indice: number; fechaLimite: FechaISO; porVencer: boolean }[];
  /** Llegadas tarde de Mateo (N6): días con su minuto de llegada. */
  tardanzas: { fecha: FechaISO; minutos: number }[];
  /** Ausencias sin novedad (una cada ≈ 2 meses). */
  ausencias: { fecha: FechaISO; empleadoId: Id }[];
  /** Novedades sembradas. */
  novedades: {
    id: Id;
    empleadoId: Id;
    tipo: 'vacaciones' | 'incapacidad' | 'permiso';
    desde: FechaISO;
    hasta: FechaISO;
    remunerada: boolean;
  }[];
  /** Compras guionadas de Andrés Gutiérrez (N12) y Ricardo Peñuela (N8). */
  comprasGuion: {
    clave: string;
    ts: FechaHoraISO;
    clienteId: Id;
    localId: Id;
    vendedorId: Id;
    lineas: { productoId: Id; talla: string; colorId: Id }[];
  }[];
}

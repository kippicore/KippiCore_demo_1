import type { COP, FechaHoraISO, FechaISO, Id, Tabla } from './comunes';
import type { Empresa, Local, UsuarioDemo } from './empresa';
import type { Parametros, TasaCambio } from './sistema';
import type { Color, Producto, Variante } from './catalogo';
import type { ClaveExistencia, ConteoFisico, MovimientoInventario, Traslado } from './inventario';
import type { BonoRegalo, Devolucion, SolicitudAprobacion, Venta } from './ventas';
import type { SesionCaja } from './caja';
import type { Cliente } from './clientes';
import type { Contrato, Empleado, EsquemaComision, Marcacion, MetaVentas, Novedad, Turno } from './personal';
import type { LiquidacionNomina } from './nomina';
import type { Contacto, Importacion, Proveedor } from './compras';
import type {
  AbonoDatafono,
  CuentaDinero,
  CuentaPorPagar,
  Gasto,
  GastoRecurrente,
  MovimientoCuenta,
} from './finanzas';
import type { EventoCalendario } from './calendario';
import type { Factura, NotaCredito, ResolucionFacturacion } from './facturacion';
import type { MensajeSaliente, Notificacion } from './mensajeria';

/** Estado raíz (PLAN 6.16). */
export type TipoConsecutivo =
  | 'venta'
  | 'devolucion'
  | 'traslado'
  | 'conteo'
  | 'factura'
  | 'documento_pos'
  | 'nota_credito'
  | 'cuenta_por_pagar'
  | 'liquidacion'
  | 'producto'
  /** Consecutivo de variante del EAN-13 (ajuste F2-A1). */
  | 'variante'
  | 'bono';

export interface MetaEstado {
  semilla: string;
  ancla: FechaISO;
  /** Día 1 del mes de (ancla − 18 meses). */
  inicioVentana: FechaISO;
  generadoHasta: FechaHoraISO;
  versionGenerador: number;
  /** config/demo.ts (0,5–1,5). */
  escala: number;
  consecutivos: Record<TipoConsecutivo, number>;
  /** Por año: { '2026': 10 }. */
  consecutivosImportacion: Record<string, number>;
  /** Debe ser 0 sin registro (prueba). */
  omitidosGenerador: number;
  omitidosUsuario: { entradaId: Id; motivo: string }[];
  /** Líneas que el generador no pudo vender por falta de existencias (hallazgo de tallas). */
  demandaInsatisfecha: Record<ClaveExistencia, number>;
  /** Entidades guionadas al construir (7.11); selNarrativa() las vuelve dinámicas. */
  narrativa: NarrativaIds;
}

export interface NarrativaIds {
  varianteOxfordM: Id;
  productoOxford: Id;
  varianteChinoArena32: Id;
  importacionEnProduccion: Id;
  importacionEnTransito: Id;
  importacionEnPuerto: Id;
  importacionRetrasada: Id;
  /** Saldo a Hangzhou Lanxin (vence al quedar listo para despacho). */
  cxpSaldoGrande: Id;
  vendedorPersona: Id;
  bodegaPersona: Id;
  vendedoraEstrella: Id;
  empleadoLlegadasTarde: Id;
  contratistasRiesgo: Id[];
  clienteFrecuente: Id;
  clienteVip: Id;
  solicitudDescuento: Id;
  solicitudTraslado: Id;
  solicitudAnulacion: Id;
  /** Zona Rosa, anoche, −$ 40.000. */
  sesionCajaFaltante: Id;
  /** Fábrica preseleccionada en W12 (camisas). */
  proveedorSugerencia: Id;
}

/**
 * Agregados materializados. Solo los escriben las primitivas de `dominio/comandos/tx.ts` y una prueba los
 * verifica contra los hechos. Además de las existencias (6.16), F2-A1 agrega cuatro índices que los
 * manejadores necesitan en O(1) durante la construcción masiva (decisión registrada en DECISIONES.md).
 */
export interface Agregados {
  /** Σ movimientos(v, l).cantidad (I1). */
  existencias: Record<ClaveExistencia, number>;
  /** saldoInicial + Σ pagos de venta con esa cuenta + Σ movimientos de la cuenta (V7). */
  saldosCuentas: Record<Id, COP>;
  /** Por sesión de caja: Σ pagos en efectivo de ventas (incluidos reembolsos, negativos) + bonos vendidos en efectivo (V8). */
  efectivoSesion: Record<Id, COP>;
  /** Por `${localId}@${fecha}`: Σ cobrado con datáfono (ventas, reembolsos y bonos), separado en débito y crédito (V11). */
  datafonoDia: Record<string, { debito: COP; credito: COP }>;
  /** Por `${empleadoId}@${fecha}`: IDs de marcaciones ordenadas por ts (P3). */
  marcacionesDia: Record<string, Id[]>;
}

export interface EstadoDominio {
  meta: MetaEstado;
  empresa: Empresa;
  parametros: Parametros;
  usuarios: Tabla<UsuarioDemo>;
  locales: Tabla<Local>;
  tasas: Tabla<TasaCambio>;
  resoluciones: Tabla<ResolucionFacturacion>;
  // catálogo e inventario
  colores: Tabla<Color>;
  productos: Tabla<Producto>;
  variantes: Tabla<Variante>;
  /** Libro. */
  movimientos: MovimientoInventario[];
  traslados: Tabla<Traslado>;
  conteos: Tabla<ConteoFisico>;
  // ventas
  ventas: Tabla<Venta>;
  devoluciones: Tabla<Devolucion>;
  sesionesCaja: Tabla<SesionCaja>;
  solicitudes: Tabla<SolicitudAprobacion>;
  bonos: Tabla<BonoRegalo>;
  clientes: Tabla<Cliente>;
  // personas
  empleados: Tabla<Empleado>;
  contratos: Tabla<Contrato>;
  esquemasComision: Tabla<EsquemaComision>;
  metas: Tabla<MetaVentas>;
  turnos: Tabla<Turno>;
  marcaciones: Tabla<Marcacion>;
  novedades: Tabla<Novedad>;
  liquidaciones: Tabla<LiquidacionNomina>;
  // compras
  proveedores: Tabla<Proveedor>;
  contactos: Tabla<Contacto>;
  importaciones: Tabla<Importacion>;
  // plata
  cuentas: Tabla<CuentaDinero>;
  movimientosCuenta: Tabla<MovimientoCuenta>;
  cuentasPorPagar: Tabla<CuentaPorPagar>;
  abonosDatafono: Tabla<AbonoDatafono>;
  gastos: Tabla<Gasto>;
  gastosRecurrentes: Tabla<GastoRecurrente>;
  // agenda, documentos y comunicación
  eventos: Tabla<EventoCalendario>;
  /** Facturas electrónicas y documentos equivalentes POS. */
  facturas: Tabla<Factura>;
  notasCredito: Tabla<NotaCredito>;
  /** Libro. */
  mensajes: MensajeSaliente[];
  notificaciones: Tabla<Notificacion>;
  // (alertas descartadas y notificaciones leídas: store `sesion`, no dominio)
  agregados: Agregados;
}

/** Colecciones de tipo Tabla (para EntidadCambiada y la fábrica `crud()`). */
export type ColeccionTabla = Exclude<
  keyof EstadoDominio,
  'meta' | 'empresa' | 'parametros' | 'movimientos' | 'mensajes' | 'agregados'
>;

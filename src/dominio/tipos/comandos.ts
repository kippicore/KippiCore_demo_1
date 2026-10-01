import type {
  COP,
  Centavos,
  Descuento,
  Eliminable,
  FechaHoraISO,
  FechaISO,
  HoraHHmm,
  Id,
  MesISO,
  MonedaExtranjera,
  Origen,
  Soporte,
  Trazabilidad,
} from './comunes';
import type { Empresa, Local, Rol, UsuarioDemo } from './empresa';
import type { Parametros } from './sistema';
import type { Categoria, Producto } from './catalogo';
import type { MotivoAjuste } from './inventario';
import type { Canal, CompensacionDevolucion, MedioPago, SolicitudAprobacion, TipoVenta } from './ventas';
import type {
  CategoriaGasto,
  AbonoCxP,
  CuentaDinero,
  CuentaPorPagar,
  Gasto,
  GastoRecurrente,
} from './finanzas';
import type { Cliente } from './clientes';
import type { MensajeSaliente } from './mensajeria';
import type {
  Contacto,
  CostosImportacion,
  DocumentoImportacion,
  EstadoImportacion,
  Importacion,
  Proveedor,
} from './compras';
import type { Contrato, Empleado, EsquemaComision, Novedad, TipoTurno } from './personal';
import type { InsumosLiquidacion, PeriodoNomina } from './nomina';
import type { EventoCalendario } from './calendario';
import type { Adquirente, ResolucionFacturacion, TipoDocumentoElectronico } from './facturacion';
import type { EstadoDominio } from './estado';
import type { EventoDominio } from './eventos';

/** Registro, sobres y resultados (PLAN 6.17). */
export interface SobreComando<C extends Comando = Comando> {
  /** Id de la entrada (único). */
  id: Id;
  /** Instante real (Bogotá) en que se emitió. */
  ts: FechaHoraISO;
  /** max(meta.generadoHasta de la sesión, mayor marcaAgua del registro): monótona (generador: = ts). */
  marcaAgua: FechaHoraISO;
  usuarioId: Id;
  rol: Rol | 'sistema' | 'portal' | 'tienda';
  origen: Origen;
  comando: C;
}
/** seq: orden de emisión en la pestaña; orden total (marcaAgua, ts, seq, id). */
export type EntradaRegistro = SobreComando & { seq: number };

/** mensaje en español, para el usuario. */
export interface ErrorDominio {
  codigo: string;
  mensaje: string;
  campo?: string;
}
export type ResultadoComando =
  | { ok: true; eventos: EventoDominio[]; antes: EstadoDominio; despues: EstadoDominio }
  | { ok: false; error: ErrorDominio };

/** Catálogo cerrado: la clave es también la clave de permiso (config/permisos.ts). */
export interface MapaComandos {
  // Catálogo e inventario
  /** varianteIds: clave `${talla}|${colorId}`. Referencia '' = se asigna con el consecutivo. */
  'producto.crear': DatosProducto & { productoId: Id; varianteIds: Record<string, Id> };
  'producto.editar': {
    productoId: Id;
    cambios: Partial<Omit<DatosProducto, 'referencia' | 'tallas' | 'colorIds'>>;
  };
  'producto.eliminar': { productoId: Id; motivo: string | null };
  'variante.agregar': { productoId: Id; varianteId: Id; talla: string; colorId: Id };
  'variante.eliminar': { varianteId: Id };
  'color.crear': { colorId: Id; nombre: string; hex: string; codigo: string };
  'inventario.ajustar': {
    movimientoId: Id;
    varianteId: Id;
    localId: Id;
    nuevaCantidad: number;
    motivo: MotivoAjuste;
    nota: string | null;
  };
  'traslado.solicitar': {
    trasladoId: Id;
    origenId: Id;
    destinoId: Id;
    lineas: { varianteId: Id; cantidad: number }[];
    motivo: string | null;
    requiereAprobacion: boolean;
    solicitudId: Id | null;
  };
  'traslado.despachar': { trasladoId: Id };
  'traslado.recibir': { trasladoId: Id; recibidas: Record<Id, number> | null; nota: string | null };
  'traslado.cancelar': { trasladoId: Id; motivo: string };
  'conteo.iniciar': { conteoId: Id; localId: Id; categorias: Categoria[] | null };
  'conteo.guardar': { conteoId: Id; cantidades: Record<Id, number> };
  'conteo.aplicar': { conteoId: Id; motivos: Record<Id, MotivoAjuste> };
  'conteo.cancelar': { conteoId: Id };
  // Ventas y caja
  /** por: empleadoId de quien abre (null = la persona del usuario del sobre). */
  'caja.abrir': { sesionId: Id; localId: Id; baseInicial: COP; por: Id | null };
  'caja.egreso': { egresoId: Id; sesionId: Id; concepto: string; valor: COP; categoria: CategoriaGasto };
  /** Ciego si el rol no es dueño. por: empleadoId de quien cierra (null = la persona del usuario del sobre). */
  'caja.cerrar': {
    sesionId: Id;
    denominaciones: Record<string, number> | null;
    efectivoContado: COP;
    observacion: string | null;
    por: Id | null;
  };
  /** El dueño marca el cierre como revisado (W11). */
  'caja.revisarCierre': { sesionId: Id; nota: string | null };
  'venta.registrar': DatosRegistrarVenta;
  'venta.editar': {
    ventaId: Id;
    cambios: {
      clienteId?: Id | null;
      vendedorId?: Id;
      canal?: Canal;
      nota?: string | null;
      mediosPago?: { pagoId: Id; medio: MedioPago }[];
    };
  };
  /** Solo dueño. */
  'venta.anular': {
    ventaId: Id;
    motivo: string;
    reembolso: { medio: MedioPago; sesionCajaId: Id | null } | null;
    notaCreditoId: Id | null;
    solicitudId: Id | null;
  };
  'venta.abonar': { ventaId: Id; pago: DatosPago };
  'separado.cancelar': {
    ventaId: Id;
    destinoAbonos: 'reembolso' | 'saldo_favor';
    reembolso: { medio: MedioPago; sesionCajaId: Id | null } | null;
  };
  'devolucion.registrar': DatosDevolucion;
  'pago.conciliar': {
    refs: ({ tipo: 'pago_venta'; ventaId: Id; pagoId: Id } | { tipo: 'movimiento'; movimientoId: Id })[];
    conciliado: boolean;
  };
  /** Traslados: vía traslado.solicitar. */
  'aprobacion.solicitar': {
    solicitudId: Id;
    datos: Extract<SolicitudAprobacion['datos'], { tipo: 'descuento' | 'anulacion' }>;
  };
  'bono.vender': {
    bonoId: Id;
    codigo: string | null;
    valor: COP;
    localId: Id;
    pago: DatosPago;
    vence: FechaISO;
  };
  /** Bruto, comisión y retenciones se calculan con reglas/datafono.ts. */
  'datafono.registrarAbono': {
    abonoId: Id;
    localId: Id;
    ventasDe: FechaISO;
    fecha: FechaISO;
    cuentaDestinoId: Id;
  };
  'aprobacion.resolver': { solicitudId: Id; decision: 'aprobada' | 'rechazada'; nota: string | null };
  // Clientes y mensajes
  'cliente.crear': { clienteId: Id; datos: DatosCliente };
  'cliente.editar': { clienteId: Id; cambios: Partial<DatosCliente> };
  'cliente.eliminar': { clienteId: Id; motivo: string | null };
  'cliente.nota': { notaId: Id; clienteId: Id; texto: string };
  'mensaje.registrar': { mensajes: Omit<MensajeSaliente, 'estado'>[] };
  // Compras
  'proveedor.crear': { proveedorId: Id; datos: DatosProveedor };
  'proveedor.editar': { proveedorId: Id; cambios: Partial<DatosProveedor> };
  'proveedor.eliminar': { proveedorId: Id; motivo: string | null };
  'contacto.crear': { contactoId: Id; datos: DatosContacto };
  'contacto.editar': { contactoId: Id; cambios: Partial<DatosContacto> };
  'contacto.eliminar': { contactoId: Id };
  'importacion.crear': DatosImportacion & { importacionId: Id };
  'importacion.editar': { importacionId: Id; cambios: Partial<DatosImportacion> };
  'importacion.eliminar': { importacionId: Id; motivo: string | null };
  'importacion.cambiarEstado': {
    importacionId: Id;
    estado: EstadoImportacion;
    fecha: FechaISO;
    nota: string | null;
    origen: 'panel' | 'portal' | 'sistema';
    autor: string | null;
  };
  'importacion.actualizarHitos': {
    importacionId: Id;
    estimadas: Partial<Record<EstadoImportacion, FechaISO>>;
  };
  'importacion.actualizarCostos': {
    importacionId: Id;
    costos: CostosImportacion;
    metodoProrrateo: 'valor' | 'cantidad';
  };
  /** null = la calculada. */
  'importacion.aplicarCostos': { importacionId: Id; tasaCosteo: number | null };
  'importacion.registrarPago': {
    importacionId: Id;
    cxpId: Id;
    abonoId: Id;
    centavos: Centavos;
    tasa: number;
    fecha: FechaISO;
    cuentaId: Id;
  };
  'importacion.documento': { importacionId: Id; documento: DocumentoImportacion };
  'importacion.recibir': {
    importacionId: Id;
    fecha: FechaISO;
    lineas: Record<Id, { recibidas: number; defectuosas: number }>;
    nota: string | null;
    distribucion: { trasladoId: Id; destinoId: Id; lineas: { varianteId: Id; cantidad: number }[] }[];
  };
  // Plata
  'cxp.crear': { cxpId: Id; datos: DatosCxP };
  'cxp.editar': { cxpId: Id; cambios: Partial<DatosCxP> };
  'cxp.eliminar': { cxpId: Id; motivo: string | null };
  'cxp.programar': { cxpId: Id; fecha: FechaISO | null };
  'cxp.pagar': {
    cxpId: Id;
    abonoId: Id;
    fecha: FechaISO;
    valorCOP: COP | null;
    centavos: Centavos | null;
    tasa: number | null;
    cuentaId: Id;
    medio: AbonoCxP['medio'];
    soporte: Soporte | null;
  };
  'cuenta.crear': { cuentaId: Id; datos: DatosCuenta };
  'cuenta.editar': { cuentaId: Id; cambios: Partial<DatosCuenta> };
  'cuenta.transferir': {
    transferenciaId: Id;
    origenId: Id;
    destinoId: Id;
    valor: COP;
    fecha: FechaISO;
    descripcion: string;
  };
  'cuenta.movimiento': {
    movimientoId: Id;
    cuentaId: Id;
    valor: COP;
    tipo: 'aporte_socio' | 'retiro_socio' | 'otro_ingreso' | 'otro_egreso' | 'ajuste';
    fecha: FechaISO;
    descripcion: string;
  };
  // Gastos
  'gasto.registrar': {
    gastoId: Id;
    datos: DatosGasto;
    pago:
      { tipo: 'inmediato'; cuentaId: Id; medio: string } | { tipo: 'por_pagar'; vence: FechaISO; cxpId: Id };
  };
  'gasto.editar': { gastoId: Id; cambios: Partial<DatosGasto> };
  'gasto.eliminar': { gastoId: Id; motivo: string | null };
  'gastoRecurrente.crear': { recurrenteId: Id; datos: DatosGastoRecurrente };
  'gastoRecurrente.editar': { recurrenteId: Id; cambios: Partial<DatosGastoRecurrente> };
  'gastoRecurrente.eliminar': { recurrenteId: Id };
  'gastoRecurrente.generarMes': { mes: MesISO };
  // Personal y nómina
  'empleado.crear': { empleadoId: Id; contratoId: Id; datos: DatosEmpleado; contrato: DatosContrato };
  'empleado.editar': { empleadoId: Id; cambios: Partial<DatosEmpleado> };
  'empleado.retirar': { empleadoId: Id; fecha: FechaISO; motivo: string };
  'contrato.reemplazar': { empleadoId: Id; contratoId: Id; desde: FechaISO; contrato: DatosContrato };
  'esquemaComision.crear': {
    esquemaId: Id;
    datos: Omit<EsquemaComision, 'id' | keyof Trazabilidad | keyof Eliminable>;
  };
  'esquemaComision.editar': {
    esquemaId: Id;
    cambios: Partial<Omit<EsquemaComision, 'id' | keyof Trazabilidad | keyof Eliminable>>;
  };
  'esquemaComision.eliminar': { esquemaId: Id };
  'meta.fijar': { metaId: Id; localId: Id; mes: MesISO; valor: COP };
  'turno.asignar': {
    turnoId: Id;
    empleadoId: Id;
    localId: Id;
    fecha: FechaISO;
    tipo: TipoTurno;
    inicio: HoraHHmm;
    fin: HoraHHmm;
    descansoMin: number;
    aceptarExceso: boolean;
  };
  'turno.mover': {
    turnoId: Id;
    fecha: FechaISO;
    empleadoId: Id;
    localId: Id;
    tipo: TipoTurno;
    inicio: HoraHHmm;
    fin: HoraHHmm;
    aceptarExceso: boolean;
  };
  'turno.eliminar': { turnoId: Id };
  /** IDs derivados: `${turnoOrigenId}>${lunesDestino}`. */
  'turno.copiarSemana': {
    localId: Id;
    lunesOrigen: FechaISO;
    lunesDestino: FechaISO;
    aceptarExceso: boolean;
  };
  'marcacion.registrar': {
    marcacionId: Id;
    empleadoId: Id;
    localId: Id;
    tipo: 'entrada' | 'salida';
    ts: FechaHoraISO;
  };
  'marcacion.corregir': { marcacionId: Id; ts: FechaHoraISO; nota: string };
  'marcacion.eliminar': { marcacionId: Id; nota: string };
  'novedad.registrar': { novedadId: Id; datos: DatosNovedad };
  'novedad.editar': { novedadId: Id; cambios: Partial<DatosNovedad> };
  'novedad.eliminar': { novedadId: Id };
  'pila.verificar': { contratoId: Id; periodo: MesISO; verificada: boolean; soporte: Soporte | null };
  /** insumos null = calcular de asistencia/ventas. */
  'nomina.aprobar': {
    liquidacionId: Id;
    periodo: PeriodoNomina;
    exoneracion114: boolean;
    insumos: Record<Id, InsumosLiquidacion> | null;
  };
  'nomina.pagar': { liquidacionId: Id; fecha: FechaISO; cuentaId: Id };
  'nomina.anularAprobacion': { liquidacionId: Id };
  // Calendario
  'evento.crear': { eventoId: Id; datos: DatosEvento };
  'evento.editar': { eventoId: Id; cambios: Partial<DatosEvento> };
  'evento.eliminar': { eventoId: Id };
  // Facturación
  /** tipo: factura electrónica o documento equivalente POS (ajuste F2-A1). */
  'factura.emitir': { facturaId: Id; ventaId: Id; tipo: TipoDocumentoElectronico; adquirente: Adquirente };
  'factura.avanzarEstado': { facturaId: Id; estado: 'enviada' | 'aceptada' };
  'notaCredito.emitir': { notaId: Id; facturaId: Id; devolucionId: Id | null; motivo: string };
  // Configuración
  'empresa.editar': { cambios: Partial<Empresa> };
  'local.crear': { localId: Id; datos: DatosLocal };
  'local.editar': { localId: Id; cambios: Partial<DatosLocal> };
  'local.eliminar': { localId: Id; motivo: string | null };
  /** Si ya hay una para (moneda, fecha), la reemplaza. */
  'tasa.registrar': { tasaId: Id; moneda: MonedaExtranjera; fecha: FechaISO; valor: number };
  'tasa.editar': { tasaId: Id; valor: number; fecha: FechaISO };
  'tasa.eliminar': { tasaId: Id };
  /** Validado por sección. */
  'parametros.editar': { seccion: keyof Parametros; cambios: Record<string, unknown> };
  'resolucion.editar': { resolucionId: Id; cambios: Partial<Omit<ResolucionFacturacion, 'id'>> };
  'usuario.crear': { usuarioId: Id; datos: DatosUsuario };
  'usuario.editar': { usuarioId: Id; cambios: Partial<DatosUsuario> };
  'usuario.eliminar': { usuarioId: Id };
}
export type TipoComando = keyof MapaComandos;
export type Comando = { [K in TipoComando]: { tipo: K; datos: MapaComandos[K] } }[TipoComando];
export type ComandoDe<K extends TipoComando> = { tipo: K; datos: MapaComandos[K] };

// --- Datos de entrada principales ---
/** id derivado (`${ventaId}-pN`). */
export interface DatosPago {
  medio: MedioPago;
  valor: COP;
  recibido: COP | null;
  referencia: string | null;
  sesionCajaId: Id | null;
  bonoId: Id | null;
}
export interface DatosRegistrarVenta {
  ventaId: Id;
  /** null = ts del sobre; el generador lo fija. */
  ts: FechaHoraISO | null;
  localId: Id;
  vendedorId: Id;
  canal: Canal;
  tipo: TipoVenta;
  clienteId: Id | null;
  /** Creación rápida en el mismo paso. */
  clienteNuevo: (DatosCliente & { clienteId: Id }) | null;
  /** precioLista null = el del producto. */
  lineas: { varianteId: Id; cantidad: number; precioLista: COP | null; descuento: Descuento | null }[];
  descuentoGlobal: Descuento | null;
  aprobacionDescuentoId: Id | null;
  /** Separado: abono inicial; crédito: puede ir vacío. */
  pagos: DatosPago[];
  fechaLimiteSeparado: FechaISO | null;
  ventaOrigenCambioId: Id | null;
  /** tipo: factura electrónica o documento equivalente POS (ajuste F2-A1). */
  facturaInmediata: { facturaId: Id; tipo: TipoDocumentoElectronico; adquirente: Adquirente } | null;
  nota: string | null;
}
export interface DatosDevolucion {
  devolucionId: Id;
  ventaId: Id;
  lineas: { lineaId: Id; cantidad: number; reingresa: boolean }[];
  motivo: string;
  compensacion: CompensacionDevolucion;
  reembolso: { medio: MedioPago; sesionCajaId: Id | null } | null;
  /** Obligatorio si la venta tiene factura. */
  notaCreditoId: Id | null;
  /** Saldo a favor o cambio a consumidor final: se crea el cliente en el mismo paso y queda asociado a la venta (ajuste F2-A1). */
  clienteNuevo: (DatosCliente & { clienteId: Id }) | null;
}
export type DatosProducto = Pick<
  Producto,
  | 'referencia'
  | 'nombre'
  | 'categoria'
  | 'linea'
  | 'tipoPrenda'
  | 'curvaTallas'
  | 'temporada'
  | 'proveedorId'
  | 'material'
  | 'descripcion'
  | 'precioVenta'
  | 'tarifaIva'
  | 'stockMinimo'
  | 'publicadoEnTienda'
  | 'destacado'
  | 'etiquetas'
> & { tallas: string[]; colorIds: Id[]; costoManual: COP | null };
export type DatosCliente = Omit<Cliente, 'id' | 'notas' | keyof Trazabilidad | keyof Eliminable>;
export type DatosProveedor = Omit<Proveedor, 'id' | keyof Trazabilidad | keyof Eliminable>;
export type DatosContacto = Omit<Contacto, 'id' | keyof Trazabilidad | keyof Eliminable>;
/** W12: origenSugerencia ≠ null, estado inicial 'cotizado'. */
export type DatosImportacion = Pick<
  Importacion,
  | 'proveedorId'
  | 'moneda'
  | 'tasaPedido'
  | 'fechaPedido'
  | 'carga'
  | 'puertoOrigen'
  | 'puertoDestino'
  | 'lineas'
  | 'contactoIds'
  | 'costos'
  | 'metodoProrrateo'
  | 'origenSugerencia'
  | 'nota'
> & { numero: string | null };
export type DatosCxP = Pick<
  CuentaPorPagar,
  | 'categoria'
  | 'terceroNombre'
  | 'proveedorId'
  | 'empleadoId'
  | 'concepto'
  | 'localId'
  | 'moneda'
  | 'valor'
  | 'fechaEmision'
  | 'fechaVencimiento'
  | 'documento'
  | 'soporte'
  | 'nota'
>;
export type DatosCuenta = Pick<
  CuentaDinero,
  | 'nombre'
  | 'tipo'
  | 'localId'
  | 'entidad'
  | 'numeroEnmascarado'
  | 'saldoInicial'
  | 'fechaSaldoInicial'
  | 'orden'
>;
export type DatosGasto = Pick<
  Gasto,
  'fecha' | 'localId' | 'categoria' | 'concepto' | 'valor' | 'iva' | 'proveedorId' | 'soporte' | 'documento'
>;
export type DatosGastoRecurrente = Omit<GastoRecurrente, 'id' | keyof Trazabilidad | keyof Eliminable>;
export type DatosEmpleado = Omit<
  Empleado,
  'id' | 'contratoVigenteId' | keyof Trazabilidad | keyof Eliminable
>;
export type DatosContrato = Omit<Contrato, 'id' | 'empleadoId' | keyof Trazabilidad>;
export type DatosNovedad = Omit<Novedad, 'id' | keyof Trazabilidad | keyof Eliminable>;
export type DatosEvento = Omit<EventoCalendario, 'id' | keyof Trazabilidad | keyof Eliminable>;
export type DatosLocal = Omit<Local, 'id' | keyof Trazabilidad | keyof Eliminable>;
export type DatosUsuario = Omit<UsuarioDemo, 'id' | keyof Trazabilidad | keyof Eliminable>;

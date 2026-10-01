import type { COP, FechaHoraISO, Id, MonedaExtranjera, Origen } from './comunes';
import type { EstadoTraslado } from './inventario';
import type { Canal } from './ventas';
import type { EstadoImportacion } from './compras';
import type { OrigenCliente } from './clientes';
import type { EstadoFactura } from './facturacion';
import type { Parametros } from './sistema';
import type { ColeccionTabla } from './estado';

/** Eventos de dominio y de interfaz (PLAN 6.18). */
export type EventoDominio =
  | {
      tipo: 'VentaRegistrada';
      ventaId: Id;
      localId: Id;
      vendedorId: Id;
      clienteId: Id | null;
      canal: Canal;
      total: COP;
      origen: Origen;
    }
  | { tipo: 'VentaEditada'; ventaId: Id; campos: string[] }
  | { tipo: 'VentaAnulada'; ventaId: Id }
  | { tipo: 'AbonoRegistrado'; ventaId: Id; valor: COP; saldo: COP }
  | { tipo: 'SeparadoCerrado'; ventaId: Id; resultado: 'completado' | 'cancelado' }
  | { tipo: 'DevolucionRegistrada'; devolucionId: Id; ventaId: Id; valor: COP }
  | { tipo: 'InventarioMovido'; cambios: { varianteId: Id; localId: Id; antes: number; despues: number }[] }
  | { tipo: 'StockBajo'; varianteId: Id; localId: Id; existencia: number; minimo: number }
  | { tipo: 'TrasladoCambiado'; trasladoId: Id; estado: EstadoTraslado }
  | { tipo: 'ConteoAplicado'; conteoId: Id; diferencias: number }
  | {
      tipo: 'ImportacionEstadoCambiado';
      importacionId: Id;
      de: EstadoImportacion;
      a: EstadoImportacion;
      origen: 'panel' | 'portal' | 'sistema';
    }
  | { tipo: 'ImportacionRecibida'; importacionId: Id; unidades: number }
  | { tipo: 'CostosAplicados'; importacionId: Id; productos: { productoId: Id; antes: COP; despues: COP }[] }
  | { tipo: 'CajaAbierta' | 'CajaCerrada' | 'CierreRevisado'; sesionId: Id; localId: Id; diferencia?: COP }
  | { tipo: 'ImportacionCreada'; importacionId: Id; desdeSugerencia: boolean }
  | { tipo: 'BonoVendido'; bonoId: Id; valor: COP }
  | { tipo: 'AbonoDatafonoRegistrado'; abonoId: Id; neto: COP }
  | { tipo: 'PagoRegistrado'; cxpId: Id; valorCOP: COP }
  | { tipo: 'GastoRegistrado'; gastoId: Id }
  | { tipo: 'NominaAprobada' | 'NominaPagada'; liquidacionId: Id }
  | { tipo: 'MarcacionRegistrada'; empleadoId: Id; tipoMarcacion: 'entrada' | 'salida'; ts: FechaHoraISO }
  | { tipo: 'TurnoCambiado'; turnoId: Id }
  | { tipo: 'ClienteCreado'; clienteId: Id; origen: OrigenCliente }
  | { tipo: 'MensajesRegistrados'; ids: Id[] }
  | { tipo: 'FacturaEmitida'; facturaId: Id; ventaId: Id }
  | { tipo: 'FacturaEstado'; facturaId: Id; estado: EstadoFactura }
  | { tipo: 'NotaCreditoEmitida'; notaId: Id }
  | { tipo: 'NotificacionCreada'; notificacionId: Id }
  | { tipo: 'AprobacionSolicitada' | 'AprobacionResuelta'; solicitudId: Id }
  | { tipo: 'TasaRegistrada'; moneda: MonedaExtranjera; valor: number }
  | { tipo: 'ParametrosEditados'; seccion: keyof Parametros }
  | {
      tipo: 'EntidadCambiada';
      coleccion: ColeccionTabla | 'empresa';
      id: Id;
      accion: 'creada' | 'editada' | 'eliminada';
    };

export type TipoEventoDominio = EventoDominio['tipo'];

/** Eventos de interfaz para la guía (no cambian datos). Catálogo EVENTOS_UI en src/app/rutas.ts (F2-B). */
export type EventoUI =
  | 'moneda_cambiada'
  | 'rol_cambiado'
  | 'flujo_caja_visto'
  | 'costo_empleador_visto'
  | 'pedido_sugerido_visto'
  | 'whatsapp_escenario_completado'
  | 'whatsapp_respondido'
  | 'qr_abierto'
  | 'app_abierta'
  | 'tabla_dinamica_modificada'
  | 'pdf_generado'
  | 'excel_generado'
  | 'portal_enviado'
  | 'como_arrancariamos_visto'
  | 'marca_personalizada';

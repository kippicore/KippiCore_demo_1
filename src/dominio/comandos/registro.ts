import type { TipoComando } from '../tipos';
import * as caja from './caja';
import * as calendario from './calendario';
import * as catalogo from './catalogo';
import * as clientes from './clientes';
import * as compras from './compras';
import * as configuracion from './configuracion';
import * as facturacion from './facturacion';
import * as finanzas from './finanzas';
import * as gastos from './gastos';
import * as inventario from './inventario';
import * as nomina from './nomina';
import * as personal from './personal';
import * as ventas from './ventas';
import type { RegistroManejadores } from './tx';

/**
 * Mapa tipo de comando → manejador (PLAN 5.4). Exhaustivo: `satisfies` obliga a TypeScript a exigir un
 * manejador por cada clave de `MapaComandos`.
 */
const MANEJADORES = {
  // Catálogo e inventario
  'producto.crear': catalogo.productoCrear,
  'producto.editar': catalogo.productoEditar,
  'producto.eliminar': catalogo.productoEliminar,
  'variante.agregar': catalogo.varianteAgregar,
  'variante.eliminar': catalogo.varianteEliminar,
  'color.crear': catalogo.colorCrear,
  'inventario.ajustar': inventario.inventarioAjustar,
  'traslado.solicitar': inventario.trasladoSolicitar,
  'traslado.despachar': inventario.trasladoDespachar,
  'traslado.recibir': inventario.trasladoRecibir,
  'traslado.cancelar': inventario.trasladoCancelar,
  'conteo.iniciar': inventario.conteoIniciar,
  'conteo.guardar': inventario.conteoGuardar,
  'conteo.aplicar': inventario.conteoAplicar,
  'conteo.cancelar': inventario.conteoCancelar,
  // Ventas y caja
  'caja.abrir': caja.cajaAbrir,
  'caja.egreso': caja.cajaEgreso,
  'caja.cerrar': caja.cajaCerrar,
  'caja.revisarCierre': caja.cajaRevisarCierre,
  'venta.registrar': ventas.ventaRegistrar,
  'venta.editar': ventas.ventaEditar,
  'venta.anular': ventas.ventaAnular,
  'venta.abonar': ventas.ventaAbonar,
  'separado.cancelar': ventas.separadoCancelar,
  'devolucion.registrar': ventas.devolucionRegistrar,
  'pago.conciliar': ventas.pagoConciliar,
  'aprobacion.solicitar': ventas.aprobacionSolicitar,
  'bono.vender': ventas.bonoVender,
  'datafono.registrarAbono': ventas.datafonoRegistrarAbono,
  'aprobacion.resolver': ventas.aprobacionResolver,
  // Clientes y mensajes
  'cliente.crear': clientes.clienteCrear,
  'cliente.editar': clientes.clienteEditar,
  'cliente.eliminar': clientes.clienteEliminar,
  'cliente.nota': clientes.clienteNota,
  'mensaje.registrar': clientes.mensajeRegistrar,
  // Compras
  'proveedor.crear': compras.proveedorCrear,
  'proveedor.editar': compras.proveedorEditar,
  'proveedor.eliminar': compras.proveedorEliminar,
  'contacto.crear': compras.contactoCrear,
  'contacto.editar': compras.contactoEditar,
  'contacto.eliminar': compras.contactoEliminar,
  'importacion.crear': compras.importacionCrear,
  'importacion.editar': compras.importacionEditar,
  'importacion.eliminar': compras.importacionEliminar,
  'importacion.cambiarEstado': compras.importacionCambiarEstado,
  'importacion.actualizarHitos': compras.importacionActualizarHitos,
  'importacion.actualizarCostos': compras.importacionActualizarCostos,
  'importacion.aplicarCostos': compras.importacionAplicarCostos,
  'importacion.registrarPago': compras.importacionRegistrarPago,
  'importacion.documento': compras.importacionDocumento,
  'importacion.recibir': compras.importacionRecibir,
  // Plata
  'cxp.crear': finanzas.cxpCrear,
  'cxp.editar': finanzas.cxpEditar,
  'cxp.eliminar': finanzas.cxpEliminar,
  'cxp.programar': finanzas.cxpProgramar,
  'cxp.pagar': finanzas.cxpPagar,
  'cuenta.crear': finanzas.cuentaCrear,
  'cuenta.editar': finanzas.cuentaEditar,
  'cuenta.transferir': finanzas.cuentaTransferir,
  'cuenta.movimiento': finanzas.cuentaMovimiento,
  // Gastos
  'gasto.registrar': gastos.gastoRegistrar,
  'gasto.editar': gastos.gastoEditar,
  'gasto.eliminar': gastos.gastoEliminar,
  'gastoRecurrente.crear': gastos.gastoRecurrenteCrear,
  'gastoRecurrente.editar': gastos.gastoRecurrenteEditar,
  'gastoRecurrente.eliminar': gastos.gastoRecurrenteEliminar,
  'gastoRecurrente.generarMes': gastos.gastoRecurrenteGenerarMes,
  // Personal y nómina
  'empleado.crear': personal.empleadoCrear,
  'empleado.editar': personal.empleadoEditar,
  'empleado.retirar': personal.empleadoRetirar,
  'contrato.reemplazar': personal.contratoReemplazar,
  'esquemaComision.crear': personal.esquemaComisionCrear,
  'esquemaComision.editar': personal.esquemaComisionEditar,
  'esquemaComision.eliminar': personal.esquemaComisionEliminar,
  'meta.fijar': personal.metaFijar,
  'turno.asignar': personal.turnoAsignar,
  'turno.mover': personal.turnoMover,
  'turno.eliminar': personal.turnoEliminar,
  'turno.copiarSemana': personal.turnoCopiarSemana,
  'marcacion.registrar': personal.marcacionRegistrar,
  'marcacion.corregir': personal.marcacionCorregir,
  'marcacion.eliminar': personal.marcacionEliminar,
  'novedad.registrar': personal.novedadRegistrar,
  'novedad.editar': personal.novedadEditar,
  'novedad.eliminar': personal.novedadEliminar,
  'pila.verificar': personal.pilaVerificar,
  'nomina.aprobar': nomina.nominaAprobar,
  'nomina.pagar': nomina.nominaPagar,
  'nomina.anularAprobacion': nomina.nominaAnularAprobacion,
  // Calendario
  'evento.crear': calendario.eventoCrear,
  'evento.editar': calendario.eventoEditar,
  'evento.eliminar': calendario.eventoEliminar,
  // Facturación
  'factura.emitir': facturacion.facturaEmitir,
  'factura.avanzarEstado': facturacion.facturaAvanzarEstado,
  'notaCredito.emitir': facturacion.notaCreditoEmitir,
  // Configuración
  'empresa.editar': configuracion.empresaEditar,
  'local.crear': configuracion.localCrear,
  'local.editar': configuracion.localEditar,
  'local.eliminar': configuracion.localEliminar,
  'tasa.registrar': configuracion.tasaRegistrar,
  'tasa.editar': configuracion.tasaEditar,
  'tasa.eliminar': configuracion.tasaEliminar,
  'parametros.editar': configuracion.parametrosEditar,
  'resolucion.editar': configuracion.resolucionEditar,
  'usuario.crear': configuracion.usuarioCrear,
  'usuario.editar': configuracion.usuarioEditar,
  'usuario.eliminar': configuracion.usuarioEliminar,
} satisfies RegistroManejadores;

export const REGISTRO: RegistroManejadores = MANEJADORES;
export const TIPOS_COMANDO = Object.keys(MANEJADORES) as TipoComando[];

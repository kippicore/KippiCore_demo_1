import type { Rol, TipoComando } from '@/dominio/tipos';

/**
 * Matriz de permisos (PLAN 5.8, 6.21). Una clave por comando (columna "Roles" de 6.21) y por dato sensible.
 * Actor 'sistema' = generador (G); 'portal' = portal de la agente de aduanas; 'tienda' = tienda web y bots.
 */
export type Actor = Rol | 'sistema' | 'portal' | 'tienda';

const D: Actor = 'dueno';
const V: Actor = 'vendedor';
const B: Actor = 'bodega';
const G: Actor = 'sistema';
const P: Actor = 'portal';
const T: Actor = 'tienda';

export const PERMISOS_COMANDOS: Record<TipoComando, readonly Actor[]> = {
  // Catálogo e inventario
  'producto.crear': [D, B],
  'producto.editar': [D, B],
  'producto.eliminar': [D],
  'variante.agregar': [D, B],
  'variante.eliminar': [D, B],
  'color.crear': [D, B],
  'inventario.ajustar': [D, B, G],
  'traslado.solicitar': [D, V, B, G],
  'traslado.despachar': [D, B, G],
  'traslado.recibir': [D, B, G],
  'traslado.cancelar': [D, B, G],
  'conteo.iniciar': [D, B, G],
  'conteo.guardar': [D, B, G],
  'conteo.aplicar': [D, B, G],
  'conteo.cancelar': [D, B, G],
  // Ventas y caja
  'caja.abrir': [D, V, G],
  'caja.egreso': [D, V],
  'caja.cerrar': [D, V, G],
  'caja.revisarCierre': [D],
  'venta.registrar': [D, V, G, T],
  'venta.editar': [D],
  'venta.anular': [D],
  'venta.abonar': [D, V, G],
  'separado.cancelar': [D, V, G],
  'devolucion.registrar': [D, V, G],
  'pago.conciliar': [D, G],
  'aprobacion.solicitar': [V, G],
  'bono.vender': [D, V, G],
  'datafono.registrarAbono': [D, G],
  'aprobacion.resolver': [D],
  // Clientes y mensajes
  'cliente.crear': [D, V, G, T],
  'cliente.editar': [D, V, G],
  'cliente.eliminar': [D],
  'cliente.nota': [D, V, G],
  'mensaje.registrar': [D, V, G, T],
  // Compras
  'proveedor.crear': [D, G],
  'proveedor.editar': [D],
  'proveedor.eliminar': [D],
  'contacto.crear': [D, G],
  'contacto.editar': [D],
  'contacto.eliminar': [D],
  'importacion.crear': [D, G],
  'importacion.editar': [D, G],
  'importacion.eliminar': [D],
  'importacion.cambiarEstado': [D, G, P],
  'importacion.actualizarHitos': [D, G],
  'importacion.actualizarCostos': [D, G],
  'importacion.aplicarCostos': [D, G],
  'importacion.registrarPago': [D, G],
  'importacion.documento': [D, G, P],
  'importacion.recibir': [D, B, G],
  // Plata
  'cxp.crear': [D, G],
  'cxp.editar': [D, G],
  'cxp.eliminar': [D, G],
  'cxp.programar': [D, G],
  'cxp.pagar': [D, G],
  'cuenta.crear': [D, G],
  'cuenta.editar': [D, G],
  'cuenta.transferir': [D, G],
  'cuenta.movimiento': [D, G],
  // Gastos
  'gasto.registrar': [D, G],
  'gasto.editar': [D],
  'gasto.eliminar': [D],
  'gastoRecurrente.crear': [D],
  'gastoRecurrente.editar': [D],
  'gastoRecurrente.eliminar': [D],
  'gastoRecurrente.generarMes': [D, G],
  // Personal y nómina
  'empleado.crear': [D, G],
  'empleado.editar': [D, G],
  'empleado.retirar': [D, G],
  'contrato.reemplazar': [D],
  'esquemaComision.crear': [D],
  'esquemaComision.editar': [D],
  'esquemaComision.eliminar': [D],
  'meta.fijar': [D, G],
  'turno.asignar': [D, G],
  'turno.mover': [D, G],
  'turno.eliminar': [D, G],
  'turno.copiarSemana': [D, G],
  'marcacion.registrar': [V, B, G],
  'marcacion.corregir': [D],
  'marcacion.eliminar': [D],
  'novedad.registrar': [D, G],
  'novedad.editar': [D, G],
  'novedad.eliminar': [D, G],
  'pila.verificar': [D, G],
  'nomina.aprobar': [D, G],
  'nomina.pagar': [D, G],
  'nomina.anularAprobacion': [D],
  // Calendario
  'evento.crear': [D, G],
  'evento.editar': [D, G],
  'evento.eliminar': [D, G],
  // Facturación
  'factura.emitir': [D, V, G, T],
  'factura.avanzarEstado': [D, V, G, T],
  'notaCredito.emitir': [D, G],
  'notaCredito.avanzarEstado': [D, V, G, T],
  // Configuración
  'empresa.editar': [D],
  'local.crear': [D],
  'local.editar': [D],
  'local.eliminar': [D],
  'tasa.registrar': [D, G],
  'tasa.editar': [D],
  'tasa.eliminar': [D],
  'parametros.editar': [D],
  'resolucion.editar': [D],
  'usuario.crear': [D],
  'usuario.editar': [D],
  'usuario.eliminar': [D],
};

/** Permisos de lectura y de interfaz que no son comandos (5.8). */
export type PermisoVista =
  | 'ver.costos'
  | 'ver.margenes'
  | 'ver.salarios'
  | 'ver.pagos'
  | 'ver.gastos'
  | 'ver.nomina'
  | 'ver.esperadoCajaAntesDeContar'
  | 'ver.todosLosLocales'
  | 'ver.todosLosClientes'
  | 'ver.todasLasVentas'
  | 'descuento.sinAprobacion'
  | 'configuracion'
  | 'restaurar';

export const PERMISOS_VISTAS: Record<PermisoVista, readonly Rol[]> = {
  'ver.costos': ['dueno'],
  'ver.margenes': ['dueno'],
  'ver.salarios': ['dueno'],
  'ver.pagos': ['dueno'],
  'ver.gastos': ['dueno'],
  'ver.nomina': ['dueno'],
  'ver.esperadoCajaAntesDeContar': ['dueno'],
  'ver.todosLosLocales': ['dueno', 'bodega'],
  'ver.todosLosClientes': ['dueno'],
  'ver.todasLasVentas': ['dueno'],
  'descuento.sinAprobacion': ['dueno'],
  configuracion: ['dueno'],
  // Restaurar es la red de seguridad: también el vendedor puede usarla desde el menú "?" (5.8).
  restaurar: ['dueno', 'vendedor', 'bodega'],
};

export type Permiso = TipoComando | PermisoVista;

/** ¿Puede este actor ejecutar el comando o ver el dato? */
export function puede(actor: Actor, permiso: Permiso): boolean {
  if (permiso in PERMISOS_COMANDOS) return PERMISOS_COMANDOS[permiso as TipoComando].includes(actor);
  const roles = PERMISOS_VISTAS[permiso as PermisoVista] as readonly Actor[] | undefined;
  return roles ? roles.includes(actor) : false;
}

/** Personas de los roles (1.5): usuario por rol y su local. */
export const PERSONAS_ROL: Record<Rol, { usuarioId: string; etiqueta: string }> = {
  dueno: { usuarioId: 'u_dueno', etiqueta: 'Dueño' },
  vendedor: { usuarioId: 'u_vendedor', etiqueta: 'Vendedor' },
  bodega: { usuarioId: 'u_bodega', etiqueta: 'Bodega' },
};

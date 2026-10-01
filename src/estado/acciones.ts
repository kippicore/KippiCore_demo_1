import { useMemo } from 'react';
import type {
  Comando,
  DatosCliente,
  DatosDevolucion,
  DatosImportacion,
  DatosRegistrarVenta,
  EstadoDominio,
  FechaHoraISO,
  Id,
  MapaComandos,
  MensajeSaliente,
  ResultadoComando,
  Rol,
  SobreComando,
  TipoComando,
} from '@/dominio/tipos';
import { idHijo, idUsuario, PREFIJOS } from '@/dominio/motor/ids';
import { marcaAguaNueva } from '@/dominio/motor/registro';
import { type Actor, PERSONAS_ROL } from '@/config/permisos';
import { USUARIOS_SISTEMA } from '@/dominio/tipos';
import { almacenDatos } from './datos';
import { useRolActivo } from './hooks';
import { ahoraExacto, ahoraMs } from './reloj';

/**
 * Escritura (PLAN 5.6.6, 5.7): `useAcciones()` expone UNA función tipada por comando. Cada acción genera los IDs
 * de lo que crea (si no vienen), el `ts`, la marca de agua monótona y el usuario/rol del sobre; el componente
 * solo pasa los datos de negocio. Devuelve `ResultadoComando` (`{ ok: false, error }` con el mensaje en español
 * y el `campo`; nada cambia si falla).
 *
 * Nombres: `objeto.verbo` → `verboObjeto` (tabla NOMBRES_ACCIONES, también en docs/CONTRATOS.md).
 */
export const NOMBRES_ACCIONES = {
  'producto.crear': 'crearProducto',
  'producto.editar': 'editarProducto',
  'producto.eliminar': 'eliminarProducto',
  'variante.agregar': 'agregarVariante',
  'variante.eliminar': 'eliminarVariante',
  'color.crear': 'crearColor',
  'inventario.ajustar': 'ajustarInventario',
  'traslado.solicitar': 'solicitarTraslado',
  'traslado.despachar': 'despacharTraslado',
  'traslado.recibir': 'recibirTraslado',
  'traslado.cancelar': 'cancelarTraslado',
  'conteo.iniciar': 'iniciarConteo',
  'conteo.guardar': 'guardarConteo',
  'conteo.aplicar': 'aplicarConteo',
  'conteo.cancelar': 'cancelarConteo',
  'caja.abrir': 'abrirCaja',
  'caja.egreso': 'registrarEgresoCaja',
  'caja.cerrar': 'cerrarCaja',
  'caja.revisarCierre': 'revisarCierre',
  'venta.registrar': 'registrarVenta',
  'venta.editar': 'editarVenta',
  'venta.anular': 'anularVenta',
  'venta.abonar': 'abonarVenta',
  'separado.cancelar': 'cancelarSeparado',
  'devolucion.registrar': 'registrarDevolucion',
  'pago.conciliar': 'conciliarPagos',
  'aprobacion.solicitar': 'solicitarAprobacion',
  'bono.vender': 'venderBono',
  'datafono.registrarAbono': 'registrarAbonoDatafono',
  'aprobacion.resolver': 'resolverAprobacion',
  'cliente.crear': 'crearCliente',
  'cliente.editar': 'editarCliente',
  'cliente.eliminar': 'eliminarCliente',
  'cliente.nota': 'agregarNotaCliente',
  'mensaje.registrar': 'registrarMensajes',
  'proveedor.crear': 'crearProveedor',
  'proveedor.editar': 'editarProveedor',
  'proveedor.eliminar': 'eliminarProveedor',
  'contacto.crear': 'crearContacto',
  'contacto.editar': 'editarContacto',
  'contacto.eliminar': 'eliminarContacto',
  'importacion.crear': 'crearImportacion',
  'importacion.editar': 'editarImportacion',
  'importacion.eliminar': 'eliminarImportacion',
  'importacion.cambiarEstado': 'cambiarEstadoImportacion',
  'importacion.actualizarHitos': 'actualizarHitosImportacion',
  'importacion.actualizarCostos': 'actualizarCostosImportacion',
  'importacion.aplicarCostos': 'aplicarCostosImportacion',
  'importacion.registrarPago': 'registrarPagoImportacion',
  'importacion.documento': 'registrarDocumentoImportacion',
  'importacion.recibir': 'recibirImportacion',
  'cxp.crear': 'crearCuentaPorPagar',
  'cxp.editar': 'editarCuentaPorPagar',
  'cxp.eliminar': 'eliminarCuentaPorPagar',
  'cxp.programar': 'programarCuentaPorPagar',
  'cxp.pagar': 'pagarCuentaPorPagar',
  'cuenta.crear': 'crearCuenta',
  'cuenta.editar': 'editarCuenta',
  'cuenta.transferir': 'transferirEntreCuentas',
  'cuenta.movimiento': 'registrarMovimientoCuenta',
  'gasto.registrar': 'registrarGasto',
  'gasto.editar': 'editarGasto',
  'gasto.eliminar': 'eliminarGasto',
  'gastoRecurrente.crear': 'crearGastoRecurrente',
  'gastoRecurrente.editar': 'editarGastoRecurrente',
  'gastoRecurrente.eliminar': 'eliminarGastoRecurrente',
  'gastoRecurrente.generarMes': 'generarGastosRecurrentesMes',
  'empleado.crear': 'crearEmpleado',
  'empleado.editar': 'editarEmpleado',
  'empleado.retirar': 'retirarEmpleado',
  'contrato.reemplazar': 'reemplazarContrato',
  'esquemaComision.crear': 'crearEsquemaComision',
  'esquemaComision.editar': 'editarEsquemaComision',
  'esquemaComision.eliminar': 'eliminarEsquemaComision',
  'meta.fijar': 'fijarMeta',
  'turno.asignar': 'asignarTurno',
  'turno.mover': 'moverTurno',
  'turno.eliminar': 'eliminarTurno',
  'turno.copiarSemana': 'copiarSemanaTurnos',
  'marcacion.registrar': 'registrarMarcacion',
  'marcacion.corregir': 'corregirMarcacion',
  'marcacion.eliminar': 'eliminarMarcacion',
  'novedad.registrar': 'registrarNovedad',
  'novedad.editar': 'editarNovedad',
  'novedad.eliminar': 'eliminarNovedad',
  'pila.verificar': 'verificarPila',
  'nomina.aprobar': 'aprobarNomina',
  'nomina.pagar': 'pagarNomina',
  'nomina.anularAprobacion': 'anularAprobacionNomina',
  'evento.crear': 'crearEvento',
  'evento.editar': 'editarEvento',
  'evento.eliminar': 'eliminarEvento',
  'factura.emitir': 'emitirFactura',
  'factura.avanzarEstado': 'avanzarEstadoFactura',
  'notaCredito.emitir': 'emitirNotaCredito',
  'notaCredito.avanzarEstado': 'avanzarEstadoNotaCredito',
  'empresa.editar': 'editarEmpresa',
  'local.crear': 'crearLocal',
  'local.editar': 'editarLocal',
  'local.eliminar': 'eliminarLocal',
  'tasa.registrar': 'registrarTasa',
  'tasa.editar': 'editarTasa',
  'tasa.eliminar': 'eliminarTasa',
  'parametros.editar': 'editarParametros',
  'resolucion.editar': 'editarResolucion',
  'usuario.crear': 'crearUsuario',
  'usuario.editar': 'editarUsuario',
  'usuario.eliminar': 'eliminarUsuario',
} as const satisfies Record<TipoComando, string>;

/** Campos de ID que crea cada comando (se generan si no vienen) y su prefijo (dominio/motor/ids.ts). */
const IDS_SIMPLES = {
  'producto.crear': { productoId: PREFIJOS.producto },
  'variante.agregar': { varianteId: PREFIJOS.variante },
  'color.crear': { colorId: PREFIJOS.color },
  'inventario.ajustar': { movimientoId: PREFIJOS.movimiento },
  'traslado.solicitar': { trasladoId: PREFIJOS.traslado },
  'conteo.iniciar': { conteoId: PREFIJOS.conteo },
  'caja.abrir': { sesionId: PREFIJOS.sesionCaja },
  'caja.egreso': { egresoId: PREFIJOS.egreso },
  'venta.registrar': { ventaId: PREFIJOS.venta },
  'aprobacion.solicitar': { solicitudId: PREFIJOS.solicitud },
  'bono.vender': { bonoId: PREFIJOS.bono },
  'datafono.registrarAbono': { abonoId: PREFIJOS.abonoDatafono },
  'cliente.crear': { clienteId: PREFIJOS.cliente },
  'cliente.nota': { notaId: PREFIJOS.notaCliente },
  'proveedor.crear': { proveedorId: PREFIJOS.proveedor },
  'contacto.crear': { contactoId: PREFIJOS.contacto },
  'importacion.crear': { importacionId: PREFIJOS.importacion },
  'importacion.registrarPago': { abonoId: PREFIJOS.abonoCxP },
  'cxp.crear': { cxpId: PREFIJOS.cuentaPorPagar },
  'cxp.pagar': { abonoId: PREFIJOS.abonoCxP },
  'cuenta.crear': { cuentaId: PREFIJOS.cuenta },
  'cuenta.transferir': { transferenciaId: PREFIJOS.transferencia },
  'cuenta.movimiento': { movimientoId: PREFIJOS.movimientoCuenta },
  'gasto.registrar': { gastoId: PREFIJOS.gasto },
  'gastoRecurrente.crear': { recurrenteId: PREFIJOS.gastoRecurrente },
  'empleado.crear': { empleadoId: PREFIJOS.empleado, contratoId: PREFIJOS.contrato },
  'contrato.reemplazar': { contratoId: PREFIJOS.contrato },
  'esquemaComision.crear': { esquemaId: PREFIJOS.esquema },
  'meta.fijar': { metaId: PREFIJOS.meta },
  'turno.asignar': { turnoId: PREFIJOS.turno },
  'marcacion.registrar': { marcacionId: PREFIJOS.marcacion },
  'novedad.registrar': { novedadId: PREFIJOS.novedad },
  'nomina.aprobar': { liquidacionId: PREFIJOS.liquidacion },
  'evento.crear': { eventoId: PREFIJOS.evento },
  'factura.emitir': { facturaId: PREFIJOS.factura },
  'notaCredito.emitir': { notaId: PREFIJOS.notaCredito },
  'local.crear': { localId: PREFIJOS.local },
  'tasa.registrar': { tasaId: PREFIJOS.tasa },
  'usuario.crear': { usuarioId: PREFIJOS.usuario },
  'devolucion.registrar': { devolucionId: PREFIJOS.devolucion },
} as const satisfies Partial<Record<TipoComando, Record<string, string>>>;

type ConIdsSimples = keyof typeof IDS_SIMPLES;
type Opcional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Datos de una acción: los de MapaComandos con los IDs nuevos opcionales y algunos anidados también. */
export interface EntradasEspeciales {
  'venta.registrar': Omit<DatosRegistrarVenta, 'ventaId' | 'ts' | 'clienteNuevo' | 'facturaInmediata'> & {
    ventaId?: Id;
    ts?: FechaHoraISO | null;
    clienteNuevo: (DatosCliente & { clienteId?: Id }) | null;
    facturaInmediata: (Omit<NonNullable<DatosRegistrarVenta['facturaInmediata']>, 'facturaId'> & { facturaId?: Id }) | null;
  };
  'devolucion.registrar': Omit<DatosDevolucion, 'devolucionId' | 'notaCreditoId' | 'clienteNuevo'> & {
    devolucionId?: Id;
    /** Si se omite y la venta tiene factura, se genera (la nota crédito es obligatoria). */
    notaCreditoId?: Id | null;
    clienteNuevo: (DatosCliente & { clienteId?: Id }) | null;
  };
  'venta.anular': Opcional<MapaComandos['venta.anular'], 'notaCreditoId' | 'solicitudId'>;
  'producto.crear': Omit<MapaComandos['producto.crear'], 'productoId' | 'varianteIds'> & {
    productoId?: Id;
    varianteIds?: Record<string, Id>;
  };
  'traslado.solicitar': Omit<MapaComandos['traslado.solicitar'], 'trasladoId' | 'solicitudId'> & {
    trasladoId?: Id;
    solicitudId?: Id | null;
  };
  'mensaje.registrar': { mensajes: (Omit<MensajeSaliente, 'estado' | 'id' | 'ts'> & { id?: Id; ts?: FechaHoraISO })[] };
  'importacion.crear': Omit<DatosImportacion, 'lineas'> & {
    importacionId?: Id;
    lineas: (Omit<DatosImportacion['lineas'][number], 'id'> & { id?: Id })[];
  };
  'importacion.recibir': Omit<MapaComandos['importacion.recibir'], 'distribucion'> & {
    distribucion: (Omit<MapaComandos['importacion.recibir']['distribucion'][number], 'trasladoId'> & {
      trasladoId?: Id;
    })[];
  };
  'gasto.registrar': Omit<MapaComandos['gasto.registrar'], 'gastoId' | 'pago'> & {
    gastoId?: Id;
    pago:
      | { tipo: 'inmediato'; cuentaId: Id; medio: string }
      | { tipo: 'por_pagar'; vence: string; cxpId?: Id };
  };
  'marcacion.registrar': Omit<MapaComandos['marcacion.registrar'], 'marcacionId' | 'ts'> & {
    marcacionId?: Id;
    /** Por defecto, la hora actual. */
    ts?: FechaHoraISO;
  };
}

export type EntradaAccion<K extends TipoComando> = K extends keyof EntradasEspeciales
  ? EntradasEspeciales[K]
  : K extends ConIdsSimples
    ? Opcional<MapaComandos[K], Extract<keyof (typeof IDS_SIMPLES)[K], keyof MapaComandos[K]>>
    : MapaComandos[K];

export type Acciones = {
  [K in TipoComando as (typeof NOMBRES_ACCIONES)[K]]: (datos: EntradaAccion<K>) => ResultadoComando;
} & {
  /** ID nuevo con prefijo (para IDs anidados que la acción no genera sola). */
  nuevoId: (prefijo: string) => Id;
  /** Ejecuta un comando por su tipo (genérico). */
  ejecutar: <K extends TipoComando>(tipo: K, datos: EntradaAccion<K>) => ResultadoComando;
};

let contador = 0;
function aleatorio(): string {
  try {
    const b = new Uint8Array(3);
    globalThis.crypto.getRandomValues(b);
    return Array.from(b, (x) => x.toString(36).padStart(2, '0'))
      .join('')
      .slice(0, 4);
  } catch {
    return Math.floor(Math.random() * 1_679_616)
      .toString(36)
      .padStart(4, '0');
  }
}

/** ID de una entidad creada por el usuario (estable: viaja dentro del comando, 5.6.4). */
export function nuevoId(prefijo: string): Id {
  contador = (contador + 1) % 1296;
  return idUsuario(prefijo, ahoraMs(), contador, aleatorio());
}

type Datos = Record<string, unknown>;

/** Completa los IDs que faltan (simples y anidados) antes de armar el sobre. */
export function completarIds(tipo: TipoComando, entrada: unknown, estado: EstadoDominio, ts: FechaHoraISO): unknown {
  const d: Datos = { ...(entrada as Datos) };
  const simples = (IDS_SIMPLES as Partial<Record<TipoComando, Record<string, string>>>)[tipo];
  if (simples) for (const [campo, prefijo] of Object.entries(simples)) if (!d[campo]) d[campo] = nuevoId(prefijo);
  switch (tipo) {
    case 'venta.registrar': {
      d.ts ??= null;
      const cn = d.clienteNuevo as Datos | null;
      if (cn && !cn.clienteId) d.clienteNuevo = { ...cn, clienteId: nuevoId(PREFIJOS.cliente) };
      const fi = d.facturaInmediata as Datos | null;
      if (fi && !fi.facturaId) d.facturaInmediata = { ...fi, facturaId: nuevoId(PREFIJOS.factura) };
      break;
    }
    case 'devolucion.registrar': {
      const cn = d.clienteNuevo as Datos | null;
      if (cn && !cn.clienteId) d.clienteNuevo = { ...cn, clienteId: nuevoId(PREFIJOS.cliente) };
      if (d.notaCreditoId === undefined) {
        const v = estado.ventas[d.ventaId as Id];
        d.notaCreditoId = v?.facturaId ? nuevoId(PREFIJOS.notaCredito) : null;
      }
      break;
    }
    case 'venta.anular': {
      if (d.notaCreditoId === undefined) {
        const v = estado.ventas[d.ventaId as Id];
        d.notaCreditoId = v?.facturaId ? nuevoId(PREFIJOS.notaCredito) : null;
      }
      d.solicitudId ??= null;
      break;
    }
    case 'producto.crear': {
      if (!d.varianteIds) {
        const ids: Record<string, Id> = {};
        for (const c of d.colorIds as Id[]) for (const t of d.tallas as string[]) ids[`${t}|${c}`] = nuevoId(PREFIJOS.variante);
        d.varianteIds = ids;
      }
      break;
    }
    case 'traslado.solicitar':
      if (d.solicitudId === undefined) d.solicitudId = d.requiereAprobacion ? nuevoId(PREFIJOS.solicitud) : null;
      break;
    case 'mensaje.registrar':
      d.mensajes = (d.mensajes as Datos[]).map((m) => ({ ...m, id: m.id ?? nuevoId(PREFIJOS.mensaje), ts: m.ts ?? ts }));
      break;
    case 'importacion.crear': {
      const imp = d.importacionId as Id;
      d.lineas = (d.lineas as Datos[]).map((l, i) => ({ ...l, id: l.id ?? idHijo(imp, `l${i + 1}`) }));
      break;
    }
    case 'importacion.recibir':
      d.distribucion = (d.distribucion as Datos[]).map((x) => ({ ...x, trasladoId: x.trasladoId ?? nuevoId(PREFIJOS.traslado) }));
      break;
    case 'gasto.registrar': {
      const p = d.pago as Datos;
      if (p.tipo === 'por_pagar' && !p.cxpId) d.pago = { ...p, cxpId: nuevoId(PREFIJOS.cuentaPorPagar) };
      break;
    }
    case 'marcacion.registrar':
      d.ts ??= ts;
      break;
    default:
      break;
  }
  return d;
}

/** Usuario y rol del sobre para un actor (5.8, USUARIOS_SISTEMA). */
export function identidadActor(actor: Actor): { usuarioId: Id; rol: SobreComando['rol'] } {
  if (actor === 'portal') return { usuarioId: USUARIOS_SISTEMA.portalAduanas, rol: 'portal' };
  if (actor === 'tienda') return { usuarioId: USUARIOS_SISTEMA.tiendaWeb, rol: 'tienda' };
  if (actor === 'sistema') return { usuarioId: USUARIOS_SISTEMA.sistema, rol: 'sistema' };
  return { usuarioId: PERSONAS_ROL[actor].usuarioId, rol: actor };
}

/** Arma el sobre (IDs, ts, marca de agua monótona, usuario) y lo ejecuta en el store. Sin React: pruebas y `window.__kc`. */
export function ejecutarComando<K extends TipoComando>(
  tipo: K,
  entrada: EntradaAccion<K>,
  actor: Actor,
): ResultadoComando {
  const { estado, registro, ejecutar } = almacenDatos.getState();
  if (!estado) {
    return { ok: false, error: { codigo: 'SIN_DATOS', mensaje: 'Los datos todavía se están preparando. Intenta en un momento.' } };
  }
  const ts = ahoraExacto();
  const datos = completarIds(tipo, entrada, estado, ts);
  const marcaAgua = marcaAguaNueva(estado.meta.generadoHasta, registro);
  const { usuarioId, rol } = identidadActor(actor);
  const sobre: SobreComando = {
    id: nuevoId(PREFIJOS.entrada),
    ts,
    marcaAgua,
    usuarioId,
    rol,
    origen: 'usuario',
    comando: { tipo, datos } as Comando,
  };
  return ejecutar(sobre);
}

/** Crea el objeto de acciones de un actor (para `useAcciones` y para `window.__kc`). */
export function crearAcciones(actor: Actor): Acciones {
  const a: Record<string, unknown> = {};
  for (const [tipo, nombre] of Object.entries(NOMBRES_ACCIONES))
    a[nombre] = (datos: unknown) => ejecutarComando(tipo as TipoComando, datos as never, actor);
  a.nuevoId = nuevoId;
  a.ejecutar = (tipo: TipoComando, datos: unknown) => ejecutarComando(tipo, datos as never, actor);
  return a as Acciones;
}

/**
 * Acciones del rol activo. `useAcciones({ actor: 'portal' })` en el portal de aduanas, `'tienda'` en la tienda
 * web; `/app` fuerza el dueño con `ContextoRolForzado`.
 */
export function useAcciones(opciones?: { actor?: Actor }): Acciones {
  const rol: Rol = useRolActivo();
  const actor = opciones?.actor ?? rol;
  return useMemo(() => crearAcciones(actor), [actor]);
}

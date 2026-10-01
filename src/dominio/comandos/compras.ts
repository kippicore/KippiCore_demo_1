import type {
  Contacto,
  CostosImportacion,
  CuentaPorPagar,
  DatosContacto,
  DatosImportacion,
  DatosProveedor,
  DocumentoImportacion,
  EstadoDominio,
  EstadoImportacion,
  FechaISO,
  HitoImportacion,
  Id,
  Importacion,
  MovimientoInventario,
  Notificacion,
  Proveedor,
  Trazabilidad,
} from '../tipos';
import { ESTADOS_IMPORTACION } from '../tipos';
import { exigir, fallar } from '../errores';
import { idHijo } from '../motor/ids';
import {
  calcularCostoAterrizado,
  fobImportacion,
  tasaCosteoPonderada,
  unidadesLinea,
} from '../reglas/costeo';
import { copDeCentavos } from '../reglas/dinero';
import {
  estadoAlcanzado,
  hitosEnOrden,
  hitosIniciales,
  indiceEstado,
  partesPagoFabrica,
  reestimarHitos,
  siguienteEstado,
  validarCambioEstado,
} from '../reglas/importaciones';
import { rutasDominio } from '../reglas/rutas-dominio';
import { ETIQUETAS_ESTADO_IMPORTACION, PAGO_FABRICA } from '@/config/aduanas';
import {
  enteroNoNegativo,
  fechaValida,
  fraccionValida,
  idNuevo,
  RE_CORREO,
  requerir,
  tasaVigente,
  textoObligatorio,
} from './comunes';
import { crudEditar, crudEliminar } from './crud';
import { escribirPagoCxP, nuevaCxP, planearPagoCxP, type PlanPagoCxP } from './finanzas';
import {
  aplicarMovimientos,
  escribirTrasladoNuevo,
  movimientosSalida,
  planearTraslado,
  verificarExistencias,
  type PlanTrasladoNuevo,
} from './inventario';
import {
  type Contexto,
  emitirInventario,
  fijarConsecutivo,
  leerConsecutivo,
  manejador,
  marcarEditado,
  marcarEliminado,
  traza,
} from './tx';

/** Proveedores, contactos e importaciones (PLAN 6.11, 6.19 M1–M8, 6.21). */

type MovPlan = Omit<MovimientoInventario, 'usuarioId'>;
const RE_WHATSAPP = /^\+?[\d\s]{7,20}$/;

// ---------- Proveedores y contactos ----------

function validarProveedor(estado: EstadoDominio, d: Partial<DatosProveedor>, completo: boolean): void {
  if (completo || d.nombre !== undefined)
    textoObligatorio(d.nombre, 'nombre', 'Escribe el nombre del proveedor.');
  if (completo || d.nombreCorto !== undefined)
    textoObligatorio(d.nombreCorto, 'nombreCorto', 'Escribe un nombre corto.');
  if (completo || d.moneda !== undefined)
    exigir(
      ['COP', 'USD', 'CNY'].includes(d.moneda ?? ''),
      'MONEDA_INVALIDA',
      'Elige la moneda del proveedor.',
      'moneda',
    );
  if (completo || d.tipo !== undefined)
    exigir(
      d.tipo === 'fabrica' || d.tipo === 'local',
      'TIPO_INVALIDO',
      'Elige si es fábrica o proveedor local.',
      'tipo',
    );
  if (d.calificacion !== undefined)
    exigir(
      [1, 2, 3, 4, 5].includes(d.calificacion),
      'VALOR_INVALIDO',
      'La calificación va de 1 a 5.',
      'calificacion',
    );
  if (d.localId) requerir(estado.locales, d.localId, 'el local', 'localId');
  for (const c of d.contactoIds ?? []) requerir(estado.contactos, c, 'el contacto', 'contactoIds');
}

export const proveedorCrear = manejador<'proveedor.crear', Proveedor>({
  validar(estado, d, ctx) {
    idNuevo(estado.proveedores, d.proveedorId, 'proveedorId');
    validarProveedor(estado, d.datos, true);
    return {
      ...traza(ctx),
      ...d.datos,
      contactoIds: [...d.datos.contactoIds],
      categoriasProducto: [...d.datos.categoriasProducto],
      id: d.proveedorId,
    };
  },
  escribir(estado, p, ctx) {
    estado.proveedores[p.id] = p;
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'proveedores', id: p.id, accion: 'creada' });
  },
});

export const proveedorEditar = crudEditar<'proveedor.editar', Proveedor>({
  coleccion: 'proveedores',
  id: (d) => d.proveedorId,
  nombre: 'el proveedor',
  cambios(estado, _a, d) {
    validarProveedor(estado, d.cambios, false);
    return { ...d.cambios };
  },
});

export const proveedorEliminar = crudEliminar<'proveedor.eliminar', Proveedor>({
  coleccion: 'proveedores',
  id: (d) => d.proveedorId,
  nombre: 'el proveedor',
  motivo: (d) => d.motivo,
  validar(estado, p) {
    const enCurso = Object.values(estado.importaciones).filter(
      (i) => i.proveedorId === p.id && !i.eliminadoEn && i.estado !== 'recibido_bodega',
    );
    exigir(
      enCurso.length === 0,
      'IMPORTACIONES_EN_CURSO',
      `Tiene ${enCurso.length} importaciones en curso.`,
      'proveedorId',
    );
  },
});

function validarContacto(estado: EstadoDominio, d: Partial<DatosContacto>, completo: boolean): void {
  if (completo || d.nombre !== undefined)
    textoObligatorio(d.nombre, 'nombre', 'Escribe el nombre del contacto.');
  if (completo || d.correo !== undefined)
    exigir(RE_CORREO.test(d.correo ?? ''), 'CORREO_INVALIDO', 'Escribe un correo válido.', 'correo');
  if (completo || d.whatsapp !== undefined)
    exigir(
      RE_WHATSAPP.test(d.whatsapp ?? ''),
      'WHATSAPP_INVALIDO',
      'Escribe el WhatsApp con indicativo, por ejemplo +57 310 123 4567.',
      'whatsapp',
    );
  if (d.proveedorId) requerir(estado.proveedores, d.proveedorId, 'el proveedor', 'proveedorId');
}

export const contactoCrear = manejador<'contacto.crear', Contacto>({
  validar(estado, d, ctx) {
    idNuevo(estado.contactos, d.contactoId, 'contactoId');
    validarContacto(estado, d.datos, true);
    return { ...traza(ctx), ...d.datos, id: d.contactoId };
  },
  escribir(estado, c, ctx) {
    estado.contactos[c.id] = c;
    if (c.proveedorId) {
      const p = estado.proveedores[c.proveedorId];
      if (p && !p.contactoIds.includes(c.id)) p.contactoIds.push(c.id);
    }
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'contactos', id: c.id, accion: 'creada' });
  },
});

export const contactoEditar = crudEditar<'contacto.editar', Contacto>({
  coleccion: 'contactos',
  id: (d) => d.contactoId,
  nombre: 'el contacto',
  cambios(estado, _a, d) {
    validarContacto(estado, d.cambios, false);
    return { ...d.cambios };
  },
});

export const contactoEliminar = crudEliminar<'contacto.eliminar', Contacto>({
  coleccion: 'contactos',
  id: (d) => d.contactoId,
  nombre: 'el contacto',
});

// ---------- Importaciones ----------

function validarCostos(c: CostosImportacion): void {
  for (const [k, v] of Object.entries({
    flete: c.flete.valor,
    seguro: c.seguro.valor,
    honorariosAgente: c.honorariosAgente,
    bodegajePuerto: c.bodegajePuerto,
    transporteInterno: c.transporteInterno,
    otros: c.otros,
    otrosTributosAduaneros: c.otrosTributosAduaneros,
  })) {
    enteroNoNegativo(v, k, 'Los costos no pueden ser negativos.');
  }
  fraccionValida(c.arancelPct, 'arancelPct', 'El arancel va entre 0 % y 100 %.');
  fraccionValida(c.ivaImportacionPct, 'ivaImportacionPct', 'El IVA de importación va entre 0 % y 100 %.');
}

function validarLineas(estado: EstadoDominio, lineas: DatosImportacion['lineas']): void {
  exigir(lineas.length > 0, 'SIN_LINEAS', 'Agrega al menos una referencia al pedido.', 'lineas');
  const ids = new Set<Id>();
  for (const l of lineas) {
    exigir(l.id && !ids.has(l.id), 'ID_INVALIDO', 'Cada línea necesita un identificador único.', 'lineas');
    ids.add(l.id);
    const p = requerir(estado.productos, l.productoId, 'la referencia', 'lineas');
    exigir(
      Number.isInteger(l.costoUnitarioOrigen) && l.costoUnitarioOrigen > 0,
      'VALOR_INVALIDO',
      'Escribe el precio de fábrica de cada referencia.',
      'lineas',
    );
    let unidades = 0;
    for (const [v, n] of Object.entries(l.cantidades)) {
      const variante = requerir(estado.variantes, v, 'la variante', 'lineas');
      exigir(variante.productoId === p.id, 'VARIANTE_AJENA', `Una variante no es de ${p.nombre}.`, 'lineas');
      enteroNoNegativo(n, 'lineas', 'Las cantidades no pueden ser negativas.');
      unidades += n;
    }
    exigir(unidades > 0, 'SIN_UNIDADES', `Pide al menos una unidad de ${p.nombre}.`, 'lineas');
  }
}

function copiarLineas(lineas: DatosImportacion['lineas']): DatosImportacion['lineas'] {
  return lineas.map((l) => ({ ...l, cantidades: { ...l.cantidades } }));
}

export const importacionCrear = manejador<
  'importacion.crear',
  { imp: Importacion; anio: string; consecutivo: number }
>({
  validar(estado, d, ctx) {
    idNuevo(estado.importaciones, d.importacionId, 'importacionId');
    const prov = requerir(estado.proveedores, d.proveedorId, 'la fábrica', 'proveedorId');
    exigir(
      prov.tipo === 'fabrica',
      'NO_ES_FABRICA',
      'Las importaciones se piden a una fábrica.',
      'proveedorId',
    );
    exigir(
      d.moneda === 'USD' || d.moneda === 'CNY',
      'MONEDA_INVALIDA',
      'La importación va en dólares o yuanes.',
      'moneda',
    );
    exigir(d.tasaPedido > 0, 'TASA_INVALIDA', 'La tasa del pedido debe ser mayor que cero.', 'tasaPedido');
    fechaValida(d.fechaPedido, 'fechaPedido');
    validarLineas(estado, d.lineas);
    validarCostos(d.costos);
    for (const c of d.contactoIds) requerir(estado.contactos, c, 'el contacto', 'contactoIds');
    const anio = d.fechaPedido.slice(0, 4);
    let numero = d.numero?.trim() ?? '';
    let consecutivo = estado.meta.consecutivosImportacion[anio] ?? 0;
    if (!numero) {
      consecutivo += 1;
      numero = `IMP-${anio}-${String(consecutivo).padStart(2, '0')}`;
    } else {
      const m = /^IMP-(\d{4})-(\d{2,})$/.exec(numero);
      exigir(m, 'NUMERO_INVALIDO', 'El número va con el formato IMP-2026-07.', 'numero');
      if (m[1] === anio) consecutivo = Math.max(consecutivo, Number(m[2]));
    }
    exigir(
      !Object.values(estado.importaciones).some((i) => i.numero === numero),
      'NUMERO_DUPLICADO',
      `Ya existe la importación ${numero}.`,
      'numero',
    );
    return {
      anio,
      consecutivo,
      imp: {
        ...traza(ctx),
        id: d.importacionId,
        numero,
        proveedorId: prov.id,
        moneda: d.moneda,
        tasaPedido: d.tasaPedido,
        fechaPedido: d.fechaPedido,
        carga: { ...d.carga },
        puertoOrigen: d.puertoOrigen,
        puertoDestino: d.puertoDestino,
        lineas: copiarLineas(d.lineas),
        estado: 'cotizado',
        hitos: hitosIniciales(d.fechaPedido, estado.parametros.aduanas.diasEstimadosEntreEstados),
        aforo: null,
        controlManualHasta: null,
        origenSugerencia: d.origenSugerencia ? { ...d.origenSugerencia } : null,
        documentos: [],
        costos: { ...d.costos, flete: { ...d.costos.flete }, seguro: { ...d.costos.seguro } },
        metodoProrrateo: d.metodoProrrateo,
        costosAplicados: null,
        contactoIds: [...d.contactoIds],
        recepcion: null,
        cuentaPorPagarIds: [],
        nota: d.nota,
      },
    };
  },
  escribir(estado, plan, ctx) {
    estado.importaciones[plan.imp.id] = plan.imp;
    estado.meta.consecutivosImportacion[plan.anio] = Math.max(
      estado.meta.consecutivosImportacion[plan.anio] ?? 0,
      plan.consecutivo,
    );
    ctx.emitir({
      tipo: 'ImportacionCreada',
      importacionId: plan.imp.id,
      desdeSugerencia: plan.imp.origenSugerencia !== null,
    });
  },
});

export const importacionEditar = manejador<'importacion.editar', { id: Id; cambios: Partial<Importacion> }>({
  validar(estado, d) {
    const imp = requerir(estado.importaciones, d.importacionId, 'la importación', 'importacionId');
    const c = d.cambios;
    exigir(
      c.numero === undefined || c.numero === null || c.numero === imp.numero,
      'NUMERO_INMUTABLE',
      'El número de la importación no se cambia.',
      'numero',
    );
    const cambios: Partial<Importacion> = {};
    if (c.lineas !== undefined) {
      exigir(
        indiceEstado(imp.estado) < indiceEstado('saldo_pagado'),
        'LINEAS_CERRADAS',
        'Las líneas ya no se pueden cambiar: el saldo está pagado.',
        'lineas',
      );
      validarLineas(estado, c.lineas);
      cambios.lineas = copiarLineas(c.lineas);
    }
    if (c.proveedorId !== undefined && c.proveedorId !== imp.proveedorId) {
      exigir(
        imp.estado === 'cotizado',
        'PROVEEDOR_CERRADO',
        'La fábrica solo se cambia mientras el pedido está cotizado.',
        'proveedorId',
      );
      const p = requerir(estado.proveedores, c.proveedorId, 'la fábrica', 'proveedorId');
      exigir(
        p.tipo === 'fabrica',
        'NO_ES_FABRICA',
        'Las importaciones se piden a una fábrica.',
        'proveedorId',
      );
      cambios.proveedorId = p.id;
    }
    if (c.moneda !== undefined) {
      exigir(
        c.moneda === imp.moneda || imp.estado === 'cotizado',
        'MONEDA_CERRADA',
        'La moneda solo se cambia mientras el pedido está cotizado.',
        'moneda',
      );
      cambios.moneda = c.moneda;
    }
    if (c.tasaPedido !== undefined) {
      exigir(c.tasaPedido > 0, 'TASA_INVALIDA', 'La tasa del pedido debe ser mayor que cero.', 'tasaPedido');
      cambios.tasaPedido = c.tasaPedido;
    }
    if (c.fechaPedido !== undefined && c.fechaPedido !== imp.fechaPedido) {
      fechaValida(c.fechaPedido, 'fechaPedido');
      exigir(
        imp.estado === 'cotizado',
        'FECHA_CERRADA',
        'La fecha del pedido solo se cambia mientras está cotizado.',
        'fechaPedido',
      );
      cambios.fechaPedido = c.fechaPedido;
      cambios.hitos = hitosIniciales(c.fechaPedido, estado.parametros.aduanas.diasEstimadosEntreEstados);
    }
    if (c.costos !== undefined) {
      validarCostos(c.costos);
      cambios.costos = { ...c.costos, flete: { ...c.costos.flete }, seguro: { ...c.costos.seguro } };
    }
    if (c.contactoIds !== undefined) {
      for (const x of c.contactoIds) requerir(estado.contactos, x, 'el contacto', 'contactoIds');
      cambios.contactoIds = [...c.contactoIds];
    }
    if (c.carga !== undefined) cambios.carga = { ...c.carga };
    if (c.puertoOrigen !== undefined) cambios.puertoOrigen = c.puertoOrigen;
    if (c.puertoDestino !== undefined) cambios.puertoDestino = c.puertoDestino;
    if (c.metodoProrrateo !== undefined) cambios.metodoProrrateo = c.metodoProrrateo;
    if (c.origenSugerencia !== undefined)
      cambios.origenSugerencia = c.origenSugerencia ? { ...c.origenSugerencia } : null;
    if (c.nota !== undefined) cambios.nota = c.nota;
    return { id: imp.id, cambios };
  },
  escribir(estado, plan, ctx) {
    const imp = estado.importaciones[plan.id];
    if (!imp) return;
    Object.assign(imp, plan.cambios);
    marcarEditado(imp, ctx);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'importaciones', id: imp.id, accion: 'editada' });
  },
});

export const importacionEliminar = manejador<
  'importacion.eliminar',
  { id: Id; cxps: Id[]; motivo: string | null }
>({
  validar(estado, d) {
    const imp = requerir(estado.importaciones, d.importacionId, 'la importación', 'importacionId');
    exigir(
      indiceEstado(imp.estado) <= indiceEstado('pedido_confirmado'),
      'ESTADO_INVALIDO',
      'Solo se elimina un pedido cotizado o recién confirmado.',
      'importacionId',
    );
    const conAbonos = imp.cuentaPorPagarIds.some(
      (id) => (estado.cuentasPorPagar[id]?.abonos.length ?? 0) > 0,
    );
    exigir(!conAbonos, 'CON_ABONOS', 'El pedido ya tiene pagos; no se puede eliminar.', 'importacionId');
    return { id: imp.id, cxps: [...imp.cuentaPorPagarIds], motivo: d.motivo };
  },
  escribir(estado, plan, ctx) {
    const imp = estado.importaciones[plan.id];
    if (!imp) return;
    marcarEliminado(imp, ctx, plan.motivo);
    for (const id of plan.cxps) {
      const c = estado.cuentasPorPagar[id];
      if (c) marcarEliminado(c, ctx, plan.motivo);
    }
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'importaciones', id: imp.id, accion: 'eliminada' });
  },
});

/** Cuentas por pagar que nacen al cambiar de estado (M6, M8). */
function cxpsAutomaticas(
  estado: EstadoDominio,
  ctx: Contexto,
  imp: Importacion,
  hitos: Record<EstadoImportacion, HitoImportacion>,
  estadoNuevo: EstadoImportacion,
  fecha: FechaISO,
): CuentaPorPagar[] {
  const prov = estado.proveedores[imp.proveedorId];
  const nombre = prov?.nombreCorto ?? 'la fábrica';
  const r: CuentaPorPagar[] = [];
  let n = 0;
  const base = {
    proveedorId: imp.proveedorId,
    empleadoId: null,
    localId: null,
    documento: { tipo: 'importacion' as const, id: imp.id },
    soporte: null,
    nota: null,
  };
  const nueva = (
    sufijo: string,
    datos: Omit<
      CuentaPorPagar,
      | 'id'
      | 'numero'
      | 'programadaPara'
      | 'abonos'
      | keyof Trazabilidad
      | 'proveedorId'
      | 'empleadoId'
      | 'localId'
      | 'documento'
      | 'soporte'
      | 'nota'
    >,
  ) => {
    const id = idHijo(imp.id, sufijo);
    if (estado.cuentasPorPagar[id]) return;
    n += 1;
    r.push(nuevaCxP(ctx, id, leerConsecutivo(estado, 'cuenta_por_pagar', n), { ...base, ...datos }));
  };
  if (estadoAlcanzado(estadoNuevo, 'pedido_confirmado')) {
    const total = fobImportacion(imp.lineas);
    const partes = partesPagoFabrica(total, PAGO_FABRICA.anticipo);
    nueva('cxp-anticipo', {
      categoria: 'proveedor_importacion',
      terceroNombre: nombre,
      concepto: `Anticipo 30 % ${imp.numero} · ${nombre}`,
      moneda: imp.moneda,
      valor: partes.anticipo,
      fechaEmision: hitos.pedido_confirmado.real ?? fecha,
      fechaVencimiento: hitos.pedido_confirmado.real ?? fecha,
    });
    nueva('cxp-saldo', {
      categoria: 'proveedor_importacion',
      terceroNombre: nombre,
      concepto: `Saldo 70 % ${imp.numero} · ${nombre}`,
      moneda: imp.moneda,
      valor: partes.saldo,
      fechaEmision: hitos.pedido_confirmado.real ?? fecha,
      fechaVencimiento: hitos.listo_despacho.real ?? hitos.listo_despacho.estimada,
    });
  }
  if (estadoAlcanzado(estadoNuevo, 'en_nacionalizacion')) {
    const tasa = tasaVigente(estado, imp.moneda, fecha) ?? imp.tasaPedido;
    const costeo = calcularCostoAterrizado({
      lineas: imp.lineas,
      costos: imp.costos,
      moneda: imp.moneda,
      metodoProrrateo: imp.metodoProrrateo,
      tasaCosteo: tasa,
    });
    if (costeo.tributos > 0) {
      nueva('cxp-tributos', {
        categoria: 'tributos_aduaneros',
        terceroNombre: 'Tributos aduaneros (DIAN)',
        concepto: `Tributos aduaneros ${imp.numero} · arancel e IVA de importación (valores de ejemplo)`,
        moneda: 'COP',
        valor: costeo.tributos,
        fechaEmision: fecha,
        fechaVencimiento: hitos.nacionalizado.real ?? hitos.nacionalizado.estimada,
      });
    }
  }
  return r;
}

const QUE_REPORTO: Partial<Record<EstadoImportacion, string>> = {
  en_puerto: 'la llegada a puerto',
  en_nacionalizacion: 'el inicio de la nacionalización',
  nacionalizado: 'el levante',
  en_transporte_bogota: 'la salida hacia Bogotá',
};

interface PlanCambioEstado {
  id: Id;
  de: EstadoImportacion;
  a: EstadoImportacion;
  hitos: Record<EstadoImportacion, HitoImportacion>;
  controlManualHasta: FechaISO | null;
  cxps: CuentaPorPagar[];
  /** Nuevo vencimiento del saldo a la fábrica si cambió la estimada de "listo para despacho". */
  vencimientoSaldo: FechaISO | null;
  notificacion: Notificacion | null;
  origen: 'panel' | 'portal' | 'sistema';
}

export const importacionCambiarEstado = manejador<'importacion.cambiarEstado', PlanCambioEstado>({
  validar(estado, d, ctx) {
    const imp = requerir(estado.importaciones, d.importacionId, 'la importación', 'importacionId');
    fechaValida(d.fecha, 'fecha');
    exigir(
      ['panel', 'portal', 'sistema'].includes(d.origen),
      'ORIGEN_INVALIDO',
      'Origen del cambio no válido.',
      'origen',
    );
    exigir(ESTADOS_IMPORTACION.includes(d.estado), 'ESTADO_INVALIDO', 'Elige un estado válido.', 'estado');
    const error = validarCambioEstado(imp.estado, d.estado, { esDueno: ctx.actor === 'dueno', nota: d.nota });
    if (error === 'recepcion_por_inventario')
      fallar('RECEPCION_POR_INVENTARIO', 'Registra la recepción en Inventario → Recepción.', 'estado');
    if (error === 'mismo_estado') fallar('MISMO_ESTADO', 'La importación ya está en ese estado.', 'estado');
    if (error === 'retroceso_mayor')
      fallar('RETROCESO_MAYOR', 'Solo se puede volver un paso atrás, como corrección.', 'estado');
    if (error === 'retroceso_sin_permiso')
      fallar('SIN_PERMISO', 'Solo el dueño corrige un estado hacia atrás.', 'estado');
    if (error === 'nota_obligatoria')
      fallar('NOTA_OBLIGATORIA', 'Escribe por qué se corrige el estado.', 'nota');
    const avanza = indiceEstado(d.estado) > indiceEstado(imp.estado);
    let hitos: Record<EstadoImportacion, HitoImportacion> = {} as Record<EstadoImportacion, HitoImportacion>;
    for (const e of ESTADOS_IMPORTACION) hitos[e] = { ...imp.hitos[e] };
    if (avanza) {
      for (let i = indiceEstado(imp.estado) + 1; i <= indiceEstado(d.estado); i++) {
        const e = ESTADOS_IMPORTACION[i];
        if (!e) continue;
        hitos[e] = { ...hitos[e], real: hitos[e].real ?? d.fecha, actualizadoPor: ctx.usuarioId };
      }
      hitos[d.estado] = { ...hitos[d.estado], nota: d.nota ?? hitos[d.estado].nota };
      hitos = reestimarHitos(hitos, d.estado, d.fecha);
    } else {
      hitos[imp.estado] = { ...hitos[imp.estado], real: null, nota: d.nota, actualizadoPor: ctx.usuarioId };
    }
    const sig = siguienteEstado(d.estado);
    const controlManualHasta = d.origen === 'sistema' ? null : sig ? hitos[sig].estimada : null;
    const cxps = avanza ? cxpsAutomaticas(estado, ctx, imp, hitos, d.estado, d.fecha) : [];
    const saldo = estado.cuentasPorPagar[idHijo(imp.id, 'cxp-saldo')];
    const nuevoVenc = hitos.listo_despacho.real ?? hitos.listo_despacho.estimada;
    const vencimientoSaldo =
      saldo && saldo.abonos.length === 0 && saldo.fechaVencimiento !== nuevoVenc ? nuevoVenc : null;
    let notificacion: Notificacion | null = null;
    if (d.origen === 'portal') {
      const autor = d.autor?.trim() || 'La agente de aduanas';
      const que = QUE_REPORTO[d.estado] ?? `el estado “${ETIQUETAS_ESTADO_IMPORTACION[d.estado]}”`;
      notificacion = {
        id: idHijo(imp.id, `n-${d.estado}-${ctx.sobre.id}`),
        ts: ctx.ts,
        tipo: 'portal_actualizacion',
        titulo: `${autor} reportó ${que} de ${imp.numero}`,
        detalle: d.nota ?? `Nuevo estado: ${ETIQUETAS_ESTADO_IMPORTACION[d.estado]}.`,
        severidad: 'atencion',
        enlace: rutasDominio.importacion(imp.numero),
        origen: { tipo: 'importacion', id: imp.id },
      };
    }
    return {
      id: imp.id,
      de: imp.estado,
      a: d.estado,
      hitos,
      controlManualHasta,
      cxps,
      vencimientoSaldo,
      notificacion,
      origen: d.origen,
    };
  },
  escribir(estado, plan, ctx) {
    const imp = estado.importaciones[plan.id];
    if (!imp) return;
    imp.estado = plan.a;
    imp.hitos = plan.hitos;
    imp.controlManualHasta = plan.controlManualHasta;
    let ultimo = 0;
    for (const c of plan.cxps) {
      estado.cuentasPorPagar[c.id] = c;
      imp.cuentaPorPagarIds.push(c.id);
      ultimo = Math.max(ultimo, Number(c.numero.slice(3)));
    }
    if (ultimo) fijarConsecutivo(estado, 'cuenta_por_pagar', ultimo);
    if (plan.vencimientoSaldo) {
      const saldo = estado.cuentasPorPagar[idHijo(imp.id, 'cxp-saldo')];
      if (saldo) saldo.fechaVencimiento = plan.vencimientoSaldo;
    }
    if (plan.notificacion) estado.notificaciones[plan.notificacion.id] = plan.notificacion;
    marcarEditado(imp, ctx);
    ctx.emitir({
      tipo: 'ImportacionEstadoCambiado',
      importacionId: imp.id,
      de: plan.de,
      a: plan.a,
      origen: plan.origen,
    });
    if (plan.notificacion) ctx.emitir({ tipo: 'NotificacionCreada', notificacionId: plan.notificacion.id });
  },
});

export const importacionActualizarHitos = manejador<
  'importacion.actualizarHitos',
  { id: Id; hitos: Record<EstadoImportacion, HitoImportacion> }
>({
  validar(estado, d) {
    const imp = requerir(estado.importaciones, d.importacionId, 'la importación', 'importacionId');
    const hitos = {} as Record<EstadoImportacion, HitoImportacion>;
    for (const e of ESTADOS_IMPORTACION) {
      const nueva = d.estimadas[e];
      if (nueva !== undefined) fechaValida(nueva, 'estimadas');
      hitos[e] = { ...imp.hitos[e], estimada: nueva ?? imp.hitos[e].estimada };
    }
    exigir(
      hitosEnOrden(hitos),
      'FECHAS_DESORDENADAS',
      'Las fechas estimadas deben ir en orden.',
      'estimadas',
    );
    return { id: imp.id, hitos };
  },
  escribir(estado, plan, ctx) {
    const imp = estado.importaciones[plan.id];
    if (!imp) return;
    imp.hitos = plan.hitos;
    marcarEditado(imp, ctx);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'importaciones', id: imp.id, accion: 'editada' });
  },
});

export const importacionActualizarCostos = manejador<
  'importacion.actualizarCostos',
  { id: Id; costos: CostosImportacion; metodo: 'valor' | 'cantidad' }
>({
  validar(estado, d) {
    const imp = requerir(estado.importaciones, d.importacionId, 'la importación', 'importacionId');
    validarCostos(d.costos);
    exigir(
      d.metodoProrrateo === 'valor' || d.metodoProrrateo === 'cantidad',
      'METODO_INVALIDO',
      'Elige prorrateo por valor o por cantidad.',
      'metodoProrrateo',
    );
    return {
      id: imp.id,
      costos: { ...d.costos, flete: { ...d.costos.flete }, seguro: { ...d.costos.seguro } },
      metodo: d.metodoProrrateo,
    };
  },
  escribir(estado, plan, ctx) {
    const imp = estado.importaciones[plan.id];
    if (!imp) return;
    imp.costos = plan.costos;
    imp.metodoProrrateo = plan.metodo;
    marcarEditado(imp, ctx);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'importaciones', id: imp.id, accion: 'editada' });
  },
});

interface PlanCostos {
  id: Id;
  tasaCosteo: number;
  productos: { productoId: Id; antes: number; despues: number }[];
  /** Costo unitario por producto calculado para esta importación. */
  porProducto: Record<Id, number>;
}

/** Calcula los costos de una importación (M5) sin escribir. */
function planearCostos(
  estado: EstadoDominio,
  ctx: Contexto,
  imp: Importacion,
  tasaOverride: number | null,
): PlanCostos {
  const unidades = imp.lineas.reduce((a, l) => a + unidadesLinea(l), 0);
  exigir(unidades > 0, 'SIN_UNIDADES', 'La importación no tiene unidades.', 'importacionId');
  let tasa = tasaOverride;
  if (tasa === null) {
    const abonos: { centavos: number; tasa: number }[] = [];
    for (const id of imp.cuentaPorPagarIds) {
      const c = estado.cuentasPorPagar[id];
      if (c?.categoria !== 'proveedor_importacion') continue;
      for (const a of c.abonos)
        if (a.montoOrigen) abonos.push({ centavos: a.montoOrigen.centavos, tasa: a.montoOrigen.tasa });
    }
    const vigente = tasaVigente(estado, imp.moneda, ctx.hoy) ?? imp.tasaPedido;
    tasa = tasaCosteoPonderada(abonos, fobImportacion(imp.lineas), vigente);
  }
  exigir(tasa > 0, 'TASA_INVALIDA', 'La tasa de costeo debe ser mayor que cero.', 'tasaCosteo');
  const r = calcularCostoAterrizado({
    lineas: imp.lineas,
    costos: imp.costos,
    moneda: imp.moneda,
    metodoProrrateo: imp.metodoProrrateo,
    tasaCosteo: tasa,
  });
  const porProducto: Record<Id, number> = {};
  const productos = Object.entries(r.porProducto).map(([productoId, p]) => {
    porProducto[productoId] = p.costoUnitario;
    return { productoId, antes: estado.productos[productoId]?.costoVigente ?? 0, despues: p.costoUnitario };
  });
  return { id: imp.id, tasaCosteo: tasa, productos, porProducto };
}

function escribirCostos(estado: EstadoDominio, plan: PlanCostos, ctx: Contexto): void {
  const imp = estado.importaciones[plan.id];
  if (!imp) return;
  for (const p of plan.productos) {
    const prod = estado.productos[p.productoId];
    if (!prod) continue;
    prod.costoVigente = p.despues;
    prod.historialCosto.push({
      fecha: ctx.hoy,
      costo: p.despues,
      importacionId: imp.id,
      motivo: 'importacion',
    });
  }
  imp.costosAplicados = { ts: ctx.ts, tasaCosteo: plan.tasaCosteo };
  ctx.emitir({ tipo: 'CostosAplicados', importacionId: imp.id, productos: plan.productos });
}

export const importacionAplicarCostos = manejador<'importacion.aplicarCostos', PlanCostos>({
  validar(estado, d, ctx) {
    const imp = requerir(estado.importaciones, d.importacionId, 'la importación', 'importacionId');
    if (d.tasaCosteo !== null)
      exigir(d.tasaCosteo > 0, 'TASA_INVALIDA', 'La tasa de costeo debe ser mayor que cero.', 'tasaCosteo');
    return planearCostos(estado, ctx, imp, d.tasaCosteo);
  },
  escribir(estado, plan, ctx) {
    escribirCostos(estado, plan, ctx);
    const imp = estado.importaciones[plan.id];
    if (imp) marcarEditado(imp, ctx);
  },
});

export const importacionRegistrarPago = manejador<'importacion.registrarPago', PlanPagoCxP>({
  validar(estado, d, ctx) {
    const imp = requerir(estado.importaciones, d.importacionId, 'la importación', 'importacionId');
    exigir(
      imp.cuentaPorPagarIds.includes(d.cxpId),
      'CXP_AJENA',
      'Esa cuenta por pagar no es de esta importación.',
      'cxpId',
    );
    exigir(d.tasa > 0, 'TASA_INVALIDA', 'La tasa del pago debe ser mayor que cero.', 'tasa');
    const c = requerir(estado.cuentasPorPagar, d.cxpId, 'la cuenta por pagar', 'cxpId');
    const enCop = c.moneda === 'COP';
    return planearPagoCxP(estado, ctx, {
      cxpId: d.cxpId,
      abonoId: d.abonoId,
      fecha: d.fecha,
      valorCOP: enCop ? copDeCentavos(d.centavos, d.tasa) : null,
      centavos: enCop ? null : d.centavos,
      tasa: enCop ? null : d.tasa,
      cuentaId: d.cuentaId,
      medio: 'giro_internacional',
      soporte: null,
    });
  },
  escribir(estado, plan, ctx) {
    escribirPagoCxP(estado, plan, ctx);
  },
});

const TIPOS_DOCUMENTO: DocumentoImportacion['tipo'][] = [
  'proforma',
  'factura_comercial',
  'lista_empaque',
  'bl',
  'guia_aerea',
  'declaracion_importacion',
  'declaracion_cambio',
  'declaracion_valor',
];

export const importacionDocumento = manejador<
  'importacion.documento',
  { id: Id; documento: DocumentoImportacion }
>({
  validar(estado, d) {
    const imp = requerir(estado.importaciones, d.importacionId, 'la importación', 'importacionId');
    exigir(
      TIPOS_DOCUMENTO.includes(d.documento.tipo),
      'TIPO_INVALIDO',
      'Elige el tipo de documento.',
      'documento',
    );
    textoObligatorio(d.documento.nombreArchivo, 'documento', 'Falta el nombre del archivo.');
    if (d.documento.fecha) fechaValida(d.documento.fecha, 'documento');
    return { id: imp.id, documento: { ...d.documento } };
  },
  escribir(estado, plan, ctx) {
    const imp = estado.importaciones[plan.id];
    if (!imp) return;
    const i = imp.documentos.findIndex((x) => x.tipo === plan.documento.tipo);
    if (i >= 0) imp.documentos[i] = plan.documento;
    else imp.documentos.push(plan.documento);
    marcarEditado(imp, ctx);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'importaciones', id: imp.id, accion: 'editada' });
  },
});

interface PlanRecepcion {
  id: Id;
  bodegaId: Id;
  recepcion: NonNullable<Importacion['recepcion']>;
  hitos: Record<EstadoImportacion, HitoImportacion>;
  de: EstadoImportacion;
  entradas: MovPlan[];
  costos: PlanCostos | null;
  traslados: { plan: PlanTrasladoNuevo; salidas: MovPlan[] }[];
  unidades: number;
}

export const importacionRecibir = manejador<'importacion.recibir', PlanRecepcion>({
  validar(estado, d, ctx) {
    const imp = requerir(estado.importaciones, d.importacionId, 'la importación', 'importacionId');
    exigir(imp.estado !== 'recibido_bodega', 'YA_RECIBIDA', `${imp.numero} ya se recibió.`, 'importacionId');
    exigir(
      estadoAlcanzado(imp.estado, 'nacionalizado'),
      'SIN_LEVANTE',
      'La mercancía se recibe después del levante (nacionalizada).',
      'importacionId',
    );
    fechaValida(d.fecha, 'fecha');
    const bodega = Object.values(estado.locales).find((l) => l.tipo === 'bodega' && !l.eliminadoEn);
    exigir(bodega, 'SIN_BODEGA', 'No hay una bodega configurada.', 'importacionId');

    const esperadasPorVariante = new Map<Id, { esperadas: number; productoId: Id }>();
    for (const l of imp.lineas)
      for (const [v, n] of Object.entries(l.cantidades)) {
        const a = esperadasPorVariante.get(v);
        esperadasPorVariante.set(v, { esperadas: (a?.esperadas ?? 0) + n, productoId: l.productoId });
      }
    for (const v of Object.keys(d.lineas))
      exigir(
        esperadasPorVariante.has(v),
        'VARIANTE_AJENA',
        'Una prenda recibida no está en el pedido.',
        'lineas',
      );

    // Costos: si no se han aplicado, se aplican ahora (M5); si ya, se usa el costo de esta importación.
    const costos = imp.costosAplicados ? null : planearCostos(estado, ctx, imp, null);
    const costoProducto =
      costos?.porProducto ??
      planearCostos(estado, ctx, imp, imp.costosAplicados?.tasaCosteo ?? null).porProducto;

    const recepcion: PlanRecepcion['recepcion'] = {
      fecha: d.fecha,
      recibidoPor: ctx.usuarioId,
      lineas: {},
      nota: d.nota,
    };
    const entradas: MovPlan[] = [];
    const extra: Record<Id, number> = {};
    let i = 0;
    let unidades = 0;
    for (const [v, e] of esperadasPorVariante) {
      const r = d.lineas[v] ?? { recibidas: e.esperadas, defectuosas: 0 };
      enteroNoNegativo(r.recibidas, 'lineas', 'Las unidades recibidas no pueden ser negativas.');
      enteroNoNegativo(r.defectuosas, 'lineas', 'Las unidades defectuosas no pueden ser negativas.');
      exigir(
        r.defectuosas <= r.recibidas,
        'DEFECTUOSAS_EXCEDEN',
        'Las defectuosas no pueden ser más que las recibidas.',
        'lineas',
      );
      recepcion.lineas[v] = { esperadas: e.esperadas, recibidas: r.recibidas, defectuosas: r.defectuosas };
      const buenas = r.recibidas - r.defectuosas;
      if (buenas > 0) {
        unidades += buenas;
        extra[v] = buenas;
        entradas.push({
          id: idHijo(imp.id, `r${++i}`),
          ts: ctx.ts,
          varianteId: v,
          productoId: e.productoId,
          localId: bodega.id,
          cantidad: buenas,
          tipo: 'entrada_importacion',
          costoUnitario: costoProducto[e.productoId] ?? 0,
          documento: { tipo: 'importacion', id: imp.id },
        });
      }
    }

    // Distribución por local (traslados solicitados y despachados el mismo día).
    const todas = d.distribucion.flatMap((x) => x.lineas);
    if (todas.length) verificarExistencias(estado, bodega.id, todas, 'distribucion', extra);
    const traslados = d.distribucion.map((x, k) => {
      const plan = planearTraslado(estado, ctx, {
        trasladoId: x.trasladoId,
        origenId: bodega.id,
        destinoId: x.destinoId,
        lineas: x.lineas,
        motivo: `Distribución ${imp.numero}`,
        requiereAprobacion: false,
        solicitudId: null,
        importacionId: imp.id,
        extra,
        usados: k,
      });
      const salidas = movimientosSalida(estado, plan.traslado, ctx).map((m) => ({
        ...m,
        costoUnitario: costoProducto[m.productoId] ?? m.costoUnitario,
      }));
      return { plan, salidas };
    });
    exigir(
      new Set(d.distribucion.map((x) => x.trasladoId)).size === d.distribucion.length,
      'ID_DUPLICADO',
      'Hay traslados repetidos en la distribución.',
      'distribucion',
    );

    const hitos = {} as Record<EstadoImportacion, HitoImportacion>;
    for (const e of ESTADOS_IMPORTACION) {
      hitos[e] =
        indiceEstado(e) > indiceEstado(imp.estado)
          ? { ...imp.hitos[e], real: imp.hitos[e].real ?? d.fecha, actualizadoPor: ctx.usuarioId }
          : { ...imp.hitos[e] };
    }
    return {
      id: imp.id,
      bodegaId: bodega.id,
      recepcion,
      hitos,
      de: imp.estado,
      entradas,
      costos,
      traslados,
      unidades,
    };
  },
  escribir(estado, plan, ctx) {
    const imp = estado.importaciones[plan.id];
    if (!imp) return;
    if (plan.costos) escribirCostos(estado, plan.costos, ctx);
    const cambios = aplicarMovimientos(estado, plan.entradas, ctx);
    for (const t of plan.traslados) {
      escribirTrasladoNuevo(estado, t.plan, ctx);
      cambios.push(...aplicarMovimientos(estado, t.salidas, ctx));
      const tr = estado.traslados[t.plan.traslado.id];
      if (tr) {
        tr.estado = 'en_transito';
        tr.fechas.despachado = ctx.ts;
      }
      ctx.emitir({ tipo: 'TrasladoCambiado', trasladoId: t.plan.traslado.id, estado: 'en_transito' });
    }
    imp.recepcion = plan.recepcion;
    imp.hitos = plan.hitos;
    imp.estado = 'recibido_bodega';
    imp.controlManualHasta = null;
    marcarEditado(imp, ctx);
    ctx.emitir({
      tipo: 'ImportacionEstadoCambiado',
      importacionId: imp.id,
      de: plan.de,
      a: 'recibido_bodega',
      origen: ctx.origen === 'generado' ? 'sistema' : 'panel',
    });
    ctx.emitir({ tipo: 'ImportacionRecibida', importacionId: imp.id, unidades: plan.unidades });
    emitirInventario(estado, ctx, cambios);
  },
});

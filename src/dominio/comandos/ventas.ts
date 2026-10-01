import type {
  AbonoDatafono,
  BonoRegalo,
  Gasto,
  Cliente,
  Devolucion,
  EstadoDominio,
  Id,
  LineaVenta,
  MapaComandos,
  MedioPago,
  MovimientoCuenta,
  MovimientoInventario,
  NotaCredito,
  Notificacion,
  PagoVenta,
  SolicitudAprobacion,
  Venta,
} from '../tipos';
import { exigir, fallar } from '../errores';
import { idHijo } from '../motor/ids';
import {
  calcularVenta,
  porcentajeDescuento,
  totalPagado,
  valoresDevolucionLinea,
  type ValoresDevueltos,
} from '../reglas/ventas';
import { diferenciaDias, fechaDe, sumarDias } from '../reglas/fechas';
import { calcularAbonoDatafono } from '../reglas/datafono';
import { pesos, porcentajeTexto } from '../reglas/texto';
import { redondear } from '../reglas/dinero';
import { rutasDominio } from '../reglas/rutas-dominio';
import {
  construirCliente,
  cuentaDeMedio,
  enteroPositivo,
  fechaValida,
  idNuevo,
  nombrePersona,
  nuevoUso,
  personaQueActua,
  planearCobro,
  planearFactura,
  planearNotaCredito,
  planearReembolso,
  type PlanDocumento,
  requerir,
  requerirExiste,
  textoObligatorio,
  tsValido,
  validarDatosCliente,
} from './comunes';
import { aplicarMovimientos } from './inventario';
import {
  type Contexto,
  agregarMovimientoCuenta,
  agregarPagoVenta,
  claveDatafono,
  emitirInventario,
  existencia,
  fijarConsecutivo,
  leerConsecutivo,
  manejador,
  marcarEditado,
  numeroDocumento,
  registrarCobroEnAgregados,
  traza,
} from './tx';

/** Ventas, separados, devoluciones, aprobaciones, bonos y datáfono (PLAN 6.6, 6.19 V1–V12, 6.21). */

type MovPlan = Omit<MovimientoInventario, 'usuarioId'>;

/** Unidades ya devueltas por línea de una venta. */
function devueltoPorLinea(estado: EstadoDominio, ventaId: Id): Map<Id, ValoresDevueltos> {
  const r = new Map<Id, ValoresDevueltos>();
  for (const d of Object.values(estado.devoluciones)) {
    if (d.ventaId !== ventaId) continue;
    for (const l of d.lineas) {
      const a = r.get(l.lineaId) ?? { cantidad: 0, valor: 0, base: 0, iva: 0, costo: 0 };
      r.set(l.lineaId, {
        cantidad: a.cantidad + l.cantidad,
        valor: a.valor + l.valor,
        base: a.base + l.base,
        iva: a.iva + l.iva,
        costo: a.costo + l.costo,
      });
    }
  }
  return r;
}

function devolucionesDe(estado: EstadoDominio, ventaId: Id): Devolucion[] {
  return Object.values(estado.devoluciones).filter((d) => d.ventaId === ventaId);
}

function saldoDe(estado: EstadoDominio, venta: Venta): number {
  let devuelto = 0;
  for (const d of devolucionesDe(estado, venta.id)) devuelto += d.valorTotal;
  return Math.max(0, venta.total - devuelto - totalPagado(venta));
}

function siguientePagoId(venta: Pick<Venta, 'id' | 'pagos'>, extra = 0): Id {
  return idHijo(venta.id, `p${venta.pagos.length + 1 + extra}`);
}

// ---------- venta.registrar ----------

interface PlanVenta {
  venta: Venta;
  pagos: PagoVenta[];
  movs: MovPlan[];
  cliente: Cliente | null;
  solicitudUsadaId: Id | null;
  documento: PlanDocumento | null;
  notificacion: Notificacion | null;
  consecutivo: number;
  devolucionCambioId: Id | null;
}

export const ventaRegistrar = manejador<'venta.registrar', PlanVenta>({
  validar(estado, d, ctx) {
    idNuevo(estado.ventas, d.ventaId, 'ventaId');
    const ts = d.ts ?? ctx.ts;
    tsValido(ts, 'ts');
    const hoy = fechaDe(ts);
    const local = requerir(estado.locales, d.localId, 'el local', 'localId');
    exigir(local.vende, 'LOCAL_NO_VENDE', `${local.nombre} no vende: es bodega.`, 'localId');
    if (d.canal === 'web') {
      exigir(
        local.id === estado.parametros.ventas.localDespachoWebId,
        'LOCAL_WEB',
        'Las ventas web salen del local de despacho.',
        'localId',
      );
    }
    const vendedor = requerir(estado.empleados, d.vendedorId, 'el vendedor', 'vendedorId');
    exigir(
      vendedor.fechaRetiro === null || vendedor.fechaRetiro >= hoy,
      'VENDEDOR_RETIRADO',
      `${vendedor.nombres} ya no trabaja en la empresa.`,
      'vendedorId',
    );
    exigir(
      vendedor.cargo === 'vendedor',
      'NO_ES_VENDEDOR',
      'La venta va a nombre de un vendedor.',
      'vendedorId',
    );
    if (ctx.actor === 'vendedor') {
      const usuario = estado.usuarios[ctx.usuarioId];
      exigir(usuario?.localFijoId === local.id, 'OTRO_LOCAL', 'Solo puedes vender en tu local.', 'localId');
      exigir(
        usuario.empleadoId === vendedor.id,
        'OTRO_VENDEDOR',
        'La venta queda a tu nombre.',
        'vendedorId',
      );
    }

    // Cliente
    let cliente: Cliente | null = null;
    let clienteId = d.clienteId;
    if (d.clienteNuevo) {
      const { clienteId: nuevoId, ...datos } = d.clienteNuevo;
      idNuevo(estado.clientes, nuevoId, 'clienteNuevo');
      validarDatosCliente(estado, datos, true, null);
      cliente = construirCliente(nuevoId, datos, ctx);
      clienteId = nuevoId;
    } else if (clienteId) {
      requerir(estado.clientes, clienteId, 'el cliente', 'clienteId');
    }

    // Líneas
    exigir(d.lineas.length > 0, 'SIN_LINEAS', 'Agrega al menos una prenda.', 'lineas');
    const entradas = d.lineas.map((l) => {
      const v = requerir(estado.variantes, l.varianteId, 'la prenda', 'lineas');
      const p = requerir(estado.productos, v.productoId, 'la referencia', 'lineas');
      enteroPositivo(l.cantidad, 'lineas', 'Las cantidades deben ser mayores que cero.');
      const precio = l.precioLista ?? p.precioVenta;
      enteroPositivo(precio, 'lineas', 'El precio debe ser mayor que cero.');
      if (l.descuento)
        exigir(
          l.descuento.valor >= 0 && (l.descuento.tipo === 'valor' || l.descuento.valor <= 1),
          'DESCUENTO_INVALIDO',
          'Revisa el descuento de la línea.',
          'lineas',
        );
      return { v, p, precio, cantidad: l.cantidad, descuento: l.descuento };
    });
    if (d.descuentoGlobal) {
      exigir(
        d.descuentoGlobal.valor >= 0 && (d.descuentoGlobal.tipo === 'valor' || d.descuentoGlobal.valor <= 1),
        'DESCUENTO_INVALIDO',
        'Revisa el descuento de la venta.',
        'descuentoGlobal',
      );
    }
    const { lineas: calculadas, ...totales } = calcularVenta(
      entradas.map((e) => ({
        precioLista: e.precio,
        cantidad: e.cantidad,
        descuento: e.descuento,
        tarifaIva: e.p.tarifaIva,
      })),
      d.descuentoGlobal,
    );
    const existenciasUsadas = d.lineas.map((l) => ({ varianteId: l.varianteId, cantidad: l.cantidad }));
    for (const l of existenciasUsadas) {
      const pedidas = existenciasUsadas
        .filter((x) => x.varianteId === l.varianteId)
        .reduce((a, x) => a + x.cantidad, 0);
      const hay = existencia(estado, l.varianteId, local.id);
      if (hay < pedidas) {
        const e = entradas.find((x) => x.v.id === l.varianteId);
        fallar(
          'SIN_EXISTENCIAS',
          `La cantidad supera lo que hay en ${local.nombre} (${hay}) de ${e?.p.nombre ?? 'la prenda'} talla ${e?.v.talla ?? ''}. Pide un traslado o baja la cantidad.`,
          'lineas',
        );
      }
    }

    // Descuento por encima del máximo del vendedor (6.20.1)
    const pct = porcentajeDescuento(totales.subtotal, totales.descuentos);
    let solicitudUsadaId: Id | null = null;
    if (d.aprobacionDescuentoId) {
      const s = requerirExiste(
        estado.solicitudes,
        d.aprobacionDescuentoId,
        'la aprobación del descuento',
        'aprobacionDescuentoId',
      );
      exigir(
        s.datos.tipo === 'descuento' && s.estado === 'aprobada',
        'APROBACION_INVALIDA',
        'Esa aprobación de descuento no está aprobada.',
        'aprobacionDescuentoId',
      );
      exigir(
        s.usadaEnVentaId === null,
        'APROBACION_USADA',
        'Esa aprobación de descuento ya se usó.',
        'aprobacionDescuentoId',
      );
      exigir(
        s.datos.vendedorId === vendedor.id,
        'APROBACION_OTRO_VENDEDOR',
        'La aprobación es de otro vendedor.',
        'aprobacionDescuentoId',
      );
      exigir(
        s.datos.porcentaje + 1e-9 >= pct,
        'APROBACION_INSUFICIENTE',
        `La aprobación cubre hasta ${porcentajeTexto(s.datos.porcentaje)}.`,
        'aprobacionDescuentoId',
      );
      solicitudUsadaId = s.id;
    } else if (ctx.actor === 'vendedor' && pct > estado.parametros.ventas.descuentoMaximoVendedor + 1e-9) {
      fallar(
        'DESCUENTO_REQUIERE_APROBACION',
        `Un descuento de ${porcentajeTexto(pct)} necesita la aprobación del dueño (máximo ${porcentajeTexto(estado.parametros.ventas.descuentoMaximoVendedor)}).`,
        'descuentoGlobal',
      );
    }

    // Pagos (V2)
    const uso = nuevoUso();
    const pagos = d.pagos.map((p, i) =>
      planearCobro(estado, ctx, p, {
        id: idHijo(d.ventaId, `p${i + 1}`),
        ts,
        tipo: 'pago',
        localId: local.id,
        canal: d.canal,
        clienteId,
        uso,
        campo: 'pagos',
      }),
    );
    const pagado = pagos.reduce((a, p) => a + p.valor, 0);
    let separado: Venta['separado'] = null;
    if (d.tipo === 'contado') {
      exigir(
        pagado === totales.total,
        'PAGO_INCOMPLETO',
        `Los pagos suman ${pesos(pagado)} y la venta es de ${pesos(totales.total)}.`,
        'pagos',
      );
    } else if (d.tipo === 'separado') {
      exigir(clienteId, 'CLIENTE_REQUERIDO', 'Un separado necesita el cliente.', 'clienteId');
      const minimo = Math.ceil(totales.total * estado.parametros.ventas.abonoMinimoSeparado);
      exigir(
        pagado >= minimo,
        'ABONO_INSUFICIENTE',
        `El abono inicial debe ser de al menos ${pesos(minimo)}.`,
        'pagos',
      );
      exigir(
        pagado < totales.total,
        'SEPARADO_PAGADO',
        'Si paga todo, regístrala como venta de contado.',
        'pagos',
      );
      fechaValida(d.fechaLimiteSeparado, 'fechaLimiteSeparado');
      const limite = d.fechaLimiteSeparado as string;
      exigir(
        limite >= hoy && limite <= sumarDias(hoy, estado.parametros.ventas.diasMaximoSeparado),
        'FECHA_LIMITE',
        `La fecha límite debe estar dentro de los próximos ${estado.parametros.ventas.diasMaximoSeparado} días.`,
        'fechaLimiteSeparado',
      );
      separado = { fechaLimite: limite, cerrado: null };
    } else {
      exigir(clienteId, 'CLIENTE_REQUERIDO', 'Una venta a crédito necesita el cliente.', 'clienteId');
      exigir(pagado <= totales.total, 'PAGO_EXCEDE', 'Los pagos superan el total de la venta.', 'pagos');
    }

    // Cambio: la venta nueva de una devolución con cambio
    let devolucionCambioId: Id | null = null;
    if (d.ventaOrigenCambioId) {
      requerirExiste(estado.ventas, d.ventaOrigenCambioId, 'la venta original', 'ventaOrigenCambioId');
      devolucionCambioId =
        devolucionesDe(estado, d.ventaOrigenCambioId).find(
          (x) => x.compensacion === 'cambio' && x.ventaCambioId === null,
        )?.id ?? null;
    }

    const consecutivo = leerConsecutivo(estado, 'venta');
    const lineas: LineaVenta[] = entradas.map((e, i) => {
      const c = calculadas[i];
      const color = estado.colores[e.v.colorId];
      return {
        id: idHijo(d.ventaId, `l${i + 1}`),
        productoId: e.p.id,
        varianteId: e.v.id,
        sku: e.v.sku,
        descripcion: `${e.p.nombre} · ${color?.nombre ?? ''} · ${e.v.talla}`,
        cantidad: e.cantidad,
        precioLista: e.precio,
        descuentoLinea: e.descuento,
        descuentoAsignado: c?.descuentoAsignado ?? 0,
        totalFinal: c?.totalFinal ?? 0,
        base: c?.base ?? 0,
        iva: c?.iva ?? 0,
        costoUnitario: e.p.costoVigente,
      };
    });
    const venta: Venta = {
      ...traza(ctx, ts),
      id: d.ventaId,
      numero: numeroDocumento('V', consecutivo, 6),
      ts,
      localId: local.id,
      vendedorId: vendedor.id,
      clienteId,
      canal: d.canal,
      tipo: d.tipo,
      lineas,
      descuentoGlobal: d.descuentoGlobal,
      aprobacionDescuentoId: solicitudUsadaId,
      subtotal: totales.subtotal,
      descuentos: totales.descuentos,
      total: totales.total,
      base: totales.base,
      iva: totales.iva,
      pagos: [],
      separado,
      anulacion: null,
      facturaId: d.facturaInmediata?.facturaId ?? null,
      ventaOrigenCambioId: d.ventaOrigenCambioId,
      nota: d.nota,
    };
    const movs: MovPlan[] = lineas.map((l, i) => ({
      id: idHijo(d.ventaId, `m${i + 1}`),
      ts,
      varianteId: l.varianteId,
      productoId: l.productoId,
      localId: local.id,
      cantidad: -l.cantidad,
      tipo: d.tipo === 'separado' ? 'salida_separado' : 'salida_venta',
      costoUnitario: l.costoUnitario,
      documento: { tipo: 'venta', id: d.ventaId },
    }));
    let documento: PlanDocumento | null = null;
    if (d.facturaInmediata) {
      idNuevo(estado.facturas, d.facturaInmediata.facturaId, 'facturaInmediata');
      documento = planearFactura(estado, ctx, { ...d.facturaInmediata, ventaId: d.ventaId, ts, totales });
    }
    const notificacion: Notificacion | null =
      d.canal === 'web'
        ? {
            id: idHijo(d.ventaId, 'n'),
            ts,
            tipo: 'venta_web',
            titulo: `Nueva venta en la tienda web: ${pesos(totales.total)}`,
            detalle: `${lineas.length === 1 ? (lineas[0]?.descripcion ?? '') : `${lineas.length} prendas`} · sale de ${local.nombre}`,
            severidad: 'info',
            enlace: rutasDominio.venta(d.ventaId),
            origen: { tipo: 'venta', id: d.ventaId },
          }
        : null;
    return {
      venta,
      pagos,
      movs,
      cliente,
      solicitudUsadaId,
      documento,
      notificacion,
      consecutivo,
      devolucionCambioId,
    };
  },
  escribir(estado, plan, ctx) {
    if (plan.cliente) {
      estado.clientes[plan.cliente.id] = plan.cliente;
      ctx.emitir({ tipo: 'ClienteCreado', clienteId: plan.cliente.id, origen: plan.cliente.canalAlta });
    }
    estado.ventas[plan.venta.id] = plan.venta;
    for (const p of plan.pagos) agregarPagoVenta(estado, plan.venta.id, p);
    fijarConsecutivo(estado, 'venta', plan.consecutivo);
    const cambios = aplicarMovimientos(estado, plan.movs, ctx);
    if (plan.solicitudUsadaId) {
      const s = estado.solicitudes[plan.solicitudUsadaId];
      if (s) s.usadaEnVentaId = plan.venta.id;
    }
    if (plan.devolucionCambioId) {
      const dev = estado.devoluciones[plan.devolucionCambioId];
      if (dev) dev.ventaCambioId = plan.venta.id;
    }
    if (plan.documento) {
      estado.facturas[plan.documento.factura.id] = plan.documento.factura;
      fijarConsecutivo(estado, plan.documento.tipoConsecutivo, plan.documento.consecutivo);
    }
    if (plan.notificacion) estado.notificaciones[plan.notificacion.id] = plan.notificacion;
    const v = plan.venta;
    ctx.emitir({
      tipo: 'VentaRegistrada',
      ventaId: v.id,
      localId: v.localId,
      vendedorId: v.vendedorId,
      clienteId: v.clienteId,
      canal: v.canal,
      total: v.total,
      origen: ctx.origen,
    });
    emitirInventario(estado, ctx, cambios);
    if (plan.documento)
      ctx.emitir({ tipo: 'FacturaEmitida', facturaId: plan.documento.factura.id, ventaId: v.id });
    if (plan.notificacion) ctx.emitir({ tipo: 'NotificacionCreada', notificacionId: plan.notificacion.id });
  },
});

// ---------- venta.editar ----------

const MEDIOS_NO_EDITABLES: MedioPago[] = ['bono_regalo', 'saldo_a_favor'];

interface CambioMedio {
  pagoId: Id;
  medio: MedioPago;
  cuentaId: Id | null;
  sesionCajaId: Id | null;
}

export const ventaEditar = manejador<
  'venta.editar',
  {
    ventaId: Id;
    campos: Partial<Pick<Venta, 'clienteId' | 'vendedorId' | 'canal' | 'nota'>>;
    medios: CambioMedio[];
  }
>({
  validar(estado, d) {
    const v = requerirExiste(estado.ventas, d.ventaId, 'la venta', 'ventaId');
    exigir(!v.anulacion, 'VENTA_ANULADA', `La venta ${v.numero} está anulada.`, 'ventaId');
    const c = d.cambios;
    const campos: Partial<Pick<Venta, 'clienteId' | 'vendedorId' | 'canal' | 'nota'>> = {};
    if (c.clienteId !== undefined) {
      if (c.clienteId !== null) requerir(estado.clientes, c.clienteId, 'el cliente', 'clienteId');
      exigir(
        c.clienteId !== null || v.tipo === 'contado',
        'CLIENTE_REQUERIDO',
        'Los separados y créditos necesitan el cliente.',
        'clienteId',
      );
      campos.clienteId = c.clienteId;
    }
    if (c.vendedorId !== undefined) {
      const e = requerir(estado.empleados, c.vendedorId, 'el vendedor', 'vendedorId');
      exigir(e.cargo === 'vendedor', 'NO_ES_VENDEDOR', 'La venta va a nombre de un vendedor.', 'vendedorId');
      campos.vendedorId = e.id;
    }
    if (c.canal !== undefined) campos.canal = c.canal;
    if (c.nota !== undefined) campos.nota = c.nota;
    const medios: CambioMedio[] = (c.mediosPago ?? []).map((m) => {
      const p = v.pagos.find((x) => x.id === m.pagoId);
      exigir(p, 'NO_EXISTE', 'No encontramos ese pago.', 'mediosPago');
      exigir(
        p.tipo !== 'reembolso' &&
          !MEDIOS_NO_EDITABLES.includes(p.medio) &&
          !MEDIOS_NO_EDITABLES.includes(m.medio),
        'MEDIO_NO_EDITABLE',
        'Ese pago no se puede cambiar de medio.',
        'mediosPago',
      );
      if (p.medio === 'efectivo' && p.sesionCajaId) {
        exigir(
          estado.sesionesCaja[p.sesionCajaId]?.cierre === null,
          'CAJA_CERRADA',
          'La caja de ese día ya cerró; el efectivo no se puede cambiar de medio.',
          'mediosPago',
        );
      }
      if (m.medio === 'efectivo') {
        const s = Object.values(estado.sesionesCaja).find(
          (x) => x.localId === v.localId && x.cierre === null,
        );
        exigir(s, 'CAJA_CERRADA', 'Abre la caja del local para registrar efectivo.', 'mediosPago');
        return { pagoId: p.id, medio: m.medio, cuentaId: s.cuentaId, sesionCajaId: s.id };
      }
      const cuentaId = cuentaDeMedio(estado, m.medio, v.localId);
      exigir(
        cuentaId,
        'CUENTA_NO_CONFIGURADA',
        'Ese medio de pago no tiene una cuenta asignada.',
        'mediosPago',
      );
      return { pagoId: p.id, medio: m.medio, cuentaId, sesionCajaId: null };
    });
    exigir(
      Object.keys(campos).length > 0 || medios.length > 0,
      'SIN_CAMBIOS',
      'No hay cambios para guardar.',
      'cambios',
    );
    return { ventaId: v.id, campos, medios };
  },
  escribir(estado, plan, ctx) {
    const v = estado.ventas[plan.ventaId];
    if (!v) return;
    Object.assign(v, plan.campos);
    for (const m of plan.medios) {
      const p = v.pagos.find((x) => x.id === m.pagoId);
      if (!p) continue;
      registrarCobroEnAgregados(estado, { ...p, valor: -p.valor }, v.localId);
      p.medio = m.medio;
      p.cuentaId = m.cuentaId;
      p.sesionCajaId = m.sesionCajaId;
      if (m.medio !== 'efectivo') {
        p.recibido = null;
        p.cambio = null;
      }
      registrarCobroEnAgregados(estado, p, v.localId);
    }
    marcarEditado(v, ctx);
    ctx.emitir({
      tipo: 'VentaEditada',
      ventaId: v.id,
      campos: [...Object.keys(plan.campos), ...(plan.medios.length ? ['mediosPago'] : [])],
    });
  },
});

// ---------- venta.anular ----------

export interface PlanAnulacion {
  ventaId: Id;
  anulacion: NonNullable<Venta['anulacion']>;
  movs: MovPlan[];
  reembolso: PagoVenta | null;
  notaCredito: { nota: NotaCredito; consecutivo: number } | null;
}

export function planearAnulacion(
  estado: EstadoDominio,
  ctx: Contexto,
  d: MapaComandos['venta.anular'],
): PlanAnulacion {
  const v = requerirExiste(estado.ventas, d.ventaId, 'la venta', 'ventaId');
  exigir(!v.anulacion, 'VENTA_ANULADA', `La venta ${v.numero} ya está anulada.`, 'ventaId');
  exigir(
    v.separado?.cerrado?.resultado !== 'cancelado',
    'SEPARADO_CANCELADO',
    'Ese separado ya se canceló.',
    'ventaId',
  );
  const motivo = textoObligatorio(d.motivo, 'motivo', 'Escribe el motivo de la anulación.');
  const devuelto = devueltoPorLinea(estado, v.id);
  const movs: MovPlan[] = [];
  v.lineas.forEach((l, i) => {
    const cantidad = l.cantidad - (devuelto.get(l.id)?.cantidad ?? 0);
    if (cantidad > 0) {
      movs.push({
        id: idHijo(v.id, `a${i + 1}`),
        ts: ctx.ts,
        varianteId: l.varianteId,
        productoId: l.productoId,
        localId: v.localId,
        cantidad,
        tipo: 'reingreso_anulacion',
        costoUnitario: l.costoUnitario,
        documento: { tipo: 'venta', id: v.id },
      });
    }
  });
  let creditos = 0;
  for (const dv of devolucionesDe(estado, v.id))
    if (dv.compensacion !== 'reembolso') creditos += dv.valorTotal;
  const aDevolver = totalPagado(v) - creditos;
  let reembolso: PagoVenta | null = null;
  if (aDevolver > 0) {
    exigir(
      d.reembolso,
      'REEMBOLSO_REQUERIDO',
      `Indica cómo se devuelven ${pesos(aDevolver)} al cliente.`,
      'reembolso',
    );
    reembolso = planearReembolso(estado, d.reembolso, {
      id: siguientePagoId(v),
      ts: ctx.ts,
      valor: aDevolver,
      localId: v.localId,
      clienteId: v.clienteId,
      campo: 'reembolso',
    });
  }
  let notaCredito: PlanAnulacion['notaCredito'] = null;
  if (v.facturaId) {
    exigir(
      d.notaCreditoId,
      'NOTA_CREDITO_REQUERIDA',
      'La venta tiene factura: se emite una nota crédito.',
      'notaCreditoId',
    );
    const f = requerirExiste(estado.facturas, v.facturaId, 'la factura', 'facturaId');
    let yaAcreditado = 0;
    let baseAcreditada = 0;
    for (const n of Object.values(estado.notasCredito))
      if (n.facturaId === f.id) {
        yaAcreditado += n.valor;
        baseAcreditada += n.base;
      }
    const valor = f.total - yaAcreditado;
    if (valor > 0) {
      const base = f.base - baseAcreditada;
      notaCredito = planearNotaCredito(estado, ctx, {
        notaId: d.notaCreditoId,
        facturaId: f.id,
        devolucionId: null,
        motivo: `Anulación: ${motivo}`,
        base,
        iva: valor - base,
        valor,
        ts: ctx.ts,
      });
    }
  }
  return {
    ventaId: v.id,
    anulacion: { ts: ctx.ts, motivo, usuarioId: ctx.usuarioId, solicitudId: d.solicitudId },
    movs,
    reembolso,
    notaCredito,
  };
}

export function escribirAnulacion(estado: EstadoDominio, plan: PlanAnulacion, ctx: Contexto): void {
  const v = estado.ventas[plan.ventaId];
  if (!v) return;
  v.anulacion = plan.anulacion;
  if (plan.reembolso) agregarPagoVenta(estado, v.id, plan.reembolso);
  const cambios = aplicarMovimientos(estado, plan.movs, ctx);
  if (plan.notaCredito) {
    estado.notasCredito[plan.notaCredito.nota.id] = plan.notaCredito.nota;
    fijarConsecutivo(estado, 'nota_credito', plan.notaCredito.consecutivo);
  }
  marcarEditado(v, ctx);
  ctx.emitir({ tipo: 'VentaAnulada', ventaId: v.id });
  emitirInventario(estado, ctx, cambios);
  if (plan.notaCredito) ctx.emitir({ tipo: 'NotaCreditoEmitida', notaId: plan.notaCredito.nota.id });
}

export const ventaAnular = manejador<'venta.anular', PlanAnulacion>({
  validar(estado, d, ctx) {
    if (d.solicitudId) {
      const s = requerirExiste(estado.solicitudes, d.solicitudId, 'la solicitud', 'solicitudId');
      exigir(
        s.datos.tipo === 'anulacion' && s.datos.ventaId === d.ventaId,
        'SOLICITUD_INVALIDA',
        'La solicitud no corresponde a esta venta.',
        'solicitudId',
      );
    }
    return planearAnulacion(estado, ctx, d);
  },
  escribir(estado, plan, ctx) {
    escribirAnulacion(estado, plan, ctx);
  },
});

// ---------- venta.abonar ----------

export const ventaAbonar = manejador<
  'venta.abonar',
  { ventaId: Id; pago: PagoVenta; saldo: number; completa: boolean }
>({
  validar(estado, d, ctx) {
    const v = requerirExiste(estado.ventas, d.ventaId, 'la venta', 'ventaId');
    exigir(!v.anulacion, 'VENTA_ANULADA', `La venta ${v.numero} está anulada.`, 'ventaId');
    exigir(
      v.tipo === 'separado' || v.tipo === 'credito',
      'NO_ABONABLE',
      'Solo se abona a separados y ventas a crédito.',
      'ventaId',
    );
    exigir(!v.separado?.cerrado, 'SEPARADO_CERRADO', 'Ese separado ya está cerrado.', 'ventaId');
    const saldo = saldoDe(estado, v);
    exigir(saldo > 0, 'SIN_SALDO', 'Esa venta no tiene saldo pendiente.', 'ventaId');
    exigir(d.pago.valor <= saldo, 'ABONO_EXCEDE', `El saldo es de ${pesos(saldo)}.`, 'pago');
    const pago = planearCobro(estado, ctx, d.pago, {
      id: siguientePagoId(v),
      ts: ctx.ts,
      tipo: 'abono',
      localId: v.localId,
      canal: v.canal,
      clienteId: v.clienteId,
      uso: nuevoUso(),
      campo: 'pago',
    });
    const nuevoSaldo = saldo - pago.valor;
    return { ventaId: v.id, pago, saldo: nuevoSaldo, completa: v.tipo === 'separado' && nuevoSaldo === 0 };
  },
  escribir(estado, plan, ctx) {
    const v = estado.ventas[plan.ventaId];
    if (!v) return;
    agregarPagoVenta(estado, v.id, plan.pago);
    if (plan.completa && v.separado) v.separado.cerrado = { ts: ctx.ts, resultado: 'completado' };
    marcarEditado(v, ctx);
    ctx.emitir({ tipo: 'AbonoRegistrado', ventaId: v.id, valor: plan.pago.valor, saldo: plan.saldo });
    if (plan.completa) ctx.emitir({ tipo: 'SeparadoCerrado', ventaId: v.id, resultado: 'completado' });
  },
});

// ---------- separado.cancelar ----------

export const separadoCancelar = manejador<
  'separado.cancelar',
  { ventaId: Id; movs: MovPlan[]; reembolso: PagoVenta | null }
>({
  validar(estado, d, ctx) {
    const v = requerirExiste(estado.ventas, d.ventaId, 'el separado', 'ventaId');
    exigir(
      v.tipo === 'separado' && v.separado && !v.separado.cerrado && !v.anulacion,
      'SEPARADO_INACTIVO',
      'Ese separado ya no está activo.',
      'ventaId',
    );
    exigir(
      d.destinoAbonos === 'reembolso' || v.clienteId,
      'CLIENTE_REQUERIDO',
      'El saldo a favor necesita el cliente.',
      'destinoAbonos',
    );
    const devuelto = devueltoPorLinea(estado, v.id);
    const movs: MovPlan[] = v.lineas
      .map((l, i): MovPlan | null => {
        const cantidad = l.cantidad - (devuelto.get(l.id)?.cantidad ?? 0);
        return cantidad > 0
          ? {
              id: idHijo(v.id, `c${i + 1}`),
              ts: ctx.ts,
              varianteId: l.varianteId,
              productoId: l.productoId,
              localId: v.localId,
              cantidad,
              tipo: 'reingreso_separado',
              costoUnitario: l.costoUnitario,
              documento: { tipo: 'venta', id: v.id },
            }
          : null;
      })
      .filter((m): m is MovPlan => m !== null);
    let reembolso: PagoVenta | null = null;
    const abonado = totalPagado(v);
    if (d.destinoAbonos === 'reembolso' && abonado > 0) {
      exigir(d.reembolso, 'REEMBOLSO_REQUERIDO', `Indica cómo se devuelven ${pesos(abonado)}.`, 'reembolso');
      reembolso = planearReembolso(estado, d.reembolso, {
        id: siguientePagoId(v),
        ts: ctx.ts,
        valor: abonado,
        localId: v.localId,
        clienteId: v.clienteId,
        campo: 'reembolso',
      });
    }
    return { ventaId: v.id, movs, reembolso };
  },
  escribir(estado, plan, ctx) {
    const v = estado.ventas[plan.ventaId];
    if (!v || !v.separado) return;
    if (plan.reembolso) agregarPagoVenta(estado, v.id, plan.reembolso);
    v.separado.cerrado = { ts: ctx.ts, resultado: 'cancelado' };
    const cambios = aplicarMovimientos(estado, plan.movs, ctx);
    marcarEditado(v, ctx);
    ctx.emitir({ tipo: 'SeparadoCerrado', ventaId: v.id, resultado: 'cancelado' });
    emitirInventario(estado, ctx, cambios);
  },
});

// ---------- devolucion.registrar ----------

interface PlanDevolucion {
  devolucion: Devolucion;
  movs: MovPlan[];
  reembolso: PagoVenta | null;
  notaCredito: { nota: NotaCredito; consecutivo: number } | null;
  cliente: Cliente | null;
  consecutivo: number;
}

export const devolucionRegistrar = manejador<'devolucion.registrar', PlanDevolucion>({
  validar(estado, d, ctx) {
    idNuevo(estado.devoluciones, d.devolucionId, 'devolucionId');
    const v = requerirExiste(estado.ventas, d.ventaId, 'la venta', 'ventaId');
    exigir(!v.anulacion, 'VENTA_ANULADA', `La venta ${v.numero} está anulada.`, 'ventaId');
    exigir(
      v.tipo !== 'separado' || v.separado?.cerrado?.resultado === 'completado',
      'SEPARADO_ACTIVO',
      'Un separado activo se cancela; no se devuelve.',
      'ventaId',
    );
    if (ctx.origen === 'usuario') {
      const dias = diferenciaDias(fechaDe(v.ts), fechaDe(ctx.ts));
      exigir(
        dias <= estado.parametros.ventas.diasMaximoDevolucion,
        'FUERA_DE_PLAZO',
        `Pasaron ${dias} días desde la venta; el plazo de devolución es de ${estado.parametros.ventas.diasMaximoDevolucion}.`,
        'ventaId',
      );
    }
    const motivo = textoObligatorio(d.motivo, 'motivo', 'Escribe el motivo de la devolución.');
    exigir(d.lineas.length > 0, 'SIN_LINEAS', 'Elige qué prendas se devuelven.', 'lineas');

    let cliente: Cliente | null = null;
    let clienteId = v.clienteId;
    if (d.clienteNuevo) {
      exigir(v.clienteId === null, 'CLIENTE_EXISTENTE', 'La venta ya tiene cliente.', 'clienteNuevo');
      const { clienteId: nuevoId, ...datos } = d.clienteNuevo;
      idNuevo(estado.clientes, nuevoId, 'clienteNuevo');
      validarDatosCliente(estado, datos, true, null);
      cliente = construirCliente(nuevoId, datos, ctx);
      clienteId = nuevoId;
    }
    if (d.compensacion !== 'reembolso') {
      exigir(
        clienteId,
        'CLIENTE_REQUERIDO',
        'El saldo a favor y el cambio necesitan el cliente. A consumidor final solo se le reembolsa.',
        'compensacion',
      );
    }

    const devuelto = devueltoPorLinea(estado, v.id);
    const vistas = new Set<Id>();
    const lineas: Devolucion['lineas'] = d.lineas.map((x) => {
      const l = v.lineas.find((y) => y.id === x.lineaId);
      exigir(l, 'NO_EXISTE', 'Esa prenda no está en la venta.', 'lineas');
      exigir(!vistas.has(l.id), 'DUPLICADOS', 'Hay una prenda repetida en la devolución.', 'lineas');
      vistas.add(l.id);
      enteroPositivo(x.cantidad, 'lineas', 'Las cantidades deben ser mayores que cero.');
      const ya = devuelto.get(l.id) ?? { cantidad: 0, valor: 0, base: 0, iva: 0, costo: 0 };
      exigir(
        x.cantidad <= l.cantidad - ya.cantidad,
        'CANTIDAD_EXCEDE',
        `De ${l.descripcion} se pueden devolver ${l.cantidad - ya.cantidad}.`,
        'lineas',
      );
      const val = valoresDevolucionLinea(l, x.cantidad, ya);
      return {
        lineaId: l.id,
        varianteId: l.varianteId,
        cantidad: x.cantidad,
        valor: val.valor,
        base: val.base,
        iva: val.iva,
        costo: val.costo,
        reingresa: x.reingresa,
      };
    });
    const valorTotal = lineas.reduce((a, l) => a + l.valor, 0);

    let reembolso: PagoVenta | null = null;
    let reembolsoDatos: Devolucion['reembolso'] = null;
    if (d.compensacion === 'reembolso') {
      exigir(d.reembolso, 'REEMBOLSO_REQUERIDO', 'Indica cómo se devuelve la plata.', 'reembolso');
      exigir(
        totalPagado(v) >= valorTotal,
        'PAGOS_INSUFICIENTES',
        'La venta no tiene pagos suficientes para reembolsar; deja la diferencia como saldo a favor.',
        'compensacion',
      );
      reembolso = planearReembolso(estado, d.reembolso, {
        id: siguientePagoId(v),
        ts: ctx.ts,
        valor: valorTotal,
        localId: v.localId,
        clienteId,
        campo: 'reembolso',
      });
      reembolsoDatos = {
        medio: reembolso.medio,
        cuentaId: reembolso.cuentaId,
        sesionCajaId: reembolso.sesionCajaId,
      };
    }
    let notaCredito: PlanDevolucion['notaCredito'] = null;
    if (v.facturaId) {
      exigir(
        d.notaCreditoId,
        'NOTA_CREDITO_REQUERIDA',
        'La venta tiene factura: se emite una nota crédito.',
        'notaCreditoId',
      );
      const base = lineas.reduce((a, l) => a + l.base, 0);
      notaCredito = planearNotaCredito(estado, ctx, {
        notaId: d.notaCreditoId,
        facturaId: v.facturaId,
        devolucionId: d.devolucionId,
        motivo,
        base,
        iva: valorTotal - base,
        valor: valorTotal,
        ts: ctx.ts,
      });
    }
    const movs: MovPlan[] = lineas
      .filter((l) => l.reingresa)
      .map((l, i) => ({
        id: idHijo(d.devolucionId, `m${i + 1}`),
        ts: ctx.ts,
        varianteId: l.varianteId,
        productoId: estado.variantes[l.varianteId]?.productoId ?? '',
        localId: v.localId,
        cantidad: l.cantidad,
        tipo: 'devolucion_cliente',
        costoUnitario: l.cantidad > 0 ? Math.round(l.costo / l.cantidad) : 0,
        documento: { tipo: 'devolucion', id: d.devolucionId },
      }));
    const consecutivo = leerConsecutivo(estado, 'devolucion');
    return {
      consecutivo,
      cliente,
      movs,
      reembolso,
      notaCredito,
      devolucion: {
        ...traza(ctx),
        id: d.devolucionId,
        numero: numeroDocumento('DV', consecutivo, 6),
        ventaId: v.id,
        ts: ctx.ts,
        localId: v.localId,
        lineas,
        motivo,
        compensacion: d.compensacion,
        valorTotal,
        reembolso: reembolsoDatos,
        notaCreditoId: notaCredito?.nota.id ?? null,
        ventaCambioId: null,
        usuarioId: ctx.usuarioId,
      },
    };
  },
  escribir(estado, plan, ctx) {
    const v = estado.ventas[plan.devolucion.ventaId];
    if (!v) return;
    if (plan.cliente) {
      estado.clientes[plan.cliente.id] = plan.cliente;
      v.clienteId = plan.cliente.id;
      ctx.emitir({ tipo: 'ClienteCreado', clienteId: plan.cliente.id, origen: plan.cliente.canalAlta });
    }
    estado.devoluciones[plan.devolucion.id] = plan.devolucion;
    fijarConsecutivo(estado, 'devolucion', plan.consecutivo);
    if (plan.reembolso) agregarPagoVenta(estado, v.id, plan.reembolso);
    const cambios = aplicarMovimientos(estado, plan.movs, ctx);
    if (plan.notaCredito) {
      estado.notasCredito[plan.notaCredito.nota.id] = plan.notaCredito.nota;
      fijarConsecutivo(estado, 'nota_credito', plan.notaCredito.consecutivo);
    }
    ctx.emitir({
      tipo: 'DevolucionRegistrada',
      devolucionId: plan.devolucion.id,
      ventaId: v.id,
      valor: plan.devolucion.valorTotal,
    });
    emitirInventario(estado, ctx, cambios);
    if (plan.notaCredito) ctx.emitir({ tipo: 'NotaCreditoEmitida', notaId: plan.notaCredito.nota.id });
  },
});

// ---------- pago.conciliar ----------

export const pagoConciliar = manejador<'pago.conciliar', MapaComandos['pago.conciliar']>({
  validar(estado, d) {
    exigir(d.refs.length > 0, 'SIN_REFERENCIAS', 'Elige al menos un movimiento.', 'refs');
    for (const r of d.refs) {
      if (r.tipo === 'pago_venta') {
        const v = requerirExiste(estado.ventas, r.ventaId, 'la venta', 'refs');
        exigir(
          v.pagos.some((p) => p.id === r.pagoId),
          'NO_EXISTE',
          'No encontramos ese pago.',
          'refs',
        );
      } else requerirExiste(estado.movimientosCuenta, r.movimientoId, 'el movimiento', 'refs');
    }
    return { refs: d.refs.map((r) => ({ ...r })), conciliado: d.conciliado };
  },
  escribir(estado, plan, ctx) {
    for (const r of plan.refs) {
      if (r.tipo === 'pago_venta') {
        const p = estado.ventas[r.ventaId]?.pagos.find((x) => x.id === r.pagoId);
        if (p) p.conciliado = plan.conciliado;
      } else {
        const m = estado.movimientosCuenta[r.movimientoId];
        if (m) m.conciliado = plan.conciliado;
      }
    }
    const primera = plan.refs[0];
    if (primera) {
      ctx.emitir({
        tipo: 'EntidadCambiada',
        coleccion: primera.tipo === 'pago_venta' ? 'ventas' : 'movimientosCuenta',
        id: primera.tipo === 'pago_venta' ? primera.ventaId : primera.movimientoId,
        accion: 'editada',
      });
    }
  },
});

// ---------- Aprobaciones ----------

export const aprobacionSolicitar = manejador<
  'aprobacion.solicitar',
  { solicitud: SolicitudAprobacion; notificacion: Notificacion }
>({
  validar(estado, d, ctx) {
    idNuevo(estado.solicitudes, d.solicitudId, 'solicitudId');
    const datos = d.datos;
    const persona = personaQueActua(estado, ctx, null);
    let resumen: string;
    if (datos.tipo === 'descuento') {
      requerir(estado.locales, datos.localId, 'el local', 'localId');
      const vendedor = requerir(estado.empleados, datos.vendedorId, 'el vendedor', 'vendedorId');
      exigir(datos.varianteIds.length > 0, 'SIN_LINEAS', 'Indica las prendas del descuento.', 'varianteIds');
      const primera = requerir(estado.variantes, datos.varianteIds[0], 'la prenda', 'varianteIds');
      for (const id of datos.varianteIds) requerir(estado.variantes, id, 'la prenda', 'varianteIds');
      enteroPositivo(datos.valorLista, 'valorLista', 'El valor de lista debe ser mayor que cero.');
      exigir(
        datos.porcentaje > estado.parametros.ventas.descuentoMaximoVendedor && datos.porcentaje <= 1,
        'NO_REQUIERE_APROBACION',
        `Hasta ${porcentajeTexto(estado.parametros.ventas.descuentoMaximoVendedor)} no necesitas aprobación.`,
        'porcentaje',
      );
      exigir(
        datos.valorFinal === redondear(datos.valorLista * (1 - datos.porcentaje)),
        'VALOR_INCONSISTENTE',
        'El valor final no corresponde al descuento.',
        'valorFinal',
      );
      textoObligatorio(datos.motivo, 'motivo', 'Escribe el motivo del descuento.');
      const producto = estado.productos[primera.productoId];
      resumen = `${nombrePersona(estado, vendedor.id)} pide ${porcentajeTexto(datos.porcentaje)} de descuento · ${producto?.nombre ?? 'prendas'}${datos.varianteIds.length > 1 ? ` y ${datos.varianteIds.length - 1} más` : ''} · ${pesos(datos.valorLista)} → ${pesos(datos.valorFinal)}`;
    } else {
      const v = requerirExiste(estado.ventas, datos.ventaId, 'la venta', 'ventaId');
      exigir(!v.anulacion, 'VENTA_ANULADA', `La venta ${v.numero} ya está anulada.`, 'ventaId');
      const motivo = textoObligatorio(datos.motivo, 'motivo', 'Escribe el motivo de la anulación.');
      if (ctx.actor === 'vendedor') {
        exigir(
          estado.usuarios[ctx.usuarioId]?.empleadoId === v.vendedorId,
          'VENTA_AJENA',
          'Solo puedes pedir la anulación de tus ventas.',
          'ventaId',
        );
      }
      const pendiente = Object.values(estado.solicitudes).some(
        (s) => s.estado === 'pendiente' && s.datos.tipo === 'anulacion' && s.datos.ventaId === v.id,
      );
      exigir(
        !pendiente,
        'SOLICITUD_PENDIENTE',
        'Ya hay una solicitud de anulación pendiente para esa venta.',
        'ventaId',
      );
      resumen = `${nombrePersona(estado, v.vendedorId)} pide anular la venta ${v.numero} · motivo: ${motivo}`;
    }
    const solicitud: SolicitudAprobacion = {
      ...traza(ctx),
      id: d.solicitudId,
      tipo: datos.tipo,
      estado: 'pendiente',
      solicitadoPor: ctx.usuarioId === 'sistema' ? persona : ctx.usuarioId,
      ts: ctx.ts,
      resumen,
      datos: { ...datos } as SolicitudAprobacion['datos'],
      resolucion: null,
      usadaEnVentaId: null,
    };
    const notificacion: Notificacion = {
      id: idHijo(d.solicitudId, 'n'),
      ts: ctx.ts,
      tipo: 'aprobacion_solicitada',
      titulo:
        datos.tipo === 'descuento'
          ? 'Solicitud de descuento para aprobar'
          : 'Solicitud de anulación para aprobar',
      detalle: resumen,
      severidad: 'atencion',
      enlace: rutasDominio.aprobaciones(),
      origen: null,
    };
    return { solicitud, notificacion };
  },
  escribir(estado, plan, ctx) {
    estado.solicitudes[plan.solicitud.id] = plan.solicitud;
    estado.notificaciones[plan.notificacion.id] = plan.notificacion;
    ctx.emitir({ tipo: 'AprobacionSolicitada', solicitudId: plan.solicitud.id });
    ctx.emitir({ tipo: 'NotificacionCreada', notificacionId: plan.notificacion.id });
  },
});

export const aprobacionResolver = manejador<
  'aprobacion.resolver',
  {
    solicitudId: Id;
    decision: 'aprobada' | 'rechazada';
    nota: string | null;
    anulacion: PlanAnulacion | null;
  }
>({
  validar(estado, d, ctx) {
    const s = requerirExiste(estado.solicitudes, d.solicitudId, 'la solicitud', 'solicitudId');
    exigir(s.estado === 'pendiente', 'YA_RESUELTA', 'Esa solicitud ya se resolvió.', 'solicitudId');
    exigir(
      d.decision === 'aprobada' || d.decision === 'rechazada',
      'DECISION_INVALIDA',
      'Aprueba o rechaza la solicitud.',
      'decision',
    );
    let anulacion: PlanAnulacion | null = null;
    if (s.datos.tipo === 'traslado') {
      const t = requerirExiste(estado.traslados, s.datos.trasladoId, 'el traslado', 'solicitudId');
      exigir(
        t.estado === 'solicitado',
        'ESTADO_INVALIDO',
        `El traslado ${t.numero} ya no está solicitado.`,
        'solicitudId',
      );
    }
    if (s.datos.tipo === 'anulacion' && d.decision === 'aprobada') {
      const venta = estado.ventas[s.datos.ventaId];
      anulacion = planearAnulacion(estado, ctx, {
        ventaId: s.datos.ventaId,
        motivo: s.datos.motivo,
        reembolso: s.datos.reembolso,
        notaCreditoId: venta?.facturaId ? idHijo(s.id, 'nc') : null,
        solicitudId: s.id,
      });
    }
    return { solicitudId: s.id, decision: d.decision, nota: d.nota, anulacion };
  },
  escribir(estado, plan, ctx) {
    const s = estado.solicitudes[plan.solicitudId];
    if (!s) return;
    s.estado = plan.decision;
    s.resolucion = { ts: ctx.ts, por: ctx.usuarioId, nota: plan.nota };
    if (s.datos.tipo === 'traslado') {
      const t = estado.traslados[s.datos.trasladoId];
      if (t) {
        t.aprobacion = plan.decision;
        if (plan.decision === 'aprobada') t.fechas.aprobado = ctx.ts;
        else {
          t.estado = 'cancelado';
          t.fechas.cancelado = ctx.ts;
        }
        marcarEditado(t, ctx);
        ctx.emitir({ tipo: 'TrasladoCambiado', trasladoId: t.id, estado: t.estado });
      }
    }
    if (plan.anulacion) escribirAnulacion(estado, plan.anulacion, ctx);
    ctx.emitir({ tipo: 'AprobacionResuelta', solicitudId: s.id });
  },
});

// ---------- Bonos de regalo ----------

export const bonoVender = manejador<
  'bono.vender',
  { bono: BonoRegalo; mov: MovimientoCuenta | null; cobro: PagoVenta; consecutivo: number | null }
>({
  validar(estado, d, ctx) {
    idNuevo(estado.bonos, d.bonoId, 'bonoId');
    enteroPositivo(d.valor, 'valor', 'El valor del bono debe ser mayor que cero.');
    const local = requerir(estado.locales, d.localId, 'el local', 'localId');
    exigir(local.vende, 'LOCAL_NO_VENDE', `${local.nombre} no vende.`, 'localId');
    exigir(
      d.pago.medio !== 'bono_regalo' && d.pago.medio !== 'saldo_a_favor',
      'MEDIO_INVALIDO',
      'Un bono no se paga con otro bono ni con saldo a favor.',
      'pago',
    );
    exigir(d.pago.valor === d.valor, 'PAGO_INCOMPLETO', 'El pago debe ser igual al valor del bono.', 'pago');
    fechaValida(d.vence, 'vence');
    exigir(d.vence > ctx.hoy, 'FECHA_INVALIDA', 'El bono debe vencer después de hoy.', 'vence');
    const cobro = planearCobro(estado, ctx, d.pago, {
      id: idHijo(d.bonoId, 'p'),
      ts: ctx.ts,
      tipo: 'pago',
      localId: local.id,
      canal: 'local',
      clienteId: null,
      uso: nuevoUso(),
      campo: 'pago',
    });
    let codigo = d.codigo?.trim() ?? '';
    let consecutivo: number | null = null;
    if (!codigo) {
      consecutivo = leerConsecutivo(estado, 'bono');
      codigo = numeroDocumento('BR', consecutivo, 6);
    }
    exigir(
      !Object.values(estado.bonos).some((b) => b.codigo === codigo),
      'CODIGO_DUPLICADO',
      `Ya existe el bono ${codigo}.`,
      'codigo',
    );
    const medio = d.pago.medio as BonoRegalo['pago']['medio'];
    return {
      cobro,
      consecutivo,
      bono: {
        ...traza(ctx),
        id: d.bonoId,
        codigo,
        valor: d.valor,
        localId: local.id,
        vendidoEn: ctx.ts,
        pago: { medio, cuentaId: cobro.cuentaId, sesionCajaId: cobro.sesionCajaId },
        vence: d.vence,
      },
      mov: cobro.cuentaId
        ? {
            ...traza(ctx),
            id: idHijo(d.bonoId, 'm'),
            cuentaId: cobro.cuentaId,
            ts: ctx.ts,
            valor: d.valor,
            tipo: 'venta_bono',
            descripcion: `Venta del bono ${codigo}`,
            documento: { tipo: 'bono', id: d.bonoId },
            contraparte: null,
            montoOrigen: null,
            transferenciaId: null,
            conciliado: false,
          }
        : null,
    };
  },
  escribir(estado, plan, ctx) {
    estado.bonos[plan.bono.id] = plan.bono;
    if (plan.mov) agregarMovimientoCuenta(estado, plan.mov);
    // Efectivo de la sesión y datáfono del día (el saldo de la cuenta ya lo movió el movimiento).
    registrarCobroEnAgregados(estado, { ...plan.cobro, cuentaId: null }, plan.bono.localId);
    if (plan.consecutivo !== null) fijarConsecutivo(estado, 'bono', plan.consecutivo);
    ctx.emitir({ tipo: 'BonoVendido', bonoId: plan.bono.id, valor: plan.bono.valor });
  },
});

// ---------- Datáfono ----------

export const datafonoRegistrarAbono = manejador<
  'datafono.registrarAbono',
  { abono: AbonoDatafono; movs: MovimientoCuenta[]; gasto: Gasto }
>({
  validar(estado, d, ctx) {
    idNuevo(estado.abonosDatafono, d.abonoId, 'abonoId');
    const local = requerir(estado.locales, d.localId, 'el local', 'localId');
    fechaValida(d.ventasDe, 'ventasDe');
    fechaValida(d.fecha, 'fecha');
    exigir(d.fecha >= d.ventasDe, 'FECHA_INVALIDA', 'El abono llega después de las ventas.', 'fecha');
    const destino = requerir(estado.cuentas, d.cuentaDestinoId, 'la cuenta de destino', 'cuentaDestinoId');
    const puenteId = estado.parametros.ventas.cuentaPorMedio.datafono_debito;
    exigir(
      typeof puenteId === 'string' && estado.cuentas[puenteId],
      'CUENTA_NO_CONFIGURADA',
      'Falta la cuenta puente del datáfono.',
      'cuentaDestinoId',
    );
    exigir(
      !Object.values(estado.abonosDatafono).some((a) => a.localId === local.id && a.ventasDe === d.ventasDe),
      'ABONO_DUPLICADO',
      `El abono del datáfono de ${local.nombre} del ${d.ventasDe} ya está registrado.`,
      'ventasDe',
    );
    const cobrado = estado.agregados.datafonoDia[claveDatafono(local.id, d.ventasDe)] ?? {
      debito: 0,
      credito: 0,
    };
    const calc = calcularAbonoDatafono(
      cobrado,
      estado.parametros.datafono,
      estado.parametros.impuestos.ivaGeneral,
    );
    exigir(
      calc.bruto > 0,
      'SIN_VENTAS_DATAFONO',
      `No hay ventas con datáfono de ${local.nombre} ese día.`,
      'ventasDe',
    );
    const ts = `${d.fecha}T07:00:00`;
    const gastoId = idHijo(d.abonoId, 'g');
    idNuevo(estado.gastos, gastoId);
    const mov = (sufijo: string, cuentaId: Id, valor: number, descripcion: string): MovimientoCuenta => ({
      ...traza(ctx, ts),
      id: idHijo(d.abonoId, sufijo),
      cuentaId,
      ts,
      valor,
      tipo: 'abono_datafono',
      descripcion,
      documento: { tipo: 'abono_datafono', id: d.abonoId },
      contraparte: null,
      montoOrigen: null,
      transferenciaId: null,
      conciliado: false,
    });
    const movs = [
      mov(
        's',
        puenteId,
        -calc.bruto,
        `Liquidación del datáfono de ${local.nombre} · ventas del ${d.ventasDe}`,
      ),
      mov('e', destino.id, calc.neto, `Abono neto del datáfono de ${local.nombre}`),
    ];
    return {
      movs,
      gasto: {
        ...traza(ctx, ts),
        id: gastoId,
        fecha: d.fecha,
        localId: local.id,
        categoria: 'comisiones_datafono',
        concepto: `Comisión del datáfono · ventas del ${d.ventasDe}`,
        valor: calc.comision,
        iva: 0,
        proveedorId: null,
        estadoPago: 'pagado',
        medio: 'descuento en el abono',
        cuentaId: null,
        movimientoCuentaId: null,
        cuentaPorPagarId: null,
        recurrenteId: null,
        documento: { tipo: 'abono_datafono', id: d.abonoId },
        soporte: null,
      },
      abono: {
        ...traza(ctx, ts),
        id: d.abonoId,
        fecha: d.fecha,
        localId: local.id,
        ventasDe: d.ventasDe,
        bruto: calc.bruto,
        comision: calc.comision,
        retenciones: calc.retenciones,
        neto: calc.neto,
        cuentaDestinoId: destino.id,
        movimientoIds: movs.map((m) => m.id),
        gastoComisionId: gastoId,
      },
    };
  },
  escribir(estado, plan, ctx) {
    estado.abonosDatafono[plan.abono.id] = plan.abono;
    for (const m of plan.movs) agregarMovimientoCuenta(estado, m);
    estado.gastos[plan.gasto.id] = plan.gasto;
    ctx.emitir({ tipo: 'AbonoDatafonoRegistrado', abonoId: plan.abono.id, neto: plan.abono.neto });
  },
});

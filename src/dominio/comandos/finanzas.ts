import type {
  AbonoCxP,
  CategoriaCxP,
  CategoriaGasto,
  CuentaDinero,
  CuentaPorPagar,
  DatosCxP,
  EstadoDominio,
  FechaHoraISO,
  FechaISO,
  Id,
  MapaComandos,
  MovimientoCuenta,
  Trazabilidad,
} from '../tipos';
import { exigir } from '../errores';
import { idHijo } from '../motor/ids';
import { saldoCxP } from '../reglas/cuentas';
import { copDeCentavos } from '../reglas/dinero';
import { pesos } from '../reglas/texto';
import {
  enteroPositivo,
  exigirSaldoSiGenerado,
  fechaValida,
  idNuevo,
  requerir,
  tasaVigente,
  textoObligatorio,
} from './comunes';
import { crudEditar } from './crud';
import {
  type Contexto,
  agregarMovimientoCuenta,
  fijarConsecutivo,
  leerConsecutivo,
  manejador,
  marcarEditado,
  marcarEliminado,
  numeroDocumento,
  traza,
} from './tx';

/** Plata: cuentas por pagar, cuentas y movimientos (PLAN 6.12, 6.19 V7, V9, V10, 6.21). */

/** ts de un hecho con fecha: la hora del comando si es el mismo día; si no, mediodía de esa fecha. */
export function tsDeFecha(ctx: Contexto, fecha: FechaISO): FechaHoraISO {
  return fecha === ctx.hoy ? ctx.ts : `${fecha}T12:00:00`;
}

export function movimiento(
  ctx: Contexto,
  o: Omit<
    MovimientoCuenta,
    keyof Trazabilidad | 'montoOrigen' | 'transferenciaId' | 'conciliado' | 'contraparte' | 'documento'
  > &
    Partial<Pick<MovimientoCuenta, 'montoOrigen' | 'transferenciaId' | 'contraparte' | 'documento'>>,
): MovimientoCuenta {
  return {
    ...traza(ctx, o.ts),
    montoOrigen: null,
    transferenciaId: null,
    contraparte: null,
    documento: null,
    conciliado: false,
    ...o,
  };
}

export const CATEGORIA_CXP_DE_GASTO: Record<CategoriaGasto, CategoriaCxP> = {
  arriendo: 'arriendo',
  servicios: 'servicios',
  nomina: 'nomina',
  seguridad_social: 'seguridad_social',
  publicidad: 'publicidad',
  transporte: 'transporte',
  mantenimiento: 'proveedor_local',
  empaques: 'proveedor_local',
  comisiones_datafono: 'otro',
  impuestos: 'impuestos',
  otros: 'otro',
};

export function validarDatosCxP(estado: EstadoDominio, d: Partial<DatosCxP>, completo: boolean): void {
  if (completo || d.terceroNombre !== undefined)
    textoObligatorio(d.terceroNombre, 'terceroNombre', 'Escribe a quién se le debe.');
  if (completo || d.concepto !== undefined) textoObligatorio(d.concepto, 'concepto', 'Escribe el concepto.');
  if (completo || d.valor !== undefined)
    enteroPositivo(d.valor ?? 0, 'valor', 'El valor debe ser mayor que cero.');
  if (completo || d.fechaEmision !== undefined) fechaValida(d.fechaEmision, 'fechaEmision');
  if (completo || d.fechaVencimiento !== undefined) fechaValida(d.fechaVencimiento, 'fechaVencimiento');
  if (d.fechaEmision && d.fechaVencimiento)
    exigir(
      d.fechaVencimiento >= d.fechaEmision,
      'FECHA_INVALIDA',
      'El vencimiento no puede ser antes de la emisión.',
      'fechaVencimiento',
    );
  if (d.proveedorId) requerir(estado.proveedores, d.proveedorId, 'el proveedor', 'proveedorId');
  if (d.empleadoId) requerir(estado.empleados, d.empleadoId, 'el empleado', 'empleadoId');
  if (d.localId) requerir(estado.locales, d.localId, 'el local', 'localId');
}

/** Arma una cuenta por pagar nueva (la usan gastos, importaciones y nómina). */
export function nuevaCxP(ctx: Contexto, id: Id, numero: number, datos: DatosCxP): CuentaPorPagar {
  return {
    ...traza(ctx),
    ...datos,
    id,
    numero: numeroDocumento('CP', numero, 6),
    programadaPara: null,
    abonos: [],
  };
}

export const cxpCrear = manejador<'cxp.crear', { cxp: CuentaPorPagar; consecutivo: number }>({
  validar(estado, d, ctx) {
    idNuevo(estado.cuentasPorPagar, d.cxpId, 'cxpId');
    validarDatosCxP(estado, d.datos, true);
    const consecutivo = leerConsecutivo(estado, 'cuenta_por_pagar');
    return { consecutivo, cxp: nuevaCxP(ctx, d.cxpId, consecutivo, { ...d.datos }) };
  },
  escribir(estado, plan, ctx) {
    estado.cuentasPorPagar[plan.cxp.id] = plan.cxp;
    fijarConsecutivo(estado, 'cuenta_por_pagar', plan.consecutivo);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'cuentasPorPagar', id: plan.cxp.id, accion: 'creada' });
  },
});

export const cxpEditar = crudEditar<'cxp.editar', CuentaPorPagar>({
  coleccion: 'cuentasPorPagar',
  id: (d) => d.cxpId,
  nombre: 'la cuenta por pagar',
  cambios(estado, actual, d) {
    validarDatosCxP(estado, { ...actual, ...d.cambios }, false);
    if (actual.abonos.length > 0) {
      exigir(
        d.cambios.moneda === undefined || d.cambios.moneda === actual.moneda,
        'CON_ABONOS',
        'No se puede cambiar la moneda de una cuenta con abonos.',
        'moneda',
      );
      if (d.cambios.valor !== undefined) {
        const pagado = actual.valor - saldoCxP(actual);
        exigir(
          d.cambios.valor >= pagado,
          'VALOR_MENOR_PAGADO',
          'El valor no puede ser menor que lo ya pagado.',
          'valor',
        );
      }
    }
    return { ...d.cambios };
  },
});

export const cxpEliminar = manejador<'cxp.eliminar', { id: Id; motivo: string | null }>({
  validar(estado, d) {
    const c = requerir(estado.cuentasPorPagar, d.cxpId, 'la cuenta por pagar', 'cxpId');
    exigir(c.abonos.length === 0, 'CON_ABONOS', 'La cuenta ya tiene abonos; no se puede eliminar.', 'cxpId');
    return { id: c.id, motivo: d.motivo };
  },
  escribir(estado, plan, ctx) {
    const c = estado.cuentasPorPagar[plan.id];
    if (!c) return;
    marcarEliminado(c, ctx, plan.motivo);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'cuentasPorPagar', id: c.id, accion: 'eliminada' });
  },
});

export const cxpProgramar = manejador<'cxp.programar', { id: Id; fecha: FechaISO | null }>({
  validar(estado, d) {
    const c = requerir(estado.cuentasPorPagar, d.cxpId, 'la cuenta por pagar', 'cxpId');
    exigir(saldoCxP(c) > 0, 'YA_PAGADA', 'Esa cuenta ya está pagada.', 'cxpId');
    if (d.fecha !== null) fechaValida(d.fecha, 'fecha');
    return { id: c.id, fecha: d.fecha };
  },
  escribir(estado, plan, ctx) {
    const c = estado.cuentasPorPagar[plan.id];
    if (!c) return;
    c.programadaPara = plan.fecha;
    marcarEditado(c, ctx);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'cuentasPorPagar', id: c.id, accion: 'editada' });
  },
});

const MEDIOS_ABONO: AbonoCxP['medio'][] = [
  'transferencia',
  'efectivo',
  'pse',
  'giro_internacional',
  'debito_automatico',
];

export interface PlanPagoCxP {
  cxpId: Id;
  abono: AbonoCxP;
  mov: MovimientoCuenta;
  /** Gasto por pagar que queda pagado con este abono. */
  gastoPagadoId: Id | null;
}

/** Valida y arma un abono a una cuenta por pagar (cxp.pagar e importacion.registrarPago). */
export function planearPagoCxP(
  estado: EstadoDominio,
  ctx: Contexto,
  d: MapaComandos['cxp.pagar'],
  opciones: { omitirSaldo?: boolean } = {},
): PlanPagoCxP {
  const c = requerir(estado.cuentasPorPagar, d.cxpId, 'la cuenta por pagar', 'cxpId');
  const saldo = saldoCxP(c);
  exigir(saldo > 0, 'YA_PAGADA', 'Esa cuenta ya está pagada.', 'cxpId');
  exigir(!c.abonos.some((a) => a.id === d.abonoId), 'ID_DUPLICADO', 'Ese pago ya se registró.', 'abonoId');
  const cuenta = requerir(estado.cuentas, d.cuentaId, 'la cuenta de donde sale la plata', 'cuentaId');
  fechaValida(d.fecha, 'fecha');
  exigir(MEDIOS_ABONO.includes(d.medio), 'MEDIO_INVALIDO', 'Elige el medio del pago.', 'medio');
  const ts = tsDeFecha(ctx, d.fecha);
  let valorCOP: number;
  let montoOrigen: AbonoCxP['montoOrigen'] = null;
  let diferenciaCambio: number | null = null;
  if (c.moneda === 'COP') {
    exigir(d.valorCOP !== null, 'VALOR_REQUERIDO', 'Escribe el valor del pago.', 'valorCOP');
    enteroPositivo(d.valorCOP, 'valorCOP', 'El pago debe ser mayor que cero.');
    exigir(d.valorCOP <= saldo, 'PAGO_EXCEDE', `El saldo es de ${pesos(saldo)}.`, 'valorCOP');
    valorCOP = d.valorCOP;
  } else {
    exigir(
      d.centavos !== null,
      'VALOR_REQUERIDO',
      'Escribe el valor del pago en la moneda de la cuenta.',
      'centavos',
    );
    enteroPositivo(d.centavos, 'centavos', 'El pago debe ser mayor que cero.');
    exigir(d.centavos <= saldo, 'PAGO_EXCEDE', 'El pago supera el saldo de la cuenta.', 'centavos');
    const tasa = d.tasa ?? tasaVigente(estado, c.moneda, d.fecha);
    exigir(tasa !== null && tasa > 0, 'TASA_REQUERIDA', 'Escribe la tasa de cambio del pago.', 'tasa');
    valorCOP = copDeCentavos(d.centavos, tasa);
    montoOrigen = { moneda: c.moneda, centavos: d.centavos, tasa, fechaTasa: d.fecha, cop: valorCOP };
    if (c.documento?.tipo === 'importacion') {
      const imp = estado.importaciones[c.documento.id];
      if (imp) diferenciaCambio = valorCOP - copDeCentavos(d.centavos, imp.tasaPedido);
    }
  }
  if (!opciones.omitirSaldo) exigirSaldoSiGenerado(estado, ctx, cuenta.id, valorCOP);
  const movId = idHijo(d.abonoId, 'm');
  idNuevo(estado.movimientosCuenta, movId, 'abonoId');
  const mov = movimiento(ctx, {
    id: movId,
    cuentaId: cuenta.id,
    ts,
    valor: -valorCOP,
    tipo: c.categoria === 'nomina' ? 'nomina' : 'pago_cuenta_por_pagar',
    descripcion: c.concepto,
    documento: { tipo: 'cuenta_por_pagar', id: c.id },
    contraparte: c.terceroNombre,
    montoOrigen,
  });
  const quedaPagada = saldo - (c.moneda === 'COP' ? valorCOP : (d.centavos ?? 0)) <= 0;
  const gastoPagadoId = quedaPagada && c.documento?.tipo === 'gasto' ? c.documento.id : null;
  return {
    cxpId: c.id,
    mov,
    gastoPagadoId,
    abono: {
      id: d.abonoId,
      ts,
      valorCOP,
      montoOrigen,
      diferenciaCambio,
      cuentaId: cuenta.id,
      medio: d.medio,
      movimientoCuentaId: movId,
      soporte: d.soporte,
    },
  };
}

export function escribirPagoCxP(estado: EstadoDominio, plan: PlanPagoCxP, ctx: Contexto): void {
  const c = estado.cuentasPorPagar[plan.cxpId];
  if (!c) return;
  c.abonos.push(plan.abono);
  agregarMovimientoCuenta(estado, plan.mov);
  if (plan.gastoPagadoId) {
    const g = estado.gastos[plan.gastoPagadoId];
    if (g) {
      g.estadoPago = 'pagado';
      g.cuentaId = plan.abono.cuentaId;
      g.medio = plan.abono.medio;
    }
  }
  marcarEditado(c, ctx);
  ctx.emitir({ tipo: 'PagoRegistrado', cxpId: c.id, valorCOP: plan.abono.valorCOP });
}

export const cxpPagar = manejador<'cxp.pagar', PlanPagoCxP>({
  validar(estado, d, ctx) {
    return planearPagoCxP(estado, ctx, d);
  },
  escribir(estado, plan, ctx) {
    escribirPagoCxP(estado, plan, ctx);
  },
});

// ---------- Cuentas ----------

function validarDatosCuenta(estado: EstadoDominio, d: Partial<CuentaDinero>, completo: boolean): void {
  if (completo || d.nombre !== undefined)
    textoObligatorio(d.nombre, 'nombre', 'Escribe el nombre de la cuenta.');
  if (completo || d.tipo !== undefined)
    exigir(
      ['caja', 'banco', 'billetera', 'puente'].includes(d.tipo ?? ''),
      'TIPO_INVALIDO',
      'Elige el tipo de cuenta.',
      'tipo',
    );
  if (completo || d.saldoInicial !== undefined)
    exigir(
      Number.isInteger(d.saldoInicial),
      'VALOR_INVALIDO',
      'El saldo inicial va en pesos enteros.',
      'saldoInicial',
    );
  if (completo || d.fechaSaldoInicial !== undefined) fechaValida(d.fechaSaldoInicial, 'fechaSaldoInicial');
  if (d.localId) requerir(estado.locales, d.localId, 'el local', 'localId');
}

export const cuentaCrear = manejador<'cuenta.crear', CuentaDinero>({
  validar(estado, d, ctx) {
    idNuevo(estado.cuentas, d.cuentaId, 'cuentaId');
    validarDatosCuenta(estado, d.datos, true);
    return { ...traza(ctx), ...d.datos, id: d.cuentaId };
  },
  escribir(estado, cuenta, ctx) {
    estado.cuentas[cuenta.id] = cuenta;
    estado.agregados.saldosCuentas[cuenta.id] =
      (estado.agregados.saldosCuentas[cuenta.id] ?? 0) + cuenta.saldoInicial;
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'cuentas', id: cuenta.id, accion: 'creada' });
  },
});

export const cuentaEditar = manejador<
  'cuenta.editar',
  { id: Id; cambios: Partial<CuentaDinero>; delta: number }
>({
  validar(estado, d) {
    const c = requerir(estado.cuentas, d.cuentaId, 'la cuenta', 'cuentaId');
    validarDatosCuenta(estado, d.cambios, false);
    const delta = d.cambios.saldoInicial !== undefined ? d.cambios.saldoInicial - c.saldoInicial : 0;
    return { id: c.id, cambios: { ...d.cambios }, delta };
  },
  escribir(estado, plan, ctx) {
    const c = estado.cuentas[plan.id];
    if (!c) return;
    Object.assign(c, plan.cambios);
    if (plan.delta)
      estado.agregados.saldosCuentas[c.id] = (estado.agregados.saldosCuentas[c.id] ?? 0) + plan.delta;
    marcarEditado(c, ctx);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'cuentas', id: c.id, accion: 'editada' });
  },
});

export const cuentaTransferir = manejador<'cuenta.transferir', MovimientoCuenta[]>({
  validar(estado, d, ctx) {
    const origen = requerir(estado.cuentas, d.origenId, 'la cuenta de origen', 'origenId');
    const destino = requerir(estado.cuentas, d.destinoId, 'la cuenta de destino', 'destinoId');
    exigir(
      origen.id !== destino.id,
      'MISMA_CUENTA',
      'El origen y el destino deben ser distintos.',
      'destinoId',
    );
    enteroPositivo(d.valor, 'valor', 'El valor debe ser mayor que cero.');
    fechaValida(d.fecha, 'fecha');
    const descripcion = textoObligatorio(d.descripcion, 'descripcion', 'Escribe una descripción.');
    exigirSaldoSiGenerado(estado, ctx, origen.id, d.valor);
    const ts = tsDeFecha(ctx, d.fecha);
    const ids = [idHijo(d.transferenciaId, 's'), idHijo(d.transferenciaId, 'e')];
    for (const id of ids) idNuevo(estado.movimientosCuenta, id, 'transferenciaId');
    const documento = { tipo: 'transferencia' as const, id: d.transferenciaId };
    return [
      movimiento(ctx, {
        id: ids[0] ?? '',
        cuentaId: origen.id,
        ts,
        valor: -d.valor,
        tipo: 'transferencia_salida',
        descripcion,
        documento,
        transferenciaId: d.transferenciaId,
        contraparte: destino.nombre,
      }),
      movimiento(ctx, {
        id: ids[1] ?? '',
        cuentaId: destino.id,
        ts,
        valor: d.valor,
        tipo: 'transferencia_entrada',
        descripcion,
        documento,
        transferenciaId: d.transferenciaId,
        contraparte: origen.nombre,
      }),
    ];
  },
  escribir(estado, movs, ctx) {
    for (const m of movs) agregarMovimientoCuenta(estado, m);
    const primero = movs[0];
    if (primero)
      ctx.emitir({
        tipo: 'EntidadCambiada',
        coleccion: 'movimientosCuenta',
        id: primero.id,
        accion: 'creada',
      });
  },
});

export const cuentaMovimiento = manejador<'cuenta.movimiento', MovimientoCuenta>({
  validar(estado, d, ctx) {
    idNuevo(estado.movimientosCuenta, d.movimientoId, 'movimientoId');
    const c = requerir(estado.cuentas, d.cuentaId, 'la cuenta', 'cuentaId');
    fechaValida(d.fecha, 'fecha');
    const descripcion = textoObligatorio(d.descripcion, 'descripcion', 'Escribe una descripción.');
    let valor: number;
    if (d.tipo === 'ajuste') {
      exigir(
        Number.isInteger(d.valor) && d.valor !== 0,
        'VALOR_INVALIDO',
        'El ajuste debe tener valor.',
        'valor',
      );
      valor = d.valor;
    } else {
      exigir(
        ['aporte_socio', 'retiro_socio', 'otro_ingreso', 'otro_egreso'].includes(d.tipo),
        'TIPO_INVALIDO',
        'Elige el tipo de movimiento.',
        'tipo',
      );
      enteroPositivo(d.valor, 'valor', 'El valor debe ser mayor que cero.');
      valor = d.tipo === 'retiro_socio' || d.tipo === 'otro_egreso' ? -d.valor : d.valor;
    }
    if (valor < 0) exigirSaldoSiGenerado(estado, ctx, c.id, -valor);
    return movimiento(ctx, {
      id: d.movimientoId,
      cuentaId: c.id,
      ts: tsDeFecha(ctx, d.fecha),
      valor,
      tipo: d.tipo,
      descripcion,
    });
  },
  escribir(estado, mov, ctx) {
    agregarMovimientoCuenta(estado, mov);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'movimientosCuenta', id: mov.id, accion: 'creada' });
  },
});

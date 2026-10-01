import type {
  CuentaPorPagar,
  DatosGasto,
  EstadoDominio,
  Gasto,
  GastoRecurrente,
  Id,
  MovimientoCuenta,
} from '../tipos';
import { exigir } from '../errores';
import { idHijo } from '../motor/ids';
import { diasDelMes, sumarDias } from '../reglas/fechas';
import {
  enteroNoNegativo,
  enteroPositivo,
  exigirSaldoSiGenerado,
  fechaValida,
  idNuevo,
  requerir,
  textoObligatorio,
} from './comunes';
import { crudEliminar } from './crud';
import { CATEGORIA_CXP_DE_GASTO, movimiento, nuevaCxP, tsDeFecha } from './finanzas';
import {
  type Contexto,
  agregarMovimientoCuenta,
  cambiarValorMovimientoCuenta,
  fijarConsecutivo,
  leerConsecutivo,
  manejador,
  marcarEditado,
  marcarEliminado,
  traza,
} from './tx';

/** Gastos y gastos recurrentes (PLAN 6.12, 6.21). */

const CATEGORIAS: Gasto['categoria'][] = [
  'arriendo',
  'servicios',
  'nomina',
  'seguridad_social',
  'publicidad',
  'transporte',
  'mantenimiento',
  'empaques',
  'comisiones_datafono',
  'impuestos',
  'otros',
];

function validarDatosGasto(estado: EstadoDominio, d: Partial<DatosGasto>, completo: boolean): void {
  if (completo || d.fecha !== undefined) fechaValida(d.fecha, 'fecha');
  if (completo || d.concepto !== undefined)
    textoObligatorio(d.concepto, 'concepto', 'Escribe el concepto del gasto.');
  if (completo || d.categoria !== undefined)
    exigir(
      CATEGORIAS.includes(d.categoria as Gasto['categoria']),
      'CATEGORIA_INVALIDA',
      'Elige la categoría del gasto.',
      'categoria',
    );
  if (completo || d.valor !== undefined)
    enteroPositivo(d.valor ?? 0, 'valor', 'El valor del gasto debe ser mayor que cero.');
  if (completo || d.iva !== undefined) enteroNoNegativo(d.iva ?? 0, 'iva', 'El IVA no puede ser negativo.');
  if (d.valor !== undefined && d.iva !== undefined)
    exigir(d.iva <= d.valor, 'IVA_EXCEDE', 'El IVA no puede ser mayor que el valor.', 'iva');
  if (d.localId) requerir(estado.locales, d.localId, 'el local', 'localId');
  if (d.proveedorId) requerir(estado.proveedores, d.proveedorId, 'el proveedor', 'proveedorId');
}

interface PlanGastoNuevo {
  gasto: Gasto;
  mov: MovimientoCuenta | null;
  cxp: CuentaPorPagar | null;
  consecutivo: number | null;
}

/** Arma un gasto con su pago inmediato o su cuenta por pagar. */
function planearGasto(
  estado: EstadoDominio,
  ctx: Contexto,
  o: {
    gastoId: Id;
    datos: DatosGasto;
    recurrenteId: Id | null;
    pago:
      { tipo: 'inmediato'; cuentaId: Id; medio: string } | { tipo: 'por_pagar'; vence: string; cxpId: Id };
    usados?: number;
  },
): PlanGastoNuevo {
  idNuevo(estado.gastos, o.gastoId, 'gastoId');
  validarDatosGasto(estado, o.datos, true);
  const d = o.datos;
  const proveedor = d.proveedorId ? estado.proveedores[d.proveedorId] : undefined;
  const base: Gasto = {
    ...traza(ctx, tsDeFecha(ctx, d.fecha)),
    id: o.gastoId,
    fecha: d.fecha,
    localId: d.localId,
    categoria: d.categoria,
    concepto: d.concepto.trim(),
    valor: d.valor,
    iva: d.iva,
    proveedorId: d.proveedorId,
    estadoPago: 'pagado',
    medio: null,
    cuentaId: null,
    movimientoCuentaId: null,
    cuentaPorPagarId: null,
    recurrenteId: o.recurrenteId,
    documento: d.documento,
    soporte: d.soporte,
  };
  if (o.pago.tipo === 'inmediato') {
    const cuenta = requerir(estado.cuentas, o.pago.cuentaId, 'la cuenta de donde sale la plata', 'cuentaId');
    exigirSaldoSiGenerado(estado, ctx, cuenta.id, d.valor);
    const movId = idHijo(o.gastoId, 'm');
    idNuevo(estado.movimientosCuenta, movId, 'gastoId');
    const mov = movimiento(ctx, {
      id: movId,
      cuentaId: cuenta.id,
      ts: tsDeFecha(ctx, d.fecha),
      valor: -d.valor,
      tipo: 'gasto',
      descripcion: base.concepto,
      documento: { tipo: 'gasto', id: o.gastoId },
      contraparte: proveedor?.nombreCorto ?? null,
    });
    return {
      gasto: { ...base, medio: o.pago.medio, cuentaId: cuenta.id, movimientoCuentaId: movId },
      mov,
      cxp: null,
      consecutivo: null,
    };
  }
  idNuevo(estado.cuentasPorPagar, o.pago.cxpId, 'cxpId');
  fechaValida(o.pago.vence, 'vence');
  exigir(o.pago.vence >= d.fecha, 'FECHA_INVALIDA', 'El vencimiento no puede ser antes del gasto.', 'vence');
  const consecutivo = leerConsecutivo(estado, 'cuenta_por_pagar', 1 + (o.usados ?? 0));
  const cxp = nuevaCxP(ctx, o.pago.cxpId, consecutivo, {
    categoria:
      proveedor && CATEGORIA_CXP_DE_GASTO[d.categoria] === 'otro'
        ? 'proveedor_local'
        : CATEGORIA_CXP_DE_GASTO[d.categoria],
    terceroNombre: proveedor?.nombreCorto ?? base.concepto,
    proveedorId: d.proveedorId,
    empleadoId: null,
    concepto: base.concepto,
    localId: d.localId,
    moneda: 'COP',
    valor: d.valor,
    fechaEmision: d.fecha,
    fechaVencimiento: o.pago.vence,
    documento: { tipo: 'gasto', id: o.gastoId },
    soporte: d.soporte,
    nota: null,
  });
  return {
    gasto: { ...base, estadoPago: 'por_pagar', cuentaPorPagarId: cxp.id },
    mov: null,
    cxp,
    consecutivo,
  };
}

function escribirGasto(estado: EstadoDominio, plan: PlanGastoNuevo, ctx: Contexto): void {
  estado.gastos[plan.gasto.id] = plan.gasto;
  if (plan.mov) agregarMovimientoCuenta(estado, plan.mov);
  if (plan.cxp) estado.cuentasPorPagar[plan.cxp.id] = plan.cxp;
  if (plan.consecutivo !== null) fijarConsecutivo(estado, 'cuenta_por_pagar', plan.consecutivo);
  ctx.emitir({ tipo: 'GastoRegistrado', gastoId: plan.gasto.id });
}

export const gastoRegistrar = manejador<'gasto.registrar', PlanGastoNuevo>({
  validar(estado, d, ctx) {
    return planearGasto(estado, ctx, {
      gastoId: d.gastoId,
      datos: d.datos,
      recurrenteId: null,
      pago: d.pago,
    });
  },
  escribir(estado, plan, ctx) {
    escribirGasto(estado, plan, ctx);
  },
});

/** Gastos que crea el sistema (caja, nómina, datáfono) se gestionan desde su origen. */
function exigirGastoManual(g: Gasto): void {
  const tipo = g.documento?.tipo;
  exigir(
    tipo !== 'sesion_caja' && tipo !== 'liquidacion' && tipo !== 'abono_datafono',
    'GASTO_DEL_SISTEMA',
    'Este gasto nació en la caja, la nómina o el datáfono; se corrige desde allá.',
    'gastoId',
  );
}

export const gastoEditar = manejador<
  'gasto.editar',
  { id: Id; cambios: Partial<Gasto>; valorMovimiento: number | null; valorCxP: number | null }
>({
  validar(estado, d) {
    const g = requerir(estado.gastos, d.gastoId, 'el gasto', 'gastoId');
    exigirGastoManual(g);
    validarDatosGasto(estado, { ...g, ...d.cambios }, false);
    let valorMovimiento: number | null = null;
    let valorCxP: number | null = null;
    if (d.cambios.valor !== undefined && d.cambios.valor !== g.valor) {
      if (g.movimientoCuentaId) valorMovimiento = -d.cambios.valor;
      if (g.cuentaPorPagarId) {
        const c = estado.cuentasPorPagar[g.cuentaPorPagarId];
        exigir(
          !c || c.abonos.length === 0,
          'CON_ABONOS',
          'El gasto ya tiene pagos; su valor no se puede cambiar.',
          'valor',
        );
        valorCxP = d.cambios.valor;
      }
    }
    const cambios: Partial<Gasto> = {};
    for (const [k, v] of Object.entries(d.cambios))
      if (v !== undefined) (cambios as Record<string, unknown>)[k] = v;
    return { id: g.id, cambios, valorMovimiento, valorCxP };
  },
  escribir(estado, plan, ctx) {
    const g = estado.gastos[plan.id];
    if (!g) return;
    Object.assign(g, plan.cambios);
    if (plan.valorMovimiento !== null && g.movimientoCuentaId)
      cambiarValorMovimientoCuenta(estado, g.movimientoCuentaId, plan.valorMovimiento);
    if (plan.valorCxP !== null && g.cuentaPorPagarId) {
      const c = estado.cuentasPorPagar[g.cuentaPorPagarId];
      if (c) c.valor = plan.valorCxP;
    }
    marcarEditado(g, ctx);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'gastos', id: g.id, accion: 'editada' });
  },
});

export const gastoEliminar = manejador<
  'gasto.eliminar',
  { id: Id; motivo: string | null; reverso: MovimientoCuenta | null; cxpId: Id | null }
>({
  validar(estado, d, ctx) {
    const g = requerir(estado.gastos, d.gastoId, 'el gasto', 'gastoId');
    exigirGastoManual(g);
    let cxpId: Id | null = null;
    if (g.cuentaPorPagarId) {
      const c = estado.cuentasPorPagar[g.cuentaPorPagarId];
      exigir(
        !c || c.abonos.length === 0,
        'CON_ABONOS',
        'El gasto ya tiene pagos; no se puede eliminar.',
        'gastoId',
      );
      cxpId = c ? c.id : null;
    }
    // G1: los movimientos no se borran, se compensan.
    const mov = g.movimientoCuentaId ? estado.movimientosCuenta[g.movimientoCuentaId] : undefined;
    const reverso = mov
      ? movimiento(ctx, {
          id: idHijo(g.id, 'reverso'),
          cuentaId: mov.cuentaId,
          ts: ctx.ts,
          valor: -mov.valor,
          tipo: 'ajuste',
          descripcion: `Reverso del gasto eliminado: ${g.concepto}`,
          documento: { tipo: 'gasto', id: g.id },
        })
      : null;
    return { id: g.id, motivo: d.motivo, reverso, cxpId };
  },
  escribir(estado, plan, ctx) {
    const g = estado.gastos[plan.id];
    if (!g) return;
    marcarEliminado(g, ctx, plan.motivo);
    if (plan.reverso) agregarMovimientoCuenta(estado, plan.reverso);
    if (plan.cxpId) {
      const c = estado.cuentasPorPagar[plan.cxpId];
      if (c) marcarEliminado(c, ctx, plan.motivo);
    }
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'gastos', id: g.id, accion: 'eliminada' });
  },
});

// ---------- Recurrentes ----------

function validarRecurrente(estado: EstadoDominio, d: Partial<GastoRecurrente>, completo: boolean): void {
  if (completo || d.nombre !== undefined)
    textoObligatorio(d.nombre, 'nombre', 'Escribe el nombre del gasto.');
  if (completo || d.categoria !== undefined)
    exigir(
      CATEGORIAS.includes(d.categoria as Gasto['categoria']),
      'CATEGORIA_INVALIDA',
      'Elige la categoría.',
      'categoria',
    );
  if (completo || d.valor !== undefined)
    enteroPositivo(d.valor ?? 0, 'valor', 'El valor debe ser mayor que cero.');
  if (completo || d.iva !== undefined) enteroNoNegativo(d.iva ?? 0, 'iva', 'El IVA no puede ser negativo.');
  if (completo || d.diaDelMes !== undefined)
    exigir(
      Number.isInteger(d.diaDelMes) && (d.diaDelMes ?? 0) >= 1 && (d.diaDelMes ?? 0) <= 28,
      'DIA_INVALIDO',
      'El día del mes va de 1 a 28.',
      'diaDelMes',
    );
  if (completo || d.desde !== undefined)
    exigir(/^\d{4}-\d{2}$/.test(d.desde ?? ''), 'MES_INVALIDO', 'Escribe el mes de inicio.', 'desde');
  if (d.hasta) exigir(/^\d{4}-\d{2}$/.test(d.hasta), 'MES_INVALIDO', 'Escribe el mes final.', 'hasta');
  if (d.formaPago === 'debito_automatico')
    requerir(estado.cuentas, d.cuentaId, 'la cuenta del débito', 'cuentaId');
  if (d.localId) requerir(estado.locales, d.localId, 'el local', 'localId');
  if (d.proveedorId) requerir(estado.proveedores, d.proveedorId, 'el proveedor', 'proveedorId');
  if (d.diasPlazo !== undefined)
    enteroNoNegativo(d.diasPlazo, 'diasPlazo', 'El plazo no puede ser negativo.');
}

export const gastoRecurrenteCrear = manejador<'gastoRecurrente.crear', GastoRecurrente>({
  validar(estado, d, ctx) {
    idNuevo(estado.gastosRecurrentes, d.recurrenteId, 'recurrenteId');
    validarRecurrente(estado, d.datos, true);
    return { ...traza(ctx), ...d.datos, id: d.recurrenteId };
  },
  escribir(estado, r, ctx) {
    estado.gastosRecurrentes[r.id] = r;
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'gastosRecurrentes', id: r.id, accion: 'creada' });
  },
});

export const gastoRecurrenteEditar = manejador<
  'gastoRecurrente.editar',
  { id: Id; cambios: Partial<GastoRecurrente> }
>({
  validar(estado, d) {
    const r = requerir(estado.gastosRecurrentes, d.recurrenteId, 'el gasto recurrente', 'recurrenteId');
    validarRecurrente(estado, { ...r, ...d.cambios }, false);
    return { id: r.id, cambios: { ...d.cambios } };
  },
  escribir(estado, plan, ctx) {
    const r = estado.gastosRecurrentes[plan.id];
    if (!r) return;
    Object.assign(r, plan.cambios);
    marcarEditado(r, ctx);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'gastosRecurrentes', id: r.id, accion: 'editada' });
  },
});

export const gastoRecurrenteEliminar = crudEliminar<'gastoRecurrente.eliminar', GastoRecurrente>({
  coleccion: 'gastosRecurrentes',
  id: (d) => d.recurrenteId,
  nombre: 'el gasto recurrente',
});

/** Genera los gastos del mes de cada recurrente activo; idempotente por (recurrente, mes). */
export const gastoRecurrenteGenerarMes = manejador<'gastoRecurrente.generarMes', PlanGastoNuevo[]>({
  validar(estado, d, ctx) {
    exigir(/^\d{4}-\d{2}$/.test(d.mes), 'MES_INVALIDO', 'Escribe el mes (AAAA-MM).', 'mes');
    const generados = new Set<Id>();
    for (const g of Object.values(estado.gastos))
      if (g.recurrenteId && g.fecha.startsWith(d.mes)) generados.add(g.recurrenteId);
    const planes: PlanGastoNuevo[] = [];
    let usados = 0;
    for (const r of Object.values(estado.gastosRecurrentes)) {
      if (
        r.eliminadoEn ||
        !r.activo ||
        d.mes < r.desde ||
        (r.hasta !== null && d.mes > r.hasta) ||
        generados.has(r.id)
      )
        continue;
      const dia = Math.min(r.diaDelMes, diasDelMes(d.mes));
      const fecha = `${d.mes}-${String(dia).padStart(2, '0')}`;
      const gastoId = idHijo(r.id, d.mes);
      const datos: DatosGasto = {
        fecha,
        localId: r.localId,
        categoria: r.categoria,
        concepto: r.nombre,
        valor: r.valor,
        iva: r.iva,
        proveedorId: r.proveedorId,
        soporte: null,
        documento: null,
      };
      const plan = planearGasto(estado, ctx, {
        gastoId,
        datos,
        recurrenteId: r.id,
        pago:
          r.formaPago === 'debito_automatico' && r.cuentaId
            ? { tipo: 'inmediato', cuentaId: r.cuentaId, medio: 'débito automático' }
            : { tipo: 'por_pagar', vence: sumarDias(fecha, r.diasPlazo), cxpId: idHijo(gastoId, 'cxp') },
        usados,
      });
      if (plan.cxp) usados += 1;
      planes.push(plan);
    }
    return planes;
  },
  escribir(estado, planes, ctx) {
    for (const p of planes) escribirGasto(estado, p, ctx);
  },
});

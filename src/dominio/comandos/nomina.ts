import type {
  Contrato,
  CuentaPorPagar,
  Empleado,
  EstadoDominio,
  FechaISO,
  Gasto,
  Id,
  InsumosLiquidacion,
  LiquidacionEmpleado,
  LiquidacionNomina,
  PeriodoNomina,
} from '../tipos';
import { exigir } from '../errores';
import { idHijo } from '../motor/ids';
import { asistenciaDia } from '../reglas/asistencia';
import { calcularComision } from '../reglas/comisiones';
import { hashHex } from '../reglas/cufe';
import {
  diaHabilDelMes,
  finMes,
  maxFecha,
  mesDe,
  minFecha,
  rangoFechas,
  sumarMesesAMes,
} from '../reglas/fechas';
import { conjuntoFestivos, esDominicalOFestivo } from '../reglas/festivos';
import { cierraMes, diasComercialesPeriodo, liquidarLaboral, liquidarPrestacion } from '../reglas/nomina';
import {
  exigirSaldoSiGenerado,
  fechaValida,
  idNuevo,
  nombrePersona,
  requerir,
  requerirExiste,
} from './comunes';
import { escribirPagoCxP, nuevaCxP, planearPagoCxP, type PlanPagoCxP } from './finanzas';
import { claveMarcacionDia, claveTurnoDia, fijarConsecutivo, leerConsecutivo, manejador, traza } from './tx';

/** Nómina: aprobar (instantánea), pagar y anular la aprobación (PLAN 6.10, 6.19 P4, 6.20.5–6, 6.21). */

/** Ventas reconocidas del mes (V4): base comisionable por vendedor y total con IVA por local. */
export function ventasDelMes(
  estado: EstadoDominio,
  mes: string,
): { basePorVendedor: Map<Id, { base: number; total: number }>; totalPorLocal: Map<Id, number> } {
  const basePorVendedor = new Map<Id, { base: number; total: number }>();
  const totalPorLocal = new Map<Id, number>();
  const sumar = (vendedor: Id, local: Id, base: number, total: number) => {
    const a = basePorVendedor.get(vendedor) ?? { base: 0, total: 0 };
    basePorVendedor.set(vendedor, { base: a.base + base, total: a.total + total });
    totalPorLocal.set(local, (totalPorLocal.get(local) ?? 0) + total);
  };
  for (const id in estado.ventas) {
    const v = estado.ventas[id];
    if (!v || v.anulacion) continue;
    if (v.ts.startsWith(mes)) sumar(v.vendedorId, v.localId, v.base, v.total);
    const cancelado = v.separado?.cerrado?.resultado === 'cancelado' ? v.separado.cerrado : null;
    if (cancelado && cancelado.ts.startsWith(mes)) sumar(v.vendedorId, v.localId, -v.base, -v.total);
  }
  for (const id in estado.devoluciones) {
    const d = estado.devoluciones[id];
    if (!d || !d.ts.startsWith(mes)) continue;
    const v = estado.ventas[d.ventaId];
    if (!v || v.anulacion) continue;
    const base = d.lineas.reduce((a, l) => a + l.base, 0);
    sumar(v.vendedorId, v.localId, -base, -d.valorTotal);
  }
  return { basePorVendedor, totalPorLocal };
}

/** Insumos de un empleado en un periodo, desde asistencia, novedades y ventas (6.20.7). */
export function calcularInsumos(
  estado: EstadoDominio,
  empleado: Empleado,
  contrato: Contrato,
  periodo: PeriodoNomina,
  ventas: ReturnType<typeof ventasDelMes>,
  ahora: string,
): InsumosLiquidacion {
  const diasPeriodo = diasComercialesPeriodo(periodo);
  const desde = maxFecha(periodo.inicio, empleado.fechaIngreso);
  const hasta = empleado.fechaRetiro ? minFecha(periodo.fin, empleado.fechaRetiro) : periodo.fin;
  const calendario = rangoFechas(periodo.inicio, periodo.fin);
  const activos = desde <= hasta ? rangoFechas(desde, hasta) : [];
  // Días comerciales: proporcionales a los días calendario activos (mes de 30).
  const diasActivos =
    calendario.length > 0 ? Math.round((activos.length * diasPeriodo) / calendario.length) : 0;
  let incapacidad = 0;
  let vacaciones = 0;
  let noRemunerados = 0;
  const conNovedad = new Set<FechaISO>();
  for (const n of Object.values(estado.novedades)) {
    if (n.eliminadoEn || n.empleadoId !== empleado.id) continue;
    for (const f of activos) {
      if (f < n.desde || f > n.hasta || conNovedad.has(f)) continue;
      conNovedad.add(f);
      if (n.tipo === 'incapacidad') incapacidad++;
      else if (n.tipo === 'vacaciones') vacaciones++;
      else if (!n.remunerada) noRemunerados++;
    }
  }
  const h = { ed: 0, en: 0, rn: 0, df: 0 };
  const turnos = activos.flatMap((f) =>
    (estado.agregados.turnosDia[claveTurnoDia(empleado.id, f)] ?? [])
      .map((id) => estado.turnos[id])
      .filter((t): t is NonNullable<typeof t> => !!t),
  );
  for (const t of turnos) {
    const marcs = (estado.agregados.marcacionesDia[claveMarcacionDia(empleado.id, t.fecha)] ?? [])
      .map((id) => estado.marcaciones[id])
      .filter((m) => !!m);
    const a = asistenciaDia({
      empleadoId: empleado.id,
      fecha: t.fecha,
      turno: t,
      marcaciones: marcs,
      novedad: conNovedad.has(t.fecha) ? ({} as never) : null,
      ahora,
      parametros: estado.parametros.nomina,
      dominicalOFestivo: esDominicalOFestivo(t.fecha),
    });
    h.ed += a.horasExtraDiurnas;
    h.en += a.horasExtraNocturnas;
    h.rn += a.horasRecargoNocturno;
    h.df += a.horasDominicalFestivo;
  }
  const mes = mesDe(periodo.fin);
  const liquidaMes = cierraMes(periodo);
  const esquema = contrato.esquemaComisionId
    ? estado.esquemasComision[contrato.esquemaComisionId]
    : undefined;
  const v = ventas.basePorVendedor.get(empleado.id);
  const local = empleado.localId;
  const meta = local
    ? Object.values(estado.metas).find((m) => m.localId === local && m.mes === mes)
    : undefined;
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return {
    diasPeriodo,
    diasLaborados: Math.max(0, diasActivos - incapacidad - vacaciones - noRemunerados),
    diasIncapacidad: incapacidad,
    diasVacaciones: vacaciones,
    diasNoRemunerados: noRemunerados,
    horasExtraDiurnas: r2(h.ed),
    horasExtraNocturnas: r2(h.en),
    horasRecargoNocturno: r2(h.rn),
    horasDominicalFestivo: r2(h.df),
    ventasComisionables:
      liquidaMes && esquema ? (esquema.base === 'base_sin_iva' ? (v?.base ?? 0) : (v?.total ?? 0)) : 0,
    ventasLocalMes: local ? (ventas.totalPorLocal.get(local) ?? 0) : 0,
    metaLocalMes: meta?.valor ?? 0,
  };
}

interface PlanAprobacion {
  liquidacion: LiquidacionNomina;
  cxps: CuentaPorPagar[];
  gastos: Gasto[];
  ultimoConsecutivo: number;
}

export const nominaAprobar = manejador<'nomina.aprobar', PlanAprobacion>({
  validar(estado, d, ctx) {
    idNuevo(estado.liquidaciones, d.liquidacionId, 'liquidacionId');
    const p = d.periodo;
    fechaValida(p.inicio, 'periodo');
    fechaValida(p.fin, 'periodo');
    exigir(
      p.fin >= p.inicio && (p.tipo === 'quincenal' || p.tipo === 'mensual'),
      'PERIODO_INVALIDO',
      'Revisa las fechas del periodo.',
      'periodo',
    );
    exigir(
      !Object.values(estado.liquidaciones).some(
        (l) => l.periodo.inicio === p.inicio && l.periodo.fin === p.fin && l.periodo.tipo === p.tipo,
      ),
      'PERIODO_LIQUIDADO',
      `La nómina de ${p.etiqueta} ya está aprobada.`,
      'periodo',
    );
    const empleados = Object.values(estado.empleados).filter((e) => {
      if (e.eliminadoEn || e.fechaIngreso > p.fin || (e.fechaRetiro !== null && e.fechaRetiro < p.inicio))
        return false;
      return estado.contratos[e.contratoVigenteId]?.periodicidadPago === p.tipo;
    });
    exigir(
      empleados.length > 0,
      'SIN_EMPLEADOS',
      'No hay empleados para liquidar en ese periodo.',
      'periodo',
    );
    const params = structuredClone(estado.parametros.nomina);
    const mes = mesDe(p.fin);
    // Las ventas del mes solo cuentan en el periodo que lo cierra (comisiones y bono de meta).
    const ventas = cierraMes(p) ? ventasDelMes(estado, mes) : { basePorVendedor: new Map(), totalPorLocal: new Map() };
    const lineas: LiquidacionEmpleado[] = empleados.map((e) => {
      const contrato = requerirExiste(estado.contratos, e.contratoVigenteId, 'el contrato', 'periodo');
      const insumos = d.insumos?.[e.id] ?? calcularInsumos(estado, e, contrato, p, ventas, ctx.ts);
      const esquema = contrato.esquemaComisionId
        ? estado.esquemasComision[contrato.esquemaComisionId]
        : undefined;
      const comisiones =
        esquema && cierraMes(p)
          ? calcularComision(esquema, {
              base: insumos.ventasComisionables,
              ventasLocalMes: insumos.ventasLocalMes,
              metaLocalMes: insumos.metaLocalMes,
            }).total
          : 0;
      if (contrato.tipo === 'laboral') {
        const r = liquidarLaboral({
          contrato,
          insumos,
          parametros: params,
          exoneracion: d.exoneracion114,
          comisiones,
          bonos: 0,
          fecha: p.fin,
        });
        return {
          empleadoId: e.id,
          contratoId: contrato.id,
          tipo: 'laboral',
          localId: e.localId,
          insumos,
          laboral: r.desglose,
          prestacion: null,
          netoAPagar: r.neto,
          costoEmpleador: r.costoEmpleador,
        };
      }
      const pila = contrato.verificacionesPila.find((v) => v.periodo === mes)?.verificada ?? false;
      const r = liquidarPrestacion({
        contrato,
        insumos,
        parametros: params,
        comisiones,
        pilaVerificada: pila,
      });
      return {
        empleadoId: e.id,
        contratoId: contrato.id,
        tipo: 'prestacion_servicios',
        localId: e.localId,
        insumos,
        laboral: null,
        prestacion: r.desglose,
        netoAPagar: r.neto,
        costoEmpleador: r.costoEmpleador,
      };
    });
    const totales = { devengado: 0, deducciones: 0, aportes: 0, provisiones: 0, neto: 0, costo: 0 };
    for (const l of lineas) {
      totales.devengado += l.laboral?.totalDevengado ?? l.prestacion?.totalBruto ?? 0;
      totales.deducciones += l.laboral?.totalDeducciones ?? l.prestacion?.retencionFuente ?? 0;
      totales.aportes += l.laboral?.totalAportes ?? 0;
      totales.provisiones += l.laboral?.totalProvisiones ?? 0;
      totales.neto += l.netoAPagar;
      totales.costo += l.costoEmpleador;
    }

    // Cuentas por pagar: neto por empleado y, al cerrar el mes, la seguridad social (PILA) del mes.
    const cxps: CuentaPorPagar[] = [];
    let n = 0;
    const nueva = (id: Id, datos: Parameters<typeof nuevaCxP>[3]) => {
      n += 1;
      cxps.push(nuevaCxP(ctx, id, leerConsecutivo(estado, 'cuenta_por_pagar', n), datos));
    };
    const documento = { tipo: 'liquidacion' as const, id: d.liquidacionId };
    for (const l of lineas) {
      if (l.netoAPagar <= 0) continue;
      const nombre = nombrePersona(estado, l.empleadoId);
      nueva(idHijo(d.liquidacionId, `neto-${l.empleadoId}`), {
        categoria: 'nomina',
        terceroNombre: nombre,
        proveedorId: null,
        empleadoId: l.empleadoId,
        concepto: `${l.tipo === 'laboral' ? 'Nómina' : 'Honorarios'} ${p.etiqueta} · ${nombre}`,
        localId: l.localId,
        moneda: 'COP',
        valor: l.netoAPagar,
        fechaEmision: p.fin,
        fechaVencimiento: p.fin,
        documento,
        soporte: null,
        nota: null,
      });
    }
    if (cierraMes(p)) {
      let pila = 0;
      const sumarPila = (ls: readonly LiquidacionEmpleado[]) => {
        for (const l of ls) if (l.laboral) pila += l.laboral.totalAportes + l.laboral.totalDeducciones;
      };
      sumarPila(lineas);
      for (const otra of Object.values(estado.liquidaciones)) {
        if (otra.periodo.tipo === p.tipo && mesDe(otra.periodo.fin) === mes && !cierraMes(otra.periodo))
          sumarPila(otra.lineas);
      }
      if (pila > 0) {
        const festivos = conjuntoFestivos([Number(mes.slice(0, 4)), Number(mes.slice(0, 4)) + 1]);
        const vence = diaHabilDelMes(
          sumarMesesAMes(mes, 1),
          estado.parametros.obligaciones.pilaDiaHabil,
          festivos,
        );
        nueva(idHijo(d.liquidacionId, 'pila'), {
          categoria: 'seguridad_social',
          terceroNombre: 'Seguridad social (PILA)',
          proveedorId: null,
          empleadoId: null,
          concepto: `Seguridad social (PILA) · ${mes}`,
          localId: null,
          moneda: 'COP',
          valor: pila,
          fechaEmision: finMes(mes),
          fechaVencimiento: vence,
          documento,
          soporte: null,
          nota: null,
        });
      }
    }

    // Gasto de nómina y de seguridad social por local (P15).
    const porLocal = new Map<string, { nomina: number; ss: number; localId: Id | null }>();
    for (const l of lineas) {
      const clave = l.localId ?? 'general';
      const a = porLocal.get(clave) ?? { nomina: 0, ss: 0, localId: l.localId };
      a.nomina += l.laboral
        ? l.laboral.totalDevengado + l.laboral.totalProvisiones
        : (l.prestacion?.totalBruto ?? 0);
      a.ss += l.laboral?.totalAportes ?? 0;
      porLocal.set(clave, a);
    }
    const gastos: Gasto[] = [];
    const gasto = (
      id: Id,
      categoria: 'nomina' | 'seguridad_social',
      valor: number,
      localId: Id | null,
      concepto: string,
    ): Gasto => ({
      ...traza(ctx),
      id,
      fecha: p.fin,
      localId,
      categoria,
      concepto,
      valor,
      iva: 0,
      proveedorId: null,
      estadoPago: 'por_pagar',
      medio: null,
      cuentaId: null,
      movimientoCuentaId: null,
      cuentaPorPagarId: null,
      recurrenteId: null,
      documento,
      soporte: null,
    });
    for (const [clave, a] of porLocal) {
      if (a.nomina > 0)
        gastos.push(
          gasto(idHijo(d.liquidacionId, `g-${clave}`), 'nomina', a.nomina, a.localId, `Nómina ${p.etiqueta}`),
        );
      if (a.ss > 0)
        gastos.push(
          gasto(
            idHijo(d.liquidacionId, `ss-${clave}`),
            'seguridad_social',
            a.ss,
            a.localId,
            `Aportes del empleador ${p.etiqueta}`,
          ),
        );
    }
    for (const g of gastos) idNuevo(estado.gastos, g.id);
    for (const c of cxps) idNuevo(estado.cuentasPorPagar, c.id);

    const anio = p.fin.slice(0, 4);
    const delAnio =
      Object.values(estado.liquidaciones).filter((l) => l.periodo.fin.startsWith(anio)).length + 1;
    const numero = `NOM-${anio}-${String(delAnio).padStart(2, '0')}`;
    const hayLaborales = lineas.some((l) => l.tipo === 'laboral');
    return {
      cxps,
      gastos,
      ultimoConsecutivo: leerConsecutivo(estado, 'cuenta_por_pagar', n),
      liquidacion: {
        ...traza(ctx),
        id: d.liquidacionId,
        numero,
        periodo: { ...p },
        estado: 'aprobada',
        parametros: params,
        exoneracion114: d.exoneracion114,
        lineas,
        totales,
        aprobada: { ts: ctx.ts, por: ctx.usuarioId },
        pagada: null,
        nominaElectronica: hayLaborales
          ? {
              estado: 'transmitida_simulada',
              ts: ctx.ts,
              cune: hashHex(`${numero}|${p.inicio}|${p.fin}|${totales.neto}|${estado.empresa.nit}`),
            }
          : null,
        cuentasPorPagarIds: cxps.map((c) => c.id),
        gastoIds: gastos.map((g) => g.id),
      },
    };
  },
  escribir(estado, plan, ctx) {
    estado.liquidaciones[plan.liquidacion.id] = plan.liquidacion;
    for (const c of plan.cxps) estado.cuentasPorPagar[c.id] = c;
    for (const g of plan.gastos) estado.gastos[g.id] = g;
    if (plan.cxps.length) fijarConsecutivo(estado, 'cuenta_por_pagar', plan.ultimoConsecutivo);
    fijarConsecutivo(estado, 'liquidacion', estado.meta.consecutivos.liquidacion + 1);
    ctx.emitir({ tipo: 'NominaAprobada', liquidacionId: plan.liquidacion.id });
  },
});

export const nominaPagar = manejador<
  'nomina.pagar',
  { liquidacionId: Id; cuentaId: Id; pagos: PlanPagoCxP[]; ts: string }
>({
  validar(estado, d, ctx) {
    const l = requerirExiste(estado.liquidaciones, d.liquidacionId, 'la liquidación', 'liquidacionId');
    exigir(l.estado === 'aprobada', 'YA_PAGADA', `La nómina ${l.numero} ya está pagada.`, 'liquidacionId');
    const cuenta = requerir(estado.cuentas, d.cuentaId, 'la cuenta de donde sale la plata', 'cuentaId');
    fechaValida(d.fecha, 'fecha');
    const netos = l.cuentasPorPagarIds
      .map((id) => estado.cuentasPorPagar[id])
      .filter((c): c is CuentaPorPagar => !!c && c.categoria === 'nomina' && !c.eliminadoEn);
    let total = 0;
    const pagos = netos
      .map((c) => {
        const pagado = c.abonos.reduce((a, x) => a + x.valorCOP, 0);
        const saldo = c.valor - pagado;
        total += Math.max(0, saldo);
        return saldo > 0 ? { c, saldo } : null;
      })
      .filter((x): x is { c: CuentaPorPagar; saldo: number } => x !== null)
      .map(({ c, saldo }) =>
        planearPagoCxP(
          estado,
          ctx,
          {
            cxpId: c.id,
            abonoId: idHijo(c.id, 'pago'),
            fecha: d.fecha,
            valorCOP: saldo,
            centavos: null,
            tasa: null,
            cuentaId: cuenta.id,
            medio: 'transferencia',
            soporte: null,
          },
          { omitirSaldo: true },
        ),
      );
    exigirSaldoSiGenerado(estado, ctx, cuenta.id, total);
    return {
      liquidacionId: l.id,
      cuentaId: cuenta.id,
      pagos,
      ts: d.fecha === ctx.hoy ? ctx.ts : `${d.fecha}T12:00:00`,
    };
  },
  escribir(estado, plan, ctx) {
    const l = estado.liquidaciones[plan.liquidacionId];
    if (!l) return;
    for (const p of plan.pagos) escribirPagoCxP(estado, p, ctx);
    l.estado = 'pagada';
    l.pagada = { ts: plan.ts, por: ctx.usuarioId, cuentaId: plan.cuentaId };
    ctx.emitir({ tipo: 'NominaPagada', liquidacionId: l.id });
  },
});

export const nominaAnularAprobacion = manejador<
  'nomina.anularAprobacion',
  { id: Id; cxps: Id[]; gastos: Id[] }
>({
  validar(estado, d) {
    const l = requerirExiste(estado.liquidaciones, d.liquidacionId, 'la liquidación', 'liquidacionId');
    exigir(l.estado === 'aprobada', 'YA_PAGADA', 'Una nómina pagada no se puede anular.', 'liquidacionId');
    const conAbonos = l.cuentasPorPagarIds.some((id) => (estado.cuentasPorPagar[id]?.abonos.length ?? 0) > 0);
    exigir(!conAbonos, 'CON_ABONOS', 'La nómina ya tiene pagos registrados.', 'liquidacionId');
    return { id: l.id, cxps: [...l.cuentasPorPagarIds], gastos: [...l.gastoIds] };
  },
  escribir(estado, plan, ctx) {
    delete estado.liquidaciones[plan.id];
    for (const id of plan.cxps) delete estado.cuentasPorPagar[id];
    for (const id of plan.gastos) delete estado.gastos[id];
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'liquidaciones', id: plan.id, accion: 'eliminada' });
  },
});

import type { EstadoDominio, FechaISO, Id, MonedaExtranjera, SobreComando } from '@/dominio/tipos';
import { BASE_CAJA } from '@/config/negocio';
import { NOMBRES_OBLIGACIONES } from '@/config/obligaciones';
import { BANDAS_SALDO } from '@/seed/cuentas';
import { GASTOS_OCASIONALES } from '@/seed/gastos';
import { INDICE_MES } from '@/seed/estacionalidad';
import { saldoCxP } from '@/dominio/reglas/cuentas';
import { diaSemana, diasDelMes, fechaDe, sumarMesesAMes } from '@/dominio/reglas/fechas';
import { prestacionesEstimadas } from '@/dominio/reglas/flujo-estado';
import { idGenerado, idHijo } from '@/dominio/motor/ids';
import { masDias } from '../calendario';
import { CUENTA_CORRIENTE, type Gen, localVivo } from '../contexto';
import type { IntencionGen } from '../tipos';
import { materializarImportacionesDiferidas } from './importaciones';
import { asegurarSaldo, pagarCxP } from './pagos';

/** Plata generada (PLAN 7.10): consignaciones, recurrentes, pagos, retiros del socio y obligaciones ilustrativas. */

type Emitir = ReturnType<Gen['emisor']>;

function indexarCxP(g: Gen, estado: EstadoDominio, cxpId: Id, hoy: FechaISO): void {
  const c = estado.cuentasPorPagar[cxpId];
  if (!c) return;
  const f = c.programadaPara ?? c.fechaVencimiento;
  g.idx.agregar(g.idx.cxpPorFecha, f < hoy ? hoy : f, cxpId);
}

/** Meta mensual del local (meta.fijar): base × índice del mes × tendencia × escala, redondeada al millón. */
function* fijarMetas(g: Gen, emitir: Emitir, estado: EstadoDominio, mes: string): Generator<SobreComando> {
  const fecha = `${mes}-15`;
  for (const l of g.plan.localesVenta) {
    if (!localVivo(estado, l.id) || !l.perfil) continue;
    const valor =
      Math.round(
        (l.perfil.metaMensualBase * (INDICE_MES[Number(mes.slice(5, 7))] ?? 1) * g.plan.demanda.tendencia(fecha) * g.plan.escala) /
          1_000_000,
      ) * 1_000_000;
    yield emitir('meta.fijar', { metaId: idGenerado('mt', l.id, mes), localId: l.id, mes, valor });
  }
}

export function* materializarTasa(g: Gen, it: IntencionGen, _estado: EstadoDominio): Generator<SobreComando> {
  const emitir = g.emisor(it);
  const fecha = fechaDe(it.ts);
  for (const m of ['USD', 'CNY'] as MonedaExtranjera[]) {
    yield emitir('tasa.registrar', {
      tasaId: idGenerado('tasa', m.toLowerCase(), fecha),
      moneda: m,
      fecha,
      valor: g.plan.tasas.valor(m, fecha),
    });
  }
}

/** Víspera de la ventana: clientes con alta anterior y metas del primer mes. */
export function* materializarPreparacion(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const emitir = g.emisor(it);
  const previos = g.plan.clientes
    .filter((c) => c.alta.slice(0, 10) <= g.plan.vispera)
    .sort((a, b) => (a.alta < b.alta ? -1 : a.alta > b.alta ? 1 : a.id < b.id ? -1 : 1));
  for (const c of previos) yield emitir('cliente.crear', { clienteId: c.id, datos: c.datos }, { ts: c.alta });
  yield* fijarMetas(g, emitir, estado, g.plan.inicio.slice(0, 7));
}

export function* materializarAltas(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const fecha = fechaDe(it.ts);
  const emitir = g.emisor(it);
  for (const c of g.plan.clientes) {
    if (c.alta.slice(0, 10) !== fecha || estado.clientes[c.id]) continue;
    yield emitir('cliente.crear', {
      clienteId: c.id,
      datos: { ...c.datos, autorizacionDatos: { ...c.datos.autorizacionDatos, fecha: it.ts } },
    });
  }
}

/** 06:00: consignaciones, billeteras (lunes), recurrentes del día, retiro del socio, metas y novedades. */
export function* materializarApertura(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const emitir = g.emisor(it);
  const fecha = fechaDe(it.ts);
  const mes = fecha.slice(0, 7);
  const dm = Number(fecha.slice(8, 10));
  // Consignación del efectivo de ayer (menos la base) a la cuenta corriente.
  for (const l of g.plan.localesVenta) {
    const local = estado.locales[l.id];
    if (!local || local.eliminadoEn || !local.cuentaCajaId) continue;
    if (estado.agregados.cajaAbierta[l.id]) continue;
    const saldo = estado.agregados.saldosCuentas[local.cuentaCajaId] ?? 0;
    if (saldo - BASE_CAJA < 10_000) continue;
    yield emitir('cuenta.transferir', {
      transferenciaId: idGenerado('tf', fecha, l.id),
      origenId: local.cuentaCajaId,
      destinoId: CUENTA_CORRIENTE,
      valor: saldo - BASE_CAJA,
      fecha,
      descripcion: `Consignación del efectivo de ${local.nombre}`,
    });
  }
  // Lunes: Nequi y Daviplata pasan a la cuenta corriente.
  if (diaSemana(fecha) === 1) {
    for (const c of ['cta_nequi', 'cta_daviplata']) {
      const saldo = estado.agregados.saldosCuentas[c] ?? 0;
      if (saldo <= 0 || !estado.cuentas[c] || estado.cuentas[c]?.eliminadoEn) continue;
      yield emitir('cuenta.transferir', {
        transferenciaId: idGenerado('tf', fecha, c.slice(4)),
        origenId: c,
        destinoId: CUENTA_CORRIENTE,
        valor: saldo,
        fecha,
        descripcion: `Traslado de ${estado.cuentas[c]?.nombre ?? c} a la cuenta corriente`,
      });
    }
  }
  // Día 1: metas del mes y retiro del socio si la cuenta corriente pasa del techo (fuera de los días del ancla).
  if (dm === 1) {
    yield* fijarMetas(g, emitir, estado, mes);
    const A = g.plan.ancla;
    const saldo = estado.agregados.saldosCuentas[CUENTA_CORRIENTE] ?? 0;
    if (saldo > BANDAS_SALDO.techoCorriente && (fecha < masDias(A, -5) || fecha > masDias(A, 5))) {
      yield emitir('cuenta.movimiento', {
        movimientoId: idGenerado('mc', 'retiro', fecha),
        cuentaId: CUENTA_CORRIENTE,
        valor: Math.floor((saldo - BANDAS_SALDO.objetivoTrasRetiro) / 1_000_000) * 1_000_000,
        tipo: 'retiro_socio',
        fecha,
        descripcion: 'Retiro del socio',
      });
    }
  }
  // Gastos recurrentes que vencen hoy (sin causar gastos futuros).
  const ultimo = diasDelMes(mes);
  const deHoy = Object.values(estado.gastosRecurrentes).filter(
    (r) => !r.eliminadoEn && r.activo && Math.min(r.diaDelMes, ultimo) === dm && mes >= r.desde && (r.hasta === null || mes <= r.hasta),
  );
  if (deHoy.length) {
    let debitos = 0;
    for (const r of deHoy) if (r.formaPago === 'debito_automatico' && r.cuentaId === CUENTA_CORRIENTE) debitos += r.valor;
    if (debitos) yield* asegurarSaldo(g, emitir, estado, CUENTA_CORRIENTE, debitos, fecha);
    yield emitir('gastoRecurrente.generarMes', { mes, hasta: fecha });
    for (const r of deHoy) indexarCxP(g, estado, idHijo(idHijo(r.id, mes), 'cxp'), fecha);
  }
  // Novedades sembradas (N6, 7.8).
  for (const n of g.plan.narrativa.novedades) {
    if (n.desde !== fecha || estado.novedades[n.id] || !estado.empleados[n.empleadoId]) continue;
    yield emitir('novedad.registrar', {
      novedadId: n.id,
      datos: {
        empleadoId: n.empleadoId,
        tipo: n.tipo,
        desde: n.desde,
        hasta: n.hasta,
        remunerada: n.remunerada,
        soporte: n.tipo === 'incapacidad' ? { nombreArchivo: 'incapacidad_eps.pdf', estado: 'adjunto', fecha } : null,
        nota: null,
      },
    });
  }
  if (g.idx.importacionesDiferidas.size) yield* materializarImportacionesDiferidas(g, it, estado);
}

/** 07:30: pagos de las cuentas por pagar que vencen hoy (respeta programadas, pagadas y eliminadas). */
export function* materializarPagos(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const fecha = fechaDe(it.ts);
  const ids = g.idx.tomar(g.idx.cxpPorFecha, fecha);
  if (!ids.length) return;
  const emitir = g.emisor(it);
  const A = g.plan.ancla;
  let vencidasNarrativas = 0;
  for (const id of [...new Set(ids)].sort()) {
    const c = estado.cuentasPorPagar[id];
    if (!c || c.eliminadoEn || saldoCxP(c) <= 0) continue;
    const objetivo = c.programadaPara ?? c.fechaVencimiento;
    if (objetivo > fecha) {
      g.idx.agregar(g.idx.cxpPorFecha, objetivo, id);
      continue;
    }
    // "Hoy quedan 1–2 vencidas pequeñas" (7.10): las de servicios de la última semana antes del ancla esperan.
    if (
      fecha >= masDias(A, -6) &&
      fecha < A &&
      c.moneda === 'COP' &&
      c.valor <= 2_500_000 &&
      (c.categoria === 'servicios' || c.categoria === 'proveedor_local' || c.categoria === 'otro') &&
      vencidasNarrativas < 2
    ) {
      vencidasNarrativas += 1;
      g.idx.agregar(g.idx.cxpPorFecha, masDias(A, 3), id);
      continue;
    }
    yield* pagarCxP(g, emitir, estado, id, fecha);
  }
}

/** Último día del mes: retención, IVA e ICA (ilustrativos) y comisión de la financiera aliada. */
export function* materializarCierreMes(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const emitir = g.emisor(it);
  const fecha = fechaDe(it.ts);
  const mes = fecha.slice(0, 7);
  const siguiente = sumarMesesAMes(mes, 1);
  const ob = estado.parametros.obligaciones;
  const dia = (d: number) => `${siguiente}-${String(Math.min(d, diasDelMes(siguiente))).padStart(2, '0')}`;
  const v = g.idx.ventasMes.get(mes) ?? { iva: 0, base: 0, financiera: 0, ventas: 0 };
  const previo = g.idx.ventasMes.get(sumarMesesAMes(mes, -1)) ?? { iva: 0, base: 0, financiera: 0, ventas: 0 };
  const mil = (x: number) => Math.round(x / 1000) * 1000;
  const cxp = function* (tipo: 'retencion' | 'iva' | 'ica', valor: number, vence: FechaISO, periodo: string) {
    if (valor <= 0) return;
    const cxpId = idGenerado('cp', tipo, mes);
    if (estado.cuentasPorPagar[cxpId]) return;
    yield emitir('cxp.crear', {
      cxpId,
      datos: {
        categoria: 'impuestos',
        terceroNombre: 'DIAN (ilustrativo)',
        proveedorId: null,
        empleadoId: null,
        concepto: `${NOMBRES_OBLIGACIONES[tipo]} · ${periodo}`,
        localId: null,
        moneda: 'COP',
        valor,
        fechaEmision: fecha,
        fechaVencimiento: vence,
        documento: null,
        soporte: null,
        nota: 'Valor y fecha ilustrativos · se validan con tu contador',
      },
    });
    indexarCxP(g, estado, cxpId, fecha);
  };
  // Retención mensual: arriendos, servicios y honorarios del mes (ilustrativa).
  let baseRetencion = 0;
  for (const r of Object.values(estado.gastosRecurrentes)) if (!r.eliminadoEn && r.activo) baseRetencion += r.valor - r.iva;
  yield* cxp('retencion', mil(baseRetencion * 0.035), dia(ob.retencionVencimientoDia), mes);
  if (Number(mes.slice(5, 7)) % 2 === 0) {
    const periodo = `${sumarMesesAMes(mes, -1)} y ${mes}`;
    // IVA generado − descontable (≈ 38 % del generado entre importación, arriendos y servicios).
    yield* cxp('iva', mil((v.iva + previo.iva) * 0.62), dia(ob.ivaVencimientoDia), periodo);
    yield* cxp('ica', mil(((v.base + previo.base) * estado.parametros.impuestos.icaTarifaPorMil) / 1000), dia(ob.icaVencimientoDia), periodo);
  }
  if (v.financiera > 0) {
    const valor = mil(v.financiera * estado.parametros.datafono.comisionFinanciera);
    if (valor > 0) {
      yield* asegurarSaldo(g, emitir, estado, CUENTA_CORRIENTE, valor, fecha);
      yield emitir('gasto.registrar', {
        gastoId: idGenerado('gs', 'financiera', mes),
        datos: {
          fecha,
          localId: null,
          categoria: GASTOS_OCASIONALES.comisionFinanciera.categoria,
          concepto: `${GASTOS_OCASIONALES.comisionFinanciera.concepto} · ${mes}`,
          valor,
          iva: 0,
          proveedorId: null,
          soporte: null,
          documento: null,
        },
        pago: { tipo: 'inmediato', cuentaId: CUENTA_CORRIENTE, medio: 'débito automático' },
      });
    }
  }
}

/** Prima, cesantías e intereses en sus fechas ilustrativas (config/obligaciones.ts); se pagan el mismo día. */
export function* materializarPrestaciones(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const emitir = g.emisor(it);
  const fecha = fechaDe(it.ts);
  const md = fecha.slice(5, 10);
  const ob = estado.parametros.obligaciones;
  const p = prestacionesEstimadas(estado, fecha);
  const anio = Number(fecha.slice(0, 4));
  const conceptos: { clave: string; concepto: string; valor: number; tercero: string }[] = [];
  if (ob.primaFechas.includes(md))
    conceptos.push({
      clave: 'prima',
      concepto: `${NOMBRES_OBLIGACIONES.prima} · ${md < '07-01' ? 'primer' : 'segundo'} semestre de ${anio}`,
      valor: p.primaSemestral,
      tercero: 'Empleados',
    });
  if (md === ob.cesantiasFecha)
    conceptos.push({
      clave: 'cesantias',
      concepto: `${NOMBRES_OBLIGACIONES.cesantias} · ${anio - 1}`,
      valor: p.cesantiasAnuales,
      tercero: 'Fondos de cesantías',
    });
  if (md === ob.interesesCesantiasFecha)
    conceptos.push({
      clave: 'intereses',
      concepto: `${NOMBRES_OBLIGACIONES.interesesCesantias} · ${anio - 1}`,
      valor: p.interesesAnuales,
      tercero: 'Empleados',
    });
  for (const c of conceptos) {
    if (c.valor <= 0) continue;
    const cxpId = idGenerado('cp', c.clave, fecha);
    if (estado.cuentasPorPagar[cxpId]) continue;
    yield emitir('cxp.crear', {
      cxpId,
      datos: {
        categoria: 'prestaciones',
        terceroNombre: c.tercero,
        proveedorId: null,
        empleadoId: null,
        concepto: c.concepto,
        localId: null,
        moneda: 'COP',
        valor: c.valor,
        fechaEmision: fecha,
        fechaVencimiento: fecha,
        documento: null,
        soporte: null,
        nota: 'Cálculo ilustrativo · se valida con tu contador',
      },
    });
    yield* pagarCxP(g, emitir, estado, cxpId, fecha);
  }
}

/** Publicidad de temporada, empaques trimestrales y mantenimiento ocasional (7.10). */
export function* materializarOcasionales(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const emitir = g.emisor(it);
  const rng = g.rng(it.clave);
  const fecha = fechaDe(it.ts);
  const mes = Number(fecha.slice(5, 7));
  const dm = Number(fecha.slice(8, 10));
  const O = GASTOS_OCASIONALES;
  const porPagar = function* (
    clave: string,
    categoria: 'publicidad' | 'empaques',
    concepto: string,
    valor: number,
    iva: number,
    proveedorId: Id | null,
    plazo: number,
  ) {
    const gastoId = idGenerado('gs', clave, fecha);
    const cxpId = idHijo(gastoId, 'cxp');
    if (estado.gastos[gastoId]) return;
    yield emitir('gasto.registrar', {
      gastoId,
      datos: {
        fecha,
        localId: null,
        categoria,
        concepto,
        valor,
        iva,
        proveedorId: proveedorId && estado.proveedores[proveedorId] && !estado.proveedores[proveedorId]?.eliminadoEn ? proveedorId : null,
        soporte: { nombreArchivo: `factura_${clave}_${fecha}.pdf`, estado: 'adjunto', fecha },
        documento: null,
      },
      pago: { tipo: 'por_pagar', vence: masDias(fecha, plazo), cxpId },
    });
    indexarCxP(g, estado, cxpId, fecha);
  };
  if (dm === 2) {
    const p = O.publicidadEstacional.find((x) => x.mes === mes);
    if (p) yield* porPagar('publicidad', 'publicidad', p.concepto, p.valor, Math.round((p.valor * 19) / 119), 'pr_publicidad', 15);
  }
  if (dm === 5 && (O.empaques.meses as readonly number[]).includes(mes))
    yield* porPagar('empaques', 'empaques', 'Bolsas, cajas y papel de seda', O.empaques.valor, O.empaques.iva, O.empaques.proveedorId, 30);
  if (dm === 12) {
    for (const l of g.plan.localesVenta) {
      if (!localVivo(estado, l.id) || !rng.chance(O.mantenimiento.probabilidadMensual)) continue;
      const valor = Math.round(rng.rango(...O.mantenimiento.rango) / 10_000) * 10_000;
      yield* asegurarSaldo(g, emitir, estado, CUENTA_CORRIENTE, valor, fecha);
      yield emitir('gasto.registrar', {
        gastoId: idGenerado('gs', 'mantenimiento', fecha, l.id),
        datos: {
          fecha,
          localId: l.id,
          categoria: 'mantenimiento',
          concepto: rng.chance(0.5) ? 'Mantenimiento de iluminación y vitrinas' : 'Arreglos locativos',
          valor,
          iva: 0,
          proveedorId: null,
          soporte: null,
          documento: null,
        },
        pago: { tipo: 'inmediato', cuentaId: CUENTA_CORRIENTE, medio: 'transferencia' },
      });
    }
  }
}

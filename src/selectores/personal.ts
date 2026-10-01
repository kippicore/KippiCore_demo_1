import type {
  AsistenciaDia,
  Contrato,
  COP,
  Empleado,
  EsquemaComision,
  EstadoDominio,
  FechaHoraISO,
  FechaISO,
  Id,
  MesISO,
  Novedad,
  Turno,
} from '@/dominio/tipos';
import { asistenciaDia } from '@/dominio/reglas/asistencia';
import { calcularComision, type ResultadoComision } from '@/dominio/reglas/comisiones';
import { diasDelMes, mesDe, rangoFechas, sumarDias } from '@/dominio/reglas/fechas';
import { esDominicalOFestivo } from '@/dominio/reglas/festivos';
import { horasNetasTurno, horasNocturnasTurno, jornadaMaximaVigente } from '@/dominio/reglas/jornada';
import { valorHora } from '@/dominio/reglas/nomina';
import { redondear } from '@/dominio/reglas/dinero';
import { crearSelector } from './memo';
import { hechosEnFechas, resumirHechos, type ResumenVentas } from './ventas';
import { nombreEmpleado } from './base';

/** Personal, comisiones, turnos y asistencia (PLAN 6.23 `personal.ts`, 6.20.4, 6.20.7, 6.20.14, P6). */

export const selEmpleadoPorSlug = crearSelector<{ slug: string }, Empleado | null>(
  'selEmpleadoPorSlug',
  ['empleados'],
  (e, { slug }) => Object.values(e.empleados).find((x) => x.slug === slug) ?? null,
);

/** Contrato vigente en una fecha (el último que empezó antes y no terminó). */
export const selContratoVigente = crearSelector<{ empleadoId: Id; fecha: FechaISO }, Contrato | null>(
  'selContratoVigente',
  ['contratos'],
  (e, { empleadoId, fecha }) =>
    Object.values(e.contratos)
      .filter((c) => c.empleadoId === empleadoId && c.inicio <= fecha && (!c.fin || c.fin >= fecha))
      .sort((a, b) => (a.inicio < b.inicio ? 1 : -1))[0] ?? null,
);

export interface DetalleComision {
  ventaId: Id;
  numero: string;
  fecha: FechaISO;
  tipo: 'venta' | 'devolucion' | 'cancelacion';
  /** Base comisionable de la venta (sin IVA en la semilla; con IVA si el esquema lo dice), con signo. */
  base: COP;
  total: COP;
}

export interface ComisionEmpleado {
  empleadoId: Id;
  nombre: string;
  localId: Id | null;
  esquema: EsquemaComision | null;
  /** Base del periodo: ventas reconocidas − devoluciones y cancelaciones (P1). */
  base: COP;
  ventasConIva: COP;
  ventasLocalMes: COP;
  metaLocalMes: COP;
  comision: ResultadoComision;
  detalle: DetalleComision[];
}

/**
 * Comisión del mes a la fecha por vendedor (6.20.4, P1): misma regla que la liquidación (`ventasDelMes` y
 * `calcularComision`), derivada de las ventas reconocidas; cambiar el vendedor de una venta mueve la comisión.
 */
export const selComisiones = crearSelector<{ mes: MesISO; hoy: FechaISO; empleadoId?: Id }, ComisionEmpleado[]>(
  'selComisiones',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'empleados', 'contratos', 'esquemasComision', 'metas'],
  (e, { mes, hoy, empleadoId }) => {
    const fin = `${mes}-${String(diasDelMes(mes)).padStart(2, '0')}`;
    const hasta = hoy < fin ? hoy : fin;
    const hechos = hechosEnFechas(e, { desde: `${mes}-01`, hasta });
    const porVendedor = new Map<Id, { base: number; total: number; detalle: Map<string, DetalleComision> }>();
    const totalLocal = new Map<Id, number>();
    for (const h of hechos) {
      totalLocal.set(h.localId, (totalLocal.get(h.localId) ?? 0) + h.total);
      let a = porVendedor.get(h.vendedorId);
      if (!a) porVendedor.set(h.vendedorId, (a = { base: 0, total: 0, detalle: new Map() }));
      a.base += h.base;
      a.total += h.total;
      const k = `${h.ventaId}|${h.tipo}|${h.fecha}`;
      const d = a.detalle.get(k);
      if (d) {
        d.base += h.base;
        d.total += h.total;
      } else
        a.detalle.set(k, { ventaId: h.ventaId, numero: e.ventas[h.ventaId]?.numero ?? '', fecha: h.fecha, tipo: h.tipo, base: h.base, total: h.total });
    }
    const r: ComisionEmpleado[] = [];
    for (const em of Object.values(e.empleados)) {
      if (em.eliminadoEn || (empleadoId && em.id !== empleadoId)) continue;
      const contrato = e.contratos[em.contratoVigenteId];
      const esquema = contrato?.esquemaComisionId ? (e.esquemasComision[contrato.esquemaComisionId] ?? null) : null;
      if (!esquema && !empleadoId) continue;
      const a = porVendedor.get(em.id);
      const base = esquema?.base === 'total_con_iva' ? (a?.total ?? 0) : (a?.base ?? 0);
      const ventasLocalMes = em.localId ? (totalLocal.get(em.localId) ?? 0) : 0;
      const metaLocalMes = em.localId ? (Object.values(e.metas).find((m) => m.localId === em.localId && m.mes === mes)?.valor ?? 0) : 0;
      const comision = esquema ? calcularComision(esquema, { base, ventasLocalMes, metaLocalMes }) : { total: 0, componentes: [] };
      const detalle = [...(a?.detalle.values() ?? [])];
      r.push({
        empleadoId: em.id,
        nombre: nombreEmpleado(em),
        localId: em.localId,
        esquema,
        base,
        ventasConIva: a?.total ?? 0,
        ventasLocalMes,
        metaLocalMes,
        comision,
        detalle: detalle.sort((x, y) => (x.fecha < y.fecha ? 1 : -1)),
      });
    }
    return r.sort((a, b) => b.comision.total - a.comision.total || (a.nombre < b.nombre ? -1 : 1));
  },
);

export interface ResumenAsistencia {
  empleadoId: Id;
  nombre: string;
  turnos: number;
  aTiempo: number;
  tardes: number;
  minutosTarde: number;
  ausencias: number;
  horasTrabajadas: number;
  horasExtra: number;
}

function novedadDe(e: EstadoDominio, empleadoId: Id, fecha: FechaISO): Novedad | null {
  for (const n of Object.values(e.novedades)) if (!n.eliminadoEn && n.empleadoId === empleadoId && fecha >= n.desde && fecha <= n.hasta) return n;
  return null;
}

/** Asistencia derivada por empleado y día (6.20.7) en un rango, con resumen por empleado (C2, alerta 5). */
export const selAsistencia = crearSelector<
  { desde: FechaISO; hasta: FechaISO; ahora: FechaHoraISO; empleadoId?: Id; localId?: Id | 'todos' },
  { dias: AsistenciaDia[]; resumen: ResumenAsistencia[] }
>('selAsistencia', ['turnos', 'marcaciones', 'novedades', 'empleados', 'parametros', 'agregados'], (e, f) => {
  const dias: AsistenciaDia[] = [];
  const conTurno = new Set<string>();
  for (const t of Object.values(e.turnos)) {
    if (t.fecha < f.desde || t.fecha > f.hasta) continue;
    if (f.empleadoId && t.empleadoId !== f.empleadoId) continue;
    if (f.localId && f.localId !== 'todos' && t.localId !== f.localId) continue;
    const k = `${t.empleadoId}@${t.fecha}`;
    conTurno.add(k);
    const marcs = (e.agregados.marcacionesDia[k] ?? []).map((id) => e.marcaciones[id]).filter((m) => !!m);
    dias.push(
      asistenciaDia({
        empleadoId: t.empleadoId,
        fecha: t.fecha,
        turno: t,
        marcaciones: marcs,
        novedad: novedadDe(e, t.empleadoId, t.fecha),
        ahora: f.ahora,
        parametros: e.parametros.nomina,
        dominicalOFestivo: esDominicalOFestivo(t.fecha),
      }),
    );
  }
  // Marcaciones sin turno.
  for (const [k, ids] of Object.entries(e.agregados.marcacionesDia)) {
    if (conTurno.has(k) || ids.length === 0) continue;
    const [empleadoId, fecha] = k.split('@') as [Id, FechaISO];
    if (fecha < f.desde || fecha > f.hasta || (f.empleadoId && empleadoId !== f.empleadoId)) continue;
    const marcs = ids.map((id) => e.marcaciones[id]).filter((m) => !!m);
    if (f.localId && f.localId !== 'todos' && marcs[0]?.localId !== f.localId) continue;
    dias.push(
      asistenciaDia({
        empleadoId,
        fecha,
        turno: null,
        marcaciones: marcs,
        novedad: null,
        ahora: f.ahora,
        parametros: e.parametros.nomina,
        dominicalOFestivo: esDominicalOFestivo(fecha),
      }),
    );
  }
  dias.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.empleadoId < b.empleadoId ? -1 : 1));
  const porEmpleado = new Map<Id, ResumenAsistencia>();
  for (const d of dias) {
    let r = porEmpleado.get(d.empleadoId);
    if (!r) {
      r = { empleadoId: d.empleadoId, nombre: nombreEmpleado(e.empleados[d.empleadoId]), turnos: 0, aTiempo: 0, tardes: 0, minutosTarde: 0, ausencias: 0, horasTrabajadas: 0, horasExtra: 0 };
      porEmpleado.set(d.empleadoId, r);
    }
    if (d.turnoId) r.turnos += 1;
    if (d.estado === 'a_tiempo') r.aTiempo += 1;
    if (d.estado === 'tarde') {
      r.tardes += 1;
      r.minutosTarde += d.minutosTarde;
    }
    if (d.estado === 'ausente') r.ausencias += 1;
    r.horasTrabajadas += d.horasTrabajadas;
    r.horasExtra += d.horasExtraDiurnas + d.horasExtraNocturnas;
  }
  return { dias, resumen: [...porEmpleado.values()].sort((a, b) => (a.nombre < b.nombre ? -1 : 1)) };
});

/** Horas netas programadas de un empleado en la semana y su máximo vigente (P2). */
export const selHorasSemana = crearSelector<{ empleadoId: Id; lunes: FechaISO }, { horas: number; maximo: number; exceso: number; turnos: Turno[] }>(
  'selHorasSemana',
  ['turnos', 'parametros', 'agregados'],
  (e, { empleadoId, lunes }) => {
    const turnos: Turno[] = [];
    for (const f of rangoFechas(lunes, sumarDias(lunes, 6)))
      for (const id of e.agregados.turnosDia[`${empleadoId}@${f}`] ?? []) {
        const t = e.turnos[id];
        if (t) turnos.push(t);
      }
    const horas = turnos.reduce((a, t) => a + horasNetasTurno(t), 0);
    const maximo = jornadaMaximaVigente(e.parametros.nomina, lunes);
    return { horas, maximo, exceso: Math.max(0, horas - maximo), turnos };
  },
);

export interface SemanaTurnos {
  dias: FechaISO[];
  empleados: { empleadoId: Id; nombre: string; porDia: Record<FechaISO, Turno[]>; horas: number; maximo: number }[];
}

/** Cuadrícula semanal de turnos de un local (C2). */
export const selTurnosSemana = crearSelector<{ localId: Id; lunes: FechaISO }, SemanaTurnos>(
  'selTurnosSemana',
  ['turnos', 'empleados', 'parametros'],
  (e, { localId, lunes }) => {
    const dias = rangoFechas(lunes, sumarDias(lunes, 6));
    const fin = dias[6] ?? lunes;
    const m = new Map<Id, SemanaTurnos['empleados'][number]>();
    for (const em of Object.values(e.empleados))
      if (!em.eliminadoEn && em.localId === localId && (!em.fechaRetiro || em.fechaRetiro >= lunes))
        m.set(em.id, { empleadoId: em.id, nombre: nombreEmpleado(em), porDia: {}, horas: 0, maximo: jornadaMaximaVigente(e.parametros.nomina, lunes) });
    for (const t of Object.values(e.turnos)) {
      if (t.localId !== localId || t.fecha < lunes || t.fecha > fin) continue;
      let x = m.get(t.empleadoId);
      if (!x) {
        x = { empleadoId: t.empleadoId, nombre: nombreEmpleado(e.empleados[t.empleadoId]), porDia: {}, horas: 0, maximo: jornadaMaximaVigente(e.parametros.nomina, lunes) };
        m.set(t.empleadoId, x);
      }
      (x.porDia[t.fecha] ??= []).push(t);
      x.horas += horasNetasTurno(t);
    }
    return { dias, empleados: [...m.values()].sort((a, b) => (a.nombre < b.nombre ? -1 : 1)) };
  },
);

export interface MiDia {
  empleado: Empleado | null;
  ventasHoy: ResumenVentas;
  comisionMes: COP;
  baseComisionMes: COP;
  meta: { localId: Id; valor: COP; ventasMes: COP; avance: number } | null;
  turnoHoy: Turno | null;
  marcacionesHoy: { tipo: 'entrada' | 'salida'; ts: FechaHoraISO }[];
  siguienteMarcacion: 'entrada' | 'salida';
}

/** "Mi día" del vendedor (W8): ventas de hoy, comisión del mes, meta del local, turno y marcación. */
export const selMiDia = crearSelector<{ empleadoId: Id; ahora: FechaHoraISO }, MiDia>(
  'selMiDia',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'empleados', 'contratos', 'esquemasComision', 'metas', 'turnos', 'marcaciones', 'agregados'],
  (e, { empleadoId, ahora }) => {
    const hoy = ahora.slice(0, 10);
    const em = e.empleados[empleadoId] ?? null;
    const ventasHoy = resumirHechos(hechosEnFechas(e, { desde: hoy, hasta: hoy }).filter((h) => h.vendedorId === empleadoId && h.ts <= ahora));
    const c = selComisiones(e, { mes: mesDe(hoy), hoy, empleadoId })[0];
    const turnoHoy = (e.agregados.turnosDia[`${empleadoId}@${hoy}`] ?? []).map((id) => e.turnos[id]).find((t) => !!t) ?? null;
    const marcacionesHoy = (e.agregados.marcacionesDia[`${empleadoId}@${hoy}`] ?? [])
      .map((id) => e.marcaciones[id])
      .filter((m) => !!m)
      .map((m) => ({ tipo: m.tipo, ts: m.ts }));
    const ultima = marcacionesHoy[marcacionesHoy.length - 1];
    let meta: MiDia['meta'] = null;
    if (em?.localId && c) {
      const valor = Object.values(e.metas).find((m) => m.localId === em.localId && m.mes === mesDe(hoy))?.valor ?? 0;
      if (valor > 0) meta = { localId: em.localId, valor, ventasMes: c.ventasLocalMes, avance: c.ventasLocalMes / valor };
    }
    return {
      empleado: em,
      ventasHoy,
      comisionMes: c?.comision.total ?? 0,
      baseComisionMes: c?.base ?? 0,
      meta,
      turnoHoy,
      marcacionesHoy,
      siguienteMarcacion: ultima?.tipo === 'entrada' ? 'salida' : 'entrada',
    };
  },
);

export interface RiesgoContratacion {
  empleadoId: Id;
  nombre: string;
  contratoId: Id;
  semanasConTurnos: number;
  marcaciones: number;
}

/**
 * Riesgo de contrato realidad (6.19 P6, P22): prestación de servicios con al menos `minimoTurnosPorSemana` días
 * con turno en cada una de las últimas `semanasRevisadas` semanas (sin hoy) y con marcaciones.
 */
export const selRiesgosContratacion = crearSelector<{ hoy: FechaISO }, RiesgoContratacion[]>(
  'selRiesgosContratacion',
  ['empleados', 'contratos', 'parametros', 'agregados'],
  (e, { hoy }) => {
    const { semanasRevisadas, minimoTurnosPorSemana } = e.parametros.nomina.riesgoContratoRealidad;
    const r: RiesgoContratacion[] = [];
    const marcasPorEmpleado = new Map<Id, number>();
    for (const [k, ids] of Object.entries(e.agregados.marcacionesDia)) {
      const id = k.slice(0, k.indexOf('@'));
      marcasPorEmpleado.set(id, (marcasPorEmpleado.get(id) ?? 0) + ids.length);
    }
    for (const em of Object.values(e.empleados)) {
      if (em.eliminadoEn || (em.fechaRetiro && em.fechaRetiro < hoy)) continue;
      const c = e.contratos[em.contratoVigenteId];
      if (!c || c.tipo !== 'prestacion_servicios') continue;
      let semanas = 0;
      for (let s = 0; s < semanasRevisadas; s++) {
        let dias = 0;
        for (let d = 0; d < 7; d++) if ((e.agregados.turnosDia[`${em.id}@${sumarDias(hoy, -(s * 7 + d) - 1)}`]?.length ?? 0) > 0) dias += 1;
        if (dias >= minimoTurnosPorSemana) semanas += 1;
      }
      const marcaciones = marcasPorEmpleado.get(em.id) ?? 0;
      if (semanas >= semanasRevisadas && marcaciones > 0)
        r.push({ empleadoId: em.id, nombre: nombreEmpleado(em), contratoId: c.id, semanasConTurnos: semanas, marcaciones });
    }
    return r.sort((a, b) => (a.nombre < b.nombre ? -1 : 1));
  },
);

export interface RecargoEmpleado {
  empleadoId: Id;
  nombre: string;
  horasNocturnas: number;
  horasDominicalFestivo: number;
  /** Recargo por cerrar tarde (horas nocturnas × valor hora × % nocturno; compartidos C-D, pedido de C2). */
  valorNocturno: COP;
  /** Recargo por trabajar domingo o festivo. */
  valorDominical: COP;
  /** valorNocturno + valorDominical. */
  valor: COP;
}

/** Recargo estimado de la semana por empleado y local (6.20.14), con los parámetros marcados "Verificar". */
export const selRecargosTurnos = crearSelector<{ localId: Id; lunes: FechaISO }, { empleados: RecargoEmpleado[]; total: COP }>(
  'selRecargosTurnos',
  ['turnos', 'empleados', 'contratos', 'parametros'],
  (e, { localId, lunes }) => {
    const fin = sumarDias(lunes, 6);
    const p = e.parametros.nomina;
    const m = new Map<Id, RecargoEmpleado>();
    for (const t of Object.values(e.turnos)) {
      if (t.localId !== localId || t.fecha < lunes || t.fecha > fin) continue;
      const em = e.empleados[t.empleadoId];
      const c = em ? e.contratos[em.contratoVigenteId] : undefined;
      const vh = c?.salarioBase ? valorHora(c.salarioBase, p, t.fecha) : 0;
      const noct = horasNocturnasTurno(t, p.jornadaNocturna);
      const domFest = esDominicalOFestivo(t.fecha) ? horasNetasTurno(t) : 0;
      let x = m.get(t.empleadoId);
      if (!x)
        m.set(
          t.empleadoId,
          (x = { empleadoId: t.empleadoId, nombre: nombreEmpleado(em), horasNocturnas: 0, horasDominicalFestivo: 0, valorNocturno: 0, valorDominical: 0, valor: 0 }),
        );
      const vn = redondear(noct * vh * p.recargos.nocturno);
      const vd = redondear(domFest * vh * p.recargos.dominicalFestivo);
      x.horasNocturnas += noct;
      x.horasDominicalFestivo += domFest;
      x.valorNocturno += vn;
      x.valorDominical += vd;
      x.valor += vn + vd;
    }
    const empleados = [...m.values()].sort((a, b) => b.valor - a.valor);
    return { empleados, total: empleados.reduce((a, x) => a + x.valor, 0) };
  },
);

export interface LiquidacionFinal {
  empleadoId: Id;
  diasAnio: number;
  diasSemestre: number;
  base: COP;
  cesantias: COP;
  intereses: COP;
  prima: COP;
  vacaciones: COP;
  total: COP;
}

/**
 * Liquidación final ilustrativa (complemento de C1): prestaciones proporcionales al retiro con la base del
 * salario (sin promedio de variables). `<NotaLegal tipo="nomina">` obligatoria donde se muestre.
 */
export const selLiquidacionFinal = crearSelector<{ empleadoId: Id; fecha: FechaISO }, LiquidacionFinal | null>(
  'selLiquidacionFinal',
  ['empleados', 'contratos', 'parametros'],
  (e, { empleadoId, fecha }) => {
    const em = e.empleados[empleadoId];
    const c = em ? e.contratos[em.contratoVigenteId] : undefined;
    if (!em || !c || c.tipo !== 'laboral' || !c.salarioBase) return null;
    const p = e.parametros.nomina;
    const inicioAnio = `${fecha.slice(0, 4)}-01-01` > em.fechaIngreso ? `${fecha.slice(0, 4)}-01-01` : em.fechaIngreso;
    const inicioSem = (Number(fecha.slice(5, 7)) <= 6 ? `${fecha.slice(0, 4)}-01-01` : `${fecha.slice(0, 4)}-07-01`) > em.fechaIngreso
      ? Number(fecha.slice(5, 7)) <= 6 ? `${fecha.slice(0, 4)}-01-01` : `${fecha.slice(0, 4)}-07-01`
      : em.fechaIngreso;
    const diasAnio = rangoFechas(inicioAnio, fecha).length;
    const diasSemestre = rangoFechas(inicioSem, fecha).length;
    const auxilio = c.salarioBase <= p.topeAuxilioSMMLV * p.smmlv ? p.auxilioTransporte : 0;
    const base = c.salarioBase + auxilio;
    const cesantias = redondear((base * diasAnio) / 360);
    const intereses = redondear((cesantias * p.provisiones.interesesCesantiasAnual * diasAnio) / 360);
    const prima = redondear((base * diasSemestre) / 360);
    const vacaciones = redondear((c.salarioBase * diasAnio) / 720);
    return { empleadoId, diasAnio, diasSemestre, base, cesantias, intereses, prima, vacaciones, total: cesantias + intereses + prima + vacaciones };
  },
);

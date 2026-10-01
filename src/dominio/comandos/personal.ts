import type {
  Contrato,
  DatosContrato,
  DatosEmpleado,
  DatosNovedad,
  Empleado,
  EsquemaComision,
  EstadoDominio,
  FechaISO,
  HoraHHmm,
  Id,
  Marcacion,
  MetaVentas,
  Novedad,
  TipoTurno,
  Turno,
} from '../tipos';
import { exigir, fallar } from '../errores';
import { esquemaValido } from '../reglas/comisiones';
import { diaSemana, diferenciaDias, fechaDe, lunesDe, sumarDias } from '../reglas/fechas';
import { horasNetasTurno, jornadaMaximaVigente, minutosBrutos, seSolapan } from '../reglas/jornada';
import { SLUGS_RESERVADOS } from '@/config/nomina';
import {
  RE_CELULAR,
  RE_CORREO,
  fechaValida,
  idNuevo,
  requerir,
  requerirExiste,
  textoObligatorio,
  tsValido,
} from './comunes';
import { crudEliminar } from './crud';
import {
  claveMarcacionDia,
  claveTurnoDia,
  desindexarTurno,
  fijarIndiceMarcaciones,
  indexarTurno,
  manejador,
  marcarEditado,
  traza,
} from './tx';

/** Personal: empleados, contratos, comisiones, metas, turnos, marcaciones, novedades y PILA (PLAN 6.9, 6.21). */

const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const RE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TIPOS_TURNO: TipoTurno[] = ['apertura', 'intermedio', 'cierre', 'completo'];

export function activoEn(e: Empleado, fecha: FechaISO): boolean {
  return !e.eliminadoEn && e.fechaIngreso <= fecha && (e.fechaRetiro === null || e.fechaRetiro >= fecha);
}

function validarDatosEmpleado(
  estado: EstadoDominio,
  d: Partial<DatosEmpleado>,
  completo: boolean,
  excluirId: Id | null,
): void {
  if (completo || d.nombres !== undefined) textoObligatorio(d.nombres, 'nombres', 'Escribe los nombres.');
  if (completo || d.apellidos !== undefined)
    textoObligatorio(d.apellidos, 'apellidos', 'Escribe los apellidos.');
  if (completo || d.documento !== undefined) {
    textoObligatorio(d.documento?.numero, 'documento', 'Escribe el número de documento.');
    const repetido = Object.values(estado.empleados).some(
      (e) =>
        !e.eliminadoEn &&
        e.id !== excluirId &&
        e.documento.tipo === d.documento?.tipo &&
        e.documento.numero === d.documento.numero,
    );
    exigir(!repetido, 'DOCUMENTO_DUPLICADO', 'Ya hay un empleado con ese documento.', 'documento');
  }
  if (completo || d.slug !== undefined) {
    exigir(
      RE_SLUG.test(d.slug ?? ''),
      'SLUG_INVALIDO',
      'El identificador va en minúsculas y con guiones, como sebastian-cardenas.',
      'slug',
    );
    exigir(
      !(SLUGS_RESERVADOS as readonly string[]).includes(d.slug ?? ''),
      'SLUG_RESERVADO',
      'Ese identificador está reservado; agrégale -2.',
      'slug',
    );
    exigir(
      !Object.values(estado.empleados).some((e) => e.id !== excluirId && e.slug === d.slug),
      'SLUG_DUPLICADO',
      'Ese identificador ya existe; agrégale -2.',
      'slug',
    );
  }
  if (completo || d.fechaIngreso !== undefined) fechaValida(d.fechaIngreso, 'fechaIngreso');
  if (completo || d.celular !== undefined)
    exigir(
      RE_CELULAR.test(d.celular ?? ''),
      'CELULAR_INVALIDO',
      'Escribe un celular de 10 dígitos que empiece por 3.',
      'celular',
    );
  if (completo || d.correo !== undefined)
    exigir(RE_CORREO.test(d.correo ?? ''), 'CORREO_INVALIDO', 'Escribe un correo válido.', 'correo');
  if (d.localId) requerir(estado.locales, d.localId, 'el local', 'localId');
}

function validarContrato(estado: EstadoDominio, c: DatosContrato): void {
  fechaValida(c.inicio, 'inicio');
  if (c.fin !== null) fechaValida(c.fin, 'fin');
  const p = estado.parametros.nomina;
  if (c.tipo === 'laboral') {
    exigir(
      c.salarioBase !== null && Number.isInteger(c.salarioBase) && c.salarioBase >= p.smmlv,
      'SALARIO_MINIMO',
      'El salario no puede ser menor que el salario mínimo.',
      'salarioBase',
    );
  } else {
    exigir(
      c.honorarios !== null && Number.isInteger(c.honorarios) && c.honorarios > 0,
      'HONORARIOS',
      'Escribe los honorarios mensuales.',
      'honorarios',
    );
  }
  const max = jornadaMaximaVigente(p, c.inicio);
  exigir(
    c.jornadaSemanalHoras > 0 && c.jornadaSemanalHoras <= max,
    'JORNADA_EXCEDE',
    `La jornada no puede pasar de ${max} horas semanales.`,
    'jornadaSemanalHoras',
  );
  exigir([1, 2, 3, 4, 5].includes(c.riesgoArl), 'ARL_INVALIDA', 'El riesgo de ARL va de 1 a 5.', 'riesgoArl');
  if (c.esquemaComisionId)
    requerir(estado.esquemasComision, c.esquemaComisionId, 'el esquema de comisión', 'esquemaComisionId');
  if (c.retencionFuente !== null)
    exigir(
      c.retencionFuente >= 0 && c.retencionFuente <= 1,
      'VALOR_INVALIDO',
      'La retención va entre 0 % y 100 %.',
      'retencionFuente',
    );
}

export const empleadoCrear = manejador<'empleado.crear', { empleado: Empleado; contrato: Contrato }>({
  validar(estado, d, ctx) {
    idNuevo(estado.empleados, d.empleadoId, 'empleadoId');
    idNuevo(estado.contratos, d.contratoId, 'contratoId');
    validarDatosEmpleado(estado, d.datos, true, null);
    validarContrato(estado, d.contrato);
    exigir(
      d.contrato.inicio >= d.datos.fechaIngreso,
      'FECHA_INVALIDA',
      'El contrato empieza en la fecha de ingreso o después.',
      'inicio',
    );
    return {
      empleado: { ...traza(ctx), ...d.datos, id: d.empleadoId, contratoVigenteId: d.contratoId },
      contrato: {
        ...traza(ctx),
        ...d.contrato,
        verificacionesPila: [...d.contrato.verificacionesPila],
        id: d.contratoId,
        empleadoId: d.empleadoId,
      },
    };
  },
  escribir(estado, plan, ctx) {
    estado.empleados[plan.empleado.id] = plan.empleado;
    estado.contratos[plan.contrato.id] = plan.contrato;
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'empleados', id: plan.empleado.id, accion: 'creada' });
  },
});

export const empleadoEditar = manejador<'empleado.editar', { id: Id; cambios: Partial<Empleado> }>({
  validar(estado, d) {
    const e = requerir(estado.empleados, d.empleadoId, 'el empleado', 'empleadoId');
    exigir(
      d.cambios.slug === undefined || d.cambios.slug === e.slug,
      'SLUG_INMUTABLE',
      'El identificador del empleado no se cambia.',
      'slug',
    );
    const { slug: _s, ...resto } = d.cambios;
    validarDatosEmpleado(estado, resto, false, e.id);
    return { id: e.id, cambios: { ...resto } };
  },
  escribir(estado, plan, ctx) {
    const e = estado.empleados[plan.id];
    if (!e) return;
    Object.assign(e, plan.cambios);
    marcarEditado(e, ctx);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'empleados', id: e.id, accion: 'editada' });
  },
});

export const empleadoRetirar = manejador<
  'empleado.retirar',
  { id: Id; fecha: FechaISO; turnosFuturos: Id[]; usuarios: Id[] }
>({
  validar(estado, d) {
    const e = requerir(estado.empleados, d.empleadoId, 'el empleado', 'empleadoId');
    exigir(e.fechaRetiro === null, 'YA_RETIRADO', `${e.nombres} ya está retirado.`, 'empleadoId');
    fechaValida(d.fecha, 'fecha');
    exigir(d.fecha >= e.fechaIngreso, 'FECHA_INVALIDA', 'El retiro no puede ser antes del ingreso.', 'fecha');
    textoObligatorio(d.motivo, 'motivo', 'Escribe el motivo del retiro.');
    const turnosFuturos = Object.values(estado.turnos)
      .filter((t) => t.empleadoId === e.id && t.fecha > d.fecha)
      .map((t) => t.id);
    const usuarios = Object.values(estado.usuarios)
      .filter((u) => u.empleadoId === e.id)
      .map((u) => u.id);
    return { id: e.id, fecha: d.fecha, turnosFuturos, usuarios };
  },
  escribir(estado, plan, ctx) {
    const e = estado.empleados[plan.id];
    if (!e) return;
    e.fechaRetiro = plan.fecha;
    const c = estado.contratos[e.contratoVigenteId];
    if (c) c.fin = plan.fecha;
    for (const t of plan.turnosFuturos) {
      const previo = estado.turnos[t];
      if (previo) desindexarTurno(estado, previo);
      delete estado.turnos[t];
    }
    for (const u of plan.usuarios) {
      const usuario = estado.usuarios[u];
      if (usuario) usuario.activo = false;
    }
    marcarEditado(e, ctx);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'empleados', id: e.id, accion: 'editada' });
  },
});

export const contratoReemplazar = manejador<
  'contrato.reemplazar',
  { empleadoId: Id; anteriorId: Id; finAnterior: FechaISO; contrato: Contrato }
>({
  validar(estado, d, ctx) {
    const e = requerir(estado.empleados, d.empleadoId, 'el empleado', 'empleadoId');
    exigir(e.fechaRetiro === null, 'RETIRADO', `${e.nombres} está retirado.`, 'empleadoId');
    idNuevo(estado.contratos, d.contratoId, 'contratoId');
    const anterior = requerirExiste(
      estado.contratos,
      e.contratoVigenteId,
      'el contrato vigente',
      'empleadoId',
    );
    fechaValida(d.desde, 'desde');
    exigir(
      d.desde > anterior.inicio,
      'FECHA_INVALIDA',
      'El nuevo contrato empieza después del vigente.',
      'desde',
    );
    const nuevo = { ...d.contrato, inicio: d.desde };
    validarContrato(estado, nuevo);
    return {
      empleadoId: e.id,
      anteriorId: anterior.id,
      finAnterior: sumarDias(d.desde, -1),
      contrato: {
        ...traza(ctx),
        ...nuevo,
        verificacionesPila: [...nuevo.verificacionesPila],
        id: d.contratoId,
        empleadoId: e.id,
      },
    };
  },
  escribir(estado, plan, ctx) {
    const e = estado.empleados[plan.empleadoId];
    const anterior = estado.contratos[plan.anteriorId];
    if (!e || !anterior) return;
    anterior.fin = plan.finAnterior;
    estado.contratos[plan.contrato.id] = plan.contrato;
    e.contratoVigenteId = plan.contrato.id;
    marcarEditado(e, ctx);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'contratos', id: plan.contrato.id, accion: 'creada' });
  },
});

// ---------- Comisiones y metas ----------

function validarEsquema(
  d: Partial<Pick<EsquemaComision, 'nombre' | 'base' | 'componentes'>>,
  completo: boolean,
): void {
  if (completo || d.nombre !== undefined)
    textoObligatorio(d.nombre, 'nombre', 'Escribe el nombre del esquema.');
  if (completo || d.base !== undefined)
    exigir(
      d.base === 'base_sin_iva' || d.base === 'total_con_iva',
      'BASE_INVALIDA',
      'Elige si la comisión va con o sin IVA.',
      'base',
    );
  if (completo || d.componentes !== undefined) {
    const error = esquemaValido(d.componentes ?? []);
    if (error) fallar('ESQUEMA_INVALIDO', error, 'componentes');
  }
}

export const esquemaComisionCrear = manejador<'esquemaComision.crear', EsquemaComision>({
  validar(estado, d, ctx) {
    idNuevo(estado.esquemasComision, d.esquemaId, 'esquemaId');
    validarEsquema(d.datos, true);
    return { ...traza(ctx), ...d.datos, componentes: structuredClone(d.datos.componentes), id: d.esquemaId };
  },
  escribir(estado, e, ctx) {
    estado.esquemasComision[e.id] = e;
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'esquemasComision', id: e.id, accion: 'creada' });
  },
});

export const esquemaComisionEditar = manejador<
  'esquemaComision.editar',
  { id: Id; cambios: Partial<EsquemaComision> }
>({
  validar(estado, d) {
    const e = requerir(estado.esquemasComision, d.esquemaId, 'el esquema', 'esquemaId');
    validarEsquema(d.cambios, false);
    return { id: e.id, cambios: structuredClone(d.cambios) };
  },
  escribir(estado, plan, ctx) {
    const e = estado.esquemasComision[plan.id];
    if (!e) return;
    Object.assign(e, plan.cambios);
    marcarEditado(e, ctx);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'esquemasComision', id: e.id, accion: 'editada' });
  },
});

export const esquemaComisionEliminar = crudEliminar<'esquemaComision.eliminar', EsquemaComision>({
  coleccion: 'esquemasComision',
  id: (d) => d.esquemaId,
  nombre: 'el esquema',
  validar(estado, e) {
    const usos = Object.values(estado.empleados).filter(
      (x) => !x.fechaRetiro && estado.contratos[x.contratoVigenteId]?.esquemaComisionId === e.id,
    ).length;
    exigir(usos === 0, 'ESQUEMA_EN_USO', `Lo usan ${usos} contratos vigentes.`, 'esquemaId');
  },
});

export const metaFijar = manejador<'meta.fijar', MetaVentas>({
  validar(estado, d) {
    const local = requerir(estado.locales, d.localId, 'el local', 'localId');
    exigir(local.vende, 'LOCAL_NO_VENDE', `${local.nombre} no vende.`, 'localId');
    exigir(/^\d{4}-\d{2}$/.test(d.mes), 'MES_INVALIDO', 'Escribe el mes (AAAA-MM).', 'mes');
    exigir(
      Number.isInteger(d.valor) && d.valor > 0,
      'VALOR_INVALIDO',
      'La meta debe ser mayor que cero.',
      'valor',
    );
    const existente = Object.values(estado.metas).find((m) => m.localId === local.id && m.mes === d.mes);
    return { id: existente?.id ?? d.metaId, localId: local.id, mes: d.mes, valor: d.valor };
  },
  escribir(estado, meta, ctx) {
    estado.metas[meta.id] = meta;
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'metas', id: meta.id, accion: 'editada' });
  },
});

// ---------- Turnos ----------

interface TurnoPlan {
  id: Id;
  empleadoId: Id;
  localId: Id;
  fecha: FechaISO;
  tipo: TipoTurno;
  inicio: HoraHHmm;
  fin: HoraHHmm;
  descansoMin: number;
}

/** Valida un conjunto de turnos nuevos o movidos (solapes y jornada semanal, P2). Devuelve si cada uno excede. */
function validarTurnos(
  estado: EstadoDominio,
  nuevos: readonly TurnoPlan[],
  excluir: ReadonlySet<Id>,
  aceptarExceso: boolean,
): boolean[] {
  // Turnos de un empleado en un día: los guardados (índice `turnosDia`, sin los excluidos) más los nuevos.
  const delDia = (empleadoId: Id, fecha: FechaISO): TurnoPlan[] => {
    const r: TurnoPlan[] = [];
    for (const id of estado.agregados.turnosDia[claveTurnoDia(empleadoId, fecha)] ?? []) {
      const t = estado.turnos[id];
      if (t && !excluir.has(id)) r.push(t);
    }
    for (const n of nuevos) if (n.empleadoId === empleadoId && n.fecha === fecha) r.push(n);
    return r;
  };
  return nuevos.map((t) => {
    const e = requerir(estado.empleados, t.empleadoId, 'el empleado', 'empleadoId');
    exigir(
      activoEn(e, t.fecha),
      'EMPLEADO_INACTIVO',
      `${e.nombres} no está activo el ${t.fecha}.`,
      'empleadoId',
    );
    requerir(estado.locales, t.localId, 'el local', 'localId');
    fechaValida(t.fecha, 'fecha');
    exigir(TIPOS_TURNO.includes(t.tipo), 'TIPO_INVALIDO', 'Elige el tipo de turno.', 'tipo');
    exigir(
      RE_HORA.test(t.inicio) && RE_HORA.test(t.fin),
      'HORA_INVALIDA',
      'Escribe las horas como 10:00.',
      'inicio',
    );
    exigir(
      Number.isInteger(t.descansoMin) && t.descansoMin >= 0 && t.descansoMin < minutosBrutos(t.inicio, t.fin),
      'DESCANSO_INVALIDO',
      'El descanso debe ser menor que el turno.',
      'descansoMin',
    );
    for (const o of delDia(t.empleadoId, t.fecha)) {
      if (o.id === t.id) continue;
      if (seSolapan(o, t))
        fallar(
          'TURNO_SOLAPADO',
          `${e.nombres} ya tiene un turno de ${o.inicio} a ${o.fin} ese día.`,
          'inicio',
        );
    }
    const lunes = lunesDe(t.fecha);
    let horas = 0;
    for (let k = 0; k < 7; k++) for (const o of delDia(t.empleadoId, sumarDias(lunes, k))) horas += horasNetasTurno(o);
    const max = jornadaMaximaVigente(estado.parametros.nomina, lunes);
    const excede = horas > max + 1e-9;
    if (excede && !aceptarExceso) {
      fallar(
        'JORNADA_EXCEDIDA',
        `Con este turno, ${e.nombres} quedaría con ${Math.round(horas * 10) / 10} h esta semana (máximo ${max} h). Confirma si son horas extra.`,
        'fin',
      );
    }
    return excede;
  });
}

function construirTurno(t: TurnoPlan, excede: boolean, ctx: Parameters<typeof traza>[0]): Turno {
  return { ...traza(ctx), ...t, excedeJornadaAceptado: excede };
}

export const turnoAsignar = manejador<'turno.asignar', Turno>({
  validar(estado, d, ctx) {
    idNuevo(estado.turnos, d.turnoId, 'turnoId');
    const plan: TurnoPlan = {
      id: d.turnoId,
      empleadoId: d.empleadoId,
      localId: d.localId,
      fecha: d.fecha,
      tipo: d.tipo,
      inicio: d.inicio,
      fin: d.fin,
      descansoMin: d.descansoMin,
    };
    const [excede] = validarTurnos(estado, [plan], new Set(), d.aceptarExceso);
    return construirTurno(plan, excede ?? false, ctx);
  },
  escribir(estado, t, ctx) {
    estado.turnos[t.id] = t;
    indexarTurno(estado, t);
    ctx.emitir({ tipo: 'TurnoCambiado', turnoId: t.id });
  },
});

export const turnoMover = manejador<'turno.mover', Turno>({
  validar(estado, d, ctx) {
    const actual = requerirExiste(estado.turnos, d.turnoId, 'el turno', 'turnoId');
    const plan: TurnoPlan = {
      id: actual.id,
      empleadoId: d.empleadoId,
      localId: d.localId,
      fecha: d.fecha,
      tipo: d.tipo,
      inicio: d.inicio,
      fin: d.fin,
      descansoMin: actual.descansoMin,
    };
    const [excede] = validarTurnos(estado, [plan], new Set([actual.id]), d.aceptarExceso);
    return {
      ...actual,
      ...plan,
      excedeJornadaAceptado: excede ?? false,
      actualizadoEn: ctx.ts,
      actualizadoPor: ctx.usuarioId,
    };
  },
  escribir(estado, t, ctx) {
    const previo = estado.turnos[t.id];
    if (previo) desindexarTurno(estado, previo);
    estado.turnos[t.id] = t;
    indexarTurno(estado, t);
    ctx.emitir({ tipo: 'TurnoCambiado', turnoId: t.id });
  },
});

export const turnoEliminar = manejador<'turno.eliminar', { id: Id }>({
  validar(estado, d) {
    return { id: requerirExiste(estado.turnos, d.turnoId, 'el turno', 'turnoId').id };
  },
  escribir(estado, plan, ctx) {
    const previo = estado.turnos[plan.id];
    if (previo) desindexarTurno(estado, previo);
    delete estado.turnos[plan.id];
    ctx.emitir({ tipo: 'TurnoCambiado', turnoId: plan.id });
  },
});

export const turnoCopiarSemana = manejador<'turno.copiarSemana', Turno[]>({
  validar(estado, d, ctx) {
    requerir(estado.locales, d.localId, 'el local', 'localId');
    fechaValida(d.lunesOrigen, 'lunesOrigen');
    fechaValida(d.lunesDestino, 'lunesDestino');
    exigir(
      diaSemana(d.lunesOrigen) === 1 && diaSemana(d.lunesDestino) === 1,
      'NO_ES_LUNES',
      'Las semanas se indican con su lunes.',
      'lunesDestino',
    );
    exigir(d.lunesOrigen !== d.lunesDestino, 'MISMA_SEMANA', 'Elige otra semana de destino.', 'lunesDestino');
    const domingo = sumarDias(d.lunesOrigen, 6);
    const origen = Object.values(estado.turnos).filter(
      (t) => t.localId === d.localId && t.fecha >= d.lunesOrigen && t.fecha <= domingo,
    );
    exigir(
      origen.length > 0,
      'SEMANA_VACIA',
      'La semana de origen no tiene turnos en ese local.',
      'lunesOrigen',
    );
    const desplazamiento = diferenciaDias(d.lunesOrigen, d.lunesDestino);
    const nuevos: TurnoPlan[] = origen.map((t) => ({
      id: `${t.id}>${d.lunesDestino}`,
      empleadoId: t.empleadoId,
      localId: t.localId,
      fecha: sumarDias(t.fecha, desplazamiento),
      tipo: t.tipo,
      inicio: t.inicio,
      fin: t.fin,
      descansoMin: t.descansoMin,
    }));
    for (const n of nuevos)
      exigir(!estado.turnos[n.id], 'YA_COPIADA', 'Esa semana ya se copió.', 'lunesDestino');
    const excede = validarTurnos(estado, nuevos, new Set(), d.aceptarExceso);
    return nuevos.map((n, i) => construirTurno(n, excede[i] ?? false, ctx));
  },
  escribir(estado, turnos, ctx) {
    for (const t of turnos) {
      estado.turnos[t.id] = t;
      indexarTurno(estado, t);
      ctx.emitir({ tipo: 'TurnoCambiado', turnoId: t.id });
    }
  },
});

// ---------- Marcaciones ----------

/** Verifica P3 en la secuencia de un día: alterna entrada/salida y empieza por entrada. */
function exigirAlternancia(lista: readonly { tipo: 'entrada' | 'salida'; ts: string }[]): void {
  const orden = [...lista].sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
  orden.forEach((m, i) => {
    const esperado = i % 2 === 0 ? 'entrada' : 'salida';
    if (m.tipo !== esperado) {
      fallar(
        'MARCACION_FUERA_DE_ORDEN',
        m.tipo === 'salida'
          ? 'No hay una entrada abierta para marcar la salida.'
          : 'Ya hay una entrada sin salida ese día.',
        'tipo',
      );
    }
  });
}

function marcacionesDelDia(estado: EstadoDominio, empleadoId: Id, fecha: FechaISO): Marcacion[] {
  return (estado.agregados.marcacionesDia[claveMarcacionDia(empleadoId, fecha)] ?? [])
    .map((id) => estado.marcaciones[id])
    .filter((m): m is Marcacion => !!m);
}

export const marcacionRegistrar = manejador<'marcacion.registrar', Marcacion>({
  validar(estado, d, ctx) {
    idNuevo(estado.marcaciones, d.marcacionId, 'marcacionId');
    const e = requerir(estado.empleados, d.empleadoId, 'el empleado', 'empleadoId');
    tsValido(d.ts, 'ts');
    const fecha = fechaDe(d.ts);
    exigir(activoEn(e, fecha), 'EMPLEADO_INACTIVO', `${e.nombres} no está activo ese día.`, 'empleadoId');
    exigir(
      d.tipo === 'entrada' || d.tipo === 'salida',
      'TIPO_INVALIDO',
      'La marcación es de entrada o de salida.',
      'tipo',
    );
    if (ctx.actor === 'vendedor' || ctx.actor === 'bodega') {
      exigir(
        estado.usuarios[ctx.usuarioId]?.empleadoId === e.id,
        'OTRA_PERSONA',
        'Solo puedes marcar tu propia entrada y salida.',
        'empleadoId',
      );
    }
    const turnoId = estado.agregados.turnosDia[claveTurnoDia(e.id, fecha)]?.[0];
    const turno = turnoId ? estado.turnos[turnoId] : undefined;
    exigir(turno, 'SIN_TURNO', `${e.nombres} no tiene turno programado ese día.`, 'empleadoId');
    exigir(
      d.localId === turno.localId || d.localId === e.localId,
      'OTRO_LOCAL',
      'La marcación va en el local del turno.',
      'localId',
    );
    exigirAlternancia([...marcacionesDelDia(estado, e.id, fecha), { tipo: d.tipo, ts: d.ts }]);
    return {
      ...traza(ctx),
      id: d.marcacionId,
      empleadoId: e.id,
      localId: d.localId,
      ts: d.ts.length === 16 ? `${d.ts}:00` : d.ts,
      tipo: d.tipo,
      medio: ctx.origen === 'generado' ? 'generada' : 'boton',
      nota: null,
    };
  },
  escribir(estado, m, ctx) {
    estado.marcaciones[m.id] = m;
    const clave = claveMarcacionDia(m.empleadoId, fechaDe(m.ts));
    fijarIndiceMarcaciones(estado, clave, [...(estado.agregados.marcacionesDia[clave] ?? []), m.id]);
    ctx.emitir({ tipo: 'MarcacionRegistrada', empleadoId: m.empleadoId, tipoMarcacion: m.tipo, ts: m.ts });
  },
});

export const marcacionCorregir = manejador<
  'marcacion.corregir',
  { id: Id; ts: string; nota: string; antes: string }
>({
  validar(estado, d) {
    const m = requerirExiste(estado.marcaciones, d.marcacionId, 'la marcación', 'marcacionId');
    const nota = textoObligatorio(d.nota, 'nota', 'Escribe por qué se corrige la marcación.');
    tsValido(d.ts, 'ts');
    const ts = d.ts.length === 16 ? `${d.ts}:00` : d.ts;
    const fecha = fechaDe(ts);
    const antes = fechaDe(m.ts);
    const delDia = marcacionesDelDia(estado, m.empleadoId, fecha).filter((x) => x.id !== m.id);
    exigirAlternancia([...delDia, { tipo: m.tipo, ts }]);
    if (antes !== fecha)
      exigirAlternancia(marcacionesDelDia(estado, m.empleadoId, antes).filter((x) => x.id !== m.id));
    return { id: m.id, ts, nota, antes };
  },
  escribir(estado, plan, ctx) {
    const m = estado.marcaciones[plan.id];
    if (!m) return;
    const claveAntes = claveMarcacionDia(m.empleadoId, plan.antes);
    m.ts = plan.ts;
    m.medio = 'corregida';
    m.nota = plan.nota;
    marcarEditado(m, ctx);
    const claveNueva = claveMarcacionDia(m.empleadoId, fechaDe(plan.ts));
    fijarIndiceMarcaciones(
      estado,
      claveAntes,
      (estado.agregados.marcacionesDia[claveAntes] ?? []).filter((x) => x !== m.id),
    );
    fijarIndiceMarcaciones(estado, claveNueva, [
      ...(estado.agregados.marcacionesDia[claveNueva] ?? []).filter((x) => x !== m.id),
      m.id,
    ]);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'marcaciones', id: m.id, accion: 'editada' });
  },
});

export const marcacionEliminar = manejador<'marcacion.eliminar', { id: Id; clave: string }>({
  validar(estado, d) {
    const m = requerirExiste(estado.marcaciones, d.marcacionId, 'la marcación', 'marcacionId');
    textoObligatorio(d.nota, 'nota', 'Escribe por qué se elimina la marcación.');
    exigirAlternancia(marcacionesDelDia(estado, m.empleadoId, fechaDe(m.ts)).filter((x) => x.id !== m.id));
    return { id: m.id, clave: claveMarcacionDia(m.empleadoId, fechaDe(m.ts)) };
  },
  escribir(estado, plan, ctx) {
    delete estado.marcaciones[plan.id];
    fijarIndiceMarcaciones(
      estado,
      plan.clave,
      (estado.agregados.marcacionesDia[plan.clave] ?? []).filter((x) => x !== plan.id),
    );
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'marcaciones', id: plan.id, accion: 'eliminada' });
  },
});

// ---------- Novedades y PILA ----------

const TIPOS_NOVEDAD: Novedad['tipo'][] = [
  'incapacidad',
  'vacaciones',
  'licencia_remunerada',
  'licencia_no_remunerada',
  'permiso',
  'calamidad',
  'licencia_paternidad',
];

function validarNovedad(estado: EstadoDominio, d: DatosNovedad, excluirId: Id | null): void {
  requerir(estado.empleados, d.empleadoId, 'el empleado', 'empleadoId');
  exigir(TIPOS_NOVEDAD.includes(d.tipo), 'TIPO_INVALIDO', 'Elige el tipo de novedad.', 'tipo');
  fechaValida(d.desde, 'desde');
  fechaValida(d.hasta, 'hasta');
  exigir(d.hasta >= d.desde, 'RANGO_INVALIDO', 'La fecha final no puede ser antes de la inicial.', 'hasta');
  const solape = Object.values(estado.novedades).some(
    (n) =>
      !n.eliminadoEn &&
      n.id !== excluirId &&
      n.empleadoId === d.empleadoId &&
      n.tipo === d.tipo &&
      n.desde <= d.hasta &&
      d.desde <= n.hasta,
  );
  exigir(!solape, 'NOVEDAD_SOLAPADA', 'Ya hay una novedad del mismo tipo en esas fechas.', 'desde');
}

export const novedadRegistrar = manejador<'novedad.registrar', Novedad>({
  validar(estado, d, ctx) {
    idNuevo(estado.novedades, d.novedadId, 'novedadId');
    validarNovedad(estado, d.datos, null);
    return { ...traza(ctx), ...d.datos, id: d.novedadId };
  },
  escribir(estado, n, ctx) {
    estado.novedades[n.id] = n;
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'novedades', id: n.id, accion: 'creada' });
  },
});

export const novedadEditar = manejador<'novedad.editar', { id: Id; cambios: Partial<Novedad> }>({
  validar(estado, d) {
    const n = requerir(estado.novedades, d.novedadId, 'la novedad', 'novedadId');
    const { id: _id, creadoEn: _c, creadoPor: _p, origen: _o, ...actuales } = n;
    validarNovedad(estado, { ...actuales, ...d.cambios } as DatosNovedad, n.id);
    return { id: n.id, cambios: { ...d.cambios } };
  },
  escribir(estado, plan, ctx) {
    const n = estado.novedades[plan.id];
    if (!n) return;
    Object.assign(n, plan.cambios);
    marcarEditado(n, ctx);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'novedades', id: n.id, accion: 'editada' });
  },
});

export const novedadEliminar = crudEliminar<'novedad.eliminar', Novedad>({
  coleccion: 'novedades',
  id: (d) => d.novedadId,
  nombre: 'la novedad',
});

export const pilaVerificar = manejador<
  'pila.verificar',
  {
    contratoId: Id;
    periodo: string;
    verificada: boolean;
    soporte: Contrato['verificacionesPila'][number]['soporte'];
  }
>({
  validar(estado, d) {
    const c = requerirExiste(estado.contratos, d.contratoId, 'el contrato', 'contratoId');
    exigir(
      c.tipo === 'prestacion_servicios',
      'NO_PRESTACION',
      'La verificación de PILA es para contratos de prestación de servicios.',
      'contratoId',
    );
    exigir(/^\d{4}-\d{2}$/.test(d.periodo), 'MES_INVALIDO', 'Escribe el mes (AAAA-MM).', 'periodo');
    return {
      contratoId: c.id,
      periodo: d.periodo,
      verificada: d.verificada,
      soporte: d.soporte ? { ...d.soporte } : null,
    };
  },
  escribir(estado, plan, ctx) {
    const c = estado.contratos[plan.contratoId];
    if (!c) return;
    const i = c.verificacionesPila.findIndex((v) => v.periodo === plan.periodo);
    const v = { periodo: plan.periodo, verificada: plan.verificada, soporte: plan.soporte };
    if (i >= 0) c.verificacionesPila[i] = v;
    else c.verificacionesPila.push(v);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'contratos', id: c.id, accion: 'editada' });
  },
});

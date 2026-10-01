import type {
  AsistenciaDia,
  Cargo,
  FechaHoraISO,
  FechaISO,
  Id,
  Marcacion,
  Novedad,
  ParametrosNomina,
  TipoVinculacion,
  Turno,
} from '@/dominio/tipos';
import { rangoFechas, sumarDias } from '@/dominio/reglas/fechas';
import { horasNetasTurno } from '@/dominio/reglas/jornada';
import {
  crearSelector,
  nombreEmpleado,
  selAsistencia,
  selRecargosTurnos,
  selTurnosSemana,
  type RecargoEmpleado,
  type ResumenAsistencia,
} from '@/selectores';
import { diasDeNovedad, estadoDeNovedad, nombreCorto, repartirRecargo, type EstadoNovedad } from './calculos';

/**
 * Selectores locales de C2: componen los del dominio (`selTurnosSemana`, `selRecargosTurnos`, `selAsistencia`) y
 * leen directamente solo lo que no existe como selector (marcaciones de un día, novedades con sus turnos).
 * Declaran TODAS las tablas que leen, también a través de otros selectores.
 */

// ---------------------------------------------------------------------------------------------------------
// Semana de un local
// ---------------------------------------------------------------------------------------------------------
export interface FilaSemana {
  empleadoId: Id;
  nombre: string;
  /** Primer nombre y primer apellido. */
  corto: string;
  cargo: Cargo;
  /** Local al que pertenece la persona (puede no ser el de la cuadrícula). */
  localBaseId: Id | null;
  vinculacion: TipoVinculacion | null;
  /** TODOS los turnos de la persona esa semana, de cualquier local (la jornada se mide sobre todos). */
  turnos: Turno[];
  horas: number;
  maximo: number;
  exceso: number;
  /** Novedades que tocan la semana. */
  novedades: Novedad[];
}

export interface SemanaVista {
  lunes: FechaISO;
  dias: FechaISO[];
  filas: FilaSemana[];
  /** Por día: personas distintas con turno en ESTE local y horas netas programadas. */
  cobertura: Record<FechaISO, { personas: number; horas: number }>;
  horasLocal: number;
  turnosLocal: number;
  conExceso: number;
}

/** Cuadrícula semanal de un local con las horas de cada persona medidas sobre todos sus turnos (P2). */
export const selSemanaLocal = crearSelector<{ localId: Id; lunes: FechaISO }, SemanaVista>(
  'selSemanaLocal',
  ['turnos', 'empleados', 'contratos', 'novedades', 'parametros', 'agregados'],
  (e, { localId, lunes }) => {
    const base = selTurnosSemana(e, { localId, lunes });
    const fin = sumarDias(lunes, 6);
    const cobertura: SemanaVista['cobertura'] = {};
    for (const d of base.dias) cobertura[d] = { personas: 0, horas: 0 };
    const personasDia = new Map<FechaISO, Set<Id>>();
    let horasLocal = 0;
    let turnosLocal = 0;
    const filas: FilaSemana[] = base.empleados.map((x) => {
      const em = e.empleados[x.empleadoId];
      const turnos: Turno[] = [];
      for (const f of base.dias)
        for (const id of e.agregados.turnosDia[`${x.empleadoId}@${f}`] ?? []) {
          const t = e.turnos[id];
          if (t) turnos.push(t);
        }
      for (const t of turnos) {
        if (t.localId !== localId) continue;
        const h = horasNetasTurno(t);
        horasLocal += h;
        turnosLocal += 1;
        const c = cobertura[t.fecha];
        if (c) c.horas += h;
        let s = personasDia.get(t.fecha);
        if (!s) personasDia.set(t.fecha, (s = new Set()));
        s.add(t.empleadoId);
      }
      const horas = turnos.reduce((a, t) => a + horasNetasTurno(t), 0);
      const novedades = Object.values(e.novedades).filter(
        (n) => !n.eliminadoEn && n.empleadoId === x.empleadoId && n.desde <= fin && n.hasta >= lunes,
      );
      const contrato = em ? e.contratos[em.contratoVigenteId] : undefined;
      return {
        empleadoId: x.empleadoId,
        nombre: x.nombre,
        corto: em ? nombreCorto(em.nombres, em.apellidos) : x.nombre,
        cargo: em?.cargo ?? 'vendedor',
        localBaseId: em?.localId ?? null,
        vinculacion: contrato?.tipo ?? null,
        turnos,
        horas,
        maximo: x.maximo,
        exceso: Math.max(0, horas - x.maximo),
        novedades,
      };
    });
    for (const [d, s] of personasDia) {
      const c = cobertura[d];
      if (c) c.personas = s.size;
    }
    return {
      lunes,
      dias: base.dias,
      filas,
      cobertura,
      horasLocal,
      turnosLocal,
      conExceso: filas.filter((f) => f.exceso > 1e-9).length,
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Recargos de la semana
// ---------------------------------------------------------------------------------------------------------
export interface RecargoDetallado extends RecargoEmpleado {
  corto: string;
  vinculacion: TipoVinculacion | null;
  /** Parte del recargo que viene de las horas después de las 7 p. m. */
  valorNocturno: number;
  /** Parte que viene de las horas de domingo y festivo. */
  valorDominical: number;
}

export interface RecargosVista {
  empleados: RecargoDetallado[];
  total: number;
  horasNocturnas: number;
  horasDominicalFestivo: number;
  valorNocturno: number;
  valorDominical: number;
}

/** `selRecargosTurnos` con el recargo repartido entre "cerrar tarde" y "abrir el domingo". */
export const selRecargosDetallados = crearSelector<{ localId: Id; lunes: FechaISO }, RecargosVista>(
  'selRecargosDetallados',
  ['turnos', 'empleados', 'contratos', 'parametros'],
  (e, p) => {
    const r = selRecargosTurnos(e, p);
    const rec = e.parametros.nomina.recargos;
    const empleados: RecargoDetallado[] = r.empleados.map((x) => {
      const em = e.empleados[x.empleadoId];
      const reparto = repartirRecargo(x, rec);
      return {
        ...x,
        corto: em ? nombreCorto(em.nombres, em.apellidos) : x.nombre,
        vinculacion: em ? (e.contratos[em.contratoVigenteId]?.tipo ?? null) : null,
        valorNocturno: reparto.nocturno,
        valorDominical: reparto.dominical,
      };
    });
    return {
      empleados,
      total: r.total,
      horasNocturnas: empleados.reduce((a, x) => a + x.horasNocturnas, 0),
      horasDominicalFestivo: empleados.reduce((a, x) => a + x.horasDominicalFestivo, 0),
      valorNocturno: empleados.reduce((a, x) => a + x.valorNocturno, 0),
      valorDominical: empleados.reduce((a, x) => a + x.valorDominical, 0),
    };
  },
);

/** Parámetros que usa la pantalla (los marcados "verificar" viajan en `porVerificar`). */
export interface ParametrosTurnos {
  recargos: ParametrosNomina['recargos'];
  jornadaNocturna: ParametrosNomina['jornadaNocturna'];
  jornadaMaximaHoras: number;
  incapacidad: ParametrosNomina['incapacidad'];
  toleranciaMin: number;
  porVerificar: readonly string[];
}

export const selParametrosTurnos = crearSelector<void, ParametrosTurnos>(
  'selParametrosTurnos',
  ['parametros'],
  (e) => {
    const p = e.parametros.nomina;
    return {
      recargos: p.recargos,
      jornadaNocturna: p.jornadaNocturna,
      jornadaMaximaHoras: p.jornadaMaximaSemanal.horas,
      incapacidad: p.incapacidad,
      toleranciaMin: p.toleranciaLlegadaTardeMin,
      porVerificar: p.porVerificar,
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------------------------------------
export interface PersonaVista {
  id: Id;
  nombre: string;
  /** Primer nombre y primer apellido. */
  corto: string;
  cargo: Cargo;
  localId: Id | null;
  slug: string;
}

/** Todas las personas no eliminadas (activas o retiradas) por id, para nombrar filas de asistencia y novedades. */
export const selPersonas = crearSelector<void, Record<Id, PersonaVista>>(
  'selPersonas',
  ['empleados'],
  (e) => {
    const r: Record<Id, PersonaVista> = {};
    for (const x of Object.values(e.empleados))
      if (!x.eliminadoEn)
        r[x.id] = {
          id: x.id,
          nombre: nombreEmpleado(x),
          corto: nombreCorto(x.nombres, x.apellidos),
          cargo: x.cargo,
          localId: x.localId,
          slug: x.slug,
        };
    return r;
  },
);

// ---------------------------------------------------------------------------------------------------------
// Marcaciones y turnos por rango
// ---------------------------------------------------------------------------------------------------------
/** Marcaciones de una persona en un día, en orden. */
export const selMarcacionesDia = crearSelector<{ empleadoId: Id; fecha: FechaISO }, Marcacion[]>(
  'selMarcacionesDia',
  ['marcaciones', 'agregados'],
  (e, { empleadoId, fecha }) =>
    (e.agregados.marcacionesDia[`${empleadoId}@${fecha}`] ?? [])
      .map((id) => e.marcaciones[id])
      .filter((m): m is Marcacion => !!m)
      .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0)),
);

/** Turnos programados de una persona entre dos fechas (los que una novedad deja por cubrir). */
export const selTurnosEnRango = crearSelector<{ empleadoId: Id; desde: FechaISO; hasta: FechaISO }, Turno[]>(
  'selTurnosEnRango',
  ['turnos', 'agregados'],
  (e, { empleadoId, desde, hasta }) => {
    if (hasta < desde || rangoFechas(desde, hasta).length > 400) return [];
    const r: Turno[] = [];
    for (const f of rangoFechas(desde, hasta))
      for (const id of e.agregados.turnosDia[`${empleadoId}@${f}`] ?? []) {
        const t = e.turnos[id];
        if (t) r.push(t);
      }
    return r;
  },
);

// ---------------------------------------------------------------------------------------------------------
// Novedades
// ---------------------------------------------------------------------------------------------------------
export interface FilaNovedad {
  novedad: Novedad;
  nombre: string;
  localId: Id | null;
  dias: number;
  /** Turnos ya programados que caen dentro de la novedad. */
  turnosPorCubrir: number;
  estado: EstadoNovedad;
}

export const selNovedadesVista = crearSelector<{ hoy: FechaISO }, FilaNovedad[]>(
  'selNovedadesVista',
  ['novedades', 'empleados', 'turnos', 'agregados'],
  (e, { hoy }) => {
    const filas: FilaNovedad[] = [];
    for (const n of Object.values(e.novedades)) {
      if (n.eliminadoEn) continue;
      const em = e.empleados[n.empleadoId];
      if (!em || em.eliminadoEn) continue;
      let turnosPorCubrir = 0;
      for (const f of rangoFechas(n.desde, n.hasta))
        turnosPorCubrir += e.agregados.turnosDia[`${n.empleadoId}@${f}`]?.length ?? 0;
      filas.push({
        novedad: n,
        nombre: nombreEmpleado(em),
        localId: em.localId,
        dias: diasDeNovedad(n.desde, n.hasta),
        turnosPorCubrir,
        estado: estadoDeNovedad(n, hoy),
      });
    }
    return filas.sort((a, b) =>
      a.novedad.desde < b.novedad.desde
        ? 1
        : a.novedad.desde > b.novedad.desde
          ? -1
          : a.novedad.id < b.novedad.id
            ? -1
            : 1,
    );
  },
);

/** Novedades de una persona (las que impiden programarle turnos esos días). */
export const selNovedadesDe = crearSelector<{ empleadoId: Id }, Novedad[]>(
  'selNovedadesDe',
  ['novedades'],
  (e, { empleadoId }) =>
    Object.values(e.novedades).filter((n) => !n.eliminadoEn && n.empleadoId === empleadoId),
);

// ---------------------------------------------------------------------------------------------------------
// Asistencia
// ---------------------------------------------------------------------------------------------------------
export interface FilaAsistencia {
  dia: AsistenciaDia;
  turno: Turno | null;
  nombre: string;
  corto: string;
  localId: Id | null;
}

export interface AsistenciaVista {
  filas: FilaAsistencia[];
  resumen: (ResumenAsistencia & { corto: string; localId: Id | null; cargo: Cargo })[];
}

/** `selAsistencia` con el turno de cada día y los nombres de las personas, listo para las tablas. */
export const selAsistenciaVista = crearSelector<
  { desde: FechaISO; hasta: FechaISO; ahora: FechaHoraISO; empleadoId?: Id; localId?: Id | 'todos' },
  AsistenciaVista
>(
  'selAsistenciaVista',
  ['turnos', 'marcaciones', 'novedades', 'empleados', 'parametros', 'agregados'],
  (e, p) => {
    const a = selAsistencia(e, p);
    const filas: FilaAsistencia[] = a.dias.map((d) => {
      const em = e.empleados[d.empleadoId];
      return {
        dia: d,
        turno: d.turnoId ? (e.turnos[d.turnoId] ?? null) : null,
        nombre: em ? nombreEmpleado(em) : d.empleadoId,
        corto: em ? nombreCorto(em.nombres, em.apellidos) : d.empleadoId,
        localId: d.localId ?? em?.localId ?? null,
      };
    });
    const resumen = a.resumen.map((r) => {
      const em = e.empleados[r.empleadoId];
      return {
        ...r,
        corto: em ? nombreCorto(em.nombres, em.apellidos) : r.nombre,
        localId: em?.localId ?? null,
        cargo: em?.cargo ?? 'vendedor',
      };
    });
    return { filas, resumen };
  },
);

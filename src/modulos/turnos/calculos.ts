import type {
  FechaISO,
  HoraHHmm,
  Id,
  Novedad,
  ParametrosNomina,
  TipoNovedad,
  TipoTurno,
  Turno,
} from '@/dominio/tipos';
import { diferenciaDias, lunesDe, sumarDias } from '@/dominio/reglas/fechas';
import { horasNetasTurno, minutosBrutos, seSolapan } from '@/dominio/reglas/jornada';
import { franjaDeTurno } from '@/config/turnos';
import { semanaIso } from '@/lib/fechas';
import { fechaCorta, fechaLarga, hora, numero, porcentaje } from '@/lib/formato';

/**
 * Cálculos propios de la pantalla de turnos, asistencia y novedades (C2). Son funciones puras: no recalculan
 * ninguna regla del dominio (jornada, recargos, asistencia); solo componen las del dominio para mostrar y para
 * validar en vivo lo que el usuario está a punto de hacer (el dominio vuelve a validar al ejecutar el comando).
 */

// ---------------------------------------------------------------------------------------------------------
// Plantillas de turno
// ---------------------------------------------------------------------------------------------------------
export interface PlantillaTurno {
  tipo: TipoTurno;
  inicio: HoraHHmm;
  fin: HoraHHmm;
  descansoMin: number;
}

/** Horario habitual de cada tipo de turno en cada local (`franjaDeTurno` de `config/turnos`). */
export function plantillaTurno(tipo: TipoTurno, localId: Id): PlantillaTurno {
  const f = franjaDeTurno(tipo, localId);
  return { tipo, inicio: f.inicio, fin: f.fin, descansoMin: f.descansoMin };
}

const compacta = (t: string) => t.replace(':00', '');

/** `10 a. m. – 6 p. m.` (las horas en punto sin minutos, para que quepa en la celda). */
export function rangoHoras(inicio: HoraHHmm, fin: HoraHHmm): string {
  return `${compacta(hora(inicio))} – ${compacta(hora(fin))}`;
}

/** `10:00–18:00` (24 h, sin espacios) para las celdas de la cuadrícula, donde cada columna mide ~100 px. */
export function rangoCompacto(inicio: HoraHHmm, fin: HoraHHmm): string {
  return `${inicio}–${fin}`;
}

/** `Camilo Suárez`: primer nombre y primer apellido. */
export function nombreCorto(nombres: string, apellidos: string): string {
  return `${nombres.split(' ')[0] ?? ''} ${apellidos.split(' ')[0] ?? ''}`.trim();
}

/** `domingo 4 de octubre de 2026` para el medio de una frase (fechaLarga abre con mayúscula). */
export function fechaEnFrase(f: FechaISO): string {
  const t = fechaLarga(f);
  return t.charAt(0).toLowerCase() + t.slice(1);
}

/** Horas netas con coma decimal: `7 h`, `7,5 h`. */
export function textoHoras(h: number): string {
  return `${numero(Math.round(h * 10) / 10, 1)} h`;
}

/** Minutos como `25 min` o `1 h 30 min`. */
export function textoMinutos(min: number): string {
  if (min < 60) return `${numero(min)} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// ---------------------------------------------------------------------------------------------------------
// Semana
// ---------------------------------------------------------------------------------------------------------
/** Lunes de la semana pedida en `?semana=` (cualquier día de esa semana) o de hoy. */
export function lunesDeParametro(semana: FechaISO | null, hoy: FechaISO): FechaISO {
  return lunesDe(semana ?? hoy);
}

/** `Semana 40 · 28 sep – 4 oct de 2026`. */
export function etiquetaSemana(lunes: FechaISO): string {
  const domingo = sumarDias(lunes, 6);
  return `Semana ${semanaIso(lunes).semana} · ${fechaCorta(lunes)} – ${fechaCorta(domingo)} de ${domingo.slice(0, 4)}`;
}

// ---------------------------------------------------------------------------------------------------------
// Jornada semanal: validación en vivo
// ---------------------------------------------------------------------------------------------------------
export type EstadoHoras = 'ok' | 'limite' | 'exceso';

/** `ok` por debajo de la jornada, `limite` justo en ella, `exceso` por encima (horas extra). */
export function estadoHoras(horas: number, maximo: number): EstadoHoras {
  if (horas > maximo + 1e-9) return 'exceso';
  if (horas >= maximo - 1e-9) return 'limite';
  return 'ok';
}

export interface PropuestaTurno {
  empleadoId: Id;
  fecha: FechaISO;
  inicio: HoraHHmm;
  fin: HoraHHmm;
  descansoMin: number;
  /** Turno que se mueve o edita (no cuenta contra sí mismo). */
  excluirId?: Id | null;
}

export type EvaluacionTurno =
  | { resultado: 'ok'; horas: number; maximo: number }
  | { resultado: 'exceso'; horas: number; maximo: number; exceso: number }
  | { resultado: 'solapa'; con: Turno }
  | { resultado: 'novedad'; novedad: Novedad };

/** La novedad (vacaciones, incapacidad…) que cubre ese día para esa persona, si la hay. */
export function novedadDelDia(
  novedades: readonly Novedad[],
  empleadoId: Id,
  fecha: FechaISO,
): Novedad | null {
  return (
    novedades.find(
      (n) => !n.eliminadoEn && n.empleadoId === empleadoId && fecha >= n.desde && fecha <= n.hasta,
    ) ?? null
  );
}

/**
 * ¿Qué pasaría si se programa este turno? Mira, en este orden: una novedad ese día (no se programa a quien está
 * de vacaciones o incapacitado), un turno que se cruce y las horas netas de la semana frente a la jornada máxima.
 * `turnosSemana` son TODOS los turnos de esa persona en la semana (de cualquier local).
 */
export function evaluarTurno(
  p: PropuestaTurno,
  turnosSemana: readonly Turno[],
  novedades: readonly Novedad[],
  maximo: number,
): EvaluacionTurno {
  const novedad = novedadDelDia(novedades, p.empleadoId, p.fecha);
  if (novedad) return { resultado: 'novedad', novedad };
  const otros = turnosSemana.filter((t) => t.id !== p.excluirId);
  const cruce = otros.find((t) => t.fecha === p.fecha && seSolapan(t, p));
  if (cruce) return { resultado: 'solapa', con: cruce };
  const horas = otros.reduce((a, t) => a + horasNetasTurno(t), 0) + horasNetasTurno(p);
  if (horas > maximo + 1e-9) return { resultado: 'exceso', horas, maximo, exceso: horas - maximo };
  return { resultado: 'ok', horas, maximo };
}

export type OrigenArrastre = { clase: 'plantilla'; tipo: TipoTurno } | { clase: 'turno'; turno: Turno };
export interface DestinoArrastre {
  empleadoId: Id;
  fecha: FechaISO;
}

/**
 * Lo que se programaría al soltar `origen` sobre `destino`: un turno nuevo con el horario de la plantilla del
 * local, o el turno movido (mismo horario, otra persona u otro día). null si se suelta donde ya estaba.
 */
export function propuestaDeArrastre(
  origen: OrigenArrastre,
  destino: DestinoArrastre,
  localId: Id,
): (PropuestaTurno & { tipo: TipoTurno }) | null {
  if (origen.clase === 'plantilla') {
    const p = plantillaTurno(origen.tipo, localId);
    return {
      empleadoId: destino.empleadoId,
      fecha: destino.fecha,
      inicio: p.inicio,
      fin: p.fin,
      descansoMin: p.descansoMin,
      tipo: p.tipo,
      excluirId: null,
    };
  }
  const t = origen.turno;
  if (t.empleadoId === destino.empleadoId && t.fecha === destino.fecha) return null;
  return {
    empleadoId: destino.empleadoId,
    fecha: destino.fecha,
    inicio: t.inicio,
    fin: t.fin,
    descansoMin: t.descansoMin,
    tipo: t.tipo,
    excluirId: t.id,
  };
}

/** Frase para el aviso de exceso: "Con este turno, Mateo quedaría con 45 h (máximo 42 h): 3 h serían extra." */
export function fraseExceso(nombre: string, horas: number, maximo: number): string {
  return `Con este turno, ${nombre} quedaría con ${textoHoras(horas)} esta semana (máximo ${textoHoras(maximo)}): ${textoHoras(horas - maximo)} serían horas extra.`;
}

// ---------------------------------------------------------------------------------------------------------
// Borradores
// ---------------------------------------------------------------------------------------------------------
export type CampoTurno = 'empleadoId' | 'fecha' | 'tipo' | 'inicio' | 'fin' | 'descansoMin';

export interface BorradorTurno {
  empleadoId: Id | null;
  fecha: FechaISO | null;
  tipo: TipoTurno | null;
  inicio: string;
  fin: string;
  descansoMin: number | null;
}

const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Validación del formulario de turno (mismos textos que usa el dominio donde aplica). */
export function validarBorradorTurno(b: BorradorTurno): Partial<Record<CampoTurno, string>> {
  const e: Partial<Record<CampoTurno, string>> = {};
  if (!b.empleadoId) e.empleadoId = 'Elige a quién le asignas el turno.';
  if (!b.fecha) e.fecha = 'Elige el día del turno.';
  if (!b.tipo) e.tipo = 'Elige el tipo de turno.';
  const horasOk = RE_HORA.test(b.inicio) && RE_HORA.test(b.fin);
  if (!RE_HORA.test(b.inicio)) e.inicio = 'Escribe la hora como 10:00.';
  if (!RE_HORA.test(b.fin)) e.fin = 'Escribe la hora como 18:00.';
  if (b.descansoMin === null || b.descansoMin < 0)
    e.descansoMin = 'Escribe los minutos de descanso (0 si no hay).';
  else if (horasOk && b.descansoMin >= minutosBrutos(b.inicio, b.fin))
    e.descansoMin = 'El descanso debe ser menor que el turno.';
  return e;
}

export type CampoNovedad = 'empleadoId' | 'tipo' | 'desde' | 'hasta';

export interface BorradorNovedad {
  empleadoId: Id | null;
  tipo: TipoNovedad | null;
  desde: FechaISO | null;
  hasta: FechaISO | null;
}

export function validarBorradorNovedad(b: BorradorNovedad): Partial<Record<CampoNovedad, string>> {
  const e: Partial<Record<CampoNovedad, string>> = {};
  if (!b.empleadoId) e.empleadoId = 'Elige a quién le pasa.';
  if (!b.tipo) e.tipo = 'Elige el tipo de novedad.';
  if (!b.desde) e.desde = 'Elige desde cuándo.';
  if (!b.hasta) e.hasta = 'Elige hasta cuándo.';
  if (b.desde && b.hasta && b.hasta < b.desde) e.hasta = 'La fecha final no puede ser antes de la inicial.';
  return e;
}

// ---------------------------------------------------------------------------------------------------------
// Novedades
// ---------------------------------------------------------------------------------------------------------
/** Días de calendario que cubre la novedad (ambos extremos incluidos). */
export function diasDeNovedad(desde: FechaISO, hasta: FechaISO): number {
  return diferenciaDias(desde, hasta) + 1;
}

export type EstadoNovedad = 'vigente' | 'proxima' | 'pasada';

export function estadoDeNovedad(n: { desde: FechaISO; hasta: FechaISO }, hoy: FechaISO): EstadoNovedad {
  if (n.hasta < hoy) return 'pasada';
  if (n.desde > hoy) return 'proxima';
  return 'vigente';
}

/** Cómo entra la novedad a la liquidación, en palabras (sin cifras de dinero: eso lo calcula la nómina). */
export function efectoEnNomina(
  tipo: TipoNovedad,
  remunerada: boolean,
  dias: number,
  p: ParametrosNomina['incapacidad'],
): string {
  if (tipo === 'incapacidad') {
    const aCargo = Math.min(dias, p.diasACargoEmpleador);
    return dias <= p.diasACargoEmpleador
      ? `${aCargo} ${aCargo === 1 ? 'día a cargo del negocio, pagado' : 'días a cargo del negocio, pagados'} al ${porcentaje(p.porcentajePago, 2)}.`
      : `Los ${p.diasACargoEmpleador} primeros días los paga el negocio y ${dias - p.diasACargoEmpleador === 1 ? 'el siguiente lo cubre' : `los ${dias - p.diasACargoEmpleador} siguientes los cubre`} la EPS; todos al ${porcentaje(p.porcentajePago, 2)}.`;
  }
  if (tipo === 'vacaciones') return 'Se pagan como vacaciones y no cuentan como ausencia.';
  if (!remunerada) return 'No se paga: se descuentan estos días del salario.';
  return 'Se paga completa y no cuenta como ausencia.';
}

// ---------------------------------------------------------------------------------------------------------
// Asistencia
// ---------------------------------------------------------------------------------------------------------
/** Puntualidad: de los días con entrada, cuántos fueron a tiempo (0–1); null si nadie ha entrado. */
export function puntualidad(aTiempo: number, tardes: number): number | null {
  const con = aTiempo + tardes;
  return con === 0 ? null : aTiempo / con;
}

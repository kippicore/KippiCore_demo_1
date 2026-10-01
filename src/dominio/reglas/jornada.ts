import type { FechaISO, HoraHHmm, ParametrosNomina } from '../tipos';
import { minutosDeHora } from './fechas';

/** Jornada y turnos (PLAN 6.19 P2, 6.20.14). */

/** Minutos brutos de un turno (si fin < inicio, cruza la medianoche). */
export function minutosBrutos(inicio: HoraHHmm, fin: HoraHHmm): number {
  const a = minutosDeHora(inicio);
  const b = minutosDeHora(fin);
  return b >= a ? b - a : b + 1440 - a;
}

/** Horas netas de un turno: brutas − descanso. */
export function horasNetasTurno(t: { inicio: HoraHHmm; fin: HoraHHmm; descansoMin: number }): number {
  return Math.max(0, minutosBrutos(t.inicio, t.fin) - t.descansoMin) / 60;
}

/** Jornada máxima semanal vigente en la fecha (42 h desde la fecha del parámetro; antes, la anterior). */
export function jornadaMaximaVigente(
  parametros: Pick<ParametrosNomina, 'jornadaMaximaSemanal'>,
  fecha: FechaISO,
): number {
  const j = parametros.jornadaMaximaSemanal;
  return fecha >= j.desde ? j.horas : j.horasAnterior;
}

/** ¿Se solapan dos intervalos [inicio, fin) del mismo día? */
export function seSolapan(
  a: { inicio: HoraHHmm; fin: HoraHHmm },
  b: { inicio: HoraHHmm; fin: HoraHHmm },
): boolean {
  const a0 = minutosDeHora(a.inicio);
  const a1 = a0 + minutosBrutos(a.inicio, a.fin);
  const b0 = minutosDeHora(b.inicio);
  const b1 = b0 + minutosBrutos(b.inicio, b.fin);
  return a0 < b1 && b0 < a1;
}

/** Minutos de [desde, hasta) (en minutos del día, puede pasar de 1440) que caen en la franja nocturna. */
export function minutosNocturnos(
  desde: number,
  hasta: number,
  nocturna: { inicio: HoraHHmm; fin: HoraHHmm },
): number {
  const ini = minutosDeHora(nocturna.inicio);
  const fin = minutosDeHora(nocturna.fin);
  // Franjas nocturnas en el eje de dos días: [ini, 1440 + fin) y [0, fin).
  const franjas: [number, number][] = [
    [0, fin],
    [ini, 1440 + fin],
    [1440 + ini, 2880],
  ];
  let total = 0;
  for (const [a, b] of franjas) total += Math.max(0, Math.min(hasta, b) - Math.max(desde, a));
  return total;
}

/** Horas netas de un turno en franja nocturna (el descanso se asume fuera de la franja). */
export function horasNocturnasTurno(
  t: { inicio: HoraHHmm; fin: HoraHHmm },
  nocturna: { inicio: HoraHHmm; fin: HoraHHmm },
): number {
  const a = minutosDeHora(t.inicio);
  return minutosNocturnos(a, a + minutosBrutos(t.inicio, t.fin), nocturna) / 60;
}

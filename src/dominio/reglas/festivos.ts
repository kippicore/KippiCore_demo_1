import type { FechaISO } from '../tipos';
import { diaSemana, sumarDias } from './fechas';

/**
 * Festivos de Colombia (PLAN 5.9): fijos, trasladables al lunes siguiente y los que dependen de la Pascua.
 * Solo aritmética entera (cómputo gregoriano anónimo de la Pascua).
 */
function dos(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Domingo de Pascua del año. */
export function domingoDePascua(anio: number): FechaISO {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${anio}-${dos(mes)}-${dos(dia)}`;
}

/** Traslada al lunes siguiente si no cae en lunes (festivos "puente"). */
function alLunes(fecha: FechaISO): FechaISO {
  const ds = diaSemana(fecha);
  return ds === 1 ? fecha : sumarDias(fecha, ds === 0 ? 1 : 8 - ds);
}

export interface Festivo {
  fecha: FechaISO;
  nombre: string;
}

const cache = new Map<number, Festivo[]>();

export function festivosColombia(anio: number): Festivo[] {
  const guardado = cache.get(anio);
  if (guardado) return guardado;
  const f = (md: string) => `${anio}-${md}`;
  const pascua = domingoDePascua(anio);
  const lista: Festivo[] = [
    { fecha: f('01-01'), nombre: 'Año Nuevo' },
    { fecha: alLunes(f('01-06')), nombre: 'Día de los Reyes Magos' },
    { fecha: alLunes(f('03-19')), nombre: 'Día de San José' },
    { fecha: sumarDias(pascua, -3), nombre: 'Jueves Santo' },
    { fecha: sumarDias(pascua, -2), nombre: 'Viernes Santo' },
    { fecha: f('05-01'), nombre: 'Día del Trabajo' },
    { fecha: sumarDias(pascua, 43), nombre: 'Ascensión del Señor' },
    { fecha: sumarDias(pascua, 64), nombre: 'Corpus Christi' },
    { fecha: sumarDias(pascua, 71), nombre: 'Sagrado Corazón' },
    { fecha: alLunes(f('06-29')), nombre: 'San Pedro y San Pablo' },
    { fecha: f('07-20'), nombre: 'Día de la Independencia' },
    { fecha: f('08-07'), nombre: 'Batalla de Boyacá' },
    { fecha: alLunes(f('08-15')), nombre: 'Asunción de la Virgen' },
    { fecha: alLunes(f('10-12')), nombre: 'Día de la Raza' },
    { fecha: alLunes(f('11-01')), nombre: 'Todos los Santos' },
    { fecha: alLunes(f('11-11')), nombre: 'Independencia de Cartagena' },
    { fecha: f('12-08'), nombre: 'Inmaculada Concepción' },
    { fecha: f('12-25'), nombre: 'Navidad' },
  ].sort((x, y) => (x.fecha < y.fecha ? -1 : x.fecha > y.fecha ? 1 : 0));
  cache.set(anio, lista);
  return lista;
}

/** Conjunto de fechas festivas de los años indicados. */
export function conjuntoFestivos(anios: readonly number[]): Set<FechaISO> {
  const s = new Set<FechaISO>();
  for (const a of anios) for (const x of festivosColombia(a)) s.add(x.fecha);
  return s;
}

export function esFestivo(fecha: FechaISO): boolean {
  return festivosColombia(Number(fecha.slice(0, 4))).some((x) => x.fecha === fecha);
}

/** Domingo o festivo (recargo dominical y festivo). */
export function esDominicalOFestivo(fecha: FechaISO): boolean {
  return diaSemana(fecha) === 0 || esFestivo(fecha);
}

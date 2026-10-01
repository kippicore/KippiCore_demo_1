import type { FechaISO, MesISO } from '@/dominio/tipos';
import { diaN, diaSemana, lunesDe, rangoFechas, sumarDias } from '@/dominio/reglas/fechas';

/**
 * Aritmética de fechas para la interfaz (PLAN 5.9). Las fechas son cadenas de Bogotá; la aritmética usa el
 * número de día (`diaN`) del dominio, así no hay corrimientos por zona horaria. Cuando una librería necesita un
 * `Date` (date-fns, react-day-picker) se construye a MEDIODÍA UTC con `aDate`.
 */
export {
  diaN,
  deDiaN,
  sumarDias,
  diferenciaDias,
  diaSemana,
  fechaDe,
  horaDe,
  mesDe,
  anioDe,
  minutosDeHora,
  horaDeMinutos,
  componerTs,
  diasDelMes,
  inicioMes,
  finMes,
  sumarMesesAMes,
  sumarMeses,
  lunesDe,
  rangoFechas,
  esDiaHabil,
  maxFecha,
  minFecha,
} from '@/dominio/reglas/fechas';

export interface Rango {
  desde: FechaISO;
  hasta: FechaISO;
}

/** `Date` a mediodía UTC (seguro en cualquier zona entre UTC−11 y UTC+11). */
export function aDate(f: FechaISO): Date {
  return new Date(Date.UTC(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10)), 12));
}

/** FechaISO de un `Date` construido a mediodía UTC (o de react-day-picker). */
export function deDate(d: Date): FechaISO {
  const z = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12));
  return z.toISOString().slice(0, 10);
}

/** Semana ISO del año (1–53) y su año. */
export function semanaIso(f: FechaISO): { anio: number; semana: number } {
  // El jueves de la semana define el año ISO.
  const jueves = sumarDias(lunesDe(f), 3);
  const anio = Number(jueves.slice(0, 4));
  const primero = `${anio}-01-04`;
  const semana = Math.floor((diaN(jueves) - diaN(lunesDe(primero))) / 7) + 1;
  return { anio, semana };
}

/** Domingo de la semana (lunes + 6). */
export function domingoDe(f: FechaISO): FechaISO {
  return sumarDias(lunesDe(f), 6);
}

/** Los 7 días de la semana que empieza en `lunes`. */
export function diasDeSemana(lunes: FechaISO): FechaISO[] {
  return rangoFechas(lunes, sumarDias(lunes, 6));
}

/** Rango de los últimos `n` días que termina en `hoy` (incluido). */
export function ultimosDias(hoy: FechaISO, n: number): Rango {
  return { desde: sumarDias(hoy, -(n - 1)), hasta: hoy };
}

/** Del día 1 del mes de `hoy` hasta `hoy`. */
export function mesALaFecha(hoy: FechaISO): Rango {
  return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy };
}

/** Mes completo. */
export function rangoMes(mes: MesISO): Rango {
  const [a, m] = mes.split('-').map(Number) as [number, number];
  const ultimo = new Date(Date.UTC(a, m, 0, 12)).getUTCDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimo).padStart(2, '0')}` };
}

/** true si la fecha está en el rango (ambos extremos incluidos). */
export function enRango(f: string, r: Rango): boolean {
  const d = f.slice(0, 10);
  return d >= r.desde && d <= r.hasta;
}

/** 1 = lunes … 7 = domingo. */
export function diaSemanaIso(f: FechaISO): number {
  const d = diaSemana(f);
  return d === 0 ? 7 : d;
}

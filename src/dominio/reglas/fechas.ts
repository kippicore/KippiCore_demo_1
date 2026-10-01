import type { DiaSemana, FechaHoraISO, FechaISO, HoraHHmm, MesISO } from '../tipos';

/**
 * Aritmética de fechas como cadenas de Bogotá (PLAN 5.9, D8). Trabaja con el número de día
 * (diaN = días desde 1970-01-01) para no depender de la zona horaria del equipo. lib/fechas.ts (F2-B)
 * reutiliza estas funciones.
 */
const MS_DIA = 86_400_000;

/** Caché acotada de conversiones (las mismas ≈ 600 fechas se convierten cientos de miles de veces al generar). */
const CACHE_MAX = 4096;
const cacheDiaN = new Map<string, number>();
const cacheDeDiaN = new Map<number, string>();

export function diaN(fecha: FechaISO): number {
  const clave = fecha.length === 10 ? fecha : fecha.slice(0, 10);
  const c = cacheDiaN.get(clave);
  if (c !== undefined) return c;
  const a = Number(clave.slice(0, 4));
  const m = Number(clave.slice(5, 7));
  const d = Number(clave.slice(8, 10));
  const n = Date.UTC(a, m - 1, d) / MS_DIA;
  if (cacheDiaN.size >= CACHE_MAX) cacheDiaN.clear();
  cacheDiaN.set(clave, n);
  return n;
}

function dos(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function deDiaN(n: number): FechaISO {
  const c = cacheDeDiaN.get(n);
  if (c !== undefined) return c;
  const f = new Date(n * MS_DIA);
  const r = `${f.getUTCFullYear()}-${dos(f.getUTCMonth() + 1)}-${dos(f.getUTCDate())}`;
  if (cacheDeDiaN.size >= CACHE_MAX) cacheDeDiaN.clear();
  cacheDeDiaN.set(n, r);
  return r;
}

export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  return deDiaN(diaN(fecha) + dias);
}

/** Días de `desde` a `hasta` (positivo si `hasta` es posterior). */
export function diferenciaDias(desde: FechaISO, hasta: FechaISO): number {
  return diaN(hasta) - diaN(desde);
}

/** 0 = domingo … 6 = sábado. */
export function diaSemana(fecha: FechaISO): DiaSemana {
  return ((((diaN(fecha) + 4) % 7) + 7) % 7) as DiaSemana;
}

export function fechaDe(ts: FechaHoraISO): FechaISO {
  return ts.slice(0, 10);
}

export function horaDe(ts: FechaHoraISO): HoraHHmm {
  return ts.slice(11, 16);
}

export function mesDe(fecha: FechaISO | FechaHoraISO): MesISO {
  return fecha.slice(0, 7);
}

export function anioDe(fecha: FechaISO | FechaHoraISO): number {
  return Number(fecha.slice(0, 4));
}

/** 'HH:mm' → minutos desde la medianoche. */
export function minutosDeHora(hora: HoraHHmm): number {
  return Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
}

export function horaDeMinutos(minutos: number): HoraHHmm {
  const m = ((minutos % 1440) + 1440) % 1440;
  return `${dos(Math.floor(m / 60))}:${dos(m % 60)}`;
}

/** Arma un FechaHoraISO a partir de fecha y hora ('HH:mm' o 'HH:mm:ss'). */
export function componerTs(fecha: FechaISO, hora: string): FechaHoraISO {
  return `${fecha}T${hora.length === 5 ? `${hora}:00` : hora}`;
}

/** Minutos desde 1970 de un FechaHoraISO (sin zona: se trata como UTC). */
export function minutosTs(ts: FechaHoraISO): number {
  return diaN(fechaDe(ts)) * 1440 + minutosDeHora(ts.slice(11, 16));
}

export function sumarMinutosTs(ts: FechaHoraISO, minutos: number): FechaHoraISO {
  const total = minutosTs(ts) + minutos;
  const dia = Math.floor(total / 1440);
  return `${deDiaN(dia)}T${horaDeMinutos(total - dia * 1440)}:${ts.length >= 19 ? ts.slice(17, 19) : '00'}`;
}

/** Diferencia en minutos (b − a). */
export function diferenciaMinutos(a: FechaHoraISO, b: FechaHoraISO): number {
  return minutosTs(b) - minutosTs(a);
}

export function diasDelMes(mes: MesISO): number {
  const a = Number(mes.slice(0, 4));
  const m = Number(mes.slice(5, 7));
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

export function inicioMes(mes: MesISO): FechaISO {
  return `${mes}-01`;
}

export function finMes(mes: MesISO): FechaISO {
  return `${mes}-${dos(diasDelMes(mes))}`;
}

export function esFinDeMes(fecha: FechaISO): boolean {
  return fecha === finMes(mesDe(fecha));
}

export function sumarMesesAMes(mes: MesISO, n: number): MesISO {
  const a = Number(mes.slice(0, 4));
  const m = Number(mes.slice(5, 7)) - 1 + n;
  const anio = a + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  return `${anio}-${dos(mm + 1)}`;
}

/** Suma meses a una fecha conservando el día (acotado al último día del mes destino). */
export function sumarMeses(fecha: FechaISO, n: number): FechaISO {
  const mes = sumarMesesAMes(mesDe(fecha), n);
  const dia = Math.min(Number(fecha.slice(8, 10)), diasDelMes(mes));
  return `${mes}-${dos(dia)}`;
}

/** Lunes de la semana ISO de la fecha. */
export function lunesDe(fecha: FechaISO): FechaISO {
  const ds = diaSemana(fecha);
  return sumarDias(fecha, ds === 0 ? -6 : 1 - ds);
}

/** Día 1 del mes de (ancla − meses): inicio de la ventana (7.3). */
export function inicioVentana(ancla: FechaISO, meses: number): FechaISO {
  return inicioMes(sumarMesesAMes(mesDe(ancla), -meses));
}

/** Fechas de `desde` a `hasta`, ambas incluidas. */
export function rangoFechas(desde: FechaISO, hasta: FechaISO): FechaISO[] {
  const r: FechaISO[] = [];
  for (let n = diaN(desde), fin = diaN(hasta); n <= fin; n++) r.push(deDiaN(n));
  return r;
}

/** Hábil = lunes a viernes y no festivo. */
export function esDiaHabil(fecha: FechaISO, festivos: ReadonlySet<FechaISO>): boolean {
  const d = diaSemana(fecha);
  return d !== 0 && d !== 6 && !festivos.has(fecha);
}

/** n-ésimo día hábil del mes (1 = el primero). */
export function diaHabilDelMes(mes: MesISO, n: number, festivos: ReadonlySet<FechaISO>): FechaISO {
  let cuenta = 0;
  for (let d = 1; d <= diasDelMes(mes); d++) {
    const f = `${mes}-${dos(d)}`;
    if (esDiaHabil(f, festivos) && ++cuenta === n) return f;
  }
  return finMes(mes);
}

/** Siguiente día hábil estrictamente posterior a la fecha. */
export function siguienteDiaHabil(fecha: FechaISO, festivos: ReadonlySet<FechaISO>): FechaISO {
  let f = sumarDias(fecha, 1);
  while (!esDiaHabil(f, festivos)) f = sumarDias(f, 1);
  return f;
}

/** Mes y día ('MM-DD') de una fecha. */
export function mesDia(fecha: FechaISO): string {
  return fecha.slice(5, 10);
}

export function maxFecha<T extends string>(a: T, b: T): T {
  return a >= b ? a : b;
}

export function minFecha<T extends string>(a: T, b: T): T {
  return a <= b ? a : b;
}

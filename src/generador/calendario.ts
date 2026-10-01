import type { DiaSemana, FechaISO, FranjaHorario, Id } from '@/dominio/tipos';
import type { ConfigLocal } from '@/config/locales';
import { CIERRE_ESPECIAL, DIAS_CERRADOS } from '@/config/locales';
import { EVENTOS_DEMANDA } from '@/seed/estacionalidad';
import { diaN, deDiaN, diaSemana, diasDelMes, minutosDeHora } from '@/dominio/reglas/fechas';
import { conjuntoFestivos } from '@/dominio/reglas/festivos';

/**
 * Calendario comercial del generador (PLAN 7.3, 7.5): días cerrados, horario del día por local, eventos de
 * demanda y días hábiles. Funciones puras y baratas (cachean por fecha); aritmética exacta.
 */

/** Fecha + n días sin pasar por Date (rápido): usa el número de día. */
export function masDias(fecha: FechaISO, n: number): FechaISO {
  return deDiaN(diaN(fecha) + n);
}

export function esDiaCerrado(fecha: FechaISO): boolean {
  const md = fecha.slice(5, 10);
  return (DIAS_CERRADOS as readonly string[]).includes(md);
}

export class Calendario {
  readonly festivos: Set<FechaISO>;
  private readonly eventos = new Map<FechaISO, number>();

  constructor(anios: readonly number[]) {
    this.festivos = conjuntoFestivos(anios);
  }

  esFestivo(fecha: FechaISO): boolean {
    return this.festivos.has(fecha);
  }

  /** Día hábil: lunes a viernes y no festivo. */
  esHabil(fecha: FechaISO): boolean {
    const d = diaSemana(fecha);
    return d !== 0 && d !== 6 && !this.festivos.has(fecha);
  }

  siguienteHabil(fecha: FechaISO): FechaISO {
    let f = masDias(fecha, 1);
    while (!this.esHabil(f)) f = masDias(f, 1);
    return f;
  }

  /** Día hábil más cercano en o después de la fecha. */
  habilDesde(fecha: FechaISO): FechaISO {
    let f = fecha;
    while (!this.esHabil(f)) f = masDias(f, 1);
    return f;
  }

  /** n-ésimo día hábil del mes (n ≥ 1). */
  diaHabilDelMes(mes: string, n: number): FechaISO {
    let f = `${mes}-01`;
    let k = 0;
    for (;;) {
      if (this.esHabil(f)) {
        k += 1;
        if (k === n) return f;
      }
      f = masDias(f, 1);
    }
  }

  /** Horario de un local en una fecha (null si no abre). */
  horario(local: ConfigLocal, fecha: FechaISO): FranjaHorario | null {
    if (!local.datos.vende) return null;
    if (esDiaCerrado(fecha)) return null;
    let franja: FranjaHorario | null = this.festivos.has(fecha)
      ? local.datos.horarioFestivo
      : local.datos.horario[diaSemana(fecha) as DiaSemana];
    if (!franja) return null;
    const especial = CIERRE_ESPECIAL[fecha.slice(5, 10)];
    if (especial && minutosDeHora(especial) < minutosDeHora(franja.cierra))
      franja = { abre: franja.abre, cierra: especial };
    return franja;
  }

  /** Factor de eventos comerciales del día (7.5), sin el de festivo (que depende del local). */
  factorEventos(fecha: FechaISO): number {
    const guardado = this.eventos.get(fecha);
    if (guardado !== undefined) return guardado;
    const anio = Number(fecha.slice(0, 4));
    const mes = Number(fecha.slice(5, 7));
    const dia = Number(fecha.slice(8, 10));
    const md = fecha.slice(5, 10);
    const n = diaN(fecha);
    let f = 1;
    const E = EVENTOS_DEMANDA;
    if (mes === 6) {
      const padre = diaN(tercerDiaSemanaDelMes(anio, 6, 0));
      const delta = padre - n;
      if (delta >= 0 && delta <= 3) f *= E.diaPadre.juevesADomingo;
      else if (delta >= 4 && delta <= 6) f *= E.diaPadre.restoSemana;
      if (md >= E.primaJunio.desde && md <= E.primaJunio.hasta) f *= E.primaJunio.factor;
    }
    if (mes === 9) {
      const sabado = diaN(tercerDiaSemanaDelMes(anio, 9, 6));
      if (n >= sabado - 1 && n <= sabado + 1) f *= E.amorAmistad.viernesADomingo;
    }
    if (mes === 11 || (mes === 12 && dia <= 3)) {
      const viernes = diaN(ultimoViernesNoviembre(anio));
      if (n >= viernes && n <= viernes + 2) f *= E.blackFriday.viernesADomingo;
      else if (n >= viernes - 4 && n < viernes) f *= E.blackFriday.semana;
    }
    if (mes === 12) {
      if (md >= E.navidad.desde && md <= E.navidad.hasta) f *= E.navidad.factor;
      if (md === E.finDeAnio.fecha) f *= E.finDeAnio.factor;
    }
    // Quincenas: el 15 y el último día del mes, y los dos días siguientes.
    const ultimo = diasDelMes(fecha.slice(0, 7));
    if ((dia >= 15 && dia <= 17) || dia === ultimo || dia <= 2) f *= E.quincena.factor;
    this.eventos.set(fecha, f);
    return f;
  }

  /** ¿Es día de Black Friday (viernes a domingo)? */
  esBlackFriday(fecha: FechaISO): boolean {
    const anio = Number(fecha.slice(0, 4));
    const v = diaN(ultimoViernesNoviembre(anio));
    const n = diaN(fecha);
    return n >= v && n <= v + 2;
  }
}

/** Tercer día de la semana `ds` (0 = domingo) de un mes. */
export function tercerDiaSemanaDelMes(anio: number, mes: number, ds: number): FechaISO {
  let f = `${anio}-${mes < 10 ? `0${mes}` : mes}-01`;
  while (diaSemana(f) !== ds) f = masDias(f, 1);
  return masDias(f, 14);
}

export function ultimoViernesNoviembre(anio: number): FechaISO {
  let f = `${anio}-11-30`;
  while (diaSemana(f) !== 5) f = masDias(f, -1);
  return f;
}

/** Locales que venden (perfil no nulo). */
export function localesQueVenden(locales: readonly ConfigLocal[]): ConfigLocal[] {
  return locales.filter((l) => l.perfil !== null && l.datos.vende);
}

export type IdLocal = Id;

import type {
  AsistenciaDia,
  FechaHoraISO,
  FechaISO,
  Marcacion,
  Novedad,
  ParametrosNomina,
  Turno,
} from '../tipos';
import { redondearA } from './dinero';
import { componerTs, diferenciaMinutos, minutosDeHora } from './fechas';
import { minutosBrutos, minutosNocturnos } from './jornada';

/**
 * Asistencia derivada por empleado y día (PLAN 6.20.7). Se cruza el turno con la primera entrada y la última
 * salida. Llegada tarde: más de `toleranciaLlegadaTardeMin` después del inicio; los minutos tarde se cuentan
 * desde el inicio del turno (10:25 en un turno de 10:00 = 25 minutos tarde).
 */
export interface EntradaAsistencia {
  empleadoId: string;
  fecha: FechaISO;
  turno: Turno | null;
  /** Marcaciones del día, en cualquier orden. */
  marcaciones: readonly Marcacion[];
  novedad: Novedad | null;
  ahora: FechaHoraISO;
  parametros: ParametrosNomina;
  dominicalOFestivo: boolean;
}

function vacia(e: EntradaAsistencia, estado: AsistenciaDia['estado']): AsistenciaDia {
  return {
    empleadoId: e.empleadoId,
    fecha: e.fecha,
    localId: e.turno?.localId ?? e.marcaciones[0]?.localId ?? null,
    turnoId: e.turno?.id ?? null,
    entrada: null,
    salida: null,
    estado,
    minutosTarde: 0,
    horasTrabajadas: 0,
    horasOrdinarias: 0,
    horasExtraDiurnas: 0,
    horasExtraNocturnas: 0,
    horasRecargoNocturno: 0,
    horasDominicalFestivo: 0,
  };
}

export function asistenciaDia(e: EntradaAsistencia): AsistenciaDia {
  if (e.novedad) return vacia(e, 'novedad');
  const ordenadas = [...e.marcaciones].sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
  const entrada = ordenadas.find((m) => m.tipo === 'entrada')?.ts ?? null;
  const salidas = ordenadas.filter((m) => m.tipo === 'salida');
  let salida = salidas[salidas.length - 1]?.ts ?? null;
  const t = e.turno;

  if (!t) {
    const r = vacia(e, 'sin_turno');
    if (entrada && salida) {
      const min = Math.max(0, diferenciaMinutos(entrada, salida));
      r.entrada = entrada;
      r.salida = salida;
      r.horasTrabajadas = redondearA(min / 60, 2);
    }
    return r;
  }

  const inicioTs = componerTs(e.fecha, t.inicio);
  const finTs = componerTs(e.fecha, t.fin);
  const brutos = minutosBrutos(t.inicio, t.fin);
  const programados = Math.max(0, brutos - t.descansoMin);
  const terminado = diferenciaMinutos(inicioTs, e.ahora) >= brutos;

  if (!entrada) {
    return vacia(e, terminado ? 'ausente' : 'pendiente');
  }
  const r = vacia(e, 'a_tiempo');
  r.entrada = entrada;
  const retraso = diferenciaMinutos(inicioTs, entrada);
  if (retraso > e.parametros.toleranciaLlegadaTardeMin) {
    r.estado = 'tarde';
    r.minutosTarde = retraso;
  }
  if (!salida) {
    if (!terminado) {
      r.estado = r.estado === 'tarde' ? 'tarde' : 'en_curso';
      return r;
    }
    // Olvidó marcar la salida: se toma el fin del turno.
    salida = finTs;
  }
  r.salida = salida;
  const minutosTrabajados = Math.max(0, diferenciaMinutos(entrada, salida) - t.descansoMin);
  const ordinarios = Math.min(minutosTrabajados, programados);
  const extra = Math.max(0, minutosTrabajados - programados);

  // Ejes en minutos desde la medianoche del día del turno.
  const iniEntrada = minutosDeHora(entrada.slice(11, 16)) + (entrada.slice(0, 10) > e.fecha ? 1440 : 0);
  const finSalida = iniEntrada + diferenciaMinutos(entrada, salida);
  const nocturna = e.parametros.jornadaNocturna;
  const extraNocturna = Math.min(extra, minutosNocturnos(finSalida - extra, finSalida, nocturna));
  const ordinariaNocturna = Math.min(ordinarios, minutosNocturnos(iniEntrada, finSalida - extra, nocturna));

  r.horasTrabajadas = redondearA(minutosTrabajados / 60, 2);
  r.horasOrdinarias = redondearA(ordinarios / 60, 2);
  r.horasExtraNocturnas = redondearA(extraNocturna / 60, 2);
  r.horasExtraDiurnas = redondearA((extra - extraNocturna) / 60, 2);
  r.horasRecargoNocturno = redondearA(ordinariaNocturna / 60, 2);
  r.horasDominicalFestivo = e.dominicalOFestivo ? r.horasOrdinarias : 0;
  return r;
}

/** Suma de horas de una lista de días (insumos de la liquidación). */
export function sumarHoras(dias: readonly AsistenciaDia[]): {
  horasExtraDiurnas: number;
  horasExtraNocturnas: number;
  horasRecargoNocturno: number;
  horasDominicalFestivo: number;
  ausencias: number;
  llegadasTarde: number;
} {
  const r = {
    horasExtraDiurnas: 0,
    horasExtraNocturnas: 0,
    horasRecargoNocturno: 0,
    horasDominicalFestivo: 0,
    ausencias: 0,
    llegadasTarde: 0,
  };
  for (const d of dias) {
    r.horasExtraDiurnas += d.horasExtraDiurnas;
    r.horasExtraNocturnas += d.horasExtraNocturnas;
    r.horasRecargoNocturno += d.horasRecargoNocturno;
    r.horasDominicalFestivo += d.horasDominicalFestivo;
    if (d.estado === 'ausente') r.ausencias++;
    if (d.estado === 'tarde') r.llegadasTarde++;
  }
  r.horasExtraDiurnas = redondearA(r.horasExtraDiurnas, 2);
  r.horasExtraNocturnas = redondearA(r.horasExtraNocturnas, 2);
  r.horasRecargoNocturno = redondearA(r.horasRecargoNocturno, 2);
  r.horasDominicalFestivo = redondearA(r.horasDominicalFestivo, 2);
  return r;
}

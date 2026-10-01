import type { DatosEvento, EventoCalendario, FechaHoraISO, FechaISO, Id, TipoEvento } from '@/dominio/tipos';
import { diasDelMes, diferenciaDias, lunesDe, mesDe, rangoFechas, sumarDias, sumarMeses } from '@/lib/fechas';
import { fechaCorta, fechaLarga, mesAnio } from '@/lib/formato';
import type { EventoAgenda, Vista } from './tipos';

/** Cálculos propios del Calendario (C3): rangos visibles, carriles de eventos largos, mover y el borrador de un evento. */

// ---------------------------------------------------------------------------------------------------------
// Vista y período
// ---------------------------------------------------------------------------------------------------------
export const VISTAS: readonly Vista[] = ['mes', 'semana', 'dia'];

export function vistaValida(v: string | null | undefined): Vista {
  return v === 'semana' || v === 'dia' ? v : 'mes';
}

/** Rango de fechas que pinta la vista: el mes completo en semanas de lunes a domingo, la semana o el día. */
export function rangoVisible(vista: Vista, fecha: FechaISO): { desde: FechaISO; hasta: FechaISO } {
  if (vista === 'dia') return { desde: fecha, hasta: fecha };
  if (vista === 'semana') {
    const l = lunesDe(fecha);
    return { desde: l, hasta: sumarDias(l, 6) };
  }
  const mes = mesDe(fecha);
  const ultimo = `${mes}-${String(diasDelMes(mes)).padStart(2, '0')}`;
  return { desde: lunesDe(`${mes}-01`), hasta: sumarDias(lunesDe(ultimo), 6) };
}

/** Las semanas (7 fechas cada una) que cubre el rango del mes. */
export function semanasDelMes(fecha: FechaISO): FechaISO[][] {
  const { desde, hasta } = rangoVisible('mes', fecha);
  const dias = rangoFechas(desde, hasta);
  const semanas: FechaISO[][] = [];
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));
  return semanas;
}

/** Avanza o retrocede un período; en el mes conserva el día (acotado al último día del mes destino). */
export function moverPeriodo(vista: Vista, fecha: FechaISO, n: number): FechaISO {
  if (vista === 'mes') return sumarMeses(fecha, n);
  return sumarDias(fecha, vista === 'semana' ? 7 * n : n);
}

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Título del período: "Octubre de 2026", "28 sep – 4 oct de 2026" o "Jueves 1 de octubre de 2026". */
export function tituloPeriodo(vista: Vista, fecha: FechaISO): string {
  if (vista === 'mes') return mayuscula(mesAnio(mesDe(fecha)));
  if (vista === 'dia') return fechaLarga(fecha);
  const { desde, hasta } = rangoVisible('semana', fecha);
  const mismoMes = desde.slice(0, 7) === hasta.slice(0, 7);
  const anio = hasta.slice(0, 4);
  return mismoMes
    ? `${Number(desde.slice(8, 10))} – ${fechaCorta(hasta)} de ${anio}`
    : `${fechaCorta(desde)} – ${fechaCorta(hasta)} de ${anio}`;
}

// ---------------------------------------------------------------------------------------------------------
// Eventos por día
// ---------------------------------------------------------------------------------------------------------
/** Fechas que cubre un evento (de su inicio a su fin, ambos incluidos; tope de 62 días). */
export function diasQueCubre(e: { inicio: FechaHoraISO; fin: FechaHoraISO | null }): FechaISO[] {
  const ini = e.inicio.slice(0, 10);
  const fin = e.fin ? e.fin.slice(0, 10) : ini;
  if (fin <= ini) return [ini];
  const tope = sumarDias(ini, 62);
  return rangoFechas(ini, fin > tope ? tope : fin);
}

export const esMultidia = (e: { inicio: FechaHoraISO; fin: FechaHoraISO | null }): boolean => diasQueCubre(e).length > 1;

/** Hora de inicio "10:00" del evento, o null si es de todo el día. */
export function horaInicioDe(e: Pick<EventoAgenda, 'inicio' | 'todoElDia'>): string | null {
  return e.todoElDia ? null : e.inicio.slice(11, 16);
}

/** Orden dentro de un día: todo el día primero (los largos antes), luego por hora y por título. */
export function compararDelDia(a: EventoAgenda, b: EventoAgenda): number {
  if (a.todoElDia !== b.todoElDia) return a.todoElDia ? -1 : 1;
  if (a.todoElDia && esMultidia(a) !== esMultidia(b)) return esMultidia(a) ? -1 : 1;
  if (a.inicio !== b.inicio) return a.inicio < b.inicio ? -1 : 1;
  return a.titulo.localeCompare(b.titulo, 'es') || (a.id < b.id ? -1 : 1);
}

/** Agrupa los eventos por cada día que cubren (solo los días de `dias`). */
export function agruparPorDia(eventos: readonly EventoAgenda[], dias: readonly FechaISO[]): Map<FechaISO, EventoAgenda[]> {
  const mapa = new Map<FechaISO, EventoAgenda[]>(dias.map((d) => [d, []]));
  for (const e of eventos) for (const d of diasQueCubre(e)) mapa.get(d)?.push(e);
  for (const lista of mapa.values()) lista.sort(compararDelDia);
  return mapa;
}

export const TIPOS_EVENTO: readonly TipoEvento[] = ['turno', 'importacion', 'vencimiento', 'campana', 'cita', 'otro'];

/** Tipos que muestra la leyenda: "Otros" solo aparece si hay alguno (o si está apagado, para poder volver a encenderlo). */
export function tiposVisiblesEnLeyenda(conteo: Record<TipoEvento, number>, activos: ReadonlySet<TipoEvento>): TipoEvento[] {
  return TIPOS_EVENTO.filter((t) => t !== 'otro' || conteo.otro > 0 || !activos.has('otro'));
}

export function contarPorTipo(eventos: readonly EventoAgenda[]): Record<TipoEvento, number> {
  const r: Record<TipoEvento, number> = { turno: 0, importacion: 0, vencimiento: 0, campana: 0, cita: 0, otro: 0 };
  for (const e of eventos) r[e.tipo]++;
  return r;
}

// ---------------------------------------------------------------------------------------------------------
// Semana del mes: carriles de eventos largos + celdas por día
// ---------------------------------------------------------------------------------------------------------
export type Celda =
  | { clase: 'evento'; evento: EventoAgenda; fecha: FechaISO; inicioSegmento: boolean; finSegmento: boolean }
  | { clase: 'hueco' }
  | { clase: 'turnos'; turnos: EventoAgenda[] };

export interface DiaDeSemana {
  fecha: FechaISO;
  visibles: Celda[];
  /** Eventos que no caben y se ven en la vista del día. */
  ocultos: number;
  /** Total de eventos del día (turnos incluidos). */
  total: number;
}

/**
 * Arma las siete celdas de una semana del mes. Los eventos de varios días (campañas) ocupan el mismo carril todos
 * sus días, para que la barra se vea continua; los de un día van debajo; los turnos del día son una sola ficha
 * ("9 turnos") que siempre se muestra. `maxFilas` incluye la ficha de turnos.
 */
export function construirSemana(semana: readonly FechaISO[], eventos: readonly EventoAgenda[], maxFilas: number): DiaDeSemana[] {
  const porDia = agruparPorDia(eventos, semana);
  const largos = new Map<string, EventoAgenda>();
  for (const e of eventos) if (esMultidia(e) && diasQueCubre(e).some((d) => semana.includes(d))) largos.set(e.id, e);
  const orden = [...largos.values()].sort((a, b) => (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : diasQueCubre(b).length - diasQueCubre(a).length || (a.id < b.id ? -1 : 1)));
  const carriles: Set<FechaISO>[] = [];
  const carrilDe = new Map<string, number>();
  for (const e of orden) {
    const dias = diasQueCubre(e).filter((d) => semana.includes(d));
    let k = carriles.findIndex((ocupado) => dias.every((d) => !ocupado.has(d)));
    if (k < 0) {
      carriles.push(new Set());
      k = carriles.length - 1;
    }
    for (const d of dias) carriles[k]?.add(d);
    carrilDe.set(e.id, k);
  }
  return semana.map((fecha) => {
    const delDia = porDia.get(fecha) ?? [];
    const turnos = delDia.filter((e) => e.tipo === 'turno');
    const resto = delDia.filter((e) => e.tipo !== 'turno');
    const celdas: Celda[] = [];
    for (let k = 0; k < carriles.length; k++) {
      const e = resto.find((x) => carrilDe.get(x.id) === k && esMultidia(x));
      if (!e) {
        celdas.push({ clase: 'hueco' });
        continue;
      }
      const dias = diasQueCubre(e);
      celdas.push({
        clase: 'evento',
        evento: e,
        fecha,
        inicioSegmento: fecha === dias[0] || fecha === semana[0],
        finSegmento: fecha === dias[dias.length - 1] || fecha === semana[semana.length - 1],
      });
    }
    // Un hueco solo sirve para alinear la barra de un evento largo que viene debajo: los del final se descartan.
    while (celdas.length > 0 && celdas[celdas.length - 1]?.clase === 'hueco') celdas.pop();
    for (const e of resto) if (!esMultidia(e)) celdas.push({ clase: 'evento', evento: e, fecha, inicioSegmento: true, finSegmento: true });
    const cupo = Math.max(1, maxFilas - (turnos.length > 0 ? 1 : 0));
    const visibles = celdas.slice(0, cupo);
    const ocultos = celdas.slice(cupo).filter((c) => c.clase === 'evento').length;
    if (turnos.length > 0) visibles.push({ clase: 'turnos', turnos });
    return { fecha, visibles, ocultos, total: delDia.length };
  });
}

// ---------------------------------------------------------------------------------------------------------
// Mover
// ---------------------------------------------------------------------------------------------------------
/** Desplaza el inicio y el fin de un evento guardado los días indicados, conservando las horas. */
export function trasladarEvento(
  e: { inicio: FechaHoraISO; fin: FechaHoraISO | null },
  dias: number,
): { inicio: FechaHoraISO; fin: FechaHoraISO | null } {
  const mover = (ts: FechaHoraISO) => `${sumarDias(ts.slice(0, 10), dias)}${ts.slice(10)}`;
  return { inicio: mover(e.inicio), fin: e.fin ? mover(e.fin) : null };
}

/** Días que hay que mover un evento cuando se toma de un día y se suelta en otro. */
export const diasEntre = (desde: FechaISO, hasta: FechaISO): number => diferenciaDias(desde, hasta);

// ---------------------------------------------------------------------------------------------------------
// Obligaciones ilustrativas: viven en `@/dominio/reglas/obligaciones` (compartidos C-D); se reexportan aquí.
// ---------------------------------------------------------------------------------------------------------
export { obligacionesIlustrativas, type ClaveObligacion, type ObligacionIlustrativa } from '@/dominio/reglas/obligaciones';

// ---------------------------------------------------------------------------------------------------------
// Borrador de un evento guardado
// ---------------------------------------------------------------------------------------------------------
export type ClaseEvento = 'campana' | 'asesoria' | 'toma_medidas' | 'seguimiento' | 'obligacion_tributaria' | 'obligacion_laboral' | 'otro';

export const CLASES_EVENTO: Record<ClaseEvento, { tipo: EventoCalendario['tipo']; subtipo: EventoCalendario['subtipo']; etiqueta: string; ayuda: string }> = {
  campana: { tipo: 'campana', subtipo: 'campana_temporada', etiqueta: 'Campaña de temporada', ayuda: 'Prima de junio, Día del Padre, Amor y Amistad, Black Friday, Navidad, grados.' },
  asesoria: { tipo: 'cita', subtipo: 'asesoria', etiqueta: 'Asesoría de imagen', ayuda: 'Una cita con un cliente para armarle el vestuario.' },
  toma_medidas: { tipo: 'cita', subtipo: 'toma_medidas', etiqueta: 'Toma de medidas', ayuda: 'Para sastrería: la cita en que se toman las medidas.' },
  seguimiento: { tipo: 'cita', subtipo: 'seguimiento', etiqueta: 'Seguimiento a un cliente', ayuda: 'Entrega de ajustes, llamada de posventa, recordatorio de cobro.' },
  obligacion_tributaria: { tipo: 'vencimiento', subtipo: 'obligacion_tributaria', etiqueta: 'Obligación tributaria', ayuda: 'IVA, retención en la fuente, ICA, renovación de matrícula mercantil.' },
  obligacion_laboral: { tipo: 'vencimiento', subtipo: 'obligacion_laboral', etiqueta: 'Obligación laboral', ayuda: 'PILA, prima, cesantías, dotación.' },
  otro: { tipo: 'otro', subtipo: 'otro', etiqueta: 'Otro evento', ayuda: 'Cualquier cosa que quieras ver en el calendario.' },
};

export const ORDEN_CLASES: readonly ClaseEvento[] = ['campana', 'asesoria', 'toma_medidas', 'seguimiento', 'obligacion_tributaria', 'obligacion_laboral', 'otro'];

export function claseDe(e: Pick<EventoCalendario, 'tipo' | 'subtipo'>): ClaseEvento {
  if (e.subtipo === 'campana_temporada') return 'campana';
  if (e.subtipo === 'asesoria' || e.subtipo === 'toma_medidas' || e.subtipo === 'seguimiento') return e.subtipo;
  if (e.subtipo === 'obligacion_tributaria' || e.subtipo === 'obligacion_laboral') return e.subtipo;
  return 'otro';
}

export const OPCIONES_RECORDATORIO: readonly { valor: string; minutos: number | null; etiqueta: string }[] = [
  { valor: 'ninguno', minutos: null, etiqueta: 'Sin recordatorio' },
  { valor: '15', minutos: 15, etiqueta: '15 minutos antes' },
  { valor: '60', minutos: 60, etiqueta: '1 hora antes' },
  { valor: '1440', minutos: 1440, etiqueta: '1 día antes' },
  { valor: '2880', minutos: 2880, etiqueta: '2 días antes' },
];

export function textoRecordatorio(minutos: number | null): string {
  const o = OPCIONES_RECORDATORIO.find((x) => x.minutos === minutos);
  if (o) return o.etiqueta;
  if (minutos === null) return 'Sin recordatorio';
  return minutos % 1440 === 0 ? `${minutos / 1440} días antes` : minutos % 60 === 0 ? `${minutos / 60} horas antes` : `${minutos} minutos antes`;
}

export const SIN_LOCAL = 'ninguno';
export const SIN_EMPLEADO = 'ninguno';

export interface BorradorEvento {
  titulo: string;
  clase: ClaseEvento | null;
  todoElDia: boolean;
  fecha: FechaISO | null;
  /** Último día de un evento de varios días (campañas). */
  fechaFin: FechaISO | null;
  horaInicio: string;
  horaFin: string;
  localId: Id | typeof SIN_LOCAL;
  clienteId: Id | null;
  empleadoId: Id | typeof SIN_EMPLEADO;
  recordatorio: string;
  descripcion: string;
}

export type CampoEvento = 'titulo' | 'clase' | 'fecha' | 'fechaFin' | 'horaInicio' | 'horaFin';

const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export function borradorNuevo(fecha: FechaISO, localId: Id | 'todos'): BorradorEvento {
  return {
    titulo: '',
    clase: null,
    todoElDia: false,
    fecha,
    fechaFin: null,
    horaInicio: '10:00',
    horaFin: '11:00',
    localId: localId === 'todos' ? SIN_LOCAL : localId,
    clienteId: null,
    empleadoId: SIN_EMPLEADO,
    recordatorio: 'ninguno',
    descripcion: '',
  };
}

export function borradorDeEvento(e: EventoCalendario): BorradorEvento {
  const fecha = e.inicio.slice(0, 10);
  const finFecha = e.fin ? e.fin.slice(0, 10) : null;
  return {
    titulo: e.titulo,
    clase: claseDe(e),
    todoElDia: e.todoElDia,
    fecha,
    fechaFin: finFecha && finFecha !== fecha ? finFecha : null,
    horaInicio: e.todoElDia ? '10:00' : e.inicio.slice(11, 16),
    horaFin: e.todoElDia || !e.fin ? '' : e.fin.slice(11, 16),
    localId: e.localId ?? SIN_LOCAL,
    clienteId: e.clienteId,
    empleadoId: e.empleadoId ?? SIN_EMPLEADO,
    recordatorio: e.recordatorioMin === null ? 'ninguno' : String(e.recordatorioMin),
    descripcion: e.descripcion ?? '',
  };
}

/** Errores por campo (las mismas reglas del comando `evento.crear`, para avisar antes de enviar). */
export function validarBorradorEvento(b: BorradorEvento): Partial<Record<CampoEvento, string>> {
  const e: Partial<Record<CampoEvento, string>> = {};
  if (!b.titulo.trim()) e.titulo = 'Escribe el título del evento.';
  if (!b.clase) e.clase = 'Elige qué tipo de evento es.';
  if (!b.fecha) e.fecha = 'Elige la fecha del evento.';
  if (b.fecha && b.fechaFin && b.fechaFin < b.fecha) e.fechaFin = 'El evento no puede terminar antes de empezar.';
  if (!b.todoElDia) {
    if (!RE_HORA.test(b.horaInicio)) e.horaInicio = 'Escribe la hora como 10:00.';
    if (b.horaFin && !RE_HORA.test(b.horaFin)) e.horaFin = 'Escribe la hora como 11:00.';
    else if (b.fecha && b.horaFin && !e.horaInicio && (b.fechaFin ?? b.fecha) === b.fecha && b.horaFin <= b.horaInicio)
      e.horaFin = 'La hora de fin debe ser después de la de inicio.';
  }
  return e;
}

/** Datos del comando `evento.crear` / `evento.editar` a partir de un borrador válido. */
export function datosDeBorrador(b: BorradorEvento): DatosEvento {
  const clase = CLASES_EVENTO[b.clase ?? 'otro'];
  const fecha = b.fecha as FechaISO;
  const fin = b.fechaFin ?? fecha;
  const inicio: FechaHoraISO = `${fecha}T${b.todoElDia ? '00:00' : b.horaInicio}:00`;
  const finTs: FechaHoraISO | null = b.todoElDia
    ? b.fechaFin
      ? `${fin}T23:59:00`
      : null
    : b.horaFin
      ? `${fin}T${b.horaFin}:00`
      : b.fechaFin
        ? `${fin}T${b.horaInicio}:00`
        : null;
  const conCliente = clase.tipo === 'cita';
  return {
    tipo: clase.tipo,
    subtipo: clase.subtipo,
    titulo: b.titulo.trim(),
    inicio,
    fin: finTs,
    todoElDia: b.todoElDia,
    localId: b.localId === SIN_LOCAL ? null : b.localId,
    clienteId: conCliente ? b.clienteId : null,
    empleadoId: b.empleadoId === SIN_EMPLEADO ? null : b.empleadoId,
    descripcion: b.descripcion.trim() || null,
    recordatorioMin: b.recordatorio === 'ninguno' ? null : Number(b.recordatorio),
  };
}

import type { COP, EstadoDominio, FechaHoraISO, FechaISO, Id, MesISO } from '@/dominio/tipos';
import { diaSemana, diasDelMes, minutosDeHora, rangoFechas, sumarDias, sumarMesesAMes } from '@/dominio/reglas/fechas';
import { esFestivo } from '@/dominio/reglas/festivos';
import { crearSelector } from './memo';
import { hechosEnFechas, hechosEnRango, MIN_VENTAS_BASE, MIN_VENTAS_HOY, resumirHechos, type ResumenVentas, selVentasHoyHastaHora } from './ventas';
import { selEfectivoEnCajas, selCierresDelDia } from './caja';
import { nombreEmpleado } from './base';

/** Inicio del dueño (PLAN 6.23 `inicio.ts`, 2.3, D1). */

export type FormatoKpi = 'dinero' | 'entero' | 'porcentaje';
export interface Kpi {
  id: 'ventas_hoy' | 'ventas_mes' | 'ticket' | 'unidades' | 'margen' | 'efectivo';
  etiqueta: string;
  valor: number;
  formato: FormatoKpi;
  /** Variación (fracción) frente a la comparación; null si no hay base. */
  variacion: number | null;
  /** "vs. el miércoles pasado a esta hora" · "vs. agosto a la misma fecha". */
  comparacion: string | null;
  /** Micrográfico (valores en el formato de la tarjeta, del más viejo al más nuevo). */
  serie: number[];
  /** Subtítulo ("Hoy: los locales abren a las 10:00 a. m." · "31 ventas" · "suma de las tres cajas"). */
  detalle: string | null;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Primera hora de apertura de hoy entre los locales elegidos ('HH:mm'), o null si todos cierran. */
export function aperturaDelDia(e: EstadoDominio, fecha: FechaISO, localId: Id | 'todos'): string | null {
  let primera: string | null = null;
  for (const l of Object.values(e.locales)) {
    if (!l.vende || l.eliminadoEn || (localId !== 'todos' && l.id !== localId)) continue;
    const franja = esFestivo(fecha) ? l.horarioFestivo : l.horario[diaSemana(fecha)];
    if (franja && (!primera || franja.abre < primera)) primera = franja.abre;
  }
  return primera;
}

/** Mismo día del mes anterior (acotado al fin de mes). */
function mismaFechaMesAnterior(hoy: FechaISO): { mes: MesISO; hasta: FechaISO } {
  const mes = sumarMesesAMes(hoy.slice(0, 7), -1);
  const dia = Math.min(Number(hoy.slice(8, 10)), diasDelMes(mes));
  return { mes, hasta: `${mes}-${String(dia).padStart(2, '0')}` };
}

export interface KpisInicio {
  tarjetas: Kpi[];
  /** Antes de abrir: la tarjeta de ventas muestra "Ayer" como cifra principal (2.3.1). */
  antesDeAbrir: boolean;
  hoy: ResumenVentas;
  ayer: ResumenVentas;
  mes: ResumenVentas;
  mesAnterior: ResumenVentas;
  /**
   * Con qué periodo se calculan las tarjetas del mes: el mes a la fecha, o (los primeros días del mes, cuando casi no
   * hay con qué comparar) los últimos 30 días contra los 30 anteriores.
   */
  periodo: { modo: 'mes' | '30d'; desde: FechaISO; hasta: FechaISO };
}

/** Días que debe llevar el mes para comparar "a la fecha" con el mes anterior; antes se usan los últimos 30 días. */
export const DIAS_MINIMOS_MES = 7;

/** Apertura y cierre típicos de los locales, solo para repartir un día en fracciones (hora de la demo). */
const APERTURA_TIPICA_MIN = 10 * 60;
const CIERRE_TIPICO_MIN = 20 * 60;

export interface AvanceMeta {
  /** 'arranque': el mes apenas empieza; 'ritmo': mes en curso; 'cierre': mes ya cerrado. */
  modo: 'arranque' | 'ritmo' | 'cierre';
  /** Fracción del mes que ya pasó (incluye la parte del día de hoy). */
  transcurrido: number;
  /** Lo logrado dividido entre lo esperado a hoy (1 = justo al ritmo). null si el mes apenas arranca o ya cerró. */
  vsEsperado: number | null;
}

/**
 * Cuánto de la meta lleva el mes frente a lo que debería llevar a esta fecha y hora (la meta se reparte por igual
 * entre los días del mes). Evita que el día 1 diga "2 % de la meta": con menos de 3 días completos solo se avisa
 * que el mes apenas arranca.
 */
export function avanceMeta(cumplimiento: number, ahora: FechaHoraISO, mes: MesISO): AvanceMeta {
  const hoyF = ahora.slice(0, 10);
  if (!hoyF.startsWith(mes)) return { modo: 'cierre', transcurrido: hoyF > `${mes}-31` ? 1 : 0, vsEsperado: null };
  const total = diasDelMes(mes);
  const completos = Number(hoyF.slice(8, 10)) - 1;
  const min = minutosDeHora(ahora.slice(11, 16));
  const deHoy = Math.max(0, Math.min(1, (min - APERTURA_TIPICA_MIN) / (CIERRE_TIPICO_MIN - APERTURA_TIPICA_MIN)));
  const transcurrido = Math.min(1, (completos + deHoy) / total);
  if (completos < 3) return { modo: 'arranque', transcurrido, vsEsperado: null };
  return { modo: 'ritmo', transcurrido, vsEsperado: transcurrido > 0 ? cumplimiento / transcurrido : null };
}

/** Las seis tarjetas de Inicio con micrográfico y variación (2.3.2). Cuadran con la suma directa de las ventas. */
export const selKpisInicio = crearSelector<{ localId: Id | 'todos'; ahora: FechaHoraISO }, KpisInicio>(
  'selKpisInicio',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'locales', 'cuentas', 'agregados'],
  (e, { localId, ahora }) => {
    const hoyF = ahora.slice(0, 10);
    const ayerF = sumarDias(hoyF, -1);
    const ant0 = mismaFechaMesAnterior(hoyF);
    const modo30 = Number(hoyF.slice(8, 10)) < DIAS_MINIMOS_MES;
    const desde30 = sumarDias(hoyF, -29);
    const ant30 = sumarDias(hoyF, -30);
    const hechos = hechosEnFechas(e, { desde: modo30 ? sumarDias(hoyF, -59) : `${ant0.mes}-01`, hasta: hoyF });
    const hora = ahora.slice(11, 19);
    // El periodo anterior se corta a la misma hora del día equivalente: hoy a las 3:30 p. m. no se compara con un día entero.
    const hastaLaHora = (hs: typeof hechos, ultimaFecha: FechaISO) => hs.filter((h) => h.fecha < ultimaFecha || h.ts.slice(11, 19) <= hora);
    const vh = selVentasHoyHastaHora(e, { hoy: hoyF, ahora, localId });
    const ayer = resumirHechos(hechosEnRango(hechos, ayerF, ayerF, localId));
    const apertura = aperturaDelDia(e, hoyF, localId);
    const antesDeAbrir = !apertura || minutosDeHora(ahora.slice(11, 16)) < minutosDeHora(apertura);
    const inicioMes = `${hoyF.slice(0, 7)}-01`;
    const mes = resumirHechos(hechosEnRango(hechos, inicioMes, hoyF, localId).filter((h) => h.ts <= ahora));
    const ant = mismaFechaMesAnterior(hoyF);
    const mesAnterior = resumirHechos(hastaLaHora(hechosEnRango(hechos, `${ant.mes}-01`, ant.hasta, localId), ant.hasta));
    const ultimos30 = resumirHechos(hechosEnRango(hechos, desde30, hoyF, localId).filter((h) => h.ts <= ahora));
    const anteriores30 = resumirHechos(hastaLaHora(hechosEnRango(hechos, sumarDias(hoyF, -59), ant30, localId), ant30));
    const nombreMesAnt = MESES[Number(ant.mes.slice(5, 7)) - 1] ?? '';
    // Lo que muestran las tarjetas del mes: el mes a la fecha, o los últimos 30 días en los primeros días del mes.
    const act = modo30 ? ultimos30 : mes;
    const base = modo30 ? anteriores30 : mesAnterior;
    const cmpFecha = modo30 ? 'vs. los 30 días anteriores' : `vs. ${nombreMesAnt} a la misma fecha`;
    const cmp = modo30 ? 'vs. los 30 días anteriores' : `vs. ${nombreMesAnt}`;
    const delPeriodo = modo30 ? 'últimos 30 días' : 'del mes';
    const variacion = (a: number, b: number) => (b !== 0 ? (a - b) / Math.abs(b) : null);

    // Series: últimos 14 días (netas) y días del mes.
    const dias14 = rangoFechas(sumarDias(hoyF, -13), hoyF);
    const porDia = new Map<FechaISO, ResumenVentas>();
    const enRango = hechosEnRango(hechos, dias14[0] ?? hoyF, hoyF, localId).filter((h) => h.ts <= ahora);
    for (const f of dias14) porDia.set(f, resumirHechos(enRango.filter((h) => h.fecha === f)));
    const serie = (k: keyof ResumenVentas) => dias14.map((f) => Number(porDia.get(f)?.[k] ?? 0));

    const efectivo = selEfectivoEnCajas(e, { localId });
    const tarjetas: Kpi[] = [
      antesDeAbrir
        ? {
            id: 'ventas_hoy',
            etiqueta: 'Ayer',
            valor: ayer.netas,
            formato: 'dinero',
            variacion: null,
            comparacion: null,
            serie: serie('netas').slice(0, -1),
            detalle: apertura ? `Hoy: los locales abren a las ${apertura}` : 'Hoy los locales no abren',
          }
        : {
            id: 'ventas_hoy',
            etiqueta: 'Ventas de hoy',
            valor: vh.hoy.netas,
            formato: 'dinero',
            variacion: vh.variacion,
            comparacion: `vs. el ${DIAS[diaSemana(hoyF)]} pasado a esta hora`,
            serie: serie('netas'),
            detalle: `${vh.hoy.numVentas} ${vh.hoy.numVentas === 1 ? 'venta' : 'ventas'}`,
          },
      {
        id: 'ventas_mes',
        etiqueta: modo30 ? 'Ventas de los últimos 30 días' : 'Ventas del mes',
        valor: act.netas,
        formato: 'dinero',
        variacion: variacion(act.netas, base.netas),
        comparacion: cmpFecha,
        serie: serie('netas'),
        detalle: `${act.numVentas} ventas`,
      },
      {
        id: 'ticket',
        etiqueta: 'Ticket promedio',
        valor: act.ticket,
        formato: 'dinero',
        variacion: variacion(act.ticket, base.ticket),
        comparacion: cmp,
        serie: serie('ticket'),
        detalle: delPeriodo,
      },
      {
        id: 'unidades',
        etiqueta: 'Unidades vendidas',
        valor: act.unidades,
        formato: 'entero',
        variacion: variacion(act.unidades, base.unidades),
        comparacion: cmpFecha,
        serie: serie('unidades'),
        detalle: delPeriodo,
      },
      {
        id: 'margen',
        etiqueta: modo30 ? 'Margen bruto de 30 días' : 'Margen bruto del mes',
        valor: act.margen,
        formato: 'dinero',
        variacion: variacion(act.margen, base.margen),
        comparacion: cmpFecha,
        serie: serie('margen'),
        detalle: `${Math.round(act.margenPct * 1000) / 10} % sobre la venta sin IVA`,
      },
      {
        id: 'efectivo',
        etiqueta: 'Efectivo en caja',
        valor: efectivo.total,
        formato: 'dinero',
        variacion: null,
        comparacion: null,
        serie: [],
        detalle: localId === 'todos' ? 'Estimado: suma de las tres cajas' : 'Estimado',
      },
    ];
    const periodo = modo30 ? { modo: '30d' as const, desde: desde30, hasta: hoyF } : { modo: 'mes' as const, desde: inicioMes, hasta: hoyF };
    return { tarjetas, antesDeAbrir, hoy: vh.hoy, ayer, mes, mesAnterior, periodo };
  },
);

export interface DatosSaludo {
  franja: 'manana' | 'tarde' | 'noche';
  /** Antes de las 11:00: el resumen es de ayer. */
  periodo: 'ayer' | 'hoy';
  ventas: COP;
  numVentas: number;
  variacion: number | null;
  /** Día de la semana de la comparación ('miércoles'). */
  diaComparacion: string;
  mejorLocal: { id: Id; nombre: string } | null;
  /** Solo antes de las 11: cierres de anoche. */
  cierres: { cuadraron: string[]; conDiferencia: { local: string; diferencia: COP; cajero: string }[] } | null;
  apertura: string | null;
  localNombre: string | null;
}

/** Datos para la frase del saludo (2.3.1): tres variantes por hora; la redacción la hace D1 con config. */
export const selSaludo = crearSelector<{ localId: Id | 'todos'; ahora: FechaHoraISO }, DatosSaludo>(
  'selSaludo',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'locales', 'sesionesCaja', 'empleados', 'usuarios', 'agregados'],
  (e, { localId, ahora }) => {
    const hoyF = ahora.slice(0, 10);
    const min = minutosDeHora(ahora.slice(11, 16));
    const franja = min < 11 * 60 ? 'manana' : min < 20 * 60 ? 'tarde' : 'noche';
    const periodo = franja === 'manana' ? 'ayer' : 'hoy';
    const fecha = periodo === 'ayer' ? sumarDias(hoyF, -1) : hoyF;
    const hechos = hechosEnFechas(e, { desde: sumarDias(fecha, -7), hasta: fecha });
    const delDia = hechosEnRango(hechos, fecha, fecha, localId).filter((h) => periodo === 'ayer' || h.ts <= ahora);
    const r = resumirHechos(delDia);
    const comparar = sumarDias(fecha, -7);
    const hora = periodo === 'ayer' ? '23:59:59' : ahora.slice(11, 19);
    const b = resumirHechos(hechosEnRango(hechos, comparar, comparar, localId).filter((h) => h.ts.slice(11, 19) <= hora));
    const porLocal = new Map<Id, number>();
    for (const h of delDia) porLocal.set(h.localId, (porLocal.get(h.localId) ?? 0) + h.total);
    let mejor: { id: Id; nombre: string } | null = null;
    let mejorValor = -Infinity;
    for (const [id, v] of porLocal)
      if (v > mejorValor) {
        mejorValor = v;
        mejor = { id, nombre: e.locales[id]?.nombre ?? id };
      }
    let cierres: DatosSaludo['cierres'] = null;
    if (franja === 'manana') {
      const c = selCierresDelDia(e, { fecha });
      cierres = {
        cuadraron: c.filter((x) => x.diferencia === 0 && x.estado !== 'sin_abrir').map((x) => x.localNombre),
        conDiferencia: c
          .filter((x) => x.diferencia !== null && x.diferencia !== 0)
          .map((x) => ({ local: x.localNombre, diferencia: x.diferencia ?? 0, cajero: x.cajero })),
      };
    }
    return {
      franja,
      periodo,
      ventas: r.netas,
      numVentas: r.numVentas,
      variacion: b.netas > 0 && b.numVentas >= MIN_VENTAS_BASE && r.numVentas >= MIN_VENTAS_HOY ? (r.netas - b.netas) / b.netas : null,
      diaComparacion: DIAS[diaSemana(fecha)] ?? '',
      mejorLocal: localId === 'todos' ? mejor : null,
      cierres,
      apertura: aperturaDelDia(e, hoyF, localId),
      localNombre: localId === 'todos' ? null : (e.locales[localId]?.nombre ?? null),
    };
  },
);

export interface ComparativoLocal {
  localId: Id;
  nombre: string;
  resumen: ResumenVentas;
  meta: COP | null;
  /** netas / meta. */
  cumplimiento: number | null;
  ultimoCierre: { fecha: FechaISO; diferencia: COP; cajero: string; revisado: boolean } | null;
}

/** "Tus tres locales" (2.3.2): ventas, margen, ticket, unidades, cumplimiento de meta y último cierre. */
export const selComparativoLocales = crearSelector<{ mes: MesISO; hoy: FechaISO }, ComparativoLocal[]>(
  'selComparativoLocales',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'locales', 'metas', 'sesionesCaja', 'empleados', 'usuarios'],
  (e, { mes, hoy }) => {
    const hasta = hoy.startsWith(mes) ? hoy : `${mes}-${String(diasDelMes(mes)).padStart(2, '0')}`;
    const hechos = hechosEnFechas(e, { desde: `${mes}-01`, hasta });
    const cierres = Object.values(e.sesionesCaja)
      .filter((s) => s.cierre && s.cierre.ts.slice(0, 10) <= hoy)
      .sort((a, b) => ((a.cierre?.ts ?? '') < (b.cierre?.ts ?? '') ? 1 : -1));
    return Object.values(e.locales)
      .filter((l) => l.vende && !l.eliminadoEn)
      .sort((a, b) => a.orden - b.orden)
      .map((l) => {
        const resumen = resumirHechos(hechos.filter((h) => h.localId === l.id));
        const meta = Object.values(e.metas).find((m) => m.localId === l.id && m.mes === mes)?.valor ?? null;
        const c = cierres.find((s) => s.localId === l.id);
        const quien = c?.cierre ? (e.empleados[c.cierre.por] ? nombreEmpleado(e.empleados[c.cierre.por]) : (e.usuarios[c.cierre.por]?.nombre ?? '')) : '';
        return {
          localId: l.id,
          nombre: l.nombre,
          resumen,
          meta,
          cumplimiento: meta ? resumen.netas / meta : null,
          ultimoCierre: c?.cierre
            ? { fecha: c.cierre.ts.slice(0, 10), diferencia: c.cierre.diferencia, cajero: quien, revisado: !!c.revision }
            : null,
        };
      });
  },
);

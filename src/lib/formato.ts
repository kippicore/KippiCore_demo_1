import type { FechaHoraISO, FechaISO, Moneda } from '@/dominio/tipos';
import { MONEDAS } from '@/config/monedas';
import { diaSemana, diferenciaDias } from '@/dominio/reglas/fechas';

/**
 * Formatos colombianos (PLAN 5.10, 8.11.3, 8.9.3). TODO lo que se muestra pasa por aquí: ningún módulo formatea
 * a mano. La agrupación de miles y la coma decimal se arman a mano (no dependen de cómo cada navegador
 * implementa `Intl` para es-CO: en algunos motores "1250" no lleva punto).
 *
 * Espacio duro (U+00A0) entre el símbolo y la cifra y antes de `%`; signo menos tipográfico (U+2212).
 */
export const ESPACIO_DURO = String.fromCharCode(0xa0);
export const MENOS = String.fromCharCode(0x2212);

/** Agrupa miles con punto y usa coma decimal: 1234567.5 → '1.234.567,5'. */
export function numero(valor: number, decimales = 0, minDecimales = 0): string {
  if (!Number.isFinite(valor)) return '—';
  const negativo = valor < 0;
  const fijo = Math.abs(valor).toFixed(decimales);
  let [entero = '0', fraccion = ''] = fijo.split('.');
  while (fraccion.length > minDecimales && fraccion.endsWith('0')) fraccion = fraccion.slice(0, -1);
  entero = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cuerpo = fraccion ? `${entero},${fraccion}` : entero;
  const esCero = /^[0.,]+$/.test(cuerpo);
  return negativo && !esCero ? `${MENOS}${cuerpo}` : cuerpo;
}

/** Entero con miles: 1248 → '1.248'. */
export function entero(valor: number): string {
  return numero(Math.round(valor), 0);
}

/**
 * Dinero: COP `$ 1.250.000` (sin decimales); USD `US$ 12.400,50`; CNY `CN¥ 8.200,00`. Negativos `−$ 45.000`.
 * `valor` ya está en la moneda indicada (para convertir desde COP usa lib/moneda.ts o el hook useDinero).
 */
export function dinero(valor: number, moneda: Moneda = 'COP'): string {
  const m = MONEDAS[moneda];
  const v = m.decimales === 0 ? Math.round(valor) : valor;
  const cuerpo = numero(Math.abs(v), m.decimales, m.decimales);
  const signo = v < 0 && cuerpo !== numero(0, m.decimales, m.decimales) ? MENOS : '';
  return `${signo}${m.simbolo}${ESPACIO_DURO}${cuerpo}`;
}

/** Redondeo a 1 decimal (para cifras cortas). */
const r1 = (x: number) => Math.round(x * 10) / 10;

/** Cifra abreviada para ejes y tarjetas (8.9.3): `$ 12,4 M` · `$ 850 mil` · `$ 1,2 mil M`. */
export function cifraCorta(valor: number, moneda: Moneda = 'COP'): string {
  const s = MONEDAS[moneda].simbolo;
  const a = Math.abs(valor);
  const signo = valor < 0 ? MENOS : '';
  const sp = ESPACIO_DURO;
  if (a >= 1e9 || r1(a / 1e6) >= 1000) return `${signo}${s}${sp}${numero(r1(a / 1e9), 1)} mil M`;
  if (a >= 1e6 || Math.round(a / 1e3) >= 1000) return `${signo}${s}${sp}${numero(r1(a / 1e6), 1)} M`;
  if (a >= 1e3)
    return `${signo}${s}${sp}${moneda === 'COP' ? numero(Math.round(a / 1e3), 0) : numero(r1(a / 1e3), 1)} mil`;
  return `${signo}${s}${sp}${numero(Math.round(a), 0)}`;
}

/** Porcentaje (fracción 0,124 → `12,4 %`), máximo 1 decimal por defecto. */
export function porcentaje(fraccion: number, decimales = 1): string {
  return `${numero(fraccion * 100, decimales)}${ESPACIO_DURO}%`;
}

/** Variación con signo explícito: `+12,4 %` · `−3,1 %` · "Sin cambio". */
export function variacion(fraccion: number, decimales = 1): string {
  const t = numero(Math.abs(fraccion) * 100, decimales);
  if (/^[0,]+$/.test(t)) return 'Sin cambio';
  return `${fraccion > 0 ? '+' : MENOS}${t}${ESPACIO_DURO}%`;
}

/** Unidades: `1.248 uds.` · `1 ud.` */
export function unidades(n: number): string {
  return `${entero(n)} ${Math.abs(n) === 1 ? 'ud.' : 'uds.'}`;
}

export const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;
export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;
/** Índice 0 = domingo (convención de `diaSemana`). */
export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;
export const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;
/** Lunes primero (la semana empieza en lunes, 5.9). */
export const DIAS_CORTOS_LUNES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** `30/09/2026` */
export function fecha(f: FechaISO | FechaHoraISO): string {
  return `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`;
}

/** `30 sep` (tablas y ejes). */
export function fechaCorta(f: FechaISO | FechaHoraISO): string {
  return `${Number(f.slice(8, 10))} ${MESES_CORTOS[Number(f.slice(5, 7)) - 1]}`;
}

/** `Martes 30 de septiembre de 2026` (encabezados). */
export function fechaLarga(f: FechaISO | FechaHoraISO): string {
  const d = f.slice(0, 10);
  return `${mayuscula(DIAS[diaSemana(d)])} ${Number(d.slice(8, 10))} de ${MESES[Number(d.slice(5, 7)) - 1]} de ${d.slice(0, 4)}`;
}

/** `septiembre de 2026` */
export function mesAnio(mes: string): string {
  return `${MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;
}

/** `sep` (ejes de meses). */
export function mesCorto(mes: string): string {
  return MESES_CORTOS[Number(mes.slice(5, 7)) - 1] ?? '';
}

/** Hora de 12 h: `3:45 p. m.` (acepta 'HH:mm' o una FechaHoraISO). */
export function hora(valor: string): string {
  const hhmm = valor.length > 8 ? valor.slice(11, 16) : valor.slice(0, 5);
  const h = Number(hhmm.slice(0, 2));
  const m = hhmm.slice(3, 5);
  const sufijo = h < 12 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${sufijo}`;
}

/** `30/09/2026, 3:45 p. m.` */
export function fechaHora(ts: FechaHoraISO): string {
  return `${fecha(ts)}, ${hora(ts)}`;
}

/** Relativa al pasado (notificaciones): `hace 5 min` · `hace 2 h` · `hoy, 3:45 p. m.` · `ayer, 3:45 p. m.` · `30/09/2026`. */
export function relativa(ts: FechaHoraISO, ahora: FechaHoraISO): string {
  const dias = diferenciaDias(ts.slice(0, 10), ahora.slice(0, 10));
  const minutos =
    dias * 1440 +
    (Number(ahora.slice(11, 13)) * 60 + Number(ahora.slice(14, 16))) -
    (Number(ts.slice(11, 13)) * 60 + Number(ts.slice(14, 16)));
  if (minutos < 1 && minutos > -1) return 'ahora';
  if (minutos > 0 && minutos < 60) return `hace ${minutos} min`;
  if (dias === 0 && minutos > 0 && minutos < 6 * 60) return `hace ${Math.floor(minutos / 60)} h`;
  if (dias === 0) return `hoy, ${hora(ts)}`;
  if (dias === 1) return `ayer, ${hora(ts)}`;
  if (dias > 1 && dias < 7) return `${DIAS_CORTOS[diaSemana(ts.slice(0, 10))]}, ${hora(ts)}`;
  return fecha(ts);
}

/**
 * Fecha relativa en días (alertas y próximos eventos, 2.3.3): `hoy` · `mañana` · `ayer` · `en 12 días` ·
 * `en 2 semanas` · `hace 3 días`.
 */
export function relativaDias(f: FechaISO, hoy: FechaISO): string {
  const d = diferenciaDias(hoy, f.slice(0, 10));
  if (d === 0) return 'hoy';
  if (d === 1) return 'mañana';
  if (d === -1) return 'ayer';
  if (d > 1) {
    if (d >= 14 && d % 7 === 0) return `en ${d / 7} semanas`;
    if (d >= 14 && d < 60) return `en ${Math.round(d / 7)} semanas`;
    return `en ${d} días`;
  }
  return `hace ${-d} días`;
}

/** Celular colombiano: `300 123 4567`. */
export function celular(numeroCel: string): string {
  const d = numeroCel.replace(/\D/g, '');
  const n = d.length === 12 && d.startsWith('57') ? d.slice(2) : d;
  if (n.length !== 10) return numeroCel;
  return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
}

/** Cédula con puntos: `1.020.456.789`. */
export function cedula(numeroDoc: string | number): string {
  const d = String(numeroDoc).replace(/\D/g, '');
  return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : String(numeroDoc);
}

/** NIT con puntos, guion y dígito: `901.234.567-8`. */
export function nit(valor: string): string {
  const d = valor.replace(/\D/g, '');
  if (d.length < 2) return valor;
  return `${cedula(d.slice(0, -1))}-${d.slice(-1)}`;
}

/** Consecutivo con ceros: consecutivo('V', 482) → `V-000482`. */
export function consecutivo(prefijo: string, n: number, ancho = 6): string {
  return `${prefijo}-${String(n).padStart(ancho, '0')}`;
}

/** Plural sencillo: plural(3, 'venta') → `3 ventas`. */
export function plural(n: number, singular: string, pluralTexto = `${singular}s`): string {
  return `${entero(n)} ${Math.abs(n) === 1 ? singular : pluralTexto}`;
}

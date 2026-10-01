import type { FechaHoraISO, FechaISO } from '@/dominio/tipos';

/**
 * Reloj de la app (PLAN 5.9). Es el ÚNICO lugar que lee la hora del sistema (regla de ESLint). Todo lo demás
 * recibe `ahora`/`hoy` como parámetro.
 *
 * - `ahoraBogota()` devuelve la hora de Bogotá cuantizada al minuto ('2026-09-30T15:42:00'): los selectores con
 *   fecha no fallan el caché en cada render.
 * - Override de QA y de Miguel: `?hoy=2026-12-19T16:30` fija el reloj en ese instante; `?hoy=2026-12-19` fija la
 *   fecha y deja correr la hora del día. Se guarda en `sessionStorage` (sobrevive a la navegación de la pestaña).
 * - Con override la demo usa claves de almacenamiento aparte (`kc:halden:v1:qa:*`, ver persistencia.ts).
 */

const CLAVE_OVERRIDE = 'kc:hoy';
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

let override: string | null | undefined;

function leerSesion(clave: string): string | null {
  try {
    return globalThis.sessionStorage?.getItem(clave) ?? null;
  } catch {
    return null;
  }
}
function escribirSesion(clave: string, valor: string): void {
  try {
    globalThis.sessionStorage?.setItem(clave, valor);
  } catch {
    // sin sessionStorage: el override vive solo en memoria
  }
}

/** Valida y normaliza un valor de `?hoy=` ('AAAA-MM-DD' o 'AAAA-MM-DDTHH:mm[:ss]'). */
export function normalizarHoy(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const v = valor.trim();
  if (RE_FECHA.test(v)) return v;
  if (RE_FECHA_HORA.test(v)) return v.length === 16 ? `${v}:00` : v;
  return null;
}

/** Override activo (`?hoy=` de la URL o el guardado en la pestaña). */
export function overrideHoy(): string | null {
  if (override !== undefined) return override;
  let desdeUrl: string | null = null;
  try {
    desdeUrl = normalizarHoy(new URLSearchParams(globalThis.location?.search ?? '').get('hoy'));
  } catch {
    desdeUrl = null;
  }
  if (desdeUrl) {
    escribirSesion(CLAVE_OVERRIDE, desdeUrl);
    override = desdeUrl;
  } else {
    override = normalizarHoy(leerSesion(CLAVE_OVERRIDE));
  }
  return override;
}

/** true si la pestaña corre con `?hoy=` (QA o demostración de otra fecha). */
export function esModoQa(): boolean {
  return overrideHoy() !== null;
}

/** Solo pruebas: fija u olvida el override sin tocar la URL. */
export function fijarOverrideParaPruebas(valor: string | null): void {
  override = normalizarHoy(valor);
}

const formato = (() => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return null;
  }
})();

/** Instante real en milisegundos (para IDs y mediciones). */
export function ahoraMs(): number {
  return Date.now();
}

/** Hora real de Bogotá con segundos ('2026-09-30T15:42:10'). Sin Intl: UTC − 5 a mano (Bogotá no tiene horario de verano). */
function bogotaReal(): FechaHoraISO {
  const d = new Date(Date.now());
  if (formato) {
    const p: Record<string, string> = {};
    for (const parte of formato.formatToParts(d)) p[parte.type] = parte.value;
    const hora = p.hour === '24' ? '00' : p.hour;
    return `${p.year}-${p.month}-${p.day}T${hora}:${p.minute}:${p.second}`;
  }
  const b = new Date(d.getTime() - 5 * 3_600_000);
  return b.toISOString().slice(0, 19);
}

/** Hora de Bogotá con segundos, respetando el override (sello de tiempo de los comandos). */
export function ahoraExacto(): FechaHoraISO {
  const o = overrideHoy();
  if (!o) return bogotaReal();
  if (RE_FECHA.test(o)) return `${o}${bogotaReal().slice(10)}`;
  return o;
}

/** Hora de Bogotá cuantizada al minuto ('…T15:42:00'). */
export function ahoraBogota(): FechaHoraISO {
  return `${ahoraExacto().slice(0, 16)}:00`;
}

/** Fecha de hoy en Bogotá. */
export function hoyBogota(): FechaISO {
  return ahoraBogota().slice(0, 10);
}

/** Fecha real (sin override): para el ancla de la persistencia normal. */
export function hoyReal(): FechaISO {
  return bogotaReal().slice(0, 10);
}

/** Milisegundos hasta el próximo cambio de minuto (para refrescar `useAhora`). */
export function msHastaSiguienteMinuto(): number {
  const o = overrideHoy();
  if (o && !RE_FECHA.test(o)) return Number.POSITIVE_INFINITY;
  return 60_000 - (Date.now() % 60_000) + 50;
}

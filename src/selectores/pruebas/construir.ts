import type { EstadoDominio, FechaISO } from '@/dominio/tipos';
import { crearPlan, generarEstado } from '@/generador';
import type { Plan } from '@/generador';

/** Construcción memoizada del estado para las pruebas de selectores y reportes (una por archivo de prueba). */
const cache = new Map<string, EstadoDominio>();

export const HOY = '2026-09-30';
export const AHORA = `${HOY}T15:30:00`;

export function estadoDe(ancla: FechaISO = HOY, ahora = `${ancla}T15:30:00`): EstadoDominio {
  const k = `${ancla}|${ahora}`;
  let e = cache.get(k);
  if (!e) {
    e = generarEstado({ ancla, ahora });
    cache.set(k, e);
  }
  return e;
}

const planes = new Map<string, Plan>();
export function planDe(ancla: FechaISO): Plan {
  let p = planes.get(ancla);
  if (!p) {
    p = crearPlan({ ancla }).plan;
    planes.set(ancla, p);
  }
  return p;
}

import type { COP, FechaISO } from '../tipos';

/** Utilidades de texto puras (PLAN 5.4): slug, búsqueda sin tildes, iniciales, plantillas. */

export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function slug(texto: string): string {
  return normalizar(texto)
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const primera = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
  return `${primera}${ultima}`.toUpperCase();
}

/** ¿Todas las palabras de la consulta aparecen en el texto (sin tildes)? */
export function coincideBusqueda(texto: string, consulta: string): boolean {
  const t = normalizar(texto);
  return normalizar(consulta)
    .split(/\s+/)
    .filter(Boolean)
    .every((p) => t.includes(p));
}

/** Rellena {{clave}} con los datos; deja la clave si no hay dato. */
export function rellenarPlantilla(plantilla: string, datos: Record<string, string | number>): string {
  return plantilla.replace(/\{\{(\w+)\}\}/g, (todo, clave: string) =>
    clave in datos ? String(datos[clave]) : todo,
  );
}

const NBSP = ' ';
const MENOS = '−';

/** Miles con punto (sin depender de Intl, para textos que arma el dominio). */
export function miles(n: number): string {
  const s = String(Math.abs(Math.trunc(n)));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Pesos para textos del dominio (resúmenes de solicitudes, notificaciones): "$ 1.250.000" con espacio duro
 * y "−$ 45.000". Las pantallas usan lib/formato.ts (F2-B).
 */
export function pesos(cop: COP): string {
  return `${cop < 0 ? MENOS : ''}$${NBSP}${miles(cop)}`;
}

/** 'dd/mm/aaaa'. */
export function fechaCorta(fecha: FechaISO): string {
  return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}/${fecha.slice(0, 4)}`;
}

/** Porcentaje entero para textos: "20 %". */
export function porcentajeTexto(fraccion: number): string {
  return `${Math.round(fraccion * 100)}${NBSP}%`;
}

import { porcentaje } from './formato';

/** Lo que devuelve `avanceMeta` de los selectores (estructural: esta capa no importa selectores). */
export interface AvanceMetaTexto {
  modo: 'arranque' | 'ritmo' | 'cierre';
  vsEsperado: number | null;
}

/**
 * Frase del avance de la meta del mes frente a lo esperado a la fecha (misma redacción en Inicio y en /app):
 * "El mes apenas arranca" · "Vas al 92 % de lo esperado a hoy" · "104 % de la meta" (mes cerrado).
 */
export function fraseAvanceMeta(a: AvanceMetaTexto, cumplimiento: number): string {
  if (a.modo === 'arranque') return 'El mes apenas arranca';
  if (a.modo === 'ritmo' && a.vsEsperado !== null) return `Vas al ${porcentaje(a.vsEsperado, 0)} de lo esperado a hoy`;
  return `${porcentaje(cumplimiento, 0)} de la meta`;
}

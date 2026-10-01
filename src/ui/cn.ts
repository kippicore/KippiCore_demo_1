import { clsx, type ClassValue } from 'clsx';

/** Une clases condicionales (clsx). Las clases salen SIEMPRE de los tokens (PLAN 8.0.8). */
export function cn(...valores: ClassValue[]): string {
  return clsx(valores);
}

/** ¿El usuario pidió menos movimiento? (8.10.6: los componentes con JS no animan). */
export function prefiereMenosMovimiento(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

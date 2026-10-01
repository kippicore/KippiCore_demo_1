import type { ErrorDominio } from './tipos';

/**
 * Errores de dominio (PLAN 5.4). Los manejadores lanzan `FalloDominio` solo en su fase `validar`; el motor lo
 * convierte en `{ ok: false, error }`. El mensaje está en español y es para el usuario: qué pasó y cómo
 * arreglarlo, sin culpar (8.11.1).
 */
export class FalloDominio extends Error {
  readonly error: ErrorDominio;
  constructor(error: ErrorDominio) {
    super(error.mensaje);
    this.name = 'FalloDominio';
    this.error = error;
  }
}

export function fallar(codigo: string, mensaje: string, campo?: string): never {
  throw new FalloDominio(campo ? { codigo, mensaje, campo } : { codigo, mensaje });
}

/** Lanza si la condición es falsa. */
export function exigir(
  condicion: unknown,
  codigo: string,
  mensaje: string,
  campo?: string,
): asserts condicion {
  if (!condicion) fallar(codigo, mensaje, campo);
}

export function esFalloDominio(e: unknown): e is FalloDominio {
  return e instanceof FalloDominio;
}

import type { EstadoDominio } from '@/dominio/tipos';
import { hashTexto } from './prng';

/**
 * Huella del estado (PLAN 7.14 determinismo): hash de su serialización JSON. El orden de las claves es el de
 * inserción, que el motor fija (mismo orden de comandos ⇒ mismo orden de claves), así que dos construcciones
 * iguales dan el mismo texto en Node, WebKit y Firefox.
 */
export function hashEstado(estado: EstadoDominio): string {
  return hashTexto(JSON.stringify(estado));
}

/** Dominio puro (PLAN 5.3): tipos, motor, errores y registro de comandos. Las reglas se importan por archivo. */
export * from './tipos';
export * from './motor';
export { FalloDominio, esFalloDominio } from './errores';
export { REGISTRO, TIPOS_COMANDO } from './comandos/registro';
export type { Contexto, Manejador } from './comandos/tx';

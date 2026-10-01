/** API pública del generador (PLAN 5.4, 7). La capa `estado` (F2-B) lo usa desde el worker. */
export {
  construirEstado,
  crearFuente,
  crearPlan,
  diasDeVentana,
  generarEstado,
  type EntradaGenerador,
  type Medidor,
} from './fuente';
export { Plan } from './plan';
export { hashTexto } from './prng';
export { hashEstado } from './hash';

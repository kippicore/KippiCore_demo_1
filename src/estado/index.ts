/** API pública de la capa de estado (PLAN 5.7). Detalle y ejemplos en docs/CONTRATOS.md. */
export { useDatos, almacenDatos, estadoActual, datosAdoptados, type EstadoDatos, type FaseDatos } from './datos';
export { useSesion, almacenSesion, type EstadoSesion, type Tema } from './sesion';
export { useGuia, almacenGuia, type EstadoGuia } from './guia';
export {
  useAcciones,
  crearAcciones,
  ejecutarComando,
  nuevoId,
  NOMBRES_ACCIONES,
  type Acciones,
  type EntradaAccion,
} from './acciones';
export {
  useSel,
  useAhora,
  useHoy,
  useEstadoDominio,
  useRolActivo,
  useUsuarioActivo,
  useFiltroLocal,
  usePuede,
  useMoneda,
  useDinero,
  useMarca,
  useEvento,
  useEventoUI,
  useEntradaRemota,
  emitirUI,
  ContextoRolForzado,
  type FormateadorDinero,
  type MarcaActiva,
  type MonedaActiva,
  type UsuarioActivo,
} from './hooks';
export { ahoraBogota, hoyBogota, esModoQa, overrideHoy } from './reloj';
export { codificarQr, decodificarQr, urlAppConAcciones, type ResultadoQr } from './qr';
export type { EntradaRemota, EventoDominioConContexto, EventoUIEmitido } from './eventos';

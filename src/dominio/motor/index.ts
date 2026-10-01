/** API pública del motor de dominio (PLAN 5.4). */
export { estadoInicial, type EntradaEstadoInicial } from './estado-inicial';
export { aplicarConstruccion, aplicarConEventos, type Modo, type ResultadoConstruccion } from './aplicar';
export { aplicarEnVivo, configurarCongelado } from './vivo';
export {
  construir,
  construirSincrono,
  compararEntradas,
  fusionarRegistros,
  marcaAguaNueva,
  ordenarRegistro,
  type EntradaConstruccion,
  type FuenteGenerada,
  type Intencion,
  type Progreso,
} from './construir';
export { idGenerado, idHijo, idUsuario, PREFIJOS } from './ids';

import type { EstadoDominio, ResultadoComando, SobreComando } from '../tipos';
import { aplicarConstruccion } from './aplicar';
import { aplicarEnVivo } from './vivo';

/** aplicarComando(estado, sobre, modo) (5.4): construcción muta y no emite eventos; vivo usa Immer. */
export function aplicarComando(
  estado: EstadoDominio,
  sobre: SobreComando,
  modo: 'construccion' | 'vivo',
): ResultadoComando | ReturnType<typeof aplicarConstruccion> {
  return modo === 'vivo' ? aplicarEnVivo(estado, sobre) : aplicarConstruccion(estado, sobre);
}

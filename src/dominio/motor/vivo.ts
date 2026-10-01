import { produce, setAutoFreeze } from 'immer';
import type { EstadoDominio, EventoDominio, ResultadoComando, SobreComando } from '../tipos';
import { esFalloDominio } from '../errores';
import { crearContexto } from '../comandos/tx';
import { validarSobre } from './aplicar';

/**
 * Ruta en vivo (PLAN 5.6.6, D11): valida sobre el estado actual y escribe con Immer, de modo que solo las
 * tablas tocadas cambian de referencia. Devuelve `antes` y `despues` para el panel "Lo que acaba de pasar".
 */
export function aplicarEnVivo(estado: EstadoDominio, sobre: SobreComando): ResultadoComando {
  const eventos: EventoDominio[] = [];
  const ctx = crearContexto(sobre, (e) => eventos.push(e));
  let validado: ReturnType<typeof validarSobre>;
  try {
    validado = validarSobre(estado, sobre, ctx);
  } catch (e) {
    if (esFalloDominio(e)) return { ok: false, error: e.error };
    throw e;
  }
  const despues = produce(estado, (borrador) => {
    validado.manejador.escribir(borrador as EstadoDominio, validado.plan as never, ctx);
  });
  return { ok: true, eventos, antes: estado, despues };
}

/** En producción se desactiva la congelación profunda (5.6.6); en desarrollo queda activa. */
export function configurarCongelado(activo: boolean): void {
  setAutoFreeze(activo);
}

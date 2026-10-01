import type { ErrorDominio, EstadoDominio, EventoDominio, SobreComando, TipoComando } from '../tipos';
import { puede } from '@/config/permisos';
import { esFalloDominio, fallar } from '../errores';
import { REGISTRO } from '../comandos/registro';
import { type Contexto, crearContexto, type ManejadorGenerico } from '../comandos/tx';

/**
 * Aplicar un comando (PLAN 5.6.4, 5.6.6). Modo construcción: mutación directa, sin eventos (el generador y la
 * reconstrucción). Modo vivo: Immer (motor/vivo.ts). Las dos rutas usan el mismo manejador (D1, D11).
 */
export type Modo = 'construccion' | 'vivo';
export type ResultadoConstruccion = { ok: true } | { ok: false; error: ErrorDominio };

export function manejadorDe(tipo: TipoComando): ManejadorGenerico<TipoComando> {
  const m = (REGISTRO as Record<string, ManejadorGenerico<TipoComando> | undefined>)[tipo];
  if (!m) fallar('COMANDO_DESCONOCIDO', 'Esa acción no existe en esta versión de la demo.');
  return m;
}

/** Permiso del actor (config/permisos.ts) y validación del manejador: fase sin efectos. */
export function validarSobre(
  estado: EstadoDominio,
  sobre: SobreComando,
  ctx: Contexto,
): { manejador: ManejadorGenerico<TipoComando>; plan: unknown } {
  const manejador = manejadorDe(sobre.comando.tipo);
  if (!puede(sobre.rol, sobre.comando.tipo)) {
    fallar('SIN_PERMISO', 'Tu rol no puede hacer esto. Pídeselo al dueño.');
  }
  const plan = manejador.validar(estado, sobre.comando.datos as never, ctx);
  return { manejador, plan };
}

/** Modo construcción: valida y escribe sobre el mismo objeto. Un comando inválido no toca el estado. */
export function aplicarConstruccion(estado: EstadoDominio, sobre: SobreComando): ResultadoConstruccion {
  const ctx = crearContexto(sobre, null);
  let validado: ReturnType<typeof validarSobre>;
  try {
    validado = validarSobre(estado, sobre, ctx);
  } catch (e) {
    if (esFalloDominio(e)) return { ok: false, error: e.error };
    throw e;
  }
  validado.manejador.escribir(estado, validado.plan as never, ctx);
  return { ok: true };
}

/** Igual que `aplicarConstruccion`, pero recogiendo los eventos (pruebas y depuración sin Immer). */
export function aplicarConEventos(
  estado: EstadoDominio,
  sobre: SobreComando,
): ResultadoConstruccion & { eventos: EventoDominio[] } {
  const eventos: EventoDominio[] = [];
  const ctx = crearContexto(sobre, (e) => eventos.push(e));
  try {
    const { manejador, plan } = validarSobre(estado, sobre, ctx);
    manejador.escribir(estado, plan as never, ctx);
    return { ok: true, eventos };
  } catch (e) {
    if (esFalloDominio(e)) return { ok: false, error: e.error, eventos: [] };
    throw e;
  }
}

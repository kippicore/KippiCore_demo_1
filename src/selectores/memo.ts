import type { EstadoDominio } from '@/dominio/tipos';

/**
 * Memoización de selectores (PLAN 5.7, 6.23, T13).
 *
 * `crearSelector(nombre, tablas, fn)` cachea por la REFERENCIA de cada tabla del estado que el selector lee
 * (una cadena de `WeakMap`, así evaluar `antes` y `despues` en el panel de W1 no vacía el caché del otro estado)
 * y por la CLAVE SERIALIZADA de los parámetros (objetos nuevos en cada render no invalidan el caché).
 *
 * Regla: `tablas` debe incluir TODAS las claves del estado que `fn` lee, también a través de otros selectores.
 * Con Immer solo cambian de referencia las tablas tocadas por un comando, así los demás selectores no se
 * recalculan tras una venta.
 */
export type ClaveEstado = keyof EstadoDominio;

export interface Selector<P, R> {
  (estado: EstadoDominio, params: P): R;
  readonly nombre: string;
  readonly tablas: readonly ClaveEstado[];
  /** Solo pruebas: cuántas veces se ejecutó `fn`. */
  readonly ejecuciones: () => number;
}

/** Parámetros de un selector. */
export type ParamsDe<S> = S extends Selector<infer P, unknown> ? P : never;
export type ResultadoDe<S> = S extends Selector<never, infer R> ? R : never;

const MAX_CLAVES = 24;

/** Serialización estable (claves ordenadas, sin `undefined`). */
export function claveParams(p: unknown): string {
  if (p === undefined) return '';
  if (p === null || typeof p !== 'object') return JSON.stringify(p);
  if (Array.isArray(p)) return `[${p.map(claveParams).join(',')}]`;
  const o = p as Record<string, unknown>;
  const ks = Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort();
  return `{${ks.map((k) => `${JSON.stringify(k)}:${claveParams(o[k])}`).join(',')}}`;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- tipo recursivo de la cadena de WeakMap
interface Nivel extends WeakMap<object, Nivel | Map<string, unknown>> {}

export function crearSelector<P = void, R = unknown>(
  nombre: string,
  tablas: readonly ClaveEstado[],
  fn: (estado: EstadoDominio, params: P) => R,
): Selector<P, R> {
  const raiz: Nivel = new WeakMap();
  let n = 0;
  const sel = (estado: EstadoDominio, params: P): R => {
    let nivel: Nivel = raiz;
    let hoja: Map<string, unknown> | undefined;
    for (let i = 0; i < tablas.length; i++) {
      const ref = estado[tablas[i] as ClaveEstado] as unknown as object;
      let sig = nivel.get(ref);
      if (i === tablas.length - 1) {
        if (!sig) {
          sig = new Map<string, unknown>();
          nivel.set(ref, sig);
        }
        hoja = sig as Map<string, unknown>;
      } else {
        if (!sig) {
          sig = new WeakMap() as Nivel;
          nivel.set(ref, sig);
        }
        nivel = sig as Nivel;
      }
    }
    if (!hoja) {
      // Selector sin tablas (no debería existir): sin caché.
      n++;
      return fn(estado, params);
    }
    const k = claveParams(params);
    if (hoja.has(k)) {
      const v = hoja.get(k) as R;
      // Renovar como reciente.
      hoja.delete(k);
      hoja.set(k, v);
      return v;
    }
    n++;
    const v = fn(estado, params);
    hoja.set(k, v);
    if (hoja.size > MAX_CLAVES) {
      const primera = hoja.keys().next().value;
      if (primera !== undefined) hoja.delete(primera);
    }
    return v;
  };
  return Object.assign(sel, { nombre, tablas, ejecuciones: () => n }) as Selector<P, R>;
}

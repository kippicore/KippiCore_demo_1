/**
 * Adaptador de almacenamiento con respaldo en memoria (PLAN 5.6.5, 5.6.7). Los tres stores (`datos`, `sesion`,
 * `guia`) lo usan. Si `localStorage` no está disponible (Safari con bloqueo total, iframes de terceros) o se
 * llena, todo sigue funcionando en memoria: "Tus cambios se conservan mientras esta pestaña esté abierta."
 */
import { DEMO } from '@/config/demo';
import { esModoQa } from './reloj';

export type ModoAlmacen = 'local' | 'memoria';

const memoria = new Map<string, string>();
let modo: ModoAlmacen | null = null;
let motivoMemoria: 'no_disponible' | 'cuota' | null = null;

/** Prefijo de las claves: `kc:halden:v1:` o, con `?hoy=`, `kc:halden:v1:qa:` (5.9). */
export function prefijo(): string {
  return `kc:${DEMO.claveAlmacenamiento}:v1:${esModoQa() ? 'qa:' : ''}`;
}

export function clave(nombre: 'ancla' | 'registro' | 'sesion' | 'guia' | 'sesion-moneda'): string {
  return `${prefijo()}${nombre}`;
}

/** Prueba setItem/removeItem de una clave de prueba (5.6.7). */
export function disponible(): boolean {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return false;
    const k = `${prefijo()}__prueba`;
    ls.setItem(k, '1');
    ls.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function modoAlmacen(): ModoAlmacen {
  if (modo === null) {
    modo = disponible() ? 'local' : 'memoria';
    if (modo === 'memoria') motivoMemoria = 'no_disponible';
  }
  return modo;
}

export function motivoModoMemoria(): typeof motivoMemoria {
  modoAlmacen();
  return motivoMemoria;
}

export function leer(k: string): string | null {
  if (modoAlmacen() === 'memoria') return memoria.get(k) ?? null;
  try {
    return globalThis.localStorage.getItem(k);
  } catch {
    return memoria.get(k) ?? null;
  }
}

/** Escribe; si la cuota se agota, pasa a modo memoria (con aviso en Configuración › Datos). */
export function escribir(k: string, valor: string): void {
  memoria.set(k, valor);
  if (modoAlmacen() === 'memoria') return;
  try {
    globalThis.localStorage.setItem(k, valor);
  } catch {
    // Cuota llena o bloqueo posterior: seguimos en memoria con lo que ya había más lo nuevo.
    modo = 'memoria';
    motivoMemoria = 'cuota';
  }
}

export function borrar(k: string): void {
  memoria.delete(k);
  if (modoAlmacen() === 'memoria') return;
  try {
    globalThis.localStorage.removeItem(k);
  } catch {
    // nada
  }
}

export function leerJson<T>(k: string): T | null {
  const t = leer(k);
  if (!t) return null;
  try {
    return JSON.parse(t) as T;
  } catch {
    return null;
  }
}

export function escribirJson(k: string, valor: unknown): void {
  escribir(k, JSON.stringify(valor));
}

/** sessionStorage con respaldo en memoria (moneda de visualización, 5.6.5). */
export function leerSesion(k: string): string | null {
  try {
    return globalThis.sessionStorage?.getItem(k) ?? memoria.get(`s:${k}`) ?? null;
  } catch {
    return memoria.get(`s:${k}`) ?? null;
  }
}
export function escribirSesion(k: string, valor: string): void {
  memoria.set(`s:${k}`, valor);
  try {
    globalThis.sessionStorage?.setItem(k, valor);
  } catch {
    // memoria
  }
}

/** Solo pruebas: reinicia el adaptador. */
export function reiniciarAlmacenParaPruebas(): void {
  memoria.clear();
  modo = null;
  motivoMemoria = null;
}

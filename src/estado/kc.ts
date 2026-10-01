import type { EstadoDominio } from '@/dominio/tipos';
import { hashEstado } from '@/generador';
import * as selectores from '@/selectores';
import { crearAcciones } from './acciones';
import { almacenDatos } from './datos';
import { almacenGuia } from './guia';
import { almacenSesion } from './sesion';
import { ahoraBogota, hoyBogota, overrideHoy } from './reloj';
import { codificarQr, urlAppConAcciones } from './qr';

/**
 * `window.__kc` (PLAN 5.16, 9.2): puerta de pruebas y depuración. Se instala en desarrollo, con `?hoy=` (QA y
 * Playwright) o con `?kc`. Los e2e de los paquetes verifican los efectos en otros módulos por aquí.
 *
 *   __kc.estado()                       estado de dominio actual
 *   __kc.sel('selVentas', { desde })    ejecuta un selector por nombre
 *   __kc.selectores                     todos los selectores
 *   __kc.acciones.registrarVenta({...}) acciones del dueño (o __kc.accionesDe('vendedor'))
 *   __kc.hashEstado()                   huella del estado (e2e de determinismo)
 *   __kc.listo()                        promesa que se resuelve con el estado construido
 *   __kc.urlQr()                        URL de /app con las últimas acciones en el hash (la del QR)
 */
export interface Kc {
  estado: () => EstadoDominio | null;
  datos: typeof almacenDatos;
  sesion: typeof almacenSesion;
  guia: typeof almacenGuia;
  selectores: typeof selectores;
  sel: (nombre: string, params?: unknown) => unknown;
  acciones: ReturnType<typeof crearAcciones>;
  accionesDe: (actor: Parameters<typeof crearAcciones>[0]) => ReturnType<typeof crearAcciones>;
  hashEstado: () => string;
  listo: () => Promise<EstadoDominio>;
  ahora: () => string;
  hoy: () => string;
  urlQr: () => Promise<string>;
}

export function instalarKc(): Kc {
  const listo = () =>
    new Promise<EstadoDominio>((resolver) => {
      const e = almacenDatos.getState().estado;
      if (e && !almacenDatos.getState().reconstruyendo) return resolver(e);
      const quitar = almacenDatos.subscribe((s) => {
        if (s.estado && !s.reconstruyendo) {
          quitar();
          resolver(s.estado);
        }
      });
    });
  const kc: Kc = {
    estado: () => almacenDatos.getState().estado,
    datos: almacenDatos,
    sesion: almacenSesion,
    guia: almacenGuia,
    selectores,
    sel: (nombre, params) => {
      const s = (selectores as unknown as Record<string, (e: EstadoDominio, p: unknown) => unknown>)[nombre];
      const e = almacenDatos.getState().estado;
      if (!s) throw new Error(`No existe el selector ${nombre}`);
      if (!e) throw new Error('Los datos aún no están listos');
      return s(e, params);
    },
    acciones: crearAcciones('dueno'),
    accionesDe: (actor) => crearAcciones(actor),
    hashEstado: () => {
      const e = almacenDatos.getState().estado;
      if (!e) throw new Error('Los datos aún no están listos');
      return hashEstado(e);
    },
    listo,
    ahora: ahoraBogota,
    hoy: hoyBogota,
    urlQr: async () => {
      const { ancla, registro } = almacenDatos.getState();
      return urlAppConAcciones(location.origin, await codificarQr(ancla, registro), overrideHoy());
    },
  };
  (globalThis as unknown as { __kc: Kc }).__kc = kc;
  return kc;
}

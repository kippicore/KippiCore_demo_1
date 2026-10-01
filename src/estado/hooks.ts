import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type {
  COP,
  Empleado,
  EstadoDominio,
  FechaHoraISO,
  FechaISO,
  Id,
  Moneda,
  Rol,
  TipoEventoDominio,
  UsuarioDemo,
} from '@/dominio/tipos';
import { type Permiso, puede } from '@/config/permisos';
import { EMPRESA, MARCA } from '@/config/marca';
import type { Selector } from '@/selectores/memo';
import { selTasaVigente, selUsuario } from '@/selectores/base';
import { cifraCorta, dinero } from '@/lib/formato';
import { convertirParaMostrar } from '@/lib/moneda';
import { almacenDatos } from './datos';
import { useSesion } from './sesion';
import {
  type EntradaRemota,
  type EventoDominioConContexto,
  type EventoUIEmitido,
  suscribirDominio,
  suscribirRemotas,
  suscribirUI,
} from './eventos';
import { ahoraBogota, msHastaSiguienteMinuto } from './reloj';

/**
 * Hooks de lectura (PLAN 5.7, 5.8). Las ÚNICAS puertas de lectura para los paquetes, junto con `useAcciones`.
 */

/** Estado de dominio (solo para ui/conectados y estado/**). Lanza si aún no hay datos: las rutas lo garantizan. */
export function useEstadoDominio(): EstadoDominio {
  const e = useSyncExternalStore(almacenDatos.subscribe, () => almacenDatos.getState().estado);
  if (!e) throw new Error('useEstadoDominio: los datos aún no están listos (envuelve la ruta en <RequiereDatos>).');
  return e;
}

/**
 * Lee un selector memoizado con instantáneas estables (5.7): dos lecturas seguidas con los mismos parámetros
 * devuelven la MISMA referencia (memo por referencia de tablas + clave serializada de parámetros).
 */
export function useSel<R>(selector: Selector<void, R>): R;
export function useSel<P, R>(selector: Selector<P, R>, params: P): R;
export function useSel<P, R>(selector: Selector<P, R>, params?: P): R {
  const ref = useRef(params);
  ref.current = params;
  const leer = useCallback(() => {
    const e = almacenDatos.getState().estado;
    if (!e) throw new Error(`useSel(${selector.nombre}): los datos aún no están listos.`);
    return selector(e, ref.current as P);
  }, [selector]);
  // El resultado depende de los parámetros: se recalcula (memoizado) en cada render.
  const valor = useSyncExternalStore(almacenDatos.subscribe, leer);
  return valor;
}

/** Instante actual de Bogotá cuantizado al minuto; se refresca solo cada minuto (o nunca con ?hoy= fijo). */
export function useAhora(): FechaHoraISO {
  const [ahora, setAhora] = useState(ahoraBogota);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const programar = () => {
      const ms = msHastaSiguienteMinuto();
      if (!Number.isFinite(ms)) return;
      t = setTimeout(() => {
        setAhora(ahoraBogota());
        programar();
      }, ms);
    };
    programar();
    return () => clearTimeout(t);
  }, []);
  return ahora;
}

export function useHoy(): FechaISO {
  return useAhora().slice(0, 10);
}

/** Rol forzado por un layout: /app es SIEMPRE del dueño, sin importar el rol del escritorio (5.8). */
export const ContextoRolForzado = createContext<Rol | null>(null);

export function useRolActivo(): Rol {
  const forzado = useContext(ContextoRolForzado);
  const rol = useSesion((s) => s.rol);
  return forzado ?? rol;
}

export interface UsuarioActivo {
  rol: Rol;
  usuario: UsuarioDemo | null;
  /** Persona del rol (vendedor y bodega son empleados; el dueño no). */
  empleado: Empleado | null;
  /** Local fijo del vendedor y de la bodega. */
  localFijoId: Id | null;
}

export function useUsuarioActivo(): UsuarioActivo {
  const rol = useRolActivo();
  const usuario = useSel(selUsuario, { rol });
  const e = useEstadoDominio();
  const empleado = usuario?.empleadoId ? (e.empleados[usuario.empleadoId] ?? null) : null;
  return useMemo(
    () => ({ rol, usuario, empleado, localFijoId: usuario?.localFijoId ?? null }),
    [rol, usuario, empleado],
  );
}

/** Local activo para los selectores: el vendedor siempre ve su local (selector bloqueado), 5.8. */
export function useFiltroLocal(): Id | 'todos' {
  const rol = useRolActivo();
  const local = useSesion((s) => s.localId);
  const usuario = useSel(selUsuario, { rol });
  if (rol === 'vendedor') return usuario?.localFijoId ?? local;
  return local;
}

/** ¿Puede el rol activo hacer esto? `puede('venta.anular')`, `puede('ver.costos')`. */
export function usePuede(): (permiso: Permiso) => boolean {
  const rol = useRolActivo();
  return useCallback((permiso: Permiso) => puede(rol, permiso), [rol]);
}

export interface MonedaActiva {
  moneda: Moneda;
  /** COP por unidad de la moneda activa (1 para COP), con la tasa VIGENTE hoy (6.20.11). */
  tasa: number;
  cambiar: (m: Moneda) => void;
}

export function useMoneda(): MonedaActiva {
  const moneda = useSesion((s) => s.moneda);
  const cambiar = useSesion((s) => s.cambiarMoneda);
  const hoy = useHoy();
  const tasa = useSel(selTasaVigente, { moneda, fecha: hoy });
  return { moneda, tasa, cambiar };
}

export interface FormateadorDinero {
  /** Cifra completa en la moneda activa desde COP: `$ 1.250.000` · `US$ 316,46`. */
  (cop: COP): string;
  corta: (cop: COP) => string;
  /** Valor numérico convertido (gráficos). */
  convertir: (cop: COP) => number;
  moneda: Moneda;
}

/** Formateador de dinero en la moneda activa (nunca formatear a mano). */
export function useDinero(): FormateadorDinero {
  const { moneda, tasa } = useMoneda();
  return useMemo(() => {
    const convertir = (cop: COP) => convertirParaMostrar(cop, moneda, moneda === 'COP' ? null : tasa);
    const f = ((cop: COP) => dinero(convertir(cop), moneda)) as FormateadorDinero;
    f.corta = (cop: COP) => cifraCorta(convertir(cop), moneda);
    f.convertir = convertir;
    f.moneda = moneda;
    return f;
  }, [moneda, tasa]);
}

export interface MarcaActiva {
  /** Nombre del negocio activo: el personalizado o HALDEN. */
  nombre: string;
  /** Nombre de la persona si lo escribió (saludo); nunca el del dueño ficticio. */
  persona: string | null;
  /** true si es la marca de ejemplo (muestra "HALDEN es una marca de ejemplo."). */
  esEjemplo: boolean;
  descriptor: string;
  avisoEjemplo: string;
}

export function useMarca(): MarcaActiva {
  const m = useSesion((s) => s.marcaPersonalizada);
  const empresa = useSyncExternalStore(almacenDatos.subscribe, () => almacenDatos.getState().estado?.empresa ?? null);
  return useMemo(() => {
    const base = empresa?.nombre ?? EMPRESA.nombre;
    const nombre = m.nombreNegocio?.trim() || base;
    return {
      nombre,
      persona: m.nombrePersona?.trim() || null,
      esEjemplo: !m.nombreNegocio?.trim(),
      descriptor: empresa?.descriptor ?? EMPRESA.descriptor,
      avisoEjemplo: MARCA.avisoEjemplo,
    };
  }, [m, empresa]);
}

/** Suscripción a un evento de dominio (con su contexto: origen, usuario y rol). */
export function useEvento<T extends TipoEventoDominio>(
  tipo: T | '*',
  oyente: (e: EventoDominioConContexto<T>) => void,
): void {
  const ref = useRef(oyente);
  ref.current = oyente;
  useEffect(() => suscribirDominio(tipo, (e) => ref.current(e)), [tipo]);
}

/** Suscripción a los eventos de interfaz (la guía, E2). */
export function useEventoUI(oyente: (e: EventoUIEmitido) => void): void {
  const ref = useRef(oyente);
  ref.current = oyente;
  useEffect(() => suscribirUI((e) => ref.current(e)), []);
}

/** Entradas que llegan de otra pestaña (toast remoto de W3, escuchador de F2-C). */
export function useEntradaRemota(oyente: (r: EntradaRemota) => void): void {
  const ref = useRef(oyente);
  ref.current = oyente;
  useEffect(() => suscribirRemotas((r) => ref.current(r)), []);
}

export { emitirUI } from './eventos';

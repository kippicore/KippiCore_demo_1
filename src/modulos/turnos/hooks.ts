import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import type { FechaISO, Id } from '@/dominio/tipos';
import { useFiltroLocal, useHoy, useSel } from '@/estado';
import { selLocales } from '@/selectores';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { lunesDeParametro } from './calculos';

export interface FiltrosTurnos {
  hoy: FechaISO;
  /** Lunes de la semana vista: `?semana=` (cualquier día de esa semana) o la semana de hoy. */
  lunes: FechaISO;
  /** Un local (nunca 'todos': la cuadrícula es de un local). `?local=` manda; si no, el filtro global; si no, el primero. */
  local: Id;
  localDeLaUrl: boolean;
  cambiar: (cambios: { semana?: FechaISO; local?: Id | null }) => void;
}

/** `?semana=&local=` de Turnos (CONTRATOS 10): se leen con `useParamsRuta` y se escriben con `rutas.turnos`. */
export function useFiltrosTurnos(): FiltrosTurnos {
  const params = useParamsRuta('turnos') as { semana: string | null; local: string | null };
  const global = useFiltroLocal();
  const hoy = useHoy();
  const navegar = useNavigate();
  const locales = useSel(selLocales, { incluirBodega: true });
  const ids = useMemo(() => new Set<string>(locales.map((l) => l.id)), [locales]);
  const lunes = lunesDeParametro(params.semana, hoy);
  const localDeLaUrl = !!params.local && ids.has(params.local);
  const local = localDeLaUrl ? (params.local as string) : global !== 'todos' && ids.has(global) ? global : (locales[0]?.id ?? 'usq');
  const cambiar = useCallback(
    (c: { semana?: FechaISO; local?: Id | null }) => {
      const nuevoLocal = c.local === undefined ? (localDeLaUrl ? local : null) : c.local;
      navegar(rutas.turnos({ semana: c.semana ?? lunes, local: nuevoLocal }), { replace: true });
    },
    [local, localDeLaUrl, lunes, navegar],
  );
  return { hoy, lunes, local, localDeLaUrl, cambiar };
}

export interface FiltrosAsistencia {
  hoy: FechaISO;
  desde: FechaISO;
  hasta: FechaISO;
  /** 'todos' o un local (`?local=` manda; si no, el filtro global). */
  local: Id | 'todos';
  empleado: Id | null;
  cambiar: (cambios: { desde?: FechaISO; hasta?: FechaISO; local?: Id | 'todos' | null; empleado?: Id | null }) => void;
  /** Quita local, persona y fechas de la URL (vuelve al mes en curso). */
  limpiar: () => void;
}

/** `?local=&empleado=&desde=&hasta=` de Asistencia; sin fechas, del 1.º del mes a hoy. */
export function useFiltrosAsistencia(): FiltrosAsistencia {
  const params = useParamsRuta('asistencia') as { local: string | null; empleado: string | null; desde: string | null; hasta: string | null };
  const global = useFiltroLocal();
  const hoy = useHoy();
  const navegar = useNavigate();
  const locales = useSel(selLocales, { incluirBodega: true });
  const ids = useMemo(() => new Set<string>(locales.map((l) => l.id)), [locales]);
  const desdeBase = params.desde ?? `${hoy.slice(0, 7)}-01`;
  const hastaBase = params.hasta ?? hoy;
  // Un rango al revés se endereza (el enlace de una alerta o un filtro a mano no deben dejar la tabla vacía).
  const desde = desdeBase <= hastaBase ? desdeBase : hastaBase;
  const hasta = desdeBase <= hastaBase ? hastaBase : desdeBase;
  const local = (params.local && (params.local === 'todos' || ids.has(params.local)) ? params.local : global) as Id | 'todos';
  const empleado = params.empleado;
  const cambiar = useCallback(
    (c: { desde?: FechaISO; hasta?: FechaISO; local?: Id | 'todos' | null; empleado?: Id | null }) => {
      navegar(
        rutas.asistencia({
          desde: c.desde ?? desde,
          hasta: c.hasta ?? hasta,
          local: c.local === undefined ? local : c.local,
          empleado: c.empleado === undefined ? empleado : c.empleado,
        }),
        { replace: true },
      );
    },
    [desde, hasta, local, empleado, navegar],
  );
  const limpiar = useCallback(() => navegar(rutas.asistencia(), { replace: true }), [navegar]);
  return { hoy, desde, hasta, local, empleado, cambiar, limpiar };
}

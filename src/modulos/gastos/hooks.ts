import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import type { FechaISO, Id, MesISO } from '@/dominio/tipos';
import { useFiltroLocal, useHoy, useSel } from '@/estado';
import { selLocales } from '@/selectores';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { mesEfectivo } from './calculos';
import { GENERAL } from './textos';

type RutaConFiltros = 'gastos' | 'estadoResultados' | 'puntoEquilibrio';

export interface FiltrosMesLocal {
  hoy: FechaISO;
  /** Mes visto: `?mes=` si es válido y no futuro; si no, el mes en curso. */
  mes: MesISO;
  /** 'todos', el id de un local o (solo en Gastos) 'general'. `?local=` manda; si no viene, el filtro global. */
  local: Id | 'todos' | typeof GENERAL;
  /** ¿El local viene de la URL (el usuario lo eligió en la pantalla) o del filtro global de la barra superior? */
  localDeLaUrl: boolean;
  resaltar: string | null;
  cambiar: (cambios: { mes?: MesISO; local?: string | null; resaltar?: string | null }) => void;
}

/**
 * `?mes=` y `?local=` de las pantallas de B4 (CONTRATOS 10): se leen de la URL con `useParamsRuta` y se escriben con
 * `rutas.<nombre>` para que el enlace siempre reproduzca lo que ve el usuario. El local válido es uno que vende
 * (o 'todos'; y 'general' donde se permite).
 */
export function useFiltrosMesLocal(ruta: RutaConFiltros): FiltrosMesLocal {
  const params = useParamsRuta(ruta) as { mes: string | null; local: string | null; resaltar?: string | null };
  const global = useFiltroLocal();
  const hoy = useHoy();
  const navegar = useNavigate();
  // En Gastos también se filtra por la bodega (tiene nómina propia); en Resultados y Equilibrio, solo los que venden.
  const locales = useSel(selLocales, { incluirBodega: ruta === 'gastos' });
  const mes = mesEfectivo(params.mes, hoy);
  const ids = useMemo(() => new Set<string>(locales.map((l) => l.id)), [locales]);
  const valido = (l: string | null): l is string => !!l && (l === 'todos' || ids.has(l) || (ruta === 'gastos' && l === GENERAL));
  const localDeLaUrl = valido(params.local);
  const local = (localDeLaUrl ? params.local : global) as string;
  const resaltar = ruta === 'gastos' ? (params.resaltar ?? null) : null;

  const cambiar = useCallback(
    (c: { mes?: MesISO; local?: string | null; resaltar?: string | null }) => {
      const nuevoMes = c.mes ?? mes;
      const nuevoLocal = c.local === undefined ? (localDeLaUrl ? local : null) : c.local;
      if (ruta === 'gastos') navegar(rutas.gastos({ mes: nuevoMes, local: nuevoLocal, resaltar: c.resaltar ?? null }), { replace: true });
      else if (ruta === 'estadoResultados') navegar(rutas.estadoResultados({ mes: nuevoMes, local: nuevoLocal }), { replace: true });
      else navegar(rutas.puntoEquilibrio({ mes: nuevoMes, local: nuevoLocal }), { replace: true });
    },
    [local, localDeLaUrl, mes, navegar, ruta],
  );
  // En Resultados y Equilibrio 'general' no existe: se trata como todo el negocio.
  const efectivo = ruta !== 'gastos' && local === GENERAL ? 'todos' : local;
  return { hoy, mes, local: efectivo, localDeLaUrl, resaltar, cambiar };
}

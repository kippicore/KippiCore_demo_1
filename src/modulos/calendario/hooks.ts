import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import type { FechaISO } from '@/dominio/tipos';
import { deDiaN, diaN } from '@/lib/fechas';
import { useHoy, useSel } from '@/estado';
import { vistaValida } from './calculos';
import { selUbicarEvento } from './selectores';
import type { Vista } from './tipos';

const fechaReal = (f: string): boolean => deDiaN(diaN(f)) === f;

export interface UrlCalendario {
  hoy: FechaISO;
  vista: Vista;
  /** Día de referencia de la vista: `?fecha=` si es válida; si no, donde cae el `?resaltar=`; si no, hoy. */
  fecha: FechaISO;
  /** Id de la agenda del evento resaltado (`ev:…`, `imp:…`), si `?resaltar=` apunta a algo que existe. */
  resaltarId: string | null;
  /** `?resaltar=` venía pero no existe (se avisa una vez). */
  resaltarPerdido: boolean;
  ir: (cambios: { vista?: Vista; fecha?: FechaISO; resaltar?: string | null }) => void;
}

/**
 * `?vista=mes|semana|dia&fecha=&resaltar=` (CONTRATOS 10): se leen con `useParamsRuta` y se escriben con
 * `rutas.calendario` para que el enlace siempre reproduzca lo que se ve.
 */
export function useUrlCalendario(): UrlCalendario {
  const p = useParamsRuta('calendario');
  const hoy = useHoy();
  const navegar = useNavigate();
  const ubicado = useSel(selUbicarEvento, { clave: p.resaltar ?? '' });
  const vista = vistaValida(p.vista);
  const fechaUrl = p.fecha && fechaReal(p.fecha) ? p.fecha : null;
  const fecha = fechaUrl ?? ubicado?.fecha ?? hoy;
  const ir = useCallback(
    (c: { vista?: Vista; fecha?: FechaISO; resaltar?: string | null }) => {
      navegar(rutas.calendario({ vista: c.vista ?? vista, fecha: c.fecha ?? fecha, resaltar: c.resaltar === undefined ? null : c.resaltar }), { replace: true });
    },
    [fecha, navegar, vista],
  );
  return { hoy, vista, fecha, resaltarId: ubicado?.id ?? null, resaltarPerdido: !!p.resaltar && !ubicado, ir };
}

/**
 * Destello del evento resaltado: lo marca 1,8 s y lo lleva a la vista cada vez que cambia `?resaltar=`.
 * Devuelve el id que debe pintarse resaltado (o null).
 */
export function useDestello(resaltarId: string | null, listo: boolean): string | null {
  const [vencido, setVencido] = useState<string | null>(null);
  useEffect(() => {
    if (!resaltarId || !listo) return;
    const t = window.setTimeout(() => {
      document.querySelector(`[data-evento-id="${CSS.escape(resaltarId)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 60);
    const f = window.setTimeout(() => setVencido(resaltarId), 1800);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(f);
    };
  }, [resaltarId, listo]);
  return resaltarId && vencido !== resaltarId ? resaltarId : null;
}

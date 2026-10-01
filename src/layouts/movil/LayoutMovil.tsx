import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { PESTANAS_APP } from '@/config/navegacion';
import { ContextoRolForzado, useAhora, useDatos, useFiltroLocal, useSel, useSesion } from '@/estado';
import { sumarDias } from '@/dominio/reglas/fechas';
import { selAlertas, selCierresDelDia, selSolicitudesPendientes } from '@/selectores';
import { RequiereDatos } from '@/app/RequiereDatos';
import { rutaDeUrl } from '@/app/rutas';
import { cn } from '@/ui/cn';
import { Icono } from '@/ui/primitivos/Icono';
import { AvisosGlobales } from '../AvisosGlobales';
import { iconoNavegacion } from '../iconos';
import { sincronizarColorTema } from '../colorTema';

/**
 * Layout de la app del dueño `/app` (PLAN 8.5). SIEMPRE del dueño (`ContextoRolForzado`). Oscuro por defecto
 * (`data-theme="dark"` en <html>; "Modo claro" en Más → Apariencia = `tema: 'claro'`), áreas seguras, columna de
 * 430 px en pantallas anchas, barra de pestañas inferior (Hoy · Ventas · Inventario · Agenda · Más) con `glass` y
 * el scroll de cada pestaña conservado. SIN Radix ni librerías pesadas: es la ruta con presupuesto de arranque.
 * Marcador común `data-testid="pagina"`; conserva `data-testid="layout-movil"`.
 */

function pestanaDe(pathname: string): string {
  const p = PESTANAS_APP.filter((t) => t.ruta !== '/app').find((t) => pathname === t.ruta || pathname.startsWith(`${t.ruta}/`));
  return p?.ruta ?? '/app';
}

export function LayoutMovil() {
  const tema = useSesion((s) => s.tema);
  const oscuro = tema !== 'claro';
  const { pathname } = useLocation();
  const pestana = pestanaDe(pathname);
  const scrolls = useRef(new Map<string, number>());
  const anterior = useRef(pestana);

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.theme = oscuro ? 'dark' : 'light';
    sincronizarColorTema();
    return () => {
      raiz.dataset.theme = 'light';
    };
  }, [oscuro]);

  // Cada pestaña conserva su scroll (8.5.3); dentro de una pestaña, una pantalla nueva empieza arriba.
  useLayoutEffect(() => {
    if (anterior.current !== pestana) {
      scrolls.current.set(anterior.current, window.scrollY);
      window.scrollTo(0, scrolls.current.get(pestana) ?? 0);
      anterior.current = pestana;
    } else window.scrollTo(0, 0);
  }, [pathname, pestana]);

  return (
    <ContextoRolForzado.Provider value="dueno">
      <div
        data-testid="layout-movil"
        data-theme={oscuro ? 'dark' : 'light'}
        className="min-h-dvh bg-canvas text-ink"
      >
        <div className="mx-auto min-h-dvh max-w-[430px] pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+16px)] pt-[env(safe-area-inset-top)]">
          <RequiereDatos compacta>
            <div key={pestana} data-testid="pagina" data-ruta={rutaDeUrl(pathname) ?? ''} className="animate-fade-in">
              <Outlet />
            </div>
          </RequiereDatos>
        </div>
        <nav
          aria-label="Pestañas"
          className="glass-app fixed inset-x-0 bottom-0 z-(--z-topbar) border-t border-line pb-[env(safe-area-inset-bottom)]"
        >
          <ul className="mx-auto grid h-(--tabbar-h) max-w-[430px] grid-cols-5">
            {PESTANAS_APP.map((t) => {
              const activa = pestana === t.ruta;
              return (
                <li key={t.id}>
                  <NavLink
                    to={t.ruta}
                    end={t.ruta === '/app'}
                    aria-current={activa ? 'page' : undefined}
                    data-testid={`pestana-${t.id}`}
                    className={cn('relative flex h-full flex-col items-center justify-center gap-0.5 transition-colors duration-(--dur-fast)', activa ? 'text-ink' : 'text-ink-2/70')}
                  >
                    {activa && <span aria-hidden className="absolute top-0 h-0.5 w-4 bg-ink" />}
                    <span className="relative inline-flex">
                      <Icono icono={iconoNavegacion(t.icono)} tamano={22} />
                      {(t.id === 'hoy' || t.id === 'mas') && <PuntoPestana id={t.id} />}
                    </span>
                    <span className="t-micro font-semibold">{t.etiqueta}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        <AvisosGlobales inferior="bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+12px)]" />
      </div>
    </ContextoRolForzado.Provider>
  );
}

/**
 * Punto `accent` de 6 px en la pestaña (PLAN 8.5.3, E1.1): en *Hoy* si un cierre de anoche tiene diferencia y nadie lo
 * ha revisado; en *Más* si hay solicitudes por aprobar o alertas urgentes o nuevas. Se calcula DESPUÉS del primer
 * pintado (presupuesto de arranque de /app) y solo con los datos listos.
 */
function PuntoPestana({ id }: { id: 'hoy' | 'mas' }) {
  const listos = useDatos((s) => s.estado !== null);
  const [despues, setDespues] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDespues(true), 300);
    return () => clearTimeout(t);
  }, []);
  if (!listos || !despues) return null;
  return id === 'hoy' ? <PuntoHoy /> : <PuntoMas />;
}

function Punto({ id, etiqueta }: { id: string; etiqueta: string }) {
  return (
    <span data-testid={`pestana-punto-${id}`} className="absolute -right-1 -top-0.5 size-1.5 rounded-full bg-accent">
      <span className="sr-only">{etiqueta}</span>
    </span>
  );
}

function PuntoHoy() {
  const ayer = sumarDias(useAhora().slice(0, 10), -1);
  const cierres = useSel(selCierresDelDia, { fecha: ayer });
  const pendiente = cierres.some((c) => c.sesionId !== null && c.diferencia !== null && c.diferencia !== 0 && !c.revisado);
  return pendiente ? <Punto id="hoy" etiqueta="Un cierre con diferencia sin revisar" /> : null;
}

function PuntoMas() {
  const ahora = useAhora();
  const local = useFiltroLocal();
  const descartadas = useSesion((s) => s.alertasDescartadas);
  const leidas = useSesion((s) => s.notificacionesLeidas);
  const solicitudes = useSel(selSolicitudesPendientes);
  const alertas = useSel(selAlertas, { localId: local, ahora, descartadas, leidas });
  const hay = solicitudes.length > 0 || alertas.some((a) => a.severidad === 'urgente' || a.nueva);
  return hay ? <Punto id="mas" etiqueta="Hay alertas o solicitudes por aprobar" /> : null;
}

import { useEffect, useLayoutEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { PESTANAS_APP } from '@/config/navegacion';
import { ContextoRolForzado, useSesion } from '@/estado';
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
                    <Icono icono={iconoNavegacion(t.icono)} tamano={22} />
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

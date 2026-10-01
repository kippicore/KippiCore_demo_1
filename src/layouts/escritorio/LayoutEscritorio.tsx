import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { RUTAS, rutaDeUrl } from '@/app/rutas';
import { useDatos, useMarca, useRolActivo, useSesion } from '@/estado';
import { CargaDatos } from '@/app/CargaDatos';
import { Marca } from '@/ui/conectados/Marca';
import { Skeleton } from '@/ui/primitivos/Estados';
import { RequiereDatos } from '@/app/RequiereDatos';
import { GuiaFlotante } from '@/modulos/guia/publico';
import { FranjaMoneda } from '@/ui/conectados/Contexto';
import { useResaltar } from '@/ui/conectados/Guia';
import { ProveedorTooltips } from '@/ui/primitivos/Tooltip';
import { AvisosGlobales } from '../AvisosGlobales';
import { AvisoPantallaPequena } from './AvisoPantallaPequena';
import { BarraLateral } from './BarraLateral';
import { BarraSuperior } from './BarraSuperior';
import { FranjaRol } from './FranjaRol';

/**
 * Layout del escritorio `/panel` (PLAN 8.4): franja de rol (36 px, solo si el rol no es dueño) · barra lateral de
 * 248 px (riel de 72 px entre 1024 y 1279 o a mano) · barra superior flotante + franja de moneda · contenido con
 * scroll de documento (las cabeceras fijas de tabla usan `--sticky-top`). Honra `?resaltar=rol|moneda`. Pone
 * `data-rol` y `data-moneda` en <html> (alturas de franjas) y un marcador común `data-testid="pagina"` en el
 * contenedor de cada página. Por debajo de 1024 px muestra el aviso de pantalla pequeña.
 */
const CLAVE_RIEL = 'kc:lateral:riel';

function useRiel(): [boolean, () => void] {
  const [manual, setManual] = useState<boolean>(() => {
    try {
      return localStorage.getItem(CLAVE_RIEL) === '1';
    } catch {
      return false;
    }
  });
  const [estrecho, setEstrecho] = useState(() => typeof matchMedia === 'function' && matchMedia('(max-width: 1279px)').matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia('(max-width: 1279px)');
    const f = () => setEstrecho(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  return [
    manual || estrecho,
    () => {
      const v = !(manual || estrecho);
      setManual(v);
      try {
        localStorage.setItem(CLAVE_RIEL, v ? '1' : '0');
      } catch {
        /* modo memoria */
      }
    },
  ];
}

/**
 * Armazón mientras se construyen los datos (entrada directa por un enlace profundo): la barra lateral y la barra
 * superior leen el estado (personas, locales, notificaciones), así que hasta tenerlo se pinta su silueta.
 */
function ArmazonEscritorio() {
  return (
    <div data-testid="layout-escritorio" className="hidden min-h-dvh bg-canvas lg:grid" style={{ gridTemplateColumns: 'var(--sidebar-w) minmax(0, 1fr)' }}>
      <aside className="sticky top-0 flex h-dvh flex-col border-r border-line bg-surface max-desk:hidden">
        <div className="flex h-16 flex-col justify-center px-5 text-ink">
          <Marca descriptor />
        </div>
        <div className="mt-4 flex flex-col gap-3 px-6">
          {[70, 55, 62, 48, 66, 52, 58, 44].map((w, i) => (
            <Skeleton key={i} className="h-3" style={{ width: `${w}%` }} />
          ))}
        </div>
      </aside>
      <div className="min-w-0 px-6 pt-(--topbar-gap)">
        <div className="glass h-(--topbar-h) rounded-chrome" />
        <CargaDatos />
      </div>
    </div>
  );
}

export function LayoutEscritorio() {
  const hayEstado = useDatos((s) => s.estado !== null);
  if (!hayEstado)
    return (
      <>
        <AvisoPantallaPequena />
        <ArmazonEscritorio />
      </>
    );
  return <LayoutConDatos />;
}

function LayoutConDatos() {
  const rol = useRolActivo();
  const moneda = useSesion((s) => s.moneda);
  const { pathname } = useLocation();
  const marca = useMarca();
  const recordarRuta = useSesion((s) => s.recordarRuta);
  const resaltar = useResaltar();
  const [riel, alternarRiel] = useRiel();
  const nombre = rutaDeUrl(pathname);

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.rol = rol;
    raiz.dataset.moneda = moneda;
    raiz.dataset.theme = 'light';
    return () => {
      delete raiz.dataset.rol;
      delete raiz.dataset.moneda;
    };
  }, [rol, moneda]);
  useEffect(() => {
    recordarRuta(pathname);
  }, [pathname, recordarRuta]);
  useEffect(() => {
    document.title = `${nombre ? RUTAS[nombre].titulo : 'KippiCore'} · ${marca.nombre} · KippiCore CRM`;
  }, [nombre, marca.nombre]);

  return (
    <ProveedorTooltips>
      <AvisoPantallaPequena />
      <div data-testid="layout-escritorio" className="hidden min-h-dvh bg-canvas lg:block">
        <a href="#contenido" className="sr-only z-(--z-tooltip) bg-ink px-4 py-2 text-inverse focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Saltar al contenido
        </a>
        <FranjaRol />
        <div className="grid min-h-[calc(100dvh-var(--rolestrip-h))] transition-[grid-template-columns] duration-(--dur-slow) ease-standard" style={{ gridTemplateColumns: `${riel ? 'var(--sidebar-w-rail)' : 'var(--sidebar-w)'} minmax(0, 1fr)` }}>
          <BarraLateral riel={riel} alternarRiel={alternarRiel} />
          <div className="min-w-0">
            <div className="sticky top-(--rolestrip-h) z-(--z-topbar) px-6 pt-(--topbar-gap)">
              <BarraSuperior resaltar={resaltar} />
              <FranjaMoneda className="mt-2" />
            </div>
            <main id="contenido" tabIndex={-1} className="px-6 pb-20 outline-none wide:px-8">
              <RequiereDatos>
                <div key={pathname} data-testid="pagina" data-ruta={nombre ?? ''} className="mx-auto max-w-[1600px] animate-page-in">
                  <Outlet />
                </div>
              </RequiereDatos>
            </main>
          </div>
        </div>
        <GuiaFlotante />
      </div>
      <AvisosGlobales />
    </ProveedorTooltips>
  );
}

import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { rutaDeUrl, rutas } from '@/app/rutas';
import { RequiereDatos } from '@/app/RequiereDatos';
import { MARCA } from '@/config/marca';
import { useMarca } from '@/estado';
import { AvisosGlobales } from '../AvisosGlobales';

/**
 * Layout del portal de seguimiento `/seguimiento/:numero` (PLAN 5.5, W3): lo que ve la agente de aduanas con el
 * enlace. Claro, una columna de 720 px, encabezado con la marca del importador y la firma de KippiCore al pie. Sin
 * rol: escribe como 'portal'. Marcador común `data-testid="pagina"`; conserva `data-testid="layout-portal"`.
 */
export function LayoutPortal() {
  const marca = useMarca();
  const { pathname } = useLocation();
  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
    document.title = `Seguimiento de importación · ${marca.nombre}`;
  }, [marca.nombre]);
  return (
    <div data-testid="layout-portal" data-theme="light" className="min-h-dvh bg-canvas text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-[720px] items-center justify-between px-6">
          <span className="t-wordmark text-ink">{marca.nombre}</span>
          <span className="t-eyebrow text-ink-2">Portal de seguimiento</span>
        </div>
      </header>
      <main id="contenido" className="mx-auto max-w-[720px] px-6 pb-20">
        <RequiereDatos>
          <div key={pathname} data-testid="pagina" data-ruta={rutaDeUrl(pathname) ?? ''} className="animate-page-in">
            <Outlet />
          </div>
        </RequiereDatos>
      </main>
      <footer className="mx-auto max-w-[720px] px-6">
        <div className="flex items-center justify-between border-t border-line py-6 t-small text-muted">
          <span>Enlace privado para la agencia de aduanas · datos de ejemplo</span>
          <Link to={rutas.entrada()} className="text-ink-2 hover:underline hover:underline-offset-4">
            {MARCA.firmaKippicore}
          </Link>
        </div>
      </footer>
      <AvisosGlobales />
    </div>
  );
}

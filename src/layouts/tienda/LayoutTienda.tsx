import { ArrowRight, Eye, Menu as IconoMenu, ShoppingBag, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { rutaDeUrl, rutas } from '@/app/rutas';
import { RequiereDatos } from '@/app/RequiereDatos';
import { LOCALES } from '@/config/locales';
import { TEXTOS_FIJOS } from '@/config/textos/notas';
import { useMarca } from '@/estado';
import { AccionesEncabezadoTienda, conMarco, useCantidadBolsa } from '@/tienda/publico';
import { Marca } from '@/ui/conectados/Marca';
import { cn } from '@/ui/cn';
import { Icono } from '@/ui/primitivos/Icono';
import { AvisosGlobales } from '../AvisosGlobales';
import { sincronizarColorTema } from '../colorTema';

/**
 * Layout de la tienda `/tienda` (PLAN 8.6): siempre claro, cuerpo de 16 px. Encabezado FLOTANTE de la referencia
 * (`fixed top-3 inset-x-3`, 64 px, radio 8, glass + blur 9 px, sin borde ni sombra): wordmark a la izquierda,
 * navegación al centro en negrita 14 px con subrayado de 1 px, íconos lineales de 20 px a la derecha y la bolsa con
 * su contador. En celular: menú, wordmark centrado y bolsa; el menú abre un panel a pantalla completa. Pie de 4
 * columnas con boletín y la etiqueta de vitrina abajo a la izquierda (oculta dentro del marco de navegador).
 * Marcador común `data-testid="pagina"`; conserva `data-testid="layout-tienda"`.
 */
export const NAV_TIENDA = [
  { etiqueta: 'Novedades', categoria: 'novedades' },
  { etiqueta: 'Sastrería', categoria: 'sastreria' },
  { etiqueta: 'Camisas', categoria: 'camisas' },
  { etiqueta: 'Pantalones', categoria: 'pantalones' },
  { etiqueta: 'Abrigos', categoria: 'abrigos' },
  { etiqueta: 'Zapatos y accesorios', categoria: 'zapatos-y-accesorios' },
] as const;

const ICONO_TIENDA = 'size-10 items-center justify-center text-ink transition-opacity hover:opacity-60';

export function LayoutTienda() {
  const marca = useMarca();
  const { pathname, search } = useLocation();
  const enMarco = new URLSearchParams(search).get('marco') === '1';
  const [menu, setMenu] = useState(false);
  const bolsa = useCantidadBolsa();
  // Dentro del marco (vista web de Canales) toda la navegación conserva ?marco=1 (compartidos C-D).
  const con = (url: string) => conMarco(url, enMarco);
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.theme = 'light';
    sincronizarColorTema();
  }, []);
  useEffect(() => {
    document.title = `${marca.nombre} · Moda masculina en Bogotá`;
  }, [marca.nombre]);
  return (
    <div data-testid="layout-tienda" data-theme="light" className="min-h-dvh bg-canvas t-body-lg text-ink">
      <header className="glass fixed inset-x-2 top-2 z-(--z-topbar) flex h-14 items-center rounded-chrome px-3 md:inset-x-3 md:top-3 md:h-16 md:px-6">
        <button type="button" className={cn(ICONO_TIENDA, 'inline-flex md:hidden')} aria-label="Abrir el menú" onClick={() => setMenu(true)}>
          <Icono icono={IconoMenu} tamano={20} />
        </button>
        <Link to={con(rutas.tienda())} className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0" aria-label={`${marca.nombre}, inicio de la tienda`}>
          <Marca tamano="tienda" />
        </Link>
        <nav aria-label="Categorías" className="mx-auto hidden items-center gap-8 lg:flex">
          {NAV_TIENDA.map((n) => (
            <NavLink
              key={n.categoria}
              to={con(rutas.tiendaCategoria(n.categoria))}
              className={({ isActive }) => cn('t-nav-tienda text-ink decoration-1 underline-offset-[6px] hover:underline', isActive && 'underline')}
            >
              {n.etiqueta}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 md:ml-0 md:gap-2">
          <AccionesEncabezadoTienda />
          <Link to={con(rutas.tiendaBolsa())} className={cn(ICONO_TIENDA, 'relative inline-flex')} aria-label={bolsa > 0 ? `Bolsa: ${bolsa} ${bolsa === 1 ? 'artículo' : 'artículos'}` : 'Bolsa'}>
            <Icono icono={ShoppingBag} tamano={20} />
            {bolsa > 0 && (
              <span className="absolute right-0.5 top-0.5 inline-flex size-4 items-center justify-center rounded-full bg-ink t-micro num text-inverse" data-testid="tienda-contador-bolsa">
                {bolsa}
              </span>
            )}
          </Link>
        </div>
      </header>

      {menu && (
        <div role="dialog" aria-modal="true" aria-label="Menú" className="fixed inset-0 z-(--z-modal) flex flex-col bg-canvas px-6 pb-10 pt-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <Marca tamano="tienda" />
            <button type="button" className={cn(ICONO_TIENDA, 'inline-flex')} aria-label="Cerrar el menú" onClick={() => setMenu(false)}>
              <Icono icono={X} tamano={20} />
            </button>
          </div>
          <nav aria-label="Categorías" className="mt-10 flex flex-col gap-5">
            {NAV_TIENDA.map((n) => (
              <Link key={n.categoria} to={con(rutas.tiendaCategoria(n.categoria))} onClick={() => setMenu(false)} className="t-h2 text-ink">
                {n.etiqueta}
              </Link>
            ))}
          </nav>
        </div>
      )}

      <main id="contenido">
        <RequiereDatos>
          <div key={pathname} data-testid="pagina" data-ruta={rutaDeUrl(pathname) ?? ''} className="animate-page-in">
            <Outlet />
          </div>
        </RequiereDatos>
      </main>

      <PieTienda nombre={marca.nombre} />

      {!enMarco && (
        <div data-testid="etiqueta-vitrina" className="sobre-ink fixed bottom-4 left-4 z-(--z-tryit) flex h-8 max-w-[calc(100vw-32px)] items-center gap-3 bg-ink px-3 t-micro font-semibold text-inverse">
          <Icono icono={Eye} tamano={14} />
          <span className="truncate">{TEXTOS_FIJOS.vitrina.replace('{{marca}}', marca.nombre)}</span>
          <span aria-hidden className="h-3.5 w-px bg-inverse/40" />
          <Link to={rutas.inicio()} className="inline-flex shrink-0 items-center gap-1 underline underline-offset-3">
            Volver a KippiCore
            <Icono icono={ArrowRight} tamano={12} />
          </Link>
        </div>
      )}
      <AvisosGlobales />
    </div>
  );
}

const PIE = [
  { titulo: 'Comprar', enlaces: ['Novedades', 'Sastrería', 'Camisas', 'Zapatos y accesorios'] },
  { titulo: 'Ayuda', enlaces: ['Envíos', 'Cambios y devoluciones', 'Guía de tallas', 'Preguntas frecuentes'] },
] as const;

/** Tiendas físicas para el pie (destino del ícono "Tiendas" del encabezado). */
const TIENDAS = LOCALES.filter((l) => l.datos.vende).map((l) => ({ id: l.id, nombre: l.datos.nombre, direccion: l.datos.direccion, zona: l.datos.zona }));

function PieTienda({ nombre }: { nombre: string }) {
  const [correo, setCorreo] = useState('');
  const [enviado, setEnviado] = useState(false);
  return (
    <footer className="mt-24 border-t border-line bg-canvas px-6 pb-24 pt-14 md:px-12">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-10 md:grid-cols-4">
        {PIE.map((c) => (
          <div key={c.titulo}>
            <p className="t-label font-bold text-ink">{c.titulo}</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {c.enlaces.map((e) => (
                <li key={e} className="t-small text-ink-2">
                  {e}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <section id="tiendas" aria-label="Tiendas" className="scroll-mt-24" data-testid="tienda-pie-tiendas">
          <p className="t-label font-bold text-ink">Tiendas</p>
          <ul className="mt-4 flex flex-col gap-2.5">
            {TIENDAS.map((t) => (
              <li key={t.id} className="t-small text-ink-2">
                <span className="font-bold text-ink">{t.nombre}</span> · {t.direccion}, {t.zona}
              </li>
            ))}
            <li className="t-small text-ink-2">Lunes a sábado de 10 a. m. a 8 p. m.; domingos de 11 a. m. a 7 p. m.</li>
          </ul>
        </section>
        <form
          className="col-span-2 md:col-span-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (correo.includes('@')) setEnviado(true);
          }}
        >
          <p className="t-label font-bold text-ink">Boletín</p>
          <p className="mt-4 t-small text-ink-2">Novedades de temporada y citas de sastrería, una vez al mes.</p>
          {enviado ? (
            <p className="mt-4 t-small text-ink">Listo. En la tienda real te llegaría el próximo boletín (simulación).</p>
          ) : (
            <label className="mt-4 flex items-center border-b border-ink">
              <span className="sr-only">Tu correo</span>
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="Tu correo" className="h-11 min-w-0 flex-1 bg-transparent t-body outline-none placeholder:text-placeholder" />
              <button type="submit" aria-label="Suscribirme" className="inline-flex size-10 items-center justify-center">
                <Icono icono={ArrowRight} tamano={18} />
              </button>
            </label>
          )}
        </form>
      </div>
      <p className="mx-auto mt-14 max-w-[1440px] t-micro text-ink-2">© 2026 {nombre} · Marca ficticia creada para esta demostración</p>
    </footer>
  );
}

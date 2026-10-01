import { Heart, MapPin, Search, User, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { rutas } from '@/app/rutas';
import { normalizar } from '@/dominio/reglas/texto';
import { useDatos, useSel } from '@/estado';
import { cn, Dinero, Icono } from '@/ui/ligero';
import { ultimoPedidoId, useBolsa, useCantidadBolsa } from '../bolsa';
import { useEnlaces } from '../enlaces';
import { selCatalogoTienda } from '../selectores';
import type { ProductoTienda } from '../tipos';

/**
 * Íconos del encabezado de la tienda con acción real (compartidos C-D, pedido de D6): buscar abre un buscador sobre
 * el catálogo, tiendas lleva a la sección de tiendas del pie, la cuenta muestra el último pedido de esta pestaña y la
 * bolsa, y favoritos lista lo que la persona marcó con el corazón. Todos los enlaces conservan `?marco=1`.
 */
type Panel = 'buscar' | 'cuenta' | 'favoritos';

const ICONO = 'size-10 items-center justify-center text-ink transition-opacity hover:opacity-60';

export function AccionesEncabezadoTienda() {
  const { pathname } = useLocation();
  // El panel recuerda en qué ruta se abrió: al navegar queda cerrado sin un efecto que lo cierre.
  const [estado, setEstado] = useState<{ panel: Panel; ruta: string } | null>(null);
  const abierto = estado && estado.ruta === pathname ? estado.panel : null;
  const setAbierto = (p: Panel | null | ((a: Panel | null) => Panel | null)) =>
    setEstado(() => {
      const siguiente = typeof p === 'function' ? p(abierto) : p;
      return siguiente ? { panel: siguiente, ruta: pathname } : null;
    });
  const raiz = useRef<HTMLDivElement>(null);
  const idPanel = useId();

  // Se cierra con Escape o al tocar fuera.
  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setEstado(null);
    const fuera = (e: PointerEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setEstado(null);
    };
    document.addEventListener('keydown', tecla);
    document.addEventListener('pointerdown', fuera);
    return () => {
      document.removeEventListener('keydown', tecla);
      document.removeEventListener('pointerdown', fuera);
    };
  }, [abierto]);

  const boton = (panel: Panel, icono: typeof Search, etiqueta: string) => (
    <button
      type="button"
      className={cn(ICONO, 'hidden md:inline-flex', abierto === panel && 'opacity-60')}
      aria-label={etiqueta}
      aria-expanded={abierto === panel}
      aria-controls={abierto === panel ? idPanel : undefined}
      onClick={() => setAbierto((a) => (a === panel ? null : panel))}
      data-testid={`tienda-encabezado-${panel}`}
    >
      <Icono icono={icono} tamano={20} />
    </button>
  );

  return (
    <div ref={raiz} className="contents">
      {boton('buscar', Search, 'Buscar')}
      <button
        type="button"
        className={cn(ICONO, 'hidden md:inline-flex')}
        aria-label="Tiendas"
        data-testid="tienda-encabezado-tiendas"
        onClick={() => {
          setAbierto(null);
          document.getElementById('tiendas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      >
        <Icono icono={MapPin} tamano={20} />
      </button>
      {boton('cuenta', User, 'Mi cuenta')}
      {boton('favoritos', Heart, 'Favoritos')}
      {abierto && (
        <div
          id={idPanel}
          role="dialog"
          aria-label={abierto === 'buscar' ? 'Buscar en la tienda' : abierto === 'cuenta' ? 'Tu cuenta' : 'Tus favoritos'}
          className="glass fixed right-2 top-[72px] z-(--z-popover) w-[min(400px,calc(100vw-16px))] rounded-chrome p-5 shadow-float animate-pop-in md:right-3 md:top-[84px]"
          data-testid={`tienda-panel-${abierto}`}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="t-label font-bold text-ink">{abierto === 'buscar' ? 'Buscar' : abierto === 'cuenta' ? 'Tu cuenta' : 'Favoritos'}</p>
            <button type="button" className="inline-flex size-8 items-center justify-center text-ink hover:opacity-60" aria-label="Cerrar" onClick={() => setAbierto(null)}>
              <Icono icono={X} tamano={16} />
            </button>
          </div>
          <ConDatos>
            {abierto === 'buscar' ? <PanelBuscar alElegir={() => setAbierto(null)} /> : abierto === 'cuenta' ? <PanelCuenta /> : <PanelFavoritos />}
          </ConDatos>
        </div>
      )}
    </div>
  );
}

/** El encabezado vive fuera de `<RequiereDatos>`: los paneles esperan a que el catálogo esté listo. */
function ConDatos({ children }: { children: ReactNode }) {
  const listo = useDatos((s) => s.estado !== null);
  return listo ? <>{children}</> : <p className="t-small text-muted">Cargando el catálogo…</p>;
}

function FilaProducto({ p, alElegir }: { p: ProductoTienda; alElegir?: () => void }) {
  const { con } = useEnlaces();
  return (
    <li>
      <Link to={con(rutas.tiendaProducto(p.slug))} onClick={alElegir} className="flex items-baseline justify-between gap-4 py-2 hover:underline" data-testid="tienda-panel-producto">
        <span className="min-w-0 truncate t-body text-ink">{p.nombre}</span>
        <Dinero valor={p.precio} className="shrink-0 t-small text-ink-2" />
      </Link>
    </li>
  );
}

function PanelBuscar({ alElegir }: { alElegir: () => void }) {
  const catalogo = useSel(selCatalogoTienda);
  const [texto, setTexto] = useState('');
  const { ir } = useEnlaces();
  const resultados = useMemo(() => {
    const q = normalizar(texto.trim());
    if (q.length < 2) return [];
    const palabras = q.split(/\s+/);
    return catalogo.productos
      .filter((p) => {
        const heno = normalizar(`${p.nombre} ${p.referencia} ${p.material} ${p.categoria}`);
        return palabras.every((w) => heno.includes(w));
      })
      .slice(0, 6);
  }, [catalogo, texto]);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const primero = resultados[0];
        if (primero) {
          ir(rutas.tiendaProducto(primero.slug));
          alElegir();
        }
      }}
    >
      <label className="flex items-center gap-2 border-b border-ink">
        <Icono icono={Search} tamano={16} className="text-muted" />
        <span className="sr-only">Qué buscas</span>
        {/* El buscador se abre a pedido: llevar el foco al campo es lo esperado. */}
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <input autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Camisa oxford, blazer, mocasín…" className="h-11 min-w-0 flex-1 bg-transparent t-body outline-none placeholder:text-placeholder" data-testid="tienda-buscar-campo" />
      </label>
      {texto.trim().length >= 2 && (
        <ul className="mt-2 max-h-[50vh] overflow-auto">
          {resultados.length ? resultados.map((p) => <FilaProducto key={p.id} p={p} alElegir={alElegir} />) : <li className="py-2 t-small text-muted">No encontramos prendas con «{texto.trim()}».</li>}
        </ul>
      )}
    </form>
  );
}

function PanelCuenta() {
  const { con } = useEnlaces();
  const bolsa = useCantidadBolsa();
  const pedido = ultimoPedidoId();
  return (
    <div className="flex flex-col gap-3">
      <p className="t-small text-ink-2">Esta tienda es una vista previa: no hay cuentas ni contraseñas. En la tienda real aquí verías tus pedidos y tus datos de envío.</p>
      <ul className="flex flex-col gap-1">
        {pedido && (
          <li>
            <Link to={con(rutas.tiendaPedido(pedido))} className="t-body font-bold text-ink underline-offset-4 hover:underline" data-testid="tienda-cuenta-pedido">
              Ver tu último pedido
            </Link>
          </li>
        )}
        <li>
          <Link to={con(rutas.tiendaBolsa())} className="t-body text-ink underline-offset-4 hover:underline">
            {bolsa > 0 ? `Tu bolsa (${bolsa} ${bolsa === 1 ? 'artículo' : 'artículos'})` : 'Tu bolsa está vacía'}
          </Link>
        </li>
      </ul>
    </div>
  );
}

function PanelFavoritos() {
  const catalogo = useSel(selCatalogoTienda);
  const favoritos = useBolsa((s) => s.favoritos);
  const productos = useMemo(() => favoritos.map((id) => catalogo.productos.find((p) => p.id === id)).filter((p): p is ProductoTienda => !!p), [catalogo, favoritos]);
  if (!productos.length) return <p className="t-small text-ink-2">Toca el corazón de una prenda para guardarla aquí mientras navegas.</p>;
  return (
    <ul className="max-h-[50vh] overflow-auto">
      {productos.map((p) => (
        <FilaProducto key={p.id} p={p} />
      ))}
    </ul>
  );
}

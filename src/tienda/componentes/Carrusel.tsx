import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { cn, Icono } from '@/ui/ligero';

/**
 * Carrusel horizontal de tarjetas (PLAN 8.6.3): desplazamiento con ajuste a cada tarjeta y flechas cuadradas de 40 px
 * con borde `line-strong` (ocultas en celular, donde se desliza con el dedo).
 */
export function Carrusel({ titulo, accion, children, className }: { titulo: ReactNode; accion?: ReactNode; children: ReactNode; className?: string }) {
  const pista = useRef<HTMLDivElement>(null);
  const mover = (dir: 1 | -1) => {
    const el = pista.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };
  return (
    <section className={className}>
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-5">
          <h2 className="t-h1 uppercase text-ink">{titulo}</h2>
          {accion}
        </div>
        <div className="hidden gap-2 md:flex">
          <button type="button" aria-label="Anterior" onClick={() => mover(-1)} className={FLECHA}>
            <Icono icono={ChevronLeft} tamano={18} />
          </button>
          <button type="button" aria-label="Siguiente" onClick={() => mover(1)} className={FLECHA}>
            <Icono icono={ChevronRight} tamano={18} />
          </button>
        </div>
      </div>
      <div ref={pista} className={cn('mt-6 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden')} data-testid="tienda-carrusel">
        {children}
      </div>
    </section>
  );
}

const FLECHA = 'inline-flex size-10 items-center justify-center border border-line-strong text-ink transition-colors hover:border-ink hover:bg-ink hover:text-inverse';

/** Celda de un carrusel: 2 por pantalla en celular y 4 en escritorio. */
export function CeldaCarrusel({ children }: { children: ReactNode }) {
  return <div className="w-[calc(50%-4px)] shrink-0 snap-start md:w-[calc(25%-6px)]">{children}</div>;
}

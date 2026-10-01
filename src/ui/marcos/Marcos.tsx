import { Lock } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../cn';
import { Icono } from '../primitivos/Icono';

/**
 * Marcos (PLAN 8.7.29, 8.7.30). Teléfono genérico solo CSS (sin forma de un modelo concreto): pantalla 390 × 844,
 * bisel de 12 px, isla superior de 110 × 30, botones laterales; escalas 0,6 / 0,72 / 0,85. Navegador: barra de 40 px
 * con tres círculos grises (no semáforo) y el dominio de ejemplo `tienda.halden.demo` (nunca uno real).
 * El contenido es un `iframe` (`/app?marco=1`, `/tienda?marco=1`) que adopta el estado de la pestaña.
 *
 *   <MarcoTelefono src="/app?marco=1" escala={0.72} titulo="App del dueño" />
 *   <MarcoNavegador src="/tienda?marco=1" direccion="tienda.halden.demo" alto={640} />
 */
const PANTALLA = { w: 390, h: 844 } as const;
const BISEL = 12;

export function MarcoTelefono({ src, escala = 0.72, titulo, children, className }: { src?: string; escala?: 0.6 | 0.72 | 0.85 | number; titulo: string; children?: ReactNode; className?: string }) {
  const W = PANTALLA.w + BISEL * 2;
  const H = PANTALLA.h + BISEL * 2;
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: W * escala, height: H * escala }} data-marco="telefono">
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${escala})` }}>
        {/* botones laterales: dos a la izquierda, uno a la derecha */}
        <span aria-hidden className="absolute -left-[3px] top-[180px] h-[56px] w-[3px] rounded-l-xs bg-device-boton" />
        <span aria-hidden className="absolute -left-[3px] top-[250px] h-[56px] w-[3px] rounded-l-xs bg-device-boton" />
        <span aria-hidden className="absolute -right-[3px] top-[210px] h-[88px] w-[3px] rounded-r-xs bg-device-boton" />
        <div className="relative size-full rounded-device bg-device p-3 outline outline-1 outline-line-strong">
          <div className="relative size-full overflow-hidden rounded-screen bg-canvas">
            {src ? <iframe title={titulo} src={src} className="block border-0" style={{ width: PANTALLA.w, height: PANTALLA.h }} /> : children}
            <span aria-hidden className="pointer-events-none absolute left-1/2 top-[11px] h-[30px] w-[110px] -translate-x-1/2 rounded-full bg-device" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarcoNavegador({ src, direccion = 'tienda.halden.demo', titulo, alto = 640, anchoContenido = 1440, children, className }: { src?: string; direccion?: string; titulo: string; alto?: number; anchoContenido?: number; children?: ReactNode; className?: string }) {
  const caja = useRef<HTMLDivElement | null>(null);
  const [escala, setEscala] = useState(0.6);
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => setEscala(Math.min(1, el.clientWidth / anchoContenido));
    medir();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(medir) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [anchoContenido]);
  return (
    <div className={cn('border border-line bg-surface', className)} data-marco="navegador">
      <div className="flex h-10 items-center gap-3 bg-selected px-3">
        <span aria-hidden className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2.5 rounded-full bg-line-strong" />
          ))}
        </span>
        <span className="mx-auto inline-flex h-6 min-w-0 max-w-[60%] flex-1 items-center justify-center gap-1.5 bg-surface px-3 t-small text-muted">
          <Icono icono={Lock} tamano={12} />
          <span className="truncate">{direccion}</span>
        </span>
        <span className="w-[42px]" aria-hidden />
      </div>
      <div ref={caja} className="relative overflow-hidden" style={{ height: alto }}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: anchoContenido, height: alto / escala, transform: `scale(${escala})` }}>
          {src ? <iframe title={titulo} src={src} className="block size-full border-0" /> : children}
        </div>
      </div>
    </div>
  );
}

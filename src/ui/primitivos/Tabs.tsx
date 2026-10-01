import * as RT from '@radix-ui/react-tabs';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router';
import { cn } from '../cn';

/**
 * Pestañas (PLAN 8.7.9).
 * - Subrayadas (por defecto): alto 44, `gap-6`, t-nav ink-2; activa ink 700 con subrayado de 2 px que se desliza
 *   200 ms. Contador opcional (t-micro num).
 * - Por ruta (`PestanasEnlace`): las pestañas de una ficha son subrutas (5.5): mismo aspecto, con NavLink.
 * - Segmentadas: ver `Segmentado.tsx` (sin Radix).
 *
 *   <Tabs valor={t} alCambiar={setT} pestanas={[{ valor: 'resumen', etiqueta: 'Resumen' }, { valor: 'lineas', etiqueta: 'Líneas', contador: 3 }]}>
 *     <PanelTab valor="resumen">…</PanelTab>
 *   </Tabs>
 *   <PestanasEnlace pestanas={[{ a: rutas.producto(ref), etiqueta: 'Variantes', fin: true }, { a: rutas.productoPestana(ref, 'kardex'), etiqueta: 'Kárdex' }]} />
 */
export interface Pestana<T extends string = string> {
  valor: T;
  etiqueta: ReactNode;
  contador?: number;
  deshabilitada?: boolean;
  'data-testid'?: string;
}

function useIndicador(activo: string | null, deps: unknown[]) {
  const lista = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const raiz = lista.current;
    if (!raiz) return;
    const medir = () => {
      const el = raiz.querySelector<HTMLElement>('[data-activa="true"]');
      if (!el) return setPos(null);
      setPos({ x: el.offsetLeft, w: el.offsetWidth });
    };
    medir();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(medir) : null;
    ro?.observe(raiz);
    return () => ro?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, ...deps]);
  return { lista, pos };
}

const LISTA = 'relative flex h-11 items-stretch gap-6 border-b border-line-soft';
const PESTANA =
  'relative inline-flex items-center gap-2 whitespace-nowrap t-nav text-ink-2 outline-none transition-colors duration-(--dur-instant) hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus data-[activa=true]:font-bold data-[activa=true]:text-ink disabled:cursor-not-allowed disabled:text-disabled';

function Indicador({ pos }: { pos: { x: number; w: number } | null }) {
  if (!pos) return null;
  return (
    <span
      aria-hidden
      className="absolute -bottom-px left-0 h-0.5 bg-ink transition-[transform,width] duration-(--dur-base) ease-standard"
      style={{ width: pos.w, transform: `translateX(${pos.x}px)` }}
    />
  );
}

export interface PropsTabs<T extends string> {
  valor: T;
  alCambiar: (v: T) => void;
  pestanas: readonly Pestana<T>[];
  children?: ReactNode;
  etiqueta?: string;
  className?: string;
}

export function Tabs<T extends string>({ valor, alCambiar, pestanas, children, etiqueta, className }: PropsTabs<T>) {
  const { lista, pos } = useIndicador(valor, [pestanas.length]);
  return (
    <RT.Root value={valor} onValueChange={(v) => alCambiar(v as T)} className={className}>
      <RT.List ref={lista} aria-label={etiqueta} className={LISTA}>
        {pestanas.map((p) => (
          <RT.Trigger key={p.valor} value={p.valor} disabled={p.deshabilitada} data-activa={p.valor === valor} data-testid={p['data-testid']} className={PESTANA}>
            {p.etiqueta}
            {p.contador !== undefined && <span className="t-micro num text-ink-2">{p.contador}</span>}
          </RT.Trigger>
        ))}
        <Indicador pos={pos} />
      </RT.List>
      {children}
    </RT.Root>
  );
}

export function PanelTab({ valor, children, className }: { valor: string; children: ReactNode; className?: string }) {
  return (
    <RT.Content value={valor} className={cn('outline-none', className)}>
      {children}
    </RT.Content>
  );
}

export interface PestanaEnlace {
  a: string;
  etiqueta: ReactNode;
  contador?: number;
  /** Coincidencia exacta (la pestaña raíz de una ficha). */
  fin?: boolean;
}

export function PestanasEnlace({ pestanas, etiqueta, className }: { pestanas: readonly PestanaEnlace[]; etiqueta?: string; className?: string }) {
  const { pathname } = useLocation();
  const activa = pestanas.find((p) => (p.fin ? pathname === p.a.split('?')[0] : pathname.startsWith(p.a.split('?')[0] ?? '')))?.a ?? null;
  const { lista, pos } = useIndicador(activa, [pestanas.length, pathname]);
  return (
    <nav aria-label={etiqueta} className={className}>
      <div ref={lista} className={LISTA}>
        {pestanas.map((p) => (
          <NavLink key={p.a} to={p.a} end={p.fin} data-activa={p.a === activa} className={PESTANA}>
            {p.etiqueta}
            {p.contador !== undefined && <span className="t-micro num text-ink-2">{p.contador}</span>}
          </NavLink>
        ))}
        <Indicador pos={pos} />
      </div>
    </nav>
  );
}


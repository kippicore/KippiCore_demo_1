import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '../cn';

/**
 * Control segmentado (PLAN 8.7.9): conmutar vistas (Tabla / Tarjetas, Mes / Semana / Día), la moneda de la barra
 * superior y el local de la matriz. Grupo con borde 1 px line-strong, alto 32 (sm 28), ítems t-label, activo
 * `bg-ink text-inverse`, separadores de 1 px. Sin Radix (va en barras siempre visibles; no suma peso al arranque).
 *
 *   <Segmentado etiqueta="Vista" valor={v} alCambiar={setV}
 *     opciones={[{ valor: 'tabla', etiqueta: 'Tabla' }, { valor: 'tarjetas', etiqueta: 'Tarjetas' }]} />
 */
export interface OpcionSegmentado<T extends string> {
  valor: T;
  etiqueta: ReactNode;
  /** Texto accesible si la etiqueta es un ícono. */
  aria?: string;
  'data-testid'?: string;
}

export interface PropsSegmentado<T extends string> {
  valor: T;
  alCambiar: (v: T) => void;
  opciones: readonly OpcionSegmentado<T>[];
  etiqueta: string;
  tamano?: 'sm' | 'md';
  className?: string;
  'data-testid'?: string;
}

/** Control segmentado (radiogroup accesible con flechas). Alto 32 (sm 28), borde line-strong, activo ink. */
export function Segmentado<T extends string>({ valor, alCambiar, opciones, etiqueta, tamano = 'md', className, ...resto }: PropsSegmentado<T>) {
  const mover = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const j = (i + d + opciones.length) % opciones.length;
    const o = opciones[j];
    if (!o) return;
    alCambiar(o.valor);
    const hermano = (e.currentTarget.parentElement?.children[j] as HTMLElement | undefined) ?? null;
    hermano?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      data-testid={resto['data-testid']}
      className={cn('inline-flex items-stretch rounded-none border border-line-strong bg-surface', tamano === 'sm' ? 'h-7' : 'h-8', className)}
    >
      {opciones.map((o, i) => {
        const activo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={activo}
            aria-label={o.aria}
            tabIndex={activo ? 0 : -1}
            data-testid={o['data-testid']}
            onKeyDown={(e) => mover(e, i)}
            onClick={() => alCambiar(o.valor)}
            className={cn(
              'inline-flex min-w-8 items-center justify-center gap-1.5 px-2.5 t-label num transition-colors duration-(--dur-instant) focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
              i > 0 && 'border-l border-line-strong',
              activo ? 'bg-ink text-inverse' : 'text-ink hover:bg-surface-2',
            )}
          >
            {o.etiqueta}
          </button>
        );
      })}
    </div>
  );
}

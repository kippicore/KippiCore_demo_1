import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/ui/ligero';

/**
 * Control segmentado para el dedo (PLAN 8.7.9 con áreas táctiles de 44 px, 8.5.4): reparte el ancho en partes iguales,
 * activo `bg-ink text-inverse`, radiogroup accesible con flechas. Es el `Segmentado` del sistema pero de 44 px de alto
 * (el del escritorio mide 32, demasiado bajo para un pulgar).
 */
export interface OpcionSeg<T extends string> {
  valor: T;
  etiqueta: ReactNode;
  'data-testid'?: string;
}

export function SegmentadoMovil<T extends string>({
  valor,
  alCambiar,
  opciones,
  etiqueta,
  className,
  'data-testid': testid,
}: {
  valor: T;
  alCambiar: (v: T) => void;
  opciones: readonly OpcionSeg<T>[];
  etiqueta: string;
  className?: string;
  'data-testid'?: string;
}) {
  const mover = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const j = (i + d + opciones.length) % opciones.length;
    const o = opciones[j];
    if (!o) return;
    alCambiar(o.valor);
    (e.currentTarget.parentElement?.children[j] as HTMLElement | undefined)?.focus();
  };
  return (
    <div role="radiogroup" aria-label={etiqueta} data-testid={testid} className={cn('flex h-11 w-full items-stretch border border-line-strong bg-surface', className)}>
      {opciones.map((o, i) => {
        const activo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={activo}
            tabIndex={activo ? 0 : -1}
            data-testid={o['data-testid']}
            onKeyDown={(e) => mover(e, i)}
            onClick={() => alCambiar(o.valor)}
            className={cn(
              'min-w-0 flex-1 truncate px-2 t-label transition-colors duration-(--dur-instant) focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
              i > 0 && 'border-l border-line-strong',
              activo ? 'bg-ink text-inverse' : 'text-ink active:bg-surface-2',
            )}
          >
            {o.etiqueta}
          </button>
        );
      })}
    </div>
  );
}

/** Interruptor de 44 px (modo claro): `role="switch"`, el texto y la ayuda a la izquierda. */
export function InterruptorMovil({ activo, alCambiar, etiqueta, ayuda, 'data-testid': testid }: { activo: boolean; alCambiar: (v: boolean) => void; etiqueta: string; ayuda?: string; 'data-testid'?: string }) {
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-labelledby={`${id}-t`}
      aria-describedby={ayuda ? `${id}-a` : undefined}
      data-testid={testid}
      onClick={() => alCambiar(!activo)}
      className="flex min-h-14 w-full items-center gap-4 px-4 py-2 text-left active:bg-surface-2"
    >
      <span className="min-w-0 flex-1">
        <span id={`${id}-t`} className="block t-body font-semibold text-ink">
          {etiqueta}
        </span>
        {ayuda && (
          <span id={`${id}-a`} className="block t-small text-muted">
            {ayuda}
          </span>
        )}
      </span>
      <span aria-hidden className={cn('relative h-7 w-12 shrink-0 border border-line-strong transition-colors duration-(--dur-fast)', activo ? 'bg-ink' : 'bg-surface-2')}>
        <span className={cn('absolute top-0.5 size-5 transition-all duration-(--dur-fast) ease-standard', activo ? 'left-[calc(100%-1.375rem)] bg-inverse' : 'left-0.5 bg-ink-2')} />
      </span>
    </button>
  );
}

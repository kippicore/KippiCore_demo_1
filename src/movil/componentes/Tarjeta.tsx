import { ChevronRight } from 'lucide-react';
import { Children, type ReactNode } from 'react';
import { Link } from 'react-router';
import { cn, Icono } from '@/ui/ligero';

/**
 * Piezas de composición de la app del dueño (PLAN 8.5.4): tarjeta `bg-surface border border-line` sin radio,
 * filas de 56–64 px con separadores `line-soft`, `ChevronRight` a la derecha y el área táctil completa (≥ 44 px).
 * Sin Radix ni librerías pesadas (van en el arranque de /app).
 */
export function Tarjeta({ children, className, ...resto }: { children: ReactNode; className?: string; 'data-testid'?: string; 'aria-label'?: string }) {
  return (
    <article className={cn('border border-line bg-surface', className)} {...resto}>
      {children}
    </article>
  );
}

/** Encabezado de una tarjeta: título en eyebrow y, a la derecha, una acción de texto ("Ver todas"). */
export function TarjetaTitulo({ titulo, derecha, a, textoA, className, id }: { titulo: ReactNode; derecha?: ReactNode; a?: string; textoA?: string; className?: string; id?: string }) {
  return (
    <div className={cn('flex min-h-11 items-center justify-between gap-3 px-4 pt-2', className)}>
      <h2 id={id} className="t-eyebrow text-ink-2">
        {titulo}
      </h2>
      {derecha}
      {a && textoA && (
        <Link to={a} className="-mr-2 inline-flex h-11 items-center gap-0.5 px-2 t-label text-ink-2 active:bg-surface-2">
          {textoA}
          <Icono icono={ChevronRight} tamano={14} />
        </Link>
      )}
    </div>
  );
}

interface PropsFila {
  principal: ReactNode;
  secundaria?: ReactNode;
  derecha?: ReactNode;
  /** Ícono o miniatura a la izquierda. */
  inicio?: ReactNode;
  a?: string;
  onClick?: () => void;
  /** Sin flecha aunque sea navegable. */
  sinFlecha?: boolean;
  className?: string;
  'data-testid'?: string;
  'data-venta'?: string;
  'aria-label'?: string;
  resaltada?: boolean;
  /** Los textos pueden ocupar hasta dos líneas (nombres largos) en vez de cortarse con puntos suspensivos. */
  envolver?: boolean;
}

/** Fila de lista: 56 px (64 con dos líneas), toda el área es el enlace o el botón; presionada `bg-surface-2`. */
export function FilaLista({ principal, secundaria, derecha, inicio, a, onClick, sinFlecha, className, resaltada, envolver, ...resto }: PropsFila) {
  const cuerpo = (
    <>
      {inicio && <span className="shrink-0">{inicio}</span>}
      <span className="min-w-0 flex-1 text-left">
        <span className={cn('block t-body font-semibold text-ink', envolver ? 'line-clamp-2' : 'truncate')}>{principal}</span>
        {secundaria && <span className={cn('block t-small text-muted', envolver ? 'line-clamp-2' : 'truncate')}>{secundaria}</span>}
      </span>
      {derecha && <span className="shrink-0 text-right">{derecha}</span>}
      {(a || onClick) && !sinFlecha && <Icono icono={ChevronRight} tamano={16} className="shrink-0 text-subtle" />}
    </>
  );
  const clases = cn(
    'flex w-full items-center gap-3 px-4 transition-colors duration-(--dur-instant)',
    secundaria ? 'min-h-16 py-2.5' : 'min-h-14 py-2',
    (a || onClick) && 'active:bg-surface-2',
    resaltada && 'bg-accent-soft shadow-[inset_2px_0_0_var(--c-accent)]',
    className,
  );
  if (a)
    return (
      <Link to={a} className={clases} {...resto}>
        {cuerpo}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={clases} {...resto}>
        {cuerpo}
      </button>
    );
  return (
    <div className={clases} {...resto}>
      {cuerpo}
    </div>
  );
}

/** Lista con separadores `line-soft` (dentro de una `Tarjeta`, o sola cuando la lista es la pantalla). */
export function Lista({ children, className, ...resto }: { children: ReactNode; className?: string; 'data-testid'?: string }) {
  return (
    <ul className={cn('divide-y divide-line-soft', className)} {...resto}>
      {Children.toArray(children).map((h, i) => (
        <li key={i}>{h}</li>
      ))}
    </ul>
  );
}

/** Cifra secundaria: tarjeta 2 × 2 con `t-kpi-sm`. */
export function CifraSecundaria({ etiqueta, children, nota, className, ...resto }: { etiqueta: string; children: ReactNode; nota?: ReactNode; className?: string; 'data-testid'?: string }) {
  return (
    <div className={cn('border border-line bg-surface p-4', className)} {...resto}>
      <p className="t-eyebrow text-ink-2">{etiqueta}</p>
      <p className="mt-1.5 t-kpi-sm text-ink">{children}</p>
      {nota && <p className="mt-0.5 t-small text-muted">{nota}</p>}
    </div>
  );
}

/** Par "etiqueta … valor" de los detalles (hojas y fichas). */
export function ParDato({ etiqueta, children, className }: { etiqueta: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-2.5', className)}>
      <dt className="shrink-0 t-small text-muted">{etiqueta}</dt>
      <dd className="min-w-0 text-right t-body text-ink">{children}</dd>
    </div>
  );
}

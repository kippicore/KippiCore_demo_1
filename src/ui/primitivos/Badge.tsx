import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { EstiloEstado, Tono } from '@/config/estados';
import { cn } from '../cn';
import { Icono } from './Icono';

/**
 * Insignia de estado (PLAN 8.7.10): alto 24 (sm 20), radio 0, t-eyebrow 12 px con tracking 0,06 em. Los tonos
 * suaves llevan un punto de 6 px del color semántico (el color nunca es la única señal: siempre hay texto).
 * El tono sale SIEMPRE del mapa canónico `config/estados.ts`; ningún módulo decide colores.
 *
 *   <Badge tono="success">Pagada</Badge>
 *   <BadgeEstado estado={ESTADOS_VENTA.separado} />
 *   <Badge tono="danger" tamano="sm">Retraso de 6 días</Badge>
 */
const TONOS: Record<Tono, { caja: string; punto?: string }> = {
  ink: { caja: 'bg-ink text-inverse' },
  outline: { caja: 'border border-line-strong text-ink' },
  neutral: { caja: 'bg-selected text-ink-2' },
  muted: { caja: 'text-subtle line-through' },
  success: { caja: 'bg-success-soft text-ink', punto: 'bg-success' },
  warning: { caja: 'bg-warning-soft text-ink', punto: 'bg-warning' },
  danger: { caja: 'bg-danger-soft text-ink', punto: 'bg-danger' },
  accent: { caja: 'bg-accent-soft text-accent-ink', punto: 'bg-accent' },
};

export interface PropsBadge {
  tono?: Tono;
  tamano?: 'sm' | 'md';
  icono?: LucideIcon;
  children: ReactNode;
  className?: string;
  title?: string;
}

export function Badge({ tono = 'neutral', tamano = 'md', icono, children, className, title }: PropsBadge) {
  const t = TONOS[tono];
  return (
    <span
      title={title}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-none px-2 t-eyebrow tracking-[0.06em]',
        tamano === 'sm' ? 'h-5' : 'h-6',
        t.caja,
        className,
      )}
    >
      {t.punto && <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', t.punto)} />}
      {icono && <Icono icono={icono} tamano={12} />}
      {children}
    </span>
  );
}

/** Insignia desde una entrada del mapa canónico: `<BadgeEstado estado={ESTADOS_CAJA.cuadro} />`. */
export function BadgeEstado({ estado, tamano, icono }: { estado: EstiloEstado; tamano?: 'sm' | 'md'; icono?: LucideIcon }) {
  return (
    <Badge tono={estado.tono} tamano={tamano} icono={icono}>
      {estado.etiqueta}
    </Badge>
  );
}

/** Punto de estado con texto (listas de la app: "cuadró" / "faltan $ 40.000"). */
export function PuntoEstado({ tono, children, className }: { tono: Exclude<Tono, 'outline' | 'muted' | 'neutral'> | 'neutral'; children: ReactNode; className?: string }) {
  const color = tono === 'neutral' ? 'bg-subtle' : tono === 'ink' ? 'bg-ink' : TONOS[tono].punto;
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', color)} />
      {children}
    </span>
  );
}

import type { LucideIcon, LucideProps } from 'lucide-react';

/**
 * `<Icono icono={Shirt} tamano={18} />` (PLAN 8.13): única forma de pintar un ícono. Trazo de 1,5 px a cualquier
 * tamaño (1,25 desde 24 px), color heredado (`currentColor`), decorativo por defecto (`aria-hidden`).
 * Con `etiqueta`, el ícono se anuncia (role img).
 */
export type TamanoIcono = 12 | 14 | 16 | 18 | 20 | 22 | 24 | 28 | 40;

export interface PropsIcono extends Omit<LucideProps, 'size' | 'ref'> {
  icono: LucideIcon;
  tamano?: TamanoIcono;
  etiqueta?: string;
}

export function Icono({ icono: Componente, tamano = 16, etiqueta, className, ...resto }: PropsIcono) {
  return (
    <Componente
      size={tamano}
      strokeWidth={tamano >= 24 ? 1.25 : 1.5}
      absoluteStrokeWidth
      aria-hidden={etiqueta ? undefined : true}
      aria-label={etiqueta}
      role={etiqueta ? 'img' : undefined}
      focusable="false"
      className={className ? `shrink-0 ${className}` : 'shrink-0'}
      {...resto}
    />
  );
}

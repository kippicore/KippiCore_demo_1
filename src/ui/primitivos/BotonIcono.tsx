import type { LucideIcon } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../cn';
import { clasesBoton, type TamanoBoton, type VarianteBoton } from './Button';
import { Icono } from './Icono';
import { Tooltip } from './Tooltip';

/**
 * Botón solo ícono (PLAN 8.7.1): cuadrado de 32/40/48, `ghost` por defecto, `aria-label` obligatorio y tooltip con
 * el mismo texto. En /app (sin tooltips) usa `<Button soloIcono aria-label=…>`.
 *
 *   <BotonIcono icono={Printer} etiqueta="Imprimir" onClick={imprimir} />
 */
export interface PropsBotonIcono extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icono: LucideIcon;
  etiqueta: string;
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  sinTooltip?: boolean;
}

export const BotonIcono = forwardRef<HTMLButtonElement, PropsBotonIcono>(function BotonIcono(
  { icono, etiqueta, variante = 'ghost', tamano = 'md', sinTooltip, className, ...resto },
  ref,
) {
  const boton = (
    <button ref={ref} type="button" aria-label={etiqueta} className={cn(clasesBoton({ variante, tamano, soloIcono: true }), className)} {...resto}>
      <Icono icono={icono} tamano={tamano === 'sm' ? 16 : tamano === 'lg' ? 20 : 18} />
    </button>
  );
  return sinTooltip ? boton : <Tooltip texto={etiqueta}>{boton}</Tooltip>;
});

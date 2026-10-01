import { MoreHorizontal } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Icono } from '@/ui';

/**
 * Disparador del menú de acciones de una fila. Mismo aspecto que `BotonAccionesFila` de `@/ui`, pero reenvía la
 * referencia y las propiedades que Radix le pasa al disparador (el compartido las descarta y el menú no abre).
 * Se pide corregirlo en `src/ui` (informe B3, "Pedidos de cambio compartido").
 */
export const BotonMas = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(function BotonMas({ 'aria-label': etiqueta, ...resto }, ref) {
  return (
    <button ref={ref} type="button" aria-label={etiqueta ?? 'Más acciones'} className="inline-flex size-7 items-center justify-center text-ink hover:bg-surface-2 data-[state=open]:bg-selected" {...resto}>
      <Icono icono={MoreHorizontal} tamano={16} />
    </button>
  );
});

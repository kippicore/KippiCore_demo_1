import { MoreHorizontal } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Icono } from '@/ui';

/**
 * Disparador del menú de acciones de una fila. Igual que `BotonAccionesFila` de la tabla, pero reenvía las props y
 * la referencia que Radix necesita para abrir el menú (el compartido solo pasa `onClick` y `aria-label`).
 */
export const BotonFila = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(function BotonFila(props, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className="inline-flex size-7 items-center justify-center text-ink hover:bg-surface-2 data-[state=open]:bg-selected"
      {...props}
    >
      <Icono icono={MoreHorizontal} tamano={16} />
    </button>
  );
});

import type { ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import { HojaLigera } from '@/ui/movil/Movil';

/**
 * `HojaLigera` montada en `document.body`. El contenedor de cada pantalla de /app (en el layout) anima su aparición con
 * `animate-fade-in` y esa animación deja un contexto de apilamiento: una hoja `fixed` dentro de él queda DEBAJO de la
 * barra de pestañas (que es hermana y va por encima) y la barra tapa el botón del pie ("Marcar revisado", "Anular
 * venta"). En el cuerpo del documento la hoja cubre toda la pantalla, también la barra. Los tokens (tema oscuro) viven
 * en `<html>`, así que la hoja se ve igual.
 */
export function HojaApp(props: ComponentProps<typeof HojaLigera>) {
  if (!props.abierta || typeof document === 'undefined') return null;
  return createPortal(<HojaLigera {...props} />, document.body);
}

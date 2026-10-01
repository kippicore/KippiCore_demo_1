import type { FocusEvent } from 'react';

/** Al enfocar un campo numérico se selecciona todo (el campo cambia de "199.900" a "199900" al enfocarse). */
export function seleccionarTodo(ev: FocusEvent<HTMLInputElement>) {
  const el = ev.currentTarget;
  requestAnimationFrame(() => el.select());
}

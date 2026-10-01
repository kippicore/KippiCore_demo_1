import { createStore, useStore } from 'zustand';

/**
 * Estado efímero del panel "Prueba esto" que no merece persistirse (PLAN 2.4): en la vista de un rol que no es el
 * dueño el panel arranca como píldora para no tapar botones; `abiertoEnRol` recuerda que la persona lo abrió a mano
 * mientras dure ese rol. `GuiaFlotante` lo apaga cada vez que cambia el rol.
 */
export const almacenPanelLocal = createStore<{ abiertoEnRol: boolean }>()(() => ({ abiertoEnRol: false }));

export function useAbiertoEnRol(): boolean {
  return useStore(almacenPanelLocal, (s) => s.abiertoEnRol);
}

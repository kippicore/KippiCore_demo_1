import type { ComponentType } from 'react';

/**
 * Carga diferida con reintento (PLAN 5.14, R3): si falla la carga de un chunk (la pestaña estaba abierta durante
 * un redespliegue y el archivo ya no existe), recarga la página UNA vez (bandera en sessionStorage).
 */
const BANDERA = 'kc:recargado-por-chunk';

export type CargadorPagina = () => Promise<{ default: ComponentType }>;

export function lazyConReintento(cargar: CargadorPagina): () => Promise<{ Component: ComponentType }> {
  return async () => {
    try {
      const m = await cargar();
      try {
        sessionStorage.removeItem(BANDERA);
      } catch {
        // sin sessionStorage
      }
      return { Component: m.default };
    } catch (e) {
      let yaRecargo = false;
      try {
        yaRecargo = sessionStorage.getItem(BANDERA) === '1';
        if (!yaRecargo) sessionStorage.setItem(BANDERA, '1');
      } catch {
        yaRecargo = true;
      }
      if (!yaRecargo) {
        window.location.reload();
        // La recarga reemplaza la página; mientras tanto no se resuelve.
        return new Promise(() => {});
      }
      throw e;
    }
  };
}

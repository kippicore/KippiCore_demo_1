import { createStore, useStore } from 'zustand';
import { clave, escribirJson, leerJson } from './almacen';

/**
 * Store `useGuia` (PLAN 2.4, 2.5, 5.6.5): progreso de la bienvenida, "Prueba esto" y pistas. Persistido; NO se
 * borra al restaurar (el cliente no tiene por qué repetir la bienvenida, 5.6.9). E2 (guía) es quien marca los
 * ítems escuchando los eventos (6.18); los paquetes colocan las anclas `<Pista id>`.
 */
export interface DatosGuia {
  bienvenidaVista: boolean;
  /** Ids de "Prueba esto" y "Para ir más lejos" completados (config/textos/guia.ts). */
  completados: string[];
  /** Ids del catálogo PISTAS (src/app/rutas.ts) ya vistas. */
  pistasVistas: string[];
  /** "Ocultar pistas" del menú "?". */
  pistasOcultas: boolean;
  panelMinimizado: boolean;
  /** Primera visita registrada (para "Continuar como dueño · Ibas en: …"). */
  visitas: number;
}

export interface EstadoGuia extends DatosGuia {
  marcarBienvenida: () => void;
  completar: (id: string) => void;
  marcarPistaVista: (id: string) => void;
  ocultarPistas: (ocultas: boolean) => void;
  minimizarPanel: (minimizado: boolean) => void;
  contarVisita: () => void;
}

const INICIAL: DatosGuia = {
  bienvenidaVista: false,
  completados: [],
  pistasVistas: [],
  pistasOcultas: false,
  panelMinimizado: false,
  visitas: 0,
};

export const almacenGuia = createStore<EstadoGuia>()((set, get) => {
  const cambiar = (p: Partial<DatosGuia>) => {
    set(p);
    const s = get();
    const datos: DatosGuia = {
      bienvenidaVista: s.bienvenidaVista,
      completados: s.completados,
      pistasVistas: s.pistasVistas,
      pistasOcultas: s.pistasOcultas,
      panelMinimizado: s.panelMinimizado,
      visitas: s.visitas,
    };
    escribirJson(clave('guia'), datos);
  };
  return {
    ...INICIAL,
    ...(leerJson<Partial<DatosGuia>>(clave('guia')) ?? {}),
    marcarBienvenida: () => cambiar({ bienvenidaVista: true }),
    completar: (id) => {
      if (!get().completados.includes(id)) cambiar({ completados: [...get().completados, id] });
    },
    marcarPistaVista: (id) => {
      if (!get().pistasVistas.includes(id)) cambiar({ pistasVistas: [...get().pistasVistas, id] });
    },
    ocultarPistas: (pistasOcultas) => cambiar({ pistasOcultas }),
    minimizarPanel: (panelMinimizado) => cambiar({ panelMinimizado }),
    contarVisita: () => cambiar({ visitas: get().visitas + 1 }),
  };
});

export function useGuia<T>(selector: (s: EstadoGuia) => T): T {
  return useStore(almacenGuia, selector);
}

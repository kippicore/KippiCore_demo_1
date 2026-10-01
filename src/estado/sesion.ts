import { createStore, useStore } from 'zustand';
import type { Id, MarcaPersonalizada, Moneda, Rol } from '@/dominio/tipos';
import { clave, escribirJson, escribirSesion, leerJson, leerSesion } from './almacen';
import { registrarAlRestaurar } from './datos';

/**
 * Store `useSesion` (PLAN 5.6.5, 5.8): estado de interfaz que NO es dominio y no va al registro: rol, local,
 * tema, última ruta, marca personalizada, alertas descartadas, notificaciones leídas y cierres revisados en la
 * vista (localStorage, con respaldo en memoria) y la moneda de visualización (sessionStorage: vuelve a COP en la
 * siguiente visita).
 */
export type Tema = 'claro' | 'oscuro' | 'sistema';

export interface DatosSesion {
  rol: Rol;
  localId: Id | 'todos';
  tema: Tema;
  ultimaRuta: string | null;
  marcaPersonalizada: MarcaPersonalizada;
  alertasDescartadas: string[];
  notificacionesLeidas: string[];
  cierresRevisadosVista: string[];
}

export interface EstadoSesion extends DatosSesion {
  moneda: Moneda;
  /** Cambia el rol activo; el vendedor queda fijo en su local (5.8). */
  cambiarRol: (rol: Rol, localFijo?: Id | null) => void;
  cambiarLocal: (localId: Id | 'todos') => void;
  cambiarMoneda: (moneda: Moneda) => void;
  cambiarTema: (tema: Tema) => void;
  recordarRuta: (ruta: string) => void;
  personalizarMarca: (m: MarcaPersonalizada) => void;
  descartarAlerta: (id: string) => void;
  marcarNotificacionLeida: (id: string) => void;
  marcarCierreVisto: (sesionId: string) => void;
  /** Restaurar (5.6.9): dueño · todos los locales · COP; conserva la marca personalizada. */
  reiniciar: () => void;
}

const INICIAL: DatosSesion = {
  rol: 'dueno',
  localId: 'todos',
  tema: 'sistema',
  ultimaRuta: null,
  marcaPersonalizada: { nombreNegocio: null, nombrePersona: null },
  alertasDescartadas: [],
  notificacionesLeidas: [],
  cierresRevisadosVista: [],
};

function cargarSesion(): DatosSesion {
  const g = leerJson<Partial<DatosSesion>>(clave('sesion'));
  return { ...INICIAL, ...(g ?? {}) };
}

function cargarMoneda(): Moneda {
  const m = leerSesion(clave('sesion-moneda'));
  return m === 'USD' || m === 'CNY' ? m : 'COP';
}

export const almacenSesion = createStore<EstadoSesion>()((set, get) => {
  const guardar = () => {
    const s = get();
    const datos: DatosSesion = {
      rol: s.rol,
      localId: s.localId,
      tema: s.tema,
      ultimaRuta: s.ultimaRuta,
      marcaPersonalizada: s.marcaPersonalizada,
      alertasDescartadas: s.alertasDescartadas,
      notificacionesLeidas: s.notificacionesLeidas,
      cierresRevisadosVista: s.cierresRevisadosVista,
    };
    escribirJson(clave('sesion'), datos);
  };
  const cambiar = (parcial: Partial<EstadoSesion>) => {
    set(parcial);
    guardar();
  };
  return {
    ...cargarSesion(),
    moneda: cargarMoneda(),
    cambiarRol: (rol, localFijo) =>
      cambiar({ rol, localId: rol === 'dueno' ? 'todos' : (localFijo ?? get().localId) }),
    cambiarLocal: (localId) => cambiar({ localId }),
    cambiarMoneda: (moneda) => {
      escribirSesion(clave('sesion-moneda'), moneda);
      set({ moneda });
    },
    cambiarTema: (tema) => cambiar({ tema }),
    recordarRuta: (ultimaRuta) => cambiar({ ultimaRuta }),
    personalizarMarca: (marcaPersonalizada) => cambiar({ marcaPersonalizada }),
    descartarAlerta: (id) => {
      if (!get().alertasDescartadas.includes(id)) cambiar({ alertasDescartadas: [...get().alertasDescartadas, id] });
    },
    marcarNotificacionLeida: (id) => {
      if (!get().notificacionesLeidas.includes(id))
        cambiar({ notificacionesLeidas: [...get().notificacionesLeidas, id] });
    },
    marcarCierreVisto: (id) => {
      if (!get().cierresRevisadosVista.includes(id))
        cambiar({ cierresRevisadosVista: [...get().cierresRevisadosVista, id] });
    },
    reiniciar: () => {
      escribirSesion(clave('sesion-moneda'), 'COP');
      cambiar({
        ...INICIAL,
        marcaPersonalizada: get().marcaPersonalizada,
        tema: get().tema,
        moneda: 'COP',
      });
    },
  };
});

registrarAlRestaurar(() => almacenSesion.getState().reiniciar());

export function useSesion<T>(selector: (s: EstadoSesion) => T): T {
  return useStore(almacenSesion, selector);
}

import { createContext, useContext } from 'react';
import type { FechaISO, Id } from '@/dominio/tipos';
import type { EventoAgenda } from '../tipos';

/** Lo que comparten las vistas del calendario sin pasarlo por cada nivel. */
export interface ContextoCalendario {
  hoy: FechaISO;
  /** Nombre de un local ("Usaquén"), o null si el evento es de toda la empresa. */
  nombreLocal: (id: Id | null) => string | null;
  /** Código corto ("USQ") para las fichas angostas. */
  codigoLocal: (id: Id | null) => string | null;
  /** Id de la agenda del evento que se destella (`?resaltar=`). */
  resaltadoId: string | null;
  abrir: (ev: EventoAgenda) => void;
  abrirDia: (fecha: FechaISO) => void;
  crearEn: (fecha: FechaISO) => void;
}

const Ctx = createContext<ContextoCalendario | null>(null);

export const ProveedorCalendario = Ctx.Provider;

export function useContextoCalendario(): ContextoCalendario {
  const c = useContext(Ctx);
  if (!c) throw new Error('useContextoCalendario fuera de ProveedorCalendario');
  return c;
}

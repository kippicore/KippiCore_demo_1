import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { INICIO_POR_ROL } from '@/config/navegacion';
import { useRolActivo } from '@/estado';
import { type NombreRuta, rolPuedeVer, RUTAS } from './rutas';

/** Aviso que lleva la redirección de una guarda de rol (el layout lo muestra como toast). */
export const AVISO_SOLO_DUENO = 'Esta sección es solo para el dueño.';

/**
 * Guarda de rol (PLAN 5.5): si el rol activo no ve la ruta, redirige a su inicio con un aviso. Al cambiar a un
 * rol que no ve la ruta actual, también navega a su inicio (5.8).
 */
export function GuardaRol({ ruta, children }: { ruta: NombreRuta; children: ReactNode }) {
  const rol = useRolActivo();
  const { pathname } = useLocation();
  const permitido = rolPuedeVer(ruta, rol);
  useEffect(() => {
    if (!permitido) console.info(`Ruta ${RUTAS[ruta].patron} no disponible para el rol ${rol}: ${pathname}`);
  }, [permitido, ruta, rol, pathname]);
  if (!permitido) {
    const solo = RUTAS[ruta].acceso.length === 1 && RUTAS[ruta].acceso[0] === 'dueno';
    return (
      <Navigate
        to={INICIO_POR_ROL[rol]}
        replace
        state={{ aviso: solo ? AVISO_SOLO_DUENO : 'Esta sección no está disponible para tu rol.' }}
      />
    );
  }
  return <>{children}</>;
}

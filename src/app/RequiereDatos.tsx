import type { ReactNode } from 'react';
import { Outlet } from 'react-router';
import { useDatos } from '@/estado';
import { CargaDatos } from './CargaDatos';

/** Muestra el contenido solo cuando el estado ya existe (una reconstrucción deja visible el estado anterior). */
export function RequiereDatos({ children, compacta }: { children?: ReactNode; compacta?: boolean }) {
  const hayEstado = useDatos((s) => s.estado !== null);
  if (!hayEstado) return <CargaDatos compacta={compacta} />;
  return <>{children ?? <Outlet />}</>;
}

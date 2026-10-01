import { useEffect, type ReactNode } from 'react';
import { datosAdoptados, emitirUI } from '@/estado';
import { EncabezadoMovil } from '@/ui/movil/Movil';
import { cn } from '@/ui/ligero';
import { ControlesEncabezado } from './Controles';
import './eventoInstalacion';

/** `app_abierta` se emite UNA vez por carga (al montar cualquier pantalla de /app) y nunca dentro de un marco (`?marco=1`). */
let appAbiertaEmitida = false;
function useAppAbierta(): void {
  useEffect(() => {
    if (appAbiertaEmitida || datosAdoptados) return;
    appAbiertaEmitida = true;
    emitirUI('app_abierta');
  }, []);
}

/**
 * Esqueleto de toda pantalla de la app del dueño (PLAN 8.5.2): `EncabezadoMovil` (grande al cargar y compacto al
 * desplazar), con el local y la moneda a la derecha en las pestañas y "‹ Anterior" en los detalles; y debajo, el
 * contenido en columna con `px-4` y `gap-3`. Conserva el `data-testid` de la pantalla.
 */
export function Pantalla({
  titulo,
  fecha,
  volver,
  chip,
  controles = !volver,
  testid,
  children,
  className,
}: {
  titulo: string;
  fecha?: ReactNode;
  volver?: { a: string; texto: string };
  chip?: ReactNode;
  controles?: boolean;
  testid: string;
  children: ReactNode;
  className?: string;
}) {
  useAppAbierta();
  return (
    <section data-testid={testid} className="pb-6">
      <EncabezadoMovil titulo={titulo} fecha={fecha} volver={volver} chip={chip} derecha={controles ? <ControlesEncabezado /> : undefined} />
      <div className={cn('mt-5 flex flex-col gap-3 px-4', className)}>{children}</div>
    </section>
  );
}

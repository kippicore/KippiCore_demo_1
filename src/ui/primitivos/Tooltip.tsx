import * as RT from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import { cn } from '../cn';

/**
 * Tooltip (PLAN 8.7.17): `bg-ink text-inverse`, t-small 500, radio 0, máx. 240 px, flecha de 6 px, retardo
 * 300 ms. Solo nombres de íconos, cifras completas, definiciones y motivos de deshabilitado; nunca acciones.
 *
 *   <Tooltip texto="Exportar a Excel"><Button soloIcono icono={Download} aria-label="Exportar a Excel" /></Tooltip>
 *
 * Funciona sin proveedor externo (cada tooltip trae el suyo); el layout de escritorio pone uno global para que
 * el segundo tooltip abra sin retardo.
 */
export function ProveedorTooltips({ children }: { children: ReactNode }) {
  return (
    <RT.Provider delayDuration={300} skipDelayDuration={300}>
      {children}
    </RT.Provider>
  );
}

export interface PropsTooltip {
  texto: ReactNode;
  children: ReactNode;
  lado?: 'top' | 'right' | 'bottom' | 'left';
  alinear?: 'start' | 'center' | 'end';
  /** Envuelve hijos deshabilitados en un span enfocable para que el motivo se pueda leer. */
  envolver?: boolean;
  className?: string;
}

export function Tooltip({ texto, children, lado = 'top', alinear = 'center', envolver, className }: PropsTooltip) {
  if (texto === null || texto === undefined || texto === '') return <>{children}</>;
  return (
    <RT.Provider delayDuration={300} skipDelayDuration={300}>
      <RT.Root>
        <RT.Trigger asChild>
          {envolver ? (
            // Un botón deshabilitado no recibe foco ni hover: el span lo hace por él (motivo de deshabilitado, 8.7).
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            <span tabIndex={0} className="inline-flex">
              {children}
            </span>
          ) : (
            children
          )}
        </RT.Trigger>
        <RT.Portal>
          <RT.Content
            side={lado}
            align={alinear}
            sideOffset={6}
            collisionPadding={8}
            className={cn(
              'z-(--z-tooltip) max-w-60 rounded-none bg-ink px-2 py-1.5 t-small font-medium text-inverse animate-fade-in',
              className,
            )}
          >
            {texto}
            <RT.Arrow width={12} height={6} className="fill-ink" />
          </RT.Content>
        </RT.Portal>
      </RT.Root>
    </RT.Provider>
  );
}

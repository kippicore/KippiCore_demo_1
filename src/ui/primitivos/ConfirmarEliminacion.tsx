import * as RA from '@radix-ui/react-alert-dialog';
import { useState, type ReactNode } from 'react';
import { clasesBoton } from './Button';
import { Input } from './Input';

/**
 * Confirmación de eliminar o anular (PLAN 8.7.31): AlertDialog `sm`. Título como pregunta concreta, consecuencias
 * con cifras, "Cancelar" (recibe el foco) y el verbo de la acción en el botón destructivo. Para "Restaurar datos"
 * se exige escribir la palabra (`palabraClave="RESTAURAR"`). Nunca "Aceptar" ni "Sí"; no existe "Deshacer".
 *
 *   <ConfirmarEliminacion abierto={a} alCambiar={setA}
 *     pregunta="¿Anular la venta V-000482?"
 *     consecuencias="Se devolverán 2 unidades al inventario de Usaquén y se restará $ 389.800 de las ventas de hoy."
 *     accion="Anular venta" alConfirmar={anular} />
 */
export interface PropsConfirmarEliminacion {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  pregunta: ReactNode;
  consecuencias: ReactNode;
  /** Verbo + objeto: "Eliminar gasto", "Anular venta". */
  accion: string;
  alConfirmar: () => void;
  /** Palabra que hay que escribir para habilitar el botón (Restaurar). */
  palabraClave?: string;
  /** Línea secundaria; por defecto la de restaurar los datos de demostración. */
  nota?: ReactNode | null;
  disparador?: ReactNode;
}

export function ConfirmarEliminacion({ abierto, alCambiar, pregunta, consecuencias, accion, alConfirmar, palabraClave, nota, disparador }: PropsConfirmarEliminacion) {
  const [escrito, setEscrito] = useState('');
  const habilitado = !palabraClave || escrito.trim().toUpperCase() === palabraClave;
  return (
    <RA.Root
      open={abierto}
      onOpenChange={(v) => {
        if (!v) setEscrito('');
        alCambiar(v);
      }}
    >
      {disparador && <RA.Trigger asChild>{disparador}</RA.Trigger>}
      <RA.Portal>
        <RA.Overlay className="fixed inset-0 z-(--z-modal) bg-overlay animate-fade-in" />
        <RA.Content className="fixed left-1/2 top-1/2 z-(--z-modal) w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-none bg-surface text-ink outline-none">
          <div className="animate-dialog-in">
            <div className="p-6">
              <RA.Title className="t-h2 text-ink">{pregunta}</RA.Title>
              <RA.Description className="mt-3 t-body text-muted">{consecuencias}</RA.Description>
              {nota !== null && (
                <p className="mt-2 t-small text-muted">
                  {nota ?? 'Si te equivocas, puedes restaurar los datos de demostración en Configuración.'}
                </p>
              )}
              {palabraClave && (
                <div className="mt-5">
                  <Input
                    etiqueta={`Escribe ${palabraClave} para confirmar`}
                    value={escrito}
                    onChange={(e) => setEscrito(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
              <RA.Cancel className={clasesBoton({ variante: 'secondary' })}>Cancelar</RA.Cancel>
              <RA.Action
                className={clasesBoton({ variante: 'destructive' })}
                disabled={!habilitado}
                onClick={(e) => {
                  if (!habilitado) {
                    e.preventDefault();
                    return;
                  }
                  alConfirmar();
                }}
              >
                {accion}
              </RA.Action>
            </div>
          </div>
        </RA.Content>
      </RA.Portal>
    </RA.Root>
  );
}

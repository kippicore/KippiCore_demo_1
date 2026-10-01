import * as RD from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '../cn';
import { Icono } from './Icono';

/**
 * Modal (PLAN 8.7.14). Overlay sin desenfoque, contenido `bg-surface`, radio 0, SIN sombra, máx. 88 dvh con scroll
 * en el cuerpo. Anchos sm 440 · md 600 · lg 800 · xl 1040. Cabecera (eyebrow + t-h2 + cerrar), cuerpo y pie con
 * botones a la derecha (secundario, luego primario). Nunca modales anidados.
 *
 *   <Dialog abierto={a} alCambiar={setA} titulo="Nuevo gasto" eyebrow="Costos y gastos"
 *     pie={<><Button variante="secondary" onClick={cerrar}>Cancelar</Button><Button>Guardar gasto</Button></>}>
 *     …campos…
 *   </Dialog>
 *
 * `confirmarAlCerrar`: si hay cambios sin guardar, Esc y la X preguntan "¿Descartar los cambios?".
 */
export type AnchoDialog = 'sm' | 'md' | 'lg' | 'xl';
const ANCHOS: Record<AnchoDialog, string> = {
  sm: 'w-[min(440px,calc(100vw-32px))]',
  md: 'w-[min(600px,calc(100vw-32px))]',
  lg: 'w-[min(800px,calc(100vw-32px))]',
  xl: 'w-[min(1040px,calc(100vw-32px))]',
};

export interface PropsDialog {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  titulo: ReactNode;
  eyebrow?: ReactNode;
  descripcion?: ReactNode;
  children?: ReactNode;
  pie?: ReactNode;
  ancho?: AnchoDialog;
  /** Pregunta antes de cerrar si hay cambios sin guardar. */
  confirmarAlCerrar?: boolean;
  /** Disparador opcional (si el modal no se controla desde fuera). */
  disparador?: ReactNode;
  'data-testid'?: string;
  /** Sin padding en el cuerpo (contenidos a sangre, p. ej. vista de factura). */
  cuerpoSinPadding?: boolean;
}

export function Dialog({ abierto, alCambiar, titulo, eyebrow, descripcion, children, pie, ancho = 'md', confirmarAlCerrar, disparador, cuerpoSinPadding, ...resto }: PropsDialog) {
  const [preguntando, setPreguntando] = useState(false);
  const pedirCierre = (v: boolean) => {
    if (!v && confirmarAlCerrar) {
      setPreguntando(true);
      return;
    }
    alCambiar(v);
  };
  return (
    <RD.Root open={abierto} onOpenChange={pedirCierre}>
      {disparador && <RD.Trigger asChild>{disparador}</RD.Trigger>}
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-(--z-modal) bg-overlay animate-fade-in" />
        <RD.Content
          data-testid={resto['data-testid']}
          className={cn(
            'fixed left-1/2 top-1/2 z-(--z-modal) flex max-h-[88dvh] -translate-x-1/2 -translate-y-1/2 flex-col rounded-none bg-surface text-ink outline-none',
            ANCHOS[ancho],
          )}
        >
          <div className="flex flex-col animate-dialog-in max-h-[88dvh]">
            <div className="flex items-start gap-4 p-6 pb-4">
              <div className="min-w-0 flex-1">
                {eyebrow && <p className="mb-1.5 t-eyebrow text-ink-2">{eyebrow}</p>}
                <RD.Title className="t-h2 text-ink">{titulo}</RD.Title>
                {descripcion ? (
                  <RD.Description className="mt-2 max-w-[72ch] t-body text-muted">{descripcion}</RD.Description>
                ) : (
                  <RD.Description className="sr-only">{typeof titulo === 'string' ? titulo : ''}</RD.Description>
                )}
              </div>
              <RD.Close
                aria-label="Cerrar"
                className="-mr-2 -mt-1 inline-flex size-8 items-center justify-center text-ink transition-colors duration-(--dur-instant) hover:bg-surface-2"
              >
                <Icono icono={X} tamano={18} />
              </RD.Close>
            </div>
            <div className={cn('min-h-0 flex-1 overflow-y-auto', cuerpoSinPadding ? '' : 'px-6 pb-6')}>{children}</div>
            {pie && <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">{pie}</div>}
            {preguntando && (
              <div role="alertdialog" aria-label="¿Descartar los cambios?" className="flex items-center justify-between gap-4 border-t border-ink bg-surface-2 px-6 py-4">
                <p className="t-body text-ink">¿Descartar los cambios?</p>
                <div className="flex gap-2">
                  <button type="button" className="h-8 px-3 t-nav text-ink hover:bg-selected" onClick={() => setPreguntando(false)}>
                    Seguir editando
                  </button>
                  <button
                    type="button"
                    className="h-8 bg-ink px-3 t-button-sm text-inverse hover:bg-ink/85"
                    onClick={() => {
                      setPreguntando(false);
                      alCambiar(false);
                    }}
                  >
                    Descartar cambios
                  </button>
                </div>
              </div>
            )}
          </div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

export const CerrarDialog = RD.Close;

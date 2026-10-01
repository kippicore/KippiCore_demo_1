import * as RD from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cn } from '../cn';

/**
 * Hoja inferior de la app móvil (PLAN 8.5.4): en `/app` los modales SON hojas. Esquinas superiores de 12 px, asa de
 * 36 × 4 centrada, máx. 88 dvh, entrada 280 ms desde abajo, respeta el área segura inferior.
 * Importa Radix: en `/app` cárgala diferida (`lazy`) para no sumar peso al arranque (ver CONTRATOS, rendimiento).
 *
 *   <HojaInferior abierto={a} alCambiar={setA} titulo="Cierre de Zona Rosa"
 *     pie={<Button anchoCompleto tamano="lg">Marcar revisado</Button>}>…</HojaInferior>
 */
export interface PropsHojaInferior {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  titulo: ReactNode;
  eyebrow?: ReactNode;
  children?: ReactNode;
  pie?: ReactNode;
  'data-testid'?: string;
}

export function HojaInferior({ abierto, alCambiar, titulo, eyebrow, children, pie, ...resto }: PropsHojaInferior) {
  return (
    <RD.Root open={abierto} onOpenChange={alCambiar}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-(--z-modal) bg-overlay animate-fade-in" />
        <RD.Content
          data-testid={resto['data-testid']}
          className={cn(
            'fixed inset-x-0 bottom-0 z-(--z-modal) mx-auto flex max-h-[88dvh] w-full max-w-[480px] flex-col rounded-t-sheet bg-surface text-ink outline-none animate-sheet-up',
            'pb-[env(safe-area-inset-bottom)]',
          )}
        >
          <div aria-hidden className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-line-strong" />
          <div className="px-4 pb-3 pt-4">
            {eyebrow && <p className="mb-1 t-eyebrow text-ink-2">{eyebrow}</p>}
            <RD.Title className="t-h3 font-bold uppercase text-ink">{titulo}</RD.Title>
            <RD.Description className="sr-only">{typeof titulo === 'string' ? titulo : 'Detalle'}</RD.Description>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
          {pie && <div className="border-t border-line px-4 py-3">{pie}</div>}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

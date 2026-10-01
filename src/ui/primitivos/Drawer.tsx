import * as RD from '@radix-ui/react-dialog';
import { ChevronDown, ChevronUp, X, type LucideIcon } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { cn } from '../cn';
import { Icono } from './Icono';

/**
 * Cajón lateral de detalle (PLAN 8.7.15): desde la derecha, 520 (o 720 con `ancho="lg"`), alto completo,
 * `bg-surface border-l`, overlay a la mitad de opacidad (la tabla sigue visible). Cabecera fija con eyebrow del tipo,
 * título t-h2 (el identificador), insignia y acciones; cuerpo con scroll (`space-y-8`); pie fijo opcional.
 * La URL cambia al abrir (lo hace la página: `/panel/ventas/V-000482`); cerrar vuelve a la lista.
 *
 *   <Drawer abierto alCambiar={cerrar} eyebrow="Venta" titulo="V-000482" insignia={<Badge tono="success">Pagada</Badge>}
 *     acciones={[{ icono: Printer, etiqueta: 'Imprimir', onClick }]} alAnterior={…} alSiguiente={…}>
 *     <ParesDatos pares={[['Cliente', 'Andrés Gutiérrez'], ['Local', 'Usaquén']]} />
 *   </Drawer>
 */
export interface AccionCajon {
  icono: LucideIcon;
  etiqueta: string;
  onClick: () => void;
}

export interface PropsDrawer {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  titulo: ReactNode;
  eyebrow?: ReactNode;
  insignia?: ReactNode;
  acciones?: AccionCajon[];
  /** Pestañas subrayadas bajo la cabecera (Resumen · Líneas · Pagos · Historial). */
  pestanas?: ReactNode;
  children?: ReactNode;
  pie?: ReactNode;
  ancho?: 'md' | 'lg';
  alAnterior?: () => void;
  alSiguiente?: () => void;
  'data-testid'?: string;
}

const BOTON_ICONO =
  'inline-flex size-8 items-center justify-center text-ink transition-colors duration-(--dur-instant) hover:bg-surface-2 disabled:text-disabled';

export function Drawer({ abierto, alCambiar, titulo, eyebrow, insignia, acciones = [], pestanas, children, pie, ancho = 'md', alAnterior, alSiguiente, ...resto }: PropsDrawer) {
  useEffect(() => {
    if (!abierto || (!alAnterior && !alSiguiente)) return;
    const tecla = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === 'ArrowUp' && alAnterior) {
        e.preventDefault();
        alAnterior();
      }
      if (e.key === 'ArrowDown' && alSiguiente) {
        e.preventDefault();
        alSiguiente();
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [abierto, alAnterior, alSiguiente]);
  return (
    <RD.Root open={abierto} onOpenChange={alCambiar}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-(--z-drawer) bg-overlay opacity-50 animate-fade-in" />
        <RD.Content
          data-testid={resto['data-testid']}
          className={cn(
            'fixed inset-y-0 right-0 z-(--z-drawer) flex max-w-[100vw] flex-col rounded-none border-l border-line bg-surface text-ink outline-none animate-drawer-in',
            ancho === 'lg' ? 'w-(--drawer-w-lg)' : 'w-(--drawer-w)',
          )}
        >
          <header className="border-b border-line px-6 pt-6">
            <div className="flex items-start gap-3 pb-5">
              <div className="min-w-0 flex-1">
                {eyebrow && <p className="mb-1.5 t-eyebrow text-ink-2">{eyebrow}</p>}
                <div className="flex flex-wrap items-center gap-3">
                  <RD.Title className="t-h2 text-ink">{titulo}</RD.Title>
                  {insignia}
                </div>
                <RD.Description className="sr-only">Detalle</RD.Description>
              </div>
              <div className="-mr-2 flex items-center">
                {(alAnterior || alSiguiente) && (
                  <>
                    <button type="button" aria-label="Anterior" title="Anterior" className={BOTON_ICONO} disabled={!alAnterior} onClick={alAnterior}>
                      <Icono icono={ChevronUp} tamano={16} />
                    </button>
                    <button type="button" aria-label="Siguiente" title="Siguiente" className={BOTON_ICONO} disabled={!alSiguiente} onClick={alSiguiente}>
                      <Icono icono={ChevronDown} tamano={16} />
                    </button>
                  </>
                )}
                {acciones.map((a) => (
                  <button key={a.etiqueta} type="button" aria-label={a.etiqueta} title={a.etiqueta} className={BOTON_ICONO} onClick={a.onClick}>
                    <Icono icono={a.icono} tamano={16} />
                  </button>
                ))}
                <RD.Close aria-label="Cerrar" title="Cerrar" className={BOTON_ICONO}>
                  <Icono icono={X} tamano={18} />
                </RD.Close>
              </div>
            </div>
            {pestanas}
          </header>
          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-6">{children}</div>
          {pie && <footer className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">{pie}</footer>}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

/** Pares etiqueta / valor en rejilla de 2 columnas (cuerpo del cajón y fichas). */
export function ParesDatos({ pares, columnas = 2 }: { pares: readonly (readonly [ReactNode, ReactNode])[]; columnas?: 1 | 2 | 3 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', columnas === 1 ? 'grid-cols-1' : columnas === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
      {pares.map(([etiqueta, valor], i) => (
        <div key={i} className="min-w-0">
          <dt className="t-small text-muted">{etiqueta}</dt>
          <dd className="mt-0.5 t-body text-ink">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

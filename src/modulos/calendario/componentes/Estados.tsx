import { TriangleAlert } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, EmptyState, Skeleton, cn } from '@/ui';
import { TEXTOS } from '../textos';

/** Si un cálculo falla, el calendario muestra un estado de error diseñado en vez de quedarse en blanco. */
export class LimiteError extends Component<{ children: ReactNode }, { fallo: boolean }> {
  override state = { fallo: false };

  static getDerivedStateFromError(): { fallo: boolean } {
    return { fallo: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[C3] No se pudo mostrar el calendario', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.fallo) return this.props.children;
    return (
      <div className="mt-6 border border-line bg-surface" data-testid="calendario-error">
        <EmptyState
          icono={TriangleAlert}
          titulo={TEXTOS.errorTitulo}
          texto={TEXTOS.errorTexto}
          accion={
            <Button variante="secondary" onClick={() => this.setState({ fallo: false })}>
              Intentar de nuevo
            </Button>
          }
        />
      </div>
    );
  }
}

/** Esqueleto de la cuadrícula mientras se arma un período nuevo (solo si tarda más de 300 ms). */
export function EsqueletoCalendario({ semanas = 5, className }: { semanas?: number; className?: string }) {
  return (
    <div className={cn('border-l border-t border-line-soft bg-surface', className)} aria-hidden data-testid="calendario-esqueleto">
      {Array.from({ length: semanas }, (_, s) => (
        <div key={s} className="grid grid-cols-7">
          {Array.from({ length: 7 }, (_, d) => (
            <div key={d} className="flex min-h-[116px] flex-col gap-1.5 border-b border-r border-line-soft p-2">
              <Skeleton className="h-4 w-5" />
              {(s + d) % 3 !== 0 && <Skeleton className="h-6 w-full" />}
              {(s + d) % 4 === 1 && <Skeleton className="h-6 w-4/5" />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

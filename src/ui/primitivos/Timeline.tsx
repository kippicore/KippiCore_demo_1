import type { ReactNode } from 'react';
import { ESTADOS_IMPORTACION, type EstadoImportacion } from '@/dominio/tipos';
import { ETIQUETAS_ESTADO_IMPORTACION, FASES_IMPORTACION } from '@/config/aduanas';
import { cn } from '../cn';

/**
 * Línea de tiempo (PLAN 8.7.21): 13 estados de importación en 5 fases.
 *
 * Vertical (detalle): nodos de 10 px (hecho `ink`, actual anillo de 14 px con punto camel que pulsa, pendiente con
 * borde, retrasado anillo `danger`), conector de 1 px (hecho `ink`, pendiente punteado), títulos de fase eyebrow.
 *
 *   <Timeline pasos={[{ id: 'en_puerto', titulo: 'En puerto colombiano', estado: 'actual', fase: 'Viaje',
 *     detalle: 'Estimada 12/10/2026 · Real 14/10/2026', insignia: <Badge tono="danger" tamano="sm">Retraso de 2 días</Badge>,
 *     autor: 'Actualizado por Agencia de Aduanas · portal de seguimiento' }]} />
 *
 * Horizontal compacta (tarjetas, kanban, portal): 13 segmentos de 4 px, hechos ink, actual camel, pendientes line.
 *
 *   <TimelineCompacta estado="en_puerto" />
 */
export type EstadoPaso = 'hecho' | 'actual' | 'pendiente' | 'retrasado';

export interface PasoTimeline {
  id: string;
  titulo: ReactNode;
  estado: EstadoPaso;
  /** Título de fase que se intercala antes de este paso (si cambia). */
  fase?: string;
  detalle?: ReactNode;
  insignia?: ReactNode;
  autor?: ReactNode;
}

function Nodo({ estado }: { estado: EstadoPaso }) {
  if (estado === 'actual')
    return (
      <span className="relative inline-flex size-3.5 items-center justify-center rounded-full ring-2 ring-ink ring-inset">
        <span className="relative size-1.5 rounded-full bg-accent">
          <span aria-hidden className="absolute inset-0 rounded-full bg-accent animate-hint" />
        </span>
      </span>
    );
  if (estado === 'retrasado') return <span className="inline-flex size-3.5 rounded-full ring-2 ring-danger ring-inset" />;
  if (estado === 'hecho') return <span className="inline-flex size-2.5 rounded-full bg-ink" />;
  return <span className="inline-flex size-2.5 rounded-full border border-line-strong bg-surface" />;
}

export function Timeline({ pasos, className }: { pasos: readonly PasoTimeline[]; className?: string }) {
  let faseAnterior: string | undefined;
  return (
    <ol className={cn('relative', className)}>
      {pasos.map((p, i) => {
        const mostrarFase = p.fase && p.fase !== faseAnterior;
        faseAnterior = p.fase ?? faseAnterior;
        const siguiente = pasos[i + 1];
        const tramoHecho = p.estado === 'hecho' && siguiente && siguiente.estado !== 'pendiente';
        return (
          <li key={p.id} className="relative">
            {mostrarFase && <p className={cn('pl-9 t-eyebrow text-ink-2', i > 0 ? 'pt-4 pb-2' : 'pb-2')}>{p.fase}</p>}
            <div className="relative flex gap-3 pb-5">
              <div className="relative flex w-6 shrink-0 justify-center pt-1">
                <Nodo estado={p.estado} />
                {siguiente && (
                  <span
                    aria-hidden
                    className={cn('absolute left-1/2 top-5 -bottom-1 w-px -translate-x-1/2', tramoHecho ? 'bg-ink' : 'border-l border-dashed border-line-strong')}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('t-body', p.estado === 'pendiente' ? 'font-semibold text-muted' : 'font-bold text-ink')}>{p.titulo}</span>
                  {p.insignia}
                </div>
                {p.detalle && <p className="mt-0.5 t-small num text-ink-2">{p.detalle}</p>}
                {p.autor && <p className="mt-0.5 t-micro text-ink-2">{p.autor}</p>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Pasos de la línea de tiempo de una importación a partir de su estado actual (las fechas las pone el módulo). */
export function pasosImportacion(actual: EstadoImportacion, opciones: { retrasado?: boolean; detalle?: (e: EstadoImportacion) => ReactNode } = {}): PasoTimeline[] {
  const iActual = ESTADOS_IMPORTACION.indexOf(actual);
  return ESTADOS_IMPORTACION.map((e, i) => ({
    id: e,
    titulo: ETIQUETAS_ESTADO_IMPORTACION[e],
    fase: FASES_IMPORTACION.find((f) => (f.estados as readonly string[]).includes(e))?.nombre,
    estado: i < iActual ? 'hecho' : i === iActual ? (opciones.retrasado ? 'retrasado' : 'actual') : 'pendiente',
    detalle: opciones.detalle?.(e),
  }));
}

export function TimelineCompacta({ estado, className, conTexto = true }: { estado: EstadoImportacion; className?: string; conTexto?: boolean }) {
  const i = ESTADOS_IMPORTACION.indexOf(estado);
  const fase = FASES_IMPORTACION.find((f) => (f.estados as readonly string[]).includes(estado))?.nombre ?? '';
  return (
    <div className={className}>
      <div className="flex gap-0.5" role="img" aria-label={`${ETIQUETAS_ESTADO_IMPORTACION[estado]} · paso ${i + 1} de ${ESTADOS_IMPORTACION.length}`}>
        {ESTADOS_IMPORTACION.map((e, j) => (
          <span key={e} className={cn('h-1 flex-1', j < i ? 'bg-ink' : j === i ? 'bg-accent' : 'bg-line')} />
        ))}
      </div>
      {conTexto && (
        <p className="mt-2 flex items-baseline justify-between gap-2">
          <span className="t-label text-ink">{ETIQUETAS_ESTADO_IMPORTACION[estado]}</span>
          <span className="t-micro text-ink-2">{fase}</span>
        </p>
      )}
    </div>
  );
}

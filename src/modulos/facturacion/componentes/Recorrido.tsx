import { Check, LoaderCircle } from 'lucide-react';
import type { EstadoFactura, FechaHoraISO } from '@/dominio/tipos';
import { Card, cn, Fecha, Icono } from '@/ui';
import { pasosRecorrido } from '../calculos';
import { ESTADO_PASO, TEXTOS } from '../textos';

/**
 * Recorrido del documento ante la DIAN (simulación): generada → enviada → aceptada. El paso siguiente al actual
 * muestra un indicador girando mientras la transición automática corre; los alcanzados llevan su hora.
 */
export function Recorrido({
  estado,
  historial,
}: {
  estado: EstadoFactura;
  historial: readonly { estado: EstadoFactura; ts: FechaHoraISO }[];
}) {
  const pasos = pasosRecorrido(estado, historial);
  return (
    <Card titulo={TEXTOS.detalle.recorridoTitulo} padding="compacta" data-testid="factura-recorrido">
      <ol className="flex flex-col">
        {pasos.map((p, i) => (
          <li key={p.estado} className="relative flex gap-3 pb-5 last:pb-0" data-paso={p.estado} data-situacion={p.situacion}>
            {i < pasos.length - 1 && (
              <span
                aria-hidden
                className={cn('absolute left-[11px] top-6 h-[calc(100%-1.5rem)] w-px', p.situacion === 'hecho' && pasos[i + 1]?.situacion === 'hecho' ? 'bg-ink' : 'bg-line')}
              />
            )}
            <span
              className={cn(
                'relative z-1 mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border',
                p.situacion === 'hecho' && (p.estado === 'aceptada' ? 'border-success bg-success text-inverse' : 'border-ink bg-ink text-inverse'),
                p.situacion === 'en_curso' && 'border-ink bg-surface text-ink',
                p.situacion === 'pendiente' && 'border-line-strong bg-surface text-subtle',
              )}
            >
              {p.situacion === 'hecho' ? (
                <Icono icono={Check} tamano={14} />
              ) : p.situacion === 'en_curso' ? (
                <Icono icono={LoaderCircle} tamano={14} className="animate-spin" />
              ) : null}
            </span>
            <div className="min-w-0">
              <p className={cn('t-label', p.situacion === 'pendiente' ? 'text-muted' : 'text-ink')}>{ESTADO_PASO[p.estado].titulo}</p>
              <p className="t-small text-muted">
                {p.ts ? <Fecha valor={p.ts} formato="fechaHora" /> : p.situacion === 'en_curso' ? 'En proceso…' : ESTADO_PASO[p.estado].detalle}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 border-t border-line-soft pt-3 t-small text-muted">{TEXTOS.detalle.recorridoNota}</p>
    </Card>
  );
}

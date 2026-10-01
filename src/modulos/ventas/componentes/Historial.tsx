import { cn, Dinero, Fecha } from '@/ui';
import type { EventoHistorial, TipoEventoHistorial } from '../calculos';

const PUNTO: Record<TipoEventoHistorial, string> = {
  venta: 'bg-ink',
  pago: 'bg-success',
  abono: 'bg-success',
  reembolso: 'bg-warning',
  devolucion: 'bg-warning',
  factura: 'bg-ink-2',
  nota_credito: 'bg-ink-2',
  separado_completado: 'bg-success',
  separado_cancelado: 'bg-danger',
  anulacion: 'bg-danger',
};

/** Línea de tiempo vertical de la venta: qué pasó, cuándo y por cuánto. */
export function Historial({ eventos }: { eventos: readonly EventoHistorial[] }) {
  return (
    <ol className="relative flex flex-col" data-testid="historial-venta">
      {eventos.map((e, i) => (
        <li key={e.id} className="relative flex gap-4 pb-5 last:pb-0" data-tipo={e.tipo}>
          {i < eventos.length - 1 && (
            <span aria-hidden className="absolute left-[4px] top-3 h-full w-px bg-line" />
          )}
          <span
            aria-hidden
            className={cn('relative mt-1.5 size-[9px] shrink-0 rounded-full', PUNTO[e.tipo])}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="t-body font-semibold text-ink">{e.titulo}</p>
              {e.valor !== undefined && (
                <span className="shrink-0 t-body num text-ink">
                  {e.valor < 0 ? '−' : ''}
                  <Dinero valor={Math.abs(e.valor)} />
                </span>
              )}
            </div>
            <p className="t-small text-muted num">
              <Fecha valor={e.ts} formato="fechaHora" />
            </p>
            {e.detalle && <p className="mt-0.5 t-small text-ink-2">{e.detalle}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

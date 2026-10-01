import { useEffect, useState } from 'react';
import { Dinero, cn, prefiereMenosMovimiento } from '@/ui';
import { porcentaje } from '@/lib/formato';
import type { IdSegmento, SegmentoCosto } from '../calculos';

/**
 * Barra apilada del costo para el negocio (W6): salario, comisiones, recargos, auxilio, aportes y prestaciones.
 * Cada segmento crece con su valor (`flex-grow`), así al cambiar de modo o apagar la exoneración la barra se mueve en
 * vivo. Debajo, dos llaves: lo que ve la persona en su pago y lo que no está en el contrato. Solo tokens de color.
 */
const TEXTO: Record<IdSegmento, string> = {
  salario: 'text-inverse',
  comisiones: 'text-inverse',
  recargos: 'text-inverse',
  auxilio: 'text-inverse',
  aportes: 'text-ink',
  prestaciones: 'text-ink',
};

/** `true` cuando la barra ya puede mostrar sus valores (un instante después de montar, para que crezca). */
function useCrecer(): boolean {
  const [listo, setListo] = useState(() => prefiereMenosMovimiento());
  useEffect(() => {
    const id = window.setTimeout(() => setListo(true), 40);
    return () => window.clearTimeout(id);
  }, []);
  return listo;
}

export function BarraCosto({ segmentos, className }: { segmentos: readonly SegmentoCosto[]; className?: string }) {
  const listo = useCrecer();
  const visible = segmentos.filter((s) => s.grupo === 'visible').reduce((a, s) => a + s.valor, 0);
  const oculto = segmentos.filter((s) => s.grupo === 'oculto').reduce((a, s) => a + s.valor, 0);
  const total = visible + oculto;
  const resumen = segmentos.filter((s) => s.valor > 0).map((s) => `${s.etiqueta} ${porcentaje(s.fraccion, 0)}`).join(', ');
  return (
    <div className={className} data-testid="personal-barra-costo" data-total={total}>
      <div role="img" aria-label={`Composición del costo: ${resumen}`} className="flex h-14 w-full overflow-hidden bg-line-soft">
        {segmentos.map((s) => (
          <div
            key={s.id}
            data-testid={`personal-segmento-${s.id}`}
            data-valor={s.valor}
            className={cn(
              'flex min-w-0 items-center justify-center overflow-hidden whitespace-nowrap t-label num shadow-[inset_-2px_0_0_var(--c-surface)] transition-[flex-grow] duration-(--dur-slower) ease-standard',
              s.clase,
              TEXTO[s.id],
            )}
            style={{ flexGrow: listo ? s.valor : 0, flexShrink: 1, flexBasis: 0 }}
          >
            {s.fraccion >= 0.085 && <span className="px-1">{porcentaje(s.fraccion, 0)}</span>}
          </div>
        ))}
      </div>
      <div className="mt-3 flex w-full" aria-hidden>
        <div
          className="min-w-0 border-t-2 border-ink pt-2 transition-[flex-grow] duration-(--dur-slower) ease-standard"
          style={{ flexGrow: listo ? visible : 0, flexBasis: 0 }}
        />
        <div
          className="min-w-0 border-t-2 border-accent pt-2 transition-[flex-grow] duration-(--dur-slower) ease-standard"
          style={{ flexGrow: listo ? oculto : 0, flexBasis: 0, marginLeft: 2 }}
        />
      </div>
      <div className="flex w-full">
        <p className="min-w-0 pr-3 t-small text-ink" style={{ flexGrow: visible, flexBasis: 0 }}>
          <span className="font-semibold">Lo que ve la persona</span>
          <span className="block text-muted">
            <Dinero valor={visible} />
          </span>
        </p>
        {oculto > 0 && (
          <p className="min-w-0 text-right t-small text-ink" style={{ flexGrow: oculto, flexBasis: 0 }} data-testid="personal-costo-oculto">
            <span className="font-semibold">Lo que no está en el contrato</span>
            <span className="block text-muted">
              <Dinero valor={oculto} />
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

/** Leyenda de la barra: color, nombre, valor y parte del costo. Los segmentos en cero no se listan. */
export function LeyendaCosto({ segmentos }: { segmentos: readonly SegmentoCosto[] }) {
  const filas = segmentos.filter((s) => s.valor > 0);
  return (
    <ul className="grid grid-cols-1 gap-x-8 gap-y-3 desk:grid-cols-2" data-testid="personal-leyenda-costo">
      {filas.map((s) => (
        <li key={s.id} className="flex items-start gap-3" data-testid={`personal-leyenda-${s.id}`}>
          <span aria-hidden className={cn('mt-1 size-3 shrink-0', s.clase)} />
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-3">
              <span className="t-label text-ink">{s.etiqueta}</span>
              <span className="t-body num text-ink">
                <Dinero valor={s.valor} />
              </span>
            </span>
            <span className="flex items-baseline justify-between gap-3 t-small text-muted">
              <span>{s.descripcion}</span>
              <span className="num">{porcentaje(s.fraccion, 1)}</span>
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

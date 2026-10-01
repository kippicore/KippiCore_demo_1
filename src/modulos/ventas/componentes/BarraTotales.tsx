import type { ReactNode } from 'react';
import { usePuede } from '@/estado';
import { entero, plural, porcentaje } from '@/lib/formato';
import type { ResumenVentas } from '@/selectores';
import { cn, Dinero, Pista } from '@/ui';
import { TEXTOS } from '../textos';

/** Desde cuánto se abrevia ($ 123,4 M) para que la cifra quepa en su celda; el título guarda la cifra completa. */
const UMBRAL_CORTA = 100_000_000;

function Celda({
  etiqueta,
  children,
  nota,
  destacada,
  id,
}: {
  etiqueta: string;
  children: ReactNode;
  nota?: ReactNode;
  destacada?: boolean;
  id: string;
}) {
  return (
    <div
      className={cn('min-w-0 bg-surface px-4 py-3.5', destacada && 'shadow-[inset_0_-2px_0_var(--c-accent)]')}
      data-testid={`total-${id}`}
    >
      <dt className="t-eyebrow text-ink-2">{etiqueta}</dt>
      <dd className="mt-1.5 truncate t-h2 num text-ink">{children}</dd>
      <p className="mt-0.5 h-4 truncate t-micro text-muted">{nota ?? ' '}</p>
    </div>
  );
}

/**
 * Barra de totales del filtro (PRD 7.3): vendido, devoluciones, netas, unidades, ticket promedio y descuentos. Salen
 * de `selVentas` (nunca se suman filas), se recalculan con cada filtro y llevan la pista `ventas.totales`.
 */
export function BarraTotales({ totales }: { totales: ResumenVentas }) {
  const puede = usePuede();
  const dinero = (v: number, id: string) => (
    <Dinero valor={v} corta={Math.abs(v) >= UMBRAL_CORTA} data-testid={`valor-${id}`} />
  );
  return (
    <Pista id="ventas.totales" lado="abajo">
      <dl
        data-testid="ventas-totales"
        className="grid grid-cols-2 gap-px border border-line bg-line-soft sm:grid-cols-3 desk:grid-cols-6"
      >
        <Celda id="vendido" etiqueta={TEXTOS.totales.vendido} nota={plural(totales.numVentas, 'venta')}>
          {dinero(totales.ventas, 'vendido')}
        </Celda>
        <Celda id="devoluciones" etiqueta={TEXTOS.totales.devoluciones} nota="Restan en su fecha">
          {dinero(totales.devoluciones, 'devoluciones')}
        </Celda>
        <Celda
          id="netas"
          destacada
          etiqueta={TEXTOS.totales.netas}
          nota={
            puede('ver.margenes') ? (
              `Margen bruto ${porcentaje(totales.margenPct)}`
            ) : (
              <>
                Sin IVA: <Dinero valor={totales.baseNeta} corta />
              </>
            )
          }
        >
          {dinero(totales.netas, 'netas')}
        </Celda>
        <Celda id="unidades" etiqueta={TEXTOS.totales.unidades} nota={plural(totales.unidades, 'prenda')}>
          <span data-testid="valor-unidades" data-valor={totales.unidades}>
            {entero(totales.unidades)}
          </span>
        </Celda>
        <Celda id="ticket" etiqueta={TEXTOS.totales.ticket} nota="Por venta, con IVA">
          {dinero(totales.ticket, 'ticket')}
        </Celda>
        <Celda id="descuentos" etiqueta={TEXTOS.totales.descuentos} nota="Otorgados en el periodo">
          {dinero(totales.descuentos, 'descuentos')}
        </Celda>
      </dl>
    </Pista>
  );
}

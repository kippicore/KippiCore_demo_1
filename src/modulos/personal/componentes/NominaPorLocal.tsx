import { Dinero, Termino, cn } from '@/ui';
import { mesAnio, porcentaje } from '@/lib/formato';
import type { CostoNominaLocal } from '@/selectores';
import type { MesISO } from '@/dominio/tipos';
import { TEXTOS } from '../textos';

/**
 * Vista comparativa por local (PLAN 9.4 C1, P15): cuánto cuesta la nómina de cada local y qué parte de sus ventas se
 * va en ella. La bodega y la administración no venden: se muestran sin porcentaje. Cifras de `selCostoNominaPorLocal`.
 */
export function NominaPorLocal({ mes, locales, total, ventas }: { mes: MesISO; locales: readonly CostoNominaLocal[]; total: number; ventas: number }) {
  const conPorcentaje = locales.filter((l) => l.porcentaje !== null);
  const maximo = Math.max(0.0001, ...conPorcentaje.map((l) => l.porcentaje ?? 0));
  const mayor = [...conPorcentaje].sort((a, b) => (b.porcentaje ?? 0) - (a.porcentaje ?? 0))[0];
  const menor = [...conPorcentaje].sort((a, b) => (a.porcentaje ?? 0) - (b.porcentaje ?? 0))[0];
  return (
    <section className="border border-line bg-surface p-6" aria-label={TEXTOS.lista.porLocalTitulo} data-testid="personal-por-local">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-h2 text-ink">{TEXTOS.lista.porLocalTitulo}</h2>
          <p className="mt-1 t-small text-muted">
            {mesAnio(mes)}, el último mes completo. <Termino id="costoEmpleador" sinTecnico />.
          </p>
        </div>
        <p className="t-body text-ink-2" data-testid="personal-por-local-total" data-total={total}>
          En total <Dinero valor={total} className="font-bold text-ink" /> de nómina sobre <Dinero valor={ventas} corta className="font-bold text-ink" /> de ventas
          {ventas > 0 && <> · {porcentaje(total / ventas, 1)}</>}
        </p>
      </div>
      <ul className="mt-5 divide-y divide-line-soft">
        {locales.map((l) => {
          const p = l.porcentaje;
          return (
            <li key={l.localId} className="grid grid-cols-[180px_1fr_auto] items-center gap-6 py-3" data-testid={`personal-local-${l.localId}`} data-costo={l.costo} data-porcentaje={p ?? ''}>
              <span className="t-body font-semibold text-ink">{l.nombre}</span>
              <span className="h-2 bg-line-soft" aria-hidden>
                {p !== null && <span className={cn('block h-full transition-[width] duration-(--dur-slower) ease-standard', l === mayor ? 'bg-accent' : 'bg-ink')} style={{ width: `${(p / maximo) * 100}%` }} />}
              </span>
              <span className="flex items-baseline justify-end gap-4 text-right">
                <Dinero valor={l.costo} corta className="t-body text-ink" />
                <span className="w-[8ch] t-body num font-semibold text-ink">{p !== null ? porcentaje(p, 1) : '—'}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 max-w-[80ch] t-small text-muted">
        {mayor && menor && mayor.localId !== menor.localId ? (
          <>
            {mayor.nombre} es donde más pesa la nómina ({porcentaje(mayor.porcentaje ?? 0, 1)} de sus ventas); en {menor.nombre} pesa menos ({porcentaje(menor.porcentaje ?? 0, 1)}).{' '}
          </>
        ) : null}
        {TEXTOS.lista.porLocalNota}
      </p>
    </section>
  );
}

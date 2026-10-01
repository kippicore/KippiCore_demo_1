import { Boxes, Banknote, CalendarCheck, ChevronRight, HandCoins, History, Percent, Receipt, ReceiptText, Scale, Ship, UsersRound, Wallet, type LucideIcon } from 'lucide-react';
import { cn, Icono } from '@/ui';
import { REPORTES, type IdReporte } from '@/reportes';
import type { GrupoReportes } from '../textos';
import { TEXTOS, TEXTOS_REPORTE } from '../textos';

const ICONOS: Record<IdReporte, LucideIcon> = {
  ventas: ReceiptText,
  'cierre-caja': Wallet,
  clientes: UsersRound,
  inventario: Boxes,
  kardex: History,
  importaciones: Ship,
  cuentas: HandCoins,
  gastos: Receipt,
  resultados: Scale,
  nomina: Banknote,
  asistencia: CalendarCheck,
  comisiones: Percent,
  contador: Receipt,
};

export const iconoDeReporte = (id: IdReporte): LucideIcon => ICONOS[id];

/** Los reportes agrupados por la pregunta que el dueño se hace, cada uno con su descripción sencilla. */
export function ListaReportes({ grupos, abierto, alElegir }: { grupos: readonly GrupoReportes[]; abierto: IdReporte; alElegir: (id: IdReporte) => void }) {
  return (
    <nav aria-label={TEXTOS.lista.titulo} className="flex flex-col gap-8" data-testid="reportes-lista">
      {grupos.map((g) => (
        <section key={g.id} aria-labelledby={`grupo-${g.id}`} data-grupo={g.id}>
          <h2 id={`grupo-${g.id}`} className="t-eyebrow text-ink-2">
            {g.titulo}
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {g.ids.map((id) => {
              const activa = id === abierto;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => alElegir(id)}
                    aria-current={activa ? 'true' : undefined}
                    data-testid={`reporte-tarjeta-${id}`}
                    data-abierta={activa || undefined}
                    className={cn(
                      'group flex w-full items-start gap-3 border bg-surface p-4 text-left transition-colors duration-(--dur-instant) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                      activa ? 'border-ink' : 'border-line hover:border-ink',
                    )}
                  >
                    <Icono icono={ICONOS[id]} tamano={20} className={activa ? 'mt-0.5 text-ink' : 'mt-0.5 text-ink-2'} />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block t-label text-ink', activa ? 'font-bold' : 'font-semibold')}>{REPORTES[id].titulo}</span>
                      <span className="mt-1 block t-small text-muted">{TEXTOS_REPORTE[id].sencillo}</span>
                    </span>
                    <Icono icono={ChevronRight} tamano={16} className={cn('mt-1 shrink-0 text-ink transition-opacity duration-(--dur-fast)', activa ? 'opacity-100' : 'opacity-0 group-hover:opacity-60')} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}

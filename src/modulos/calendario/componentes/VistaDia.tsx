import { CalendarDays, Plus } from 'lucide-react';
import { Button, EmptyState, cn } from '@/ui';
import type { FechaISO } from '@/dominio/tipos';
import { hora } from '@/lib/formato';
import { compararDelDia } from '../calculos';
import { CLASE_RESALTADO, ESTILO_TIPO } from '../estilos';
import { ETIQUETA_TURNO, TEXTOS } from '../textos';
import type { EventoAgenda } from '../tipos';
import { TarjetaVisual, textoCompleto } from './Chip';
import { useContextoCalendario } from './contexto';

function FilaAgenda({ evento, fecha, etiqueta }: { evento: EventoAgenda; fecha: FechaISO; etiqueta: string }) {
  const { abrir, resaltadoId, nombreLocal } = useContextoCalendario();
  return (
    <button
      type="button"
      onClick={() => abrir(evento)}
      title={textoCompleto(evento, nombreLocal(evento.localId))}
      data-evento-id={evento.id}
      data-testid={`evento-${evento.id}`}
      data-tipo={evento.tipo}
      className="grid w-full grid-cols-[104px_minmax(0,1fr)] items-stretch gap-4 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
    >
      <span className="pt-2.5 t-label num text-ink-2">{etiqueta}</span>
      <TarjetaVisual evento={evento} fecha={fecha} resaltado={resaltadoId === evento.id} className="min-h-12" />
    </button>
  );
}

function BloqueTurnos({ turnos }: { turnos: readonly EventoAgenda[] }) {
  const { abrir, nombreLocal, resaltadoId } = useContextoCalendario();
  const porLocal = new Map<string, EventoAgenda[]>();
  for (const t of turnos) porLocal.set(t.localId ?? '', [...(porLocal.get(t.localId ?? '') ?? []), t]);
  const grupos = [...porLocal.entries()].sort((a, b) => (nombreLocal(a[0] || null) ?? '').localeCompare(nombreLocal(b[0] || null) ?? '', 'es'));
  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="dia-turnos">
      {grupos.map(([localId, lista]) => (
        <section key={localId} aria-label={`Turnos de ${nombreLocal(localId || null) ?? 'sin local'}`} className="border border-line bg-surface">
          <header className="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
            <h3 className="t-eyebrow text-ink-2">{nombreLocal(localId || null) ?? 'Sin local'}</h3>
            <span className="t-small num text-muted">{TEXTOS.turnos(lista.length)}</span>
          </header>
          <ul>
            {lista
              .slice()
              .sort(compararDelDia)
              .map((t) => (
                <li key={t.id} className="border-b border-line-soft last:border-b-0">
                  <button
                    type="button"
                    onClick={() => abrir(t)}
                    data-evento-id={t.id}
                    data-testid={`evento-${t.id}`}
                    data-tipo="turno"
                    className={cn('relative grid w-full grid-cols-[168px_minmax(0,1fr)_auto] items-center gap-3 py-2 pl-5 pr-4 text-left outline-none hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus', resaltadoId === t.id && CLASE_RESALTADO)}
                  >
                    <span aria-hidden className={cn('absolute inset-y-1 left-0 w-[3px]', ESTILO_TIPO.turno.barra)} />
                    <span className="whitespace-nowrap t-small num text-ink-2">
                      {hora(t.inicio)} – {t.fin ? hora(t.fin) : ''}
                    </span>
                    <span className="truncate t-body text-ink">{t.turno?.empleadoNombre ?? t.titulo}</span>
                    <span className="t-small text-muted">{t.turno ? ETIQUETA_TURNO[t.turno.tipo] : ''}</span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Vista de día: la agenda de un solo día en lista. Primero lo de todo el día, luego lo que tiene hora y, al final,
 * los turnos por local con la persona y el horario de cada uno.
 */
export function VistaDia({ fecha, eventos, alCrear }: { fecha: FechaISO; eventos: readonly EventoAgenda[]; alCrear: () => void }) {
  const turnos = eventos.filter((e) => e.tipo === 'turno');
  const todoElDia = eventos.filter((e) => e.tipo !== 'turno' && e.todoElDia);
  const conHora = eventos.filter((e) => e.tipo !== 'turno' && !e.todoElDia);
  if (eventos.length === 0)
    return (
      <div className="border border-line bg-surface" data-testid="calendario-dia">
        <EmptyState
          icono={CalendarDays}
          titulo={TEXTOS.vacioDia.titulo}
          texto={TEXTOS.vacioDia.texto}
          accion={
            <Button variante="secondary" icono={Plus} onClick={alCrear} data-testid="dia-vacio-agregar">
              {TEXTOS.nuevo}
            </Button>
          }
        />
      </div>
    );
  return (
    <div className="flex flex-col gap-8 border border-line bg-surface p-6" data-testid="calendario-dia">
      {todoElDia.length > 0 && (
        <section className="flex flex-col gap-2" aria-label={TEXTOS.todoElDia}>
          {todoElDia.map((e) => (
            <FilaAgenda key={e.id} evento={e} fecha={fecha} etiqueta={TEXTOS.todoElDia} />
          ))}
        </section>
      )}
      {conHora.length > 0 && (
        <section className="flex flex-col gap-2" aria-label={TEXTOS.conHora}>
          {conHora.map((e) => (
            <FilaAgenda key={e.id} evento={e} fecha={fecha} etiqueta={hora(e.inicio)} />
          ))}
        </section>
      )}
      {turnos.length > 0 && <BloqueTurnos turnos={turnos} />}
    </div>
  );
}

import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Icono, cn } from '@/ui';
import type { FechaISO } from '@/dominio/tipos';
import { diasDeSemana, lunesDe } from '@/lib/fechas';
import { DIAS_CORTOS_LUNES, fechaLarga } from '@/lib/formato';
import { agruparPorDia } from '../calculos';
import { ESTILO_TIPO } from '../estilos';
import { TEXTOS } from '../textos';
import type { EventoAgenda } from '../tipos';
import { Arrastrable, TarjetaVisual } from './Chip';
import { useContextoCalendario } from './contexto';

function FichaTurno({ evento, resaltado }: { evento: EventoAgenda; resaltado: boolean }) {
  const t = evento.turno;
  return (
    <span className={cn('relative flex h-6 min-w-0 items-center gap-1.5 bg-surface-2 pl-2.5 pr-1.5 t-small text-ink', resaltado && 'animate-flash outline outline-2 -outline-offset-1 outline-accent')}>
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-[3px]', ESTILO_TIPO.turno.barra)} />
      <span className="num shrink-0 text-ink-2">{evento.inicio.slice(11, 16)}</span>
      <span className="truncate">{t?.empleadoCorto ?? evento.titulo}</span>
    </span>
  );
}

function ColumnaDia({ fecha, eventos }: { fecha: FechaISO; eventos: readonly EventoAgenda[] }) {
  const { hoy, abrirDia, crearEn, resaltadoId, nombreLocal } = useContextoCalendario();
  const { setNodeRef, isOver } = useDroppable({ id: `dia:${fecha}` });
  const esHoy = fecha === hoy;
  const dia = lunesDeIndice(fecha);
  const resto = eventos.filter((e) => e.tipo !== 'turno');
  const turnos = eventos.filter((e) => e.tipo === 'turno');
  const gruposLocal = new Map<string, EventoAgenda[]>();
  for (const t of turnos) gruposLocal.set(t.localId ?? '', [...(gruposLocal.get(t.localId ?? '') ?? []), t]);
  const porLocal = [...gruposLocal.entries()].sort((a, b) => (nombreLocal(a[0] || null) ?? '').localeCompare(nombreLocal(b[0] || null) ?? '', 'es'));
  return (
    <section
      ref={setNodeRef}
      aria-label={fechaLarga(fecha)}
      data-testid={`dia-${fecha}`}
      data-hoy={esHoy || undefined}
      data-sobre={isOver || undefined}
      className={cn('group flex min-h-[460px] min-w-0 flex-col border-r border-line-soft bg-surface', isOver && 'bg-selected')}
    >
      <header className="flex h-12 items-center justify-between border-b border-line-soft px-2">
        <button
          type="button"
          onClick={() => abrirDia(fecha)}
          aria-label={TEXTOS.verDia(fechaLarga(fecha))}
          data-testid={`dia-numero-${fecha}`}
          className="flex items-baseline gap-2 outline-none hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-focus"
        >
          <span className="t-eyebrow text-ink-2">{DIAS_CORTOS_LUNES[dia]}</span>
          <span className={cn('num inline-flex h-7 min-w-7 items-center justify-center px-1.5 t-h3', esHoy ? 'bg-ink text-inverse' : 'text-ink')}>{Number(fecha.slice(8, 10))}</span>
        </button>
        <button
          type="button"
          onClick={() => crearEn(fecha)}
          aria-label={TEXTOS.agregarEn(fechaLarga(fecha))}
          data-testid={`dia-agregar-${fecha}`}
          className="inline-flex size-6 items-center justify-center text-ink-2 opacity-0 outline-none transition-opacity duration-(--dur-instant) hover:bg-selected focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-focus group-hover:opacity-100"
        >
          <Icono icono={Plus} tamano={14} />
        </button>
      </header>
      <div className="flex min-w-0 flex-col gap-1 p-1">
        {resto.map((e) => (
          <Arrastrable key={e.id} evento={e} fecha={fecha} arrastrable>
            <TarjetaVisual evento={e} fecha={fecha} resaltado={resaltadoId === e.id} />
          </Arrastrable>
        ))}
        {turnos.length > 0 && (
          <div className="mt-2 flex flex-col gap-1" data-testid={`turnos-${fecha}`}>
            <p className="px-1 t-eyebrow text-ink-2">{TEXTOS.turnos(turnos.length)}</p>
            {porLocal.map(([localId, lista]) => (
              <div key={localId} className="flex flex-col gap-0.5">
                <p className="px-1 pt-1 t-small font-semibold text-ink-2">
                  {nombreLocal(localId || null) ?? 'Sin local'} <span className="num font-normal text-muted">· {lista.length}</span>
                </p>
                {lista.map((t) => (
                  <Arrastrable key={t.id} evento={t} fecha={fecha} arrastrable>
                    <FichaTurno evento={t} resaltado={resaltadoId === t.id} />
                  </Arrastrable>
                ))}
              </div>
            ))}
          </div>
        )}
        {eventos.length === 0 && <p className="px-1 pt-2 t-small text-subtle">{TEXTOS.sinEventosDelDia}</p>}
      </div>
    </section>
  );
}

/** Índice 0–6 (lunes a domingo) de una fecha. */
function lunesDeIndice(fecha: FechaISO): number {
  const l = lunesDe(fecha);
  return diasDeSemana(l).indexOf(fecha);
}

/**
 * Vista de semana: siete columnas con las tarjetas de cada día (los eventos con su contexto y, debajo, los turnos
 * agrupados por local). Se arrastra una tarjeta o un turno a otra columna para moverlo.
 */
export function VistaSemana({ fecha, eventos }: { fecha: FechaISO; eventos: readonly EventoAgenda[] }) {
  const dias = useMemo(() => diasDeSemana(lunesDe(fecha)), [fecha]);
  const porDia = useMemo(() => agruparPorDia(eventos, dias), [eventos, dias]);
  return (
    <div className="grid grid-cols-7 border-l border-t border-b border-line-soft bg-surface" data-testid="calendario-semana">
      {dias.map((d) => (
        <ColumnaDia key={d} fecha={d} eventos={porDia.get(d) ?? []} />
      ))}
    </div>
  );
}

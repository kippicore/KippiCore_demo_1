import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { Icono, cn } from '@/ui';
import type { FechaISO } from '@/dominio/tipos';
import { fechaCorta, fechaLarga, DIAS_CORTOS_LUNES } from '@/lib/formato';
import { construirSemana, semanasDelMes, type Celda, type DiaDeSemana } from '../calculos';
import { TEXTOS } from '../textos';
import type { EventoAgenda } from '../tipos';
import { Arrastrable, ChipVisual } from './Chip';
import { useContextoCalendario } from './contexto';

/** Filas de eventos que caben en una celda del mes (la ficha de turnos del día cuenta como una). */
const MAX_FILAS = 4;

function FichaTurnos({ fecha, turnos }: { fecha: FechaISO; turnos: EventoAgenda[] }) {
  const { abrirDia, nombreLocal } = useContextoCalendario();
  const porLocal = new Map<string, number>();
  for (const t of turnos) {
    const n = nombreLocal(t.localId) ?? 'Sin local';
    porLocal.set(n, (porLocal.get(n) ?? 0) + 1);
  }
  const detalle = [...porLocal.entries()].map(([n, c]) => `${n}: ${c}`).join(' · ');
  return (
    <button
      type="button"
      onClick={() => abrirDia(fecha)}
      title={`${TEXTOS.turnos(turnos.length)} · ${detalle}`}
      aria-label={`${TEXTOS.turnos(turnos.length)} el ${fechaCorta(fecha)}. ${detalle}`}
      data-testid={`turnos-${fecha}`}
      className="relative flex h-6 w-full min-w-0 items-center bg-surface-2 pl-2.5 pr-1.5 t-small text-ink outline-none hover:bg-selected focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-chart-2" />
      <span className="truncate font-medium">{TEXTOS.turnos(turnos.length)}</span>
      <span className="ml-auto truncate pl-2 text-ink-2">{porLocal.size > 1 ? `${porLocal.size} locales` : ''}</span>
    </button>
  );
}

function CeldaDia({ dia, delMes }: { dia: DiaDeSemana; delMes: boolean }) {
  const { hoy, abrirDia, crearEn, resaltadoId } = useContextoCalendario();
  const { setNodeRef, isOver } = useDroppable({ id: `dia:${dia.fecha}` });
  const esHoy = dia.fecha === hoy;
  const numero = Number(dia.fecha.slice(8, 10));
  return (
    <div
      ref={setNodeRef}
      data-testid={`dia-${dia.fecha}`}
      data-hoy={esHoy || undefined}
      data-sobre={isOver || undefined}
      className={cn('group relative flex min-h-[116px] min-w-0 flex-col border-b border-r border-line-soft px-1 pb-1', delMes ? 'bg-surface' : 'bg-surface-2', isOver && 'bg-selected')}
    >
      <div className="flex h-8 items-center justify-between">
        <button
          type="button"
          onClick={() => abrirDia(dia.fecha)}
          aria-label={TEXTOS.verDia(fechaLarga(dia.fecha))}
          data-testid={`dia-numero-${dia.fecha}`}
          className={cn(
            'num inline-flex h-6 min-w-6 items-center justify-center px-1.5 t-label outline-none hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-focus',
            esHoy ? 'bg-ink text-inverse hover:no-underline' : delMes ? 'text-ink' : 'text-subtle',
          )}
        >
          {numero === 1 ? fechaCorta(dia.fecha) : numero}
        </button>
        <button
          type="button"
          onClick={() => crearEn(dia.fecha)}
          aria-label={TEXTOS.agregarEn(fechaLarga(dia.fecha))}
          data-testid={`dia-agregar-${dia.fecha}`}
          className="inline-flex size-6 items-center justify-center text-ink-2 opacity-0 outline-none transition-opacity duration-(--dur-instant) hover:bg-selected focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-focus group-hover:opacity-100"
        >
          <Icono icono={Plus} tamano={14} />
        </button>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        {dia.visibles.map((c, i) => (
          <FilaCelda key={i} celda={c} fecha={dia.fecha} resaltadoId={resaltadoId} />
        ))}
        {dia.ocultos > 0 && (
          <button
            type="button"
            onClick={() => abrirDia(dia.fecha)}
            data-testid={`dia-mas-${dia.fecha}`}
            className="h-5 px-1 text-left t-small font-semibold text-ink-2 outline-none hover:text-ink hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-focus"
          >
            {TEXTOS.masEventos(dia.ocultos)}
          </button>
        )}
      </div>
    </div>
  );
}

function FilaCelda({ celda, fecha, resaltadoId }: { celda: Celda; fecha: FechaISO; resaltadoId: string | null }) {
  if (celda.clase === 'hueco') return <div aria-hidden className="h-6" />;
  if (celda.clase === 'turnos') return <FichaTurnos fecha={fecha} turnos={celda.turnos} />;
  return (
    <Arrastrable evento={celda.evento} fecha={fecha} arrastrable>
      <ChipVisual evento={celda.evento} inicioSegmento={celda.inicioSegmento} finSegmento={celda.finSegmento} resaltado={resaltadoId === celda.evento.id} />
    </Arrastrable>
  );
}

/**
 * Vista de mes: semanas de lunes a domingo; las campañas de varios días forman una barra continua; los turnos de
 * cada día se resumen en una ficha. Cada celda es un destino para arrastrar un evento (dnd-kit).
 */
export function VistaMes({ fecha, eventos }: { fecha: FechaISO; eventos: readonly EventoAgenda[] }) {
  const mes = fecha.slice(0, 7);
  const semanas = semanasDelMes(fecha).map((s) => construirSemana(s, eventos, MAX_FILAS));
  return (
    <div className="border-l border-t border-line-soft bg-surface" data-testid="calendario-mes">
      <div className="grid grid-cols-7 border-b border-r border-line-soft bg-surface">
        {DIAS_CORTOS_LUNES.map((d) => (
          <p key={d} className="h-8 px-2 t-eyebrow leading-8 text-ink-2">
            {d}
          </p>
        ))}
      </div>
      {semanas.map((semana) => (
        <div key={semana[0]?.fecha} className="grid grid-cols-7">
          {semana.map((dia) => (
            <CeldaDia key={dia.fecha} dia={dia} delMes={dia.fecha.startsWith(mes)} />
          ))}
        </div>
      ))}
    </div>
  );
}

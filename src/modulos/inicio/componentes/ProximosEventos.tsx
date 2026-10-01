import { CalendarDays, HandCoins, Megaphone, Ship, UserRound, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import type { EventoVista, TipoEvento } from '@/dominio/tipos';
import { diaSemana } from '@/dominio/reglas/fechas';
import { rutas } from '@/app/rutas';
import { useAhora, useFiltroLocal, useSel } from '@/estado';
import { selLocalesQueVenden, selProximosEventos } from '@/selectores';
import { DIAS_CORTOS, hora, relativaDias } from '@/lib/formato';
import { Badge, Card, Dinero, EmptyState, EnlaceVerTodo, Icono } from '@/ui';
import { TXT } from '../textos';

/**
 * Próximos eventos del calendario (PRD 7.1, PLAN 2.3.4): citas, campañas, vencimientos de obligaciones y llegadas de
 * importaciones, de lo más cercano a lo más lejano. Con un local elegido: los de ese local y los de todo el negocio.
 */
const ICONO: Record<TipoEvento, LucideIcon> = {
  turno: CalendarDays,
  importacion: Ship,
  vencimiento: HandCoins,
  campana: Megaphone,
  cita: UserRound,
  otro: CalendarDays,
};

const ROTULO: Record<TipoEvento, string> = {
  turno: 'Turno',
  importacion: 'Llegada de mercancía',
  vencimiento: 'Vencimiento',
  campana: 'Campaña',
  cita: 'Cita',
  otro: 'Evento',
};

export function ProximosEventos() {
  const hoy = useAhora().slice(0, 10);
  const localId = useFiltroLocal();
  const locales = useSel(selLocalesQueVenden);
  const todos = useSel(selProximosEventos, { hoy, n: 24 });
  const eventos = todos.filter((e) => localId === 'todos' || e.localId === null || e.localId === localId).slice(0, 5);
  const nombreLocal = (id: string | null) => (id ? (locales.find((l) => l.id === id)?.nombre ?? null) : null);
  return (
    <Card titulo={TXT.eventos.titulo} data-testid="inicio-eventos" className="flex flex-col">
      {eventos.length === 0 ? (
        <EmptyState tamano="compacto" icono={CalendarDays} titulo={TXT.eventos.vacioTitulo} texto={TXT.eventos.vacioTexto} />
      ) : (
        <ol className="flex-1">
          {eventos.map((e) => (
            <FilaEvento key={e.id} evento={e} hoy={hoy} local={nombreLocal(e.localId)} />
          ))}
        </ol>
      )}
      <div className="mt-4 border-t border-line-soft pt-3">
        <EnlaceVerTodo a={rutas.calendario()}>{TXT.eventos.verTodo}</EnlaceVerTodo>
      </div>
    </Card>
  );
}

function FilaEvento({ evento: e, hoy, local }: { evento: EventoVista; hoy: string; local: string | null }) {
  const dia = e.inicio.slice(0, 10);
  const cuando = relativaDias(dia, hoy);
  const detalle = [cuando, e.todoElDia ? null : hora(e.inicio), e.detalle, local, e.recordatorioMin !== null ? TXT.eventos.recordatorio(e.recordatorioMin) : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className="border-t border-line-soft first:border-t-0" data-evento={e.id} data-tipo={e.tipo}>
      <Link to={e.enlace} className="flex items-center gap-3 py-2 hover:bg-surface-2">
        <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center bg-surface-2 text-ink" aria-hidden>
          <span className="t-micro uppercase text-muted">{DIAS_CORTOS[diaSemana(dia)]}</span>
          <span className="t-nav num leading-none">{Number(dia.slice(8, 10))}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate t-nav text-ink">{e.titulo}</span>
          <span className="block truncate t-small text-muted">{detalle}</span>
        </span>
        {e.monto !== null ? (
          <Dinero valor={e.monto} corta className="shrink-0 t-small text-ink-2" data-testid={`inicio-evento-monto-${e.id}`} />
        ) : e.montoOrigen ? (
          <span className="num shrink-0 whitespace-nowrap t-small text-ink-2">{e.montoOrigen}</span>
        ) : e.ilustrativo ? (
          <Badge tono="outline" tamano="sm" title={TXT.eventos.ilustrativaAyuda}>
            {TXT.eventos.ilustrativa}
          </Badge>
        ) : null}
        <span className="shrink-0 text-subtle" title={ROTULO[e.tipo]}>
          <Icono icono={ICONO[e.tipo]} tamano={16} />
          <span className="sr-only">{ROTULO[e.tipo]}</span>
        </span>
      </Link>
    </li>
  );
}

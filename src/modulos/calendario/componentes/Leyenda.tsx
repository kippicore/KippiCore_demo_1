import { cn } from '@/ui';
import type { TipoEvento } from '@/dominio/tipos';
import { TIPOS_EVENTO, tiposVisiblesEnLeyenda } from '../calculos';
import { ESTILO_TIPO } from '../estilos';
import { TEXTOS, TIPOS_INFO } from '../textos';

export interface PropsLeyenda {
  /** Eventos de cada tipo en el período visible. */
  conteo: Record<TipoEvento, number>;
  activos: ReadonlySet<TipoEvento>;
  alAlternar: (t: TipoEvento) => void;
  alMostrarTodos: () => void;
}

/**
 * Leyenda de tipos (pista `calendario.leyenda`): muestra el color de cada tipo con su conteo y sirve de filtro. Cada
 * tipo es un interruptor; los apagados se tachan. Los colores son los de PLAN 8.1.3.
 */
export function Leyenda({ conteo, activos, alAlternar, alMostrarTodos }: PropsLeyenda) {
  const visibles = tiposVisiblesEnLeyenda(conteo, activos);
  const hayOcultos = TIPOS_EVENTO.some((t) => !activos.has(t));
  return (
    <div role="group" aria-label={TEXTOS.leyenda} data-testid="calendario-leyenda" className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {visibles.map((t) => {
        const encendido = activos.has(t);
        const estilo = ESTILO_TIPO[t];
        return (
          <button
            key={t}
            type="button"
            aria-pressed={encendido}
            onClick={() => alAlternar(t)}
            data-testid={`leyenda-${t}`}
            title={TIPOS_INFO[t].etiqueta}
            className="inline-flex h-8 items-center gap-2 px-2 t-small text-ink outline-none transition-colors duration-(--dur-instant) hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
          >
            <span aria-hidden className={cn('relative inline-block h-4 w-6 shrink-0', estilo.fondo, 'border border-line-soft', !encendido && 'opacity-40')}>
              <span className={cn('absolute inset-y-0 left-0 w-[3px]', estilo.barra)} />
            </span>
            <span className={cn(encendido ? 'text-ink' : 'text-subtle line-through')}>{TIPOS_INFO[t].leyenda}</span>
            <span className={cn('num', encendido ? 'text-muted' : 'text-subtle')} data-testid={`leyenda-${t}-conteo`}>
              {conteo[t]}
            </span>
          </button>
        );
      })}
      {hayOcultos && (
        <button type="button" onClick={alMostrarTodos} className="inline-flex h-8 items-center px-2 t-label text-ink underline underline-offset-4 outline-none hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-focus" data-testid="leyenda-ver-todo">
          {TEXTOS.verTodo}
        </button>
      )}
    </div>
  );
}

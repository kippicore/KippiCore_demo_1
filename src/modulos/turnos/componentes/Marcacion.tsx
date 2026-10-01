import { LogIn, LogOut } from 'lucide-react';
import { Badge, Button, Icono, avisar, cn } from '@/ui';
import type { Empleado, FechaHoraISO, Id, Turno } from '@/dominio/tipos';
import { useAcciones, useAhora } from '@/estado';
import { hora } from '@/lib/formato';
import { rangoHoras } from '../calculos';
import { ETIQUETA_TIPO_TURNO } from '../textos';

export interface PropsMarcacion {
  empleado: Pick<Empleado, 'id' | 'nombres' | 'localId'>;
  /** Siguiente marcación que toca (alterna entrada y salida). */
  siguiente: 'entrada' | 'salida';
  turnoHoy: Turno | null;
  marcacionesHoy: readonly { tipo: 'entrada' | 'salida'; ts: FechaHoraISO }[];
  /** Nombre del local donde se marca. */
  nombreLocal: (id: Id) => string;
}

/**
 * Marcación de entrada y salida (PRD 7.9, W8): un botón grande que registra la hora y el local con
 * `registrarMarcacion`. Sin turno ese día el dominio no la acepta; aquí se explica en vez de dejar el botón mudo.
 */
export function Marcacion({ empleado, siguiente, turnoHoy, marcacionesHoy, nombreLocal }: PropsMarcacion) {
  const acciones = useAcciones();
  const ahora = useAhora();
  const localId = turnoHoy?.localId ?? empleado.localId;
  const sinTurno = !turnoHoy;
  const verbo = siguiente === 'entrada' ? 'Marcar entrada' : 'Marcar salida';

  const marcar = () => {
    if (!localId) return;
    const r = acciones.registrarMarcacion({ empleadoId: empleado.id, localId, tipo: siguiente });
    if (!r.ok) {
      avisar({ tipo: 'error', texto: r.error.mensaje });
      return;
    }
    avisar({
      tipo: 'exito',
      texto: siguiente === 'entrada' ? 'Entrada registrada' : 'Salida registrada',
      detalle: `${hora(ahora)} · ${nombreLocal(localId)}`,
    });
  };

  return (
    <section
      className="border border-line bg-surface p-6"
      aria-label="Marcación de entrada y salida"
      data-testid="marcacion"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="t-eyebrow text-ink-2">Marcación</p>
          <p className="mt-2 t-kpi num text-ink" data-testid="marcacion-hora">
            {hora(ahora)}
          </p>
          <p className="mt-1 t-body text-ink-2" data-testid="marcacion-local">
            {localId ? nombreLocal(localId) : 'Sin local asignado'}
          </p>
        </div>
        {turnoHoy ? (
          <Badge tono="outline" tamano="md">
            Hoy: {ETIQUETA_TIPO_TURNO[turnoHoy.tipo].toLowerCase()} ·{' '}
            {rangoHoras(turnoHoy.inicio, turnoHoy.fin)}
          </Badge>
        ) : (
          <Badge tono="neutral">Hoy no tienes turno</Badge>
        )}
      </div>

      <Button
        tamano="lg"
        anchoCompleto
        className="mt-6 h-16 t-body-lg"
        icono={siguiente === 'entrada' ? LogIn : LogOut}
        onClick={marcar}
        disabled={sinTurno || !localId}
        motivo={sinTurno ? 'Hoy no tienes turno programado. Pídele al dueño que te asigne uno.' : undefined}
        data-testid="marcacion-boton"
      >
        {verbo}
      </Button>
      {sinTurno && (
        <p className="mt-3 t-small text-muted">
          Hoy no tienes turno programado, así que no se puede marcar. Pídele al dueño que te asigne uno.
        </p>
      )}

      <ul
        className="mt-5 flex flex-col gap-2 border-t border-line-soft pt-4"
        data-testid="marcacion-hoy"
        aria-label="Marcaciones de hoy"
      >
        {marcacionesHoy.length === 0 ? (
          <li className="t-small text-muted">Todavía no has marcado hoy.</li>
        ) : (
          marcacionesHoy.map((m, i) => (
            <li key={`${m.ts}-${i}`} className="flex items-center gap-3 t-body text-ink">
              <Icono icono={m.tipo === 'entrada' ? LogIn : LogOut} tamano={16} className={cn('text-ink-2')} />
              <span className="font-bold">{m.tipo === 'entrada' ? 'Entrada' : 'Salida'}</span>
              <span className="num text-ink-2">{hora(m.ts)}</span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

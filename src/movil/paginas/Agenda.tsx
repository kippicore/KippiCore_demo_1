import { CalendarDays } from 'lucide-react';
import { rutas } from '@/app/rutas';
import { sumarDias } from '@/dominio/reglas/fechas';
import { useAhora, useEstadoDominio, useFiltroLocal, useSel } from '@/estado';
import type { TipoEvento } from '@/dominio/tipos';
import { selEventosCalendario } from '@/selectores';
import { Badge, EmptyState } from '@/ui/ligero';
import { agruparPorDia, horaEvento } from '../calculos';
import { Pantalla } from '../componentes/Pantalla';
import { FilaLista, Lista, Tarjeta } from '../componentes/Tarjeta';
import { TXT } from '../textos';

/**
 * Agenda (PLAN 4.4): lista de lo que viene en los próximos 14 días — citas, llegadas de importaciones, pagos y
 * campañas — agrupada por día. Es el mismo calendario del escritorio (`selEventosCalendario`) sin los turnos del
 * personal (que son muchos y se ven en el computador). Las llegadas de importación abren su línea de tiempo.
 */
const TIPOS: TipoEvento[] = ['importacion', 'vencimiento', 'campana', 'cita', 'otro'];
const ETIQUETA: Record<TipoEvento, { texto: string; tono: 'accent' | 'ink' | 'warning' | 'neutral' | 'outline' }> = {
  cita: { texto: 'Cita', tono: 'accent' },
  importacion: { texto: 'Importación', tono: 'ink' },
  vencimiento: { texto: 'Pago', tono: 'warning' },
  campana: { texto: 'Campaña', tono: 'neutral' },
  otro: { texto: 'Otro', tono: 'outline' },
  turno: { texto: 'Turno', tono: 'outline' },
};

export default function Agenda() {
  const hoy = useAhora().slice(0, 10);
  const local = useFiltroLocal();
  const e = useEstadoDominio();
  const eventos = useSel(selEventosCalendario, { desde: hoy, hasta: sumarDias(hoy, 13), tipos: TIPOS, localId: local });
  const dias = agruparPorDia(eventos, hoy);
  return (
    <Pantalla testid="app-agenda" titulo={TXT.agenda.titulo} fecha={TXT.agenda.proximos}>
      {dias.length === 0 ? (
        <Tarjeta>
          <EmptyState tamano="compacto" icono={CalendarDays} titulo={TXT.agenda.vacio} texto={TXT.agenda.vacioTexto} />
        </Tarjeta>
      ) : (
        dias.map((d) => (
          <section key={d.fecha} aria-label={d.titulo} data-testid="app-agenda-dia" data-fecha={d.fecha}>
            <h2 className="flex min-h-11 items-end pb-2 t-eyebrow text-ink-2">{d.titulo}</h2>
            <Tarjeta>
              <Lista>
                {d.eventos.map((ev) => {
                  const imp = ev.fuente.tipo === 'importacion' ? e.importaciones[ev.fuente.id] : undefined;
                  const et = ETIQUETA[ev.tipo];
                  return (
                    <FilaLista
                      key={ev.id}
                      data-testid="app-evento"
                      a={imp ? rutas.appImportacion(imp.numero) : undefined}
                      principal={<span className="line-clamp-2 whitespace-normal">{ev.titulo}</span>}
                      secundaria={`${horaEvento(ev)}${ev.localId ? ` · ${e.locales[ev.localId]?.nombre ?? ''}` : ''}`}
                      derecha={
                        <Badge tono={et.tono} tamano="sm">
                          {et.texto}
                        </Badge>
                      }
                    />
                  );
                })}
              </Lista>
            </Tarjeta>
          </section>
        ))
      )}
    </Pantalla>
  );
}

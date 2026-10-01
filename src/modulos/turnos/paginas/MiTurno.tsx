import { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { Badge, BadgeEstado, Card, EmptyState, EncabezadoPagina, FranjaResumen, Table, type ColumnaTabla } from '@/ui';
import { ESTADOS_ASISTENCIA } from '@/config/estados';
import type { FechaISO, Id, Novedad } from '@/dominio/tipos';
import { lunesDe, sumarDias, diaSemana } from '@/dominio/reglas/fechas';
import { horasNetasTurno } from '@/dominio/reglas/jornada';
import { useAhora, useHoy, useRolActivo, useSel, useUsuarioActivo } from '@/estado';
import { selHorasSemana, selLocales, selMiDia } from '@/selectores';
import { rutas } from '@/app/rutas';
import { DIAS_CORTOS, fechaCorta, hora, mesAnio } from '@/lib/formato';
import { estadoHoras, etiquetaSemana, rangoHoras, textoHoras, textoMinutos } from '../calculos';
import { Marcacion } from '../componentes/Marcacion';
import { LimiteError } from '../componentes/Piezas';
import { selAsistenciaVista, selNovedadesDe, type FilaAsistencia } from '../selectores';
import { ETIQUETA_NOVEDAD, ETIQUETA_TIPO_TURNO } from '../textos';

/** Mi turno (vendedor y bodega): mi marcación, mi horario de las próximas dos semanas y mi asistencia del mes. */
export default function MiTurno() {
  return (
    <LimiteError testid="mi-turno-error">
      <CuerpoMiTurno />
    </LimiteError>
  );
}

const diaYFecha = (f: FechaISO) => `${DIAS_CORTOS[diaSemana(f)]} ${fechaCorta(f)}`;

function CuerpoMiTurno() {
  const { empleado } = useUsuarioActivo();
  const rol = useRolActivo();
  const hoy = useHoy();
  const ahora = useAhora();
  const locales = useSel(selLocales, { incluirBodega: true });
  const mi = useSel(selMiDia, { empleadoId: empleado?.id ?? '', ahora });
  const lunes = lunesDe(hoy);
  const asistencia = useSel(selAsistenciaVista, { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy, ahora, empleadoId: empleado?.id ?? '' });
  const nombreLocal = useMemo(() => {
    const m = new Map(locales.map((l) => [l.id, l.nombre]));
    return (id: Id) => m.get(id) ?? id;
  }, [locales]);

  const migas = [{ texto: 'Inicio', a: rol === 'vendedor' ? rutas.miDia() : rutas.inventario() }, { texto: 'Mi turno' }];
  if (!empleado)
    return (
      <>
        <EncabezadoPagina migas={migas} titulo="Mi turno" subtitulo="Tu marcación, tu horario y tu asistencia." />
        <div className="mt-8 border border-line bg-surface">
          <EmptyState icono={Clock} titulo="Esta vista es para el equipo" texto="Cambia el rol a vendedor o a bodega para ver su turno y marcar su entrada y salida." />
        </div>
      </>
    );

  const resumen = asistencia.resumen[0];
  const columnas: ColumnaTabla<FilaAsistencia>[] = [
    { id: 'fecha', encabezado: 'Día', ordenar: (x) => x.dia.fecha, celda: (x) => <span className="num font-bold text-ink">{diaYFecha(x.dia.fecha)}</span> },
    { id: 'turno', encabezado: 'Turno', celda: (x) => (x.turno ? <span className="num">{`${ETIQUETA_TIPO_TURNO[x.turno.tipo]} · ${rangoHoras(x.turno.inicio, x.turno.fin)}`}</span> : <span className="text-muted">Sin turno</span>) },
    { id: 'entrada', encabezado: 'Entré', numerica: true, celda: (x) => (x.dia.entrada ? <span className="num">{hora(x.dia.entrada)}</span> : <span className="text-muted">—</span>) },
    { id: 'salida', encabezado: 'Salí', numerica: true, celda: (x) => (x.dia.salida ? <span className="num">{hora(x.dia.salida)}</span> : <span className="text-muted">—</span>) },
    {
      id: 'estado',
      encabezado: 'Estado',
      celda: (x) => (
        <span className="flex items-center gap-2">
          <BadgeEstado estado={ESTADOS_ASISTENCIA[x.dia.estado]} tamano="sm" />
          {x.dia.minutosTarde > 0 && <span className="t-small num text-ink-2">{textoMinutos(x.dia.minutosTarde)}</span>}
        </span>
      ),
    },
    { id: 'horas', encabezado: 'Horas', numerica: true, ordenar: (x) => x.dia.horasTrabajadas, celda: (x) => <span className="num">{x.dia.horasTrabajadas > 0 ? textoHoras(x.dia.horasTrabajadas) : '—'}</span> },
  ];

  return (
    <>
      <EncabezadoPagina migas={migas} titulo="Mi turno" subtitulo="Tu marcación, tu horario de estas dos semanas y tu asistencia del mes." />

      <div className="mt-8 grid grid-cols-1 items-start gap-6 wide:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Marcacion empleado={empleado} siguiente={mi.siguienteMarcacion} turnoHoy={mi.turnoHoy} marcacionesHoy={mi.marcacionesHoy} nombreLocal={nombreLocal} />
        <div className="flex flex-col gap-4" data-testid="mi-turno-horario">
          <Semana empleadoId={empleado.id} lunes={lunes} hoy={hoy} nombreLocal={nombreLocal} />
          <Semana empleadoId={empleado.id} lunes={sumarDias(lunes, 7)} hoy={hoy} nombreLocal={nombreLocal} />
        </div>
      </div>

      <section className="mt-10" data-testid="mi-turno-asistencia">
        <h2 className="t-h3 text-ink">Mi asistencia de {mesAnio(hoy.slice(0, 7))}</h2>
        <FranjaResumen
          className="mt-4"
          cifras={[
            { etiqueta: 'Turnos', valor: <span>{resumen?.turnos ?? 0}</span> },
            { etiqueta: 'Llegadas tarde', valor: <span>{resumen?.tardes ?? 0}</span> },
            { etiqueta: 'Ausencias', valor: <span>{resumen?.ausencias ?? 0}</span> },
            { etiqueta: 'Horas trabajadas', valor: <span>{textoHoras(resumen?.horasTrabajadas ?? 0)}</span> },
          ]}
        />
        <Table
          className="mt-4"
          etiqueta="Mi asistencia del mes"
          columnas={columnas}
          filas={asistencia.filas}
          clave={(x) => x.dia.fecha}
          sustantivo={['día', 'días']}
          porPagina={50}
          ordenInicial={{ id: 'fecha', dir: 'desc' }}
          vacio={<EmptyState tamano="tabla" icono={Clock} titulo="Todavía no hay días este mes" texto="Cuando marques tu entrada, tu asistencia aparece aquí." />}
        />
      </section>
    </>
  );
}

function Semana({ empleadoId, lunes, hoy, nombreLocal }: { empleadoId: Id; lunes: FechaISO; hoy: FechaISO; nombreLocal: (id: Id) => string }) {
  const sem = useSel(selHorasSemana, { empleadoId, lunes });
  const novedades = useSel(selNovedadesDe, { empleadoId });
  const estado = estadoHoras(sem.horas, sem.maximo);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const novedadDe = (f: FechaISO): Novedad | undefined => novedades.find((n) => f >= n.desde && f <= n.hasta);
  return (
    <Card padding="compacta" titulo={etiquetaSemana(lunes)} accion={<Badge tono={estado === 'exceso' ? 'warning' : 'outline'} tamano="sm">{textoHoras(sem.horas)} de {textoHoras(sem.maximo)}</Badge>}>
      <ul className="flex flex-col" aria-label={`Turnos de ${etiquetaSemana(lunes)}`}>
        {dias.map((f) => {
          const turnos = sem.turnos.filter((t) => t.fecha === f);
          const nov = novedadDe(f);
          return (
            <li key={f} className={`flex items-center gap-4 border-t border-line-soft py-2 first:border-t-0 ${f === hoy ? 'bg-selected/40' : ''}`} data-testid={`mi-turno-dia-${f}`}>
              <span className="w-[84px] shrink-0 pl-1 t-small num font-bold text-ink">{diaYFecha(f)}</span>
              {turnos.length > 0 ? (
                <span className="flex flex-1 flex-wrap items-center gap-x-4 t-body text-ink">
                  {turnos.map((t) => (
                    <span key={t.id} className="flex items-center gap-3">
                      <span className="font-bold">{ETIQUETA_TIPO_TURNO[t.tipo]}</span>
                      <span className="num text-ink-2">{rangoHoras(t.inicio, t.fin)}</span>
                      <span className="t-small num text-muted">{textoHoras(horasNetasTurno(t))}</span>
                      <span className="t-small text-muted">{nombreLocal(t.localId)}</span>
                    </span>
                  ))}
                </span>
              ) : nov ? (
                <span className="t-body text-ink-2">{ETIQUETA_NOVEDAD[nov.tipo]}</span>
              ) : (
                <span className="t-body text-muted">Libre</span>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

import { ArrowUpRight, Clock3 } from 'lucide-react';
import type { FechaISO, Id } from '@/dominio/tipos';
import { sumarDias } from '@/dominio/reglas/fechas';
import { ESTADOS_CAJA, type EstiloEstado } from '@/config/estados';
import { useEstadoDominio, useHoy, useSel } from '@/estado';
import { selCierresDelDia, type CierreDelDia } from '@/selectores';
import { dinero as formatoDinero, entero, fechaCorta, fechaLarga, hora } from '@/lib/formato';
import { Badge, BadgeEstado, BotonExportar, Dinero, EmptyState, FranjaResumen, ResaltarFila, Segmentado, Table, type ColumnaTabla, cn } from '@/ui';
import { lecturaDiferencia } from '../calculos';
import { selCierresRecientes } from '../selectores';

/**
 * Cierres de los tres locales (W11, escritorio): el dueño ve de un vistazo cuáles cuadraron, cuál tiene faltante, quién
 * cerró y a qué hora, y abre el detalle para revisarlo con una nota. Por defecto muestra el último día con cierres
 * (la "anoche" de la narrativa); "Hoy" muestra las cajas de hoy, que siguen abiertas.
 */
export interface PropsCierresDueno {
  dia: FechaISO;
  alDia: (f: FechaISO) => void;
  alAbrir: (sesionId: Id) => void;
  /** `?resaltar=<sesionId>`: la tarjeta o fila destella en camel. */
  resaltar: string | null;
}

/** Estado visible de una caja: cuadró / con diferencia / abierta / revisada / sin abrir. */
export function estiloCierre(f: Pick<CierreDelDia, 'estado' | 'diferencia'>): EstiloEstado {
  if (f.estado === 'revisada') return ESTADOS_CAJA.revisado;
  if (f.estado === 'abierta') return ESTADOS_CAJA.abierta;
  if (f.estado === 'sin_abrir') return { etiqueta: 'Sin abrir', tono: 'neutral' };
  return f.diferencia === 0 ? ESTADOS_CAJA.cuadro : ESTADOS_CAJA.con_diferencia;
}

export function CierresDueno({ dia, alDia, alAbrir, resaltar }: PropsCierresDueno) {
  const hoy = useHoy();
  const e = useEstadoDominio();
  const filas = useSel(selCierresDelDia, { fecha: dia });
  const recientes = useSel(selCierresRecientes, { hoy, dias: 7 });

  const opcionesDia = [
    { valor: hoy, etiqueta: 'Hoy' },
    { valor: sumarDias(hoy, -1), etiqueta: 'Anoche' },
    { valor: sumarDias(hoy, -2), etiqueta: fechaCorta(sumarDias(hoy, -2)) },
    { valor: sumarDias(hoy, -3), etiqueta: fechaCorta(sumarDias(hoy, -3)) },
  ];
  const valorDia = opcionesDia.some((o) => o.valor === dia) ? dia : opcionesDia[0]?.valor ?? hoy;
  const cerradas = filas.filter((f) => f.estado === 'cerrada' || f.estado === 'revisada');
  const esperado = filas.reduce((s, f) => s + (f.esperado ?? 0), 0);
  const contado = cerradas.reduce((s, f) => s + (f.contado ?? 0), 0);
  const diferencia = cerradas.reduce((s, f) => s + (f.diferencia ?? 0), 0);
  const sinRevisar = cerradas.filter((f) => !f.revisado).length;
  const cierreDe = (f: CierreDelDia) => (f.sesionId ? e.sesionesCaja[f.sesionId]?.cierre : null);

  const columnas: ColumnaTabla<{ fecha: FechaISO; fila: CierreDelDia }>[] = [
    { id: 'fecha', encabezado: 'Fecha', celda: (x) => <span className="num">{fechaCorta(x.fecha)}</span>, ordenar: (x) => x.fecha, ancho: 90 },
    { id: 'local', encabezado: 'Local', celda: (x) => x.fila.localNombre, ordenar: (x) => x.fila.localNombre },
    { id: 'cajero', encabezado: 'Cerró', celda: (x) => x.fila.cajero || '—', truncar: true },
    { id: 'esperado', encabezado: 'Esperado', celda: (x) => (x.fila.esperado === null ? '—' : <Dinero valor={x.fila.esperado} />), numerica: true, ordenar: (x) => x.fila.esperado },
    { id: 'contado', encabezado: 'Contado', celda: (x) => (x.fila.contado === null ? '—' : <Dinero valor={x.fila.contado} />), numerica: true, ordenar: (x) => x.fila.contado },
    {
      id: 'diferencia',
      encabezado: 'Diferencia',
      celda: (x) =>
        x.fila.diferencia === null ? '—' : <span className={cn(x.fila.diferencia < 0 && 'font-semibold text-danger', x.fila.diferencia > 0 && 'font-semibold text-warning')}>{x.fila.diferencia === 0 ? '0' : <Dinero valor={x.fila.diferencia} />}</span>,
      numerica: true,
      ordenar: (x) => x.fila.diferencia,
    },
    { id: 'estado', encabezado: 'Estado', celda: (x) => <BadgeEstado estado={estiloCierre(x.fila)} tamano="sm" /> },
  ];
  const historial = recientes.flatMap((d) => d.filas.filter((f) => f.sesionId).map((f) => ({ fecha: d.fecha, fila: f })));

  return (
    <div className="flex flex-col gap-6" data-testid="caja-cierres">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="t-h2 text-ink">{valorDia === hoy ? 'Cajas de hoy' : valorDia === sumarDias(hoy, -1) ? 'Cierres de anoche' : `Cierres del ${fechaLarga(valorDia).toLowerCase()}`}</h2>
          <p className="mt-1 t-small text-muted">{fechaLarga(valorDia)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Segmentado etiqueta="Día de los cierres" valor={valorDia} alCambiar={alDia} opciones={opcionesDia.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta, 'data-testid': `caja-dia-${o.valor}` }))} />
          <BotonExportar reporte="cierre-caja" filtros={{ desde: valorDia, hasta: valorDia, localId: 'todos' }} menu />
        </div>
      </div>

      <FranjaResumen
        className="md:grid-cols-4"
        cifras={[
          { etiqueta: 'Efectivo esperado', valor: <Dinero valor={esperado} corta /> },
          { etiqueta: 'Efectivo contado', valor: cerradas.length ? <Dinero valor={contado} corta /> : <span className="t-body text-muted">Aún sin cerrar</span> },
          {
            etiqueta: 'Diferencia',
            valor: !cerradas.length ? (
              <span className="t-body text-muted">—</span>
            ) : (
              <span className={diferencia < 0 ? 'text-danger' : diferencia > 0 ? 'text-warning' : 'text-success'} data-testid="caja-diferencia-total">
                {diferencia === 0 ? 'Cuadró' : <Dinero valor={diferencia} corta />}
              </span>
            ),
          },
          { etiqueta: 'Por revisar', valor: <span data-testid="caja-por-revisar">{entero(sinRevisar)}</span> },
        ]}
      />

      <ul className="grid grid-cols-1 gap-4 lg:grid-cols-3" data-testid="caja-tarjetas">
        {filas.map((f) => {
          const c = cierreDe(f);
          const lectura = f.diferencia === null ? null : lecturaDiferencia(f.diferencia);
          return (
            <li key={f.localId}>
              <ResaltarFila valor={f.sesionId ?? f.localId}>
                <button
                  type="button"
                  disabled={!f.sesionId}
                  onClick={() => f.sesionId && alAbrir(f.sesionId)}
                  className="group flex w-full flex-col gap-4 border border-line bg-surface p-5 text-left transition-colors duration-(--dur-instant) hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-default disabled:hover:border-line"
                  data-testid={`caja-tarjeta-${f.localId}`}
                  data-estado={f.estado}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="t-h3 text-ink">{f.localNombre}</h3>
                      <p className="mt-0.5 flex items-center gap-1.5 t-small text-muted">
                        <Clock3 size={14} aria-hidden />
                        {f.estado === 'sin_abrir' ? 'No se abrió la caja' : c ? `Cerró ${f.cajero} a las ${hora(c.ts)}` : `Abrió ${f.cajero}`}
                      </p>
                    </div>
                    <BadgeEstado estado={estiloCierre(f)} />
                  </div>
                  <p
                    className={cn('t-kpi-sm num', lectura === 'faltante' && 'text-danger', lectura === 'sobrante' && 'text-warning', lectura === 'cuadro' && 'text-success', lectura === null && 'text-ink')}
                    data-testid={`caja-resultado-${f.localId}`}
                  >
                    {lectura === 'cuadro' ? 'Cuadró' : lectura === 'faltante' && f.diferencia !== null ? `Faltan ${formatoDinero(Math.abs(f.diferencia), 'COP')}` : lectura === 'sobrante' && f.diferencia !== null ? `Sobran ${formatoDinero(f.diferencia, 'COP')}` : f.estado === 'abierta' ? 'Abierta' : '—'}
                  </p>
                  <dl className="grid grid-cols-2 gap-3 border-t border-line-soft pt-3 t-small">
                    <div>
                      <dt className="text-muted">Esperado{f.estado === 'abierta' ? ' hasta ahora' : ''}</dt>
                      <dd className="mt-0.5 t-body num text-ink">{f.esperado === null ? '—' : <Dinero valor={f.esperado} />}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Contado</dt>
                      <dd className="mt-0.5 t-body num text-ink">{f.contado === null ? '—' : <Dinero valor={f.contado} />}</dd>
                    </div>
                  </dl>
                  <div className="flex items-center justify-between gap-2 t-small text-muted">
                    <span className="min-w-0 truncate">
                      {f.revisado ? <Badge tono="neutral" tamano="sm">Revisado</Badge> : f.estado === 'cerrada' ? 'Sin revisar' : ''}
                      {f.notaRevision ? <span className="ml-2" title={f.notaRevision}>«{f.notaRevision}»</span> : null}
                    </span>
                    {f.sesionId && (
                      <span className="inline-flex shrink-0 items-center gap-1 t-nav text-ink">
                        Ver detalle <ArrowUpRight size={14} aria-hidden />
                      </span>
                    )}
                  </div>
                </button>
              </ResaltarFila>
            </li>
          );
        })}
      </ul>

      <section aria-label="Historial de cierres" className="mt-2">
        <h2 className="mb-3 t-h2 text-ink">Cierres de la última semana</h2>
        <Table
          columnas={columnas}
          filas={historial}
          clave={(x) => x.fila.sesionId ?? `${x.fecha}-${x.fila.localId}`}
          sustantivo={['cierre', 'cierres']}
          alAbrir={(x) => x.fila.sesionId && alAbrir(x.fila.sesionId)}
          resaltada={(x) => !!resaltar && x.fila.sesionId === resaltar}
          porPagina={25}
          ordenInicial={{ id: 'fecha', dir: 'desc' }}
          etiqueta="Cierres de caja de los últimos siete días"
          data-testid="caja-historial"
          vacio={<EmptyState tamano="tabla" icono={Clock3} titulo="Todavía no hay cierres" texto="Cuando los locales cierren su caja, aparecerán aquí con su diferencia." />}
        />
      </section>
    </div>
  );
}

import { useState, type ReactNode } from 'react';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Moon, Pencil, Plus, TriangleAlert } from 'lucide-react';
import { Badge, BarraProgreso, BotonIcono, Icono, Tooltip, cn } from '@/ui';
import type { FechaISO, Id, Novedad, TipoTurno, Turno } from '@/dominio/tipos';
import { esDominicalOFestivo, festivosColombia } from '@/dominio/reglas/festivos';
import { horasNetasTurno, horasNocturnasTurno } from '@/dominio/reglas/jornada';
import { DIAS_CORTOS_LUNES, fechaCorta, fechaLarga, numero } from '@/lib/formato';
import {
  estadoHoras,
  plantillaTurno,
  rangoCompacto,
  rangoHoras,
  textoHoras,
  type DestinoArrastre,
  type EstadoHoras,
  type EvaluacionTurno,
  type OrigenArrastre,
} from '../calculos';
import type { FilaSemana, SemanaVista } from '../selectores';
import { AYUDA_TIPO_TURNO, ETIQUETA_NOVEDAD, ETIQUETA_TIPO_TURNO, TEXTOS, TIPOS_TURNO } from '../textos';

/**
 * Cuadrícula semanal empleados × días de un local (PRD 7.9). Los turnos se arrastran con dnd-kit: de la barra de
 * plantillas a un día (asignar apertura, intermedio, cierre) o de un día a otro (mover). Mientras se arrastra, la
 * jornada de la persona sobre la que pasa el turno se recalcula en vivo contra la jornada máxima. También se
 * puede hacer todo con teclado (Espacio toma, flechas mueven, Espacio suelta) y con los botones de cada celda.
 */

const ESTILO_TURNO: Record<TipoTurno, string> = {
  apertura: 'border-line-strong bg-surface text-ink',
  intermedio: 'border-line bg-surface-2 text-ink',
  cierre: 'border-ink bg-ink text-inverse',
  completo: 'border-line-strong bg-selected text-ink',
};

const TEXTO_HORAS: Record<EstadoHoras, string> = { ok: 'text-ink', limite: 'text-success', exceso: 'text-ink' };

const clave = (empleadoId: Id, fecha: FechaISO) => `celda:${empleadoId}|${fecha}`;
function leerClave(id: unknown): DestinoArrastre | null {
  if (typeof id !== 'string' || !id.startsWith('celda:')) return null;
  const [empleadoId, fecha] = id.slice(6).split('|');
  return empleadoId && fecha ? { empleadoId, fecha } : null;
}

const colision: CollisionDetection = (args) => {
  const dentro = pointerWithin(args);
  return dentro.length > 0 ? dentro : closestCenter(args);
};

export interface PropsCuadricula {
  semana: SemanaVista;
  localId: Id;
  hoy: FechaISO;
  /** Nombre de cada local (turnos de la persona en otro local). */
  nombresLocales: ReadonlyMap<Id, string>;
  jornadaNocturnaInicio: { inicio: string; fin: string };
  /** Personas con riesgo de contrato realidad (prestación con turnos fijos). */
  conRiesgo: ReadonlySet<Id>;
  /** Evalúa en vivo qué pasaría al soltar (null si es soltar donde ya estaba). */
  evaluar: (origen: OrigenArrastre, destino: DestinoArrastre) => EvaluacionTurno | null;
  alSoltar: (origen: OrigenArrastre, destino: DestinoArrastre) => void;
  alAbrirTurno: (turno: Turno) => void;
  alNuevoTurno: (destino: DestinoArrastre) => void;
}

interface Sobre {
  destino: DestinoArrastre;
  evaluacion: EvaluacionTurno | null;
}

export function CuadriculaTurnos({ semana, localId, hoy, nombresLocales, jornadaNocturnaInicio, conRiesgo, evaluar, alSoltar, alAbrirTurno, alNuevoTurno }: PropsCuadricula) {
  const nombreLocal = (id: Id) => nombresLocales.get(id) ?? id;
  const [activo, setActivo] = useState<OrigenArrastre | null>(null);
  const [sobre, setSobre] = useState<Sobre | null>(null);
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const filas = semana.filas;
  const nombre = (id: Id) => filas.find((f) => f.empleadoId === id)?.nombre ?? 'esa persona';

  const origenDe = (id: unknown): OrigenArrastre | null => {
    if (typeof id !== 'string') return null;
    if (id.startsWith('plantilla:')) return { clase: 'plantilla', tipo: id.slice(10) as TipoTurno };
    if (id.startsWith('turno:')) {
      const t = filas.flatMap((f) => f.turnos).find((x) => x.id === id.slice(6));
      return t ? { clase: 'turno', turno: t } : null;
    }
    return null;
  };
  const describir = (o: OrigenArrastre | null) => (o ? (o.clase === 'plantilla' ? `un turno de ${ETIQUETA_TIPO_TURNO[o.tipo].toLowerCase()}` : `el turno de ${ETIQUETA_TIPO_TURNO[o.turno.tipo].toLowerCase()} de ${nombre(o.turno.empleadoId)}`) : 'el turno');
  const describirDestino = (d: DestinoArrastre | null) => (d ? `${nombre(d.empleadoId)}, ${fechaLarga(d.fecha)}` : 'ningún día');

  const anuncios: Announcements = {
    onDragStart: ({ active }) => `Tomaste ${describir(origenDe(active.id))}. Usa las flechas para llevarlo a un día y Espacio para soltarlo.`,
    onDragOver: ({ active, over }) => {
      const d = leerClave(over?.id);
      const ev = d ? (() => { const o = origenDe(active.id); return o ? evaluar(o, d) : null; })() : null;
      if (!d) return `${describir(origenDe(active.id))} no está sobre ningún día.`;
      if (ev?.resultado === 'exceso') return `Sobre ${describirDestino(d)}: quedaría con ${textoHoras(ev.horas)}, ${textoHoras(ev.exceso)} más del máximo.`;
      if (ev?.resultado === 'solapa') return `Sobre ${describirDestino(d)}: se cruza con otro turno.`;
      if (ev?.resultado === 'novedad') return `Sobre ${describirDestino(d)}: está en ${ETIQUETA_NOVEDAD[ev.novedad.tipo].toLowerCase()}.`;
      return `Sobre ${describirDestino(d)}.`;
    },
    onDragEnd: ({ active, over }) => `Soltaste ${describir(origenDe(active.id))} en ${describirDestino(leerClave(over?.id))}.`,
    onDragCancel: ({ active }) => `Cancelaste el movimiento de ${describir(origenDe(active.id))}.`,
  };

  const alIniciar = (e: DragStartEvent) => {
    setActivo(origenDe(e.active.id));
    setSobre(null);
  };
  const alPasar = (e: DragOverEvent) => {
    const o = origenDe(e.active.id);
    const d = leerClave(e.over?.id);
    setSobre(o && d ? { destino: d, evaluacion: evaluar(o, d) } : null);
  };
  const alTerminar = (e: DragEndEvent) => {
    const o = origenDe(e.active.id);
    const d = leerClave(e.over?.id);
    setActivo(null);
    setSobre(null);
    if (o && d) alSoltar(o, d);
  };

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={colision}
      onDragStart={alIniciar}
      onDragOver={alPasar}
      onDragEnd={alTerminar}
      onDragCancel={() => {
        setActivo(null);
        setSobre(null);
      }}
      accessibility={{
        announcements: anuncios,
        screenReaderInstructions: { draggable: 'Para tomar un turno, presiona Espacio. Llévalo con las flechas a otro día y suéltalo con Espacio. Esc cancela.' },
      }}
    >
      <BarraPlantillas localId={localId} />
      <div className="mt-3 overflow-x-auto border border-line bg-surface" data-testid="turnos-grilla">
        <div role="grid" aria-label="Turnos de la semana" className="grid min-w-[966px] [grid-template-columns:168px_repeat(7,minmax(98px,1fr))_112px]">
          <div role="row" className="contents">
            <div role="columnheader" className="sticky left-0 z-(--z-sticky) flex items-end border-b border-line bg-surface px-4 py-3 t-eyebrow text-ink-2">
              Equipo
            </div>
            {semana.dias.map((d) => (
              <EncabezadoDia key={d} fecha={d} hoy={hoy} cobertura={semana.cobertura[d]} />
            ))}
            <div role="columnheader" className="flex items-end justify-end border-b border-line px-4 py-3 t-eyebrow text-ink-2">
              Horas
            </div>
          </div>
          {filas.map((f) => (
            <FilaEmpleado
              key={f.empleadoId}
              fila={f}
              dias={semana.dias}
              localId={localId}
              hoy={hoy}
              nocturna={jornadaNocturnaInicio}
              nombreLocal={nombreLocal}
              riesgo={conRiesgo.has(f.empleadoId)}
              sobre={sobre}
              arrastrando={activo !== null}
              alAbrirTurno={alAbrirTurno}
              alNuevoTurno={alNuevoTurno}
            />
          ))}
          <div role="row" className="contents">
            <div role="rowheader" className="sticky left-0 z-(--z-sticky) border-t border-line bg-surface-2 px-4 py-3 t-eyebrow text-ink-2">
              En el local
            </div>
            {semana.dias.map((d) => {
              const c = semana.cobertura[d];
              return (
                <div key={d} role="gridcell" className="border-t border-l border-line-soft bg-surface-2 px-3 py-3 t-small num text-ink-2" data-testid={`turnos-cobertura-${d}`}>
                  {c && c.personas > 0 ? (
                    <>
                      <span className="block font-bold text-ink">
                        {c.personas} {c.personas === 1 ? 'persona' : 'personas'}
                      </span>
                      <span className="block text-muted">{textoHoras(c.horas)}</span>
                    </>
                  ) : (
                    <span className="text-muted">Sin turnos</span>
                  )}
                </div>
              );
            })}
            <div role="gridcell" className="border-t border-l border-line-soft bg-surface-2 px-4 py-3 text-right t-small num font-bold text-ink">
              {textoHoras(semana.horasLocal)}
            </div>
          </div>
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activo ? (
          <div className="cursor-grabbing shadow-drag">
            {activo.clase === 'plantilla' ? (
              <ContenidoPlantilla tipo={activo.tipo} localId={localId} />
            ) : (
              <ContenidoTurno turno={activo.turno} nocturna={jornadaNocturnaInicio} />
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Barra de plantillas
// ---------------------------------------------------------------------------------------------------------
function ContenidoPlantilla({ tipo, localId }: { tipo: TipoTurno; localId: Id }) {
  const p = plantillaTurno(tipo, localId);
  return (
    <div className={cn('w-[134px] border px-2.5 py-1', ESTILO_TURNO[tipo])}>
      <p className="t-micro font-bold">{ETIQUETA_TIPO_TURNO[tipo]}</p>
      <p className="t-micro num whitespace-nowrap opacity-80">{rangoHoras(p.inicio, p.fin)}</p>
    </div>
  );
}

function Plantilla({ tipo, localId }: { tipo: TipoTurno; localId: Id }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `plantilla:${tipo}` });
  const p = plantillaTurno(tipo, localId);
  return (
    <Tooltip texto={AYUDA_TIPO_TURNO[tipo]} lado="bottom">
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        aria-label={`Turno de ${ETIQUETA_TIPO_TURNO[tipo].toLowerCase()}, ${rangoHoras(p.inicio, p.fin)}. Arrástralo a un día.`}
        data-testid={`turnos-plantilla-${tipo}`}
        className={cn('w-[134px] cursor-grab touch-none border px-2.5 py-1 outline-none transition-opacity duration-(--dur-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus', ESTILO_TURNO[tipo], isDragging && 'opacity-30')}
      >
        <p className="t-micro font-bold">{ETIQUETA_TIPO_TURNO[tipo]}</p>
        <p className="t-micro num whitespace-nowrap opacity-80">{rangoHoras(p.inicio, p.fin)}</p>
      </div>
    </Tooltip>
  );
}

function BarraPlantillas({ localId }: { localId: Id }) {
  return (
    // Pegada bajo la barra superior: en pantallas bajas (1366 × 657) la barra y la fila del destino caben juntas al
    // desplazar la página, así se puede arrastrar sin que el turno cruce la pantalla.
    <div className="sticky top-(--sticky-top) z-(--z-hint) flex flex-wrap items-center gap-x-5 gap-y-2 border border-line bg-surface px-4 py-2" data-testid="turnos-plantillas">
      <p className="t-small text-ink-2">{TEXTOS.turnos.ayudaArrastrar}</p>
      <div className="flex flex-wrap items-center gap-2">
        {TIPOS_TURNO.map((t) => (
          <Plantilla key={t} tipo={t} localId={localId} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Encabezado de día
// ---------------------------------------------------------------------------------------------------------
function etiquetaDia(f: FechaISO): { dia: string; marca: string | null } {
  const idx = (new Date(`${f}T12:00:00Z`).getUTCDay() + 6) % 7;
  const festivo = festivosColombia(Number(f.slice(0, 4))).find((x) => x.fecha === f);
  return { dia: DIAS_CORTOS_LUNES[idx] ?? '', marca: festivo ? 'Festivo' : idx === 6 ? 'Recargo' : null };
}

function EncabezadoDia({ fecha, hoy, cobertura }: { fecha: FechaISO; hoy: FechaISO; cobertura?: { personas: number; horas: number } }) {
  const { dia, marca } = etiquetaDia(fecha);
  const esHoy = fecha === hoy;
  return (
    <div role="columnheader" className={cn('flex flex-col justify-end gap-0.5 border-b border-l border-line-soft px-3 py-3', esHoy && 'bg-selected')} aria-current={esHoy ? 'date' : undefined}>
      <span className="t-eyebrow text-ink-2">{dia}</span>
      <span className="flex items-baseline gap-2">
        <span className="t-h3 num text-ink">{Number(fecha.slice(8, 10))}</span>
        <span className="t-small text-muted">{fechaCorta(fecha).split(' ')[1]}</span>
      </span>
      <span className="flex h-5 items-center gap-1.5">
        {esHoy && <Badge tamano="sm" tono="ink">Hoy</Badge>}
        {marca && (
          <Tooltip texto="Las horas de domingo y festivo se pagan con recargo dominical.">
            <span className="t-small font-bold text-ink-2">{marca}</span>
          </Tooltip>
        )}
        {!esHoy && !marca && cobertura && cobertura.personas === 0 && <span className="t-small text-muted">Sin turnos</span>}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Fila de una persona
// ---------------------------------------------------------------------------------------------------------
interface PropsFila {
  fila: FilaSemana;
  dias: FechaISO[];
  localId: Id;
  hoy: FechaISO;
  nocturna: { inicio: string; fin: string };
  nombreLocal: (id: Id) => string;
  riesgo: boolean;
  sobre: Sobre | null;
  arrastrando: boolean;
  alAbrirTurno: (t: Turno) => void;
  alNuevoTurno: (d: DestinoArrastre) => void;
}

function FilaEmpleado({ fila, dias, localId, hoy, nocturna, nombreLocal, riesgo, sobre, arrastrando, alAbrirTurno, alNuevoTurno }: PropsFila) {
  const sobreFila = sobre?.destino.empleadoId === fila.empleadoId ? sobre : null;
  const horasVista = sobreFila?.evaluacion && 'horas' in sobreFila.evaluacion ? sobreFila.evaluacion.horas : null;
  const estado = estadoHoras(horasVista ?? fila.horas, fila.maximo);
  const mostradas = horasVista ?? fila.horas;
  return (
    <div role="row" className="contents">
      <div role="rowheader" className="sticky left-0 z-(--z-sticky) flex items-center gap-3 border-t border-line-soft bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="truncate t-body font-bold text-ink" title={fila.nombre}>
            {fila.corto}
          </p>
          <p className="flex flex-wrap items-center gap-x-1.5 t-small text-muted">
            <span>{etiquetaCargo(fila.cargo)}</span>
            {fila.vinculacion === 'prestacion_servicios' && (
              <Tooltip texto={riesgo ? 'Presta servicios pero tiene turnos fijos cada semana: puede configurar una relación laboral. Revísalo con tu contador.' : 'Contrato de prestación de servicios.'}>
                <span className={cn('inline-flex items-center gap-1 font-bold', riesgo ? 'text-ink' : 'text-muted')} data-testid={riesgo ? `turnos-riesgo-${fila.empleadoId}` : undefined}>
                  {riesgo && <Icono icono={TriangleAlert} tamano={12} />}
                  Prestación
                </span>
              </Tooltip>
            )}
          </p>
        </div>
      </div>
      {dias.map((d) => (
        <Celda key={d} fila={fila} fecha={d} localId={localId} hoy={hoy} nocturna={nocturna} nombreLocal={nombreLocal} sobre={sobre} arrastrando={arrastrando} alAbrirTurno={alAbrirTurno} alNuevoTurno={alNuevoTurno} />
      ))}
      <div role="gridcell" className="flex flex-col justify-center gap-1.5 border-t border-l border-line-soft px-3 py-3" data-testid={`turnos-horas-${fila.empleadoId}`}>
        <p className={cn('flex items-baseline justify-end gap-1 whitespace-nowrap t-body num font-bold', TEXTO_HORAS[estado])}>
          {horasVista !== null && <span className="t-small font-normal text-muted">→</span>}
          <span>{textoHoras(mostradas)}</span>
          <span className="t-small font-normal text-muted">/ {numero(fila.maximo)}</span>
        </p>
        <BarraProgreso valor={mostradas / fila.maximo} />
        <p className="min-h-5 whitespace-nowrap text-right t-small">
          {estado === 'exceso' ? (
            <span className="inline-flex items-center gap-1 font-bold text-ink" data-testid={`turnos-extra-${fila.empleadoId}`}>
              <Icono icono={TriangleAlert} tamano={12} />+{textoHoras(mostradas - fila.maximo)} extra
            </span>
          ) : estado === 'limite' ? (
            <span className="text-success">Completa</span>
          ) : (
            <span className="text-muted">Faltan {textoHoras(fila.maximo - mostradas)}</span>
          )}
        </p>
      </div>
    </div>
  );
}

const CARGOS: Record<string, string> = {
  vendedor: 'Vendedor',
  cajero: 'Cajero',
  jefe_bodega: 'Jefe de bodega',
  auxiliar_bodega: 'Auxiliar de bodega',
  administracion: 'Administración',
  sastre: 'Sastre',
  contenido_redes: 'Contenido y redes',
};
export const etiquetaCargo = (c: string) => CARGOS[c] ?? c;

// ---------------------------------------------------------------------------------------------------------
// Celda
// ---------------------------------------------------------------------------------------------------------
interface PropsCelda {
  fila: FilaSemana;
  fecha: FechaISO;
  localId: Id;
  hoy: FechaISO;
  nocturna: { inicio: string; fin: string };
  nombreLocal: (id: Id) => string;
  sobre: Sobre | null;
  arrastrando: boolean;
  alAbrirTurno: (t: Turno) => void;
  alNuevoTurno: (d: DestinoArrastre) => void;
}

function Celda({ fila, fecha, localId, hoy, nocturna, nombreLocal, sobre, arrastrando, alAbrirTurno, alNuevoTurno }: PropsCelda) {
  const { setNodeRef } = useDroppable({ id: clave(fila.empleadoId, fecha) });
  const turnos = fila.turnos.filter((t) => t.fecha === fecha);
  const propios = turnos.filter((t) => t.localId === localId);
  const ajenos = turnos.filter((t) => t.localId !== localId);
  const novedad = fila.novedades.find((n) => fecha >= n.desde && fecha <= n.hasta) ?? null;
  const aqui = sobre?.destino.empleadoId === fila.empleadoId && sobre.destino.fecha === fecha ? sobre : null;
  const resultado = aqui?.evaluacion?.resultado ?? null;
  const dominical = esDominicalOFestivo(fecha);
  return (
    <div
      ref={setNodeRef}
      role="gridcell"
      aria-label={`${fila.nombre}, ${fechaLarga(fecha)}`}
      data-testid={`turnos-celda-${fila.empleadoId}-${fecha}`}
      data-resultado={resultado ?? undefined}
      className={cn(
        'group relative flex min-h-[72px] flex-col gap-1 border-t border-l border-line-soft p-1 transition-colors duration-(--dur-fast)',
        fecha === hoy && 'bg-selected/40',
        dominical && fecha !== hoy && 'bg-surface-2/60',
        arrastrando && !aqui && 'outline-1 -outline-offset-1 outline-dashed outline-line',
        aqui && resultado === 'ok' && 'bg-selected outline-2 -outline-offset-2 outline-ink',
        aqui && resultado === 'exceso' && 'bg-warning-soft outline-2 -outline-offset-2 outline-warning',
        aqui && (resultado === 'solapa' || resultado === 'novedad') && 'bg-danger-soft outline-2 -outline-offset-2 outline-danger',
      )}
    >
      {novedad && <BloqueNovedad novedad={novedad} />}
      {propios.map((t) => (
        <TarjetaTurno key={t.id} turno={t} nocturna={nocturna} nombre={fila.nombre} alAbrir={alAbrirTurno} />
      ))}
      {ajenos.map((t) => (
        <div key={t.id} className="border border-dashed border-line-strong px-1.5 py-1" title={`${TEXTOS.turnos.otroLocal}: ${nombreLocal(t.localId)}`} data-testid={`turnos-ajeno-${t.id}`}>
          <p className="t-small font-bold text-ink-2">{nombreLocal(t.localId)}</p>
          <p className="t-micro num whitespace-nowrap text-muted">{rangoCompacto(t.inicio, t.fin)}</p>
        </div>
      ))}
      {!novedad && propios.length === 0 && ajenos.length === 0 && (
        <button
          type="button"
          onClick={() => alNuevoTurno({ empleadoId: fila.empleadoId, fecha })}
          aria-label={`Programar un turno para ${fila.nombre} el ${fechaLarga(fecha)}`}
          data-testid={`turnos-agregar-${fila.empleadoId}-${fecha}`}
          className="flex flex-1 items-center justify-center text-subtle opacity-0 outline-none transition-opacity duration-(--dur-fast) hover:text-ink focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-focus group-hover:opacity-100"
        >
          <Icono icono={Plus} tamano={16} />
        </button>
      )}
      {!novedad && (propios.length > 0 || ajenos.length > 0) && (
        <button
          type="button"
          onClick={() => alNuevoTurno({ empleadoId: fila.empleadoId, fecha })}
          aria-label={`Agregar otro turno a ${fila.nombre} el ${fechaLarga(fecha)}`}
          className="absolute right-1 bottom-1 hidden size-5 items-center justify-center text-subtle outline-none hover:text-ink focus-visible:flex focus-visible:outline-2 focus-visible:outline-focus group-hover:flex"
        >
          <Icono icono={Plus} tamano={12} />
        </button>
      )}
    </div>
  );
}

function BloqueNovedad({ novedad }: { novedad: Novedad }) {
  return (
    <div className="border border-line-strong bg-surface-2 px-1.5 py-1" data-testid={`turnos-novedad-${novedad.id}`} title={`${ETIQUETA_NOVEDAD[novedad.tipo]} del ${fechaCorta(novedad.desde)} al ${fechaCorta(novedad.hasta)}`}>
      <p className="t-small font-bold text-ink-2">{ETIQUETA_NOVEDAD[novedad.tipo]}</p>
      <p className="t-small text-muted">No se programa</p>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Tarjeta de un turno
// ---------------------------------------------------------------------------------------------------------
function ContenidoTurno({ turno, nocturna }: { turno: Turno; nocturna: { inicio: string; fin: string } }) {
  const noct = horasNocturnasTurno(turno, nocturna as { inicio: `${number}:${number}`; fin: `${number}:${number}` });
  return (
    <div className={cn('w-full min-w-[88px] border px-1.5 py-1', ESTILO_TURNO[turno.tipo])} title={`${ETIQUETA_TIPO_TURNO[turno.tipo]} · ${rangoHoras(turno.inicio, turno.fin)} · ${textoHoras(horasNetasTurno(turno))}`}>
      <p className="flex items-center justify-between gap-1 t-small font-bold">
        <span>{ETIQUETA_TIPO_TURNO[turno.tipo]}</span>
        {noct > 0 && <Icono icono={Moon} tamano={12} etiqueta="Con horas nocturnas" className="opacity-80" />}
      </p>
      <p className="t-micro num whitespace-nowrap opacity-80">{rangoCompacto(turno.inicio, turno.fin)}</p>
    </div>
  );
}

function TarjetaTurno({ turno, nocturna, nombre, alAbrir }: { turno: Turno; nocturna: { inicio: string; fin: string }; nombre: string; alAbrir: (t: Turno) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `turno:${turno.id}` });
  return (
    // El rol y el tabIndex los pone dnd-kit (`attributes`); Espacio y Enter toman el turno para moverlo, así que el
    // teclado abre el editor con el botón de lápiz (siguiente en el orden de tabulación).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      aria-label={`Turno de ${ETIQUETA_TIPO_TURNO[turno.tipo].toLowerCase()} de ${nombre}, ${rangoHoras(turno.inicio, turno.fin)}. Espacio para moverlo.`}
      data-testid={`turnos-turno-${turno.id}`}
      onClick={() => alAbrir(turno)}
      className={cn('group/turno relative cursor-grab touch-none outline-none transition-opacity duration-(--dur-fast) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus', isDragging && 'opacity-30')}
    >
      <ContenidoTurno turno={turno} nocturna={nocturna} />
      <BotonEditar etiqueta={`Editar el turno de ${nombre}`} alPulsar={() => alAbrir(turno)} />
    </div>
  );
}

function BotonEditar({ etiqueta, alPulsar }: { etiqueta: string; alPulsar: () => void }): ReactNode {
  return (
    <span className="absolute right-0.5 bottom-0.5 hidden group-hover/turno:block group-focus-visible/turno:block">
      <BotonIcono
        icono={Pencil}
        etiqueta={etiqueta}
        tamano="sm"
        variante="secondary"
        sinTooltip
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          alPulsar();
        }}
        className="size-6"
      />
    </span>
  );
}

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CalendarOff, Plus } from 'lucide-react';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Button, ConfirmarEliminacion, Dialog, EmptyState, EncabezadoPagina, NotaLegal, Pista, Retrasado, avisar } from '@/ui';
import { rutas } from '@/app/rutas';
import type { FechaISO, Id, TipoEvento } from '@/dominio/tipos';
import { useAcciones, useFiltroLocal, useSel } from '@/estado';
import { fechaCorta, fechaLarga } from '@/lib/formato';
import { selLocales } from '@/selectores';
import { agruparPorDia, contarPorTipo, rangoVisible, TIPOS_EVENTO, tiposVisiblesEnLeyenda } from '../calculos';
import { BarraCalendario } from '../componentes/BarraCalendario';
import { ChipVisual } from '../componentes/Chip';
import { ProveedorCalendario, type ContextoCalendario } from '../componentes/contexto';
import { DetalleEvento } from '../componentes/DetalleEvento';
import { EsqueletoCalendario, LimiteError } from '../componentes/Estados';
import { FormularioEvento } from '../componentes/FormularioEvento';
import { Leyenda } from '../componentes/Leyenda';
import { VistaDia } from '../componentes/VistaDia';
import { VistaMes } from '../componentes/VistaMes';
import { VistaSemana } from '../componentes/VistaSemana';
import { useDestello, useUrlCalendario } from '../hooks';
import { useMoverEvento } from '../movimientos';
import { selAgenda, selEventoGuardado } from '../selectores';
import { ELIMINAR, EXCESO, TEXTOS } from '../textos';
import type { EventoAgenda } from '../tipos';

interface ArrastreActivo {
  evento: EventoAgenda;
  desde: FechaISO;
}

interface ExcesoPendiente extends ArrastreActivo {
  destino: FechaISO;
  mensaje: string;
}

const TODOS = new Set<TipoEvento>(TIPOS_EVENTO);

/** El día destino es el que está bajo el puntero (no el que más se solapa con la ficha, que es más ancha que un día). */
const colision: CollisionDetection = (args) => {
  const bajoElPuntero = pointerWithin(args);
  return bajoElPuntero.length > 0 ? bajoElPuntero : rectIntersection(args);
};

export default function Calendario() {
  const url = useUrlCalendario();
  const { hoy, vista, fecha } = url;
  const acciones = useAcciones();
  const mover = useMoverEvento();
  const globalLocal = useFiltroLocal();
  const locales = useSel(selLocales, { incluirBodega: true });

  // Local de la pantalla: arranca en el de la barra superior y se puede cambiar aquí sin tocar el global.
  const [elegido, setElegido] = useState<{ globalAlElegir: Id | 'todos'; local: Id | 'todos' } | null>(null);
  const local = elegido && elegido.globalAlElegir === globalLocal ? elegido.local : globalLocal;

  const [activos, setActivos] = useState<ReadonlySet<TipoEvento>>(TODOS);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<{ eventoId: Id | null; fecha: FechaISO } | null>(null);
  const [aEliminar, setAEliminar] = useState<EventoAgenda | null>(null);
  const [exceso, setExceso] = useState<ExcesoPendiente | null>(null);
  const [arrastrando, setArrastrando] = useState<ArrastreActivo | null>(null);

  const rango = useMemo(() => rangoVisible(vista, fecha), [vista, fecha]);
  const consulta = useMemo(() => ({ ...rango, hoy, localId: local }), [rango, hoy, local]);
  const diferida = useDeferredValue(consulta);
  const pendiente = diferida !== consulta;
  const agenda = useSel(selAgenda, diferida);
  const guardadoEnEdicion = useSel(selEventoGuardado, { eventoId: formulario?.eventoId ?? '' });

  const conteo = useMemo(() => contarPorTipo(agenda), [agenda]);
  const visibles = useMemo(() => agenda.filter((e) => activos.has(e.tipo)), [agenda, activos]);
  const delDia = useMemo(() => agruparPorDia(visibles, [fecha]).get(fecha) ?? [], [visibles, fecha]);
  const detalle = detalleId ? (agenda.find((e) => e.id === detalleId) ?? null) : null;
  const hayVencimientos = visibles.some((e) => e.tipo === 'vencimiento');
  const destello = useDestello(url.resaltarId, !pendiente);

  const nombres = useMemo(() => new Map(locales.map((l) => [l.id, l])), [locales]);
  const nombreLocal = useCallback((id: Id | null) => (id ? (nombres.get(id)?.nombre ?? null) : null), [nombres]);
  const codigoLocal = useCallback((id: Id | null) => (id ? (nombres.get(id)?.codigo ?? null) : null), [nombres]);

  // `?resaltar=` hacia algo que ya no existe: se avisa una vez (CONTRATOS 5).
  const avisado = useRef<string | null>(null);
  useEffect(() => {
    if (!url.resaltarPerdido || avisado.current === 'perdido') return;
    avisado.current = 'perdido';
    avisar({ tipo: 'info', texto: TEXTOS.noEncontrado });
  }, [url.resaltarPerdido]);

  const contexto: ContextoCalendario = useMemo(
    () => ({
      hoy,
      nombreLocal,
      codigoLocal,
      resaltadoId: destello,
      abrir: (e) => setDetalleId(e.id),
      abrirDia: (f) => url.ir({ vista: 'dia', fecha: f }),
      crearEn: (f) => setFormulario({ eventoId: null, fecha: f }),
    }),
    [hoy, nombreLocal, codigoLocal, destello, url],
  );

  // --- Arrastrar -----------------------------------------------------------------------------------------
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Enter abre el detalle; Espacio toma el evento (Esc cancela).
    useSensor(KeyboardSensor, { keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } }),
  );
  const tituloDe = (id: unknown) => agenda.find((e) => `${e.id}@` === String(id).slice(0, e.id.length + 1))?.titulo ?? 'el evento';
  const diaDe = (id: unknown) => (String(id).startsWith('dia:') ? fechaLarga(String(id).slice(4)) : 'ningún día');
  const anuncios: Announcements = {
    onDragStart: ({ active }) => `Tomaste ${tituloDe(active.id)}. Usa las flechas para llevarlo a otro día y Espacio para soltarlo.`,
    onDragOver: ({ active, over }) => (over ? `${tituloDe(active.id)} está sobre ${diaDe(over.id)}.` : `${tituloDe(active.id)} no está sobre ningún día.`),
    onDragEnd: ({ active, over }) => (over ? `Soltaste ${tituloDe(active.id)} en ${diaDe(over.id)}.` : `Soltaste ${tituloDe(active.id)} fuera del calendario.`),
    onDragCancel: ({ active }) => `Cancelaste el movimiento de ${tituloDe(active.id)}.`,
  };
  const alIniciar = (e: DragStartEvent) => {
    const d = e.active.data.current as ArrastreActivo | undefined;
    if (d) setArrastrando(d);
  };
  const aplicarMovimiento = useCallback(
    (a: ArrastreActivo, destino: FechaISO, aceptarExceso = false) => {
      const r = mover(a.evento, a.desde, destino, aceptarExceso);
      if (!r.ok && r.exceso) setExceso({ ...a, destino, mensaje: r.mensaje });
      else setExceso(null);
    },
    [mover],
  );
  const alSoltar = (e: DragEndEvent) => {
    setArrastrando(null);
    const d = e.active.data.current as ArrastreActivo | undefined;
    const destino = e.over ? String(e.over.id) : '';
    if (!d || !destino.startsWith('dia:')) return;
    aplicarMovimiento(d, destino.slice(4));
  };

  // --- Eliminar y editar ---------------------------------------------------------------------------------
  const confirmarEliminar = () => {
    if (!aEliminar) return;
    const r = acciones.eliminarEvento({ eventoId: aEliminar.fuente.id });
    if (!r.ok) {
      avisar({ tipo: 'error', texto: 'No se pudo eliminar el evento', detalle: r.error.mensaje });
      return;
    }
    avisar({ tipo: 'exito', texto: 'Evento eliminado', detalle: aEliminar.titulo });
    setAEliminar(null);
    setDetalleId(null);
  };

  const alternar = (t: TipoEvento) =>
    setActivos((a) => {
      const n = new Set(a);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });
  const todosOcultos = tiposVisiblesEnLeyenda(conteo, activos).every((t) => !activos.has(t));
  const eventosVista = vista === 'dia' ? delDia : visibles;
  // El evento nuevo arranca en el día que se mira (vista de día), en hoy si está a la vista, o en el día de referencia.
  const fechaParaNuevo = vista === 'dia' ? fecha : hoy >= rango.desde && hoy <= rango.hasta ? hoy : fecha;

  return (
    <ProveedorCalendario value={contexto}>
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: TEXTOS.titulo }]}
        titulo={TEXTOS.titulo}
        subtitulo={TEXTOS.subtitulo}
        acciones={
          <Button icono={Plus} onClick={() => setFormulario({ eventoId: null, fecha: fechaParaNuevo })} data-testid="calendario-nuevo">
            {TEXTOS.nuevo}
          </Button>
        }
      />

      <div className="mt-8 flex flex-col gap-3">
        <BarraCalendario
          vista={vista}
          fecha={fecha}
          hoy={hoy}
          local={local}
          locales={locales}
          alIr={(c) => url.ir({ vista: c.vista, fecha: c.fecha })}
          alCambiarLocal={(l) => setElegido({ globalAlElegir: globalLocal, local: l })}
        />
        <Pista id="calendario.leyenda" className="self-start" alinear="inicio">
          <Leyenda conteo={conteo} activos={activos} alAlternar={alternar} alMostrarTodos={() => setActivos(TODOS)} />
        </Pista>
        <p className="t-small text-muted">{TEXTOS.leyendaAyuda}</p>
      </div>

      <LimiteError>
        <DndContext
          sensors={sensores}
          collisionDetection={colision}
          onDragStart={alIniciar}
          onDragEnd={alSoltar}
          onDragCancel={() => setArrastrando(null)}
          accessibility={{
            announcements: anuncios,
            screenReaderInstructions: { draggable: 'Para mover un evento, presiona Espacio, llévalo con las flechas a otro día y vuelve a presionar Espacio. Esc cancela.' },
          }}
        >
          <div className="relative mt-4" aria-busy={pendiente} data-testid="calendario-vista" data-vista={vista} data-fecha={fecha}>
            {todosOcultos ? (
              <div className="border border-line bg-surface" data-testid="calendario-todo-oculto">
                <EmptyState
                  icono={CalendarOff}
                  titulo={TEXTOS.vacioFiltros.titulo}
                  texto={TEXTOS.vacioFiltros.texto}
                  accion={
                    <Button variante="secondary" onClick={() => setActivos(TODOS)}>
                      {TEXTOS.verTodo}
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className={pendiente ? 'opacity-60 transition-opacity duration-(--dur-fast)' : undefined}>
                {vista === 'mes' && <VistaMes fecha={fecha} eventos={eventosVista} />}
                {vista === 'semana' && <VistaSemana fecha={fecha} eventos={eventosVista} />}
                {vista === 'dia' && <VistaDia fecha={fecha} eventos={eventosVista} alCrear={() => setFormulario({ eventoId: null, fecha })} />}
              </div>
            )}
            {pendiente && (
              <Retrasado>
                <div className="absolute inset-0 bg-surface">
                  <EsqueletoCalendario semanas={vista === 'mes' ? 5 : 2} />
                </div>
              </Retrasado>
            )}
          </div>
          <DragOverlay dropAnimation={null}>
            {arrastrando ? (
              <div className="w-[200px] cursor-grabbing shadow-drag">
                <ChipVisual evento={arrastrando.evento} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </LimiteError>

      {hayVencimientos && (
        <div className="mt-4 flex flex-col gap-1.5" data-testid="calendario-nota">
          <NotaLegal tipo="tributario" />
          <p className="t-small text-muted">{TEXTOS.notaObligaciones}</p>
        </div>
      )}

      {detalle && (
        <DetalleEvento
          key={`${detalle.id}|${detalle.fechaOrigen}`}
          evento={detalle}
          alCerrar={() => setDetalleId(null)}
          alEditar={(e) => {
            setDetalleId(null);
            setFormulario({ eventoId: e.fuente.id, fecha: e.inicio.slice(0, 10) });
          }}
          alEliminar={(e) => setAEliminar(e)}
          alMover={(e, nueva) => aplicarMovimiento({ evento: e, desde: e.fechaOrigen }, nueva)}
        />
      )}

      {formulario && (
        <FormularioEvento
          key={formulario.eventoId ?? `nuevo-${formulario.fecha}`}
          evento={formulario.eventoId ? guardadoEnEdicion : null}
          fechaInicial={formulario.fecha}
          localInicial={local}
          alCerrar={() => setFormulario(null)}
          alGuardar={(eventoId, f) => {
            setFormulario(null);
            setDetalleId(null);
            // Lleva al día del evento y lo destella; si cae fuera del período visible, el período lo sigue.
            url.ir({ fecha: f >= rango.desde && f <= rango.hasta ? fecha : f, resaltar: eventoId });
          }}
        />
      )}

      <ConfirmarEliminacion
        abierto={!!aEliminar}
        alCambiar={(a) => !a && setAEliminar(null)}
        pregunta={aEliminar ? ELIMINAR.pregunta(aEliminar.titulo) : ''}
        consecuencias={aEliminar ? ELIMINAR.consecuencias(fechaLarga(aEliminar.fechaOrigen)) : ''}
        accion={ELIMINAR.accion}
        alConfirmar={confirmarEliminar}
      />

      <Dialog
        abierto={!!exceso}
        alCambiar={(a) => !a && setExceso(null)}
        eyebrow="Turnos"
        titulo={EXCESO.titulo}
        ancho="sm"
        data-testid="calendario-exceso"
        pie={
          <>
            <Button variante="secondary" onClick={() => setExceso(null)}>
              {EXCESO.cancelar}
            </Button>
            <Button onClick={() => exceso && aplicarMovimiento(exceso, exceso.destino, true)} data-testid="exceso-confirmar">
              {EXCESO.confirmar}
            </Button>
          </>
        }
      >
        <p className="t-body text-ink" data-testid="exceso-mensaje">
          {exceso?.mensaje}
        </p>
        {exceso && <p className="mt-3 t-small text-muted">El turno pasaría al {fechaCorta(exceso.destino)}.</p>}
      </Dialog>
    </ProveedorCalendario>
  );
}

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useState, type ReactNode } from 'react';
import { cn } from '../cn';

/**
 * Tablero por estado (PLAN 8.7.22; en la interfaz nunca se dice "Kanban"). Columnas de 280 px separadas por líneas
 * `line-soft`, sin fondo; tarjeta `bg-surface border-line` p-3, hover `border-ink`. Al arrastrar: `shadow-drag`, sin
 * rotación; destino con borde punteado. Accesible con teclado (Espacio toma, flechas mueven, Espacio suelta) y
 * anuncios en español.
 *
 *   <Kanban columnas={[{ id: 'fabrica', titulo: 'Fábrica', resumen: '3 · US$ 48,2 mil' }]}
 *     tarjetas={filas.map((f) => ({ id: f.id, columna: f.fase, titulo: f.numero }))}
 *     pintar={(t) => <TarjetaImportacion … />}
 *     alMover={(id, columna) => abrirPanelNotificar(id, columna)} />
 */
export interface ColumnaKanban {
  id: string;
  titulo: string;
  /** Conteo y suma: "3 · US$ 48,2 mil". */
  resumen?: ReactNode;
}

export interface TarjetaKanban {
  id: string;
  columna: string;
  /** Texto para los anuncios del lector de pantalla. */
  titulo: string;
}

export interface PropsKanban<T extends TarjetaKanban> {
  columnas: readonly ColumnaKanban[];
  tarjetas: readonly T[];
  pintar: (t: T) => ReactNode;
  alMover?: (id: string, columna: string) => void;
  /** ¿Se puede soltar en esa columna? (por defecto sí). */
  permitido?: (t: T, columna: string) => boolean;
  className?: string;
}

function Columna({ col, children, activa }: { col: ColumnaKanban; children: ReactNode; activa: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <section ref={setNodeRef} aria-label={col.titulo} className="flex w-[280px] shrink-0 flex-col border-r border-line-soft px-3 first:pl-0 last:border-r-0">
      <header className="mb-3 flex h-8 items-center justify-between gap-2">
        <h3 className="t-eyebrow text-ink-2">{col.titulo}</h3>
        {col.resumen && <span className="t-small num text-muted">{col.resumen}</span>}
      </header>
      <div className={cn('flex min-h-24 flex-1 flex-col gap-2', activa && isOver && 'outline outline-1 -outline-offset-1 outline-dashed outline-ink')}>{children}</div>
    </section>
  );
}

function Arrastrable({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cn('cursor-grab outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus', isDragging && 'opacity-30')}>
      {children}
    </div>
  );
}

export function Kanban<T extends TarjetaKanban>({ columnas, tarjetas, pintar, alMover, permitido, className }: PropsKanban<T>) {
  const [activa, setActiva] = useState<T | null>(null);
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const nombreColumna = (id: unknown) => columnas.find((c) => c.id === id)?.titulo ?? String(id);
  const titulo = (id: unknown) => tarjetas.find((t) => t.id === id)?.titulo ?? String(id);
  const anuncios: Announcements = {
    onDragStart: ({ active }) => `Tomaste ${titulo(active.id)}. Usa las flechas para moverla y Espacio para soltarla.`,
    onDragOver: ({ active, over }) => (over ? `${titulo(active.id)} está sobre ${nombreColumna(over.id)}.` : `${titulo(active.id)} no está sobre ninguna columna.`),
    onDragEnd: ({ active, over }) => (over ? `Soltaste ${titulo(active.id)} en ${nombreColumna(over.id)}.` : `Soltaste ${titulo(active.id)} fuera del tablero.`),
    onDragCancel: ({ active }) => `Cancelaste el movimiento de ${titulo(active.id)}.`,
  };
  const inicio = (e: DragStartEvent) => setActiva(tarjetas.find((t) => t.id === e.active.id) ?? null);
  const fin = (e: DragEndEvent) => {
    const t = tarjetas.find((x) => x.id === e.active.id);
    setActiva(null);
    const destino = e.over?.id;
    if (!t || typeof destino !== 'string' || destino === t.columna) return;
    if (permitido && !permitido(t, destino)) return;
    alMover?.(t.id, destino);
  };
  return (
    <DndContext
      sensors={sensores}
      onDragStart={inicio}
      onDragEnd={fin}
      onDragCancel={() => setActiva(null)}
      accessibility={{
        announcements: anuncios,
        screenReaderInstructions: { draggable: 'Para tomar una tarjeta, presiona Espacio. Muévela con las flechas y suéltala con Espacio. Esc cancela.' },
      }}
    >
      <div className={cn('flex overflow-x-auto pb-4', className)}>
        {columnas.map((c) => (
          <Columna key={c.id} col={c} activa={activa !== null}>
            {tarjetas
              .filter((t) => t.columna === c.id)
              .map((t) => (
                <Arrastrable key={t.id} id={t.id}>
                  {pintar(t)}
                </Arrastrable>
              ))}
          </Columna>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>{activa ? <div className="cursor-grabbing shadow-drag">{pintar(activa)}</div> : null}</DragOverlay>
    </DndContext>
  );
}

/** Tarjeta base del tablero: `bg-surface border-line` p-3, hover `border-ink`. */
export function TarjetaTablero({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-none border border-line bg-surface p-3 transition-colors duration-(--dur-instant) hover:border-ink', className)}>{children}</div>;
}

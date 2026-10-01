import { type LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { cn } from '../cn';
import { Icono } from './Icono';

/**
 * Estado vacío (PLAN 8.7.19) y esqueleto de carga (8.7.20).
 *
 * Vacío: ícono lucide 28 `subtle` → título t-h3 → texto muted (máx. 44 ch: qué va aquí y por qué sirve) → acción.
 * Tamaños: `pagina` (64, dentro de una Card), `tabla` (40), `compacto` (24, tarjetas del inicio). Nunca
 * ilustraciones, nunca "No hay datos" a secas, nunca "Próximamente".
 *
 *   <EmptyState icono={ClipboardList} titulo="Aún no hay conteos físicos en Zona Rosa"
 *     texto="Un conteo compara lo que hay en el estante con lo que dice el sistema y te muestra las diferencias."
 *     accion={<Button>Iniciar conteo</Button>} />
 *
 * Esqueleto: `bg-selected` con brillo de 1,4 s; la forma imita el contenido. Solo aparece si la carga pasa de
 * 300 ms (`<Retrasado>`); con movimiento reducido, sin brillo.
 *
 *   <Retrasado><FilasEsqueleto filas={8} /></Retrasado>
 */
export interface PropsEmptyState {
  icono: LucideIcon;
  titulo: ReactNode;
  texto: ReactNode;
  accion?: ReactNode;
  /** Enlace opcional "¿Qué es esto?" (popover con la explicación). */
  ayuda?: ReactNode;
  tamano?: 'pagina' | 'tabla' | 'compacto';
  className?: string;
}

export function EmptyState({ icono, titulo, texto, accion, ayuda, tamano = 'pagina', className }: PropsEmptyState) {
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        tamano === 'pagina' ? 'p-16' : tamano === 'tabla' ? 'p-10' : 'p-6',
        className,
      )}
    >
      <Icono icono={icono} tamano={28} className="text-subtle" />
      <p className="mt-4 t-h3 text-ink">{titulo}</p>
      <p className="mt-2 max-w-[44ch] t-body text-muted">{texto}</p>
      {accion && <div className="mt-6">{accion}</div>}
      {ayuda && <div className="mt-3 t-small">{ayuda}</div>}
    </div>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden className={cn('block rounded-none skeleton', className)} style={style} />;
}

const ANCHOS = ['60%', '40%', '80%', '55%', '70%', '35%', '65%', '50%'];

/** 8 filas con anchos variados para tablas en carga (nunca un spinner central). */
export function FilasEsqueleto({ filas = 8, columnas = 5, alto = 44 }: { filas?: number; columnas?: number; alto?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="divide-y divide-line-soft">
      {Array.from({ length: filas }, (_, f) => (
        <div key={f} className="flex items-center gap-6 px-4" style={{ height: alto }}>
          {Array.from({ length: columnas }, (_, c) => (
            <Skeleton key={c} className="h-3 flex-1" style={{ maxWidth: ANCHOS[(f + c) % ANCHOS.length] }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Muestra su contenido solo si sigue montado después de `ms` (300 por defecto): evita parpadeos de carga. */
export function Retrasado({ children, ms = 300 }: { children: ReactNode; ms?: number }) {
  const [ver, setVer] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVer(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return ver ? <>{children}</> : null;
}

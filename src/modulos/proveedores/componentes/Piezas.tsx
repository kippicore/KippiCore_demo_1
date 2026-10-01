import { Star } from 'lucide-react';
import type { Proveedor } from '@/dominio/tipos';
import type { Tono } from '@/config/estados';
import { porcentaje } from '@/lib/formato';
import { Badge, Icono, cn } from '@/ui';
import { etiquetaRetraso, nivelDefectos, nivelRetraso, type Nivel } from '../calculos';
import { CATEGORIAS_LOCAL, TIPOS_PROVEEDOR } from '../textos';

/** Piezas pequeñas compartidas por el directorio, el comparativo y la ficha. */

const TONO_NIVEL: Record<Nivel, Tono> = { bien: 'success', atencion: 'warning', critico: 'danger' };

/** Calificación interna de 1 a 5, de solo lectura (o editable con `alCambiar`). */
export function Estrellas({ valor, alCambiar, tamano = 14, className }: { valor: number; alCambiar?: (v: 1 | 2 | 3 | 4 | 5) => void; tamano?: 12 | 14 | 16 | 18; className?: string }) {
  const estrellas = ([1, 2, 3, 4, 5] as const).map((n) => {
    const llena = n <= valor;
    const icono = <Icono icono={Star} tamano={tamano} className={cn(llena ? 'fill-ink text-ink' : 'text-line-strong')} />;
    if (!alCambiar) return <span key={n}>{icono}</span>;
    return (
      <button
        key={n}
        type="button"
        role="radio"
        aria-checked={n === valor}
        aria-label={`${n} de 5`}
        data-testid={`calificacion-${n}`}
        onClick={() => alCambiar(n)}
        className="inline-flex size-8 items-center justify-center text-ink transition-colors duration-(--dur-instant) hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-focus"
      >
        {icono}
      </button>
    );
  });
  if (alCambiar)
    return (
      <div role="radiogroup" aria-label="Calificación interna" className={cn('-ml-1 inline-flex items-center', className)}>
        {estrellas}
      </div>
    );
  return (
    <span role="img" aria-label={`Calificación ${valor} de 5`} className={cn('inline-flex items-center gap-0.5', className)}>
      {estrellas}
    </span>
  );
}

/** Tipo del proveedor: "Fábrica" o la categoría del proveedor local ("Arriendo"). */
export function InsigniaTipo({ proveedor }: { proveedor: Pick<Proveedor, 'tipo' | 'categoriaLocal'> }) {
  if (proveedor.tipo === 'fabrica') return <Badge tono="ink">{TIPOS_PROVEEDOR.fabrica.etiqueta}</Badge>;
  return <Badge tono="outline">{proveedor.categoriaLocal ? CATEGORIAS_LOCAL[proveedor.categoriaLocal] : TIPOS_PROVEEDOR.local.etiqueta}</Badge>;
}

/** Retraso promedio con su tono: verde, ámbar o rojo según los umbrales de la pantalla. */
export function InsigniaRetraso({ dias, tamano = 'sm' }: { dias: number | null; tamano?: 'sm' | 'md' }) {
  const nivel = nivelRetraso(dias);
  if (dias === null || nivel === null) return <span className="text-muted">—</span>;
  return (
    <Badge tono={TONO_NIVEL[nivel]} tamano={tamano}>
      {etiquetaRetraso(dias)}
    </Badge>
  );
}

/** Tasa de defectos con su tono. */
export function InsigniaDefectos({ fraccion, tamano = 'sm' }: { fraccion: number | null; tamano?: 'sm' | 'md' }) {
  const nivel = nivelDefectos(fraccion);
  if (fraccion === null || nivel === null) return <span className="text-muted">—</span>;
  return (
    <Badge tono={TONO_NIVEL[nivel]} tamano={tamano}>
      {porcentaje(fraccion, 1)}
    </Badge>
  );
}


import { useMarca } from '@/estado';
import { cn } from '../cn';

/**
 * `<Marca>` (PLAN 8.0.7, 8.2): wordmark de la marca ACTIVA (HALDEN o el nombre que escribió el cliente), solo
 * tipografía, 900, MAYÚSCULAS, tracking 0,18 em. Tamaños: lateral 18 · tienda 20 · entrada 64.
 *
 *   <Marca />  ·  <Marca tamano="tienda" />  ·  <Marca tamano="entrada" descriptor />
 */
export function Marca({ tamano = 'lateral', descriptor, className, como: Como = 'span' }: { tamano?: 'lateral' | 'tienda' | 'entrada'; descriptor?: boolean; className?: string; como?: 'span' | 'p' | 'h1' }) {
  const m = useMarca();
  const clase = tamano === 'tienda' ? 't-wordmark-tienda' : tamano === 'entrada' ? 't-wordmark-entrada' : 't-wordmark';
  return (
    <span className={cn('inline-flex flex-col', className)}>
      <Como className={cn(clase, 'text-current')} data-marca={m.nombre}>
        {m.nombre}
      </Como>
      {descriptor && <span className={cn('t-eyebrow text-ink-2', tamano === 'entrada' ? 'mt-4' : 'mt-1.5')}>{m.descriptor}</span>}
    </span>
  );
}

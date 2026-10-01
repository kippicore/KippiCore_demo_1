import * as RA from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../cn';
import { Icono } from './Icono';

/**
 * Acordeón (PLAN 8.6.5): borde superior `line` en cada sección y borde inferior en la última; disparador de 56 px
 * (t-h3-tienda en la tienda, t-h3 en escritorio) con `ChevronDown` que gira 180° en 240 ms; contenido t-body muted.
 *
 *   <Acordeon tienda secciones={[{ id: 'detalles', titulo: 'Detalles', contenido: <p>…</p> }]} abiertas={['detalles']} />
 */
export interface SeccionAcordeon {
  id: string;
  titulo: ReactNode;
  contenido: ReactNode;
}

export function Acordeon({ secciones, abiertas, tienda, className }: { secciones: readonly SeccionAcordeon[]; abiertas?: string[]; tienda?: boolean; className?: string }) {
  return (
    <RA.Root type="multiple" defaultValue={abiertas} className={cn('border-b border-line', className)}>
      {secciones.map((s) => (
        <RA.Item key={s.id} value={s.id} className="border-t border-line">
          <RA.Header>
            <RA.Trigger className={cn('group flex h-14 w-full items-center justify-between gap-4 text-left text-ink outline-none focus-visible:outline-2 focus-visible:outline-focus', tienda ? 't-h3-tienda' : 't-h3')}>
              {s.titulo}
              <Icono icono={ChevronDown} tamano={18} className="transition-transform duration-(--dur-slow) ease-standard group-data-[state=open]:rotate-180" />
            </RA.Trigger>
          </RA.Header>
          <RA.Content className="overflow-hidden data-[state=closed]:hidden">
            <div className="pb-6 t-body text-muted">{s.contenido}</div>
          </RA.Content>
        </RA.Item>
      ))}
    </RA.Root>
  );
}

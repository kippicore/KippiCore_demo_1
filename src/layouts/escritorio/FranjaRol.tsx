import { ArrowRight, Eye } from 'lucide-react';
import { useRolActivo } from '@/estado';
import { useCambiarRol, usePersonasRol } from '@/ui/conectados/Contexto';
import { Icono } from '@/ui/primitivos/Icono';

/**
 * Franja de rol (PLAN 8.4.4, 2.5): solo si el rol no es dueño. Arriba de todo, 36 px, `bg-ink text-inverse`, fija.
 * No es una alerta: sin íconos de advertencia ni color. "Estás viendo KippiCore como: Vendedor · Usaquén (Sebastián
 * Cárdenas)" · "Volver a la vista del dueño →".
 */
export function FranjaRol() {
  const rol = useRolActivo();
  const p = usePersonasRol()[rol];
  const cambiar = useCambiarRol();
  if (rol === 'dueno') return null;
  return (
    <div
      data-testid="franja-rol"
      className="sobre-ink sticky top-0 z-(--z-rolestrip) flex h-9 items-center justify-between gap-4 bg-ink px-5 t-small text-inverse animate-fade-in"
    >
      <p className="flex min-w-0 items-center gap-2">
        <Icono icono={Eye} tamano={14} />
        <span className="truncate">
          Estás viendo KippiCore como:{' '}
          <strong className="font-bold">
            {p.rol}
            {p.local ? ` · ${p.local}` : ''}
          </strong>{' '}
          ({p.nombre})
        </span>
      </p>
      <button type="button" onClick={() => cambiar('dueno')} className="inline-flex shrink-0 items-center gap-1.5 t-label font-bold text-inverse underline underline-offset-3 hover:no-underline">
        Volver a la vista del dueño
        <Icono icono={ArrowRight} tamano={14} />
      </button>
    </div>
  );
}

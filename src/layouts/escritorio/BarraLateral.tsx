import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { GRUPOS_MENU, MENU_ESCRITORIO } from '@/config/navegacion';
import { MARCA } from '@/config/marca';
import { rutas } from '@/app/rutas';
import { useMarca, useRolActivo } from '@/estado';
import { usePersonasRol } from '@/ui/conectados/Contexto';
import { Marca } from '@/ui/conectados/Marca';
import { cn } from '@/ui/cn';
import { Icono } from '@/ui/primitivos/Icono';
import { Avatar } from '@/ui/primitivos/Piezas';
import { Tooltip } from '@/ui/primitivos/Tooltip';
import { iconoNavegacion } from '../iconos';

/**
 * Barra lateral (PLAN 8.4.2): 248 px, `bg-surface border-r`, fija bajo la franja de rol con scroll propio.
 * Cabecera de 64 px con la marca activa y su descriptor; grupos con título eyebrow; ítem activo como BLOQUE NEGRO;
 * por rol, lo no permitido se OCULTA (y un grupo vacío desaparece). Pie: persona del rol, "Desarrollado por
 * KippiCore" y el botón de riel. En riel (72 px, < 1280 o a mano): solo íconos con tooltip.
 */
export function BarraLateral({ riel, alternarRiel }: { riel: boolean; alternarRiel: () => void }) {
  const rol = useRolActivo();
  const personas = usePersonasRol();
  const persona = personas[rol];
  const items = MENU_ESCRITORIO.filter((i) => i.roles.includes(rol));
  return (
    <aside
      data-testid="barra-lateral"
      data-riel={riel || undefined}
      className="sticky top-(--rolestrip-h) z-(--z-sidebar) flex h-[calc(100dvh-var(--rolestrip-h))] flex-col border-r border-line bg-surface transition-[top,height] duration-(--dur-base)"
    >
      <Link to={rutas.inicio()} className={cn('flex h-16 shrink-0 flex-col justify-center text-ink', riel ? 'items-center px-2' : 'px-5')} aria-label="Ir al inicio">
        {riel ? <MarcaCorta /> : <Marca descriptor />}
      </Link>
      <nav aria-label="Módulos" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-4 [scrollbar-width:thin]">
        {GRUPOS_MENU.map((g) => {
          const del = items.filter((i) => i.grupo === g.id);
          if (!del.length) return null;
          return (
            <div key={g.id} className="animate-fade-in">
              {g.titulo ? (
                riel ? (
                  <div aria-hidden className="mx-4 mb-2 mt-4 h-px bg-line-soft" />
                ) : (
                  <p className="mb-2 mt-6 px-5 t-eyebrow text-ink-2">{g.titulo}</p>
                )
              ) : (
                <div className="h-2" />
              )}
              <ul className="flex flex-col gap-0.5">
                {del.map((i) => {
                  const enlace = (
                    <NavLink
                      to={i.ruta}
                      data-testid={`menu-${i.id}`}
                      className={({ isActive }) =>
                        cn(
                          'mx-3 flex h-9 items-center gap-3 rounded-none t-nav outline-offset-[-2px] transition-colors duration-(--dur-instant) focus-visible:outline-2 focus-visible:outline-focus',
                          riel ? 'justify-center px-0' : 'px-3',
                          isActive ? 'sobre-ink bg-ink font-bold text-inverse focus-visible:outline-inverse' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                        )
                      }
                    >
                      <Icono icono={iconoNavegacion(i.icono)} tamano={18} />
                      {!riel && <span className="truncate">{i.etiqueta}</span>}
                    </NavLink>
                  );
                  return <li key={i.id}>{riel ? <Tooltip texto={i.etiqueta} lado="right">{enlace}</Tooltip> : enlace}</li>;
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className={cn('shrink-0 border-t border-line', riel ? 'px-2 py-4' : 'px-5 py-4')}>
        <div className={cn('flex items-center gap-3', riel && 'justify-center')}>
          <Avatar nombre={persona.nombre} tamano={32} />
          {!riel && (
            <div className="min-w-0 flex-1">
              <p className="truncate t-label text-ink">{persona.nombre}</p>
              <p className="truncate t-small text-muted">
                {persona.rol} · {persona.local ?? 'Todos los locales'}
              </p>
            </div>
          )}
        </div>
        <div className={cn('mt-3 flex items-center', riel ? 'justify-center' : 'justify-between')}>
          {!riel && (
            <Link to={rutas.entrada()} className="t-micro text-ink-2 hover:underline hover:underline-offset-4">
              {MARCA.firmaKippicore}
            </Link>
          )}
          <button
            type="button"
            onClick={alternarRiel}
            aria-label={riel ? 'Expandir la barra lateral' : 'Contraer la barra lateral'}
            title={riel ? 'Expandir la barra lateral' : 'Contraer la barra lateral'}
            className="inline-flex size-7 items-center justify-center text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <Icono icono={riel ? ChevronsRight : ChevronsLeft} tamano={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

/** Inicial de la marca para el riel (la marca es solo tipografía, 8.15.5). */
function MarcaCorta() {
  const m = useMarca();
  return <span className="t-wordmark text-[1.25rem] tracking-normal">{m.nombre.slice(0, 1)}</span>;
}

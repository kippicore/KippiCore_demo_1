import * as RP from '@radix-ui/react-popover';
import { Check, Rows3, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../cn';
import { Icono } from './Icono';
import { Input } from './Input';
import { ItemMenu, Menu } from './Popover';
import { ChipFiltro } from './Piezas';
import type { Densidad } from './Table';

/**
 * Barra de filtros (PLAN 8.7.13): fila de 48 px entre las pestañas y la tabla.
 * 1. Buscador local (Input sm con lupa, ancho 280, placeholder concreto; `/` lo enfoca).
 * 2. GRUPO PÍLDORA NEGRO (el gesto de la referencia): `bg-ink rounded-chrome p-1 h-10`; botones internos de 32 con
 *    `rounded-pill`, t-label blanco, separadores de 1 × 16 px; abierto `bg-white text-ink`. El primero es "Filtros"
 *    con contador; le siguen 2–3 atajos que abren su popover y muestran el valor ("Local: Usaquén").
 * 3. Espaciador. 4. Derecha: densidad, conmutador de vista, Exportar.
 * Debajo, chips de filtros activos + "Limpiar filtros". En /app no se usa.
 *
 *   <Toolbar
 *     buscar={{ valor: q, alCambiar: setQ, placeholder: 'Buscar por número, cliente o referencia' }}
 *     filtros={<>
 *       <BotonPildora icono={SlidersHorizontal} etiqueta="Filtros" contador={2}>…panel…</BotonPildora>
 *       <BotonPildora etiqueta="Local" valor={nombreLocal}>…<Select …/></BotonPildora>
 *       <BotonPildora etiqueta="Fechas" valor="Este mes">…<SelectorRango …/></BotonPildora>
 *     </>}
 *     derecha={<><SelectorDensidad valor={d} alCambiar={setD} /><BotonExportar reporte="ventas" /></>}
 *     chips={[{ id: 'local', texto: 'Local: Usaquén', alQuitar: () => setLocal('todos') }]}
 *     alLimpiar={limpiar} />
 */
export interface ChipActivo {
  id: string;
  texto: ReactNode;
  alQuitar: () => void;
}

export interface PropsToolbar {
  buscar?: { valor: string; alCambiar: (v: string) => void; placeholder: string; etiqueta?: string };
  filtros?: ReactNode;
  derecha?: ReactNode;
  chips?: readonly ChipActivo[];
  alLimpiar?: () => void;
  className?: string;
}

export function Toolbar({ buscar, filtros, derecha, chips = [], alLimpiar, className }: PropsToolbar) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!buscar) return;
    const tecla = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== '/' || (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable))) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [buscar]);
  return (
    <div className={cn('border-b border-line-soft', className)}>
      <div className="flex min-h-14 flex-wrap items-center gap-3 px-4 py-2">
        {buscar && (
          <Input
            ref={ref}
            buscar
            tamano="sm"
            etiqueta={buscar.etiqueta ?? 'Buscar'}
            etiquetaOculta
            placeholder={buscar.placeholder}
            value={buscar.valor}
            onChange={(e) => buscar.alCambiar(e.target.value)}
            className="w-[280px]"
            aria-keyshortcuts="/"
          />
        )}
        {filtros && <GrupoPildora>{filtros}</GrupoPildora>}
        <span className="flex-1" />
        {derecha && <div className="flex items-center gap-2">{derecha}</div>}
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          {chips.map((c) => (
            <ChipFiltro key={c.id} alQuitar={c.alQuitar}>
              {c.texto}
            </ChipFiltro>
          ))}
          {alLimpiar && (
            <button type="button" onClick={alLimpiar} className="ml-1 t-label font-bold text-ink underline-offset-4 hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Grupo píldora negro (también se usa solo, p. ej. en la tienda: Filtrar · Ordenar · Talla · Color). */
export function GrupoPildora({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="group" aria-label="Filtros" className={cn('sobre-ink inline-flex h-10 items-center rounded-chrome bg-ink p-1', className)}>
      {children}
    </div>
  );
}

export interface PropsBotonPildora {
  etiqueta: string;
  icono?: LucideIcon;
  /** Valor actual del filtro: se muestra "Etiqueta: valor". */
  valor?: ReactNode;
  contador?: number;
  /** Contenido del popover (el control del filtro). Sin contenido, el botón es una acción simple. */
  children?: ReactNode;
  onClick?: () => void;
  abierto?: boolean;
  alCambiar?: (v: boolean) => void;
  anchoPanel?: number;
  'data-testid'?: string;
}

const CLASE_PILDORA =
  'relative inline-flex h-8 items-center gap-1.5 rounded-pill px-3 t-label text-inverse transition-colors duration-(--dur-instant) hover:bg-white/12 data-[state=open]:bg-white data-[state=open]:text-black focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-inverse';

const ContenidoPildora = forwardRef<HTMLButtonElement, { etiqueta: string; icono?: LucideIcon; valor?: ReactNode; contador?: number } & ButtonHTMLAttributes<HTMLButtonElement>>(
  function ContenidoPildora({ etiqueta, icono, valor, contador, className, ...resto }, ref) {
    return (
      <button ref={ref} type="button" className={cn(CLASE_PILDORA, className)} {...resto}>
        {icono && <Icono icono={icono} tamano={14} />}
        <span className="whitespace-nowrap">
          {etiqueta}
          {valor !== undefined && valor !== null && valor !== '' && <span className="font-normal">: {valor}</span>}
        </span>
        {contador !== undefined && contador > 0 && (
          <span className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full bg-white t-micro num text-black">{contador}</span>
        )}
      </button>
    );
  },
);

export function BotonPildora({ etiqueta, icono, valor, contador, children, onClick, abierto, alCambiar, anchoPanel = 280, ...resto }: PropsBotonPildora) {
  const separador = <span aria-hidden className="mx-0.5 h-4 w-px bg-white/18 first:hidden" />;
  if (!children)
    return (
      <>
        {separador}
        <ContenidoPildora etiqueta={etiqueta} icono={icono} valor={valor} contador={contador} onClick={onClick} data-testid={resto['data-testid']} />
      </>
    );
  return (
    <>
      {separador}
      <RP.Root open={abierto} onOpenChange={alCambiar}>
        <RP.Trigger asChild>
          <ContenidoPildora etiqueta={etiqueta} icono={icono} valor={valor} contador={contador} data-testid={resto['data-testid']} />
        </RP.Trigger>
        <RP.Portal>
          <RP.Content
            align="start"
            sideOffset={8}
            collisionPadding={12}
            style={{ width: anchoPanel }}
            className="z-(--z-popover) rounded-none border border-line bg-surface p-4 text-ink shadow-float outline-none animate-pop-in"
          >
            <p className="mb-3 t-label font-bold text-ink">{etiqueta}</p>
            {children}
          </RP.Content>
        </RP.Portal>
      </RP.Root>
    </>
  );
}

/** Atajo: botón "Filtros" con el ícono de la referencia. */
export function BotonFiltros(props: Omit<PropsBotonPildora, 'etiqueta' | 'icono'> & { etiqueta?: string }) {
  return <BotonPildora {...props} etiqueta={props.etiqueta ?? 'Filtros'} icono={SlidersHorizontal} />;
}

/** Densidad de la tabla (solo ícono `Rows3`, menú compacta · normal · cómoda). */
export function SelectorDensidad({ valor, alCambiar }: { valor: Densidad; alCambiar: (d: Densidad) => void }) {
  const op: { v: Densidad; t: string }[] = [
    { v: 'compacta', t: 'Compacta' },
    { v: 'normal', t: 'Normal' },
    { v: 'comoda', t: 'Cómoda' },
  ];
  return (
    <Menu
      etiqueta="Densidad de la tabla"
      ancho={200}
      disparador={
        <button type="button" aria-label="Densidad de la tabla" title="Densidad de la tabla" className="inline-flex size-8 items-center justify-center text-ink hover:bg-surface-2 data-[state=open]:bg-selected">
          <Icono icono={Rows3} tamano={16} />
        </button>
      }
    >
      {op.map((o) => (
        <ItemMenu key={o.v} onSelect={() => alCambiar(o.v)} derecha={o.v === valor ? <Icono icono={Check} tamano={16} /> : null}>
          {o.t}
        </ItemMenu>
      ))}
    </Menu>
  );
}

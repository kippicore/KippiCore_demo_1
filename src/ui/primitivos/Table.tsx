import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { entero } from '@/lib/formato';
import { cn } from '../cn';
import { Checkbox } from './Controles';
import { FilasEsqueleto } from './Estados';
import { Icono } from './Icono';
import { Select } from './Select';

/**
 * Tabla (PLAN 8.7.12). Contenedor `bg-surface border-line`, sin cebra. Cabecera de 40 (eyebrow ink-2, borde inferior
 * 1 px ink, fija bajo la barra superior con `--sticky-top`), densidad 36/44/52, números a la derecha con `num`,
 * fila clicable (abre el cajón; Enter con foco), selección con barra de lote negra, acciones de fila al 40 %,
 * totales fijos abajo, paginación y vacío/carga diseñados. Una tabla ocupa siempre las 12 columnas.
 *
 *   const columnas: ColumnaTabla<FilaVenta>[] = [
 *     { id: 'numero', encabezado: 'Venta', celda: (v) => v.numero, ordenar: (v) => v.numero },
 *     { id: 'fecha', encabezado: 'Fecha', celda: (v) => <Fecha valor={v.fecha} />, ordenar: (v) => v.ts },
 *     { id: 'total', encabezado: 'Total', alinear: 'der', celda: (v) => <Dinero valor={v.total} />, ordenar: (v) => v.total },
 *   ];
 *   <Table columnas={columnas} filas={filas} clave={(v) => v.id} sustantivo={['venta', 'ventas']}
 *     alAbrir={(v) => navegar(rutas.venta(v.id))} totales={{ total: <Dinero valor={totales.netas} /> }}
 *     resaltada={(v) => v.id === resaltar} vacio={<EmptyState tamano="tabla" … />} barra={<Toolbar …/>}
 *     seleccion={sel} alSeleccionar={setSel} accionesLote={<Button variante="ghost" …>Exportar</Button>}
 *     accionesFila={(v) => <Menu …/>} />
 */
export type Densidad = 'compacta' | 'normal' | 'comoda';
const ALTO_FILA: Record<Densidad, string> = { compacta: 'h-9', normal: 'h-11', comoda: 'h-13' };

export interface ColumnaTabla<F> {
  id: string;
  encabezado: ReactNode;
  celda: (f: F) => ReactNode;
  alinear?: 'izq' | 'der' | 'centro';
  /** Valor para ordenar; si existe, la columna es ordenable. */
  ordenar?: (f: F) => number | string | null;
  /** Ancho CSS (px o %). */
  ancho?: number | string;
  /** Trunca con "…" y muestra el texto completo como título. */
  truncar?: boolean;
  /** Celda numérica (dinero, cantidades): a la derecha y tabular. */
  numerica?: boolean;
}

export interface PropsTable<F> {
  columnas: readonly ColumnaTabla<F>[];
  filas: readonly F[];
  clave: (f: F) => string;
  /** Singular y plural para "Mostrando 1–50 de 4.312 ventas" y "3 ventas seleccionadas". */
  sustantivo?: readonly [string, string];
  alAbrir?: (f: F) => void;
  /** Fila resaltada (enlace profundo `?resaltar=`): se desplaza a la vista y destella. */
  resaltada?: (f: F) => boolean;
  totales?: Partial<Record<string, ReactNode>>;
  /** Barra de herramientas (se reemplaza por la barra de lote cuando hay selección). */
  barra?: ReactNode;
  seleccion?: ReadonlySet<string>;
  alSeleccionar?: (s: Set<string>) => void;
  accionesLote?: ReactNode;
  accionesFila?: (f: F) => ReactNode;
  densidad?: Densidad;
  /** Filas por página (25 · 50 · 100); 0 = sin paginación. */
  porPagina?: 0 | 25 | 50 | 100;
  ordenInicial?: { id: string; dir: 'asc' | 'desc' };
  vacio?: ReactNode;
  cargando?: boolean;
  etiqueta?: string;
  className?: string;
  'data-testid'?: string;
}

/** Densidad recordada por tabla (localStorage). */
export function useDensidadTabla(id: string, inicial: Densidad = 'normal'): [Densidad, (d: Densidad) => void] {
  const clave = `kc:densidad:${id}`;
  const [d, setD] = useState<Densidad>(() => {
    try {
      const v = localStorage.getItem(clave);
      return v === 'compacta' || v === 'normal' || v === 'comoda' ? v : inicial;
    } catch {
      return inicial;
    }
  });
  return [
    d,
    (n) => {
      setD(n);
      try {
        localStorage.setItem(clave, n);
      } catch {
        /* modo memoria */
      }
    },
  ];
}

const ALINEAR = { izq: 'text-left', der: 'text-right', centro: 'text-center' } as const;

export function Table<F>({
  columnas,
  filas,
  clave,
  sustantivo = ['fila', 'filas'],
  alAbrir,
  resaltada,
  totales,
  barra,
  seleccion,
  alSeleccionar,
  accionesLote,
  accionesFila,
  densidad = 'normal',
  porPagina = 50,
  ordenInicial,
  vacio,
  cargando,
  etiqueta,
  className,
  ...resto
}: PropsTable<F>) {
  const [orden, setOrden] = useState(ordenInicial ?? null);
  const [pagina, setPagina] = useState(0);
  const [tamPagina, setTamPagina] = useState<number>(porPagina);
  const contenedor = useRef<HTMLDivElement | null>(null);
  const [desborda, setDesborda] = useState(false);

  const ordenadas = useMemo(() => {
    if (!orden) return filas;
    const col = columnas.find((c) => c.id === orden.id);
    if (!col?.ordenar) return filas;
    const f = col.ordenar;
    const signo = orden.dir === 'asc' ? 1 : -1;
    return [...filas].sort((a, b) => {
      const x = f(a);
      const y = f(b);
      if (x === y) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return (x < y ? -1 : 1) * signo;
    });
  }, [filas, orden, columnas]);

  const paginas = tamPagina ? Math.max(1, Math.ceil(ordenadas.length / tamPagina)) : 1;
  const paginaReal = Math.min(pagina, paginas - 1);
  const visibles = tamPagina ? ordenadas.slice(paginaReal * tamPagina, (paginaReal + 1) * tamPagina) : ordenadas;

  // Lleva a la página de la fila resaltada (enlace profundo) una vez.
  const yaResalto = useRef(false);
  useEffect(() => {
    if (!resaltada || yaResalto.current || !tamPagina) return;
    const i = ordenadas.findIndex(resaltada);
    if (i >= 0) {
      yaResalto.current = true;
      setPagina(Math.floor(i / tamPagina));
    }
  }, [ordenadas, resaltada, tamPagina]);

  // Sticky de la cabecera: el contenedor solo desplaza en horizontal si la tabla no cabe (si no, `clip`).
  useLayoutEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const medir = () => setDesborda(el.scrollWidth > el.clientWidth + 1);
    medir();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(medir) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [columnas.length]);

  const conSeleccion = !!alSeleccionar;
  const sel = seleccion ?? new Set<string>();
  const clavesVisibles = visibles.map(clave);
  const todasMarcadas = clavesVisibles.length > 0 && clavesVisibles.every((k) => sel.has(k));
  const algunas = clavesVisibles.some((k) => sel.has(k));

  const alternarOrden = (id: string) => {
    setOrden((o) => (!o || o.id !== id ? { id, dir: 'desc' } : o.dir === 'desc' ? { id, dir: 'asc' } : null));
    setPagina(0);
  };

  const teclaFila = (e: KeyboardEvent<HTMLTableRowElement>, f: F) => {
    if (e.key === 'Enter' && alAbrir) {
      e.preventDefault();
      alAbrir(f);
    }
  };

  const columnasTotales = columnas.length + (conSeleccion ? 1 : 0) + (accionesFila ? 1 : 0);
  const n = sel.size;

  return (
    <div className={cn('rounded-none border border-line bg-surface', className)} data-testid={resto['data-testid']}>
      {n > 0 && conSeleccion ? (
        <div className="sobre-ink flex h-12 items-center gap-2 bg-ink px-4 text-inverse">
          <span className="t-label num">
            {entero(n)} {n === 1 ? sustantivo[0] : sustantivo[1]} {n === 1 ? 'seleccionada' : 'seleccionadas'}
          </span>
          <span className="flex-1" />
          <div className="flex items-center gap-1 [&_button]:text-inverse [&_button:hover]:bg-white/12">{accionesLote}</div>
          <button type="button" onClick={() => alSeleccionar?.(new Set())} className="h-8 px-3 t-nav text-inverse hover:bg-white/12">
            Cancelar
          </button>
        </div>
      ) : (
        barra
      )}
      <div ref={contenedor} className={desborda ? 'overflow-x-auto' : 'overflow-x-clip'}>
        <table className="w-full border-collapse" aria-label={etiqueta}>
          <thead>
            <tr>
              {conSeleccion && (
                <th scope="col" className="sticky top-(--sticky-top) z-(--z-sticky) h-10 w-10 border-b border-ink bg-surface pl-4">
                  <Checkbox
                    aria-label="Seleccionar todas las filas visibles"
                    marcado={todasMarcadas ? true : algunas ? 'indeterminate' : false}
                    alCambiar={(v) => {
                      const s = new Set(sel);
                      for (const k of clavesVisibles) {
                        if (v) s.add(k);
                        else s.delete(k);
                      }
                      alSeleccionar?.(s);
                    }}
                  />
                </th>
              )}
              {columnas.map((c, i) => {
                const der = c.alinear === 'der' || c.numerica;
                const activa = orden?.id === c.id;
                return (
                  <th
                    key={c.id}
                    scope="col"
                    aria-sort={activa ? (orden?.dir === 'asc' ? 'ascending' : 'descending') : c.ordenar ? 'none' : undefined}
                    style={c.ancho !== undefined ? { width: c.ancho } : undefined}
                    className={cn(
                      'sticky top-(--sticky-top) z-(--z-sticky) h-10 whitespace-nowrap border-b border-ink bg-surface px-3 t-eyebrow',
                      i === 0 && !conSeleccion && 'pl-4',
                      der ? 'text-right' : ALINEAR[c.alinear ?? 'izq'],
                      activa ? 'text-ink' : 'text-ink-2',
                    )}
                  >
                    {c.ordenar ? (
                      <button
                        type="button"
                        onClick={() => alternarOrden(c.id)}
                        className={cn('group inline-flex items-center gap-1 uppercase hover:text-ink', der && 'flex-row-reverse')}
                      >
                        {c.encabezado}
                        <Icono
                          icono={activa ? (orden?.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown}
                          tamano={12}
                          className={activa ? 'opacity-100' : 'opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100'}
                        />
                      </button>
                    ) : (
                      c.encabezado
                    )}
                  </th>
                );
              })}
              {accionesFila && <th scope="col" className="sticky top-(--sticky-top) z-(--z-sticky) h-10 w-12 border-b border-ink bg-surface"><span className="sr-only">Acciones</span></th>}
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={columnasTotales} className="p-0">
                  <FilasEsqueleto filas={8} columnas={Math.min(columnas.length, 6)} />
                </td>
              </tr>
            ) : visibles.length === 0 ? (
              <tr>
                <td colSpan={columnasTotales}>{vacio}</td>
              </tr>
            ) : (
              visibles.map((f) => {
                const k = clave(f);
                const marcada = sel.has(k);
                const res = resaltada?.(f) ?? false;
                return (
                  <tr
                    key={k}
                    data-fila={k}
                    data-resaltada={res || undefined}
                    tabIndex={alAbrir ? 0 : undefined}
                    onClick={alAbrir ? () => alAbrir(f) : undefined}
                    onKeyDown={alAbrir ? (e) => teclaFila(e, f) : undefined}
                    ref={res ? (el) => el?.scrollIntoView({ block: 'center' }) : undefined}
                    className={cn(
                      'group/fila border-b border-line-soft transition-colors duration-(--dur-instant)',
                      ALTO_FILA[densidad],
                      alAbrir && 'cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
                      marcada ? 'bg-selected shadow-[inset_2px_0_0_var(--c-ink)]' : 'hover:bg-surface-2',
                      res && 'animate-flash shadow-[inset_2px_0_0_var(--c-accent)]',
                    )}
                  >
                    {conSeleccion && (
                      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
                      <td className="w-10 pl-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          aria-label="Seleccionar fila"
                          marcado={marcada}
                          alCambiar={(v) => {
                            const s = new Set(sel);
                            if (v) s.add(k);
                            else s.delete(k);
                            alSeleccionar?.(s);
                          }}
                        />
                      </td>
                    )}
                    {columnas.map((c, i) => {
                      const contenido = c.celda(f);
                      const der = c.alinear === 'der' || c.numerica;
                      return (
                        <td
                          key={c.id}
                          title={c.truncar && (typeof contenido === 'string' || typeof contenido === 'number') ? String(contenido) : undefined}
                          className={cn(
                            'px-3 t-body text-ink',
                            i === 0 && !conSeleccion && 'pl-4',
                            der ? 'text-right num' : ALINEAR[c.alinear ?? 'izq'],
                            c.truncar && 'max-w-0 truncate',
                          )}
                        >
                          {contenido}
                        </td>
                      );
                    })}
                    {accionesFila && (
                      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
                      <td className="w-12 pr-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <span className="inline-flex opacity-40 transition-opacity group-hover/fila:opacity-100 group-focus-within/fila:opacity-100 focus-within:opacity-100">
                          {accionesFila(f)}
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
          {totales && visibles.length > 0 && !cargando && (
            <tfoot>
              <tr className="h-11">
                {conSeleccion && <td className="sticky bottom-0 border-t border-ink bg-surface" />}
                {columnas.map((c, i) => (
                  <td
                    key={c.id}
                    className={cn(
                      'sticky bottom-0 z-(--z-sticky) border-t border-ink bg-surface px-3 t-body font-bold num text-ink',
                      i === 0 && !conSeleccion && 'pl-4',
                      c.alinear === 'der' || c.numerica ? 'text-right' : 'text-left',
                    )}
                  >
                    {i === 0 && totales[c.id] === undefined ? <span className="t-eyebrow text-ink-2">Totales del filtro</span> : totales[c.id]}
                  </td>
                ))}
                {accionesFila && <td className="sticky bottom-0 border-t border-ink bg-surface" />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {tamPagina > 0 && ordenadas.length > 0 && (
        <div className="flex h-12 items-center justify-between gap-4 border-t border-line-soft px-4">
          <p className="t-small num text-muted">
            Mostrando {entero(paginaReal * tamPagina + 1)}–{entero(Math.min(ordenadas.length, (paginaReal + 1) * tamPagina))} de {entero(ordenadas.length)}{' '}
            {ordenadas.length === 1 ? sustantivo[0] : sustantivo[1]}
          </p>
          <div className="flex items-center gap-2">
            <span className="t-small text-muted">Filas:</span>
            <Select
              tamano="sm"
              etiqueta="Filas por página"
              etiquetaOculta
              valor={String(tamPagina)}
              alCambiar={(v) => {
                setTamPagina(Number(v));
                setPagina(0);
              }}
              opciones={[
                { valor: '25', etiqueta: '25' },
                { valor: '50', etiqueta: '50' },
                { valor: '100', etiqueta: '100' },
              ]}
              ancho={72}
            />
            <button
              type="button"
              aria-label="Página anterior"
              disabled={paginaReal === 0}
              onClick={() => setPagina(paginaReal - 1)}
              className="inline-flex size-8 items-center justify-center text-ink hover:bg-surface-2 disabled:text-disabled"
            >
              <Icono icono={ChevronLeft} tamano={16} />
            </button>
            <span className="t-small num text-ink-2">
              Página {entero(paginaReal + 1)} de {entero(paginas)}
            </span>
            <button
              type="button"
              aria-label="Página siguiente"
              disabled={paginaReal >= paginas - 1}
              onClick={() => setPagina(paginaReal + 1)}
              className="inline-flex size-8 items-center justify-center text-ink hover:bg-surface-2 disabled:text-disabled"
            >
              <Icono icono={ChevronRight} tamano={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Botón de acciones de fila (MoreHorizontal ghost 28): úsalo como disparador de `<Menu>`. */
export function BotonAccionesFila(props: { 'aria-label'?: string; onClick?: () => void }) {
  return (
    <button type="button" aria-label={props['aria-label'] ?? 'Más acciones'} onClick={props.onClick} className="inline-flex size-7 items-center justify-center text-ink hover:bg-surface-2 data-[state=open]:bg-selected">
      <Icono icono={MoreHorizontal} tamano={16} />
    </button>
  );
}

/**
 * Franja de resumen sobre la tabla (8.7.12, PRD 7.3): 4 cifras t-kpi-sm que se recalculan con cada filtro.
 *   <FranjaResumen cifras={[{ etiqueta: 'Ventas', valor: <Dinero valor={t.netas} /> }, …]} />
 */
export function FranjaResumen({ cifras, className }: { cifras: readonly { etiqueta: ReactNode; valor: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-2 border border-line bg-surface md:grid-cols-4', className)}>
      {cifras.map((c, i) => (
        <div key={i} className={cn('px-5 py-4', i > 0 && 'border-l border-line-soft')}>
          <dt className="t-eyebrow text-ink-2">{c.etiqueta}</dt>
          <dd className="mt-2 t-kpi-sm text-ink">{c.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

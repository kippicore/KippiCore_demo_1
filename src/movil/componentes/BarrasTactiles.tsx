import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@/ui/ligero';
import { alturasRelativas, etiquetasVisibles, indiceBajoPunto } from '../calculos';

/**
 * Gráfico de barras para el celular (PLAN 8.5.4): sin eje Y, solo etiquetas del eje X, 160 px de alto, y tocar (o
 * arrastrar el dedo sobre) una barra muestra su valor ARRIBA del gráfico (no un tooltip flotante). Es CSS puro, sin
 * Recharts: cuesta 0 KB en el arranque. Accesible: es un grupo de botones con flechas (← →) y cada barra dice su
 * valor; "Ver como tabla" no hace falta porque el valor de cada barra siempre se puede leer.
 *
 *   <BarrasTactiles datos={[{ clave: '10', etiqueta: '10 a. m.', valor: 120000 }]} formatear={(v) => dinero(v)} titulo="Ventas por hora" />
 */
export interface BarraDato {
  clave: string;
  /** Etiqueta corta del eje X. */
  etiqueta: string;
  /** Texto completo para la lectura al tocar ("3 p. m."). */
  nombre?: string;
  valor: number;
  /** Texto adicional de la lectura ("12 ventas"). */
  nota?: string;
}

export function BarrasTactiles({
  datos,
  formatear,
  titulo,
  alto = 160,
  inicial = 'ultima',
  className,
  'data-testid': testid,
}: {
  datos: readonly BarraDato[];
  formatear: (valor: number) => string;
  titulo: string;
  alto?: number;
  /** Barra seleccionada al inicio: la mayor o la última. */
  inicial?: 'mayor' | 'ultima';
  className?: string;
  'data-testid'?: string;
}) {
  const indiceInicial = (() => {
    if (datos.length === 0) return 0;
    if (inicial === 'ultima') return datos.length - 1;
    let m = 0;
    datos.forEach((d, i) => {
      if (d.valor > (datos[m]?.valor ?? 0)) m = i;
    });
    return m;
  })();
  // La selección vale para este conjunto de barras; si cambian (otro periodo o local) vuelve a su lugar inicial.
  const claves = datos.map((d) => d.clave).join('|');
  const [elegida, setElegida] = useState<{ claves: string; i: number } | null>(null);
  const sel = elegida && elegida.claves === claves ? Math.min(elegida.i, Math.max(0, datos.length - 1)) : indiceInicial;
  const setSel = (i: number) => setElegida({ claves, i });
  const [pintado, setPintado] = useState(false);
  const caja = useRef<HTMLDivElement | null>(null);
  const alturas = alturasRelativas(datos.map((d) => d.valor));
  const visibles = etiquetasVisibles(datos.length);

  // Las barras crecen desde cero la primera vez que se pintan (si el usuario no pidió menos movimiento, el CSS global lo anula).
  useEffect(() => {
    const t = requestAnimationFrame(() => setPintado(true));
    return () => cancelAnimationFrame(t);
  }, []);
  const alPuntero = (e: PointerEvent<HTMLDivElement>) => {
    const r = caja.current?.getBoundingClientRect();
    if (!r || datos.length === 0) return;
    setSel(indiceBajoPunto(e.clientX - r.left, r.width, datos.length));
  };
  const alTeclado = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const j = Math.max(0, Math.min(datos.length - 1, i + d));
    setSel(j);
    (caja.current?.children[j] as HTMLElement | undefined)?.focus();
  };

  const actual = datos[sel];
  return (
    <div className={className} data-testid={testid}>
      <div className="min-h-11" aria-live="polite">
        {actual ? (
          <>
            <p data-testid="barras-lectura" className="t-kpi-sm text-ink">
              {formatear(actual.valor)}
            </p>
            <p className="t-small text-muted">
              {actual.nombre ?? actual.etiqueta}
              {actual.nota ? ` · ${actual.nota}` : ''}
            </p>
          </>
        ) : null}
      </div>
      <div
        ref={caja}
        role="group"
        aria-label={titulo}
        onPointerDown={alPuntero}
        onPointerMove={(e) => e.buttons === 1 && alPuntero(e)}
        style={{ height: alto, touchAction: 'pan-y' }}
        className="relative mt-3 flex items-end gap-[3px] border-b border-line"
      >
        {datos.map((d, i) => {
          const activa = i === sel;
          return (
            <button
              key={d.clave}
              type="button"
              aria-label={`${d.nombre ?? d.etiqueta}: ${formatear(d.valor)}`}
              aria-pressed={activa}
              tabIndex={activa ? 0 : -1}
              onKeyDown={(e) => alTeclado(e, i)}
              onFocus={() => setSel(i)}
              className="group flex h-full min-w-0 flex-1 items-end focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span
                className={cn('block w-full transition-[height,background-color] duration-(--dur-slower) ease-enter', activa ? 'bg-ink' : 'bg-chart-3')}
                style={{ height: pintado ? `${Math.max(alturas[i] ?? 0, d.valor > 0 ? 0.02 : 0) * 100}%` : '0%' }}
              />
            </button>
          );
        })}
      </div>
      <div aria-hidden className="mt-1.5 flex gap-[3px]">
        {datos.map((d, i) => (
          <span key={d.clave} className="relative min-w-0 flex-1">
            {visibles.has(i) && (
              <span className={cn('absolute top-0 whitespace-nowrap t-micro text-ink-2', i === 0 ? 'left-0' : i === datos.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2')}>{d.etiqueta}</span>
            )}
            <span className="invisible block t-micro">&nbsp;</span>
          </span>
        ))}
      </div>
    </div>
  );
}

import { useId, useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn, prefiereMenosMovimiento } from '../cn';

/**
 * Gráficos (PLAN 8.9). Nadie usa Recharts "desnudo": todo pasa por aquí. Escala de grises fija por local (Parque 93 →
 * serie 1, Usaquén → 2, Zona Rosa → 3, Bodega → 4), ETIQUETAS DIRECTAS con el nombre de cada local junto a su serie
 * (al final de la línea o dentro del último tramo de la barra apilada), camel solo para el hallazgo, rejilla solo
 * horizontal, eje Y sin línea con cifras cortas, tooltip negro, leyenda arriba a la izquierda (clic atenúa las
 * demás), animación solo en la primera carga, "Ver como tabla" accesible. Sin tortas, sin 3D, sin doble eje.
 *
 * Presentacional: recibe números ya convertidos. Para dinero usa `<GraficoDinero>` (ui/conectados), que convierte
 * a la moneda activa y formatea ejes y tooltips.
 *
 *   <GraficoBase tipo="barras" apiladas titulo="Ventas de los últimos 30 días por local" lectura="…"
 *     datos={dias} x="dia" formatoX={fechaCorta}
 *     series={[{ clave: 'p93', nombre: 'Parque 93', color: 1 }, { clave: 'usq', nombre: 'Usaquén', color: 2 }, { clave: 'zr', nombre: 'Zona Rosa', color: 3 }]}
 *     formatoY={(n) => cifraCorta(n)} formatoValor={(n) => dinero(n)} destacarX="2026-09-27" />
 */
export type ColorSerie = 1 | 2 | 3 | 4 | 'acento';
export type TipoSerie = 'barras' | 'linea' | 'area';

export interface SerieGrafico {
  clave: string;
  nombre: string;
  color?: ColorSerie;
  /** Tipo de esta serie (por defecto, el del gráfico). */
  tipo?: TipoSerie;
  /** Año anterior / referencia: chart-3 punteado 4 4. */
  punteada?: boolean;
}

export type Fila = Record<string, string | number | null>;

export interface PropsGraficoBase {
  tipo?: TipoSerie;
  datos: readonly Fila[];
  /** Clave de la categoría del eje X. */
  x: string;
  series: readonly SerieGrafico[];
  titulo?: ReactNode;
  /** Frase de lectura en t-small muted ("Los sábados venden 1,8 veces más que los martes"). */
  lectura?: ReactNode;
  apiladas?: boolean;
  /** Etiquetas directas por serie (por defecto, sí cuando hay más de una serie). */
  etiquetasDirectas?: boolean;
  formatoX?: (v: string) => string;
  formatoY?: (n: number) => string;
  /** Cifra completa del tooltip y de la tabla. */
  formatoValor?: (n: number) => string;
  /** Categoría del hallazgo: su barra (o punto) va en camel. */
  destacarX?: string | null;
  referencia?: { valor: number; etiqueta: string } | null;
  /** Línea vertical de "hoy" en una categoría. */
  referenciaX?: { x: string; etiqueta: string } | null;
  alto?: number;
  /** Superficie móvil: sin eje Y, 160 px de alto, el valor tocado arriba del gráfico (8.5.4). */
  movil?: boolean;
  /** Oculta "Ver como tabla" (solo si la misma información está en una tabla al lado). */
  sinTabla?: boolean;
  className?: string;
  'data-testid'?: string;
}

const COLOR: Record<string, string> = {
  '1': 'var(--c-chart-1)',
  '2': 'var(--c-chart-2)',
  '3': 'var(--c-chart-3)',
  '4': 'var(--c-chart-4)',
  acento: 'var(--c-accent)',
};

export function colorSerie(c: ColorSerie | undefined, i: number): string {
  return COLOR[String(c ?? ((i % 4) + 1))] ?? COLOR['1']!;
}

/** Color fijo por local (8.9.1): por el orden del local en la configuración (1 Parque 93 … 4 Bodega). */
export function colorDeLocal(orden: number): ColorSerie {
  return (Math.min(4, Math.max(1, orden)) as ColorSerie) ?? 1;
}

const TICK = { fill: 'var(--c-ink-2)', fontSize: 12, fontFamily: 'var(--font-sans)' } as const;

function TooltipNegro({ active, payload, label, formatoX, formatoValor, series }: { active?: boolean; payload?: readonly { dataKey?: unknown; value?: unknown; color?: string }[]; label?: unknown; formatoX: (v: string) => string; formatoValor: (n: number) => string; series: readonly SerieGrafico[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-44 rounded-none bg-ink px-2.5 py-2 t-small num text-inverse">
      <p className="mb-1 font-bold">{formatoX(String(label ?? ''))}</p>
      {payload.map((p, i) => {
        const s = series.find((x) => x.clave === p.dataKey);
        if (!s || typeof p.value !== 'number') return null;
        return (
          <p key={i} className="flex items-center gap-2">
            <span aria-hidden className="size-2 shrink-0 border border-inverse/40" style={{ background: p.color }} />
            <span className="flex-1">{s.nombre}</span>
            <span className="font-semibold">{formatoValor(p.value)}</span>
          </p>
        );
      })}
    </div>
  );
}

export function GraficoBase({
  tipo = 'barras',
  datos,
  x,
  series,
  titulo,
  lectura,
  apiladas,
  etiquetasDirectas,
  formatoX = (v) => v,
  formatoY = (n) => String(n),
  formatoValor,
  destacarX,
  referencia,
  referenciaX,
  alto,
  movil,
  sinTabla,
  className,
  ...resto
}: PropsGraficoBase) {
  const id = useId();
  const [atenuar, setAtenuar] = useState<string | null>(null);
  const [verTabla, setVerTabla] = useState(false);
  const [tocado, setTocado] = useState<number | null>(null);
  const [animar] = useState(() => !prefiereMenosMovimiento());
  const fmtValor = formatoValor ?? formatoY;
  const directas = etiquetasDirectas ?? series.length > 1;
  const altura = alto ?? (movil ? 160 : 280);

  const datosNum = useMemo(() => datos.map((d) => ({ ...d, __x: String(d[x] ?? '') })), [datos, x]);

  // Escala propia del eje Y (0 → máximo "redondo"): así las etiquetas directas se ubican sin medir el SVG.
  const escala = useMemo(() => {
    let max = 0;
    let min = 0;
    for (const f of datos) {
      let pila = 0;
      for (const s of series) {
        const v = f[s.clave];
        if (typeof v !== 'number') continue;
        if (apiladas && (s.tipo ?? tipo) === 'barras') pila += v;
        else {
          max = Math.max(max, v);
          min = Math.min(min, v);
        }
      }
      max = Math.max(max, pila);
    }
    return escalaRedonda(min, max);
  }, [datos, series, apiladas, tipo]);
  const etiquetas = useMemo(() => (directas ? posicionesEtiquetas(datos, series, apiladas ?? false, tipo, escala, altura) : []), [directas, datos, series, apiladas, tipo, escala, altura]);
  const margenDerecho = etiquetas.length ? 104 : 8;

  return (
    <figure className={cn('min-w-0', className)} data-testid={resto['data-testid']}>
      {(titulo || lectura) && (
        <figcaption className="mb-3">
          {titulo && <h3 className="t-h3 text-ink">{titulo}</h3>}
          {lectura && <p className="mt-1 max-w-[72ch] t-small text-muted">{lectura}</p>}
        </figcaption>
      )}
      {series.length > 1 && (
        <ul className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Leyenda">
          {series.map((s, i) => {
            const linea = (s.tipo ?? tipo) !== 'barras';
            return (
              <li key={s.clave}>
                <button
                  type="button"
                  onClick={() => setAtenuar((a) => (a === s.clave ? null : s.clave))}
                  aria-pressed={atenuar === s.clave}
                  className={cn('inline-flex items-center gap-1.5 t-micro text-ink-2 transition-opacity hover:text-ink', atenuar && atenuar !== s.clave && 'opacity-40')}
                >
                  <span aria-hidden className={linea ? 'h-0.5 w-3' : 'size-2'} style={{ background: s.punteada ? 'var(--c-chart-3)' : colorSerie(s.color, i) }} />
                  {s.nombre}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {movil && (
        <p className="mb-1 h-5 t-small num text-ink-2" aria-live="polite">
          {tocado !== null && datos[tocado]
            ? `${formatoX(String(datos[tocado]?.[x] ?? ''))} · ${series.map((s) => fmtValor(Number(datos[tocado]?.[s.clave] ?? 0))).join(' · ')}`
            : ''}
        </p>
      )}
      <div style={{ height: altura }} className="relative w-full">
        {etiquetas.length > 0 && (
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-[100px]">
            {etiquetas.map((et) => (
              <span key={et.clave} className="absolute left-0 flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap t-micro font-semibold text-ink-2" style={{ top: et.y }}>
                <span className="h-px w-2.5 bg-ink-2" />
                {et.nombre}
              </span>
            ))}
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={datosNum}
            margin={{ top: 8, right: margenDerecho, bottom: 0, left: movil ? 0 : 0 }}
            barCategoryGap="24%"
            onClick={movil ? (e) => setTocado(typeof e?.activeTooltipIndex === 'number' ? e.activeTooltipIndex : null) : undefined}
            accessibilityLayer
            aria-labelledby={`${id}-t`}
          >
            <CartesianGrid vertical={false} stroke="var(--c-chart-grid)" />
            <XAxis
              dataKey="__x"
              axisLine={{ stroke: 'var(--c-chart-axis)' }}
              tickLine={false}
              tick={TICK}
              tickMargin={8}
              interval="preserveStartEnd"
              tickFormatter={(v: string) => formatoX(v)}
              minTickGap={12}
            />
            <YAxis hide={movil} axisLine={false} tickLine={false} tick={TICK} width={movil ? 0 : 56} domain={[escala.min, escala.max]} ticks={escala.marcas} allowDataOverflow tickFormatter={(n: number) => formatoY(n)} />
            {!movil && (
              <RTooltip
                isAnimationActive={false}
                cursor={tipo === 'barras' ? { fill: 'var(--c-ink)', fillOpacity: 0.04 } : { stroke: 'var(--c-ink)', strokeOpacity: 0.2, strokeWidth: 1 }}
                content={(p) => <TooltipNegro {...(p as object)} formatoX={formatoX} formatoValor={fmtValor} series={series} />}
              />
            )}
            {referencia && (
              <ReferenceLine
                y={referencia.valor}
                stroke="var(--c-ink)"
                strokeDasharray="3 3"
                label={{ value: referencia.etiqueta, position: 'insideTopRight', fill: 'var(--c-ink-2)', fontSize: 12, fontFamily: 'var(--font-sans)' }}
              />
            )}
            {referenciaX && (
              <ReferenceLine
                x={referenciaX.x}
                stroke="var(--c-ink)"
                strokeDasharray="3 3"
                label={{ value: referenciaX.etiqueta, position: 'insideTopRight', fill: 'var(--c-ink-2)', fontSize: 12, fontFamily: 'var(--font-sans)' }}
              />
            )}
            {series.map((s, i) => {
              const t = s.tipo ?? tipo;
              const color = s.punteada ? 'var(--c-chart-3)' : colorSerie(s.color, i);
              const opacidad = atenuar && atenuar !== s.clave ? 0.25 : 1;
              if (t === 'barras')
                return (
                  <Bar
                    key={s.clave}
                    dataKey={s.clave}
                    name={s.nombre}
                    stackId={apiladas ? 'pila' : undefined}
                    fill={color}
                    fillOpacity={opacidad}
                    radius={0}
                    maxBarSize={28}
                    stroke={apiladas ? 'var(--c-surface)' : undefined}
                    strokeWidth={apiladas ? 1 : 0}
                    isAnimationActive={animar}
                    animationDuration={600}
                    animationEasing="ease-out"
                  >
                    {destacarX !== undefined &&
                      destacarX !== null &&
                      datosNum.map((d, j) => <Cell key={j} fill={d.__x === destacarX && (!apiladas || i === series.length - 1) ? 'var(--c-accent)' : color} />)}
                  </Bar>
                );
              if (t === 'area')
                return (
                  <Area
                    key={s.clave}
                    dataKey={s.clave}
                    name={s.nombre}
                    type="monotone"
                    stroke="var(--c-ink)"
                    strokeWidth={2}
                    fill="var(--c-ink)"
                    fillOpacity={0.06 * opacidad}
                    strokeOpacity={opacidad}
                    dot={false}
                    activeDot={{ r: 4, fill: 'var(--c-ink)', stroke: 'var(--c-surface)', strokeWidth: 2 }}
                    isAnimationActive={animar}
                    animationDuration={600}
                  />
                );
              return (
                <Line
                  key={s.clave}
                  dataKey={s.clave}
                  name={s.nombre}
                  type="monotone"
                  stroke={color}
                  strokeOpacity={opacidad}
                  strokeWidth={i === 0 && !s.punteada ? 2 : 1.5}
                  strokeDasharray={s.punteada ? '4 4' : undefined}
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--c-ink)', stroke: 'var(--c-surface)', strokeWidth: 2 }}
                  isAnimationActive={animar}
                  animationDuration={600}
                  connectNulls
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {!sinTabla && (
        <div className="mt-2">
          <button type="button" onClick={() => setVerTabla((v) => !v)} aria-expanded={verTabla} className="t-small text-ink-2 underline-offset-4 hover:underline">
            {verTabla ? 'Ocultar tabla' : 'Ver como tabla'}
          </button>
          {verTabla && (
            <div className="mt-2 max-h-72 overflow-auto border border-line">
              <table className="w-full t-small num">
                <caption className="sr-only">{typeof titulo === 'string' ? titulo : 'Datos del gráfico'}</caption>
                <thead>
                  <tr className="border-b border-ink">
                    <th scope="col" className="sticky top-0 bg-surface px-3 py-2 text-left t-eyebrow text-ink-2">
                      &nbsp;
                    </th>
                    {series.map((s) => (
                      <th key={s.clave} scope="col" className="sticky top-0 bg-surface px-3 py-2 text-right t-eyebrow text-ink-2">
                        {s.nombre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {datos.map((d, i) => (
                    <tr key={i} className="border-b border-line-soft">
                      <th scope="row" className="px-3 py-1.5 text-left font-normal text-ink">
                        {formatoX(String(d[x] ?? ''))}
                      </th>
                      {series.map((s) => (
                        <td key={s.clave} className="px-3 py-1.5 text-right text-ink">
                          {typeof d[s.clave] === 'number' ? fmtValor(d[s.clave] as number) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <span id={`${id}-t`} className="sr-only">
        {typeof titulo === 'string' ? titulo : 'Gráfico'}
      </span>
    </figure>
  );
}

/** Barras (8.9.2): apiladas por local con etiquetas directas, o simples con la barra del hallazgo en camel. */
export function GraficoBarras(p: Omit<PropsGraficoBase, 'tipo'>) {
  return <GraficoBase {...p} tipo="barras" />;
}
/** Líneas con el nombre de cada serie al final de la línea. */
export function GraficoLineas(p: Omit<PropsGraficoBase, 'tipo'>) {
  return <GraficoBase {...p} tipo="linea" />;
}
/** Área: solo para el flujo de caja proyectado (línea ink 2 px + relleno al 6 %). */
export function GraficoArea(p: Omit<PropsGraficoBase, 'tipo' | 'apiladas'>) {
  return <GraficoBase {...p} tipo="area" />;
}

/** Máximo "redondo" y marcas (4 tramos con paso 1 · 2 · 2,5 · 5 × 10ⁿ). */
export function escalaRedonda(min: number, max: number): { min: number; max: number; marcas: number[] } {
  const rango = Math.max(max - Math.min(0, min), 1);
  const bruto = rango / 4;
  const pot = Math.pow(10, Math.floor(Math.log10(bruto)));
  const paso = ([1, 2, 2.5, 5, 10].find((m) => m * pot >= bruto) ?? 10) * pot;
  const lo = min < 0 ? -Math.ceil(-min / paso) * paso : 0;
  const hi = Math.max(paso, Math.ceil(max / paso) * paso);
  const marcas: number[] = [];
  for (let v = lo; v <= hi + paso / 2; v += paso) marcas.push(Math.round(v * 1000) / 1000);
  return { min: lo, max: hi, marcas };
}

const MARGEN_SUPERIOR = 8;
const ALTO_EJE_X = 30;

/**
 * Posición vertical (px) de la etiqueta directa de cada serie (8.9.1): a la altura del último punto de cada línea o
 * del centro de su tramo en la última barra apilada, separadas al menos 15 px (sin encimarse).
 */
function posicionesEtiquetas(
  datos: readonly Fila[],
  series: readonly SerieGrafico[],
  apiladas: boolean,
  tipo: TipoSerie,
  escala: { min: number; max: number },
  altura: number,
): { clave: string; nombre: string; y: number }[] {
  const visibles = series.filter((s) => !s.punteada);
  if (visibles.length < 2 || !datos.length) return [];
  const alto = altura - MARGEN_SUPERIOR - ALTO_EJE_X;
  const aY = (v: number) => MARGEN_SUPERIOR + (1 - (v - escala.min) / (escala.max - escala.min || 1)) * alto;
  // Para barras apiladas se usa la barra más alta de las últimas 7 (la de hoy suele estar a medias).
  let i = datos.length - 1;
  if (apiladas && tipo === 'barras') {
    let mejor = -1;
    for (let j = Math.max(0, datos.length - 7); j < datos.length; j++) {
      const t = visibles.reduce((s, x) => s + (typeof datos[j]?.[x.clave] === 'number' ? (datos[j]?.[x.clave] as number) : 0), 0);
      if (t > mejor) {
        mejor = t;
        i = j;
      }
    }
  }
  const fila = datos[i] ?? {};
  let acumulado = 0;
  const r = visibles.map((s) => {
    const v = typeof fila[s.clave] === 'number' ? (fila[s.clave] as number) : 0;
    if (apiladas && (s.tipo ?? tipo) === 'barras') {
      const y = aY(acumulado + v / 2);
      acumulado += v;
      return { clave: s.clave, nombre: s.nombre, y };
    }
    return { clave: s.clave, nombre: s.nombre, y: aY(v) };
  });
  // Separación mínima de 15 px (de arriba abajo) y dentro del área.
  const orden = [...r].sort((a, b) => a.y - b.y);
  for (let k = 1; k < orden.length; k++) {
    const prev = orden[k - 1]!;
    const act = orden[k]!;
    if (act.y - prev.y < 15) act.y = prev.y + 15;
  }
  const limite = MARGEN_SUPERIOR + alto;
  for (let k = orden.length - 1; k >= 0; k--) {
    const act = orden[k]!;
    const sig = orden[k + 1];
    const tope = sig ? sig.y - 15 : limite;
    if (act.y > tope) act.y = tope;
  }
  return orden;
}

import { useState, type ReactNode } from 'react';
import { porcentaje } from '@/lib/formato';
import { cn } from '../cn';

/**
 * Mapa de calor día × hora (PLAN 8.9.4): 7 filas (Lun … Dom) × 12 columnas (10 a. m. … 9 p. m.), celdas cuadradas de
 * 28 px (32 en ≥ 1440) con 2 px de separación, radio 0, escala secuencial de 6 pasos por cuantiles (heat-0 … heat-5,
 * invertida en oscuro). Hover/foco: borde y la lectura de la celda arriba ("Sábado, 3 p. m. – 4 p. m. · $ 4,8 M ·
 * 9 % de la semana"). El hallazgo lleva contorno camel de 2 px y una nota al lado.
 *
 *   <MapaCalor valores={matriz7x12} formatoValor={dinero.corta} hallazgo={{ fila: 5, desde: 5, hasta: 8, nota: 'Sábados de 3 a 6 p. m.: 22 % de tus ventas' }} />
 */
export const FILAS_MAPA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;
const NOMBRES_DIA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;
/** Horas de inicio (24 h) de las 12 columnas. */
export const HORAS_MAPA = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21] as const;

const PASOS = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4', 'bg-heat-5'] as const;

function horaCorta(h: number): string {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}

/** Cortes por cuantiles (5 umbrales) de los valores no nulos. */
export function cuantiles(valores: readonly number[]): number[] {
  const v = valores.filter((x) => x > 0).sort((a, b) => a - b);
  if (!v.length) return [1, 2, 3, 4, 5];
  return [1, 2, 3, 4, 5].map((k) => v[Math.min(v.length - 1, Math.floor((k / 6) * v.length))] ?? 0);
}

export interface PropsMapaCalor {
  /** 7 × 12: valores[fila][columna] (fila 0 = lunes). */
  valores: readonly (readonly number[])[];
  formatoValor: (n: number) => string;
  hallazgo?: { fila: number; desde: number; hasta: number; nota: ReactNode } | null;
  className?: string;
}

export function MapaCalor({ valores, formatoValor, hallazgo, className }: PropsMapaCalor) {
  const [activa, setActiva] = useState<[number, number] | null>(null);
  const todos = valores.flat();
  const total = todos.reduce((a, b) => a + b, 0) || 1;
  const cortes = cuantiles(todos);
  const paso = (v: number) => (v <= 0 ? 0 : Math.min(5, 1 + cortes.filter((c) => v > c).length));
  const lectura = activa
    ? (() => {
        const [f, c] = activa;
        const v = valores[f]?.[c] ?? 0;
        const h = HORAS_MAPA[c] ?? 10;
        return `${NOMBRES_DIA[f]}, ${horaCorta(h)} – ${horaCorta(h + 1)} · ${formatoValor(v)} · ${porcentaje(v / total)} de la semana`;
      })()
    : '';
  return (
    <div className={cn('flex flex-wrap items-start gap-8', className)}>
      <div>
        <p className="mb-2 h-[18px] t-small num text-ink-2" aria-live="polite">
          {lectura}
        </p>
        <div className="grid grid-cols-[36px_repeat(12,28px)] gap-0.5 wide:grid-cols-[36px_repeat(12,32px)]" role="grid" aria-label="Ventas por día y hora">
          <span />
          <span className="col-span-2 t-micro text-ink-2">a. m.</span>
          <span className="col-span-10 t-micro text-ink-2">p. m.</span>
          <span />
          {HORAS_MAPA.map((h) => (
            <span key={h} className="text-center t-micro num text-ink-2">
              {h % 12 === 0 ? 12 : h % 12}
            </span>
          ))}
          {FILAS_MAPA.map((dia, f) => (
            <div key={dia} role="row" className="contents">
              <span role="rowheader" className="flex items-center t-micro text-ink-2">
                {dia}
              </span>
              {HORAS_MAPA.map((h, c) => {
                const v = valores[f]?.[c] ?? 0;
                const p = Math.min(5, paso(v));
                const enHallazgo = hallazgo && hallazgo.fila === f && c >= hallazgo.desde && c <= hallazgo.hasta;
                return (
                  <button
                    key={h}
                    type="button"
                    role="gridcell"
                    aria-label={`${NOMBRES_DIA[f]}, ${horaCorta(h)}: ${formatoValor(v)}`}
                    onMouseEnter={() => setActiva([f, c])}
                    onFocus={() => setActiva([f, c])}
                    onMouseLeave={() => setActiva(null)}
                    className={cn(
                      'aspect-square w-full rounded-none outline-offset-0 hover:outline hover:outline-1 focus-visible:outline focus-visible:outline-2',
                      PASOS[p],
                      p >= 4 ? 'hover:outline-surface focus-visible:outline-surface' : 'hover:outline-ink focus-visible:outline-ink',
                      enHallazgo && 'shadow-[inset_0_2px_0_var(--c-accent),inset_0_-2px_0_var(--c-accent)]',
                      enHallazgo && c === hallazgo?.desde && 'shadow-[inset_2px_2px_0_var(--c-accent),inset_0_-2px_0_var(--c-accent)]',
                      enHallazgo && c === hallazgo?.hasta && 'shadow-[inset_-2px_2px_0_var(--c-accent),inset_0_-2px_0_var(--c-accent)]',
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 pl-9" aria-hidden>
          <span className="t-micro text-ink-2">Menos</span>
          {PASOS.map((c) => (
            <span key={c} className={cn('size-3', c)} />
          ))}
          <span className="t-micro text-ink-2">Más</span>
        </div>
      </div>
      {hallazgo && (
        <p className="mt-8 max-w-[28ch] border-l-2 border-accent pl-3 t-body text-ink">{hallazgo.nota}</p>
      )}
    </div>
  );
}

/**
 * Cascada (estado de resultados): barras de inicio, aumentos, disminuciones y total, en grises; la utilidad final en
 * ink, las pérdidas en danger. Etiquetas directas encima de cada barra.
 *
 *   <GraficoCascada formato={dinero.corta} pasos={[{ etiqueta: 'Ventas sin IVA', valor: 412e6, total: true }, { etiqueta: 'Costo', valor: -190e6 }, …]} />
 */
export interface PasoCascada {
  etiqueta: string;
  valor: number;
  total?: boolean;
}

export function GraficoCascada({ pasos, formato, alto = 240, className }: { pasos: readonly PasoCascada[]; formato: (n: number) => string; alto?: number; className?: string }) {
  const barras: (PasoCascada & { bajo: number; alto: number })[] = [];
  for (let i = 0, acumulado = 0; i < pasos.length; i++) {
    const p = pasos[i]!;
    const inicio = p.total ? 0 : acumulado;
    const fin = p.total ? p.valor : acumulado + p.valor;
    acumulado = p.total ? p.valor : fin;
    barras.push({ ...p, bajo: Math.min(inicio, fin), alto: Math.max(inicio, fin) });
  }
  const max = Math.max(...barras.map((b) => b.alto), 1);
  const min = Math.min(0, ...barras.map((b) => b.bajo));
  const rango = max - min;
  const y = (v: number) => ((max - v) / rango) * 100;
  return (
    <div className={cn('w-full', className)}>
      <div className="relative flex items-stretch gap-3 border-b border-chart-axis" style={{ height: alto }}>
        {barras.map((b, i) => (
          <div key={i} className="relative flex-1">
            <div
              className={cn('absolute inset-x-[12%]', b.total ? (b.valor < 0 ? 'bg-danger' : 'bg-chart-1') : b.valor < 0 ? 'bg-chart-3' : 'bg-chart-2')}
              style={{ top: `${y(b.alto)}%`, height: `${Math.max(0.5, y(b.bajo) - y(b.alto))}%` }}
              title={`${b.etiqueta}: ${formato(b.valor)}`}
            />
            <span className="absolute inset-x-0 -translate-y-full pb-1 text-center t-micro font-semibold num text-ink-2" style={{ top: `${y(b.alto)}%` }}>
              {b.valor > 0 && !b.total ? '+' : ''}
              {formato(b.valor)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3">
        {barras.map((b, i) => (
          <span key={i} className="flex-1 text-center t-micro text-ink-2">
            {b.etiqueta}
          </span>
        ))}
      </div>
    </div>
  );
}

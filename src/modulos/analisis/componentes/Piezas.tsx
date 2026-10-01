import { TriangleAlert } from 'lucide-react';
import { Component, type ReactNode } from 'react';
import { Button, cn, EmptyState, Segmentado } from '@/ui';
import { PERIODOS, type IdPeriodo } from '../textos';

/** Piezas pequeñas que comparten las cinco pantallas de Análisis. */

/** Período con atajos legibles (30 días · 90 días · 6 meses · 12 meses). */
export function SelectorPeriodo({
  valor,
  alCambiar,
  opciones = PERIODOS.map((p) => p.id),
  etiqueta = 'Período',
  testid = 'selector-periodo',
}: {
  valor: IdPeriodo;
  alCambiar: (v: IdPeriodo) => void;
  opciones?: readonly IdPeriodo[];
  etiqueta?: string;
  testid?: string;
}) {
  return (
    <Segmentado
      etiqueta={etiqueta}
      valor={valor}
      alCambiar={alCambiar}
      data-testid={testid}
      opciones={PERIODOS.filter((p) => opciones.includes(p.id)).map((p) => ({ valor: p.id, etiqueta: p.etiqueta, 'data-testid': `${testid}-${p.id}` }))}
    />
  );
}

/** Encabezado de sección dentro de una página: título, frase de apoyo y controles a la derecha. */
export function CabezaSeccion({ titulo, texto, derecha, id }: { titulo: ReactNode; texto?: ReactNode; derecha?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h2 id={id} className="t-h2 text-ink">
          {titulo}
        </h2>
        {texto && <p className="mt-1 max-w-[72ch] t-small text-muted">{texto}</p>}
      </div>
      {derecha && <div className="flex flex-wrap items-center gap-3">{derecha}</div>}
    </div>
  );
}

export type TonoBarra = 'normal' | 'destacado' | 'alerta';

export interface FilaBarra {
  id: string;
  etiqueta: ReactNode;
  /** Largo de la barra (se compara con el máximo o con `max`). */
  valor: number;
  /** Cifra a la derecha (ya formateada con <Dinero>, numero(), etc.). */
  texto: ReactNode;
  /** Línea pequeña bajo la etiqueta. */
  nota?: ReactNode;
  tono?: TonoBarra;
  /** Insignia junto a la etiqueta. */
  insignia?: ReactNode;
}

/**
 * Barras horizontales con etiqueta directa: la forma más clara de comparar pocas cosas (locales, vendedores,
 * categorías, tallas). La barra del hallazgo va en camel; la que preocupa, en rojo. Una `marca` dibuja una línea
 * de referencia (por ejemplo, el promedio de la tienda).
 */
export function BarrasHorizontales({
  filas,
  max,
  marca,
  anchoEtiqueta = 190,
  anchoTexto = 110,
  className,
  testid,
}: {
  filas: readonly FilaBarra[];
  max?: number;
  marca?: { valor: number; etiqueta: string } | null;
  anchoEtiqueta?: number;
  anchoTexto?: number;
  className?: string;
  testid?: string;
}) {
  const tope = Math.max(max ?? 0, ...filas.map((f) => f.valor), marca?.valor ?? 0, 1);
  const pos = (v: number) => `${String(Math.max(0, Math.min(100, (v / tope) * 100)))}%`;
  return (
    <ul className={cn('divide-y divide-line-soft', className)} data-testid={testid}>
      {filas.map((f) => (
        <li key={f.id} data-fila={f.id} className="grid items-center gap-x-4 py-2.5" style={{ gridTemplateColumns: `${String(anchoEtiqueta)}px minmax(0,1fr) ${String(anchoTexto)}px` }}>
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate t-body text-ink">
              <span className="truncate">{f.etiqueta}</span>
              {f.insignia}
            </p>
            {f.nota && <p className="t-small text-muted">{f.nota}</p>}
          </div>
          <div className="relative h-3 bg-selected" aria-hidden>
            <div className={cn('h-full', f.tono === 'destacado' ? 'bg-accent' : f.tono === 'alerta' ? 'bg-danger' : 'bg-ink')} style={{ width: pos(f.valor) }} />
            {marca && <span className="absolute -inset-y-1 w-px bg-ink" style={{ left: pos(marca.valor) }} />}
          </div>
          <p className="text-right t-body font-semibold num text-ink">{f.texto}</p>
        </li>
      ))}
      {marca && (
        <li className="relative py-2 t-micro text-ink-2" aria-hidden>
          <span className="pl-1">| {marca.etiqueta}</span>
        </li>
      )}
    </ul>
  );
}

/** Estado de error de una sección: no tumba la página, deja reintentar. */
export class LimiteErrores extends Component<{ children: ReactNode; titulo?: string }, { fallo: boolean }> {
  override state = { fallo: false };
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  override render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <EmptyState
        tamano="tabla"
        icono={TriangleAlert}
        titulo={this.props.titulo ?? 'No pudimos armar esta parte'}
        texto="Algo salió mal al calcular. Tus datos están bien: intenta de nuevo."
        accion={
          <Button variante="secondary" tamano="sm" onClick={() => this.setState({ fallo: false })}>
            Intentar de nuevo
          </Button>
        }
      />
    );
  }
}

/** Dato suelto con etiqueta (franja de cifras de apoyo bajo un gráfico). */
export function DatoApoyo({ etiqueta, children, nota, testid }: { etiqueta: ReactNode; children: ReactNode; nota?: ReactNode; testid?: string }) {
  return (
    <div data-testid={testid}>
      <p className="t-eyebrow text-ink-2">{etiqueta}</p>
      <p className="mt-1 t-h3 num text-ink">{children}</p>
      {nota && <p className="mt-0.5 t-small text-muted">{nota}</p>}
    </div>
  );
}

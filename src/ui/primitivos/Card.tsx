import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { variacion as formatoVariacion } from '@/lib/formato';
import { cn } from '../cn';
import { Sparkline } from '../graficos/Sparkline';
import { Cifra } from '../texto/Cifra';
import { Icono } from './Icono';

/**
 * Tarjeta y KPI (PLAN 8.7.11). Tarjeta: `bg-surface border-line`, radio 0, SIN sombra (ni en hover). Clicable: toda
 * la tarjeta es el enlace, hover `border-ink` y aparece `ArrowUpRight`. KPI: etiqueta eyebrow, cifra t-kpi con
 * contador, variación con flecha y signo (`buenoCuando`), micrográfico opcional; una sola destacada por pantalla.
 *
 *   <Card titulo="Requiere tu atención" accion={<EnlaceVerTodo a={…} />}>…</Card>
 *   <Kpi etiqueta="Ventas del mes" valor={cop} formatear={dinero.corta} completo={dinero(cop)}
 *     variacion={{ valor: 0.094, comparado: 'vs. agosto a la misma fecha' }} serie={[…]} a={rutas.ventas()} />
 */
export interface PropsCard {
  children?: ReactNode;
  titulo?: ReactNode;
  /** Acción a la derecha de la cabecera (ghost sm o "Ver todo"). */
  accion?: ReactNode;
  /** Enlace: toda la tarjeta es clicable. */
  a?: string;
  padding?: 'compacta' | 'normal' | 'ninguno';
  destacada?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function Card({ children, titulo, accion, a, padding = 'normal', destacada, className, ...resto }: PropsCard) {
  const clases = cn(
    'group relative block rounded-none border',
    destacada ? 'border-ink bg-ink text-inverse' : 'border-line bg-surface text-ink',
    padding === 'normal' ? 'p-6' : padding === 'compacta' ? 'p-5' : '',
    a && 'transition-colors duration-(--dur-instant) hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
    className,
  );
  const cuerpo = (
    <>
      {(titulo || accion) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {titulo && <h3 className="t-h3">{titulo}</h3>}
          {accion}
        </div>
      )}
      {children}
      {a && (
        <Icono
          icono={ArrowUpRight}
          tamano={16}
          className="absolute right-4 top-4 opacity-0 transition-opacity duration-(--dur-fast) group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      )}
    </>
  );
  if (a)
    return (
      <Link to={a} className={clases} data-testid={resto['data-testid']}>
        {cuerpo}
      </Link>
    );
  return (
    <section className={clases} data-testid={resto['data-testid']}>
      {cuerpo}
    </section>
  );
}

/** Encabezado de sección (8.4.6): t-h2 a la izquierda, "Ver todo" a la derecha. */
export function EncabezadoSeccion({ titulo, a, textoEnlace = 'Ver todo', children, className }: { titulo: ReactNode; a?: string; textoEnlace?: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>
      <h2 className="t-h2 text-ink">{titulo}</h2>
      <div className="flex items-center gap-3">
        {children}
        {a && <EnlaceVerTodo a={a}>{textoEnlace}</EnlaceVerTodo>}
      </div>
    </div>
  );
}

export function EnlaceVerTodo({ a, children = 'Ver todo' }: { a: string; children?: ReactNode }) {
  return (
    <Link to={a} className="inline-flex items-center gap-1.5 t-label font-bold text-ink underline-offset-4 hover:underline">
      {children}
      <Icono icono={ArrowRight} tamano={14} />
    </Link>
  );
}

export interface VariacionKpi {
  /** Fracción (0,124 = 12,4 %); null = sin comparación. */
  valor: number | null;
  comparado: string;
  buenoCuando?: 'sube' | 'baja';
}

export interface PropsKpi {
  etiqueta: ReactNode;
  valor: number;
  /** Formateador de la cifra visible (abreviada si pasa de 9 caracteres). */
  formatear: (n: number) => string;
  /** Cifra completa (tooltip/título cuando la visible va abreviada). */
  completo?: string;
  variacion?: VariacionKpi;
  serie?: readonly number[];
  /** Línea de apoyo bajo la cifra (en lugar de la variación). */
  nota?: ReactNode;
  a?: string;
  destacada?: boolean;
  /** Ícono Info + definición (para términos). */
  ayuda?: ReactNode;
  animar?: boolean;
  className?: string;
  'data-testid'?: string;
  'data-kpi'?: string;
}

export function Variacion({ v, sobreInk }: { v: VariacionKpi; sobreInk?: boolean }) {
  if (v.valor === null) return <span className={cn('t-small', sobreInk ? 'text-inverse/80' : 'text-muted')}>{v.comparado}</span>;
  const sinCambio = Math.abs(v.valor) < 0.0005;
  const sube = v.valor > 0;
  const bueno = sinCambio ? null : (v.buenoCuando ?? 'sube') === 'sube' ? sube : !sube;
  const color = sobreInk ? 'text-inverse/80' : bueno === null ? 'text-muted' : bueno ? 'text-success' : 'text-danger';
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 t-small num">
      <span className={cn('inline-flex items-center gap-1 font-semibold', color)}>
        <Icono icono={sinCambio ? Minus : sube ? ArrowUpRight : ArrowDownRight} tamano={14} />
        {sinCambio ? 'Sin cambio' : formatoVariacion(v.valor)}
      </span>
      {!sinCambio && <span className={sobreInk ? 'text-inverse/80' : 'text-muted'}>{v.comparado}</span>}
    </span>
  );
}

export function Kpi({ etiqueta, valor, formatear, completo, variacion, serie, nota, a, destacada, ayuda, animar = true, className, ...resto }: PropsKpi) {
  return (
    <Card a={a} padding="compacta" destacada={destacada} className={cn('flex min-h-[132px] flex-col', className)} data-testid={resto['data-testid']}>
      <div data-kpi={resto['data-kpi']} className="flex h-full flex-col">
        <p className={cn('flex items-center gap-1.5 t-eyebrow', destacada ? 'text-inverse' : 'text-ink-2')}>
          {etiqueta}
          {ayuda}
        </p>
        <Cifra valor={valor} formatear={formatear} estatica={!animar} title={completo} className="mt-3 t-kpi" />
        <div className="mt-2 min-h-[18px]">{variacion ? <Variacion v={variacion} sobreInk={destacada} /> : nota ? <span className={cn('t-small', destacada ? 'text-inverse/80' : 'text-muted')}>{nota}</span> : null}</div>
        {serie && serie.length > 1 && (
          <div className="mt-auto pt-3">
            <Sparkline valores={serie} />
          </div>
        )}
      </div>
    </Card>
  );
}

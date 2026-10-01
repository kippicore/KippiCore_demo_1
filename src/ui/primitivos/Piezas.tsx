import { ArrowUpRight, Check, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '../cn';
import { Icono } from './Icono';

/**
 * Piezas recurrentes (PLAN 8.7.23, 8.7.24, 8.7.25, 8.7.32): avatar con iniciales, muestras de color, cajas de
 * talla, chips de filtro, barra de progreso, stepper, lista "Qué cambió" y marca de agua de documento.
 */

// ---------------------------------------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------------------------------------
export type TamanoAvatar = 24 | 32 | 40 | 56;
const TAM_AVATAR: Record<TamanoAvatar, string> = {
  24: 'size-6 text-[0.75rem]',
  32: 'size-8 text-[0.8125rem]',
  40: 'size-10 text-[1rem]',
  56: 'size-14 text-[1.375rem]',
};

/** Iniciales: primer nombre + primer apellido ("Sebastián Cárdenas" → "SC"). */
export function iniciales(nombre: string): string {
  const p = nombre.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '';
  const a = p[0]?.[0] ?? '';
  const b = p.length > 2 ? (p[p.length - 2]?.[0] ?? '') : p.length > 1 ? (p[1]?.[0] ?? '') : '';
  return (a + b).toUpperCase();
}

/**
 *   <Avatar nombre="Sebastián Cárdenas" tamano={32} indicador="presente" />
 * Iniciales en 600 al ≈ 40 % del tamaño, nunca por debajo de 12 px (a 24 y 32 px, 12 y 13 px: regla de 8.0.6).
 */
export function Avatar({ nombre, tamano = 32, indicador, className }: { nombre: string; tamano?: TamanoAvatar; indicador?: 'presente' | 'ausente'; className?: string }) {
  return (
    <span role="img" aria-label={nombre} className={cn('relative inline-flex shrink-0 items-center justify-center rounded-full bg-selected font-semibold text-ink', TAM_AVATAR[tamano], className)}>
      <span aria-hidden>{iniciales(nombre)}</span>
      {indicador && (
        <span
          aria-hidden
          className={cn('absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-surface', indicador === 'presente' ? 'bg-success' : 'bg-subtle')}
        />
      )}
    </span>
  );
}

export function GrupoAvatares({ nombres, maximo = 3, tamano = 32 }: { nombres: readonly string[]; maximo?: number; tamano?: TamanoAvatar }) {
  const visibles = nombres.slice(0, maximo);
  const resto = nombres.length - visibles.length;
  return (
    <span className="inline-flex items-center">
      {visibles.map((n, i) => (
        <Avatar key={n + i} nombre={n} tamano={tamano} className={cn('ring-2 ring-surface', i > 0 && '-ml-2')} />
      ))}
      {resto > 0 && (
        <span className={cn('-ml-2 inline-flex items-center justify-center rounded-full bg-ink font-semibold text-inverse ring-2 ring-surface', TAM_AVATAR[tamano])}>+{resto}</span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Color y talla
// ---------------------------------------------------------------------------------------------------------
export type TamanoMuestra = 12 | 16 | 20 | 24;
const TAM_MUESTRA: Record<TamanoMuestra, string> = { 12: 'size-3', 16: 'size-4', 20: 'size-5', 24: 'size-6' };

export interface PropsMuestraColor {
  /** Hex del PRODUCTO (8.1.4: colores de datos, no de interfaz). */
  hex: string;
  nombre: string;
  patron?: 'liso' | 'rayas' | 'cuadros';
  tamano?: TamanoMuestra;
  seleccionada?: boolean;
  agotada?: boolean;
  onClick?: () => void;
  className?: string;
}

/** Muestra circular de color (8.7.25): anillo interior para que el blanco se vea sobre blanco; seleccionada con anillo exterior. */
export function MuestraColor({ hex, nombre, patron = 'liso', tamano = 16, seleccionada, agotada, onClick, className }: PropsMuestraColor) {
  const fondo =
    patron === 'rayas'
      ? `repeating-linear-gradient(90deg, ${hex} 0 3px, color-mix(in srgb, ${hex} 55%, white) 3px 4.5px)`
      : patron === 'cuadros'
        ? `repeating-linear-gradient(0deg, transparent 0 4px, color-mix(in srgb, white 35%, transparent) 4px 5px), repeating-linear-gradient(90deg, ${hex} 0 4px, color-mix(in srgb, ${hex} 60%, white) 4px 5px)`
        : hex;
  const cuerpo = (
    <span
      className={cn(
        'relative inline-block shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]',
        TAM_MUESTRA[tamano],
        seleccionada && 'outline outline-1 outline-offset-2 outline-ink',
        className,
      )}
      style={{ background: fondo }}
    >
      {agotada && <span aria-hidden className="absolute left-1/2 top-[-15%] h-[130%] w-px -translate-x-1/2 rotate-45 bg-muted" />}
    </span>
  );
  if (!onClick)
    return (
      <span role="img" aria-label={nombre + (agotada ? ', agotado' : '')} title={nombre} className="inline-flex">
        {cuerpo}
      </span>
    );
  return (
    <button type="button" onClick={onClick} aria-label={nombre} aria-pressed={seleccionada} title={nombre} className="inline-flex rounded-full p-0.5">
      {cuerpo}
    </button>
  );
}

export interface PropsCajaTalla {
  talla: string;
  seleccionada?: boolean;
  agotada?: boolean;
  /** Unidades del local bajo la talla (POS). */
  unidades?: number;
  /** Motivo en el tooltip nativo ("Agotada aquí · 2 en Usaquén"). */
  motivo?: string;
  onClick?: () => void;
  alto?: 44 | 48;
  className?: string;
}

/** Caja de talla (8.7.25): mín. 44 × 44, borde line-strong, seleccionada en ink; agotada con diagonal, sin perder el foco. */
export function CajaTalla({ talla, seleccionada, agotada, unidades, motivo, onClick, alto = 44, className }: PropsCajaTalla) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={seleccionada}
      title={motivo}
      aria-label={`Talla ${talla}${agotada ? ' (agotada aquí)' : ''}`}
      className={cn(
        'relative inline-flex min-w-11 flex-col items-center justify-center overflow-hidden rounded-none border px-2 t-label num transition-colors duration-(--dur-instant)',
        alto === 48 ? 'h-12' : 'h-11',
        seleccionada ? 'border-ink bg-ink text-inverse' : 'border-line-strong bg-surface text-ink hover:border-ink',
        agotada && !seleccionada && 'text-disabled',
        className,
      )}
    >
      {agotada && (
        <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 10 10">
          <line x1="0" y1="10" x2="10" y2="0" stroke="var(--c-line-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      <span>{talla}</span>
      {unidades !== undefined && <span className={cn('t-micro num', seleccionada ? 'text-inverse' : 'text-ink-2')}>{unidades}</span>}
    </button>
  );
}

/** Chip de filtro activo (8.7.13): alto 28, `bg-selected`, X para quitar. */
export function ChipFiltro({ children, alQuitar }: { children: ReactNode; alQuitar: () => void }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 bg-selected pl-2.5 pr-1 t-label text-ink">
      {children}
      <button type="button" onClick={alQuitar} aria-label={`Quitar filtro ${typeof children === 'string' ? children : ''}`} className="inline-flex size-5 items-center justify-center hover:bg-line-soft">
        <svg aria-hidden viewBox="0 0 12 12" className="size-3">
          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Progreso y pasos
// ---------------------------------------------------------------------------------------------------------
/**
 *   <BarraProgreso valor={0.68} etiqueta="Meta del mes" meta />
 * 4 px, rounded-xs, pista line-soft, relleno ink (accent si es una meta). Etiqueta y porcentaje arriba.
 */
export function BarraProgreso({ valor, etiqueta, meta, detalle, alto = 4, className }: { valor: number; etiqueta?: ReactNode; meta?: boolean; detalle?: ReactNode; alto?: 2 | 4; className?: string }) {
  const p = Math.max(0, Math.min(1, valor));
  return (
    <div className={className}>
      {(etiqueta || detalle !== undefined) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 t-small num">
          <span className="text-ink">{etiqueta}</span>
          <span className="text-ink-2">{detalle ?? `${Math.round(valor * 100)} %`}</span>
        </div>
      )}
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)} className={cn('w-full overflow-hidden rounded-xs bg-line-soft', alto === 2 ? 'h-0.5' : 'h-1')}>
        <div className={cn('h-full rounded-xs transition-[width] duration-(--dur-slower) ease-standard', meta ? 'bg-accent' : 'bg-ink')} style={{ width: `${p * 100}%` }} />
      </div>
    </div>
  );
}

export interface PasoStepper {
  nombre: string;
}

/**
 *   <Stepper pasos={[{ nombre: 'Proveedor' }, { nombre: 'Líneas' }, { nombre: 'Costos' }]} actual={1} alElegir={ir} />
 * Número "01" + nombre eyebrow; conectores de 1 px; activo con subrayado de 2 px; completado con check (clicable).
 */
export function Stepper({ pasos, actual, alElegir, className }: { pasos: readonly PasoStepper[]; actual: number; alElegir?: (i: number) => void; className?: string }) {
  return (
    <ol className={cn('flex items-center gap-4', className)}>
      {pasos.map((p, i) => {
        const hecho = i < actual;
        const activo = i === actual;
        const contenido = (
          <>
            <span className={cn('inline-flex w-5 justify-center t-label num', activo || hecho ? 'text-ink' : 'text-subtle')}>
              {hecho ? <Icono icono={Check} tamano={14} /> : String(i + 1).padStart(2, '0')}
            </span>
            <span className={cn('relative t-eyebrow', activo ? 'text-ink' : hecho ? 'text-ink-2' : 'text-subtle')}>
              {p.nombre}
              {activo && <span aria-hidden className="absolute -bottom-1.5 left-0 h-0.5 w-full bg-ink" />}
            </span>
          </>
        );
        return (
          <li key={p.nombre} className="flex min-w-0 flex-1 items-center gap-4 last:flex-none" aria-current={activo ? 'step' : undefined}>
            {hecho && alElegir ? (
              <button type="button" onClick={() => alElegir(i)} className="inline-flex items-center gap-2 hover:underline">
                {contenido}
              </button>
            ) : (
              <span className="inline-flex items-center gap-2">{contenido}</span>
            )}
            {i < pasos.length - 1 && <span aria-hidden className="h-px min-w-6 flex-1 bg-line" />}
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------------------------------------
// "Qué cambió" y marca de agua
// ---------------------------------------------------------------------------------------------------------
export interface FilaCambio {
  icono: LucideIcon;
  texto: ReactNode;
  antes?: ReactNode;
  despues?: ReactNode;
  /** Enlace al módulo (con ?resaltar=). */
  a?: string;
}

/**
 *   <ListaQueCambio filas={[{ icono: Shirt, texto: 'Inventario de Usaquén · Camisa Oxford M azul cielo', antes: 3, despues: 2, a }]} />
 * Filas escalonadas 80 ms (W1, recepciones y cambios de estado).
 */
export function ListaQueCambio({ filas, className }: { filas: readonly FilaCambio[]; className?: string }) {
  return (
    <ul className={cn('divide-y divide-line-soft border-y border-line-soft', className)}>
      {filas.map((f, i) => (
        <li key={i} className="flex min-h-12 items-center gap-3 py-2 animate-row-in" style={{ animationDelay: `${i * 80}ms` }}>
          <Icono icono={f.icono} tamano={16} className="text-ink-2" />
          <span className="min-w-0 flex-1 t-body text-ink">{f.texto}</span>
          {(f.antes !== undefined || f.despues !== undefined) && (
            <span className="t-body num text-ink">
              {f.antes !== undefined && <span className="text-muted">{f.antes} → </span>}
              <strong className="font-bold">{f.despues}</strong>
            </span>
          )}
          {f.a && (
            <Link to={f.a} aria-label="Ver" className="inline-flex size-8 items-center justify-center hover:bg-surface-2">
              <Icono icono={ArrowUpRight} tamano={14} />
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Marca de agua de documento (8.7.32): "DOCUMENTO DE DEMOSTRACIÓN · SIN VALIDEZ FISCAL", 900, 40 px, ink al 6 %, −30°. */
export function MarcaAguaDocumento({ texto = 'DOCUMENTO DE DEMOSTRACIÓN · SIN VALIDEZ FISCAL' }: { texto?: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      <div className="absolute left-1/2 top-1/2 flex w-[220%] -translate-x-1/2 -translate-y-1/2 -rotate-30 flex-col gap-24">
        {Array.from({ length: 6 }, (_, i) => (
          <p key={i} className="whitespace-nowrap text-center text-[2.5rem] font-black uppercase leading-none text-ink/6">
            {`${texto}   ·   ${texto}`}
          </p>
        ))}
      </div>
    </div>
  );
}

import { forwardRef, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { LoaderCircle, type LucideIcon } from 'lucide-react';
import { cn } from '../cn';
import { Icono } from './Icono';

/**
 * Botón (PLAN 8.7.1). Seis variantes, tres tamaños, radio 0. `primary`, `secondary` y `destructive` en
 * MAYÚSCULAS (t-button); `ghost` y `link` en tipo oración. Un solo `primary` por zona visual.
 *
 *   <Button variante="primary" icono={Plus}>Registrar venta</Button>
 *   <Button variante="secondary" tamano="sm" icono={Download}>Exportar</Button>
 *   <Button variante="ghost" cargando>Guardar cambios</Button>
 *   <BotonEnlace to={rutas.pos()} variante="primary" flecha>Ir al punto de venta</BotonEnlace>
 *
 * Deshabilitado: pasa `motivo` ("Disponible solo para el dueño") y el botón lo muestra como `title` y
 * `aria-description`; en escritorio envuélvelo en `<Tooltip texto={motivo}>` (8.7).
 */
export type VarianteBoton = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link' | 'inverse';
export type TamanoBoton = 'sm' | 'md' | 'lg';

const BASE =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-none transition-[background-color,border-color,color,transform] duration-(--dur-instant) ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none aria-disabled:pointer-events-none';

const VARIANTES: Record<VarianteBoton, string> = {
  primary:
    'bg-ink text-inverse hover:bg-ink/85 active:translate-y-px disabled:bg-line-strong disabled:text-inverse aria-disabled:bg-line-strong',
  secondary:
    'border border-ink bg-transparent text-ink hover:bg-ink hover:text-inverse active:translate-y-px disabled:border-line-strong disabled:text-disabled aria-disabled:border-line-strong aria-disabled:text-disabled',
  ghost: 'bg-transparent text-ink hover:bg-surface-2 active:bg-selected disabled:text-disabled aria-disabled:text-disabled',
  destructive:
    'bg-danger text-inverse hover:bg-danger/90 active:translate-y-px disabled:bg-line-strong disabled:text-inverse',
  link: 'bg-transparent px-0! text-ink underline-offset-4 hover:underline disabled:text-disabled',
  inverse: 'bg-inverse text-ink hover:bg-inverse/90 active:translate-y-px disabled:text-disabled',
};

const MAYUSCULAS: Record<VarianteBoton, boolean> = {
  primary: true,
  secondary: true,
  destructive: true,
  inverse: true,
  ghost: false,
  link: false,
};

const TAMANOS: Record<TamanoBoton, { alto: string; px: string; texto: string; icono: 14 | 16 | 18; cuadrado: string }> = {
  sm: { alto: 'h-8', px: 'px-3', texto: 't-button-sm', icono: 14, cuadrado: 'w-8' },
  md: { alto: 'h-10', px: 'px-5', texto: 't-button', icono: 16, cuadrado: 'w-10' },
  lg: { alto: 'h-12', px: 'px-[30px]', texto: 't-button-lg', icono: 18, cuadrado: 'w-12' },
};

export interface OpcionesBoton {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  /** Ancho completo (CTA de ficha, pagos y hojas móviles). */
  anchoCompleto?: boolean;
  /** Tienda: texto a 16 px en `lg`. */
  tienda?: boolean;
  /** Solo ícono (cuadrado). Requiere `aria-label`. */
  soloIcono?: boolean;
}

/** Clases de un botón (para elementos que no son <button>, p. ej. un <a> de descarga). */
export function clasesBoton({ variante = 'primary', tamano = 'md', anchoCompleto, tienda, soloIcono }: OpcionesBoton = {}): string {
  const t = TAMANOS[tamano];
  const texto = MAYUSCULAS[variante]
    ? tienda && tamano === 'lg'
      ? 't-button-tienda'
      : t.texto
    : variante === 'link'
      ? 't-label font-bold'
      : 't-nav';
  return cn(BASE, VARIANTES[variante], t.alto, soloIcono ? cn(t.cuadrado, 'px-0') : t.px, texto, anchoCompleto && 'w-full');
}

export interface PropsButton extends ButtonHTMLAttributes<HTMLButtonElement>, OpcionesBoton {
  icono?: LucideIcon;
  /** Flecha de avance a la derecha (solo CTA de navegación). */
  iconoDerecha?: LucideIcon;
  cargando?: boolean;
  /** Motivo por el que está deshabilitado (siempre se dice por qué). */
  motivo?: string;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, PropsButton>(function Button(
  { variante = 'primary', tamano = 'md', anchoCompleto, tienda, soloIcono, icono, iconoDerecha, cargando, motivo, className, children, disabled, style, title, type = 'button', ...resto },
  ref,
) {
  const propio = useRef<HTMLButtonElement | null>(null);
  const [minimo, setMinimo] = useState<number | null>(null);
  useLayoutEffect(() => {
    // El ancho no cambia al entrar en carga (8.7.1): se fija al ancho que tenía.
    if (cargando && propio.current && minimo === null) setMinimo(propio.current.offsetWidth);
    if (!cargando && minimo !== null) setMinimo(null);
  }, [cargando, minimo]);
  const t = TAMANOS[tamano];
  const IconoIzq = cargando ? LoaderCircle : icono;
  return (
    <button
      ref={(n) => {
        propio.current = n;
        if (typeof ref === 'function') ref(n);
        else if (ref) ref.current = n;
      }}
      type={type}
      disabled={disabled}
      aria-busy={cargando || undefined}
      title={disabled && motivo ? motivo : title}
      className={cn(clasesBoton({ variante, tamano, anchoCompleto, tienda, soloIcono }), className)}
      style={minimo ? { ...style, minWidth: minimo } : style}
      {...resto}
    >
      {IconoIzq && <Icono icono={IconoIzq} tamano={t.icono} className={cargando ? 'animate-spin' : undefined} />}
      {soloIcono ? null : children}
      {iconoDerecha && !soloIcono && <Icono icono={iconoDerecha} tamano={t.icono} />}
    </button>
  );
});

export interface PropsBotonEnlace extends LinkProps, OpcionesBoton {
  icono?: LucideIcon;
  iconoDerecha?: LucideIcon;
}

/** Enlace con forma de botón (navegación interna con react-router). */
export const BotonEnlace = forwardRef<HTMLAnchorElement, PropsBotonEnlace>(function BotonEnlace(
  { variante = 'primary', tamano = 'md', anchoCompleto, tienda, soloIcono, icono, iconoDerecha, className, children, ...resto },
  ref,
) {
  const t = TAMANOS[tamano];
  return (
    <Link ref={ref} className={cn(clasesBoton({ variante, tamano, anchoCompleto, tienda, soloIcono }), className)} {...resto}>
      {icono && <Icono icono={icono} tamano={t.icono} />}
      {soloIcono ? null : children}
      {iconoDerecha && !soloIcono && <Icono icono={iconoDerecha} tamano={t.icono} />}
    </Link>
  );
});

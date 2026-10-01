import { CircleAlert, Search, type LucideIcon } from 'lucide-react';
import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '../cn';
import { Icono } from './Icono';

/**
 * Campos (PLAN 8.7.2). Alto 40 (sm 32, lg 48), `bg-surface border-line-strong`, radio 0. Etiqueta arriba (t-label),
 * "(opcional)" en muted (nunca asteriscos), ayuda debajo (t-small muted), error con ícono y `aria-describedby`.
 * Foco: borde ink + sombra interior de 1 px (2 px visuales). Validación al perder el foco y al enviar.
 *
 *   <Input etiqueta="Celular" ayuda="10 dígitos, empieza por 3" inputMode="numeric" error={err} />
 *   <InputNumero etiqueta="Valor" prefijo="$" valor={v} alCambiar={setV} />     // 1.250.000 al perder el foco
 *   <Input buscar placeholder="Buscar por número, cliente o referencia" tamano="sm" />
 *   <Textarea etiqueta="Nota" opcional />
 */
export type TamanoCampo = 'sm' | 'md' | 'lg';
const ALTOS: Record<TamanoCampo, string> = { sm: 'h-8', md: 'h-10', lg: 'h-12' };

export const CLASE_CAMPO =
  'w-full rounded-none border border-line-strong bg-surface text-ink t-body outline-none transition-[border-color,box-shadow] duration-(--dur-instant) placeholder:text-placeholder hover:border-control focus:border-ink focus:shadow-[inset_0_0_0_1px_var(--c-ink)] disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-disabled read-only:bg-surface-2 read-only:hover:border-line-strong aria-[invalid=true]:border-danger aria-[invalid=true]:focus:shadow-[inset_0_0_0_1px_var(--c-danger)]';

export interface PropsCampo {
  etiqueta?: ReactNode;
  opcional?: boolean;
  ayuda?: ReactNode;
  error?: ReactNode;
  /** Etiqueta solo para lectores de pantalla (barras de herramientas). */
  etiquetaOculta?: boolean;
  className?: string;
}

/** Envoltura de etiqueta, ayuda y error para cualquier control (también Select, DatePicker, Combobox). */
export function Campo({ etiqueta, opcional, ayuda, error, etiquetaOculta, className, id, children }: PropsCampo & { id: string; children: ReactNode }) {
  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      {etiqueta && (
        <label htmlFor={id} className={cn('mb-1.5 t-label text-ink', etiquetaOculta && 'sr-only')}>
          {etiqueta}
          {opcional && <span className="ml-1 font-normal text-muted">(opcional)</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 t-small text-danger">
          <Icono icono={CircleAlert} tamano={14} className="mt-0.5" />
          <span>{error}</span>
        </p>
      ) : ayuda ? (
        <p id={`${id}-ayuda`} className="mt-1.5 max-w-[72ch] t-small text-muted">
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}

export interface PropsInput extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'>, PropsCampo {
  tamano?: TamanoCampo;
  prefijo?: ReactNode;
  sufijo?: ReactNode;
  icono?: LucideIcon;
  /** Ícono de búsqueda a la izquierda. */
  buscar?: boolean;
  /** Números y dinero: alineados a la derecha y tabulares. */
  numerico?: boolean;
  claseCampo?: string;
}

export const Input = forwardRef<HTMLInputElement, PropsInput>(function Input(
  { etiqueta, opcional, ayuda, error, etiquetaOculta, className, tamano = 'md', prefijo, sufijo, icono, buscar, numerico, claseCampo, id: idProp, ...resto },
  ref,
) {
  const auto = useId();
  const id = idProp ?? auto;
  const IconoIzq = buscar ? Search : icono;
  const describe = error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined;
  return (
    <Campo etiqueta={etiqueta} opcional={opcional} ayuda={ayuda} error={error} etiquetaOculta={etiquetaOculta} className={className} id={id}>
      <div className="relative flex items-center">
        {IconoIzq && <Icono icono={IconoIzq} tamano={16} className="pointer-events-none absolute left-3 text-muted" />}
        {prefijo && <span className="pointer-events-none absolute left-3 t-body text-muted">{prefijo}</span>}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describe}
          className={cn(
            CLASE_CAMPO,
            ALTOS[tamano],
            IconoIzq ? 'pl-9' : prefijo ? 'pl-8' : 'pl-3',
            sufijo ? 'pr-14' : 'pr-3',
            numerico && 'num text-right',
            claseCampo,
          )}
          {...resto}
        />
        {sufijo && <span className="pointer-events-none absolute right-3 t-body text-muted">{sufijo}</span>}
      </div>
    </Campo>
  );
});

export interface PropsInputNumero extends Omit<PropsInput, 'value' | 'defaultValue' | 'onChange' | 'type'> {
  valor: number | null;
  alCambiar: (v: number | null) => void;
  /** Decimales permitidos (0 para COP y unidades). */
  decimales?: 0 | 1 | 2;
}

const formateador = (d: number) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: d, minimumFractionDigits: 0 });

/** Número o dinero: se formatea al perder el foco (1.250.000) y se muestra crudo al enfocar (8.7.2). */
export function InputNumero({ valor, alCambiar, decimales = 0, onBlur, onFocus, ...resto }: PropsInputNumero) {
  const [enfocado, setEnfocado] = useState(false);
  const [crudo, setCrudo] = useState('');
  const mostrado = enfocado ? crudo : valor === null ? '' : formateador(decimales).format(valor);
  return (
    <Input
      {...resto}
      numerico
      inputMode={decimales ? 'decimal' : 'numeric'}
      value={mostrado}
      onFocus={(e) => {
        setCrudo(valor === null ? '' : String(valor).replace('.', ','));
        setEnfocado(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setEnfocado(false);
        onBlur?.(e);
      }}
      onChange={(e) => {
        const limpio = e.target.value.replace(/[^\d,]/g, '');
        setCrudo(limpio);
        if (limpio === '') return alCambiar(null);
        const n = Number(limpio.replace(',', '.'));
        if (Number.isFinite(n)) alCambiar(decimales ? Math.round(n * 10 ** decimales) / 10 ** decimales : Math.round(n));
      }}
    />
  );
}

export interface PropsTextarea extends TextareaHTMLAttributes<HTMLTextAreaElement>, PropsCampo {}

export const Textarea = forwardRef<HTMLTextAreaElement, PropsTextarea>(function Textarea(
  { etiqueta, opcional, ayuda, error, etiquetaOculta, className, id: idProp, ...resto },
  ref,
) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <Campo etiqueta={etiqueta} opcional={opcional} ayuda={ayuda} error={error} etiquetaOculta={etiquetaOculta} className={className} id={id}>
      <textarea
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined}
        className={cn(CLASE_CAMPO, 'min-h-24 resize-y px-3 py-2.5')}
        {...resto}
      />
    </Campo>
  );
});

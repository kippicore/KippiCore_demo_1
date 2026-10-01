import * as RC from '@radix-ui/react-checkbox';
import * as RS from '@radix-ui/react-switch';
import * as RR from '@radix-ui/react-radio-group';
import { Check } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '../cn';

/**
 * Checkbox, interruptor y radio (PLAN 8.7.5–8.7.7). Toda la fila es clicable (mín. 32 de alto); bordes `control`
 * (≥ 3:1); marcado en `ink`. La tarjeta de radio sirve para medios de pago y modalidad de contrato.
 *
 *   <Checkbox etiqueta="Solo con existencias" marcado={v} alCambiar={setV} />
 *   <Switch etiqueta="Exoneración de aportes" valorTexto={v ? 'Exonerado' : 'No exonerado'} activo={v} alCambiar={setV} />
 *   <GrupoRadio valor={m} alCambiar={setM} etiqueta="Medio de pago" opciones={[{ valor: 'efectivo', etiqueta: 'Efectivo' }]} />
 *   <GrupoRadio tarjetas … opciones={[{ valor: 'laboral', etiqueta: 'Contrato laboral', descripcion: 'Con prestaciones' }]} />
 */
export interface PropsCheckbox {
  etiqueta?: ReactNode;
  marcado: boolean | 'indeterminate';
  alCambiar: (v: boolean) => void;
  deshabilitado?: boolean;
  className?: string;
  'aria-label'?: string;
  /** Va en el control (el botón con role="checkbox"), no en el contenedor (compartidos C-D). */
  'data-testid'?: string;
}

export function Checkbox({ etiqueta, marcado, alCambiar, deshabilitado, className, ...resto }: PropsCheckbox) {
  const id = useId();
  return (
    <div className={cn('inline-flex min-h-8 items-center gap-2', className)}>
      <RC.Root
        id={id}
        checked={marcado}
        disabled={deshabilitado}
        onCheckedChange={(v) => alCambiar(v === true)}
        aria-label={resto['aria-label']}
        data-testid={resto['data-testid']}
        className="peer inline-flex size-4 shrink-0 items-center justify-center rounded-none border border-control bg-surface transition-colors duration-(--dur-instant) hover:border-ink data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=indeterminate]:border-ink data-[state=indeterminate]:bg-ink disabled:border-line disabled:bg-surface-2"
      >
        <RC.Indicator className="text-inverse">
          {marcado === 'indeterminate' ? (
            <span className="block h-[1.5px] w-2 bg-inverse" />
          ) : (
            <Check size={12} strokeWidth={2.5} absoluteStrokeWidth aria-hidden />
          )}
        </RC.Indicator>
      </RC.Root>
      {etiqueta && (
        <label htmlFor={id} className="cursor-pointer t-body text-ink peer-disabled:cursor-not-allowed peer-disabled:text-disabled">
          {etiqueta}
        </label>
      )}
    </div>
  );
}

export interface PropsSwitch {
  etiqueta?: ReactNode;
  activo: boolean;
  alCambiar: (v: boolean) => void;
  /** Valor textual a la derecha ("Exonerado" / "No exonerado"). */
  valorTexto?: ReactNode;
  deshabilitado?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function Switch({ etiqueta, activo, alCambiar, valorTexto, deshabilitado, className, ...resto }: PropsSwitch) {
  const id = useId();
  return (
    <div className={cn('inline-flex min-h-8 items-center gap-3', className)}>
      {etiqueta && (
        <label htmlFor={id} className="cursor-pointer t-body text-ink">
          {etiqueta}
        </label>
      )}
      <RS.Root
        id={id}
        checked={activo}
        onCheckedChange={alCambiar}
        disabled={deshabilitado}
        aria-label={resto['aria-label']}
        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-control transition-colors duration-(--dur-fast) data-[state=checked]:bg-ink disabled:opacity-50"
      >
        <RS.Thumb className="block size-4 translate-x-0.5 rounded-full bg-surface transition-transform duration-(--dur-fast) ease-standard data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-inverse dark:bg-ink dark:data-[state=checked]:bg-inverse" />
      </RS.Root>
      {valorTexto && <span className="t-small text-muted">{valorTexto}</span>}
    </div>
  );
}

export interface OpcionRadio<T extends string> {
  valor: T;
  etiqueta: ReactNode;
  descripcion?: ReactNode;
  deshabilitado?: boolean;
}

export interface PropsGrupoRadio<T extends string> {
  valor: T | null;
  alCambiar: (v: T) => void;
  opciones: readonly OpcionRadio<T>[];
  etiqueta?: ReactNode;
  /** Tarjetas de radio (caja con borde; seleccionada con borde ink de 2 px visuales). */
  tarjetas?: boolean;
  /** Columnas de la rejilla de tarjetas. */
  columnas?: 1 | 2 | 3 | 4;
  orientacion?: 'vertical' | 'horizontal';
  className?: string;
}

export function GrupoRadio<T extends string>({ valor, alCambiar, opciones, etiqueta, tarjetas, columnas = 2, orientacion = 'vertical', className }: PropsGrupoRadio<T>) {
  const id = useId();
  return (
    <div className={className} role="group" aria-labelledby={etiqueta ? `${id}-et` : undefined}>
      {etiqueta && (
        <p id={`${id}-et`} className="mb-1.5 t-label text-ink">
          {etiqueta}
        </p>
      )}
      <RR.Root
        value={valor ?? undefined}
        onValueChange={(v) => alCambiar(v as T)}
        orientation={orientacion}
        className={cn(
          tarjetas
            ? cn('grid gap-3', columnas === 1 ? 'grid-cols-1' : columnas === 2 ? 'grid-cols-2' : columnas === 3 ? 'grid-cols-3' : 'grid-cols-4')
            : orientacion === 'horizontal'
              ? 'flex flex-wrap gap-x-6 gap-y-1'
              : 'flex flex-col gap-1',
        )}
      >
        {opciones.map((o) => {
          const idOp = `${id}-${o.valor}`;
          return tarjetas ? (
            <label
              key={o.valor}
              htmlFor={idOp}
              className="flex cursor-pointer items-start gap-3 rounded-none border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-(--dur-instant) hover:border-control has-[[data-state=checked]]:border-ink has-[[data-state=checked]]:shadow-[inset_0_0_0_1px_var(--c-ink)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
            >
              <RR.Item id={idOp} value={o.valor} disabled={o.deshabilitado} className={RADIO}>
                <RR.Indicator className="block size-2 rounded-full bg-ink" />
              </RR.Item>
              <span className="min-w-0">
                <span className="block t-h3 text-ink">{o.etiqueta}</span>
                {o.descripcion && <span className="mt-1 block t-small text-muted">{o.descripcion}</span>}
              </span>
            </label>
          ) : (
            <div key={o.valor} className="flex min-h-8 items-center gap-2">
              <RR.Item id={idOp} value={o.valor} disabled={o.deshabilitado} className={RADIO}>
                <RR.Indicator className="block size-2 rounded-full bg-ink" />
              </RR.Item>
              <label htmlFor={idOp} className="cursor-pointer t-body text-ink">
                {o.etiqueta}
              </label>
            </div>
          );
        })}
      </RR.Root>
    </div>
  );
}

const RADIO =
  'mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-control bg-surface transition-colors duration-(--dur-instant) hover:border-ink data-[state=checked]:border-ink disabled:border-line disabled:bg-surface-2';

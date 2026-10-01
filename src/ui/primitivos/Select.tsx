import * as RS from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '../cn';
import { Campo, CLASE_CAMPO, type PropsCampo, type TamanoCampo } from './Input';
import { Icono } from './Icono';

/**
 * Select (PLAN 8.7.3): disparador idéntico al campo con `ChevronDown`, contenido `bg-surface border-line
 * shadow-float` del ancho del disparador (mín. 180), ítems de 36, seleccionado 600 + check. Grupos con eyebrow.
 * Variante `ghost` (barras): sin borde ni fondo.
 *
 *   <Select etiqueta="Local" placeholder="Elige un local" valor={l} alCambiar={setL}
 *     opciones={[{ valor: 'p93', etiqueta: 'Parque 93' }, { valor: 'usq', etiqueta: 'Usaquén' }]} />
 *
 * `alCambiar` nunca recibe `''` (Radix lo emite en algunos cambios de opciones; se filtra aquí). Ninguna opción puede
 * tener `valor: ''`: para "todos" o "ninguno" usa una clave explícita ('todos', 'ninguno').
 */
export interface OpcionSelect {
  valor: string;
  etiqueta: ReactNode;
  grupo?: string;
  deshabilitado?: boolean;
}

export interface PropsSelect extends PropsCampo {
  valor: string | null;
  alCambiar: (v: string) => void;
  opciones: readonly OpcionSelect[];
  placeholder?: string;
  tamano?: TamanoCampo;
  variante?: 'campo' | 'ghost';
  deshabilitado?: boolean;
  enModal?: boolean;
  ancho?: number;
  'data-testid'?: string;
}

const ALTO: Record<TamanoCampo, string> = { sm: 'h-8', md: 'h-10', lg: 'h-12' };

export function Select({ valor, alCambiar, opciones, placeholder = 'Elige una opción', tamano = 'md', variante = 'campo', deshabilitado, enModal, ancho, etiqueta, opcional, ayuda, error, etiquetaOculta, className, ...resto }: PropsSelect) {
  const id = useId();
  const grupos = new Map<string, OpcionSelect[]>();
  for (const o of opciones) {
    const g = o.grupo ?? '';
    grupos.set(g, [...(grupos.get(g) ?? []), o]);
  }
  return (
    <Campo id={id} etiqueta={etiqueta} opcional={opcional} ayuda={ayuda} error={error} etiquetaOculta={etiquetaOculta} className={className}>
      <RS.Root
        value={valor ?? undefined}
        // Radix puede llamar `onValueChange('')` (p. ej. al cambiar las opciones o al reiniciar un formulario nativo):
        // ningún Select tiene una opción con valor vacío, así que se ignora aquí y no en cada formulario.
        onValueChange={(v) => {
          if (v !== '') alCambiar(v);
        }}
        disabled={deshabilitado}
      >
        <RS.Trigger
          id={id}
          data-testid={resto['data-testid']}
          aria-invalid={error ? true : undefined}
          style={ancho ? { width: ancho } : undefined}
          className={cn(
            'group inline-flex items-center justify-between gap-2 px-3 text-left',
            variante === 'campo'
              ? cn(CLASE_CAMPO, tamano === 'sm' ? 't-small' : 't-body')
              : 'rounded-none bg-transparent t-nav text-ink hover:bg-surface/70 focus-visible:outline-2 focus-visible:outline-focus',
            ALTO[tamano],
            'data-[placeholder]:text-placeholder',
          )}
        >
          <RS.Value placeholder={placeholder} />
          <RS.Icon>
            <Icono icono={ChevronDown} tamano={16} className="text-muted transition-transform duration-(--dur-fast) group-data-[state=open]:rotate-180" />
          </RS.Icon>
        </RS.Trigger>
        <RS.Portal>
          <RS.Content
            position="popper"
            sideOffset={4}
            collisionPadding={12}
            className={cn(
              'max-h-80 min-w-[max(180px,var(--radix-select-trigger-width))] overflow-hidden rounded-none border border-line bg-surface text-ink shadow-float animate-pop-in',
              enModal ? 'z-(--z-modal-popover)' : 'z-(--z-popover)',
            )}
          >
            <RS.Viewport className="p-1">
              {[...grupos.entries()].map(([g, ops], i) => (
                <RS.Group key={g || i}>
                  {g && <RS.Label className="px-3 pb-1 pt-2 t-eyebrow text-ink-2">{g}</RS.Label>}
                  {ops.map((o) => (
                    <RS.Item
                      key={o.valor}
                      value={o.valor}
                      disabled={o.deshabilitado}
                      className="relative flex h-9 cursor-pointer select-none items-center rounded-none pl-3 pr-9 t-body text-ink outline-none data-[disabled]:cursor-not-allowed data-[highlighted]:bg-surface-2 data-[disabled]:text-disabled data-[state=checked]:font-semibold"
                    >
                      <RS.ItemText>{o.etiqueta}</RS.ItemText>
                      <RS.ItemIndicator className="absolute right-3 inline-flex">
                        <Icono icono={Check} tamano={16} />
                      </RS.ItemIndicator>
                    </RS.Item>
                  ))}
                </RS.Group>
              ))}
            </RS.Viewport>
          </RS.Content>
        </RS.Portal>
      </RS.Root>
    </Campo>
  );
}

import * as RP from '@radix-ui/react-popover';
import * as RM from '@radix-ui/react-dropdown-menu';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../cn';
import { Icono } from './Icono';

/**
 * Popover y menú (PLAN 8.7.18). `bg-surface border-line shadow-float`, radio 0, a 8 px del disparador, entrada
 * fundido + 4 px en 140 ms. Dentro de un modal usa `enModal` (capa --z-modal-popover, única excepción de 8.3.5).
 *
 *   <Popover disparador={<Button variante="ghost">Local</Button>} titulo="Local">…</Popover>
 *   <Menu disparador={<Button soloIcono icono={MoreHorizontal} aria-label="Más acciones" variante="ghost" />}>
 *     <ItemMenu icono={Pencil} onSelect={editar}>Editar</ItemMenu>
 *     <SeparadorMenu />
 *     <ItemMenu icono={Trash2} peligro onSelect={eliminar}>Eliminar</ItemMenu>
 *   </Menu>
 */
const CAPA = { normal: 'z-(--z-popover)', modal: 'z-(--z-modal-popover)' };

export interface PropsPopover {
  disparador: ReactNode;
  children: ReactNode;
  titulo?: ReactNode;
  abierto?: boolean;
  alCambiar?: (abierto: boolean) => void;
  lado?: 'top' | 'right' | 'bottom' | 'left';
  alinear?: 'start' | 'center' | 'end';
  /** Ancho en px (por defecto se ajusta al contenido, mín. 220). */
  ancho?: number;
  /** Padding compacto (4) para listas; normal 16. */
  compacto?: boolean;
  enModal?: boolean;
  className?: string;
  etiqueta?: string;
}

export function Popover({ disparador, children, titulo, abierto, alCambiar, lado = 'bottom', alinear = 'start', ancho, compacto, enModal, className, etiqueta }: PropsPopover) {
  return (
    <RP.Root open={abierto} onOpenChange={alCambiar}>
      <RP.Trigger asChild>{disparador}</RP.Trigger>
      <RP.Portal>
        <RP.Content
          side={lado}
          align={alinear}
          sideOffset={8}
          collisionPadding={12}
          aria-label={etiqueta}
          style={ancho ? { width: ancho } : undefined}
          className={cn(
            'min-w-[220px] rounded-none border border-line bg-surface text-ink shadow-float outline-none animate-pop-in',
            compacto ? 'p-1' : 'p-4',
            enModal ? CAPA.modal : CAPA.normal,
            className,
          )}
        >
          {titulo && <p className="mb-3 t-label font-bold text-ink">{titulo}</p>}
          {children}
        </RP.Content>
      </RP.Portal>
    </RP.Root>
  );
}

export const CerrarPopover = RP.Close;

export interface PropsMenu {
  disparador: ReactNode;
  children: ReactNode;
  alinear?: 'start' | 'center' | 'end';
  lado?: 'top' | 'right' | 'bottom' | 'left';
  ancho?: number;
  abierto?: boolean;
  alCambiar?: (abierto: boolean) => void;
  enModal?: boolean;
  etiqueta?: string;
  className?: string;
}

export function Menu({ disparador, children, alinear = 'end', lado = 'bottom', ancho, abierto, alCambiar, enModal, etiqueta, className }: PropsMenu) {
  return (
    <RM.Root open={abierto} onOpenChange={alCambiar} modal={false}>
      <RM.Trigger asChild>{disparador}</RM.Trigger>
      <RM.Portal>
        <RM.Content
          align={alinear}
          side={lado}
          sideOffset={8}
          collisionPadding={12}
          aria-label={etiqueta}
          style={ancho ? { width: ancho } : undefined}
          className={cn(
            'min-w-[220px] rounded-none border border-line bg-surface p-1 text-ink shadow-float outline-none animate-pop-in',
            enModal ? CAPA.modal : CAPA.normal,
            className,
          )}
        >
          {children}
        </RM.Content>
      </RM.Portal>
    </RM.Root>
  );
}

export interface PropsItemMenu {
  children: ReactNode;
  icono?: LucideIcon;
  atajo?: string;
  peligro?: boolean;
  deshabilitado?: boolean;
  onSelect?: (e: Event) => void;
  /** Contenido extra a la derecha (insignia, check). */
  derecha?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

const ITEM =
  'flex min-h-9 w-full cursor-pointer select-none items-center gap-3 rounded-none px-3 py-2 text-left t-body outline-none transition-colors duration-(--dur-instant) data-[highlighted]:bg-surface-2 data-[disabled]:cursor-not-allowed data-[disabled]:text-disabled';

export function ItemMenu({ children, icono, atajo, peligro, deshabilitado, onSelect, derecha, className, ...resto }: PropsItemMenu) {
  return (
    <RM.Item
      disabled={deshabilitado}
      onSelect={onSelect}
      className={cn(ITEM, peligro ? 'text-danger' : 'text-ink', className)}
      data-testid={resto['data-testid']}
    >
      {icono && <Icono icono={icono} tamano={16} className={peligro ? 'text-danger' : 'text-ink-2'} />}
      <span className="min-w-0 flex-1">{children}</span>
      {atajo && <span className="t-micro text-ink-2">{atajo}</span>}
      {derecha}
    </RM.Item>
  );
}

/** Ítem de menú que es un enlace (navegación): `<ItemMenuEnlace asChild><Link …/></ItemMenuEnlace>`. */
export function ItemMenuEnlace({ children, icono, className }: { children: ReactNode; icono?: LucideIcon; className?: string }) {
  return (
    <RM.Item asChild className={cn(ITEM, 'text-ink', className)}>
      {icono ? (
        <span>
          <Icono icono={icono} tamano={16} className="text-ink-2" />
          {children}
        </span>
      ) : (
        children
      )}
    </RM.Item>
  );
}

export function SeparadorMenu() {
  return <RM.Separator className="-mx-1 my-1 h-px bg-line-soft" />;
}

export function TituloGrupoMenu({ children }: { children: ReactNode }) {
  return <RM.Label className="px-3 pb-1 pt-2 t-eyebrow text-ink-2">{children}</RM.Label>;
}

export const ItemMenuRadix = RM.Item;
export const GrupoRadioMenu = RM.RadioGroup;
export const ItemRadioMenu = RM.RadioItem;

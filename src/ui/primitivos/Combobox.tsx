import * as RP from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';
import { forwardRef, useState, type ReactNode } from 'react';
import { cn } from '../cn';
import { CLASE_CAMPO } from './Input';
import { Icono } from './Icono';

/**
 * Combobox de búsqueda (PLAN 8.7.4): `cmdk` dentro de un popover anclado al campo. Resultados agrupados con títulos
 * eyebrow; la coincidencia se resalta en 700 (no en color). ↑ ↓ mueven, Enter elige, Esc cierra. El filtrado lo
 * hace quien llama (con un selector: `selBuscarProducto`, `selClientes`), no cmdk.
 *
 *   <Combobox texto={q} alCambiarTexto={setQ} placeholder="Buscar referencia, cliente o venta"
 *     grupos={[{ titulo: 'Productos', items: productos.map((p) => ({ id: p.id, contenido: <ItemProducto …/>, alElegir: () => ir(p) })) }]}
 *     vacio={(q) => `No encontramos «${q}». Revisa la referencia o escanea el código`} />
 */
export interface ItemCombobox {
  id: string;
  contenido: ReactNode;
  alElegir: () => void;
  /** Texto para lectores de pantalla (si el contenido es complejo). */
  texto?: string;
}

export interface GrupoCombobox {
  titulo?: string;
  items: readonly ItemCombobox[];
}

export interface PropsCombobox {
  texto: string;
  alCambiarTexto: (t: string) => void;
  grupos: readonly GrupoCombobox[];
  placeholder: string;
  etiqueta?: string;
  /** Mensaje (y acción) cuando no hay resultados. */
  vacio?: (texto: string) => ReactNode;
  /** Primer ítem fijo (p. ej. "Consumidor final"), visible aunque no haya texto. */
  fijo?: ItemCombobox;
  /** Atajo visible a la derecha del campo ("⌘K"). */
  atajo?: string;
  tamano?: 'sm' | 'md';
  claseCampo?: string;
  anchoLista?: number;
  /** Abre la lista al enfocar aunque no haya texto (si hay `fijo`). */
  abrirAlEnfocar?: boolean;
  enModal?: boolean;
  /** Pegado o escaneo de un código completo: se llama al presionar Enter sin ítem activo. */
  alEnter?: (texto: string) => void;
  autoFocus?: boolean;
  className?: string;
  'data-testid'?: string;
}

/** Resalta la coincidencia en 700 (sin tildes ni mayúsculas). */
export function Resaltado({ texto, consulta }: { texto: string; consulta: string }) {
  const q = consulta.trim();
  if (!q) return <>{texto}</>;
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const i = norm(texto).indexOf(norm(q));
  if (i < 0) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i)}
      <strong className="font-bold">{texto.slice(i, i + q.length)}</strong>
      {texto.slice(i + q.length)}
    </>
  );
}

export const Combobox = forwardRef<HTMLInputElement, PropsCombobox>(function Combobox(
  { texto, alCambiarTexto, grupos, placeholder, etiqueta, vacio, fijo, atajo, tamano = 'md', claseCampo, anchoLista, abrirAlEnfocar, enModal, alEnter, autoFocus, className, ...resto },
  ref,
) {
  const [abierto, setAbierto] = useState(false);
  const total = grupos.reduce((n, g) => n + g.items.length, 0);
  const visible = abierto && (texto.trim().length > 0 || (abrirAlEnfocar && !!fijo));
  const elegir = (it: ItemCombobox) => {
    it.alElegir();
    setAbierto(false);
  };
  return (
    <Command shouldFilter={false} loop className={cn('relative', className)} label={etiqueta ?? placeholder}>
      <RP.Root open={visible} onOpenChange={setAbierto}>
        <RP.Anchor asChild>
          <div className="relative flex items-center">
            <Icono icono={Search} tamano={16} className="pointer-events-none absolute left-3 text-muted" />
            <Command.Input
              ref={ref}
              value={texto}
              onValueChange={(v) => {
                alCambiarTexto(v);
                setAbierto(true);
              }}
              onFocus={() => setAbierto(true)}
              onBlur={() => setTimeout(() => setAbierto(false), 120)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setAbierto(false);
                if (e.key === 'Enter' && alEnter && total === 0) alEnter(texto);
              }}
              placeholder={placeholder}
              autoFocus={autoFocus}
              aria-label={etiqueta ?? placeholder}
              data-testid={resto['data-testid']}
              className={cn(CLASE_CAMPO, tamano === 'sm' ? 'h-8' : 'h-9', 'pl-9', atajo ? 'pr-16' : 'pr-3', claseCampo)}
            />
            {atajo && <kbd className="pointer-events-none absolute right-3 font-sans t-micro text-ink-2">{atajo}</kbd>}
          </div>
        </RP.Anchor>
        <RP.Portal>
          <RP.Content
            align="start"
            sideOffset={6}
            collisionPadding={12}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              if ((e.target as HTMLElement | null)?.closest('[cmdk-input]')) e.preventDefault();
            }}
            style={{ width: anchoLista ?? 'var(--radix-popover-trigger-width)' }}
            className={cn(
              'min-w-[320px] rounded-none border border-line bg-surface p-1 text-ink shadow-float outline-none animate-pop-in',
              enModal ? 'z-(--z-modal-popover)' : 'z-(--z-popover)',
            )}
          >
            <Command.List className="max-h-[420px] overflow-y-auto">
              {fijo && (
                <Command.Item value={`fijo-${fijo.id}`} onSelect={() => elegir(fijo)} className={ITEM}>
                  {fijo.contenido}
                </Command.Item>
              )}
              {total === 0 && texto.trim() && (
                <Command.Empty className="px-3 py-4 t-body text-muted">{vacio ? vacio(texto) : `No encontramos «${texto}».`}</Command.Empty>
              )}
              {grupos
                .filter((g) => g.items.length > 0)
                .map((g, i) => (
                  <Command.Group
                    key={g.titulo ?? i}
                    heading={g.titulo}
                    className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:t-eyebrow [&_[cmdk-group-heading]]:text-ink-2"
                  >
                    {g.items.map((it) => (
                      <Command.Item key={it.id} value={it.id} keywords={it.texto ? [it.texto] : undefined} onSelect={() => elegir(it)} className={ITEM}>
                        {it.contenido}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
            </Command.List>
          </RP.Content>
        </RP.Portal>
      </RP.Root>
    </Command>
  );
});

const ITEM =
  'flex min-h-10 cursor-pointer select-none items-center gap-3 rounded-none px-3 py-1.5 t-body text-ink outline-none data-[selected=true]:bg-surface-2';

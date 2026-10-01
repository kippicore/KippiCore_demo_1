import * as RM from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, Lock, MapPin } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { rolPuedeVer, rutaDeUrl } from '@/app/rutas';
import { INICIO_POR_ROL } from '@/config/navegacion';
import type { Id, Moneda, Rol } from '@/dominio/tipos';
import { PERSONAS_ROL } from '@/config/permisos';
import { emitirUI, useEstadoDominio, useFiltroLocal, useMarca, useMoneda, useRolActivo, useSel, useSesion, useTasasVigentes } from '@/estado';
import { textoTasas } from '@/lib/moneda';
import { dinero } from '@/lib/formato';
import { MONEDAS, TASA_EJEMPLO } from '@/config/monedas';
import { selLocales } from '@/selectores';
import { cn } from '../cn';
import { Icono } from '../primitivos/Icono';
import { Avatar } from '../primitivos/Piezas';
import { Segmentado } from '../primitivos/Segmentado';
import { avisar } from '../primitivos/Toast';
import { Tooltip } from '../primitivos/Tooltip';

/**
 * Selectores del contexto global de la barra superior (PLAN 8.4.3, 5.8): local, moneda y rol. Cambian en vivo toda
 * la demo (los selectores leen `useFiltroLocal`, `useDinero` y `useRolActivo`). Emiten `moneda_cambiada` y
 * `rol_cambiado` con `{ a }` (6.18). Conservan los `data-testid` de F2-B: `selector-local`, `selector-moneda`,
 * `selector-rol` (cada opción: `local-<id>`, `moneda-<código>`, `rol-<rol>`).
 *
 *   <SelectorLocal />  ·  <SelectorMoneda resaltar />  ·  <SelectorRol resaltar />
 *   const cambiarRol = useCambiarRol();  cambiarRol('vendedor');
 */
const DISPARADOR =
  'inline-flex h-9 items-center gap-2 rounded-none px-2.5 t-nav text-ink transition-colors duration-(--dur-instant) hover:bg-surface/70 data-[state=open]:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const CONTENIDO = 'z-(--z-popover) min-w-[240px] rounded-none border border-line bg-surface p-1 text-ink shadow-float outline-none animate-pop-in';
const ITEM =
  'flex min-h-9 cursor-pointer select-none items-center gap-3 rounded-none px-3 py-2 t-body text-ink outline-none data-[highlighted]:bg-surface-2';

/** Nombre de un local o "Todos los locales". */
export function useNombreLocal(id: Id | 'todos'): string {
  const e = useEstadoDominio();
  return id === 'todos' ? 'Todos los locales' : (e.locales[id]?.nombre ?? id);
}

export function SelectorLocal() {
  const rol = useRolActivo();
  const local = useFiltroLocal();
  const cambiar = useSesion((s) => s.cambiarLocal);
  const locales = useSel(selLocales, { incluirBodega: true });
  const nombre = useNombreLocal(local);
  if (rol === 'vendedor')
    return (
      <Tooltip texto="Tu local está fijo en este rol">
        <button type="button" aria-disabled="true" data-testid="selector-local" data-valor={local} aria-label={`Local: ${nombre} (fijo en este rol)`} className={cn(DISPARADOR, 'cursor-default hover:bg-transparent')}>
          <Icono icono={MapPin} tamano={16} className="text-ink-2" />
          {nombre}
          <Icono icono={Lock} tamano={14} className="text-ink-2" />
        </button>
      </Tooltip>
    );
  const opciones: { id: Id | 'todos'; nombre: string; bodega?: boolean }[] = [{ id: 'todos', nombre: 'Todos los locales' }, ...locales.map((l) => ({ id: l.id, nombre: l.nombre, bodega: !l.vende }))];
  return (
    <RM.Root modal={false}>
      <RM.Trigger className={DISPARADOR} data-testid="selector-local" data-valor={local} aria-label={`Local: ${nombre}`}>
        <Icono icono={MapPin} tamano={16} className="text-ink-2" />
        <span className="max-w-[160px] truncate">{nombre}</span>
        <Icono icono={ChevronDown} tamano={14} className="text-ink-2" />
      </RM.Trigger>
      <RM.Portal>
        <RM.Content align="end" sideOffset={8} className={CONTENIDO}>
          <RM.Label className="px-3 pb-1 pt-2 t-eyebrow text-ink-2">Ver datos de</RM.Label>
          {opciones.map((o, i) => (
            <div key={o.id}>
              {o.bodega && <RM.Separator className="-mx-1 my-1 h-px bg-line-soft" />}
              {i === 1 && <RM.Separator className="-mx-1 my-1 h-px bg-line-soft" />}
              <RM.Item className={ITEM} data-testid={`local-${o.id}`} onSelect={() => cambiar(o.id)}>
                <span className={cn('flex-1', o.id === local && 'font-semibold')}>{o.nombre}</span>
                {o.id === local && <Icono icono={Check} tamano={16} />}
              </RM.Item>
            </div>
          ))}
        </RM.Content>
      </RM.Portal>
    </RM.Root>
  );
}

const SIMBOLOS: { valor: Moneda; etiqueta: string; aria: string }[] = [
  { valor: 'COP', etiqueta: 'COP', aria: 'Pesos colombianos' },
  { valor: 'USD', etiqueta: 'US$', aria: 'Dólares' },
  { valor: 'CNY', etiqueta: 'CN¥', aria: 'Yuanes' },
];

/** Cambia la moneda de visualización y emite `moneda_cambiada` (una sola puerta para la barra, la franja y /app). */
export function useCambiarMoneda(): (m: Moneda) => void {
  const cambiar = useSesion((s) => s.cambiarMoneda);
  return useCallback(
    (m: Moneda) => {
      cambiar(m);
      emitirUI('moneda_cambiada', { a: m });
    },
    [cambiar],
  );
}

export function SelectorMoneda({ resaltar }: { resaltar?: boolean }) {
  const { moneda } = useMoneda();
  const cambiar = useCambiarMoneda();
  const tasas = `${textoTasas(useTasasVigentes())} · cambiar en Configuración`;
  return (
    <Tooltip texto={tasas}>
      <span className={cn('relative inline-flex', resaltar && 'rounded-none outline outline-2 outline-offset-4 outline-accent')}>
        <Segmentado
          tamano="sm"
          etiqueta="Moneda"
          data-testid="selector-moneda"
          valor={moneda}
          alCambiar={(m) => m !== moneda && cambiar(m)}
          opciones={SIMBOLOS.map((s) => ({ valor: s.valor, etiqueta: s.etiqueta, aria: s.aria, 'data-testid': `moneda-${s.valor}` }))}
        />
        {resaltar && <PuntoPulsante />}
      </span>
    </Tooltip>
  );
}

function PuntoPulsante() {
  return (
    <span aria-hidden className="absolute -right-1 -top-1 z-(--z-hint) size-2 rounded-full bg-accent">
      <span className="absolute inset-0 rounded-full bg-accent animate-hint" />
    </span>
  );
}

const ETIQUETA_ROL: Record<Rol, string> = { dueno: 'Dueño', vendedor: 'Vendedor', bodega: 'Bodega' };

/** Persona de cada rol con su local (para el menú, la franja y el pie de la barra lateral). */
export function usePersonasRol(): Record<Rol, { nombre: string; rol: string; local: string | null; localId: Id | null }> {
  const e = useEstadoDominio();
  // Si el visitante escribió su nombre al personalizar la marca, el dueño es él (saludo, pie de la barra y menú de rol).
  const propio = useMarca().persona;
  const persona = (r: Rol) => {
    const u = e.usuarios[PERSONAS_ROL[r].usuarioId];
    const localId = u?.localFijoId ?? null;
    return { nombre: (r === 'dueno' ? propio : null) ?? u?.nombre ?? ETIQUETA_ROL[r], rol: ETIQUETA_ROL[r], local: localId ? (e.locales[localId]?.nombre ?? null) : null, localId };
  };
  return { dueno: persona('dueno'), vendedor: persona('vendedor'), bodega: persona('bodega') };
}

/** Cambia el rol (el vendedor queda fijo en su local), emite `rol_cambiado` y avisa "Ahora ves KippiCore como …". */
export function useCambiarRol(): (r: Rol) => void {
  const cambiar = useSesion((s) => s.cambiarRol);
  const personas = usePersonasRol();
  const navegar = useNavigate();
  const { pathname } = useLocation();
  return useCallback(
    (r: Rol) => {
      const p = personas[r];
      // Si el rol nuevo no ve esta pantalla, va a su inicio (5.8) sin el aviso de la guarda: el cambio fue a propósito.
      const ruta = rutaDeUrl(pathname);
      if (pathname.startsWith('/panel') && ruta && !rolPuedeVer(ruta, r)) navegar(INICIO_POR_ROL[r], { replace: true });
      cambiar(r, p.localId);
      emitirUI('rol_cambiado', { a: r });
      avisar({ texto: r === 'dueno' ? 'Volviste a la vista del dueño' : `Ahora ves KippiCore como ${p.rol}${p.local ? ` · ${p.local}` : ''}` });
    },
    [cambiar, personas, navegar, pathname],
  );
}

export function SelectorRol({ resaltar }: { resaltar?: boolean }) {
  const rol = useRolActivo();
  const personas = usePersonasRol();
  const cambiar = useCambiarRol();
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    // ?resaltar=rol (ítem 6 de "Prueba esto"): abre el menú con "Vendedor · Usaquén" señalado.
    if (resaltar) {
      const t = setTimeout(() => setAbierto(true), 400);
      return () => clearTimeout(t);
    }
  }, [resaltar]);
  const actual = personas[rol];
  return (
    <RM.Root open={abierto} onOpenChange={setAbierto} modal={false}>
      <RM.Trigger className={cn(DISPARADOR, 'relative')} data-testid="selector-rol" data-valor={rol} aria-label={`Rol: ${actual.rol}`}>
        <Avatar nombre={actual.nombre} tamano={24} fondo="surface" />
        {actual.rol}
        <Icono icono={ChevronDown} tamano={14} className="text-ink-2" />
        {resaltar && !abierto && <PuntoPulsante />}
      </RM.Trigger>
      <RM.Portal>
        <RM.Content align="end" sideOffset={8} className={cn(CONTENIDO, 'w-[320px]')}>
          <p className="px-3 pb-2 pt-2 t-small text-muted">Mira lo que vería cada persona en la computadora del local</p>
          {(['dueno', 'vendedor', 'bodega'] as const).map((r) => {
            const p = personas[r];
            const senalado = resaltar && r === 'vendedor';
            return (
              <RM.Item
                key={r}
                data-testid={`rol-${r}`}
                onSelect={() => r !== rol && cambiar(r)}
                className={cn(ITEM, 'min-h-14', senalado && 'shadow-[inset_2px_0_0_var(--c-accent)]')}
              >
                <Avatar nombre={p.nombre} tamano={32} />
                <span className="min-w-0 flex-1">
                  <span className={cn('block t-body text-ink', r === rol && 'font-semibold')}>{p.nombre}</span>
                  <span className="block t-small text-muted">
                    {p.rol}
                    {p.local ? ` · ${p.local}` : r === 'dueno' ? ' · Todos los locales' : ''}
                  </span>
                </span>
                {r === rol && <Icono icono={Check} tamano={16} />}
                {senalado && r !== rol && <span className="size-2 rounded-full bg-accent" aria-hidden />}
              </RM.Item>
            );
          })}
        </RM.Content>
      </RM.Portal>
    </RM.Root>
  );
}

/**
 * Franja de moneda (PLAN 8.4.3): bajo la barra superior cuando la moneda no es COP. 32 px, `bg-accent-soft`,
 * t-small accent-ink: "Estás viendo todo en US$ · Volver a pesos".
 */
export function FranjaMoneda({ className }: { className?: string }) {
  const { moneda, tasa } = useMoneda();
  const cambiar = useCambiarMoneda();
  if (moneda === 'COP') return null;
  const s = SIMBOLOS.find((x) => x.valor === moneda);
  // La tasa con la que se convierte (fase 4): la de ejemplo hasta que el visitante la edita en Configuración.
  const deEjemplo = tasa === TASA_EJEMPLO.valores[moneda];
  return (
    <div data-testid="franja-moneda" role="status" className={cn('flex h-8 items-center justify-center gap-2 bg-accent-soft px-4 t-small text-accent-ink', className)}>
      <span>
        Estás viendo todo en <strong className="font-bold">{s?.etiqueta}</strong> con {deEjemplo ? 'la tasa de ejemplo' : 'tu tasa'} ({MONEDAS[moneda].simbolo}
        {'\u00a0'}1 = {dinero(tasa)})
      </span>
      <span aria-hidden>·</span>
      <button type="button" onClick={() => cambiar('COP')} className="font-bold underline underline-offset-3 hover:no-underline">
        Volver a pesos
      </button>
    </div>
  );
}

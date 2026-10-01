import { Copy, Info } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { createStore, useStore } from 'zustand';
import type { Rol } from '@/dominio/tipos';
import type { IdPista } from '@/app/rutas';
import { type Permiso } from '@/config/permisos';
import { PISTA_BOTON, PISTAS_TEXTOS, ENTRADA } from '@/config/textos/guia';
import { useGuia, usePuede, useRolActivo } from '@/estado';
import { cn } from '../cn';
import { Icono } from '../primitivos/Icono';

/**
 * Piezas transversales de la guía y del contexto (PLAN 2.5, 8.10.4, 5.8, 5.5.1). Sin Radix: se usan también en /app.
 */

// ---------------------------------------------------------------------------------------------------------
// <Pista id>
// ---------------------------------------------------------------------------------------------------------
const almacenPista = createStore<{ activa: string | null }>()(() => ({ activa: null }));

/** ¿Se abre en un navegador interno (WhatsApp, Instagram, Facebook)? */
export function esNavegadorInterno(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean {
  return /WhatsApp|Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\//i.test(ua);
}
export function esIos(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean {
  return /iPhone|iPad|iPod/i.test(ua);
}

export interface PropsPista {
  id: IdPista;
  children: ReactNode;
  /** Lado del globo respecto al ancla. */
  lado?: 'abajo' | 'arriba';
  alinear?: 'inicio' | 'fin';
  className?: string;
}

/**
 * Pista contextual (PLAN 2.5, 8.10.4): punto camel de 8 px con anillo que pulsa (1,8 s) en la esquina superior
 * derecha del ancla. Clic o foco → globo de 280 px con "Pista", el texto (config/textos/guia.ts) y "Entendido".
 * Máximo una por pantalla, solo la primera visita, nunca en el rol vendedor (salvo la del POS), y "Ocultar pistas"
 * del menú "?" las apaga todas. El paquete dueño de la pantalla la COLOCA sobre su ancla:
 *
 *   <Pista id="inicio.alertas"><Card titulo="Requiere tu atención">…</Card></Pista>
 */
/**
 * ¿El panel "Prueba esto" (`data-testid="guia-panel"`, fijo abajo a la derecha) tapa la esquina del ancla de la pista?
 * Mientras la tape, el punto no se muestra (E2.3): vuelve en cuanto la persona minimiza el panel, elige un ítem o
 * desplaza la página. Se mide solo para la pista activa (una por pantalla).
 */
function usePuntoTapadoPorPanel(activa: boolean, id: string): boolean {
  const [tapada, setTapada] = useState(false);
  useEffect(() => {
    if (!activa || typeof document === 'undefined') return;
    const medir = () => {
      const panel = document.querySelector('[data-testid="guia-panel"]');
      const ancla = document.querySelector(`[data-pista="${id}"]`);
      if (!panel || !ancla) return setTapada(false);
      const p = panel.getBoundingClientRect();
      const a = ancla.getBoundingClientRect();
      // El punto va en la esquina superior derecha del ancla.
      const x = a.right;
      const y = a.top;
      setTapada(x >= p.left - 8 && x <= p.right + 8 && y >= p.top - 8 && y <= p.bottom + 8);
    };
    medir();
    const intervalo = setInterval(medir, 400);
    window.addEventListener('scroll', medir, { passive: true });
    window.addEventListener('resize', medir);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener('scroll', medir);
      window.removeEventListener('resize', medir);
    };
  }, [activa, id]);
  return activa && tapada;
}

export function Pista({ id, children, lado = 'abajo', alinear = 'fin', className }: PropsPista) {
  const rol = useRolActivo();
  const vistas = useGuia((s) => s.pistasVistas);
  const ocultas = useGuia((s) => s.pistasOcultas);
  const marcar = useGuia((s) => s.marcarPistaVista);
  const activa = useStore(almacenPista, (s) => s.activa);
  const [abierta, setAbierta] = useState(false);
  const globo = useId();
  const elegible = !ocultas && !vistas.includes(id) && (rol !== 'vendedor' || id === 'pos.escaneo');
  useEffect(() => {
    if (!elegible) return;
    if (almacenPista.getState().activa === null) almacenPista.setState({ activa: id });
    return () => {
      if (almacenPista.getState().activa === id) almacenPista.setState({ activa: null });
    };
  }, [elegible, id]);
  const tapada = usePuntoTapadoPorPanel(elegible && activa === id, id);
  const visible = elegible && activa === id && !tapada;
  const texto = id === 'app.hoy' && esNavegadorInterno() ? PISTAS_TEXTOS['app.hoy.navegadorInterno'] : PISTAS_TEXTOS[id];
  const cerrar = () => {
    setAbierta(false);
    marcar(id);
  };
  return (
    <div className={cn('relative', className)} data-pista={id}>
      {children}
      {visible && (
        <>
          <button
            type="button"
            aria-label="Ver pista"
            aria-expanded={abierta}
            aria-controls={globo}
            onClick={() => setAbierta((a) => !a)}
            className="absolute -right-1 -top-1 z-(--z-hint) inline-flex size-4 items-center justify-center rounded-full"
            data-testid={`pista-${id}`}
          >
            <span className="relative size-2 rounded-full bg-accent">
              <span aria-hidden className="absolute inset-0 rounded-full bg-accent animate-hint" />
            </span>
          </button>
          {abierta && (
            <div
              id={globo}
              role="dialog"
              aria-label="Pista"
              className={cn(
                'absolute z-(--z-popover) w-[280px] border border-line bg-surface p-4 text-left text-ink shadow-float animate-pop-in',
                lado === 'abajo' ? 'top-full mt-2' : 'bottom-full mb-2',
                alinear === 'fin' ? 'right-0' : 'left-0',
              )}
            >
              <p className="t-eyebrow text-accent-ink">Pista</p>
              <p className="mt-2 t-body text-ink">{texto}</p>
              <button type="button" onClick={cerrar} className="mt-3 -ml-2 inline-flex h-8 items-center px-2 t-nav text-ink hover:bg-surface-2">
                {PISTA_BOTON}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Rol
// ---------------------------------------------------------------------------------------------------------
/**
 * `<RequiereRol permiso="ver.costos">` muestra su contenido solo si el rol activo tiene el permiso (5.8); si no,
 * nada (o la `alternativa`). `<SoloRol roles={['dueno']}>` filtra por rol.
 *
 *   <RequiereRol permiso="ver.margenes" alternativa={<span className="t-small text-muted">Solo para el dueño</span>}>…</RequiereRol>
 */
export function RequiereRol({ permiso, children, alternativa = null }: { permiso: Permiso; children: ReactNode; alternativa?: ReactNode }) {
  const puede = usePuede();
  return <>{puede(permiso) ? children : alternativa}</>;
}

export function SoloRol({ roles, children, alternativa = null }: { roles: readonly Rol[]; children: ReactNode; alternativa?: ReactNode }) {
  const rol = useRolActivo();
  return <>{roles.includes(rol) ? children : alternativa}</>;
}

// ---------------------------------------------------------------------------------------------------------
// ?resaltar=
// ---------------------------------------------------------------------------------------------------------
/** Valor de `?resaltar=` de la URL actual (5.5.1), o null. */
export function useResaltar(): string | null {
  const { search } = useLocation();
  return new URLSearchParams(search).get('resaltar');
}

/**
 * `<ResaltarFila valor={venta.id}>` envuelve un elemento que debe destacarse cuando la URL trae `?resaltar=<valor>`:
 * se desplaza a la vista una vez, destella en camel (600 ms) y queda con la barra camel de 2 px a la izquierda.
 * En tablas, usa la prop `resaltada` de `<Table>` con `useResaltar()`.
 *
 *   <ResaltarFila valor="cambiar-estado"><Button>Cambiar estado</Button></ResaltarFila>
 */
export function ResaltarFila({ valor, children, className }: { valor: string; children: ReactNode; className?: string }) {
  const resaltar = useResaltar();
  const ref = useRef<HTMLDivElement | null>(null);
  const activo = resaltar === valor;
  useEffect(() => {
    if (activo) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activo]);
  return (
    <div ref={ref} data-resaltada={activo || undefined} className={cn(activo && 'animate-flash shadow-[inset_2px_0_0_var(--c-accent)] outline outline-1 outline-offset-4 outline-accent', className)}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Navegador interno
// ---------------------------------------------------------------------------------------------------------
/**
 * Franja discreta (PLAN 2.2.2, 8.4.7) cuando la demo se abre dentro de WhatsApp, Instagram o Facebook: 40 px,
 * `bg-surface-2`, t-small ink-2, "Copiar enlace" a la derecha; en iOS agrega "Allá podrás agregarlo a tu pantalla de
 * inicio". No bloquea. `forzar` la muestra en QA.
 */
export function AvisoNavegadorInterno({ forzar, className }: { forzar?: boolean; className?: string }) {
  const [copiado, setCopiado] = useState(false);
  const [visible] = useState(() => forzar || esNavegadorInterno());
  if (!visible) return null;
  return (
    <div data-testid="aviso-navegador-interno" role="note" className={cn('flex min-h-10 items-center gap-3 bg-surface-2 px-4 py-2 t-small text-ink-2', className)}>
      <Icono icono={Info} tamano={14} />
      <p className="min-w-0 flex-1">{esIos() ? ENTRADA.navegadorInternoIos : ENTRADA.navegadorInterno}</p>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(window.location.href.split('#')[0] ?? '').then(() => setCopiado(true));
        }}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 px-2 t-label font-bold text-ink underline-offset-4 hover:underline"
      >
        <Icono icono={Copy} tamano={14} />
        {copiado ? ENTRADA.sistemaCompletoCelular.copiado : ENTRADA.sistemaCompletoCelular.copiar}
      </button>
    </div>
  );
}

import { ChevronLeft, Info, MapPin, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { APP } from '@/config/textos/guia';
import { cn } from '../cn';
import { Icono } from '../primitivos/Icono';

/**
 * Piezas de la app del dueño (PLAN 8.5) SIN Radix (van en el arranque de /app):
 * - `<EncabezadoMovil>`: grande al cargar (fila de 44 px con local y moneda a la derecha, título t-h1-app, fecha en
 *   t-small muted) y compacto al desplazar > 56 px (barra fija de 44 px con `glass`, título centrado en MAYÚSCULAS).
 * - `<ChipDatosEjemplo>`: "Datos de ejemplo de este celular" (28 px) que abre la explicación en una hoja.
 * - `<HojaLigera>`: hoja inferior sin dependencias (12 px arriba, asa, máx. 88 dvh, Esc cierra, foco atrapado simple).
 * - `<VolverMovil>`: "‹ Anterior" de las pantallas de detalle (pila).
 *
 *   <EncabezadoMovil titulo="Hoy" fecha="Martes 30 de septiembre · Todos los locales" derecha={<…/>} chip={<ChipDatosEjemplo />} />
 */
export function EncabezadoMovil({ titulo, fecha, derecha, chip, volver, className }: { titulo: string; fecha?: ReactNode; derecha?: ReactNode; chip?: ReactNode; volver?: { a: string; texto: string }; className?: string }) {
  const [compacto, setCompacto] = useState(false);
  useEffect(() => {
    const f = () => setCompacto(window.scrollY > 56);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  return (
    <>
      <div
        aria-hidden={!compacto}
        className={cn(
          'glass-app fixed inset-x-0 top-0 z-(--z-topbar) mx-auto flex h-[calc(44px+env(safe-area-inset-top))] max-w-[430px] items-end justify-center border-b border-line pb-2.5 pt-[env(safe-area-inset-top)] transition-opacity duration-(--dur-base)',
          compacto ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <span className="t-h3 font-bold uppercase text-ink">{titulo}</span>
      </div>
      <header className={cn('px-4', className)}>
        <div className="flex h-11 items-center justify-between gap-2">
          {volver ? <VolverMovil a={volver.a} texto={volver.texto} /> : <span />}
          <div className="flex items-center gap-1">{derecha}</div>
        </div>
        <h1 className="mt-1 t-h1-app text-ink">{titulo}</h1>
        {fecha && <p className="mt-1 t-small text-muted">{fecha}</p>}
        {chip && <div className="mt-3">{chip}</div>}
      </header>
    </>
  );
}

export function VolverMovil({ a, texto }: { a: string; texto: string }) {
  return (
    <Link to={a} className="-ml-2 inline-flex h-11 items-center gap-1 px-2 t-nav text-ink">
      <Icono icono={ChevronLeft} tamano={20} />
      {texto}
    </Link>
  );
}

/** Botón fantasma del encabezado (local, moneda): área táctil de 44. */
export function BotonEncabezadoMovil({ children, onClick, etiqueta }: { children: ReactNode; onClick?: () => void; etiqueta: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={etiqueta} className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 px-2 t-label text-ink">
      {children}
    </button>
  );
}

export function LocalEncabezado({ nombre, onClick }: { nombre: string; onClick?: () => void }) {
  return (
    <BotonEncabezadoMovil etiqueta={`Local: ${nombre}`} onClick={onClick}>
      <Icono icono={MapPin} tamano={16} />
      {nombre}
    </BotonEncabezadoMovil>
  );
}

export function HojaLigera({ abierta, alCerrar, titulo, children, pie }: { abierta: boolean; alCerrar: () => void; titulo: ReactNode; children?: ReactNode; pie?: ReactNode }) {
  const panel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!abierta) return;
    const previo = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar();
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('keydown', tecla);
      previo?.focus?.();
    };
  }, [abierta, alCerrar]);
  if (!abierta) return null;
  return (
    <div className="fixed inset-0 z-(--z-modal)">
      <button type="button" aria-label="Cerrar" tabIndex={-1} onClick={alCerrar} className="absolute inset-0 bg-overlay animate-fade-in" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={typeof titulo === 'string' ? titulo : undefined}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] max-w-[480px] flex-col rounded-t-sheet bg-surface pb-[env(safe-area-inset-bottom)] text-ink outline-none animate-sheet-up"
      >
        <div aria-hidden className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-line-strong" />
        <div className="flex items-start gap-3 px-4 pb-3 pt-4">
          <p className="min-w-0 flex-1 t-h3 font-bold uppercase">{titulo}</p>
          <button type="button" onClick={alCerrar} aria-label="Cerrar" className="-mr-2 -mt-2 inline-flex size-11 items-center justify-center text-ink-2">
            <Icono icono={X} tamano={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        {pie && <div className="border-t border-line px-4 py-3">{pie}</div>}
      </div>
    </div>
  );
}

export function ChipDatosEjemplo({ className }: { className?: string }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        data-testid="chip-datos-ejemplo"
        className={cn('inline-flex h-7 items-center gap-1.5 bg-surface-2 px-2.5 t-micro font-semibold text-ink', className)}
      >
        <Icono icono={Info} tamano={12} />
        {APP.chipDatos}
      </button>
      <HojaLigera abierta={abierta} alCerrar={() => setAbierta(false)} titulo={APP.chipDatos}>
        <p className="t-body-lg text-ink">Cada celular y cada computador guardan sus propios datos de ejemplo.</p>
        <p className="mt-2 t-body text-muted">El código QR trae al celular lo último que hiciste en el computador.</p>
      </HojaLigera>
    </>
  );
}

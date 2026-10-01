import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { createStore, useStore } from 'zustand';
import { cn } from '../cn';
import { Icono } from './Icono';

/**
 * Avisos breves (PLAN 8.7.16): abajo al centro, máx. 400 px, hasta 3 apilados. `bg-ink text-inverse`, radio 0; el
 * tipo se distingue por la FORMA del ícono (no por color). Acción opcional subrayada ("Ver venta"). 5 s (8 s con
 * acción), pausa al pasar el cursor o enfocar, se descarta con X o deslizando. `role="status"`: nunca roba el foco.
 * Sin "Deshacer" (5.6.9). Los errores de formulario NO van en toasts (van junto al campo).
 *
 *   avisar({ texto: 'Gasto eliminado' });
 *   avisar({ tipo: 'exito', texto: 'Venta V-000482 registrada · $ 199.900',
 *     detalle: 'Inventario −1 · Comisión de Sebastián +$ 5.039 · Caja Usaquén actualizada', accion: { texto: 'Ver venta', a: rutas.venta(id) } });
 *
 * Implementación propia (no Radix Toast): va en todos los layouts y no debe pesar en el arranque de /app.
 * El contenedor lleva `data-testid="avisos"` (pruebas de fundaciones).
 */
export type TipoAviso = 'exito' | 'alerta' | 'error' | 'info';

export interface Aviso {
  id: number;
  tipo: TipoAviso;
  texto: string;
  detalle?: string;
  accion?: { texto: string; a?: string; alHacer?: () => void };
}

interface EstadoAvisos {
  avisos: Aviso[];
  quitar: (id: number) => void;
}

let secuencia = 0;
const almacenAvisos = createStore<EstadoAvisos>()((set) => ({
  avisos: [],
  quitar: (id) => set((s) => ({ avisos: s.avisos.filter((a) => a.id !== id) })),
}));

/** Muestra un aviso. Devuelve su id (para quitarlo antes de tiempo con `quitarAviso`). */
export function avisar(a: Omit<Aviso, 'id' | 'tipo'> & { tipo?: TipoAviso }): number {
  const id = ++secuencia;
  const nuevo: Aviso = { ...a, tipo: a.tipo ?? 'info', id };
  almacenAvisos.setState((s) => ({ avisos: [...s.avisos, nuevo].slice(-3) }));
  return id;
}

export function quitarAviso(id: number): void {
  almacenAvisos.getState().quitar(id);
}

const ICONOS: Record<TipoAviso, LucideIcon> = { exito: CircleCheck, alerta: TriangleAlert, error: CircleAlert, info: Info };

function TarjetaAviso({ aviso }: { aviso: Aviso }) {
  const quitar = useStore(almacenAvisos, (s) => s.quitar);
  const [pausado, setPausado] = useState(false);
  const restante = useRef(aviso.accion ? 8000 : 5000);
  const inicio = useRef(0);
  const toque = useRef<number | null>(null);
  const [dx, setDx] = useState(0);
  useEffect(() => {
    if (pausado) return;
    inicio.current = performance.now();
    const t = setTimeout(() => quitar(aviso.id), restante.current);
    return () => {
      clearTimeout(t);
      restante.current -= performance.now() - inicio.current;
    };
  }, [pausado, aviso.id, quitar]);
  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      onPointerDown={(e) => {
        toque.current = e.clientX;
      }}
      onPointerMove={(e) => {
        if (toque.current !== null) setDx(e.clientX - toque.current);
      }}
      onPointerUp={() => {
        if (Math.abs(dx) > 80) quitar(aviso.id);
        setDx(0);
        toque.current = null;
      }}
      style={dx ? { transform: `translateX(${dx}px)`, opacity: Math.max(0.2, 1 - Math.abs(dx) / 200) } : undefined}
      className="sobre-ink pointer-events-auto flex w-full items-start gap-3 rounded-none bg-ink px-4 py-3 text-inverse animate-toast-in"
      data-tipo={aviso.tipo}
    >
      <Icono icono={ICONOS[aviso.tipo]} tamano={16} className="mt-[3px]" />
      <div className="min-w-0 flex-1">
        <p className="t-body text-inverse">{aviso.texto}</p>
        {aviso.detalle && <p className="mt-0.5 t-small text-inverse/80">{aviso.detalle}</p>}
      </div>
      {aviso.accion &&
        (aviso.accion.a ? (
          <Link to={aviso.accion.a} onClick={() => quitar(aviso.id)} className="mt-0.5 shrink-0 t-label font-bold text-inverse underline underline-offset-3">
            {aviso.accion.texto}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              aviso.accion?.alHacer?.();
              quitar(aviso.id);
            }}
            className="mt-0.5 shrink-0 t-label font-bold text-inverse underline underline-offset-3"
          >
            {aviso.accion.texto}
          </button>
        ))}
      <button type="button" aria-label="Cerrar aviso" onClick={() => quitar(aviso.id)} className="-mr-1 inline-flex size-6 shrink-0 items-center justify-center text-inverse/80 hover:text-inverse">
        <Icono icono={X} tamano={14} />
      </button>
    </div>
  );
}

/** Contenedor de avisos (uno por layout). `inferior` deja espacio para la barra de pestañas de /app. */
export function Toaster({ inferior = 'bottom-6' }: { inferior?: string }) {
  const avisos = useStore(almacenAvisos, (s) => s.avisos);
  return (
    <div
      data-testid="avisos"
      className={cn('pointer-events-none fixed left-1/2 z-(--z-toast) flex w-[min(400px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-2', inferior)}
    >
      {avisos.map((a) => (
        <TarjetaAviso key={a.id} aviso={a} />
      ))}
    </div>
  );
}

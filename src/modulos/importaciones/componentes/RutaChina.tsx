import { Anchor, Factory, Ship, Truck, Warehouse, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn, Icono } from '@/ui';
import { PROGRESO_PUERTO, type TramoRuta } from '../calculos';

/**
 * Diagrama de la ruta China → puerto colombiano → Bogotá (W3). El barco queda en el punto proporcional a las
 * fechas (calculado por `posicionRuta`) y se desplaza con una transición cuando cambia el estado. Con varios
 * pedidos (vista "Ruta") cada uno lleva su marcador y los que están cerca se escalonan en carriles para no taparse.
 */
export interface BarcoRuta {
  id: string;
  numero: string;
  progreso: number;
  tramo: TramoRuta;
  /** Texto corto para lectores de pantalla ("En puerto colombiano"). */
  etiqueta?: string;
  resaltado?: boolean;
}

export interface PropsRutaChina {
  barcos: readonly BarcoRuta[];
  /** Puerto de origen del pedido ("Shenzhen (Yantian)") o "China" en la vista con varios pedidos. */
  origen: string;
  puertoDestino: string;
  /** Fechas bajo cada nodo (ya formateadas). */
  fechas?: { origen?: ReactNode; puerto?: ReactNode; bodega?: ReactNode };
  /** Cantidad de carriles verticales para escalonar varios barcos. */
  carriles?: number;
  alAbrir?: (id: string) => void;
  className?: string;
}

const ICONO_TRAMO: Record<TramoRuta, LucideIcon> = { fabrica: Factory, mar: Ship, puerto: Anchor, tierra: Truck, bodega: Warehouse };
const TEXTO_TRAMO: Record<TramoRuta, string> = {
  fabrica: 'en fábrica',
  mar: 'en el mar',
  puerto: 'en el puerto',
  tierra: 'en camino a Bogotá',
  bodega: 'en la bodega',
};

const PASO_CARRIL = 48;
const posX = (progreso: number) => `${Math.min(1, Math.max(0, progreso)) * 100}%`;

/** Reparte los barcos en carriles verticales cuando sus posiciones se pisan. */
function carrilesDe(barcos: readonly BarcoRuta[], n: number): Map<string, number> {
  const orden = [...barcos].sort((a, b) => a.progreso - b.progreso || (a.numero < b.numero ? -1 : 1));
  const ultimo: number[] = Array.from({ length: n }, () => -1);
  const r = new Map<string, number>();
  for (const b of orden) {
    let c = ultimo.findIndex((p) => p < 0 || b.progreso - p > 0.14);
    if (c < 0) c = 0;
    ultimo[c] = b.progreso;
    r.set(b.id, c);
  }
  return r;
}

export function RutaChina({ barcos, origen, puertoDestino, fechas, carriles = 1, alAbrir, className }: PropsRutaChina) {
  const carril = carrilesDe(barcos, carriles);
  const zona = 72 + (carriles - 1) * PASO_CARRIL;
  const y = zona / 2;
  return (
    <div className={cn('px-16', className)} data-testid="ruta-china" data-barcos={barcos.length}>
      <div className="relative" style={{ height: zona }}>
        {/* Mar (trazo continuo) y tierra (punteado). */}
        <div aria-hidden className="absolute left-0 border-t-2 border-ink" style={{ top: y, width: posX(PROGRESO_PUERTO) }} />
        <div aria-hidden className="absolute right-0 border-t-2 border-dashed border-line-strong" style={{ top: y, width: `${(1 - PROGRESO_PUERTO) * 100}%` }} />
        {carriles === 1 && (
          <>
            <p className="absolute -translate-x-1/2 whitespace-nowrap t-small italic text-muted" style={{ left: `${PROGRESO_PUERTO * 50}%`, top: y - 28 }}>
              Océano Pacífico
            </p>
            <p className="absolute -translate-x-1/2 whitespace-nowrap t-small italic text-muted" style={{ left: `${(PROGRESO_PUERTO + (1 - PROGRESO_PUERTO) / 2) * 100}%`, top: y - 28 }}>
              Por carretera
            </p>
          </>
        )}
        {[0, PROGRESO_PUERTO, 1].map((x) => (
          <span key={x} aria-hidden className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-surface" style={{ left: posX(x), top: y }} />
        ))}
        {barcos.map((b) => {
          const c = carril.get(b.id) ?? 0;
          const desplazamiento = (c - (carriles - 1) / 2) * PASO_CARRIL;
          const Marcador = alAbrir ? 'button' : 'div';
          return (
            <Marcador
              key={b.id}
              type={alAbrir ? 'button' : undefined}
              onClick={alAbrir ? () => alAbrir(b.id) : undefined}
              aria-label={`${b.numero}: ${b.etiqueta ?? TEXTO_TRAMO[b.tramo]}`}
              data-testid={`barco-${b.numero}`}
              data-progreso={b.progreso.toFixed(3)}
              data-tramo={b.tramo}
              className={cn(
                'absolute z-1 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-[left,top] duration-(--dur-slower) ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                alAbrir && 'cursor-pointer',
              )}
              style={{ left: posX(b.progreso), top: y + desplazamiento }}
            >
              <span className={cn('flex size-9 items-center justify-center bg-ink text-inverse', b.resaltado && 'outline outline-2 outline-offset-2 outline-accent')}>
                <Icono icono={ICONO_TRAMO[b.tramo]} tamano={18} />
              </span>
              {carriles > 1 && <span className="absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap t-micro font-bold text-ink">{b.numero}</span>}
            </Marcador>
          );
        })}
      </div>
      <div className="relative h-[84px]">
        <Nodo x={0} nombre={origen} rol="China" pie={fechas?.origen} />
        <Nodo x={PROGRESO_PUERTO} nombre={puertoDestino} rol="Puerto colombiano" pie={fechas?.puerto} />
        <Nodo x={1} nombre="Bogotá" rol="Bodega" pie={fechas?.bodega} />
      </div>
    </div>
  );
}

function Nodo({ x, nombre, rol, pie }: { x: number; nombre: string; rol: string; pie?: ReactNode }) {
  return (
    <div className="absolute top-0 flex w-40 -translate-x-1/2 flex-col items-center text-center" style={{ left: posX(x) }}>
      <p className="t-eyebrow text-ink-2">{rol}</p>
      <p className="t-label font-bold text-ink">{nombre}</p>
      {pie && <p className="t-small num text-muted">{pie}</p>}
    </div>
  );
}

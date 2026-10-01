import { create } from 'zustand';
import type { EstadoDominio, Id } from '@/dominio/tipos';
import { agregarALinea, fijarCantidadLinea, quitarLinea, unidadesEnBolsa } from './calculos';
import type { LineaBolsa } from './tipos';

/**
 * Bolsa y favoritos de la tienda (D6). Estado de interfaz del comprador: vive en la pestaña (sessionStorage), no
 * en el dominio. La venta solo existe cuando se paga (`venta.registrar`).
 */
const CLAVE = 'kc:tienda:bolsa';

interface Guardado {
  lineas: LineaBolsa[];
  favoritos: Id[];
}

function leer(): Guardado {
  try {
    const crudo = globalThis.sessionStorage?.getItem(CLAVE);
    if (!crudo) return { lineas: [], favoritos: [] };
    const j = JSON.parse(crudo) as Partial<Guardado>;
    const lineas = Array.isArray(j.lineas) ? j.lineas.filter((l) => typeof l?.varianteId === 'string' && Number.isInteger(l.cantidad) && l.cantidad > 0) : [];
    const favoritos = Array.isArray(j.favoritos) ? j.favoritos.filter((f) => typeof f === 'string') : [];
    return { lineas, favoritos };
  } catch {
    return { lineas: [], favoritos: [] };
  }
}

function guardar(g: Guardado): void {
  try {
    globalThis.sessionStorage?.setItem(CLAVE, JSON.stringify(g));
  } catch {
    // sin sessionStorage la bolsa vive solo en memoria
  }
}

export interface EstadoBolsa extends Guardado {
  /** Agrega una unidad (o más) de la variante, sin pasar de lo que hay. Devuelve cuántas quedaron en la bolsa. */
  agregar: (varianteId: Id, stock: number, cantidad?: number) => number;
  fijarCantidad: (varianteId: Id, cantidad: number, stock: number) => void;
  quitar: (varianteId: Id) => void;
  vaciar: () => void;
  alternarFavorito: (productoId: Id) => void;
}

export const useBolsa = create<EstadoBolsa>()((set, get) => {
  const inicial = leer();
  const aplicar = (parcial: Partial<Guardado>) => {
    set(parcial);
    const { lineas, favoritos } = get();
    guardar({ lineas, favoritos });
  };
  return {
    ...inicial,
    agregar: (varianteId, stock, cantidad = 1) => {
      aplicar({ lineas: agregarALinea(get().lineas, varianteId, cantidad, stock) });
      return get().lineas.find((l) => l.varianteId === varianteId)?.cantidad ?? 0;
    },
    fijarCantidad: (varianteId, cantidad, stock) => aplicar({ lineas: fijarCantidadLinea(get().lineas, varianteId, cantidad, stock) }),
    quitar: (varianteId) => aplicar({ lineas: quitarLinea(get().lineas, varianteId) }),
    vaciar: () => aplicar({ lineas: [] }),
    alternarFavorito: (productoId) => {
      const f = get().favoritos;
      aplicar({ favoritos: f.includes(productoId) ? f.filter((x) => x !== productoId) : [...f, productoId] });
    },
  };
});

/** Unidades en la bolsa (el contador del encabezado). */
export function useCantidadBolsa(): number {
  return useBolsa((s) => unidadesEnBolsa(s.lineas));
}

/**
 * Último pedido hecho en esta pestaña con el estado de antes y de después: la confirmación lo usa para mostrar
 * "lo que acaba de pasar" (W1) exacto. Si se recarga la página, la confirmación se arma solo con la venta.
 */
export interface UltimoPedido {
  ventaId: Id;
  antes: EstadoDominio;
  despues: EstadoDominio;
}
let ultimo: UltimoPedido | null = null;
export const recordarPedido = (p: UltimoPedido): void => {
  ultimo = p;
};
export const pedidoRecordado = (ventaId: Id): UltimoPedido | null => (ultimo?.ventaId === ventaId ? ultimo : null);
/** Venta del último pedido hecho en esta pestaña (el panel "Tu cuenta" del encabezado la enlaza). */
export const ultimoPedidoId = (): Id | null => ultimo?.ventaId ?? null;

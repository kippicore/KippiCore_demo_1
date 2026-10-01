import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { EstadoTraslado, Id, RefDocumento } from '@/dominio/tipos';
import { useRolActivo, useSel } from '@/estado';
import { selLocales } from '@/selectores';
import { rutas } from '@/app/rutas';
import { ESTADOS_TRASLADO, type EstiloEstado } from '@/config/estados';
import { BadgeEstado, PestanasEnlace } from '@/ui';

/** Piezas pequeñas que comparten varias pantallas de Inventario. */

/** Pestañas del módulo: lo que ve cada rol (el vendedor solo consulta; la valorización es del dueño). */
export function PestanasModulo() {
  const rol = useRolActivo();
  if (rol === 'vendedor') return null;
  return (
    <PestanasEnlace
      etiqueta="Secciones de inventario"
      pestanas={[
        { a: rutas.inventario(), etiqueta: 'Catálogo', fin: true },
        { a: rutas.movimientos(), etiqueta: 'Movimientos' },
        { a: rutas.traslados(), etiqueta: 'Traslados' },
        { a: rutas.conteos(), etiqueta: 'Conteos' },
        { a: rutas.recepcion(), etiqueta: 'Recepción' },
        { a: rutas.etiquetas(), etiqueta: 'Etiquetas' },
        ...(rol === 'dueno' ? [{ a: rutas.valorizacion(), etiqueta: 'Valorización' }] : []),
      ]}
    />
  );
}

/** Insignia del estado de un traslado desde el mapa canónico. */
export function BadgeTraslado({ estado }: { estado: EstadoTraslado }) {
  const e: EstiloEstado = ESTADOS_TRASLADO[estado];
  return <BadgeEstado estado={e} />;
}

/** Locales con inventario (los que venden y la bodega), en el orden de la configuración. */
export function useLocalesInventario() {
  return useSel(selLocales, { incluirBodega: true });
}

/** Enlace al documento que originó un movimiento (venta, traslado, importación, conteo) o texto si no tiene pantalla. */
export function EnlaceDocumento({ documento }: { documento: { ref: RefDocumento; numero: string } }) {
  const { ref, numero } = documento;
  const clase = 'font-semibold text-ink underline-offset-4 hover:underline';
  switch (ref.tipo) {
    case 'traslado':
      return (
        <Link to={rutas.traslado(ref.id)} className={clase}>
          {numero}
        </Link>
      );
    case 'venta':
      return (
        <Link to={rutas.venta(ref.id)} className={clase}>
          {numero}
        </Link>
      );
    case 'conteo':
      return (
        <Link to={rutas.conteo(ref.id)} className={clase}>
          {numero}
        </Link>
      );
    case 'importacion':
      return (
        <Link to={rutas.importacion(numero)} className={clase}>
          {numero}
        </Link>
      );
    default:
      return <span>{numero}</span>;
  }
}

/**
 * Cuenta los cambios de un valor para disparar el destello de transición (camel suave, 600 ms) cuando una
 * existencia cambia por una acción (despachar, recibir, ajustar). No destella en el primer pintado.
 */
export function useCambio(valor: number): number {
  const anterior = useRef(valor);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (anterior.current === valor) return;
    anterior.current = valor;
    const id = requestAnimationFrame(() => setN((x) => x + 1));
    return () => cancelAnimationFrame(id);
  }, [valor]);
  return n;
}

/** Id de local → nombre, a partir de la lista de locales. */
export function nombreDeLocal(locales: readonly { id: Id; nombre: string }[], id: Id): string {
  return locales.find((l) => l.id === id)?.nombre ?? id;
}

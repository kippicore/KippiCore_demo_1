import { lazy, Suspense, useState, type ReactNode } from 'react';

const Hoja = lazy(() => import('./HojaVenta'));

/**
 * Estado local de "qué venta está abierta" + la hoja de detalle, que se carga diferida la primera vez que se abre
 * (la lista de ventas y el aviso del QR no pagan su código en el arranque de /app).
 *
 *   const { abrir, hoja } = useHojaVenta();   …   <FilaLista onClick={() => abrir(v.id)} />   …   {hoja}
 */
export function useHojaVenta(): { abrir: (ventaId: string) => void; hoja: ReactNode } {
  const [ventaId, setVentaId] = useState<string | null>(null);
  return {
    abrir: setVentaId,
    hoja: ventaId ? (
      <Suspense fallback={null}>
        <Hoja ventaId={ventaId} alCerrar={() => setVentaId(null)} />
      </Suspense>
    ) : null,
  };
}

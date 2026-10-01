import { Outlet } from 'react-router';
import { useMarca } from '@/estado';
import { RequiereDatos } from '@/app/RequiereDatos';

/** Layout mínimo de la tienda web (F2-B); F2-C lo reemplaza (8.6). Sin rol: las ventas van como 'tienda'. */
export function LayoutTienda() {
  const marca = useMarca();
  return (
    <div data-testid="layout-tienda">
      <header style={{ padding: 16, fontWeight: 900, letterSpacing: '0.18em' }}>{marca.nombre.toUpperCase()}</header>
      <RequiereDatos>
        <Outlet />
      </RequiereDatos>
    </div>
  );
}

import { Outlet } from 'react-router';
import { RequiereDatos } from '@/app/RequiereDatos';

/** Layout mínimo del portal de la agente de aduanas (F2-B); F2-C lo reemplaza. Sin rol: escribe como 'portal'. */
export function LayoutPortal() {
  return (
    <div data-testid="layout-portal" style={{ maxWidth: 720, margin: '0 auto' }}>
      <RequiereDatos>
        <Outlet />
      </RequiereDatos>
    </div>
  );
}

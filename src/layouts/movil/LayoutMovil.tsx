import { NavLink, Outlet } from 'react-router';
import { PESTANAS_APP } from '@/config/navegacion';
import { ContextoRolForzado, useMarca } from '@/estado';
import { RequiereDatos } from '@/app/RequiereDatos';
import { AvisosGlobales } from '../AvisosGlobales';

/**
 * Layout mínimo de la app del dueño (F2-B). `/app` es SIEMPRE del dueño (5.8): fuerza el rol con
 * `ContextoRolForzado`. Muestra su armazón al instante y un esqueleto mientras se construyen los datos.
 * F2-C lo reemplaza (8.5): pestañas, modo oscuro y chip de datos de ejemplo.
 */
export function LayoutMovil() {
  const marca = useMarca();
  return (
    <ContextoRolForzado.Provider value="dueno">
      <div data-testid="layout-movil" style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', paddingBottom: 64 }}>
        <header style={{ padding: '12px 16px', fontWeight: 900, letterSpacing: '0.18em' }}>{marca.nombre.toUpperCase()}</header>
        <RequiereDatos compacta>
          <Outlet />
        </RequiereDatos>
        <nav
          aria-label="Pestañas"
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', padding: 12, borderTop: '1px solid #e6e6e6', background: '#fff' }}
        >
          {PESTANAS_APP.map((p) => (
            <NavLink key={p.id} to={p.ruta} end={p.ruta === '/app'}>
              {p.etiqueta}
            </NavLink>
          ))}
        </nav>
        <AvisosGlobales />
      </div>
    </ContextoRolForzado.Provider>
  );
}

import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import type { Moneda, Rol } from '@/dominio/tipos';
import { MENU_ESCRITORIO } from '@/config/navegacion';
import { PERSONAS_ROL } from '@/config/permisos';
import { emitirUI, useDatos, useMarca, useRolActivo, useSesion } from '@/estado';
import { RequiereDatos } from '@/app/RequiereDatos';
import { GuiaFlotante, MenuAyuda } from '@/modulos/guia/publico';
import { BotonAppDueno } from '@/movil/publico';
import { AvisosGlobales } from '../AvisosGlobales';

/**
 * Layout mínimo y funcional del escritorio (F2-B). F2-C lo reemplaza con el diseño final (8.4): barra lateral
 * filtrada por rol, barra superior con los selectores de local, moneda y rol, franja de rol y de moneda.
 */
export function LayoutEscritorio() {
  const rol = useRolActivo();
  const { pathname } = useLocation();
  const marca = useMarca();
  const local = useSesion((s) => s.localId);
  const moneda = useSesion((s) => s.moneda);
  const cambiarRol = useSesion((s) => s.cambiarRol);
  const cambiarLocal = useSesion((s) => s.cambiarLocal);
  const cambiarMoneda = useSesion((s) => s.cambiarMoneda);
  const recordarRuta = useSesion((s) => s.recordarRuta);
  const locales = useDatos((s) => s.estado?.locales);
  const usuarios = useDatos((s) => s.estado?.usuarios);
  const reconstruyendo = useDatos((s) => s.reconstruyendo);
  useEffect(() => {
    document.documentElement.dataset.rol = rol;
  }, [rol]);
  useEffect(() => {
    recordarRuta(pathname);
  }, [pathname, recordarRuta]);
  const menu = MENU_ESCRITORIO.filter((i) => i.roles.includes(rol));
  const usuarioRol = usuarios?.[PERSONAS_ROL[rol].usuarioId];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh' }}>
      <nav aria-label="Menú principal" style={{ borderRight: '1px solid #e6e6e6', padding: 16 }}>
        <p style={{ fontWeight: 900, letterSpacing: '0.18em' }}>{marca.nombre.toUpperCase()}</p>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>
          {menu.map((i) => (
            <li key={i.id}>
              <NavLink to={i.ruta}>{i.etiqueta}</NavLink>
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 12, color: '#6e6e6e' }}>Desarrollado por KippiCore</p>
      </nav>
      <div>
        <header style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #e6e6e6' }}>
          <label>
            Local{' '}
            <select
              data-testid="selector-local"
              value={rol === 'vendedor' ? (usuarioRol?.localFijoId ?? local) : local}
              disabled={rol === 'vendedor'}
              onChange={(e) => cambiarLocal(e.target.value)}
            >
              <option value="todos">Todos los locales</option>
              {Object.values(locales ?? {})
                .filter((l) => !l.eliminadoEn)
                .sort((a, b) => a.orden - b.orden)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Moneda{' '}
            <select
              data-testid="selector-moneda"
              value={moneda}
              onChange={(e) => {
                cambiarMoneda(e.target.value as Moneda);
                emitirUI('moneda_cambiada', { a: e.target.value });
              }}
            >
              <option value="COP">COP</option>
              <option value="USD">USD</option>
              <option value="CNY">CNY</option>
            </select>
          </label>
          <label>
            Rol{' '}
            <select
              data-testid="selector-rol"
              value={rol}
              onChange={(e) => {
                const r = e.target.value as Rol;
                cambiarRol(r, usuarios?.[PERSONAS_ROL[r].usuarioId]?.localFijoId ?? null);
                emitirUI('rol_cambiado', { a: r });
              }}
            >
              <option value="dueno">Dueño</option>
              <option value="vendedor">Vendedor · Usaquén</option>
              <option value="bodega">Bodega</option>
            </select>
          </label>
          <BotonAppDueno />
          <MenuAyuda />
          {reconstruyendo && <span style={{ fontSize: 12, color: '#6e6e6e' }}>Actualizando datos…</span>}
        </header>
        {rol !== 'dueno' && (
          <p data-testid="franja-rol" style={{ background: '#f3ece4', margin: 0, padding: '6px 16px', fontSize: 13 }}>
            Estás viendo KippiCore como: {PERSONAS_ROL[rol].etiqueta}
            {usuarioRol ? ` (${usuarioRol.nombre})` : ''} ·{' '}
            <button type="button" onClick={() => cambiarRol('dueno')}>
              Volver a la vista del dueño
            </button>
          </p>
        )}
        <main id="contenido">
          <RequiereDatos>
            <Outlet />
          </RequiereDatos>
        </main>
      </div>
      <GuiaFlotante />
      <AvisosGlobales />
    </div>
  );
}

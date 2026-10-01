import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';

/**
 * Punto de entrada provisional de F2-A1. F2-B lo reemplaza por <Proveedores><RouterProvider/></Proveedores>
 * y el registro diferido del service worker (5.4, 5.11).
 */
function Provisional() {
  return (
    <main style={{ padding: 48 }}>
      <p style={{ letterSpacing: '0.18em', fontWeight: 900 }}>HALDEN</p>
      <p>Moda masculina · Bogotá. Demo de KippiCore CRM en construcción.</p>
    </main>
  );
}

const raiz = document.getElementById('root');
if (raiz) {
  createRoot(raiz).render(
    <StrictMode>
      <Provisional />
    </StrictMode>,
  );
}

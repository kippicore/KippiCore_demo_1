import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import NoEncontrada from './NoEncontrada';
import { rutas } from './rutas';

/** Error de ruta (PLAN 5.5): sin pantallas en blanco; ofrece recargar o volver al inicio. */
export default function ErrorRuta() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NoEncontrada />;
  const detalle = error instanceof Error ? error.message : String(error);
  if (import.meta.env.DEV) console.error(error);
  return (
    <main role="alert" style={{ padding: 48, maxWidth: 560 }} data-testid="error-ruta">
      <h1 style={{ fontWeight: 900, textTransform: 'uppercase' }}>Algo no salió bien</h1>
      <p>Esta pantalla tuvo un problema al cargar. Recarga la página; tus cambios están guardados.</p>
      {import.meta.env.DEV && <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{detalle}</pre>}
      <p style={{ display: 'flex', gap: 16 }}>
        <button type="button" onClick={() => window.location.reload()}>
          Recargar la página
        </button>
        <Link to={rutas.inicio()}>Ir al inicio</Link>
      </p>
    </main>
  );
}

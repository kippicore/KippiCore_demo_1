import { RotateCcw } from 'lucide-react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button } from '@/ui/primitivos/Button';
import NoEncontrada from './NoEncontrada';
import { rutas } from './rutas';

/** Error de ruta (PLAN 5.5): sin pantallas en blanco ni "¡Ups!"; ofrece recargar o volver al inicio. */
export default function ErrorRuta() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NoEncontrada />;
  const detalle = error instanceof Error ? error.message : String(error);
  if (import.meta.env.DEV) console.error(error);
  return (
    <main role="alert" data-testid="error-ruta" className="flex min-h-[70dvh] items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-[560px]">
        <p className="t-eyebrow text-ink-2">Algo no salió bien</p>
        <h1 className="mt-3 t-h1 text-ink">Esta pantalla no cargó</h1>
        <p className="mt-3 max-w-[48ch] t-body text-muted">Recarga la página: tus cambios están guardados en este navegador.</p>
        {import.meta.env.DEV && <pre className="mt-4 max-h-48 overflow-auto bg-surface-2 p-3 font-mono t-micro whitespace-pre-wrap text-ink-2">{detalle}</pre>}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button icono={RotateCcw} onClick={() => window.location.reload()}>
            Recargar la página
          </Button>
          <Link to={rutas.inicio()} className="t-label font-bold text-ink underline underline-offset-4 hover:no-underline">
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}

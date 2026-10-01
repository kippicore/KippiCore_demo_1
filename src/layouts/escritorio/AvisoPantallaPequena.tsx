import { ArrowRight } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { rutas } from '@/app/rutas';
import { Marca } from '@/ui/conectados/Marca';
import { BotonEnlace } from '@/ui/primitivos/Button';

const QrApp = lazy(() => import('./QrApp'));

/**
 * Aviso de pantalla pequeña (PLAN 8.4.1): por debajo de 1024 px el escritorio no se fuerza; se ofrece la app del
 * dueño con su QR (en tableta) y un botón. Elegante, no un error.
 */
export function AvisoPantallaPequena() {
  return (
    <div data-testid="aviso-pantalla-pequena" className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 py-16 text-center lg:hidden">
      <Marca descriptor className="items-center" />
      <h1 className="mt-12 max-w-[20ch] t-h2 text-ink">KippiCore está pensado para la computadora del local</h1>
      <p className="mt-3 max-w-[40ch] t-body text-muted">Para el celular, abre la app del dueño: cómo va el día y cómo cerraron las cajas, desde donde estés.</p>
      <div className="mt-8 hidden sm:block">
        <Suspense fallback={<div className="size-40 bg-surface" />}>
          <QrApp />
        </Suspense>
      </div>
      <BotonEnlace to={rutas.app()} tamano="lg" iconoDerecha={ArrowRight} className="mt-8">
        Abrir la app del dueño
      </BotonEnlace>
    </div>
  );
}

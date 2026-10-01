import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { BotonEnlace } from '@/ui/primitivos/Button';
import { rutas } from './rutas';

/** Página no encontrada (PLAN 5.5): sin culpar, con salidas claras. Conserva `data-testid="no-encontrada"`. */
export default function NoEncontrada() {
  return (
    <main data-testid="no-encontrada" className="flex min-h-[70dvh] items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-[560px]">
        <p className="t-eyebrow text-ink-2">Página no encontrada</p>
        <h1 className="mt-3 t-h1 text-ink">Esta página no existe</h1>
        <p className="mt-3 max-w-[48ch] t-body text-muted">Puede que el enlace esté incompleto o que la página haya cambiado de lugar. Desde aquí puedes seguir recorriendo la demo.</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <BotonEnlace to={rutas.inicio()} iconoDerecha={ArrowRight}>
            Ir al inicio
          </BotonEnlace>
          <Link to={rutas.entrada()} className="t-label font-bold text-ink underline underline-offset-4 hover:no-underline">
            Ver la entrada
          </Link>
        </div>
      </div>
    </main>
  );
}

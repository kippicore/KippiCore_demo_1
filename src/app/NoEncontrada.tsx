import { Link } from 'react-router';
import { rutas } from './rutas';

/** Página no encontrada (PLAN 5.5): diseñada por F2-C, con enlaces a la entrada y al inicio. */
export default function NoEncontrada() {
  return (
    <main style={{ padding: 48, maxWidth: 560 }} data-testid="no-encontrada">
      <p style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Página no encontrada</p>
      <h1 style={{ fontWeight: 900, textTransform: 'uppercase' }}>Esta página no existe</h1>
      <p>Puede que el enlace esté incompleto o que la página haya cambiado de lugar.</p>
      <p style={{ display: 'flex', gap: 16 }}>
        <Link to={rutas.entrada()}>Ir a la entrada</Link>
        <Link to={rutas.inicio()}>Ir al inicio</Link>
      </p>
    </main>
  );
}

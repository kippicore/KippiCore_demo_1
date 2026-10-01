import { Link } from 'react-router';
import { rutas } from '@/app/rutas';
import { useDatos, useMarca } from '@/estado';

/**
 * Esqueleto de F2-B (PLAN 9.1.6): E2 reemplaza la entrada con las dos puertas, el QR y la personalización.
 * La entrada NO espera los datos: el motor ya arrancó en main.tsx mientras el cliente lee.
 */
export default function Entrada() {
  const marca = useMarca();
  const progreso = useDatos((s) => s.progreso);
  const listo = useDatos((s) => s.estado !== null);
  return (
    <main data-testid="entrada" style={{ padding: 48 }}>
      <p style={{ fontWeight: 900, letterSpacing: '0.18em', fontSize: 32 }}>{marca.nombre.toUpperCase()}</p>
      <p>{marca.descriptor}</p>
      <p style={{ fontSize: 13, color: '#6e6e6e' }}>{marca.avisoEjemplo}</p>
      <p style={{ display: 'flex', gap: 24 }}>
        <Link to={rutas.inicio()}>Entrar como dueño</Link>
        <Link to={rutas.app()}>Ver la app del dueño</Link>
        <Link to={rutas.miDia()}>o mira lo que ve un vendedor</Link>
      </p>
      <p style={{ fontSize: 12, color: '#6e6e6e' }} data-testid="progreso-entrada">
        {listo ? 'Datos listos' : `Preparando los datos… ${Math.round(progreso)} %`}
      </p>
    </main>
  );
}

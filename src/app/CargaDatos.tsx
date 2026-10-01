import { useDatos, useMarca } from '@/estado';
import { DEMO } from '@/config/demo';

/**
 * Pantalla de progreso mientras el worker construye (PLAN 5.6.12): solo la ve quien entra directo por un enlace
 * profundo ("Preparando 18 meses de historia de HALDEN… 64 %"). F2-C le da el diseño final.
 */
export function CargaDatos({ compacta = false }: { compacta?: boolean }) {
  const progreso = useDatos((s) => s.progreso);
  const error = useDatos((s) => s.error);
  const fase = useDatos((s) => s.fase);
  const { nombre } = useMarca();
  if (fase === 'error') {
    return (
      <div role="alert" style={{ padding: 32 }}>
        <p>No pudimos preparar los datos de ejemplo.</p>
        <p style={{ color: '#6e6e6e', fontSize: 13 }}>{error}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Volver a intentar
        </button>
      </div>
    );
  }
  return (
    <div role="status" aria-live="polite" data-testid="carga-datos" style={{ padding: compacta ? 16 : 48 }}>
      <p>
        Preparando {DEMO.mesesHistoria} meses de historia de {nombre}… {Math.round(progreso)} %
      </p>
      <div style={{ height: 2, background: '#e6e6e6', maxWidth: 360 }}>
        <div style={{ height: 2, width: `${progreso}%`, background: '#0a0a0a', transition: 'width 200ms' }} />
      </div>
    </div>
  );
}

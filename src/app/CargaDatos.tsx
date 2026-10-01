import { CircleAlert, RotateCcw } from 'lucide-react';
import { useDatos, useMarca } from '@/estado';
import { DEMO } from '@/config/demo';
import { Icono } from '@/ui/primitivos/Icono';

/**
 * Progreso mientras se construyen los 18 meses (PLAN 5.6.12, 2.2): solo lo ve quien entra directo por un enlace
 * profundo. Sobrio: wordmark, una frase con el porcentaje (cifras tabulares) y una línea de 2 px que avanza.
 * `compacta` para /app (dentro del armazón de la app). Conserva `data-testid="carga-datos"`.
 */
export function CargaDatos({ compacta = false }: { compacta?: boolean }) {
  const progreso = useDatos((s) => s.progreso);
  const error = useDatos((s) => s.error);
  const fase = useDatos((s) => s.fase);
  const { nombre } = useMarca();
  const p = Math.max(0, Math.min(100, Math.round(progreso)));
  if (fase === 'error') {
    return (
      <div role="alert" className={compacta ? 'px-4 py-10' : 'flex min-h-[60dvh] items-center justify-center px-6'}>
        <div className="max-w-[44ch]">
          <Icono icono={CircleAlert} tamano={28} className="text-subtle" />
          <p className="mt-4 t-h3 text-ink">No pudimos preparar los datos de ejemplo</p>
          <p className="mt-2 t-body text-muted">Recarga la página: los cambios que hiciste siguen guardados en este navegador.</p>
          {import.meta.env.DEV && error && <p className="mt-2 t-small text-muted">{error}</p>}
          <button type="button" onClick={() => window.location.reload()} className="mt-6 inline-flex h-10 items-center gap-2 bg-ink px-5 t-button text-inverse hover:bg-ink/85">
            <Icono icono={RotateCcw} tamano={16} />
            Volver a intentar
          </button>
        </div>
      </div>
    );
  }
  return (
    <div role="status" aria-live="polite" data-testid="carga-datos" className={compacta ? 'px-4 pb-10 pt-8' : 'flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center'}>
      <p className="t-eyebrow text-ink-2">{nombre}</p>
      <p className="mt-3 t-body text-ink">
        Preparando {DEMO.mesesHistoria} meses de historia de {nombre}… <span className="num">{p} %</span>
      </p>
      <div className={compacta ? 'mt-4 h-0.5 w-full bg-line' : 'mt-5 h-0.5 w-[320px] max-w-full bg-line'}>
        <div className="h-full origin-left bg-ink transition-transform duration-(--dur-base) ease-standard" style={{ transform: `scaleX(${p / 100})` }} />
      </div>
      {!compacta && <p className="mt-4 max-w-[44ch] t-small text-muted">Ventas, inventario, importaciones y nómina, como si fueran las tuyas. Toma unos segundos la primera vez.</p>}
    </div>
  );
}

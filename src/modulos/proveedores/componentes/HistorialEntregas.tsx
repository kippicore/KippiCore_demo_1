import { Link } from 'react-router';
import { rutas } from '@/app/rutas';
import { fecha, porcentaje } from '@/lib/formato';
import { Badge } from '@/ui';
import { etiquetaRetraso, nivelRetraso, type EntregaPedido } from '../calculos';
import { TEXTOS } from '../textos';

const TONO = { bien: 'success', atencion: 'warning', critico: 'danger' } as const;

/** Cómo llegó cada pedido ya recibido: el retraso contra lo estimado y lo defectuoso, en orden cronológico. */
export function HistorialEntregas({ entregas, className }: { entregas: readonly EntregaPedido[]; className?: string }) {
  if (entregas.length === 0) return <p className="t-small text-muted">{TEXTOS.comparativo.sinEntregas}</p>;
  return (
    <ol className={className ?? 'flex flex-wrap gap-x-3 gap-y-3'}>
      {entregas.map((e) => {
        const nivel = nivelRetraso(e.retraso);
        const detalle = `${e.numero}: pedido ${fecha(e.fechaPedido)}, estimado ${fecha(e.estimadaOriginal)}, recibido ${fecha(e.recibida)}${e.tasaDefectos !== null ? `, ${porcentaje(e.tasaDefectos, 1)} defectuosas` : ''}`;
        return (
          <li key={e.importacionId}>
            <Link to={rutas.importacion(e.numero)} title={detalle} aria-label={detalle} className="group flex min-w-[88px] flex-col items-start gap-1 border border-line px-2.5 py-2 hover:border-ink" data-testid={`entrega-${e.numero}`}>
              <span className="t-micro num text-ink-2">{e.numero}</span>
              <Badge tono={nivel ? TONO[nivel] : 'neutral'} tamano="sm">
                {etiquetaRetraso(e.retraso)}
              </Badge>
              <span className="t-micro num text-ink-2">{e.tasaDefectos === null ? '—' : `${porcentaje(e.tasaDefectos, 1)} defectos`}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

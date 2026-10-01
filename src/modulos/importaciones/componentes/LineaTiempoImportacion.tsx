import type { EstadoImportacion, FechaISO, Importacion } from '@/dominio/tipos';
import { fecha, plural } from '@/lib/formato';
import { Badge, pasosImportacion, Timeline } from '@/ui';
import { detalleHitos } from '../calculos';

/**
 * Línea de tiempo de los 13 estados en 5 fases (W3) con la fecha estimada y la real de cada paso, la desviación de
 * lo ya alcanzado, el retraso de lo que está vencido y quién lo reportó (por ejemplo, la agente desde el portal).
 * "Nacionalizado (levante)" y el aforo se dicen como los dice el importador.
 */
export function LineaTiempoImportacion({
  imp,
  hoy,
  retraso,
}: {
  imp: Pick<Importacion, 'estado' | 'hitos' | 'aforo'>;
  hoy: FechaISO;
  retraso: number;
}) {
  const detalle = detalleHitos(imp, hoy);
  const porEstado = new Map<EstadoImportacion, (typeof detalle)[number]>(detalle.map((d) => [d.estado, d]));
  const pasos = pasosImportacion(imp.estado, { retrasado: retraso > 0 }).map((p) => {
    const d = porEstado.get(p.id as EstadoImportacion);
    if (!d) return p;
    const alcanzado = d.situacion !== 'pendiente';
    const texto = alcanzado ? (
      <>
        Estimada {fecha(d.estimada)} · Real {fecha(d.real ?? d.estimada)}
      </>
    ) : (
      <>Estimada {fecha(d.estimada)}</>
    );
    let insignia = null;
    if (alcanzado && d.desviacion !== null && d.desviacion > 0)
      insignia = (
        <Badge tono="warning" tamano="sm">
          {plural(d.desviacion, 'día', 'días')} tarde
        </Badge>
      );
    else if (alcanzado && d.desviacion !== null && d.desviacion < 0)
      insignia = (
        <Badge tono="success" tamano="sm">
          {plural(-d.desviacion, 'día', 'días')} antes
        </Badge>
      );
    else if (!alcanzado && d.vencidoDias > 0)
      insignia = (
        <Badge tono="danger" tamano="sm">
          Retraso de {plural(d.vencidoDias, 'día', 'días')}
        </Badge>
      );
    const conAforo =
      imp.aforo &&
      imp.aforo.tipo !== 'automatico' &&
      (d.estado === 'en_nacionalizacion' || d.estado === 'nacionalizado') &&
      alcanzado;
    return {
      ...p,
      detalle: (
        <>
          {texto}
          {d.nota && <span className="block text-muted">{d.nota}</span>}
          {conAforo && imp.aforo && (
            <span className="block text-muted">
              Aforo {imp.aforo.tipo === 'fisico' ? 'físico' : 'documental'}
              {imp.aforo.motivo ? `: ${imp.aforo.motivo}` : ''}
            </span>
          )}
        </>
      ),
      insignia,
      autor:
        d.actualizadoPor === 'portal-aduanas'
          ? 'Reportado por la agente de aduanas desde el portal de seguimiento'
          : undefined,
    };
  });
  return <Timeline pasos={pasos} />;
}

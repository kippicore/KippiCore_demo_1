import { Link } from 'react-router';
import { rutas } from '@/app/rutas';
import { fecha, plural, relativaDias } from '@/lib/formato';
import type { FilaImportacion } from '@/selectores';
import { Badge, TimelineCompacta } from '@/ui/ligero';

/**
 * Tarjeta de una importación con su mini línea de tiempo (`TimelineCompacta`: 13 segmentos, los hechos en `ink`, el
 * actual en camel), cuándo llega a bodega y si va retrasada. Toda el área es el enlace al detalle (≥ 44 px).
 */
export function TarjetaImportacion({ f, hoy }: { f: FilaImportacion; hoy: string }) {
  const imp = f.importacion;
  const recibida = imp.estado === 'recibido_bodega';
  return (
    <Link
      to={rutas.appImportacion(imp.numero)}
      data-testid="app-importacion"
      data-numero={imp.numero}
      className="block border border-line bg-surface p-4 transition-colors active:bg-surface-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="t-h3 num text-ink">{imp.numero}</p>
          <p className="mt-0.5 truncate t-small text-muted">
            {f.proveedorNombre} · {plural(f.unidades, 'prenda', 'prendas')}
          </p>
        </div>
        {f.retrasoDias > 0 && (
          <Badge tono="danger" tamano="sm">
            Retraso de {plural(f.retrasoDias, 'día', 'días')}
          </Badge>
        )}
      </div>
      <TimelineCompacta className="mt-4" estado={imp.estado} />
      <p className="mt-3 t-small text-ink-2">
        {recibida ? 'Llegó a bodega el ' : 'Llega a bodega '}
        <span className="num">{recibida ? fecha(f.llegadaEstimada) : `${relativaDias(f.llegadaEstimada, hoy)} · ${fecha(f.llegadaEstimada)}`}</span>
      </p>
    </Link>
  );
}

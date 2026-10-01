import { ChevronRight, X } from 'lucide-react';
import { Link } from 'react-router';
import { rutas } from '@/app/rutas';
import type { Alerta } from '@/dominio/tipos';
import { useEstadoDominio } from '@/estado';
import { Badge, cn, FraseConDinero, Icono, PuntoEstado } from '@/ui/ligero';

/**
 * Una alerta de "Requiere tu atención" en el celular. `selAlertas` arma la acción con las rutas del escritorio
 * (`/panel/...`); aquí NUNCA se navega allá (en la app instalada abrirían Safari, 5.11): cada alerta se lleva a su
 * pantalla equivalente de la app cuando existe (cierre, producto, importación, pagos, aprobar) y, si no, se queda como
 * aviso informativo ("Se resuelve en el computador").
 */
export function destinoAlerta(a: Alerta, e: ReturnType<typeof useEstadoDominio>): string | null {
  // Las notificaciones (portal, venta web…) traen el documento del que hablan.
  if (a.origen?.tipo === 'importacion') {
    const imp = e.importaciones[a.origen.id];
    return imp ? rutas.appImportacion(imp.numero) : rutas.appImportaciones();
  }
  if (a.origen?.tipo === 'venta') return rutas.appVentas();
  const [, resto = ''] = a.id.split(/:(.*)/s);
  switch (a.tipo) {
    case 'caja_con_diferencia':
    case 'caja_sin_cerrar':
      return e.sesionesCaja[resto] ? rutas.appCierre(resto) : rutas.appCierres();
    case 'stock_bajo':
    case 'agotado': {
      const varianteId = resto.split('@')[0] ?? '';
      const p = e.productos[e.variantes[varianteId]?.productoId ?? ''];
      return p ? rutas.appProducto(p.referencia) : rutas.appInventario();
    }
    case 'importacion_estado':
    case 'importacion_retrasada': {
      const imp = e.importaciones[resto.split(':')[0] ?? ''];
      return imp ? rutas.appImportacion(imp.numero) : rutas.appImportaciones();
    }
    case 'pago_vencido':
    case 'pago_por_vencer':
      return rutas.appPagos();
    case 'aprobacion_pendiente':
      return rutas.appAprobar();
    default:
      return null;
  }
}

export function FilaAlerta({ a, compacta, alDescartar }: { a: Alerta; compacta?: boolean; alDescartar?: (id: string) => void }) {
  const e = useEstadoDominio();
  const destino = destinoAlerta(a, e);
  const tono = a.severidad === 'urgente' ? 'danger' : a.severidad === 'atencion' ? 'warning' : 'neutral';
  const cuerpo = (
    <>
      <span className="mt-1.5 shrink-0">
        <PuntoEstado tono={tono}>
          <span className="sr-only">{a.severidad === 'urgente' ? 'Urgente' : a.severidad === 'atencion' ? 'Atención' : 'Información'}</span>
        </PuntoEstado>
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className={cn('block t-body font-semibold text-ink', compacta ? 'line-clamp-2' : '')}>
          {a.nueva && (
            <Badge tono="accent" tamano="sm" className="mr-2 align-middle">
              Nuevo
            </Badge>
          )}
          {a.tituloPartes ? <FraseConDinero partes={a.tituloPartes} /> : a.titulo}
        </span>
        {!compacta && <span className="mt-1 block t-small text-muted">{a.contextoPartes ? <FraseConDinero partes={a.contextoPartes} /> : a.contexto}</span>}
        {!compacta && !destino && <span className="mt-1.5 block t-small text-ink-2">Se resuelve en el computador</span>}
      </span>
      {destino && <Icono icono={ChevronRight} tamano={16} className="mt-1 shrink-0 text-subtle" />}
    </>
  );
  const clases = 'flex w-full items-start gap-3 px-4 py-3 min-h-14 active:bg-surface-2';
  return (
    <div className="relative" data-testid="app-alerta" data-alerta={a.id}>
      {destino ? (
        <Link to={destino} className={cn(clases, alDescartar && 'pr-14')}>
          {cuerpo}
        </Link>
      ) : (
        <div className={cn(clases, alDescartar && 'pr-14')}>{cuerpo}</div>
      )}
      {alDescartar && (
        <button
          type="button"
          aria-label={`Descartar: ${a.titulo}`}
          onClick={() => alDescartar(a.id)}
          className="absolute right-1 top-1 inline-flex size-11 items-center justify-center text-ink-2 active:bg-surface-2"
        >
          <Icono icono={X} tamano={16} />
        </button>
      )}
    </div>
  );
}

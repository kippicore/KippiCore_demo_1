import { Ship } from 'lucide-react';
import { Link } from 'react-router';
import type { Color } from '@/dominio/tipos';
import { useHoy } from '@/estado';
import type { FilaCatalogo } from '@/selectores';
import { rutas } from '@/app/rutas';
import { ESTADOS_INVENTARIO } from '@/config/estados';
import { entero, porcentaje, relativaDias, unidades as textoUnidades } from '@/lib/formato';
import { Badge, BadgeEstado, cn, Dinero, Icono, MuestraColor, Prenda, ResaltarFila } from '@/ui';
import type { EnCaminoProducto } from '../selectores';

/**
 * Tarjeta del catálogo (grilla de producto de la referencia visual): "foto" 3:4 sobre gris, nombre en negrita,
 * precio debajo y muestras de color. Una insignia dice si está agotado o con stock bajo; el dueño ve el margen.
 */
export interface PropsTarjetaProducto {
  fila: FilaCatalogo;
  colores: readonly Color[];
  enCamino?: EnCaminoProducto;
  /** Etiqueta del alcance de las existencias ("en Usaquén", "en total"). */
  alcance: string;
  verMargen: boolean;
  resaltada?: boolean;
  /** Referencia o id que llegó en `?resaltar=`: la tarjeta que coincide destella. */
  claveResaltar: string;
}

export function TarjetaProducto({ fila, colores, enCamino, alcance, verMargen, claveResaltar }: PropsTarjetaProducto) {
  const hoy = useHoy();
  const p = fila.producto;
  const primero = colores[0];
  return (
    <ResaltarFila valor={claveResaltar} className="min-w-0">
      <article className="group relative min-w-0" data-testid={`tarjeta-${p.referencia}`}>
        <Link
          to={rutas.producto(p.referencia)}
          aria-label={`${p.nombre}, ${p.referencia}`}
          className="block outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus"
        >
          <div className="relative overflow-hidden bg-product">
            <Prenda tipo={p.tipoPrenda} color={primero?.hex ?? '#C9C9C7'} patron={primero?.patron} nombre={`${p.nombre}${primero ? `, ${primero.nombre.toLowerCase()}` : ''}`} className="transition-transform duration-(--dur-slow) ease-standard group-hover:scale-[1.03]" />
            <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
              {fila.estadoStock === 'agotado' && <BadgeEstado estado={ESTADOS_INVENTARIO.agotado} tamano="sm" />}
              {fila.estadoStock === 'bajo' && <BadgeEstado estado={ESTADOS_INVENTARIO.stock_bajo} tamano="sm" />}
            </div>
            {enCamino && (
              <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 bg-surface px-2 py-1 t-micro num text-ink-2" title={`${enCamino.numero} · llegan ${relativaDias(enCamino.fechaEstimada, hoy)}`}>
                <Icono icono={Ship} tamano={12} />
                {entero(enCamino.unidades)} en camino
              </span>
            )}
          </div>
          <div className="px-0.5 pb-3 pt-3">
            <h3 className="truncate t-nav text-ink">{p.nombre}</h3>
            <p className="mt-0.5 t-small num text-muted">{p.referencia}</p>
            <p className="mt-1 t-body-lg num text-ink">
              <Dinero valor={p.precioVenta} />
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-0.5" aria-label={`${colores.length} colores`}>
                {colores.slice(0, 6).map((c) => (
                  <MuestraColor key={c.id} hex={c.hex} nombre={c.nombre} patron={c.patron} tamano={16} className="mx-px" />
                ))}
                {colores.length > 6 && <span className="ml-1 t-small num text-muted">+{colores.length - 6}</span>}
              </span>
              <span className={cn('t-small num', fila.existencias <= 0 ? 'font-semibold text-danger' : 'text-ink-2')}>
                {textoUnidades(fila.existencias)} <span className="text-muted">{alcance}</span>
              </span>
            </div>
            {verMargen && fila.margenPct > 0 && (
              <p className="mt-1 t-small text-muted">
                <Badge tono="outline" tamano="sm">
                  Margen {porcentaje(fila.margenPct, 0)}
                </Badge>
              </p>
            )}
          </div>
        </Link>
      </article>
    </ResaltarFila>
  );
}

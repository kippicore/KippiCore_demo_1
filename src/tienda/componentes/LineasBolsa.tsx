import { Minus, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { rutas } from '@/app/rutas';
import { cn, Dinero, Icono, MiniaturaPrenda } from '@/ui/ligero';
import { useBolsa } from '../bolsa';
import { MAXIMO_POR_LINEA } from '../calculos';
import { useEnlaces } from '../enlaces';
import type { LineaBolsaDetalle } from '../tipos';

/**
 * Líneas de la bolsa (PLAN 8.6.6): miniatura 3:4 de 72 px, nombre, "color · talla", cantidad (− 1 +, cajas de 32) y
 * precio. En la bolsa y en el cajón son editables; en el resumen del pago, solo lectura.
 */
export function LineasBolsa({ lineas, editable = true, className }: { lineas: readonly LineaBolsaDetalle[]; editable?: boolean; className?: string }) {
  const { con } = useEnlaces();
  const fijar = useBolsa((s) => s.fijarCantidad);
  const quitar = useBolsa((s) => s.quitar);
  return (
    <ul className={cn('divide-y divide-line', className)} data-testid="tienda-lineas">
      {lineas.map((l) => {
        const tope = Math.min(l.stock, MAXIMO_POR_LINEA);
        return (
          <li key={l.varianteId} className="flex gap-4 py-5 first:pt-0" data-testid="tienda-linea" data-variante={l.varianteId}>
            <Link to={con(rutas.tiendaProducto(l.producto.slug, { color: l.color.codigo.toLowerCase(), talla: l.variante.talla }))} className="shrink-0" tabIndex={-1} aria-hidden>
              <MiniaturaPrenda tamano="bolsa" tipo={l.producto.tipoPrenda} color={l.color.hex} patron={l.color.patron} />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link to={con(rutas.tiendaProducto(l.producto.slug, { color: l.color.codigo.toLowerCase(), talla: l.variante.talla }))} className="t-nav-tienda text-ink hover:underline">
                    {l.producto.nombre}
                  </Link>
                  <p className="mt-0.5 t-small text-muted">
                    {l.color.nombre} · Talla {l.variante.talla}
                  </p>
                </div>
                <p className="t-body-lg text-ink">
                  <Dinero valor={l.total} />
                </p>
              </div>
              <div className="mt-auto flex items-end justify-between gap-4 pt-3">
                {editable ? (
                  <div className="inline-flex items-center border border-line-strong" role="group" aria-label={`Cantidad de ${l.producto.nombre}`}>
                    <button
                      type="button"
                      aria-label="Quitar una unidad"
                      onClick={() => fijar(l.varianteId, l.cantidad - 1, l.stock)}
                      className="inline-flex size-8 items-center justify-center text-ink hover:bg-surface-2"
                    >
                      <Icono icono={Minus} tamano={14} />
                    </button>
                    <span className="inline-flex h-8 min-w-8 items-center justify-center t-label num" aria-live="polite" data-testid="tienda-cantidad">
                      {l.cantidad}
                    </span>
                    <button
                      type="button"
                      aria-label="Agregar una unidad"
                      disabled={l.cantidad >= tope}
                      title={l.cantidad >= tope ? 'No hay más unidades disponibles' : undefined}
                      onClick={() => fijar(l.varianteId, l.cantidad + 1, l.stock)}
                      className="inline-flex size-8 items-center justify-center text-ink hover:bg-surface-2 disabled:text-disabled disabled:hover:bg-transparent"
                    >
                      <Icono icono={Plus} tamano={14} />
                    </button>
                  </div>
                ) : (
                  <p className="t-small text-muted num">Cantidad: {l.cantidad}</p>
                )}
                {editable && (
                  <button type="button" onClick={() => quitar(l.varianteId)} className="t-label underline underline-offset-4 decoration-1 text-ink hover:text-ink-2">
                    Quitar
                  </button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

import { Heart } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { rutas } from '@/app/rutas';
import { cn, Dinero, Icono, MuestraColor, Prenda } from '@/ui/ligero';
import { useBolsa } from '../bolsa';
import { colorInicial } from '../calculos';
import { useEnlaces } from '../enlaces';
import type { ProductoTienda } from '../tipos';

/**
 * Tarjeta de producto (PLAN 8.6.4): imagen 3:4 sobre gris, favorito arriba a la derecha, "Nuevo" arriba a la
 * izquierda; en hover cambia a la vista de detalle y sube una franja con las tallas (agotadas tachadas). Debajo:
 * nombre 14/700, precio 16/400 y muestras de color de 12 px (+N si hay más de 4; pasar el cursor por una muestra
 * cambia el color de la imagen).
 */
export function TarjetaProducto({ producto, colorPedido, className }: { producto: ProductoTienda; colorPedido?: string | null; className?: string }) {
  const { con } = useEnlaces();
  const favorito = useBolsa((s) => s.favoritos.includes(producto.id));
  const alternar = useBolsa((s) => s.alternarFavorito);
  const [sobre, setSobre] = useState<string | null>(null);
  const inicial = colorInicial(producto, colorPedido);
  const color = producto.colores.find((c) => c.id === sobre) ?? inicial;
  if (!color) return null;
  const agotado = producto.unidades <= 0;
  const visibles = producto.colores.slice(0, 4);
  const restantes = producto.colores.length - visibles.length;
  const destino = con(rutas.tiendaProducto(producto.slug, { color: color.codigo.toLowerCase() }));
  return (
    <article className={cn('group relative', className)} data-testid="tienda-tarjeta" data-slug={producto.slug}>
      <Link to={destino} className="block outline-offset-4" aria-label={`${producto.nombre}, ${color.nombre}${agotado ? ', agotado' : ''}`}>
        <div className="relative aspect-[3/4] overflow-hidden bg-product">
          <Prenda tipo={producto.tipoPrenda} color={color.hex} patron={color.patron} className="transition-opacity duration-200 group-hover:opacity-0 group-focus-within:opacity-0" />
          <div aria-hidden className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            <Prenda tipo={producto.tipoPrenda} color={color.hex} patron={color.patron} vista="detalle" />
          </div>
          {producto.nuevo && <span className="absolute left-3 top-3 t-eyebrow text-ink">Nuevo</span>}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 hidden h-10 translate-y-full items-center justify-center gap-3 bg-surface t-label text-ink transition-transform duration-200 ease-standard group-hover:translate-y-0 group-focus-within:translate-y-0 md:flex"
          >
            {producto.tallas.map((t) => (
              <span key={t.talla} className={cn('num', t.unidades <= 0 && 'text-disabled line-through')}>
                {t.talla}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <p className="t-nav-tienda text-ink">{producto.nombre}</p>
          <p className="mt-0.5 t-body-lg text-ink">{agotado ? <span className="text-muted">Agotado por ahora</span> : <Dinero valor={producto.precio} />}</p>
          {producto.colores.length > 1 && (
            <div className="mt-2 flex items-center gap-1.5" onMouseLeave={() => setSobre(null)}>
              {visibles.map((c) => (
                <span key={c.id} onMouseEnter={() => setSobre(c.id)} className="inline-flex">
                  <MuestraColor hex={c.hex} patron={c.patron} nombre={c.nombre} tamano={12} agotada={c.unidades <= 0} seleccionada={c.id === color.id} />
                </span>
              ))}
              {restantes > 0 && <span className="t-micro text-ink-2">+{restantes}</span>}
            </div>
          )}
        </div>
      </Link>
      <button
        type="button"
        aria-pressed={favorito}
        aria-label={favorito ? `Quitar ${producto.nombre} de favoritos` : `Guardar ${producto.nombre} en favoritos`}
        onClick={() => alternar(producto.id)}
        className="absolute right-2 top-2 inline-flex size-10 items-center justify-center text-ink transition-opacity hover:opacity-60"
      >
        <Icono icono={Heart} tamano={20} className={favorito ? 'fill-current' : undefined} />
      </button>
    </article>
  );
}

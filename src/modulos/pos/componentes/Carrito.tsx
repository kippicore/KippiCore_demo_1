import { Minus, Percent, Plus, ShoppingBag, X } from 'lucide-react';
import type { Descuento, Id } from '@/dominio/tipos';
import type { TotalesVenta } from '@/dominio/reglas/ventas';
import { useDinero, useEstadoDominio } from '@/estado';
import { existencia } from '@/selectores';
import { entero, porcentaje } from '@/lib/formato';
import { BotonIcono, Icono, MiniaturaPrenda, cn } from '@/ui';
import type { LineaCarrito } from '../calculos';
import { TEXTOS } from '../textos';
import { PopoverDescuento } from './Descuento';

/**
 * Líneas del carrito: nombre, color y talla, cantidad con − / +, descuento de la línea (% o valor) y total de la
 * línea con IVA incluido. La última línea tocada destella 900 ms (escaneo y toques de la grilla).
 */
export interface PropsCarrito {
  lineas: readonly LineaCarrito[];
  totales: TotalesVenta;
  localId: Id;
  ultima: { clave: string; n: number } | null;
  alCantidad: (clave: string, cantidad: number) => void;
  alQuitar: (clave: string) => void;
  alDescuento: (clave: string, d: Descuento | null) => void;
}

export function Carrito({ lineas, totales, localId, ultima, alCantidad, alQuitar, alDescuento }: PropsCarrito) {
  const e = useEstadoDominio();
  const d = useDinero();
  if (!lineas.length)
    return (
      <div className="flex h-full min-h-[72px] flex-col items-center justify-center gap-1 px-6 text-center" data-testid="pos-carrito-vacio">
        <p className="inline-flex items-center gap-2 t-h3 text-ink">
          <Icono icono={ShoppingBag} tamano={18} className="text-subtle" />
          {TEXTOS.carritoVacio.titulo}
        </p>
        <p className="t-small text-muted">{TEXTOS.carritoVacio.texto}</p>
      </div>
    );
  return (
    <ul className="divide-y divide-line-soft" aria-label="Prendas de la venta" data-testid="pos-lineas">
      {lineas.map((l, i) => {
        const v = e.variantes[l.varianteId];
        const p = v ? e.productos[v.productoId] : undefined;
        const color = v ? e.colores[v.colorId] : undefined;
        const calc = totales.lineas[i];
        const disponibles = existencia(e, l.varianteId, localId);
        const alMaximo = l.cantidad >= disponibles;
        const conDescuento = (calc?.descuentoAsignado ?? 0) > 0;
        return (
          <li key={l.clave} className="relative flex items-start gap-3 px-3 py-2" data-testid="pos-linea" data-variante={l.varianteId}>
            {ultima?.clave === l.clave && <span key={ultima.n} aria-hidden className="pointer-events-none absolute inset-0 animate-flash" />}
            {p && <MiniaturaPrenda tipo={p.tipoPrenda} color={color?.hex ?? '#C9C9C7'} patron={color?.patron} tamano="tabla" />}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate t-label text-ink" title={p?.nombre}>
                  {p?.nombre}
                </p>
                <p className="shrink-0 text-right t-label num text-ink">
                  {conDescuento && (
                    <s className="mr-1.5 font-normal text-subtle">
                      {d(calc?.bruto ?? 0)}
                    </s>
                  )}
                  {d(calc?.totalFinal ?? 0)}
                </p>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <p className="truncate t-small text-muted">
                  {color?.nombre} · {v?.talla}
                  {conDescuento && l.descuento && (
                    <span className="ml-1.5 text-accent-ink">
                      · {l.descuento.tipo === 'porcentaje' ? `−${porcentaje(l.descuento.valor)}` : `−${d(l.descuento.valor)}`}
                    </span>
                  )}
                </p>
                <div className="flex shrink-0 items-center gap-0.5">
                  <BotonIcono icono={Minus} etiqueta={`Quitar una unidad de ${p?.nombre ?? 'la prenda'}`} variante="ghost" tamano="sm" disabled={l.cantidad <= 1} onClick={() => alCantidad(l.clave, l.cantidad - 1)} />
                  <span className="inline-flex h-8 min-w-6 items-center justify-center t-label num text-ink" aria-label={`${l.cantidad} unidades`} data-testid="pos-cantidad">
                    {entero(l.cantidad)}
                  </span>
                  <BotonIcono
                    icono={Plus}
                    etiqueta={`Agregar una unidad de ${p?.nombre ?? 'la prenda'}`}
                    variante="ghost"
                    tamano="sm"
                    disabled={alMaximo}
                    title={alMaximo ? 'Son todas las que hay en este local' : undefined}
                    onClick={() => alCantidad(l.clave, l.cantidad + 1)}
                  />
                  <PopoverDescuento
                    titulo="Descuento de la línea"
                    valor={l.descuento}
                    alAplicar={(x) => alDescuento(l.clave, x)}
                    disparador={<BotonIcono icono={Percent} etiqueta={`Descuento de ${p?.nombre ?? 'la prenda'}`} variante="ghost" tamano="sm" className={cn(l.descuento && 'text-accent-ink')} data-testid="pos-descuento-linea" />}
                  />
                  <BotonIcono icono={X} etiqueta={`Quitar ${p?.nombre ?? 'la prenda'} del carrito`} variante="ghost" tamano="sm" onClick={() => alQuitar(l.clave)} data-testid="pos-quitar-linea" />
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

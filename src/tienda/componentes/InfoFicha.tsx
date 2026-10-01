import type { MatrizExistencias } from '@/selectores';
import { cn } from '@/ui/ligero';
import { GUIA_TALLAS } from '../textos';
import type { ColorTienda, ProductoTienda } from '../tipos';

/**
 * Disponibilidad por tienda (PLAN 8.6.5): unidades de cada talla en el color elegido, en cada local que vende.
 * Las cifras salen de `selMatrizExistencias` (las mismas del inventario). Los pedidos a domicilio salen del local
 * de despacho; en los demás se puede recoger.
 */
export function DisponibilidadTiendas({ matriz, producto, color, tallaElegida, despachoId }: { matriz: MatrizExistencias | null; producto: ProductoTienda; color: ColorTienda; tallaElegida: string | null; despachoId: string }) {
  if (!matriz) return null;
  const locales = matriz.locales.filter((l) => l.vende);
  return (
    <div data-testid="tienda-disponibilidad">
      <p className="t-small text-muted">
        Unidades en color {color.nombre.toLowerCase()}. El envío a domicilio sale de {locales.find((l) => l.id === despachoId)?.nombre ?? 'la tienda de despacho'}; en las demás tiendas puedes recoger.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse t-small">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th scope="col" className="py-2 pr-3 font-semibold">
                Tienda
              </th>
              {producto.tallas.map((t) => (
                <th key={t.talla} scope="col" className={cn('px-1.5 py-2 text-center font-semibold num', t.talla === tallaElegida && 'text-ink')}>
                  {t.talla}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {locales.map((l) => (
              <tr key={l.id} className="border-b border-line-soft">
                <th scope="row" className="py-2 pr-3 text-left font-normal text-ink">
                  {l.nombre}
                </th>
                {producto.tallas.map((t) => {
                  const n = matriz.celdas[`${t.talla}|${color.id}`]?.[l.id] ?? 0;
                  return (
                    <td key={t.talla} className={cn('px-1.5 py-2 text-center num', n > 0 ? 'text-ink' : 'text-disabled', t.talla === tallaElegida && 'bg-selected font-bold')} data-testid={`tienda-disp-${l.id}-${t.talla}`}>
                      {n}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Guía de tallas (medidas de referencia de la demostración) según la curva del producto. */
export function TablaGuiaTallas({ curva }: { curva: ProductoTienda['curvaTallas'] }) {
  const g = GUIA_TALLAS[curva];
  return (
    <div>
      <p className="t-label text-ink">{g.titulo}</p>
      <table className="mt-3 w-full border-collapse t-body">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            {g.columnas.map((c) => (
              <th key={c} scope="col" className="py-2 pr-4 t-small font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {g.filas.map((f) => (
            <tr key={f[0]} className="border-b border-line-soft">
              {f.map((c, i) => (
                <td key={i} className={cn('py-2 pr-4 num', i === 0 && 'font-bold')}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 t-small text-muted">Si estás entre dos tallas, elige la mayor. Las medidas son del cuerpo, no de la prenda.</p>
    </div>
  );
}

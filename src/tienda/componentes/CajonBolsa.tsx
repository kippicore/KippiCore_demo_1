import { Drawer } from '@/ui';
import { rutas } from '@/app/rutas';
import { plural } from '@/lib/formato';
import { BotonEnlace, Dinero } from '@/ui/ligero';
import { useEnlaces } from '../enlaces';
import { useBolsaDetalle } from '../hooks';
import { TEXTOS } from '../textos';
import { LineasBolsa } from './LineasBolsa';

/**
 * Cajón de la bolsa (PLAN 8.6.6): se abre desde la derecha al agregar una prenda. Líneas editables, total y los dos
 * caminos: "Ver bolsa" o "Ir a pagar".
 */
export function CajonBolsa({ abierto, alCambiar }: { abierto: boolean; alCambiar: (v: boolean) => void }) {
  const { con } = useEnlaces();
  const { detalle, totales } = useBolsaDetalle();
  return (
    <Drawer
      abierto={abierto}
      alCambiar={alCambiar}
      data-testid="tienda-cajon-bolsa"
      eyebrow="Agregado a tu bolsa"
      titulo={`${TEXTOS.bolsa.titulo} · ${plural(totales.unidades, 'artículo')}`}
      pie={
        <div className="flex w-full flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="t-label text-ink">Total</span>
            <span className="t-kpi-sm text-ink" data-testid="tienda-cajon-total">
              <Dinero valor={totales.total} />
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <BotonEnlace to={con(rutas.tiendaBolsa())} variante="secondary" tamano="lg" tienda onClick={() => alCambiar(false)}>
              Ver bolsa
            </BotonEnlace>
            <BotonEnlace to={con(rutas.tiendaPago())} tamano="lg" tienda onClick={() => alCambiar(false)} data-testid="tienda-cajon-pagar">
              {TEXTOS.bolsa.irAPagar}
            </BotonEnlace>
          </div>
        </div>
      }
    >
      {detalle.length === 0 ? <p className="t-body text-muted">{TEXTOS.bolsa.vacioTexto}</p> : <LineasBolsa lineas={detalle} />}
    </Drawer>
  );
}

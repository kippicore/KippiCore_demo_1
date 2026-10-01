import { ShoppingBag } from 'lucide-react';
import { rutas } from '@/app/rutas';
import { plural } from '@/lib/formato';
import { BotonEnlace, Dinero, EmptyState, Migas } from '@/ui/ligero';
import { LineasBolsa } from '../componentes/LineasBolsa';
import { useEnlaces } from '../enlaces';
import { useAjustarBolsaAExistencias, useBolsaDetalle } from '../hooks';
import { TEXTOS } from '../textos';

/**
 * Bolsa (PLAN 8.6.6): líneas editables a la izquierda y resumen a la derecha. El total es el de la venta que se va
 * a registrar (precios con IVA incluido; el envío es gratis en la vista previa).
 */
export default function Bolsa() {
  useAjustarBolsaAExistencias();
  const { con } = useEnlaces();
  const { catalogo, detalle, totales } = useBolsaDetalle();

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-24 md:px-6 md:pt-28" data-testid="tienda-bolsa">
      <Migas migas={[{ texto: 'Inicio', a: con(rutas.tienda()) }, { texto: TEXTOS.bolsa.titulo }]} />
      <h1 className="mt-6 t-h1 uppercase text-ink">
        {TEXTOS.bolsa.titulo}
        {detalle.length > 0 && <span className="ml-3 t-body text-muted num normal-case font-normal">{plural(totales.unidades, 'artículo')}</span>}
      </h1>

      {detalle.length === 0 ? (
        <EmptyState
          className="mt-6"
          icono={ShoppingBag}
          titulo={TEXTOS.bolsa.vacioTitulo}
          texto={TEXTOS.bolsa.vacioTexto}
          accion={
            <BotonEnlace to={con(rutas.tiendaCategoria('novedades'))} tienda tamano="lg" data-testid="tienda-seguir-comprando">
              {TEXTOS.bolsa.seguir}
            </BotonEnlace>
          }
        />
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-x-16">
          <section aria-label="Prendas en tu bolsa" className="lg:col-span-7">
            <LineasBolsa lineas={detalle} />
          </section>
          <aside aria-label="Resumen" className="lg:col-span-5">
            <div className="border border-line bg-surface p-6 lg:sticky lg:top-28" data-testid="tienda-resumen">
              <h2 className="t-h3-tienda text-ink">Resumen</h2>
              <dl className="mt-5 space-y-3 t-body">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal ({plural(totales.unidades, 'artículo')})</dt>
                  <dd className="num">
                    <Dinero valor={totales.total} />
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Envío desde {catalogo.local.nombre}</dt>
                  <dd>Gratis</dd>
                </div>
                <div className="flex justify-between t-small">
                  <dt className="text-muted">IVA incluido</dt>
                  <dd className="num text-muted">
                    <Dinero valor={totales.iva} />
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
                <span className="t-label text-ink">Total</span>
                <span className="t-kpi-sm text-ink" data-testid="tienda-total">
                  <Dinero valor={totales.total} />
                </span>
              </div>
              <BotonEnlace to={con(rutas.tiendaPago())} tienda tamano="lg" anchoCompleto className="mt-6 h-[52px]" data-testid="tienda-ir-a-pagar">
                {TEXTOS.bolsa.irAPagar}
              </BotonEnlace>
              <BotonEnlace to={con(rutas.tiendaCategoria('novedades'))} variante="link" className="mt-3 w-full justify-center">
                {TEXTOS.bolsa.seguir}
              </BotonEnlace>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

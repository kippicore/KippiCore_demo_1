import { PackageCheck, ReceiptText, Shirt, TrendingUp, UserRound } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { propagarHoy, rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { MEDIOS_PAGO } from '@/config/negocio';
import { ESTADOS_VENTA } from '@/config/estados';
import { overrideHoy, useSel } from '@/estado';
import { plural } from '@/lib/formato';
import { selEfectosVenta } from '@/selectores';
import { Badge, BadgeEstado, BotonEnlace, clasesBoton, Dinero, EmptyState, Icono, ListaQueCambio, MiniaturaPrenda } from '@/ui/ligero';
import type { FilaCambio } from '@/ui/ligero';
import { pedidoRecordado } from '../bolsa';
import { primerNombre } from '../calculos';
import { useEnlaces } from '../enlaces';
import { selPedidoTienda } from '../selectores';

/**
 * Pedido confirmado (PLAN 8.6.6): muestra que la venta YA ENTRÓ al sistema: número de venta, canal Web, el
 * inventario que descontó y el enlace "Verla en KippiCore" (`/panel/ventas?resaltar=`). Dentro de un marco el enlace
 * abre la ventana principal (`target="_top"`).
 */
export default function Pedido() {
  const { ventaId } = useParamsRuta('tiendaPedido');
  const { con, enMarco } = useEnlaces();
  const pedido = useSel(selPedidoTienda, { ventaId });

  const memoria = pedidoRecordado(ventaId);
  const filas = useMemo<FilaCambio[]>(() => {
    if (!pedido) return [];
    const v = pedido.detalle.venta;
    const f: FilaCambio[] = [
      { icono: ReceiptText, texto: <>Venta <strong className="font-bold">{v.numero}</strong> registrada con canal Web</>, despues: <Dinero valor={v.total} /> },
    ];
    if (memoria) {
      for (const e of selEfectosVenta(memoria.antes, memoria.despues, ventaId)) {
        if (e.clave === 'inventario') f.push({ icono: Shirt, texto: <>{e.etiqueta}{e.detalle ? ` · ${e.detalle}` : ''}</>, antes: e.antes, despues: e.despues });
        else if (e.clave === 'ventas_hoy') f.push({ icono: TrendingUp, texto: e.etiqueta, antes: <Dinero valor={e.antes} />, despues: <Dinero valor={e.despues} /> });
        else if (e.clave === 'cliente') f.push({ icono: UserRound, texto: e.etiqueta + (e.detalle ? ` (${e.detalle})` : ''), antes: e.antes, despues: e.despues });
      }
    } else {
      for (const l of v.lineas) f.push({ icono: Shirt, texto: <>Inventario en {pedido.local.nombre} · {l.descripcion}</>, despues: `−${l.cantidad}` });
    }
    return f;
  }, [pedido, memoria, ventaId]);

  if (!pedido || pedido.detalle.venta.canal !== 'web') {
    return (
      <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-32 md:px-6" data-testid="tienda-pedido-inexistente">
        <EmptyState
          icono={PackageCheck}
          titulo="No encontramos ese pedido"
          texto="Puede que el enlace esté incompleto o que los datos de la demostración se hayan restaurado."
          accion={<BotonEnlace to={con(rutas.tiendaCategoria('novedades'))} tienda tamano="lg">Volver a la tienda</BotonEnlace>}
        />
      </div>
    );
  }

  const { detalle, local, cliente, lineas } = pedido;
  const v = detalle.venta;
  const dia = v.ts.slice(0, 10);
  const urlVenta = rutas.ventas({ resaltar: v.id, desde: dia, hasta: dia });
  const medio = v.pagos[0] ? MEDIOS_PAGO[v.pagos[0].medio].etiqueta : 'Pago en línea';
  const unidades = v.lineas.reduce((a, l) => a + l.cantidad, 0);

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 pb-10 pt-28 md:px-6 md:pt-32" data-testid="tienda-pedido" data-venta={v.id}>
      <p className="t-eyebrow uppercase text-ink-2" data-testid="tienda-pedido-numero">
        Pedido {v.numero}
      </p>
      <h1 className="mt-2 t-h1 uppercase text-ink md:t-display-sm" data-testid="tienda-pedido-titulo">
        {cliente ? `Gracias, ${primerNombre(cliente.nombres)}` : 'Gracias por tu compra'}
      </h1>
      <p className="mt-3 max-w-[60ch] t-body-lg text-muted">
        Recibimos tu pedido de {plural(unidades, 'prenda')}.{cliente?.correo ? ` Te escribimos a ${cliente.correo} con el seguimiento.` : ''}
      </p>

      <section aria-label="La venta en KippiCore" className="mt-10 border border-ink p-6 md:p-8" data-testid="tienda-pedido-confirmacion">
        <p className="t-h3-tienda text-ink">
          Esta compra ya aparece en KippiCore con canal Web y descontó el inventario de {local.nombre}.
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
          <div>
            <dt className="t-small text-muted">Venta</dt>
            <dd className="mt-0.5 t-body num text-ink" data-testid="tienda-pedido-venta">
              {v.numero}
            </dd>
          </div>
          <div>
            <dt className="t-small text-muted">Canal</dt>
            <dd className="mt-1" data-testid="tienda-pedido-canal">
              <Badge tono="ink">Web</Badge>
            </dd>
          </div>
          <div>
            <dt className="t-small text-muted">Total</dt>
            <dd className="mt-0.5 t-body text-ink" data-testid="tienda-pedido-total">
              <Dinero valor={v.total} />
            </dd>
          </div>
          <div>
            <dt className="t-small text-muted">Estado</dt>
            <dd className="mt-1">
              <BadgeEstado estado={ESTADOS_VENTA[detalle.estado]} />
            </dd>
          </div>
          <div>
            <dt className="t-small text-muted">Sale de</dt>
            <dd className="mt-0.5 t-body text-ink">{local.nombre}</dd>
          </div>
          <div className="col-span-2">
            <dt className="t-small text-muted">Pago</dt>
            <dd className="mt-0.5 t-body text-ink">{medio} · simulación, no se cobró nada</dd>
          </div>
        </dl>
        {enMarco ? (
          <a href={propagarHoy(urlVenta, overrideHoy())} target="_top" className={clasesBoton({ tamano: 'lg', tienda: true, anchoCompleto: false }) + ' mt-6 w-full sm:w-auto'} data-testid="tienda-ver-en-kippicore">
            Verla en KippiCore
          </a>
        ) : (
          <Link to={urlVenta} className={clasesBoton({ tamano: 'lg', tienda: true }) + ' mt-6 w-full sm:w-auto'} data-testid="tienda-ver-en-kippicore">
            Verla en KippiCore
          </Link>
        )}
      </section>

      <section aria-labelledby="pedido-pasa" className="mt-12">
        <h2 id="pedido-pasa" className="t-h3-tienda text-ink">
          Lo que acaba de pasar
        </h2>
        <ListaQueCambio className="mt-4" filas={filas} />
      </section>

      <section aria-labelledby="pedido-prendas" className="mt-12">
        <h2 id="pedido-prendas" className="t-h3-tienda text-ink">
          Tu pedido
        </h2>
        <ul className="mt-4 divide-y divide-line border-y border-line" data-testid="tienda-pedido-lineas">
          {lineas.map((l) => (
            <li key={l.lineaId} className="flex items-center gap-4 py-4">
              <MiniaturaPrenda tamano="bolsa" tipo={l.tipoPrenda} color={l.hex} patron={l.patron} />
              <div className="min-w-0 flex-1">
                <p className="t-nav-tienda text-ink">{l.descripcion}</p>
                <p className="mt-0.5 t-small text-muted num">Cantidad: {l.cantidad}</p>
              </div>
              <p className="t-body-lg text-ink">
                <Dinero valor={l.total} />
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-center justify-end gap-2 t-body text-ink">
          <Icono icono={PackageCheck} tamano={16} />
          <span>
            Entrega en 1 a 2 días hábiles · <span className="text-muted">IVA incluido</span>
          </span>
        </p>
      </section>

      <div className="mt-12">
        <BotonEnlace to={con(rutas.tiendaCategoria('novedades'))} variante="secondary" tamano="lg" tienda>
          Seguir comprando
        </BotonEnlace>
      </div>
    </div>
  );
}

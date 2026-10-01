import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Ban,
  Banknote,
  CircleAlert,
  Clock,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  Undo2,
  UserRound,
} from 'lucide-react';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { ESTADOS_VENTA } from '@/config/estados';
import { useAcciones, useHoy, usePuede, useRolActivo, useSel, useUsuarioActivo } from '@/estado';
import { porcentaje, relativaDias } from '@/lib/formato';
import {
  avisar,
  BadgeEstado,
  BarraProgreso,
  BotonEnlace,
  BotonIcono,
  Button,
  Card,
  ConfirmarEliminacion,
  Dinero,
  EmptyState,
  EncabezadoPagina,
  Fecha,
  ItemMenu,
  Menu,
  RequiereRol,
  SeparadorMenu,
  Badge,
} from '@/ui';
import { construirHistorial } from '../calculos';
import { DialogoAbono, DialogoAnular, DialogoCancelarSeparado, DialogoEditar } from '../componentes/Dialogos';
import { Historial } from '../componentes/Historial';
import { Recibo } from '../componentes/Recibo';
import { selReciboVenta } from '../selectores';
import { TEXTOS } from '../textos';

type Dialogo = 'anular' | 'pedir' | 'editar' | 'abono' | 'separado' | 'aprobar' | 'rechazar' | null;

/** /panel/ventas/:ventaId — el recibo de la venta y todo lo que se puede resolver desde él. */
export default function DetalleVenta() {
  const { ventaId } = useParamsRuta('venta');
  const recibo = useSel(selReciboVenta, { ventaId });
  const rol = useRolActivo();
  const { empleado } = useUsuarioActivo();
  const puede = usePuede();
  const acciones = useAcciones();
  const hoy = useHoy();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const cerrar = () => setDialogo(null);

  const historial = useMemo(
    () =>
      recibo
        ? construirHistorial({
            venta: recibo.detalle.venta,
            devoluciones: recibo.detalle.devoluciones,
            factura: recibo.detalle.factura,
            notasCredito: recibo.notasCredito,
          })
        : [],
    [recibo],
  );

  const migasBase = [
    ...(rol === 'vendedor' ? [] : [{ texto: 'Inicio', a: rutas.inicio() }]),
    { texto: 'Ventas', a: rutas.ventas() },
  ];

  if (!recibo) {
    return (
      <div data-testid="pagina-detalle-venta">
        <EncabezadoPagina migas={[...migasBase, { texto: 'Venta' }]} titulo="Venta" />
        <div className="mt-8 border border-line bg-surface">
          <EmptyState
            icono={ReceiptText}
            titulo={TEXTOS.detalle.noExisteTitulo}
            texto={TEXTOS.detalle.noExisteTexto}
            accion={<BotonEnlace to={rutas.ventas()}>{TEXTOS.detalle.volver}</BotonEnlace>}
          />
        </div>
      </div>
    );
  }

  const { detalle } = recibo;
  const v = detalle.venta;

  // El vendedor solo ve sus ventas.
  if (rol === 'vendedor' && v.vendedorId !== empleado?.id) {
    return (
      <div data-testid="pagina-detalle-venta">
        <EncabezadoPagina migas={[...migasBase, { texto: v.numero }]} titulo={v.numero} />
        <div className="mt-8 border border-line bg-surface">
          <EmptyState
            icono={Ban}
            titulo="Esta venta no es tuya"
            texto="Como vendedor solo ves las ventas que hiciste tú. Si necesitas algo de esta, pídeselo al dueño."
            accion={<BotonEnlace to={rutas.ventas()}>{TEXTOS.detalle.volver}</BotonEnlace>}
          />
        </div>
      </div>
    );
  }

  const cancelada = v.separado?.cerrado?.resultado === 'cancelado';
  const vigente = !v.anulacion && !cancelada;
  const separadoActivo = v.tipo === 'separado' && !!v.separado && !v.separado.cerrado && !v.anulacion;
  const pendienteDeCobro =
    (v.tipo === 'separado' || v.tipo === 'credito') && vigente && !v.separado?.cerrado && detalle.saldo > 0;
  const puedeEditar = puede('venta.editar') && !v.anulacion;
  const puedeAnular = puede('venta.anular') && vigente;
  const puedePedir =
    rol === 'vendedor' && puede('aprobacion.solicitar') && vigente && !recibo.solicitudAnulacion;
  const puedeDevolver =
    puede('devolucion.registrar') &&
    vigente &&
    detalle.estado !== 'devuelta' &&
    detalle.estado !== 'separado';
  const puedeAbonar = puede('venta.abonar') && pendienteDeCobro;
  const puedeCancelarSeparado = puede('separado.cancelar') && separadoActivo;
  const solicitud = recibo.solicitudAnulacion;
  const hayMenu = puedeAnular || puedePedir || puedeCancelarSeparado;

  const resolver = (decision: 'aprobada' | 'rechazada') => {
    if (!solicitud) return;
    const r = acciones.resolverAprobacion({ solicitudId: solicitud.id, decision, nota: null });
    if (!r.ok) {
      avisar({ tipo: 'error', texto: r.error.mensaje });
      return;
    }
    avisar({
      tipo: 'exito',
      texto:
        decision === 'aprobada'
          ? `Aprobaste la solicitud: ${v.numero} quedó anulada.`
          : `Rechazaste la solicitud de anulación de ${v.numero}.`,
    });
  };

  return (
    <div data-testid="pagina-detalle-venta" data-venta={v.id}>
      <EncabezadoPagina
        migas={[...migasBase, { texto: v.numero }]}
        eyebrow="Venta"
        titulo={v.numero}
        insignia={<BadgeEstado estado={ESTADOS_VENTA[detalle.estado]} />}
        acciones={
          <>
            {puedeAbonar && (
              <Button icono={Plus} onClick={() => setDialogo('abono')} data-testid="accion-abonar">
                Registrar abono
              </Button>
            )}
            {puedeDevolver && (
              <BotonEnlace
                to={rutas.devolucion(v.id)}
                variante="secondary"
                icono={Undo2}
                data-testid="accion-devolucion"
              >
                Cambio o devolución
              </BotonEnlace>
            )}
            {puedeEditar && (
              <Button
                variante="secondary"
                icono={Pencil}
                onClick={() => setDialogo('editar')}
                data-testid="accion-editar"
              >
                Editar
              </Button>
            )}
            {hayMenu && (
              <Menu
                etiqueta="Más acciones de la venta"
                ancho={260}
                disparador={
                  <BotonIcono
                    icono={MoreHorizontal}
                    etiqueta="Más acciones"
                    variante="secondary"
                    data-testid="accion-mas"
                  />
                }
              >
                {puedeCancelarSeparado && (
                  <ItemMenu
                    icono={Ban}
                    onSelect={() => setDialogo('separado')}
                    data-testid="accion-cancelar-separado"
                  >
                    Cancelar el separado
                  </ItemMenu>
                )}
                {puedeCancelarSeparado && (puedeAnular || puedePedir) && <SeparadorMenu />}
                {puedeAnular && (
                  <ItemMenu
                    icono={Ban}
                    peligro
                    onSelect={() => setDialogo('anular')}
                    data-testid="accion-anular"
                  >
                    Anular la venta
                  </ItemMenu>
                )}
                {puedePedir && (
                  <ItemMenu
                    icono={Ban}
                    onSelect={() => setDialogo('pedir')}
                    data-testid="accion-pedir-anulacion"
                  >
                    Pedir la anulación
                  </ItemMenu>
                )}
              </Menu>
            )}
          </>
        }
      />

      {solicitud && (
        <section
          aria-label="Solicitud de anulación"
          className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-ink bg-surface px-5 py-4"
          data-testid="solicitud-anulacion"
        >
          <div className="flex min-w-0 items-start gap-3">
            <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" strokeWidth={1.5} />
            <div>
              <p className="t-body font-semibold text-ink">
                {rol === 'dueno'
                  ? `${recibo.solicitante ?? 'Un vendedor'} pidió anular esta venta`
                  : 'Pediste anular esta venta'}
              </p>
              <p className="t-body text-ink-2">
                {solicitud.datos.tipo === 'anulacion'
                  ? `Motivo: ${solicitud.datos.motivo}`
                  : solicitud.resumen}
              </p>
              {rol !== 'dueno' && (
                <p className="t-small text-muted">
                  El dueño la aprueba o la rechaza; mientras tanto la venta sigue vigente.
                </p>
              )}
            </div>
          </div>
          {puede('aprobacion.resolver') && (
            <div className="flex gap-2">
              <Button
                variante="secondary"
                onClick={() => setDialogo('rechazar')}
                data-testid="rechazar-solicitud"
              >
                Rechazar
              </Button>
              <Button onClick={() => setDialogo('aprobar')} data-testid="aprobar-solicitud">
                Aprobar y anular
              </Button>
            </div>
          )}
        </section>
      )}

      <div className="mt-8 grid grid-cols-1 items-start gap-8 desk:grid-cols-12">
        <div className="desk:col-span-7">
          <Recibo recibo={recibo} />
        </div>

        <aside className="flex flex-col gap-6 desk:col-span-5">
          {pendienteDeCobro && (
            <Card
              titulo={v.tipo === 'separado' ? 'Separado por completar' : 'Crédito por cobrar'}
              padding="compacta"
              data-testid="panel-saldo"
            >
              <p className="t-kpi-sm num text-ink">
                <Dinero valor={detalle.saldo} />
              </p>
              <p className="mt-1 t-small text-muted">
                de un total de <Dinero valor={v.total} />
              </p>
              <BarraProgreso
                className="mt-4"
                valor={v.total > 0 ? detalle.pagado / v.total : 0}
                etiqueta="Pagado"
                meta
              />
              {v.separado && (
                <p className="mt-4 flex items-center gap-2 t-body text-ink">
                  <Clock aria-hidden className="size-4 text-ink-2" strokeWidth={1.5} />
                  <span>
                    Fecha límite <Fecha valor={v.separado.fechaLimite} />{' '}
                    {v.separado.fechaLimite < hoy ? (
                      <Badge tono="danger" tamano="sm">
                        Vencido {relativaDias(v.separado.fechaLimite, hoy)}
                      </Badge>
                    ) : (
                      <span className="text-muted">({relativaDias(v.separado.fechaLimite, hoy)})</span>
                    )}
                  </span>
                </p>
              )}
              {(puedeAbonar || puedeCancelarSeparado) && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {puedeAbonar && (
                    <Button tamano="sm" icono={Banknote} onClick={() => setDialogo('abono')}>
                      Abonar
                    </Button>
                  )}
                  {puedeCancelarSeparado && (
                    <Button variante="secondary" tamano="sm" onClick={() => setDialogo('separado')}>
                      Cancelar separado
                    </Button>
                  )}
                </div>
              )}
            </Card>
          )}

          <Card titulo="Qué ha pasado con esta venta" padding="compacta">
            <Historial eventos={historial} />
          </Card>

          {recibo.cliente && (
            <Card titulo="Cliente" padding="compacta">
              <Link
                to={rutas.cliente(recibo.cliente.id)}
                className="inline-flex items-center gap-2 t-body font-semibold text-ink underline-offset-4 hover:underline"
              >
                <UserRound aria-hidden className="size-4 text-ink-2" strokeWidth={1.5} />
                {recibo.cliente.nombres} {recibo.cliente.apellidos}
              </Link>
              <p className="mt-1 t-small text-muted">
                Su ficha tiene el historial completo, el saldo a favor y lo que debe.
              </p>
            </Card>
          )}

          {recibo.ventasDeCambio.length > 0 && (
            <Card titulo="Cambios que salieron de esta venta" padding="compacta">
              <ul className="flex flex-col gap-1.5">
                {recibo.ventasDeCambio.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={rutas.venta(c.id)}
                      className="inline-flex items-center gap-2 t-body font-semibold underline-offset-4 hover:underline"
                    >
                      <Eye aria-hidden className="size-4 text-ink-2" strokeWidth={1.5} />
                      {c.numero}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <RequiereRol permiso="ver.margenes">
            <Card titulo="Rentabilidad de la venta" padding="compacta" data-testid="panel-rentabilidad">
              <dl className="flex flex-col gap-1.5 t-body">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-2">Base sin IVA</dt>
                  <dd className="num">
                    <Dinero valor={v.base} />
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-2">Costo de la mercancía</dt>
                  <dd className="num">
                    <Dinero valor={v.base - detalle.margen} />
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-line-soft pt-1.5 font-semibold">
                  <dt>Margen bruto</dt>
                  <dd className="num">
                    <Dinero valor={detalle.margen} />{' '}
                    <span className="font-normal text-muted">
                      ({porcentaje(v.base > 0 ? detalle.margen / v.base : 0)})
                    </span>
                  </dd>
                </div>
              </dl>
              <p className="mt-3 t-small text-muted">
                Costo de reposición de cada prenda al momento de venderla.
              </p>
            </Card>
          </RequiereRol>
        </aside>
      </div>

      {dialogo === 'anular' && <DialogoAnular recibo={recibo} abierto alCerrar={cerrar} />}
      {dialogo === 'pedir' && <DialogoAnular recibo={recibo} abierto alCerrar={cerrar} soloPedir />}
      {dialogo === 'editar' && <DialogoEditar recibo={recibo} abierto alCerrar={cerrar} />}
      {dialogo === 'abono' && <DialogoAbono recibo={recibo} abierto alCerrar={cerrar} />}
      {dialogo === 'separado' && <DialogoCancelarSeparado recibo={recibo} abierto alCerrar={cerrar} />}
      <ConfirmarEliminacion
        abierto={dialogo === 'aprobar'}
        alCambiar={(a) => !a && cerrar()}
        pregunta={`¿Aprobar la anulación de ${v.numero}?`}
        consecuencias={`La venta queda anulada con el motivo del vendedor: «${solicitud?.datos.tipo === 'anulacion' ? solicitud.datos.motivo : ''}». Las prendas vuelven al inventario y se devuelve la plata al cliente.`}
        accion="Aprobar y anular"
        alConfirmar={() => resolver('aprobada')}
        nota={null}
      />
      <ConfirmarEliminacion
        abierto={dialogo === 'rechazar'}
        alCambiar={(a) => !a && cerrar()}
        pregunta="¿Rechazar la solicitud de anulación?"
        consecuencias={`La venta ${v.numero} sigue vigente y el vendedor recibe tu respuesta.`}
        accion="Rechazar solicitud"
        alConfirmar={() => resolver('rechazada')}
        nota={null}
      />
    </div>
  );
}

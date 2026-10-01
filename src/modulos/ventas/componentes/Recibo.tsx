import { Link } from 'react-router';
import { rutas } from '@/app/rutas';
import { ESTADOS_FACTURA } from '@/config/estados';
import { useEstadoDominio } from '@/estado';
import { celular, cedula } from '@/lib/formato';
import { BadgeEstado, BotonDocumentoPdf, cn, Dinero, Fecha, Marca, MiniaturaPrenda, NotaLegal } from '@/ui';
import { devueltoPorLinea } from '../calculos';
import type { ReciboVenta } from '../selectores';
import { CANALES, etiquetaMedio, TEXTOS } from '../textos';

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="t-eyebrow text-ink-2">{etiqueta}</dt>
      <dd className="mt-1 t-body text-ink">{children}</dd>
    </div>
  );
}

const Regla = ({ className }: { className?: string }) => (
  <div aria-hidden className={cn('border-t border-dashed border-line-strong', className)} />
);

function Fila({
  etiqueta,
  children,
  fuerte,
  className,
}: {
  etiqueta: React.ReactNode;
  children: React.ReactNode;
  fuerte?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-6', fuerte ? 't-h3' : 't-body', className)}>
      <dt className={fuerte ? 'text-ink' : 'text-ink-2'}>{etiqueta}</dt>
      <dd className="num text-ink">{children}</dd>
    </div>
  );
}

/**
 * Recibo de la venta (vista de recibo/factura, PRD 7.3): encabezado de la marca, datos, prendas con su miniatura,
 * totales con IVA discriminado, pagos, devoluciones y documentos electrónicos. Si la venta se anuló, lleva el sello.
 */
export function Recibo({ recibo }: { recibo: ReciboVenta }) {
  const { empresa } = useEstadoDominio();
  const { detalle, local, vendedor, cliente, lineas } = recibo;
  const v = detalle.venta;
  const anulada = detalle.estado === 'anulada';
  const devueltas = devueltoPorLinea(detalle.devoluciones);
  const factura = detalle.factura;
  const pagosReales = v.pagos.filter((p) => p.tipo !== 'reembolso');
  const reembolsos = v.pagos.filter((p) => p.tipo === 'reembolso');
  const neto = v.total - detalle.devuelto;

  return (
    <article
      data-testid="recibo-venta"
      data-venta={v.id}
      className="relative mx-auto w-full max-w-[720px] overflow-hidden border border-line bg-surface"
    >
      {anulada && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-1 flex items-center justify-center"
        >
          <span
            className="-rotate-12 border-4 border-danger px-6 py-2 text-[3rem] font-black uppercase leading-none tracking-[0.12em] text-danger/35"
            data-testid="sello-anulada"
          >
            Anulada
          </span>
        </div>
      )}

      <header className="px-6 pt-8 sm:px-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <Marca tamano="tienda" descriptor />
            <p className="mt-4 t-small text-muted">
              {empresa.razonSocial} · NIT {empresa.nit}
            </p>
            {local && (
              <p className="t-small text-muted">
                {local.nombre} · {local.direccion}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="t-eyebrow text-ink-2">Recibo de venta</p>
            <p className="mt-1 t-h1 num" data-testid="recibo-numero">
              {v.numero}
            </p>
            <p className="mt-1 t-small text-muted num">
              <Fecha valor={v.ts} formato="fechaHora" />
            </p>
          </div>
        </div>
      </header>

      <Regla className="mx-6 mt-7 sm:mx-10" />

      <dl className="grid grid-cols-2 gap-x-8 gap-y-5 px-6 py-6 sm:px-10 md:grid-cols-3">
        <Dato etiqueta="Cliente">
          {cliente ? (
            <>
              <Link
                to={rutas.cliente(cliente.id)}
                className="font-semibold underline-offset-4 hover:underline"
              >
                {cliente.nombres} {cliente.apellidos}
              </Link>
              <span className="block t-small text-muted num">
                {cliente.documento ? `${cliente.documento.tipo} ${cedula(cliente.documento.numero)} · ` : ''}
                {celular(cliente.celular)}
              </span>
            </>
          ) : (
            <span className="text-muted">Consumidor final</span>
          )}
        </Dato>
        <Dato etiqueta="Vendedor">{vendedor ? `${vendedor.nombres} ${vendedor.apellidos}` : '—'}</Dato>
        <Dato etiqueta="Canal">{CANALES[v.canal]}</Dato>
        {v.tipo !== 'contado' && (
          <Dato etiqueta="Tipo de venta">
            {v.tipo === 'separado' ? 'Separado con abonos' : 'A crédito'}
            {v.separado && (
              <span className="block t-small text-muted num">
                Fecha límite <Fecha valor={v.separado.fechaLimite} />
              </span>
            )}
          </Dato>
        )}
        {recibo.ventaOrigen && (
          <Dato etiqueta="Cambio de">
            <Link
              to={rutas.venta(recibo.ventaOrigen.id)}
              className="font-semibold underline-offset-4 hover:underline"
            >
              {recibo.ventaOrigen.numero}
            </Link>
          </Dato>
        )}
        {v.nota && <Dato etiqueta="Nota">{v.nota}</Dato>}
      </dl>

      <Regla className="mx-6 sm:mx-10" />

      <div className="px-6 py-6 sm:px-10">
        <table className="w-full border-collapse" aria-label="Prendas de la venta">
          <thead>
            <tr className="border-b border-ink">
              <th scope="col" className="pb-2 text-left t-eyebrow text-ink-2">
                Prenda
              </th>
              <th scope="col" className="pb-2 text-right t-eyebrow text-ink-2">
                Cant.
              </th>
              <th scope="col" className="hidden pb-2 text-right t-eyebrow text-ink-2 sm:table-cell">
                Precio
              </th>
              <th scope="col" className="pb-2 text-right t-eyebrow text-ink-2">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l) => {
              const dev = devueltas.get(l.linea.id)?.cantidad ?? 0;
              return (
                <tr
                  key={l.linea.id}
                  className="border-b border-line-soft align-top"
                  data-testid="recibo-linea"
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-start gap-3">
                      {l.tipoPrenda ? (
                        <MiniaturaPrenda tipo={l.tipoPrenda} color={l.colorHex} patron={l.patron} />
                      ) : (
                        <span className="block w-[30px]" />
                      )}
                      <div className="min-w-0">
                        <p className="t-body font-semibold text-ink">{l.nombreProducto}</p>
                        <p className="t-small text-muted num">
                          {l.referencia} · {l.colorNombre} · Talla {l.talla}
                        </p>
                        {l.linea.descuentoAsignado > 0 && (
                          <p className="t-small text-ink-2">
                            Descuento <Dinero valor={l.linea.descuentoAsignado} />
                          </p>
                        )}
                        {dev > 0 && (
                          <p className="mt-1 t-small font-semibold text-ink-2" data-testid="linea-devuelta">
                            Devuelta{dev === l.linea.cantidad ? '' : `: ${dev} de ${l.linea.cantidad}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right t-body num">{l.linea.cantidad}</td>
                  <td className="hidden py-3 text-right t-body num sm:table-cell">
                    <Dinero valor={l.linea.precioLista} />
                  </td>
                  <td className="py-3 text-right t-body font-semibold num">
                    <Dinero valor={l.linea.totalFinal} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <dl className="ml-auto mt-5 flex max-w-[320px] flex-col gap-1.5" data-testid="recibo-totales">
          <Fila etiqueta="Subtotal">
            <Dinero valor={v.subtotal} />
          </Fila>
          {v.descuentos > 0 && (
            <Fila etiqueta="Descuentos">
              −<Dinero valor={v.descuentos} />
            </Fila>
          )}
          <Fila etiqueta="Base sin IVA" className="t-small">
            <Dinero valor={v.base} />
          </Fila>
          <Fila etiqueta="IVA incluido" className="t-small">
            <Dinero valor={v.iva} />
          </Fila>
          <Regla className="my-1.5 border-solid border-ink" />
          <Fila etiqueta="Total" fuerte>
            <Dinero valor={v.total} data-testid="recibo-total" />
          </Fila>
          {detalle.devuelto > 0 && (
            <>
              <Fila etiqueta="Devuelto">
                −<Dinero valor={detalle.devuelto} />
              </Fila>
              <Fila etiqueta="Total neto" fuerte>
                <Dinero valor={neto} data-testid="recibo-total-neto" />
              </Fila>
            </>
          )}
        </dl>
        <NotaLegal tipo="tributario" className="mt-5" />
      </div>

      <Regla className="mx-6 sm:mx-10" />

      <section aria-label="Pagos" className="px-6 py-6 sm:px-10">
        <h2 className="t-eyebrow text-ink-2">Pagos</h2>
        {pagosReales.length === 0 ? (
          <p className="mt-3 t-body text-muted">Todavía no hay pagos registrados.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-soft border-y border-line-soft" data-testid="recibo-pagos">
            {pagosReales.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 py-2.5"
              >
                <span className="t-body text-ink">
                  {etiquetaMedio(p.medio)}
                  {p.tipo === 'abono' && <span className="text-muted"> · abono</span>}
                  <span className="block t-small text-muted num">
                    <Fecha valor={p.ts} formato="fechaHora" />
                    {p.referencia ? ` · Ref. ${p.referencia}` : ''}
                    {p.medio === 'efectivo' && p.recibido !== null && p.cambio ? (
                      <>
                        {' · Recibió '}
                        <Dinero valor={p.recibido} />
                        {' · Cambio '}
                        <Dinero valor={p.cambio} />
                      </>
                    ) : null}
                  </span>
                </span>
                <span className="t-body font-semibold num">
                  <Dinero valor={p.valor} />
                </span>
              </li>
            ))}
            {reembolsos.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 py-2.5"
                data-testid="recibo-reembolso"
              >
                <span className="t-body text-ink">
                  Reembolso en {etiquetaMedio(p.medio).toLowerCase()}
                  <span className="block t-small text-muted num">
                    <Fecha valor={p.ts} formato="fechaHora" />
                  </span>
                </span>
                <span className="t-body font-semibold num text-danger">
                  −<Dinero valor={Math.abs(p.valor)} />
                </span>
              </li>
            ))}
          </ul>
        )}
        <dl className="ml-auto mt-3 flex max-w-[320px] flex-col gap-1.5">
          <Fila etiqueta="Pagado (neto de reembolsos)">
            <Dinero valor={detalle.pagado} />
          </Fila>
          {detalle.saldo > 0 && !anulada && (
            <Fila etiqueta="Saldo pendiente" fuerte>
              <Dinero valor={detalle.saldo} data-testid="recibo-saldo" />
            </Fila>
          )}
        </dl>
      </section>

      {detalle.devoluciones.length > 0 && (
        <>
          <Regla className="mx-6 sm:mx-10" />
          <section aria-label="Devoluciones" className="px-6 py-6 sm:px-10">
            <h2 className="t-eyebrow text-ink-2">Devoluciones y cambios</h2>
            <ul
              className="mt-3 divide-y divide-line-soft border-y border-line-soft"
              data-testid="recibo-devoluciones"
            >
              {detalle.devoluciones.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 py-2.5"
                >
                  <span className="t-body text-ink">
                    <strong className="font-semibold">{d.numero}</strong>
                    <span className="text-muted">
                      {' · '}
                      {d.compensacion === 'reembolso'
                        ? 'Reembolso'
                        : d.compensacion === 'saldo_favor'
                          ? 'Saldo a favor'
                          : 'Cambio por otra prenda'}
                    </span>
                    <span className="block t-small text-muted num">
                      <Fecha valor={d.ts} formato="fechaHora" /> · {d.motivo}
                    </span>
                  </span>
                  <span className="t-body font-semibold num">
                    −<Dinero valor={d.valorTotal} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {(factura || recibo.notasCredito.length > 0) && (
        <>
          <Regla className="mx-6 sm:mx-10" />
          <section
            aria-label="Documentos electrónicos"
            className="px-6 py-6 sm:px-10"
            data-testid="recibo-documentos"
          >
            <h2 className="t-eyebrow text-ink-2">Documentos electrónicos (simulación)</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {factura && (
                <li className="flex flex-wrap items-center justify-between gap-3">
                  <span className="t-body text-ink">
                    {factura.tipo === 'factura_electronica'
                      ? 'Factura electrónica'
                      : 'Documento POS electrónico'}{' '}
                    <strong className="font-semibold num">{factura.numero}</strong>{' '}
                    <BadgeEstado estado={ESTADOS_FACTURA[factura.estado]} tamano="sm" />
                  </span>
                  <BotonDocumentoPdf
                    documento={{
                      tipo: factura.tipo === 'factura_electronica' ? 'factura' : 'pos',
                      facturaId: factura.id,
                    }}
                    etiqueta="Descargar PDF"
                  />
                </li>
              )}
              {recibo.notasCredito.map((n) => (
                <li key={n.id} className="flex flex-wrap items-center justify-between gap-3">
                  <span className="t-body text-ink">
                    Nota crédito <strong className="font-semibold num">{n.numero}</strong> por{' '}
                    <Dinero valor={n.valor} />
                  </span>
                  <BotonDocumentoPdf
                    documento={{ tipo: 'nota-credito', notaId: n.id }}
                    etiqueta="Descargar PDF"
                  />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <footer className="border-t border-line-soft px-6 py-5 text-center sm:px-10">
        <p className="t-eyebrow text-ink-2">{TEXTOS.detalle.gracias}</p>
        <p className="mt-1 t-small text-muted">
          {empresa.telefono} · {empresa.correo}
        </p>
      </footer>
    </article>
  );
}

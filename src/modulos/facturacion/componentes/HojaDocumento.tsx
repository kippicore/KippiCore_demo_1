import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { rutas } from '@/app/rutas';
import { ESTADOS_FACTURA } from '@/config/estados';
import { MEDIOS_PAGO } from '@/config/negocio';
import type { EstadoFactura } from '@/dominio/tipos';
import { useMarca } from '@/estado';
import { cedula, entero, fechaHora, nit as formatoNit, porcentaje } from '@/lib/formato';
import { BadgeEstado, cn, CodigoQR, Dinero, Fecha, Marca, MarcaAguaDocumento } from '@/ui';
import { partirCodigo, textoQrNota } from '../calculos';
import type { LineaDocumento, VistaFactura, VistaNota } from '../selectores';
import { MARCA_AGUA, TEXTOS } from '../textos';

/**
 * Vista previa del documento (PRD 7.13): hoja carta para la factura electrónica y para la nota crédito, y tirilla de
 * 80 mm para el documento equivalente POS. Siempre con la marca de agua en diagonal y la banda negra "DOCUMENTO DE
 * DEMOSTRACIÓN · SIN VALIDEZ FISCAL" arriba: no se puede confundir con un documento real. El emisor usa la marca
 * activa (HALDEN o el negocio que escribió la persona). Todas las cifras salen del documento emitido (instantánea).
 */

function Banda() {
  return (
    <div
      role="note"
      data-testid="facturacion-marca-agua"
      className="bg-ink px-6 py-2.5 text-center t-eyebrow text-inverse sm:px-10"
    >
      {MARCA_AGUA}
    </div>
  );
}

const Regla = ({ className }: { className?: string }) => (
  <div aria-hidden className={cn('border-t border-dashed border-line-strong', className)} />
);

function Dato({ etiqueta, children, className }: { etiqueta: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="t-eyebrow text-ink-2">{etiqueta}</dt>
      <dd className="mt-1 t-body text-ink">{children}</dd>
    </div>
  );
}

function Fila({ etiqueta, children, fuerte }: { etiqueta: ReactNode; children: ReactNode; fuerte?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-6', fuerte ? 't-h3 pt-2' : 't-body')}>
      <dt className={fuerte ? 'text-ink' : 'text-ink-2'}>{etiqueta}</dt>
      <dd className="num text-ink">{children}</dd>
    </div>
  );
}

/** Nombre del emisor: la razón social de la demostración o, con marca personalizada, el negocio de la persona. */
function useEmisor(empresa: { razonSocial: string; nit: string; direccion: string; ciudad: string; telefono: string; responsableIva: boolean }) {
  const marca = useMarca();
  return {
    razon: marca.esEjemplo ? empresa.razonSocial : `${marca.nombre} · razón social de ejemplo`,
    nit: `NIT ${formatoNit(empresa.nit)}`,
    lugar: `${empresa.direccion}, ${empresa.ciudad}`,
    telefono: empresa.telefono,
    iva: empresa.responsableIva ? 'Responsable de IVA' : 'No responsable de IVA',
  };
}

function Emisor({ empresa }: { empresa: Parameters<typeof useEmisor>[0] }) {
  const e = useEmisor(empresa);
  return (
    <div className="min-w-0">
      <Marca tamano="tienda" descriptor />
      <p className="mt-4 t-small text-ink-2" data-testid="hoja-emisor">
        {e.razon}
      </p>
      <p className="t-small text-muted num">{e.nit}</p>
      <p className="t-small text-muted">
        {e.lugar} · <span className="num">{e.telefono}</span>
      </p>
      <p className="t-small text-muted">{e.iva}</p>
    </div>
  );
}

function CodigoUnico({ etiqueta, codigo, qr }: { etiqueta: string; codigo: string; qr: string }) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div className="min-w-0">
        <p className="t-eyebrow text-ink-2">{etiqueta}</p>
        <p className="mt-1.5 break-all t-small text-ink num" data-testid="hoja-codigo">
          {partirCodigo(codigo).map((r, i) => (
            <span key={i} className="block">
              {r}
            </span>
          ))}
        </p>
        <p className="mt-2 t-small text-muted">Código simulado: no corresponde a ninguno de la DIAN.</p>
      </div>
      <div className="shrink-0 text-center">
        <CodigoQR valor={qr} tamano={96} etiqueta={`Código QR del documento (simulación)`} />
        <p className="mt-1 max-w-[110px] t-small text-muted">{TEXTOS.detalle.qrNota}</p>
      </div>
    </div>
  );
}

function PieHoja() {
  return (
    <footer className="border-t border-line-soft px-6 py-4 sm:px-10">
      <p className="t-small text-muted">{TEXTOS.detalle.avisoPie}</p>
    </footer>
  );
}

function TablaLineas({ lineas }: { lineas: readonly LineaDocumento[] }) {
  return (
    <table className="w-full border-collapse t-small" data-testid="hoja-lineas">
      <thead>
        <tr className="border-y border-line text-left">
          <th scope="col" className="py-2 pr-3 t-eyebrow font-bold text-ink-2">
            Descripción
          </th>
          <th scope="col" className="px-2 py-2 text-right t-eyebrow font-bold text-ink-2">
            Cant.
          </th>
          <th scope="col" className="px-2 py-2 text-right t-eyebrow font-bold text-ink-2">
            Valor unit.
          </th>
          <th scope="col" className="px-2 py-2 text-right t-eyebrow font-bold text-ink-2">
            Desc.
          </th>
          <th scope="col" className="px-2 py-2 text-right t-eyebrow font-bold text-ink-2">
            IVA
          </th>
          <th scope="col" className="py-2 pl-2 text-right t-eyebrow font-bold text-ink-2">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        {lineas.map((l) => (
          <tr key={l.id} className="border-b border-line-soft align-top">
            <td className="py-2.5 pr-3 text-ink">{l.descripcion}</td>
            <td className="px-2 py-2.5 text-right num">{entero(l.cantidad)}</td>
            <td className="px-2 py-2.5 text-right num">
              <Dinero valor={l.precioLista} />
            </td>
            <td className="px-2 py-2.5 text-right num text-muted">
              {l.descuento > 0 ? <Dinero valor={l.descuento} /> : '—'}
            </td>
            <td className="px-2 py-2.5 text-right num">
              <Dinero valor={l.iva} />
            </td>
            <td className="py-2.5 pl-2 text-right num font-semibold text-ink">
              <Dinero valor={l.total} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RecorridoEnLinea({ historial }: { historial: readonly { estado: EstadoFactura; ts: string }[] }) {
  return (
    <p className="t-small text-muted">
      {historial.map((h, i) => (
        <span key={h.estado}>
          {i > 0 && ' · '}
          {ESTADOS_FACTURA[h.estado].etiqueta} <span className="num">{fechaHora(h.ts)}</span>
        </span>
      ))}
    </p>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Factura electrónica (carta)
// ---------------------------------------------------------------------------------------------------------
export function HojaFactura({ vista }: { vista: VistaFactura }) {
  const { factura: f, venta, resolucion, empresa, ivaGeneral, localNombre, vendedorNombre, cliente, medios, lineas } = vista;
  const tipo = 'Factura electrónica de venta';
  return (
    <article
      data-testid="factura-hoja"
      data-documento={f.id}
      data-tipo={f.tipo}
      className="relative mx-auto w-full max-w-[820px] overflow-hidden border border-line bg-surface"
    >
      <MarcaAguaDocumento />
      <div className="relative">
        <Banda />
        <header className="flex flex-wrap items-start justify-between gap-6 px-6 pt-8 sm:px-10">
          <Emisor empresa={empresa} />
          <div className="text-right">
            <p className="t-eyebrow text-ink-2">{tipo}</p>
            <p className="mt-1 t-h1 num" data-testid="hoja-numero">
              {f.numero}
            </p>
            <p className="mt-1 t-small text-muted num">
              Expedida el <Fecha valor={f.ts} formato="fechaHora" />
            </p>
            <div className="mt-2 flex justify-end">
              <span data-testid="hoja-estado" data-estado={f.estado}><BadgeEstado estado={ESTADOS_FACTURA[f.estado]} /></span>
            </div>
          </div>
        </header>

        {resolucion && (
          <p className="mx-6 mt-6 border-y border-line-soft py-2.5 t-small text-muted sm:mx-10" data-testid="hoja-resolucion">
            Resolución de facturación No. <span className="num text-ink-2">{resolucion.numero}</span> (ficticia) · Prefijo{' '}
            <span className="num text-ink-2">{resolucion.prefijo}</span> · Rango autorizado{' '}
            <span className="num text-ink-2">
              {entero(resolucion.desde)} a {entero(resolucion.hasta)}
            </span>{' '}
            · Vigencia <Fecha valor={resolucion.vigenteDesde} className="num text-ink-2" /> a{' '}
            <Fecha valor={resolucion.vigenteHasta} className="num text-ink-2" />
          </p>
        )}

        <dl className="grid grid-cols-2 gap-x-8 gap-y-5 px-6 py-6 sm:px-10">
          <Dato etiqueta="Adquirente">
            <span className="font-semibold" data-testid="hoja-adquirente">
              {f.adquirente.nombre}
            </span>
            <span className="block t-small text-muted num">
              {f.adquirente.tipo === 'identificado'
                ? `${cliente?.documento?.tipo ?? 'CC'} ${f.adquirente.documento ? cedula(f.adquirente.documento) : 'sin documento'}`
                : 'Sin identificar'}
            </span>
            {f.adquirente.correo && <span className="block t-small text-muted">{f.adquirente.correo}</span>}
          </Dato>
          <Dato etiqueta="Venta">
            {venta ? (
              <Link to={rutas.venta(venta.id)} className="font-semibold underline-offset-4 hover:underline num">
                {venta.numero}
              </Link>
            ) : (
              '—'
            )}
            <span className="block t-small text-muted">
              {localNombre}
              {vendedorNombre ? ` · Atendió ${vendedorNombre}` : ''}
            </span>
            {medios.length > 0 && (
              <span className="block t-small text-muted">Pago: {medios.map((m) => MEDIOS_PAGO[m].corta).join(' + ')}</span>
            )}
          </Dato>
        </dl>

        <div className="px-6 sm:px-10">
          <TablaLineas lineas={lineas} />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-8 px-6 pb-6 pt-6 sm:px-10">
          <div className="min-w-[200px] max-w-[300px] t-small text-muted">
            <p>
              IVA general del <span className="num">{porcentaje(ivaGeneral, 0)}</span> incluido en el valor de cada prenda.
            </p>
            {vista.notas.length > 0 && (
              <p className="mt-3 text-ink-2" data-testid="hoja-acreditado">
                Con {vista.notas.length === 1 ? 'una nota crédito' : `${vista.notas.length} notas crédito`}:{' '}
                <Dinero valor={vista.acreditado} className="num" /> acreditado.
              </p>
            )}
          </div>
          <dl className="w-[300px] max-w-full" data-testid="hoja-totales">
            <Fila etiqueta="Subtotal">
              <Dinero valor={f.subtotal} />
            </Fila>
            <Fila etiqueta="Descuentos">
              <Dinero valor={f.descuentos} />
            </Fila>
            <Fila etiqueta="Base gravable">
              <Dinero valor={f.base} />
            </Fila>
            <Fila etiqueta={`IVA ${porcentaje(ivaGeneral, 0)}`}>
              <Dinero valor={f.iva} />
            </Fila>
            <Regla className="my-2" />
            <Fila etiqueta="Total" fuerte>
              <Dinero valor={f.total} data-testid="hoja-total" />
            </Fila>
          </dl>
        </div>

        <div className="mx-6 border-t border-line-soft px-0 py-6 sm:mx-10">
          <CodigoUnico etiqueta="CUFE (simulado)" codigo={f.cufe} qr={f.qrTexto} />
          <div className="mt-5">
            <RecorridoEnLinea historial={f.historial} />
          </div>
        </div>
        <PieHoja />
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Documento equivalente electrónico POS (tirilla)
// ---------------------------------------------------------------------------------------------------------
export function HojaPos({ vista }: { vista: VistaFactura }) {
  const { factura: f, venta, resolucion, empresa, ivaGeneral, localNombre, vendedorNombre, medios, lineas } = vista;
  const e = useEmisor(empresa);
  return (
    <article
      data-testid="factura-hoja"
      data-documento={f.id}
      data-tipo={f.tipo}
      className="relative mx-auto w-full max-w-[400px] overflow-hidden border border-line bg-surface"
    >
      <MarcaAguaDocumento texto={MARCA_AGUA} />
      <div className="relative">
        <Banda />
        <header className="px-6 pt-7 text-center">
          <Marca tamano="tienda" className="items-center" descriptor />
          <p className="mt-3 t-small text-ink-2" data-testid="hoja-emisor">
            {e.razon}
          </p>
          <p className="t-small text-muted num">{e.nit}</p>
          <p className="t-small text-muted">{e.lugar}</p>
          <p className="t-small text-muted">
            {localNombre}
            {vendedorNombre ? ` · Atendió ${vendedorNombre}` : ''}
          </p>
        </header>
        <Regla className="mx-6 my-5" />
        <div className="px-6 text-center">
          <p className="t-eyebrow text-ink-2">Documento equivalente electrónico POS</p>
          <p className="mt-1 t-h1 num" data-testid="hoja-numero">
            {f.numero}
          </p>
          <p className="t-small text-muted num">
            <Fecha valor={f.ts} formato="fechaHora" />
          </p>
          <div className="mt-2 flex justify-center">
            <span data-testid="hoja-estado" data-estado={f.estado}><BadgeEstado estado={ESTADOS_FACTURA[f.estado]} /></span>
          </div>
          {resolucion && (
            <p className="mt-3 t-small text-muted" data-testid="hoja-resolucion">
              Resolución <span className="num">{resolucion.numero}</span> (ficticia)
              <br />
              Prefijo <span className="num">{resolucion.prefijo}</span> · Rango{' '}
              <span className="num">
                {entero(resolucion.desde)} a {entero(resolucion.hasta)}
              </span>
            </p>
          )}
        </div>
        <Regla className="mx-6 my-5" />
        <div className="px-6">
          <p className="t-small text-ink-2" data-testid="hoja-adquirente">
            Cliente: <span className="font-semibold">{f.adquirente.nombre}</span>
            {f.adquirente.documento ? <span className="num"> · {cedula(f.adquirente.documento)}</span> : null}
          </p>
          {venta && (
            <p className="t-small text-muted">
              Venta{' '}
              <Link to={rutas.venta(venta.id)} className="underline-offset-4 hover:underline num">
                {venta.numero}
              </Link>
            </p>
          )}
          <ul className="mt-4 flex flex-col gap-2" data-testid="hoja-lineas">
            {lineas.map((l) => (
              <li key={l.id} className="flex items-baseline justify-between gap-4 t-small">
                <span className="min-w-0 text-ink">
                  <span className="num">{entero(l.cantidad)}</span> × {l.descripcion}
                </span>
                <span className="num shrink-0 text-ink">
                  <Dinero valor={l.total} />
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Regla className="mx-6 my-5" />
        <dl className="px-6" data-testid="hoja-totales">
          <Fila etiqueta="Base gravable">
            <Dinero valor={f.base} />
          </Fila>
          <Fila etiqueta={`IVA ${porcentaje(ivaGeneral, 0)}`}>
            <Dinero valor={f.iva} />
          </Fila>
          <Fila etiqueta="Total" fuerte>
            <Dinero valor={f.total} data-testid="hoja-total" />
          </Fila>
          {medios.length > 0 && (
            <p className="mt-2 t-small text-muted">Pago: {medios.map((m) => MEDIOS_PAGO[m].corta).join(' + ')}</p>
          )}
        </dl>
        <Regla className="mx-6 my-5" />
        <div className="flex flex-col items-center gap-3 px-6 pb-6 text-center">
          <div>
            <p className="t-eyebrow text-ink-2">CUDE (simulado)</p>
            <p className="mt-1 break-all t-small text-ink num" data-testid="hoja-codigo">
              {partirCodigo(f.cufe, 32).map((r, i) => (
                <span key={i} className="block">
                  {r}
                </span>
              ))}
            </p>
          </div>
          <CodigoQR valor={f.qrTexto} tamano={96} etiqueta="Código QR del documento (simulación)" />
          <p className="t-small text-muted">{TEXTOS.detalle.qrNota}</p>
          <RecorridoEnLinea historial={f.historial} />
        </div>
        <PieHoja />
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Nota crédito (carta)
// ---------------------------------------------------------------------------------------------------------
export function HojaNota({ vista, estado }: { vista: VistaNota; estado: EstadoFactura }) {
  const { nota: n, factura, venta, empresa, ivaGeneral, localNombre, lineas, devolucion } = vista;
  return (
    <article
      data-testid="nota-hoja"
      data-documento={n.id}
      className="relative mx-auto w-full max-w-[820px] overflow-hidden border border-line bg-surface"
    >
      <MarcaAguaDocumento />
      <div className="relative">
        <Banda />
        <header className="flex flex-wrap items-start justify-between gap-6 px-6 pt-8 sm:px-10">
          <Emisor empresa={empresa} />
          <div className="text-right">
            <p className="t-eyebrow text-ink-2">Nota crédito electrónica</p>
            <p className="mt-1 t-h1 num" data-testid="hoja-numero">
              {n.numero}
            </p>
            <p className="mt-1 t-small text-muted num">
              Expedida el <Fecha valor={n.ts} formato="fechaHora" />
            </p>
            <div className="mt-2 flex justify-end">
              <span data-testid="hoja-estado" data-estado={estado}><BadgeEstado estado={ESTADOS_FACTURA[estado]} /></span>
            </div>
          </div>
        </header>

        <p className="mx-6 mt-6 border-y border-line-soft py-2.5 t-small text-muted sm:mx-10">
          Numeración <span className="num text-ink-2">HAL-NC</span> (ficticia) de la nota crédito: no usa resolución de
          facturación propia en la demostración.
        </p>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-5 px-6 py-6 sm:px-10">
          <Dato etiqueta="Adquirente">
            <span className="font-semibold" data-testid="hoja-adquirente">
              {factura?.adquirente.nombre ?? '—'}
            </span>
            <span className="block t-small text-muted num">
              {factura?.adquirente.documento ? cedula(factura.adquirente.documento) : 'Sin identificar'}
            </span>
          </Dato>
          <Dato etiqueta="Documento que afecta">
            {factura ? (
              <Link to={rutas.factura(factura.id)} className="font-semibold underline-offset-4 hover:underline num">
                {factura.numero}
              </Link>
            ) : (
              '—'
            )}
            <span className="block t-small text-muted">
              {venta ? `Venta ${venta.numero} · ` : ''}
              {localNombre}
            </span>
          </Dato>
          <Dato etiqueta="Motivo" className="col-span-2">
            <span data-testid="hoja-motivo">{n.motivo}</span>
            {devolucion && <span className="block t-small text-muted num">Devolución {devolucion.numero}</span>}
          </Dato>
        </dl>

        {lineas.length > 0 && (
          <div className="px-6 sm:px-10">
            <TablaLineas lineas={lineas} />
          </div>
        )}

        <div className="flex justify-end px-6 pb-6 pt-6 sm:px-10">
          <dl className="w-[300px] max-w-full" data-testid="hoja-totales">
            <Fila etiqueta="Base gravable">
              <Dinero valor={n.base} />
            </Fila>
            <Fila etiqueta={`IVA ${porcentaje(ivaGeneral, 0)}`}>
              <Dinero valor={n.iva} />
            </Fila>
            <Regla className="my-2" />
            <Fila etiqueta="Valor acreditado" fuerte>
              <Dinero valor={n.valor} data-testid="hoja-total" />
            </Fila>
          </dl>
        </div>

        <div className="mx-6 border-t border-line-soft py-6 sm:mx-10">
          <CodigoUnico etiqueta="CUDE (simulado)" codigo={n.cude} qr={textoQrNota(n, factura?.numero ?? '')} />
        </div>
        <PieHoja />
      </div>
    </article>
  );
}

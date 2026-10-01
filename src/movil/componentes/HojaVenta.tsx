import { useSel } from '@/estado';
import { unidades } from '@/lib/formato';
import { ESTADOS_VENTA } from '@/config/estados';
import { BadgeEstado, Dinero, Fecha } from '@/ui/ligero';
import { selDetalleVentaApp } from '../selectores';
import { TXT } from '../textos';
import { ParDato } from './Tarjeta';
import { HojaApp } from './HojaApp';

/**
 * Detalle de una venta en una hoja inferior (los modales de /app son hojas, nunca diálogos centrados, 8.5.4). Todo sale
 * de `selVentaDetalle` (estado y saldo) más los nombres; las cifras pasan por `<Dinero>` (respetan la moneda).
 * Se carga diferido (`useHojaVenta`): no pesa en el arranque de /app.
 */
export default function HojaVenta({ ventaId, alCerrar }: { ventaId: string | null; alCerrar: () => void }) {
  return (
    <HojaApp abierta={!!ventaId} alCerrar={alCerrar} titulo={TXT.venta.titulo}>
      {ventaId && <ContenidoVenta ventaId={ventaId} />}
    </HojaApp>
  );
}

function ContenidoVenta({ ventaId }: { ventaId: string }) {
  const d = useSel(selDetalleVentaApp, { ventaId });
  if (!d) return <p className="t-body text-muted">{TXT.venta.noEncontrada}</p>;
  const estado = ESTADOS_VENTA[d.estado as keyof typeof ESTADOS_VENTA];
  return (
    <div data-testid="app-detalle-venta" data-venta={d.id}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="t-kpi-sm text-ink">
            <Dinero valor={d.total} />
          </p>
          <p className="mt-0.5 t-small text-muted num">
            {d.numero} · <Fecha valor={d.ts} formato="fechaHora" />
          </p>
        </div>
        {estado && <BadgeEstado estado={estado} />}
      </div>
      <dl className="mt-3 divide-y divide-line-soft border-y border-line-soft">
        <ParDato etiqueta={TXT.venta.local}>{d.local}</ParDato>
        <ParDato etiqueta={TXT.venta.vendedor}>{d.vendedor}</ParDato>
        <ParDato etiqueta={TXT.venta.cliente}>{d.cliente}</ParDato>
        {d.descuentos > 0 && (
          <ParDato etiqueta={TXT.venta.descuento}>
            <Dinero valor={d.descuentos} />
          </ParDato>
        )}
        {d.saldo > 0 && (
          <ParDato etiqueta="Saldo pendiente">
            <Dinero valor={d.saldo} />
          </ParDato>
        )}
      </dl>
      <h3 className="mt-5 t-eyebrow text-ink-2">{TXT.venta.lineas}</h3>
      <ul className="mt-1 divide-y divide-line-soft">
        {d.lineas.map((l) => (
          <li key={l.id} className="flex min-h-14 items-center gap-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate t-body font-semibold text-ink">{l.nombre}</span>
              <span className="block t-small text-muted">
                {l.detalle}
                {l.cantidad > 1 ? ` · ${unidades(l.cantidad)}` : ''}
              </span>
            </span>
            <span className="t-body num text-ink">
              <Dinero valor={l.total} />
            </span>
          </li>
        ))}
      </ul>
      {d.medios.length > 0 && (
        <>
          <h3 className="mt-5 t-eyebrow text-ink-2">{TXT.venta.medios}</h3>
          <dl className="mt-1 divide-y divide-line-soft">
            {d.medios.map((m) => (
              <ParDato key={m.etiqueta} etiqueta={m.etiqueta}>
                <Dinero valor={m.valor} />
              </ParDato>
            ))}
          </dl>
        </>
      )}
    </div>
  );
}

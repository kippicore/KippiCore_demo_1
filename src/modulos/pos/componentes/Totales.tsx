import { Banknote, Tag } from 'lucide-react';
import type { Descuento } from '@/dominio/tipos';
import type { TotalesVenta } from '@/dominio/reglas/ventas';
import { dinero as formatoDinero, porcentaje } from '@/lib/formato';
import { Button, Dinero, Icono } from '@/ui';
import { PopoverDescuento } from './Descuento';

/**
 * Totales en vivo (V1): subtotal, descuentos, IVA incluido y total, todos de `calcularVenta` —la misma regla del
 * manejador—, así que lo que se ve es exactamente lo que se guarda. El descuento global se aplica desde aquí.
 */
export interface PropsTotales {
  totales: TotalesVenta;
  /** Tarifa de IVA común a todas las líneas (null si hay varias). */
  tarifaIva: number | null;
  descuentoGlobal: Descuento | null;
  alDescuentoGlobal: (d: Descuento | null) => void;
  /** Contado: el total. Separado: lo que se abona hoy y lo que queda por pagar. */
  separado: { abono: number; saldo: number } | null;
  /** Cambio en efectivo a devolver (0 = no aplica). */
  cambio: number;
  hayLineas: boolean;
}

export function Totales({ totales, tarifaIva, descuentoGlobal, alDescuentoGlobal, separado, cambio, hayLineas }: PropsTotales) {
  return (
    <div className="flex flex-col gap-1" data-testid="pos-totales">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 t-small text-ink-2">
        <p className="num" data-testid="pos-subtotal">
          Subtotal <Dinero valor={totales.subtotal} />
          {totales.descuentos > 0 && (
            <>
              {' · '}Descuento <span className="text-accent-ink">−<Dinero valor={totales.descuentos} /></span>
            </>
          )}
          {' · '}IVA{tarifaIva !== null ? ` ${porcentaje(tarifaIva, 0)}` : ''} incluido <Dinero valor={totales.iva} />
        </p>
        <PopoverDescuento
          titulo="Descuento de toda la venta"
          valor={descuentoGlobal}
          alAplicar={alDescuentoGlobal}
          ayuda={totales.subtotal ? `Se reparte entre las prendas. Subtotal: ${formatoDinero(totales.subtotal, 'COP')}.` : undefined}
          disparador={
            <Button variante="ghost" tamano="sm" icono={Tag} disabled={!hayLineas} data-testid="pos-descuento-global">
              {descuentoGlobal ? (descuentoGlobal.tipo === 'porcentaje' ? `Descuento ${porcentaje(descuentoGlobal.valor)}` : 'Descuento aplicado') : 'Descuento'}
            </Button>
          }
        />
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="t-eyebrow text-ink-2">{separado ? 'Total de la venta' : 'Total a cobrar'}</p>
          {separado && (
            <p className="t-small num text-ink-2" data-testid="pos-separado-resumen">
              Abona hoy <strong className="font-semibold text-ink"><Dinero valor={separado.abono} /></strong> · saldo <Dinero valor={separado.saldo} />
            </p>
          )}
          {!separado && cambio > 0 && (
            <p className="t-small num text-ink-2" data-testid="pos-cambio">
              <Icono icono={Banknote} tamano={14} className="mr-1 inline" />
              Cambio a devolver <strong className="font-semibold text-ink">{formatoDinero(cambio, 'COP')}</strong>
            </p>
          )}
        </div>
        <p className="t-kpi-sm num text-ink" data-testid="pos-total">
          <Dinero valor={totales.total} animar />
        </p>
      </div>
    </div>
  );
}

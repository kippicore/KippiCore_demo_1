import type { COP, CuentaPorCobrar, CuentaPorPagar, FechaISO } from '../tipos';
import { copDeCentavos } from './dinero';
import { diferenciaDias } from './fechas';

/** Estados derivados de cuentas por pagar y por cobrar (PLAN 6.19 V9, 6.12). */

export type EstadoCxP = 'pendiente' | 'programado' | 'pago_parcial' | 'pagado' | 'vencido';

/** Saldo en la moneda de la cuenta (COP: pesos; USD/CNY: centavos). */
export function saldoCxP(cxp: Pick<CuentaPorPagar, 'moneda' | 'valor' | 'abonos'>): number {
  let pagado = 0;
  for (const a of cxp.abonos) pagado += cxp.moneda === 'COP' ? a.valorCOP : (a.montoOrigen?.centavos ?? 0);
  return cxp.valor - pagado;
}

/** Saldo en COP: si es extranjera, con la tasa dada (vigente). */
export function saldoCxPCop(
  cxp: Pick<CuentaPorPagar, 'moneda' | 'valor' | 'abonos'>,
  tasa: number | null,
): COP {
  const saldo = saldoCxP(cxp);
  if (cxp.moneda === 'COP') return saldo;
  return tasa === null ? 0 : copDeCentavos(saldo, tasa);
}

/** pagado si saldo ≤ 0; vencido si vence antes de hoy; programado; pago parcial; pendiente (V9). */
export function estadoCxP(
  cxp: Pick<CuentaPorPagar, 'moneda' | 'valor' | 'abonos' | 'fechaVencimiento' | 'programadaPara'>,
  hoy: FechaISO,
): EstadoCxP {
  if (saldoCxP(cxp) <= 0) return 'pagado';
  if (cxp.fechaVencimiento < hoy) return 'vencido';
  if (cxp.programadaPara) return 'programado';
  if (cxp.abonos.length > 0) return 'pago_parcial';
  return 'pendiente';
}

export function diasParaVencer(fechaVencimiento: FechaISO, hoy: FechaISO): number {
  return diferenciaDias(hoy, fechaVencimiento);
}

/** Por vencer: dentro de los próximos 7 días. */
export const DIAS_POR_VENCER = 7;

export function estadoCxC(
  saldo: COP,
  fechaLimite: FechaISO | null,
  hoy: FechaISO,
): CuentaPorCobrar['estado'] {
  if (saldo <= 0) return 'cobrado';
  if (fechaLimite === null) return 'al_dia';
  const dias = diferenciaDias(hoy, fechaLimite);
  if (dias < 0) return 'vencido';
  if (dias <= DIAS_POR_VENCER) return 'por_vencer';
  return 'al_dia';
}

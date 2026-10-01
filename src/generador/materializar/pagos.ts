import type { EstadoDominio, FechaISO, Id, SobreComando } from '@/dominio/tipos';
import { tasaVigente } from '@/dominio/comandos/comunes';
import { saldoCxP } from '@/dominio/reglas/cuentas';
import { copDeCentavos } from '@/dominio/reglas/dinero';
import { idGenerado, idHijo } from '@/dominio/motor/ids';
import { CUENTA_CORRIENTE, type Gen } from '../contexto';

/** Pagos del generador: aporte del socio cuando falta saldo (V7) y pago completo de una cuenta por pagar. */

type Emitir = ReturnType<Gen['emisor']>;

const aportesDelDia = new WeakMap<Gen, Map<FechaISO, number>>();

/** Si la cuenta no alcanza para un pago, el socio aporta lo que falta y un colchón (el generador nunca deja saldos negativos, V7). */
export function* asegurarSaldo(
  g: Gen,
  emitir: Emitir,
  estado: EstadoDominio,
  cuentaId: Id,
  monto: number,
  fecha: FechaISO,
): Generator<SobreComando> {
  const saldo = estado.agregados.saldosCuentas[cuentaId] ?? 0;
  if (saldo >= monto) return;
  const falta = Math.ceil((monto - saldo + 8_000_000) / 1_000_000) * 1_000_000;
  let m = aportesDelDia.get(g);
  if (!m) {
    m = new Map();
    aportesDelDia.set(g, m);
  }
  const n = (m.get(fecha) ?? 0) + 1;
  m.set(fecha, n);
  yield emitir('cuenta.movimiento', {
    movimientoId: idGenerado('mc', 'aporte', fecha, String(n)),
    cuentaId,
    valor: falta,
    tipo: 'aporte_socio',
    fecha,
    descripcion: 'Aporte del socio',
  });
}

/** Paga una cuenta por pagar completa (COP o moneda extranjera con la tasa vigente). */
export function* pagarCxP(
  g: Gen,
  emitir: ReturnType<Gen['emisor']>,
  estado: EstadoDominio,
  cxpId: Id,
  fecha: FechaISO,
): Generator<SobreComando> {
  const c = estado.cuentasPorPagar[cxpId];
  if (!c || c.eliminadoEn) return;
  const saldo = saldoCxP(c);
  if (saldo <= 0) return;
  const extranjera = c.moneda !== 'COP';
  const tasa = extranjera
    ? fecha < g.plan.vispera
      ? g.plan.tasas.valor(c.moneda as 'USD' | 'CNY', fecha)
      : (tasaVigente(estado, c.moneda as 'USD' | 'CNY', fecha) ?? 1)
    : null;
  const cop = extranjera ? copDeCentavos(saldo, tasa ?? 1) : saldo;
  yield* asegurarSaldo(g, emitir, estado, CUENTA_CORRIENTE, cop, fecha);
  yield emitir('cxp.pagar', {
    cxpId,
    abonoId: idHijo(cxpId, `pago${c.abonos.length + 1}`),
    fecha,
    valorCOP: extranjera ? null : saldo,
    centavos: extranjera ? saldo : null,
    tasa,
    cuentaId: CUENTA_CORRIENTE,
    medio: extranjera ? 'giro_internacional' : 'transferencia',
    soporte: null,
  });
}


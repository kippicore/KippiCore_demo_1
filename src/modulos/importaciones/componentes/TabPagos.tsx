import { Banknote } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { rutas } from '@/app/rutas';
import type { Importacion } from '@/dominio/tipos';
import { ESTADOS_POR_PAGAR } from '@/config/estados';
import { copDeCentavos } from '@/dominio/reglas/dinero';
import { useAcciones, useHoy, usePuede, useSel } from '@/estado';
import { entero, fecha, numero } from '@/lib/formato';
import { dineroOrigen } from '@/lib/moneda';
import { selSaldosCuentas } from '@/selectores';
import { avisar, BadgeEstado, Button, Dialog, Dinero, EmptyState, Fecha, FranjaResumen, InputNumero, NotaLegal, Select, SelectorFecha, Termino } from '@/ui';
import { selPagosImportacion, type CuentaPagoVista } from '../selectores';
import { MontoOrigen } from './Montos';

/**
 * Pagos de un pedido (PRD 7.5): anticipo y saldo a la fábrica en su moneda, la tasa del día de cada pago y la
 * diferencia en cambio contra la tasa del pedido, más los tributos y servicios de la cadena. El saldo se paga cuando
 * el pedido queda "Listo para despacho".
 */
export function TabPagos({ imp }: { imp: Importacion }) {
  const hoy = useHoy();
  const puede = usePuede();
  const pagos = useSel(selPagosImportacion, { importacionId: imp.id, hoy });
  const [pagando, setPagando] = useState<string | null>(null);
  if (!pagos) return null;
  const cuenta = pagos.cuentas.find((c) => c.id === pagando) ?? null;
  const dif = pagos.diferenciaCambioCop;
  const registra = puede('importacion.registrarPago');

  return (
    <div className="space-y-6" data-testid="tab-pagos">
      <FranjaResumen
        cifras={[
          { etiqueta: 'Valor de fábrica', valor: <MontoOrigen centavos={pagos.fobOrigen} moneda={pagos.moneda} /> },
          { etiqueta: 'Pagado a la fábrica', valor: <MontoOrigen centavos={pagos.pagadoOrigen} moneda={pagos.moneda} cop={pagos.pagadoCop} /> },
          { etiqueta: 'Falta pagar', valor: <MontoOrigen centavos={pagos.saldoOrigen} moneda={pagos.moneda} cop={copDeCentavos(pagos.saldoOrigen, pagos.tasaVigente)} /> },
          {
            etiqueta: <Termino comun="Diferencia en cambio" definicion="Lo que pagaste de más o de menos en pesos por haber girado con una tasa distinta a la del pedido. Positiva: te salió más caro." sinTecnico />,
            valor: <span className={dif > 0 ? 'text-danger' : dif < 0 ? 'text-success' : undefined}>{dif === 0 ? 'Sin diferencia' : <><span>{dif > 0 ? '+' : ''}</span><Dinero valor={dif} corta /></>}</span>,
          },
        ]}
      />
      <p className="t-small text-muted">
        Tasa del pedido: <span className="num">$ {numero(pagos.tasaPedido, 2)}</span> · tasa de hoy: <span className="num">$ {numero(pagos.tasaVigente, 2)}</span>. Las cifras en pesos usan la tasa del día de cada pago.
      </p>

      {pagos.cuentas.length === 0 ? (
        <div className="border border-line bg-surface">
          <EmptyState tamano="pagina" icono={Banknote} titulo="Todavía no hay pagos por hacer" texto="Cuando el pedido pase a Pedido confirmado se generan el anticipo (30 %) y el saldo (70 %) a la fábrica." />
        </div>
      ) : (
        pagos.cuentas.map((c) => (
          <section key={c.id} className="border border-line bg-surface" data-testid={`cuenta-${c.numero}`}>
            <header className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="t-eyebrow text-ink-2">{c.numero}</p>
                <h3 className="t-h3 font-bold text-ink">{c.concepto}</h3>
                <p className="mt-1 t-small text-muted">
                  Vence <Fecha valor={c.vence} /> · <Fecha valor={c.vence} formato="relativaDias" />
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="t-small text-muted">Valor</p>
                  <p className="t-label font-bold">{c.moneda === 'COP' ? <Dinero valor={c.valor} /> : <MontoOrigen centavos={c.valor} moneda={c.moneda} />}</p>
                </div>
                <div className="text-right">
                  <p className="t-small text-muted">Falta</p>
                  <p className="t-label font-bold">{c.saldo <= 0 ? '—' : c.moneda === 'COP' ? <Dinero valor={c.saldo} /> : <MontoOrigen centavos={c.saldo} moneda={c.moneda} />}</p>
                </div>
                <BadgeEstado estado={ESTADOS_POR_PAGAR[c.estado]} />
                {registra && c.saldo > 0 && (
                  <Button variante={c.esFabrica ? 'primary' : 'secondary'} tamano="sm" onClick={() => setPagando(c.id)} data-testid={`pagar-${c.numero}`}>
                    Registrar pago
                  </Button>
                )}
              </div>
            </header>
            {c.abonos.length > 0 && (
              <table className="w-full border-t border-line-soft">
                <caption className="sr-only">Pagos de {c.concepto}</caption>
                <thead>
                  <tr className="text-left">
                    <th className="px-5 py-2 t-eyebrow text-ink-2">Fecha</th>
                    <th className="px-2 py-2 t-eyebrow text-ink-2">Pagado</th>
                    <th className="px-2 py-2 text-right t-eyebrow text-ink-2">Tasa del día</th>
                    <th className="px-2 py-2 text-right t-eyebrow text-ink-2">En pesos</th>
                    <th className="px-2 py-2 text-right t-eyebrow text-ink-2">Dif. en cambio</th>
                    <th className="px-5 py-2 text-right t-eyebrow text-ink-2">Salió de</th>
                  </tr>
                </thead>
                <tbody>
                  {c.abonos.map((a) => (
                    <tr key={a.id} className="border-t border-line-soft t-body">
                      <td className="px-5 py-2">
                        <Fecha valor={a.ts} />
                      </td>
                      <td className="px-2 py-2 num">{a.montoOrigen && c.moneda !== 'COP' ? dineroOrigen(a.montoOrigen.centavos, c.moneda) : <Dinero valor={a.valorCOP} />}</td>
                      <td className="px-2 py-2 text-right num">{a.montoOrigen ? `$ ${numero(a.montoOrigen.tasa, 2)}` : '—'}</td>
                      <td className="px-2 py-2 text-right">
                        <Dinero valor={a.valorCOP} />
                      </td>
                      <td className={`px-2 py-2 text-right num ${(a.diferenciaCambio ?? 0) > 0 ? 'text-danger' : (a.diferenciaCambio ?? 0) < 0 ? 'text-success' : ''}`}>
                        {a.diferenciaCambio === null ? '—' : <>{a.diferenciaCambio > 0 ? '+' : ''}<Dinero valor={a.diferenciaCambio} /></>}
                      </td>
                      <td className="px-5 py-2 text-right text-ink-2">{a.cuentaNombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))
      )}
      <p className="t-small text-muted">
        ¿Quieres ver todo lo que debes? <Link to={rutas.porPagar()} className="font-semibold text-ink underline underline-offset-4">Ir a Por pagar</Link>.
      </p>
      <NotaLegal tipo="aduanero" />
      {cuenta && <RegistrarPago imp={imp} cuenta={cuenta} tasaVigente={pagos.tasaVigente} alCerrar={() => setPagando(null)} />}
    </div>
  );
}

function RegistrarPago({ imp, cuenta, tasaVigente, alCerrar }: { imp: Importacion; cuenta: CuentaPagoVista; tasaVigente: number; alCerrar: () => void }) {
  const hoy = useHoy();
  const acciones = useAcciones();
  const saldos = useSel(selSaldosCuentas);
  const extranjera = cuenta.moneda !== 'COP';
  const opciones = saldos.cuentas.filter((s) => s.cuenta.tipo === 'banco');
  const [monto, setMonto] = useState<number | null>(extranjera ? cuenta.saldo / 100 : cuenta.saldo);
  const [tasa, setTasa] = useState<number | null>(extranjera ? tasaVigente : null);
  const [fechaPago, setFechaPago] = useState(hoy);
  const [cuentaId, setCuentaId] = useState<string | null>(opciones[0]?.cuenta.id ?? null);
  const [error, setError] = useState<{ campo: string; mensaje: string } | null>(null);
  const limpio = <T,>(poner: (v: T) => void) => (v: T) => {
    poner(v);
    setError(null);
  };

  const centavos = extranjera ? Math.round((monto ?? 0) * 100) : null;
  const enPesos = extranjera ? copDeCentavos(centavos ?? 0, tasa ?? 0) : (monto ?? 0);
  const dif = extranjera ? enPesos - copDeCentavos(centavos ?? 0, imp.tasaPedido) : 0;

  const pagar = () => {
    if (!cuentaId) return setError({ campo: 'cuentaId', mensaje: 'Elige la cuenta de donde sale la plata.' });
    if (!monto || monto <= 0) return setError({ campo: 'monto', mensaje: 'Escribe cuánto vas a pagar.' });
    const r = extranjera
      ? acciones.registrarPagoImportacion({ importacionId: imp.id, cxpId: cuenta.id, centavos: centavos ?? 0, tasa: tasa ?? 0, fecha: fechaPago, cuentaId })
      : acciones.pagarCuentaPorPagar({ cxpId: cuenta.id, fecha: fechaPago, valorCOP: monto, centavos: null, tasa: null, cuentaId, medio: 'transferencia', soporte: null });
    if (!r.ok) {
      setError({ campo: r.error.campo ?? 'monto', mensaje: r.error.mensaje });
      return;
    }
    avisar({ tipo: 'exito', texto: 'Pago registrado', detalle: `${cuenta.concepto} · ${fecha(fechaPago)}` });
    alCerrar();
  };
  const campoError = (c: string) => (error && (error.campo === c || (c === 'monto' && ['valorCOP', 'centavos', 'cxpId'].includes(error.campo))) ? error.mensaje : undefined);

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow={imp.numero}
      titulo="Registrar pago"
      descripcion={cuenta.concepto}
      data-testid="dialogo-pago"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={pagar} data-testid="confirmar-pago">
            Registrar pago
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <InputNumero
          etiqueta={extranjera ? `Monto a pagar (${cuenta.moneda === 'USD' ? 'US$' : 'CN¥'})` : 'Monto a pagar'}
          prefijo={cuenta.moneda === 'USD' ? 'US$' : cuenta.moneda === 'CNY' ? 'CN¥' : '$'}
          valor={monto}
          alCambiar={limpio(setMonto)}
          decimales={extranjera ? 2 : 0}
          error={campoError('monto')}
          ayuda={`Falta por pagar: ${extranjera ? dineroOrigen(cuenta.saldo, cuenta.moneda as 'USD' | 'CNY') : `$ ${entero(cuenta.saldo)}`}`}
          data-testid="monto-pago"
        />
        {extranjera && <InputNumero etiqueta="Tasa del día (pesos por unidad)" prefijo="$" valor={tasa} alCambiar={limpio(setTasa)} decimales={2} error={campoError('tasa')} />}
        <SelectorFecha etiqueta="Fecha del pago" hoy={hoy} valor={fechaPago} alCambiar={limpio(setFechaPago)} hasta={hoy} enModal error={campoError('fecha')} />
        <Select
          etiqueta="Sale de la cuenta"
          valor={cuentaId}
          alCambiar={limpio(setCuentaId)}
          opciones={opciones.map((s) => ({ valor: s.cuenta.id, etiqueta: s.cuenta.nombre }))}
          enModal
          error={campoError('cuentaId')}
        />
        {extranjera && (
          <div className="border border-line bg-surface-2 p-4 t-body" data-testid="preview-pago">
            Equivale a <strong className="font-bold"><Dinero valor={enPesos} /></strong> con la tasa del día.{' '}
            {dif === 0 ? 'Sin diferencia en cambio.' : (
              <span className={dif > 0 ? 'text-danger' : 'text-success'}>
                Diferencia en cambio contra la tasa del pedido: {dif > 0 ? '+' : ''}
                <Dinero valor={dif} />.
              </span>
            )}
          </div>
        )}
        {error && !['monto', 'tasa', 'fecha', 'cuentaId', 'valorCOP', 'centavos', 'cxpId'].includes(error.campo) && <p className="border-l-2 border-danger pl-3 t-small text-ink">{error.mensaje}</p>}
      </div>
    </Dialog>
  );
}

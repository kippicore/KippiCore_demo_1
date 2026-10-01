import { Landmark } from 'lucide-react';
import { rutas } from '@/app/rutas';
import { useAhora, useEstadoDominio, useFiltroLocal, useSel } from '@/estado';
import { ESTADOS_POR_PAGAR } from '@/config/estados';
import { fecha, plural, relativaDias } from '@/lib/formato';
import { dineroOrigen } from '@/lib/moneda';
import { nombreCliente, selCuentasPorCobrar, selCuentasPorPagar, selFlujoProyectado, selSaldosCuentas } from '@/selectores';
import { BadgeEstado, Dinero, EmptyState } from '@/ui/ligero';
import { Pantalla } from '../componentes/Pantalla';
import { CifraSecundaria, FilaLista, Lista, Tarjeta, TarjetaTitulo } from '../componentes/Tarjeta';
import { TXT } from '../textos';

/**
 * Pagos pendientes (PRD 6.5): lo que hay que pagar y cuándo (cuentas por pagar con su estado y su fecha), lo que te
 * deben (separados), la plata que tienes en cuentas y el punto más bajo del flujo de caja de los próximos 90 días con
 * la explicación que redacta el sistema (W5). Todo de `selCuentasPorPagar`, `selCuentasPorCobrar`, `selSaldosCuentas` y
 * `selFlujoProyectado`: las mismas cifras de Pagos en el escritorio. Los pagos en dólares o yuanes muestran su monto de
 * origen junto al valor en pesos.
 */
export default function Pagos() {
  const ahora = useAhora();
  const hoy = ahora.slice(0, 10);
  const local = useFiltroLocal();
  const e = useEstadoDominio();
  const porPagar = useSel(selCuentasPorPagar, { hoy, estado: 'pendientes', localId: local });
  const porCobrar = useSel(selCuentasPorCobrar, { hoy, localId: local });
  const porVencer = useSel(selCuentasPorCobrar, { hoy, filtro: 'separados-por-vencer', localId: local });
  const cuentas = useSel(selSaldosCuentas, { localId: local });
  const flujo = useSel(selFlujoProyectado, { dias: 90, hoy, hora: ahora.slice(11, 16) });
  const filas = [...porPagar.filas].sort((a, b) => (a.fechaPago < b.fechaPago ? -1 : 1));
  return (
    <Pantalla testid="app-pagos" titulo={TXT.pagos.titulo} volver={{ a: rutas.appMas(), texto: 'Más' }} fecha="Lo que debes y lo que te deben">
      <div className="grid grid-cols-2 gap-3">
        <CifraSecundaria etiqueta={TXT.pagos.porPagar} data-testid="app-pagos-por-pagar" nota={plural(porPagar.filas.length, 'pago', 'pagos')}>
          <Dinero valor={porPagar.totalCop} corta />
        </CifraSecundaria>
        <CifraSecundaria etiqueta={TXT.pagos.vencido} data-testid="app-pagos-vencido" nota={porPagar.vencidoCop > 0 ? 'Ya pasó su fecha' : 'Nada vencido'}>
          <Dinero valor={porPagar.vencidoCop} corta />
        </CifraSecundaria>
        <CifraSecundaria etiqueta={TXT.pagos.porCobrar} nota={plural(porCobrar.filas.length, 'cuenta', 'cuentas')}>
          <Dinero valor={porCobrar.saldo} corta />
        </CifraSecundaria>
        <CifraSecundaria etiqueta="En cuentas" nota="Cajas, bancos y billeteras">
          <Dinero valor={cuentas.total} corta />
        </CifraSecundaria>
      </div>

      <Tarjeta className="p-4" data-testid="app-pagos-flujo">
        <p className="t-eyebrow text-ink-2">La plata más baja de los próximos 90 días</p>
        <p className="mt-2 t-kpi text-ink">
          <Dinero valor={flujo.puntoBajo.saldo} />
        </p>
        <p className="mt-1 t-small text-muted">
          {relativaDias(flujo.puntoBajo.fecha, hoy)} · <span className="num">{fecha(flujo.puntoBajo.fecha)}</span>
        </p>
        <p className="mt-3 t-body text-ink">{flujo.explicacion}</p>
      </Tarjeta>

      <Tarjeta aria-label={TXT.pagos.proximos}>
        <TarjetaTitulo titulo={TXT.pagos.proximos} />
        {filas.length === 0 ? (
          <EmptyState tamano="compacto" icono={Landmark} titulo={TXT.pagos.vacio} texto={TXT.pagos.vacioTexto} />
        ) : (
          <Lista data-testid="app-lista-pagos">
            {filas.map((f) => (
              <FilaLista
                key={f.cxp.id}
                data-testid="app-pago"
                principal={f.cxp.terceroNombre}
                secundaria={
                  <>
                    {f.cxp.concepto} · {relativaDias(f.fechaPago, hoy)}
                    {f.cxp.moneda !== 'COP' ? ` · ${dineroOrigen(f.saldoOrigen, f.cxp.moneda)}` : ''}
                  </>
                }
                derecha={
                  <span className="flex flex-col items-end gap-1">
                    <span className="t-body num text-ink">
                      <Dinero valor={f.saldoCop} corta />
                    </span>
                    <BadgeEstado tamano="sm" estado={ESTADOS_POR_PAGAR[f.estado]} />
                  </span>
                }
              />
            ))}
          </Lista>
        )}
      </Tarjeta>

      {porVencer.filas.length > 0 && (
        <Tarjeta data-testid="app-separados">
          <TarjetaTitulo titulo={`${TXT.pagos.cobrar} que vencen esta semana`} />
          <Lista>
            {porVencer.filas.map((c) => (
              <FilaLista
                key={c.ventaId}
                principal={nombreCliente(e.clientes[c.clienteId ?? ''])}
                secundaria={`${c.numeroVenta}${c.fechaLimite ? ` · vence ${relativaDias(c.fechaLimite, hoy)}` : ''}`}
                derecha={
                  <span className="t-body num text-ink">
                    <Dinero valor={c.saldo} />
                  </span>
                }
              />
            ))}
          </Lista>
        </Tarjeta>
      )}
      <p className="px-1 t-small text-muted">Los pagos se programan y se registran desde el computador.</p>
    </Pantalla>
  );
}

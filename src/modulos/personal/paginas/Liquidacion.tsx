import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Ban, CircleCheck, ReceiptText } from 'lucide-react';
import {
  BadgeEstado,
  Badge,
  BotonAccionesFila,
  BotonEnlace,
  BotonExportar,
  Button,
  Card,
  ConfirmarEliminacion,
  Dialog,
  Dinero,
  EmptyState,
  EncabezadoPagina,
  Fecha,
  ItemMenu,
  Kpi,
  Menu,
  ParesDatos,
  Select,
  SelectorFecha,
  avisar,
} from '@/ui';
import type { Id, LiquidacionNomina } from '@/dominio/tipos';
import { useAcciones, useDinero, useHoy, useSel } from '@/estado';
import { numero, plural } from '@/lib/formato';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { selSaldosCuentas } from '@/selectores';
import { TEXTOS_FIJOS } from '@/config/textos/notas';
import { ESTADO_NOMINA_ELECTRONICA } from '@/config/estados';
import { CajonLinea } from '../componentes/CajonLinea';
import { LimiteError, NotaNomina } from '../componentes/Piezas';
import { TablaLineas } from '../componentes/TablaLineas';
import { validarPagoNomina } from '../calculos';
import { selLineasLiquidacion, type LineaConPersona } from '../selectores';

/** Liquidación aprobada (PRD 7.9): totales, una línea por persona con su desprendible en PDF, pagar y resumen en Excel. */
export default function Liquidacion() {
  const { liquidacionId } = useParamsRuta('liquidacion');
  const v = useSel(selLineasLiquidacion, { liquidacionId });
  const migas = (n: string) => [{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Personal y nómina', a: rutas.personal() }, { texto: 'Nómina', a: rutas.nomina() }, { texto: n }];
  if (!v)
    return (
      <div className="pb-16" data-testid="personal-liquidacion-no-encontrada">
        <EncabezadoPagina migas={migas('Liquidación')} titulo="Liquidación de nómina" />
        <Card className="mt-8" padding="ninguno">
          <EmptyState
            icono={ReceiptText}
            titulo="No encontramos esa nómina"
            texto="Puede que la aprobación se haya anulado o que el enlace esté incompleto. Vuelve al historial de nóminas."
            accion={<BotonEnlace to={rutas.nomina()}>Ir a Nómina</BotonEnlace>}
          />
        </Card>
      </div>
    );
  return (
    <div className="pb-16" data-testid="personal-liquidacion" data-liquidacion={v.liquidacion.id}>
      <LimiteError>
        <Detalle liquidacion={v.liquidacion} lineas={v.lineas} migas={migas(v.liquidacion.numero)} />
      </LimiteError>
    </div>
  );
}

function Detalle({ liquidacion: l, lineas, migas }: { liquidacion: LiquidacionNomina; lineas: LineaConPersona[]; migas: { texto: string; a?: string }[] }) {
  const navegar = useNavigate();
  const acciones = useAcciones();
  const dinero = useDinero();
  const [elegida, setElegida] = useState<Id | null>(null);
  const [pagando, setPagando] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const fila = lineas.find((x) => x.linea.empleadoId === elegida) ?? null;
  const pagada = l.estado === 'pagada';

  const anular = () => {
    const r = acciones.anularAprobacionNomina({ liquidacionId: l.id });
    setAnulando(false);
    if (!r.ok) return avisar({ tipo: 'error', texto: r.error.mensaje });
    avisar({ tipo: 'exito', texto: `Aprobación de ${l.numero} anulada`, detalle: 'Puedes volver a aprobar el periodo desde Nómina.' });
    navegar(rutas.nomina(), { replace: true });
  };

  return (
    <>
      <EncabezadoPagina
        migas={migas}
        titulo={l.numero}
        eyebrow="Liquidación de nómina"
        insignia={
          pagada ? (
            <Badge tono="success" icono={CircleCheck}>
              Pagada
            </Badge>
          ) : (
            <Badge tono="warning">Aprobada · por pagar</Badge>
          )
        }
        subtitulo={`${l.periodo.etiqueta} · ${plural(lineas.length, 'persona')} · ${l.exoneracion114 ? 'con exoneración de aportes' : 'sin exoneración de aportes'}`}
        acciones={
          <>
            <BotonExportar reporte="nomina" filtros={{ liquidacionId: l.id }} />
            {!pagada && (
              <Button onClick={() => setPagando(true)} data-testid="personal-pagar">
                Pagar nómina
              </Button>
            )}
            <Menu disparador={<BotonAccionesFila aria-label={`Más acciones de ${l.numero}`} />} alinear="end">
              <ItemMenu icono={Ban} peligro deshabilitado={pagada} onSelect={() => setAnulando(true)} data-testid="personal-anular-aprobacion">
                {pagada ? 'Una nómina pagada no se anula' : 'Anular aprobación'}
              </ItemMenu>
            </Menu>
          </>
        }
      />

      <div className="mt-8 flex flex-col gap-10">
        <section aria-label="Totales" className="grid grid-cols-2 gap-4 wide:grid-cols-4" data-testid="personal-liquidacion-totales" data-costo={l.totales.costo} data-neto={l.totales.neto}>
          <Kpi etiqueta="Lo que ganan" valor={l.totales.devengado} formatear={dinero.corta} completo={dinero(l.totales.devengado)} nota="Devengado" />
          <Kpi etiqueta="Lo que se les descuenta" valor={l.totales.deducciones} formatear={dinero.corta} completo={dinero(l.totales.deducciones)} nota="Salud, pensión y retenciones" />
          <Kpi etiqueta={pagada ? 'Neto pagado' : 'Neto por pagar'} valor={l.totales.neto} formatear={dinero.corta} completo={dinero(l.totales.neto)} nota={pagada ? 'Ya salió de la cuenta' : 'Queda en lo que debes'} />
          <Kpi etiqueta="Costo para el negocio" valor={l.totales.costo} formatear={dinero.corta} completo={dinero(l.totales.costo)} destacada nota={`${dinero.corta(l.totales.aportes)} de aportes · ${dinero.corta(l.totales.provisiones)} de provisiones`} />
        </section>

        <TablaLineas lineas={lineas} totales={l.totales} alAbrir={(x) => setElegida(x.linea.empleadoId)} conPdf={l.id} etiqueta={`Personas de ${l.numero}`} />

        <section className="grid grid-cols-1 gap-6 desk:grid-cols-3" aria-label="Estado de la liquidación">
          <div className="border border-line bg-surface p-6" data-testid="personal-estado-liquidacion">
            <h2 className="t-h3 text-ink">Qué pasó con esta nómina</h2>
            <ParesDatos
              columnas={1}
              pares={[
                ['Aprobada', <span key="a"><Fecha valor={l.aprobada.ts} formato="fechaHora" /></span>],
                ['Pagada', l.pagada ? <Fecha key="p" valor={l.pagada.ts} formato="fechaHora" /> : 'Todavía no'],
                ['Cuentas por pagar', `${plural(l.cuentasPorPagarIds.length, 'cuenta')} (cada persona y la seguridad social)`],
                ['Gastos de nómina', `${plural(l.gastoIds.length, 'gasto')} por local en el estado de resultados`],
              ]}
            />
            <div className="mt-4 flex flex-wrap gap-4 t-small">
              <Link to={rutas.porPagar()} className="font-bold text-ink underline underline-offset-4">
                Ver lo que debo
              </Link>
              <Link to={rutas.gastos({ mes: l.periodo.fin.slice(0, 7) })} className="font-bold text-ink underline underline-offset-4">
                Ver los gastos del mes
              </Link>
            </div>
          </div>
          <div className="border border-line bg-surface p-6" data-testid="personal-nomina-electronica">
            <h2 className="t-h3 text-ink">{TEXTOS_FIJOS.nominaElectronica}</h2>
            {l.nominaElectronica ? (
              <ParesDatos
                columnas={1}
                pares={[
                  ['Estado', <BadgeEstado key="s" estado={ESTADO_NOMINA_ELECTRONICA.transmitida_simulada} />],
                  ['Enviada', <Fecha key="e" valor={l.nominaElectronica.ts} formato="fechaHora" />],
                  ['Código único (CUNE)', <span key="c" className="break-all font-mono t-small">{l.nominaElectronica.cune}</span>],
                ]}
              />
            ) : (
              <p className="mt-3 t-body text-muted">Esta liquidación solo tiene contratistas: no genera nómina electrónica.</p>
            )}
          </div>
          <div className="border border-line bg-surface p-6" data-testid="personal-parametros-usados">
            <h2 className="t-h3 text-ink">Parámetros con los que se calculó</h2>
            <ParesDatos
              columnas={1}
              pares={[
                ['Salario mínimo', <Dinero key="s" valor={l.parametros.smmlv} />],
                ['Auxilio de transporte', <Dinero key="a" valor={l.parametros.auxilioTransporte} />],
                ['Horas del mes para la hora', `${numero(l.parametros.divisorHorasMes ?? (l.parametros.jornadaMaximaSemanal.horas / 6) * 30)} h`],
                ['Exoneración de aportes', l.exoneracion114 ? 'Sí' : 'No'],
              ]}
            />
            <p className="mt-3 t-small text-muted">Valor ilustrativo · verificar.</p>
          </div>
        </section>
        <NotaNomina />
      </div>

      <CajonLinea fila={fila} parametros={l.parametros} periodo={l.periodo.etiqueta} liquidacionId={l.id} alCerrar={() => setElegida(null)} />
      {pagando && <DialogoPago liquidacion={l} alCerrar={() => setPagando(false)} />}
      <ConfirmarEliminacion
        abierto={anulando}
        alCambiar={setAnulando}
        pregunta={`¿Anular la aprobación de ${l.numero}?`}
        consecuencias={
          <>
            Se borran la liquidación, sus {plural(l.cuentasPorPagarIds.length, 'cuenta por pagar', 'cuentas por pagar')} y sus {plural(l.gastoIds.length, 'gasto')} de nómina. Los desprendibles dejan de existir hasta que vuelvas a aprobar el periodo con valores nuevos.
          </>
        }
        accion="Anular aprobación"
        alConfirmar={anular}
      />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Pagar la nómina
// ---------------------------------------------------------------------------------------------------------
function DialogoPago({ liquidacion: l, alCerrar }: { liquidacion: LiquidacionNomina; alCerrar: () => void }) {
  const hoy = useHoy();
  const acciones = useAcciones();
  const saldos = useSel(selSaldosCuentas);
  const dinero = useDinero();
  // La cuenta de arranque es la primera con saldo para toda la nómina; si ninguna alcanza, la de mayor saldo.
  const inicial = saldos.cuentas.find((c) => c.saldo >= l.totales.neto) ?? [...saldos.cuentas].sort((a, b) => b.saldo - a.saldo)[0];
  const [fecha, setFecha] = useState<string | null>(hoy);
  const [cuentaId, setCuentaId] = useState<Id | null>(inicial?.cuenta.id ?? null);
  const [errores, setErrores] = useState<Partial<Record<'fecha' | 'cuentaId', string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const cuenta = saldos.cuentas.find((c) => c.cuenta.id === cuentaId);

  const pagar = () => {
    const e = validarPagoNomina({ fecha, cuentaId });
    setErrores(e);
    setErrorGeneral(null);
    if (Object.keys(e).length > 0) return;
    const r = acciones.pagarNomina({ liquidacionId: l.id, fecha: fecha as string, cuentaId: cuentaId as Id });
    if (!r.ok) {
      if (r.error.campo === 'fecha' || r.error.campo === 'cuentaId') setErrores({ [r.error.campo]: r.error.mensaje });
      else setErrorGeneral(r.error.mensaje);
      return;
    }
    avisar({ tipo: 'exito', texto: `Nómina ${l.numero} pagada`, detalle: `${dinero(l.totales.neto)} salieron de ${cuenta?.cuenta.nombre ?? 'la cuenta'}` });
    alCerrar();
  };

  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Nómina"
      titulo={`Pagar ${l.numero}`}
      descripcion="Se paga el neto de cada persona desde una sola cuenta. La seguridad social (PILA) se paga aparte, desde lo que debes."
      ancho="md"
      data-testid="personal-dialogo-pagar"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={pagar} data-testid="personal-confirmar-pago">
            Pagar {dinero.corta(l.totales.neto)}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <SelectorFecha etiqueta="Fecha del pago" hoy={hoy} valor={fecha} alCambiar={setFecha} error={errores.fecha} enModal />
        <Select
          etiqueta="¿De dónde sale la plata?"
          placeholder="Elige una cuenta"
          valor={cuentaId}
          alCambiar={setCuentaId}
          enModal
          error={errores.cuentaId}
          opciones={saldos.cuentas.map((c) => ({ valor: c.cuenta.id, etiqueta: c.cuenta.nombre }))}
          ayuda={
            cuenta ? (
              <>
                Saldo hoy: <Dinero valor={cuenta.saldo} />
              </>
            ) : undefined
          }
        />
        <p className="col-span-2 border border-line bg-surface-2 px-4 py-3 t-body text-ink-2">
          Se pagan <Dinero valor={l.totales.neto} className="font-bold text-ink" /> a {plural(l.lineas.length, 'persona')}.
        </p>
        {errorGeneral && (
          <p role="alert" className="col-span-2 border border-danger bg-danger-soft px-4 py-3 t-body text-ink" data-testid="personal-error-pago">
            {errorGeneral}
          </p>
        )}
      </div>
    </Dialog>
  );
}

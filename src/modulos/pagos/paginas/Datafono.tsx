import { CreditCard, Hourglass } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import type { AbonoDatafono, MesISO } from '@/dominio/tipos';
import { useAcciones, useDinero, useHoy, useSel } from '@/estado';
import { capital, selConciliacionDatafono, selSaldosCuentas } from '@/selectores';
import { mesAnio, mesCorto, porcentaje } from '@/lib/formato';
import { avisar, Badge, BotonExportar, Button, Card, Dinero, EmptyState, Fecha, GraficoCascada, GraficoDinero, NotaLegal, Select, Table, type ColumnaTabla } from '@/ui';
import { comisionEfectiva, mesesHasta, pasosDatafono, totalRetenciones } from '../calculos';
import { EncabezadoPagos } from '../componentes/EncabezadoPagos';
import { useLocalEfectivo, useNombresLocales } from '../hooks';
import { selAbonosPendientes, selDatafonoMeses, type AbonoPendiente, type MesDatafono } from '../selectores';
import { TXT } from '../textos';

/** Datáfono: "vendiste $ X con tarjeta, te consignaron $ Y", con la comisión y las retenciones ilustrativas. */
export default function Datafono() {
  const p = useParamsRuta('datafono');
  const navegar = useNavigate();
  const hoy = useHoy();
  const dinero = useDinero();
  const acciones = useAcciones();
  const nombres = useNombresLocales();
  const mesActual = hoy.slice(0, 7);
  const mes: MesISO = p.mes ?? mesActual;
  const localId = useLocalEfectivo(p.local);
  const cuentas = useSel(selSaldosCuentas).cuentas;
  const nombreCuenta = (id: string) => cuentas.find((c) => c.cuenta.id === id)?.cuenta.nombre ?? id;

  const c = useSel(selConciliacionDatafono, { mes, localId });
  const meses = useSel(selDatafonoMeses, { mes, localId, n: 6 });
  const pendientes = useSel(selAbonosPendientes, { hoy, mes, localId });
  const cuentaBanco = cuentas.find((x) => x.cuenta.tipo === 'banco')?.cuenta.id ?? '';

  const retenciones = totalRetenciones(c.abonado.retenciones);
  const efectiva = comisionEfectiva(c.abonado.comision, c.abonado.bruto);
  const pasos = useMemo(() => pasosDatafono(c), [c]);
  const hayCobros = c.vendido > 0;

  const ir = (nuevoMes: MesISO, local: string | null) => navegar(rutas.datafono({ mes: nuevoMes, local }), { replace: true });
  const opcionesMes = [...mesesHasta(mesActual, 12)].reverse().map((m) => ({ valor: m, etiqueta: capital(mesAnio(m)) }));
  const opcionesLocal = [{ valor: 'todos', etiqueta: 'Todos los locales' }, ...Object.entries(nombres).map(([valor, etiqueta]) => ({ valor, etiqueta }))];

  const registrar = (a: AbonoPendiente) => {
    const r = acciones.registrarAbonoDatafono({ localId: a.localId, ventasDe: a.ventasDe, fecha: a.llegaEl > hoy ? hoy : a.llegaEl, cuentaDestinoId: cuentaBanco });
    if (!r.ok) {
      avisar({ tipo: 'error', texto: r.error.mensaje });
      return;
    }
    avisar({ tipo: 'exito', texto: `Registraste el abono de ${nombres[a.localId] ?? a.localId}`, detalle: `Llegaron ${dinero(a.estimado.neto)} netos a ${nombreCuenta(cuentaBanco)}.` });
  };

  const colMeses: ColumnaTabla<MesDatafono>[] = [
    { id: 'mes', encabezado: 'Mes', celda: (m) => <span className="t-body font-semibold text-ink">{capital(mesAnio(m.mes))}</span>, ordenar: (m) => m.mes },
    { id: 'vendido', encabezado: 'Vendido con tarjeta', numerica: true, celda: (m) => <Dinero valor={m.vendido} />, ordenar: (m) => m.vendido },
    { id: 'comision', encabezado: 'Comisión', numerica: true, celda: (m) => <Dinero valor={m.comision} />, ordenar: (m) => m.comision },
    { id: 'retenciones', encabezado: 'Retenciones', numerica: true, celda: (m) => <Dinero valor={m.retenciones} />, ordenar: (m) => m.retenciones },
    { id: 'consignado', encabezado: 'Te consignaron', numerica: true, celda: (m) => <Dinero valor={m.consignado} className="font-semibold" />, ordenar: (m) => m.consignado },
    { id: 'pendiente', encabezado: 'Sin abonar', numerica: true, celda: (m) => (m.pendiente > 0 ? <Dinero valor={m.pendiente} /> : <span className="text-subtle">—</span>), ordenar: (m) => m.pendiente },
  ];

  const colAbonos: ColumnaTabla<AbonoDatafono>[] = [
    { id: 'fecha', encabezado: 'Abonado el', celda: (a) => <Fecha valor={a.fecha} />, ordenar: (a) => a.fecha, ancho: 120 },
    { id: 'ventas', encabezado: 'Ventas del', celda: (a) => <Fecha valor={a.ventasDe} />, ordenar: (a) => a.ventasDe, ancho: 120 },
    { id: 'local', encabezado: 'Local', celda: (a) => <span className="t-small text-ink-2">{nombres[a.localId] ?? a.localId}</span>, ordenar: (a) => a.localId },
    { id: 'bruto', encabezado: 'Cobrado', numerica: true, celda: (a) => <Dinero valor={a.bruto} />, ordenar: (a) => a.bruto },
    { id: 'comision', encabezado: 'Comisión', numerica: true, celda: (a) => <Dinero valor={a.comision} />, ordenar: (a) => a.comision },
    { id: 'retenciones', encabezado: 'Retenciones', numerica: true, celda: (a) => <Dinero valor={totalRetenciones(a.retenciones)} />, ordenar: (a) => totalRetenciones(a.retenciones) },
    { id: 'neto', encabezado: 'Te consignaron', numerica: true, celda: (a) => <Dinero valor={a.neto} className="font-semibold" />, ordenar: (a) => a.neto },
  ];

  const colPendientes: ColumnaTabla<AbonoPendiente>[] = [
    { id: 'ventas', encabezado: 'Ventas del', celda: (a) => <Fecha valor={a.ventasDe} />, ordenar: (a) => a.ventasDe, ancho: 130 },
    { id: 'local', encabezado: 'Local', celda: (a) => <span className="t-small text-ink-2">{nombres[a.localId] ?? a.localId}</span>, ordenar: (a) => a.localId },
    { id: 'bruto', encabezado: 'Cobrado con tarjeta', numerica: true, celda: (a) => <Dinero valor={a.bruto} />, ordenar: (a) => a.bruto },
    { id: 'estimado', encabezado: 'Llegaría neto', numerica: true, celda: (a) => <Dinero valor={a.estimado.neto} className="font-semibold" />, ordenar: (a) => a.estimado.neto },
    {
      id: 'accion',
      encabezado: <span className="sr-only">Registrar</span>,
      alinear: 'der',
      ancho: 190,
      celda: (a) =>
        a.vencido ? (
          <Button variante="secondary" tamano="sm" onClick={() => registrar(a)} data-testid="registrar-abono">
            Registrar abono
          </Button>
        ) : (
          <Badge tono="outline" tamano="sm" icono={Hourglass}>
            Llega el <Fecha valor={a.llegaEl} formato="corta" />
          </Badge>
        ),
    },
  ];

  return (
    <>
      <EncabezadoPagos
        titulo="Datáfono"
        subtitulo={TXT.datafono.subtitulo}
        migaActual="Datáfono"
        acciones={
          <>
            <Select etiqueta="Mes" etiquetaOculta tamano="sm" valor={mes} alCambiar={(v) => ir(v, p.local)} opciones={opcionesMes} ancho={200} data-testid="datafono-mes" />
            <Select etiqueta="Local" etiquetaOculta tamano="sm" valor={localId} alCambiar={(v) => ir(mes, v)} opciones={opcionesLocal} ancho={200} data-testid="datafono-local" />
            <BotonExportar reporte="cuentas" filtros={{ localId }} menu formatos={['excel']} />
          </>
        }
      />

      {!hayCobros ? (
        <div className="mt-8 border border-line bg-surface">
          <EmptyState icono={CreditCard} titulo={`Sin cobros con tarjeta en ${mesAnio(mes)}`} texto="Cuando vendas con el datáfono, aquí verás lo cobrado, la comisión, las retenciones y lo que te consignaron." />
        </div>
      ) : (
        <>
          <section className="mt-8 grid grid-cols-1 gap-6 desk:grid-cols-12" aria-label="Lo vendido y lo consignado">
            <Card className="desk:col-span-5" padding="normal" data-testid="datafono-resumen">
              <p className="t-eyebrow text-ink-2">{capital(mesAnio(mes))}</p>
              <p className="mt-4 t-body text-ink-2">Vendiste</p>
              <p className="t-kpi num text-ink" data-testid="datafono-vendido">
                <Dinero valor={c.vendido} />
              </p>
              <p className="mt-1 t-body text-ink-2">con tarjeta, y te consignaron</p>
              <p className="t-kpi num text-ink" data-testid="datafono-consignado">
                <Dinero valor={c.abonado.neto} />
              </p>
              <dl className="mt-6 divide-y divide-line-soft border-y border-line-soft">
                <div className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="t-body text-ink">
                    Comisión del datáfono{efectiva !== null && <span className="ml-2 t-small text-muted">{porcentaje(efectiva)} de lo cobrado</span>}
                  </dt>
                  <dd className="t-body font-semibold num text-ink" data-testid="datafono-comision">
                    <Dinero valor={c.abonado.comision} />
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="t-body text-ink">
                    Retenciones que puedes descontar<span className="ml-2 t-small text-muted">(ilustrativas)</span>
                  </dt>
                  <dd className="t-body font-semibold num text-ink" data-testid="datafono-retenciones">
                    <Dinero valor={retenciones} />
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="t-body text-ink">Aún sin abonar</dt>
                  <dd className="t-body font-semibold num text-ink" data-testid="datafono-pendiente">
                    <Dinero valor={c.pendientePorAbonar} />
                  </dd>
                </div>
              </dl>
              <p className="mt-4 max-w-[48ch] border-l-2 border-accent pl-3 t-small text-ink">
                Te cobraron <Dinero valor={c.abonado.comision} /> de comisión y te retuvieron <Dinero valor={retenciones} /> que tu contador puede tomar como descuento en tus impuestos.
                {c.pendientePorAbonar > 0 && (
                  <>
                    {' '}
                    Todavía faltan <Dinero valor={c.pendientePorAbonar} /> por llegar al banco.
                  </>
                )}
              </p>
            </Card>
            <Card className="min-w-0 desk:col-span-7" padding="normal" titulo="De lo vendido a lo consignado">
              <div className="pt-6">
                <GraficoCascada pasos={pasos} formato={(n) => dinero.corta(n)} alto={280} />
              </div>
              <p className="mt-4 max-w-[72ch] t-small text-muted">
                La comisión y las retenciones se calculan sobre cada cobro con tarjeta: débito y crédito pagan comisiones distintas, y las retenciones se calculan sobre el valor sin IVA. El abono llega el siguiente día hábil.
              </p>
            </Card>
          </section>

          <section className="mt-10" aria-label="Pendiente por abonar" data-testid="datafono-pendientes">
            <h2 className="t-h2 text-ink">Pendiente por abonar</h2>
            <p className="mt-1 mb-4 max-w-[72ch] t-small text-muted">Ventas con tarjeta cuyo abono todavía no está registrado. Cuando lo veas en el banco, regístralo y la plata pasa de “datáfono por abonar” a tu cuenta.</p>
            <Table
              etiqueta="Abonos pendientes del datáfono"
              columnas={colPendientes}
              filas={pendientes}
              clave={(a) => a.clave}
              sustantivo={['día', 'días']}
              porPagina={0}
              ordenInicial={{ id: 'ventas', dir: 'desc' }}
              vacio={<EmptyState tamano="tabla" icono={CreditCard} titulo="Todo lo cobrado ya se abonó" texto="No hay ventas con tarjeta esperando su abono en este mes." />}
            />
          </section>
        </>
      )}

      <section className="mt-10" aria-label="Mes a mes">
        <h2 className="t-h2 text-ink">Mes a mes</h2>
        <div className="mt-4 border border-line bg-surface p-6">
          <GraficoDinero
            tipo="barras"
            titulo="Vendido con tarjeta y consignado"
            lectura="La diferencia de cada mes es la comisión, las retenciones y lo que todavía no se abona."
            datos={meses.map((m) => ({ mes: m.mes, vendido: m.vendido, consignado: m.consignado }))}
            x="mes"
            series={[
              { clave: 'vendido', nombre: 'Vendido', color: 2 },
              { clave: 'consignado', nombre: 'Consignado', color: 1 },
            ]}
            formatoX={mesCorto}
            destacarX={mes}
            alto={260}
            sinTabla
            data-testid="datafono-grafico"
          />
        </div>
        <Table className="mt-4" etiqueta="Datáfono por mes" columnas={colMeses} filas={[...meses].reverse()} clave={(m) => m.mes} porPagina={0} sustantivo={['mes', 'meses']} data-testid="tabla-datafono-meses" />
      </section>

      <section className="mt-10" aria-label="Abonos del mes">
        <h2 className="t-h2 text-ink">Abonos de {mesAnio(mes)}</h2>
        <Table
          className="mt-4"
          etiqueta="Abonos del datáfono"
          columnas={colAbonos}
          filas={c.abonos}
          clave={(a) => a.id}
          sustantivo={['abono', 'abonos']}
          porPagina={25}
          ordenInicial={{ id: 'fecha', dir: 'desc' }}
          totales={{ bruto: <Dinero valor={c.abonado.bruto} />, comision: <Dinero valor={c.abonado.comision} />, retenciones: <Dinero valor={retenciones} />, neto: <Dinero valor={c.abonado.neto} /> }}
          data-testid="tabla-abonos"
          vacio={<EmptyState tamano="tabla" icono={CreditCard} titulo="Sin abonos en este mes" texto="Cuando el datáfono consigne lo cobrado, cada abono aparece aquí con su comisión y sus retenciones." />}
        />
      </section>
      <NotaLegal tipo="tributario" className="mt-4" />
    </>
  );
}

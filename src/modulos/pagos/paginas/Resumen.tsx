import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { useAhora, useDinero, useHoy, useSel } from '@/estado';
import { selConciliacionDatafono, selPendientesConciliar } from '@/selectores';
import { entero, plural, relativaDias } from '@/lib/formato';
import { Badge, BotonEnlace, BotonExportar, Card, Dinero, EncabezadoSeccion, GraficoDinero, Kpi, NotaLegal, Table, Termino, type ColumnaTabla } from '@/ui';
import { diaMesCorto, diaYMes } from '../calculos';
import { EncabezadoPagos } from '../componentes/EncabezadoPagos';
import { useLocalEfectivo } from '../hooks';
import { selFlujoDetalle, selResumenPagos, type ResumenLocalPagos } from '../selectores';
import { TXT } from '../textos';

/** Resumen "Lo que debo y me deben": las cifras de los tres locales y lo que pide atención. */
export default function Resumen() {
  const p = useParamsRuta('pagos');
  const hoy = useHoy();
  const hora = useAhora().slice(11, 16);
  const d = useDinero();
  const localId = useLocalEfectivo(p.local);
  const resumen = useSel(selResumenPagos, { hoy });
  const flujo = useSel(selFlujoDetalle, { dias: 90, hoy, hora });
  const flujo30 = useSel(selFlujoDetalle, { dias: 30, hoy, hora });
  const pendientes = useSel(selPendientesConciliar);
  const datafono = useSel(selConciliacionDatafono, { mes: hoy.slice(0, 7), localId: 'todos' });

  const fila = localId === 'todos' ? null : resumen.filas.find((f) => f.localId === localId);
  const cifras = fila ?? resumen.total;
  const bajo = flujo.flujo.puntoBajo;

  const columnas: ColumnaTabla<ResumenLocalPagos>[] = [
    {
      id: 'local',
      encabezado: 'Local',
      celda: (f) => (
        <span className="flex items-center gap-2 t-body font-semibold text-ink">
          {f.nombre}
          {f.localId !== null && f.localId === localId && (
            <Badge tono="accent" tamano="sm">
              Filtro activo
            </Badge>
          )}
        </span>
      ),
    },
    { id: 'disponible', encabezado: 'Plata disponible', numerica: true, celda: (f) => <Dinero valor={f.disponible} />, ancho: 130 },
    { id: 'cobrar', encabezado: 'Plata que me deben', numerica: true, celda: (f) => (f.nPorCobrar ? <Dinero valor={f.porCobrar} /> : <span className="text-subtle">—</span>), ancho: 150 },
    {
      id: 'pagar',
      encabezado: 'Lo que debo',
      numerica: true,
      celda: (f) =>
        f.nPorPagar ? (
          <span className="flex flex-col items-end">
            <Dinero valor={f.porPagar} />
            {f.vencido > 0 && <span className="t-small text-danger">{d(f.vencido)} vencido</span>}
          </span>
        ) : (
          <span className="text-subtle">—</span>
        ),
      ancho: 150,
    },
    { id: 'tarjeta', encabezado: 'Con tarjeta (mes)', numerica: true, celda: (f) => (f.tarjetaMes ? <Dinero valor={f.tarjetaMes} /> : <span className="text-subtle">—</span>), ancho: 150 },
    { id: 'consignado', encabezado: 'Consignado (mes)', numerica: true, celda: (f) => (f.consignadoMes ? <Dinero valor={f.consignadoMes} /> : <span className="text-subtle">—</span>), ancho: 150 },
  ];

  return (
    <>
      <EncabezadoPagos
        titulo={TXT.pagos.titulo}
        subtitulo={TXT.pagos.subtitulo}
        acciones={
          <>
            <BotonExportar reporte="cuentas" filtros={{ localId }} menu />
            <BotonEnlace to={rutas.flujo()} data-testid="ir-flujo">
              Ver el flujo de caja
            </BotonEnlace>
          </>
        }
      />

      <div className="mt-8 grid grid-cols-2 gap-4 desk:grid-cols-4" data-testid="pagos-kpis">
        <Kpi etiqueta={<Termino id="cajaYBancos" sinTecnico sinDefinicion />} valor={cifras.disponible} formatear={d.corta} completo={d(cifras.disponible)} nota={fila ? `Caja de ${fila.nombre}` : 'En cajas, banco y billeteras'} a={rutas.cuentas()} data-testid="kpi-disponible" />
        <Kpi etiqueta={<Termino id="porPagar" sinTecnico sinDefinicion />} valor={cifras.porPagar} formatear={d.corta} completo={d(cifras.porPagar)} nota={cifras.vencido > 0 ? `${d.corta(cifras.vencido)} ya vencido` : `${plural(cifras.nPorPagar, 'cuenta', 'cuentas')} por pagar`} a={rutas.porPagar()} data-testid="kpi-debo" />
        <Kpi etiqueta={<Termino id="porCobrar" sinTecnico sinDefinicion />} valor={cifras.porCobrar} formatear={d.corta} completo={d(cifras.porCobrar)} nota={`${plural(cifras.nPorCobrar, 'saldo', 'saldos')} de clientes`} a={rutas.porCobrar()} data-testid="kpi-me-deben" />
        <Kpi
          etiqueta="Tu punto más bajo (90 días)"
          valor={bajo.saldo}
          formatear={d.corta}
          completo={d(bajo.saldo)}
          nota={`${diaYMes(bajo.fecha)} · ${relativaDias(bajo.fecha, hoy)}`}
          destacada
          a={rutas.flujo()}
          data-testid="kpi-punto-bajo"
        />
      </div>

      <section className="mt-10" aria-label="Los locales">
        <EncabezadoSeccion titulo="Local por local" />
        <Table
          etiqueta="Pagos por local"
          columnas={columnas}
          filas={resumen.filas}
          clave={(f) => f.localId ?? 'general'}
          porPagina={0}
          sustantivo={['local', 'locales']}
          totales={{
            local: <span className="t-label">Todo el negocio</span>,
            disponible: <Dinero valor={resumen.total.disponible} />,
            cobrar: <Dinero valor={resumen.total.porCobrar} />,
            pagar: <Dinero valor={resumen.total.porPagar} />,
            tarjeta: <Dinero valor={resumen.total.tarjetaMes} />,
            consignado: <Dinero valor={resumen.total.consignadoMes} />,
          }}
          data-testid="tabla-resumen-locales"
        />
        <p className="mt-3 max-w-[72ch] t-small text-muted">
          La plata de cada local es la de su caja. El banco, las billeteras, las importaciones, la nómina y los impuestos son del negocio en general, por eso van en su propia fila.
        </p>
      </section>

      <section className="mt-10" aria-label="Lo que pide atención">
        <EncabezadoSeccion titulo="Requiere tu atención" />
        <div className="grid grid-cols-2 gap-4 desk:grid-cols-4" data-testid="pagos-atencion">
          <Kpi
            etiqueta="Cuentas vencidas"
            valor={resumen.total.vencido}
            formatear={d.corta}
            completo={d(resumen.total.vencido)}
            nota={resumen.total.vencido > 0 ? 'Pagos que ya pasaron su fecha' : 'Estás al día con tus pagos'}
            a={rutas.porPagar({ estado: 'vencido' })}
            data-testid="atencion-vencidas"
          />
          <Kpi
            etiqueta="Separados por vencer"
            valor={resumen.separadosPorVencer}
            formatear={entero}
            nota="Vencen en los próximos 7 días"
            a={rutas.porCobrar({ filtro: 'separados-por-vencer' })}
            data-testid="atencion-separados"
          />
          <Kpi etiqueta="Por conciliar" valor={pendientes.length} formatear={entero} nota="Pagos y movimientos sin marcar" a={rutas.conciliacion()} data-testid="atencion-conciliar" />
          <Kpi etiqueta="Datáfono sin abonar" valor={datafono.pendientePorAbonar} formatear={d.corta} completo={d(datafono.pendientePorAbonar)} nota="Cobrado con tarjeta que aún no llega" a={rutas.datafono()} data-testid="atencion-datafono" />
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-6 desk:grid-cols-12" aria-label="Flujo de caja">
        <Card className="desk:col-span-7" titulo="Tu saldo en los próximos 30 días" accion={<BotonEnlace to={rutas.flujo({ dias: '30' })} variante="link">Ver el flujo completo</BotonEnlace>} data-testid="resumen-flujo">
          <GraficoDinero
            tipo="linea"
            datos={flujo30.filas}
            x="fecha"
            series={[
              { clave: 'real', nombre: 'Saldo real', color: 1 },
              { clave: 'proyectado', nombre: 'Saldo proyectado', punteada: true },
            ]}
            formatoX={diaMesCorto}
            alto={220}
            sinTabla
          />
        </Card>
        <Card className="desk:col-span-5" titulo="Lo que dice tu flujo de caja">
          <p className="max-w-[44ch] border-l-2 border-accent pl-3 t-body text-ink" data-testid="resumen-explicacion">
            {flujo.flujo.explicacion}
          </p>
          <BotonEnlace to={rutas.flujo({ semana: flujo.semanaBajo?.lunes ?? null })} variante="secondary" tamano="sm" className="mt-5">
            Ver los pagos de esa semana
          </BotonEnlace>
        </Card>
      </section>
      <NotaLegal tipo="tributario" className="mt-6" />
    </>
  );
}

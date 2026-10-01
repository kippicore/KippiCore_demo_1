import { Users } from 'lucide-react';
import { useState } from 'react';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { useHoy, useSel } from '@/estado';
import { entero, numero, porcentaje } from '@/lib/formato';
import { Badge, BotonEnlace, Card, type ColumnaTabla, Dinero, EmptyState, Kpi, Table } from '@/ui';
import { rangoDePeriodo } from '../calculos';
import { EncabezadoAnalisis } from '../componentes/EncabezadoAnalisis';
import { BarrasHorizontales, CabezaSeccion, LimiteErrores, SelectorPeriodo, type FilaBarra } from '../componentes/Piezas';
import { selClientesPeriodo, selMediosComparados, type FilaSegmentoPeriodo } from '../selectores';
import { MEDIOS_DIGITALES, NOMBRES_CANAL, NOMBRES_MEDIO, type IdPeriodo } from '../textos';

/**
 * Análisis · Clientes (PRD 7.12, P9, P11): qué proporción de las ventas es a consumidor final, cuántos clientes son
 * nuevos y cuántos recurrentes, ticket por segmento, por dónde compran y cómo pagan hoy frente a hace un año.
 */
export default function Clientes() {
  const { resaltar } = useParamsRuta('analisisClientes');
  const hoy = useHoy();
  const [periodo, setPeriodo] = useState<IdPeriodo>('12m');
  const rango = rangoDePeriodo(hoy, periodo);
  const c = useSel(selClientesPeriodo, { ...rango, hoy });
  const medios = useSel(selMediosComparados, { hoy });

  const registrados = 1 - c.consumidorFinal;
  const totalClientes = c.nuevos + c.recurrentes;
  const valorRegistrados = c.valorNuevos + c.valorRecurrentes;

  const filasCliente: FilaBarra[] = [
    {
      id: 'nuevos',
      etiqueta: 'Nuevos',
      valor: c.nuevos,
      texto: `${entero(c.nuevos)} clientes`,
      nota: (
        <span>
          Compraron por primera vez: <Dinero valor={c.valorNuevos} corta />
        </span>
      ),
    },
    {
      id: 'recurrentes',
      etiqueta: 'Recurrentes',
      valor: c.recurrentes,
      texto: `${entero(c.recurrentes)} clientes`,
      tono: 'destacado',
      nota: (
        <span>
          Ya habían comprado antes: <Dinero valor={c.valorRecurrentes} corta />
        </span>
      ),
    },
  ];

  const filasCanal: FilaBarra[] = c.canales.map((x) => ({
    id: x.id,
    etiqueta: NOMBRES_CANAL[x.id] ?? x.id,
    valor: x.valor,
    texto: porcentaje(x.participacion, 0),
    nota: (
      <span>
        {entero(x.ventas)} ventas · <Dinero valor={x.valor} corta />
      </span>
    ),
    tono: x === c.canales[0] ? 'destacado' : 'normal',
  }));

  const filasMedio: FilaBarra[] = medios.filas
    .filter((m) => m.ahora > 0 || (m.antes ?? 0) > 0)
    .map((m) => {
      const digital = (MEDIOS_DIGITALES as readonly string[]).includes(m.medio);
      return {
        id: m.medio,
        etiqueta: NOMBRES_MEDIO[m.medio] ?? m.medio,
        valor: m.ahora,
        texto: porcentaje(m.ahora, 0),
        nota: m.antes !== null ? `Hace un año: ${porcentaje(m.antes, 0)}` : undefined,
        tono: digital ? 'destacado' : 'normal',
        insignia:
          m.antes !== null && m.ahora - m.antes >= 0.03 ? (
            <Badge tono="success" tamano="sm">
              Sube
            </Badge>
          ) : m.antes !== null && m.antes - m.ahora >= 0.03 ? (
            <Badge tono="neutral" tamano="sm">
              Baja
            </Badge>
          ) : undefined,
      } satisfies FilaBarra;
    });

  const columnas: ColumnaTabla<FilaSegmentoPeriodo>[] = [
    {
      id: 'segmento',
      encabezado: 'Segmento',
      ancho: 220,
      celda: (f) => (
        <span className="inline-flex items-center gap-2">
          <span className={f.id === 'consumidor_final' ? 'text-ink-2' : 'font-semibold text-ink'}>{f.etiqueta}</span>
        </span>
      ),
    },
    { id: 'clientes', encabezado: 'Clientes', numerica: true, celda: (f) => (f.id === 'consumidor_final' ? <span className="text-muted">—</span> : entero(f.clientes)) },
    { id: 'ventas', encabezado: 'Ventas', numerica: true, celda: (f) => entero(f.ventas) },
    { id: 'valor', encabezado: 'Valor vendido', numerica: true, celda: (f) => <Dinero valor={f.valor} /> },
    { id: 'ticket', encabezado: 'Ticket promedio', numerica: true, celda: (f) => <strong className="font-bold"><Dinero valor={f.ticket} /></strong> },
    { id: 'participacion', encabezado: '% del valor', numerica: true, celda: (f) => porcentaje(f.participacion, 0) },
  ];

  return (
    <>
      <EncabezadoAnalisis
        titulo="Clientes"
        subtitulo="Quiénes te compran, cuántos vuelven, por dónde llegan y cómo te pagan."
        migaActual="Clientes"
        acciones={
          <div className="flex flex-wrap items-center gap-3">
            <SelectorPeriodo valor={periodo} alCambiar={setPeriodo} etiqueta="Período de los clientes" testid="clientes-periodo" />
            <BotonEnlace to={rutas.clientes()} variante="secondary" tamano="sm" icono={Users} data-testid="clientes-ver">
              Ver a tus clientes
            </BotonEnlace>
          </div>
        }
      />

      {c.ventas === 0 ? (
        <Card padding="ninguno" className="mt-8">
          <EmptyState icono={Users} titulo="Sin ventas en el período" texto="Elige un período más largo para ver cómo se comportan tus clientes." />
        </Card>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          <div className="grid grid-cols-2 gap-4 desk:grid-cols-4" data-testid="clientes-kpis">
            <Kpi etiqueta="Ventas del período" valor={c.ventas} formatear={(n) => entero(n)} nota={<Dinero valor={c.valor} corta />} data-testid="clientes-kpi-ventas" />
            <Kpi
              etiqueta="Con cliente registrado"
              valor={registrados}
              formatear={(n) => porcentaje(n, 0)}
              nota={`${porcentaje(c.consumidorFinal, 0)} fueron a consumidor final`}
              data-testid="clientes-kpi-registrados"
            />
            <Kpi etiqueta="Clientes que compraron" valor={totalClientes} formatear={(n) => entero(n)} nota={`${entero(c.nuevos)} nuevos · ${entero(c.recurrentes)} recurrentes`} data-testid="clientes-kpi-clientes" />
            <Kpi etiqueta="Compras por cliente" valor={c.comprasPorCliente} formatear={(n) => numero(n, 1)} nota="En promedio, en el período" data-testid="clientes-kpi-frecuencia" />
          </div>

          <section aria-labelledby="titulo-consumidor" data-testid="clientes-consumidor">
            <CabezaSeccion id="titulo-consumidor" titulo="¿A quién le vendes?" texto="Una venta a consumidor final es una venta sin un cliente asociado: no sabes quién compró ni puedes escribirle después." />
            <Card padding="normal">
              <div className="flex h-4 w-full" role="img" aria-label={`${porcentaje(c.consumidorFinal, 0)} de las ventas son a consumidor final`}>
                <div className="bg-ink" style={{ width: `${String(Math.round(c.consumidorFinal * 100))}%` }} />
                <div className="flex-1 bg-accent" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-2 t-small text-ink-2">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="size-2.5 bg-ink" />
                  Consumidor final · <strong className="num text-ink">{porcentaje(c.consumidorFinal, 0)}</strong> de las ventas · ticket <Dinero valor={c.ticketConsumidorFinal} />
                </span>
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="size-2.5 bg-accent" />
                  Cliente registrado · <strong className="num text-ink">{porcentaje(registrados, 0)}</strong> de las ventas · ticket <Dinero valor={c.ticketConCliente} />
                </span>
              </div>
              <p className="mt-5 max-w-[72ch] border-l-2 border-accent pl-3 t-body text-ink" data-testid="consumidor-lectura">
                {c.consumidorFinal >= 0.5
                  ? `De cada 100 ventas, ${String(Math.round(c.consumidorFinal * 100))} son a consumidor final. Pedir el celular al cobrar te deja avisarles de una nueva colección y recordarles su cumpleaños.`
                  : `Ya sabes a quién le vendes en ${String(Math.round(registrados * 100))} de cada 100 ventas: es la base para escribirles cuando llegue una colección.`}
              </p>
            </Card>
          </section>

          <div className="grid grid-cols-1 gap-6 desk:grid-cols-2">
            <section aria-labelledby="titulo-nuevos" data-testid="clientes-nuevos">
              <CabezaSeccion id="titulo-nuevos" titulo="Nuevos y recurrentes" texto="Entre los clientes registrados que compraron en el período." />
              <Card padding="normal">
                {totalClientes === 0 ? (
                  <EmptyState tamano="compacto" icono={Users} titulo="Sin clientes registrados" texto="Todavía no hay compras con cliente asociado en este período." />
                ) : (
                  <>
                    <BarrasHorizontales filas={filasCliente} anchoEtiqueta={130} anchoTexto={120} testid="barras-nuevos-recurrentes" />
                    <p className="mt-4 max-w-[60ch] t-small text-muted" data-testid="nuevos-lectura">
                      Los recurrentes son el {porcentaje(c.recurrentes / totalClientes, 0)} de los clientes y aportan el {porcentaje(valorRegistrados > 0 ? c.valorRecurrentes / valorRegistrados : 0, 0)} de lo que compran los clientes registrados.
                    </p>
                  </>
                )}
              </Card>
            </section>

            <section aria-labelledby="titulo-canales" data-testid="clientes-canales">
              <CabezaSeccion id="titulo-canales" titulo="Por dónde compran" texto="Qué parte del valor vendido entra por cada canal." />
              <Card padding="normal">
                <BarrasHorizontales filas={filasCanal} anchoEtiqueta={130} anchoTexto={80} testid="barras-canales" />
              </Card>
            </section>
          </div>

          <section aria-labelledby="titulo-segmentos" data-testid="clientes-segmentos">
            <CabezaSeccion id="titulo-segmentos" titulo="Ticket y valor por segmento" texto="Cuánto compra, en promedio, cada tipo de cliente. El ticket es lo que vale cada venta." />
            <Table
              columnas={columnas}
              filas={c.segmentos}
              clave={(f) => f.id}
              sustantivo={['segmento', 'segmentos']}
              porPagina={0}
              resaltada={(f) => f.id === resaltar}
              totales={{ segmento: 'Total', ventas: entero(c.ventas), valor: <Dinero valor={c.valor} />, ticket: <Dinero valor={c.ventas ? Math.round(c.valor / c.ventas) : 0} /> }}
              data-testid="tabla-segmentos"
              etiqueta="Ticket y valor por segmento"
            />
          </section>

          <section aria-labelledby="titulo-pagos" data-testid="clientes-pagos">
            <CabezaSeccion id="titulo-pagos" titulo="Cómo te pagan: el último mes y hace un año" texto="Parte del valor cobrado con cada medio. Los pagos digitales van en camel: no te cobran comisión de datáfono." />
            <LimiteErrores titulo="No pudimos armar los medios de pago">
              <Card padding="normal">
                {medios.hayAnterior && medios.digitalAntes !== null && medios.digitalAhora - medios.digitalAntes >= 0.03 && (
                  <p className="mb-5 max-w-[72ch] border-l-2 border-accent pl-3 t-body text-ink" data-testid="pagos-lectura">
                    Los pagos por Nequi, Daviplata, Bre-B y transferencia pasaron del {porcentaje(medios.digitalAntes, 0)} al {porcentaje(medios.digitalAhora, 0)} de tus ventas en un año.
                  </p>
                )}
                <BarrasHorizontales filas={filasMedio} anchoEtiqueta={260} anchoTexto={80} testid="barras-medios" />
                {!medios.hayAnterior && <p className="mt-4 t-small text-muted">Aún no hay un año de historia para comparar con hace un año.</p>}
              </Card>
            </LimiteErrores>
          </section>
        </div>
      )}
    </>
  );
}

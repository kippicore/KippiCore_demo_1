import { useMemo, useState } from 'react';
import { Scale } from 'lucide-react';
import { BarraProgreso, Badge, Card, Dinero, EmptyState, Fecha, GraficoDinero, Switch, Table, Termino, type ColumnaTabla } from '@/ui';
import { diasDelMes } from '@/lib/fechas';
import { useSel } from '@/estado';
import { mesAnio, porcentaje } from '@/lib/formato';
import { analizarEquilibrio, ritmoNecesario, type AnalisisEquilibrio, type Frase } from '../calculos';
import { EncabezadoGastos, FraseVista, LimiteError, SelectorMes } from '../componentes/Piezas';
import { useFiltrosMesLocal } from '../hooks';
import { selEquilibrioLocales, type FilaEquilibrio } from '../selectores';
import { TEXTOS } from '../textos';

export default function Equilibrio() {
  const f = useFiltrosMesLocal('puntoEquilibrio');
  const [repartir, setRepartir] = useState(false);
  return (
    <>
      <EncabezadoGastos
        titulo={TEXTOS.equilibrio.titulo}
        subtitulo={TEXTOS.equilibrio.subtitulo}
        migaFinal="Punto de equilibrio"
        mes={f.mes}
        local={f.localDeLaUrl ? f.local : null}
      />
      <LimiteError>
        <CuerpoEquilibrio f={f} repartir={repartir} setRepartir={setRepartir} />
      </LimiteError>
    </>
  );
}

interface FilaAnalizada {
  fila: FilaEquilibrio;
  analisis: AnalisisEquilibrio;
}

function TarjetaEquilibrio({ x, enCurso, hoy, diasMes, resaltada }: { x: FilaAnalizada; enCurso: boolean; hoy: string; diasMes: number; resaltada: boolean }) {
  const { fila, analisis } = x;
  const diasRestantes = enCurso ? diasMes - Number(hoy.slice(8, 10)) : 0;
  const ritmo = analisis.situacion === 'por_debajo' && enCurso ? ritmoNecesario(analisis.falta, diasRestantes) : null;
  return (
    <Card className={resaltada ? 'border-ink' : undefined} data-testid={`equilibrio-tarjeta-${fila.id}`}>
      <p className="t-eyebrow text-ink-2">{fila.nombre}</p>
      {analisis.situacion === 'sin_margen' || fila.ventasEquilibrio === null ? (
        <p className="mt-3 t-body text-ink-2">Con los costos de este mes, cada venta no deja margen: no se puede calcular un punto de equilibrio.</p>
      ) : (
        <>
          <p className="mt-3 t-kpi text-ink" data-testid={`equilibrio-minimo-${fila.id}`}>
            <Dinero valor={fila.ventasEquilibrio} corta />
          </p>
          <p className="mt-1 t-small text-muted">
            Lo que tiene que vender al mes, sin IVA
            {analisis.ventasPorDia ? (
              <>
                {' '}
                · cerca de <Dinero valor={analisis.ventasPorDia} corta /> al día
              </>
            ) : null}
          </p>
          <div className="mt-5">
            <BarraProgreso
              valor={fila.ventasEquilibrio > 0 ? fila.ventasNetasMes / fila.ventasEquilibrio : 0}
              etiqueta="Lo que lleva vendido"
              meta
              detalle={
                <span className="inline-flex items-baseline gap-1">
                  <Dinero valor={fila.ventasNetasMes} corta /> <span className="text-muted">de</span> <Dinero valor={fila.ventasEquilibrio} corta />
                </span>
              }
            />
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {analisis.situacion === 'por_encima' ? (
              <>
                <span>
                  <Badge tono="success">Ya cubre sus gastos fijos</Badge>
                </span>
                <p className="t-body text-ink-2">
                  {fila.diaEquilibrio ? (
                    <>
                      Los cubrió el <Fecha valor={fila.diaEquilibrio} formato="corta" />: desde ahí, cada venta del mes es ganancia antes de los demás gastos.
                    </>
                  ) : (
                    'Sus ventas del mes superan el mínimo.'
                  )}{' '}
                  {analisis.colchon !== null && analisis.colchon > 0 && (
                    <>Podría vender hasta {porcentaje(analisis.colchon, 0)} menos y aún no perdería.</>
                  )}
                </p>
              </>
            ) : (
              <>
                <span>
                  <Badge tono="warning">Todavía no llega</Badge>
                </span>
                <p className="t-body text-ink-2">
                  Le faltan <Dinero valor={analisis.falta} corta /> para cubrir sus gastos fijos
                  {ritmo ? (
                    <>
                      : en los {diasRestantes} {diasRestantes === 1 ? 'día' : 'días'} que quedan tendría que vender <Dinero valor={ritmo} corta /> por día.
                    </>
                  ) : (
                    '.'
                  )}
                </p>
              </>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

function CuerpoEquilibrio({ f, repartir, setRepartir }: { f: ReturnType<typeof useFiltrosMesLocal>; repartir: boolean; setRepartir: (v: boolean) => void }) {
  const filas = useSel(selEquilibrioLocales, { mes: f.mes, repartirGenerales: repartir });
  const diasMes = diasDelMes(f.mes);
  const enCurso = f.mes === f.hoy.slice(0, 7);
  const analizadas: FilaAnalizada[] = useMemo(() => filas.map((fila) => ({ fila, analisis: analizarEquilibrio(fila, diasMes) })), [filas, diasMes]);
  const locales = analizadas.filter((x) => x.fila.id !== 'todos');
  const conVentas = locales.filter((x) => x.fila.ventasNetasMes > 0 && x.fila.ventasEquilibrio !== null);
  const sinDatos = conVentas.length === 0 && analizadas.every((x) => x.fila.gastosFijos === 0);

  const ejemplo = [...conVentas].sort((a, b) => b.fila.ventasNetasMes - a.fila.ventasNetasMes)[0];
  const fraseEjemplo: Frase | null =
    ejemplo && ejemplo.fila.ventasEquilibrio !== null
      ? [
          'Ejemplo con ',
          { enfasis: ejemplo.fila.nombre },
          `: de cada venta le queda el ${porcentaje(ejemplo.fila.margenBruto, 0)} después de pagar la mercancía. Sus gastos fijos del mes son `,
          { dinero: ejemplo.fila.gastosFijos },
          ', así que necesita vender ',
          { dinero: ejemplo.fila.ventasEquilibrio, enfasis: true },
          ' para que ese margen los cubra.',
        ]
      : null;

  const columnas: ColumnaTabla<FilaAnalizada>[] = [
    { id: 'local', encabezado: 'Local', celda: (x) => <span className={x.fila.id === 'todos' ? 'font-bold' : undefined}>{x.fila.nombre}</span> },
    { id: 'fijos', encabezado: 'Gastos fijos del mes', numerica: true, alinear: 'der', celda: (x) => <Dinero valor={x.fila.gastosFijos} /> },
    { id: 'margen', encabezado: 'Margen bruto', numerica: true, alinear: 'der', celda: (x) => porcentaje(x.fila.margenBruto, 1) },
    { id: 'minimo', encabezado: 'Tiene que vender', numerica: true, alinear: 'der', celda: (x) => (x.fila.ventasEquilibrio === null ? '—' : <Dinero valor={x.fila.ventasEquilibrio} />) },
    { id: 'vendio', encabezado: 'Vendió', numerica: true, alinear: 'der', celda: (x) => <Dinero valor={x.fila.ventasNetasMes} /> },
    {
      id: 'colchon',
      encabezado: 'Colchón',
      numerica: true,
      alinear: 'der',
      celda: (x) => (x.analisis.colchon === null ? '—' : x.analisis.colchon < 0 ? `Le falta ${porcentaje(-x.analisis.colchon, 0)}` : porcentaje(x.analisis.colchon, 0)),
    },
    { id: 'dia', encabezado: 'Cubrió los gastos', celda: (x) => (x.fila.diaEquilibrio ? <Fecha valor={x.fila.diaEquilibrio} formato="corta" /> : '—') },
  ];

  return (
    <div className="mt-8 flex flex-col gap-10">
      <section aria-label="Mes" className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <SelectorMes hoy={f.hoy} valor={f.mes} alCambiar={(mes) => f.cambiar({ mes })} className="w-[240px]" />
        <div className="flex flex-col gap-1 pb-0.5">
          <Switch etiqueta={TEXTOS.equilibrio.repartir} activo={repartir} alCambiar={setRepartir} valorTexto={repartir ? 'Incluidos' : 'No incluidos'} />
          <p className="max-w-[56ch] t-small text-muted">{TEXTOS.equilibrio.repartirAyuda}</p>
        </div>
      </section>

      {sinDatos ? (
        <div className="border border-line bg-surface">
          <EmptyState icono={Scale} titulo="Este mes no tiene ventas ni gastos fijos" texto="Elige otro mes para ver cuánto necesita vender cada local." />
        </div>
      ) : (
        <>
          <section aria-label="Local por local" data-testid="equilibrio-tarjetas">
            <h2 className="t-h2 text-ink">
              <Termino id="puntoEquilibrio" /> · {mesAnio(f.mes)}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 wide:grid-cols-4">
              {analizadas.map((x) => (
                <TarjetaEquilibrio key={x.fila.id} x={x} enCurso={enCurso} hoy={f.hoy} diasMes={diasMes} resaltada={x.fila.id === f.local} />
              ))}
            </div>
          </section>

          <section aria-label="Comparación" className="grid grid-cols-1 gap-6 wide:grid-cols-12">
            <Card titulo="Lo que necesita vender frente a lo que vendió" className="wide:col-span-7" data-testid="equilibrio-grafico">
              <GraficoDinero
                tipo="barras"
                datos={locales.map((x) => ({ nombre: x.fila.nombre, minimo: x.fila.ventasEquilibrio ?? 0, vendido: x.fila.ventasNetasMes }))}
                x="nombre"
                series={[
                  { clave: 'minimo', nombre: 'Mínimo para no perder', color: 3 },
                  { clave: 'vendido', nombre: 'Lo que vendió', color: 1 },
                ]}
                alto={260}
              />
            </Card>
            <Card titulo="Cómo se calcula" className="wide:col-span-5" data-testid="equilibrio-formula">
              <p className="t-body text-ink-2">{TEXTOS.equilibrio.formula}</p>
              {fraseEjemplo && <FraseVista frase={fraseEjemplo} className="mt-4 t-body text-ink-2" />}
              <p className="mt-4 t-small text-muted">
                La nómina, el arriendo y los servicios se pagan se venda o no: por eso son fijos. Lo que cambia con cada venta es la mercancía, y ya está descontada en el margen.
              </p>
            </Card>
          </section>

          <section aria-label="Los números" data-testid="equilibrio-tabla">
            <h2 className="mb-4 t-h2 text-ink">Los números detrás</h2>
            <Table columnas={columnas} filas={analizadas} clave={(x) => String(x.fila.id)} porPagina={0} etiqueta="Punto de equilibrio por local" sustantivo={['local', 'locales']} />
          </section>
        </>
      )}
    </div>
  );
}

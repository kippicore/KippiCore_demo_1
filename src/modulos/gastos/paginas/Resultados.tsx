import { useMemo, useState } from 'react';
import { Scale } from 'lucide-react';
import { BarraProgreso, Badge, BotonExportar, Card, Dinero, EmptyState, GraficoCascada, GraficoDinero, Kpi, Select, Switch, Table, Termino, colorDeLocal, type ColumnaTabla } from '@/ui';
import { GLOSARIO } from '@/config/textos/glosario';
import type { CategoriaGasto, COP } from '@/dominio/tipos';
import { useDinero, useSel } from '@/estado';
import { mesAnio, mesCorto, porcentaje } from '@/lib/formato';
import { sumarMesesAMes } from '@/lib/fechas';
import { compararLocales, explicarResultados, pasosCascada, porCada100, rangoDeMes, variacionUtilidad, type FilaLocalResultado } from '../calculos';
import { EncabezadoGastos, FraseVista, LimiteError, SelectorMes } from '../componentes/Piezas';
import { useFiltrosMesLocal } from '../hooks';
import { selIvaGastosDescontable, selResultadosPorLocal, selSerieUtilidad } from '../selectores';
import { ETIQUETA_CATEGORIA, TEXTOS } from '../textos';
import type { EstadoResultados } from '@/selectores';

export default function Resultados() {
  const f = useFiltrosMesLocal('estadoResultados');
  const [prorratear, setProrratear] = useState(false);
  const rango = rangoDeMes(f.mes);
  return (
    <>
      <EncabezadoGastos
        titulo={TEXTOS.resultados.titulo}
        subtitulo={TEXTOS.resultados.subtitulo}
        migaFinal="Estado de resultados"
        mes={f.mes}
        local={f.localDeLaUrl ? f.local : null}
        acciones={<BotonExportar reporte="resultados" menu filtros={{ ...rango, localId: f.local }} />}
      />
      <LimiteError>
        <CuerpoResultados f={f} prorratear={prorratear} setProrratear={setProrratear} />
      </LimiteError>
    </>
  );
}

interface FilaComparativo {
  id: string;
  nombre: string;
  er: EstadoResultados | null;
  /** Solo la fila de gastos generales sin repartir. */
  generales?: COP;
  esMejor?: boolean;
}

function CuerpoResultados({ f, prorratear, setProrratear }: { f: ReturnType<typeof useFiltrosMesLocal>; prorratear: boolean; setProrratear: (v: boolean) => void }) {
  const dinero = useDinero();
  const anteriorMes = sumarMesesAMes(f.mes, -1);
  const vista = useSel(selResultadosPorLocal, { mes: f.mes, prorratear });
  const previa = useSel(selResultadosPorLocal, { mes: anteriorMes, prorratear });
  const serie = useSel(selSerieUtilidad, { hasta: f.mes, meses: 12, prorratear });
  const sinIva = useSel(selIvaGastosDescontable);

  const esTodos = f.local === 'todos' || !vista.locales.some((x) => x.local.id === f.local);
  const elegido = esTodos ? null : (vista.locales.find((x) => x.local.id === f.local) ?? null);
  const er = elegido ? elegido.er : vista.total;
  const erPrevio = elegido ? (previa.locales.find((x) => x.local.id === f.local)?.er ?? null) : previa.total;
  const nombre = elegido ? elegido.local.nombre : 'el negocio';
  const mesEnCurso = f.mes === f.hoy.slice(0, 7);
  const sinActividad = vista.total.ventasNetas <= 0 && vista.total.gastosOperativos <= 0;

  const frases = useMemo(() => explicarResultados(er, { sujeto: elegido ? 'local' : 'negocio', nombre: elegido?.local.nombre }), [er, elegido]);
  const pasos = useMemo(() => pasosCascada(er, !elegido), [er, elegido]);
  const filasLocales: FilaLocalResultado[] = vista.locales.map((x) => ({ id: x.local.id, nombre: x.local.nombre, er: x.er }));
  const comparacion = useMemo(() => compararLocales(filasLocales), [filasLocales]);

  const filas: FilaComparativo[] = [
    ...vista.locales.map((x) => ({ id: x.local.id, nombre: x.local.nombre, er: x.er, esMejor: comparacion.mejor?.id === x.local.id && x.er.ventasNetas > 0 })),
    ...(vista.sinAsignar !== 0 ? [{ id: 'generales', nombre: prorratear ? 'Bodega' : 'Bodega y gastos generales', er: null, generales: vista.sinAsignar }] : []),
  ];

  const categorias = Object.entries(er.gastosPorCategoria)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([c, v]) => ({ categoria: c as CategoriaGasto, valor: v ?? 0 }))
    .sort((a, b) => b.valor - a.valor);
  const totalCategorias = categorias.reduce((a, c) => a + c.valor, 0);

  const columnas: ColumnaTabla<FilaComparativo>[] = [
    {
      id: 'local',
      encabezado: 'Local',
      celda: (x) => (
        <span className="inline-flex items-center gap-2">
          <span className={x.id === f.local ? 'font-bold' : undefined}>{x.nombre}</span>
          {x.esMejor && (
            <Badge tono="accent" tamano="sm">
              El que más te deja
            </Badge>
          )}
        </span>
      ),
    },
    { id: 'ventas', encabezado: 'Ventas sin IVA', numerica: true, alinear: 'der', celda: (x) => (x.er ? <Dinero valor={x.er.ventasNetas} /> : '—') },
    { id: 'costo', encabezado: 'Mercancía', numerica: true, alinear: 'der', celda: (x) => (x.er ? <Dinero valor={x.er.costoVentas} /> : '—') },
    { id: 'bruta', encabezado: 'Queda después de vender', numerica: true, alinear: 'der', celda: (x) => (x.er ? <Dinero valor={x.er.utilidadBruta} /> : '—') },
    { id: 'gastos', encabezado: 'Gastos', numerica: true, alinear: 'der', celda: (x) => <Dinero valor={x.er ? x.er.gastosOperativos + x.er.gastosGeneralesProrrateados : (x.generales ?? 0)} /> },
    {
      id: 'final',
      encabezado: 'Queda al final',
      numerica: true,
      alinear: 'der',
      celda: (x) => (
        <span className="font-bold">
          <Dinero valor={x.er ? x.er.utilidadOperativa : -(x.generales ?? 0)} />
        </span>
      ),
    },
    { id: 'margen', encabezado: 'De cada 100', numerica: true, alinear: 'der', celda: (x) => (x.er && x.er.ventasNetas > 0 ? `${porCada100(x.er.margenOperativo)}` : '—') },
  ];

  if (sinActividad)
    return (
      <div className="mt-8 border border-line bg-surface">
        <EmptyState icono={Scale} titulo="Este mes no tiene ventas ni gastos" texto="Elige otro mes para ver cuánto te dejó cada local." />
      </div>
    );

  return (
    <div className="mt-8 flex flex-col gap-10">
      <section aria-label="Mes y local" className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <SelectorMes hoy={f.hoy} valor={f.mes} alCambiar={(mes) => f.cambiar({ mes })} className="w-[240px]" />
        <Select
          etiqueta="Ver"
          valor={elegido ? elegido.local.id : 'todos'}
          alCambiar={(local) => f.cambiar({ local })}
          className="w-[240px]"
          data-testid="resultados-selector-local"
          opciones={[{ valor: 'todos', etiqueta: 'Todo el negocio' }, ...vista.locales.map((x) => ({ valor: x.local.id, etiqueta: x.local.nombre }))]}
        />
        <div className="flex flex-col gap-1 pb-0.5">
          <Switch etiqueta={TEXTOS.resultados.prorratear} activo={prorratear} alCambiar={setProrratear} valorTexto={prorratear ? 'Repartidos' : 'Aparte'} />
          <p className="max-w-[56ch] t-small text-muted">{TEXTOS.resultados.prorratearAyuda}</p>
        </div>
      </section>

      <section aria-label="Cifras del mes" className="grid grid-cols-1 gap-4 md:grid-cols-3" data-testid="resultados-kpis">
        <Kpi
          etiqueta="Ventas sin IVA"
          valor={er.ventasNetas}
          formatear={dinero.corta}
          completo={dinero(er.ventasNetas)}
          nota={mesEnCurso ? `${mesAnio(f.mes)}, hasta hoy` : mesAnio(f.mes)}
          data-testid="resultados-kpi-ventas"
        />
        <Kpi
          etiqueta={<Termino id="utilidadBruta" sinTecnico />}
          valor={er.utilidadBruta}
          formatear={dinero.corta}
          completo={dinero(er.utilidadBruta)}
          nota={er.ventasNetas > 0 ? `${porCada100(er.margenBruto)} de cada 100 que vendes` : 'Sin ventas en el mes'}
          data-testid="resultados-kpi-bruta"
        />
        <Kpi
          etiqueta={<Termino id="utilidadOperativa" sinTecnico />}
          valor={er.utilidadOperativa}
          formatear={dinero.corta}
          completo={dinero(er.utilidadOperativa)}
          destacada
          variacion={
            erPrevio ? { valor: variacionUtilidad(er.utilidadOperativa, erPrevio.utilidadOperativa), comparado: `vs. ${mesCorto(anteriorMes)}`, buenoCuando: 'sube' } : undefined
          }
          nota={er.ventasNetas > 0 ? `${porCada100(er.margenOperativo)} de cada 100 que vendes` : undefined}
          data-testid="resultados-kpi-final"
        />
      </section>

      <section aria-label="La historia del mes" className="grid grid-cols-1 gap-6 wide:grid-cols-12">
        <Card titulo={`De lo que vendiste a lo que te queda · ${nombre === 'el negocio' ? 'Todo el negocio' : nombre}`} className="wide:col-span-7" data-testid="resultados-cascada">
          <div className="pt-6">
            <GraficoCascada pasos={pasos} formato={dinero.corta} alto={260} />
          </div>
          {mesEnCurso && <p className="mt-4 t-small text-muted">El mes sigue en curso: la nómina y otros gastos todavía se están causando, así que lo que queda puede bajar.</p>}
        </Card>
        <Card titulo="Explicado sin rodeos" className="wide:col-span-5" data-testid="resultados-explicacion">
          <div className="space-y-3">
            {frases.map((frase, i) => (
              <FraseVista key={i} frase={frase} className="t-body text-ink-2" />
            ))}
          </div>
          <dl className="mt-6 space-y-3 border-t border-line-soft pt-4">
            {(['utilidadBruta', 'utilidadOperativa'] as const).map((id) => (
              <div key={id}>
                <dt className="t-label font-bold text-ink">
                  <Termino id={id} />
                </dt>
                <dd className="t-small text-muted">{GLOSARIO[id]?.definicion}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 t-small text-muted">{TEXTOS.resultados.nota}</p>
        </Card>
      </section>

      <section aria-label="Local por local" data-testid="resultados-comparativo">
        <h2 className="t-h2 text-ink">Local por local</h2>
        <FraseVista frase={comparacion.frase} className="mt-2 max-w-[80ch] t-body text-ink-2" />
        <Table
          className="mt-4"
          columnas={columnas}
          filas={filas}
          clave={(x) => x.id}
          sustantivo={['fila', 'filas']}
          etiqueta="Estado de resultados por local"
          porPagina={0}
          alAbrir={(x) => {
            if (x.er) f.cambiar({ local: x.id });
          }}
          totales={{
            local: 'Todo el negocio',
            ventas: <Dinero valor={vista.total.ventasNetas} />,
            costo: <Dinero valor={vista.total.costoVentas} />,
            bruta: <Dinero valor={vista.total.utilidadBruta} />,
            gastos: <Dinero valor={vista.total.gastosOperativos} />,
            final: <Dinero valor={vista.total.utilidadOperativa} />,
            margen: vista.total.ventasNetas > 0 ? `${porCada100(vista.total.margenOperativo)}` : '—',
          }}
        />
        <p className="mt-3 t-small text-muted">Toca un local para ver su cascada arriba. «De cada 100» es lo que le queda a ese local de cada 100 que vendió.</p>
      </section>

      <section aria-label="Gastos y tendencia" className="grid grid-cols-1 gap-6 wide:grid-cols-2">
        <Card titulo={`A dónde se fue el gasto · ${nombre === 'el negocio' ? 'Todo el negocio' : nombre}`} data-testid="resultados-categorias">
          {categorias.length === 0 && er.gastosGeneralesProrrateados <= 0 ? (
            <p className="t-body text-muted">Este mes no hay gastos registrados.</p>
          ) : (
            <ul className="space-y-4">
              {categorias.map((c) => (
                <li key={c.categoria}>
                  <BarraProgreso
                    valor={totalCategorias > 0 ? c.valor / totalCategorias : 0}
                    etiqueta={ETIQUETA_CATEGORIA[c.categoria]}
                    detalle={
                      <span className="inline-flex items-baseline gap-2">
                        <span className="font-semibold text-ink">
                          <Dinero valor={c.valor} corta />
                        </span>
                        <span className="text-muted">{er.ventasNetas > 0 ? `${porcentaje(c.valor / er.ventasNetas, 0)} de las ventas` : ''}</span>
                      </span>
                    }
                  />
                </li>
              ))}
              {er.gastosGeneralesProrrateados > 0 && (
                <li>
                  <BarraProgreso
                    valor={totalCategorias > 0 ? er.gastosGeneralesProrrateados / (totalCategorias + er.gastosGeneralesProrrateados) : 1}
                    etiqueta="Parte de los gastos generales"
                    detalle={
                      <span className="font-semibold text-ink">
                        <Dinero valor={er.gastosGeneralesProrrateados} corta />
                      </span>
                    }
                  />
                </li>
              )}
            </ul>
          )}
          <p className="mt-4 t-small text-muted">{sinIva ? 'Sin IVA: el IVA que pagas en los gastos lo descuentas al declarar.' : 'Con IVA incluido.'}</p>
        </Card>

        <Card titulo="Lo que dejó cada local, mes a mes" data-testid="resultados-tendencia">
          <GraficoDinero
            tipo="linea"
            datos={serie.filas}
            x="mes"
            formatoX={(m) => mesCorto(m)}
            series={serie.locales.map((l) => ({ clave: l.id, nombre: l.nombre, color: colorDeLocal(l.orden) }))}
            referencia={{ valor: 0, etiqueta: 'Sin ganar ni perder' }}
            alto={240}
            lectura={mesEnCurso ? 'El último mes aún no cierra: su nómina todavía no se ha causado completa.' : undefined}
          />
        </Card>
      </section>
    </div>
  );
}

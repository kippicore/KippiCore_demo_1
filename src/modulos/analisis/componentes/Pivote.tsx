import { ArrowLeftRight, ChartNoAxesCombined } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { entero, numero, porcentaje } from '@/lib/formato';
import { DIMENSIONES, MEDIDAS, type Dimension, type Medida } from '@/selectores';
import { Button, Card, type ColumnaTabla, Dinero, EmptyState, GraficoBase, GraficoDinero, Segmentado, Select, Table, type OpcionSelect } from '@/ui';
import {
  datosGraficoPivote,
  esAditiva,
  etiquetaDimension,
  posicionNatural,
  tipoMedida,
  type ConfigPivote,
  type FilaPivote,
  type FiltrosPivote,
  type PivotePreparado,
} from '../calculos';
import { DESCRIPCION_MEDIDA, EJEMPLOS_PIVOTE, GRUPOS_DIMENSIONES, PERIODOS_PIVOTE, type IdPeriodoPivote } from '../textos';

/** Máximo de columnas de valor que se muestran en pantalla (el Excel lleva todas). */
export const MAX_COLUMNAS = 12;

const OPCIONES_DIMENSION: OpcionSelect[] = GRUPOS_DIMENSIONES.flatMap((g) => g.dimensiones.map((d) => ({ valor: d, etiqueta: DIMENSIONES[d], grupo: g.grupo })));
const OPCIONES_MEDIDA: OpcionSelect[] = (Object.keys(MEDIDAS) as Medida[]).map((m) => ({ valor: m, etiqueta: MEDIDAS[m] }));

// ---------------------------------------------------------------------------------------------------------
// Constructor: filas, columnas, valor y filtros
// ---------------------------------------------------------------------------------------------------------
export function ConstructorPivote({
  config,
  filtros,
  alCambiarConfig,
  alCambiarFiltros,
  locales,
  categorias,
  ejemplo,
  alElegirEjemplo,
  alIntercambiar,
}: {
  config: ConfigPivote;
  filtros: FiltrosPivote;
  alCambiarConfig: (c: ConfigPivote) => void;
  alCambiarFiltros: (f: FiltrosPivote) => void;
  locales: string[];
  categorias: string[];
  ejemplo: string | null;
  alElegirEjemplo: (id: string) => void;
  alIntercambiar: () => void;
}) {
  const [fila1, fila2] = config.filas;
  const usadas = (excepto: 'f1' | 'f2' | 'c'): Dimension[] => [
    ...(excepto !== 'f1' && fila1 ? [fila1] : []),
    ...(excepto !== 'f2' && fila2 ? [fila2] : []),
    ...(excepto !== 'c' && config.columna ? [config.columna] : []),
  ];
  const opciones = (excepto: 'f1' | 'f2' | 'c', conNinguna: boolean): OpcionSelect[] => {
    const ocupadas = usadas(excepto);
    const base = OPCIONES_DIMENSION.map((o) => ({ ...o, deshabilitado: ocupadas.includes(o.valor as Dimension) }));
    return conNinguna ? [{ valor: 'ninguna', etiqueta: 'Ninguna' }, ...base] : base;
  };
  const hayFiltros = filtros.periodo !== 'todo' || filtros.local !== 'todos' || filtros.categoria !== 'todas';
  return (
    <Card padding="normal" data-testid="pivote-constructor">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2" data-testid="pivote-ejemplos" role="group" aria-label="Ejemplos para empezar">
        <span className="t-eyebrow text-ink-2">Empieza con un ejemplo</span>
        {EJEMPLOS_PIVOTE.map((e) => (
          <Button
            key={e.id}
            variante={ejemplo === e.id ? 'primary' : 'secondary'}
            tamano="sm"
            title={e.texto}
            onClick={() => alElegirEjemplo(e.id)}
            data-testid={`pivote-ejemplo-${e.id}`}
            aria-pressed={ejemplo === e.id}
          >
            {e.titulo}
          </Button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 desk:grid-cols-[1fr_1fr_auto_1fr_1fr]">
        <Select
          etiqueta="Filas"
          ayuda="Lo que va hacia abajo."
          valor={fila1 ?? null}
          alCambiar={(v) => alCambiarConfig({ ...config, filas: [v as Dimension, ...(fila2 ? [fila2] : [])] })}
          opciones={opciones('f1', false)}
          data-testid="pivote-filas"
        />
        <Select
          etiqueta="Y dentro de cada fila"
          opcional
          ayuda="Una segunda dimensión, si la necesitas."
          valor={fila2 ?? 'ninguna'}
          alCambiar={(v) => alCambiarConfig({ ...config, filas: v === 'ninguna' || !fila1 ? config.filas.slice(0, 1) : [fila1, v as Dimension] })}
          opciones={opciones('f2', true)}
          data-testid="pivote-filas2"
        />
        <div className="flex items-end">
          <Button variante="ghost" tamano="md" icono={ArrowLeftRight} onClick={alIntercambiar} disabled={!config.columna || config.filas.length !== 1} data-testid="pivote-intercambiar" title="Pasa las filas a columnas y las columnas a filas">
            Intercambiar
          </Button>
        </div>
        <Select
          etiqueta="Columnas"
          opcional
          ayuda="Lo que va hacia el lado."
          valor={config.columna ?? 'ninguna'}
          alCambiar={(v) => alCambiarConfig({ ...config, columna: v === 'ninguna' ? null : (v as Dimension) })}
          opciones={opciones('c', true)}
          data-testid="pivote-columnas"
        />
        <Select
          etiqueta="Qué medir"
          ayuda={DESCRIPCION_MEDIDA[config.medida]}
          valor={config.medida}
          alCambiar={(v) => alCambiarConfig({ ...config, medida: v as Medida })}
          opciones={OPCIONES_MEDIDA}
          data-testid="pivote-medida"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-4 border-t border-line-soft pt-5">
        <div>
          <p className="mb-1.5 t-label font-semibold text-ink">Período</p>
          <Segmentado
            etiqueta="Período de la tabla"
            valor={filtros.periodo}
            alCambiar={(v: IdPeriodoPivote) => alCambiarFiltros({ ...filtros, periodo: v })}
            data-testid="pivote-periodo"
            opciones={PERIODOS_PIVOTE.map((p) => ({ valor: p.id, etiqueta: p.etiqueta, 'data-testid': `pivote-periodo-${p.id}` }))}
          />
        </div>
        <Select
          etiqueta="Local"
          tamano="md"
          valor={filtros.local}
          alCambiar={(v) => alCambiarFiltros({ ...filtros, local: v })}
          opciones={[{ valor: 'todos', etiqueta: 'Todos los locales' }, ...locales.map((l) => ({ valor: l, etiqueta: l }))]}
          ancho={200}
          data-testid="pivote-local"
        />
        <Select
          etiqueta="Categoría"
          tamano="md"
          valor={filtros.categoria}
          alCambiar={(v) => alCambiarFiltros({ ...filtros, categoria: v })}
          opciones={[{ valor: 'todas', etiqueta: 'Todas las categorías' }, ...categorias.map((c) => ({ valor: c, etiqueta: c }))]}
          ancho={220}
          data-testid="pivote-categoria"
        />
        {hayFiltros && (
          <Button variante="ghost" tamano="sm" onClick={() => alCambiarFiltros({ periodo: 'todo', local: 'todos', categoria: 'todas' })} data-testid="pivote-limpiar-filtros">
            Quitar filtros
          </Button>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Resultado: tabla con totales
// ---------------------------------------------------------------------------------------------------------
function Cifra({ v, medida, compacta }: { v: number; medida: Medida; compacta: boolean }) {
  switch (tipoMedida(medida)) {
    case 'dinero':
      return <Dinero valor={v} corta={compacta} />;
    case 'porcentaje':
      return <span className="num">{porcentaje(v, 1)}</span>;
    default:
      return <span className="num">{entero(v)}</span>;
  }
}

const ordenFila = (d: Dimension, valor: string): string | number => (d === 'diaSemana' || d === 'talla' || d === 'segmento' || d === 'canal' ? posicionNatural(d, valor) : valor);

export function TablaResultado({ prep, visibles }: { prep: PivotePreparado; visibles: readonly string[] }) {
  const medida = prep.medida;
  const compacta = visibles.length > 3;
  const conColumnas = prep.columnasDims.length > 0;
  const nombreColumna = (c: string) => (prep.columnasDims.length === 1 ? etiquetaDimension(prep.columnasDims[0] ?? 'mes', c) : c);
  const columnas = useMemo<ColumnaTabla<FilaPivote>[]>(
    () => [
      ...prep.filasDims.map((d, i): ColumnaTabla<FilaPivote> => ({
        id: `d${String(i)}`,
        encabezado: DIMENSIONES[d],
        celda: (f) => etiquetaDimension(d, f.etiquetas[i] ?? ''),
        ordenar: (f) => ordenFila(d, f.etiquetas[i] ?? ''),
        truncar: true,
        ancho: i === 0 && prep.filasDims.length === 1 ? 260 : 200,
      })),
      ...visibles.map(
        (c, i): ColumnaTabla<FilaPivote> => ({
          id: `c${String(i)}`,
          encabezado: nombreColumna(c),
          numerica: true,
          ordenar: (f) => f.celdas[c] ?? null,
          celda: (f) => (f.celdas[c] === undefined ? <span className="text-muted">—</span> : <Cifra v={f.celdas[c]} medida={medida} compacta={compacta} />),
        }),
      ),
      {
        id: 'total',
        encabezado: conColumnas ? 'Total' : MEDIDAS[medida],
        numerica: true,
        ordenar: (f) => f.total,
        celda: (f) => (
          <strong className="font-bold">
            <Cifra v={f.total} medida={medida} compacta={compacta} />
          </strong>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prep, visibles, compacta],
  );
  const totales = useMemo(() => {
    const t: Record<string, ReactNode> = { d0: 'Total' };
    visibles.forEach((c, i) => (t[`c${String(i)}`] = <Cifra v={prep.totalesColumna[c] ?? 0} medida={medida} compacta={compacta} />));
    t.total = (
      <span data-testid="pivote-total" data-valor={prep.total}>
        <Cifra v={prep.total} medida={medida} compacta={compacta} />
      </span>
    );
    return t;
  }, [prep, visibles, medida, compacta]);
  return (
    <Table
      columnas={columnas}
      filas={prep.filas}
      clave={(f) => f.id}
      sustantivo={['fila', 'filas']}
      porPagina={25}
      totales={totales}
      etiqueta="Tabla dinámica"
      data-testid="tabla-pivote"
    />
  );
}

// ---------------------------------------------------------------------------------------------------------
// Resultado: gráfico asociado
// ---------------------------------------------------------------------------------------------------------
const corto = (n: number) => (Math.abs(n) >= 1000 ? `${numero(n / 1000, 1)} mil` : entero(n));
const recortar = (t: string, max = 22) => (t.length > max ? `${t.slice(0, max - 1)}…` : t);
/** Etiquetas del gráfico: el producto sin su referencia (es larga) y todo recortado. */
const etiquetaGrafico = (d: Dimension, v: string) => (d === 'producto' ? (v.split(' · ').slice(1).join(' · ') || v) : etiquetaDimension(d, v));

export function GraficoResultado({ prep, visibles }: { prep: PivotePreparado; visibles: readonly string[] }) {
  const g = useMemo(() => datosGraficoPivote(prep, visibles, 24, etiquetaGrafico), [prep, visibles]);
  const tipo = tipoMedida(prep.medida);
  const nombreMedida = MEDIDAS[prep.medida];
  const series = g.series.map((s) => ({ clave: s.clave, nombre: s.nombre || nombreMedida, color: s.color }));
  const nota =
    g.criterio === 'ultimas'
      ? `Se muestran las últimas ${String(g.datos.length)} filas de ${String(prep.filas.length)}.`
      : g.criterio === 'mayores'
        ? `Se muestran las ${String(g.datos.length)} filas con más ${tipo === 'dinero' ? 'valor' : 'cifra'} de ${String(prep.filas.length)}.`
        : undefined;
  const lectura = [nota, prep.columnasDims.length > 0 && visibles.length > 4 ? 'Con tantas columnas, el gráfico dibuja solo el total de cada fila.' : null, !esAditiva(prep.medida) && g.series.length > 1 ? 'Las barras van lado a lado porque esta medida no se suma.' : null]
    .filter(Boolean)
    .join(' ');
  const comunes = {
    tipo: g.tipo,
    datos: g.datos,
    x: 'x',
    series,
    apiladas: g.apiladas,
    titulo: `${nombreMedida}`,
    lectura: lectura || undefined,
    formatoX: (v: string) => recortar(v),
    alto: 280,
  } as const;
  return (
    <Card padding="normal" data-testid="pivote-grafico" data-filas={g.datos.length}>
      {tipo === 'dinero' ? (
        <GraficoDinero {...comunes} />
      ) : (
        <GraficoBase {...comunes} formatoY={tipo === 'porcentaje' ? (n) => porcentaje(n, 0) : corto} formatoValor={tipo === 'porcentaje' ? (n) => porcentaje(n, 1) : (n) => entero(n)} />
      )}
    </Card>
  );
}

export function SinResultados({ alQuitarFiltros, hayFiltros }: { alQuitarFiltros: () => void; hayFiltros: boolean }) {
  return (
    <Card padding="ninguno">
      <EmptyState
        icono={ChartNoAxesCombined}
        titulo="Ninguna venta con estos filtros"
        texto="Cambia el período, el local o la categoría para ver resultados."
        accion={
          hayFiltros ? (
            <Button variante="secondary" onClick={alQuitarFiltros} data-testid="pivote-vacio-quitar">
              Quitar filtros
            </Button>
          ) : undefined
        }
      />
    </Card>
  );
}

import { PackageSearch } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { rutas } from '@/app/rutas';
import type { Categoria } from '@/dominio/tipos';
import { useFiltroLocal, useHoy, usePuede, useSel } from '@/estado';
import { entero, porcentaje, unidades } from '@/lib/formato';
import { Button, Card, type ColumnaTabla, Dinero, EmptyState, FranjaResumen, Segmentado, Select, Table, useNombreLocal } from '@/ui';
import { rangoDePeriodo } from '../calculos';
import { selOpcionesFiltroProductos, selVendidos, type FilaVendido, type MedidaVendido } from '../selectores';
import { PERIODOS, type IdPeriodo } from '../textos';
import { CabezaSeccion, SelectorPeriodo } from './Piezas';

const NOMBRE_MEDIDA: Record<MedidaVendido, string> = { unidades: 'unidades', valor: 'valor', margen: 'margen' };

/**
 * Productos · Más y menos vendidos (PRD 7.12): los 10 que más y los 10 que menos se venden en el período, por unidades,
 * por valor o por margen, con filtro por categoría, talla y color. Respeta el local de la barra superior.
 */
export function VistaVendidos({ resaltar }: { resaltar: string | null }) {
  const navegar = useNavigate();
  const hoy = useHoy();
  const localId = useFiltroLocal();
  const nombreLocal = useNombreLocal(localId);
  const verMargen = usePuede()('ver.margenes');
  const opciones = useSel(selOpcionesFiltroProductos);
  const [periodo, setPeriodo] = useState<IdPeriodo>('90d');
  const [medidaElegida, setMedida] = useState<MedidaVendido>('unidades');
  const [categoria, setCategoria] = useState('todas');
  const [talla, setTalla] = useState('todas');
  const [color, setColor] = useState('todos');
  // Sin permiso para ver márgenes, nunca se ofrece ni se calcula por margen.
  const medida: MedidaVendido = medidaElegida === 'margen' && !verMargen ? 'unidades' : medidaElegida;
  const rango = rangoDePeriodo(hoy, periodo);
  const r = useSel(selVendidos, {
    ...rango,
    localId,
    categoria: categoria === 'todas' ? null : (categoria as Categoria),
    talla: talla === 'todas' ? null : talla,
    colorId: color === 'todos' ? null : color,
    medida,
    n: 10,
  });
  const hayFiltros = categoria !== 'todas' || talla !== 'todas' || color !== 'todos';
  const limpiar = () => {
    setCategoria('todas');
    setTalla('todas');
    setColor('todos');
  };

  const columnas = (lista: readonly FilaVendido[]): ColumnaTabla<FilaVendido>[] => {
    const rango = new Map(lista.map((f, i) => [f.productoId, i + 1]));
    const marca = (m: MedidaVendido, nodo: ReactNode) => (m === medida ? <strong className="font-bold">{nodo}</strong> : nodo);
    return [
      { id: 'rank', encabezado: '#', ancho: 52, celda: (f) => <span className="num text-ink-2">{rango.get(f.productoId)}</span> },
      {
        id: 'prenda',
        encabezado: 'Prenda',
        ancho: 300,
        celda: (f) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{f.nombre}</p>
            <p className="truncate t-small text-muted">{f.referencia}</p>
          </div>
        ),
      },
      { id: 'unidades', encabezado: 'Unidades', numerica: true, celda: (f) => marca('unidades', unidades(f.unidades)) },
      { id: 'valor', encabezado: 'Valor vendido', numerica: true, celda: (f) => marca('valor', <Dinero valor={f.valor} />) },
      ...(verMargen ? [{ id: 'margen', encabezado: 'Margen', numerica: true, celda: (f: FilaVendido) => marca('margen', <Dinero valor={f.margen} />) } satisfies ColumnaTabla<FilaVendido>] : []),
      { id: 'participacion', encabezado: `% del ${NOMBRE_MEDIDA[medida]}`, numerica: true, celda: (f) => <span className="text-ink-2">{porcentaje(f.participacion, 1)}</span> },
    ];
  };
  const mas = useMemo(() => columnas(r.mas), [r.mas, medida, verMargen]); // eslint-disable-line react-hooks/exhaustive-deps
  const menos = useMemo(() => columnas(r.menos), [r.menos, medida, verMargen]); // eslint-disable-line react-hooks/exhaustive-deps
  const alAbrir = (f: FilaVendido) => navegar(rutas.producto(f.referencia));
  const resaltada = (f: FilaVendido) => resaltar !== null && (f.referencia === resaltar || f.productoId === resaltar);
  const vacio = (
    <EmptyState
      tamano="tabla"
      icono={PackageSearch}
      titulo="Ninguna venta con estos filtros"
      texto="Prueba con otro período, otra categoría o quita los filtros de talla y color."
      accion={
        hayFiltros ? (
          <Button variante="secondary" onClick={limpiar}>
            Quitar filtros
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <div className="flex flex-col gap-8" data-testid="vista-vendidos">
      <Card padding="normal">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <div>
            <p className="mb-1.5 t-label font-semibold text-ink">Ordenar por</p>
            <Segmentado
              etiqueta="Medida del ranking"
              valor={medida}
              alCambiar={setMedida}
              data-testid="vendidos-medida"
              opciones={[
                { valor: 'unidades', etiqueta: 'Unidades', 'data-testid': 'vendidos-medida-unidades' },
                { valor: 'valor', etiqueta: 'Valor', 'data-testid': 'vendidos-medida-valor' },
                ...(verMargen ? [{ valor: 'margen' as const, etiqueta: 'Margen', 'data-testid': 'vendidos-medida-margen' }] : []),
              ]}
            />
          </div>
          <div>
            <p className="mb-1.5 t-label font-semibold text-ink">Período</p>
            <SelectorPeriodo valor={periodo} alCambiar={setPeriodo} testid="vendidos-periodo" />
          </div>
          <Select
            etiqueta="Categoría"
            valor={categoria}
            alCambiar={setCategoria}
            opciones={[{ valor: 'todas', etiqueta: 'Todas' }, ...opciones.categorias.map((c) => ({ valor: c.valor, etiqueta: c.etiqueta }))]}
            ancho={190}
            data-testid="vendidos-categoria"
          />
          <Select
            etiqueta="Talla"
            valor={talla}
            alCambiar={setTalla}
            opciones={[{ valor: 'todas', etiqueta: 'Todas' }, ...opciones.tallas.map((t) => ({ valor: t, etiqueta: t }))]}
            ancho={120}
            data-testid="vendidos-talla"
          />
          <Select
            etiqueta="Color"
            valor={color}
            alCambiar={setColor}
            opciones={[{ valor: 'todos', etiqueta: 'Todos' }, ...opciones.colores.map((c) => ({ valor: c.id, etiqueta: c.nombre }))]}
            ancho={190}
            data-testid="vendidos-color"
          />
          {hayFiltros && (
            <Button variante="ghost" tamano="sm" onClick={limpiar} data-testid="vendidos-limpiar">
              Quitar filtros
            </Button>
          )}
        </div>
        <p className="mt-4 t-small text-muted">
          {nombreLocal} · netas de devoluciones. Toca una prenda para abrir su ficha.
        </p>
      </Card>

      <div data-testid="vendidos-resumen">
      <FranjaResumen
        cifras={[
          { etiqueta: 'Referencias que se vendieron', valor: <span data-testid="vendidos-referencias">{entero(r.referencias)}</span> },
          { etiqueta: 'Unidades', valor: <span data-testid="vendidos-total-unidades">{entero(r.total.unidades)}</span> },
          { etiqueta: 'Valor vendido', valor: <Dinero valor={r.total.valor} corta /> },
          ...(verMargen ? [{ etiqueta: 'Margen', valor: <Dinero valor={r.total.margen} corta /> }] : []),
        ]}
      />
      </div>

      <section aria-label="Los que más se venden">
        <CabezaSeccion titulo="Los 10 que más vendes" texto={`Por ${NOMBRE_MEDIDA[medida]}, en los últimos ${String(PERIODOS.find((p) => p.id === periodo)?.dias ?? 90)} días.`} />
        <Table columnas={mas} filas={r.mas} clave={(f) => f.productoId} sustantivo={['prenda', 'prendas']} porPagina={0} alAbrir={alAbrir} resaltada={resaltada} vacio={vacio} data-testid="tabla-mas-vendidos" etiqueta="Los que más se venden" />
      </section>

      <section aria-label="Los que menos se venden">
        <CabezaSeccion titulo="Los 10 que menos vendes" texto="Solo cuentan las prendas que sí se vendieron en el período. Las que no se mueven están en Rotación e inventario." />
        <Table
          columnas={menos}
          filas={r.menos}
          clave={(f) => f.productoId}
          sustantivo={['prenda', 'prendas']}
          porPagina={0}
          alAbrir={alAbrir}
          resaltada={resaltada}
          vacio={
            <EmptyState tamano="tabla" icono={PackageSearch} titulo="Todavía no hay una lista aparte" texto="Con diez referencias o menos vendidas, la lista de los que más vendes ya las incluye todas." />
          }
          data-testid="tabla-menos-vendidos"
          etiqueta="Los que menos se venden"
        />
      </section>
    </div>
  );
}

import { Moon, PackageCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { rutas } from '@/app/rutas';
import { useDinero, useHoy, useSel } from '@/estado';
import { entero, numero, unidades } from '@/lib/formato';
import { NOMBRES_CATEGORIA } from '@/seed/catalogo';
import { Badge, Card, type ColumnaTabla, Dinero, EmptyState, Fecha, Kpi, Segmentado, Table } from '@/ui';
import { mesesParaVender, rotacionAnual } from '../calculos';
import { selResumenRotacion, type FilaRotacion } from '../selectores';
import { BarrasHorizontales, CabezaSeccion, type FilaBarra } from './Piezas';
import type { SinMovimiento } from '@/selectores';

const DIAS_DORMIDA = ['60', '90', '120'] as const;
type DiasDormida = (typeof DIAS_DORMIDA)[number];

/**
 * Productos · Rotación e inventario (PRD 7.12, P5, P6): cuántos días de inventario tiene la tienda y cada categoría,
 * qué categoría está dormida y qué referencias llevan días sin venderse. La definición es la de `selDiasInventario`
 * (existencias ÷ venta diaria de los últimos 90 días).
 */
export function VistaRotacion({ resaltar }: { resaltar: string | null }) {
  const navegar = useNavigate();
  const hoy = useHoy();
  const d = useDinero();
  const [dias, setDias] = useState<DiasDormida>('60');
  const r = useSel(selResumenRotacion, { hoy, diasSinMovimiento: Number(dias) });
  const tienda = r.tienda;
  const rotacionTienda = rotacionAnual(tienda.dias);

  const orden = useMemo(() => [...r.categorias].sort((a, b) => (Number.isFinite(b.dias) ? b.dias : 99_999) - (Number.isFinite(a.dias) ? a.dias : 99_999)), [r.categorias]);
  const peor = useMemo(() => [...r.categorias].filter((c) => c.estado === 'dormida' && c.categoria).sort((a, b) => b.aCosto - a.aCosto)[0] ?? null, [r.categorias]);
  const tope = Number.isFinite(tienda.dias) ? Math.max(...orden.map((c) => (Number.isFinite(c.dias) ? c.dias : 0)), tienda.dias, 1) : 1;

  const filas: FilaBarra[] = orden.map((c: FilaRotacion) => {
    const nombre = c.categoria ? NOMBRES_CATEGORIA[c.categoria] : 'Toda la tienda';
    const sinVentas = !Number.isFinite(c.dias);
    return {
      id: c.categoria ?? 'tienda',
      etiqueta: nombre,
      valor: sinVentas ? tope : c.dias,
      texto: sinVentas ? 'Sin ventas' : `${entero(Math.round(c.dias))} días`,
      nota: (
        <span>
          {unidades(c.unidades)} · <Dinero valor={c.aCosto} corta /> a costo
        </span>
      ),
      tono: c.estado === 'dormida' || c.estado === 'sin_ventas' ? 'alerta' : c.categoria === resaltar ? 'destacado' : 'normal',
      insignia:
        c.estado === 'dormida' || c.estado === 'sin_ventas' ? (
          <Badge tono="danger" tamano="sm">
            Dormida
          </Badge>
        ) : c.estado === 'agil' ? (
          <Badge tono="success" tamano="sm">
            Rota rápido
          </Badge>
        ) : undefined,
    };
  });

  const columnas: ColumnaTabla<SinMovimiento>[] = [
    {
      id: 'prenda',
      encabezado: 'Prenda',
      ancho: 320,
      celda: (f) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{f.nombre}</p>
          <p className="truncate t-small text-muted">{f.referencia}</p>
        </div>
      ),
      ordenar: (f) => f.nombre,
    },
    { id: 'unidades', encabezado: 'Unidades', numerica: true, celda: (f) => entero(f.unidades), ordenar: (f) => f.unidades },
    { id: 'costo', encabezado: 'Plata quieta (a costo)', numerica: true, celda: (f) => <Dinero valor={f.aCosto} />, ordenar: (f) => f.aCosto },
    { id: 'ultima', encabezado: 'Última venta', numerica: true, celda: (f) => (f.ultimaVenta ? <Fecha valor={f.ultimaVenta} /> : <span className="text-muted">Nunca se ha vendido</span>), ordenar: (f) => f.ultimaVenta },
  ];

  return (
    <div className="flex flex-col gap-8" data-testid="vista-rotacion">
      <div className="grid grid-cols-2 gap-4 desk:grid-cols-4" data-testid="rotacion-kpis">
        <Kpi
          etiqueta="Días de inventario"
          valor={Number.isFinite(tienda.dias) ? Math.round(tienda.dias) : 0}
          formatear={(n) => `${entero(n)} días`}
          nota="Lo que hay, dividido entre lo que vendes por día (últimos 90 días)"
          data-testid="rotacion-kpi-dias"
        />
        <Kpi
          etiqueta="Rotación al año"
          valor={rotacionTienda ?? 0}
          formatear={(n) => `${numero(n, 1)} veces`}
          nota="Cuántas veces vendes tu inventario en un año"
          data-testid="rotacion-kpi-rotacion"
        />
        <Kpi etiqueta="Inventario a costo" valor={tienda.aCosto} formatear={d.corta} completo={d(tienda.aCosto)} nota={unidades(tienda.unidades)} data-testid="rotacion-kpi-costo" />
        <Kpi
          etiqueta="Mercancía dormida"
          valor={r.dormidasACosto}
          formatear={d.corta}
          completo={d(r.dormidasACosto)}
          nota={`${entero(r.dormidas.length)} referencias sin venderse en ${dias} días`}
          destacada={r.dormidasACosto > 0}
          data-testid="rotacion-kpi-dormida"
        />
      </div>

      <Card padding="normal" data-testid="rotacion-categorias">
        <CabezaSeccion
          titulo="Días de inventario por categoría"
          texto="Cuántos días tardarías en vender lo que hay de cada una, al ritmo de los últimos 90 días. La línea marca el promedio de la tienda."
        />
        {peor?.categoria && (
          <div className="mb-5 max-w-[72ch] border-l-2 border-accent pl-3 t-body text-ink" data-testid="rotacion-dormida">
            Tienes <Dinero valor={peor.aCosto} /> quietos en {NOMBRES_CATEGORIA[peor.categoria].toLowerCase()}: a este ritmo tardarías {mesesParaVender(peor.dias) ?? 'varios'} meses en venderlo.
          </div>
        )}
        {filas.length === 0 ? (
          <EmptyState tamano="tabla" icono={PackageCheck} titulo="Sin inventario para analizar" texto="Cuando haya existencias y ventas, aquí verás qué categoría rota más lento." />
        ) : (
          <BarrasHorizontales filas={filas} marca={Number.isFinite(tienda.dias) ? { valor: tienda.dias, etiqueta: `Promedio de la tienda: ${entero(Math.round(tienda.dias))} días` } : null} max={tope} anchoEtiqueta={290} anchoTexto={120} testid="rotacion-barras" />
        )}
        <p className="mt-4 max-w-[72ch] t-small text-muted">Una categoría se marca como dormida cuando necesita más de 1,3 veces los días de inventario de toda la tienda.</p>
      </Card>

      <section aria-label="Mercancía dormida">
        <CabezaSeccion
          titulo="Mercancía dormida"
          texto="Referencias con existencias que no se han vendido en los últimos días. Es plata parada: piensa en una promoción, un cambio de vitrina o no repetirlas en el próximo pedido."
          derecha={
            <Segmentado
              etiqueta="Días sin venderse"
              valor={dias}
              alCambiar={setDias}
              data-testid="dormida-dias"
              opciones={DIAS_DORMIDA.map((x) => ({ valor: x, etiqueta: `${x} días`, 'data-testid': `dormida-dias-${x}` }))}
            />
          }
        />
        <Table
          columnas={columnas}
          filas={r.dormidas}
          clave={(f) => f.productoId}
          sustantivo={['referencia', 'referencias']}
          porPagina={25}
          alAbrir={(f) => navegar(rutas.producto(f.referencia))}
          resaltada={(f) => resaltar !== null && (f.referencia === resaltar || f.productoId === resaltar)}
          totales={r.dormidas.length > 0 ? { prenda: 'Total', unidades: entero(r.dormidas.reduce((s, f) => s + f.unidades, 0)), costo: <Dinero valor={r.dormidasACosto} /> } : undefined}
          vacio={<EmptyState tamano="tabla" icono={Moon} titulo={`Nada lleva ${dias} días sin venderse`} texto="Todas las referencias con existencias tuvieron al menos una venta en ese tiempo." />}
          data-testid="tabla-dormida"
          etiqueta="Mercancía dormida"
        />
      </section>
    </div>
  );
}

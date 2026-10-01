import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Categoria, Id } from '@/dominio/tipos';
import { useHoy, useSel } from '@/estado';
import { selDiasInventario, selSinMovimiento, selValorizacion, type Valorizacion as ResultadoValorizacion } from '@/selectores';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { entero, numero, porcentaje } from '@/lib/formato';
import { NOMBRES_CATEGORIA } from '@/seed/catalogo';
import { BarraProgreso, BotonExportar, Card, Dinero, EncabezadoPagina, Fecha, FranjaResumen, GraficoDinero, Select, Table, type ColumnaTabla } from '@/ui';
import { PestanasModulo, useLocalesInventario } from '../componentes/comun';
import { METODO_COSTO, SUBTITULOS } from '../textos';

type FilaLocal = ResultadoValorizacion['porLocal'][number];
interface FilaCategoria {
  categoria: Categoria;
  nombre: string;
  unidades: number;
  aCosto: number;
  aPrecio: number;
}

/** Valorización del inventario por local y bodega: unidades, a costo y a precio de venta (solo dueño). */
export default function Valorizacion() {
  const params = useParamsRuta('valorizacion');
  const navegar = useNavigate();
  const hoy = useHoy();
  const locales = useLocalesInventario();
  const localId: Id | 'todos' = params.local && locales.some((l) => l.id === params.local) ? params.local : 'todos';
  const v = useSel(selValorizacion, { localId });
  const sinMovimiento = useSel(selSinMovimiento, { dias: 90, hoy });
  const dias = useSel(selDiasInventario, { hoy });

  const categorias = useMemo<FilaCategoria[]>(
    () =>
      (Object.entries(v.porCategoria) as [Categoria, ResultadoValorizacion['porCategoria'][Categoria]][])
        .map(([c, x]) => ({ categoria: c, nombre: NOMBRES_CATEGORIA[c], ...x }))
        .sort((a, b) => b.aCosto - a.aCosto),
    [v.porCategoria],
  );
  const inmovil = useMemo(() => ({ unidades: sinMovimiento.reduce((a, x) => a + x.unidades, 0), aCosto: sinMovimiento.reduce((a, x) => a + x.aCosto, 0) }), [sinMovimiento]);

  const columnasLocal: ColumnaTabla<FilaLocal>[] = [
    { id: 'local', encabezado: 'Local', ordenar: (f) => f.nombre, celda: (f) => <span className="font-semibold">{f.nombre}</span> },
    { id: 'unidades', encabezado: 'Unidades', numerica: true, ordenar: (f) => f.unidades, celda: (f) => entero(f.unidades) },
    { id: 'costo', encabezado: 'A costo', numerica: true, ordenar: (f) => f.aCosto, celda: (f) => <Dinero valor={f.aCosto} /> },
    { id: 'precio', encabezado: 'A precio de venta', numerica: true, ordenar: (f) => f.aPrecio, celda: (f) => <Dinero valor={f.aPrecio} /> },
    {
      id: 'parte',
      encabezado: 'Parte del valor',
      ancho: 200,
      celda: (f) => (
        <span className="flex items-center gap-3">
          <BarraProgreso valor={v.total.aCosto > 0 ? f.aCosto / v.total.aCosto : 0} className="w-24" />
          <span className="t-small num text-muted">{porcentaje(v.total.aCosto > 0 ? f.aCosto / v.total.aCosto : 0, 0)}</span>
        </span>
      ),
    },
  ];

  const columnasCategoria: ColumnaTabla<FilaCategoria>[] = [
    { id: 'categoria', encabezado: 'Categoría', ordenar: (f) => f.nombre, celda: (f) => f.nombre },
    { id: 'unidades', encabezado: 'Unidades', numerica: true, ordenar: (f) => f.unidades, celda: (f) => entero(f.unidades) },
    { id: 'costo', encabezado: 'A costo', numerica: true, ordenar: (f) => f.aCosto, celda: (f) => <Dinero valor={f.aCosto} /> },
    { id: 'precio', encabezado: 'A precio de venta', numerica: true, ordenar: (f) => f.aPrecio, celda: (f) => <Dinero valor={f.aPrecio} /> },
  ];

  const nombreLocal = localId === 'todos' ? 'los tres locales y la bodega' : (locales.find((l) => l.id === localId)?.nombre ?? '');

  return (
    <div className="pb-16">
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Inventario', a: rutas.inventario() }, { texto: 'Valorización' }]}
        titulo="Valorización"
        subtitulo={SUBTITULOS.valorizacion}
        acciones={<BotonExportar reporte="inventario" filtros={{ localId }} menu />}
        pestanas={<PestanasModulo />}
      />

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <Select
          etiqueta="Local"
          valor={localId}
          alCambiar={(l) => navegar(rutas.valorizacion({ local: l === 'todos' ? null : l }), { replace: true })}
          opciones={[{ valor: 'todos', etiqueta: 'Todos los locales y la bodega' }, ...locales.map((l) => ({ valor: l.id, etiqueta: l.nombre }))]}
          className="w-[320px]"
          data-testid="valorizacion-local"
        />
        <p className="max-w-[60ch] t-small text-muted" data-testid="metodo-valorizacion">
          Método: <strong className="font-semibold text-ink">{v.metodo ?? METODO_COSTO}</strong>. Se valora con el costo de la última importación que aplicaste al inventario.
        </p>
      </div>

      <FranjaResumen
        className="mt-6"
        cifras={[
          { etiqueta: 'Unidades', valor: <span data-testid="val-unidades">{entero(v.total.unidades)}</span> },
          { etiqueta: 'Valor a costo', valor: <span data-testid="val-costo"><Dinero valor={v.total.aCosto} corta /></span> },
          { etiqueta: 'Valor a precio de venta', valor: <Dinero valor={v.total.aPrecio} corta /> },
          { etiqueta: 'Costo por unidad', valor: <Dinero valor={v.total.unidades > 0 ? Math.round(v.total.aCosto / v.total.unidades) : 0} /> },
        ]}
      />
      <p className="mt-2 t-small text-muted">El precio de venta incluye el IVA. Valores de {nombreLocal}.</p>

      <div className="mt-10 grid grid-cols-12 gap-6">
        <section className="col-span-12 xl:col-span-7" aria-labelledby="t-val-locales">
          <h2 id="t-val-locales" className="mb-3 t-h2 text-ink">
            Por local
          </h2>
          <Table
            columnas={columnasLocal}
            filas={v.porLocal}
            clave={(f) => f.localId}
            porPagina={0}
            sustantivo={['local', 'locales']}
            etiqueta="Valorización por local"
            totales={{ unidades: entero(v.total.unidades), costo: <Dinero valor={v.total.aCosto} />, precio: <Dinero valor={v.total.aPrecio} /> }}
            data-testid="tabla-valorizacion-locales"
          />
        </section>
        <Card className="col-span-12 xl:col-span-5" titulo="Valor por categoría">
          <GraficoDinero
            tipo="barras"
            datos={categorias.map((c) => ({ categoria: c.nombre, costo: c.aCosto, precio: c.aPrecio }))}
            x="categoria"
            series={[
              { clave: 'costo', nombre: 'A costo', color: 1 },
              { clave: 'precio', nombre: 'A precio de venta', color: 3 },
            ]}
            alto={240}
          />
        </Card>
      </div>

      <section className="mt-10" aria-labelledby="t-val-cat">
        <h2 id="t-val-cat" className="mb-3 t-h2 text-ink">
          Por categoría
        </h2>
        <Table
          columnas={columnasCategoria}
          filas={categorias}
          clave={(f) => f.categoria}
          porPagina={0}
          sustantivo={['categoría', 'categorías']}
          etiqueta="Valorización por categoría"
          totales={{ unidades: entero(v.total.unidades), costo: <Dinero valor={v.total.aCosto} />, precio: <Dinero valor={v.total.aPrecio} /> }}
          data-testid="tabla-valorizacion-categorias"
        />
      </section>

      <section className="mt-10" aria-labelledby="t-val-salud">
        <h2 id="t-val-salud" className="mb-1 t-h2 text-ink">
          Cuánto de ese valor no se mueve
        </h2>
        <p className="mb-4 max-w-[72ch] t-body text-muted">En toda la tienda: referencias con existencias y sin una sola venta en los últimos 90 días.</p>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 xl:col-span-4">
            <FranjaResumen
              cifras={[
                { etiqueta: 'Sin movimiento', valor: <Dinero valor={inmovil.aCosto} corta /> },
                { etiqueta: 'Días de inventario', valor: numero(dias.dias, 0) },
              ]}
              className="md:grid-cols-2"
            />
            <p className="mt-3 t-small text-muted num">
              {entero(sinMovimiento.length)} referencias y {entero(inmovil.unidades)} unidades. Los días de inventario son las existencias entre la venta diaria de los últimos 90 días.
            </p>
          </div>
          <div className="col-span-12 xl:col-span-8">
            <Table
              columnas={[
                {
                  id: 'ref',
                  encabezado: 'Referencia',
                  celda: (f) => (
                    <Link to={rutas.producto(f.referencia)} className="block truncate underline-offset-4 hover:underline">
                      <span className="font-semibold text-ink">{f.nombre}</span> <span className="t-ref text-muted">{f.referencia}</span>
                    </Link>
                  ),
                },
                { id: 'unidades', encabezado: 'Unidades', numerica: true, celda: (f) => entero(f.unidades) },
                { id: 'costo', encabezado: 'A costo', numerica: true, celda: (f) => <Dinero valor={f.aCosto} /> },
                { id: 'ultima', encabezado: 'Última venta', celda: (f) => (f.ultimaVenta ? <Fecha valor={f.ultimaVenta} /> : <span className="text-muted">Nunca</span>) },
              ]}
              filas={sinMovimiento.slice(0, 10)}
              clave={(f) => f.productoId}
              porPagina={0}
              sustantivo={['referencia', 'referencias']}
              etiqueta="Referencias sin movimiento"
              data-testid="tabla-sin-movimiento"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

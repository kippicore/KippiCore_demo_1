import { Grid2x2, LayoutGrid, PackageSearch, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import type { Categoria as CategoriaProducto } from '@/dominio/tipos';
import { useSel } from '@/estado';
import { plural } from '@/lib/formato';
import { BotonEnlace, Button, CajaTalla, ChipFiltro, cn, EmptyState, Icono, Migas, MuestraColor } from '@/ui/ligero';
import { BotonPildora, Checkbox, GrupoPildora, GrupoRadio } from '@/ui';
import {
  coloresPresentes,
  FILTRO_VACIO,
  filtrarProductos,
  ordenarProductos,
  productosDeSeccion,
  resolverColor,
  seccionPorSlug,
  tallasDisponibles,
  tiposPresentes,
} from '../calculos';
import { TarjetaProducto } from '../componentes/TarjetaProducto';
import { useEnlaces } from '../enlaces';
import { selCatalogoTienda } from '../selectores';
import { NOMBRE_CATEGORIA, ORDENES, TEXTOS } from '../textos';
import type { OrdenProductos, SlugSeccion } from '../tipos';

type Panel = 'filtrar' | 'ordenar' | 'talla' | 'color' | null;

/**
 * Listado de una categoría (PLAN 8.6.4): migas, título, conteo, barra de filtros fija con el grupo píldora negro
 * (Filtrar · Ordenar · Talla · Color) y grilla de 4 columnas con gutter estrecho. `?talla=` y `?color=` se honran
 * y se reflejan en la URL.
 */
export default function Categoria() {
  const { categoria, talla: tallaUrl, color: colorUrl } = useParamsRuta('tiendaCategoria');
  const seccion = seccionPorSlug(categoria);
  if (!seccion) return <SeccionInexistente />;
  return <ListadoSeccion slug={seccion.slug} tallaUrl={tallaUrl} colorUrl={colorUrl} />;
}

function SeccionInexistente() {
  const { con } = useEnlaces();
  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-32 md:px-6" data-testid="tienda-seccion-inexistente">
      <EmptyState
        icono={PackageSearch}
        titulo="Esa sección no existe"
        texto="Revisa el enlace o entra por alguna de las categorías de la tienda."
        accion={<BotonEnlace to={con(rutas.tiendaCategoria('novedades'))} tienda tamano="lg">Ver novedades</BotonEnlace>}
      />
    </div>
  );
}

function ListadoSeccion({ slug, tallaUrl, colorUrl }: { slug: SlugSeccion; tallaUrl: string | null; colorUrl: string | null }) {
  const { con, ir } = useEnlaces();
  const { productos } = useSel(selCatalogoTienda);
  const seccion = seccionPorSlug(slug);
  const base = useMemo(() => productosDeSeccion(productos, slug), [productos, slug]);
  const tipos = useMemo(() => tiposPresentes(base), [base]);
  const tallas = useMemo(() => tallasDisponibles(base), [base]);
  const colores = useMemo(() => coloresPresentes(base), [base]);

  const talla = tallaUrl && tallas.includes(tallaUrl) ? tallaUrl : null;
  const color = resolverColor(colorUrl, colores);
  const [tiposElegidos, setTiposElegidos] = useState<CategoriaProducto[]>([]);
  const [solo, setSolo] = useState(false);
  const [orden, setOrden] = useState<OrdenProductos>('destacados');
  const [columnas, setColumnas] = useState<2 | 4>(4);
  const [panel, setPanel] = useState<Panel>(null);

  const lista = useMemo(
    () => ordenarProductos(filtrarProductos(base, { ...FILTRO_VACIO, tipos: tiposElegidos, talla, colorId: color?.id ?? null, soloDisponibles: solo }), orden),
    [base, tiposElegidos, talla, color?.id, solo, orden],
  );

  const aUrl = (t: string | null, c: string | null) => ir(rutas.tiendaCategoria(slug, { talla: t, color: c }), { replace: true });
  const hayFiltros = tiposElegidos.length > 0 || solo || talla !== null || color !== null;
  const limpiar = () => {
    setTiposElegidos([]);
    setSolo(false);
    aUrl(null, null);
  };
  if (!seccion) return null;
  const nFiltrar = tiposElegidos.length + (solo ? 1 : 0);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-24 md:px-6 md:pt-28" data-testid="tienda-categoria" data-seccion={slug}>
      <Migas migas={[{ texto: 'Inicio', a: con(rutas.tienda()) }, { texto: 'Hombre' }, { texto: seccion.titulo }]} />
      <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="t-h1 uppercase text-ink" data-testid="tienda-titulo">
          {seccion.titulo}
        </h1>
        <p className="t-body text-muted num" data-testid="tienda-conteo">
          {plural(lista.length, 'artículo')}
        </p>
      </div>
      <p className="mt-1 max-w-[60ch] t-body text-muted">{seccion.texto}</p>

      <div className="sticky top-[72px] z-(--z-sticky) -mx-4 mt-6 flex items-center justify-between gap-3 bg-canvas px-4 py-3 md:top-[88px] md:-mx-6 md:px-6">
        <GrupoPildora>
          <BotonPildora etiqueta={TEXTOS.filtros.filtrar} icono={SlidersHorizontal} contador={nFiltrar} abierto={panel === 'filtrar'} alCambiar={(v) => setPanel(v ? 'filtrar' : null)} anchoPanel={300} data-testid="tienda-filtro-filtrar">
            <div className="flex flex-col gap-3">
              {tipos.length > 1 && (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 t-small text-muted">Tipo de prenda</legend>
                  {tipos.map((t) => (
                    <Checkbox
                      key={t}
                      etiqueta={NOMBRE_CATEGORIA[t]}
                      marcado={tiposElegidos.includes(t)}
                      alCambiar={(v) => setTiposElegidos((a) => (v ? [...a, t] : a.filter((x) => x !== t)))}
                    />
                  ))}
                </fieldset>
              )}
              <Checkbox etiqueta="Solo con existencias" marcado={solo} alCambiar={setSolo} />
            </div>
          </BotonPildora>
          <BotonPildora etiqueta={TEXTOS.filtros.ordenar} abierto={panel === 'ordenar'} alCambiar={(v) => setPanel(v ? 'ordenar' : null)} anchoPanel={280} data-testid="tienda-filtro-ordenar">
            <GrupoRadio
              valor={orden}
              alCambiar={(v) => {
                setOrden(v);
                setPanel(null);
              }}
              opciones={ORDENES.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
            />
          </BotonPildora>
          <BotonPildora etiqueta={TEXTOS.filtros.talla} valor={talla ?? undefined} abierto={panel === 'talla'} alCambiar={(v) => setPanel(v ? 'talla' : null)} anchoPanel={300} data-testid="tienda-filtro-talla">
            <div className="grid grid-cols-5 gap-2">
              {tallas.map((t) => (
                <CajaTalla
                  key={t}
                  talla={t}
                  seleccionada={t === talla}
                  onClick={() => {
                    aUrl(t === talla ? null : t, color?.codigo.toLowerCase() ?? null);
                    setPanel(null);
                  }}
                />
              ))}
            </div>
          </BotonPildora>
          <BotonPildora etiqueta={TEXTOS.filtros.color} valor={color?.nombre} abierto={panel === 'color'} alCambiar={(v) => setPanel(v ? 'color' : null)} anchoPanel={300} data-testid="tienda-filtro-color">
            <ul className="grid max-h-72 grid-cols-1 gap-0.5 overflow-y-auto">
              {colores.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={c.id === color?.id}
                    onClick={() => {
                      aUrl(talla, c.id === color?.id ? null : c.codigo.toLowerCase());
                      setPanel(null);
                    }}
                    className={cn('flex h-9 w-full items-center gap-3 px-1 text-left t-body hover:bg-surface-2', c.id === color?.id && 'font-bold')}
                  >
                    <MuestraColor hex={c.hex} patron={c.patron} nombre={c.nombre} tamano={16} />
                    {c.nombre}
                  </button>
                </li>
              ))}
            </ul>
          </BotonPildora>
        </GrupoPildora>
        <div className="hidden items-center gap-1 lg:flex" role="group" aria-label="Columnas de la grilla">
          <button type="button" aria-pressed={columnas === 2} aria-label="Ver en 2 columnas" onClick={() => setColumnas(2)} className={cn(BOTON_COLUMNAS, columnas === 2 && 'text-ink', columnas !== 2 && 'text-subtle')}>
            <Icono icono={Grid2x2} tamano={20} />
          </button>
          <button type="button" aria-pressed={columnas === 4} aria-label="Ver en 4 columnas" onClick={() => setColumnas(4)} className={cn(BOTON_COLUMNAS, columnas === 4 && 'text-ink', columnas !== 4 && 'text-subtle')}>
            <Icono icono={LayoutGrid} tamano={20} />
          </button>
        </div>
      </div>

      {hayFiltros && (
        <div className="flex flex-wrap items-center gap-2 pb-4" data-testid="tienda-chips">
          {talla && <ChipFiltro alQuitar={() => aUrl(null, color?.codigo.toLowerCase() ?? null)}>Talla {talla}</ChipFiltro>}
          {color && <ChipFiltro alQuitar={() => aUrl(talla, null)}>{color.nombre}</ChipFiltro>}
          {tiposElegidos.map((t) => (
            <ChipFiltro key={t} alQuitar={() => setTiposElegidos((a) => a.filter((x) => x !== t))}>
              {NOMBRE_CATEGORIA[t]}
            </ChipFiltro>
          ))}
          {solo && <ChipFiltro alQuitar={() => setSolo(false)}>Solo con existencias</ChipFiltro>}
          <Button variante="link" tamano="sm" onClick={limpiar}>
            {TEXTOS.filtros.limpiar}
          </Button>
        </div>
      )}

      {lista.length === 0 ? (
        <EmptyState
          className="mt-8"
          icono={PackageSearch}
          titulo="Ningún artículo con estos filtros"
          texto="Prueba con otra talla o color, o quita algún filtro."
          accion={
            <Button variante="secondary" tamano="lg" tienda onClick={limpiar}>
              {TEXTOS.filtros.limpiar}
            </Button>
          }
        />
      ) : (
        <div className={cn('mt-2 grid grid-cols-2 gap-x-2 gap-y-8 md:grid-cols-3', columnas === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-2')} data-testid="tienda-grilla">
          {lista.map((p) => (
            <TarjetaProducto key={p.id} producto={p} colorPedido={color?.id ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}

const BOTON_COLUMNAS = 'inline-flex size-10 items-center justify-center transition-colors hover:text-ink';

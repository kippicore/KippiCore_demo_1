import { PackageSearch } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { useSel } from '@/estado';
import { selMatrizExistencias } from '@/selectores';
import { Acordeon, Dialog } from '@/ui';
import { avisar, BotonEnlace, Button, CajaTalla, cn, Dinero, EmptyState, Migas, MuestraColor, Prenda } from '@/ui/ligero';
import { useBolsa } from '../bolsa';
import { colorInicial, notaExistencias, productosRelacionados, seccionDeProducto } from '../calculos';
import { CajonBolsa } from '../componentes/CajonBolsa';
import { DisponibilidadTiendas, TablaGuiaTallas } from '../componentes/InfoFicha';
import { TarjetaProducto } from '../componentes/TarjetaProducto';
import { useEnlaces } from '../enlaces';
import { selCatalogoTienda } from '../selectores';
import { cuidadoDe, ENVIOS, SECCIONES, TEXTOS } from '../textos';
import type { CatalogoTienda, ColorTienda, ProductoTienda, VarianteTienda } from '../tipos';
import type { VistaPrenda } from '@/ui/prenda/Prenda';

/**
 * Ficha de producto (PLAN 8.6.5): galería grande a la izquierda (frente, detalle, tejido y otro color) y columna
 * estrecha a la derecha con título, precio, color, talla con disponibilidad REAL del local de despacho, CTA negro de
 * ancho completo y acordeones. En celular la galería es un carrusel y el CTA queda fijo abajo.
 */
export default function Producto() {
  const { slug, talla, color } = useParamsRuta('tiendaProducto');
  const catalogo = useSel(selCatalogoTienda);
  const producto = catalogo.productos.find((p) => p.slug === slug);
  if (!producto) return <NoEncontrado />;
  return <Ficha key={producto.id} producto={producto} catalogo={catalogo} tallaUrl={talla} colorUrl={color} />;
}

function NoEncontrado() {
  const { con } = useEnlaces();
  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-32 md:px-6" data-testid="tienda-producto-inexistente">
      <EmptyState
        icono={PackageSearch}
        titulo="Esta prenda ya no está en la tienda"
        texto="Puede que se haya agotado o que el enlace esté incompleto. Mira lo nuevo de la temporada."
        accion={<BotonEnlace to={con(rutas.tiendaCategoria('novedades'))} tienda tamano="lg">Ver novedades</BotonEnlace>}
      />
    </div>
  );
}

type Visor = { vista: VistaPrenda; color: ColorTienda } | null;

function Ficha({ producto, catalogo, tallaUrl, colorUrl }: { producto: ProductoTienda; catalogo: CatalogoTienda; tallaUrl: string | null; colorUrl: string | null }) {
  const { con, enMarco } = useEnlaces();
  const matriz = useSel(selMatrizExistencias, { productoId: producto.id });
  const agregar = useBolsa((s) => s.agregar);
  const enBolsa = useBolsa((s) => s.lineas);

  const [colorId, setColorId] = useState<string>(() => colorInicial(producto, colorUrl)?.id ?? '');
  const color = producto.colores.find((c) => c.id === colorId) ?? producto.colores[0];
  const variantes = useMemo(() => Object.values(catalogo.variantes).filter((v) => v.productoId === producto.id), [catalogo.variantes, producto.id]);
  const stockDe = (talla: string, cId: string): VarianteTienda | undefined => variantes.find((v) => v.talla === talla && v.colorId === cId);
  const [talla, setTalla] = useState<string | null>(() => {
    const t = tallaUrl && producto.tallas.some((x) => x.talla === tallaUrl) ? tallaUrl : null;
    const c = colorInicial(producto, colorUrl);
    return t && c && (stockDe(t, c.id)?.stock ?? 0) > 0 ? t : null;
  });
  const [cajon, setCajon] = useState(false);
  const [guia, setGuia] = useState(false);
  const [tiendas, setTiendas] = useState(false);
  const [visor, setVisor] = useState<Visor>(null);
  const [slide, setSlide] = useState(0);
  const carrusel = useRef<HTMLDivElement>(null);

  if (!color) return <NoEncontrado />;
  const variante = talla ? stockDe(talla, color.id) : undefined;
  const stock = variante?.stock ?? 0;
  const seccion = SECCIONES.find((s) => s.slug === seccionDeProducto(producto));
  const otroColor = producto.colores.find((c) => c.id !== color.id) ?? null;
  const vistas: { vista: VistaPrenda; color: ColorTienda; etiqueta: string }[] = [
    { vista: 'frente', color, etiqueta: 'Frente' },
    { vista: 'detalle', color, etiqueta: 'Detalle' },
    { vista: 'tejido', color, etiqueta: 'Tejido' },
    ...(otroColor ? [{ vista: 'frente' as const, color: otroColor, etiqueta: `En ${otroColor.nombre.toLowerCase()}` }] : []),
  ];
  const otros = (matriz?.locales ?? [])
    .filter((l) => l.vende && l.id !== catalogo.local.id)
    .filter((l) => (talla ? (matriz?.celdas[`${talla}|${color.id}`]?.[l.id] ?? 0) > 0 : producto.tallas.some((t) => (matriz?.celdas[`${t.talla}|${color.id}`]?.[l.id] ?? 0) > 0)))
    .map((l) => l.nombre);
  const nota = notaExistencias({ stock: talla ? stock : null, despacho: catalogo.local.nombre, otros });
  const relacionados = productosRelacionados(catalogo.productos, producto, 4);
  const yaEnBolsa = variante ? (enBolsa.find((l) => l.varianteId === variante.id)?.cantidad ?? 0) : 0;

  const cambiarColor = (c: ColorTienda) => {
    setColorId(c.id);
    if (talla && (stockDe(talla, c.id)?.stock ?? 0) <= 0) setTalla(null);
  };
  const agregarABolsa = () => {
    if (!variante || stock <= 0) return;
    const antes = yaEnBolsa;
    const ahora = agregar(variante.id, variante.stock);
    if (ahora <= antes) avisar({ tipo: 'alerta', texto: 'Ya tienes en tu bolsa todas las unidades que hay de esta talla.' });
    else setCajon(true);
  };
  const etiquetaCta = !talla ? TEXTOS.ficha.elegirTalla : stock <= 0 ? TEXTOS.ficha.agotado : TEXTOS.ficha.agregar;
  const cta = (testid: string) => (
    <Button
      tienda
      tamano="lg"
      anchoCompleto
      className="h-[52px]"
      disabled={!variante || stock <= 0}
      motivo={!talla ? 'Elige una talla para agregarla a la bolsa' : 'No hay unidades de esta talla'}
      onClick={agregarABolsa}
      data-testid={testid}
    >
      {etiquetaCta}
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-24 pt-24 md:px-6 md:pt-28 lg:pb-10" data-testid="tienda-producto" data-slug={producto.slug}>
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-10">
        <section aria-label="Galería" className="lg:col-span-8">
          <div ref={carrusel} onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))} className="-mx-4 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] md:mx-0 lg:grid lg:grid-cols-2 lg:gap-2 lg:overflow-visible [&::-webkit-scrollbar]:hidden" data-testid="tienda-galeria">
            {vistas.map((v, i) => (
              <button
                key={`${v.vista}-${v.color.id}`}
                type="button"
                onClick={() => setVisor({ vista: v.vista, color: v.color })}
                aria-label={`Ampliar vista: ${v.etiqueta}`}
                className="relative aspect-[3/4] w-full shrink-0 cursor-zoom-in snap-center bg-product lg:w-auto"
                data-testid={`tienda-vista-${i}`}
              >
                <Prenda tipo={producto.tipoPrenda} color={v.color.hex} patron={v.color.patron} vista={v.vista} tamano="hero" nombre={`${producto.nombre}, ${v.color.nombre}, vista ${v.etiqueta.toLowerCase()}`} />
              </button>
            ))}
          </div>
          <div className="mt-3 flex justify-center gap-1.5 lg:hidden" aria-hidden>
            {vistas.map((_, i) => (
              <span key={i} className={cn('h-0.5 w-6', i === slide ? 'bg-ink' : 'bg-line-strong')} />
            ))}
          </div>
        </section>

        <section aria-label="Información del producto" className="mt-6 lg:col-span-4 lg:mt-0 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-6">
            <Migas migas={[{ texto: 'Inicio', a: con(rutas.tienda()) }, { texto: 'Hombre' }, { texto: seccion?.titulo ?? 'Tienda', a: seccion ? con(rutas.tiendaCategoria(seccion.slug)) : undefined }, { texto: producto.nombre }]} />
            <div>
              <h1 className="t-h1-ficha uppercase text-ink" data-testid="tienda-nombre">
                {producto.nombre}
              </h1>
              <p className="mt-2 t-body-lg text-ink" data-testid="tienda-precio">
                <Dinero valor={producto.precio} />
              </p>
              <p className="mt-0.5 t-small text-muted">IVA incluido · Ref. {producto.referencia}</p>
            </div>

            <div>
              <p className="t-label text-ink">
                Color: <span className="font-bold" data-testid="tienda-color-nombre">{color.nombre}</span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1" role="group" aria-label="Color">
                {producto.colores.map((c) => (
                  <MuestraColor key={c.id} hex={c.hex} patron={c.patron} nombre={c.nombre} tamano={24} seleccionada={c.id === color.id} agotada={c.unidades <= 0} onClick={() => cambiarColor(c)} />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <p className="t-label text-ink">Talla{talla && <span className="font-bold"> {talla}</span>}</p>
                <button type="button" onClick={() => setGuia(true)} className="t-small underline underline-offset-4 decoration-1 text-ink">
                  {TEXTOS.ficha.guiaTallas}
                </button>
              </div>
              <div className="mt-2 grid grid-cols-5 gap-2" role="group" aria-label="Talla" data-testid="tienda-tallas">
                {producto.tallas.map((t) => {
                  const u = stockDe(t.talla, color.id)?.stock ?? 0;
                  const donde = (matriz?.locales ?? []).filter((l) => l.vende && l.id !== catalogo.local.id && (matriz?.celdas[`${t.talla}|${color.id}`]?.[l.id] ?? 0) > 0).map((l) => l.nombre);
                  return (
                    <span key={t.talla} className="contents" data-testid={`tienda-talla-${t.talla}`} data-stock={u}>
                      <CajaTalla
                        talla={t.talla}
                        alto={48}
                        seleccionada={t.talla === talla}
                        agotada={u <= 0}
                        motivo={u <= 0 ? `Agotada para envío${donde.length ? ` · se puede recoger en ${donde.join(' y ')}` : ''}` : `${u} ${u === 1 ? 'disponible' : 'disponibles'} para envío`}
                        onClick={() => (u > 0 ? setTalla(t.talla === talla ? null : t.talla) : undefined)}
                      />
                    </span>
                  );
                })}
              </div>
              <p className={cn('mt-3 t-small', nota.tono === 'warning' ? 'text-warning' : 'text-muted')} data-testid="tienda-nota-existencias">
                {nota.texto}
              </p>
            </div>

            <div className="hidden lg:block">{cta('tienda-agregar')}</div>
            <button type="button" onClick={() => setTiendas(true)} className="t-label underline underline-offset-4 decoration-1 text-ink">
              {TEXTOS.ficha.verDisponibilidad}
            </button>

            <Acordeon
              tienda
              abiertas={['detalles']}
              secciones={[
                {
                  id: 'detalles',
                  titulo: 'Detalles',
                  contenido: (
                    <div className="space-y-3">
                      <p>{producto.descripcion}</p>
                      <p className="t-small">
                        {producto.temporada} · {producto.material}
                      </p>
                    </div>
                  ),
                },
                { id: 'cuidado', titulo: 'Composición y cuidado', contenido: <div className="space-y-3"><p>{producto.material}.</p><p>{cuidadoDe(producto.tipoPrenda, producto.material)}</p></div> },
                { id: 'envios', titulo: 'Envíos, cambios y devoluciones', contenido: <ul className="space-y-2">{ENVIOS.map((e) => <li key={e}>{e}</li>)}</ul> },
                { id: 'disponibilidad', titulo: 'Disponibilidad por tienda', contenido: <DisponibilidadTiendas matriz={matriz} producto={producto} color={color} tallaElegida={talla} despachoId={catalogo.local.id} /> },
              ]}
            />
          </div>
        </section>
      </div>

      {relacionados.length > 0 && (
        <section className="mt-20 md:mt-28" aria-labelledby="titulo-relacionados">
          <h2 id="titulo-relacionados" className="t-h1 uppercase text-ink">
            {TEXTOS.ficha.tambien}
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-x-2 gap-y-8 md:grid-cols-4">
            {relacionados.map((p) => (
              <TarjetaProducto key={p.id} producto={p} />
            ))}
          </div>
        </section>
      )}

      <div className={cn('fixed inset-x-0 bottom-0 z-(--z-sticky) border-t border-line bg-surface px-4 pt-3 lg:hidden', enMarco ? 'pb-3' : 'pb-14')} data-testid="tienda-barra-fija">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="t-nav-tienda text-ink">{producto.nombre}</span>
          <span className="t-body-lg text-ink">
            <Dinero valor={producto.precio} />
          </span>
        </div>
        {cta('tienda-agregar-fijo')}
      </div>

      <CajonBolsa abierto={cajon} alCambiar={setCajon} />
      <Dialog abierto={guia} alCambiar={setGuia} titulo={TEXTOS.ficha.guiaTallas} ancho="md">
        <TablaGuiaTallas curva={producto.curvaTallas} />
      </Dialog>
      <Dialog abierto={tiendas} alCambiar={setTiendas} titulo="Disponibilidad en tienda" eyebrow={producto.nombre} ancho="lg">
        <DisponibilidadTiendas matriz={matriz} producto={producto} color={color} tallaElegida={talla} despachoId={catalogo.local.id} />
      </Dialog>
      <Dialog abierto={visor !== null} alCambiar={(v) => !v && setVisor(null)} titulo={producto.nombre} ancho="md" data-testid="tienda-visor">
        {visor && (
          <div className="mx-auto w-[min(100%,480px)]">
            <Prenda tipo={producto.tipoPrenda} color={visor.color.hex} patron={visor.color.patron} vista={visor.vista} tamano="hero" nombre={`${producto.nombre}, ${visor.color.nombre}`} />
          </div>
        )}
      </Dialog>
    </div>
  );
}

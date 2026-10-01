import { Link } from 'react-router';
import { rutas } from '@/app/rutas';
import { TEXTOS_FIJOS } from '@/config/textos/notas';
import { useMarca, useSel } from '@/estado';
import { BotonEnlace, Pista, Prenda } from '@/ui/ligero';
import { prendaDestacada, ordenarProductos, productosDeSeccion } from '../calculos';
import { Carrusel, CeldaCarrusel } from '../componentes/Carrusel';
import { TarjetaProducto } from '../componentes/TarjetaProducto';
import { useContadorEnEncabezado, useEnlaces } from '../enlaces';
import { selCatalogoTienda } from '../selectores';
import { SECCIONES, TEXTOS } from '../textos';
import type { SlugSeccion } from '../tipos';

/**
 * Portada de la tienda (PLAN 8.6.3): hero a sangre con tres prendas ilustradas en composición, categorías en 4
 * columnas, carrusel de novedades y banner editorial dividido. Todo sale del inventario real.
 */
const CATEGORIAS_PORTADA: readonly { slug: SlugSeccion; tipo: 'blazer' | 'camisa' | 'pantalon' | 'abrigo'; colores: readonly string[] }[] = [
  { slug: 'sastreria', tipo: 'blazer', colores: ['col_azn', 'col_car'] },
  { slug: 'camisas', tipo: 'camisa', colores: ['col_azc', 'col_bla'] },
  { slug: 'pantalones', tipo: 'pantalon', colores: ['col_are', 'col_azn'] },
  { slug: 'abrigos', tipo: 'abrigo', colores: ['col_cml', 'col_car'] },
];

export default function Portada() {
  useContadorEnEncabezado();
  const marca = useMarca();
  const { con } = useEnlaces();
  const { productos } = useSel(selCatalogoTienda);
  const abrigo = prendaDestacada(productos, 'abrigo', ['col_cml']);
  const sueter = prendaDestacada(productos, 'sweater', ['col_mfl', 'col_are']);
  const pantalon = prendaDestacada(productos, 'pantalon', ['col_car']);
  const traje = prendaDestacada(productos, 'traje', ['col_azn']);
  const novedades = ordenarProductos(productosDeSeccion(productos, 'novedades'), 'destacados').slice(0, 10);
  const enlaceProducto = (p: { producto: { slug: string }; color: { codigo: string } }) => con(rutas.tiendaProducto(p.producto.slug, { color: p.color.codigo.toLowerCase() }));

  return (
    <div data-testid="tienda-portada">
      <section aria-label="Portada" className="relative isolate h-[100svh] min-h-[560px] overflow-hidden bg-tienda-hero text-sobre-hero">
        <div className="absolute inset-x-0 bottom-[36%] top-[84px] flex items-center justify-center md:bottom-[34%]">
          {sueter && (
            <Link to={enlaceProducto(sueter)} tabIndex={-1} aria-label={sueter.producto.nombre} className="relative -mr-[3%] w-[min(34vw,32svh)] translate-y-[8%] -rotate-3 self-end">
              <Prenda tipo={sueter.producto.tipoPrenda} color={sueter.color.hex} patron={sueter.color.patron} tamano="hero" />
            </Link>
          )}
          {abrigo && (
            <Link to={enlaceProducto(abrigo)} tabIndex={-1} aria-label={abrigo.producto.nombre} className="relative z-10 w-[min(54vw,42svh)]">
              <Prenda tipo={abrigo.producto.tipoPrenda} color={abrigo.color.hex} patron={abrigo.color.patron} tamano="hero" />
            </Link>
          )}
          {pantalon && (
            <Link to={enlaceProducto(pantalon)} tabIndex={-1} aria-label={pantalon.producto.nombre} className="relative -ml-[3%] w-[min(34vw,32svh)] translate-y-[8%] rotate-3 self-end">
              <Prenda tipo={pantalon.producto.tipoPrenda} color={pantalon.color.hex} patron={pantalon.color.patron} tamano="hero" />
            </Link>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-16 text-center md:pb-20">
          <p className="t-eyebrow uppercase text-sobre-hero/70">{TEXTOS.portada.eyebrow}</p>
          <h1 className="mt-3 max-w-[16ch] t-display-sm uppercase md:t-display">{TEXTOS.portada.titular}</h1>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            <Link to={con(rutas.tiendaCategoria('novedades'))} className="t-body-lg font-bold underline decoration-1 underline-offset-4">
              {TEXTOS.portada.comprar}
            </Link>
            <Link to={con(rutas.tiendaCategoria('sastreria'))} className="t-body-lg font-bold underline decoration-1 underline-offset-4">
              {TEXTOS.portada.coleccion}
            </Link>
          </div>
        </div>
      </section>

      <Pista id="tienda.franja" lado="abajo" alinear="fin">
        <div data-testid="tienda-franja" className="sobre-ink bg-ink px-4 py-3 text-center t-small text-inverse md:px-6">
          <span className="font-bold">{TEXTOS_FIJOS.vitrina.replace('{{marca}}', marca.nombre)}.</span> <span className="text-inverse/80">{TEXTOS.franja}</span>
        </div>
      </Pista>

      <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6">
        <section aria-labelledby="titulo-categorias" className="pt-16 md:pt-24">
          <h2 id="titulo-categorias" className="sr-only">
            {TEXTOS.portada.categorias}
          </h2>
          <div className="grid grid-cols-2 gap-x-2 gap-y-8 md:grid-cols-4">
            {CATEGORIAS_PORTADA.map((c) => {
              const seccion = SECCIONES.find((s) => s.slug === c.slug);
              const prenda = prendaDestacada(productosDeSeccion(productos, c.slug), c.tipo, c.colores);
              if (!seccion) return null;
              return (
                <Link key={c.slug} to={con(rutas.tiendaCategoria(c.slug))} className="group block" data-testid={`tienda-categoria-${c.slug}`}>
                  <div className="aspect-[3/4] overflow-hidden bg-product">
                    {prenda && (
                      <div className="size-full transition-transform duration-500 ease-standard group-hover:scale-[1.03]">
                        <Prenda tipo={prenda.producto.tipoPrenda} color={prenda.color.hex} patron={prenda.color.patron} />
                      </div>
                    )}
                  </div>
                  <p className="mt-4 t-h3 font-extrabold uppercase text-ink">{seccion.etiqueta}</p>
                  <p className="mt-1 t-label underline underline-offset-4 decoration-1">{TEXTOS.portada.verTodo}</p>
                </Link>
              );
            })}
          </div>
        </section>

        {novedades.length > 0 && (
          <Carrusel
            className="pt-20 md:pt-28"
            titulo={TEXTOS.portada.novedades}
            accion={
              <Link to={con(rutas.tiendaCategoria('novedades'))} className="t-label underline decoration-1 underline-offset-4">
                {TEXTOS.portada.verTodo}
              </Link>
            }
          >
            {novedades.map((p) => (
              <CeldaCarrusel key={p.id}>
                <TarjetaProducto producto={p} />
              </CeldaCarrusel>
            ))}
          </Carrusel>
        )}
      </div>

      <section aria-label="Editorial" className="mt-20 grid md:mt-28 md:grid-cols-2">
        <Link to={traje ? enlaceProducto(traje) : con(rutas.tiendaCategoria('sastreria'))} tabIndex={-1} aria-hidden className="flex items-center justify-center bg-product py-10 md:py-16">
          {traje && (
            <div className="w-[min(70%,420px)]">
              <Prenda tipo={traje.producto.tipoPrenda} color={traje.color.hex} patron={traje.color.patron} tamano="hero" />
            </div>
          )}
        </Link>
        <div className="flex flex-col items-start justify-center gap-4 bg-canvas px-6 py-14 md:px-16 lg:px-24">
          <p className="t-eyebrow uppercase text-ink-2">{TEXTOS.portada.editorialEyebrow}</p>
          <h2 className="t-h1 uppercase text-ink md:t-display-sm">{TEXTOS.portada.editorialTitulo}</h2>
          <p className="max-w-[48ch] t-body-lg text-muted">{TEXTOS.portada.editorialTexto}</p>
          <BotonEnlace to={con(rutas.tiendaCategoria('sastreria'))} variante="secondary" tamano="lg" tienda className="mt-2">
            {TEXTOS.portada.editorialCta}
          </BotonEnlace>
        </div>
      </section>
    </div>
  );
}

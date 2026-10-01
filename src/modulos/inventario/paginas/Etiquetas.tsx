import { Tag, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Id } from '@/dominio/tipos';
import { useSel } from '@/estado';
import { selProductoPorReferencia } from '@/selectores';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { entero, plural } from '@/lib/formato';
import { BotonDocumentoPdf, BotonIcono, BuscadorProducto, Checkbox, CodigoBarras, Dinero, EmptyState, EncabezadoPagina, InputNumero, MuestraColor } from '@/ui';
import { PestanasModulo } from '../componentes/comun';
import { selVariantesDeProductos, type GrupoVariantes } from '../selectores';
import { SUBTITULOS } from '../textos';

/** Hoja de etiquetas: eliges referencias y variantes, ves cómo queda cada etiqueta y descargas el PDF con el código vectorial. */
export default function Etiquetas() {
  const params = useParamsRuta('etiquetas');
  const inicial = useSel(selProductoPorReferencia, { referencia: params.producto ?? '' });
  const [agregados, setAgregados] = useState<Id[]>([]);
  const [inicialDescartada, setInicialDescartada] = useState(false);
  // Variantes desmarcadas a mano, y referencias donde solo se eligió una variante concreta (por EAN o SKU).
  const [quitadas, setQuitadas] = useState<Set<Id>>(new Set());
  const [soloDe, setSoloDe] = useState<Record<Id, Id>>({});
  const [copias, setCopias] = useState<number | null>(1);

  // Con `?producto=` la hoja arranca con esa referencia.
  const productoIds = useMemo(() => (inicial && !inicialDescartada && !agregados.includes(inicial.id) ? [inicial.id, ...agregados] : agregados), [inicial, inicialDescartada, agregados]);
  const grupos = useSel(selVariantesDeProductos, { productoIds });

  const marcada = (g: GrupoVariantes, id: Id): boolean => (soloDe[g.producto.id] ? id === soloDe[g.producto.id] : !quitadas.has(id));
  const marcadas = useMemo(
    () => grupos.flatMap((g) => g.variantes.filter((v) => (soloDe[g.producto.id] ? v.variante.id === soloDe[g.producto.id] : !quitadas.has(v.variante.id))).map((v) => ({ ...v, producto: g.producto }))),
    [grupos, quitadas, soloDe],
  );
  const varianteIds = useMemo(() => marcadas.map((v) => v.variante.id), [marcadas]);
  const vista = marcadas.slice(0, 8);
  const copiasValidas = Math.max(1, Math.min(20, copias ?? 1));
  const totalEtiquetas = varianteIds.length * copiasValidas;

  const alternar = (g: GrupoVariantes, id: Id, activo: boolean) => {
    const otras = soloDe[g.producto.id] ? g.variantes.map((v) => v.variante.id).filter((x) => x !== soloDe[g.producto.id]) : [];
    if (soloDe[g.producto.id])
      setSoloDe((s) => {
        const { [g.producto.id]: _x, ...resto } = s;
        return resto;
      });
    setQuitadas((q) => {
      const n = new Set(q);
      for (const o of otras) n.add(o);
      if (activo) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const marcarTodas = (g: GrupoVariantes) => {
    setSoloDe((s) => {
      const { [g.producto.id]: _x, ...resto } = s;
      return resto;
    });
    setQuitadas((q) => {
      const n = new Set(q);
      for (const v of g.variantes) n.delete(v.variante.id);
      return n;
    });
  };
  const quitarProducto = (id: Id) => {
    setAgregados((x) => x.filter((p) => p !== id));
    if (inicial?.id === id) setInicialDescartada(true);
  };

  return (
    <div className="pb-16">
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Inventario', a: rutas.inventario() }, { texto: 'Etiquetas' }]}
        titulo="Etiquetas"
        subtitulo={SUBTITULOS.etiquetas}
        acciones={varianteIds.length > 0 ? <BotonDocumentoPdf documento={{ tipo: 'etiquetas', varianteIds, copias: copiasValidas }} etiqueta={`Descargar ${plural(totalEtiquetas, 'etiqueta')} (PDF)`} variante="primary" tamano="md" /> : undefined}
        pestanas={<PestanasModulo />}
      />

      <div className="mt-8 grid grid-cols-12 gap-x-10 gap-y-8">
        <section className="col-span-12 xl:col-span-7" aria-labelledby="t-et-sel">
          <h2 id="t-et-sel" className="t-h2 text-ink">
            Qué etiquetas imprimir
          </h2>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div className="min-w-[280px] flex-1">
              <p className="mb-1.5 t-label text-ink">Agregar una referencia</p>
              <BuscadorProducto
                placeholder="Busca por nombre, referencia o escanea el código"
                alElegir={(r) => {
                  setAgregados((x) => (x.includes(r.producto.id) ? x : [...x, r.producto.id]));
                  if (r.variante) {
                    const vid = r.variante.id;
                    setSoloDe((s) => ({ ...s, [r.producto.id]: vid }));
                  } else if (r.producto.id === inicial?.id) setInicialDescartada(false);
                }}
              />
            </div>
            <InputNumero etiqueta="Copias de cada una" valor={copias} alCambiar={setCopias} className="w-40" ayuda="De 1 a 20" data-testid="etiquetas-copias" />
          </div>

          {grupos.length === 0 ? (
            <div className="mt-6 border border-line bg-surface">
              <EmptyState
                tamano="tabla"
                icono={Tag}
                titulo="Todavía no elegiste ninguna referencia"
                texto="Busca la prenda arriba: se agregan todas sus tallas y colores, y puedes desmarcar las que no necesites."
              />
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {grupos.map((g) => (
                <div key={g.producto.id} className="border border-line bg-surface" data-testid={`grupo-etiquetas-${g.producto.referencia}`}>
                  <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                    <div>
                      <p className="t-h3 text-ink">{g.producto.nombre}</p>
                      <p className="t-ref text-muted">{g.producto.referencia}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" className="t-small font-bold text-ink underline underline-offset-4" onClick={() => marcarTodas(g)}>
                        Marcar todas
                      </button>
                      <BotonIcono icono={X} etiqueta={`Quitar ${g.producto.nombre}`} variante="ghost" tamano="sm" onClick={() => quitarProducto(g.producto.id)} />
                    </div>
                  </div>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1 p-4 md:grid-cols-3">
                    {g.variantes.map((v) => (
                      <li key={v.variante.id}>
                        <Checkbox
                          etiqueta={
                            <span className="inline-flex items-center gap-2">
                              {v.color && <MuestraColor hex={v.color.hex} nombre={v.color.nombre} patron={v.color.patron} tamano={12} />}
                              {v.color?.nombre} · {v.variante.talla}
                            </span>
                          }
                          marcado={marcada(g, v.variante.id)}
                          alCambiar={(a) => alternar(g, v.variante.id, a === true)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="col-span-12 xl:col-span-5" aria-labelledby="t-et-vista">
          <h2 id="t-et-vista" className="t-h2 text-ink">
            Así quedan
          </h2>
          <p className="mt-1 t-small num text-muted">
            {varianteIds.length > 0 ? `${plural(varianteIds.length, 'variante')} × ${entero(copiasValidas)} = ${plural(totalEtiquetas, 'etiqueta')}` : 'Elige referencias para ver las etiquetas.'}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3" data-testid="vista-etiquetas">
            {vista.map((v) => (
              <div key={v.variante.id} className="border border-line bg-white p-3 text-black">
                <p className="truncate t-small font-bold">{v.producto.nombre}</p>
                <p className="t-ref">{v.variante.sku}</p>
                <p className="t-small">
                  {v.color?.nombre} · talla <strong>{v.variante.talla}</strong>
                </p>
                <p className="t-body font-bold num">
                  <Dinero valor={v.producto.precioVenta} />
                </p>
                <div className="-mx-1 mt-1">
                  <CodigoBarras ean={v.variante.ean13} alto={36} ancho={1.2} />
                </div>
              </div>
            ))}
          </div>
          {varianteIds.length > vista.length && <p className="mt-2 t-small text-muted">Y {plural(varianteIds.length - vista.length, 'más')} en el PDF.</p>}
        </aside>
      </div>
    </div>
  );
}

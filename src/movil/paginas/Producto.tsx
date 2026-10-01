import { Shirt, Truck } from 'lucide-react';
import { useState } from 'react';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { useFiltroLocal, useSel } from '@/estado';
import { fecha, unidades } from '@/lib/formato';
import { cn, Dinero, EmptyState, Icono, MuestraColor } from '@/ui/ligero';
import { Pantalla } from '../componentes/Pantalla';
import { FotoPrenda } from '../componentes/Prendas';
import { FilaLista, Tarjeta, TarjetaTitulo } from '../componentes/Tarjeta';
import { selProductoApp, type ProductoApp } from '../selectores';
import { TXT } from '../textos';

/**
 * Ficha de un producto en el celular: la foto, el precio, las existencias por talla y color en el local elegido (o en
 * todos), cuántas hay en cada local y lo que viene en camino. Todo sale de `selMatrizExistencias` (la misma matriz del
 * escritorio y del POS); aquí solo se acomoda para el dedo.
 */
export default function Producto() {
  const { referencia } = useParamsRuta('appProducto');
  const p = useSel(selProductoApp, { referencia: referencia ?? '' });
  if (!p)
    return (
      <Pantalla testid="app-producto" titulo="Producto" volver={{ a: rutas.appInventario(), texto: TXT.inventario.titulo }}>
        <Tarjeta>
          <EmptyState tamano="compacto" icono={Shirt} titulo="No encontramos ese producto" texto="Busca la referencia otra vez desde Inventario." />
        </Tarjeta>
      </Pantalla>
    );
  return <Ficha p={p} />;
}

function Ficha({ p }: { p: ProductoApp }) {
  const global = useFiltroLocal();
  const m = p.matriz;
  const [local, setLocal] = useState<string>(global);
  const celda = (talla: string, colorId: string): number => {
    const c = m.celdas[`${talla}|${colorId}`] ?? {};
    return local === 'todos' ? Object.values(c).reduce((a, x) => a + x, 0) : (c[local] ?? 0);
  };
  const totalLocal = local === 'todos' ? m.total : (m.totalPorLocal[local] ?? 0);
  const marcarBajo = local !== 'todos' && m.locales.find((l) => l.id === local)?.vende;
  const columnas = `minmax(86px,1.5fr) repeat(${m.tallas.length}, minmax(0,1fr))`;
  const maxLocal = Math.max(1, ...m.locales.map((l) => m.totalPorLocal[l.id] ?? 0));

  return (
    <Pantalla
      testid="app-producto"
      titulo={p.nombre}
      volver={{ a: rutas.appInventario(), texto: TXT.inventario.titulo }}
      fecha={
        <>
          <span className="num">{p.referencia}</span> · {p.categoria} · <Dinero valor={p.precio} />
        </>
      }
    >
      <FotoPrenda p={p.prenda} grande />

      <div role="radiogroup" aria-label="Local" className="flex flex-wrap gap-2">
        {[{ id: 'todos', nombre: 'Todos' }, ...m.locales.map((l) => ({ id: l.id, nombre: l.nombre }))].map((l) => {
          const activo = local === l.id;
          return (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={activo}
              data-testid={`app-prod-local-${l.id}`}
              onClick={() => setLocal(l.id)}
              className={cn('inline-flex h-11 items-center border px-4 t-label transition-colors', activo ? 'border-ink bg-ink text-inverse' : 'border-line-strong bg-surface text-ink active:bg-surface-2')}
            >
              {l.nombre}
            </button>
          );
        })}
      </div>

      <Tarjeta data-testid="app-matriz">
        <TarjetaTitulo titulo={TXT.inventario.porTalla} derecha={<span className="t-label num text-ink">{unidades(totalLocal)}</span>} />
        <div className="overflow-x-auto px-4 pb-4 pt-1">
          <div role="table" aria-label="Existencias por talla y color" className="grid items-center gap-y-1" style={{ gridTemplateColumns: columnas }}>
            <div role="row" className="contents">
              <span role="columnheader" className="py-1">
                <span className="sr-only">Color</span>
              </span>
              {m.tallas.map((t) => (
                <span role="columnheader" key={t} className="py-1 text-center t-label text-ink-2">
                  {t}
                </span>
              ))}
            </div>
            {m.colores.map((c) => (
              <div role="row" key={c.id} className="contents">
                <span role="rowheader" className="flex min-h-11 items-center gap-2 pr-2 t-small text-ink">
                  <MuestraColor hex={c.hex} nombre={c.nombre} tamano={16} />
                  <span className="min-w-0 truncate">{c.nombre}</span>
                </span>
                {m.tallas.map((t) => {
                  const n = celda(t, c.id);
                  const bajo = marcarBajo && m.variantes[`${t}|${c.id}`] && n < p.stockMinimo;
                  return (
                    <span
                      role="cell"
                      key={t}
                      data-n={n}
                      className={cn('mx-0.5 flex h-11 items-center justify-center t-body num', bajo ? 'bg-danger-soft font-semibold text-ink' : n === 0 ? 'text-subtle' : 'text-ink')}
                    >
                      {m.variantes[`${t}|${c.id}`] ? n : '–'}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          {marcarBajo && <p className="mt-2 t-small text-muted">Resaltado: por debajo del mínimo ({p.stockMinimo}) en este local.</p>}
        </div>
      </Tarjeta>

      <Tarjeta className="p-4" data-testid="app-prod-por-local">
        <h2 className="t-eyebrow text-ink-2">{TXT.inventario.porLocal}</h2>
        <ul className="mt-3 flex flex-col gap-4">
          {m.locales.map((l) => (
            <li key={l.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="t-body font-semibold text-ink">{l.nombre}</span>
                <span className="t-body num text-ink">{unidades(m.totalPorLocal[l.id] ?? 0)}</span>
              </div>
              <div className="mt-1.5 h-1 w-full bg-line-soft">
                <div className="h-full bg-chart-2" style={{ width: `${((m.totalPorLocal[l.id] ?? 0) / maxLocal) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Tarjeta>

      {p.enCamino && (
        <Tarjeta data-testid="app-en-camino">
          <FilaLista
            a={rutas.appImportacion(p.enCamino.numero)}
            inicio={<Icono icono={Truck} tamano={22} className="text-ink-2" />}
            principal={`${unidades(p.enCamino.unidades)} ${TXT.inventario.enCamino.toLowerCase()}`}
            secundaria={`Llegan a bodega el ${fecha(p.enCamino.llegada)} · ${p.enCamino.numero}`}
          />
        </Tarjeta>
      )}
    </Pantalla>
  );
}

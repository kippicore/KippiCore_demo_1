import { Shirt } from 'lucide-react';
import { useState } from 'react';
import { rutas } from '@/app/rutas';
import { useAhora, useFiltroLocal, useSel } from '@/estado';
import { entero, plural, unidades } from '@/lib/formato';
import { selLocales, selValorizacion } from '@/selectores';
import { cn, Dinero, EmptyState, Input, PuntoEstado } from '@/ui/ligero';
import { FotoPrenda } from '../componentes/Prendas';
import { Pantalla } from '../componentes/Pantalla';
import { CifraSecundaria, FilaLista, Lista, Tarjeta, TarjetaTitulo } from '../componentes/Tarjeta';
import { selCriticoApp, selInventarioApp, type FilaInventarioApp } from '../selectores';
import { TXT } from '../textos';

/**
 * Inventario (PLAN 4.4): consulta rápida por nombre, referencia o código de barras y por local (la bodega incluida), y
 * lo que se está acabando. Cada producto abre su ficha con las existencias por talla y color. Las cifras salen de
 * `selCatalogo` y `selValorizacion`, las mismas del escritorio.
 */
export default function Inventario() {
  const hoy = useAhora().slice(0, 10);
  const global = useFiltroLocal();
  const locales = useSel(selLocales, { incluirBodega: true });
  const [local, setLocal] = useState<string>(global);
  const [texto, setTexto] = useState('');
  const buscando = texto.trim().length > 0;
  const nombreLocal = local === 'todos' ? 'Todos los locales' : (locales.find((l) => l.id === local)?.nombre ?? local);
  return (
    <Pantalla testid="app-inventario" titulo={TXT.inventario.titulo} fecha={nombreLocal}>
      <Input
        buscar
        tamano="lg"
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        etiqueta="Buscar producto"
        etiquetaOculta
        placeholder={TXT.inventario.buscar}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        data-testid="app-buscar"
      />
      <div role="radiogroup" aria-label="Local" className="flex flex-wrap gap-2" data-testid="app-inv-locales">
        {[{ id: 'todos', nombre: 'Todos' }, ...locales.map((l) => ({ id: l.id, nombre: l.nombre }))].map((l) => {
          const activo = local === l.id;
          return (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={activo}
              data-testid={`app-inv-local-${l.id}`}
              onClick={() => setLocal(l.id)}
              className={cn('inline-flex h-11 items-center border px-4 t-label transition-colors', activo ? 'border-ink bg-ink text-inverse' : 'border-line-strong bg-surface text-ink active:bg-surface-2')}
            >
              {l.nombre}
            </button>
          );
        })}
      </div>
      {buscando ? <Resultados texto={texto} local={local} /> : <SeAcaba local={local} hoy={hoy} />}
    </Pantalla>
  );
}

function FilaProducto({ f }: { f: FilaInventarioApp }) {
  return (
    <FilaLista
      envolver
      data-testid="app-producto-fila"
      data-referencia={f.referencia}
      a={rutas.appProducto(f.referencia)}
      inicio={<FotoPrenda p={f.prenda} />}
      principal={f.nombre}
      secundaria={
        <>
          <span className="num">{f.referencia}</span> · {f.categoria}
        </>
      }
      derecha={
        <span className="flex flex-col items-end gap-0.5">
          <span className="t-body num font-semibold text-ink">{unidades(f.existencias)}</span>
          {f.estadoStock === 'agotado' ? (
            <PuntoEstado tono="danger" className="t-small text-ink">
              {TXT.inventario.agotado}
            </PuntoEstado>
          ) : f.estadoStock === 'bajo' ? (
            <PuntoEstado tono="warning" className="t-small text-ink">
              {plural(f.variantesBajas, 'talla baja', 'tallas bajas')}
            </PuntoEstado>
          ) : null}
        </span>
      }
    />
  );
}

function Resultados({ texto, local }: { texto: string; local: string }) {
  const { filas, total } = useSel(selInventarioApp, { texto, localId: local, limite: 30 });
  return (
    <Tarjeta data-testid="app-resultados">
      {filas.length === 0 ? (
        <EmptyState tamano="compacto" icono={Shirt} titulo={TXT.inventario.sinResultados} texto={TXT.inventario.sinResultadosTexto} />
      ) : (
        <>
          <p className="px-4 pb-1 pt-4 t-small text-muted" role="status">
            {plural(total, 'producto', 'productos')}
            {total > filas.length ? ` · mostrando los primeros ${filas.length}` : ''}
          </p>
          <Lista>
            {filas.map((f) => (
              <FilaProducto key={f.productoId} f={f} />
            ))}
          </Lista>
        </>
      )}
    </Tarjeta>
  );
}

function SeAcaba({ local, hoy }: { local: string; hoy: string }) {
  const valor = useSel(selValorizacion, { localId: local }).total;
  const critico = useSel(selCriticoApp, { hoy, localId: local });
  const agotados = useSel(selInventarioApp, { texto: '', localId: local, stock: 'agotado', limite: 4 });
  const bajos = useSel(selInventarioApp, { texto: '', localId: local, stock: 'bajo', limite: 8 });
  const filas = [...agotados.filas, ...bajos.filas].filter((f) => f.productoId !== critico?.productoId).slice(0, 8);
  const total = agotados.total + bajos.total;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <CifraSecundaria etiqueta="Unidades">
          <span className="num">{entero(valor.unidades)}</span>
        </CifraSecundaria>
        <CifraSecundaria etiqueta="A costo">
          <Dinero valor={valor.aCosto} corta />
        </CifraSecundaria>
      </div>
      <Tarjeta data-testid="app-se-acaba">
        <TarjetaTitulo titulo={TXT.inventario.stockBajo} />
        {critico && (
          <FilaLista
            envolver
            data-testid="app-critico"
            a={rutas.appProducto(critico.referencia)}
            inicio={<FotoPrenda p={critico.prenda} />}
            principal={critico.nombre}
            secundaria={
              <>
                {critico.variante} · {critico.localNombre}: {critico.existencia === 0 ? 'no queda ninguna' : `queda${critico.existencia === 1 ? '' : 'n'} ${critico.existencia}`}
                {critico.surtido ? ` · ${critico.surtido.nombre} tiene ${critico.surtido.existencia}` : ''}
              </>
            }
            className="shadow-[inset_2px_0_0_var(--c-danger)]"
          />
        )}
        {filas.length === 0 && !critico ? (
          <EmptyState tamano="compacto" icono={Shirt} titulo={TXT.inventario.sinBajo} texto={TXT.inventario.sinBajoTexto} />
        ) : (
          <Lista data-testid="app-lista-bajo">
            {filas.map((f) => (
              <FilaProducto key={f.productoId} f={f} />
            ))}
          </Lista>
        )}
        {total > filas.length && (
          <p className="border-t border-line-soft px-4 py-3 t-small text-muted">
            {plural(total, 'producto tiene', 'productos tienen')} tallas o colores por debajo del mínimo. Busca uno por nombre o referencia para ver sus existencias.
          </p>
        )}
      </Tarjeta>
    </>
  );
}

import { Archive, ShoppingBag } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { rutas } from '@/app/rutas';
import { useAhora, useFiltroLocal, usePuede, useSel } from '@/estado';
import { entero, plural, relativaDias } from '@/lib/formato';
import { Card, Dinero, EmptyState, EnlaceVerTodo, MiniaturaPrenda, Segmentado } from '@/ui';
import { selDormidosInicio, selTopInicio, type PrendaVista } from '../selectores';
import { TXT } from '../textos';

/**
 * Los cinco productos que más salieron del mes y las cinco referencias con más plata quieta (sin una sola venta en
 * 60 días), con la "foto" de la prenda (`<Prenda>`). Cada fila lleva a la ficha del producto. Respetan el local y la
 * moneda; el margen y el costo solo los ve quien tiene el permiso.
 */
type Medida = 'unidades' | 'valor' | 'margen';

export function TopProductos() {
  const hoy = useAhora().slice(0, 10);
  const localId = useFiltroLocal();
  const puede = usePuede();
  const [medida, setMedida] = useState<Medida>('unidades');
  const verMargen = puede('ver.margenes');
  const activa: Medida = !verMargen && medida === 'margen' ? 'valor' : medida;
  const top = useSel(selTopInicio, { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy, localId, medida: activa, n: 5 });
  const opciones = (['unidades', 'valor', 'margen'] as const).filter((m) => m !== 'margen' || verMargen).map((m) => ({ valor: m, etiqueta: TXT.top.medida[m], 'data-testid': `inicio-top-${m}` }));
  return (
    <Card
      titulo={TXT.top.titulo}
      data-testid="inicio-top"
      className="flex flex-col"
    >
      <Segmentado etiqueta="Medida del ranking" tamano="sm" valor={activa} alCambiar={setMedida} opciones={opciones} className="mb-2 self-start" />
      {top.length === 0 ? (
        <EmptyState tamano="compacto" icono={ShoppingBag} titulo={TXT.top.vacioTitulo} texto={TXT.top.vacioTexto} />
      ) : (
        <ol className="flex-1">
          {top.map((t, i) => (
            <FilaProducto
              key={t.productoId}
              puesto={i + 1}
              referencia={t.referencia}
              nombre={t.nombre}
              prenda={t.prenda}
              linea={activa === 'unidades' ? t.referencia : `${t.referencia} · ${entero(t.unidades)} uds`}
              derecha={activa === 'unidades' ? <span className="num">{entero(t.unidades)}</span> : <Dinero valor={activa === 'valor' ? t.valor : t.margen} corta />}
            />
          ))}
        </ol>
      )}
      <PieLista a={rutas.analisisProductos({ vista: 'vendidos' })} texto={TXT.top.verTodo} />
    </Card>
  );
}

export function SinMovimiento() {
  const hoy = useAhora().slice(0, 10);
  const localId = useFiltroLocal();
  const puede = usePuede();
  const d = useSel(selDormidosInicio, { dias: 60, hoy, localId, n: 5 });
  const verCostos = puede('ver.costos');
  return (
    <Card titulo={TXT.dormidos.titulo} data-testid="inicio-dormidos" className="flex flex-col">
      {d.items.length === 0 ? (
        <EmptyState tamano="compacto" icono={Archive} titulo={TXT.dormidos.vacioTitulo} texto={TXT.dormidos.vacioTexto} />
      ) : (
        <ol className="flex-1">
          {d.items.map((x, i) => (
            <FilaProducto
              key={x.productoId}
              puesto={i + 1}
              referencia={x.referencia}
              nombre={x.nombre}
              prenda={x.prenda}
              linea={`${entero(x.unidades)} uds · ${x.ultimaVenta ? relativaDias(x.ultimaVenta, hoy) : 'sin ventas'}`}
              titulo={`${x.referencia} · ${x.ultimaVenta ? `última venta ${relativaDias(x.ultimaVenta, hoy)}` : 'nunca se ha vendido'}`}
              derecha={verCostos ? <Dinero valor={x.aCosto} corta /> : <span className="num">{entero(x.unidades)}</span>}
            />
          ))}
        </ol>
      )}
      {d.total > 0 && (
        <p className="mt-3 t-small text-muted" data-testid="inicio-dormidos-total">
          {plural(d.total, 'referencia dormida', 'referencias dormidas')}
          {verCostos && (
            <>
              {' · '}
              <Dinero valor={d.aCosto} corta className="font-semibold text-ink" /> quietos a costo
            </>
          )}
        </p>
      )}
      <PieLista a={rutas.analisisProductos({ vista: 'rotacion' })} texto={TXT.dormidos.verTodo} />
    </Card>
  );
}

function PieLista({ a, texto }: { a: string; texto: string }) {
  return (
    <div className="mt-4 border-t border-line-soft pt-3">
      <EnlaceVerTodo a={a}>{texto}</EnlaceVerTodo>
    </div>
  );
}

function FilaProducto({ puesto, referencia, nombre, prenda, linea, derecha, titulo }: { titulo?: string; puesto: number; referencia: string; nombre: string; prenda: PrendaVista | null; linea: string; derecha: ReactNode }) {
  return (
    <li className="border-t border-line-soft first:border-t-0">
      <Link to={rutas.producto(referencia)} title={titulo} className="flex items-center gap-3 py-2 hover:bg-surface-2" data-referencia={referencia}>
        <span className="w-4 shrink-0 text-center t-small num text-subtle">{puesto}</span>
        {prenda ? <MiniaturaPrenda tipo={prenda.tipo} color={prenda.color} patron={prenda.patron} nombre={prenda.nombre} /> : <span className="block w-[30px] shrink-0" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate t-nav text-ink">{nombre}</span>
          <span className="block truncate t-small text-muted">{linea}</span>
        </span>
        <span className="shrink-0 t-nav num text-ink">{derecha}</span>
      </Link>
    </li>
  );
}

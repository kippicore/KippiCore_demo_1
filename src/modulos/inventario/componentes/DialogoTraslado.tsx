import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Id } from '@/dominio/tipos';
import { useAcciones, useFiltroLocal, usePuede, useSel } from '@/estado';
import { rutas } from '@/app/rutas';
import { entero } from '@/lib/formato';
import { avisar, BotonIcono, BuscadorProducto, Button, Dialog, InputNumero, MiniaturaPrenda, Select } from '@/ui';
import { sugerirOrigen, trasladables } from '../calculos';
import { selInfoVariantes, selVariantesDetalle } from '../selectores';
import { MOTIVOS_TRASLADO } from '../textos';
import { useLocalesInventario } from './comun';

/**
 * Solicitud de traslado entre locales (W2). Se abre desde la matriz de la ficha, desde la lista de traslados o con
 * el enlace `?trasladar=<origen>,<destino>,<varianteId>,<cantidad>`. Si la persona es vendedora, la solicitud queda
 * pendiente de la aprobación del dueño (el dominio la crea con su solicitud); dueño y bodega la crean directo.
 */
export interface PrefillTraslado {
  origenId?: Id | null;
  destinoId?: Id | null;
  varianteId?: Id | null;
  cantidad?: number | null;
  /** Referencia que se está mirando (el selector de prenda parte de ella). */
  productoId?: Id | null;
}

interface Linea {
  varianteId: Id;
  cantidad: number | null;
}

export interface PropsDialogoTraslado {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  inicial?: PrefillTraslado | null;
  /** Al crear, abre el detalle del traslado (desde la lista); si no, se queda donde está (ficha). */
  irAlDetalle?: boolean;
}

export function DialogoTraslado(props: PropsDialogoTraslado) {
  return props.abierto ? <CuerpoTraslado {...props} /> : null;
}

function CuerpoTraslado({ abierto, alCambiar, inicial, irAlDetalle }: PropsDialogoTraslado) {
  const acciones = useAcciones();
  const navegar = useNavigate();
  const puede = usePuede();
  const contexto = useFiltroLocal();
  const locales = useLocalesInventario();
  const esVendedor = !puede('traslado.despachar');
  const [origenId, setOrigenId] = useState<Id | ''>(inicial?.origenId ?? '');
  const [destinoId, setDestinoId] = useState<Id | ''>(inicial?.destinoId ?? (esVendedor && contexto !== 'todos' ? contexto : ''));
  const [lineas, setLineas] = useState<Linea[]>(inicial?.varianteId ? [{ varianteId: inicial.varianteId, cantidad: inicial.cantidad ?? 1 }] : []);
  const [motivo, setMotivo] = useState<string>(MOTIVOS_TRASLADO[0]);
  const [error, setError] = useState<{ campo: string; mensaje: string } | null>(null);
  const [productoId, setProductoId] = useState<Id | ''>(inicial?.productoId ?? '');
  const [colorId, setColorId] = useState('');
  const [talla, setTalla] = useState('');
  const [enviando, setEnviando] = useState(false);

  const info = useSel(selInfoVariantes, { ids: lineas.map((l) => l.varianteId) });
  const opcionesProducto = useSel(selVariantesDetalle, { productoId: productoId || '__ninguno__' });
  const disponible = (varianteId: Id) => (origenId ? (info[varianteId]?.existencias[origenId] ?? 0) : 0);

  const colores = useMemo(() => {
    const m = new Map<Id, string>();
    for (const f of opcionesProducto) m.set(f.color.id, f.color.nombre);
    return [...m.entries()].map(([valor, etiqueta]) => ({ valor, etiqueta }));
  }, [opcionesProducto]);
  const tallas = useMemo(() => [...new Set(opcionesProducto.filter((f) => !colorId || f.color.id === colorId).map((f) => f.variante.talla))], [opcionesProducto, colorId]);

  const agregar = (varianteId: Id) => {
    setError(null);
    setLineas((ls) => {
      const existe = ls.find((l) => l.varianteId === varianteId);
      if (existe) return ls.map((l) => (l.varianteId === varianteId ? { ...l, cantidad: (l.cantidad ?? 0) + 1 } : l));
      return [...ls, { varianteId, cantidad: 1 }];
    });
  };

  const agregarElegida = () => {
    const f = opcionesProducto.find((x) => x.color.id === colorId && x.variante.talla === talla);
    if (f) {
      agregar(f.variante.id);
      setTalla('');
    }
  };

  const problemaLinea = (l: Linea): string | null => {
    if (!origenId) return null;
    if (!l.cantidad || l.cantidad < 1) return 'Escribe una cantidad';
    if (l.cantidad > disponible(l.varianteId)) return `Solo hay ${entero(disponible(l.varianteId))} en el origen`;
    return null;
  };

  const puedeEnviar = !!origenId && !!destinoId && origenId !== destinoId && lineas.length > 0 && lineas.every((l) => !problemaLinea(l));

  const solicitar = () => {
    if (!origenId || !destinoId || !puedeEnviar || enviando) return;
    setEnviando(true);
    const r = acciones.solicitarTraslado({
      origenId,
      destinoId,
      lineas: lineas.map((l) => ({ varianteId: l.varianteId, cantidad: l.cantidad ?? 0 })),
      motivo,
      requiereAprobacion: esVendedor,
    });
    setEnviando(false);
    if (!r.ok) {
      setError({ campo: r.error.campo ?? 'lineas', mensaje: r.error.mensaje });
      return;
    }
    const creado = Object.values(r.despues.traslados).find((t) => !r.antes.traslados[t.id]);
    alCambiar(false);
    avisar({
      tipo: 'exito',
      texto: esVendedor ? `Pedimos el traslado ${creado?.numero ?? ''} al dueño` : `Traslado ${creado?.numero ?? ''} solicitado`,
      detalle: esVendedor ? 'Cuando lo apruebe, bodega lo despacha.' : 'Despáchalo cuando salga la mercancía.',
      accion: creado ? { texto: 'Ver traslado', a: rutas.traslado(creado.id) } : undefined,
    });
    if (irAlDetalle && creado) navegar(rutas.traslado(creado.id));
  };

  const sugerirDesdeDestino = () => {
    // Con un destino y una prenda ya elegidos, propone el origen con más para dar.
    const primera = lineas[0];
    if (!primera || !destinoId) return;
    const i = info[primera.varianteId];
    if (!i) return;
    const s = sugerirOrigen({
      destinoId,
      minimo: i.producto.stockMinimo,
      locales: locales.map((l) => ({ id: l.id, vende: l.vende, existencia: i.existencias[l.id] ?? 0 })),
    });
    if (s) {
      setOrigenId(s.origenId);
      setLineas((ls) => ls.map((l, k) => (k === 0 ? { ...l, cantidad: s.cantidad } : l)));
    }
  };

  const opcionesLocal = locales.map((l) => ({ valor: l.id, etiqueta: l.nombre }));

  return (
    <Dialog
      abierto={abierto}
      alCambiar={alCambiar}
      eyebrow="Traslado entre locales"
      titulo="Solicitar traslado"
      descripcion={esVendedor ? 'Tu solicitud queda pendiente hasta que el dueño la apruebe.' : 'Elige de dónde sale, a dónde llega y qué prendas se mueven.'}
      ancho="lg"
      confirmarAlCerrar={lineas.length > 0}
      data-testid="dialogo-traslado"
      pie={
        <>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Cancelar
          </Button>
          <Button onClick={solicitar} disabled={!puedeEnviar} cargando={enviando} data-testid="traslado-confirmar">
            {esVendedor ? 'Pedir traslado' : 'Solicitar traslado'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-x-3 gap-y-4">
        <Select
          etiqueta="Sale de"
          valor={origenId || null}
          alCambiar={(v) => {
            setOrigenId(v);
            setError(null);
          }}
          opciones={opcionesLocal.filter((o) => o.valor !== destinoId)}
          placeholder="Elige el origen"
          enModal
          data-testid="traslado-origen"
        />
        <span className="pb-2.5 text-ink-2" aria-hidden>
          <ArrowRight size={18} />
        </span>
        <Select
          etiqueta="Llega a"
          valor={destinoId || null}
          alCambiar={(v) => {
            setDestinoId(v);
            setError(null);
          }}
          opciones={opcionesLocal.filter((o) => o.valor !== origenId)}
          placeholder="Elige el destino"
          error={error?.campo === 'destinoId' || error?.campo === 'origenId' ? error.mensaje : undefined}
          enModal
          data-testid="traslado-destino"
        />
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="t-label font-bold text-ink">Prendas</h3>
          {lineas.length > 0 && destinoId && !origenId && (
            <Button variante="ghost" tamano="sm" onClick={sugerirDesdeDestino}>
              Sugerir de dónde traer
            </Button>
          )}
        </div>
        {lineas.length === 0 ? (
          <p className="mt-2 border border-dashed border-line-strong p-4 t-body text-muted">Agrega la prenda y la talla que necesitas mover.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line-soft border border-line" data-testid="traslado-lineas">
            {lineas.map((l) => {
              const i = info[l.varianteId];
              const problema = problemaLinea(l);
              const libre = i && origenId ? trasladables({ id: origenId, vende: locales.find((x) => x.id === origenId)?.vende ?? true, existencia: disponible(l.varianteId) }, i.producto.stockMinimo) : null;
              return (
                <li key={l.varianteId} className="flex items-center gap-3 px-3 py-2">
                  {i && <MiniaturaPrenda tipo={i.producto.tipoPrenda} color={i.color?.hex ?? '#C9C9C7'} patron={i.color?.patron} tamano="buscador" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate t-body font-semibold text-ink">{i?.producto.nombre ?? l.varianteId}</p>
                    <p className="t-small text-muted">
                      {i?.color?.nombre} · talla {i?.variante.talla}
                      {origenId && (
                        <span className="num">
                          {' '}
                          · hay {entero(disponible(l.varianteId))} en el origen{libre !== null && libre < disponible(l.varianteId) ? `, ${entero(libre)} sin bajar de su mínimo` : ''}
                        </span>
                      )}
                    </p>
                  </div>
                  <InputNumero
                    etiqueta="Cantidad"
                    etiquetaOculta
                    tamano="sm"
                    valor={l.cantidad}
                    alCambiar={(v) => setLineas((ls) => ls.map((x) => (x.varianteId === l.varianteId ? { ...x, cantidad: v } : x)))}
                    error={problema && origenId ? problema : undefined}
                    className="w-28"
                    data-testid={`traslado-cantidad-${l.varianteId}`}
                  />
                  <BotonIcono icono={Trash2} etiqueta="Quitar prenda" variante="ghost" tamano="sm" onClick={() => setLineas((ls) => ls.filter((x) => x.varianteId !== l.varianteId))} />
                </li>
              );
            })}
          </ul>
        )}
        {error?.campo === 'lineas' && <p className="mt-2 t-small text-danger">{error.mensaje}</p>}

        <div className="mt-4 border border-line bg-surface-2 p-4">
          <p className="t-label font-bold text-ink">Agregar prenda</p>
          <div className="mt-2">
            <BuscadorProducto
              enModal
              localId={origenId || 'todos'}
              placeholder="Busca por nombre, referencia o escanea el código"
              alElegir={(r) => {
                if (r.variante) agregar(r.variante.id);
                else {
                  setProductoId(r.producto.id);
                  setColorId('');
                  setTalla('');
                }
              }}
            />
          </div>
          {productoId && opcionesProducto.length > 0 && (
            <div className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-3">
              <Select etiqueta="Color" valor={colorId || null} alCambiar={(v) => { setColorId(v); setTalla(''); }} opciones={colores} placeholder="Elige el color" enModal tamano="sm" data-testid="traslado-color" />
              <Select
                etiqueta="Talla"
                valor={talla || null}
                alCambiar={setTalla}
                opciones={tallas.map((t) => ({ valor: t, etiqueta: t }))}
                placeholder="Elige la talla"
                enModal
                tamano="sm"
                deshabilitado={!colorId}
                data-testid="traslado-talla"
              />
              <Button variante="secondary" tamano="sm" icono={Plus} onClick={agregarElegida} disabled={!colorId || !talla} data-testid="traslado-agregar">
                Agregar
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 max-w-[320px]">
        <Select etiqueta="Motivo" valor={motivo} alCambiar={setMotivo} opciones={MOTIVOS_TRASLADO.map((m) => ({ valor: m, etiqueta: m }))} enModal />
      </div>
    </Dialog>
  );
}

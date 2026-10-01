import { ArrowRight, Ship, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Id, Producto } from '@/dominio/tipos';
import { useFiltroLocal, useHoy, useSel } from '@/estado';
import { selMatrizExistencias } from '@/selectores';
import { entero, fecha, relativaDias } from '@/lib/formato';
import { Badge, Button, Cifra, cn, Icono, MiniaturaPrenda, MuestraColor, Segmentado } from '@/ui';
import { claveVariante, estadoCelda, ordenarTallas, sugerirOrigen, type EstadoCelda } from '../calculos';
import { selMovimientoPendiente } from '../selectores';
import { useCambio } from './comun';
import type { PrefillTraslado } from './DialogoTraslado';

/**
 * Matriz talla × color × local de la ficha (W2). Pestañas por local (Todos · Parque 93 · Usaquén · Zona Rosa ·
 * Bodega) con su total, columna "En camino" con la fecha de llegada, celdas en cero en gris tramado, las que están
 * por debajo del mínimo con borde camel y, al tocar una celda, la sugerencia "Traer de Zona Rosa (6 disponibles)".
 * Lo que va en tránsito hacia un local aparece junto a su celda hasta que se recibe; cuando cambia una existencia
 * (se despacha o se recibe), el número rueda y la celda destella.
 */
const TRAMADO = 'repeating-linear-gradient(135deg, var(--c-line-strong) 0 1px, transparent 1px 7px)';

function Celda({
  valor,
  estado,
  seleccionada,
  enTransito,
  etiqueta,
  alElegir,
  id,
}: {
  valor: number;
  estado: EstadoCelda;
  seleccionada: boolean;
  enTransito: number;
  etiqueta: string;
  alElegir: () => void;
  id: Id;
}) {
  const cambios = useCambio(valor);
  return (
    <button
      type="button"
      onClick={alElegir}
      aria-pressed={seleccionada}
      aria-label={etiqueta}
      data-testid={`celda-${id}`}
      data-estado={estado}
      data-valor={valor}
      style={estado === 'cero' && !seleccionada ? { backgroundImage: TRAMADO } : undefined}
      className={cn(
        'relative flex h-14 w-full flex-col items-center justify-center gap-0.5 transition-colors duration-(--dur-instant) focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
        seleccionada ? 'bg-ink text-inverse' : 'text-ink hover:bg-surface-2',
        estado === 'bajo' && !seleccionada && 'shadow-[inset_0_0_0_2px_var(--c-accent)]',
        estado === 'bajo' && seleccionada && 'shadow-[inset_0_0_0_2px_var(--c-accent)]',
      )}
    >
      {cambios > 0 && <span key={cambios} aria-hidden className="pointer-events-none absolute inset-0 animate-flash" />}
      <Cifra valor={valor} formatear={entero} className={cn('t-body', estado === 'cero' && !seleccionada ? 'text-muted' : 'font-semibold', estado === 'bajo' && !seleccionada && 'text-accent-ink')} />
      {enTransito > 0 && (
        <span className={cn('inline-flex items-center gap-0.5 t-micro num', seleccionada ? 'text-inverse' : 'text-accent-ink')} title={`${entero(enTransito)} en tránsito hacia aquí`}>
          <Icono icono={Truck} tamano={12} />+{entero(enTransito)}
        </span>
      )}
    </button>
  );
}

export interface PropsMatrizFicha {
  producto: Producto;
  alSolicitar: (p: PrefillTraslado) => void;
  /** Quien puede mover mercancía ve los botones de traslado en la celda. */
  puedeSolicitar?: boolean;
}

export function MatrizFicha({ producto, alSolicitar, puedeSolicitar = true }: PropsMatrizFicha) {
  const productoId = producto.id;
  const m = useSel(selMatrizExistencias, { productoId });
  const pend = useSel(selMovimientoPendiente, { productoId });
  const hoy = useHoy();
  const contexto = useFiltroLocal();
  const [vista, setVista] = useState<Id | 'todos'>(() => (contexto !== 'todos' ? contexto : 'todos'));
  const [elegida, setElegida] = useState<Id | null>(null);
  const tallas = useMemo(() => (m ? ordenarTallas(m.tallas, producto.curvaTallas) : []), [m, producto.curvaTallas]);
  if (!m) return null;

  const vistaValida = vista === 'todos' || m.locales.some((l) => l.id === vista) ? vista : 'todos';
  const local = m.locales.find((l) => l.id === vistaValida) ?? null;
  const unLocal = vistaValida !== 'todos';
  const valor = (varianteId: Id, k: string): number => (unLocal ? (m.celdas[k]?.[vistaValida] ?? 0) : (m.totalPorVariante[varianteId] ?? 0));
  const enTransito = (varianteId: Id): number => {
    if (unLocal) return pend.enTransito[`${varianteId}@${vistaValida}`] ?? 0;
    return m.locales.reduce((a, l) => a + (pend.enTransito[`${varianteId}@${l.id}`] ?? 0), 0);
  };

  const enCaminoColor = (colorId: Id) => {
    let unidades = 0;
    let llega = '';
    let numero = '';
    for (const t of tallas) {
      const v = m.variantes[claveVariante(t, colorId)];
      const ec = v ? m.enCamino[v] : undefined;
      if (!ec) continue;
      unidades += ec.unidades;
      if (!llega || ec.fechaEstimada < llega) {
        llega = ec.fechaEstimada;
        numero = ec.numero;
      }
    }
    return unidades > 0 ? { unidades, llega, numero } : null;
  };

  const totalColor = (colorId: Id) => tallas.reduce((a, t) => a + valor(m.variantes[claveVariante(t, colorId)] ?? '', claveVariante(t, colorId)), 0);
  const totalTalla = (t: string) => m.colores.reduce((a, c) => a + valor(m.variantes[claveVariante(t, c.id)] ?? '', claveVariante(t, c.id)), 0);
  const totalGeneral = m.colores.reduce((a, c) => a + totalColor(c.id), 0);
  const totalCamino = m.colores.reduce((a, c) => a + (enCaminoColor(c.id)?.unidades ?? 0), 0);

  const etiquetaLocal = (nombre: string, total: number) => (
    <span className="inline-flex items-center gap-1.5">
      {nombre}
      <span className="num font-normal opacity-70">{entero(total)}</span>
    </span>
  );

  // ---- Panel de la celda elegida ----
  const claveElegida = elegida ? Object.entries(m.variantes).find(([, v]) => v === elegida)?.[0] : undefined;
  const [tallaElegida, colorElegidoId] = claveElegida ? claveElegida.split('|') : [undefined, undefined];
  const colorElegido = m.colores.find((c) => c.id === colorElegidoId);
  const porLocal = claveElegida ? (m.celdas[claveElegida] ?? {}) : {};
  const camino = elegida ? m.enCamino[elegida] : undefined;
  const localesExistencia = m.locales.map((l) => ({ id: l.id, vende: l.vende, existencia: porLocal[l.id] ?? 0 }));
  const sugerenciaLocal = elegida && local?.vende ? sugerirOrigen({ destinoId: local.id, minimo: m.stockMinimo, locales: localesExistencia }) : null;
  const estadoLocalElegido = elegida && local ? estadoCelda(porLocal[local.id] ?? 0, m.stockMinimo, local.vende) : null;
  const nombreLocal = (id: Id) => m.locales.find((l) => l.id === id)?.nombre ?? id;

  return (
    <div className="min-w-0" data-testid="matriz-ficha">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Segmentado
          etiqueta="Local de la matriz"
          valor={vistaValida}
          alCambiar={(v) => setVista(v)}
          className="max-w-full overflow-x-auto"
          data-testid="matriz-locales"
          opciones={[
            { valor: 'todos', etiqueta: etiquetaLocal('Todos', m.total), 'data-testid': 'matriz-local-todos' },
            ...m.locales.map((l) => ({ valor: l.id, etiqueta: etiquetaLocal(l.nombre, m.totalPorLocal[l.id] ?? 0), 'data-testid': `matriz-local-${l.id}` })),
          ]}
        />
        <p className="t-small text-muted">
          Toca una celda para ver dónde está cada unidad y moverla.
        </p>
      </div>

      <div className="overflow-x-auto border border-line bg-surface">
        <table key={vistaValida} className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-ink">
              <th scope="col" className="h-10 px-4 text-left t-eyebrow text-ink-2">
                Color
              </th>
              {tallas.map((t) => (
                <th key={t} scope="col" className="h-10 w-[72px] px-1 text-center t-eyebrow num text-ink-2">
                  {t}
                </th>
              ))}
              <th scope="col" className="h-10 w-[72px] border-l border-ink px-2 text-center t-eyebrow text-ink">
                Total
              </th>
              <th scope="col" className="h-10 min-w-[220px] px-4 text-left t-eyebrow text-ink-2">
                En camino
              </th>
            </tr>
          </thead>
          <tbody>
            {m.colores.map((c) => {
              const ec = enCaminoColor(c.id);
              const color = c;
              const ecVariante = elegida && claveElegida?.endsWith(`|${c.id}`) ? m.enCamino[elegida] : undefined;
              return (
                <tr key={c.id} className="border-b border-line-soft">
                  <th scope="row" className="h-14 px-4 text-left font-normal">
                    <span className="inline-flex items-center gap-2 t-body text-ink">
                      <MuestraColor hex={color.hex} nombre={c.nombre} tamano={16} />
                      {c.nombre}
                    </span>
                  </th>
                  {tallas.map((t) => {
                    const k = claveVariante(t, c.id);
                    const varianteId = m.variantes[k];
                    if (!varianteId)
                      return (
                        <td key={t} className="text-center t-small text-disabled" aria-label="Sin esta talla">
                          ·
                        </td>
                      );
                    const n = valor(varianteId, k);
                    const estado = unLocal ? estadoCelda(n, m.stockMinimo, local?.vende ?? true) : n <= 0 ? 'cero' : n < m.stockMinimo ? 'bajo' : 'normal';
                    return (
                      <td key={t} className="h-14 w-[72px] border-l border-line-soft p-0 first:border-l-0">
                        <Celda
                          id={varianteId}
                          valor={n}
                          estado={estado}
                          enTransito={enTransito(varianteId)}
                          seleccionada={elegida === varianteId}
                          etiqueta={`${c.nombre}, talla ${t}: ${n} ${unLocal ? `en ${local?.nombre}` : 'en total'}`}
                          alElegir={() => setElegida((x) => (x === varianteId ? null : varianteId))}
                        />
                      </td>
                    );
                  })}
                  <td className="border-l border-ink px-2 text-center">
                    <Cifra valor={totalColor(c.id)} formatear={entero} className="t-body font-bold text-ink" />
                  </td>
                  <td className="px-4 t-small text-ink-2">
                    {ecVariante ? (
                      <span className="inline-flex items-center gap-2" data-testid={`en-camino-variante-${c.id}`}>
                        <Icono icono={Ship} tamano={14} />
                        <span>
                          <strong className="font-bold text-ink num">{entero(ecVariante.unidades)}</strong> en {ecVariante.numero} · llegan a bodega {relativaDias(ecVariante.fechaEstimada, hoy)}{' '}
                          <span className="text-muted">(talla {tallaElegida})</span>
                        </span>
                      </span>
                    ) : ec ? (
                      <span className="inline-flex items-center gap-2" title={`${ec.numero} · llegada estimada ${fecha(ec.llega)}`} data-testid={`en-camino-${c.id}`}>
                        <Icono icono={Ship} tamano={14} />
                        <span>
                          <strong className="font-semibold text-ink num">{entero(ec.unidades)}</strong> en {ec.numero} · llegan a bodega {relativaDias(ec.llega, hoy)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-subtle">Nada en camino</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-ink">
              <th scope="row" className="h-11 px-4 text-left t-eyebrow text-ink">
                {unLocal ? local?.nombre : 'Total'}
              </th>
              {tallas.map((t) => (
                <td key={t} className="text-center">
                  <Cifra valor={totalTalla(t)} formatear={entero} className="t-body font-bold text-ink" />
                </td>
              ))}
              <td className="border-l border-ink px-2 text-center" data-testid="matriz-total">
                <Cifra valor={totalGeneral} formatear={entero} className="t-body font-black text-ink" />
              </td>
              <td className="px-4 t-small num text-ink-2">{totalCamino > 0 ? `${entero(totalCamino)} en camino` : ''}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 t-small text-muted">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block size-3.5 border border-line-strong" style={{ backgroundImage: TRAMADO }} />
          Agotado
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block size-3.5 border-2 border-accent" />
          Por debajo del mínimo ({entero(m.stockMinimo)} por talla y local)
        </span>
        <span className="inline-flex items-center gap-2">
          <Icono icono={Truck} tamano={14} />
          En tránsito hacia ese local
        </span>
      </p>

      {elegida && claveElegida && (
        <section aria-label="Detalle de la celda" className="mt-4 border border-ink bg-surface" data-testid="panel-celda">
          <header className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4">
            <MiniaturaPrenda tipo={producto.tipoPrenda} color={colorElegido?.hex ?? '#C9C9C7'} tamano="buscador" />
            <div className="min-w-0 flex-1">
              <p className="t-h3 text-ink">
                {producto.nombre} · {colorElegido?.nombre} · talla {tallaElegida}
              </p>
              <p className="t-small text-muted num">
                {entero(Object.values(porLocal).reduce((a, b) => a + b, 0))} en total
                {camino && (
                  <>
                    {' '}
                    · {entero(camino.unidades)} en camino en {camino.numero}, llegan {relativaDias(camino.fechaEstimada, hoy)}
                  </>
                )}
              </p>
            </div>
          </header>

          {sugerenciaLocal && local && (estadoLocalElegido === 'cero' || estadoLocalElegido === 'bajo') && puedeSolicitar && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-accent-soft px-5 py-3" data-testid="sugerencia-traslado">
              <p className="t-body text-ink">
                {local.nombre} {estadoLocalElegido === 'cero' ? 'no tiene' : `tiene ${entero(porLocal[local.id] ?? 0)} (el mínimo es ${entero(m.stockMinimo)})`}.{' '}
                <strong className="font-bold">
                  Traer de {nombreLocal(sugerenciaLocal.origenId)} ({entero(sugerenciaLocal.disponibles)} disponibles)
                </strong>
              </p>
              <Button
                tamano="sm"
                iconoDerecha={ArrowRight}
                onClick={() => alSolicitar({ origenId: sugerenciaLocal.origenId, destinoId: local.id, varianteId: elegida, cantidad: sugerenciaLocal.cantidad, productoId })}
                data-testid="sugerencia-solicitar"
              >
                Pedir {entero(sugerenciaLocal.cantidad)} a {nombreLocal(sugerenciaLocal.origenId)}
              </Button>
            </div>
          )}

          <ul className="divide-y divide-line-soft" data-testid="celda-locales">
            {m.locales.map((l) => {
              const n = porLocal[l.id] ?? 0;
              const est = estadoCelda(n, m.stockMinimo, l.vende);
              const sug = l.vende ? sugerirOrigen({ destinoId: l.id, minimo: m.stockMinimo, locales: localesExistencia }) : null;
              const transito = pend.enTransito[`${elegida}@${l.id}`] ?? 0;
              const pedido = pend.solicitadas[`${elegida}@${l.id}`] ?? 0;
              return (
                <li key={l.id} className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3', l.id === vistaValida && 'bg-surface-2')}>
                  <span className="w-36 t-body font-semibold text-ink">{l.nombre}</span>
                  <span className="w-14 text-right">
                    <Cifra valor={n} formatear={entero} className="t-body font-bold text-ink" />
                  </span>
                  <span className="w-28">
                    {est === 'cero' && <Badge tono="danger" tamano="sm">Agotada</Badge>}
                    {est === 'bajo' && <Badge tono="accent" tamano="sm">Bajo el mínimo</Badge>}
                  </span>
                  <span className="min-w-0 flex-1 t-small text-muted num">
                    {transito > 0 && <span className="mr-3 inline-flex items-center gap-1 text-accent-ink"><Icono icono={Truck} tamano={12} />{entero(transito)} en tránsito</span>}
                    {pedido > 0 && <span>{entero(pedido)} solicitadas</span>}
                  </span>
                  {puedeSolicitar && l.vende && sug && est !== 'normal' && (
                    <Button
                      variante="secondary"
                      tamano="sm"
                      onClick={() => alSolicitar({ origenId: sug.origenId, destinoId: l.id, varianteId: elegida, cantidad: sug.cantidad, productoId })}
                      data-testid={`traer-a-${l.id}`}
                    >
                      Traer de {nombreLocal(sug.origenId)} ({entero(sug.disponibles)})
                    </Button>
                  )}
                  {puedeSolicitar && !l.vende && n > 0 && (
                    <Button variante="ghost" tamano="sm" onClick={() => alSolicitar({ origenId: l.id, varianteId: elegida, cantidad: 1, productoId })}>
                      Sacar de bodega
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

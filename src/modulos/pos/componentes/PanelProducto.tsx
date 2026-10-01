import { ScanBarcode, Shirt, X } from 'lucide-react';
import { useState } from 'react';
import type { Id } from '@/dominio/tipos';
import { useDinero, useEstadoDominio, useHoy, useSel } from '@/estado';
import { existencia, selMatrizExistencias } from '@/selectores';
import { entero } from '@/lib/formato';
import { BotonIcono, BuscadorProducto, Button, EmptyState, Icono, MiniaturaPrenda, MuestraColor, Pista, cn } from '@/ui';
import { selDestacadosPos } from '../selectores';
import { TEXTOS } from '../textos';

/**
 * Lado izquierdo del POS: búsqueda (nombre, referencia, SKU o EAN; Enter con un código completo agrega), botón
 * "Simular escaneo" y, debajo, los más vendidos del local o la grilla talla × color del producto elegido con
 * las existencias del local y, en gris, las de los otros locales. Tocar una celda agrega una unidad.
 */
export interface PropsPanelProducto {
  localId: Id;
  /** Unidades de la variante que ya están en el carrito. */
  enCarrito: (varianteId: Id) => number;
  alAgregar: (varianteId: Id) => void;
  alEscanear: () => void;
  /** Texto de la última lectura simulada (se anuncia y se muestra junto al botón). */
  ultimoEscaneo: string | null;
  /** Producto abierto en la grilla (lo controla la página para que "Nueva venta" lo limpie). */
  productoId: Id | null;
  alElegirProducto: (productoId: Id | null) => void;
}

export function PanelProducto({ localId, enCarrito, alAgregar, alEscanear, ultimoEscaneo, productoId, alElegirProducto }: PropsPanelProducto) {
  return (
    <section aria-label="Productos" className="flex min-h-0 flex-col gap-3">
      <div className="flex items-start gap-3">
        <BuscadorProducto
          className="min-w-0 flex-1"
          localId={localId}
          enfocarAlMontar
          placeholder="Buscar por nombre, referencia, SKU o escanear el código"
          alElegir={(r) => {
            alElegirProducto(r.producto.id);
            if (r.variante) alAgregar(r.variante.id);
          }}
        />
        <Pista id="pos.escaneo" alinear="fin">
          <Button variante="secondary" icono={ScanBarcode} onClick={alEscanear} data-testid="pos-simular-escaneo" className="h-9">
            {TEXTOS.escaneo.boton}
          </Button>
        </Pista>
      </div>
      <p aria-live="polite" className="-mt-1 min-h-[18px] t-small text-muted" data-testid="pos-ultimo-escaneo">
        {ultimoEscaneo ?? TEXTOS.escaneo.ayuda}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto border border-line bg-surface">
        {productoId ? (
          <FichaVariantes productoId={productoId} localId={localId} enCarrito={enCarrito} alAgregar={alAgregar} alCerrar={() => alElegirProducto(null)} />
        ) : (
          <MasVendidos localId={localId} alElegir={alElegirProducto} />
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Más vendidos del local
// ---------------------------------------------------------------------------------------------------------
function MasVendidos({ localId, alElegir }: { localId: Id; alElegir: (id: Id) => void }) {
  const hoy = useHoy();
  const e = useEstadoDominio();
  const d = useDinero();
  const lista = useSel(selDestacadosPos, { localId, hoy, n: 8 });
  const local = e.locales[localId]?.nombre ?? '';
  if (!lista.length)
    return (
      <EmptyState
        tamano="tabla"
        icono={Shirt}
        titulo={`Todavía no hay prendas con existencias en ${local}`}
        texto="Busca una referencia o pide un traslado desde otro local para poder venderla aquí."
      />
    );
  return (
    <div className="p-4">
      <p className="mb-3 t-eyebrow text-ink-2">{TEXTOS.masVendidos(local)}</p>
      <ul className="grid grid-cols-2 gap-2" data-testid="pos-mas-vendidos">
        {lista.map((x) => (
          <li key={x.producto.id}>
            <button
              type="button"
              onClick={() => alElegir(x.producto.id)}
              className="flex w-full items-center gap-3 border border-line bg-surface p-2 text-left transition-colors duration-(--dur-instant) hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <MiniaturaPrenda tipo={x.producto.tipoPrenda} color={x.colorHex} patron={x.patron} tamano="buscador" className="w-10" />
              <span className="min-w-0 flex-1">
                <span className="block truncate t-label text-ink">{x.producto.nombre}</span>
                <span className="block truncate t-small num text-muted">
                  {x.producto.referencia} · {d(x.producto.precioVenta)}
                </span>
                <span className="block t-small num text-ink-2">{entero(x.disponibles)} en este local</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Ficha de variantes: grilla talla × color
// ---------------------------------------------------------------------------------------------------------
function FichaVariantes({ productoId, localId, enCarrito, alAgregar, alCerrar }: { productoId: Id; localId: Id; enCarrito: (id: Id) => number; alAgregar: (id: Id) => void; alCerrar: () => void }) {
  const m = useSel(selMatrizExistencias, { productoId });
  const e = useEstadoDominio();
  const d = useDinero();
  const [colorSel, setColorSel] = useState<Id | null>(null);
  const p = e.productos[productoId];
  if (!m || !p) return null;
  const local = e.locales[localId]?.nombre ?? '';
  const muestra = m.colores.find((c) => c.id === colorSel) ?? m.colores[0];
  const otros = m.locales.filter((l) => l.id !== localId);
  return (
    <div className="p-4" data-testid="pos-ficha-variantes">
      <div className="flex items-start gap-3">
        <MiniaturaPrenda tipo={p.tipoPrenda} color={muestra?.hex ?? '#C9C9C7'} patron={muestra ? e.colores[muestra.id]?.patron : 'liso'} tamano="buscador" className="w-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate t-h3 text-ink">{p.nombre}</p>
          <p className="t-small num text-muted">
            {p.referencia} · {d(p.precioVenta)} · IVA incluido
          </p>
        </div>
        <BotonIcono icono={X} etiqueta="Cerrar la ficha del producto" variante="ghost" tamano="sm" onClick={alCerrar} />
      </div>
      <p className="mb-2 mt-3 t-small text-muted">
        {TEXTOS.grillaAyuda(local)}
      </p>
      <div className="overflow-x-auto border border-line">
        <table className="w-full border-collapse" aria-label={`Existencias de ${p.nombre} por talla y color`}>
          <thead>
            <tr className="border-b border-ink">
              <th scope="col" className="h-9 px-3 text-left t-eyebrow text-ink-2">
                Color
              </th>
              {m.tallas.map((t) => (
                <th key={t} scope="col" className="h-9 w-[52px] px-1 text-center t-eyebrow num text-ink-2">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.colores.map((c) => (
              <tr key={c.id} className="border-b border-line-soft last:border-b-0">
                <th scope="row" className="h-[46px] px-3 text-left font-normal">
                  <button type="button" onClick={() => setColorSel(c.id)} className="inline-flex items-center gap-2 t-small text-ink" title={`Ver ${c.nombre}`}>
                    <MuestraColor hex={c.hex} nombre={c.nombre} patron={e.colores[c.id]?.patron} />
                    {c.nombre}
                  </button>
                </th>
                {m.tallas.map((t) => {
                  const varianteId = m.variantes[`${t}|${c.id}`];
                  if (!varianteId)
                    return (
                      <td key={t} className="text-center t-small text-disabled">
                        ·
                      </td>
                    );
                  const celda = m.celdas[`${t}|${c.id}`] ?? {};
                  const aqui = celda[localId] ?? existencia(e, varianteId, localId);
                  const fuera = otros.reduce((s, l) => s + (celda[l.id] ?? 0), 0);
                  const alCarro = enCarrito(varianteId);
                  const libres = aqui - alCarro;
                  const detalleOtros = otros.filter((l) => (celda[l.id] ?? 0) > 0).map((l) => `${l.nombre}: ${celda[l.id]}`);
                  const titulo = `${c.nombre} · ${t}: ${aqui} en ${local}${detalleOtros.length ? ` · ${detalleOtros.join(' · ')}` : ''}`;
                  const agotada = libres <= 0;
                  return (
                    <td key={t} className="h-[46px] p-0 text-center">
                      <button
                        type="button"
                        disabled={agotada}
                        onClick={() => alAgregar(varianteId)}
                        title={agotada && aqui > 0 ? `Ya agregaste las ${aqui} unidades disponibles en ${local}` : titulo}
                        aria-label={`${c.nombre}, talla ${t}: ${aqui} en ${local}${fuera ? `, ${fuera} en otros locales` : ''}${alCarro ? `, ${alCarro} en el carrito` : ''}`}
                        data-testid={`pos-celda-${varianteId}`}
                        className={cn(
                          'relative flex h-[46px] w-full flex-col items-center justify-center leading-tight transition-colors duration-(--dur-instant) focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus',
                          agotada ? 'cursor-not-allowed' : 'hover:bg-selected',
                          alCarro > 0 && 'bg-selected shadow-[inset_0_0_0_1px_var(--c-ink)]',
                        )}
                      >
                        <span className={cn('t-body num', aqui === 0 ? 'text-disabled' : agotada ? 'text-muted' : 'font-semibold text-ink')}>{aqui === 0 ? '—' : entero(aqui)}</span>
                        {fuera > 0 && (
                          <span className={cn('t-micro num', aqui === 0 ? 'text-muted' : 'text-subtle')} aria-hidden>
                            +{entero(fuera)}
                          </span>
                        )}
                        {alCarro > 0 && (
                          <span aria-hidden className="absolute right-0.5 top-0.5 inline-flex min-w-4 items-center justify-center bg-ink px-1 t-micro num text-inverse">
                            {alCarro}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 flex items-center gap-2 t-small text-muted">
        <Icono icono={ScanBarcode} tamano={14} />
        <span>
          <strong className="font-semibold text-ink-2">Número grande</strong>: unidades en {local}. <strong className="font-semibold text-ink-2">+N</strong>: en los otros locales.
        </span>
      </p>
    </div>
  );
}

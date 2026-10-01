import { Package, Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import type { Id, MonedaExtranjera } from '@/dominio/tipos';
import { entero } from '@/lib/formato';
import { Button, EmptyState, InputNumero, MuestraColor, Select, type OpcionSelect } from '@/ui';
import type { ProductoPedido } from '../selectores';

/**
 * Editor de las líneas de un pedido: una tarjeta por referencia con el precio de fábrica (en la moneda del pedido)
 * y la matriz talla × color de unidades. Se usa al crear un pedido y al editar uno que aún no pagó el saldo.
 */
export interface LineaBorrador {
  clave: string;
  productoId: Id | null;
  /** FOB unitario en unidades de la moneda (11,40), no en centavos. */
  fob: number | null;
  /** varianteId → unidades. */
  cantidades: Record<Id, number>;
}

let contador = 0;
/** Clave estable de una línea nueva (sin reloj ni azar). */
export function claveLinea(): string {
  contador += 1;
  return `l${contador}`;
}

export function unidadesBorrador(l: Pick<LineaBorrador, 'cantidades'>): number {
  return Object.values(l.cantidades).reduce((a, n) => a + (n > 0 ? n : 0), 0);
}

export function fobBorradorCentavos(l: Pick<LineaBorrador, 'fob' | 'cantidades'>): number {
  return Math.round((l.fob ?? 0) * 100) * unidadesBorrador(l);
}

export function EditorLineas({
  catalogo,
  lineas,
  alCambiar,
  moneda,
  deshabilitado,
  error,
}: {
  catalogo: readonly ProductoPedido[];
  lineas: readonly LineaBorrador[];
  alCambiar: (lineas: LineaBorrador[]) => void;
  moneda: MonedaExtranjera;
  deshabilitado?: boolean;
  error?: string | null;
}) {
  const porId = useMemo(() => new Map(catalogo.map((p) => [p.productoId, p])), [catalogo]);
  const usados = new Set(lineas.map((l) => l.productoId));

  const actualizar = (clave: string, parcial: Partial<LineaBorrador>) => alCambiar(lineas.map((l) => (l.clave === clave ? { ...l, ...parcial } : l)));
  const agregar = () => alCambiar([...lineas, { clave: claveLinea(), productoId: null, fob: null, cantidades: {} }]);
  const quitar = (clave: string) => alCambiar(lineas.filter((l) => l.clave !== clave));

  const opciones = (actual: Id | null): OpcionSelect[] =>
    catalogo.filter((p) => p.productoId === actual || !usados.has(p.productoId)).map((p) => ({ valor: p.productoId, etiqueta: `${p.referencia} · ${p.nombre}` }));

  return (
    <div className="space-y-4" data-testid="editor-lineas">
      {error && <p className="border-l-2 border-danger pl-3 t-small text-ink">{error}</p>}
      {lineas.length === 0 && (
        <div className="border border-line bg-surface">
          <EmptyState tamano="tabla" icono={Package} titulo="Agrega las referencias del pedido" texto="Elige la prenda, el precio de fábrica y cuántas unidades por talla y color." accion={<Button variante="secondary" icono={Plus} onClick={agregar} disabled={deshabilitado}>Agregar referencia</Button>} />
        </div>
      )}
      {lineas.map((l, idx) => {
        const p = l.productoId ? porId.get(l.productoId) : undefined;
        const total = unidadesBorrador(l);
        return (
          <section key={l.clave} className="border border-line bg-surface p-4" data-testid={`linea-${idx}`}>
            <div className="flex flex-wrap items-end gap-4">
              <Select
                className="min-w-[320px] flex-1"
                etiqueta="Referencia"
                placeholder="Elige la prenda"
                valor={l.productoId}
                alCambiar={(v) => {
                  const nuevo = porId.get(v);
                  actualizar(l.clave, { productoId: v, cantidades: {}, fob: nuevo?.fobUltimo ? nuevo.fobUltimo / 100 : null });
                }}
                opciones={opciones(l.productoId)}
                deshabilitado={deshabilitado}
                enModal
              />
              <InputNumero
                className="w-44"
                etiqueta={`Precio de fábrica (${moneda === 'USD' ? 'US$' : 'CN¥'})`}
                prefijo={moneda === 'USD' ? 'US$' : 'CN¥'}
                valor={l.fob}
                alCambiar={(v) => actualizar(l.clave, { fob: v })}
                decimales={2}
                disabled={deshabilitado}
                ayuda={p?.fobUltimo ? 'Último pedido a esta fábrica' : undefined}
              />
              <div className="pb-2.5 t-body num text-ink">
                <span className="font-bold">{entero(total)}</span> <span className="text-muted">prendas</span>
              </div>
              <Button variante="ghost" tamano="sm" icono={Trash2} onClick={() => quitar(l.clave)} disabled={deshabilitado} aria-label={`Quitar la referencia ${p?.referencia ?? ''}`} className="mb-1">
                Quitar
              </Button>
            </div>
            {p && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse">
                  <caption className="sr-only">Unidades por color y talla de {p.nombre}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="w-44 pb-2 text-left t-eyebrow text-ink-2">
                        Color
                      </th>
                      {p.tallas.map((t) => (
                        <th key={t} scope="col" className="w-20 pb-2 text-center t-eyebrow text-ink-2">
                          {t}
                        </th>
                      ))}
                      <th scope="col" className="w-16 pb-2 text-right t-eyebrow text-ink-2">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.colores.map((c) => {
                      const totalColor = p.tallas.reduce((a, t) => a + (l.cantidades[p.variantes[`${t}|${c.id}`] ?? ''] ?? 0), 0);
                      return (
                        <tr key={c.id} className="border-t border-line-soft">
                          <th scope="row" className="py-1.5 text-left font-normal">
                            <span className="inline-flex items-center gap-2 t-body text-ink">
                              <MuestraColor hex={c.hex} nombre={c.nombre} patron={c.patron} tamano={16} />
                              {c.nombre}
                            </span>
                          </th>
                          {p.tallas.map((t) => {
                            const vid = p.variantes[`${t}|${c.id}`];
                            return (
                              <td key={t} className="px-1 py-1">
                                {vid ? (
                                  <InputNumero
                                    tamano="sm"
                                    etiqueta={`${c.nombre}, talla ${t}`}
                                    etiquetaOculta
                                    valor={l.cantidades[vid] ?? null}
                                    alCambiar={(v) => actualizar(l.clave, { cantidades: { ...l.cantidades, [vid]: v ?? 0 } })}
                                    disabled={deshabilitado}
                                    placeholder="0"
                                  />
                                ) : (
                                  <span className="block text-center text-subtle">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="py-1.5 text-right t-body num text-ink-2">{entero(totalColor)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
      {lineas.length > 0 && (
        <Button variante="secondary" icono={Plus} onClick={agregar} disabled={deshabilitado || usados.size >= catalogo.length}>
          Agregar otra referencia
        </Button>
      )}
    </div>
  );
}

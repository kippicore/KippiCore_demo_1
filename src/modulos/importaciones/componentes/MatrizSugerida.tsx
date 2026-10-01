import { ChevronDown } from 'lucide-react';
import type { Id } from '@/dominio/tipos';
import { entero, numero, porcentaje } from '@/lib/formato';
import { cn, Icono, InputNumero, MuestraColor } from '@/ui';
import { cantidadVigente, resumenReferencia } from '../calculos';
import type { ProductoSugerido } from '../selectores';

/**
 * Una referencia de "Sugerir pedido": encabezado con el resumen ("420 unidades · M 160 · L 120 … · azul cielo 35 % ·
 * ya vienen 48 en IMP-2026-07") y la matriz talla × color con tres lentes: cantidad sugerida (editable), lo que
 * rota por semana, y lo que hay más lo que viene en camino.
 */
export type Lente = 'sugerido' | 'rotacion' | 'stock';

export function MatrizSugerida({
  producto,
  ediciones,
  alEditar,
  lente,
  abierta,
  alAlternar,
  deshabilitada,
}: {
  producto: ProductoSugerido;
  ediciones: Readonly<Record<Id, number>>;
  alEditar: (varianteId: Id, cantidad: number | null) => void;
  lente: Lente;
  abierta: boolean;
  alAlternar: () => void;
  deshabilitada?: boolean;
}) {
  const celdasLista = Object.values(producto.celdas).map((c) => ({
    ...c,
    cantidad: cantidadVigente(c.sugerida, ediciones[c.varianteId]),
    colorNombre: producto.colores.find((k) => k.id === c.colorId)?.nombre ?? '',
    colorCodigo: producto.colores.find((k) => k.id === c.colorId)?.codigo ?? '',
  }));
  const resumen = resumenReferencia(celdasLista.map((c) => ({ talla: c.talla, colorNombre: c.colorNombre, colorCodigo: c.colorCodigo, cantidad: c.cantidad })), producto.referencia, producto.nombre);
  const mejorColor = resumen.colores[0];
  const editadas = celdasLista.filter((c) => ediciones[c.varianteId] !== undefined && ediciones[c.varianteId] !== c.sugerida).length;
  const idCuerpo = `matriz-${producto.productoId}`;

  const valor = (talla: string, colorId: Id) => producto.celdas[`${talla}|${colorId}`];
  const sumaTalla = (talla: string) =>
    producto.colores.reduce((a, c) => {
      const x = valor(talla, c.id);
      if (!x) return a;
      return a + (lente === 'sugerido' ? cantidadVigente(x.sugerida, ediciones[x.varianteId]) : lente === 'rotacion' ? x.rotacionSemanal : x.existencias + x.enCamino);
    }, 0);
  const formato = (n: number) => (lente === 'rotacion' ? numero(n, 1) : entero(n));

  return (
    <section className="border border-line bg-surface" data-testid={`ref-${producto.referencia}`}>
      <button
        type="button"
        aria-expanded={abierta}
        aria-controls={idCuerpo}
        onClick={alAlternar}
        className="flex w-full flex-wrap items-start gap-x-6 gap-y-1 p-5 text-left outline-none hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
      >
        <span className="min-w-[260px] flex-1">
          <span className="block t-eyebrow text-ink-2">{producto.referencia}</span>
          <span className="block t-h3 font-bold text-ink">{producto.nombre}</span>
          <span className="mt-1 block t-small text-muted" data-testid={`resumen-${producto.referencia}`}>
            {resumen.tallas.map((t) => `${t.talla} ${entero(t.unidades)}`).join(' · ')}
            {mejorColor && resumen.total > 0 && ` · ${mejorColor.nombre.toLowerCase()} ${porcentaje(mejorColor.unidades / resumen.total, 0)}`}
            {producto.enCaminoPorPedido.length > 0 && ` · ya vienen ${entero(producto.enCamino)} en ${producto.enCaminoPorPedido.map((p) => p.numero).join(', ')}`}
          </span>
        </span>
        <span className="flex items-center gap-4">
          {editadas > 0 && <span className="t-small text-accent-ink">{editadas === 1 ? '1 cantidad editada' : `${editadas} cantidades editadas`}</span>}
          <span className="text-right">
            <span className="block t-kpi-sm num text-ink" data-testid={`total-${producto.referencia}`}>
              {entero(resumen.total)}
            </span>
            <span className="block t-small text-muted">{resumen.total === 1 ? 'unidad' : 'unidades'}</span>
          </span>
          <Icono icono={ChevronDown} tamano={18} className={cn('transition-transform duration-(--dur-slow) ease-standard', abierta && 'rotate-180')} />
        </span>
      </button>
      {abierta && (
        <div id={idCuerpo} className="overflow-x-auto border-t border-line-soft px-5 pb-5 pt-3">
          <table className="w-full border-collapse">
            <caption className="sr-only">
              {lente === 'sugerido' ? 'Cantidad a pedir' : lente === 'rotacion' ? 'Unidades vendidas por semana' : 'Existencias y unidades en camino'} de {producto.nombre} por color y talla
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-48 pb-2 text-left t-eyebrow text-ink-2">
                  Color
                </th>
                {producto.tallas.map((t) => (
                  <th key={t} scope="col" className="pb-2 text-center t-eyebrow text-ink-2">
                    {t}
                  </th>
                ))}
                <th scope="col" className="w-20 pb-2 text-right t-eyebrow text-ink-2">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {producto.colores.map((c) => {
                const fila = producto.tallas.map((t) => valor(t, c.id));
                const totalFila = fila.reduce((a, x) => (x ? a + (lente === 'sugerido' ? cantidadVigente(x.sugerida, ediciones[x.varianteId]) : lente === 'rotacion' ? x.rotacionSemanal : x.existencias + x.enCamino) : a), 0);
                return (
                  <tr key={c.id} className="border-t border-line-soft">
                    <th scope="row" className="py-1.5 text-left font-normal">
                      <span className="inline-flex items-center gap-2 t-body text-ink">
                        <MuestraColor hex={c.hex} nombre={c.nombre} patron={c.patron} tamano={16} />
                        {c.nombre}
                      </span>
                    </th>
                    {producto.tallas.map((t, i) => {
                      const x = fila[i];
                      if (!x)
                        return (
                          <td key={t} className="px-1 py-1 text-center text-subtle">
                            —
                          </td>
                        );
                      if (lente === 'sugerido')
                        return (
                          <td key={t} className="px-1 py-1">
                            <InputNumero
                              className="mx-auto w-[72px]"
                              tamano="sm"
                              etiqueta={`${c.nombre}, talla ${t}: cantidad a pedir`}
                              etiquetaOculta
                              valor={cantidadVigente(x.sugerida, ediciones[x.varianteId])}
                              alCambiar={(v) => alEditar(x.varianteId, v)}
                              disabled={deshabilitada}
                              claseCampo={ediciones[x.varianteId] !== undefined && ediciones[x.varianteId] !== x.sugerida ? 'border-accent!' : undefined}
                              data-testid={`celda-${x.varianteId}`}
                            />
                          </td>
                        );
                      return (
                        <td key={t} className="px-1 py-1 text-center t-body num text-ink">
                          {lente === 'rotacion' ? (
                            <span className={x.rotacionSemanal >= 1.5 ? 'font-bold' : undefined}>{x.rotacionSemanal > 0 ? numero(x.rotacionSemanal, 1) : <span className="text-subtle">0</span>}</span>
                          ) : (
                            <span title={`Hay ${x.existencias} y vienen ${x.enCamino}`}>
                              <span className={x.existencias === 0 ? 'font-bold text-danger' : undefined}>{entero(x.existencias)}</span>
                              {x.enCamino > 0 && <span className="text-muted"> +{entero(x.enCamino)}</span>}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-1.5 text-right t-body num font-semibold text-ink">{formato(totalFila)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-ink">
                <th scope="row" className="py-2 text-left t-eyebrow text-ink-2">
                  Total por talla
                </th>
                {producto.tallas.map((t) => (
                  <td key={t} className="py-2 text-center t-body num font-bold text-ink">
                    {formato(sumaTalla(t))}
                  </td>
                ))}
                <td className="py-2 text-right t-body num font-bold text-ink">{formato(producto.tallas.reduce((a, t) => a + sumaTalla(t), 0))}</td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-2 t-small text-muted">
            {lente === 'sugerido' && 'Edita cualquier cantidad: el costo y el margen del pedido se recalculan al instante.'}
            {lente === 'rotacion' && 'Unidades vendidas por semana en las últimas 12 semanas, incluyendo lo que se pidió y no había.'}
            {lente === 'stock' && 'Existencias en los tres locales y la bodega, y lo que ya viene en camino (+). En rojo, lo que está agotado.'}
          </p>
        </div>
      )}
    </section>
  );
}

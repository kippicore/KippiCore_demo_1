import { Ship } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Id } from '@/dominio/tipos';
import { useEstadoDominio, useFiltroLocal, useHoy, useSel } from '@/estado';
import { selMatrizExistencias } from '@/selectores';
import { entero, fecha, relativaDias } from '@/lib/formato';
import { cn } from '../cn';
import { Icono } from '../primitivos/Icono';
import { MuestraColor } from '../primitivos/Piezas';
import { Segmentado } from '../primitivos/Segmentado';

/**
 * Matriz talla × color × local (PLAN 8.7.26, W2): filas = colores, columnas = tallas en el orden del tipo, "Total" y
 * "En camino" (unidades de las importaciones en curso con su llegada estimada). Arriba, el local: "Este local" (el del
 * contexto) · "Todos" · cada local. En "Este local" la celda muestra el número del local y, si hay en otros, "+5"
 * debajo. Celdas en el mínimo o por debajo en `warning-soft`; 0 → "—". En el POS las celdas se eligen.
 *
 *   <MatrizExistencias productoId={p.id} />
 *   <MatrizExistencias productoId={p.id} alElegir={(varianteId) => agregar(varianteId)} seleccionada={varianteId} />
 */
export interface PropsMatrizExistencias {
  productoId: Id;
  alElegir?: (varianteId: Id) => void;
  seleccionada?: Id | null;
  /** Local inicial de la vista (por defecto: el del contexto, o "Todos"). */
  localInicial?: Id | 'todos';
  className?: string;
}

export function MatrizExistencias({ productoId, alElegir, seleccionada, localInicial, className }: PropsMatrizExistencias) {
  const m = useSel(selMatrizExistencias, { productoId });
  const e = useEstadoDominio();
  const hoy = useHoy();
  const contexto = useFiltroLocal();
  const [vista, setVista] = useState<Id | 'todos' | 'este'>(localInicial ?? (contexto === 'todos' ? 'todos' : 'este'));
  const localVista: Id | 'todos' = vista === 'este' ? contexto : vista;

  const enCaminoPorColor = useMemo(() => {
    const r: Record<Id, { unidades: number; numero: string; fecha: string } | undefined> = {};
    if (!m) return r;
    for (const c of m.colores)
      for (const t of m.tallas) {
        const v = m.variantes[`${t}|${c.id}`];
        const ec = v ? m.enCamino[v] : undefined;
        if (!ec) continue;
        const prev = r[c.id];
        r[c.id] = { unidades: (prev?.unidades ?? 0) + ec.unidades, numero: prev?.numero ?? ec.numero, fecha: prev && prev.fecha < ec.fechaEstimada ? prev.fecha : ec.fechaEstimada };
      }
    return r;
  }, [m]);

  if (!m) return null;
  const valor = (k: string) => {
    const c = m.celdas[k] ?? {};
    const todos = Object.values(c).reduce((a, b) => a + b, 0);
    if (localVista === 'todos') return { aqui: todos, otros: 0 };
    const aqui = c[localVista] ?? 0;
    return { aqui, otros: todos - aqui };
  };
  const opciones = [
    ...(contexto !== 'todos' ? [{ valor: 'este' as const, etiqueta: 'Este local' }] : []),
    { valor: 'todos' as const, etiqueta: 'Todos' },
    ...m.locales.map((l) => ({ valor: l.id, etiqueta: l.nombre })),
  ];
  const totalColumna = (t: string) => m.colores.reduce((s, c) => s + valor(`${t}|${c.id}`).aqui, 0);
  const totalFila = (colorId: Id) => m.tallas.reduce((s, t) => s + valor(`${t}|${colorId}`).aqui, 0);
  const totalGeneral = m.colores.reduce((s, c) => s + totalFila(c.id), 0);
  const totalEnCamino = Object.values(enCaminoPorColor).reduce((s, x) => s + (x?.unidades ?? 0), 0);
  const unLocal = localVista !== 'todos';

  return (
    <div className={cn('min-w-0', className)} data-testid="matriz-existencias">
      <Segmentado etiqueta="Local de la matriz" valor={vista} alCambiar={(v) => setVista(v)} opciones={opciones} className="mb-3 max-w-full overflow-x-auto" />
      <div className="overflow-x-auto border border-line bg-surface">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-ink">
              <th scope="col" className="h-10 px-3 text-left t-eyebrow text-ink-2">
                Color
              </th>
              {m.tallas.map((t) => (
                <th key={t} scope="col" className="h-10 w-12 px-1 text-center t-eyebrow num text-ink-2">
                  {t}
                </th>
              ))}
              <th scope="col" className="h-10 w-16 border-l border-ink px-2 text-center t-eyebrow text-ink">
                Total
              </th>
              <th scope="col" className="h-10 px-3 text-left t-eyebrow text-ink-2">
                En camino
              </th>
            </tr>
          </thead>
          <tbody>
            {m.colores.map((c) => {
              const color = e.colores[c.id];
              const ec = enCaminoPorColor[c.id];
              return (
                <tr key={c.id} className="border-b border-line-soft">
                  <th scope="row" className="h-10 px-3 text-left font-normal">
                    <span className="inline-flex items-center gap-2 t-small text-ink">
                      <MuestraColor hex={c.hex} nombre={c.nombre} patron={color?.patron} />
                      {c.nombre}
                    </span>
                  </th>
                  {m.tallas.map((t) => {
                    const k = `${t}|${c.id}`;
                    const varianteId = m.variantes[k];
                    if (!varianteId)
                      return (
                        <td key={t} className="text-center t-small text-disabled">
                          ·
                        </td>
                      );
                    const { aqui, otros } = valor(k);
                    const bajo = unLocal && aqui > 0 && aqui <= m.stockMinimo;
                    const elegida = seleccionada === varianteId;
                    const contenido = (
                      <span className="flex flex-col items-center leading-tight">
                        <span className={cn('t-body num', aqui === 0 && !elegida ? 'text-disabled' : bajo && !elegida ? 'font-semibold text-warning' : '')}>{aqui === 0 ? '—' : entero(aqui)}</span>
                        {unLocal && otros > 0 && <span className={cn('t-micro num', elegida ? 'text-inverse' : 'text-ink-2')}>+{entero(otros)}</span>}
                      </span>
                    );
                    return (
                      <td key={t} className={cn('h-10 w-12 p-0 text-center', bajo && !elegida && 'bg-warning-soft', elegida && 'bg-ink text-inverse')}>
                        {alElegir ? (
                          <button
                            type="button"
                            onClick={() => alElegir(varianteId)}
                            aria-pressed={elegida}
                            aria-label={`${c.nombre}, talla ${t}: ${aqui} ${unLocal ? 'en este local' : 'en total'}`}
                            className="flex h-10 w-full items-center justify-center hover:bg-surface-2 aria-pressed:hover:bg-ink"
                          >
                            {contenido}
                          </button>
                        ) : (
                          contenido
                        )}
                      </td>
                    );
                  })}
                  <td className="border-l border-ink px-2 text-center t-body font-bold num text-ink">{entero(totalFila(c.id))}</td>
                  <td className="px-3 t-small num text-ink-2">
                    {ec ? (
                      <span className="inline-flex items-center gap-1.5" title={`${ec.numero} · llegada estimada ${fecha(ec.fecha)}`}>
                        <Icono icono={Ship} tamano={14} />
                        <strong className="font-semibold text-ink">{entero(ec.unidades)}</strong>
                        <span>· {relativaDias(ec.fecha, hoy)}</span>
                      </span>
                    ) : (
                      <span className="text-disabled">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-ink">
              <th scope="row" className="h-10 px-3 text-left t-eyebrow text-ink">
                Total
              </th>
              {m.tallas.map((t) => (
                <td key={t} className="text-center t-body font-bold num text-ink">
                  {entero(totalColumna(t))}
                </td>
              ))}
              <td className="border-l border-ink px-2 text-center t-body font-black num text-ink">{entero(totalGeneral)}</td>
              <td className="px-3 t-small num text-ink-2">{totalEnCamino > 0 ? `${entero(totalEnCamino)} en camino` : ''}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

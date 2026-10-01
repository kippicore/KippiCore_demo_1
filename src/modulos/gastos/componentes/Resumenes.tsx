import type { ReactNode } from 'react';
import { BarraProgreso, Card, Dinero } from '@/ui';
import { porcentaje, variacion } from '@/lib/formato';
import { cn } from '@/ui/cn';
import type { CategoriaGasto } from '@/dominio/tipos';
import type { ResumenCategorias, FilaGastosPorLocal } from '../selectores';
import { ETIQUETA_CATEGORIA } from '../textos';

/** Cambio frente al mes anterior en palabras cortas ("+12,4 %", "Sin gasto el mes pasado"). */
export function CambioMes({ actual, anterior, className }: { actual: number; anterior: number; className?: string }) {
  if (!anterior) return <span className={cn('t-small text-muted', className)}>{actual ? 'Nuevo este mes' : 'Sin gasto'}</span>;
  const v = (actual - anterior) / anterior;
  if (Math.abs(v) < 0.0005) return <span className={cn('t-small text-muted', className)}>Igual que el mes pasado</span>;
  return (
    <span className={cn('t-small num', v > 0 ? 'text-ink' : 'text-ink-2', className)}>
      {variacion(v)} <span className="text-muted">vs. el mes pasado</span>
    </span>
  );
}

function FilaBarra({ etiqueta, actual, anterior, total, testid }: { etiqueta: ReactNode; actual: number; anterior: number; total: number; testid?: string }) {
  return (
    <li data-testid={testid}>
      <BarraProgreso
        valor={total > 0 ? actual / total : 0}
        etiqueta={etiqueta}
        detalle={
          <span className="inline-flex items-baseline gap-2">
            <span className="font-semibold text-ink">
              <Dinero valor={actual} corta />
            </span>
            <span className="text-muted">{total > 0 ? porcentaje(actual / total, 0) : '0 %'}</span>
          </span>
        }
      />
      <CambioMes actual={actual} anterior={anterior} className="mt-1 block" />
    </li>
  );
}

/** "En qué se va la plata": cada categoría con su peso en el mes y su cambio frente al anterior. */
export function TarjetaPorCategoria({ resumen }: { resumen: ResumenCategorias }) {
  const filas = resumen.categorias.filter((c) => c.actual > 0 || c.anterior > 0);
  return (
    <Card titulo="En qué se va la plata" data-testid="gastos-por-categoria">
      {filas.length === 0 ? (
        <p className="t-body text-muted">No hay gastos en este mes para repartir por categoría.</p>
      ) : (
        <ul className="space-y-4">
          {filas.slice(0, 7).map((c) => (
            <FilaBarra key={c.categoria} etiqueta={ETIQUETA_CATEGORIA[c.categoria as CategoriaGasto]} actual={c.actual} anterior={c.anterior} total={resumen.total} testid={`gastos-cat-${c.categoria}`} />
          ))}
        </ul>
      )}
    </Card>
  );
}

/** "Por local": cuánto gastó cada local y lo general, contra el mes anterior. */
export function TarjetaPorLocal({ filas, total }: { filas: readonly FilaGastosPorLocal[]; total: number }) {
  const conGasto = filas.filter((f) => f.actual > 0 || f.anterior > 0);
  return (
    <Card titulo="Por local" data-testid="gastos-por-local">
      {conGasto.length === 0 ? (
        <p className="t-body text-muted">No hay gastos en este mes.</p>
      ) : (
        <ul className="space-y-4">
          {conGasto.map((f) => (
            <FilaBarra key={f.localId ?? 'general'} etiqueta={f.localId ? f.nombre : 'General (sin local)'} actual={f.actual} anterior={f.anterior} total={total} testid={`gastos-local-${f.localId ?? 'general'}`} />
          ))}
        </ul>
      )}
    </Card>
  );
}

import { CircleCheck, Receipt } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import type { Gasto } from '@/dominio/tipos';
import { ESTADOS_POR_PAGAR } from '@/config/estados';
import { rutas } from '@/app/rutas';
import { entero, plural } from '@/lib/formato';
import { dineroOrigen } from '@/lib/moneda';
import type { FilaCxP } from '@/selectores';
import { BadgeEstado, BotonEnlace, Card, Dinero, EmptyState, EnlaceVerTodo, Fecha, Icono, Table, type ColumnaTabla } from '@/ui';
import { CATEGORIAS_LOCAL } from '../textos';

/** Lo que se le debe a un proveedor: cada cuenta enlaza a Pagos, resaltada. */
export function CuentasPorPagarProveedor({ filas, totalCop }: { filas: readonly FilaCxP[]; totalCop: number }) {
  return (
    <Card titulo="Lo que le debes" accion={filas.length > 0 ? <EnlaceVerTodo a={rutas.porPagar({ resaltar: filas[0]?.cxp.id })}>Ver en Pagos</EnlaceVerTodo> : undefined} data-testid="ficha-cuentas">
      {filas.length === 0 ? (
        <p className="flex items-center gap-2 t-body text-muted" data-testid="ficha-al-dia">
          <Icono icono={CircleCheck} tamano={18} className="text-success" />
          No le debes nada a este proveedor.
        </p>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-line-soft">
            {filas.map((f) => (
              <li key={f.cxp.id}>
                <Link to={rutas.porPagar({ resaltar: f.cxp.id })} className="group flex items-start justify-between gap-3 py-3 first:pt-0 hover:bg-surface-2" data-testid={`cuenta-${f.cxp.id}`}>
                  <div className="min-w-0">
                    <p className="truncate t-body font-semibold text-ink group-hover:underline group-hover:underline-offset-4">{f.cxp.concepto}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 t-small text-muted">
                      <BadgeEstado estado={ESTADOS_POR_PAGAR[f.estado]} tamano="sm" />
                      <span>
                        Vence <Fecha valor={f.cxp.fechaVencimiento} formato="corta" />
                      </span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Dinero valor={f.saldoCop} className="t-body font-bold" />
                    {f.cxp.moneda !== 'COP' && <p className="t-small num text-muted">{dineroOrigen(f.saldoOrigen, f.cxp.moneda)}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center justify-between border-t border-ink pt-3 t-body font-bold">
            <span>Total por pagar</span>
            <Dinero valor={totalCop} data-testid="ficha-total-por-pagar" />
          </p>
        </>
      )}
    </Card>
  );
}

/** Pagos y gastos recientes con un proveedor local; cada uno enlaza a Gastos, resaltado. */
export function PagosRecientes({ filas, total, cantidad }: { filas: readonly Gasto[]; total: number; cantidad: number }) {
  const navegar = useNavigate();
  const columnas: ColumnaTabla<Gasto>[] = [
    { id: 'fecha', encabezado: 'Fecha', ordenar: (g) => g.fecha, celda: (g) => <Fecha valor={g.fecha} /> },
    { id: 'concepto', encabezado: 'Concepto', truncar: true, celda: (g) => g.concepto },
    { id: 'categoria', encabezado: 'Categoría', celda: (g) => CATEGORIAS_LOCAL[g.categoria as keyof typeof CATEGORIAS_LOCAL] ?? g.categoria },
    {
      id: 'estado',
      encabezado: 'Estado',
      celda: (g) => <BadgeEstado estado={g.estadoPago === 'pagado' ? ESTADOS_POR_PAGAR.pagado : ESTADOS_POR_PAGAR.pendiente} tamano="sm" />,
    },
    { id: 'valor', encabezado: 'Valor', numerica: true, ordenar: (g) => g.valor, celda: (g) => <Dinero valor={g.valor} /> },
  ];
  return (
    <div>
      <Table
      etiqueta="Pagos recientes"
      data-testid="ficha-pagos"
      columnas={columnas}
      filas={filas}
      clave={(g) => g.id}
      sustantivo={['pago', 'pagos']}
      porPagina={0}
      alAbrir={(g) => navegar(rutas.gastos({ resaltar: g.id }))}
      vacio={
        <EmptyState
          tamano="tabla"
          icono={Receipt}
          titulo="Aún no hay pagos con este proveedor"
          texto="Cuando registres un gasto a su nombre, aquí verás cuánto le has pagado y cuándo."
          accion={<BotonEnlace to={rutas.gastos()}>Registrar un gasto</BotonEnlace>}
        />
      }
      />
      {cantidad > 0 && (
        <p className="mt-3 t-small text-muted" data-testid="ficha-pagos-resumen">
          Se muestran los {entero(filas.length)} más recientes de {plural(cantidad, 'pago')} · en total, <Dinero valor={total} className="font-bold text-ink" />
        </p>
      )}
    </div>
  );
}

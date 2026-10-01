import { Building2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ESTADOS_POR_PAGAR } from '@/config/estados';
import { rutas } from '@/app/rutas';
import { nit as formatoNit } from '@/lib/formato';
import { Badge, BadgeEstado, Button, Card, Dinero, EmptyState, EnlaceVerTodo, Fecha, cn, colorDeLocal } from '@/ui';
import type { VistaLocal } from '../selectores';

/** Los tres locales lado a lado: su arrendador, su arriendo y lo que cuestan servicios y mantenimiento. */

const FONDO_LOCAL: Record<number, string> = { 1: 'bg-chart-1', 2: 'bg-chart-2', 3: 'bg-chart-3', 4: 'bg-chart-4' };

function Fila({ etiqueta, children, destacada }: { etiqueta: string; children: ReactNode; destacada?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line-soft py-2.5 first:border-t-0">
      <dt className="t-small text-muted">{etiqueta}</dt>
      <dd className={cn('text-right t-body num', destacada && 'font-bold')}>{children}</dd>
    </div>
  );
}

export function VistaPorLocal({ vistas, localActivo, alRegistrar }: { vistas: readonly VistaLocal[]; localActivo: string; alRegistrar: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" data-testid="proveedores-por-local">
      {vistas.map((v) => {
        const arrendador = v.arrendadores[0] ?? null;
        const marca = FONDO_LOCAL[Number(colorDeLocal(v.local.orden))] ?? 'bg-chart-1';
        return (
          <Card key={v.local.id} padding="normal" className={cn(localActivo === v.local.id && 'border-ink')} data-testid={`proveedores-local-${v.local.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 t-eyebrow text-ink-2">
                  <span aria-hidden className={cn('size-2', marca)} />
                  Local
                </p>
                <h3 className="mt-1 t-h2 text-ink">{v.local.nombre}</h3>
              </div>
              {localActivo === v.local.id && <Badge tono="accent">Local activo</Badge>}
            </div>

            {arrendador ? (
              <div className="mt-5">
                <p className="t-eyebrow text-ink-2">Arrendador</p>
                <Link to={rutas.proveedor(arrendador.id)} className="mt-1 block t-h3 text-ink underline-offset-4 hover:underline">
                  {arrendador.nombreCorto}
                </Link>
                <p className="mt-0.5 t-small text-muted">
                  {arrendador.nit ? `NIT ${formatoNit(arrendador.nit)} · ` : ''}
                  {arrendador.condicionesPago}
                </p>
              </div>
            ) : (
              <EmptyState
                tamano="compacto"
                icono={Building2}
                titulo="Sin arrendador registrado"
                texto="Registra a quién le pagas el arriendo de este local para seguir lo que le debes."
                accion={
                  <Button variante="secondary" tamano="sm" onClick={alRegistrar}>
                    Registrar arrendador
                  </Button>
                }
              />
            )}

            <dl className="mt-5">
              <Fila etiqueta="Arriendo mensual" destacada>
                {v.canon === null ? '—' : <Dinero valor={v.canon} />}
              </Fila>
              <Fila etiqueta="Última cuenta">
                {v.estadoArriendo ? (
                  <span className="inline-flex flex-col items-end gap-1">
                    <BadgeEstado estado={ESTADOS_POR_PAGAR[v.estadoArriendo]} tamano="sm" />
                    {v.vencimientoArriendo && (
                      <span className="t-small text-muted">
                        Vence <Fecha valor={v.vencimientoArriendo} formato="corta" />
                      </span>
                    )}
                  </span>
                ) : (
                  '—'
                )}
              </Fila>
              <Fila etiqueta="Por pagar">
                <Dinero valor={v.saldoCop} />
              </Fila>
              <Fila etiqueta="Arriendo, últimos 12 meses">
                <Dinero valor={v.arriendo12m} corta />
              </Fila>
              <Fila etiqueta="Servicios, últimos 90 días">
                <Dinero valor={v.servicios90d} />
              </Fila>
              <Fila etiqueta="Mantenimiento, últimos 90 días">
                <Dinero valor={v.mantenimiento90d} />
              </Fila>
            </dl>
            {arrendador && (
              <div className="mt-4">
                <EnlaceVerTodo a={rutas.proveedor(arrendador.id)}>Ver ficha del arrendador</EnlaceVerTodo>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

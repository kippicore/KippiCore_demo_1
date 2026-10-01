import type { ReactNode } from 'react';
import { Badge, BotonEnlace, Button, Drawer, Dinero, ParesDatos } from '@/ui';
import { BotonDocumentoPdf } from '@/ui/conectados/BotonDocumentoPdf';
import type { Id, ParametrosNomina } from '@/dominio/tipos';
import { numero } from '@/lib/formato';
import { rutas } from '@/app/rutas';
import type { LineaConPersona } from '../selectores';
import { TEXTOS } from '../textos';
import { DetalleLinea } from './Desglose';
import { InsigniasPersona, NotaNomina } from './Piezas';
import { pilaPendiente } from './TablaLineas';

/**
 * Cajón con el detalle de una persona en una liquidación o en su vista previa: lo que entró (días, horas, ventas), el
 * desglose completo y, si es contratista sin planilla verificada, el aviso para verificarla.
 */
export function CajonLinea({
  fila,
  parametros,
  periodo,
  liquidacionId,
  alCerrar,
  alVerificarPila,
}: {
  fila: LineaConPersona | null;
  parametros: ParametrosNomina;
  periodo: string;
  /** Con el id de la liquidación aprobada se ofrece el desprendible. */
  liquidacionId?: Id;
  alCerrar: () => void;
  alVerificarPila?: (contratoId: Id) => void;
}) {
  const l = fila?.linea;
  const i = l?.insumos;
  return (
    <Drawer
      abierto={!!fila}
      alCambiar={(a) => !a && alCerrar()}
      eyebrow={periodo}
      titulo={fila?.nombre ?? ''}
      insignia={l && <InsigniasPersona tipo={l.tipo} tamano="md" />}
      ancho="lg"
      data-testid="personal-cajon-linea"
      pie={
        fila && (
          <>
            {fila.slug && (
              <BotonEnlace to={rutas.empleado(fila.slug)} variante="secondary" tamano="sm">
                Ver ficha
              </BotonEnlace>
            )}
            {liquidacionId && l && <BotonDocumentoPdf documento={{ tipo: 'desprendible', liquidacionId, empleadoId: l.empleadoId }} etiqueta="Descargar desprendible" variante="primary" />}
          </>
        )
      }
    >
      {fila && l && i && (
        <>
          <div className="grid grid-cols-3 gap-4 border-y border-line-soft py-4">
            <div>
              <p className="t-small text-muted">Neto a pagar</p>
              <p className="t-kpi-sm text-ink">
                <Dinero valor={l.netoAPagar} />
              </p>
            </div>
            <div>
              <p className="t-small text-muted">Costo para el negocio</p>
              <p className="t-kpi-sm text-ink">
                <Dinero valor={l.costoEmpleador} />
              </p>
            </div>
            <div>
              <p className="t-small text-muted">Local</p>
              <p className="t-body text-ink">{fila.localNombre}</p>
            </div>
          </div>

          {pilaPendiente(l) && (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-line border-l-2 border-l-warning bg-surface p-4" data-testid="personal-aviso-pila">
              <div className="min-w-0">
                <Badge tono="warning" tamano="sm">
                  {TEXTOS.nomina.pilaPendiente}
                </Badge>
                <p className="mt-2 max-w-[56ch] t-body text-ink-2">Falta confirmar que esta persona aportó a su seguridad social. Hasta entonces, su pago queda pendiente de soporte.</p>
              </div>
              {alVerificarPila && (
                <Button variante="secondary" tamano="sm" onClick={() => alVerificarPila(l.contratoId)} data-testid="personal-verificar-pila-cajon">
                  Verificar planilla
                </Button>
              )}
            </div>
          )}

          <div>
            <h3 className="mb-3 t-h3 text-ink">Qué entró en este periodo</h3>
            <ParesDatos
              columnas={3}
              pares={[
                ['Días laborados', `${i.diasLaborados} de ${i.diasPeriodo}`],
                ['Incapacidad', `${i.diasIncapacidad} días`],
                ['Vacaciones', `${i.diasVacaciones} días`],
                ['Horas con recargo nocturno', `${numero(i.horasRecargoNocturno, 1)} h`],
                ['Horas en domingo o festivo', `${numero(i.horasDominicalFestivo, 1)} h`],
                ['Horas extra', `${numero(i.horasExtraDiurnas + i.horasExtraNocturnas, 1)} h`],
                ...(i.ventasComisionables > 0 ? ([['Ventas sin IVA del mes', <Dinero key="v" valor={i.ventasComisionables} />]] as [string, ReactNode][]) : []),
              ]}
            />
            <p className="mt-3 t-small text-muted">Salen de la asistencia, las novedades y las ventas registradas.</p>
          </div>

          <DetalleLinea linea={l} parametros={parametros} />
          <NotaNomina />
        </>
      )}
    </Drawer>
  );
}

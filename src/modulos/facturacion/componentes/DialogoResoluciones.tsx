import { useSel, useHoy } from '@/estado';
import { entero, plural } from '@/lib/formato';
import { Badge, BarraProgreso, Button, Dialog, Fecha } from '@/ui';
import { selResoluciones } from '../selectores';
import { TEXTOS } from '../textos';

const NOMBRE_TIPO = {
  factura_electronica: 'Factura electrónica',
  documento_equivalente_pos: 'Documento equivalente POS',
} as const;

/** Las dos resoluciones ficticias con su rango, vigencia, consecutivos emitidos y lo que queda. */
export function DialogoResoluciones({ abierto, alCambiar }: { abierto: boolean; alCambiar: (a: boolean) => void }) {
  const hoy = useHoy();
  const usos = useSel(selResoluciones, { hoy });
  return (
    <Dialog
      abierto={abierto}
      alCambiar={alCambiar}
      eyebrow="Facturación electrónica"
      titulo={TEXTOS.lista.resolucionesTitulo}
      descripcion={TEXTOS.lista.resolucionesNota}
      ancho="md"
      data-testid="facturacion-dialogo-resoluciones"
      pie={
        <Button variante="secondary" onClick={() => alCambiar(false)}>
          Cerrar
        </Button>
      }
    >
      <ul className="flex flex-col gap-6">
        {usos.map((u) => (
          <li key={u.resolucion.id} className="border border-line p-5" data-resolucion={u.resolucion.tipo}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="t-eyebrow text-ink-2">{NOMBRE_TIPO[u.resolucion.tipo]}</p>
                <p className="mt-1 t-h3 num">Resolución {u.resolucion.numero}</p>
              </div>
              <Badge tono={u.vigente ? 'success' : 'danger'}>{u.vigente ? 'Vigente' : 'Vencida'}</Badge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 t-small">
              <div>
                <dt className="text-muted">Prefijo</dt>
                <dd className="num text-ink">{u.resolucion.prefijo}</dd>
              </div>
              <div>
                <dt className="text-muted">Rango autorizado</dt>
                <dd className="num text-ink">
                  {entero(u.resolucion.desde)} a {entero(u.resolucion.hasta)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Vigencia</dt>
                <dd className="text-ink">
                  <Fecha valor={u.resolucion.vigenteDesde} /> a <Fecha valor={u.resolucion.vigenteHasta} />
                </dd>
              </div>
              <div>
                <dt className="text-muted">Siguiente número</dt>
                <dd className="num text-ink">
                  {u.resolucion.prefijo}-{u.siguiente}
                </dd>
              </div>
            </dl>
            <BarraProgreso
              className="mt-4"
              valor={u.usado}
              etiqueta={`${plural(u.emitidos, 'documento')} emitidos`}
              detalle={`${entero(u.restantes)} disponibles`}
            />
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

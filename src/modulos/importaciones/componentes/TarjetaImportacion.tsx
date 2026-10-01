import { ArrowRightLeft } from 'lucide-react';
import { Link } from 'react-router';
import { rutas } from '@/app/rutas';
import { unidades } from '@/lib/formato';
import type { FilaImportacion } from '@/selectores';
import { BarraProgreso, Button, cn, Fecha, TarjetaTablero, TimelineCompacta } from '@/ui';
import { textoCargaCorta } from '../calculos';
import { InsigniaAforo, InsigniaRetraso, MontoOrigen } from './Montos';

/** Tarjeta de un pedido en el tablero por estado: número, fábrica, avance de los 13 estados, llegada y plata. */
export function TarjetaImportacion({
  fila,
  verPagos,
  resaltada,
  alCambiarEstado,
}: {
  fila: FilaImportacion;
  verPagos: boolean;
  resaltada?: boolean;
  alCambiarEstado?: (numero: string) => void;
}) {
  const imp = fila.importacion;
  const recibida = imp.estado === 'recibido_bodega';
  const pagado = fila.fobOrigen > 0 ? fila.pagadoOrigen / fila.fobOrigen : 0;
  return (
    <TarjetaTablero
      className={cn('space-y-3', resaltada && 'border-accent shadow-[inset_2px_0_0_var(--c-accent)]')}
    >
      <div>
        <Link
          to={rutas.importacion(imp.numero)}
          className="t-h3 font-extrabold num text-ink hover:underline hover:underline-offset-4"
          data-testid={`tarjeta-${imp.numero}`}
        >
          {imp.numero}
        </Link>
        <p className="t-small text-muted">
          {fila.proveedorNombre} · {unidades(fila.unidades)}
        </p>
        {(fila.retrasoDias > 0 || (imp.aforo && imp.aforo.tipo !== 'automatico')) && (
          <span className="mt-2 flex flex-wrap gap-1">
            <InsigniaRetraso dias={fila.retrasoDias} tamano="sm" />
            {imp.aforo && <InsigniaAforo tipo={imp.aforo.tipo} tamano="sm" />}
          </span>
        )}
      </div>
      <TimelineCompacta estado={imp.estado} />
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 t-small">
        <dt className="text-muted">{recibida ? 'Recibido' : 'Llega a bodega'}</dt>
        <dd className="text-right text-ink">
          <Fecha valor={fila.llegadaEstimada} />
        </dd>
        <dt className="text-muted">Carga</dt>
        <dd className="text-right text-ink">{textoCargaCorta(imp.carga)}</dd>
        {verPagos && (
          <>
            <dt className="text-muted">Fábrica</dt>
            <dd className="text-right text-ink">
              <MontoOrigen centavos={fila.fobOrigen} moneda={imp.moneda} corta />
            </dd>
          </>
        )}
      </dl>
      {verPagos && !recibida && fila.fobOrigen > 0 && (
        <BarraProgreso
          valor={pagado}
          etiqueta="Pagado"
          detalle={
            fila.saldoOrigen > 0 ? (
              <>
                Saldo <MontoOrigen centavos={fila.saldoOrigen} moneda={imp.moneda} />
              </>
            ) : (
              'Al día'
            )
          }
        />
      )}
      {alCambiarEstado && !recibida && (
        <div className="-mb-1 flex justify-end border-t border-line-soft pt-2">
          <Button
            variante="ghost"
            tamano="sm"
            icono={ArrowRightLeft}
            onClick={() => alCambiarEstado(imp.numero)}
          >
            Cambiar estado
          </Button>
        </div>
      )}
    </TarjetaTablero>
  );
}

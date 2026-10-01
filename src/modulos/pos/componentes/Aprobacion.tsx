import { BadgeCheck, Send } from 'lucide-react';
import { useState } from 'react';
import type { COP, Fraccion, Id, SolicitudAprobacion } from '@/dominio/tipos';
import { redondear } from '@/dominio/reglas/dinero';
import { ESTADOS_APROBACION } from '@/config/estados';
import { useAcciones, useEstadoDominio } from '@/estado';
import { porcentaje } from '@/lib/formato';
import { BadgeEstado, Button, Dialog, Dinero, Icono, Textarea, avisar } from '@/ui';
import type { SolicitudDescuento } from '../selectores';

/**
 * Descuento por encima del máximo del vendedor (15 %): el vendedor "pide aprobación" (`solicitarAprobacion`), ve el
 * estado de su solicitud y, cuando el dueño la aprueba (desde la app o el escritorio), se habilita confirmar. Una
 * aprobación se usa una sola vez y cubre hasta el porcentaje aprobado.
 */
export interface PropsAvisoDescuento {
  /** Solo el vendedor pide aprobación; el dueño descuenta sin límite. */
  esVendedor: boolean;
  fraccion: Fraccion;
  maximo: Fraccion;
  /** La solicitud ligada a esta venta (estado en vivo del dominio). */
  actual: SolicitudAprobacion | null;
  /** Solicitudes de descuento del vendedor que siguen vivas (para usar una aprobada). */
  vivas: readonly SolicitudDescuento[];
  alPedir: () => void;
  alUsar: (s: SolicitudDescuento) => void;
  alQuitarDescuento: () => void;
}

export function AvisoDescuento({ esVendedor, fraccion, maximo, actual, vivas, alPedir, alUsar, alQuitarDescuento }: PropsAvisoDescuento) {
  if (!esVendedor) return null;
  const supera = fraccion > maximo + 1e-9;
  const aprobada = actual?.estado === 'aprobada' && actual.datos.tipo === 'descuento' && actual.datos.porcentaje + 1e-9 >= fraccion && actual.usadaEnVentaId === null;
  const disponible = vivas.find((s) => s.estado === 'aprobada' && s.id !== actual?.id && (!supera || s.datos.porcentaje + 1e-9 >= fraccion));

  let cuerpo: React.ReactNode = null;
  if (supera && aprobada && actual?.datos.tipo === 'descuento') {
    cuerpo = (
      <>
        <BadgeEstado estado={ESTADOS_APROBACION.aprobada} tamano="sm" icono={BadgeCheck} />
        <span className="min-w-0 flex-1 t-small text-ink-2">El dueño aprobó hasta {porcentaje(actual.datos.porcentaje)} de descuento.</span>
      </>
    );
  } else if (supera && actual?.estado === 'pendiente') {
    cuerpo = (
      <>
        <BadgeEstado estado={ESTADOS_APROBACION.pendiente} tamano="sm" />
        <span className="min-w-0 flex-1 t-small text-ink-2">Esperando al dueño. Puedes seguir armando la venta; al aprobarse se habilita el cobro.</span>
      </>
    );
  } else if (supera && actual?.estado === 'rechazada') {
    cuerpo = (
      <>
        <BadgeEstado estado={ESTADOS_APROBACION.rechazada} tamano="sm" />
        <span className="min-w-0 flex-1 t-small text-ink-2">El dueño no aprobó {porcentaje(fraccion)}. Baja el descuento o pide otro.</span>
        <Button variante="ghost" tamano="sm" onClick={alQuitarDescuento}>
          Quitar descuento
        </Button>
        <Button variante="secondary" tamano="sm" onClick={alPedir}>
          Pedir de nuevo
        </Button>
      </>
    );
  } else if (supera && disponible) {
    cuerpo = (
      <>
        <span className="min-w-0 flex-1 t-small text-ink-2">
          Tienes una aprobación de {porcentaje(disponible.datos.porcentaje)} lista. Descuento de esta venta: {porcentaje(fraccion)}.
        </span>
        <Button variante="secondary" tamano="sm" onClick={() => alUsar(disponible)}>
          Usar aprobación
        </Button>
      </>
    );
  } else if (supera) {
    cuerpo = (
      <>
        <span className="min-w-0 flex-1 t-small text-ink-2" data-testid="pos-descuento-supera">
          Descuento de {porcentaje(fraccion)}: pasa del {porcentaje(maximo, 0)} que puedes dar.
        </span>
        <Button variante="secondary" tamano="sm" icono={Send} onClick={alPedir} data-testid="pos-pedir-aprobacion">
          Pedir aprobación
        </Button>
      </>
    );
  } else if (disponible) {
    const d = disponible.datos;
    cuerpo = (
      <>
        <BadgeEstado estado={ESTADOS_APROBACION.aprobada} tamano="sm" />
        <span className="min-w-0 flex-1 truncate t-small text-ink-2" title={disponible.resumen}>
          Aprobación lista: {porcentaje(d.porcentaje)} de descuento.
        </span>
        <Button variante="secondary" tamano="sm" onClick={() => alUsar(disponible)} data-testid="pos-usar-aprobacion">
          Usar
        </Button>
      </>
    );
  } else {
    const pendiente = vivas.find((s) => s.estado === 'pendiente');
    if (!pendiente) return null;
    cuerpo = (
      <>
        <BadgeEstado estado={ESTADOS_APROBACION.pendiente} tamano="sm" />
        <span className="min-w-0 flex-1 truncate t-small text-ink-2" title={pendiente.resumen}>
          Tu solicitud de {porcentaje(pendiente.datos.porcentaje)} espera al dueño.
        </span>
      </>
    );
  }
  return (
    <div role="status" className="flex flex-wrap items-center gap-2 border border-line bg-surface-2 px-3 py-1.5" data-testid="pos-aviso-descuento">
      {cuerpo}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Pedir aprobación
// ---------------------------------------------------------------------------------------------------------
export interface PropsDialogoAprobacion {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  localId: Id;
  vendedorId: Id;
  varianteIds: readonly Id[];
  valorLista: COP;
  fraccion: Fraccion;
  alEnviada: (solicitudId: Id) => void;
}

export function DialogoAprobacion({ abierto, alCambiar, localId, vendedorId, varianteIds, valorLista, fraccion, alEnviada }: PropsDialogoAprobacion) {
  const acciones = useAcciones();
  const e = useEstadoDominio();
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const valorFinal = redondear(valorLista * (1 - fraccion));
  const enviar = () => {
    if (!motivo.trim()) return setError('Escribe el motivo del descuento.');
    const r = acciones.solicitarAprobacion({
      datos: { tipo: 'descuento', localId, vendedorId, varianteIds: [...new Set(varianteIds)], valorLista, porcentaje: fraccion, valorFinal, motivo: motivo.trim() },
    });
    if (!r.ok) return setError(r.error.mensaje);
    const nueva = Object.keys(r.despues.solicitudes).find((id) => !(id in r.antes.solicitudes));
    avisar({ tipo: 'info', texto: 'Solicitud enviada al dueño', detalle: 'Le llega a su celular y a su escritorio. Aquí verás cuando la apruebe.' });
    setMotivo('');
    setError(null);
    alCambiar(false);
    if (nueva) alEnviada(nueva);
  };
  return (
    <Dialog
      abierto={abierto}
      alCambiar={alCambiar}
      eyebrow="Descuento"
      titulo="Pedir aprobación al dueño"
      descripcion={`Un descuento de ${porcentaje(fraccion)} pasa del máximo que puede dar un vendedor (${porcentaje(e.parametros.ventas.descuentoMaximoVendedor, 0)}).`}
      ancho="sm"
      data-testid="pos-dialogo-aprobacion"
      pie={
        <>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Cancelar
          </Button>
          <Button icono={Send} onClick={enviar} data-testid="pos-enviar-aprobacion">
            Enviar solicitud
          </Button>
        </>
      }
    >
      <dl className="mb-4 grid grid-cols-3 gap-3 border border-line bg-surface-2 p-3 text-center">
        <div>
          <dt className="t-eyebrow text-ink-2">Precio de lista</dt>
          <dd className="t-label num text-ink">
            <Dinero valor={valorLista} />
          </dd>
        </div>
        <div>
          <dt className="t-eyebrow text-ink-2">Descuento</dt>
          <dd className="t-label num text-ink">{porcentaje(fraccion)}</dd>
        </div>
        <div>
          <dt className="t-eyebrow text-ink-2">Quedaría en</dt>
          <dd className="t-label num text-ink">
            <Dinero valor={valorFinal} />
          </dd>
        </div>
      </dl>
      <Textarea etiqueta="Motivo" placeholder="Ej. Cliente frecuente, compra de varias prendas" value={motivo} onChange={(ev) => setMotivo(ev.target.value)} error={error ?? undefined} data-testid="pos-aprobacion-motivo" />
      <p className="mt-3 flex items-center gap-2 t-small text-muted">
        <Icono icono={Send} tamano={14} />
        El dueño puede aprobarla desde el escritorio o desde su celular.
      </p>
    </Dialog>
  );
}

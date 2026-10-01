import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Banknote, CircleAlert, FileText, PackageCheck, TrendingDown, UserRound, X } from 'lucide-react';
import { rutas } from '@/app/rutas';
import { MEDIOS_PAGO } from '@/config/negocio';
import type { Canal, MedioPago, ResultadoComando } from '@/dominio/tipos';
import { useAcciones, useSel } from '@/estado';
import { selSesionAbierta } from '@/selectores';
import {
  avisar,
  Button,
  BuscadorCliente,
  Dialog,
  Dinero,
  Fecha,
  GrupoRadio,
  Icono,
  InputNumero,
  Input,
  Select,
  Textarea,
} from '@/ui';
import { mediosReembolso, medioReembolsoSugerido, resumenAnulacion } from '../calculos';
import { selOpcionesFiltro, type ReciboVenta } from '../selectores';
import { CANALES, etiquetaMedio } from '../textos';

/** Mensaje de error de un comando (ya viene en español, listo para el usuario). */
function errorDe(r: ResultadoComando): { mensaje: string; campo?: string } | null {
  return r.ok ? null : { mensaje: r.error.mensaje, campo: r.error.campo };
}

export function AlertaError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 border border-danger bg-danger-soft px-3 py-2.5 t-body text-ink"
      data-testid="error-accion"
    >
      <Icono icono={CircleAlert} tamano={16} className="mt-0.5 shrink-0 text-danger" />
      <span>{children}</span>
    </p>
  );
}

function AvisoCaja({ localNombre }: { localNombre: string }) {
  return (
    <p
      className="flex items-start gap-2 border border-line-strong bg-surface-2 px-3 py-2.5 t-body text-ink"
      data-testid="aviso-caja-cerrada"
    >
      <Icono icono={Banknote} tamano={16} className="mt-0.5 shrink-0 text-warning" />
      <span>
        La caja de {localNombre} está cerrada. Para mover efectivo,{' '}
        <Link to={rutas.caja()} className="font-semibold underline underline-offset-4">
          ábrela primero
        </Link>
        , o elige otro medio.
      </span>
    </p>
  );
}

const opcionesMedio = (medios: readonly MedioPago[]) =>
  medios.map((m) => ({ valor: m, etiqueta: etiquetaMedio(m) }));

function Consecuencia({ icono, children }: { icono: typeof PackageCheck; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 t-body text-ink">
      <Icono icono={icono} tamano={16} className="mt-0.5 shrink-0 text-ink-2" />
      <span>{children}</span>
    </li>
  );
}

interface Base {
  recibo: ReciboVenta;
  abierto: boolean;
  alCerrar: () => void;
}

// ---------------------------------------------------------------------------------------------------------
// Anular (dueño) y pedir la anulación (vendedor)
// ---------------------------------------------------------------------------------------------------------
export function DialogoAnular({ recibo, abierto, alCerrar, soloPedir }: Base & { soloPedir?: boolean }) {
  const acciones = useAcciones();
  const { detalle } = recibo;
  const v = detalle.venta;
  const resumen = resumenAnulacion(v, detalle.devoluciones);
  const hayCliente = !!v.clienteId;
  const medios = mediosReembolso(v, hayCliente);
  const [motivo, setMotivo] = useState('');
  const [medio, setMedio] = useState<MedioPago>(medioReembolsoSugerido(v, hayCliente));
  const [error, setError] = useState<{ mensaje: string; campo?: string } | null>(null);
  const caja = useSel(selSesionAbierta, { localId: v.localId });
  const necesitaCaja = resumen.reembolsa > 0 && medio === 'efectivo' && !caja && !soloPedir;
  const localNombre = recibo.local?.nombre ?? 'el local';

  const cerrar = () => {
    setMotivo('');
    setError(null);
    alCerrar();
  };

  const confirmar = () => {
    if (!motivo.trim()) return setError({ mensaje: 'Escribe el motivo de la anulación.', campo: 'motivo' });
    const reembolso = resumen.reembolsa > 0 ? { medio, sesionCajaId: null } : null;
    if (soloPedir) {
      const r = acciones.solicitarAprobacion({
        datos: { tipo: 'anulacion', ventaId: v.id, motivo: motivo.trim(), reembolso },
      });
      const e = errorDe(r);
      if (e) return setError(e);
      avisar({
        tipo: 'exito',
        texto: `Enviamos la solicitud para anular ${v.numero}.`,
        detalle: 'El dueño la aprueba o la rechaza; la venta sigue vigente mientras tanto.',
      });
    } else {
      const r = acciones.anularVenta({ ventaId: v.id, motivo: motivo.trim(), reembolso });
      const e = errorDe(r);
      if (e) return setError(e);
      avisar({
        tipo: 'exito',
        texto: `Venta ${v.numero} anulada.`,
        accion: { texto: 'Ver en la lista', a: rutas.ventas({ resaltar: v.id }) },
      });
    }
    cerrar();
  };

  return (
    <Dialog
      abierto={abierto}
      alCambiar={(a) => (a ? undefined : cerrar())}
      eyebrow={`Venta ${v.numero}`}
      titulo={soloPedir ? 'Pedir la anulación' : `¿Anular la venta ${v.numero}?`}
      descripcion={
        soloPedir
          ? 'El dueño recibe tu solicitud y la aprueba o la rechaza. Mientras tanto la venta sigue vigente.'
          : 'Anular deja la venta sin efecto: no se puede deshacer. Para devolver solo algunas prendas usa «Cambio o devolución».'
      }
      ancho="md"
      confirmarAlCerrar={motivo.trim().length > 0}
      data-testid="dialogo-anular"
      pie={
        <>
          <Button variante="secondary" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            variante={soloPedir ? 'primary' : 'destructive'}
            onClick={confirmar}
            disabled={necesitaCaja}
            data-testid="confirmar-anular"
          >
            {soloPedir ? 'Enviar solicitud' : 'Anular venta'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <ul
          className="flex flex-col gap-2.5 border-y border-line-soft py-4"
          data-testid="consecuencias-anulacion"
        >
          {resumen.unidadesReingresan > 0 && (
            <Consecuencia icono={PackageCheck}>
              Vuelven <strong className="font-semibold num">{resumen.unidadesReingresan}</strong>{' '}
              {resumen.unidadesReingresan === 1 ? 'prenda' : 'prendas'} al inventario de {localNombre}.
            </Consecuencia>
          )}
          {resumen.reembolsa > 0 ? (
            <Consecuencia icono={Banknote}>
              Se devuelven{' '}
              <strong className="font-semibold">
                <Dinero valor={resumen.reembolsa} />
              </strong>{' '}
              al cliente.
            </Consecuencia>
          ) : (
            <Consecuencia icono={Banknote}>
              No hay plata por devolver: la venta no tiene pagos pendientes de reembolso.
            </Consecuencia>
          )}
          {resumen.conNotaCredito && (
            <Consecuencia icono={FileText}>
              Se emite una nota crédito por la factura electrónica de la venta.
            </Consecuencia>
          )}
          <Consecuencia icono={TrendingDown}>
            Se restan{' '}
            <strong className="font-semibold">
              <Dinero valor={v.total} />
            </strong>{' '}
            de las ventas del <Fecha valor={v.ts} />.
          </Consecuencia>
        </ul>

        {resumen.reembolsa > 0 && (
          <Select
            etiqueta="Cómo se devuelve la plata"
            enModal
            valor={medio}
            alCambiar={(m) => setMedio(m as MedioPago)}
            opciones={opcionesMedio(medios)}
            error={error?.campo === 'reembolso' ? error.mensaje : undefined}
            data-testid="anular-medio"
          />
        )}
        {necesitaCaja && <AvisoCaja localNombre={localNombre} />}
        <Textarea
          etiqueta="Motivo de la anulación"
          ayuda="Queda registrado con tu nombre y la fecha. Ejemplo: «El cliente se arrepintió, prendas sin uso»."
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value);
            if (error?.campo === 'motivo') setError(null);
          }}
          error={error?.campo === 'motivo' ? error.mensaje : undefined}
          data-testid="anular-motivo"
        />
        {error && error.campo !== 'motivo' && error.campo !== 'reembolso' && (
          <AlertaError>{error.mensaje}</AlertaError>
        )}
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Editar (solo dueño)
// ---------------------------------------------------------------------------------------------------------
const CANALES_EDITABLES = Object.keys(CANALES) as Canal[];
const MEDIOS_EDITABLES: MedioPago[] = [
  'efectivo',
  'datafono_debito',
  'datafono_credito',
  'nequi',
  'daviplata',
  'transferencia',
  'qr_bre_b',
  'credito_financiera',
];

export function DialogoEditar({ recibo, abierto, alCerrar }: Base) {
  const acciones = useAcciones();
  const opciones = useSel(selOpcionesFiltro);
  const v = recibo.detalle.venta;
  const clienteInicial = recibo.cliente ? `${recibo.cliente.nombres} ${recibo.cliente.apellidos}` : null;
  const [clienteId, setClienteId] = useState<string | null>(v.clienteId);
  const [clienteNombre, setClienteNombre] = useState<string | null>(clienteInicial);
  const [vendedorId, setVendedorId] = useState(v.vendedorId);
  const [canal, setCanal] = useState<Canal>(v.canal);
  const [nota, setNota] = useState(v.nota ?? '');
  const editables = v.pagos.filter(
    (p) => p.tipo !== 'reembolso' && p.medio !== 'bono_regalo' && p.medio !== 'saldo_a_favor',
  );
  const [medios, setMedios] = useState<Record<string, MedioPago>>(() =>
    Object.fromEntries(editables.map((p) => [p.id, p.medio])),
  );
  const [error, setError] = useState<{ mensaje: string; campo?: string } | null>(null);

  const cambios = {
    ...(clienteId !== v.clienteId ? { clienteId } : {}),
    ...(vendedorId !== v.vendedorId ? { vendedorId } : {}),
    ...(canal !== v.canal ? { canal } : {}),
    ...((nota.trim() || null) !== v.nota ? { nota: nota.trim() || null } : {}),
    ...(editables.some((p) => medios[p.id] !== p.medio)
      ? {
          mediosPago: editables
            .filter((p) => medios[p.id] !== p.medio)
            .map((p) => ({ pagoId: p.id, medio: medios[p.id] as MedioPago })),
        }
      : {}),
  };
  const hayCambios = Object.keys(cambios).length > 0;

  const cerrar = () => {
    setError(null);
    alCerrar();
  };
  const guardar = () => {
    const r = acciones.editarVenta({ ventaId: v.id, cambios });
    const e = errorDe(r);
    if (e) return setError(e);
    avisar({ tipo: 'exito', texto: `Guardamos los cambios de ${v.numero}.` });
    cerrar();
  };

  return (
    <Dialog
      abierto={abierto}
      alCambiar={(a) => (a ? undefined : cerrar())}
      eyebrow={`Venta ${v.numero}`}
      titulo="Editar la venta"
      descripcion="Corrige quién la hizo, a quién se le vendió o con qué medio se pagó. Los valores y las prendas no se editan: para eso se anula o se hace una devolución."
      ancho="md"
      confirmarAlCerrar={hayCambios}
      data-testid="dialogo-editar"
      pie={
        <>
          <Button variante="secondary" onClick={cerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={!hayCambios} data-testid="confirmar-editar">
            Guardar cambios
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <div className="col-span-2">
          <p className="mb-1.5 t-label text-ink">Cliente</p>
          {clienteId ? (
            <div className="flex h-10 items-center gap-2 border border-line-strong px-3 t-body text-ink">
              <Icono icono={UserRound} tamano={16} className="text-muted" />
              <span className="min-w-0 flex-1 truncate">{clienteNombre ?? 'Cliente'}</span>
              <button
                type="button"
                aria-label="Quitar el cliente"
                onClick={() => {
                  setClienteId(null);
                  setClienteNombre(null);
                }}
                className="inline-flex size-6 items-center justify-center hover:bg-surface-2"
              >
                <Icono icono={X} tamano={14} />
              </button>
            </div>
          ) : (
            <BuscadorCliente
              enModal
              alElegir={(c) => {
                setClienteId(c ? c.id : null);
                setClienteNombre(c ? `${c.nombres} ${c.apellidos}` : null);
              }}
            />
          )}
          {!clienteId && v.tipo !== 'contado' && (
            <p className="mt-1.5 t-small text-danger">Los separados y los créditos necesitan el cliente.</p>
          )}
        </div>
        <Select
          etiqueta="Vendedor"
          enModal
          valor={vendedorId}
          alCambiar={setVendedorId}
          opciones={opciones.vendedores.map((x) => ({ valor: x.id, etiqueta: x.nombre }))}
          data-testid="editar-vendedor"
        />
        <Select
          etiqueta="Canal"
          enModal
          valor={canal}
          alCambiar={(c) => setCanal(c as Canal)}
          opciones={CANALES_EDITABLES.map((c) => ({ valor: c, etiqueta: CANALES[c] }))}
          data-testid="editar-canal"
        />
        {editables.map((p, i) => (
          <Select
            key={p.id}
            etiqueta={editables.length > 1 ? `Medio del pago ${i + 1}` : 'Medio de pago'}
            enModal
            valor={medios[p.id] ?? p.medio}
            alCambiar={(m) => setMedios((a) => ({ ...a, [p.id]: m as MedioPago }))}
            opciones={MEDIOS_EDITABLES.concat(MEDIOS_EDITABLES.includes(p.medio) ? [] : [p.medio]).map(
              (m) => ({ valor: m, etiqueta: MEDIOS_PAGO[m].etiqueta }),
            )}
            ayuda={
              <>
                Pago de <Dinero valor={p.valor} />
              </>
            }
            error={error?.campo === 'mediosPago' ? error.mensaje : undefined}
            data-testid={`editar-medio-${i}`}
          />
        ))}
        <div className="col-span-2">
          <Textarea
            etiqueta="Nota"
            opcional
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className="[&_textarea]:min-h-20"
            data-testid="editar-nota"
          />
        </div>
        {error && error.campo !== 'mediosPago' && (
          <div className="col-span-2">
            <AlertaError>{error.mensaje}</AlertaError>
          </div>
        )}
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Abonar a un separado o a un crédito
// ---------------------------------------------------------------------------------------------------------
export function DialogoAbono({ recibo, abierto, alCerrar }: Base) {
  const acciones = useAcciones();
  const { detalle } = recibo;
  const v = detalle.venta;
  const saldo = detalle.saldo;
  const hayCliente = !!v.clienteId;
  const medios: MedioPago[] = [
    'efectivo',
    'nequi',
    'daviplata',
    'transferencia',
    'qr_bre_b',
    'datafono_debito',
    'datafono_credito',
    ...(hayCliente ? (['saldo_a_favor'] as MedioPago[]) : []),
  ];
  const [medio, setMedio] = useState<MedioPago>('efectivo');
  const [valor, setValor] = useState<number | null>(saldo);
  const [recibido, setRecibido] = useState<number | null>(null);
  const [referencia, setReferencia] = useState('');
  const [error, setError] = useState<{ mensaje: string; campo?: string } | null>(null);
  const caja = useSel(selSesionAbierta, { localId: v.localId });
  const sinCaja = medio === 'efectivo' && !caja;
  const localNombre = recibo.local?.nombre ?? 'el local';
  const queda = Math.max(0, saldo - (valor ?? 0));

  const cerrar = () => {
    setError(null);
    alCerrar();
  };
  const registrar = () => {
    if (!valor || valor <= 0) return setError({ mensaje: 'Escribe cuánto abona el cliente.', campo: 'pago' });
    const r = acciones.abonarVenta({
      ventaId: v.id,
      pago: {
        medio,
        valor,
        recibido: medio === 'efectivo' ? (recibido ?? valor) : null,
        referencia: referencia.trim() || null,
        sesionCajaId: null,
        bonoId: null,
      },
    });
    const e = errorDe(r);
    if (e) return setError(e);
    avisar({
      tipo: 'exito',
      texto:
        queda === 0
          ? `${v.numero} quedó pagada del todo.`
          : `Abono de ${etiquetaMedio(medio).toLowerCase()} registrado en ${v.numero}.`,
    });
    cerrar();
  };

  return (
    <Dialog
      abierto={abierto}
      alCambiar={(a) => (a ? undefined : cerrar())}
      eyebrow={`Venta ${v.numero}`}
      titulo="Registrar un abono"
      descripcion={
        v.tipo === 'separado'
          ? 'La mercancía sigue reservada hasta completar el pago.'
          : 'El abono baja el saldo que el cliente le debe al negocio.'
      }
      ancho="md"
      data-testid="dialogo-abono"
      pie={
        <>
          <Button variante="secondary" onClick={cerrar}>
            Cancelar
          </Button>
          <Button onClick={registrar} disabled={sinCaja} data-testid="confirmar-abono">
            Registrar abono
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <div className="col-span-2 flex items-baseline justify-between border-y border-line-soft py-3">
          <span className="t-eyebrow text-ink-2">Saldo pendiente</span>
          <span className="t-h2 num">
            <Dinero valor={saldo} />
          </span>
        </div>
        <Select
          etiqueta="Medio de pago"
          enModal
          valor={medio}
          alCambiar={(m) => setMedio(m as MedioPago)}
          opciones={opcionesMedio(medios)}
          data-testid="abono-medio"
        />
        <InputNumero
          etiqueta="Valor del abono, en pesos"
          prefijo="$"
          valor={valor}
          alCambiar={setValor}
          error={error?.campo === 'pago' ? error.mensaje : undefined}
          data-testid="abono-valor"
        />
        {medio === 'efectivo' ? (
          <InputNumero
            etiqueta="Efectivo recibido"
            opcional
            prefijo="$"
            valor={recibido}
            alCambiar={setRecibido}
            ayuda="Para calcular el cambio. Si lo dejas vacío, se toma el valor del abono."
          />
        ) : (
          <Input
            etiqueta="Referencia"
            opcional
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            ayuda="Número de aprobación o de la transferencia."
          />
        )}
        <div className="flex items-end pb-1 t-body text-ink-2">
          Después del abono quedan{' '}
          <strong className="ml-1 font-semibold text-ink num">
            <Dinero valor={queda} />
          </strong>
          .
        </div>
        {sinCaja && (
          <div className="col-span-2">
            <AvisoCaja localNombre={localNombre} />
          </div>
        )}
        {error && error.campo !== 'pago' && (
          <div className="col-span-2">
            <AlertaError>{error.mensaje}</AlertaError>
          </div>
        )}
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Cancelar un separado
// ---------------------------------------------------------------------------------------------------------
export function DialogoCancelarSeparado({ recibo, abierto, alCerrar }: Base) {
  const acciones = useAcciones();
  const { detalle } = recibo;
  const v = detalle.venta;
  const abonado = detalle.pagado;
  const hayCliente = !!v.clienteId;
  const medios = mediosReembolso(v, hayCliente).filter((m) => m !== 'saldo_a_favor');
  const [destino, setDestino] = useState<'reembolso' | 'saldo_favor'>('reembolso');
  const [medio, setMedio] = useState<MedioPago>(medioReembolsoSugerido(v, false));
  const [error, setError] = useState<{ mensaje: string; campo?: string } | null>(null);
  const caja = useSel(selSesionAbierta, { localId: v.localId });
  const sinCaja = destino === 'reembolso' && abonado > 0 && medio === 'efectivo' && !caja;
  const localNombre = recibo.local?.nombre ?? 'el local';
  const unidades = v.lineas.reduce((a, l) => a + l.cantidad, 0);

  const cerrar = () => {
    setError(null);
    alCerrar();
  };
  const confirmar = () => {
    const r = acciones.cancelarSeparado({
      ventaId: v.id,
      destinoAbonos: destino,
      reembolso: destino === 'reembolso' && abonado > 0 ? { medio, sesionCajaId: null } : null,
    });
    const e = errorDe(r);
    if (e) return setError(e);
    avisar({
      tipo: 'exito',
      texto: `Separado ${v.numero} cancelado.`,
      accion: { texto: 'Ver en la lista', a: rutas.ventas({ resaltar: v.id }) },
    });
    cerrar();
  };

  return (
    <Dialog
      abierto={abierto}
      alCambiar={(a) => (a ? undefined : cerrar())}
      eyebrow={`Separado ${v.numero}`}
      titulo={`¿Cancelar el separado ${v.numero}?`}
      descripcion="Las prendas vuelven a estar disponibles para la venta. Esta acción no se puede deshacer."
      ancho="md"
      data-testid="dialogo-cancelar-separado"
      pie={
        <>
          <Button variante="secondary" onClick={cerrar}>
            Volver
          </Button>
          <Button
            variante="destructive"
            onClick={confirmar}
            disabled={sinCaja}
            data-testid="confirmar-cancelar-separado"
          >
            Cancelar separado
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <ul className="flex flex-col gap-2.5 border-y border-line-soft py-4">
          <Consecuencia icono={PackageCheck}>
            Vuelven <strong className="font-semibold num">{unidades}</strong>{' '}
            {unidades === 1 ? 'prenda' : 'prendas'} al inventario de {localNombre}.
          </Consecuencia>
          <Consecuencia icono={TrendingDown}>
            La venta resta{' '}
            <strong className="font-semibold">
              <Dinero valor={v.total} />
            </strong>{' '}
            de las ventas en la fecha de hoy, no en la del separado.
          </Consecuencia>
        </ul>
        {abonado > 0 ? (
          <>
            <GrupoRadio
              etiqueta={
                <>
                  El cliente abonó <Dinero valor={abonado} />. ¿Qué pasa con esa plata?
                </>
              }
              tarjetas
              columnas={2}
              valor={destino}
              alCambiar={setDestino}
              opciones={[
                {
                  valor: 'reembolso',
                  etiqueta: 'Reembolsar',
                  descripcion: 'Se le devuelve la plata al cliente.',
                },
                {
                  valor: 'saldo_favor',
                  etiqueta: 'Saldo a favor',
                  descripcion: hayCliente
                    ? 'Queda en su cuenta para otra compra.'
                    : 'Necesita un cliente asociado.',
                  deshabilitado: !hayCliente,
                },
              ]}
            />
            {destino === 'reembolso' && (
              <Select
                etiqueta="Cómo se devuelve"
                enModal
                valor={medio}
                alCambiar={(m) => setMedio(m as MedioPago)}
                opciones={opcionesMedio(medios)}
                data-testid="cancelar-medio"
              />
            )}
          </>
        ) : (
          <p className="t-body text-muted">Este separado no tiene abonos: no hay plata por devolver.</p>
        )}
        {sinCaja && <AvisoCaja localNombre={localNombre} />}
        {error && <AlertaError>{error.mensaje}</AlertaError>}
      </div>
    </Dialog>
  );
}

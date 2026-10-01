import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Ban, Banknote, Minus, PackageX, Plus, ReceiptText, Undo2 } from 'lucide-react';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import type { CompensacionDevolucion, MedioPago, ResultadoComando } from '@/dominio/tipos';
import {
  useAcciones,
  useAhora,
  useEstadoDominio,
  useHoy,
  usePuede,
  useRolActivo,
  useSel,
  useUsuarioActivo,
} from '@/estado';
import { celular, entero, plural } from '@/lib/formato';
import { selSesionAbierta } from '@/selectores';
import {
  BotonEnlace,
  Button,
  Card,
  Checkbox,
  Dinero,
  EmptyState,
  EncabezadoPagina,
  Fecha,
  GrupoRadio,
  Icono,
  Input,
  MiniaturaPrenda,
  Select,
  Textarea,
} from '@/ui';
import {
  lineasDevolvibles,
  mediosReembolso,
  medioReembolsoSugerido,
  plazoDevolucion,
  previsualizarDevolucion,
  type SeleccionDevolucion,
} from '../calculos';
import { AlertaError } from '../componentes/Dialogos';
import {
  calcularEfectos,
  ResultadoDevolucion,
  type EfectosDevolucion,
} from '../componentes/ResultadoDevolucion';
import { selReciboVenta } from '../selectores';
import { etiquetaMedio, TEXTOS } from '../textos';

const MOTIVOS = [
  'La talla no fue la correcta',
  'Defecto de fábrica',
  'No le gustó',
  'Cambió de opinión',
  'Otro',
] as const;

interface ErrorCampo {
  mensaje: string;
  campo?: string;
}

function Paso({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-3 t-h3 text-ink">
      <span
        aria-hidden
        className="inline-flex size-6 items-center justify-center bg-ink t-micro num text-inverse"
      >
        {n}
      </span>
      {children}
    </h2>
  );
}

function Cantidad({
  valor,
  max,
  alCambiar,
  id,
}: {
  valor: number;
  max: number;
  alCambiar: (n: number) => void;
  id: string;
}) {
  const boton =
    'inline-flex size-8 items-center justify-center border border-line-strong text-ink hover:border-ink disabled:text-disabled disabled:hover:border-line-strong';
  return (
    <div
      className="inline-flex items-center"
      role="group"
      aria-label="Cantidad a devolver"
      data-testid={`cantidad-${id}`}
    >
      <button
        type="button"
        aria-label="Devolver una menos"
        disabled={valor <= 0}
        onClick={() => alCambiar(valor - 1)}
        className={boton}
        data-testid={`menos-${id}`}
      >
        <Icono icono={Minus} tamano={14} />
      </button>
      <span
        className="inline-flex h-8 min-w-10 items-center justify-center border-y border-line-strong px-2 t-body num"
        data-testid={`valor-${id}`}
      >
        {valor}
      </span>
      <button
        type="button"
        aria-label="Devolver una más"
        disabled={valor >= max}
        onClick={() => alCambiar(valor + 1)}
        className={boton}
        data-testid={`mas-${id}`}
      >
        <Icono icono={Plus} tamano={14} />
      </button>
    </div>
  );
}

/** /panel/ventas/:ventaId/devolucion — qué prendas vuelven, cómo se compensa y qué cambia (PRD 7.2). */
export default function Devolucion() {
  const { ventaId } = useParamsRuta('devolucion');
  const recibo = useSel(selReciboVenta, { ventaId });
  const estado = useEstadoDominio();
  const rol = useRolActivo();
  const { empleado } = useUsuarioActivo();
  const puede = usePuede();
  const acciones = useAcciones();
  const hoy = useHoy();
  const ahora = useAhora();

  const venta = recibo?.detalle.venta ?? null;
  const caja = useSel(selSesionAbierta, { localId: venta?.localId ?? '__ninguno__' });
  const disponibles = useMemo(
    () => (recibo ? lineasDevolvibles(recibo.detalle.venta, recibo.detalle.devoluciones) : []),
    [recibo],
  );

  const [seleccion, setSeleccion] = useState<SeleccionDevolucion>({});
  const [compensacion, setCompensacion] = useState<CompensacionDevolucion>('reembolso');
  const [medio, setMedio] = useState<MedioPago | null>(null);
  const [motivoBase, setMotivoBase] = useState<string>(MOTIVOS[0]);
  const [detalleMotivo, setDetalleMotivo] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [tel, setTel] = useState('');
  const [correo, setCorreo] = useState('');
  const [autoriza, setAutoriza] = useState(false);
  const [error, setError] = useState<ErrorCampo | null>(null);
  const [efectos, setEfectos] = useState<EfectosDevolucion | null>(null);

  const migasBase = [
    ...(rol === 'vendedor' ? [] : [{ texto: 'Inicio', a: rutas.inicio() }]),
    { texto: 'Ventas', a: rutas.ventas() },
  ];

  if (!recibo || !venta) {
    return (
      <div data-testid="pagina-devolucion">
        <EncabezadoPagina
          migas={[...migasBase, { texto: 'Cambio o devolución' }]}
          titulo={TEXTOS.devolucion.titulo}
        />
        <div className="mt-8 border border-line bg-surface">
          <EmptyState
            icono={ReceiptText}
            titulo={TEXTOS.detalle.noExisteTitulo}
            texto={TEXTOS.detalle.noExisteTexto}
            accion={<BotonEnlace to={rutas.ventas()}>{TEXTOS.detalle.volver}</BotonEnlace>}
          />
        </div>
      </div>
    );
  }

  const { detalle } = recibo;
  const diasMax = estado.parametros.ventas.diasMaximoDevolucion;
  const plazo = plazoDevolucion(venta.ts, hoy, diasMax);
  const hayCliente = !!venta.clienteId;
  const mediosDisponibles = mediosReembolso(venta, hayCliente);
  const medioActual: MedioPago =
    medio && mediosDisponibles.includes(medio) ? medio : medioReembolsoSugerido(venta, hayCliente);
  const vista = previsualizarDevolucion(venta, detalle.devoluciones, seleccion);
  const hayDisponibles = disponibles.some((l) => l.disponible > 0);

  const encabezado = (
    <EncabezadoPagina
      migas={[
        ...migasBase,
        { texto: venta.numero, a: rutas.venta(venta.id) },
        { texto: 'Cambio o devolución' },
      ]}
      eyebrow={`Venta ${venta.numero}`}
      titulo={TEXTOS.devolucion.titulo}
      subtitulo={
        <>
          Vendida el <Fecha valor={venta.ts} formato="fecha" /> en {recibo.local?.nombre ?? 'el local'}
          {recibo.cliente
            ? ` a ${recibo.cliente.nombres} ${recibo.cliente.apellidos}`
            : ' a un consumidor final'}
          {!plazo.vencido && ` · quedan ${plural(plazo.restantes, 'día')} del plazo de devolución`}
        </>
      }
    />
  );

  const bloqueo: string | null =
    rol === 'vendedor' && venta.vendedorId !== empleado?.id
      ? 'Como vendedor solo registras devoluciones de las ventas que hiciste tú.'
      : !puede('devolucion.registrar')
        ? 'Tu rol no puede registrar devoluciones.'
        : detalle.estado === 'anulada'
          ? TEXTOS.devolucion.anulada
          : detalle.estado === 'separado'
            ? TEXTOS.devolucion.separadoActivo
            : !hayDisponibles
              ? TEXTOS.devolucion.sinDisponibles
              : plazo.vencido
                ? TEXTOS.devolucion.plazoVencido(plazo.dias, diasMax)
                : null;

  if (efectos) {
    return (
      <div data-testid="pagina-devolucion">
        {encabezado}
        <div className="mt-8">
          <ResultadoDevolucion efectos={efectos} />
        </div>
      </div>
    );
  }

  if (bloqueo) {
    return (
      <div data-testid="pagina-devolucion">
        {encabezado}
        <div className="mt-8 border border-line bg-surface" data-testid="devolucion-bloqueada">
          <EmptyState
            icono={Ban}
            titulo="Esta venta no admite devoluciones"
            texto={bloqueo}
            accion={<BotonEnlace to={rutas.venta(venta.id)}>Ver la venta</BotonEnlace>}
          />
        </div>
      </div>
    );
  }

  const alcanzaReembolso = detalle.pagado >= vista.valorTotal;
  const sinCaja = compensacion === 'reembolso' && medioActual === 'efectivo' && !caja;
  const motivo = [motivoBase === 'Otro' ? '' : motivoBase, detalleMotivo.trim()].filter(Boolean).join(' · ');
  const necesitaClienteNuevo = !hayCliente && compensacion !== 'reembolso';
  const errorDe = (campo: string) => (error?.campo === campo ? error.mensaje : undefined);

  const cambiarCantidad = (lineaId: string, max: number, n: number) => {
    setError(null);
    setSeleccion((s) => ({
      ...s,
      [lineaId]: { cantidad: Math.max(0, Math.min(max, n)), reingresa: s[lineaId]?.reingresa ?? true },
    }));
  };
  const devolverTodo = () => {
    setError(null);
    setSeleccion(
      Object.fromEntries(
        disponibles
          .filter((l) => l.disponible > 0)
          .map((l) => [
            l.linea.id,
            { cantidad: l.disponible, reingresa: seleccion[l.linea.id]?.reingresa ?? true },
          ]),
      ),
    );
  };

  const registrar = () => {
    if (vista.unidades === 0)
      return setError({ mensaje: 'Elige al menos una prenda para devolver.', campo: 'lineas' });
    if (!motivo) return setError({ mensaje: 'Escribe el motivo de la devolución.', campo: 'motivo' });
    if (compensacion === 'reembolso' && !alcanzaReembolso)
      return setError({
        mensaje:
          'La venta no tiene pagos suficientes para reembolsar; deja la diferencia como saldo a favor.',
        campo: 'compensacion',
      });
    if (necesitaClienteNuevo) {
      if (!nombres.trim()) return setError({ mensaje: 'Escribe el nombre del cliente.', campo: 'nombres' });
      if (!apellidos.trim())
        return setError({ mensaje: 'Escribe el apellido del cliente.', campo: 'apellidos' });
      if (!/^3\d{9}$/.test(tel))
        return setError({ mensaje: 'Escribe un celular de 10 dígitos que empiece por 3.', campo: 'celular' });
      if (!autoriza)
        return setError({ mensaje: 'Marca la autorización de tratamiento de datos.', campo: 'autorizacion' });
    }
    const r: ResultadoComando = acciones.registrarDevolucion({
      ventaId: venta.id,
      lineas: vista.lineas.map((l) => ({ lineaId: l.lineaId, cantidad: l.cantidad, reingresa: l.reingresa })),
      motivo,
      compensacion,
      reembolso: compensacion === 'reembolso' ? { medio: medioActual, sesionCajaId: null } : null,
      clienteNuevo: necesitaClienteNuevo
        ? {
            nombres: nombres.trim(),
            apellidos: apellidos.trim(),
            documento: null,
            celular: tel,
            correo: correo.trim() || null,
            cumpleanos: null,
            anioNacimiento: null,
            barrio: null,
            canalPreferido: 'whatsapp',
            tratamiento: 'tu',
            autorizacionDatos: { aceptada: autoriza, fecha: ahora, canal: 'pos' },
            tallasDeclaradas: {},
            canalAlta: 'pos',
            localRegistroId: venta.localId,
            registradoPorId: empleado?.id ?? null,
          }
        : null,
    });
    if (!r.ok) return setError({ mensaje: r.error.mensaje, campo: r.error.campo });
    setError(null);
    setEfectos(calcularEfectos(r.antes, r.despues, null, hoy));
  };

  return (
    <div data-testid="pagina-devolucion">
      {encabezado}
      <div className="mt-8 grid grid-cols-1 items-start gap-8 desk:grid-cols-12">
        <section aria-label="Prendas" className="desk:col-span-7">
          <Card padding="normal">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Paso n={1}>¿Qué prendas vuelven?</Paso>
              <Button
                variante="ghost"
                tamano="sm"
                onClick={devolverTodo}
                data-testid="devolver-todo"
                className="-mt-4"
              >
                Devolver todo lo disponible
              </Button>
            </div>
            <ul
              className="divide-y divide-line-soft border-y border-line-soft"
              data-testid="devolucion-lineas"
            >
              {disponibles.map((d, i) => {
                const lin = recibo.lineas[i];
                const sel = seleccion[d.linea.id];
                const v = vista.lineas.find((x) => x.lineaId === d.linea.id);
                const agotada = d.disponible === 0;
                return (
                  <li
                    key={d.linea.id}
                    className="flex flex-wrap items-center gap-x-5 gap-y-3 py-4"
                    data-testid="devolucion-linea"
                    data-agotada={agotada || undefined}
                  >
                    {lin?.tipoPrenda ? (
                      <MiniaturaPrenda
                        tipo={lin.tipoPrenda}
                        color={lin.colorHex}
                        patron={lin.patron}
                        tamano="buscador"
                      />
                    ) : (
                      <span className="block w-8" />
                    )}
                    <div className="min-w-[200px] flex-1">
                      <p className={`t-body font-semibold ${agotada ? 'text-subtle' : 'text-ink'}`}>
                        {lin?.nombreProducto ?? d.linea.descripcion}
                      </p>
                      <p className="t-small text-muted num">
                        {lin?.referencia} · {lin?.colorNombre} · Talla {lin?.talla}
                      </p>
                      <p className="t-small text-ink-2">
                        Compró {d.linea.cantidad}
                        {d.devuelta > 0 ? ` · ya devolvió ${d.devuelta}` : ''}
                        {agotada ? ' · sin prendas por devolver' : ''}
                      </p>
                    </div>
                    {!agotada && (
                      <div className="flex flex-col items-end gap-2">
                        <Cantidad
                          id={`l${i}`}
                          valor={sel?.cantidad ?? 0}
                          max={d.disponible}
                          alCambiar={(n) => cambiarCantidad(d.linea.id, d.disponible, n)}
                        />
                        <Checkbox
                          etiqueta="Vuelve al inventario"
                          marcado={sel?.reingresa ?? true}
                          alCambiar={(r) =>
                            setSeleccion((s) => ({
                              ...s,
                              [d.linea.id]: { cantidad: s[d.linea.id]?.cantidad ?? 0, reingresa: r },
                            }))
                          }
                          deshabilitado={(sel?.cantidad ?? 0) === 0}
                        />
                      </div>
                    )}
                    <div className="w-[112px] text-right t-body font-semibold num">
                      {v ? <Dinero valor={v.valor} /> : <span className="font-normal text-subtle">—</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
            {errorDe('lineas') && <p className="mt-3 t-small text-danger">{errorDe('lineas')}</p>}
            <p className="mt-4 flex items-start gap-2 t-small text-muted">
              <Icono icono={PackageX} tamano={14} className="mt-0.5 shrink-0" />
              <span>
                Si una prenda quedó dañada o usada, desmarca «Vuelve al inventario»: se devuelve la plata,
                pero la prenda no se vuelve a vender.
              </span>
            </p>
          </Card>
        </section>

        <aside aria-label="Compensación" className="desk:sticky desk:top-(--sticky-top) desk:col-span-5">
          <Card padding="normal">
            <Paso n={2}>¿Cómo se compensa?</Paso>
            <GrupoRadio
              tarjetas
              columnas={1}
              valor={compensacion}
              alCambiar={(c) => {
                setCompensacion(c);
                setError(null);
              }}
              opciones={[
                {
                  valor: 'reembolso',
                  etiqueta: 'Reembolso',
                  descripcion: alcanzaReembolso ? (
                    'Se le devuelve la plata al cliente.'
                  ) : (
                    <>
                      El cliente ha pagado <Dinero valor={detalle.pagado} />: no alcanza para reembolsar todo.
                    </>
                  ),
                  deshabilitado: !alcanzaReembolso && vista.unidades > 0,
                },
                {
                  valor: 'saldo_favor',
                  etiqueta: 'Saldo a favor',
                  descripcion: 'Queda en la cuenta del cliente para otra compra.',
                },
                {
                  valor: 'cambio',
                  etiqueta: 'Cambio por otra prenda',
                  descripcion: 'Queda como saldo a favor y abrimos el punto de venta para elegir la nueva.',
                },
              ]}
            />
            {errorDe('compensacion') && <p className="mt-2 t-small text-danger">{errorDe('compensacion')}</p>}

            {compensacion === 'reembolso' && (
              <div className="mt-5">
                <Select
                  etiqueta="Cómo se devuelve la plata"
                  valor={medioActual}
                  alCambiar={(m) => setMedio(m as MedioPago)}
                  opciones={mediosDisponibles.map((m) => ({ valor: m, etiqueta: etiquetaMedio(m) }))}
                  error={errorDe('reembolso')}
                  data-testid="devolucion-medio"
                />
                {sinCaja && (
                  <p
                    className="mt-2 flex items-start gap-2 t-small text-ink"
                    data-testid="aviso-caja-cerrada"
                  >
                    <Icono icono={Banknote} tamano={14} className="mt-0.5 shrink-0 text-warning" />
                    <span>
                      La caja de {recibo.local?.nombre ?? 'el local'} está cerrada.{' '}
                      <Link to={rutas.caja()} className="font-semibold underline underline-offset-4">
                        Ábrela
                      </Link>{' '}
                      o elige otro medio.
                    </span>
                  </p>
                )}
              </div>
            )}

            {necesitaClienteNuevo && (
              <fieldset className="mt-5 border-t border-line-soft pt-5" data-testid="cliente-nuevo">
                <legend className="mb-3 t-label font-bold text-ink">¿A quién se le deja el saldo?</legend>
                <p className="mb-3 t-small text-muted">
                  La venta fue a un consumidor final. Para dejarle saldo a favor necesitamos registrar al
                  cliente: es rápido.
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <Input
                    etiqueta="Nombres"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    error={errorDe('nombres')}
                    autoComplete="off"
                    data-testid="cliente-nombres"
                  />
                  <Input
                    etiqueta="Apellidos"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    error={errorDe('apellidos')}
                    autoComplete="off"
                    data-testid="cliente-apellidos"
                  />
                  <Input
                    etiqueta="Celular"
                    inputMode="numeric"
                    value={tel}
                    onChange={(e) => setTel(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    ayuda={tel.length === 10 ? celular(tel) : undefined}
                    error={errorDe('celular')}
                    data-testid="cliente-celular"
                  />
                  <Input
                    etiqueta="Correo"
                    opcional
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    error={errorDe('correo')}
                    autoComplete="off"
                  />
                  <div className="col-span-2">
                    <Checkbox
                      etiqueta="El cliente autoriza el tratamiento de sus datos personales"
                      marcado={autoriza}
                      alCambiar={setAutoriza}
                    />
                    {errorDe('autorizacion') && (
                      <p className="mt-1 t-small text-danger">{errorDe('autorizacion')}</p>
                    )}
                  </div>
                </div>
              </fieldset>
            )}

            <div className="mt-5 flex flex-col gap-4 border-t border-line-soft pt-5">
              <Select
                etiqueta="Motivo"
                valor={motivoBase}
                alCambiar={(m) => setMotivoBase(m)}
                opciones={MOTIVOS.map((m) => ({ valor: m, etiqueta: m }))}
                data-testid="devolucion-motivo"
              />
              <Textarea
                etiqueta={motivoBase === 'Otro' ? 'Cuéntanos el motivo' : 'Detalle'}
                opcional={motivoBase !== 'Otro'}
                value={detalleMotivo}
                onChange={(e) => {
                  setDetalleMotivo(e.target.value);
                  if (error?.campo === 'motivo') setError(null);
                }}
                error={errorDe('motivo')}
                className="[&_textarea]:min-h-16"
                data-testid="devolucion-detalle"
              />
            </div>

            <dl
              className="mt-5 flex flex-col gap-1.5 border-t border-ink pt-4"
              data-testid="devolucion-resumen"
            >
              <div className="flex items-baseline justify-between gap-4 t-body">
                <dt className="text-ink-2">Prendas que vuelven</dt>
                <dd className="num" data-testid="resumen-unidades">
                  {entero(vista.unidades)}
                  {vista.unidades > 0 && vista.unidadesReingresan !== vista.unidades
                    ? ` (${entero(vista.unidadesReingresan)} al inventario)`
                    : ''}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 t-small text-muted">
                <dt>IVA incluido</dt>
                <dd className="num">
                  <Dinero valor={vista.iva} />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 t-h3">
                <dt>{compensacion === 'reembolso' ? 'Se devuelve' : 'Saldo a favor'}</dt>
                <dd className="num" data-testid="resumen-valor" data-valor={vista.valorTotal}>
                  <Dinero valor={vista.valorTotal} />
                </dd>
              </div>
              {venta.facturaId && (
                <p className="mt-1 t-small text-muted">
                  La venta tiene factura electrónica: se emite una nota crédito por este valor.
                </p>
              )}
            </dl>

            {error &&
              ![
                'lineas',
                'motivo',
                'compensacion',
                'reembolso',
                'nombres',
                'apellidos',
                'celular',
                'autorizacion',
                'correo',
              ].includes(error.campo ?? '') && (
                <div className="mt-4">
                  <AlertaError>{error.mensaje}</AlertaError>
                </div>
              )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <BotonEnlace to={rutas.venta(venta.id)} variante="secondary">
                Cancelar
              </BotonEnlace>
              <Button icono={Undo2} onClick={registrar} disabled={sinCaja} data-testid="registrar-devolucion">
                {compensacion === 'cambio' ? 'Registrar el cambio' : 'Registrar devolución'}
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

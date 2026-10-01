import {
  ArrowRightLeft,
  BellRing,
  ExternalLink,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  Ship,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { propagarHoy, PESTANAS_IMPORTACION, rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import type { Importacion as TImportacion } from '@/dominio/tipos';
import { ETIQUETAS_ESTADO_IMPORTACION } from '@/config/aduanas';
import { MATRIZ_AVISOS } from '@/config/textos/mensajes';
import { siguienteEstado } from '@/dominio/reglas/importaciones';
import { diferenciaDias } from '@/dominio/reglas/fechas';
import { copDeCentavos } from '@/dominio/reglas/dinero';
import {
  overrideHoy,
  useAcciones,
  useDinero,
  useHoy,
  useMarca,
  usePuede,
  useRolActivo,
  useSel,
  useSesion,
} from '@/estado';
import { entero, numero as formatoNumero, plural, porcentaje } from '@/lib/formato';
import { selImportaciones, selImportacionPorNumero, selTasaVigente, selAvisosEstado } from '@/selectores';
import {
  avisar,
  Button,
  BotonEnlace,
  Card,
  ConfirmarEliminacion,
  Dialog,
  EmptyState,
  EncabezadoPagina,
  Fecha,
  ItemMenu,
  Kpi,
  Menu,
  ParesDatos,
  Pista,
  PestanasEnlace,
  ResaltarFila,
  SeparadorMenu,
} from '@/ui';
import { posicionRuta, textoCarga } from '../calculos';
import { CalculadoraCosto } from '../componentes/CalculadoraCosto';
import { CambiarEstadoDialog } from '../componentes/CambiarEstado';
import { FormularioPedido } from '../componentes/FormularioPedido';
import { LineaTiempoImportacion } from '../componentes/LineaTiempoImportacion';
import { InsigniaAforo, InsigniaEstado, InsigniaRetraso, MontoOrigen } from '../componentes/Montos';
import { PanelNotificar } from '../componentes/PanelNotificar';
import { RutaChina } from '../componentes/RutaChina';
import { TabContactos } from '../componentes/TabContactos';
import { TabDocumentos } from '../componentes/TabDocumentos';
import { TabLineas } from '../componentes/TabLineas';
import { TabMensajes } from '../componentes/TabMensajes';
import { TabPagos } from '../componentes/TabPagos';
import { selAvisosPendientes, selMensajesImportacion } from '../selectores';

/** Ficha de un pedido: dónde viene, línea de tiempo, notificaciones, líneas, costo aterrizado, pagos, documentos y cadena. */
export default function ImportacionPagina() {
  const { numero, pestana } = useParamsRuta('importacionPestana');
  const imp = useSel(selImportacionPorNumero, { numero });
  const rol = useRolActivo();

  if (!imp)
    return (
      <div className="pb-16">
        <EncabezadoPagina
          migas={[
            { texto: 'Inicio', a: rutas.inicio() },
            { texto: 'Importaciones', a: rutas.importaciones() },
            { texto: numero },
          ]}
          titulo="No encontramos este pedido"
        />
        <div className="mt-10 border border-line bg-surface">
          <EmptyState
            icono={Ship}
            titulo={`No hay ningún pedido ${numero}`}
            texto="Puede que se haya eliminado o que el número esté mal escrito. Revisa la lista de importaciones."
            accion={<BotonEnlace to={rutas.importaciones()}>Ir a Importaciones</BotonEnlace>}
          />
        </div>
      </div>
    );
  const valida = (PESTANAS_IMPORTACION as readonly string[]).includes(pestana);
  if (pestana && (!valida || rol === 'bodega')) return <Navigate to={rutas.importacion(numero)} replace />;
  return <Ficha imp={imp} pestana={valida ? pestana : ''} />;
}

/** "A, B y C" (sin coma antes de la "y"). */
function unirConY(lista: readonly string[]): string {
  return lista.length <= 1 ? (lista[0] ?? '') : `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1] ?? ''}`;
}

function Ficha({ imp, pestana }: { imp: TImportacion; pestana: string }) {
  const hoy = useHoy();
  const navegar = useNavigate();
  const rol = useRolActivo();
  const puede = usePuede();
  const dinero = useDinero();
  const acciones = useAcciones();
  const marca = useMarca().nombre;
  const esDueno = rol === 'dueno';
  const verPagos = puede('ver.pagos');
  const fila =
    useSel(selImportaciones, { hoy, incluirRecibidas: true }).find((f) => f.importacion.id === imp.id) ??
    null;
  const tasa = useSel(selTasaVigente, { moneda: imp.moneda, fecha: hoy });
  const mensajes = useSel(selMensajesImportacion, { importacionId: imp.id });
  const pendientes = useSel(selAvisosPendientes, { importacionId: imp.id });
  const leidas = useSesion((s) => s.notificacionesLeidas);
  const marcarLeida = useSesion((s) => s.marcarNotificacionLeida);

  const [cambiando, setCambiando] = useState(false);
  const [notificar, setNotificar] = useState<{ estado: TImportacion['estado']; fecha: string } | null>(null);
  const [editando, setEditando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const siguiente = siguienteEstado(imp.estado);
  const avisosSiguiente = useSel(selAvisosEstado, {
    importacionId: imp.id,
    estado: siguiente ?? imp.estado,
    marca,
    fecha: hoy,
  });
  const retraso = fila?.retrasoDias ?? 0;
  const recibido = imp.estado === 'recibido_bodega';
  const llegada = fila?.llegadaEstimada ?? imp.hitos.recibido_bodega.estimada;
  const posicion = posicionRuta(imp, hoy);
  const diasLlegada = diferenciaDias(hoy, llegada);
  const puedeCambiar = esDueno && !recibido && puede('importacion.cambiarEstado');
  const puedeRecibir =
    (esDueno || rol === 'bodega') &&
    !recibido &&
    ['nacionalizado', 'en_transporte_bogota'].includes(imp.estado);
  const pagado = fila && fila.fobOrigen > 0 ? fila.pagadoOrigen / fila.fobOrigen : 0;
  const hayPendiente = pendientes && !leidas.includes(pendientes.notificacion.id);

  const verComoAgente = () =>
    window.open(propagarHoy(rutas.seguimiento(imp.numero), overrideHoy()), '_blank', 'noopener');
  const eliminar = () => {
    const r = acciones.eliminarImportacion({ importacionId: imp.id, motivo: null });
    setEliminando(false);
    if (!r.ok) {
      avisar({ tipo: 'error', texto: r.error.mensaje });
      return;
    }
    avisar({ tipo: 'exito', texto: `Pedido ${imp.numero} eliminado` });
    navegar(rutas.importaciones());
  };

  const pestanas = esDueno ? (
    <PestanasEnlace
      etiqueta="Secciones del pedido"
      pestanas={[
        { a: rutas.importacion(imp.numero), etiqueta: 'Resumen', fin: true },
        {
          a: rutas.importacionPestana(imp.numero, 'lineas'),
          etiqueta: 'Líneas',
          contador: imp.lineas.length,
        },
        { a: rutas.importacionPestana(imp.numero, 'costo-aterrizado'), etiqueta: 'Costo aterrizado' },
        { a: rutas.importacionPestana(imp.numero, 'pagos'), etiqueta: 'Pagos' },
        {
          a: rutas.importacionPestana(imp.numero, 'documentos'),
          etiqueta: 'Documentos',
          contador: imp.documentos.length,
        },
        {
          a: rutas.importacionPestana(imp.numero, 'contactos'),
          etiqueta: 'Contactos',
          contador: imp.contactoIds.length,
        },
        {
          a: rutas.importacionPestana(imp.numero, 'mensajes'),
          etiqueta: 'Mensajes',
          contador: mensajes.length,
        },
      ]}
    />
  ) : undefined;

  const acciones_ = (
    <>
      {esDueno && (
        <Menu
          etiqueta="Más acciones del pedido"
          disparador={
            <Button variante="secondary" icono={MoreHorizontal} data-testid="menu-mas">
              Más
            </Button>
          }
        >
          <ItemMenu icono={ExternalLink} onSelect={verComoAgente} data-testid="ver-como-agente">
            Ver como la agente de aduanas
          </ItemMenu>
          {puedeRecibir && (
            <ItemMenu
              icono={PackageCheck}
              onSelect={() => navegar(rutas.recepcion({ importacion: imp.numero }))}
            >
              Registrar la recepción
            </ItemMenu>
          )}
          {!recibido && (
            <ItemMenu icono={BellRing} onSelect={() => setNotificar({ estado: imp.estado, fecha: hoy })}>
              Avisos del estado actual
            </ItemMenu>
          )}
          <ItemMenu icono={Pencil} onSelect={() => setEditando(true)} data-testid="editar-pedido">
            Editar pedido
          </ItemMenu>
          <SeparadorMenu />
          <ItemMenu icono={Trash2} peligro onSelect={() => setEliminando(true)}>
            Eliminar pedido
          </ItemMenu>
        </Menu>
      )}
      {rol === 'bodega' && puedeRecibir && (
        <BotonEnlace to={rutas.recepcion({ importacion: imp.numero })} icono={PackageCheck}>
          Registrar la recepción
        </BotonEnlace>
      )}
      {puedeCambiar && (
        <Pista id="importaciones.estado" alinear="fin">
          <ResaltarFila valor="cambiar-estado">
            <Button icono={ArrowRightLeft} onClick={() => setCambiando(true)} data-testid="cambiar-estado">
              Cambiar estado
            </Button>
          </ResaltarFila>
        </Pista>
      )}
    </>
  );

  return (
    <div className="pb-16">
      <EncabezadoPagina
        migas={[
          { texto: 'Inicio', a: rutas.inicio() },
          { texto: 'Importaciones', a: rutas.importaciones() },
          { texto: imp.numero },
        ]}
        eyebrow={fila?.proveedorNombre}
        titulo={imp.numero}
        insignia={
          <span className="flex flex-wrap items-center gap-2">
            <InsigniaEstado estado={imp.estado} />
            <InsigniaRetraso dias={retraso} />
            {imp.aforo && <InsigniaAforo tipo={imp.aforo.tipo} />}
          </span>
        }
        subtitulo={`${textoCarga(imp.carga)} · ${imp.puertoOrigen} → ${imp.puertoDestino} → Bogotá${imp.origenSugerencia ? ' · Creado desde Sugerir pedido' : ''}`}
        acciones={acciones_}
        pestanas={pestanas}
      />

      {hayPendiente && pendientes && esDueno && (
        <div
          className="mt-8 flex flex-wrap items-center justify-between gap-4 border border-ink bg-surface p-5"
          data-testid="avisos-pendientes"
          role="status"
        >
          <div className="max-w-[72ch]">
            <p className="t-eyebrow text-accent-ink">Reportado desde el portal</p>
            <p className="mt-1 t-label font-bold text-ink">{pendientes.notificacion.titulo}</p>
            <p className="mt-1 t-body text-muted">
              Los avisos para quien sigue ya están redactados: revísalos y envíalos cuando quieras.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variante="ghost" onClick={() => marcarLeida(pendientes.notificacion.id)}>
              Descartar
            </Button>
            <Button
              icono={BellRing}
              onClick={() => setNotificar({ estado: pendientes.estado, fecha: hoy })}
              data-testid="revisar-avisos"
            >
              Revisar los avisos
            </Button>
          </div>
        </div>
      )}

      <div className="mt-8">
        {pestana === '' && (
          <div className="space-y-6" data-testid="resumen-importacion">
            <div className="grid grid-cols-2 gap-4 desk:grid-cols-4">
              <Kpi
                etiqueta={recibido ? 'Recibido en bodega' : 'Llega a bodega'}
                valor={recibido ? 0 : Math.max(0, diasLlegada)}
                formatear={(n) => (recibido ? 'Recibido' : n === 0 ? 'Hoy' : plural(n, 'día', 'días'))}
                nota={
                  <Fecha valor={recibido ? (imp.recepcion?.fecha ?? llegada) : llegada} formato="larga" />
                }
                animar={false}
              />
              <Kpi
                etiqueta="Prendas"
                valor={fila?.unidades ?? 0}
                formatear={entero}
                nota={`${imp.lineas.length} ${imp.lineas.length === 1 ? 'referencia' : 'referencias'}`}
              />
              {verPagos && fila && (
                <>
                  <Kpi
                    etiqueta="Valor de fábrica"
                    valor={fila.fobCop}
                    formatear={dinero.corta}
                    completo={dinero(fila.fobCop)}
                    nota={<MontoOrigen centavos={fila.fobOrigen} moneda={imp.moneda} />}
                  />
                  <Kpi
                    etiqueta="Pagado a la fábrica"
                    valor={pagado}
                    formatear={(n) => porcentaje(n, 0)}
                    nota={
                      fila.saldoOrigen > 0 ? (
                        <>
                          Falta <MontoOrigen centavos={fila.saldoOrigen} moneda={imp.moneda} corta={false} />
                        </>
                      ) : (
                        'Al día con la fábrica'
                      )
                    }
                    a={rutas.importacionPestana(imp.numero, 'pagos')}
                  />
                </>
              )}
            </div>

            <div className="grid gap-6 desk:grid-cols-[minmax(0,1fr)_380px]">
              <div className="space-y-6">
                <Card titulo="Por dónde va" data-testid="card-ruta">
                  <RutaChina
                    barcos={[
                      {
                        id: imp.numero,
                        numero: imp.numero,
                        progreso: posicion.progreso,
                        tramo: posicion.tramo,
                        etiqueta: ETIQUETAS_ESTADO_IMPORTACION[imp.estado],
                      },
                    ]}
                    origen={imp.puertoOrigen}
                    puertoDestino={imp.puertoDestino}
                    fechas={{
                      origen: imp.hitos.embarcado.real ? (
                        <>
                          Zarpe <Fecha valor={imp.hitos.embarcado.real} />
                        </>
                      ) : (
                        <>
                          Zarpe est. <Fecha valor={imp.hitos.embarcado.estimada} />
                        </>
                      ),
                      puerto: imp.hitos.en_puerto.real ? (
                        <>
                          Llegó <Fecha valor={imp.hitos.en_puerto.real} />
                        </>
                      ) : (
                        <>
                          Llega est. <Fecha valor={imp.hitos.en_puerto.estimada} />
                        </>
                      ),
                      bodega: recibido ? (
                        <>
                          Recibido <Fecha valor={imp.recepcion?.fecha ?? llegada} />
                        </>
                      ) : (
                        <>
                          Llega est. <Fecha valor={imp.hitos.recibido_bodega.estimada} />
                        </>
                      ),
                    }}
                  />
                </Card>
                <Card titulo="Línea de tiempo" data-testid="card-linea-tiempo">
                  <LineaTiempoImportacion imp={imp} hoy={hoy} retraso={retraso} />
                </Card>
              </div>
              <div className="space-y-6">
                {siguiente && !recibido && (
                  <Card titulo="Lo que sigue" data-testid="card-siguiente">
                    <p className="t-label font-bold text-ink">{ETIQUETAS_ESTADO_IMPORTACION[siguiente]}</p>
                    <dl className="mt-3 space-y-2 t-body">
                      <div>
                        <dt className="t-small text-muted">Lo reporta</dt>
                        <dd className="text-ink">{MATRIZ_AVISOS[siguiente].reporta}</dd>
                      </div>
                      {MATRIZ_AVISOS[siguiente].para && (
                        <div>
                          <dt className="t-small text-muted">Para qué</dt>
                          <dd className="text-ink">{MATRIZ_AVISOS[siguiente].para}</dd>
                        </div>
                      )}
                      {esDueno &&
                        avisosSiguiente &&
                        avisosSiguiente.destinatarios.filter((d) => d.preseleccionado).length > 0 && (
                          <div>
                            <dt className="t-small text-muted">Se avisará a</dt>
                            <dd className="text-ink">
                              {unirConY(avisosSiguiente.destinatarios.filter((d) => d.preseleccionado).map((d) => (d.tipo === 'dueno' ? 'ti' : d.nombre)))}
                            </dd>
                          </div>
                        )}
                    </dl>
                  </Card>
                )}
                <Card titulo="El pedido">
                  <ParesDatos
                    columnas={1}
                    pares={[
                      [
                        'Fábrica',
                        fila ? (
                          esDueno ? (
                            <Link
                              key="p"
                              to={rutas.proveedor(imp.proveedorId)}
                              className="underline underline-offset-4"
                            >
                              {fila.proveedorNombre}
                            </Link>
                          ) : (
                            fila.proveedorNombre
                          )
                        ) : (
                          ''
                        ),
                      ],
                      ['Fecha del pedido', <Fecha key="f" valor={imp.fechaPedido} formato="larga" />],
                      ['Carga', textoCarga(imp.carga)],
                      ...(verPagos
                        ? ([
                            [
                              'Moneda y tasa del pedido',
                              `${imp.moneda === 'USD' ? 'US$' : 'CN¥'} · $ ${formatoNumero(imp.tasaPedido, 2)}`,
                            ],
                          ] as const)
                        : []),
                      ...(imp.aforo && imp.aforo.tipo !== 'automatico'
                        ? ([
                            [
                              'Aforo',
                              `${imp.aforo.tipo === 'fisico' ? 'Físico' : 'Documental'}${imp.aforo.motivo ? `: ${imp.aforo.motivo}` : ''}`,
                            ],
                          ] as const)
                        : []),
                      ...(imp.nota ? ([['Nota', imp.nota]] as const) : []),
                    ]}
                  />
                  {verPagos && fila && tasa > 0 && (
                    <p className="mt-4 t-small text-muted">
                      Con la tasa de hoy, el valor de fábrica equivale a{' '}
                      {dinero(copDeCentavos(fila.fobOrigen, tasa))}.
                    </p>
                  )}
                </Card>
                {imp.recepcion && (
                  <Card titulo="Recepción en bodega">
                    <ParesDatos
                      columnas={1}
                      pares={[
                        ['Fecha', <Fecha key="r" valor={imp.recepcion.fecha} formato="larga" />],
                        [
                          'Recibidas',
                          entero(Object.values(imp.recepcion.lineas).reduce((a, l) => a + l.recibidas, 0)),
                        ],
                        [
                          'Con defectos',
                          entero(Object.values(imp.recepcion.lineas).reduce((a, l) => a + l.defectuosas, 0)),
                        ],
                        ...(imp.recepcion.nota ? ([['Nota', imp.recepcion.nota]] as const) : []),
                      ]}
                    />
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
        {pestana === 'lineas' && <TabLineas imp={imp} alEditar={() => setEditando(true)} />}
        {pestana === 'costo-aterrizado' && <CalculadoraCosto imp={imp} />}
        {pestana === 'pagos' && <TabPagos imp={imp} />}
        {pestana === 'documentos' && <TabDocumentos imp={imp} />}
        {pestana === 'contactos' && <TabContactos imp={imp} />}
        {pestana === 'mensajes' && (
          <TabMensajes imp={imp} alRedactar={() => setNotificar({ estado: imp.estado, fecha: hoy })} />
        )}
      </div>

      <CambiarEstadoDialog
        imp={imp}
        abierto={cambiando}
        alCambiar={setCambiando}
        alCambiado={(estado, fecha) => setNotificar({ estado, fecha })}
      />
      {notificar && (
        <PanelNotificar
          imp={imp}
          estado={notificar.estado}
          fecha={notificar.fecha}
          abierto
          alCambiar={(a) => !a && setNotificar(null)}
        />
      )}
      <Dialog
        abierto={editando}
        alCambiar={setEditando}
        ancho="xl"
        eyebrow={imp.numero}
        titulo="Editar pedido"
        confirmarAlCerrar
        data-testid="dialogo-editar-pedido"
      >
        {editando && (
          <FormularioPedido
            imp={imp}
            alCancelar={() => setEditando(false)}
            alTerminar={() => {
              setEditando(false);
              avisar({ tipo: 'exito', texto: `Pedido ${imp.numero} actualizado` });
            }}
          />
        )}
      </Dialog>
      <ConfirmarEliminacion
        abierto={eliminando}
        alCambiar={setEliminando}
        pregunta={`¿Eliminar el pedido ${imp.numero}?`}
        consecuencias={`Se quita de Importaciones el pedido de ${entero(fila?.unidades ?? 0)} prendas. Solo se puede eliminar si todavía no tiene pagos registrados.`}
        accion="Eliminar pedido"
        alConfirmar={eliminar}
      />
    </div>
  );
}

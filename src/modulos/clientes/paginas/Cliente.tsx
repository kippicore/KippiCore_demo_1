import { CalendarPlus, Cake, MessageCircle, MoreHorizontal, Pencil, Plus, StickyNote, Trash2, UserRoundX } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Cliente as ClienteTipo, Id } from '@/dominio/tipos';
import { diferenciaMinutos } from '@/dominio/reglas/fechas';
import { ESTADOS_MENSAJE, ESTADOS_VENTA } from '@/config/estados';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { useAcciones, useAhora, useHoy, usePuede, useSel } from '@/estado';
import { celular, entero, fecha, fechaHora, plural } from '@/lib/formato';
import {
  avisar,
  Badge,
  BadgeEstado,
  BarraProgreso,
  BotonEnlace,
  BotonIcono,
  Button,
  ConfirmarEliminacion,
  Dinero,
  EmptyState,
  EncabezadoPagina,
  Fecha,
  FranjaResumen,
  ItemMenu,
  Menu,
  MuestraColor,
  PanelTab,
  SeparadorMenu,
  Table,
  Tabs,
  useResaltar,
  type ColumnaTabla,
} from '@/ui';
import { FormularioCliente } from '../componentes/FormularioCliente';
import { LimiteError } from '../componentes/LimiteError';
import { ModalMensaje } from '../componentes/ModalMensaje';
import { ModalNota } from '../componentes/ModalNota';
import { ModalSeguimiento } from '../componentes/ModalSeguimiento';
import { ModalTallas } from '../componentes/ModalTallas';
import { InsigniaSegmento, Partes } from '../componentes/Partes';
import { CATEGORIAS_ETIQUETA, type TipoMensajeCliente } from '../reglas';
import { selPerfilCliente, type FilaHistorial, type PerfilCliente } from '../selectores';
import { TEXTOS } from '../textos';

const PREGUNTA_SEGMENTO = {
  vip: 'Por qué es VIP',
  frecuente: 'Por qué es frecuente',
  ocasional: 'Por qué es ocasional',
  en_riesgo: 'Por qué está en riesgo',
  nuevo: 'Por qué es nuevo',
} as const;

const LINEAS: Record<string, string> = { sastreria: 'Sastrería', casual: 'Casual', sport: 'Deportivo' };

const ORIGEN_MENSAJE: Record<string, string> = {
  cumpleanos: 'Cumpleaños',
  cobro: 'Recordatorio de saldo',
  cliente: 'Mensaje al cliente',
  campana: 'Campaña',
  separado: 'Separado',
};

export default function Cliente() {
  return (
    <div className="pb-24">
      <LimiteError titulo="No pudimos mostrar a este cliente" texto="Recarga la página o vuelve a la lista de clientes. Tus datos de la demo siguen a salvo en este navegador.">
        <FichaDeCliente />
      </LimiteError>
    </div>
  );
}

type Pestana = 'compras' | 'mensajes' | 'notas' | 'seguimientos';

function FichaDeCliente() {
  const navegar = useNavigate();
  const hoy = useHoy();
  const puede = usePuede();
  const acciones = useAcciones();
  const { clienteId, mensaje } = useParamsRuta('cliente');
  const perfil = useSel(selPerfilCliente, { clienteId, hoy });
  const [pestana, setPestana] = useState<Pestana>('compras');
  const [escribiendo, setEscribiendo] = useState<{ tipo: TipoMensajeCliente | null } | null>(null);
  const [editando, setEditando] = useState(false);
  const [editandoTallas, setEditandoTallas] = useState(false);
  const [nota, setNota] = useState(false);
  const [seguimiento, setSeguimiento] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [quitando, setQuitando] = useState<string | null>(null);

  // ?mensaje=cumpleanos|cobro|seguimiento abre el mensaje prellenado en el trato del cliente y se quita de la URL.
  const hayPerfil = !!perfil;
  const hayCobro = !!perfil?.contexto.cobro;
  const nombreCorto = perfil?.ficha.cliente.nombres ?? '';
  useEffect(() => {
    if (!mensaje || !hayPerfil) return;
    const t = setTimeout(() => {
      if (mensaje === 'cobro' && !hayCobro)
        avisar({ tipo: 'info', texto: `${nombreCorto} no tiene saldos por cobrar`, detalle: 'Puedes escribirle por otro motivo desde "Escribir".' });
      else setEscribiendo({ tipo: mensaje });
      navegar(rutas.cliente(clienteId, {}), { replace: true });
    }, 0);
    return () => clearTimeout(t);
  }, [mensaje, hayPerfil, hayCobro, nombreCorto, clienteId, navegar]);

  if (!perfil)
    return (
      <>
        <EncabezadoPagina migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Clientes', a: rutas.clientes({}) }, { texto: 'Cliente' }]} titulo="Cliente" />
        <div className="mt-8 border border-line bg-surface" data-testid="cliente-no-existe">
          <EmptyState
            icono={UserRoundX}
            titulo={TEXTOS.ficha.noExisteTitulo}
            texto={TEXTOS.ficha.noExisteTexto}
            accion={
              <BotonEnlace to={rutas.clientes({})} variante="secondary">
                {TEXTOS.ficha.volver}
              </BotonEnlace>
            }
          />
        </div>
      </>
    );

  const { cliente, metricas } = perfil.ficha;
  const nombre = `${cliente.nombres} ${cliente.apellidos}`;
  const puedeAgendar = puede('evento.crear');

  const eliminar = () => {
    const r = acciones.eliminarCliente({ clienteId: cliente.id, motivo: null });
    setEliminando(false);
    if (!r.ok) {
      avisar({ tipo: 'error', texto: 'No se pudo eliminar al cliente', detalle: r.error.mensaje });
      return;
    }
    avisar({ tipo: 'exito', texto: `${nombre} salió de tu lista`, detalle: 'Sus compras siguen en el historial de ventas.' });
    navegar(rutas.clientes({}));
  };

  const quitarSeguimiento = () => {
    if (!quitando) return;
    const r = acciones.eliminarEvento({ eventoId: quitando });
    setQuitando(null);
    if (!r.ok) avisar({ tipo: 'error', texto: 'No se pudo quitar el seguimiento', detalle: r.error.mensaje });
    else avisar({ tipo: 'exito', texto: 'Seguimiento quitado del calendario' });
  };

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Clientes', a: rutas.clientes({}) }, { texto: nombre }]}
        titulo={nombre}
        insignia={<InsigniaSegmento segmento={metricas.segmento} />}
        subtitulo={
          <>
            Cliente desde <Fecha valor={cliente.creadoEn} formato="fecha" /> · le hablamos de {cliente.tratamiento === 'usted' ? 'usted' : 'tú'}
            {perfil.localHabitual ? ` · local habitual: ${perfil.localHabitual.nombre}` : ''}
          </>
        }
        acciones={
          <>
            <Menu
              etiqueta="Más acciones"
              disparador={<BotonIcono icono={MoreHorizontal} etiqueta="Más acciones" variante="secondary" data-testid="ficha-mas" />}
            >
              <ItemMenu icono={Pencil} onSelect={() => setEditando(true)} data-testid="ficha-editar">
                {TEXTOS.ficha.editar}
              </ItemMenu>
              <ItemMenu icono={CalendarPlus} deshabilitado={!puedeAgendar} onSelect={() => setSeguimiento(true)} data-testid="ficha-seguimiento">
                {TEXTOS.ficha.seguimiento}
              </ItemMenu>
              <ItemMenu icono={Cake} onSelect={() => setEscribiendo({ tipo: 'cumpleanos' })}>
                Felicitar por su cumpleaños
              </ItemMenu>
              {puede('cliente.eliminar') && (
                <>
                  <SeparadorMenu />
                  <ItemMenu icono={Trash2} peligro onSelect={() => setEliminando(true)} data-testid="ficha-eliminar">
                    {TEXTOS.ficha.eliminar}
                  </ItemMenu>
                </>
              )}
            </Menu>
            <Button variante="secondary" icono={StickyNote} onClick={() => setNota(true)} data-testid="ficha-nota">
              {TEXTOS.ficha.nota}
            </Button>
            <Button icono={MessageCircle} onClick={() => setEscribiendo({ tipo: null })} data-testid="ficha-escribir">
              {TEXTOS.ficha.escribir}
            </Button>
          </>
        }
      />

      {(perfil.porCobrar.length > 0 || metricas.saldoAFavor > 0) && (
        <div className="mt-6 grid gap-3 md:grid-cols-2" data-testid="ficha-saldos">
          {perfil.porCobrar.length > 0 && (
            <div className="flex items-center justify-between gap-4 border border-line bg-warning-soft px-5 py-4">
              <p className="t-body text-ink">
                Tiene <strong className="font-bold"><Dinero valor={metricas.porCobrar} /></strong> por cobrar en {plural(perfil.porCobrar.length, 'separado o crédito', 'separados o créditos')}.
              </p>
              {perfil.contexto.cobro && (
                <Button variante="secondary" tamano="sm" onClick={() => setEscribiendo({ tipo: 'cobro' })} data-testid="ficha-recordar-saldo">
                  Recordar saldo
                </Button>
              )}
            </div>
          )}
          {metricas.saldoAFavor > 0 && (
            <div className="border border-line bg-surface px-5 py-4">
              <p className="t-body text-ink">
                Tiene <strong className="font-bold"><Dinero valor={metricas.saldoAFavor} /></strong> de saldo a favor para su próxima compra.
              </p>
            </div>
          )}
        </div>
      )}

      <FranjaResumen
        className="mt-6"
        cifras={[
          { etiqueta: 'Valor histórico', valor: <Dinero valor={metricas.valor} corta /> },
          { etiqueta: 'Compras', valor: entero(metricas.compras) },
          { etiqueta: 'Ticket promedio', valor: metricas.compras ? <Dinero valor={metricas.ticket} corta /> : '—' },
          { etiqueta: 'Última compra', valor: metricas.ultimaCompra ? <Fecha valor={metricas.ultimaCompra} formato="relativaDias" /> : 'Sin compras' },
        ]}
      />

      <ExplicacionSegmento perfil={perfil} alEscribir={() => setEscribiendo({ tipo: metricas.segmento === 'en_riesgo' ? 'nueva_coleccion' : null })} />

      <div className="mt-10 grid gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <Tabs
            valor={pestana}
            alCambiar={setPestana}
            etiqueta="Historial del cliente"
            pestanas={[
              { valor: 'compras', etiqueta: 'Compras', contador: perfil.historial.length, 'data-testid': 'tab-compras' },
              { valor: 'mensajes', etiqueta: 'Mensajes', contador: perfil.mensajes.length, 'data-testid': 'tab-mensajes' },
              { valor: 'notas', etiqueta: 'Notas', contador: perfil.notas.length, 'data-testid': 'tab-notas' },
              { valor: 'seguimientos', etiqueta: 'Seguimientos', contador: perfil.seguimientos.length, 'data-testid': 'tab-seguimientos' },
            ]}
          >
            <PanelTab valor="compras" className="pt-4">
              <Compras perfil={perfil} />
            </PanelTab>
            <PanelTab valor="mensajes" className="pt-4">
              <Mensajes perfil={perfil} alEscribir={() => setEscribiendo({ tipo: null })} />
            </PanelTab>
            <PanelTab valor="notas" className="pt-4">
              <Notas perfil={perfil} alAgregar={() => setNota(true)} />
            </PanelTab>
            <PanelTab valor="seguimientos" className="pt-4">
              <Seguimientos
                perfil={perfil}
                puedeAgendar={puedeAgendar}
                alProgramar={() => setSeguimiento(true)}
                alQuitar={(id) => setQuitando(id)}
              />
            </PanelTab>
          </Tabs>
        </div>

        <div className="space-y-6">
          <TarjetaDatos cliente={cliente} perfilCanal={TEXTOS.canales[cliente.canalPreferido]} alEditar={() => setEditando(true)} />
          <TarjetaHabitos perfil={perfil} alEditarTallas={() => setEditandoTallas(true)} />
        </div>
      </div>

      {escribiendo && <ModalMensaje clienteId={cliente.id} tipoInicial={escribiendo.tipo} alCerrar={() => setEscribiendo(null)} />}
      {editando && <FormularioCliente cliente={cliente} localInicialId={null} alCerrar={() => setEditando(false)} />}
      {editandoTallas && <ModalTallas cliente={cliente} tallas={perfil.tallas} alCerrar={() => setEditandoTallas(false)} />}
      {nota && <ModalNota clienteId={cliente.id} nombre={nombre} alCerrar={() => setNota(false)} />}
      {seguimiento && (
        <ModalSeguimiento
          clienteId={cliente.id}
          nombre={nombre}
          localId={perfil.localHabitual?.id ?? cliente.localRegistroId}
          urgente={metricas.segmento === 'en_riesgo'}
          alCerrar={() => setSeguimiento(false)}
        />
      )}
      <ConfirmarEliminacion
        abierto={eliminando}
        alCambiar={setEliminando}
        pregunta={`¿Eliminar a ${nombre}?`}
        consecuencias={
          <>
            Dejará de aparecer en tu lista de clientes y en los cumpleaños. Sus {plural(metricas.compras, 'compra')} (<Dinero valor={metricas.valor} />) siguen en el historial de ventas.
          </>
        }
        accion="Eliminar cliente"
        alConfirmar={eliminar}
      />
      <ConfirmarEliminacion
        abierto={!!quitando}
        alCambiar={(a) => !a && setQuitando(null)}
        pregunta="¿Quitar este seguimiento del calendario?"
        consecuencias="Se borra la cita de la agenda. El cliente y su historial no cambian."
        nota={null}
        accion="Quitar seguimiento"
        alConfirmar={quitarSeguimiento}
      />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Por qué es lo que es
// ---------------------------------------------------------------------------------------------------------
function ExplicacionSegmento({ perfil, alEscribir }: { perfil: PerfilCliente; alEscribir: () => void }) {
  const { explicacion } = perfil;
  const segmento = perfil.ficha.metricas.segmento;
  return (
    <section className="mt-4 grid border border-line bg-surface md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" data-testid="segmento-explicacion">
      <div className="p-6">
        <p className="t-eyebrow text-ink-2">{PREGUNTA_SEGMENTO[segmento]}</p>
        <p className="mt-3 max-w-[60ch] t-h3 text-ink" data-testid="segmento-porque">
          <Partes partes={explicacion.porQue} />
        </p>
        {explicacion.progreso && (
          <BarraProgreso
            className="mt-5 max-w-[60ch]"
            valor={explicacion.progreso.valor}
            etiqueta={<Partes partes={explicacion.progreso.texto} />}
            detalle=" "
            meta
          />
        )}
      </div>
      <div className="border-t border-line-soft p-6 md:border-l md:border-t-0">
        <p className="t-eyebrow text-ink-2">Qué conviene hacer</p>
        <p className="mt-3 t-body text-ink">{explicacion.sugerencia}</p>
        <Button className="mt-4" variante="secondary" tamano="sm" icono={MessageCircle} onClick={alEscribir} data-testid="segmento-escribir">
          Escribirle ahora
        </Button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Pestañas
// ---------------------------------------------------------------------------------------------------------
function Compras({ perfil }: { perfil: PerfilCliente }) {
  const navegar = useNavigate();
  const ahora = useAhora();
  const resaltar = useResaltar();
  const columnas: ColumnaTabla<FilaHistorial>[] = [
    {
      id: 'venta',
      encabezado: 'Venta',
      ordenar: (h) => h.ts,
      celda: (h) => (
        <span className="flex items-center gap-2">
          <Link to={rutas.venta(h.id)} onClick={(e) => e.stopPropagation()} className="font-semibold text-ink underline-offset-4 hover:underline">
            {h.numero}
          </Link>
          {diferenciaMinutos(h.ts, ahora) <= 15 && diferenciaMinutos(h.ts, ahora) >= 0 && (
            <Badge tono="accent" tamano="sm">
              Recién hecha
            </Badge>
          )}
        </span>
      ),
    },
    { id: 'fecha', encabezado: 'Fecha', ordenar: (h) => h.ts, celda: (h) => <Fecha valor={h.ts} formato="fechaHora" /> },
    { id: 'que', encabezado: 'Qué compró', truncar: true, celda: (h) => h.resumen },
    { id: 'local', encabezado: 'Local', ordenar: (h) => h.localNombre, celda: (h) => h.localNombre },
    { id: 'estado', encabezado: 'Estado', celda: (h) => <BadgeEstado estado={ESTADOS_VENTA[h.estado]} tamano="sm" /> },
    { id: 'total', encabezado: 'Total', numerica: true, ordenar: (h) => h.total, celda: (h) => <Dinero valor={h.total} /> },
  ];
  return (
    <Table
      etiqueta="Compras del cliente"
      data-testid="historial-compras"
      columnas={columnas}
      filas={perfil.historial}
      clave={(h) => h.id}
      sustantivo={['compra', 'compras']}
      porPagina={25}
      ordenInicial={{ id: 'fecha', dir: 'desc' }}
      alAbrir={(h) => navegar(rutas.venta(h.id))}
      resaltada={(h) => h.id === resaltar}
      vacio={<EmptyState tamano="tabla" icono={UserRoundX} titulo={TEXTOS.vacios.compras.titulo} texto={TEXTOS.vacios.compras.texto} />}
    />
  );
}

function Mensajes({ perfil, alEscribir }: { perfil: PerfilCliente; alEscribir: () => void }) {
  if (!perfil.mensajes.length)
    return (
      <div className="border border-line bg-surface" data-testid="mensajes-vacio">
        <EmptyState
          tamano="tabla"
          icono={MessageCircle}
          titulo={TEXTOS.vacios.mensajes.titulo}
          texto={TEXTOS.vacios.mensajes.texto}
          accion={
            <Button variante="secondary" onClick={alEscribir}>
              Escribirle
            </Button>
          }
        />
      </div>
    );
  return (
    <ul className="border border-line bg-surface" data-testid="lista-mensajes">
      {perfil.mensajes.map((m) => (
        <li key={m.id} className="border-b border-line-soft px-5 py-4 last:border-b-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="t-label font-bold text-ink">{m.canal === 'whatsapp' ? 'WhatsApp' : m.canal === 'correo' ? 'Correo' : 'WeChat'}</span>
            <BadgeEstado estado={ESTADOS_MENSAJE.enviado_simulado} tamano="sm" />
            <span className="t-small text-muted">{ORIGEN_MENSAJE[m.origen.tipo] ?? 'Mensaje'} · trato de {m.tratamiento === 'usted' ? 'usted' : 'tú'}</span>
            <span className="flex-1" />
            <span className="t-small text-muted num">{fechaHora(m.ts)}</span>
          </div>
          {m.asunto && <p className="mt-2 t-small font-bold text-ink-2">{m.asunto}</p>}
          <p className="mt-2 max-w-[80ch] whitespace-pre-line t-body text-ink">{m.cuerpo}</p>
        </li>
      ))}
    </ul>
  );
}

function Notas({ perfil, alAgregar }: { perfil: PerfilCliente; alAgregar: () => void }) {
  if (!perfil.notas.length)
    return (
      <div className="border border-line bg-surface" data-testid="notas-vacio">
        <EmptyState
          tamano="tabla"
          icono={StickyNote}
          titulo={TEXTOS.vacios.notas.titulo}
          texto={TEXTOS.vacios.notas.texto}
          accion={
            <Button variante="secondary" icono={Plus} onClick={alAgregar}>
              Agregar nota
            </Button>
          }
        />
      </div>
    );
  return (
    <ul className="border border-line bg-surface" data-testid="lista-notas">
      {perfil.notas.map(({ nota, autor }) => (
        <li key={nota.id} className="border-b border-line-soft px-5 py-4 last:border-b-0">
          <p className="max-w-[80ch] whitespace-pre-line t-body text-ink">{nota.texto}</p>
          <p className="mt-2 t-small text-muted">
            {autor} · <span className="num">{fechaHora(nota.ts)}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

function Seguimientos({
  perfil,
  puedeAgendar,
  alProgramar,
  alQuitar,
}: {
  perfil: PerfilCliente;
  puedeAgendar: boolean;
  alProgramar: () => void;
  alQuitar: (eventoId: Id) => void;
}) {
  const hoy = useHoy();
  if (!perfil.seguimientos.length)
    return (
      <div className="border border-line bg-surface" data-testid="seguimientos-vacio">
        <EmptyState
          tamano="tabla"
          icono={CalendarPlus}
          titulo={TEXTOS.vacios.seguimientos.titulo}
          texto={TEXTOS.vacios.seguimientos.texto}
          accion={
            <Button variante="secondary" icono={CalendarPlus} onClick={alProgramar} disabled={!puedeAgendar} motivo={TEXTOS.ficha.seguimientoSoloDueno}>
              Programar seguimiento
            </Button>
          }
        />
      </div>
    );
  return (
    <ul className="border border-line bg-surface" data-testid="lista-seguimientos">
      {perfil.seguimientos.map((s) => {
        const pasado = s.inicio.slice(0, 10) < hoy;
        return (
          <li key={s.id} className="flex items-center gap-4 border-b border-line-soft px-5 py-4 last:border-b-0">
            <div className="min-w-0 flex-1">
              <p className={`t-body font-bold ${pasado ? 'text-muted' : 'text-ink'}`}>{s.titulo}</p>
              <p className="mt-1 t-small text-muted">
                <Fecha valor={s.inicio} formato="fechaHora" /> · <Fecha valor={s.inicio.slice(0, 10)} formato="relativaDias" />
                {s.descripcion ? ` · ${s.descripcion}` : ''}
              </p>
            </div>
            {puedeAgendar && (
              <>
                <BotonEnlace to={rutas.calendario({ vista: 'dia', fecha: s.inicio.slice(0, 10), resaltar: `ev:${s.id}` })} variante="ghost" tamano="sm">
                  Ver en el calendario
                </BotonEnlace>
                <Button variante="ghost" tamano="sm" onClick={() => alQuitar(s.id)}>
                  Quitar
                </Button>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Tarjetas laterales
// ---------------------------------------------------------------------------------------------------------
function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line-soft py-2.5 last:border-b-0">
      <dt className="shrink-0 t-small text-muted">{etiqueta}</dt>
      <dd className="min-w-0 truncate text-right t-body text-ink">{children}</dd>
    </div>
  );
}

function TarjetaDatos({ cliente, perfilCanal, alEditar }: { cliente: ClienteTipo; perfilCanal: string; alEditar: () => void }) {
  return (
    <section className="border border-line bg-surface p-5" data-testid="tarjeta-datos">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="t-h3 text-ink">Datos de contacto</h2>
        <Button variante="ghost" tamano="sm" icono={Pencil} onClick={alEditar}>
          Editar
        </Button>
      </div>
      <dl>
        <Fila etiqueta="Celular">
          <span className="num">{celular(cliente.celular)}</span>
        </Fila>
        <Fila etiqueta="Correo">{cliente.correo ?? <span className="text-subtle">Sin correo</span>}</Fila>
        <Fila etiqueta="Cumpleaños">
          {cliente.cumpleanos ? (
            <span className="num">
              {Number(cliente.cumpleanos.slice(3, 5))}/{Number(cliente.cumpleanos.slice(0, 2))}
              {cliente.anioNacimiento ? ` · ${cliente.anioNacimiento}` : ''}
            </span>
          ) : (
            <span className="text-subtle">Sin registrar</span>
          )}
        </Fila>
        <Fila etiqueta="Documento">{cliente.documento ? <span className="num">{`${cliente.documento.tipo} ${cliente.documento.numero}`}</span> : <span className="text-subtle">Sin registrar</span>}</Fila>
        <Fila etiqueta="Barrio">{cliente.barrio ?? <span className="text-subtle">Sin registrar</span>}</Fila>
        <Fila etiqueta="Canal preferido">{perfilCanal}</Fila>
        <Fila etiqueta="Trato">{cliente.tratamiento === 'usted' ? 'Usted' : 'Tú'}</Fila>
        <Fila etiqueta="Llegó por">{TEXTOS.origenes[cliente.canalAlta]}</Fila>
        <Fila etiqueta="Autorización de datos">
          {cliente.autorizacionDatos.aceptada ? (
            <span title={`Autorizó el ${fecha(cliente.autorizacionDatos.fecha)}`}>
              Sí · <span className="num">{fecha(cliente.autorizacionDatos.fecha)}</span>
            </span>
          ) : (
            <span className="text-danger">Pendiente</span>
          )}
        </Fila>
      </dl>
    </section>
  );
}

function TarjetaHabitos({ perfil, alEditarTallas }: { perfil: PerfilCliente; alEditarTallas: () => void }) {
  return (
    <section className="border border-line bg-surface p-5" data-testid="tarjeta-habitos">
      <h2 className="t-h3 text-ink">Cómo compra</h2>

      <div className="mt-4 flex items-center justify-between">
        <p className="t-eyebrow text-ink-2">Tallas</p>
        <Button variante="ghost" tamano="sm" icono={Pencil} onClick={alEditarTallas} data-testid="editar-tallas">
          Editar
        </Button>
      </div>
      <ul className="mt-1" data-testid="lista-tallas">
        {perfil.tallas.map((t) => (
          <li key={t.clave} className="flex items-baseline justify-between gap-3 border-b border-line-soft py-2.5 last:border-b-0">
            <span className="t-body text-ink">{t.etiqueta}</span>
            <span className="text-right">
              <span className="t-body font-bold num text-ink">{t.efectiva ?? <span className="font-normal text-subtle">Sin dato</span>}</span>
              <span className="block t-small text-muted">
                {t.declarada && !t.derivada && 'Declarada'}
                {t.declarada && t.derivada && !t.difiere && 'Declarada y comprada'}
                {t.difiere && `Declaró ${t.declarada}, compra ${t.derivada}`}
                {!t.declarada && t.derivada && 'Según sus compras'}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-5 t-eyebrow text-ink-2">Colores que más compra</p>
      {perfil.colores.length ? (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2" data-testid="lista-colores">
          {perfil.colores.slice(0, 6).map((c) => (
            <li key={c.id} className="flex items-center gap-2 t-small text-ink">
              <MuestraColor hex={c.hex} nombre={c.nombre} patron={c.patron} tamano={16} />
              {c.nombre}
              <span className="text-muted num">{c.unidades}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 t-small text-muted">Aún no ha comprado: cuando lo haga, aquí verás sus colores.</p>
      )}

      <p className="mt-5 t-eyebrow text-ink-2">Qué compra y en qué estilo</p>
      {perfil.categorias.length ? (
        <div className="mt-3 space-y-3" data-testid="lista-categorias">
          {perfil.categorias.slice(0, 4).map((c) => (
            <BarraProgreso key={c.categoria} valor={c.proporcion} etiqueta={CATEGORIAS_ETIQUETA[c.categoria]} detalle={plural(c.unidades, 'ud.', 'uds.')} />
          ))}
          <p className="t-small text-muted">
            {perfil.lineas.map((l) => `${LINEAS[l.linea] ?? l.linea} ${Math.round(l.proporcion * 100)} %`).join(' · ')}
          </p>
        </div>
      ) : (
        <p className="mt-2 t-small text-muted">Sin compras todavía.</p>
      )}

      <dl className="mt-5">
        <Fila etiqueta="Local habitual">{perfil.localHabitual?.nombre ?? <span className="text-subtle">Sin dato</span>}</Fila>
        <Fila etiqueta="Lo atiende">{perfil.vendedorHabitual ?? <span className="text-subtle">Sin dato</span>}</Fila>
      </dl>
    </section>
  );
}

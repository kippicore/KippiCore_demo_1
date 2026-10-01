import { Cake, MessageCircle, Pencil, Plus, Trash2, UserRound, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Cliente, Id } from '@/dominio/tipos';
import type { Segmento } from '@/dominio/reglas/segmentacion';
import { ESTADOS_CLIENTE } from '@/config/estados';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { useAcciones, useFiltroLocal, useHoy, usePuede, useRolActivo, useSel, useUsuarioActivo } from '@/estado';
import { celular, entero, plural } from '@/lib/formato';
import { selEmpleadosActivos, selLocalesQueVenden } from '@/selectores';
import {
  BotonAccionesFila,
  avisar,
  Avatar,
  BotonEnlace,
  BotonExportar,
  BotonPildora,
  Button,
  ConfirmarEliminacion,
  Dinero,
  EmptyState,
  EncabezadoPagina,
  Fecha,
  ImportarExcelSimulado,
  ItemMenu,
  Menu,
  Pista,
  Select,
  SelectorDensidad,
  SeparadorMenu,
  Table,
  Toolbar,
  useDensidadTabla,
  type ChipActivo,
  type ColumnaTabla,
} from '@/ui';
import { FormularioCliente } from '../componentes/FormularioCliente';
import { LimiteError } from '../componentes/LimiteError';
import { ModalMensaje } from '../componentes/ModalMensaje';
import { InsigniaSegmento, Partes } from '../componentes/Partes';
import { descripcionSegmento, SEGMENTOS_ORDEN } from '../reglas';
import { selListaClientes, selUmbralesSegmentacion, type FilaListaCliente } from '../selectores';
import { TEXTOS } from '../textos';

export default function Clientes() {
  return (
    <div className="pb-24">
      <LimiteError titulo={TEXTOS.lista.errorTitulo} texto={TEXTOS.lista.errorTexto}>
        <ListaDeClientes />
      </LimiteError>
    </div>
  );
}

function ListaDeClientes() {
  const navegar = useNavigate();
  const hoy = useHoy();
  const rol = useRolActivo();
  const puede = usePuede();
  const acciones = useAcciones();
  const { empleado } = useUsuarioActivo();
  const localGlobal = useFiltroLocal();
  const p = useParamsRuta('clientes');
  const [q, setQ] = useState(p.texto ?? '');
  const [densidad, setDensidad] = useDensidadTabla('clientes');
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [escribiendo, setEscribiendo] = useState<Id | null>(null);
  const [eliminando, setEliminando] = useState<FilaListaCliente | null>(null);

  const esVendedor = rol === 'vendedor';
  const localId: Id | 'todos' = localGlobal !== 'todos' ? localGlobal : (p.local ?? 'todos');
  const vendedorId = esVendedor ? (empleado?.id ?? undefined) : (p.vendedor ?? undefined);
  const lista = useSel(selListaClientes, { hoy, texto: q.trim() || undefined, segmento: p.segmento ?? undefined, localId, vendedorId });
  const umbrales = useSel(selUmbralesSegmentacion);
  const locales = useSel(selLocalesQueVenden);
  const empleados = useSel(selEmpleadosActivos, { fecha: hoy });
  const vendedores = useMemo(() => empleados.filter((x) => x.cargo === 'vendedor' || x.cargo === 'cajero'), [empleados]);

  // El filtro de la URL se actualiza (sin apilar historial) con lo que cambia el usuario.
  const ir = (cambios: { segmento?: Segmento | null; local?: string | null; vendedor?: string | null; texto?: string | null }) =>
    navegar(
      rutas.clientes({
        segmento: p.segmento,
        local: p.local,
        vendedor: p.vendedor,
        texto: p.texto,
        ...cambios,
      }),
      { replace: true },
    );

  // La búsqueda se refleja en la URL poco después de dejar de escribir.
  useEffect(() => {
    const t = setTimeout(() => {
      const nuevo = q.trim() || null;
      if (nuevo !== (p.texto ?? null)) ir({ texto: nuevo });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // El resaltado (?resaltar=) dura lo que dura el destello y se quita de la URL.
  useEffect(() => {
    if (!p.resaltar) return;
    const t = setTimeout(() => ir({}), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.resaltar]);

  const nombreLocal = (id: string | null) => (id ? (locales.find((l) => l.id === id)?.nombre ?? '—') : '—');
  const hayFiltros = !!(q.trim() || p.segmento || (localGlobal === 'todos' && p.local) || (!esVendedor && p.vendedor));
  const limpiar = () => {
    setQ('');
    navegar(rutas.clientes({}), { replace: true });
  };

  const chips: ChipActivo[] = [];
  if (p.segmento) chips.push({ id: 'segmento', texto: `Segmento: ${ESTADOS_CLIENTE[p.segmento].etiqueta}`, alQuitar: () => ir({ segmento: null }) });
  if (localGlobal === 'todos' && p.local) chips.push({ id: 'local', texto: `Local: ${nombreLocal(p.local)}`, alQuitar: () => ir({ local: null }) });
  if (!esVendedor && p.vendedor) {
    const v = vendedores.find((x) => x.id === p.vendedor);
    chips.push({ id: 'vendedor', texto: `Vendedor: ${v ? `${v.nombres} ${v.apellidos}` : p.vendedor}`, alQuitar: () => ir({ vendedor: null }) });
  }

  const columnas: ColumnaTabla<FilaListaCliente>[] = [
    {
      id: 'cliente',
      encabezado: 'Cliente',
      ordenar: (f) => `${f.cliente.apellidos} ${f.cliente.nombres}`.toLowerCase(),
      celda: (f) => (
        <span className="flex items-center gap-3">
          <Avatar nombre={`${f.cliente.nombres} ${f.cliente.apellidos}`} tamano={32} />
          <span className="min-w-0">
            <span className="block max-w-[22ch] truncate font-semibold text-ink">
              {f.cliente.nombres} {f.cliente.apellidos}
            </span>
            <span className="block t-small text-muted">
              <span className="num">{celular(f.cliente.celular)}</span> · {f.cliente.tratamiento === 'usted' ? TEXTOS.trato.usted : TEXTOS.trato.tu}
            </span>
          </span>
        </span>
      ),
    },
    {
      id: 'segmento',
      encabezado: 'Segmento',
      ordenar: (f) => SEGMENTOS_ORDEN.indexOf(f.metricas.segmento),
      celda: (f) => (
        <span className="flex flex-col items-start gap-0.5">
          <InsigniaSegmento segmento={f.metricas.segmento} tamano="sm" />
          <span className="block max-w-[22ch] truncate t-small text-muted">
            <Partes partes={f.explicacion.corta} />
          </span>
        </span>
      ),
    },
    {
      id: 'valor',
      encabezado: 'Valor histórico',
      numerica: true,
      ordenar: (f) => f.metricas.valor,
      celda: (f) => (
        <span className="flex flex-col items-end gap-0.5">
          <Dinero valor={f.metricas.valor} />
          <span className="t-small text-muted">
            {plural(f.metricas.compras, 'compra')}
            {f.metricas.compras > 0 && (
              <>
                {' · ticket '}
                <Dinero valor={f.metricas.ticket} corta />
              </>
            )}
          </span>
        </span>
      ),
    },
    {
      id: 'ultima',
      encabezado: 'Última compra',
      ordenar: (f) => f.metricas.ultimaCompra,
      celda: (f) => (
        <span className="flex flex-col items-start gap-0.5">
          {f.metricas.ultimaCompra ? <Fecha valor={f.metricas.ultimaCompra} formato="relativaDias" /> : <span className="text-subtle">Sin compras</span>}
          <span className="t-small text-muted">{nombreLocal(f.metricas.localHabitualId ?? f.cliente.localRegistroId)}</span>
        </span>
      ),
    },
  ];

  const eliminar = () => {
    if (!eliminando) return;
    const nombre = `${eliminando.cliente.nombres} ${eliminando.cliente.apellidos}`;
    const r = acciones.eliminarCliente({ clienteId: eliminando.cliente.id, motivo: null });
    setEliminando(null);
    if (!r.ok) {
      avisar({ tipo: 'error', texto: 'No se pudo eliminar al cliente', detalle: r.error.mensaje });
      return;
    }
    avisar({ tipo: 'exito', texto: `${nombre} salió de tu lista`, detalle: 'Sus compras siguen en el historial de ventas.' });
  };

  const sinClientes = lista.total === 0 && !hayFiltros;

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Clientes' }]}
        titulo={TEXTOS.lista.titulo}
        subtitulo={esVendedor ? 'Tus clientes: los que más atiendes tú. Escríbeles en el momento justo y con el trato que prefieren.' : TEXTOS.lista.subtitulo}
        acciones={
          <>
            <ImportarExcelSimulado que="tus clientes" />
            <BotonEnlace to={rutas.cumpleanos({})} variante="secondary" icono={Cake} data-testid="ir-cumpleanos">
              {TEXTOS.lista.cumpleanos}
            </BotonEnlace>
            <Button icono={Plus} onClick={() => setCreando(true)} data-testid="nuevo-cliente">
              {TEXTOS.lista.nuevo}
            </Button>
          </>
        }
      />

      <Pista id="clientes.segmentos" className="mt-8 mb-4">
        <div role="group" aria-label="Segmentos de clientes" className="grid grid-cols-3 border border-line bg-surface min-[1200px]:grid-cols-6" data-testid="segmentos">
          <ChipSegmento
            id="todos"
            etiqueta={TEXTOS.lista.todos}
            conteo={lista.total}
            descripcion={[TEXTOS.lista.segmentosAyuda]}
            activo={!p.segmento}
            alElegir={() => ir({ segmento: null })}
          />
          {SEGMENTOS_ORDEN.map((s) => (
            <ChipSegmento
              key={s}
              id={s}
              etiqueta={ESTADOS_CLIENTE[s].etiqueta}
              conteo={lista.conteos[s]}
              descripcion={descripcionSegmento(s, umbrales)}
              activo={p.segmento === s}
              alElegir={() => ir({ segmento: p.segmento === s ? null : s })}
            />
          ))}
        </div>
      </Pista>

      <Table
        etiqueta="Clientes"
        data-testid="tabla-clientes"
        columnas={columnas}
        filas={lista.filas}
        clave={(f) => f.cliente.id}
        sustantivo={TEXTOS.lista.sustantivo}
        densidad={densidad}
        ordenInicial={{ id: 'valor', dir: 'desc' }}
        alAbrir={(f) => navegar(rutas.cliente(f.cliente.id, {}))}
        resaltada={(f) => f.cliente.id === p.resaltar}
        totales={{
          cliente: `${plural(lista.totales.clientes, 'cliente')} · ${plural(lista.totales.compras, 'compra')}`,
          valor: <Dinero valor={lista.totales.valor} />,
          ultima: lista.totales.compras ? (
            <span>
              Ticket <Dinero valor={lista.totales.ticket} corta />
            </span>
          ) : undefined,
        }}
        barra={
          <Toolbar
            buscar={{ valor: q, alCambiar: setQ, placeholder: TEXTOS.lista.buscar, etiqueta: 'Buscar clientes' }}
            filtros={
              !esVendedor ? (
                <>
                  {localGlobal === 'todos' && !esVendedor && (
                    <BotonPildora etiqueta="Local" valor={p.local ? nombreLocal(p.local) : 'Todos'} anchoPanel={260} data-testid="filtro-local">
                      <Select
                        etiqueta="Local"
                        etiquetaOculta
                        valor={p.local ?? 'todos'}
                        alCambiar={(v) => ir({ local: v === 'todos' ? null : v })}
                        opciones={[{ valor: 'todos', etiqueta: 'Todos los locales' }, ...locales.map((l) => ({ valor: l.id, etiqueta: l.nombre }))]}
                      />
                    </BotonPildora>
                  )}
                  {!esVendedor && (
                    <BotonPildora etiqueta="Vendedor" valor={p.vendedor ? (vendedores.find((v) => v.id === p.vendedor)?.nombres ?? '') : 'Todos'} anchoPanel={260} data-testid="filtro-vendedor">
                      <Select
                        etiqueta="Vendedor"
                        etiquetaOculta
                        valor={p.vendedor ?? 'todos'}
                        alCambiar={(v) => ir({ vendedor: v === 'todos' ? null : v })}
                        opciones={[{ valor: 'todos', etiqueta: 'Todos los vendedores' }, ...vendedores.map((v) => ({ valor: v.id, etiqueta: `${v.nombres} ${v.apellidos}` }))]}
                      />
                    </BotonPildora>
                  )}
                </>
              ) : undefined
            }
            derecha={
              <>
                <SelectorDensidad valor={densidad} alCambiar={setDensidad} />
                <BotonExportar reporte="clientes" filtros={{ localId }} menu />
              </>
            }
            chips={chips}
            alLimpiar={chips.length ? limpiar : undefined}
          />
        }
        accionesFila={(f) => (
          <Menu etiqueta={`Acciones de ${f.cliente.nombres}`} disparador={<BotonAccionesFila aria-label={`Acciones de ${f.cliente.nombres} ${f.cliente.apellidos}`} />}>
            <ItemMenu icono={UserRound} onSelect={() => navegar(rutas.cliente(f.cliente.id, {}))}>
              Ver ficha
            </ItemMenu>
            <ItemMenu icono={MessageCircle} onSelect={() => setEscribiendo(f.cliente.id)} data-testid="accion-escribir">
              Escribir por WhatsApp
            </ItemMenu>
            <ItemMenu icono={Pencil} onSelect={() => setEditando(f.cliente)}>
              Editar datos
            </ItemMenu>
            {puede('cliente.eliminar') && (
              <>
                <SeparadorMenu />
                <ItemMenu icono={Trash2} peligro onSelect={() => setEliminando(f)}>
                  Eliminar cliente
                </ItemMenu>
              </>
            )}
          </Menu>
        )}
        vacio={
          sinClientes ? (
            <EmptyState
              tamano="tabla"
              icono={UsersRound}
              titulo={TEXTOS.lista.sinClientesTitulo}
              texto={TEXTOS.lista.sinClientesTexto}
              accion={<Button onClick={() => setCreando(true)}>{TEXTOS.lista.nuevo}</Button>}
            />
          ) : (
            <EmptyState
              tamano="tabla"
              icono={UsersRound}
              titulo={TEXTOS.lista.sinResultadosTitulo}
              texto={TEXTOS.lista.sinResultadosTexto}
              accion={
                <Button variante="secondary" onClick={limpiar}>
                  Limpiar filtros
                </Button>
              }
            />
          )
        }
      />

      {creando && <FormularioCliente cliente={null} localInicialId={localGlobal === 'todos' ? null : localGlobal} alCerrar={() => setCreando(false)} alGuardado={(id) => navegar(rutas.cliente(id, {}))} />}
      {editando && <FormularioCliente cliente={editando} localInicialId={null} alCerrar={() => setEditando(null)} />}
      {escribiendo && <ModalMensaje clienteId={escribiendo} alCerrar={() => setEscribiendo(null)} />}
      <ConfirmarEliminacion
        abierto={!!eliminando}
        alCambiar={(a) => !a && setEliminando(null)}
        pregunta={eliminando ? `¿Eliminar a ${eliminando.cliente.nombres} ${eliminando.cliente.apellidos}?` : ''}
        consecuencias={
          eliminando ? (
            <>
              Dejará de aparecer en tu lista de clientes y en los cumpleaños. Sus {plural(eliminando.metricas.compras, 'compra')} (<Dinero valor={eliminando.metricas.valor} />) siguen en el historial de ventas.
            </>
          ) : (
            ''
          )
        }
        accion="Eliminar cliente"
        alConfirmar={eliminar}
      />
    </>
  );
}

function ChipSegmento({
  id,
  etiqueta,
  conteo,
  descripcion,
  activo,
  alElegir,
}: {
  id: string;
  etiqueta: string;
  conteo: number;
  descripcion: Parameters<typeof Partes>[0]['partes'];
  activo: boolean;
  alElegir: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={alElegir}
      data-testid={`segmento-${id}`}
      className={`flex min-h-28 flex-col items-start border-l border-line-soft px-4 py-4 text-left transition-colors duration-(--dur-instant) first:border-l-0 hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${activo ? 'bg-selected shadow-[inset_0_-2px_0_var(--c-ink)]' : ''}`}
    >
      <span className="t-eyebrow text-ink-2">{etiqueta}</span>
      <span className="mt-1.5 t-kpi-sm text-ink num">{entero(conteo)}</span>
      <span className="mt-1.5 t-small text-muted">
        <Partes partes={descripcion} />
      </span>
    </button>
  );
}

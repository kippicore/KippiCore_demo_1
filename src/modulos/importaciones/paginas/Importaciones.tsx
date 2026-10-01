import { CalendarDays, ListPlus, PackageSearch, Plus, Ship } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import type { EstadoImportacion, Id } from '@/dominio/tipos';
import { ESTADOS_IMPORTACION } from '@/dominio/tipos';
import { ETIQUETAS_ESTADO_IMPORTACION, FASES_IMPORTACION } from '@/config/aduanas';
import { copDeCentavos } from '@/dominio/reglas/dinero';
import { diferenciaDias } from '@/dominio/reglas/fechas';
import { useDinero, useHoy, usePuede, useRolActivo, useSel } from '@/estado';
import { entero, plural, unidades } from '@/lib/formato';
import { selImportaciones, selProveedores, selTasaVigente, type FilaImportacion } from '@/selectores';
import {
  avisar,
  BotonEnlace,
  BotonExportar,
  BotonPildora,
  Button,
  EmptyState,
  EncabezadoPagina,
  Fecha,
  Kanban,
  Kpi,
  ResaltarFila,
  Segmentado,
  Select,
  Table,
  Toolbar,
  useResaltar,
  type ColumnaKanban,
  type ColumnaTabla,
  type TarjetaKanban,
} from '@/ui';
import { faseDeEstado, indiceFase, posicionRuta, textoCarga, type FaseId } from '../calculos';
import { CambiarEstadoDialog } from '../componentes/CambiarEstado';
import { InsigniaAforo, InsigniaEstado, InsigniaRetraso, MontoOrigen } from '../componentes/Montos';
import { PanelNotificar } from '../componentes/PanelNotificar';
import { PestanasModulo } from '../componentes/PestanasModulo';
import { RutaChina, type BarcoRuta } from '../componentes/RutaChina';
import { TarjetaImportacion } from '../componentes/TarjetaImportacion';
import { COLUMNAS_TABLERO_AYUDA, TEXTOS_LISTA, VISTAS_IMPORTACIONES, type VistaImportaciones } from '../textos';

type TarjetaFila = TarjetaKanban & { fila: FilaImportacion };

/** Importaciones (PRD 7.5, W3): tablero por estado, lista de cargas con llegada estimada y ruta China → puerto → Bogotá. */
export default function Importaciones() {
  const hoy = useHoy();
  const navegar = useNavigate();
  const rol = useRolActivo();
  const puede = usePuede();
  const dinero = useDinero();
  const esDueno = rol === 'dueno';
  const verPagos = puede('ver.pagos');
  const { vista: vistaUrl } = useParamsRuta('importaciones');
  const resaltar = useResaltar();
  const vistasOfrecidas = VISTAS_IMPORTACIONES.filter((v) => esDueno || v.valor !== 'tablero');
  const vista: VistaImportaciones = vistasOfrecidas.some((v) => v.valor === vistaUrl) ? (vistaUrl as VistaImportaciones) : (vistasOfrecidas[0]?.valor ?? 'lista');

  const todas = useSel(selImportaciones, { hoy, incluirRecibidas: true });
  const fabricas = useSel(selProveedores, { hoy, tipo: 'fabrica' });
  const tasaUsd = useSel(selTasaVigente, { moneda: 'USD', fecha: hoy });
  const tasaCny = useSel(selTasaVigente, { moneda: 'CNY', fecha: hoy });

  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<EstadoImportacion | 'todos'>('todos');
  const [fabrica, setFabrica] = useState<Id | 'todas'>('todas');
  const [cambio, setCambio] = useState<{ numero: string; estado: EstadoImportacion | null } | null>(null);
  const [notificar, setNotificar] = useState<{ numero: string; estado: EstadoImportacion; fecha: string } | null>(null);

  const enCurso = useMemo(() => todas.filter((f) => f.importacion.estado !== 'recibido_bodega'), [todas]);
  const recientes = useMemo(
    () => todas.filter((f) => f.importacion.estado === 'recibido_bodega' && diferenciaDias(f.llegadaEstimada, hoy) <= 30 && !f.esCargaInicial),
    [todas, hoy],
  );

  const filtrar = (fila: FilaImportacion) => {
    // Un pedido resaltado desde una alerta se muestra aunque el filtro lo esconda.
    if (resaltar && fila.importacion.numero === resaltar) return true;
    if (estado !== 'todos' && fila.importacion.estado !== estado) return false;
    if (fabrica !== 'todas' && fila.importacion.proveedorId !== fabrica) return false;
    const t = texto.trim().toLowerCase();
    if (t && !`${fila.importacion.numero} ${fila.proveedorNombre}`.toLowerCase().includes(t)) return false;
    return true;
  };
  const visiblesTablero = useMemo(() => [...enCurso, ...recientes].filter(filtrar), [enCurso, recientes, estado, fabrica, texto]); // eslint-disable-line react-hooks/exhaustive-deps
  const visiblesLista = useMemo(() => todas.filter((f) => !f.esCargaInicial).filter(filtrar), [todas, estado, fabrica, texto]); // eslint-disable-line react-hooks/exhaustive-deps

  const saldoCop = useMemo(
    () => enCurso.reduce((a, f) => a + copDeCentavos(f.saldoOrigen, f.importacion.moneda === 'USD' ? tasaUsd : tasaCny), 0),
    [enCurso, tasaUsd, tasaCny],
  );
  const prendasEnCamino = enCurso.reduce((a, f) => a + f.unidades, 0);
  const proxima = [...enCurso].sort((a, b) => (a.llegadaEstimada < b.llegadaEstimada ? -1 : 1))[0] ?? null;
  const conRetraso = enCurso.filter((f) => f.retrasoDias > 0);
  const mayorRetraso = [...conRetraso].sort((a, b) => b.retrasoDias - a.retrasoDias)[0] ?? null;

  const cambiarVista = (v: VistaImportaciones) => navegar(rutas.importaciones({ vista: v }), { replace: true });
  const filaDe = (numero: string) => todas.find((f) => f.importacion.numero === numero) ?? null;
  const impCambio = cambio ? (filaDe(cambio.numero)?.importacion ?? null) : null;
  const impNotificar = notificar ? (filaDe(notificar.numero)?.importacion ?? null) : null;

  const limpiar = () => {
    setEstado('todos');
    setFabrica('todas');
    setTexto('');
  };
  const hayFiltros = estado !== 'todos' || fabrica !== 'todas' || texto !== '';
  const chips = [
    ...(estado !== 'todos' ? [{ id: 'estado', texto: `Estado: ${ETIQUETAS_ESTADO_IMPORTACION[estado]}`, alQuitar: () => setEstado('todos') }] : []),
    ...(fabrica !== 'todas' ? [{ id: 'fabrica', texto: `Fábrica: ${fabricas.find((f) => f.proveedor.id === fabrica)?.proveedor.nombreCorto ?? ''}`, alQuitar: () => setFabrica('todas') }] : []),
  ];

  const barra = (
    <Toolbar
      buscar={{ valor: texto, alCambiar: setTexto, placeholder: 'Buscar por número o fábrica' }}
      filtros={
        <>
          <BotonPildora etiqueta="Estado" valor={estado === 'todos' ? 'Todos' : ETIQUETAS_ESTADO_IMPORTACION[estado]}>
            <Select
              etiqueta="Estado"
              etiquetaOculta
              valor={estado}
              alCambiar={(v) => setEstado(v as EstadoImportacion | 'todos')}
              opciones={[{ valor: 'todos', etiqueta: 'Todos los estados' }, ...ESTADOS_IMPORTACION.map((e) => ({ valor: e, etiqueta: ETIQUETAS_ESTADO_IMPORTACION[e] }))]}
            />
          </BotonPildora>
          <BotonPildora etiqueta="Fábrica" valor={fabrica === 'todas' ? 'Todas' : fabricas.find((f) => f.proveedor.id === fabrica)?.proveedor.nombreCorto}>
            <Select
              etiqueta="Fábrica"
              etiquetaOculta
              valor={fabrica}
              alCambiar={(v) => setFabrica(v)}
              opciones={[{ valor: 'todas', etiqueta: 'Todas las fábricas' }, ...fabricas.map((f) => ({ valor: f.proveedor.id, etiqueta: f.proveedor.nombreCorto }))]}
            />
          </BotonPildora>
        </>
      }
      derecha={esDueno ? <BotonExportar reporte="importaciones" menu /> : undefined}
      chips={chips}
      alLimpiar={limpiar}
    />
  );

  // ---- Tablero por estado ----
  const columnas: ColumnaKanban[] = FASES_IMPORTACION.map((f) => {
    const delaFase = visiblesTablero.filter((x) => faseDeEstado(x.importacion.estado) === f.id);
    const total = delaFase.reduce((a, x) => a + x.fobCop, 0);
    return { id: f.id, titulo: f.nombre, resumen: delaFase.length ? `${delaFase.length} · ${verPagos ? dinero.corta(total) : unidades(delaFase.reduce((a, x) => a + x.unidades, 0))}` : '0' };
  });
  const tarjetas: TarjetaFila[] = visiblesTablero.map((fila) => ({ id: fila.importacion.numero, columna: faseDeEstado(fila.importacion.estado), titulo: `${fila.importacion.numero}, ${fila.proveedorNombre}`, fila }));

  const alMover = (id: string, columna: string) => {
    if (columna === 'bodega') {
      avisar({ tipo: 'info', texto: 'Recibir en bodega se registra en Inventario', detalle: 'Allí cuentas lo que llegó, revisas defectos y repartes por local.', accion: { texto: 'Ir a Recepción', a: rutas.recepcion({ importacion: id }) } });
      return;
    }
    const f = columna as FaseId;
    const fila = filaDe(id);
    if (!fila) return;
    const primero = ESTADOS_IMPORTACION.find((e) => faseDeEstado(e) === f && ESTADOS_IMPORTACION.indexOf(e) > ESTADOS_IMPORTACION.indexOf(fila.importacion.estado)) ?? null;
    setCambio({ numero: id, estado: primero });
  };

  // ---- Lista ----
  const columnasLista: ColumnaTabla<FilaImportacion>[] = [
    {
      id: 'numero',
      encabezado: 'Pedido',
      celda: (f) => (
        <span>
          <span className="font-bold text-ink num">{f.importacion.numero}</span>
          <span className="block t-small text-muted">{f.proveedorNombre}</span>
        </span>
      ),
      ordenar: (f) => f.importacion.numero,
      ancho: 200,
    },
    {
      id: 'estado',
      encabezado: 'Estado',
      celda: (f) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <InsigniaEstado estado={f.importacion.estado} tamano="sm" />
          <InsigniaRetraso dias={f.retrasoDias} tamano="sm" />
          {f.importacion.aforo && <InsigniaAforo tipo={f.importacion.aforo.tipo} tamano="sm" />}
        </span>
      ),
      ordenar: (f) => ESTADOS_IMPORTACION.indexOf(f.importacion.estado),
      ancho: 270,
    },
    { id: 'carga', encabezado: 'Carga', celda: (f) => <span className="t-body text-ink-2">{textoCarga(f.importacion.carga)}</span>, ordenar: (f) => f.importacion.carga.tipo, ancho: 210 },
    { id: 'unidades', encabezado: 'Prendas', numerica: true, celda: (f) => <span className="num">{entero(f.unidades)}</span>, ordenar: (f) => f.unidades, ancho: 90 },
    ...(verPagos
      ? ([
          {
            id: 'fob',
            encabezado: 'Valor de fábrica',
            numerica: true,
            celda: (f) => <MontoOrigen centavos={f.fobOrigen} moneda={f.importacion.moneda} cop={f.fobCop} apilado />,
            ordenar: (f) => f.fobCop,
            ancho: 150,
          },
          {
            id: 'saldo',
            encabezado: 'Falta pagar',
            numerica: true,
            celda: (f) => (f.saldoOrigen > 0 ? <MontoOrigen centavos={f.saldoOrigen} moneda={f.importacion.moneda} corta apilado /> : <span className="text-muted">Al día</span>),
            ordenar: (f) => f.saldoOrigen,
            ancho: 140,
          },
        ] satisfies ColumnaTabla<FilaImportacion>[])
      : []),
    {
      id: 'llegada',
      encabezado: 'Llega a bodega',
      celda: (f) => (
        <span className="inline-flex flex-col">
          <Fecha valor={f.llegadaEstimada} />
          <span className="t-small text-muted">{f.importacion.estado === 'recibido_bodega' ? 'Recibido' : <Fecha valor={f.llegadaEstimada} formato="relativaDias" />}</span>
        </span>
      ),
      ordenar: (f) => f.llegadaEstimada,
      ancho: 150,
    },
  ];

  // ---- Ruta ----
  const barcos: BarcoRuta[] = enCurso.map((f) => {
    const p = posicionRuta(f.importacion, hoy);
    return { id: f.importacion.numero, numero: f.importacion.numero, progreso: p.progreso, tramo: p.tramo, etiqueta: ETIQUETAS_ESTADO_IMPORTACION[f.importacion.estado], resaltado: resaltar === f.importacion.numero };
  });
  const porLlegada = [...enCurso].sort((a, b) => (a.llegadaEstimada < b.llegadaEstimada ? -1 : 1));

  if (todas.filter((f) => !f.esCargaInicial).length === 0)
    return (
      <div className="pb-16">
        <EncabezadoPagina migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Importaciones' }]} titulo={TEXTOS_LISTA.titulo} subtitulo={TEXTOS_LISTA.subtitulo} />
        <div className="mt-10 border border-line bg-surface">
          <EmptyState
            icono={Ship}
            titulo={TEXTOS_LISTA.sinPedidosTitulo}
            texto={TEXTOS_LISTA.sinPedidosTexto}
            accion={
              esDueno ? (
                <span className="flex gap-3">
                  <BotonEnlace to={rutas.sugerirPedido()} variante="secondary" icono={ListPlus}>
                    Sugerir pedido
                  </BotonEnlace>
                  <BotonEnlace to={rutas.importacionNueva()} icono={Plus}>
                    Nuevo pedido
                  </BotonEnlace>
                </span>
              ) : undefined
            }
          />
        </div>
      </div>
    );

  return (
    <div className="pb-16">
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Importaciones' }]}
        titulo={TEXTOS_LISTA.titulo}
        subtitulo={TEXTOS_LISTA.subtitulo}
        acciones={
          esDueno ? (
            <>
              <BotonEnlace to={rutas.sugerirPedido()} variante="secondary" icono={ListPlus} data-testid="ir-sugerir">
                Sugerir pedido
              </BotonEnlace>
              <BotonEnlace to={rutas.importacionNueva()} icono={Plus} data-testid="ir-nuevo-pedido">
                Nuevo pedido
              </BotonEnlace>
            </>
          ) : undefined
        }
        pestanas={esDueno ? <PestanasModulo conContactos /> : undefined}
      />

      <div className="mt-8 grid grid-cols-2 gap-4 wide:grid-cols-4" data-testid="kpis-importaciones">
        <Kpi etiqueta="Pedidos en curso" valor={enCurso.length} formatear={entero} nota={`${unidades(prendasEnCamino)} en camino`} />
        <Kpi
          etiqueta="Próxima llegada"
          valor={proxima ? Math.max(0, diferenciaDias(hoy, proxima.llegadaEstimada)) : 0}
          formatear={(n) => (n === 0 ? 'Hoy' : plural(n, 'día', 'días'))}
          nota={proxima ? `${proxima.importacion.numero} · ${proxima.proveedorNombre}` : 'Sin pedidos en camino'}
          a={proxima ? rutas.importacion(proxima.importacion.numero) : undefined}
        />
        {verPagos ? (
          <Kpi etiqueta="Falta pagar a fábricas" valor={saldoCop} formatear={dinero.corta} completo={dinero(saldoCop)} nota="Con la tasa de hoy" a={rutas.porPagar()} />
        ) : (
          <Kpi etiqueta="Prendas en camino" valor={prendasEnCamino} formatear={entero} nota="Todavía sin recibir" />
        )}
        <Kpi
          etiqueta="Pedidos con retraso"
          valor={conRetraso.length}
          formatear={entero}
          nota={mayorRetraso ? `${mayorRetraso.importacion.numero}: ${plural(mayorRetraso.retrasoDias, 'día', 'días')} tarde` : 'Todo va a tiempo'}
          a={mayorRetraso ? rutas.importacion(mayorRetraso.importacion.numero) : undefined}
        />
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <Segmentado etiqueta="Vista" valor={vista} alCambiar={cambiarVista} opciones={vistasOfrecidas.map((v) => ({ valor: v.valor, etiqueta: v.etiqueta, 'data-testid': `vista-${v.valor}` }))} />
        <p className="t-small text-muted">
          <Link to={rutas.calendario({ vista: 'mes', fecha: proxima?.llegadaEstimada })} className="inline-flex items-center gap-1.5 font-semibold text-ink underline-offset-4 hover:underline">
            <CalendarDays size={14} aria-hidden />
            Ver las llegadas en el calendario
          </Link>
        </p>
      </div>

      {vista === 'tablero' && (
        <section className="mt-4 border border-line bg-surface" aria-label="Tablero por estado">
          {barra}
          {tarjetas.length === 0 ? (
            <EmptyState
              tamano="tabla"
              icono={PackageSearch}
              titulo={TEXTOS_LISTA.vacioTitulo}
              texto={TEXTOS_LISTA.vacioTexto}
              accion={hayFiltros ? <Button variante="secondary" onClick={limpiar}>Limpiar filtros</Button> : undefined}
            />
          ) : (
            <div className="p-4" data-testid="tablero-importaciones">
              <p className="mb-3 t-small text-muted">Arrastra un pedido a otra columna para cambiar su estado: KippiCore prepara los avisos para quien le toca actuar.</p>
              <Kanban
                columnas={columnas}
                tarjetas={tarjetas}
                permitido={(t, col) => col === 'bodega' || indiceFase(col as FaseId) > indiceFase(t.columna as FaseId)}
                alMover={alMover}
                pintar={(t) => (
                  <ResaltarFila valor={t.fila.importacion.numero}>
                    <TarjetaImportacion fila={t.fila} verPagos={verPagos} alCambiarEstado={(n) => setCambio({ numero: n, estado: null })} />
                  </ResaltarFila>
                )}
              />
              <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 t-small text-muted">
                {FASES_IMPORTACION.map((f) => (
                  <li key={f.id}>
                    <span className="font-semibold text-ink-2">{f.nombre}:</span> {COLUMNAS_TABLERO_AYUDA[f.id]}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {vista === 'lista' && (
        <Table
          className="mt-4"
          data-testid="lista-importaciones"
          columnas={columnasLista}
          filas={visiblesLista}
          clave={(f) => f.importacion.id}
          sustantivo={['pedido', 'pedidos']}
          alAbrir={(f) => navegar(rutas.importacion(f.importacion.numero))}
          resaltada={(f) => f.importacion.numero === resaltar}
          porPagina={25}
          ordenInicial={{ id: 'llegada', dir: 'desc' }}
          barra={barra}
          totales={verPagos ? { unidades: <span className="num">{entero(visiblesLista.reduce((a, f) => a + f.unidades, 0))}</span>, fob: <span className="num">{dinero.corta(visiblesLista.reduce((a, f) => a + f.fobCop, 0))}</span> } : { unidades: <span className="num">{entero(visiblesLista.reduce((a, f) => a + f.unidades, 0))}</span> }}
          vacio={<EmptyState tamano="tabla" icono={PackageSearch} titulo={TEXTOS_LISTA.vacioTitulo} texto={TEXTOS_LISTA.vacioTexto} accion={<Button variante="secondary" onClick={limpiar}>Limpiar filtros</Button>} />}
        />
      )}

      {vista === 'ruta' && (
        <section className="mt-4 space-y-4" aria-label="Ruta de los pedidos">
          <div className="border border-line bg-surface p-6">
            <div className="mb-2 flex items-baseline justify-between gap-4">
              <h2 className="t-h3 font-bold text-ink">De China a la bodega</h2>
              <p className="t-small text-muted">Cada barco está donde van las fechas del pedido.</p>
            </div>
            <RutaChina barcos={barcos} origen="China" puertoDestino="Buenaventura" carriles={Math.min(4, Math.max(1, barcos.length))} alAbrir={(n) => navegar(rutas.importacion(n))} />
          </div>
          <Table
            data-testid="llegadas-bodega"
            columnas={[
              { id: 'numero', encabezado: 'Pedido', celda: (f) => <span className="font-bold num">{f.importacion.numero}<span className="block t-small font-normal text-muted">{f.proveedorNombre}</span></span>, ancho: 220 },
              { id: 'carga', encabezado: 'Carga', celda: (f) => <span className="t-body text-ink-2">{textoCarga(f.importacion.carga)}</span>, ancho: 220 },
              { id: 'estado', encabezado: 'Dónde va', celda: (f) => <span className="flex flex-wrap items-center gap-1.5"><InsigniaEstado estado={f.importacion.estado} tamano="sm" /><InsigniaRetraso dias={f.retrasoDias} tamano="sm" /></span>, ancho: 260 },
              { id: 'llegada', encabezado: 'Llega a bodega', celda: (f) => <span className="inline-flex flex-col"><Fecha valor={f.llegadaEstimada} /><span className="t-small text-muted"><Fecha valor={f.llegadaEstimada} formato="relativaDias" /></span></span>, ordenar: (f) => f.llegadaEstimada, ancho: 160 },
            ]}
            filas={porLlegada}
            clave={(f) => f.importacion.id}
            sustantivo={['carga', 'cargas']}
            alAbrir={(f) => navegar(rutas.importacion(f.importacion.numero))}
            resaltada={(f) => f.importacion.numero === resaltar}
            porPagina={0}
            vacio={<EmptyState tamano="tabla" icono={Ship} titulo="No hay cargas en camino" texto="Cuando un pedido se confirme, aparecerá aquí con su llegada estimada." />}
          />
        </section>
      )}

      {impCambio && cambio && (
        <CambiarEstadoDialog
          imp={impCambio}
          abierto
          alCambiar={(a) => !a && setCambio(null)}
          estadoInicial={cambio.estado}
          alCambiado={(est, fecha) => setNotificar({ numero: impCambio.numero, estado: est, fecha })}
        />
      )}
      {impNotificar && notificar && <PanelNotificar imp={impNotificar} estado={notificar.estado} fecha={notificar.fecha} abierto alCambiar={(a) => !a && setNotificar(null)} />}
    </div>
  );
}

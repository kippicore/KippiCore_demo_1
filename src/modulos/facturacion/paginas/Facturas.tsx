import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, FilePlus2, FileText, Gauge, Send, ShoppingBag } from 'lucide-react';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { ESTADOS_FACTURA, TIPOS_DOCUMENTO_ELECTRONICO } from '@/config/estados';
import { useAcciones, useFiltroLocal, useHoy, usePuede, useSel } from '@/estado';
import { entero, plural } from '@/lib/formato';
import {
  avisar,
  Badge,
  BadgeEstado,
  BotonAccionesFila,
  BotonFiltros,
  BotonPildora,
  Button,
  cn,
  Dinero,
  EmptyState,
  EncabezadoPagina,
  Fecha,
  FranjaResumen,
  GrupoRadio,
  ItemMenu,
  ItemMenuEnlace,
  Menu,
  SelectorDensidad,
  SelectorRango,
  Segmentado,
  Table,
  textoRango,
  Toolbar,
  useDensidadTabla,
  useNombreLocal,
  type ChipActivo,
  type ColumnaTabla,
  type RangoFechas,
} from '@/ui';
import { useAvanceNotas, useAvanceSimulado, useEstadoNota } from '../avance';
import {
  filtrarDocumentos,
  resumirDocumentos,
  siguienteEstado,
  type FilaDocumento,
  type FiltroClase,
} from '../calculos';
import { DialogoEmitir } from '../componentes/DialogoEmitir';
import { DialogoResoluciones } from '../componentes/DialogoResoluciones';
import { selDocumentos } from '../selectores';
import { CLASES_FILTRO, ESTADOS_FILTRO, NOMBRE_CLASE, TEXTOS } from '../textos';

const TODOS = '*';

/** /panel/facturacion — facturas, documentos POS y notas crédito con su estado simulado y filtros (PRD 7.13). */
export default function Facturas() {
  const params = useParamsRuta('facturacion');
  const navegar = useNavigate();
  const hoy = useHoy();
  const puede = usePuede();
  const acciones = useAcciones();
  const localId = useFiltroLocal();
  const nombreLocalActivo = useNombreLocal(localId);
  const nombreLocal = localId === 'todos' ? null : nombreLocalActivo;
  const [densidad, setDensidad] = useDensidadTabla('facturacion');

  // El tipo llega por la URL (`?tipo=`) o lo elige la persona; "Notas crédito" no viaja en la URL.
  const [elegida, setElegida] = useState<{ valor: FiltroClase; tipoUrl: string | null } | null>(null);
  const clase: FiltroClase =
    elegida && elegida.tipoUrl === (params.tipo ?? null) ? elegida.valor : (params.tipo ?? 'todos');
  const [estado, setEstado] = useState<string>(TODOS);
  // Un enlace profundo (`?resaltar=`) abre sin filtro de fechas para que el documento esté en la lista.
  const [rango, setRango] = useState<RangoFechas | null>(
    params.resaltar ? null : { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy },
  );
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [emitir, setEmitir] = useState(false);
  const [resoluciones, setResoluciones] = useState(false);

  const todas = useSel(selDocumentos);
  // La nota crédito nace "generada" y el dominio no la avanza: su estado mostrado sigue el reloj de la app.
  const estadoNota = useEstadoNota();
  const filas = useMemo<FilaDocumento[]>(
    () => todas.map((f) => (f.clase === 'nota' ? { ...f, estado: estadoNota(f) } : f)),
    [todas, estadoNota],
  );
  useAvanceSimulado(filas.filter((f) => f.clase !== 'nota' && f.estado !== 'aceptada'));
  useAvanceNotas(todas.filter((f) => f.clase === 'nota'));

  const filtro = useMemo(
    () => ({
      clase,
      estado: estado === TODOS ? null : (estado as 'generada' | 'enviada' | 'aceptada'),
      desde: rango?.desde ?? null,
      hasta: rango?.hasta ?? null,
      texto,
      localId,
    }),
    [clase, estado, rango, texto, localId],
  );
  const visibles = useMemo(() => filtrarDocumentos(filas, filtro), [filas, filtro]);
  const resumen = useMemo(() => resumirDocumentos(visibles), [visibles]);

  useEffect(() => {
    if (params.resaltar && !todas.some((f) => f.id === params.resaltar))
      avisar({ tipo: 'info', texto: 'Ese documento ya no está en la lista.' });
  }, [params.resaltar, todas]);

  const cambiarClase = (c: FiltroClase) => {
    const enUrl = c === 'factura_electronica' || c === 'documento_equivalente_pos';
    setElegida({ valor: c, tipoUrl: enUrl ? c : null });
    navegar(
      rutas.facturacion({
        ...(c === 'factura_electronica' || c === 'documento_equivalente_pos' ? { tipo: c } : {}),
        ...(params.resaltar ? { resaltar: params.resaltar } : {}),
      }),
      { replace: true },
    );
  };

  const hayFiltros = clase !== 'todos' || estado !== TODOS || texto.trim() !== '' || rango?.desde !== `${hoy.slice(0, 7)}-01` || rango?.hasta !== hoy;
  const limpiar = () => {
    setTexto('');
    setEstado(TODOS);
    setRango({ desde: `${hoy.slice(0, 7)}-01`, hasta: hoy });
    cambiarClase('todos');
  };

  const etiquetaEstado = ESTADOS_FILTRO.find((e) => e.valor === estado)?.etiqueta;
  const chips: ChipActivo[] = [];
  if (rango) chips.push({ id: 'fechas', texto: `Fechas: ${textoRango(rango, hoy)}`, alQuitar: () => setRango(null) });
  if (estado !== TODOS) chips.push({ id: 'estado', texto: `Estado: ${etiquetaEstado ?? estado}`, alQuitar: () => setEstado(TODOS) });
  if (texto.trim()) chips.push({ id: 'texto', texto: `Búsqueda: ${texto.trim()}`, alQuitar: () => setTexto('') });

  const columnas: ColumnaTabla<FilaDocumento>[] = [
    {
      id: 'numero',
      encabezado: 'Documento',
      ordenar: (f) => f.numero,
      ancho: 176,
      celda: (f) => (
        <span className="flex flex-col whitespace-nowrap leading-tight">
          <span className="font-bold">{f.numero}</span>
          <span className="t-small text-muted">
            {f.clase === 'nota' && f.afecta ? `Afecta ${f.afecta.numero}` : NOMBRE_CLASE[f.clase]}
          </span>
        </span>
      ),
    },
    {
      id: 'fecha',
      encabezado: 'Fecha',
      ordenar: (f) => f.ts,
      ancho: 104,
      celda: (f) => (
        <span className="flex flex-col whitespace-nowrap leading-tight">
          <Fecha valor={f.ts} formato="fecha" />
          <Fecha valor={f.ts} formato="hora" className="t-small text-muted" />
        </span>
      ),
    },
    {
      id: 'venta',
      encabezado: 'Venta',
      ordenar: (f) => f.ventaNumero,
      ancho: 116,
      celda: (f) =>
        f.ventaId ? (
          <Link
            to={rutas.venta(f.ventaId)}
            onClick={(e) => e.stopPropagation()}
            className="num whitespace-nowrap underline-offset-4 hover:underline"
          >
            {f.ventaNumero}
          </Link>
        ) : (
          '—'
        ),
    },
    {
      id: 'adquirente',
      encabezado: 'Adquirente',
      truncar: true,
      ordenar: (f) => f.adquirente,
      celda: (f) => (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate">{f.adquirente}</span>
          <span className="truncate t-small text-muted num">{f.documento ?? 'Sin identificar'}</span>
        </span>
      ),
    },
    {
      id: 'iva',
      encabezado: 'IVA',
      numerica: true,
      ordenar: (f) => (f.clase === 'nota' ? -f.iva : f.iva),
      ancho: 100,
      celda: (f) => <Dinero valor={f.clase === 'nota' ? -f.iva : f.iva} />,
    },
    {
      id: 'total',
      encabezado: 'Total',
      numerica: true,
      ordenar: (f) => (f.clase === 'nota' ? -f.total : f.total),
      ancho: 116,
      celda: (f) =>
        f.clase === 'nota' ? (
          <span className="text-accent-ink">
            <Dinero valor={-f.total} />
          </span>
        ) : (
          <Dinero valor={f.total} />
        ),
    },
    {
      id: 'estado',
      encabezado: 'Estado',
      ordenar: (f) => f.estado,
      ancho: 184,
      celda: (f) => (
        <span data-estado={f.estado} data-testid="fila-estado">
          <BadgeEstado estado={ESTADOS_FACTURA[f.estado]} tamano="sm" />
        </span>
      ),
    },
  ];

  const vacio = (
    <EmptyState
      tamano="tabla"
      icono={FileText}
      titulo={TEXTOS.lista.vacioTitulo}
      texto={TEXTOS.lista.vacioTexto}
      accion={
        <Button variante="secondary" onClick={limpiar}>
          {TEXTOS.lista.limpiar}
        </Button>
      }
    />
  );

  const abrirFila = (f: FilaDocumento) => navegar(f.clase === 'nota' ? rutas.notaCredito(f.id) : rutas.factura(f.id));

  return (
    <div data-testid="pagina-facturacion">
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Facturación' }]}
        titulo={TEXTOS.lista.titulo}
        subtitulo={TEXTOS.lista.subtitulo}
        insignia={<Badge tono="accent">Simulación</Badge>}
        acciones={
          <>
            <Button variante="secondary" icono={Gauge} onClick={() => setResoluciones(true)} data-testid="facturacion-ver-resoluciones">
              Resoluciones
            </Button>
            {puede('factura.emitir') && (
              <Button icono={FilePlus2} onClick={() => setEmitir(true)} data-testid="facturacion-emitir">
                {TEXTOS.lista.emitir}
              </Button>
            )}
          </>
        }
      />

      <div className="mt-8">
        <FranjaResumen
          cifras={[
            {
              etiqueta: 'Documentos',
              valor: (
                <span data-testid="facturacion-resumen-documentos" data-valor={resumen.documentos}>
                  {entero(resumen.documentos)}
                </span>
              ),
            },
            {
              etiqueta: 'Facturado',
              valor: (
                <span data-testid="facturacion-resumen-facturado" data-valor={resumen.facturado}>
                  <Dinero valor={resumen.facturado} corta />
                </span>
              ),
            },
            {
              etiqueta: 'Acreditado con notas crédito',
              valor: (
                <span data-testid="facturacion-resumen-acreditado" data-valor={resumen.acreditado}>
                  <Dinero valor={resumen.acreditado} corta />
                </span>
              ),
            },
            {
              etiqueta: 'IVA generado, neto',
              valor: (
                <span data-testid="facturacion-resumen-iva" data-valor={resumen.ivaNeto}>
                  <Dinero valor={resumen.ivaNeto} corta />
                </span>
              ),
            },
          ]}
        />
        <p className="mt-2 t-small text-muted" data-testid="facturacion-nota-resumen">
          {plural(resumen.facturas, 'factura')} · {plural(resumen.pos, 'documento POS', 'documentos POS')} · {plural(resumen.notas, 'nota crédito', 'notas crédito')}
          {nombreLocal ? ` · Solo ${nombreLocal}` : ''}
          {resumen.pendientes > 0 ? ` · ${plural(resumen.pendientes, 'documento')} en trámite ante la DIAN (simulación)` : ''}
        </p>
      </div>

      <Table
        className="mt-4"
        data-testid="facturacion-tabla"
        etiqueta="Documentos electrónicos"
        columnas={columnas}
        filas={visibles}
        clave={(f) => f.id}
        sustantivo={['documento', 'documentos']}
        densidad={densidad}
        alAbrir={abrirFila}
        resaltada={(f) => f.id === params.resaltar}
        totales={{
          numero: <span className="whitespace-nowrap t-eyebrow text-ink-2">Neto de notas crédito</span>,
          iva: <Dinero valor={resumen.ivaNeto} />,
          total: <Dinero valor={resumen.neto} data-testid="facturacion-total-neto" />,
        }}
        vacio={vacio}
        barra={
          <Toolbar
            buscar={{ valor: texto, alCambiar: setTexto, placeholder: TEXTOS.lista.buscar }}
            filtros={
              <>
                <BotonPildora
                  etiqueta="Fechas"
                  valor={rango ? textoRango(rango, hoy) : 'Todo el historial'}
                  anchoPanel={720}
                  abierto={abierto === 'fechas'}
                  alCambiar={(v) => setAbierto(v ? 'fechas' : null)}
                  data-testid="facturacion-filtro-fechas"
                >
                  <SelectorRango
                    soloPanel
                    hoy={hoy}
                    valor={rango ?? { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy }}
                    alCambiar={(r) => {
                      setRango(r);
                      setAbierto(null);
                    }}
                  />
                </BotonPildora>
                <BotonFiltros
                  etiqueta="Estado"
                  valor={etiquetaEstado}
                  anchoPanel={300}
                  abierto={abierto === 'estado'}
                  alCambiar={(v) => setAbierto(v ? 'estado' : null)}
                  data-testid="facturacion-filtro-estado"
                >
                  <GrupoRadio
                    valor={estado}
                    alCambiar={(v) => {
                      setEstado(v);
                      setAbierto(null);
                    }}
                    opciones={[{ valor: TODOS, etiqueta: 'Todos los estados' }, ...ESTADOS_FILTRO]}
                  />
                </BotonFiltros>
              </>
            }
            derecha={
              <>
                <Segmentado
                  etiqueta="Tipo de documento"
                  tamano="sm"
                  valor={clase}
                  alCambiar={cambiarClase}
                  data-testid="facturacion-tipo"
                  opciones={CLASES_FILTRO.map((c) => ({ valor: c.valor, etiqueta: c.etiqueta, 'data-testid': `facturacion-tipo-${c.valor}` }))}
                />
                <SelectorDensidad valor={densidad} alCambiar={setDensidad} />
              </>
            }
            chips={chips}
            alLimpiar={hayFiltros ? limpiar : undefined}
          />
        }
        accionesFila={(f) => (
          <Menu
            etiqueta={`Acciones de ${f.numero}`}
            ancho={280}
            disparador={<BotonAccionesFila aria-label={`Más acciones de ${f.numero}`} />}
          >
            <ItemMenuEnlace icono={Eye}>
              <Link to={f.clase === 'nota' ? rutas.notaCredito(f.id) : rutas.factura(f.id)}>Ver documento</Link>
            </ItemMenuEnlace>
            {f.ventaId && (
              <ItemMenuEnlace icono={ShoppingBag}>
                <Link to={rutas.venta(f.ventaId)}>Ver la venta {f.ventaNumero}</Link>
              </ItemMenuEnlace>
            )}
            {f.clase !== 'nota' && siguienteEstado(f.estado) && (
              <ItemMenu
                icono={Send}
                onSelect={() => {
                  const sig = siguienteEstado(f.estado);
                  if (sig) acciones.avanzarEstadoFactura({ facturaId: f.id, estado: sig });
                }}
              >
                {f.estado === 'generada' ? 'Enviar a la DIAN (simulación)' : 'Marcar como aceptada (simulación)'}
              </ItemMenu>
            )}
          </Menu>
        )}
      />
      <p className={cn('mt-3 t-small text-muted')}>
        {TIPOS_DOCUMENTO_ELECTRONICO.factura_electronica.etiqueta} y {TIPOS_DOCUMENTO_ELECTRONICO.documento_equivalente_pos.etiqueta.toLowerCase()}: documentos de demostración, sin validez fiscal.
      </p>

      <DialogoEmitir abierto={emitir} alCambiar={setEmitir} />
      <DialogoResoluciones abierto={resoluciones} alCambiar={setResoluciones} />
    </div>
  );
}

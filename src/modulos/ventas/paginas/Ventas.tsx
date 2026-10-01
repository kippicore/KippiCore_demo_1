import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, FileText, Plus, ReceiptText, Undo2 } from 'lucide-react';
import { Link } from 'react-router';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { ESTADOS_VENTA } from '@/config/estados';
import {
  useEstadoDominio,
  useFiltroLocal,
  useHoy,
  usePuede,
  useRolActivo,
  useSel,
  useUsuarioActivo,
} from '@/estado';
import { entero } from '@/lib/formato';
import { nombreCliente, selVentas, type FilaVenta } from '@/selectores';
import {
  avisar,
  BadgeEstado,
  BotonAccionesFila,
  BotonEnlace,
  BotonExportar,
  cn,
  Button,
  Dinero,
  EmptyState,
  EncabezadoPagina,
  Fecha,
  ItemMenu,
  ItemMenuEnlace,
  Menu,
  SelectorDensidad,
  Table,
  useDensidadTabla,
  type ColumnaTabla,
} from '@/ui';
import { BarraFiltros } from '../componentes/BarraFiltros';
import { BarraTotales } from '../componentes/BarraTotales';
import { filtroDeSelector, paramsConCambios, resolverFiltros, type ParamsVentas } from '../filtros';
import {
  selEtiquetasFiltro,
  selFechaVenta,
  selOpcionesFiltro,
  selRangoHistorial,
  selResolverReferencias,
} from '../selectores';
import { CANALES_CORTOS, etiquetaMedioCorta, TEXTOS } from '../textos';

const primerNombre = (n: string, a: string) => `${n.split(' ')[0] ?? ''} ${a.split(' ')[0] ?? ''}`.trim();

/** /panel/ventas — consultar y auditar todo lo vendido (PRD 7.3). Filtros en la URL, totales del selector siempre a la vista. */
export default function Ventas() {
  const params = useParamsRuta('ventas');
  const navigate = useNavigate();
  const hoy = useHoy();
  const rol = useRolActivo();
  const { empleado } = useUsuarioActivo();
  const localSesion = useFiltroLocal();
  const puede = usePuede();
  const estado = useEstadoDominio();
  const esVendedor = rol === 'vendedor';
  const [densidad, setDensidad] = useDensidadTabla('ventas');
  // La búsqueda viaja a la URL (`?texto=`) como el resto de filtros; el campo usa su propio estado para no esperar
  // a la navegación en cada tecla.
  const [texto, setTextoLocal] = useState(params.texto ?? '');
  const textoDiferido = useDeferredValue(texto);

  const fechaResaltada = useSel(selFechaVenta, { ventaId: params.resaltar ?? '' });
  const referencias = useSel(selResolverReferencias, {
    producto: params.producto,
    vendedor: params.vendedor,
  });
  const efectivos = useMemo(
    () => ({ ...params, producto: referencias.producto, vendedor: referencias.vendedor }),
    [params, referencias],
  );
  const resueltos = useMemo(
    () =>
      resolverFiltros(efectivos, {
        hoy,
        localSesion,
        vendedorFijoId: esVendedor ? (empleado?.id ?? '__sin_vendedor__') : null,
        fechaResaltada: params.resaltar ? fechaResaltada : null,
      }),
    [efectivos, params.resaltar, hoy, localSesion, esVendedor, empleado?.id, fechaResaltada],
  );
  const filtro = filtroDeSelector(resueltos, textoDiferido);
  const { filas, totales } = useSel(selVentas, filtro);
  const opciones = useSel(selOpcionesFiltro);
  const historial = useSel(selRangoHistorial);
  const etiquetas = useSel(selEtiquetasFiltro, {
    clienteId: params.cliente && params.cliente !== 'consumidor_final' ? params.cliente : null,
    productoId: efectivos.producto,
  });

  const cambiar = (c: Partial<ParamsVentas>) =>
    navigate(rutas.ventas(paramsConCambios(params, c)), { replace: true });
  const limpiar = () => {
    setTextoLocal('');
    navigate(rutas.ventas(), { replace: true });
  };
  const setTexto = (t: string) => {
    setTextoLocal(t);
    navigate(rutas.ventas(paramsConCambios(params, { texto: t.trim() ? t : null })), { replace: true });
  };

  // Enlace profundo a una venta que no está (o quedó fuera de los filtros): la pantalla se muestra sin el efecto.
  useEffect(() => {
    if (!params.resaltar) return;
    if (!estado.ventas[params.resaltar]) avisar({ tipo: 'info', texto: 'Esa venta ya no está en la lista.' });
  }, [params.resaltar, estado.ventas]);

  const vacio = (
    <EmptyState
      tamano="tabla"
      icono={ReceiptText}
      titulo={TEXTOS.lista.vacioTitulo}
      texto={TEXTOS.lista.vacioTexto}
      accion={
        <Button
          variante="secondary"
          onClick={limpiar}
        >
          {TEXTOS.lista.limpiar}
        </Button>
      }
    />
  );

  const columnas: ColumnaTabla<FilaVenta>[] = [
    {
      id: 'numero',
      encabezado: 'Venta',
      ordenar: (v) => v.numero,
      ancho: 112,
      celda: (v) => (
        <span className="flex flex-col whitespace-nowrap leading-tight">
          <span className="inline-flex items-center gap-1.5 font-bold">
            {v.numero}
            {v.facturaId && (
              <FileText
                aria-label="Con factura electrónica"
                className="size-3.5 text-muted"
                strokeWidth={1.5}
              />
            )}
          </span>
          <span className="t-small text-muted">{CANALES_CORTOS[v.canal]}</span>
        </span>
      ),
    },
    {
      id: 'fecha',
      encabezado: 'Fecha',
      ordenar: (v) => v.ts,
      ancho: 104,
      celda: (v) => (
        <span className="flex flex-col whitespace-nowrap leading-tight">
          <Fecha valor={v.ts} formato="fecha" />
          <Fecha valor={v.ts} formato="hora" className="t-small text-muted" />
        </span>
      ),
    },
    {
      id: 'local',
      encabezado: 'Local y vendedor',
      ordenar: (v) => estado.locales[v.localId]?.nombre ?? v.localId,
      ancho: 150,
      celda: (v) => {
        const e = estado.empleados[v.vendedorId];
        return (
          <span className="flex min-w-0 flex-col whitespace-nowrap leading-tight">
            <span>{estado.locales[v.localId]?.nombre ?? v.localId}</span>
            <span className="truncate t-small text-muted">
              {e ? primerNombre(e.nombres, e.apellidos) : '—'}
            </span>
          </span>
        );
      },
    },
    {
      id: 'cliente',
      encabezado: 'Cliente',
      truncar: true,
      ancho: 150,
      ordenar: (v) => (v.clienteId ? nombreCliente(estado.clientes[v.clienteId]) : 'Consumidor final'),
      celda: (v) => (v.clienteId ? nombreCliente(estado.clientes[v.clienteId]) : 'Consumidor final'),
    },
    {
      id: 'pago',
      encabezado: 'Pago',
      truncar: true,
      ancho: 96,
      celda: (v) =>
        v.medios.length === 0 ? (
          <span className="text-muted">Sin pagos</span>
        ) : (
          v.medios.map(etiquetaMedioCorta).join(' + ')
        ),
    },
    {
      id: 'unidades',
      encabezado: 'Unid.',
      numerica: true,
      ordenar: (v) => v.unidades,
      ancho: 56,
      celda: (v) => entero(v.unidades),
    },
    {
      id: 'total',
      encabezado: 'Total',
      numerica: true,
      ordenar: (v) => v.total,
      ancho: 112,
      celda: (v) =>
        v.estado === 'anulada' ? (
          <span className="text-subtle line-through">
            <Dinero valor={v.total} />
          </span>
        ) : (
          <Dinero valor={v.total} />
        ),
    },
    {
      id: 'estado',
      encabezado: 'Estado',
      ordenar: (v) => v.estado,
      ancho: 130,
      celda: (v) => <BadgeEstado estado={ESTADOS_VENTA[v.estado]} tamano="sm" />,
    },
  ];

  return (
    <div data-testid="pagina-ventas">
      <EncabezadoPagina
        migas={[...(esVendedor ? [] : [{ texto: 'Inicio', a: rutas.inicio() }]), { texto: 'Ventas' }]}
        titulo={TEXTOS.lista.titulo}
        subtitulo={esVendedor ? TEXTOS.lista.subtituloVendedor : TEXTOS.lista.subtitulo}
        acciones={
          <BotonEnlace to={rutas.pos()} icono={Plus} data-testid="ventas-registrar">
            Registrar venta
          </BotonEnlace>
        }
      />

      <div className="mt-8">
        <BarraTotales totales={totales} />
        <p className="mt-2 t-small text-muted" data-testid="ventas-nota-totales">
          {TEXTOS.lista.notaTotales}
        </p>
      </div>

      <Table
        className={cn(
          'mt-4 transition-opacity duration-(--dur-fast)',
          texto !== textoDiferido && 'opacity-60',
        )}
        data-testid="ventas-tabla"
        etiqueta="Ventas"
        columnas={columnas}
        filas={filas}
        clave={(v) => v.id}
        sustantivo={['venta', 'ventas']}
        densidad={densidad}
        alAbrir={(v) => navigate(rutas.venta(v.id))}
        resaltada={(v) => v.id === params.resaltar}
        totales={{
          numero: <span className="whitespace-nowrap t-eyebrow text-ink-2">Totales</span>,
          unidades: entero(totales.unidades),
          total: <Dinero valor={totales.netas} data-testid="tabla-total-netas" />,
        }}
        vacio={vacio}
        barra={
          <div id="ventas-barra" className="scroll-mt-(--sticky-top)">
            <BarraFiltros
              hoy={hoy}
              resueltos={resueltos}
              params={efectivos}
              opciones={opciones}
              etiquetas={etiquetas}
              historial={historial}
              texto={texto}
              alCambiarTexto={setTexto}
              alCambiar={cambiar}
              alLimpiar={limpiar}
              esVendedor={esVendedor}
              derecha={
                <>
                  <SelectorDensidad valor={densidad} alCambiar={setDensidad} />
                  <BotonExportar
                    reporte="ventas"
                    menu
                    filtros={filtro}
                  />
                </>
              }
            />
          </div>
        }
        accionesFila={(v) => (
          <Menu
            etiqueta={`Acciones de ${v.numero}`}
            ancho={240}
            disparador={<BotonAccionesFila aria-label={`Más acciones de ${v.numero}`} />}
          >
            <ItemMenuEnlace icono={Eye}>
              <Link to={rutas.venta(v.id)}>Ver detalle</Link>
            </ItemMenuEnlace>
            {puede('devolucion.registrar') &&
            v.estado !== 'anulada' &&
            v.estado !== 'devuelta' &&
            v.estado !== 'separado' ? (
              <ItemMenuEnlace icono={Undo2}>
                <Link to={rutas.devolucion(v.id)}>Cambio o devolución</Link>
              </ItemMenuEnlace>
            ) : (
              <ItemMenu icono={Undo2} deshabilitado>
                Cambio o devolución
              </ItemMenu>
            )}
          </Menu>
        )}
      />
    </div>
  );
}

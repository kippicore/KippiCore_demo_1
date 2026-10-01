import { ArrowRightLeft, Eye, LayoutGrid, Package, Plus, Printer, Table2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Categoria } from '@/dominio/tipos';
import { useFiltroLocal, usePuede, useRolActivo, useSel } from '@/estado';
import { selCatalogo, selEnTransito, selLocales, type EstadoStock, type FilaCatalogo } from '@/selectores';
import { rutas, type QueryDe } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { ESTADOS_INVENTARIO } from '@/config/estados';
import { entero, plural, porcentaje } from '@/lib/formato';
import { NOMBRES_CATEGORIA, NOMBRES_LINEA } from '@/seed/catalogo';
import {
  BadgeEstado,
  BotonAccionesFila,
  BotonEnlace,
  BotonExportar,
  BotonFiltros,
  BotonPildora,
  Button,
  Dinero,
  EmptyState,
  EncabezadoPagina,
  FranjaResumen,
  ImportarExcelSimulado,
  ItemMenu,
  Menu,
  MiniaturaPrenda,
  Pista,
  Segmentado,
  Select,
  SelectorDensidad,
  Table,
  Toolbar,
  useDensidadTabla,
  type ColumnaTabla,
} from '@/ui';
import { PestanasModulo } from '../componentes/comun';
import { TarjetaProducto } from '../componentes/TarjetaProducto';
import { selColoresPorProducto, selEnCaminoPorProducto, selOpcionesCatalogo } from '../selectores';
import { CATEGORIAS_ORDEN, ESTADOS_STOCK, SUBTITULOS, VACIOS } from '../textos';

type QueryCatalogo = QueryDe<'inventario'>;

const POR_PAGINA_TARJETAS = 24;

export default function Catalogo() {
  const params = useParamsRuta('inventario');
  const navegar = useNavigate();
  const rol = useRolActivo();
  const puede = usePuede();
  const contexto = useFiltroLocal();
  const verCostos = puede('ver.costos');
  const puedeCrear = puede('producto.crear');
  const vista = params.vista ?? 'tabla';
  const [densidad, setDensidad] = useDensidadTabla('inventario');
  const [paginacion, setPaginacion] = useState({ firma: '', limite: POR_PAGINA_TARJETAS });

  const localesTodos = useSel(selLocales, { incluirBodega: true });
  // El vendedor está fijo en su local; los demás eligen (por defecto, el del contexto).
  const localFijo = rol === 'vendedor';
  const localEfectivo = localFijo ? contexto : (params.local ?? contexto);
  const localValido = localEfectivo === 'todos' || localesTodos.some((l) => l.id === localEfectivo) ? localEfectivo : 'todos';
  const nombreLocalEfectivo = localValido === 'todos' ? 'Todos' : (localesTodos.find((l) => l.id === localValido)?.nombre ?? localValido);

  const categoria = CATEGORIAS_ORDEN.find((c) => c === params.categoria) ?? null;
  const stock = ESTADOS_STOCK.find((s) => s.valor === params.stock)?.valor ?? null;
  const opciones = useSel(selOpcionesCatalogo);
  const talla = opciones.tallas.includes(params.talla ?? '') ? (params.talla as string) : null;
  const colorId = opciones.colores.find((c) => c.id === params.color)?.id ?? null;
  const proveedorId = opciones.proveedores.find((p) => p.id === params.proveedor)?.id ?? null;
  const texto = params.texto ?? '';

  const filas = useSel(selCatalogo, {
    categoria: categoria ?? undefined,
    talla: talla ?? undefined,
    colorId: colorId ?? undefined,
    localId: localValido,
    proveedorId: proveedorId ?? undefined,
    stock: (stock ?? undefined) as EstadoStock | undefined,
    texto: texto || undefined,
  });
  const coloresPor = useSel(selColoresPorProducto);
  const enCaminoPor = useSel(selEnCaminoPorProducto);
  const transito = useSel(selEnTransito);

  const ir = (cambios: Partial<QueryCatalogo>) => {
    navegar(
      rutas.inventario({
        categoria: params.categoria,
        talla: params.talla,
        color: params.color,
        local: params.local,
        proveedor: params.proveedor,
        stock: params.stock,
        texto: params.texto,
        vista: params.vista,
        ...cambios,
      }),
      { replace: true },
    );
  };

  const filtrosActivos = [categoria, talla, colorId, proveedorId, stock].filter(Boolean).length;
  const hayFiltros = filtrosActivos > 0 || !!texto || (!localFijo && params.local !== null && params.local !== undefined);
  const limpiar = () => navegar(rutas.inventario({ vista: params.vista }), { replace: true });

  // Al cambiar los filtros, las tarjetas vuelven a las primeras.
  const firma = `${categoria}|${talla}|${colorId}|${proveedorId}|${stock}|${texto}|${localValido}`;
  const limite = paginacion.firma === firma ? paginacion.limite : POR_PAGINA_TARJETAS;

  const totalUnidades = useMemo(() => filas.reduce((a, f) => a + f.existencias, 0), [filas]);
  // Valor a costo de lo que se ve (existencias del filtro × costo vigente, el mismo método de la valorización).
  const valorACosto = useMemo(() => filas.reduce((a, f) => a + f.existencias * f.producto.costoVigente, 0), [filas]);
  const agotadas = useMemo(() => filas.filter((f) => f.estadoStock === 'agotado').length, [filas]);
  const bajas = useMemo(() => filas.filter((f) => f.estadoStock === 'bajo').length, [filas]);
  const alcance = localValido === 'todos' ? 'en total' : `en ${nombreLocalEfectivo}`;

  const chips = [
    ...(categoria ? [{ id: 'categoria', texto: `Categoría: ${NOMBRES_CATEGORIA[categoria as Categoria]}`, alQuitar: () => ir({ categoria: null }) }] : []),
    ...(talla ? [{ id: 'talla', texto: `Talla: ${talla}`, alQuitar: () => ir({ talla: null }) }] : []),
    ...(colorId ? [{ id: 'color', texto: `Color: ${opciones.colores.find((c) => c.id === colorId)?.nombre ?? ''}`, alQuitar: () => ir({ color: null }) }] : []),
    ...(proveedorId ? [{ id: 'proveedor', texto: `Fábrica: ${opciones.proveedores.find((p) => p.id === proveedorId)?.nombre ?? ''}`, alQuitar: () => ir({ proveedor: null }) }] : []),
    ...(stock ? [{ id: 'stock', texto: `Stock: ${ESTADOS_STOCK.find((s) => s.valor === stock)?.etiqueta ?? ''}`, alQuitar: () => ir({ stock: null }) }] : []),
    ...(!localFijo && params.local ? [{ id: 'local', texto: `Local: ${nombreLocalEfectivo}`, alQuitar: () => ir({ local: null }) }] : []),
  ];

  const columnas: ColumnaTabla<FilaCatalogo>[] = [
    {
      id: 'producto',
      encabezado: 'Producto',
      truncar: true,
      ordenar: (f) => f.producto.nombre,
      celda: (f) => {
        const c = coloresPor[f.producto.id]?.[0];
        return (
          <span className="flex items-center gap-3">
            <MiniaturaPrenda tipo={f.producto.tipoPrenda} color={c?.hex ?? '#C9C9C7'} patron={c?.patron} tamano="tabla" />
            <span className="min-w-0">
              <span className="block truncate t-body font-semibold text-ink">{f.producto.nombre}</span>
              <span className="block truncate t-small text-muted">
                <span className="t-ref">{f.producto.referencia}</span> · {NOMBRES_CATEGORIA[f.producto.categoria]} · {NOMBRES_LINEA[f.producto.linea]}
              </span>
            </span>
          </span>
        );
      },
    },
    {
      id: 'existencias',
      encabezado: 'Existencias',
      numerica: true,
      ancho: 130,
      ordenar: (f) => f.existencias,
      celda: (f) => {
        const camino = enCaminoPor[f.producto.id];
        return (
          <span className="whitespace-nowrap">
            <strong className="font-bold">{entero(f.existencias)}</strong>
            {camino && <span className="block t-small font-normal text-muted">+{entero(camino.unidades)} en camino</span>}
          </span>
        );
      },
    },
    {
      id: 'estado',
      encabezado: 'Estado',
      ancho: 120,
      ordenar: (f) => (f.estadoStock === 'agotado' ? 0 : f.estadoStock === 'bajo' ? 1 : 2),
      celda: (f) =>
        f.estadoStock === 'agotado' ? (
          <BadgeEstado estado={ESTADOS_INVENTARIO.agotado} tamano="sm" />
        ) : f.estadoStock === 'bajo' ? (
          <BadgeEstado estado={ESTADOS_INVENTARIO.stock_bajo} tamano="sm" />
        ) : (
          <span className="t-small text-muted">En stock</span>
        ),
    },
    { id: 'precio', encabezado: 'Precio', numerica: true, ancho: 110, ordenar: (f) => f.producto.precioVenta, celda: (f) => <Dinero valor={f.producto.precioVenta} /> },
    ...(verCostos
      ? ([
          { id: 'costo', encabezado: 'Costo', numerica: true, ancho: 110, ordenar: (f) => f.producto.costoVigente, celda: (f) => (f.producto.costoVigente > 0 ? <Dinero valor={f.producto.costoVigente} /> : <span className="text-disabled">—</span>) },
          { id: 'margen', encabezado: 'Margen', numerica: true, ancho: 90, ordenar: (f) => f.margenPct, celda: (f) => (f.margenPct > 0 ? porcentaje(f.margenPct, 0) : <span className="text-disabled">—</span>) },
        ] satisfies ColumnaTabla<FilaCatalogo>[])
      : []),
  ];

  const vacio = (
    <EmptyState
      tamano="tabla"
      icono={Package}
      titulo={VACIOS.catalogo.titulo}
      texto={VACIOS.catalogo.texto}
      accion={
        hayFiltros ? (
          <Button variante="secondary" onClick={limpiar}>
            Limpiar filtros
          </Button>
        ) : undefined
      }
    />
  );

  const filtroPanel = (
    <BotonFiltros contador={filtrosActivos} anchoPanel={360} data-testid="filtros-catalogo">
      <div className="flex flex-col gap-4">
        <Select
          etiqueta="Categoría"
          valor={categoria ?? '__todas'}
          alCambiar={(v) => ir({ categoria: v === '__todas' ? null : v })}
          opciones={[{ valor: '__todas', etiqueta: 'Todas las categorías' }, ...CATEGORIAS_ORDEN.map((c) => ({ valor: c, etiqueta: NOMBRES_CATEGORIA[c] }))]}
          data-testid="filtro-categoria"
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            etiqueta="Talla"
            valor={talla ?? '__todas'}
            alCambiar={(v) => ir({ talla: v === '__todas' ? null : v })}
            opciones={[{ valor: '__todas', etiqueta: 'Todas' }, ...opciones.tallas.map((t) => ({ valor: t, etiqueta: t }))]}
            data-testid="filtro-talla"
          />
          <Select
            etiqueta="Color"
            valor={colorId ?? '__todos'}
            alCambiar={(v) => ir({ color: v === '__todos' ? null : v })}
            opciones={[{ valor: '__todos', etiqueta: 'Todos' }, ...opciones.colores.map((c) => ({ valor: c.id, etiqueta: c.nombre }))]}
            data-testid="filtro-color"
          />
        </div>
        <Select
          etiqueta="Fábrica"
          valor={proveedorId ?? '__todas'}
          alCambiar={(v) => ir({ proveedor: v === '__todas' ? null : v })}
          opciones={[{ valor: '__todas', etiqueta: 'Todas las fábricas' }, ...opciones.proveedores.map((p) => ({ valor: p.id, etiqueta: p.nombre }))]}
          data-testid="filtro-proveedor"
        />
        <Select
          etiqueta="Estado del stock"
          valor={stock ?? '__todos'}
          alCambiar={(v) => ir({ stock: v === '__todos' ? null : (v as EstadoStock) })}
          opciones={[{ valor: '__todos', etiqueta: 'Cualquiera' }, ...ESTADOS_STOCK.map((s) => ({ valor: s.valor, etiqueta: s.etiqueta }))]}
          data-testid="filtro-stock"
        />
      </div>
    </BotonFiltros>
  );

  const filtroLocal = localFijo ? (
    <BotonPildora etiqueta="Local" valor={nombreLocalEfectivo} />
  ) : (
    <Pista id="inventario.local" className="inline-flex items-center">
      <BotonPildora etiqueta="Local" valor={nombreLocalEfectivo} anchoPanel={260} data-testid="filtro-local">
        <Select
          etiqueta="Existencias de"
          etiquetaOculta
          valor={localValido}
          alCambiar={(v) => ir({ local: v === 'todos' ? 'todos' : v })}
          opciones={[{ valor: 'todos', etiqueta: 'Todos los locales' }, ...localesTodos.map((l) => ({ valor: l.id, etiqueta: l.nombre }))]}
          data-testid="filtro-local-select"
        />
        <p className="mt-3 t-small text-muted">Cada talla y cada color, en cada local. Abre una referencia para ver dónde está cada unidad y moverla.</p>
      </BotonPildora>
    </Pista>
  );

  const barra = (
    <Toolbar
      buscar={{ valor: texto, alCambiar: (v) => ir({ texto: v || null }), placeholder: 'Buscar por nombre, referencia, SKU o código de barras' }}
      filtros={
        <>
          {filtroPanel}
          {filtroLocal}
        </>
      }
      derecha={
        <>
          {vista === 'tabla' && <SelectorDensidad valor={densidad} alCambiar={setDensidad} />}
          <Segmentado
            etiqueta="Vista del catálogo"
            valor={vista}
            alCambiar={(v) => ir({ vista: v })}
            opciones={[
              { valor: 'tabla', etiqueta: <Table2 size={16} aria-hidden />, aria: 'Ver como tabla', 'data-testid': 'vista-tabla' },
              { valor: 'tarjetas', etiqueta: <LayoutGrid size={16} aria-hidden />, aria: 'Ver como tarjetas', 'data-testid': 'vista-tarjetas' },
            ]}
          />
        </>
      }
      chips={chips}
      alLimpiar={limpiar}
    />
  );

  const resaltar = params.resaltar ?? '';

  return (
    <div className="pb-16">
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Inventario' }]}
        titulo="Inventario"
        subtitulo={SUBTITULOS.catalogo}
        acciones={
          <>
            {puedeCrear && <ImportarExcelSimulado que="tus referencias y existencias" />}
            <BotonExportar reporte="inventario" filtros={{ localId: localValido }} menu />
            {puedeCrear && (
              <BotonEnlace to={rutas.productoNuevo()} icono={Plus} data-testid="nuevo-producto">
                Nuevo producto
              </BotonEnlace>
            )}
          </>
        }
        pestanas={<PestanasModulo />}
      />

      <FranjaResumen
        className="mt-8"
        cifras={[
          { etiqueta: 'Referencias', valor: entero(filas.length) },
          { etiqueta: `Unidades ${alcance}`, valor: entero(totalUnidades) },
          { etiqueta: 'Agotadas · con stock bajo', valor: `${entero(agotadas)} · ${entero(bajas)}` },
          verCostos
            ? { etiqueta: 'Valor a costo', valor: <Dinero valor={valorACosto} corta /> }
            : { etiqueta: 'En camino de las fábricas', valor: `${entero(transito.enImportaciones)} uds.` },
        ]}
      />

      <div className="mt-4" data-testid="catalogo">
        {vista === 'tabla' ? (
          <Table
            columnas={columnas}
            filas={filas}
            clave={(f) => f.producto.id}
            sustantivo={['referencia', 'referencias']}
            etiqueta="Catálogo de referencias"
            alAbrir={(f) => navegar(rutas.producto(f.producto.referencia))}
            resaltada={(f) => !!resaltar && (f.producto.id === resaltar || f.producto.referencia === resaltar)}
            totales={{ existencias: entero(totalUnidades) }}
            densidad={densidad}
            barra={barra}
            vacio={vacio}
            data-testid="tabla-catalogo"
            accionesFila={(f) => (
              <Menu etiqueta={`Acciones de ${f.producto.referencia}`} disparador={<BotonAccionesFila aria-label={`Acciones de ${f.producto.referencia}`} />}>
                <ItemMenu icono={Eye} onSelect={() => navegar(rutas.producto(f.producto.referencia))}>
                  Abrir la ficha
                </ItemMenu>
                {puede('traslado.solicitar') && (
                  <ItemMenu icono={ArrowRightLeft} onSelect={() => navegar(rutas.producto(f.producto.referencia))}>
                    Ver dónde está y moverla
                  </ItemMenu>
                )}
                {rol !== 'vendedor' && (
                  <ItemMenu icono={Printer} onSelect={() => navegar(rutas.etiquetas({ producto: f.producto.referencia }))}>
                    Imprimir etiquetas
                  </ItemMenu>
                )}
              </Menu>
            )}
          />
        ) : (
          <div className="border border-line bg-surface">
            {barra}
            {filas.length === 0 ? (
              vacio
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-2 gap-y-6 p-4 md:grid-cols-3 wide:grid-cols-4" data-testid="grilla-catalogo">
                  {filas.slice(0, limite).map((f) => (
                    <TarjetaProducto
                      key={f.producto.id}
                      fila={f}
                      colores={coloresPor[f.producto.id] ?? []}
                      enCamino={enCaminoPor[f.producto.id]}
                      alcance={alcance}
                      verMargen={verCostos}
                      claveResaltar={f.producto.id === resaltar || f.producto.referencia === resaltar ? resaltar : `__${f.producto.id}`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-line-soft px-4 py-3">
                  <p className="t-small num text-muted">
                    Mostrando {entero(Math.min(limite, filas.length))} de {plural(filas.length, 'referencia')}
                  </p>
                  {limite < filas.length && (
                    <Button variante="secondary" tamano="sm" onClick={() => setPaginacion({ firma, limite: limite + POR_PAGINA_TARJETAS })} data-testid="mostrar-mas">
                      Mostrar {entero(Math.min(POR_PAGINA_TARJETAS, filas.length - limite))} más
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

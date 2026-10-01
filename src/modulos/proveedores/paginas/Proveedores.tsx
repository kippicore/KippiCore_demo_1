import { ArrowRight, Eye, Factory, Pencil, Plus, Trash2, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { useFiltroLocal, useHoy, useSel, useSesion } from '@/estado';
import { selLocalesQueVenden } from '@/selectores';
import { entero, plural, porcentaje } from '@/lib/formato';
import {
  BadgeEstado,
  BotonEnlace,
  BotonPildora,
  Button,
  Dinero,
  EmptyState,
  EncabezadoPagina,
  FranjaResumen,
  ImportarExcelSimulado,
  ItemMenu,
  Menu,
  SelectorDensidad,
  Segmentado,
  SeparadorMenu,
  Select,
  Table,
  Toolbar,
  useDensidadTabla,
  type ColumnaTabla,
  type ChipActivo,
} from '@/ui';
import { filtrarDirectorio, valoresUnicos, type FiltrosDirectorio } from '../calculos';
import { BotonMasAcciones, InsigniaDefectos, InsigniaRetraso, InsigniaTipo } from '../componentes/Piezas';
import { useGestionProveedor } from '../componentes/GestionProveedor';
import { NavegacionProveedores } from '../componentes/Navegacion';
import { VistaPorLocal } from '../componentes/VistaPorLocal';
import { selDirectorio, selVistaPorLocal, type FilaDirectorio } from '../selectores';
import { TEXTOS, TIPOS_PROVEEDOR } from '../textos';

type Vista = 'lista' | 'locales';

/** Directorio de proveedores (PRD 7.6): fábricas en China y proveedores locales, con lo comprado y lo que se debe. */
export default function Proveedores() {
  const navegar = useNavigate();
  const hoy = useHoy();
  const { tipo, local, resaltar } = useParamsRuta('proveedores');
  const localBarra = useFiltroLocal();
  const cambiarLocalBarra = useSesion((s) => s.cambiarLocal);
  const todas = useSel(selDirectorio, { hoy });
  const vistas = useSel(selVistaPorLocal, { hoy });
  const locales = useSel(selLocalesQueVenden);
  const [densidad, setDensidad] = useDensidadTabla('proveedores');
  const [vista, setVista] = useState<Vista>('lista');
  const [texto, setTexto] = useState('');
  const [pais, setPais] = useState('todos');
  const [moneda, setMoneda] = useState('todos');

  const gestion = useGestionProveedor({
    alGuardar: (id, creado) => {
      if (!creado) return;
      setTexto('');
      setPais('todos');
      setMoneda('todos');
      navegar(rutas.proveedores({ resaltar: id }), { replace: true });
    },
  });

  const filtros: FiltrosDirectorio = { texto, tipo: tipo ?? 'todos', local: local ?? 'todos', localBarra, pais, moneda };
  const filas = useMemo(() => filtrarDirectorio(todas, filtros), [todas, filtros.texto, filtros.tipo, filtros.local, filtros.localBarra, filtros.pais, filtros.moneda]); // eslint-disable-line react-hooks/exhaustive-deps
  const nombreLocal = (id: string) => locales.find((l) => l.id === id)?.nombre ?? id;

  const irA = (nuevo: { tipo?: 'fabrica' | 'local' | null; local?: string | null }) =>
    navegar(rutas.proveedores({ tipo: nuevo.tipo === undefined ? tipo : nuevo.tipo, local: nuevo.local === undefined ? local : nuevo.local, resaltar }), { replace: true });

  const limpiar = () => {
    setTexto('');
    setPais('todos');
    setMoneda('todos');
    navegar(rutas.proveedores(), { replace: true });
    if (localBarra !== 'todos') cambiarLocalBarra('todos');
  };

  // Cifras de la franja: se recalculan con los filtros.
  const fabricas = filas.filter((f) => f.proveedor.tipo === 'fabrica');
  const resumen = useMemo(() => {
    let comprado = 0;
    let saldo = 0;
    let vencido = 0;
    for (const f of filas) {
      if (f.proveedor.tipo === 'fabrica') comprado += f.totalComprado;
      saldo += f.saldoCop;
      vencido += f.vencidoCop;
    }
    return { comprado, saldo, vencido };
  }, [filas]);

  const paises = useMemo(() => valoresUnicos(todas.map((f) => f.proveedor), 'pais'), [todas]);
  const monedas = useMemo(() => valoresUnicos(todas.map((f) => f.proveedor), 'moneda'), [todas]);

  const chips: ChipActivo[] = [];
  if (tipo) chips.push({ id: 'tipo', texto: `Tipo: ${TIPOS_PROVEEDOR[tipo].plural}`, alQuitar: () => irA({ tipo: null }) });
  if (local) chips.push({ id: 'local', texto: `Local: ${nombreLocal(local)}`, alQuitar: () => irA({ local: null }) });
  else if (localBarra !== 'todos') chips.push({ id: 'local-barra', texto: `${nombreLocal(localBarra)} y proveedores generales`, alQuitar: () => cambiarLocalBarra('todos') });
  if (pais !== 'todos') chips.push({ id: 'pais', texto: `País: ${pais}`, alQuitar: () => setPais('todos') });
  if (moneda !== 'todos') chips.push({ id: 'moneda', texto: `Moneda: ${moneda}`, alQuitar: () => setMoneda('todos') });

  const columnas: ColumnaTabla<FilaDirectorio>[] = [
    {
      id: 'proveedor',
      encabezado: 'Proveedor',
      ordenar: (f) => f.proveedor.nombreCorto,
      truncar: true,
      ancho: 240,
      celda: (f) => (
        <div className="min-w-0">
          <Link to={rutas.proveedor(f.proveedor.id)} onClick={(e) => e.stopPropagation()} className="block truncate font-semibold text-ink underline-offset-4 hover:underline" data-testid={`proveedor-${f.proveedor.id}`}>
            {f.proveedor.nombreCorto}
          </Link>
          <p className="truncate t-small text-muted">
            {f.proveedor.ciudad}, {f.proveedor.pais} · {f.proveedor.moneda}
          </p>
        </div>
      ),
    },
    {
      id: 'tipo',
      encabezado: 'Tipo',
      ordenar: (f) => `${f.proveedor.tipo}-${f.categoriaTexto}`,
      truncar: true,
      ancho: 190,
      celda: (f) => (
        <div className="flex min-w-0 flex-col items-start gap-1 overflow-hidden">
          <InsigniaTipo proveedor={f.proveedor} />
          <span className="max-w-full truncate t-small text-muted">{f.proveedor.tipo === 'fabrica' ? f.categoriaTexto : (f.nombreLocal ?? 'Todo el negocio')}</span>
        </div>
      ),
    },
    {
      id: 'comprado',
      encabezado: 'Comprado',
      numerica: true,
      ordenar: (f) => f.totalComprado,
      celda: (f) => (
        <div className="whitespace-nowrap">
          <Dinero valor={f.totalComprado} />
          <p className="t-small text-muted">
            {f.proveedor.tipo === 'fabrica' ? `${plural(f.pedidos, 'pedido')}${f.enCurso ? ` · ${f.enCurso} en curso` : ''}` : 'Pagado a la fecha'}
          </p>
        </div>
      ),
    },
    {
      id: 'saldo',
      encabezado: 'Por pagar',
      numerica: true,
      ordenar: (f) => f.saldoCop,
      celda: (f) =>
        f.saldoCop > 0 ? (
          <div className="flex flex-col items-end gap-1">
            <Dinero valor={f.saldoCop} />
            {f.vencidoCop > 0 && <BadgeEstado estado={{ etiqueta: 'Vencido', tono: 'danger' }} tamano="sm" />}
          </div>
        ) : (
          <span className="t-small text-muted">Al día</span>
        ),
    },
    {
      id: 'puntualidad',
      encabezado: 'Puntualidad',
      alinear: 'der',
      ordenar: (f) => f.retrasoPromedio,
      celda: (f) =>
        f.proveedor.tipo === 'fabrica' && f.pedidosRecibidos > 0 ? (
          <div className="flex flex-col items-end gap-1">
            <InsigniaRetraso dias={f.retrasoPromedio} />
            <span className="t-small text-muted">{porcentaje(f.aTiempo ?? 0, 0)} a tiempo</span>
          </div>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      id: 'defectos',
      encabezado: 'Defectos',
      alinear: 'der',
      ordenar: (f) => f.defectos,
      celda: (f) => (f.proveedor.tipo === 'fabrica' ? <InsigniaDefectos fraccion={f.defectos} /> : <span className="text-muted">—</span>),
    },
  ];

  const sinProveedores = todas.length === 0;
  const aMostrarTabla = vista === 'lista';

  return (
    <div className="pb-16" data-testid="proveedores-directorio">
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Proveedores' }]}
        titulo={TEXTOS.directorio.titulo}
        subtitulo={TEXTOS.directorio.subtitulo}
        acciones={
          <>
            <ImportarExcelSimulado que="tus proveedores" variante="ghost" />
            <BotonEnlace to={rutas.comparativoFabricas()} variante="secondary" icono={Factory}>
              {TEXTOS.directorio.comparar}
            </BotonEnlace>
            <Button icono={Plus} onClick={gestion.abrirNuevo} data-testid="nuevo-proveedor">
              {TEXTOS.directorio.nuevo}
            </Button>
          </>
        }
        pestanas={<NavegacionProveedores />}
      />

      <FranjaResumen
        className="mt-8"
        cifras={[
          { etiqueta: 'Proveedores', valor: <span data-testid="resumen-proveedores">{entero(filas.length)}<span className="ml-2 t-small font-normal text-muted">{plural(fabricas.length, 'fábrica')}</span></span> },
          { etiqueta: 'Comprado a fábricas', valor: <Dinero valor={resumen.comprado} corta data-testid="resumen-comprado" /> },
          { etiqueta: 'Por pagar', valor: <Dinero valor={resumen.saldo} corta data-testid="resumen-saldo" /> },
          { etiqueta: 'Vencido', valor: <Dinero valor={resumen.vencido} corta data-testid="resumen-vencido" /> },
        ]}
      />

      <div className="mt-6 flex items-center justify-between gap-4">
        <Segmentado<Vista>
          etiqueta="Vista del directorio"
          valor={vista}
          alCambiar={setVista}
          opciones={[
            { valor: 'lista', etiqueta: 'Lista', 'data-testid': 'vista-lista' },
            { valor: 'locales', etiqueta: 'Por local', 'data-testid': 'vista-locales' },
          ]}
        />
        {vista === 'locales' && <p className="t-small text-muted">Arrendadores y servicios de cada local, lado a lado.</p>}
      </div>

      {aMostrarTabla ? (
        <Table
          className="mt-4"
          etiqueta="Directorio de proveedores"
          data-testid="tabla-proveedores"
          columnas={columnas}
          filas={filas}
          clave={(f) => f.proveedor.id}
          sustantivo={['proveedor', 'proveedores']}
          densidad={densidad}
          porPagina={25}
          alAbrir={(f) => navegar(rutas.proveedor(f.proveedor.id))}
          resaltada={(f) => f.proveedor.id === resaltar}
          totales={{ comprado: <Dinero valor={resumen.comprado} />, saldo: <Dinero valor={resumen.saldo} /> }}
          accionesFila={(f) => (
            <Menu disparador={<BotonMasAcciones aria-label={`Más acciones de ${f.proveedor.nombreCorto}`} />} alinear="end">
              <ItemMenu icono={Eye} onSelect={() => navegar(rutas.proveedor(f.proveedor.id))}>
                Ver ficha
              </ItemMenu>
              {f.proveedor.tipo === 'fabrica' && (
                <ItemMenu icono={ArrowRight} onSelect={() => navegar(rutas.sugerirPedido({ proveedor: f.proveedor.id, desde: 'proveedor' }))}>
                  Sugerir próximo pedido
                </ItemMenu>
              )}
              <ItemMenu icono={Pencil} onSelect={() => gestion.abrirEditar(f.proveedor)}>
                Editar
              </ItemMenu>
              <SeparadorMenu />
              <ItemMenu icono={Trash2} peligro onSelect={() => gestion.pedirEliminar({ proveedor: f.proveedor, saldoCop: f.saldoCop, pedidos: f.pedidos, enCurso: f.enCurso })}>
                Eliminar
              </ItemMenu>
            </Menu>
          )}
          vacio={
            sinProveedores ? (
              <EmptyState
                tamano="tabla"
                icono={Truck}
                titulo={TEXTOS.directorio.sinProveedoresTitulo}
                texto={TEXTOS.directorio.sinProveedoresTexto}
                accion={
                  <Button icono={Plus} onClick={gestion.abrirNuevo}>
                    {TEXTOS.directorio.nuevo}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                tamano="tabla"
                icono={Truck}
                titulo={TEXTOS.directorio.vacioTitulo}
                texto={TEXTOS.directorio.vacioTexto}
                accion={
                  <Button variante="secondary" onClick={limpiar}>
                    Limpiar filtros
                  </Button>
                }
              />
            )
          }
          barra={
            <Toolbar
              buscar={{ valor: texto, alCambiar: setTexto, placeholder: TEXTOS.directorio.buscar }}
              filtros={
                <>
                  <BotonPildora etiqueta="Tipo" valor={tipo ? TIPOS_PROVEEDOR[tipo].plural : 'Todos'} data-testid="filtro-tipo">
                    <Select
                      etiqueta="Tipo"
                      etiquetaOculta
                      valor={tipo ?? 'todos'}
                      alCambiar={(v) => irA({ tipo: v === 'todos' ? null : (v as 'fabrica' | 'local') })}
                      enModal
                      opciones={[
                        { valor: 'todos', etiqueta: 'Todos' },
                        { valor: 'fabrica', etiqueta: TIPOS_PROVEEDOR.fabrica.plural },
                        { valor: 'local', etiqueta: TIPOS_PROVEEDOR.local.plural },
                      ]}
                    />
                  </BotonPildora>
                  <BotonPildora etiqueta="Local" valor={local ? nombreLocal(local) : 'Todos'} data-testid="filtro-local">
                    <Select
                      etiqueta="Local"
                      etiquetaOculta
                      valor={local ?? 'todos'}
                      alCambiar={(v) => irA({ local: v === 'todos' ? null : v })}
                      enModal
                      opciones={[{ valor: 'todos', etiqueta: 'Todos' }, ...locales.map((l) => ({ valor: l.id, etiqueta: l.nombre }))]}
                    />
                  </BotonPildora>
                  <BotonPildora etiqueta="País" valor={pais === 'todos' ? 'Todos' : pais} data-testid="filtro-pais">
                    <Select etiqueta="País" etiquetaOculta valor={pais} alCambiar={setPais} enModal opciones={[{ valor: 'todos', etiqueta: 'Todos' }, ...paises.map((p) => ({ valor: p, etiqueta: p }))]} />
                  </BotonPildora>
                  <BotonPildora etiqueta="Moneda" valor={moneda === 'todos' ? 'Todas' : moneda} data-testid="filtro-moneda">
                    <Select etiqueta="Moneda" etiquetaOculta valor={moneda} alCambiar={setMoneda} enModal opciones={[{ valor: 'todos', etiqueta: 'Todas' }, ...monedas.map((m) => ({ valor: m, etiqueta: m }))]} />
                  </BotonPildora>
                </>
              }
              derecha={<SelectorDensidad valor={densidad} alCambiar={setDensidad} />}
              chips={chips}
              alLimpiar={limpiar}
            />
          }
        />
      ) : (
        <div className="mt-4">
          <VistaPorLocal vistas={vistas} localActivo={localBarra} alRegistrar={gestion.abrirNuevo} />
        </div>
      )}
      {gestion.dialogos}
    </div>
  );
}


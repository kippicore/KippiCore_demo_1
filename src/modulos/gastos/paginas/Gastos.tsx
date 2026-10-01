import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { MoreHorizontal, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import {
  Badge,
  BadgeEstado,
  BotonIcono,
  BotonExportar,
  BotonPildora,
  Button,
  ConfirmarEliminacion,
  Dinero,
  Drawer,
  EmptyState,
  Fecha,
  ItemMenu,
  Kpi,
  Menu,
  ParesDatos,
  Select,
  Switch,
  Table,
  Toolbar,
  avisar,
  type ColumnaTabla,
} from '@/ui';
import { ESTADOS_POR_PAGAR } from '@/config/estados';
import type { CategoriaGasto, Gasto } from '@/dominio/tipos';
import { useAcciones, useDinero, useSel } from '@/estado';
import { mesAnio, mesCorto } from '@/lib/formato';
import { sumarMesesAMes } from '@/lib/fechas';
import { rutas } from '@/app/rutas';
import { rangoDeMes } from '../calculos';
import { EncabezadoGastos, LimiteError, SelectorMes } from '../componentes/Piezas';
import { FormularioGasto } from '../componentes/FormularioGasto';
import { TarjetaPorCategoria, TarjetaPorLocal } from '../componentes/Resumenes';
import { useFiltrosMesLocal } from '../hooks';
import { selGastos } from '@/selectores';
import { selGastoPorId, selGastosPorLocal, selOpcionesGasto, selResumenCategorias, selTarifaIva } from '../selectores';
import { CATEGORIAS, ETIQUETA_CATEGORIA, GENERAL, TEXTOS } from '../textos';

type Origen = { tipo: 'manual' } | { tipo: 'recurrente' } | { tipo: 'caja' | 'nomina' | 'datafono'; a: string; etiqueta: string };

/** De dónde nació un gasto: a mano, de una plantilla recurrente o de otro módulo (caja, nómina, datáfono). */
export function origenDe(g: Gasto): Origen {
  const d = g.documento;
  if (d?.tipo === 'sesion_caja') return { tipo: 'caja', a: rutas.caja({ sesion: d.id }), etiqueta: 'Ver el cierre de caja' };
  if (d?.tipo === 'liquidacion') return { tipo: 'nomina', a: rutas.liquidacion(d.id), etiqueta: 'Ver la liquidación de nómina' };
  if (d?.tipo === 'abono_datafono') return { tipo: 'datafono', a: rutas.datafono({ mes: g.fecha.slice(0, 7) }), etiqueta: 'Ver el datáfono' };
  return g.recurrenteId ? { tipo: 'recurrente' } : { tipo: 'manual' };
}

const sinTildes = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export default function Gastos() {
  const f = useFiltrosMesLocal('gastos');
  const [formulario, setFormulario] = useState<{ gasto: Gasto | null } | null>(null);
  const navegar = useNavigate();
  const rango = rangoDeMes(f.mes);
  return (
    <>
      <EncabezadoGastos
        titulo={TEXTOS.gastos.titulo}
        subtitulo={TEXTOS.gastos.subtitulo}
        mes={f.mes}
        local={f.localDeLaUrl ? f.local : null}
        acciones={
          <>
            <BotonExportar reporte="gastos" menu filtros={{ ...rango, localId: f.local === GENERAL ? 'todos' : f.local }} />
            <Button icono={Plus} onClick={() => setFormulario({ gasto: null })} data-testid="gastos-registrar">
              Registrar gasto
            </Button>
          </>
        }
      />
      <LimiteError>
        <CuerpoGastos f={f} alEditar={(gasto) => setFormulario({ gasto })} alRegistrar={() => setFormulario({ gasto: null })} />
      </LimiteError>
      {formulario && (
        <FormularioGasto
          key={formulario.gasto?.id ?? 'nuevo'}
          gasto={formulario.gasto}
          localInicial={f.local === 'todos' ? GENERAL : f.local}
          alCerrar={() => setFormulario(null)}
          alGuardar={(id, mes) => {
            setFormulario(null);
            navegar(rutas.gastos({ mes, local: f.localDeLaUrl ? f.local : null, resaltar: id }), { replace: true });
          }}
        />
      )}
    </>
  );
}

function CuerpoGastos({ f, alEditar, alRegistrar }: { f: ReturnType<typeof useFiltrosMesLocal>; alEditar: (g: Gasto) => void; alRegistrar: () => void }) {
  const dinero = useDinero();
  const acciones = useAcciones();
  const opciones = useSel(selOpcionesGasto);
  const tarifa = useSel(selTarifaIva);
  const rango = rangoDeMes(f.mes);
  const esLocal = f.local !== 'todos' && f.local !== GENERAL;

  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState<'todas' | CategoriaGasto>('todas');
  const [pago, setPago] = useState<'todos' | 'pagado' | 'por_pagar'>('todos');
  const [conGenerales, setConGenerales] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [aEliminar, setAEliminar] = useState<Gasto | null>(null);

  const propios = useSel(selGastos, { ...rango, localId: f.local });
  const generales = useSel(selGastos, { ...rango, localId: GENERAL });
  const resumen = useSel(selResumenCategorias, { mes: f.mes, localId: f.local });
  const porLocal = useSel(selGastosPorLocal, { mes: f.mes });
  const detalle = useSel(selGastoPorId, { gastoId: detalleId ?? '' });

  const nombreLocal = useMemo(() => new Map(opciones.locales.map((l) => [l.id, l.nombre])), [opciones.locales]);
  const nombreProveedor = useMemo(() => new Map(opciones.proveedores.map((p) => [p.id, p.nombreCorto])), [opciones.proveedores]);
  const etiquetaLocal = useCallback((g: Gasto) => (g.localId ? (nombreLocal.get(g.localId) ?? g.localId) : 'General'), [nombreLocal]);

  const base = useMemo(() => {
    const juntos = esLocal && conGenerales ? [...propios.filas, ...generales.filas] : propios.filas;
    return [...juntos].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.id < b.id ? -1 : 1));
  }, [esLocal, conGenerales, propios.filas, generales.filas]);

  const filas = useMemo(() => {
    const t = sinTildes(q.trim());
    return base.filter((g) => {
      if (categoria !== 'todas' && g.categoria !== categoria) return false;
      if (pago !== 'todos' && g.estadoPago !== pago) return false;
      if (!t) return true;
      return sinTildes(`${g.concepto} ${g.proveedorId ? (nombreProveedor.get(g.proveedorId) ?? '') : ''} ${etiquetaLocal(g)} ${ETIQUETA_CATEGORIA[g.categoria]}`).includes(t);
    });
  }, [base, q, categoria, pago, nombreProveedor, etiquetaLocal]);

  const totales = useMemo(() => ({ valor: filas.reduce((a, g) => a + g.valor, 0), iva: filas.reduce((a, g) => a + g.iva, 0) }), [filas]);
  const porPagar = useMemo(() => base.filter((g) => g.estadoPago === 'por_pagar'), [base]);
  const mayor = resumen.categorias[0];
  const anterior = sumarMesesAMes(f.mes, -1);
  const mesEnCurso = f.mes === f.hoy.slice(0, 7);
  const filtrosActivos = (categoria !== 'todas' ? 1 : 0) + (pago !== 'todos' ? 1 : 0);

  const limpiar = () => {
    setQ('');
    setCategoria('todas');
    setPago('todos');
  };

  const eliminar = () => {
    if (!aEliminar) return;
    const r = acciones.eliminarGasto({ gastoId: aEliminar.id, motivo: null });
    if (!r.ok) avisar({ tipo: 'error', texto: r.error.mensaje });
    else {
      avisar({ tipo: 'exito', texto: 'Gasto eliminado', detalle: aEliminar.concepto });
      if (detalleId === aEliminar.id) setDetalleId(null);
    }
    setAEliminar(null);
  };

  const columnas: ColumnaTabla<Gasto>[] = [
    { id: 'fecha', encabezado: 'Fecha', ancho: 110, celda: (g) => <Fecha valor={g.fecha} />, ordenar: (g) => g.fecha },
    {
      id: 'concepto',
      encabezado: 'Concepto',
      truncar: true,
      ancho: '28%',
      celda: (g) => {
        const o = origenDe(g);
        return (
          <span className="inline-flex min-w-0 items-center gap-2">
            <span className="truncate">{g.concepto}</span>
            {o.tipo === 'recurrente' && <Badge tamano="sm">Recurrente</Badge>}
            {(o.tipo === 'caja' || o.tipo === 'nomina' || o.tipo === 'datafono') && (
              <Badge tamano="sm" tono="outline">
                Automático
              </Badge>
            )}
          </span>
        );
      },
      ordenar: (g) => g.concepto,
    },
    { id: 'categoria', encabezado: 'Categoría', truncar: true, ancho: '17%', celda: (g) => ETIQUETA_CATEGORIA[g.categoria], ordenar: (g) => ETIQUETA_CATEGORIA[g.categoria] },
    { id: 'local', encabezado: 'Local', truncar: true, ancho: '11%', celda: (g) => etiquetaLocal(g), ordenar: (g) => etiquetaLocal(g) },
    {
      id: 'proveedor',
      encabezado: 'Proveedor',
      truncar: true,
      celda: (g) => (g.proveedorId ? (nombreProveedor.get(g.proveedorId) ?? '—') : '—'),
    },
    {
      id: 'pago',
      encabezado: 'Pago',
      celda: (g) => (g.estadoPago === 'pagado' ? <BadgeEstado estado={ESTADOS_POR_PAGAR.pagado} tamano="sm" /> : <Badge tono={ESTADOS_POR_PAGAR.pendiente.tono} tamano="sm">Por pagar</Badge>),
      ordenar: (g) => g.estadoPago,
    },
    { id: 'iva', encabezado: 'IVA', numerica: true, alinear: 'der', celda: (g) => <Dinero valor={g.iva} />, ordenar: (g) => g.iva },
    { id: 'valor', encabezado: 'Valor', numerica: true, alinear: 'der', celda: (g) => <Dinero valor={g.valor} />, ordenar: (g) => g.valor },
  ];

  const detalleOrigen = detalle ? origenDe(detalle) : null;
  const manual = detalleOrigen?.tipo === 'manual' || detalleOrigen?.tipo === 'recurrente';

  return (
    <div className="mt-8 flex flex-col gap-10">
      <section aria-label="Mes y local" className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <SelectorMes hoy={f.hoy} valor={f.mes} alCambiar={(mes) => f.cambiar({ mes })} className="w-[240px]" />
        <Select
          etiqueta="Local"
          valor={f.local}
          alCambiar={(local) => f.cambiar({ local })}
          className="w-[240px]"
          data-testid="gastos-selector-local"
          opciones={[{ valor: 'todos', etiqueta: 'Todos los locales' }, ...opciones.locales.map((l) => ({ valor: l.id, etiqueta: l.nombre })), { valor: GENERAL, etiqueta: 'Solo gastos generales' }]}
        />
        {esLocal && (
          <Switch etiqueta="Incluir gastos generales" activo={conGenerales} alCambiar={setConGenerales} valorTexto={conGenerales ? 'Con los generales' : 'Solo del local'} />
        )}
        {mesEnCurso && <p className="max-w-[48ch] pb-2 t-small text-muted">{TEXTOS.gastos.mesEnCurso}</p>}
      </section>

      <section aria-label="Cifras del mes" className="grid grid-cols-2 gap-4 wide:grid-cols-4">
        <Kpi
          etiqueta="Gastos del mes"
          valor={resumen.total}
          formatear={dinero.corta}
          completo={dinero(resumen.total)}
          destacada
          variacion={{ valor: resumen.totalAnterior ? (resumen.total - resumen.totalAnterior) / resumen.totalAnterior : null, comparado: `vs. ${mesCorto(anterior)}`, buenoCuando: 'baja' }}
          data-testid="gastos-kpi-total"
        />
        <Kpi
          etiqueta="Lo que más pesa"
          valor={mayor?.actual ?? 0}
          formatear={dinero.corta}
          completo={dinero(mayor?.actual ?? 0)}
          nota={mayor && resumen.total > 0 ? `${ETIQUETA_CATEGORIA[mayor.categoria]} · ${Math.round((mayor.actual / resumen.total) * 100)} % de los gastos` : 'Sin gastos en este mes'}
        />
        <Kpi
          etiqueta="Por pagar todavía"
          valor={porPagar.reduce((a, g) => a + g.valor, 0)}
          formatear={dinero.corta}
          completo={dinero(porPagar.reduce((a, g) => a + g.valor, 0))}
          nota={porPagar.length === 0 ? 'Todo está pagado' : `${porPagar.length} ${porPagar.length === 1 ? 'gasto sin pagar' : 'gastos sin pagar'}`}
          a={porPagar.length > 0 ? rutas.porPagar({ local: esLocal ? f.local : null }) : undefined}
        />
        <Kpi
          etiqueta="IVA en los gastos"
          valor={base.reduce((a, g) => a + g.iva, 0)}
          formatear={dinero.corta}
          completo={dinero(base.reduce((a, g) => a + g.iva, 0))}
          nota={`Incluido en los valores · tarifa ${Math.round(tarifa * 100)} %`}
        />
      </section>

      <section aria-label="Resumen" className="grid grid-cols-1 gap-6 wide:grid-cols-2">
        <TarjetaPorCategoria resumen={resumen} />
        <TarjetaPorLocal filas={porLocal.filas} total={porLocal.total} />
      </section>

      <section aria-label="Gastos del mes" data-testid="gastos-tabla">
        <Table
          columnas={columnas}
          filas={filas}
          clave={(g) => g.id}
          sustantivo={['gasto', 'gastos']}
          etiqueta="Gastos del mes"
          alAbrir={(g) => setDetalleId(g.id)}
          resaltada={(g) => g.id === f.resaltar}
          porPagina={25}
          ordenInicial={{ id: 'fecha', dir: 'desc' }}
          totales={{ iva: <Dinero valor={totales.iva} />, valor: <Dinero valor={totales.valor} /> }}
          vacio={
            <EmptyState
              tamano="tabla"
              icono={Receipt}
              titulo={TEXTOS.gastos.vacioTitulo}
              texto={TEXTOS.gastos.vacioTexto}
              accion={
                <div className="flex gap-2">
                  {(q || filtrosActivos > 0) && (
                    <Button variante="secondary" onClick={limpiar}>
                      Limpiar filtros
                    </Button>
                  )}
                  <Button icono={Plus} onClick={alRegistrar}>
                    Registrar gasto
                  </Button>
                </div>
              }
            />
          }
          accionesFila={(g) => {
            const o = origenDe(g);
            if (o.tipo !== 'manual' && o.tipo !== 'recurrente') return null;
            return (
              <Menu etiqueta={`Acciones de ${g.concepto}`} disparador={<BotonIcono icono={MoreHorizontal} etiqueta={`Acciones de ${g.concepto}`} tamano="sm" sinTooltip />}>
                <ItemMenu icono={Pencil} onSelect={() => alEditar(g)}>
                  Editar
                </ItemMenu>
                <ItemMenu icono={Trash2} peligro onSelect={() => setAEliminar(g)}>
                  Eliminar
                </ItemMenu>
              </Menu>
            );
          }}
          barra={
            <Toolbar
              buscar={{ valor: q, alCambiar: setQ, placeholder: 'Buscar por concepto, proveedor o categoría' }}
              filtros={
                <>
                  <BotonPildora etiqueta="Categoría" valor={categoria === 'todas' ? undefined : ETIQUETA_CATEGORIA[categoria]}>
                    <Select
                      etiqueta="Categoría"
                      etiquetaOculta
                      valor={categoria}
                      alCambiar={(v) => setCategoria(v as 'todas' | CategoriaGasto)}
                      opciones={[{ valor: 'todas', etiqueta: 'Todas las categorías' }, ...CATEGORIAS.map((c) => ({ valor: c, etiqueta: ETIQUETA_CATEGORIA[c] }))]}
                    />
                  </BotonPildora>
                  <BotonPildora etiqueta="Pago" valor={pago === 'todos' ? undefined : pago === 'pagado' ? 'Pagados' : 'Por pagar'}>
                    <Select
                      etiqueta="Pago"
                      etiquetaOculta
                      valor={pago}
                      alCambiar={(v) => setPago(v as 'todos' | 'pagado' | 'por_pagar')}
                      opciones={[
                        { valor: 'todos', etiqueta: 'Pagados y por pagar' },
                        { valor: 'pagado', etiqueta: 'Solo pagados' },
                        { valor: 'por_pagar', etiqueta: 'Solo por pagar' },
                      ]}
                    />
                  </BotonPildora>
                </>
              }
              chips={[
                ...(categoria !== 'todas' ? [{ id: 'cat', texto: `Categoría: ${ETIQUETA_CATEGORIA[categoria]}`, alQuitar: () => setCategoria('todas') }] : []),
                ...(pago !== 'todos' ? [{ id: 'pago', texto: pago === 'pagado' ? 'Solo pagados' : 'Solo por pagar', alQuitar: () => setPago('todos') }] : []),
              ]}
              alLimpiar={limpiar}
            />
          }
        />
      </section>

      <Drawer
        abierto={!!detalle}
        alCambiar={(a) => !a && setDetalleId(null)}
        eyebrow="Gasto"
        titulo={detalle?.concepto ?? ''}
        data-testid="gastos-detalle"
        insignia={
          detalle &&
          (detalle.estadoPago === 'pagado' ? <BadgeEstado estado={ESTADOS_POR_PAGAR.pagado} /> : <Badge tono={ESTADOS_POR_PAGAR.pendiente.tono}>Por pagar</Badge>)
        }
        pie={
          detalle && manual ? (
            <>
              <Button variante="secondary" icono={Pencil} onClick={() => alEditar(detalle)}>
                Editar
              </Button>
              <Button variante="destructive" icono={Trash2} onClick={() => setAEliminar(detalle)}>
                Eliminar
              </Button>
            </>
          ) : undefined
        }
      >
        {detalle && (
          <>
            <ParesDatos
              pares={[
                ['Fecha', <Fecha key="f" valor={detalle.fecha} formato="larga" />],
                ['Local', etiquetaLocal(detalle)],
                ['Categoría', ETIQUETA_CATEGORIA[detalle.categoria]],
                ['Proveedor', detalle.proveedorId ? (nombreProveedor.get(detalle.proveedorId) ?? '—') : '—'],
                ['Valor total', <Dinero key="v" valor={detalle.valor} />],
                ['IVA incluido', <Dinero key="i" valor={detalle.iva} />],
                ['Valor sin IVA', <Dinero key="s" valor={detalle.valor - detalle.iva} />],
                ['Pago', detalle.estadoPago === 'pagado' ? `Pagado${detalle.medio ? ` · ${detalle.medio}` : ''}` : 'Por pagar'],
                ['Soporte', detalle.soporte ? `${detalle.soporte.nombreArchivo}${detalle.soporte.estado === 'pendiente' ? ' (pendiente)' : ''}` : 'Sin soporte'],
              ]}
            />
            {detalleOrigen && detalleOrigen.tipo !== 'manual' && (
              <div className="border-t border-line-soft pt-6">
                {detalleOrigen.tipo === 'recurrente' ? (
                  <p className="t-body text-ink-2">Se generó solo desde un gasto recurrente. Si cambia el arriendo o el servicio, edita la plantilla y el próximo mes sale con el valor nuevo.</p>
                ) : (
                  <>
                    <p className="t-body text-ink-2">{TEXTOS.gastos.sistema}</p>
                    <Link to={detalleOrigen.a} className="mt-3 inline-block t-label font-bold text-ink underline underline-offset-4">
                      {detalleOrigen.etiqueta}
                    </Link>
                  </>
                )}
              </div>
            )}
            {detalle.estadoPago === 'por_pagar' && detalle.cuentaPorPagarId && (
              <div className="border-t border-line-soft pt-6">
                <p className="t-body text-ink-2">Este gasto está en la lista de lo que debes.</p>
                <Link to={rutas.porPagar({ resaltar: detalle.cuentaPorPagarId })} className="mt-3 inline-block t-label font-bold text-ink underline underline-offset-4">
                  Ver en lo que debo
                </Link>
              </div>
            )}
          </>
        )}
      </Drawer>

      <ConfirmarEliminacion
        abierto={!!aEliminar}
        alCambiar={(a) => !a && setAEliminar(null)}
        pregunta={`¿Eliminar el gasto «${aEliminar?.concepto ?? ''}»?`}
        consecuencias={
          aEliminar && (
            <>
              Se quitan <Dinero valor={aEliminar.valor} /> de los gastos de {mesAnio(aEliminar.fecha.slice(0, 7))} y el estado de resultados de ese mes se recalcula.{' '}
              {aEliminar.estadoPago === 'pagado' ? 'Como ya estaba pagado, la cuenta recupera la plata con un ajuste en su libro.' : 'También desaparece de lo que debes.'}
            </>
          )
        }
        accion="Eliminar gasto"
        alConfirmar={eliminar}
      />
    </div>
  );
}

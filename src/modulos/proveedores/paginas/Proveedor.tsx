import { ArrowRight, Pencil, Trash2, Truck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { useAcciones, useDinero, useHoy, useSel } from '@/estado';
import { selCuentasPorPagar, selFichaProveedor, selImportaciones, selSugerenciaPedido } from '@/selectores';
import { cifraCorta, entero, nit as formatoNit, numero, plural, porcentaje } from '@/lib/formato';
import { dineroOrigen } from '@/lib/moneda';
import {
  BotonAccionesFila,
  Badge,
  BotonEnlace,
  Button,
  Card,
  Dinero,
  EmptyState,
  EncabezadoPagina,
  EncabezadoSeccion,
  FranjaResumen,
  Fecha,
  ItemMenu,
  Kpi,
  Menu,
  ParesDatos,
  SeparadorMenu,
  avisar,
  useNombreLocal,
} from '@/ui';
import { etiquetaRetraso } from '../calculos';
import { Contactos } from '../componentes/Contactos';
import { CuentasPorPagarProveedor, PagosRecientes } from '../componentes/CuentasProveedor';
import { useGestionProveedor } from '../componentes/GestionProveedor';
import { HistorialPedidos } from '../componentes/HistorialPedidos';
import { Estrellas, InsigniaTipo } from '../componentes/Piezas';
import { selComparativo, selContactosProveedor, selEntregas, selPagosProveedor } from '../selectores';
import { CATEGORIAS_LOCAL, CATEGORIAS_PRODUCTO, NOMBRES_MONEDA, TEXTOS } from '../textos';

/** Ficha de un proveedor (PRD 7.6): contacto, condiciones, historial, lo comprado, lo que se debe y cómo cumple. */
export default function Proveedor() {
  const { proveedorId } = useParamsRuta('proveedor');
  const navegar = useNavigate();
  const hoy = useHoy();
  const d = useDinero();
  const acciones = useAcciones();
  const ficha = useSel(selFichaProveedor, { proveedorId, hoy });
  const importaciones = useSel(selImportaciones, { hoy, proveedorId });
  const entregas = useSel(selEntregas, { proveedorId });
  const contactos = useSel(selContactosProveedor, { proveedorId });
  const cuentas = useSel(selCuentasPorPagar, { hoy, proveedorId, estado: 'pendientes' });
  const pagos = useSel(selPagosProveedor, { proveedorId, limite: 12 });
  const sugerencia = useSel(selSugerenciaPedido, { proveedorId, coberturaDias: 90, hoy });
  const comparativo = useSel(selComparativo, { hoy });
  const gestion = useGestionProveedor({ alEliminar: () => navegar(rutas.proveedores(), { replace: true }) });

  const proveedor = ficha?.proveedor ?? null;
  if (!ficha || !proveedor || proveedor.eliminadoEn) {
    return (
      <div className="pb-16" data-testid="proveedor-no-encontrado">
        <EncabezadoPagina migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Proveedores', a: rutas.proveedores() }, { texto: 'Proveedor' }]} titulo="Proveedor" />
        <Card className="mt-8" padding="ninguno">
          <EmptyState
            icono={Truck}
            titulo={TEXTOS.ficha.noEncontradoTitulo}
            texto={TEXTOS.ficha.noEncontradoTexto}
            accion={<BotonEnlace to={rutas.proveedores()}>Ir al directorio</BotonEnlace>}
          />
        </Card>
      </div>
    );
  }

  const fabrica = proveedor.tipo === 'fabrica';
  const enCurso = importaciones.filter((f) => f.importacion.estado !== 'recibido_bodega').length;
  const dinKpi = (cop: number) => ({ valor: d.convertir(cop), formatear: (n: number) => cifraCorta(n, d.moneda), completo: d(cop) });
  const promedioDefectos = (() => {
    const v = comparativo.filter((f) => f.defectos !== null && f.pedidosRecibidos > 0).map((f) => f.defectos ?? 0);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  })();
  const enlacePagos = rutas.porPagar({ resaltar: cuentas.filas[0]?.cxp.id });

  const cambiarCalificacion = (n: 1 | 2 | 3 | 4 | 5) => {
    if (n === proveedor.calificacion) return;
    const r = acciones.editarProveedor({ proveedorId: proveedor.id, cambios: { calificacion: n } });
    if (!r.ok) return avisar({ tipo: 'error', texto: r.error.mensaje });
    avisar({ texto: `Tu calificación de ${proveedor.nombreCorto} ahora es ${n} de 5` });
  };

  const pares: [string, ReactNode][] = [
    ['Nombre legal', proveedor.nombre],
    ['Ubicación', `${proveedor.ciudad}, ${proveedor.pais}`],
    ...(proveedor.nit ? ([['NIT', <span key="nit" className="num">{formatoNit(proveedor.nit)}</span>]] as [string, ReactNode][]) : []),
    ['Moneda en la que cobra', NOMBRES_MONEDA[proveedor.moneda]],
    ['Condiciones de pago', proveedor.condicionesPago],
    ...(fabrica && proveedor.diasEntregaPactados ? ([['Producción pactada', plural(proveedor.diasEntregaPactados, 'día')]] as [string, ReactNode][]) : []),
    fabrica
      ? ['Qué fabrica', proveedor.categoriasProducto.length ? proveedor.categoriasProducto.map((c) => CATEGORIAS_PRODUCTO[c]).join(', ') : 'Sin categorías registradas']
      : ['Qué vende', proveedor.categoriaLocal ? CATEGORIAS_LOCAL[proveedor.categoriaLocal] : 'Sin categoría'],
    ...(proveedor.localId ? ([['Local al que atiende', <LocalNombre key="l" id={proveedor.localId} />]] as [string, ReactNode][]) : []),
    ...(proveedor.nota ? ([['Nota', proveedor.nota]] as [string, ReactNode][]) : []),
  ];

  return (
    <div className="pb-16" data-testid="proveedor-ficha" data-proveedor={proveedor.id}>
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Proveedores', a: rutas.proveedores() }, { texto: proveedor.nombreCorto }]}
        titulo={proveedor.nombreCorto}
        insignia={<InsigniaTipo proveedor={proveedor} />}
        subtitulo={`${proveedor.nombre} · ${proveedor.ciudad}, ${proveedor.pais}`}
        acciones={
          <>
            <Menu disparador={<BotonAccionesFila aria-label={`Más acciones de ${proveedor.nombreCorto}`} />} alinear="end">
              <ItemMenu icono={Pencil} onSelect={() => gestion.abrirEditar(proveedor)}>
                Editar datos
              </ItemMenu>
              <SeparadorMenu />
              <ItemMenu icono={Trash2} peligro onSelect={() => gestion.pedirEliminar({ proveedor, saldoCop: ficha.saldoCop, pedidos: ficha.importaciones.length, enCurso })} data-testid="eliminar-proveedor">
                Eliminar proveedor
              </ItemMenu>
            </Menu>
            <Button variante="secondary" icono={Pencil} onClick={() => gestion.abrirEditar(proveedor)} data-testid="editar-proveedor">
              Editar
            </Button>
            {fabrica && (
              <BotonEnlace to={rutas.sugerirPedido({ proveedor: proveedor.id, desde: 'proveedor' })} iconoDerecha={ArrowRight} data-testid="sugerir-pedido">
                Sugerir próximo pedido
              </BotonEnlace>
            )}
          </>
        }
      />

      {fabrica ? (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 wide:grid-cols-6" data-testid="ficha-kpis">
          <Kpi etiqueta="Comprado (FOB)" {...dinKpi(ficha.totalComprado)} nota={plural(ficha.importaciones.length, 'pedido')} data-testid="kpi-comprado" />
          <Kpi
            etiqueta="Por pagar"
            {...dinKpi(ficha.saldoCop)}
            nota={ficha.saldoCop > 0 ? 'Ver en Pagos' : 'Estás al día'}
            a={enlacePagos}
            data-testid="kpi-saldo"
          />
          <Kpi etiqueta="Pedidos" valor={ficha.importaciones.length} formatear={entero} nota={enCurso ? `${enCurso} en curso` : 'Ninguno en curso'} data-testid="kpi-pedidos" />
          <Kpi
            etiqueta="Entrega"
            valor={ficha.entregaPromedio ?? 0}
            formatear={(n) => (ficha.entregaPromedio === null ? '—' : `${numero(n, 0)} días`)}
            nota={ficha.entregaPromedio === null ? 'Sin pedidos recibidos' : 'Del pedido a la bodega'}
            data-testid="kpi-entrega"
          />
          <Kpi
            etiqueta="A tiempo"
            valor={ficha.cumplimiento ?? 0}
            formatear={(n) => (ficha.cumplimiento === null ? '—' : porcentaje(n, 0))}
            nota={ficha.retrasoPromedio === null ? 'Sin pedidos recibidos' : `${etiquetaRetraso(ficha.retrasoPromedio)} en promedio`}
            data-testid="kpi-cumplimiento"
          />
          <Kpi
            etiqueta="Defectos"
            valor={ficha.defectos ?? 0}
            formatear={(n) => (ficha.defectos === null ? '—' : porcentaje(n, 1))}
            nota={ficha.defectos === null || promedioDefectos === null ? 'Sin pedidos recibidos' : `Promedio de las fábricas: ${porcentaje(promedioDefectos, 1)}`}
            data-testid="kpi-defectos"
          />
        </div>
      ) : (
        <FranjaResumen
          className="mt-8"
          cifras={[
            { etiqueta: 'Pagado a la fecha', valor: <Dinero valor={pagos.total} corta data-testid="kpi-comprado" /> },
            { etiqueta: 'Por pagar', valor: <Dinero valor={ficha.saldoCop} corta data-testid="kpi-saldo" /> },
            { etiqueta: 'Pagos registrados', valor: entero(pagos.cantidad) },
            { etiqueta: 'Último pago', valor: pagos.ultimo ? <Fecha valor={pagos.ultimo} /> : '—' },
          ]}
        />
      )}

      <div className="mt-10 grid grid-cols-1 gap-8 wide:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-10 wide:col-span-8">
          {fabrica && sugerencia && (
            <Card data-testid="ficha-sugerencia" className="border-l-2 border-l-accent">
              <p className="t-eyebrow text-accent-ink">Próximo pedido</p>
              <h2 className="mt-1 t-h2">¿Cuánto pedirle a {proveedor.nombreCorto}?</h2>
              {sugerencia.unidades > 0 ? (
                <>
                  <p className="mt-2 max-w-[62ch] t-body text-muted">
                    Con lo que has vendido en las últimas 12 semanas, para cubrir {plural(sugerencia.coberturaDias, 'día')} desde que llegue la mercancía te convendría pedir:
                  </p>
                  <dl className="mt-4 grid grid-cols-3 gap-6">
                    <div>
                      <dt className="t-small text-muted">Prendas</dt>
                      <dd className="t-kpi-sm num" data-testid="sugerencia-unidades">
                        {entero(sugerencia.unidades)}
                      </dd>
                    </div>
                    <div>
                      <dt className="t-small text-muted">Valor FOB</dt>
                      <dd className="t-kpi-sm">
                        <Dinero valor={sugerencia.totalCop} corta />
                        <span className="block t-small font-normal text-muted">{dineroOrigen(sugerencia.totalOrigen, sugerencia.moneda)}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="t-small text-muted">Margen esperado</dt>
                      <dd className="t-kpi-sm num">{porcentaje(sugerencia.margenEsperado, 0)}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="mt-2 max-w-[62ch] t-body text-muted">
                  Por ahora no hace falta pedirle: lo que tienes y lo que viene en camino alcanza para los próximos {plural(sugerencia.coberturaDias, 'día')}.
                </p>
              )}
              <div className="mt-5">
                <BotonEnlace to={rutas.sugerirPedido({ proveedor: proveedor.id, desde: 'proveedor' })} variante="secondary" iconoDerecha={ArrowRight} data-testid="sugerir-pedido-tarjeta">
                  Abrir la sugerencia completa
                </BotonEnlace>
              </div>
            </Card>
          )}

          <section aria-labelledby="titulo-historial">
            <EncabezadoSeccion
              titulo={<span id="titulo-historial">{fabrica ? 'Historial de pedidos' : 'Pagos recientes'}</span>}
              a={fabrica ? rutas.importaciones() : rutas.gastos()}
              textoEnlace={fabrica ? 'Ver importaciones' : 'Ver gastos'}
            />
            {fabrica ? <HistorialPedidos filas={importaciones} entregas={entregas} /> : <PagosRecientes filas={pagos.filas} total={pagos.total} cantidad={pagos.cantidad} />}
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-6 wide:col-span-4">
          <CuentasPorPagarProveedor filas={cuentas.filas} totalCop={cuentas.totalCop} />
          <Card titulo="Condiciones y datos" data-testid="ficha-datos">
            <ParesDatos columnas={1} pares={pares} />
          </Card>
          <Card titulo="Tu calificación" data-testid="ficha-calificacion">
            <Estrellas valor={proveedor.calificacion} alCambiar={cambiarCalificacion} tamano={18} />
            <p className="mt-2 t-small text-muted">
              Es tu opinión de {proveedor.nombreCorto}.{fabrica ? ' La puntualidad y los defectos de arriba salen solos de lo que ha entregado.' : ''}
            </p>
            {fabrica && ficha.cumplimiento !== null && (
              <p className="mt-3 flex items-center gap-2 t-small text-ink-2">
                <Badge tono={ficha.retrasoPromedio !== null && ficha.retrasoPromedio > 5 ? 'warning' : 'success'} tamano="sm">
                  {etiquetaRetraso(ficha.retrasoPromedio)}
                </Badge>
                en promedio frente a lo estimado
              </p>
            )}
          </Card>
          <Contactos proveedor={proveedor} contactos={contactos} />
        </aside>
      </div>
      {gestion.dialogos}
    </div>
  );
}

function LocalNombre({ id }: { id: string }) {
  return <>{useNombreLocal(id)}</>;
}

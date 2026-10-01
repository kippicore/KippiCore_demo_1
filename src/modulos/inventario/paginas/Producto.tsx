import { ArrowRightLeft, MoreHorizontal, PackageSearch, Plus, Printer, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import type { Producto as ProductoDominio } from '@/dominio/tipos';
import { useAcciones, usePuede, useRolActivo, useSel } from '@/estado';
import { selMargenProducto, selProductoPorReferencia } from '@/selectores';
import { PESTANAS_PRODUCTO, rutas, type Trasladar } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { ESTADOS_INVENTARIO } from '@/config/estados';
import { entero, porcentaje } from '@/lib/formato';
import { NOMBRES_CATEGORIA, NOMBRES_LINEA } from '@/seed/catalogo';
import {
  avisar,
  Badge,
  BadgeEstado,
  BotonEnlace,
  BotonIcono,
  Button,
  Card,
  ConfirmarEliminacion,
  Dialog,
  Dinero,
  EmptyState,
  EncabezadoPagina,
  InputNumero,
  ItemMenu,
  Menu,
  MuestraColor,
  ParesDatos,
  PestanasEnlace,
  Prenda,
  SeparadorMenu,
} from '@/ui';
import { DialogoAjuste } from '../componentes/DialogoAjuste';
import { DialogoTraslado, type PrefillTraslado } from '../componentes/DialogoTraslado';
import { DialogoVariante } from '../componentes/DialogoVariante';
import { FormularioProducto } from '../componentes/FormularioProducto';
import { MatrizFicha } from '../componentes/MatrizFicha';
import { PanelTrasladosProducto } from '../componentes/PanelTrasladosProducto';
import { PestanaKardex } from '../componentes/PestanaKardex';
import { PestanaRentabilidad } from '../componentes/PestanaRentabilidad';
import { PestanaVentas } from '../componentes/PestanaVentas';
import { TablaVariantes } from '../componentes/TablaVariantes';
import { selFabricas, selVariantesDetalle, type FilaVariante } from '../selectores';
import { METODO_COSTO } from '../textos';

type Pestana = (typeof PESTANAS_PRODUCTO)[number];

export default function Producto() {
  const { referencia, trasladar, resaltar } = useParamsRuta('producto');
  const { pestana } = useParamsRuta('productoPestana');
  const producto = useSel(selProductoPorReferencia, { referencia });
  if (!producto || producto.eliminadoEn)
    return (
      <div className="pb-16">
        <EncabezadoPagina migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Inventario', a: rutas.inventario() }, { texto: referencia }]} titulo="No encontramos esa referencia" />
        <EmptyState
          icono={PackageSearch}
          titulo={`La referencia ${referencia} no existe o ya se eliminó`}
          texto="Vuelve al catálogo y búscala por nombre, referencia o código de barras."
          accion={<BotonEnlace to={rutas.inventario()}>Ir al catálogo</BotonEnlace>}
        />
      </div>
    );
  return <Ficha producto={producto} pestana={pestana} trasladar={trasladar} resaltar={resaltar} />;
}

function Ficha({ producto, pestana, trasladar, resaltar }: { producto: ProductoDominio; pestana: string; trasladar: Trasladar | null; resaltar: string | null }) {
  const navegar = useNavigate();
  const acciones = useAcciones();
  const puede = usePuede();
  const rol = useRolActivo();
  const verCostos = puede('ver.costos');
  const puedeEditar = puede('producto.editar');
  const puedeAjustar = puede('inventario.ajustar');
  const puedeEliminar = puede('producto.eliminar');
  const fabricas = useSel(selFabricas);
  const filas = useSel(selVariantesDetalle, { productoId: producto.id });
  const margen = useSel(selMargenProducto, { productoId: producto.id });

  const [traslado, setTraslado] = useState<{ abierto: boolean; inicial: PrefillTraslado | null }>({ abierto: false, inicial: null });
  const [ajuste, setAjuste] = useState<{ abierto: boolean; varianteId: string | null }>({ abierto: false, varianteId: null });
  const [variante, setVariante] = useState(false);
  const [minimo, setMinimo] = useState(false);
  const [eliminar, setEliminar] = useState(false);
  const [eliminarVariante, setEliminarVariante] = useState<FilaVariante | null>(null);

  // `?trasladar=` abre el panel prellenado (solo si la variante es de esta referencia); al cerrarlo se limpia el enlace.
  const claveTrasladar = trasladar ? `${trasladar.origen},${trasladar.destino},${trasladar.varianteId},${trasladar.cantidad}` : '';
  const [enlaceCerrado, setEnlaceCerrado] = useState('');
  const abiertoPorEnlace = !!trasladar && filas.some((f) => f.variante.id === trasladar.varianteId) && claveTrasladar !== enlaceCerrado;
  const trasladoAbierto = traslado.abierto || abiertoPorEnlace;
  const trasladoInicial: PrefillTraslado | null = traslado.abierto
    ? traslado.inicial
    : abiertoPorEnlace && trasladar
      ? { origenId: trasladar.origen, destinoId: trasladar.destino, varianteId: trasladar.varianteId, cantidad: trasladar.cantidad, productoId: producto.id }
      : null;

  const permitidas = useMemo<Pestana[]>(
    () => [
      'variantes',
      'kardex',
      ...(puede('ver.todasLasVentas') ? (['ventas'] as const) : []),
      ...(verCostos ? (['rentabilidad'] as const) : []),
      ...(puedeEditar ? (['editar'] as const) : []),
    ],
    [puede, verCostos, puedeEditar],
  );
  const activa: Pestana = (PESTANAS_PRODUCTO as readonly string[]).includes(pestana) && permitidas.includes(pestana as Pestana) ? (pestana as Pestana) : 'variantes';
  const totalExistencias = filas.reduce((a, f) => a + f.total, 0);
  const colores = useColoresUnicos(filas);
  const nombreFabrica = fabricas.find((f) => f.id === producto.proveedorId)?.nombre ?? '—';
  const abrirTraslado = (p: PrefillTraslado = {}) => setTraslado({ abierto: true, inicial: { productoId: producto.id, ...p } });
  const cerrarTraslado = (a: boolean) => {
    setTraslado((t) => ({ ...t, abierto: a }));
    if (!a && abiertoPorEnlace) {
      setEnlaceCerrado(claveTrasladar);
      navegar(rutas.producto(producto.referencia), { replace: true });
    }
  };

  const eliminarReferencia = () => {
    const r = acciones.eliminarProducto({ productoId: producto.id, motivo: null });
    if (!r.ok) return avisar({ tipo: 'error', texto: r.error.mensaje });
    avisar({ tipo: 'exito', texto: `Referencia ${producto.referencia} eliminada`, detalle: 'Las ventas anteriores se conservan.' });
    navegar(rutas.inventario());
  };

  const quitarVariante = () => {
    if (!eliminarVariante) return;
    const r = acciones.eliminarVariante({ varianteId: eliminarVariante.variante.id });
    if (!r.ok) return avisar({ tipo: 'error', texto: r.error.mensaje });
    avisar({ tipo: 'exito', texto: `Variante ${eliminarVariante.variante.sku} eliminada` });
    setEliminarVariante(null);
  };

  const estadoStock = totalExistencias <= 0 ? 'agotado' : null;
  if (pestana === 'variantes') return <Navigate replace to={rutas.producto(producto.referencia)} />;

  return (
    <div className="pb-16" data-testid="ficha-producto" data-referencia={producto.referencia}>
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Inventario', a: rutas.inventario() }, { texto: producto.referencia }]}
        eyebrow={`${NOMBRES_CATEGORIA[producto.categoria]} · ${NOMBRES_LINEA[producto.linea]}`}
        titulo={producto.nombre}
        insignia={
          <>
            <Badge tono="outline">{producto.referencia}</Badge>
            {estadoStock && <BadgeEstado estado={ESTADOS_INVENTARIO.agotado} />}
          </>
        }
        subtitulo={[producto.material, producto.temporada].filter(Boolean).join(' · ')}
        acciones={
          <>
            {(puedeEditar || puedeAjustar || puedeEliminar) && (
              <Menu etiqueta="Más acciones de la referencia" disparador={<BotonIcono icono={MoreHorizontal} etiqueta="Más acciones" variante="secondary" data-testid="ficha-mas" />}>
                {puedeAjustar && (
                  <ItemMenu icono={SlidersHorizontal} onSelect={() => setAjuste({ abierto: true, varianteId: null })}>
                    Ajustar existencias
                  </ItemMenu>
                )}
                {puedeEditar && (
                  <ItemMenu icono={Plus} onSelect={() => setVariante(true)}>
                    Agregar variante
                  </ItemMenu>
                )}
                {rol !== 'vendedor' && (
                  <ItemMenu icono={Printer} onSelect={() => navegar(rutas.etiquetas({ producto: producto.referencia }))}>
                    Imprimir etiquetas
                  </ItemMenu>
                )}
                {puedeEliminar && (
                  <>
                    <SeparadorMenu />
                    <ItemMenu icono={Trash2} peligro deshabilitado={totalExistencias > 0} onSelect={() => setEliminar(true)}>
                      {totalExistencias > 0 ? 'Eliminar (tiene existencias)' : 'Eliminar referencia'}
                    </ItemMenu>
                  </>
                )}
              </Menu>
            )}
            {puede('traslado.solicitar') && (
              <Button icono={ArrowRightLeft} onClick={() => abrirTraslado()} data-testid="solicitar-traslado">
                {rol === 'vendedor' ? 'Pedir traslado' : 'Solicitar traslado'}
              </Button>
            )}
          </>
        }
        pestanas={
          <PestanasEnlace
            etiqueta="Secciones de la ficha"
            pestanas={[
              { a: rutas.producto(producto.referencia), etiqueta: 'Variantes', fin: true },
              { a: rutas.productoPestana(producto.referencia, 'kardex'), etiqueta: 'Kárdex' },
              ...(permitidas.includes('ventas') ? [{ a: rutas.productoPestana(producto.referencia, 'ventas'), etiqueta: 'Ventas' }] : []),
              ...(permitidas.includes('rentabilidad') ? [{ a: rutas.productoPestana(producto.referencia, 'rentabilidad'), etiqueta: 'Rentabilidad' }] : []),
              ...(permitidas.includes('editar') ? [{ a: rutas.productoPestana(producto.referencia, 'editar'), etiqueta: 'Editar' }] : []),
            ]}
          />
        }
      />

      <div className="mt-8">
        {activa === 'variantes' && (
          <div className="space-y-10">
            <Card padding="compacta" data-testid="resumen-producto">
              <div className="flex flex-wrap gap-8">
                <div className="flex gap-3">
                  <div className="w-[120px] shrink-0">
                    <Prenda tipo={producto.tipoPrenda} color={colores[0]?.hex ?? '#C9C9C7'} patron={colores[0]?.patron} nombre={`${producto.nombre}, vista de frente`} />
                  </div>
                  <div className="hidden w-[120px] shrink-0 md:block">
                    <Prenda tipo={producto.tipoPrenda} color={colores[0]?.hex ?? '#C9C9C7'} patron={colores[0]?.patron} vista="detalle" nombre={`${producto.nombre}, detalle`} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <ParesDatos
                    columnas={3}
                    pares={[
                      ['Fábrica', nombreFabrica],
                      ['Precio de venta', <span key="p" className="num font-semibold"><Dinero valor={producto.precioVenta} /> <span className="font-normal text-muted">con IVA</span></span>],
                      ...(verCostos && margen
                        ? ([
                            ['Costo vigente', <span key="c" className="num"><Dinero valor={margen.costo} /></span>],
                            ['Margen', <span key="m" className="num font-semibold">{porcentaje(margen.margenPct, 0)}</span>],
                          ] as const)
                        : []),
                      [
                        'Stock mínimo',
                        <span key="s" className="inline-flex items-center gap-2 num">
                          {entero(producto.stockMinimo)} por talla y local
                          {puedeEditar && (
                            <button type="button" className="t-small font-bold text-ink underline underline-offset-4" onClick={() => setMinimo(true)} data-testid="cambiar-minimo">
                              Cambiar
                            </button>
                          )}
                        </span>,
                      ],
                      [
                        'Colores',
                        <span key="col" className="inline-flex items-center gap-1">
                          {colores.map((c) => (
                            <MuestraColor key={c.id} hex={c.hex} nombre={c.nombre} patron={c.patron} tamano={16} />
                          ))}
                        </span>,
                      ],
                      ['En total', <span key="t" className="num font-semibold">{entero(totalExistencias)} unidades en {entero(filas.length)} variantes</span>],
                    ]}
                  />
                  {verCostos && producto.costoVigente > 0 && <p className="mt-4 t-small text-muted">{METODO_COSTO}.</p>}
                </div>
              </div>
            </Card>

            <section aria-labelledby="t-matriz">
              <h2 id="t-matriz" className="mb-4 t-h2 text-ink">
                Qué hay en cada local
              </h2>
              <MatrizFicha producto={producto} alSolicitar={(p) => abrirTraslado(p)} puedeSolicitar={puede('traslado.solicitar')} />
            </section>

            <PanelTrasladosProducto productoId={producto.id} />

            <section aria-labelledby="t-variantes">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 id="t-variantes" className="t-h2 text-ink">
                  Variantes, SKU y código de barras
                </h2>
                {puedeEditar && (
                  <Button variante="secondary" tamano="sm" icono={Plus} onClick={() => setVariante(true)} data-testid="agregar-variante">
                    Agregar variante
                  </Button>
                )}
              </div>
              <TablaVariantes producto={producto} filas={filas} puedeEditar={puedeAjustar} alAjustar={(id) => setAjuste({ abierto: true, varianteId: id })} alEliminar={(f) => setEliminarVariante(f)} />
            </section>
          </div>
        )}
        {activa === 'kardex' && <PestanaKardex producto={producto} resaltarId={resaltar} />}
        {activa === 'ventas' && <PestanaVentas producto={producto} />}
        {activa === 'rentabilidad' && <PestanaRentabilidad producto={producto} />}
        {activa === 'editar' && (
          <div className="space-y-12">
            <FormularioProducto producto={producto} alGuardar={() => navegar(rutas.producto(producto.referencia))} alCancelar={() => navegar(rutas.producto(producto.referencia))} />
            {puedeEliminar && (
              <Card titulo="Eliminar la referencia">
                <p className="max-w-[72ch] t-body text-muted">
                  {totalExistencias > 0
                    ? `Todavía tiene ${entero(totalExistencias)} unidades en existencia. Trasládalas, véndelas o ajústalas a cero antes de eliminarla.`
                    : 'Se retira del catálogo, del punto de venta y de la tienda. Las ventas anteriores se conservan.'}
                </p>
                <Button className="mt-4" variante="destructive" tamano="sm" icono={Trash2} disabled={totalExistencias > 0} motivo="Tiene existencias" onClick={() => setEliminar(true)} data-testid="eliminar-referencia">
                  Eliminar referencia
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>

      <DialogoTraslado abierto={trasladoAbierto} alCambiar={cerrarTraslado} inicial={trasladoInicial} />
      <DialogoAjuste abierto={ajuste.abierto} alCambiar={(a) => setAjuste((x) => ({ ...x, abierto: a }))} productoId={producto.id} varianteId={ajuste.varianteId} />
      <DialogoVariante producto={producto} abierto={variante} alCambiar={setVariante} />
      <DialogoMinimo producto={producto} abierto={minimo} alCambiar={setMinimo} />
      <ConfirmarEliminacion
        abierto={eliminar}
        alCambiar={setEliminar}
        pregunta={`¿Eliminar la referencia ${producto.referencia}?`}
        consecuencias={`Se retira «${producto.nombre}» del catálogo, del punto de venta y de la tienda, con sus ${entero(filas.length)} variantes. Las ventas anteriores se conservan.`}
        accion="Eliminar referencia"
        nota={null}
        alConfirmar={eliminarReferencia}
      />
      <ConfirmarEliminacion
        abierto={!!eliminarVariante}
        alCambiar={(a) => !a && setEliminarVariante(null)}
        pregunta={`¿Eliminar la variante ${eliminarVariante?.variante.sku ?? ''}?`}
        consecuencias="No tiene existencias ni mercancía en camino. Su historial de movimientos se conserva en el kárdex."
        accion="Eliminar variante"
        nota={null}
        alConfirmar={quitarVariante}
      />
    </div>
  );
}

function useColoresUnicos(filas: readonly FilaVariante[]) {
  return useMemo(() => {
    const m = new Map<string, FilaVariante['color']>();
    for (const f of filas) if (!m.has(f.color.id)) m.set(f.color.id, f.color);
    return [...m.values()];
  }, [filas]);
}

function DialogoMinimo(props: { producto: ProductoDominio; abierto: boolean; alCambiar: (a: boolean) => void }) {
  return props.abierto ? <CuerpoMinimo {...props} /> : null;
}

function CuerpoMinimo({ producto, abierto, alCambiar }: { producto: ProductoDominio; abierto: boolean; alCambiar: (a: boolean) => void }) {
  const acciones = useAcciones();
  const [valor, setValor] = useState<number | null>(producto.stockMinimo);
  const [error, setError] = useState<string | null>(null);
  const guardar = () => {
    if (valor === null || valor < 0) return setError('El stock mínimo no puede ser negativo.');
    const r = acciones.editarProducto({ productoId: producto.id, cambios: { stockMinimo: valor } });
    if (!r.ok) return setError(r.error.mensaje);
    alCambiar(false);
    avisar({ tipo: 'exito', texto: 'Stock mínimo actualizado', detalle: `Ahora la alerta salta por debajo de ${entero(valor)} por talla y local.` });
  };
  return (
    <Dialog
      abierto={abierto}
      alCambiar={alCambiar}
      eyebrow={producto.referencia}
      titulo="Stock mínimo"
      descripcion="Por debajo de esta cantidad, la celda de la matriz se marca y aparece la alerta de stock bajo."
      ancho="sm"
      pie={
        <>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar} data-testid="minimo-guardar">
            Guardar
          </Button>
        </>
      }
    >
      <InputNumero etiqueta="Unidades por talla y color en cada local" valor={valor} alCambiar={setValor} error={error ?? undefined} data-testid="minimo-valor" />
    </Dialog>
  );
}

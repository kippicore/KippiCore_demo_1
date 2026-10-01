import { CheckCircle2, ListPlus, RotateCcw, Ship } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PREFIJOS } from '@/dominio/motor/ids';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import type { Id } from '@/dominio/tipos';
import { copDeCentavos } from '@/dominio/reglas/dinero';
import { emitirUI, nuevoId, useAcciones, useAhora, useHoy, useMarca, useSel } from '@/estado';
import { entero, plural, porcentaje } from '@/lib/formato';
import { textoTasas, dineroOrigen } from '@/lib/moneda';
import { selNarrativa, selProveedores } from '@/selectores';
import { avisar, BotonEnlace, Button, Dialog, Dinero, EmptyState, EncabezadoPagina, Fecha, Pista, Segmentado, Select } from '@/ui';
import { borradorPedidoEn, cantidadVigente, resumenReferencia, totalesPedido, type LineaSugerida } from '../calculos';
import { AccionesMensaje } from '../componentes/AccionesMensaje';
import { MatrizSugerida, type Lente } from '../componentes/MatrizSugerida';
import { selContactosCadena, selDefectosPedido, selSugerenciaCompleta } from '../selectores';
import { TEXTOS_SUGERIR } from '../textos';

const COBERTURAS = [60, 90, 120, 150, 180] as const;

/** Referencias donde la persona editó alguna cantidad (siguen visibles aunque la sugerencia fuera cero). */
function productosEditados(ediciones: Readonly<Record<Id, number>>, productos: readonly { productoId: Id; celdas: Record<string, { varianteId: Id }> }[]): Record<Id, true> {
  const r: Record<Id, true> = {};
  for (const p of productos) if (Object.values(p.celdas).some((c) => ediciones[c.varianteId] !== undefined)) r[p.productoId] = true;
  return r;
}

interface PedidoCreado {
  numero: string;
  importacionId: Id;
  borrador: string;
  contacto: string;
}

/** Sugerir pedido a la fábrica (W12): lo que rota, lo que hay y lo que viene, convertido en cantidades por talla y color. */
export default function SugerirPedido() {
  const hoy = useHoy();
  const ahora = useAhora();
  const marca = useMarca().nombre;
  const acciones = useAcciones();
  const { proveedor: proveedorUrl, cobertura: coberturaUrl, desde } = useParamsRuta('sugerirPedido');
  const narrativa = useSel(selNarrativa, { hoy });
  const fabricas = useSel(selProveedores, { hoy, tipo: 'fabrica' });
  const contactos = useSel(selContactosCadena);

  const proveedorInicial = fabricas.find((f) => f.proveedor.id === proveedorUrl)?.proveedor.id ?? fabricas.find((f) => f.proveedor.id === narrativa.proveedorSugerencia)?.proveedor.id ?? fabricas[0]?.proveedor.id ?? null;
  const [proveedorId, setProveedorId] = useState<Id | null>(proveedorInicial);
  const [cobertura, setCobertura] = useState<number>(coberturaUrl && coberturaUrl >= 30 && coberturaUrl <= 365 ? coberturaUrl : 90);
  const [ediciones, setEdiciones] = useState<Record<Id, number>>({});
  const [lente, setLente] = useState<Lente>('sugerido');
  const [abiertasManual, setAbiertasManual] = useState<ReadonlySet<Id> | null>(null);
  const [creado, setCreado] = useState<PedidoCreado | null>(null);
  const [borrador, setBorrador] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sug = useSel(selSugerenciaCompleta, { proveedorId: proveedorId ?? '', coberturaDias: cobertura, hoy });
  const defectos = useSel(selDefectosPedido, { proveedorId: proveedorId ?? '' });

  useEffect(() => {
    if (sug) emitirUI('pedido_sugerido_visto', { proveedorId: sug.proveedor.id });
  }, [sug?.proveedor.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Al elegir otra fábrica o cobertura se descartan las ediciones y vuelve a abrirse solo la primera referencia.
  const reiniciar = () => {
    setEdiciones({});
    setCreado(null);
    setError(null);
    setAbiertasManual(null);
  };
  const elegirProveedor = (id: Id) => {
    setProveedorId(id);
    reiniciar();
  };
  const elegirCobertura = (dias: number) => {
    setCobertura(dias);
    reiniciar();
  };
  const abiertas: ReadonlySet<Id> = abiertasManual ?? new Set(sug?.productos[0] ? [sug.productos[0].productoId] : []);
  const setAbiertas = (v: ReadonlySet<Id>) => setAbiertasManual(v);

  const [verSin, setVerSin] = useState(false);
  const conCantidad = (sug?.productos ?? []).filter((p) => p.sugeridas > 0 || p.productoId in productosEditados(ediciones, sug?.productos ?? []));
  const sinCantidad = (sug?.productos ?? []).filter((p) => !conCantidad.includes(p));
  const visibles = verSin ? [...conCantidad, ...sinCantidad] : conCantidad;

  const lineas: LineaSugerida[] = useMemo(
    () =>
      (sug?.productos ?? []).flatMap((p) =>
        Object.values(p.celdas).map((c) => ({
          varianteId: c.varianteId,
          cantidad: cantidadVigente(c.sugerida, ediciones[c.varianteId]),
          costoUnitarioOrigen: p.costoUnitarioOrigen,
          precioVenta: p.precioVenta,
          tarifaIva: p.tarifaIva,
          costoAterrizado: p.costoVigente,
        })),
      ),
    [sug, ediciones],
  );
  const tasa = sug?.base.tasaVigente ?? 0;
  const totales = totalesPedido(lineas, tasa);
  const sugeridos = sug?.base.unidades ?? 0;
  const diferencia = totales.unidades - sugeridos;
  const editadas = Object.keys(ediciones).length;

  const editar = (varianteId: Id, cantidad: number | null) =>
    setEdiciones((e) => {
      const { [varianteId]: _quitada, ...resto } = e;
      return cantidad === null ? resto : { ...resto, [varianteId]: Math.max(0, Math.round(cantidad)) };
    });

  const referencias = useMemo(
    () =>
      (sug?.productos ?? []).map((p) =>
        resumenReferencia(
          Object.values(p.celdas).map((c) => {
            const color = p.colores.find((k) => k.id === c.colorId);
            return { talla: c.talla, colorNombre: color?.nombre ?? '', colorCodigo: color?.codigo ?? '', cantidad: cantidadVigente(c.sugerida, ediciones[c.varianteId]) };
          }),
          p.referencia,
          p.nombre,
        ),
      ),
    [sug, ediciones],
  );

  const contactoFabrica = contactos.find((f) => f.contacto.rol === 'proveedor' && f.contacto.proveedorId === proveedorId)?.contacto ?? null;
  const textoBorrador = sug
    ? borradorPedidoEn({ nombreContacto: contactoFabrica?.nombre.split(' ')[0] ?? 'there', proveedor: sug.proveedor.nombreCorto, marca, referencias })
    : '';

  const crear = () => {
    if (!sug || !proveedorId) return;
    setError(null);
    const lineasPedido = sug.productos
      .map((p) => ({
        productoId: p.productoId,
        costoUnitarioOrigen: p.costoUnitarioOrigen,
        cantidades: Object.fromEntries(Object.values(p.celdas).map((c) => [c.varianteId, cantidadVigente(c.sugerida, ediciones[c.varianteId])] as const).filter(([, n]) => n > 0)),
      }))
      .filter((l) => Object.keys(l.cantidades).length > 0);
    if (lineasPedido.length === 0) {
      setError('Todas las cantidades están en cero. Deja al menos una prenda para crear el pedido.');
      return;
    }
    const m3 = Math.max(0.5, Math.round(totales.unidades * (defectos.m3PorPrenda ?? 0.008) * 10) / 10);
    const id = nuevoId(PREFIJOS.importacion);
    const r = acciones.crearImportacion({
      importacionId: id,
      numero: null,
      proveedorId,
      moneda: sug.base.moneda,
      tasaPedido: tasa,
      fechaPedido: hoy,
      carga: { tipo: 'consolidada', m3 },
      puertoOrigen: defectos.puertoOrigen,
      puertoDestino: defectos.puertoDestino,
      lineas: lineasPedido,
      contactoIds: defectos.contactoIds,
      costos: defectos.costos,
      metodoProrrateo: defectos.metodoProrrateo,
      origenSugerencia: { ts: ahora, coberturaDias: cobertura },
      nota: `Creado desde Sugerir pedido (cobertura de ${cobertura} días).`,
    });
    if (!r.ok) {
      setError(r.error.mensaje);
      return;
    }
    const numeroNuevo = r.despues.importaciones[id]?.numero ?? '';
    if (contactoFabrica) {
      const m = acciones.registrarMensajes({
        mensajes: [
          {
            canal: 'wechat',
            destinatario: { tipo: 'contacto', refId: contactoFabrica.id, nombre: contactoFabrica.nombre, telefono: contactoFabrica.whatsapp, correo: contactoFabrica.correo },
            idioma: 'en',
            tratamiento: 'tu',
            asunto: `New order ${numeroNuevo} · ${marca}`,
            cuerpo: textoBorrador,
            origen: { tipo: 'pedido_sugerido', id },
          },
        ],
      });
      if (!m.ok) avisar({ tipo: 'alerta', texto: 'El pedido quedó creado, pero no pudimos guardar el borrador.', detalle: m.error.mensaje });
    }
    setCreado({ numero: numeroNuevo, importacionId: id, borrador: textoBorrador, contacto: contactoFabrica?.nombre ?? 'la fábrica' });
    avisar({ tipo: 'exito', texto: `Pedido ${numeroNuevo} creado en Cotizado`, detalle: 'El borrador en inglés quedó en la bandeja de salida (WeChat, simulación).', accion: { texto: 'Ver el pedido', a: rutas.importacion(numeroNuevo) } });
  };

  const migas =
    desde === 'analisis'
      ? [{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Análisis', a: rutas.analisis() }, { texto: 'Sugerir pedido' }]
      : desde === 'proveedor'
        ? [{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Proveedores', a: rutas.proveedores() }, { texto: 'Sugerir pedido' }]
        : [{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Importaciones', a: rutas.importaciones() }, { texto: 'Sugerir pedido' }];

  if (fabricas.length === 0 || !sug)
    return (
      <div className="pb-16">
        <EncabezadoPagina migas={migas} titulo={TEXTOS_SUGERIR.titulo} subtitulo={TEXTOS_SUGERIR.subtitulo} />
        <div className="mt-10 border border-line bg-surface">
          <EmptyState icono={Ship} titulo="Elige una fábrica para empezar" texto="Para sugerirte cantidades necesitamos una fábrica con historial de pedidos y de ventas." accion={<BotonEnlace to={rutas.importaciones()}>Ir a Importaciones</BotonEnlace>} />
        </div>
      </div>
    );

  const tasaTexto = textoTasas();
  const anticipo = Math.round(totales.totalOrigen * 0.3);

  return (
    <div className="pb-16">
      <EncabezadoPagina migas={migas} titulo={TEXTOS_SUGERIR.titulo} subtitulo={TEXTOS_SUGERIR.subtitulo} />

      <div className="mt-8 flex flex-wrap items-end gap-6 border border-line bg-surface p-5" data-testid="controles-sugerir">
        <Select
          className="w-[320px]"
          etiqueta="Fábrica"
          valor={proveedorId}
          alCambiar={elegirProveedor}
          opciones={fabricas.map((f) => ({ valor: f.proveedor.id, etiqueta: `${f.proveedor.nombreCorto} · ${f.proveedor.moneda}` }))}
          data-testid="select-fabrica-sugerir"
        />
        <div>
          <p className="mb-1.5 t-label text-ink">Cobertura</p>
          <Segmentado
            etiqueta="Cobertura en días"
            valor={String(cobertura)}
            alCambiar={(v) => elegirCobertura(Number(v))}
            opciones={COBERTURAS.map((c) => ({ valor: String(c), etiqueta: `${c} días`, 'data-testid': `cobertura-${c}` }))}
          />
        </div>
        <p className="max-w-[44ch] pb-1 t-small text-muted">
          {TEXTOS_SUGERIR.coberturaAyuda} Llegaría hacia el <Fecha valor={sug.base.llegadaEstimada} />.
        </p>
      </div>

      <div className="mt-6 grid gap-6 wide:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmentado
              etiqueta="Qué ver en las matrices"
              tamano="sm"
              valor={lente}
              alCambiar={setLente}
              opciones={[
                { valor: 'sugerido', etiqueta: 'Cantidad a pedir', 'data-testid': 'lente-sugerido' },
                { valor: 'rotacion', etiqueta: 'Rota por semana', 'data-testid': 'lente-rotacion' },
                { valor: 'stock', etiqueta: 'Hay y en camino', 'data-testid': 'lente-stock' },
              ]}
            />
            <div className="flex items-center gap-4">
              <button type="button" className="t-label font-bold text-ink underline-offset-4 hover:underline" onClick={() => setAbiertas(new Set(visibles.map((p) => p.productoId)))}>
                Abrir todas
              </button>
              <button type="button" className="t-label font-bold text-ink underline-offset-4 hover:underline" onClick={() => setAbiertas(new Set())}>
                Cerrar todas
              </button>
            </div>
          </div>
          {sug.productos.length === 0 ? (
            <div className="border border-line bg-surface">
              <EmptyState icono={ListPlus} titulo="Esta fábrica aún no tiene referencias" texto="Cuando le pidas prendas a esta fábrica, aquí te sugerimos cuánto repetir." />
            </div>
          ) : (
            <Pista id="importaciones.sugerir" alinear="inicio">
              <div className="space-y-3" data-testid="tabla-sugerida">
                {visibles.map((p) => (
                  <MatrizSugerida
                    key={p.productoId}
                    producto={p}
                    ediciones={ediciones}
                    alEditar={editar}
                    lente={lente}
                    abierta={abiertas.has(p.productoId)}
                    alAlternar={() => {
                      const n = new Set(abiertas);
                      if (n.has(p.productoId)) n.delete(p.productoId);
                      else n.add(p.productoId);
                      setAbiertas(n);
                    }}
                    deshabilitada={creado !== null}
                  />
                ))}
                {sinCantidad.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setVerSin((v) => !v)}
                    aria-expanded={verSin}
                    className="flex w-full items-center justify-between border border-dashed border-line-strong p-4 text-left t-label font-bold text-ink hover:bg-surface-2"
                    data-testid="ver-sin-cantidad"
                  >
                    <span>
                      {verSin ? 'Ocultar' : 'Ver'} {plural(sinCantidad.length, 'referencia', 'referencias')} sin cantidad sugerida
                    </span>
                    <span className="t-small font-normal text-muted">Ya hay suficiente o no se ha vendido</span>
                  </button>
                )}
              </div>
            </Pista>
          )}
        </div>

        <aside className="wide:sticky wide:top-(--sticky-top) wide:self-start" aria-label="Resumen del pedido">
          <div className="space-y-4 border border-line bg-surface p-6" data-testid="resumen-sugerencia">
            <p className="t-eyebrow text-ink-2">El pedido</p>
            <div>
              <p className="t-kpi num text-ink" data-testid="total-unidades">
                {entero(totales.unidades)}
              </p>
              <p className="t-small text-muted">
                prendas
                {editadas > 0 && (
                  <>
                    {' '}
                    · {diferencia === 0 ? 'igual que la sugerencia' : `${diferencia > 0 ? '+' : '−'}${entero(Math.abs(diferencia))} frente a lo sugerido`}
                  </>
                )}
              </p>
            </div>
            <dl className="space-y-3 border-t border-line-soft pt-4">
              <div>
                <dt className="t-small text-muted">Costo estimado de fábrica</dt>
                <dd className="t-label font-bold text-ink" data-testid="costo-estimado">
                  <span className="num">{dineroOrigen(totales.totalOrigen, sug.base.moneda)}</span> · unos <Dinero valor={totales.totalCop} corta />
                </dd>
                <dd className="mt-0.5 t-small text-muted">{tasaTexto}</dd>
              </div>
              <div>
                <dt className="t-small text-muted">Margen esperado</dt>
                <dd className="t-label font-bold text-ink num" data-testid="margen-esperado">
                  {porcentaje(totales.margenEsperado, 0)} <span className="font-normal text-muted">con el último costo aterrizado</span>
                </dd>
              </div>
              <div>
                <dt className="t-small text-muted">Anticipo a la fábrica ({sug.proveedor.condicionesPago.split(',')[0]})</dt>
                <dd className="t-label font-bold text-ink num">
                  {dineroOrigen(anticipo, sug.base.moneda)} · <Dinero valor={copDeCentavos(anticipo, tasa)} corta />
                </dd>
              </div>
              <div>
                <dt className="t-small text-muted">Llegada estimada a la bodega</dt>
                <dd className="t-label font-bold text-ink">
                  <Fecha valor={sug.base.llegadaEstimada} formato="larga" />
                </dd>
              </div>
            </dl>
            {error && <p className="border-l-2 border-danger pl-3 t-small text-ink">{error}</p>}
            {creado ? (
              <div className="space-y-3 border-t border-line-soft pt-4" data-testid="pedido-creado">
                <p className="inline-flex items-center gap-2 t-label font-bold text-ink">
                  <CheckCircle2 size={18} className="text-success" aria-hidden />
                  {creado.numero} quedó en Cotizado
                </p>
                <p className="t-small text-muted">El borrador en inglés para {creado.contacto} está en la bandeja de salida. No se envió nada: lo copias y lo mandas tú.</p>
                <div className="flex flex-col gap-2">
                  <BotonEnlace to={rutas.importacion(creado.numero)} anchoCompleto>
                    Ver el pedido
                  </BotonEnlace>
                  <BotonEnlace to={rutas.importaciones({ vista: 'tablero', resaltar: creado.numero })} variante="secondary" anchoCompleto data-testid="ver-en-tablero">
                    Verlo en el tablero
                  </BotonEnlace>
                  <Button variante="ghost" onClick={() => setBorrador(true)}>
                    Ver el borrador en inglés
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
                <Button anchoCompleto onClick={crear} disabled={totales.unidades === 0} data-testid="crear-pedido">
                  Crear pedido en Cotizado
                </Button>
                <Button variante="secondary" anchoCompleto onClick={() => setBorrador(true)} data-testid="ver-borrador">
                  Ver el borrador en inglés
                </Button>
                {editadas > 0 && (
                  <Button variante="ghost" icono={RotateCcw} onClick={() => setEdiciones({})}>
                    Volver a lo sugerido
                  </Button>
                )}
              </div>
            )}
            <p className="t-small text-muted">
              Cantidades: ventas de las últimas 12 semanas más lo que se pidió y no había, menos lo que tienes y lo que viene en camino, en múltiplos de 5.
            </p>
          </div>
        </aside>
      </div>

      <Dialog
        abierto={borrador}
        alCambiar={setBorrador}
        ancho="lg"
        eyebrow={sug.proveedor.nombreCorto}
        titulo={TEXTOS_SUGERIR.borradorTitulo}
        descripcion={TEXTOS_SUGERIR.borradorNota}
        data-testid="dialogo-borrador"
        pie={
          <Button variante="secondary" onClick={() => setBorrador(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="whitespace-pre-line border border-line bg-surface-2 p-4 t-body text-ink" lang="en" data-testid="texto-borrador">
            {creado ? creado.borrador : textoBorrador}
          </p>
          <AccionesMensaje idBase="borrador" asunto={`New order · ${marca}`} cuerpo={creado ? creado.borrador : textoBorrador} canales={{ whatsapp: true, correo: true, wechat: true }} />
        </div>
      </Dialog>
    </div>
  );
}

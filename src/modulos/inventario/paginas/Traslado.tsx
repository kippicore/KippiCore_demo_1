import { ArrowRight, Ban, Check, PackageCheck, Send, Truck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Id } from '@/dominio/tipos';
import { useAcciones, usePuede, useSel } from '@/estado';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { entero, plural } from '@/lib/formato';
import {
  avisar,
  Badge,
  BadgeEstado,
  BotonEnlace,
  Button,
  Card,
  Cifra,
  Dialog,
  EmptyState,
  EncabezadoPagina,
  Fecha,
  Icono,
  InputNumero,
  MiniaturaPrenda,
  Table,
  Textarea,
  cn,
  type ColumnaTabla,
} from '@/ui';
import { accionesTraslado, etapaTraslado } from '../calculos';
import { BadgeTraslado } from '../componentes/comun';
import { selDetalleTraslado, type DetalleTraslado, type LineaTraslado } from '../selectores';

/** Detalle de un traslado: línea de tiempo, lo que se mueve entre las dos celdas y las acciones según el estado. */
export default function Traslado() {
  const { trasladoId } = useParamsRuta('traslado');
  const d = useSel(selDetalleTraslado, { trasladoId });
  if (!d)
    return (
      <div className="pb-16">
        <EncabezadoPagina migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Inventario', a: rutas.inventario() }, { texto: 'Traslados', a: rutas.traslados() }, { texto: 'Traslado' }]} titulo="No encontramos ese traslado" />
        <EmptyState icono={Truck} titulo="Ese traslado no existe" texto="Puede que el enlace esté incompleto. Vuelve a la lista y ábrelo desde allí." accion={<BotonEnlace to={rutas.traslados()}>Ir a los traslados</BotonEnlace>} />
      </div>
    );
  return <Detalle d={d} />;
}

function Detalle({ d }: { d: DetalleTraslado }) {
  const t = d.traslado;
  const navegar = useNavigate();
  const acciones = useAcciones();
  const puede = usePuede();
  const a = accionesTraslado(t);
  const [recibiendo, setRecibiendo] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const etapa = etapaTraslado(t.estado);
  const cancelado = t.estado === 'cancelado';

  const despachar = () => {
    const r = acciones.despacharTraslado({ trasladoId: t.id });
    if (!r.ok) return avisar({ tipo: 'error', texto: r.error.mensaje });
    avisar({ tipo: 'exito', texto: `${t.numero} va en tránsito`, detalle: `Las existencias ya salieron de ${d.origen.nombre}.` });
  };

  const resolver = (decision: 'aprobada' | 'rechazada') => {
    if (!d.solicitudPendienteId) return;
    const r = acciones.resolverAprobacion({ solicitudId: d.solicitudPendienteId, decision, nota: null });
    if (!r.ok) return avisar({ tipo: 'error', texto: r.error.mensaje });
    avisar({ tipo: 'exito', texto: decision === 'aprobada' ? `${t.numero} aprobado` : `${t.numero} rechazado`, detalle: decision === 'aprobada' ? 'Bodega ya lo puede despachar.' : 'El traslado se canceló.' });
  };

  const enTransitoDestino = t.estado === 'en_transito';

  const columnas: ColumnaTabla<LineaTraslado>[] = [
    {
      id: 'prenda',
      encabezado: 'Prenda',
      celda: (l) => (
        <span className="flex items-center gap-3">
          <MiniaturaPrenda tipo={l.producto.tipoPrenda} color={l.color?.hex ?? '#C9C9C7'} patron={l.color?.patron} tamano="tabla" />
          <span className="min-w-0">
            <Link to={rutas.producto(l.producto.referencia)} className="block truncate t-body font-semibold text-ink underline-offset-4 hover:underline">
              {l.producto.nombre}
            </Link>
            <span className="block t-small text-muted">
              {l.color?.nombre} · talla {l.talla} · <span className="t-ref">{l.sku}</span>
            </span>
          </span>
        </span>
      ),
    },
    { id: 'cantidad', encabezado: 'Unidades', numerica: true, celda: (l) => <strong className="font-bold">{entero(l.cantidad)}</strong> },
    {
      id: 'recibida',
      encabezado: 'Recibidas',
      numerica: true,
      celda: (l) =>
        l.recibida === null ? (
          <span className="text-disabled">—</span>
        ) : l.recibida < l.cantidad ? (
          <span className="font-semibold text-warning">{entero(l.recibida)} de {entero(l.cantidad)}</span>
        ) : (
          entero(l.recibida)
        ),
    },
    {
      id: 'origen',
      encabezado: `En ${d.origen.nombre}`,
      numerica: true,
      celda: (l) => <Cifra valor={l.enOrigen} formatear={entero} data-testid={`origen-${l.varianteId}`} />,
    },
    {
      id: 'destino',
      encabezado: `En ${d.destino.nombre}`,
      numerica: true,
      celda: (l) => (
        <span className="inline-flex items-center justify-end gap-2">
          {enTransitoDestino && (
            <span className="inline-flex items-center gap-1 t-small text-accent-ink" title="En camino hacia aquí">
              <Icono icono={Truck} tamano={12} />+{entero(l.cantidad)}
            </span>
          )}
          <Cifra valor={l.enDestino} formatear={entero} data-testid={`destino-${l.varianteId}`} />
        </span>
      ),
    },
  ];

  return (
    <div className="pb-16" data-testid="detalle-traslado" data-estado={t.estado}>
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Inventario', a: rutas.inventario() }, { texto: 'Traslados', a: rutas.traslados() }, { texto: t.numero }]}
        eyebrow="Traslado entre locales"
        titulo={t.numero}
        insignia={
          <>
            <BadgeTraslado estado={t.estado} />
            {t.aprobacion === 'pendiente' && t.estado === 'solicitado' && <BadgeEstado estado={{ etiqueta: 'Por aprobar', tono: 'accent' }} />}
          </>
        }
        subtitulo={
          <span className="inline-flex flex-wrap items-center gap-2">
            {d.origen.nombre}
            <ArrowRight size={14} aria-hidden />
            {d.destino.nombre} · {plural(d.unidades, 'unidad', 'unidades')}
            {t.motivo ? ` · ${t.motivo}` : ''}
          </span>
        }
        acciones={
          <>
            {a.cancelar && puede('traslado.cancelar') && (
              <Button variante="secondary" icono={Ban} onClick={() => setCancelando(true)} data-testid="cancelar-traslado">
                Cancelar traslado
              </Button>
            )}
            {a.aprobar && puede('aprobacion.resolver') && d.solicitudPendienteId && (
              <>
                <Button variante="secondary" icono={X} onClick={() => resolver('rechazada')} data-testid="rechazar-traslado">
                  Rechazar
                </Button>
                <Button icono={Check} onClick={() => resolver('aprobada')} data-testid="aprobar-traslado">
                  Aprobar
                </Button>
              </>
            )}
            {a.despachar && puede('traslado.despachar') && (
              <Button icono={Send} onClick={despachar} data-testid="despachar-traslado">
                Despachar
              </Button>
            )}
            {a.recibir && puede('traslado.recibir') && (
              <Button icono={PackageCheck} onClick={() => setRecibiendo(true)} data-testid="recibir-traslado">
                Recibir
              </Button>
            )}
          </>
        }
      />

      <div className="mt-8 grid grid-cols-12 gap-6">
        <Card className="col-span-12 xl:col-span-8" titulo="Línea de tiempo">
          <ol className="grid grid-cols-3 gap-4" data-testid="linea-traslado">
            {[
              { clave: 'solicitado', titulo: 'Solicitado', detalle: `Lo pidió ${d.solicitante}`, fecha: t.fechas.solicitado },
              { clave: 'en_transito', titulo: 'En tránsito', detalle: `Salió de ${d.origen.nombre}`, fecha: t.fechas.despachado },
              { clave: 'recibido', titulo: 'Recibido', detalle: `Llegó a ${d.destino.nombre}`, fecha: t.fechas.recibido },
            ].map((p, i) => {
              const hecho = !cancelado && i <= etapa;
              const actual = !cancelado && i === etapa;
              return (
                <li key={p.clave} className="relative" aria-current={actual ? 'step' : undefined} data-paso={p.clave} data-hecho={hecho}>
                  <div className="flex items-center gap-3">
                    <span className={cn('inline-flex size-7 items-center justify-center rounded-full t-label num', hecho ? 'bg-ink text-inverse' : 'border border-line-strong text-subtle')}>{hecho ? <Check size={14} aria-hidden /> : i + 1}</span>
                    {i < 2 && <span aria-hidden className={cn('h-px flex-1', i < etapa && !cancelado ? 'bg-ink' : 'bg-line')} />}
                  </div>
                  <p className={cn('mt-3 t-label', hecho ? 'font-bold text-ink' : 'text-subtle')}>{p.titulo}</p>
                  <p className="mt-0.5 t-small text-muted">{p.fecha ? <Fecha valor={p.fecha} formato="fechaHora" /> : 'Pendiente'}</p>
                  {hecho && <p className="mt-0.5 t-small text-muted">{p.detalle}</p>}
                  {i === 0 && t.aprobacion !== 'no_requerida' && (
                    <p className="mt-1 t-small text-ink-2" data-testid="estado-aprobacion">
                      {t.aprobacion === 'aprobada' ? (
                        <>
                          Aprobado {t.fechas.aprobado && <Fecha valor={t.fechas.aprobado} formato="fechaHora" />}
                        </>
                      ) : t.aprobacion === 'pendiente' ? (
                        'Esperando la aprobación del dueño'
                      ) : (
                        'Rechazado por el dueño'
                      )}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
          {cancelado && (
            <p className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4 t-body text-ink">
              <Badge tono="muted">Cancelado</Badge>
              {t.fechas.cancelado && <Fecha valor={t.fechas.cancelado} formato="fechaHora" />}
              {t.nota ? ` · ${t.nota}` : ''}
            </p>
          )}
        </Card>
        <Card className="col-span-12 xl:col-span-4" titulo="Cómo se mueven las existencias">
          <p className="t-body text-ink">
            Al <strong className="font-semibold">despachar</strong>, las unidades salen de {d.origen.nombre}. Al <strong className="font-semibold">recibir</strong>, entran a {d.destino.nombre}: las dos celdas cambian a la vez en la matriz de cada
            referencia y el punto de venta las ve de inmediato.
          </p>
          {t.nota && !cancelado && <p className="mt-3 t-small text-muted">Nota: {t.nota}</p>}
        </Card>
      </div>

      <section className="mt-10" aria-labelledby="t-lineas">
        <h2 id="t-lineas" className="mb-4 t-h2 text-ink">
          Lo que se mueve
        </h2>
        <Table columnas={columnas} filas={d.lineas} clave={(l) => l.varianteId} porPagina={0} sustantivo={['prenda', 'prendas']} etiqueta="Prendas del traslado" data-testid="lineas-traslado" />
      </section>

      <DialogoRecibir abierto={recibiendo} alCambiar={setRecibiendo} d={d} alRecibido={() => undefined} />
      <DialogoCancelar
        abierto={cancelando}
        alCambiar={setCancelando}
        d={d}
        alCancelado={() => {
          navegar(rutas.traslados());
        }}
      />
    </div>
  );
}

function DialogoRecibir(props: { abierto: boolean; alCambiar: (a: boolean) => void; d: DetalleTraslado; alRecibido: () => void }) {
  return props.abierto ? <CuerpoRecibir {...props} /> : null;
}

function CuerpoRecibir({ abierto, alCambiar, d, alRecibido }: { abierto: boolean; alCambiar: (a: boolean) => void; d: DetalleTraslado; alRecibido: () => void }) {
  const acciones = useAcciones();
  const [cantidades, setCantidades] = useState<Record<Id, number | null>>(() => Object.fromEntries(d.lineas.map((l) => [l.varianteId, l.cantidad])));
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);
  const faltantes = useMemo(() => d.lineas.reduce((a, l) => a + Math.max(0, l.cantidad - (cantidades[l.varianteId] ?? l.cantidad)), 0), [d.lineas, cantidades]);
  const invalido = d.lineas.some((l) => (cantidades[l.varianteId] ?? l.cantidad) > l.cantidad || (cantidades[l.varianteId] ?? l.cantidad) < 0);

  const confirmar = () => {
    const recibidas: Record<Id, number> = {};
    for (const l of d.lineas) recibidas[l.varianteId] = cantidades[l.varianteId] ?? l.cantidad;
    const r = acciones.recibirTraslado({ trasladoId: d.traslado.id, recibidas, nota: nota.trim() || null });
    if (!r.ok) return setError(r.error.mensaje);
    alCambiar(false);
    alRecibido();
    avisar({
      tipo: faltantes > 0 ? 'alerta' : 'exito',
      texto: `${d.traslado.numero} recibido`,
      detalle: faltantes > 0 ? `Faltaron ${plural(faltantes, 'unidad', 'unidades')}; quedaron como pérdida en ${d.destino.nombre}.` : `Las existencias ya están en ${d.destino.nombre}.`,
    });
  };

  return (
    <Dialog
      abierto={abierto}
      alCambiar={alCambiar}
      eyebrow={d.traslado.numero}
      titulo={`Recibir en ${d.destino.nombre}`}
      descripcion="Confirma cuántas unidades llegaron de cada prenda. Si falta alguna, queda registrada como pérdida con tu nota."
      ancho="lg"
      confirmarAlCerrar={faltantes > 0}
      data-testid="dialogo-recibir"
      pie={
        <>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={invalido} data-testid="confirmar-recepcion">
            {faltantes > 0 ? `Recibir con ${plural(faltantes, 'faltante')}` : 'Confirmar recepción'}
          </Button>
        </>
      }
    >
      <ul className="divide-y divide-line-soft border border-line">
        {d.lineas.map((l) => {
          const n = cantidades[l.varianteId] ?? l.cantidad;
          return (
            <li key={l.varianteId} className="flex items-center gap-3 px-3 py-2">
              <MiniaturaPrenda tipo={l.producto.tipoPrenda} color={l.color?.hex ?? '#C9C9C7'} patron={l.color?.patron} tamano="buscador" />
              <div className="min-w-0 flex-1">
                <p className="truncate t-body font-semibold text-ink">{l.producto.nombre}</p>
                <p className="t-small text-muted">
                  {l.color?.nombre} · talla {l.talla} · salieron <span className="num">{entero(l.cantidad)}</span>
                </p>
              </div>
              <InputNumero
                etiqueta="Llegaron"
                etiquetaOculta
                tamano="sm"
                valor={n}
                alCambiar={(v) => setCantidades((c) => ({ ...c, [l.varianteId]: v }))}
                error={n > l.cantidad ? 'No pueden ser más de las que salieron' : undefined}
                className="w-28"
                data-testid={`recibidas-${l.varianteId}`}
              />
              {n < l.cantidad && <Badge tono="warning" tamano="sm">Faltan {entero(l.cantidad - n)}</Badge>}
            </li>
          );
        })}
      </ul>
      <Textarea className="mt-4" etiqueta="Nota" opcional value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Qué pasó con lo que no llegó" rows={2} />
      {error && <p className="mt-3 t-small text-danger">{error}</p>}
    </Dialog>
  );
}

function DialogoCancelar(props: { abierto: boolean; alCambiar: (a: boolean) => void; d: DetalleTraslado; alCancelado: () => void }) {
  return props.abierto ? <CuerpoCancelar {...props} /> : null;
}

function CuerpoCancelar({ abierto, alCambiar, d, alCancelado }: { abierto: boolean; alCambiar: (a: boolean) => void; d: DetalleTraslado; alCancelado: () => void }) {
  const acciones = useAcciones();
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const enTransito = d.traslado.estado === 'en_transito';
  const confirmar = () => {
    if (!motivo.trim()) return setError('Escribe por qué se cancela el traslado.');
    const r = acciones.cancelarTraslado({ trasladoId: d.traslado.id, motivo: motivo.trim() });
    if (!r.ok) return setError(r.error.mensaje);
    alCambiar(false);
    avisar({ tipo: 'info', texto: `${d.traslado.numero} cancelado`, detalle: enTransito ? `Las unidades reingresan a ${d.origen.nombre}.` : undefined });
    alCancelado();
  };
  return (
    <Dialog
      abierto={abierto}
      alCambiar={alCambiar}
      eyebrow={d.traslado.numero}
      titulo="¿Cancelar este traslado?"
      descripcion={enTransito ? `La mercancía ya salió: al cancelar, las ${plural(d.unidades, 'unidad', 'unidades')} reingresan a ${d.origen.nombre}.` : 'Todavía no salió mercancía: no se mueven existencias.'}
      ancho="sm"
      pie={
        <>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Volver
          </Button>
          <Button variante="destructive" onClick={confirmar} data-testid="confirmar-cancelacion">
            Cancelar traslado
          </Button>
        </>
      }
    >
      <Textarea etiqueta="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} error={error ?? undefined} placeholder="Ya no se necesita, se pidió por error…" rows={3} data-testid="motivo-cancelacion" />
    </Dialog>
  );
}

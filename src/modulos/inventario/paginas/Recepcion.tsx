import { PackageCheck, Ship, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Id } from '@/dominio/tipos';
import { useAcciones, useHoy, useSel } from '@/estado';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { entero, plural, relativaDias } from '@/lib/formato';
import { avisar, Badge, BotonEnlace, Button, EmptyState, EncabezadoPagina, Fecha, FranjaResumen, InputNumero, Select, Table, Textarea, type ColumnaTabla } from '@/ui';
import { proponerDistribucion, RESERVA_BODEGA } from '../calculos';
import { PestanasModulo } from '../componentes/comun';
import { selDetalleRecepcion, selRecepciones, type DetalleRecepcion, type LineaRecepcion } from '../selectores';
import { SUBTITULOS } from '../textos';

interface Entrada {
  recibidas: number | null;
  defectuosas: number | null;
}

/** Recepción de una importación en bodega: recibidas y defectuosas por variante y distribución propuesta por local. */
export default function Recepcion() {
  const params = useParamsRuta('recepcion');
  const navegar = useNavigate();
  const lista = useSel(selRecepciones);
  const elegida = lista.find((r) => r.numero === params.importacion) ?? lista.find((r) => r.puedeRecibir) ?? lista[0] ?? null;
  const hoy = useHoy();
  const detalle = useSel(selDetalleRecepcion, { importacionId: elegida?.importacionId ?? '__ninguna__', hoy });

  return (
    <div className="pb-16">
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Inventario', a: rutas.inventario() }, { texto: 'Recepción' }]}
        titulo="Recepción de importación"
        subtitulo={SUBTITULOS.recepcion}
        pestanas={<PestanasModulo />}
      />
      {lista.length === 0 ? (
        <EmptyState icono={Ship} titulo="No hay importaciones por recibir" texto="Cuando haya un pedido de la fábrica, aquí lo recibes en bodega y lo repartes entre los locales." accion={<BotonEnlace to={rutas.importaciones()}>Ver importaciones</BotonEnlace>} />
      ) : (
        <>
          <div className="mt-8 max-w-[480px]">
            <Select
              etiqueta="Importación"
              valor={elegida?.numero ?? null}
              alCambiar={(n) => navegar(rutas.recepcion({ importacion: n }), { replace: true })}
              opciones={lista.map((r) => ({
                valor: r.numero,
                etiqueta: `${r.numero} · ${r.proveedor} · ${entero(r.unidades)} uds.${r.recibida ? ' · recibida' : r.puedeRecibir ? ' · lista para recibir' : ''}`,
              }))}
              data-testid="recepcion-importacion"
            />
          </div>
          {detalle && <Formulario key={detalle.importacion.id} d={detalle} />}
        </>
      )}
    </div>
  );
}

function Formulario({ d }: { d: DetalleRecepcion }) {
  const imp = d.importacion;
  const hoy = useHoy();
  const navegar = useNavigate();
  const acciones = useAcciones();
  const [entradas, setEntradas] = useState<Record<Id, Entrada>>({});
  const [manual, setManual] = useState<Record<Id, Record<Id, number | null>>>({});
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);

  const entrada = (l: LineaRecepcion): Entrada => entradas[l.varianteId] ?? { recibidas: l.esperadas, defectuosas: 0 };
  const buenas = (l: LineaRecepcion): number => Math.max(0, (entrada(l).recibidas ?? 0) - (entrada(l).defectuosas ?? 0));
  const propuesta = (l: LineaRecepcion): Record<Id, number> => proponerDistribucion({ buenas: buenas(l), destinos: d.locales.map((x) => ({ id: x.id, ventas: l.ventas90[x.id] ?? 0 })) });
  const reparto = (l: LineaRecepcion): Record<Id, number> => {
    const m = manual[l.varianteId];
    if (!m) return propuesta(l);
    const base: Record<Id, number> = {};
    for (const x of d.locales) base[x.id] = m[x.id] ?? 0;
    return base;
  };
  const repartidas = (l: LineaRecepcion) => d.locales.reduce((a, x) => a + (reparto(l)[x.id] ?? 0), 0);

  const totales = useMemo(() => {
    let esperadas = 0;
    let recibidas = 0;
    let defectuosas = 0;
    let paraLocales = 0;
    for (const l of d.lineas) {
      const e = entrada(l);
      esperadas += l.esperadas;
      recibidas += e.recibidas ?? 0;
      defectuosas += e.defectuosas ?? 0;
      paraLocales += repartidas(l);
    }
    const buenasTotal = recibidas - defectuosas;
    return { esperadas, recibidas, defectuosas, paraLocales, bodega: buenasTotal - paraLocales };
  }, [d.lineas, entradas, manual]); // eslint-disable-line react-hooks/exhaustive-deps -- las funciones leen entradas y manual

  const problema = (l: LineaRecepcion): string | null => {
    const e = entrada(l);
    if ((e.recibidas ?? 0) < 0 || (e.defectuosas ?? 0) < 0) return 'Sin negativos';
    if ((e.defectuosas ?? 0) > (e.recibidas ?? 0)) return 'Las defectuosas superan lo recibido';
    if (repartidas(l) > buenas(l)) return 'Repartes más de lo que hay';
    return null;
  };
  const hayProblemas = d.lineas.some((l) => problema(l));

  const editarEntrada = (l: LineaRecepcion, cambios: Partial<Entrada>) => {
    setEntradas((x) => ({ ...x, [l.varianteId]: { ...entrada(l), ...cambios } }));
    // Al cambiar lo recibido, la distribución de esa línea vuelve a proponerse.
    setManual((m) => {
      const { [l.varianteId]: _quitada, ...resto } = m;
      return resto;
    });
  };
  const editarReparto = (l: LineaRecepcion, localId: Id, valor: number | null) => setManual((m) => ({ ...m, [l.varianteId]: { ...reparto(l), [localId]: valor } }));

  const proponerTodo = () => setManual({});
  const todoABodega = () => setManual(Object.fromEntries(d.lineas.map((l) => [l.varianteId, Object.fromEntries(d.locales.map((x) => [x.id, 0]))])));

  const recibir = () => {
    setError(null);
    const lineas: Record<Id, { recibidas: number; defectuosas: number }> = {};
    for (const l of d.lineas) lineas[l.varianteId] = { recibidas: entrada(l).recibidas ?? 0, defectuosas: entrada(l).defectuosas ?? 0 };
    const distribucion = d.locales
      .map((loc) => ({
        destinoId: loc.id,
        lineas: d.lineas.filter((l) => (reparto(l)[loc.id] ?? 0) > 0).map((l) => ({ varianteId: l.varianteId, cantidad: reparto(l)[loc.id] ?? 0 })),
      }))
      .filter((x) => x.lineas.length > 0);
    const r = acciones.recibirImportacion({ importacionId: imp.id, fecha: hoy, lineas, nota: nota.trim() || null, distribucion });
    if (!r.ok) {
      setError(r.error.mensaje);
      return;
    }
    avisar({
      tipo: 'exito',
      texto: `${imp.numero} recibida en bodega`,
      detalle: distribucion.length ? `${plural(distribucion.length, 'traslado generado', 'traslados generados')} para repartir lo recibido.` : 'Todo quedó en la bodega central.',
      accion: distribucion.length ? { texto: 'Ver traslados', a: rutas.traslados({ estado: 'en_transito' }) } : undefined,
    });
    navegar(rutas.recepcion({ importacion: imp.numero }), { replace: true });
  };

  // ---- Estados que no se pueden recibir ----
  if (imp.estado === 'recibido_bodega' && imp.recepcion) {
    const rec = imp.recepcion;
    const defect = Object.values(rec.lineas).reduce((a, x) => a + x.defectuosas, 0);
    const recibidasT = Object.values(rec.lineas).reduce((a, x) => a + x.recibidas, 0);
    return (
      <section className="mt-8" data-testid="recepcion-hecha">
        <FranjaResumen
          cifras={[
            { etiqueta: 'Recibida el', valor: <span className="t-kpi-sm"><Fecha valor={rec.fecha} /></span> },
            { etiqueta: 'Esperadas', valor: entero(Object.values(rec.lineas).reduce((a, x) => a + x.esperadas, 0)) },
            { etiqueta: 'Recibidas', valor: entero(recibidasT) },
            { etiqueta: 'Defectuosas', valor: entero(defect) },
          ]}
        />
        <p className="mt-4 max-w-[72ch] t-body text-muted">
          {imp.numero} ya se recibió en bodega. Lo que se repartió a los locales salió como traslados; los puedes seguir en{' '}
          <Link to={rutas.traslados()} className="font-bold text-ink underline-offset-4 hover:underline">
            Traslados
          </Link>
          .{rec.nota ? ` Nota: ${rec.nota}` : ''}
        </p>
      </section>
    );
  }

  if (!d.puedeRecibir) {
    return (
      <section className="mt-8" data-testid="recepcion-aun-no">
        <EmptyState
          icono={Ship}
          titulo={`${imp.numero} todavía no se puede recibir`}
          texto={`La mercancía se recibe después del levante en aduana. Llegada estimada a bodega: ${relativaDias(imp.hitos.recibido_bodega.estimada, hoy)}.`}
          accion={<BotonEnlace to={rutas.importacion(imp.numero)}>Ver la importación</BotonEnlace>}
        />
        <p className="mx-auto mt-2 text-center t-small text-muted num">
          {plural(d.lineas.reduce((a, l) => a + l.esperadas, 0), 'unidad esperada', 'unidades esperadas')} de {d.proveedor}
        </p>
      </section>
    );
  }

  const columnas: ColumnaTabla<LineaRecepcion>[] = [
    {
      id: 'prenda',
      encabezado: 'Prenda',
      ancho: 220,
      celda: (l) => (
        <span>
          <span className="font-semibold text-ink">{l.producto.nombre}</span>
          <span className="block t-small text-muted">
            {l.color?.nombre} · talla {l.talla}
          </span>
        </span>
      ),
    },
    { id: 'esperadas', encabezado: 'Esperadas', numerica: true, celda: (l) => entero(l.esperadas) },
    {
      id: 'recibidas',
      encabezado: 'Recibidas',
      numerica: true,
      celda: (l) => (
        <InputNumero etiqueta="Recibidas" etiquetaOculta tamano="sm" valor={entrada(l).recibidas} alCambiar={(v) => editarEntrada(l, { recibidas: v })} className="ml-auto w-20" error={problema(l) ?? undefined} data-testid={`rec-${l.varianteId}`} />
      ),
    },
    {
      id: 'defectuosas',
      encabezado: 'Defectuosas',
      numerica: true,
      celda: (l) => <InputNumero etiqueta="Defectuosas" etiquetaOculta tamano="sm" valor={entrada(l).defectuosas} alCambiar={(v) => editarEntrada(l, { defectuosas: v })} className="ml-auto w-20" data-testid={`def-${l.varianteId}`} />,
    },
    { id: 'buenas', encabezado: 'Buenas', numerica: true, celda: (l) => <strong className="font-bold">{entero(buenas(l))}</strong> },
    ...d.locales.map(
      (loc): ColumnaTabla<LineaRecepcion> => ({
        id: `loc-${loc.id}`,
        encabezado: `A ${loc.nombre}`,
        numerica: true,
        celda: (l) => (
          <InputNumero
            etiqueta={`A ${loc.nombre}`}
            etiquetaOculta
            tamano="sm"
            valor={reparto(l)[loc.id] ?? 0}
            alCambiar={(v) => editarReparto(l, loc.id, v)}
            className="ml-auto w-20"
            data-testid={`dist-${l.varianteId}-${loc.id}`}
          />
        ),
      }),
    ),
    {
      id: 'bodega',
      encabezado: 'Queda en bodega',
      numerica: true,
      celda: (l) => {
        const n = buenas(l) - repartidas(l);
        return n < 0 ? <Badge tono="danger" tamano="sm">{entero(n)}</Badge> : <span>{entero(n)}</span>;
      },
    },
  ];

  return (
    <section className="mt-8" aria-labelledby="t-recepcion" data-testid="formulario-recepcion">
      <h2 id="t-recepcion" className="sr-only">
        Recepción de {imp.numero}
      </h2>
      <FranjaResumen
        cifras={[
          { etiqueta: 'Esperadas', valor: entero(totales.esperadas) },
          { etiqueta: 'Recibidas · defectuosas', valor: `${entero(totales.recibidas)} · ${entero(totales.defectuosas)}` },
          { etiqueta: 'Para los locales', valor: entero(totales.paraLocales) },
          { etiqueta: 'Queda en bodega', valor: <span data-testid="recepcion-bodega">{entero(totales.bodega)}</span> },
        ]}
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[72ch] t-body text-muted">
          La distribución se propone según lo que vendió cada local en los últimos 90 días y deja {Math.round(RESERVA_BODEGA * 100)} % en bodega. Puedes cambiarla casilla por casilla; cada local con unidades genera un traslado.
        </p>
        <div className="flex gap-2">
          <Button variante="secondary" tamano="sm" icono={Wand2} onClick={proponerTodo}>
            Proponer distribución
          </Button>
          <Button variante="secondary" tamano="sm" onClick={todoABodega}>
            Todo a bodega
          </Button>
        </div>
      </div>
      <div className="mt-4">
        <Table columnas={columnas} filas={d.lineas} clave={(l) => l.varianteId} sustantivo={['variante', 'variantes']} etiqueta="Líneas de la recepción" porPagina={50} data-testid="tabla-recepcion" />
      </div>
      <Textarea className="mt-6 max-w-[640px]" etiqueta="Nota de la recepción" opcional value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Estado de las cajas, faltantes, novedades con el transportador" rows={2} />
      {error && <p className="mt-3 t-small text-danger">{error}</p>}
      <div className="mt-6 flex items-center gap-3 border-t border-line pt-6">
        <Button icono={PackageCheck} onClick={recibir} disabled={hayProblemas || totales.bodega < 0} data-testid="recibir-importacion">
          Recibir {imp.numero} en bodega
        </Button>
        {hayProblemas && <span className="t-small text-danger">Revisa las filas marcadas antes de recibir.</span>}
      </div>
    </section>
  );
}

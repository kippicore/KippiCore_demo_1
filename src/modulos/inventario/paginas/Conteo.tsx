import { Ban, CheckCheck, ClipboardList, Save, ScanBarcode } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Id, MotivoAjuste } from '@/dominio/tipos';
import { useAcciones, usePuede, useSel } from '@/estado';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { ESTADOS_CONTEO } from '@/config/estados';
import { entero, plural } from '@/lib/formato';
import {
  avisar,
  Badge,
  BadgeEstado,
  BotonEnlace,
  Button,
  ConfirmarEliminacion,
  Dialog,
  Dinero,
  EmptyState,
  EncabezadoPagina,
  Fecha,
  FranjaResumen,
  Input,
  InputNumero,
  MiniaturaPrenda,
  Segmentado,
  Select,
  Table,
  Toolbar,
  type ColumnaTabla,
} from '@/ui';
import { diferenciaConteo, resumirConteo } from '../calculos';
import { selDetalleConteo, type DetalleConteo, type LineaConteoVista } from '../selectores';
import { MOTIVOS_AJUSTE } from '../textos';

type Vista = 'todas' | 'sin_contar' | 'con_diferencia';

/** Conteo físico de un local: se escanea o se digita lo contado, se ven las diferencias y se aplican con motivo. */
export default function Conteo() {
  const { conteoId } = useParamsRuta('conteo');
  const d = useSel(selDetalleConteo, { conteoId });
  if (!d)
    return (
      <div className="pb-16">
        <EncabezadoPagina migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Inventario', a: rutas.inventario() }, { texto: 'Conteos físicos', a: rutas.conteos() }, { texto: 'Conteo' }]} titulo="No encontramos ese conteo" />
        <EmptyState icono={ClipboardList} titulo="Ese conteo no existe" texto="Vuelve a la lista de conteos y ábrelo desde allí." accion={<BotonEnlace to={rutas.conteos()}>Ir a los conteos</BotonEnlace>} />
      </div>
    );
  return <Detalle key={d.conteo.id} d={d} />;
}

function Detalle({ d }: { d: DetalleConteo }) {
  const c = d.conteo;
  const navegar = useNavigate();
  const acciones = useAcciones();
  const puede = usePuede();
  const verCostos = puede('ver.costos');
  const enCurso = c.estado === 'en_curso';
  const [borrador, setBorrador] = useState<Record<Id, number | null>>(() => Object.fromEntries(d.lineas.map((l) => [l.varianteId, l.contado])));
  const [vista, setVista] = useState<Vista>('todas');
  const [texto, setTexto] = useState('');
  const [codigo, setCodigo] = useState('');
  const [ultimo, setUltimo] = useState<{ id: Id; mensaje: string; ok: boolean } | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const valorDe = (l: LineaConteoVista): number | null => (enCurso ? (borrador[l.varianteId] ?? null) : l.contado);
  const cambios = d.lineas.filter((l) => enCurso && (borrador[l.varianteId] ?? null) !== l.contado && borrador[l.varianteId] !== null && borrador[l.varianteId] !== undefined);
  const resumen = useMemo(() => resumirConteo(d.lineas.map((l) => ({ sistema: enCurso ? l.sistema : l.sistemaAlIniciar, contado: valorDe(l), costo: l.costo }))), [d.lineas, borrador, enCurso]); // eslint-disable-line react-hooks/exhaustive-deps -- valorDe lee borrador

  const lineasVista = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return d.lineas.filter((l) => {
      const v = valorDe(l);
      const dif = diferenciaConteo(enCurso ? l.sistema : l.sistemaAlIniciar, v);
      if (vista === 'sin_contar' && dif.tipo !== 'sin_contar') return false;
      if (vista === 'con_diferencia' && (dif.tipo === 'sin_contar' || dif.tipo === 'cuadra')) return false;
      if (q && !`${l.producto.nombre} ${l.producto.referencia} ${l.sku} ${l.ean13} ${l.color?.nombre ?? ''} ${l.talla}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [d.lineas, vista, texto, borrador, enCurso]); // eslint-disable-line react-hooks/exhaustive-deps -- valorDe lee borrador

  const guardarCambios = (): boolean => {
    if (cambios.length === 0) return true;
    const r = acciones.guardarConteo({ conteoId: c.id, cantidades: Object.fromEntries(cambios.map((l) => [l.varianteId, borrador[l.varianteId] ?? 0])) });
    if (!r.ok) {
      avisar({ tipo: 'error', texto: r.error.mensaje });
      return false;
    }
    return true;
  };

  const guardar = () => {
    if (guardarCambios()) avisar({ tipo: 'exito', texto: 'Avance guardado', detalle: `${plural(resumen.contadas, 'prenda contada', 'prendas contadas')} de ${entero(resumen.total)}.` });
  };

  const escanear = () => {
    const q = codigo.trim();
    if (!q) return;
    const l = d.lineas.find((x) => x.ean13 === q || x.sku.toLowerCase() === q.toLowerCase());
    if (!l) {
      setUltimo({ id: '', mensaje: `El código ${q} no hace parte de este conteo.`, ok: false });
    } else {
      setBorrador((b) => ({ ...b, [l.varianteId]: (b[l.varianteId] ?? 0) + 1 }));
      setUltimo({ id: l.varianteId, mensaje: `${l.producto.nombre} · ${l.color?.nombre} · ${l.talla}`, ok: true });
    }
    setCodigo('');
  };

  const columnas: ColumnaTabla<LineaConteoVista>[] = [
    {
      id: 'prenda',
      encabezado: 'Prenda',
      celda: (l) => (
        <span className="flex items-center gap-3">
          <MiniaturaPrenda tipo={l.producto.tipoPrenda} color={l.color?.hex ?? '#C9C9C7'} patron={l.color?.patron} tamano="tabla" />
          <span className="min-w-0">
            <span className="block truncate t-body font-semibold text-ink">{l.producto.nombre}</span>
            <span className="block t-small text-muted">
              {l.color?.nombre} · talla {l.talla} · <span className="t-ref">{l.sku}</span>
            </span>
          </span>
        </span>
      ),
    },
    { id: 'sistema', encabezado: enCurso ? 'Dice el sistema' : 'Sistema al iniciar', numerica: true, celda: (l) => entero(enCurso ? l.sistema : l.sistemaAlIniciar) },
    {
      id: 'contado',
      encabezado: 'Contado',
      numerica: true,
      celda: (l) =>
        enCurso ? (
          <InputNumero
            etiqueta={`Contado de ${l.producto.nombre} ${l.color?.nombre} ${l.talla}`}
            etiquetaOculta
            tamano="sm"
            valor={borrador[l.varianteId] ?? null}
            alCambiar={(v) => setBorrador((b) => ({ ...b, [l.varianteId]: v }))}
            className="ml-auto w-24"
            data-testid={`contado-${l.varianteId}`}
          />
        ) : l.contado === null ? (
          <span className="text-disabled">—</span>
        ) : (
          entero(l.contado)
        ),
    },
    {
      id: 'diferencia',
      encabezado: 'Diferencia',
      numerica: true,
      ordenar: (l) => diferenciaConteo(enCurso ? l.sistema : l.sistemaAlIniciar, valorDe(l)).diferencia ?? 0,
      celda: (l) => {
        const dif = diferenciaConteo(enCurso ? l.sistema : l.sistemaAlIniciar, valorDe(l));
        if (dif.tipo === 'sin_contar') return <span className="text-disabled">Sin contar</span>;
        if (dif.tipo === 'cuadra')
          return (
            <Badge tono="success" tamano="sm">
              Cuadra
            </Badge>
          );
        const n = dif.diferencia ?? 0;
        return (
          <Badge tono={dif.tipo === 'faltante' ? 'danger' : 'warning'} tamano="sm">
            {n > 0 ? '+' : '−'}
            {entero(Math.abs(n))} {dif.tipo === 'faltante' ? 'faltan' : 'sobran'}
          </Badge>
        );
      },
    },
    ...(verCostos
      ? ([
          {
            id: 'valor',
            encabezado: 'Valor a costo',
            numerica: true,
            celda: (l: LineaConteoVista) => {
              const dif = diferenciaConteo(enCurso ? l.sistema : l.sistemaAlIniciar, valorDe(l));
              return dif.diferencia ? <Dinero valor={dif.diferencia * l.costo} /> : <span className="text-disabled">—</span>;
            },
          },
        ] satisfies ColumnaTabla<LineaConteoVista>[])
      : []),
    ...(!enCurso && c.estado === 'aplicado'
      ? ([{ id: 'motivo', encabezado: 'Motivo', celda: (l: LineaConteoVista) => (c.aplicado?.motivos[l.varianteId] ? MOTIVOS_AJUSTE[c.aplicado.motivos[l.varianteId] as MotivoAjuste] : '') }] satisfies ColumnaTabla<LineaConteoVista>[])
      : []),
  ];

  const cancelar = () => {
    const r = acciones.cancelarConteo({ conteoId: c.id });
    if (!r.ok) return avisar({ tipo: 'error', texto: r.error.mensaje });
    avisar({ tipo: 'info', texto: `Conteo ${c.numero} cancelado`, detalle: 'No se ajustó ninguna existencia.' });
    navegar(rutas.conteos());
  };

  const estadoVisible = enCurso && resumen.conDiferencia > 0 ? ESTADOS_CONTEO.con_diferencias : ESTADOS_CONTEO[c.estado];

  return (
    <div className="pb-16" data-testid="detalle-conteo" data-estado={c.estado}>
      <EncabezadoPagina
        migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Inventario', a: rutas.inventario() }, { texto: 'Conteos físicos', a: rutas.conteos() }, { texto: c.numero }]}
        eyebrow="Conteo físico"
        titulo={c.numero}
        insignia={<BadgeEstado estado={estadoVisible} />}
        subtitulo={
          <span>
            {d.local} · {c.categorias ? `${plural(c.categorias.length, 'categoría')}` : 'todo el local'} · lo inició {d.responsable} <Fecha valor={c.iniciado} formato="fechaHora" />
          </span>
        }
        acciones={
          enCurso && (
            <>
              <Button variante="secondary" icono={Ban} onClick={() => setCancelando(true)} data-testid="cancelar-conteo">
                Cancelar conteo
              </Button>
              <Button variante="secondary" icono={Save} onClick={guardar} disabled={cambios.length === 0} data-testid="guardar-conteo">
                {cambios.length > 0 ? `Guardar avance (${entero(cambios.length)})` : 'Avance guardado'}
              </Button>
              <Button icono={CheckCheck} onClick={() => setAplicando(true)} disabled={resumen.conDiferencia === 0} motivo="Aún no hay diferencias para ajustar" data-testid="aplicar-conteo">
                Aplicar ajustes
              </Button>
            </>
          )
        }
      />

      <FranjaResumen
        className="mt-8"
        cifras={[
          { etiqueta: 'Contadas', valor: <span data-testid="conteo-contadas">{`${entero(resumen.contadas)} de ${entero(resumen.total)}`}</span> },
          { etiqueta: 'Con diferencia', valor: <span data-testid="conteo-diferencias">{entero(resumen.conDiferencia)}</span> },
          { etiqueta: 'Sobran · faltan', valor: `${entero(resumen.unidadesSobrantes)} · ${entero(resumen.unidadesFaltantes)}` },
          verCostos ? { etiqueta: 'Valor de las diferencias', valor: <Dinero valor={resumen.valorDiferencia} /> } : { etiqueta: 'Sin contar', valor: entero(resumen.sinContar) },
        ]}
      />

      {enCurso && (
        <form
          className="mt-4 flex flex-wrap items-end gap-3 border border-line bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            escanear();
          }}
        >
          <Input
            className="min-w-[320px] flex-1"
            etiqueta="Escanea el código de barras o escribe el SKU"
            icono={ScanBarcode}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="2048100014237"
            inputMode="numeric"
            data-testid="conteo-escaner"
          />
          <Button variante="secondary" type="submit" data-testid="conteo-sumar">
            Sumar una unidad
          </Button>
          {ultimo && (
            <p className={`min-w-0 flex-1 t-small ${ultimo.ok ? 'text-success' : 'text-danger'}`} role="status" data-testid="conteo-ultimo">
              {ultimo.ok ? `Sumada: ${ultimo.mensaje}` : ultimo.mensaje}
            </p>
          )}
        </form>
      )}

      <div className="mt-4">
        <Table
          columnas={columnas}
          filas={lineasVista}
          clave={(l) => l.varianteId}
          sustantivo={['prenda', 'prendas']}
          etiqueta="Prendas del conteo"
          resaltada={(l) => !!ultimo && l.varianteId === ultimo.id}
          data-testid="tabla-conteo"
          porPagina={50}
          vacio={<EmptyState tamano="tabla" icono={ClipboardList} titulo="Ninguna prenda con este filtro" texto="Cambia el filtro o la búsqueda para ver las demás prendas del conteo." />}
          barra={
            <Toolbar
              buscar={{ valor: texto, alCambiar: setTexto, placeholder: 'Buscar por nombre, referencia, SKU o código' }}
              derecha={
                <Segmentado
                  etiqueta="Qué prendas mostrar"
                  valor={vista}
                  alCambiar={setVista}
                  opciones={[
                    { valor: 'todas', etiqueta: `Todas ${entero(d.lineas.length)}` },
                    { valor: 'sin_contar', etiqueta: `Sin contar ${entero(resumen.sinContar)}` },
                    { valor: 'con_diferencia', etiqueta: `Con diferencia ${entero(resumen.conDiferencia)}` },
                  ]}
                />
              }
            />
          }
        />
      </div>

      {c.estado === 'aplicado' && c.aplicado && (
        <p className="mt-4 t-small text-muted">
          Ajustes aplicados <Fecha valor={c.aplicado.ts} formato="fechaHora" />; los movimientos quedaron en el{' '}
          <Link to={rutas.movimientos({ local: c.localId })} className="font-bold text-ink underline-offset-4 hover:underline">
            kárdex
          </Link>
          .
        </p>
      )}

      <DialogoAplicar
        abierto={aplicando}
        alCambiar={setAplicando}
        d={d}
        borrador={borrador}
        alAplicar={(motivos) => {
          if (!guardarCambios()) return false;
          const r = acciones.aplicarConteo({ conteoId: c.id, motivos });
          if (!r.ok) {
            avisar({ tipo: 'error', texto: r.error.mensaje });
            return false;
          }
          avisar({ tipo: 'exito', texto: `Conteo ${c.numero} aplicado`, detalle: `${plural(Object.keys(motivos).length, 'ajuste')} en las existencias de ${d.local}.` });
          return true;
        }}
      />
      <ConfirmarEliminacion
        abierto={cancelando}
        alCambiar={setCancelando}
        pregunta={`¿Cancelar el conteo ${c.numero}?`}
        consecuencias={`Se descarta lo contado (${plural(resumen.contadas, 'prenda contada', 'prendas contadas')}). No se ajusta ninguna existencia.`}
        accion="Cancelar conteo"
        nota={null}
        alConfirmar={cancelar}
      />
    </div>
  );
}

function DialogoAplicar({ abierto, alCambiar, d, borrador, alAplicar }: { abierto: boolean; alCambiar: (a: boolean) => void; d: DetalleConteo; borrador: Record<Id, number | null>; alAplicar: (motivos: Record<Id, MotivoAjuste>) => boolean }) {
  const [motivos, setMotivos] = useState<Record<Id, MotivoAjuste | ''>>({});
  const [paraTodas, setParaTodas] = useState<MotivoAjuste | ''>('');
  const [mostrarErrores, setMostrarErrores] = useState(false);
  const conDif = d.lineas.filter((l) => {
    const v = borrador[l.varianteId];
    return v !== null && v !== undefined && v !== l.sistema;
  });
  const faltan = conDif.filter((l) => !motivos[l.varianteId]).length;

  const aplicar = () => {
    if (faltan > 0) return setMostrarErrores(true);
    const m: Record<Id, MotivoAjuste> = {};
    for (const l of conDif) m[l.varianteId] = motivos[l.varianteId] as MotivoAjuste;
    if (alAplicar(m)) {
      alCambiar(false);
      setMotivos({});
      setParaTodas('');
      setMostrarErrores(false);
    }
  };

  const opcionesMotivo = (Object.keys(MOTIVOS_AJUSTE) as MotivoAjuste[]).map((m) => ({ valor: m, etiqueta: MOTIVOS_AJUSTE[m] }));

  return (
    <Dialog
      abierto={abierto}
      alCambiar={alCambiar}
      eyebrow={d.conteo.numero}
      titulo="Aplicar ajustes del conteo"
      descripcion="Cada diferencia necesita su motivo. Los ajustes quedan en el kárdex y corrigen las existencias del local."
      ancho="lg"
      data-testid="dialogo-aplicar-conteo"
      pie={
        <>
          <Button variante="secondary" onClick={() => alCambiar(false)}>
            Cancelar
          </Button>
          <Button onClick={aplicar} data-testid="confirmar-aplicar">
            Aplicar {plural(conDif.length, 'ajuste')}
          </Button>
        </>
      }
    >
      <div className="mb-4 max-w-[320px]">
        <Select
          etiqueta="Mismo motivo para todas"
          valor={paraTodas || null}
          alCambiar={(v) => {
            setParaTodas(v as MotivoAjuste);
            setMotivos(Object.fromEntries(conDif.map((l) => [l.varianteId, v as MotivoAjuste])));
          }}
          opciones={opcionesMotivo}
          placeholder="Elige un motivo"
          enModal
          data-testid="motivo-todas"
        />
      </div>
      <ul className="divide-y divide-line-soft border border-line">
        {conDif.map((l) => {
          const n = (borrador[l.varianteId] ?? 0) - l.sistema;
          return (
            <li key={l.varianteId} className="flex items-center gap-3 px-3 py-2">
              <MiniaturaPrenda tipo={l.producto.tipoPrenda} color={l.color?.hex ?? '#C9C9C7'} patron={l.color?.patron} tamano="buscador" />
              <div className="min-w-0 flex-1">
                <p className="truncate t-body font-semibold text-ink">{l.producto.nombre}</p>
                <p className="t-small text-muted">
                  {l.color?.nombre} · talla {l.talla} · sistema <span className="num">{entero(l.sistema)}</span>, contado <span className="num">{entero(borrador[l.varianteId] ?? 0)}</span>
                </p>
              </div>
              <Badge tono={n < 0 ? 'danger' : 'warning'} tamano="sm">
                {n > 0 ? '+' : '−'}
                {entero(Math.abs(n))}
              </Badge>
              <Select
                etiqueta="Motivo"
                etiquetaOculta
                tamano="sm"
                ancho={170}
                valor={motivos[l.varianteId] || null}
                alCambiar={(v) => setMotivos((m) => ({ ...m, [l.varianteId]: v as MotivoAjuste }))}
                opciones={opcionesMotivo}
                placeholder="Motivo"
                enModal
                error={mostrarErrores && !motivos[l.varianteId] ? 'Elige el motivo' : undefined}
              />
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}

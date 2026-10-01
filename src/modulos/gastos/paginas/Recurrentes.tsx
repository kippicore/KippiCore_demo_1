import { useState } from 'react';
import { CalendarClock, Pause, Pencil, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import {
  BotonAccionesFila,
  Badge,
  Button,
  ConfirmarEliminacion,
  Dialog,
  Dinero,
  EmptyState,
  Fecha,
  ItemMenu,
  Kpi,
  Menu,
  SeparadorMenu,
  Table,
  avisar,
  useResaltar,
  type ColumnaTabla,
} from '@/ui';
import { ESTADOS_POR_PAGAR } from '@/config/estados';
import type { MesISO } from '@/dominio/tipos';
import { useAcciones, useDinero, useHoy, useSel } from '@/estado';
import { entero, mesAnio, plural } from '@/lib/formato';
import { mesEfectivo, type EstadoRecurrenteMes } from '../calculos';
import { FormularioRecurrente } from '../componentes/FormularioRecurrente';
import { EncabezadoGastos, LimiteError, SelectorMes } from '../componentes/Piezas';
import { selGastosDeRecurrente, selRecurrentes, type FilaRecurrente } from '../selectores';
import { ETIQUETA_CATEGORIA, TEXTOS } from '../textos';
import { useParamsRuta } from '@/app/useParamsRuta';

const ESTADO_BADGE: Record<EstadoRecurrenteMes, { etiqueta: string; tono: 'success' | 'warning' | 'outline' | 'muted' | 'neutral' }> = {
  generado: { etiqueta: 'Generado', tono: ESTADOS_POR_PAGAR.pagado.tono },
  por_generar: { etiqueta: 'Por generar', tono: ESTADOS_POR_PAGAR.pendiente.tono },
  proximo: { etiqueta: 'Aún no toca', tono: ESTADOS_POR_PAGAR.programado.tono },
  pausado: { etiqueta: 'En pausa', tono: 'muted' },
  fuera_de_vigencia: { etiqueta: 'Fuera de vigencia', tono: 'neutral' },
};

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export default function Recurrentes() {
  const hoy = useHoy();
  const { resaltar } = useParamsRuta('gastosRecurrentes');
  const [mes, setMes] = useState<MesISO>(() => mesEfectivo(null, hoy));
  const [formulario, setFormulario] = useState<{ fila: FilaRecurrente | null } | null>(null);
  const [generando, setGenerando] = useState(false);

  return (
    <>
      <EncabezadoGastos
        titulo={TEXTOS.recurrentes.titulo}
        subtitulo={TEXTOS.recurrentes.subtitulo}
        migaFinal="Recurrentes"
        acciones={
          <>
            <Button variante="secondary" icono={CalendarClock} onClick={() => setGenerando(true)} data-testid="recurrentes-generar">
              Generar {mesAnio(mes).replace(/ de \d{4}$/, '')}
            </Button>
            <Button icono={Plus} onClick={() => setFormulario({ fila: null })} data-testid="recurrentes-nuevo">
              Nuevo recurrente
            </Button>
          </>
        }
      />
      <LimiteError>
        <CuerpoRecurrentes mes={mes} setMes={setMes} resaltar={resaltar ?? null} alEditar={(fila) => setFormulario({ fila })} alCrear={() => setFormulario({ fila: null })} alGenerar={() => setGenerando(true)} />
      </LimiteError>
      {formulario && <FormularioRecurrente key={formulario.fila?.recurrente.id ?? 'nuevo'} recurrente={formulario.fila?.recurrente ?? null} alCerrar={() => setFormulario(null)} />}
      {generando && <DialogoGenerar mes={mes} alCerrar={() => setGenerando(false)} />}
    </>
  );
}

function CuerpoRecurrentes({
  mes,
  setMes,
  resaltar,
  alEditar,
  alCrear,
  alGenerar,
}: {
  mes: MesISO;
  setMes: (m: MesISO) => void;
  resaltar: string | null;
  alEditar: (f: FilaRecurrente) => void;
  alCrear: () => void;
  alGenerar: () => void;
}) {
  const hoy = useHoy();
  const dinero = useDinero();
  const acciones = useAcciones();
  const resaltarUrl = useResaltar();
  const vista = useSel(selRecurrentes, { mes, hoy });
  const [aEliminar, setAEliminar] = useState<FilaRecurrente | null>(null);
  const generadosDeEliminar = useSel(selGastosDeRecurrente, { recurrenteId: aEliminar?.recurrente.id ?? '' });
  const idResaltado = resaltar ?? resaltarUrl;

  const alternar = (f: FilaRecurrente) => {
    const r = acciones.editarGastoRecurrente({ recurrenteId: f.recurrente.id, cambios: { activo: !f.recurrente.activo } });
    if (!r.ok) avisar({ tipo: 'error', texto: r.error.mensaje });
    else avisar({ tipo: 'exito', texto: f.recurrente.activo ? 'Recurrente en pausa' : 'Recurrente activo', detalle: f.recurrente.nombre });
  };

  const eliminar = () => {
    if (!aEliminar) return;
    const r = acciones.eliminarGastoRecurrente({ recurrenteId: aEliminar.recurrente.id });
    if (!r.ok) avisar({ tipo: 'error', texto: r.error.mensaje });
    else avisar({ tipo: 'exito', texto: 'Recurrente eliminado', detalle: `${aEliminar.recurrente.nombre} ya no se genera` });
    setAEliminar(null);
  };

  const columnas: ColumnaTabla<FilaRecurrente>[] = [
    {
      id: 'nombre',
      encabezado: 'Gasto',
      truncar: true,
      ancho: '24%',
      celda: (f) => (
        <span className="block min-w-0">
          <span className="block truncate font-semibold">{f.recurrente.nombre}</span>
          {f.proveedorNombre && <span className="block truncate t-small text-muted">{f.proveedorNombre}</span>}
        </span>
      ),
      ordenar: (f) => f.recurrente.nombre,
    },
    { id: 'categoria', encabezado: 'Categoría', celda: (f) => ETIQUETA_CATEGORIA[f.categoria], ordenar: (f) => ETIQUETA_CATEGORIA[f.categoria] },
    { id: 'local', encabezado: 'Local', celda: (f) => f.localNombre, ordenar: (f) => f.localNombre },
    { id: 'dia', encabezado: 'Día', numerica: true, alinear: 'der', celda: (f) => f.recurrente.diaDelMes, ordenar: (f) => f.recurrente.diaDelMes },
    {
      id: 'pago',
      encabezado: 'Cómo se paga',
      truncar: true,
      ancho: '18%',
      celda: (f) =>
        f.recurrente.formaPago === 'debito_automatico'
          ? `Débito · ${f.cuentaNombre ?? 'una cuenta'}`
          : `Por pagar · ${f.recurrente.diasPlazo} ${f.recurrente.diasPlazo === 1 ? 'día' : 'días'}`,
    },
    { id: 'valor', encabezado: 'Valor mensual', numerica: true, alinear: 'der', celda: (f) => <Dinero valor={f.recurrente.valor} />, ordenar: (f) => f.recurrente.valor },
    {
      id: 'estado',
      encabezado: <span title={`Estado en ${mesAnio(mes)}`}>En {mesAnio(mes).replace(/ de \d{4}$/, '')}</span>,
      celda: (f) => {
        const e = ESTADO_BADGE[f.estado];
        return (
          <Badge tono={e.tono} tamano="sm" title={f.estado === 'proximo' || f.estado === 'por_generar' ? `Le toca el ${f.fechaPrevista}` : undefined}>
            {f.estado === 'proximo' ? `Le toca el ${Number(f.fechaPrevista.slice(8))}` : e.etiqueta}
          </Badge>
        );
      },
      ordenar: (f) => f.estado,
    },
    {
      id: 'generados',
      encabezado: 'Generados',
      numerica: true,
      alinear: 'der',
      celda: (f) => (
        <span className="num">
          {entero(f.generados)}
          {f.ultimoMes && <span className="ml-1.5 t-small text-muted">· {mesAnio(f.ultimoMes).replace(/ de /, ' ')}</span>}
        </span>
      ),
      ordenar: (f) => f.generados,
    },
  ];

  return (
    <div className="mt-8 flex flex-col gap-10">
      <section aria-label="Mes" className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <SelectorMes hoy={hoy} valor={mes} alCambiar={setMes} etiqueta="Ver el estado en" className="w-[240px]" />
        <p className="max-w-[56ch] pb-2 t-small text-muted">Cada mes los recurrentes activos se generan una sola vez: si ya existe el de un mes, no se repite.</p>
      </section>

      {vista.porGenerar.length > 0 && (
        <section aria-label="Pendientes" className="flex flex-wrap items-center justify-between gap-4 border border-line border-l-2 border-l-accent bg-surface px-6 py-4" data-testid="recurrentes-aviso">
          <p className="t-body text-ink">
            <strong className="font-bold">
              {plural(vista.porGenerar.length, 'gasto recurrente')}
            </strong>{' '}
            de {mesAnio(mes)} ya {vista.porGenerar.length === 1 ? 'le toca' : 'les toca'} y no {vista.porGenerar.length === 1 ? 'se ha generado' : 'se han generado'}:{' '}
            <Dinero valor={vista.valorPorGenerar} corta />.
          </p>
          <Button onClick={alGenerar}>Revisar y generar</Button>
        </section>
      )}

      <section aria-label="Cifras" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi etiqueta="Se van cada mes" valor={vista.totalMensual} formatear={dinero.corta} completo={dinero(vista.totalMensual)} destacada nota={`${vista.activos} ${vista.activos === 1 ? 'recurrente activo' : 'recurrentes activos'}`} />
        <Kpi etiqueta="Ya generados" valor={vista.filas.filter((f) => f.estado === 'generado').length} formatear={entero} nota={`En ${mesAnio(mes)}`} />
        <Kpi
          etiqueta="Por generar"
          valor={vista.valorPorGenerar}
          formatear={dinero.corta}
          completo={dinero(vista.valorPorGenerar)}
          nota={vista.porGenerar.length === 0 ? 'Al día: no falta ninguno' : `${plural(vista.porGenerar.length, 'gasto')} sin generar`}
        />
      </section>

      <section aria-label="Recurrentes" data-testid="recurrentes-tabla">
        <Table
          columnas={columnas}
          filas={vista.filas}
          clave={(f) => f.recurrente.id}
          sustantivo={['recurrente', 'recurrentes']}
          etiqueta="Gastos recurrentes"
          porPagina={25}
          ordenInicial={{ id: 'valor', dir: 'desc' }}
          alAbrir={alEditar}
          resaltada={(f) => f.recurrente.id === idResaltado}
          totales={{ valor: <Dinero valor={vista.totalMensual} /> }}
          vacio={
            <EmptyState
              tamano="tabla"
              icono={Repeat}
              titulo={TEXTOS.recurrentes.vacioTitulo}
              texto={TEXTOS.recurrentes.vacioTexto}
              accion={
                <Button icono={Plus} onClick={alCrear}>
                  Nuevo recurrente
                </Button>
              }
            />
          }
          accionesFila={(f) => (
            <Menu etiqueta={`Acciones de ${f.recurrente.nombre}`} disparador={<BotonAccionesFila aria-label={`Acciones de ${f.recurrente.nombre}`} />}>
              <ItemMenu icono={Pencil} onSelect={() => alEditar(f)}>
                Editar
              </ItemMenu>
              <ItemMenu icono={f.recurrente.activo ? Pause : Play} onSelect={() => alternar(f)}>
                {f.recurrente.activo ? 'Pausar' : 'Reactivar'}
              </ItemMenu>
              <SeparadorMenu />
              <ItemMenu icono={Trash2} peligro onSelect={() => setAEliminar(f)}>
                Eliminar
              </ItemMenu>
            </Menu>
          )}
        />
      </section>

      <ConfirmarEliminacion
        abierto={!!aEliminar}
        alCambiar={(a) => !a && setAEliminar(null)}
        pregunta={`¿Eliminar «${aEliminar?.recurrente.nombre ?? ''}»?`}
        consecuencias={
          aEliminar && (
            <>
              Dejará de generarse desde el próximo mes ({<Dinero valor={aEliminar.recurrente.valor} />} al mes).{' '}
              {generadosDeEliminar > 0
                ? `Lo que ya generó (${plural(generadosDeEliminar, 'gasto')}) se conserva en los resultados. Si solo quieres detenerlo por un tiempo, mejor ponlo en pausa.`
                : 'Todavía no ha generado ningún gasto.'}
            </>
          )
        }
        accion="Eliminar recurrente"
        alConfirmar={eliminar}
      />
    </div>
  );
}

/** "Generar este mes": lista lo que se va a crear antes de crearlo, y lo que todavía no le toca. */
function DialogoGenerar({ mes, alCerrar }: { mes: MesISO; alCerrar: () => void }) {
  const hoy = useHoy();
  const dinero = useDinero();
  const acciones = useAcciones();
  const vista = useSel(selRecurrentes, { mes, hoy });
  const [error, setError] = useState<string | null>(null);
  const proximos = vista.filas.filter((f) => f.estado === 'proximo');
  const generar = () => {
    const enCurso = mes === hoy.slice(0, 7);
    const r = acciones.generarGastosRecurrentesMes({ mes, hasta: enCurso ? hoy : null });
    if (!r.ok) {
      setError(r.error.mensaje);
      return;
    }
    const ids = r.eventos.flatMap((e) => (e.tipo === 'GastoRegistrado' ? [e.gastoId] : []));
    const total = ids.reduce((a, id) => a + (r.despues.gastos[id]?.valor ?? 0), 0);
    avisar({
      tipo: 'exito',
      texto: ids.length === 0 ? 'No había nada por generar' : `${plural(ids.length, 'gasto')} de ${mesAnio(mes)} ${ids.length === 1 ? 'generado' : 'generados'}`,
      detalle: ids.length === 0 ? `${mayuscula(mesAnio(mes))} ya estaba al día` : `Sumaron ${dinero(total)}`,
    });
    alCerrar();
  };
  return (
    <Dialog
      abierto
      alCambiar={(a) => !a && alCerrar()}
      eyebrow="Gastos recurrentes"
      titulo={`Generar ${mesAnio(mes)}`}
      descripcion="Se crean los gastos cuya fecha ya llegó. Los que ya existen no se repiten."
      ancho="md"
      data-testid="recurrentes-dialogo-generar"
      pie={
        <>
          <Button variante="secondary" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={generar} disabled={vista.porGenerar.length === 0} motivo={`${mayuscula(mesAnio(mes))} ya está al día.`} data-testid="recurrentes-confirmar-generar">
            {vista.porGenerar.length === 0 ? 'Nada por generar' : `Generar ${plural(vista.porGenerar.length, 'gasto')}`}
          </Button>
        </>
      }
    >
      {vista.porGenerar.length > 0 ? (
        <ul className="divide-y divide-line-soft border-y border-line-soft" data-testid="recurrentes-lista-generar">
          {vista.porGenerar.map((f) => (
            <li key={f.recurrente.id} className="flex items-center justify-between gap-4 py-3">
              <span className="min-w-0">
                <span className="block truncate t-body font-semibold text-ink">{f.recurrente.nombre}</span>
                <span className="block t-small text-muted">
                  <Fecha valor={f.fechaPrevista} formato="larga" /> ·{' '}
                  {f.recurrente.formaPago === 'debito_automatico' ? `Sale de ${f.cuentaNombre ?? 'una cuenta'}` : `Queda por pagar a ${f.recurrente.diasPlazo} días`}
                </span>
              </span>
              <Dinero valor={f.recurrente.valor} />
            </li>
          ))}
          <li className="flex items-center justify-between gap-4 py-3">
            <span className="t-label font-bold text-ink">Total</span>
            <span className="t-label font-bold text-ink">
              <Dinero valor={vista.valorPorGenerar} />
            </span>
          </li>
        </ul>
      ) : (
        <p className="t-body text-ink-2">Todos los recurrentes de {mesAnio(mes)} que ya les tocaba están generados. No hay nada por crear.</p>
      )}
      {proximos.length > 0 && (
        <p className="mt-4 t-small text-muted">
          Todavía no les toca: {proximos.map((f) => `${f.recurrente.nombre} (el ${Number(f.fechaPrevista.slice(8))})`).join(', ')}.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 border border-danger bg-danger-soft px-4 py-3 t-body text-ink">
          {error}
        </p>
      )}
    </Dialog>
  );
}

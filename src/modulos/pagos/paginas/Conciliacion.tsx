import { Check, CircleCheckBig } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { rutas } from '@/app/rutas';
import { sumarDias } from '@/dominio/reglas/fechas';
import { useHoy, useSel } from '@/estado';
import { selPendientesConciliar, selSaldosCuentas, type PendienteConciliar } from '@/selectores';
import { entero, plural } from '@/lib/formato';
import { BotonPildora, Button, cn, Dialog, Dinero, EmptyState, Fecha, FranjaResumen, GrupoRadio, SelectorRango, Table, textoRango, Toolbar, type ColumnaTabla } from '@/ui';
import { filtrarPendientes, pendientesPorCuenta } from '../calculos';
import { EncabezadoPagos } from '../componentes/EncabezadoPagos';
import { useConciliar } from '../hooks';
import { TXT } from '../textos';

/** Máximo de movimientos que se concilian de una sola vez desde "Conciliar todo lo que ves". */
const MAXIMO_LOTE = 2000;

export default function Conciliacion() {
  const hoy = useHoy();
  const conciliar = useConciliar();
  const cuentas = useSel(selSaldosCuentas).cuentas;
  const pendientes = useSel(selPendientesConciliar);
  const [cuentaId, setCuentaId] = useState<string | null>(null);
  const [rango, setRango] = useState({ desde: sumarDias(hoy, -6), hasta: hoy });
  const [texto, setTexto] = useState('');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState(false);

  const porCuenta = useMemo(() => pendientesPorCuenta(pendientes), [pendientes]);
  const nombreCuenta = (id: string) => cuentas.find((c) => c.cuenta.id === id)?.cuenta.nombre ?? id;
  const filas = useMemo(() => filtrarPendientes(pendientes, { cuentaId, desde: rango.desde, hasta: rango.hasta, texto }), [pendientes, cuentaId, rango, texto]);
  const entra = filas.reduce((a, f) => a + (f.valor > 0 ? f.valor : 0), 0);
  const sale = filas.reduce((a, f) => a + (f.valor < 0 ? -f.valor : 0), 0);
  const elegidas = filas.filter((f) => seleccion.has(f.id));
  const refs = (lista: PendienteConciliar[]) => lista.map((f) => ({ tipo: f.tipo, id: f.id, ventaId: f.ventaId }));

  const columnas: ColumnaTabla<PendienteConciliar>[] = [
    { id: 'fecha', encabezado: 'Fecha', celda: (f) => <Fecha valor={f.ts} formato="fechaHora" />, ordenar: (f) => f.ts, ancho: 215 },
    { id: 'cuenta', encabezado: 'Cuenta', celda: (f) => <span className="t-small text-ink-2">{nombreCuenta(f.cuentaId)}</span>, ordenar: (f) => nombreCuenta(f.cuentaId), ancho: 170 },
    {
      id: 'descripcion',
      encabezado: 'Qué es',
      celda: (f) =>
        f.ventaId ? (
          <Link to={rutas.venta(f.ventaId)} className="t-body text-ink underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>
            {f.descripcion}
          </Link>
        ) : (
          <span className="t-body text-ink">{f.descripcion}</span>
        ),
      ordenar: (f) => f.descripcion,
    },
    { id: 'valor', encabezado: 'Valor', numerica: true, celda: (f) => <Dinero valor={f.valor} className="font-semibold" />, ordenar: (f) => f.valor, ancho: 140 },
    {
      id: 'conciliar',
      encabezado: <span className="sr-only">Conciliar</span>,
      alinear: 'der',
      ancho: 130,
      celda: (f) => (
        <Button
          variante="ghost"
          tamano="sm"
          icono={Check}
          onClick={(e) => {
            e.stopPropagation();
            conciliar(refs([f]), true);
          }}
          data-testid="conciliar-fila"
        >
          Conciliar
        </Button>
      ),
    },
  ];

  const total = pendientes.length;
  const puedeTodo = filas.length > 0 && filas.length <= MAXIMO_LOTE;

  return (
    <>
      <EncabezadoPagos titulo="Conciliación" subtitulo={TXT.conciliacion.subtitulo} migaActual="Conciliación" />

      <FranjaResumen
        className="mt-8"
        cifras={[
          { etiqueta: 'Pendientes por conciliar', valor: <span className="num" data-testid="conciliacion-total">{entero(total)}</span> },
          { etiqueta: 'En lo que ves', valor: <span className="num" data-testid="conciliacion-filtro">{entero(filas.length)}</span> },
          { etiqueta: 'Entra', valor: <Dinero valor={entra} /> },
          { etiqueta: 'Sale', valor: <Dinero valor={sale} /> },
        ]}
      />

      <div className="mt-6 grid grid-cols-2 gap-3 desk:grid-cols-4" role="group" aria-label="Pendientes por cuenta">
        {cuentas.map((c) => {
          const x = porCuenta.get(c.cuenta.id);
          const activa = cuentaId === c.cuenta.id;
          return (
            <button
              key={c.cuenta.id}
              type="button"
              aria-pressed={activa}
              onClick={() => setCuentaId(activa ? null : c.cuenta.id)}
              data-testid="conciliacion-cuenta"
              className={cn(
                'border bg-surface p-4 text-left outline-none transition-colors duration-(--dur-instant) hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                activa ? 'border-ink shadow-[inset_0_0_0_1px_var(--c-ink)]' : 'border-line',
              )}
            >
              <span className="block truncate t-label font-bold text-ink">{c.cuenta.nombre}</span>
              <span className="mt-2 block t-kpi-sm num text-ink">{entero(x?.n ?? 0)}</span>
              <span className="block t-small text-muted">{x?.n ? plural(x.n, 'pendiente', 'pendientes') : 'Al día'}</span>
            </button>
          );
        })}
      </div>

      <Table
        className="mt-6"
        etiqueta="Movimientos por conciliar"
        columnas={columnas}
        filas={filas}
        clave={(f) => f.id}
        sustantivo={['movimiento', 'movimientos']}
        ordenInicial={{ id: 'fecha', dir: 'desc' }}
        seleccion={seleccion}
        alSeleccionar={setSeleccion}
        accionesLote={
          <Button
            variante="ghost"
            tamano="sm"
            icono={Check}
            onClick={() => {
              if (conciliar(refs(elegidas), true)) setSeleccion(new Set());
            }}
            data-testid="conciliar-lote"
          >
            Marcar como conciliado
          </Button>
        }
        totales={{ valor: <Dinero valor={entra - sale} /> }}
        data-testid="tabla-conciliacion"
        vacio={
          <EmptyState
            tamano="tabla"
            icono={CircleCheckBig}
            titulo="Nada por conciliar en lo que ves"
            texto="Todo lo de estas fechas y esta cuenta ya está conciliado. Amplía las fechas para revisar más atrás."
          />
        }
        barra={
          <Toolbar
            buscar={{ valor: texto, alCambiar: setTexto, placeholder: 'Buscar por venta o descripción' }}
            filtros={
              <>
                <BotonPildora etiqueta="Cuenta" valor={cuentaId ? nombreCuenta(cuentaId) : 'Todas'} anchoPanel={280}>
                  <GrupoRadio
                    valor={cuentaId ?? 'todas'}
                    alCambiar={(v) => setCuentaId(v === 'todas' ? null : v)}
                    opciones={[{ valor: 'todas', etiqueta: 'Todas las cuentas' }, ...cuentas.map((c) => ({ valor: c.cuenta.id, etiqueta: c.cuenta.nombre }))]}
                  />
                </BotonPildora>
                <BotonPildora etiqueta="Fechas" valor={textoRango(rango, hoy)} anchoPanel={720}>
                  <SelectorRango soloPanel hoy={hoy} valor={rango} alCambiar={setRango} />
                </BotonPildora>
              </>
            }
            derecha={
              <Button variante="secondary" tamano="sm" icono={Check} disabled={!puedeTodo} motivo={filas.length === 0 ? 'No hay nada por conciliar en lo que ves' : `Son demasiados (${entero(filas.length)}): acorta las fechas o elige una cuenta`} onClick={() => setConfirmar(true)} data-testid="conciliar-todo">
                Conciliar todo lo que ves
              </Button>
            }
          />
        }
      />

      <Dialog
        abierto={confirmar}
        alCambiar={setConfirmar}
        eyebrow="Conciliación"
        titulo={`¿Conciliar ${plural(filas.length, 'movimiento', 'movimientos')}?`}
        descripcion="Úsalo solo si ya revisaste que lo que ves coincide con tu extracto o con la caja."
        ancho="sm"
        pie={
          <>
            <Button variante="secondary" onClick={() => setConfirmar(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (conciliar(refs(filas), true)) {
                  setSeleccion(new Set());
                  setConfirmar(false);
                }
              }}
              data-testid="conciliar-todo-confirmar"
            >
              Conciliar {entero(filas.length)}
            </Button>
          </>
        }
      >
        <p className="t-body text-ink">
          Entran <Dinero valor={entra} /> y salen <Dinero valor={sale} />.
        </p>
        <p className="mt-2 t-small text-muted">Puedes quitar la conciliación de cualquier movimiento desde el libro de su cuenta.</p>
      </Dialog>
    </>
  );
}

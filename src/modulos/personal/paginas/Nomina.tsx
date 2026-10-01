import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, ReceiptText } from 'lucide-react';
import { Badge, BotonExportar, Button, Dialog, Dinero, EmptyState, Fecha, Kpi, Segmentado, Switch, Table, avisar, useResaltar, type ColumnaTabla } from '@/ui';
import { PREFIJOS } from '@/dominio/motor/ids';
import type { LiquidacionNomina, PeriodoNomina } from '@/dominio/tipos';
import { useAcciones, useAhora, useDinero, useHoy, useSel } from '@/estado';
import { plural } from '@/lib/formato';
import { rutas } from '@/app/rutas';
import { selLiquidaciones, selPeriodoAbierto } from '@/selectores';
import { CajonLinea } from '../componentes/CajonLinea';
import { DialogoPila } from '../componentes/DialogosEmpleado';
import { EncabezadoPersonal, LimiteError, NotaNomina } from '../componentes/Piezas';
import { pilaPendiente, TablaLineas } from '../componentes/TablaLineas';
import { mesDelPeriodo, selContratoDeLinea, selParametrosNomina, selVistaPreviaConPersonas, type LineaConPersona } from '../selectores';
import { TEXTOS } from '../textos';

/** Nómina (PRD 7.9, W6): vista previa del periodo, aprobar, pagar y historial, con el desprendible por persona. */
export default function Nomina() {
  return (
    <div className="pb-16" data-testid="personal-nomina">
      <EncabezadoPersonal titulo={TEXTOS.nomina.titulo} subtitulo={TEXTOS.nomina.subtitulo} />
      <LimiteError>
        <CuerpoNomina />
      </LimiteError>
    </div>
  );
}

type Via = 'quincenal' | 'mensual';

function CuerpoNomina() {
  const hoy = useHoy();
  const ahora = useAhora();
  const periodos = useSel(selPeriodoAbierto, { hoy });
  const hayQuincenal = !!periodos.quincenal;
  const hayMensual = !!periodos.mensual;
  const [via, setVia] = useState<Via>(hayQuincenal ? 'quincenal' : 'mensual');
  const periodo = (via === 'quincenal' ? periodos.quincenal : periodos.mensual) ?? periodos.quincenal ?? periodos.mensual;
  const vistaEfectiva: Via = periodo?.tipo ?? via;

  return (
    <div className="mt-8 flex flex-col gap-12">
      <section aria-label="Periodo en curso" className="flex flex-col gap-6" data-testid="personal-periodo">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="t-eyebrow text-ink-2">Periodo por liquidar</p>
            <h2 className="mt-1 t-h2 text-ink" data-testid="personal-periodo-etiqueta">
              {periodo ? periodo.etiqueta : TEXTOS.nomina.sinPeriodoTitulo}
            </h2>
            {periodo && (
              <p className="mt-1 t-body text-muted">
                Del <Fecha valor={periodo.inicio} formato="larga" /> al <Fecha valor={periodo.fin} formato="larga" />
              </p>
            )}
          </div>
          {(hayQuincenal || hayMensual) && (
            <Segmentado
              etiqueta="Forma de pago del periodo"
              valor={vistaEfectiva}
              alCambiar={(v) => setVia(v)}
              opciones={[
                { valor: 'quincenal', etiqueta: 'Pago quincenal', 'data-testid': 'personal-via-quincenal' },
                { valor: 'mensual', etiqueta: 'Pago mensual', 'data-testid': 'personal-via-mensual' },
              ]}
            />
          )}
        </div>
        {periodo ? (
          <VistaPrevia key={`${periodo.tipo}-${periodo.inicio}`} periodo={periodo} hoy={hoy} ahora={ahora} />
        ) : (
          <div className="border border-line bg-surface" data-testid="personal-al-dia">
            <EmptyState icono={CheckCircle2} titulo={TEXTOS.nomina.sinPeriodoTitulo} texto={TEXTOS.nomina.sinPeriodoTexto} />
          </div>
        )}
      </section>

      <Historial hoy={hoy} />
      <NotaNomina />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Vista previa del periodo
// ---------------------------------------------------------------------------------------------------------
function VistaPrevia({ periodo, hoy, ahora }: { periodo: PeriodoNomina; hoy: string; ahora: string }) {
  const acciones = useAcciones();
  const navegar = useNavigate();
  const dinero = useDinero();
  const parametros = useSel(selParametrosNomina);
  const [exoneracion, setExoneracion] = useState(true);
  const [elegida, setElegida] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [verificando, setVerificando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const v = useSel(selVistaPreviaConPersonas, { periodo, exoneracion, ahora });
  const liq = v.liquidacion;
  const totales = liq?.totales ?? null;
  const fila = useMemo(() => v.lineas.find((l) => l.linea.empleadoId === elegida) ?? null, [v.lineas, elegida]);
  const sinPila = v.lineas.filter((l) => pilaPendiente(l.linea));
  const contratoVerificando = verificando ? v.lineas.find((l) => l.linea.contratoId === verificando) : null;

  const aprobar = () => {
    setError(null);
    const liquidacionId = acciones.nuevoId(PREFIJOS.liquidacion);
    const r = acciones.aprobarNomina({ liquidacionId, periodo, exoneracion114: exoneracion, insumos: null });
    if (!r.ok) {
      setError(r.error.mensaje);
      return;
    }
    setConfirmando(false);
    avisar({ tipo: 'exito', texto: `Nómina de ${periodo.etiqueta} aprobada`, detalle: 'Ya puedes pagarla y descargar los desprendibles.', accion: { texto: 'Ver la liquidación', a: rutas.liquidacion(liquidacionId) } });
    navegar(rutas.liquidacion(liquidacionId));
  };

  if (v.error || !liq)
    return (
      <div className="border border-line bg-surface" data-testid="personal-sin-vista">
        <EmptyState icono={ReceiptText} titulo="No se puede liquidar este periodo" texto={v.error ?? 'No hay personas para liquidar en este periodo.'} />
      </div>
    );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="max-w-[56ch]" data-testid="personal-exoneracion-nomina">
          <Switch etiqueta="Exoneración de aportes (salud, ICBF y SENA)" activo={exoneracion && parametros.exoneracion114.activa} alCambiar={setExoneracion} deshabilitado={!parametros.exoneracion114.activa} valorTexto={exoneracion ? 'Exonerado' : 'No exonerado'} />
          <p className="mt-1 t-small text-muted">Valor ilustrativo · verificar. Cambia los aportes de toda la nómina en vivo.</p>
        </div>
        <Button onClick={() => setConfirmando(true)} data-testid="personal-aprobar">
          Aprobar nómina
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 wide:grid-cols-4" data-testid="personal-totales-periodo" data-costo={liq.totales.costo} data-neto={liq.totales.neto}>
        <Kpi etiqueta="Lo que ganan" valor={liq.totales.devengado} formatear={dinero.corta} completo={dinero(liq.totales.devengado)} nota="Devengado de todas las personas" />
        <Kpi etiqueta="Lo que se les descuenta" valor={liq.totales.deducciones} formatear={dinero.corta} completo={dinero(liq.totales.deducciones)} nota="Salud, pensión y retenciones" />
        <Kpi etiqueta="Neto a pagar" valor={liq.totales.neto} formatear={dinero.corta} completo={dinero(liq.totales.neto)} nota={plural(v.lineas.length, 'persona')} data-testid="personal-kpi-neto" />
        <Kpi
          etiqueta="Costo para el negocio"
          valor={liq.totales.costo}
          formatear={dinero.corta}
          completo={dinero(liq.totales.costo)}
          destacada
          nota={`Con ${dinero.corta(liq.totales.aportes)} de aportes y ${dinero.corta(liq.totales.provisiones)} de provisiones`}
          data-testid="personal-kpi-costo-periodo"
        />
      </div>

      {sinPila.length > 0 && (
        <p className="border border-line border-l-2 border-l-warning bg-surface px-5 py-4 t-body text-ink-2" data-testid="personal-aviso-pila-periodo">
          {plural(sinPila.length, 'contratista')} sin la planilla de seguridad social verificada: su pago queda pendiente de soporte PILA. Abre su fila para verificarla.
        </p>
      )}

      <TablaLineas lineas={v.lineas} totales={totales} alAbrir={(l) => setElegida(l.linea.empleadoId)} etiqueta="Vista previa de la nómina" />

      <CajonLinea
        fila={fila}
        parametros={liq.parametros}
        periodo={periodo.etiqueta}
        alCerrar={() => setElegida(null)}
        alVerificarPila={(contratoId) => setVerificando(contratoId)}
      />
      {contratoVerificando && <DialogoPilaDeLinea fila={contratoVerificando} periodo={periodo} alCerrar={() => setVerificando(null)} />}

      <Dialog
        abierto={confirmando}
        alCambiar={setConfirmando}
        eyebrow="Nómina"
        titulo={`Aprobar la nómina de ${periodo.etiqueta}`}
        descripcion={TEXTOS.nomina.aprobarConsecuencias}
        ancho="md"
        data-testid="personal-dialogo-aprobar"
        pie={
          <>
            <Button variante="secondary" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button onClick={aprobar} data-testid="personal-confirmar-aprobar">
              Aprobar nómina
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-3 gap-4 border-y border-line-soft py-4">
            <div>
              <dt className="t-small text-muted">Personas</dt>
              <dd className="t-kpi-sm text-ink">{v.lineas.length}</dd>
            </div>
            <div>
              <dt className="t-small text-muted">Neto a pagar</dt>
              <dd className="t-kpi-sm text-ink">
                <Dinero valor={liq.totales.neto} corta />
              </dd>
            </div>
            <div>
              <dt className="t-small text-muted">Costo para el negocio</dt>
              <dd className="t-kpi-sm text-ink">
                <Dinero valor={liq.totales.costo} corta />
              </dd>
            </div>
          </dl>
          {periodo.fin > hoy && (
            <p className="border border-line border-l-2 border-l-warning bg-surface px-4 py-3 t-body text-ink-2" data-testid="personal-aviso-periodo-abierto">
              {TEXTOS.nomina.periodoNoTermina.replace('{fecha}', periodo.fin.split('-').reverse().join('/'))}
            </p>
          )}
          {sinPila.length > 0 && <p className="t-body text-ink-2">{plural(sinPila.length, 'contratista')} quedan con su pago pendiente de soporte PILA.</p>}
          {error && (
            <p role="alert" className="border border-danger bg-danger-soft px-4 py-3 t-body text-ink" data-testid="personal-error-aprobar">
              {error}
            </p>
          )}
        </div>
      </Dialog>
    </>
  );
}

/** Verificación de PILA de la línea elegida: el mes es el del periodo que cierra. */
function DialogoPilaDeLinea({ fila, periodo, alCerrar }: { fila: LineaConPersona; periodo: PeriodoNomina; alCerrar: () => void }) {
  const contrato = useSel(selContratoDeLinea, { contratoId: fila.linea.contratoId });
  if (!contrato) return null;
  return <DialogoPila contrato={contrato} nombre={fila.nombre} mes={mesDelPeriodo(periodo.fin)} alCerrar={alCerrar} />;
}

// ---------------------------------------------------------------------------------------------------------
// Historial
// ---------------------------------------------------------------------------------------------------------
function Historial({ hoy }: { hoy: string }) {
  const navegar = useNavigate();
  const resaltar = useResaltar();
  const liquidaciones = useSel(selLiquidaciones);
  const columnas: ColumnaTabla<LiquidacionNomina>[] = [
    { id: 'numero', encabezado: 'Nómina', ancho: 130, celda: (l) => <span className="num font-semibold">{l.numero}</span>, ordenar: (l) => l.numero },
    { id: 'periodo', encabezado: 'Periodo', truncar: true, ancho: '30%', celda: (l) => l.periodo.etiqueta, ordenar: (l) => l.periodo.fin },
    {
      id: 'estado',
      encabezado: 'Estado',
      celda: (l) => (
        <Badge tono={l.estado === 'pagada' ? 'success' : 'warning'} tamano="sm">
          {l.estado === 'pagada' ? 'Pagada' : 'Aprobada'}
        </Badge>
      ),
      ordenar: (l) => l.estado,
    },
    { id: 'personas', encabezado: 'Personas', numerica: true, alinear: 'der', celda: (l) => l.lineas.length, ordenar: (l) => l.lineas.length },
    { id: 'neto', encabezado: 'Neto pagado', numerica: true, alinear: 'der', celda: (l) => <Dinero valor={l.totales.neto} />, ordenar: (l) => l.totales.neto },
    { id: 'costo', encabezado: 'Costo para el negocio', numerica: true, alinear: 'der', celda: (l) => <Dinero valor={l.totales.costo} className="font-semibold" />, ordenar: (l) => l.totales.costo },
    { id: 'aprobada', encabezado: 'Aprobada', ancho: 120, celda: (l) => <Fecha valor={l.aprobada.ts.slice(0, 10)} />, ordenar: (l) => l.aprobada.ts },
  ];
  return (
    <section aria-label="Historial de nóminas" className="flex flex-col gap-4" data-testid="personal-historial">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="t-h2 text-ink">Historial de nóminas</h2>
          <p className="mt-1 t-body text-muted">Cada periodo aprobado con su desprendible por persona y su resumen en Excel.</p>
        </div>
        <BotonExportar reporte="nomina" menu filtros={{ desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy }} />
      </div>
      <Table
        columnas={columnas}
        filas={liquidaciones}
        clave={(l) => l.id}
        sustantivo={['nómina', 'nóminas']}
        etiqueta="Historial de nóminas"
        alAbrir={(l) => navegar(rutas.liquidacion(l.id))}
        resaltada={(l) => l.id === resaltar}
        porPagina={25}
        vacio={<EmptyState tamano="tabla" icono={ReceiptText} titulo={TEXTOS.nomina.historialVacioTitulo} texto={TEXTOS.nomina.historialVacioTexto} />}
      />
    </section>
  );
}

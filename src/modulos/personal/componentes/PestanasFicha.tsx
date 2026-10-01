import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { FileText, UserCog, WalletCards } from 'lucide-react';
import { Badge, BotonEnlace, Button, Dinero, EmptyState, Fecha, Kpi, ParesDatos, Table, type ColumnaTabla } from '@/ui';
import { BotonDocumentoPdf } from '@/ui/conectados/BotonDocumentoPdf';
import { ESTADOS_PERSONAL } from '@/config/estados';
import type { Contrato, MesISO } from '@/dominio/tipos';
import { useAcciones, useDinero, useHoy, useSel } from '@/estado';
import { cedula, celular, cifraCorta, mesAnio, porcentaje } from '@/lib/formato';
import { rutas } from '@/app/rutas';
import { selComisiones } from '@/selectores';
import { antiguedad, frasesEsquema, mesesRecientes } from '../calculos';
import { selDesprendibles, selParametrosNomina, type Desprendible, type FichaEmpleado } from '../selectores';
import {
  ETIQUETA_CARGO,
  ETIQUETA_CUENTA,
  ETIQUETA_DOCUMENTO,
  ETIQUETA_MODALIDAD,
  ETIQUETA_PERIODICIDAD,
  ETIQUETA_RIESGO_ARL,
  ETIQUETA_VINCULACION,
} from '../textos';
import { DesgloseComision, TablaDetalleComision } from './DetalleComision';
import { DialogoPila } from './DialogosEmpleado';
import { FraseVista, InsigniasPersona, NotaNomina, SelectorMes, SinPropagar } from './Piezas';

/**
 * Pestañas de la ficha de una persona (PLAN 9.4 C1): datos, contrato, comisiones y desprendibles. La pestaña "costo"
 * (W6) vive en `PanelCosto`.
 */
function Seccion({ titulo, ayuda, children, acciones, id }: { titulo: string; ayuda?: string; children: ReactNode; acciones?: ReactNode; id?: string }) {
  return (
    <section className="border border-line bg-surface p-6" aria-label={titulo} data-testid={id}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="t-h3 text-ink">{titulo}</h2>
          {ayuda && <p className="mt-1 max-w-[64ch] t-small text-muted">{ayuda}</p>}
        </div>
        {acciones}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------------------------------------
export function PestanaDatos({ ficha }: { ficha: FichaEmpleado }) {
  const hoy = useHoy();
  const e = ficha.empleado;
  const c = ficha.contrato;
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 desk:grid-cols-2" data-testid="personal-pestana-datos">
      <Seccion titulo="Datos personales" id="personal-datos-personales">
        <ParesDatos
          pares={[
            ['Nombre', `${e.nombres} ${e.apellidos}`],
            [ETIQUETA_DOCUMENTO[e.documento.tipo], <span key="d" className="num">{cedula(e.documento.numero)}</span>],
            ['Fecha de nacimiento', e.fechaNacimiento ? <Fecha key="n" valor={e.fechaNacimiento} formato="larga" /> : 'Sin registrar'],
            ['Celular', <span key="c" className="num">{celular(e.celular)}</span>],
            ['Correo', <span key="m" className="break-all">{e.correo}</span>],
          ]}
        />
      </Seccion>
      <Seccion titulo="Cargo y vinculación" id="personal-datos-cargo">
        <ParesDatos
          pares={[
            ['Cargo', ETIQUETA_CARGO[e.cargo]],
            ['Local', ficha.localNombre],
            ['Ingreso', <span key="i"><Fecha valor={e.fechaIngreso} formato="larga" /> · {antiguedad(e.fechaIngreso, e.fechaRetiro && e.fechaRetiro < hoy ? e.fechaRetiro : hoy)}</span>],
            ['Vinculación', <InsigniasPersona key="v" tipo={c?.tipo ?? null} riesgo={!!ficha.riesgo} retirado={ficha.retirado} tamano="md" />],
            ...(e.fechaRetiro ? ([['Retiro', <Fecha key="r" valor={e.fechaRetiro} formato="larga" />]] as [string, ReactNode][]) : []),
            ['Pago', c ? ETIQUETA_PERIODICIDAD[c.periodicidadPago] : '—'],
          ]}
        />
      </Seccion>
      <Seccion titulo="Afiliaciones" ayuda="Entidades a las que se le paga la seguridad social. Nombres de ejemplo." id="personal-datos-afiliaciones">
        <ParesDatos
          pares={[
            ['EPS', e.afiliaciones.eps],
            ['Fondo de pensión', e.afiliaciones.pension],
            ['Fondo de cesantías', e.afiliaciones.cesantias],
            ['ARL', e.afiliaciones.arl],
            ['Caja de compensación', e.afiliaciones.caja],
          ]}
        />
      </Seccion>
      <div className="flex flex-col gap-6">
        <Seccion titulo="Cuenta para el pago" id="personal-datos-cuenta">
          <ParesDatos
            pares={[
              ['Banco o billetera', e.cuentaPago.entidad],
              ['Tipo', ETIQUETA_CUENTA[e.cuentaPago.tipo]],
              ['Número', <span key="n" className="num">{e.cuentaPago.numeroEnmascarado}</span>],
            ]}
          />
        </Seccion>
        <Seccion titulo="Contacto de emergencia" id="personal-datos-emergencia">
          <ParesDatos
            pares={[
              ['Nombre', e.contactoEmergencia.nombre],
              ['Parentesco', e.contactoEmergencia.parentesco],
              ['Celular', <span key="c" className="num">{celular(e.contactoEmergencia.celular)}</span>],
            ]}
          />
        </Seccion>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Contrato
// ---------------------------------------------------------------------------------------------------------
const ultimosMeses = (hoy: string) => mesesRecientes(hoy, 6);

function PilaContratista({ contrato, nombre }: { contrato: Contrato; nombre: string }) {
  const hoy = useHoy();
  const acciones = useAcciones();
  const [verificando, setVerificando] = useState<MesISO | null>(null);
  const meses = ultimosMeses(hoy);
  const quitar = (mes: MesISO) => acciones.verificarPila({ contratoId: contrato.id, periodo: mes, verificada: false, soporte: null });
  return (
    <Seccion
      titulo="Seguridad social del contratista"
      ayuda="Antes de pagarle honorarios, confirma que aportó a su seguridad social. Sin planilla verificada, la cuenta por pagar queda pendiente de soporte."
      id="personal-pila"
    >
      <ul className="divide-y divide-line-soft border-y border-line-soft">
        {meses.map((m) => {
          const v = contrato.verificacionesPila.find((x) => x.periodo === m);
          const ok = !!v?.verificada;
          return (
            <li key={m} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3" data-testid={`personal-pila-${m}`} data-verificada={ok ? 'si' : 'no'}>
              <span className="min-w-0">
                <span className="block t-body font-semibold text-ink">{mesAnio(m).replace(/^./, (c) => c.toUpperCase())}</span>
                <span className="block t-small text-muted">{ok ? (v?.soporte ? `Soporte: ${v.soporte.nombreArchivo}` : 'Verificada') : 'Sin soporte de la planilla'}</span>
              </span>
              <span className="flex items-center gap-3">
                <Badge tono={ok ? 'success' : 'warning'} tamano="sm">
                  {ok ? 'Verificada' : 'Pendiente de soporte PILA'}
                </Badge>
                {ok ? (
                  <Button variante="ghost" tamano="sm" onClick={() => quitar(m)}>
                    Quitar verificación
                  </Button>
                ) : (
                  <Button variante="secondary" tamano="sm" onClick={() => setVerificando(m)} data-testid={`personal-verificar-pila-${m}`}>
                    Verificar planilla
                  </Button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {verificando && <DialogoPila contrato={contrato} nombre={nombre} mes={verificando} alCerrar={() => setVerificando(null)} />}
    </Seccion>
  );
}

export function PestanaContrato({ ficha, alReemplazar }: { ficha: FichaEmpleado; alReemplazar: () => void }) {
  const parametros = useSel(selParametrosNomina);
  const c = ficha.contrato;
  const reemplazar = ficha.retirado ? null : (
    <Button variante="secondary" tamano="sm" icono={UserCog} onClick={alReemplazar} data-testid="personal-reemplazar-contrato">
      Nuevo contrato
    </Button>
  );
  if (!c)
    return (
      <div className="mt-8 border border-line bg-surface" data-testid="personal-sin-contrato">
        <EmptyState icono={WalletCards} titulo="Sin contrato vigente" texto="Esta persona no tiene un contrato vigente. Crea uno para calcular su nómina y su costo." accion={reemplazar} />
      </div>
    );
  const laboral = c.tipo === 'laboral';
  const historial = ficha.contratos;
  const columnas: ColumnaTabla<Contrato>[] = [
    { id: 'inicio', encabezado: 'Desde', ancho: 120, celda: (x) => <Fecha valor={x.inicio} />, ordenar: (x) => x.inicio },
    { id: 'fin', encabezado: 'Hasta', ancho: 120, celda: (x) => (x.fin ? <Fecha valor={x.fin} /> : <span className="text-muted">Vigente</span>) },
    {
      id: 'tipo',
      encabezado: 'Vinculación',
      celda: (x) => <Badge tono={ESTADOS_PERSONAL[x.tipo].tono} tamano="sm">{ESTADOS_PERSONAL[x.tipo].etiqueta}</Badge>,
    },
    { id: 'valor', encabezado: 'Salario u honorarios', numerica: true, alinear: 'der', celda: (x) => <Dinero valor={(x.tipo === 'laboral' ? x.salarioBase : x.honorarios) ?? 0} />, ordenar: (x) => (x.tipo === 'laboral' ? x.salarioBase : x.honorarios) ?? 0 },
  ];
  return (
    <div className="mt-8 flex flex-col gap-6" data-testid="personal-pestana-contrato">
      <div className="grid grid-cols-1 gap-6 desk:grid-cols-2">
        <Seccion titulo="Contrato vigente" acciones={reemplazar} id="personal-contrato-vigente">
          <ParesDatos
            pares={[
              ['Vinculación', ETIQUETA_VINCULACION[c.tipo]],
              ...(laboral && c.modalidadLaboral ? ([['Modalidad', ETIQUETA_MODALIDAD[c.modalidadLaboral]]] as [string, ReactNode][]) : []),
              [laboral ? 'Salario mensual' : 'Honorarios mensuales', <Dinero key="v" valor={(laboral ? c.salarioBase : c.honorarios) ?? 0} className="font-semibold" />],
              ['Empieza', <Fecha key="i" valor={c.inicio} formato="larga" />],
              ['Termina', c.fin ? <Fecha key="f" valor={c.fin} formato="larga" /> : 'Sin fecha final'],
              ['Horas a la semana', `${c.jornadaSemanalHoras} h`],
              ...(laboral ? ([['Riesgo de ARL', ETIQUETA_RIESGO_ARL[c.riesgoArl]]] as [string, ReactNode][]) : []),
              ['Se le paga', ETIQUETA_PERIODICIDAD[c.periodicidadPago]],
              ...(!laboral ? ([['Retención en la fuente', porcentaje(c.retencionFuente ?? parametros.prestacionServicios.retencionFuente, 1)]] as [string, ReactNode][]) : []),
            ]}
          />
        </Seccion>
        <Seccion
          titulo="Esquema de comisión"
          ayuda={ficha.esquema ? 'Así se calcula lo que gana esta persona por vender.' : 'Esta persona no gana comisión.'}
          acciones={
            ficha.esquema ? (
              <BotonEnlace to={rutas.comisiones({ empleado: ficha.empleado.id })} variante="ghost" tamano="sm">
                Ver sus comisiones
              </BotonEnlace>
            ) : undefined
          }
          id="personal-contrato-esquema"
        >
          {ficha.esquema ? (
            <>
              <p className="t-body font-semibold text-ink">{ficha.esquema.nombre}</p>
              <ul className="mt-2 flex flex-col gap-2">
                {frasesEsquema(ficha.esquema).map((f, i) => (
                  <li key={i}>
                    <FraseVista frase={f} className="t-body text-ink-2" />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="t-body text-muted">Para asignarle un esquema, crea un nuevo contrato y elígelo.</p>
          )}
        </Seccion>
      </div>
      {!laboral && !ficha.retirado && <PilaContratista contrato={c} nombre={`${ficha.empleado.nombres} ${ficha.empleado.apellidos}`} />}
      <Seccion titulo="Historial de contratos" ayuda="Cada nuevo contrato cierra el anterior el día previo a su inicio." id="personal-contrato-historial">
        <Table columnas={columnas} filas={historial} clave={(x) => x.id} sustantivo={['contrato', 'contratos']} etiqueta="Historial de contratos" porPagina={25} />
      </Seccion>
      <NotaNomina />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Comisiones
// ---------------------------------------------------------------------------------------------------------
export function PestanaComisiones({ ficha }: { ficha: FichaEmpleado }) {
  const hoy = useHoy();
  const dinero = useDinero();
  const [mes, setMes] = useState<MesISO>(hoy.slice(0, 7));
  const c = useSel(selComisiones, { mes, hoy, empleadoId: ficha.empleado.id })[0] ?? null;
  if (!ficha.esquema)
    return (
      <div className="mt-8 border border-line bg-surface" data-testid="personal-sin-esquema">
        <EmptyState
          icono={WalletCards}
          titulo="Esta persona no gana comisión"
          texto="Su contrato no tiene un esquema de comisión. Puedes asignarle uno con un nuevo contrato."
          accion={
            <BotonEnlace to={rutas.empleadoPestana(ficha.empleado.slug, 'contrato')} variante="secondary">
              Ir al contrato
            </BotonEnlace>
          }
        />
      </div>
    );
  return (
    <div className="mt-8 flex flex-col gap-8" data-testid="personal-pestana-comisiones">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SelectorMes hoy={hoy} valor={mes} alCambiar={setMes} className="w-[240px]" />
        <BotonEnlace to={rutas.comisiones({ mes, empleado: ficha.empleado.id })} variante="secondary" tamano="sm">
          Abrir en Comisiones
        </BotonEnlace>
      </div>
      {c && (
        <>
          <div className="grid grid-cols-1 gap-4 desk:grid-cols-3">
            <Kpi etiqueta={`Comisión de ${mes === hoy.slice(0, 7) ? 'este mes' : mesAnio(mes)}`} valor={c.comision.total} formatear={dinero.corta} completo={dinero(c.comision.total)} destacada data-testid="personal-comision-total" />
            <Kpi etiqueta="Ventas sin IVA que cuentan" valor={c.base} formatear={dinero.corta} completo={dinero(c.base)} nota="Menos devoluciones y separados cancelados" />
            <Kpi
              etiqueta="Meta del local"
              valor={c.metaLocalMes > 0 ? c.ventasLocalMes / c.metaLocalMes : 0}
              formatear={(n) => porcentaje(n, 0)}
              nota={c.metaLocalMes > 0 ? `Meta de ${cifraCorta(c.metaLocalMes)}` : 'Sin meta fijada este mes'}
            />
          </div>
          <DesgloseComision comision={c} conMeta={false} />
          <TablaDetalleComision comision={c} />
        </>
      )}
      <NotaNomina />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Desprendibles
// ---------------------------------------------------------------------------------------------------------
export function PestanaDesprendibles({ ficha }: { ficha: FichaEmpleado }) {
  const navegar = useNavigate();
  const filas = useSel(selDesprendibles, { empleadoId: ficha.empleado.id });
  const columnas: ColumnaTabla<Desprendible>[] = [
    { id: 'periodo', encabezado: 'Periodo', truncar: true, ancho: '30%', celda: (f) => f.liquidacion.periodo.etiqueta, ordenar: (f) => f.liquidacion.periodo.fin },
    { id: 'numero', encabezado: 'Nómina', ancho: 130, celda: (f) => <span className="num">{f.liquidacion.numero}</span>, ordenar: (f) => f.liquidacion.numero },
    {
      id: 'estado',
      encabezado: 'Estado',
      celda: (f) => (
        <Badge tono={f.liquidacion.estado === 'pagada' ? 'success' : 'warning'} tamano="sm">
          {f.liquidacion.estado === 'pagada' ? 'Pagada' : 'Aprobada'}
        </Badge>
      ),
      ordenar: (f) => f.liquidacion.estado,
    },
    { id: 'neto', encabezado: 'Neto pagado', numerica: true, alinear: 'der', celda: (f) => <Dinero valor={f.linea.netoAPagar} />, ordenar: (f) => f.linea.netoAPagar },
    { id: 'costo', encabezado: 'Costo para el negocio', numerica: true, alinear: 'der', celda: (f) => <Dinero valor={f.linea.costoEmpleador} />, ordenar: (f) => f.linea.costoEmpleador },
    {
      id: 'pdf',
      encabezado: 'Desprendible',
      alinear: 'der',
      celda: (f) => (
        <SinPropagar>
          <BotonDocumentoPdf documento={{ tipo: 'desprendible', liquidacionId: f.liquidacion.id, empleadoId: ficha.empleado.id }} etiqueta="PDF" />
        </SinPropagar>
      ),
    },
  ];
  return (
    <div className="mt-8 flex flex-col gap-4" data-testid="personal-pestana-desprendibles">
      <Table
        columnas={columnas}
        filas={filas}
        clave={(f) => f.liquidacion.id}
        sustantivo={['desprendible', 'desprendibles']}
        etiqueta="Desprendibles de pago"
        porPagina={25}
        ordenInicial={{ id: 'periodo', dir: 'desc' }}
        alAbrir={(f) => navegar(rutas.liquidacion(f.liquidacion.id))}
        vacio={
          <EmptyState tamano="tabla" icono={FileText} titulo="Todavía no hay desprendibles" texto="Cuando se apruebe una nómina en la que aparezca esta persona, su desprendible de pago queda aquí para descargarlo." />
        }
      />
      <p className="t-small text-muted">
        Cada desprendible se descarga en PDF con la marca del negocio. Toca una fila para ver la liquidación completa de ese periodo o ve a{' '}
        <Link to={rutas.nomina()} className="font-bold text-ink underline underline-offset-4">
          Nómina
        </Link>
        .
      </p>
      <NotaNomina />
    </div>
  );
}

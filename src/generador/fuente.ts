import type {
  ClaveExistencia,
  EntradaRegistro,
  EstadoDominio,
  FechaHoraISO,
  FechaISO,
  SobreComando,
} from '@/dominio/tipos';
import { CONFIG, type Config } from '@/config';
import { SEED, type Seed } from '@/seed';
import { construir, type FuenteGenerada, type Progreso } from '@/dominio/motor/construir';
import { estadoInicial } from '@/dominio/motor/estado-inicial';
import { fechaDe } from '@/dominio/reglas/fechas';
import { idHijo } from '@/dominio/motor/ids';
import { HISTORIA_IMPORTACIONES } from '@/seed/importaciones';
import { masDias } from './calendario';
import { Gen, idSesion } from './contexto';
import { planificarDia } from './dia';
import { Plan } from './plan';
import type { IntencionGen } from './tipos';
import { materializarCajaAbrir, materializarCajaCerrar, materializarDatafono } from './materializar/caja';
import { materializarImportacion } from './materializar/importaciones';
import { materializarConteo, materializarRecibirTraslados, materializarReposicion } from './materializar/inventario';
import { idsSolicitudes, materializarNarrativa, PERSONAS_NARRATIVA } from './materializar/narrativa';
import { materializarMarcacion, materializarNomina, materializarTurnosSemana } from './materializar/personal';
import {
  materializarAltas,
  materializarApertura,
  materializarCierreMes,
  materializarOcasionales,
  materializarPagos,
  materializarPrestaciones,
  materializarPreparacion,
  materializarTasa,
} from './materializar/plata';
import {
  materializarBono,
  materializarRevision,
  materializarVenta,
  materializarVentaGuion,
} from './materializar/ventas';

/**
 * Fuente generada (PLAN 7.4, 5.6.4): implementa `FuenteGenerada` del motor con el plan (puro), las
 * intenciones del día (sin leer el estado) y la materialización (lee el estado y aplica las guardas). El
 * generador nunca escribe el estado de dominio: emite comandos que aplica el mismo manejador del POS.
 */
export interface EntradaGenerador {
  ancla: FechaISO;
  /** Instante hasta el que se construye (Bogotá). */
  ahora: FechaHoraISO;
  semilla?: string;
  escala?: number;
  registro?: readonly EntradaRegistro[];
  config?: Config;
  seed?: Seed;
  /** Diagnóstico de comandos generados omitidos (debe ser 0). */
  alOmitirGenerado?: (sobre: SobreComando, mensaje: string) => void;
}

type Materializador = (g: Gen, it: IntencionGen, estado: EstadoDominio) => Generator<SobreComando>;

const MATERIALIZADORES: Record<IntencionGen['tipo'], Materializador> = {
  preparacion: materializarPreparacion,
  tasa: materializarTasa,
  'dia.apertura': materializarApertura,
  'caja.abrir': materializarCajaAbrir,
  'caja.cerrar': materializarCajaCerrar,
  'datafono.abono': materializarDatafono,
  'bono.venta': materializarBono,
  'turnos.semana': materializarTurnosSemana,
  marcacion: materializarMarcacion,
  venta: materializarVenta,
  'venta.guion': materializarVentaGuion,
  revision: materializarRevision,
  reposicion: materializarReposicion,
  conteo: materializarConteo,
  'traslados.recibir': materializarRecibirTraslados,
  'importacion.hito': materializarImportacion,
  'cxp.pagos': materializarPagos,
  'cliente.alta': materializarAltas,
  'nomina.periodo': materializarNomina,
  'mes.cierre': materializarCierreMes,
  prestaciones: materializarPrestaciones,
  'gastos.ocasionales': materializarOcasionales,
  narrativa: materializarNarrativa,
};

/** Días de la ventana: de la víspera (carga inicial) al día de `ahora`. */
export function diasDeVentana(plan: Plan, ahora: FechaHoraISO): FechaISO[] {
  const r: FechaISO[] = [];
  const hasta = fechaDe(ahora);
  for (let d = plan.vispera; d <= hasta; d = masDias(d, 1)) r.push(d);
  return r;
}

/** Medición opcional por tipo de intención (scripts/medir-generador.ts): el reloj lo pasa quien mide. */
export interface Medidor {
  reloj: () => number;
  registrar: (tipo: string, ms: number) => void;
}

function* medido(
  m: Medidor,
  tipo: string,
  g: Generator<SobreComando>,
): Generator<SobreComando> {
  const t0 = m.reloj();
  try {
    yield* g;
  } finally {
    m.registrar(tipo, m.reloj() - t0);
  }
}

export function crearFuente(
  plan: Plan,
  ahora: FechaHoraISO,
  medidor?: Medidor,
): { fuente: FuenteGenerada<IntencionGen>; gen: Gen } {
  const gen = new Gen(plan);
  const fuente: FuenteGenerada<IntencionGen> = {
    dias: diasDeVentana(plan, ahora),
    planificarDia: medidor
      ? (dia) => {
          const t0 = medidor.reloj();
          const r = planificarDia(plan, dia);
          medidor.registrar('planificarDia', medidor.reloj() - t0);
          return r;
        }
      : (dia) => planificarDia(plan, dia),
    materializar: medidor
      ? (it, estado) => medido(medidor, it.tipo, MATERIALIZADORES[it.tipo](gen, it, estado))
      : (it, estado) => MATERIALIZADORES[it.tipo](gen, it, estado),
  };
  return { fuente, gen };
}

/** Plan del generador para unas entradas (puro y barato). */
export function crearPlan(e: Pick<EntradaGenerador, 'ancla' | 'semilla' | 'escala' | 'config' | 'seed'>): {
  plan: Plan;
  base: EstadoDominio;
} {
  const config = e.config ?? CONFIG;
  const seed = e.seed ?? SEED;
  const semilla = e.semilla ?? config.demo.semilla;
  const escala = e.escala ?? config.demo.escala;
  const base = estadoInicial({ semilla, ancla: e.ancla, escala, config, seed });
  const plan = new Plan({ semilla, ancla: e.ancla, escala, base, config, seed });
  return { plan, base };
}

/** Datos de bookkeeping en `meta` que no son hechos de dominio (demanda insatisfecha y entidades narrativas). */
function completarMeta(estado: EstadoDominio, plan: Plan, gen: Gen, ahora: FechaHoraISO): void {
  // Demanda insatisfecha de las últimas 12 semanas (hallazgo de tallas y sugerencia de pedido, N16).
  const desde = masDias(fechaDe(ahora), -84);
  const di: Record<ClaveExistencia, number> = {};
  for (const x of gen.idx.insatisfecha) if (x.fecha > desde) di[x.clave] = (di[x.clave] ?? 0) + 1;
  estado.meta.demandaInsatisfecha = di;
  const A = plan.ancla;
  const existe = <T>(tabla: Record<string, T>, id: string) => (id && tabla[id] ? id : '');
  const imp = (clave: string) => plan.importaciones.find((i) => i.narrativa === clave)?.id ?? '';
  const [p, t, c] = HISTORIA_IMPORTACIONES.oxfordM.clave.split('|');
  const sol = idsSolicitudes(A);
  const enProduccion = existe(estado.importaciones, imp('en_produccion'));
  estado.meta.narrativa = {
    varianteOxfordM: existe(estado.variantes, plan.productoPorId.get(p ?? '')?.variantes[`${t}|${c}`] ?? ''),
    productoOxford: existe(estado.productos, PERSONAS_NARRATIVA.productoOxford),
    varianteChinoArena32: existe(estado.variantes, PERSONAS_NARRATIVA.varianteChinoArena32),
    importacionEnProduccion: enProduccion,
    importacionEnTransito: existe(estado.importaciones, imp('en_transito')),
    importacionEnPuerto: existe(estado.importaciones, imp('en_puerto')),
    importacionRetrasada: existe(estado.importaciones, imp('en_nacionalizacion')),
    cxpSaldoGrande: enProduccion ? existe(estado.cuentasPorPagar, idHijo(enProduccion, 'cxp-saldo')) : '',
    vendedorPersona: existe(estado.empleados, PERSONAS_NARRATIVA.vendedorPersona),
    bodegaPersona: existe(estado.empleados, PERSONAS_NARRATIVA.bodegaPersona),
    vendedoraEstrella: existe(estado.empleados, PERSONAS_NARRATIVA.vendedoraEstrella),
    empleadoLlegadasTarde: existe(estado.empleados, PERSONAS_NARRATIVA.empleadoLlegadasTarde),
    contratistasRiesgo: PERSONAS_NARRATIVA.contratistasRiesgo.filter((id) => !!estado.empleados[id]),
    clienteFrecuente: existe(estado.clientes, PERSONAS_NARRATIVA.clienteFrecuente),
    clienteVip: existe(estado.clientes, PERSONAS_NARRATIVA.clienteVip),
    solicitudDescuento: existe(estado.solicitudes, sol.descuento),
    solicitudTraslado: existe(estado.solicitudes, sol.traslado),
    solicitudAnulacion: existe(estado.solicitudes, sol.anulacion),
    sesionCajaFaltante: existe(estado.sesionesCaja, idSesion(masDias(A, -1), 'zr')),
    proveedorSugerencia: existe(estado.proveedores, PERSONAS_NARRATIVA.proveedorSugerencia),
  };
}

/**
 * Construcción completa por días, cediendo el control (worker: progreso). Mismo `ancla`, `ahora`, `semilla`,
 * `escala` y `registro` ⇒ mismo estado, en cualquier motor de JavaScript.
 */
export function* construirEstado(
  e: EntradaGenerador,
  medidor?: Medidor,
): Generator<Progreso, EstadoDominio, void> {
  const t0 = medidor?.reloj();
  const { plan, base } = crearPlan(e);
  if (medidor && t0 !== undefined) medidor.registrar('plan', medidor.reloj() - t0);
  const { fuente, gen } = crearFuente(plan, e.ahora, medidor);
  const estado = yield* construir({
    estado: base,
    fuente,
    ahora: e.ahora,
    registro: e.registro ?? [],
    alOmitirGenerado: e.alOmitirGenerado,
  });
  completarMeta(estado, plan, gen, e.ahora);
  return estado;
}

/** Construcción sin ceder el control (Node, pruebas y respaldo en el hilo principal). */
export function generarEstado(e: EntradaGenerador, medidor?: Medidor): EstadoDominio {
  const g = construirEstado(e, medidor);
  for (;;) {
    const paso = g.next();
    if (paso.done) return paso.value;
  }
}

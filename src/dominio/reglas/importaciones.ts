import type {
  Centavos,
  COP,
  EstadoImportacion,
  FechaISO,
  HitoImportacion,
  Id,
  Importacion,
  ParametrosAduanas,
} from '../tipos';
import { ESTADOS_IMPORTACION } from '../tipos';
import { copDeCentavos, redondear } from './dinero';
import { diferenciaDias, sumarDias } from './fechas';

/** Máquina de 13 estados, hitos, retraso y sugerencia de pedido (PLAN 6.19 M1–M8, 6.20.13). */

export function indiceEstado(estado: EstadoImportacion): number {
  return ESTADOS_IMPORTACION.indexOf(estado);
}

export function siguienteEstado(estado: EstadoImportacion): EstadoImportacion | null {
  return ESTADOS_IMPORTACION[indiceEstado(estado) + 1] ?? null;
}

export function estadoAlcanzado(actual: EstadoImportacion, objetivo: EstadoImportacion): boolean {
  return indiceEstado(actual) >= indiceEstado(objetivo);
}

export type ErrorCambioEstado =
  | 'mismo_estado'
  | 'retroceso_mayor'
  | 'retroceso_sin_permiso'
  | 'recepcion_por_inventario'
  | 'nota_obligatoria';

/**
 * Valida un cambio de estado (M1, M2): se avanza en orden (se puede saltar hacia adelante) y se retrocede
 * un solo paso como corrección, solo el dueño y con nota. `recibido_bodega` solo se alcanza recibiendo.
 */
export function validarCambioEstado(
  actual: EstadoImportacion,
  nuevo: EstadoImportacion,
  opciones: { esDueno: boolean; nota: string | null },
): ErrorCambioEstado | null {
  if (nuevo === 'recibido_bodega') return 'recepcion_por_inventario';
  const delta = indiceEstado(nuevo) - indiceEstado(actual);
  if (delta === 0) return 'mismo_estado';
  if (delta < -1) return 'retroceso_mayor';
  if (delta === -1) {
    if (!opciones.esDueno) return 'retroceso_sin_permiso';
    if (!opciones.nota || opciones.nota.trim() === '') return 'nota_obligatoria';
  }
  return null;
}

/** Hitos estimados al crear el pedido, acumulando los días entre estados desde la fecha del pedido. */
export function hitosIniciales(
  fechaPedido: FechaISO,
  dias: ParametrosAduanas['diasEstimadosEntreEstados'],
): Record<EstadoImportacion, HitoImportacion> {
  const hitos = {} as Record<EstadoImportacion, HitoImportacion>;
  let fecha = fechaPedido;
  for (const e of ESTADOS_IMPORTACION) {
    fecha = sumarDias(fecha, e === 'cotizado' ? 0 : dias[e]);
    hitos[e] = {
      estimada: fecha,
      real: e === 'cotizado' ? fechaPedido : null,
      nota: null,
      actualizadoPor: null,
    };
  }
  return hitos;
}

/**
 * Desplaza las estimadas de los hitos posteriores a `estado` por el adelanto o retraso con que se alcanzó
 * (M1): delta = fechaReal − estimada del estado.
 */
export function reestimarHitos(
  hitos: Record<EstadoImportacion, HitoImportacion>,
  estado: EstadoImportacion,
  fechaReal: FechaISO,
): Record<EstadoImportacion, HitoImportacion> {
  const delta = diferenciaDias(hitos[estado].estimada, fechaReal);
  const r = { ...hitos };
  if (delta === 0) return r;
  for (const e of ESTADOS_IMPORTACION) {
    if (indiceEstado(e) > indiceEstado(estado) && hitos[e].real === null) {
      r[e] = { ...hitos[e], estimada: sumarDias(hitos[e].estimada, delta) };
    }
  }
  return r;
}

/** Fechas estimadas en orden no decreciente (importacion.actualizarHitos). */
export function hitosEnOrden(hitos: Record<EstadoImportacion, HitoImportacion>): boolean {
  let previa = '';
  for (const e of ESTADOS_IMPORTACION) {
    if (hitos[e].estimada < previa) return false;
    previa = hitos[e].estimada;
  }
  return true;
}

/** Retraso (M3): días entre hoy y la estimada del siguiente hito, si es positivo. */
export function retrasoDias(imp: Pick<Importacion, 'estado' | 'hitos'>, hoy: FechaISO): number {
  const sig = siguienteEstado(imp.estado);
  if (!sig) return 0;
  return Math.max(0, diferenciaDias(imp.hitos[sig].estimada, hoy));
}

/** Avance del barco entre el embarque y el puerto (0–1) para el diagrama de la ruta. */
export function avanceRuta(imp: Pick<Importacion, 'estado' | 'hitos'>, hoy: FechaISO): number {
  if (indiceEstado(imp.estado) < indiceEstado('embarcado')) return 0;
  if (indiceEstado(imp.estado) >= indiceEstado('en_puerto')) return 1;
  const salida = imp.hitos.embarcado.real ?? imp.hitos.embarcado.estimada;
  const llegada = imp.hitos.en_puerto.estimada;
  const total = diferenciaDias(salida, llegada);
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, diferenciaDias(salida, hoy) / total));
}

/** Redondea hacia arriba al múltiplo de 5 (6.20.13). */
export function redondearArriba5(x: number): number {
  return Math.ceil(x / 5) * 5;
}

export interface EntradaSugerenciaVariante {
  varianteId: Id;
  productoId: Id;
  /** Unidades vendidas en las últimas 12 semanas. */
  vendidas12s: number;
  /** Demanda insatisfecha en ese periodo (para no repetir el agotado de la M). */
  insatisfecha12s: number;
  existencias: number;
  enCamino: number;
  /** FOB unitario del último pedido (moneda de la fábrica). */
  costoUnitarioOrigen: Centavos;
  /** Último costo aterrizado por unidad (COP). */
  costoAterrizado: COP;
  precioVenta: COP;
  tarifaIva: number;
}

export interface EntradaSugerencia {
  variantes: readonly EntradaSugerenciaVariante[];
  /** Semanas entre la llegada estimada del pedido y el fin de la cobertura. */
  semanasCobertura: number;
  /**
   * Semanas de espera: de hoy a la llegada estimada del pedido. Lo que se venda mientras tanto sale de las existencias
   * y de lo que viene en camino, así que la demanda a cubrir va de hoy al fin de la cobertura (0 = solo la cobertura).
   */
  semanasEspera?: number;
  /** Índice estacional del periodo [hoy, fin de la cobertura] / índice de las últimas 12 semanas. */
  factorEstacional: number;
  tasaVigente: number;
}

export interface SugerenciaVariante {
  varianteId: Id;
  productoId: Id;
  rotacionSemanal: number;
  demandaCobertura: number;
  sugerida: number;
}

export interface ResultadoSugerencia {
  variantes: SugerenciaVariante[];
  unidades: number;
  totalOrigen: Centavos;
  totalCop: COP;
  /** Margen esperado con el último costo aterrizado escalado por el FOB. */
  margenEsperado: number;
}

/**
 * Sugerencia de pedido (6.20.13): pura y determinista.
 * `demandaCobertura = rotación semanal × (semanas de espera + semanas de cobertura) × factor estacional`;
 * `sugerida = max(0, redondearArriba5(demandaCobertura − existencias − en camino))`.
 */
export function sugerirPedido(e: EntradaSugerencia): ResultadoSugerencia {
  let unidades = 0;
  let totalOrigen = 0;
  let ventaSinIva = 0;
  let costo = 0;
  const semanas = (e.semanasEspera ?? 0) + e.semanasCobertura;
  const variantes = e.variantes.map((v) => {
    const rotacionSemanal = (v.vendidas12s + v.insatisfecha12s) / 12;
    const demandaCobertura = rotacionSemanal * semanas * e.factorEstacional;
    const sugerida = Math.max(0, redondearArriba5(demandaCobertura - v.existencias - v.enCamino));
    unidades += sugerida;
    totalOrigen += sugerida * v.costoUnitarioOrigen;
    ventaSinIva += (sugerida * v.precioVenta) / (1 + v.tarifaIva);
    costo += sugerida * v.costoAterrizado;
    return {
      varianteId: v.varianteId,
      productoId: v.productoId,
      rotacionSemanal,
      demandaCobertura,
      sugerida,
    };
  });
  return {
    variantes,
    unidades,
    totalOrigen,
    totalCop: copDeCentavos(totalOrigen, e.tasaVigente),
    margenEsperado: ventaSinIva > 0 ? (ventaSinIva - costo) / ventaSinIva : 0,
  };
}

/** Anticipo y saldo de un pedido (M6): partes de un total en centavos que suman exacto. */
export function partesPagoFabrica(
  totalCentavos: Centavos,
  anticipo: number,
): { anticipo: Centavos; saldo: Centavos } {
  const a = redondear(totalCentavos * anticipo);
  return { anticipo: a, saldo: totalCentavos - a };
}

import type {
  COP,
  Centavos,
  CostosImportacion,
  Fraccion,
  Id,
  LineaImportacion,
  MonedaExtranjera,
  MontoMoneda,
} from '../tipos';
import { copDeCentavos, prorratearMayorResiduo, redondear } from './dinero';
import { baseSinIva } from './ventas';

/**
 * Costo aterrizado (PLAN 6.20.3, M4, W4). Función pura usada por la calculadora, el "¿Y si el dólar sube?" y
 * `importacion.aplicarCostos`. Método nombrado en interfaz y reportes: "Costo de reposición: última
 * importación aplicada".
 */
export interface EntradaCosteo {
  lineas: readonly LineaImportacion[];
  costos: CostosImportacion;
  moneda: MonedaExtranjera;
  metodoProrrateo: 'valor' | 'cantidad';
  /** Tasa de la moneda del pedido usada para costear (override: simulación ±10 %). */
  tasaCosteo: number;
  /** Tasas de otras monedas extranjeras (si el flete o el seguro vienen en otra moneda). */
  tasasOtras?: Partial<Record<MonedaExtranjera, number>>;
}

export interface PasoCascada {
  concepto:
    | 'fob'
    | 'flete'
    | 'seguro'
    | 'arancel'
    | 'otros_tributos'
    | 'iva_importacion'
    | 'agente'
    | 'puerto'
    | 'transporte'
    | 'otros';
  etiqueta: string;
  valor: COP;
}

export interface CostoLinea {
  lineaId: Id;
  productoId: Id;
  unidades: number;
  fobOrigen: Centavos;
  costoLinea: COP;
  costoUnitario: COP;
}

export interface ResultadoCosteo {
  fobOrigen: Centavos;
  fobCop: COP;
  flete: COP;
  seguro: COP;
  cif: COP;
  arancel: COP;
  otrosTributos: COP;
  ivaImportacion: COP;
  ivaSumaAlCosto: boolean;
  honorariosAgente: COP;
  bodegajePuerto: COP;
  transporteInterno: COP;
  otros: COP;
  /** Lo que se reparte entre las prendas. */
  total: COP;
  /** Tributos a girar (arancel + otros + IVA de importación), sumen o no al costo (M8). */
  tributos: COP;
  cascada: PasoCascada[];
  porLinea: CostoLinea[];
  porProducto: Record<Id, { unidades: number; costoTotal: COP; costoUnitario: COP }>;
}

export function unidadesLinea(linea: Pick<LineaImportacion, 'cantidades'>): number {
  let u = 0;
  for (const n of Object.values(linea.cantidades)) u += n;
  return u;
}

export function fobLinea(linea: LineaImportacion): Centavos {
  return unidadesLinea(linea) * linea.costoUnitarioOrigen;
}

export function fobImportacion(lineas: readonly LineaImportacion[]): Centavos {
  let s = 0;
  for (const l of lineas) s += fobLinea(l);
  return s;
}

function aCop(monto: MontoMoneda, entrada: EntradaCosteo): COP {
  if (monto.moneda === 'COP') return monto.valor;
  const tasa =
    monto.moneda === entrada.moneda
      ? entrada.tasaCosteo
      : (entrada.tasasOtras?.[monto.moneda] ?? entrada.tasaCosteo);
  return copDeCentavos(monto.valor, tasa);
}

export function calcularCostoAterrizado(entrada: EntradaCosteo): ResultadoCosteo {
  const { costos } = entrada;
  const fobOrigen = fobImportacion(entrada.lineas);
  const fobCop = copDeCentavos(fobOrigen, entrada.tasaCosteo);
  const flete = aCop(costos.flete, entrada);
  const seguro = aCop(costos.seguro, entrada);
  const cif = fobCop + flete + seguro;
  const arancel = redondear(cif * costos.arancelPct);
  const otrosTributos = costos.otrosTributosAduaneros;
  const ivaImportacion = redondear((cif + arancel + otrosTributos) * costos.ivaImportacionPct);
  const ivaAlCosto = costos.ivaSumaAlCosto ? ivaImportacion : 0;
  const total =
    cif +
    arancel +
    otrosTributos +
    ivaAlCosto +
    costos.honorariosAgente +
    costos.bodegajePuerto +
    costos.transporteInterno +
    costos.otros;

  const pesos = entrada.lineas.map((l) =>
    entrada.metodoProrrateo === 'valor' ? fobLinea(l) : unidadesLinea(l),
  );
  const reparto = prorratearMayorResiduo(total, pesos);
  const porLinea: CostoLinea[] = entrada.lineas.map((l, i) => {
    const unidades = unidadesLinea(l);
    const costoLinea = reparto[i] ?? 0;
    return {
      lineaId: l.id,
      productoId: l.productoId,
      unidades,
      fobOrigen: fobLinea(l),
      costoLinea,
      costoUnitario: unidades > 0 ? redondear(costoLinea / unidades) : 0,
    };
  });
  const porProducto: ResultadoCosteo['porProducto'] = {};
  for (const l of porLinea) {
    const p = (porProducto[l.productoId] ??= { unidades: 0, costoTotal: 0, costoUnitario: 0 });
    p.unidades += l.unidades;
    p.costoTotal += l.costoLinea;
  }
  for (const p of Object.values(porProducto))
    p.costoUnitario = p.unidades > 0 ? redondear(p.costoTotal / p.unidades) : 0;

  const cascada: PasoCascada[] = [
    { concepto: 'fob', etiqueta: 'Precio de fábrica (FOB)', valor: fobCop },
    { concepto: 'flete', etiqueta: 'Flete', valor: flete },
    { concepto: 'seguro', etiqueta: 'Seguro', valor: seguro },
    { concepto: 'arancel', etiqueta: 'Arancel', valor: arancel },
    { concepto: 'otros_tributos', etiqueta: 'Otros tributos aduaneros', valor: otrosTributos },
    { concepto: 'iva_importacion', etiqueta: 'IVA de importación', valor: ivaAlCosto },
    { concepto: 'agente', etiqueta: 'Agente de aduanas', valor: costos.honorariosAgente },
    { concepto: 'puerto', etiqueta: 'Puerto y bodegaje', valor: costos.bodegajePuerto },
    { concepto: 'transporte', etiqueta: 'Transporte a Bogotá', valor: costos.transporteInterno },
    { concepto: 'otros', etiqueta: 'Otros', valor: costos.otros },
  ];
  return {
    fobOrigen,
    fobCop,
    flete,
    seguro,
    cif,
    arancel,
    otrosTributos,
    ivaImportacion,
    ivaSumaAlCosto: costos.ivaSumaAlCosto,
    honorariosAgente: costos.honorariosAgente,
    bodegajePuerto: costos.bodegajePuerto,
    transporteInterno: costos.transporteInterno,
    otros: costos.otros,
    total,
    tributos: arancel + otrosTributos + ivaImportacion,
    cascada,
    porLinea,
    porProducto,
  };
}

/**
 * Tasa de costeo (6.20.3): promedio ponderado de las tasas de lo ya pagado al proveedor y la tasa vigente
 * para lo no pagado.
 */
export function tasaCosteoPonderada(
  abonos: readonly { centavos: Centavos; tasa: number }[],
  totalCentavos: Centavos,
  tasaVigente: number,
): number {
  if (totalCentavos <= 0) return tasaVigente;
  let pagados = 0;
  let suma = 0;
  for (const a of abonos) {
    pagados += a.centavos;
    suma += a.centavos * a.tasa;
  }
  const pendiente = Math.max(0, totalCentavos - pagados);
  const base = pagados + pendiente;
  return base > 0 ? (suma + pendiente * tasaVigente) / base : tasaVigente;
}

/** Sube al siguiente valor terminado en 900 (precios del retail colombiano). */
export function redondearA900(valor: number): COP {
  const k = Math.ceil((valor - 900) / 1000);
  return Math.max(0, k) * 1000 + 900;
}

/** Margen bruto sobre el precio sin IVA. */
export function margenBruto(precioVenta: COP, tarifaIva: Fraccion, costoUnitario: COP): Fraccion {
  const base = baseSinIva(precioVenta, tarifaIva);
  return base > 0 ? (base - costoUnitario) / base : 0;
}

/** Precio sugerido para conservar el margen (W4): redondearA900(costo / (1 − margen) × (1 + IVA)). */
export function precioSugerido(costoUnitario: COP, margenObjetivo: Fraccion, tarifaIva: Fraccion): COP {
  return redondearA900((costoUnitario / (1 - margenObjetivo)) * (1 + tarifaIva));
}

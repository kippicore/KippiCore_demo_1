import type { Categoria, Id, MedioPago } from '@/dominio/tipos';

/**
 * Modelo de demanda (PLAN 4.7, 7.5, 7.6). Índices ajustables; la tendencia anual va en tabla precalculada
 * porque el generador no usa Math.pow (aritmética exacta, 7.2).
 */

/** Índice por mes (1 = enero). Diciembre es el más alto; enero y febrero, los más bajos. */
export const INDICE_MES: Record<number, number> = {
  1: 0.7,
  2: 0.72,
  3: 0.85,
  4: 0.88,
  5: 0.95,
  6: 1.35,
  7: 0.95,
  8: 0.92,
  9: 1.15,
  10: 0.95,
  11: 1.3,
  12: 1.85,
};

/** Índice por día de la semana (0 = domingo). El domingo se reemplaza por el índice del local (P8). */
export const INDICE_DIA: Record<number, number> = {
  0: 1.1,
  1: 0.75,
  2: 0.7,
  3: 0.8,
  4: 0.9,
  5: 1.15,
  6: 1.6,
};

/** Peso por franja horaria [desde, hasta) en horas (7.5). Usaquén en domingo: 11–14 h fuerte. */
export const PESO_FRANJA: { desde: number; hasta: number; peso: number }[] = [
  { desde: 10, hasta: 12, peso: 0.6 },
  { desde: 12, hasta: 15, peso: 0.9 },
  { desde: 15, hasta: 19, peso: 1.4 },
  { desde: 19, hasta: 21, peso: 0.9 },
];
export const PESO_FRANJA_USQ_DOMINGO: { desde: number; hasta: number; peso: number }[] = [
  { desde: 11, hasta: 14, peso: 1.8 },
  { desde: 14, hasta: 17, peso: 1.0 },
  { desde: 17, hasta: 19, peso: 0.7 },
];

/** Eventos comerciales (7.5). */
export const EVENTOS_DEMANDA = {
  diaPadre: { juevesADomingo: 1.6, restoSemana: 1.25 },
  primaJunio: { desde: '06-20', hasta: '06-30', factor: 1.15 },
  amorAmistad: { viernesADomingo: 1.3 },
  blackFriday: {
    viernesADomingo: 2.0,
    semana: 1.3,
    descuentoMin: 0.2,
    descuentoMax: 0.3,
    proporcionConDescuento: 0.6,
  },
  navidad: { desde: '12-15', hasta: '12-24', factor: 1.5, cierre24: '18:00' },
  finDeAnio: { fecha: '12-31', factor: 0.6 },
  quincena: { diasSiguientes: 2, factor: 1.1 },
  festivo: { calle: 0.85, centroComercial: 1.15 },
  grados: { meses: [6, 12], categorias: ['trajes', 'blazers'] as Categoria[], factor: 1.5 },
  liquidacionEnero: { descuento: 0.15 },
} as const;

/** Ruido semanal (σ = 6 %) para que ninguna serie se vea sintética. */
export const RUIDO_SEMANAL_SIGMA = 0.06;

/** Regla de rango (7.5): ventas totales de un día abierto completo, × escala. */
export const RANGO_VENTAS_DIA = { minimo: 15, maximo: 60 } as const;

/**
 * Tendencia: crecimiento anual del 10 % (P18: +9 % a +12 % año contra año), precalculada por mes desde el
 * inicio de la ventana: TENDENCIA_MENSUAL[k] = 1,10^(k/12).
 */
export const TENDENCIA_MENSUAL: readonly number[] = [
  1.0, 1.007974, 1.016012, 1.024114, 1.03228, 1.040512, 1.048809, 1.057172, 1.065602, 1.074099, 1.082665,
  1.091298, 1.1, 1.108772, 1.117613, 1.126525, 1.135508, 1.144563, 1.15369, 1.162889, 1.172162, 1.181509,
  1.190931, 1.200428, 1.21, 1.219649, 1.229374, 1.239178, 1.249059, 1.259019, 1.269059, 1.279178, 1.289379,
  1.29966, 1.310024, 1.32047, 1.331, 1.341614, 1.352312, 1.363095, 1.373965, 1.384921, 1.395965, 1.407096,
  1.418317, 1.429626, 1.441026, 1.452517,
];

/** Mezcla de categorías por local (participación en unidades; P1: Parque 93 pesa sastrería, Zona Rosa casual). */
export const MEZCLA_CATEGORIAS: Record<Id, Record<Categoria, number>> = {
  // F2-A2: ajustada para que el ticket esperado dé P1 (P93 ≈ $ 520.000 · USQ ≈ $ 365.000 · ZR ≈ $ 315.000).
  p93: {
    camisas: 0.24,
    polos: 0.115,
    pantalones: 0.195,
    blazers: 0.08,
    trajes: 0.04,
    punto: 0.1,
    abrigos_chaquetas: 0.025,
    calzado: 0.045,
    accesorios: 0.16,
  },
  usq: {
    camisas: 0.25,
    polos: 0.12,
    pantalones: 0.21,
    blazers: 0.07,
    trajes: 0.02,
    punto: 0.12,
    abrigos_chaquetas: 0.025,
    calzado: 0.04,
    accesorios: 0.14,
  },
  zr: {
    camisas: 0.26,
    polos: 0.175,
    pantalones: 0.24,
    blazers: 0.04,
    trajes: 0.015,
    punto: 0.1,
    abrigos_chaquetas: 0.02,
    calzado: 0.03,
    accesorios: 0.12,
  },
};

/** Ajuste de mezcla por mes (7.6): multiplicadores por categoría. */
export const MEZCLA_POR_MES: Record<number, Partial<Record<Categoria, number>>> = {
  1: { camisas: 1.1, polos: 1.1 },
  6: { camisas: 1.2, polos: 1.3, accesorios: 1.3, trajes: 1.5, blazers: 1.3 },
  9: { camisas: 1.2, punto: 1.3 },
  11: { punto: 1.2, abrigos_chaquetas: 1.2 },
  12: { trajes: 1.5, blazers: 1.4, punto: 1.4, calzado: 1.3, abrigos_chaquetas: 1.3, accesorios: 1.2 },
};

/** Unidades por línea: casi siempre 1; corbatas a veces 2. Líneas por venta: 1–4. */
export const LINEAS_POR_VENTA = { minimo: 1, maximo: 4 } as const;

/** Descuentos comunes (7.6): ≈ 12 % de las ventas con 5–15 %. */
export const DESCUENTOS = { proporcion: 0.12, minimo: 0.05, maximo: 0.15 } as const;

/** Canales (7.6): web solo los últimos 6 meses. */
export const CANALES = { local: 0.9, whatsapp: 0.05, instagram: 0.03, web: 0.02, mesesWeb: 6 } as const;

/**
 * Medios de pago por valor (P9), interpolados linealmente de hace 12 meses al mes actual. Separado y crédito
 * propio no son medios: son tipos de venta (proporción aparte).
 */
export const MEDIOS_PAGO_EVOLUCION: { medio: MedioPago; hace12Meses: number; mesActual: number }[] = [
  { medio: 'datafono_debito', hace12Meses: 0.282, mesActual: 0.264 },
  { medio: 'datafono_credito', hace12Meses: 0.188, mesActual: 0.176 },
  { medio: 'efectivo', hace12Meses: 0.25, mesActual: 0.17 },
  { medio: 'nequi', hace12Meses: 0.08, mesActual: 0.13 },
  { medio: 'transferencia', hace12Meses: 0.02, mesActual: 0.075 },
  { medio: 'qr_bre_b', hace12Meses: 0, mesActual: 0.045 },
  { medio: 'daviplata', hace12Meses: 0.03, mesActual: 0.04 },
  { medio: 'credito_financiera', hace12Meses: 0.02, mesActual: 0.03 },
  { medio: 'bono_regalo', hace12Meses: 0.01, mesActual: 0.01 },
];
export const TIPOS_VENTA = { separado: 0.015, creditoVip: 0.01, pagoMixto: 0.08 } as const;

/** Separados (7.6, P17). */
export const SEPARADOS = {
  abonoInicial: [0.2, 0.5] as [number, number],
  plazoDias: [15, 30] as [number, number],
  completados: 0.85,
  abonos: [1, 3] as [number, number],
  /** Saldo objetivo de los separados narrativos (N7, P17): $ 1,87 M los 3 que vencen esta semana + $ 4,33 M los otros. */
  saldoNarrativo: { porVencer: 1_870_000, resto: 4_330_000 },
} as const;

/** Devoluciones (7.6). */
export const DEVOLUCIONES = {
  proporcion: 0.03,
  diasDespues: [1, 15] as [number, number],
  conCliente: { cambio: 0.7, saldoFavor: 0.2, reembolso: 0.1 },
  noReingresa: 0.1,
} as const;

/** Bonos de regalo (7.6). */
export const BONOS = {
  porTemporada: 40,
  valores: [100_000, 500_000] as [number, number],
  redimidos: 0.85,
  semanasRedencion: [2, 8] as [number, number],
} as const;

/** Documentos electrónicos (7.6): solo los últimos 90 días; ≈ 55 % factura electrónica. */
export const DOCUMENTOS = { diasConDocumento: 90, proporcionFacturaElectronica: 0.55 } as const;

/** Vendedora estrella (7.8, P2). */
export const VENDEDORA_ESTRELLA = {
  empleadoId: 'em_vgomez',
  // Pista de calibración: con la asignación estratificada y la franja de la tarde en 1,4, 1,3 da ≈ 43 % (P2).
  pesoAsignacion: 1.25,
  factorTicket: 1.25,
  // Compartidos C-D: 0,48 (antes 0,46) deja el accesorio de enero dentro de P2 con el nuevo reparto de Zona Rosa.
  accesorio: 0.48,
  accesorioResto: 0.17,
} as const;

/** Marcaciones (7.8). */
export const MARCACIONES = {
  entrada: { media: -4, sigma: 5 },
  salida: { media: 6, sigma: 8 },
  llegadasTarde: { empleadoId: 'em_mherrera', porMes: 4, minutos: [15, 35] as [number, number] },
  ausenciaSinNovedadCadaMeses: 2,
} as const;

/** Cierres de caja (P21): cuadran ≈ 85 % de los días; el resto ± $ 1.000–20.000. */
export const CIERRES_CAJA = {
  cuadran: 0.85,
  diferencia: [1_000, 20_000] as [number, number],
  faltanteNarrativo: -40_000,
} as const;

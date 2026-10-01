import type {
  MedioPago,
  ParametrosDatafono,
  ParametrosImpuestos,
  ParametrosInventario,
  ParametrosVentas,
  ResolucionFacturacion,
} from '@/dominio/tipos';

/*
 * Parámetros del negocio (PLAN 5.4, 6.3). Valores ilustrativos y editables en Configuración.
 * Fuentes de referencia (solo comentario; la interfaz nunca cita normas): IVA general del 19 %;
 * retenciones y tarifa de ICA de Bogotá para comercio al por menor, por verificar con el contador.
 */

/** IVA general de las prendas (precios IVA incluido). */
export const IVA_GENERAL = 0.19;

export const PARAMETROS_VENTAS: ParametrosVentas = {
  abonoMinimoSeparado: 0.2,
  diasMaximoSeparado: 30,
  descuentoMaximoVendedor: 0.15,
  diasMaximoDevolucion: 30,
  localDespachoWebId: 'p93',
  cuentaPorMedio: {
    efectivo: 'caja_del_local',
    datafono_debito: 'cta_puente',
    datafono_credito: 'cta_puente',
    nequi: 'cta_nequi',
    daviplata: 'cta_daviplata',
    transferencia: 'cta_corriente',
    qr_bre_b: 'cta_corriente',
    bono_regalo: null,
    credito_financiera: 'cta_corriente',
    pasarela_web: 'cta_corriente',
    saldo_a_favor: null,
  },
};

/**
 * Cómo retira el socio la plata que sobra (ilustrativo, 7.10): al empezar cada quincena (días 1 y 16), si el saldo
 * pasa del techo, retira hasta dejar el colchón, sin que lo que viene baje del piso (un comerciante no saca en
 * diciembre la plata que necesita en marzo). Lo usan el generador (la historia) y el flujo de caja proyectado (lo que
 * viene), así la línea proyectada se comporta como la real. El piso queda por encima del punto bajo que calibra el
 * generador (P19, ≈ $ 18 M): los retiros nunca crean otro punto bajo.
 */
export const RETIRO_SOCIO = { diasDelMes: [1, 16], techo: 160_000_000, colchon: 90_000_000, piso: 40_000_000 } as const;

/** Datáfono (6.20.12): comisión y retenciones ilustrativas, "descontables · valida con tu contador". */
export const PARAMETROS_DATAFONO: ParametrosDatafono = {
  comisionDebito: 0.022,
  comisionCredito: 0.029,
  retenciones: { fuente: 0.01, iva: 0.025, ica: 0.00414 },
  diasAbono: 1,
  comisionFinanciera: 0.045,
};

export const PARAMETROS_IMPUESTOS: ParametrosImpuestos = {
  ivaGeneral: IVA_GENERAL,
  ivaGastosDescontable: true,
  retencionHonorarios: 0.1,
  retencionCompras: 0.025,
  icaTarifaPorMil: 11.04,
  periodicidadIva: 'bimestral',
  periodicidadIca: 'bimestral',
};

export const PARAMETROS_INVENTARIO: ParametrosInventario = {
  stockMinimoPorDefecto: 2,
  diasSinMovimiento: 60,
};

/** Etiquetas de los medios de pago (PRD 7.2, C16). Sin marcas de financieras. */
export const MEDIOS_PAGO: Record<
  MedioPago,
  { etiqueta: string; corta: string; digital: boolean; enPos: boolean }
> = {
  efectivo: { etiqueta: 'Efectivo', corta: 'Efectivo', digital: false, enPos: true },
  datafono_debito: { etiqueta: 'Datáfono · débito', corta: 'Débito', digital: false, enPos: true },
  datafono_credito: { etiqueta: 'Datáfono · crédito', corta: 'Crédito', digital: false, enPos: true },
  nequi: { etiqueta: 'Nequi', corta: 'Nequi', digital: true, enPos: true },
  daviplata: { etiqueta: 'Daviplata', corta: 'Daviplata', digital: true, enPos: true },
  transferencia: {
    etiqueta: 'Transferencia / llave Bre-B',
    corta: 'Transferencia',
    digital: true,
    enPos: true,
  },
  qr_bre_b: { etiqueta: 'QR Bre-B', corta: 'QR Bre-B', digital: true, enPos: true },
  bono_regalo: { etiqueta: 'Bono de regalo', corta: 'Bono', digital: false, enPos: true },
  credito_financiera: {
    etiqueta: 'Crédito con financiera aliada',
    corta: 'Financiera',
    digital: false,
    enPos: true,
  },
  pasarela_web: {
    etiqueta: 'Pago en línea (tienda web)',
    corta: 'Pago en línea',
    digital: true,
    enPos: false,
  },
  saldo_a_favor: { etiqueta: 'Saldo a favor', corta: 'Saldo a favor', digital: false, enPos: true },
};

/** Denominaciones del arqueo de caja (W11). 'monedas' se cuenta por valor. */
export const DENOMINACIONES = [
  '100000',
  '50000',
  '20000',
  '10000',
  '5000',
  '2000',
  '1000',
  'monedas',
] as const;
/** Billetes frecuentes del teclado de pago del POS (4.3 7.2). */
export const BILLETES_FRECUENTES = [20_000, 50_000, 100_000] as const;
/** Base de caja de cada local (7.10). */
export const BASE_CAJA = 300_000;

/** Resoluciones ficticias de facturación (6.14): una por tipo de documento. */
export const RESOLUCIONES: ResolucionFacturacion[] = [
  {
    id: 'res_fe',
    tipo: 'factura_electronica',
    numero: '18764000000000',
    prefijo: 'HAL-FE',
    desde: 1,
    hasta: 50_000,
    vigenteDesde: '2024-01-01',
    vigenteHasta: '2027-12-31',
  },
  {
    id: 'res_pos',
    tipo: 'documento_equivalente_pos',
    numero: '18764000000001',
    prefijo: 'HAL-POS',
    desde: 1,
    hasta: 200_000,
    vigenteDesde: '2024-01-01',
    vigenteHasta: '2027-12-31',
  },
];

/** Financiera aliada genérica (C16, R15): sin nombre comercial real. */
export const FINANCIERA_ALIADA = {
  nombre: 'Financiera aliada',
  descripcion: 'Crédito de consumo con una financiera aliada (genérica en la demo).',
} as const;

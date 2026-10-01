import type { CargaImportacion, COP, EstadoImportacion, Id } from '@/dominio/tipos';

/**
 * Plan narrativo de importaciones (PLAN 4.7, 7.9, 7.11) relativo al ancla. El generador (F2-A2) lo convierte
 * en comandos: crea los pedidos con su número IMP-AAAA-NN (consecutivo por año, así el de camisas en puerto
 * sale IMP-2026-07 con el ancla de 2026) y los avanza con `importacion.cambiarEstado`.
 * Todos los montos son de ejemplo ("Valor de ejemplo · se valida con tu agente de aduanas").
 */

/** Pedidos en curso al día del ancla (N2–N5). Desfases en días respecto al ancla. */
export interface ImportacionEnCurso {
  clave: 'en_produccion' | 'en_transito' | 'en_puerto' | 'en_nacionalizacion';
  proveedorId: Id;
  /** Contenido para el texto ("camisas", "merino para diciembre"). */
  contenido: string;
  /** Referencias del pedido (las demás de la fábrica no van). */
  referencias: Id[];
  carga: CargaImportacion;
  estadoAlAncla: EstadoImportacion;
  /** Fecha real del estado actual (desfase respecto al ancla). */
  estadoRealDesfase: number;
  /** Estimadas que se fijan para la narrativa. */
  estimadas: Partial<Record<EstadoImportacion, number>>;
  /** Reportado desde el portal (N2: notificación sin leer). */
  reportadoPortal: { autor: string; contactoId: Id } | null;
  aforo: { tipo: 'documental' | 'fisico'; motivo: string } | null;
  /** Unidades forzadas por variante (p. ej. 48 Oxford azul cielo M). Clave: `${productoId}|${talla}|${colorId}`. */
  unidadesForzadas: Record<string, number>;
  /** Saldo del pedido en USD (centavos) cuando la narrativa lo fija (N5: US$ 14.700). */
  saldoCentavos: number | null;
  /** Multiplica las cantidades de "pedir hasta" (pedido de temporada; W4: reparte los costos fijos). */
  factorCantidad?: number;
  /** Factor por referencia, en lugar de `factorCantidad` (W12: de la Oxford viene poco y el próximo pedido la necesita). */
  factorPorProducto?: Record<Id, number>;
}

export const IMPORTACIONES_EN_CURSO: ImportacionEnCurso[] = [
  {
    clave: 'en_produccion',
    proveedorId: 'pr_lanxin',
    contenido: 'suéteres de merino para diciembre',
    referencias: ['pd_pun_0601', 'pd_pun_0602', 'pd_pun_0605', 'pd_pun_0603'],
    carga: { tipo: 'consolidada', m3: 5.4 },
    estadoAlAncla: 'en_produccion',
    estadoRealDesfase: -20,
    // Listo para despacho en ≈ 2 semanas (día hábil); el saldo de US$ 14.700 vence ese día (M6).
    estimadas: { listo_despacho: 14 },
    reportadoPortal: null,
    aforo: null,
    unidadesForzadas: {},
    saldoCentavos: 1_470_000,
  },
  {
    clave: 'en_transito',
    proveedorId: 'pr_yuefeng',
    contenido: 'pantalones y chinos',
    referencias: ['pd_pan_0305', 'pd_pan_0302', 'pd_pan_0303', 'pd_pan_0304', 'pd_pan_0312', 'pd_pan_0301'],
    carga: { tipo: 'consolidada', m3: 7.1 },
    estadoAlAncla: 'en_transito',
    estadoRealDesfase: -23,
    // Embarcado ancla − 24; puerto estimado ancla + 8 (N4).
    estimadas: { embarcado: -24, en_puerto: 8 },
    reportadoPortal: null,
    aforo: null,
    unidadesForzadas: {},
    saldoCentavos: null,
  },
  {
    clave: 'en_puerto',
    proveedorId: 'pr_huameng',
    contenido: 'camisas',
    referencias: [
      'pd_cam_0142',
      'pd_cam_0131',
      'pd_cam_0141',
      'pd_cam_0140',
      'pd_cam_0136',
      'pd_cam_0132',
      'pd_cam_0134',
    ],
    carga: { tipo: 'consolidada', m3: 6.2 },
    estadoAlAncla: 'en_puerto',
    // Reportado ayer por Carolina desde el portal (N2).
    estadoRealDesfase: -1,
    estimadas: { en_nacionalizacion: 2, recibido_bodega: 12 },
    reportadoPortal: { autor: 'Carolina Mejía', contactoId: 'co_carolina_mejia' },
    aforo: null,
    unidadesForzadas: { 'pd_cam_0142|M|col_azc': 48 },
    saldoCentavos: null,
    // Pedido de temporada (octubre–diciembre): ≈ 1.100 camisas en los 6,2 m³ (W4), con poca Oxford: ya venía
    // corta y es la protagonista del próximo pedido (W12). Pista de calibración.
    factorCantidad: 1.8,
    factorPorProducto: { pd_cam_0142: 0.5 },
  },
  {
    clave: 'en_nacionalizacion',
    proveedorId: 'pr_weiye',
    contenido: 'blazers de lana fría y trajes',
    referencias: ['pd_blz_0401', 'pd_blz_0405', 'pd_trj_0501', 'pd_trj_0502', 'pd_blz_0409'],
    carga: { tipo: 'consolidada', m3: 4.8 },
    estadoAlAncla: 'en_nacionalizacion',
    estadoRealDesfase: -10,
    // Nacionalizado estimado ancla − 6, sin fecha real (6 días de retraso); nueva llegada a bodega ancla + 9 (N3).
    estimadas: { nacionalizado: -6, recibido_bodega: 9 },
    reportadoPortal: null,
    aforo: { tipo: 'fisico', motivo: 'Revisión de etiquetado' },
    unidadesForzadas: {},
    saldoCentavos: null,
  },
];

/** Historia: pedidos recibidos antes del ancla (≈ 10 en 18 meses, más la carga inicial; 7.9). */
export const HISTORIA_IMPORTACIONES = {
  /** La carga inicial se recibe el día anterior a inicioVentana, con existencias para las primeras semanas (I5). */
  cargaInicial: { diasAntesDeVentana: 1, semanasCobertura: 10 },
  /** Pedido grande de temporada de calzado: contenedor de 20 pies, recibido hace ≈ 7 meses, × 2,6 (P5). */
  calzadoDormido: {
    proveedorId: 'pr_ruifeng',
    mesesAtras: 7,
    factorCantidad: 2.6,
    carga: { tipo: 'contenedor', pies: 20 },
  },
  /** La Oxford azul cielo M se pide × 0,75 para que se agote ≈ 3 veces en 6 meses (P3). */
  oxfordM: { clave: 'pd_cam_0142|M|col_azc', factor: 0.75 },
  /** Cobertura de cada pedido: hasta la siguiente llegada + 20 días, × 1,10 (7.9). */
  // Pista de calibración (P5): 20 días y × 1,10 dejan la tienda en ≈ 4 meses de inventario (antes ≈ 5).
  coberturaExtraDias: 20,
  margenSeguridad: 1.1,
  /** Blazers: la tasa sube ≈ 8 % entre el penúltimo y el último pedido (P13). */
  alzaTasaBlazers: 0.08,
  /** Aforo en ≈ 15 % de los pedidos (3–8 días más de nacionalización). */
  probabilidadAforo: 0.15,
  diasAforo: [3, 8] as [number, number],
} as const;

/** Montos de ejemplo de la cadena (7.9). */
export const COSTOS_EJEMPLO: {
  fleteConsolidadoUsdPorM3: [number, number];
  gastosOrigenUsd: [number, number];
  fleteContenedor20Usd: [number, number];
  honorariosAgente: [COP, COP];
  bodegajePuerto: [COP, COP];
  transporteBogota: [COP, COP];
} = {
  fleteConsolidadoUsdPorM3: [120, 160],
  gastosOrigenUsd: [180, 320],
  fleteContenedor20Usd: [2_800, 3_600],
  honorariosAgente: [1_800_000, 2_600_000],
  bodegajePuerto: [900_000, 1_600_000],
  transporteBogota: [1_200_000, 4_500_000],
};

/** Puerto de destino por defecto. */
export const PUERTO_DESTINO = 'Buenaventura' as const;

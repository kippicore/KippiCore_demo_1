import type { COP, DatosLocal, Fraccion, HorarioSemanal, Id } from '@/dominio/tipos';

/** Perfil de demanda por local (PLAN 4.7 P1, P8; 7.5; 7.6). Los consume el generador (F2-A2). */
export interface PerfilLocal {
  /** Ventas por día en un mes típico (índice 1,00). */
  ventasDiaBase: number;
  /** Índice del domingo (P8). */
  indiceDomingo: number;
  /** Factor en festivos: calle 0,85 · centro comercial 1,15. */
  indiceFestivo: number;
  /** Unidades por venta promedio. */
  unidadesPorVenta: number;
  /** Ticket promedio objetivo (COP con IVA). */
  ticketObjetivo: COP;
  /** Participación en la distribución de una importación recibida (7.9). */
  participacionDistribucion: Fraccion;
  /** Meta mensual base (con IVA) para un mes de índice 1,00. */
  metaMensualBase: COP;
}

export interface ConfigLocal {
  id: Id;
  datos: DatosLocal;
  perfil: PerfilLocal | null;
}

const LUN_SAB_10_20_DOM_11_19: HorarioSemanal = {
  0: { abre: '11:00', cierra: '19:00' },
  1: { abre: '10:00', cierra: '20:00' },
  2: { abre: '10:00', cierra: '20:00' },
  3: { abre: '10:00', cierra: '20:00' },
  4: { abre: '10:00', cierra: '20:00' },
  5: { abre: '10:00', cierra: '20:00' },
  6: { abre: '10:00', cierra: '20:00' },
};

/** 3 locales + bodega (PRD 9). Nombres y direcciones de ejemplo. */
export const LOCALES: ConfigLocal[] = [
  {
    id: 'p93',
    datos: {
      codigo: 'P93',
      nombre: 'Parque 93',
      tipo: 'tienda_calle',
      vende: true,
      direccion: 'Calle 93B # 11A-48',
      zona: 'Chicó',
      horario: LUN_SAB_10_20_DOM_11_19,
      horarioFestivo: { abre: '11:00', cierra: '19:00' },
      cuentaCajaId: 'cta_caja_p93',
      arriendoMensual: 18_500_000,
      areaM2: 140,
      orden: 1,
    },
    perfil: {
      ventasDiaBase: 9,
      indiceDomingo: 0.8,
      indiceFestivo: 0.85,
      unidadesPorVenta: 1.6,
      ticketObjetivo: 520_000,
      participacionDistribucion: 0.4,
      metaMensualBase: 135_000_000,
    },
  },
  {
    id: 'usq',
    datos: {
      codigo: 'USQ',
      nombre: 'Usaquén',
      tipo: 'tienda_calle',
      vende: true,
      direccion: 'Carrera 6 # 119B-52',
      zona: 'Usaquén',
      horario: LUN_SAB_10_20_DOM_11_19,
      horarioFestivo: { abre: '11:00', cierra: '19:00' },
      cuentaCajaId: 'cta_caja_usq',
      arriendoMensual: 9_800_000,
      areaM2: 95,
      orden: 2,
    },
    perfil: {
      ventasDiaBase: 6,
      indiceDomingo: 1.35,
      indiceFestivo: 0.85,
      unidadesPorVenta: 1.4,
      ticketObjetivo: 365_000,
      participacionDistribucion: 0.22,
      metaMensualBase: 66_000_000,
    },
  },
  {
    id: 'zr',
    datos: {
      codigo: 'ZR',
      nombre: 'Zona Rosa',
      tipo: 'centro_comercial',
      vende: true,
      direccion: 'Calle 82 # 12-15, local 214',
      zona: 'Zona Rosa',
      horario: {
        ...LUN_SAB_10_20_DOM_11_19,
        1: { abre: '10:00', cierra: '21:00' },
        2: { abre: '10:00', cierra: '21:00' },
        3: { abre: '10:00', cierra: '21:00' },
        4: { abre: '10:00', cierra: '21:00' },
        5: { abre: '10:00', cierra: '21:00' },
        6: { abre: '10:00', cierra: '21:00' },
      },
      horarioFestivo: { abre: '11:00', cierra: '20:00' },
      cuentaCajaId: 'cta_caja_zr',
      arriendoMensual: 14_200_000,
      areaM2: 110,
      orden: 3,
    },
    perfil: {
      ventasDiaBase: 14,
      indiceDomingo: 1.45,
      indiceFestivo: 1.15,
      unidadesPorVenta: 1.3,
      ticketObjetivo: 315_000,
      participacionDistribucion: 0.38,
      metaMensualBase: 129_000_000,
    },
  },
  {
    id: 'bod',
    datos: {
      codigo: 'BOD',
      nombre: 'Bodega central',
      tipo: 'bodega',
      vende: false,
      direccion: 'Calle 17 # 68D-35',
      zona: 'Puente Aranda',
      horario: {
        0: null,
        1: { abre: '08:00', cierra: '17:00' },
        2: { abre: '08:00', cierra: '17:00' },
        3: { abre: '08:00', cierra: '17:00' },
        4: { abre: '08:00', cierra: '17:00' },
        5: { abre: '08:00', cierra: '17:00' },
        6: { abre: '08:00', cierra: '14:00' },
      },
      horarioFestivo: null,
      cuentaCajaId: null,
      arriendoMensual: 6_500_000,
      areaM2: 420,
      orden: 4,
    },
    perfil: null,
  },
];

export const ID_BODEGA: Id = 'bod';
export const LOCALES_QUE_VENDEN: Id[] = ['p93', 'usq', 'zr'];
/** Días cerrados (7.3): MM-DD. */
export const DIAS_CERRADOS = ['12-25', '01-01'] as const;
/** El 24 de diciembre cierra a las 6:00 p. m. (7.5). */
export const CIERRE_ESPECIAL: Record<string, string> = { '12-24': '18:00' };

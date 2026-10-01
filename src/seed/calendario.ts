import type { Id } from '@/dominio/tipos';

/**
 * Campañas de temporada y citas guionadas (PLAN 2.3.4, 7.4, N11). Las fechas se resuelven relativas al año
 * (campañas) o al ancla (citas); el generador guarda los eventos de 2 meses atrás a 3 meses adelante.
 */
export type ReglaFecha =
  | { tipo: 'mes_dia'; desde: string; hasta: string }
  | {
      tipo: 'relativa';
      base: 'tercer_domingo_junio' | 'tercer_sabado_septiembre' | 'ultimo_viernes_noviembre';
      desdeDias: number;
      hastaDias: number;
    };

export interface CampanaSeed {
  id: string;
  titulo: string;
  descripcion: string;
  regla: ReglaFecha;
}

export const CAMPANAS: CampanaSeed[] = [
  {
    id: 'liquidacion',
    titulo: 'Liquidación de temporada',
    descripcion: '15 % en referencias de la temporada anterior.',
    regla: { tipo: 'mes_dia', desde: '01-08', hasta: '01-31' },
  },
  {
    id: 'coleccion-1',
    titulo: 'Lanzamiento colección I',
    descripcion: 'Linos, polos y camisas de verano en vitrina.',
    regla: { tipo: 'mes_dia', desde: '03-01', hasta: '03-07' },
  },
  {
    id: 'dia-padre',
    titulo: 'Campaña Día del Padre',
    descripcion: 'Vitrina de regalos, bonos de regalo y empaque especial.',
    regla: { tipo: 'relativa', base: 'tercer_domingo_junio', desdeDias: -14, hastaDias: 0 },
  },
  {
    id: 'grados-junio',
    titulo: 'Temporada de grados',
    descripcion: 'Trajes y blazers con ajuste de sastre incluido.',
    regla: { tipo: 'mes_dia', desde: '06-01', hasta: '06-30' },
  },
  {
    id: 'coleccion-2',
    titulo: 'Lanzamiento colección II',
    descripcion: 'Merino, pana y abrigos para la temporada de lluvias.',
    regla: { tipo: 'mes_dia', desde: '08-01', hasta: '08-07' },
  },
  {
    id: 'amor-amistad',
    titulo: 'Amor y Amistad',
    descripcion: 'Bonos de regalo y accesorios en caja.',
    regla: { tipo: 'relativa', base: 'tercer_sabado_septiembre', desdeDias: -7, hastaDias: 1 },
  },
  {
    id: 'preventa-bf',
    titulo: 'Preventa Black Friday para clientes VIP',
    descripcion: 'Acceso anticipado con 20 % para clientes VIP.',
    regla: { tipo: 'relativa', base: 'ultimo_viernes_noviembre', desdeDias: -16, hastaDias: -14 },
  },
  {
    id: 'black-friday',
    titulo: 'Black Friday',
    descripcion: 'Descuentos de 20 a 30 % aprobados por el dueño.',
    regla: { tipo: 'relativa', base: 'ultimo_viernes_noviembre', desdeDias: 0, hastaDias: 2 },
  },
  {
    id: 'grados-dic',
    titulo: 'Temporada de grados',
    descripcion: 'Trajes y blazers con ajuste de sastre incluido.',
    regla: { tipo: 'mes_dia', desde: '12-01', hasta: '12-15' },
  },
  {
    id: 'navidad',
    titulo: 'Temporada de Navidad',
    descripcion: 'Horario extendido, bonos de regalo y empaque especial.',
    regla: { tipo: 'mes_dia', desde: '12-01', hasta: '12-24' },
  },
];

/** Citas guionadas relativas al ancla (N11). */
export interface CitaSeed {
  id: Id;
  titulo: string;
  subtipo: 'toma_medidas' | 'asesoria' | 'seguimiento';
  /** 'proximo_sabado' = el primer sábado después del ancla; número = días desde el ancla. */
  dia: 'proximo_sabado' | number;
  hora: string;
  duracionMin: number;
  localId: Id;
  clienteId: Id | null;
  empleadoId: Id | null;
  descripcion: string;
}

export const CITAS: CitaSeed[] = [
  {
    id: 'ev_cita_medidas_penuela',
    titulo: 'Toma de medidas — Ricardo Peñuela',
    subtipo: 'toma_medidas',
    dia: 'proximo_sabado',
    hora: '11:00',
    duracionMin: 60,
    localId: 'p93',
    clienteId: 'cl_ricardo_penuela',
    empleadoId: 'em_hbeltran',
    descripcion: 'Traje de tres piezas para matrimonio en diciembre. Lo atiende Valentina con Hernando.',
  },
  {
    id: 'ev_cita_asesoria_usq',
    titulo: 'Asesoría de vestuario — Andrés Gutiérrez',
    subtipo: 'asesoria',
    dia: 9,
    hora: '17:30',
    duracionMin: 45,
    localId: 'usq',
    clienteId: 'cl_andres_gutierrez',
    empleadoId: 'em_scardenas',
    descripcion: 'Busca blazer y pantalón para la oficina.',
  },
  {
    id: 'ev_seguimiento_ajustes',
    titulo: 'Entrega de ajustes del taller',
    subtipo: 'seguimiento',
    dia: 3,
    hora: '15:00',
    duracionMin: 30,
    localId: 'usq',
    clienteId: null,
    empleadoId: 'em_hbeltran',
    descripcion: 'Bastas y ajustes de manga de la semana.',
  },
];

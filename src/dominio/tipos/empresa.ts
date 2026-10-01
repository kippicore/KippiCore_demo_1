import type { COP, DiaSemana, Eliminable, HoraHHmm, Id, Trazabilidad } from './comunes';

/** Empresa, locales y usuarios (PLAN 6.3). */
export interface Empresa {
  /** 'HALDEN' (se muestra con useMarca(): la marca personalizada del store `sesion` tiene prioridad). */
  nombre: string;
  /** 'Moda masculina · Bogotá' */
  descriptor: string;
  /** Ficticia, p. ej. 'Halden Moda Masculina S.A.S.' */
  razonSocial: string;
  /** Ficticio con dígito de verificación: '901.234.567-8' */
  nit: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  correo: string;
  colores: { acento: string; acentoTexto: string; acentoSuave: string; tiendaHero: string };
  /** 'Juan Camilo Ospina' — persona interna; nunca en el saludo. */
  duenoNombre: string;
  responsableIva: boolean;
}

/** Estado de interfaz (store `sesion`, NO dominio): personalización de 2.2.1. */
export interface MarcaPersonalizada {
  nombreNegocio: string | null;
  nombrePersona: string | null;
}

export type TipoLocal = 'tienda_calle' | 'centro_comercial' | 'bodega';
export interface FranjaHorario {
  abre: HoraHHmm;
  cierra: HoraHHmm;
}
export type HorarioSemanal = Record<DiaSemana, FranjaHorario | null>;

export interface Local extends Trazabilidad, Eliminable {
  /** 'p93' | 'usq' | 'zr' | 'bod' en la semilla. */
  id: Id;
  /** 'P93' */
  codigo: string;
  /** 'Parque 93' */
  nombre: string;
  tipo: TipoLocal;
  /** false para la bodega. */
  vende: boolean;
  direccion: string;
  /** 'Chicó' · 'Usaquén' · 'Zona Rosa' · 'Puente Aranda' */
  zona: string;
  horario: HorarioSemanal;
  horarioFestivo: FranjaHorario | null;
  /** Caja del local. */
  cuentaCajaId: Id | null;
  arriendoMensual: COP;
  areaM2: number;
  orden: number;
}

export type Rol = 'dueno' | 'vendedor' | 'bodega';
export interface UsuarioDemo extends Trazabilidad, Eliminable {
  id: Id;
  nombre: string;
  correo: string;
  iniciales: string;
  rol: Rol;
  /** Vendedor y bodega son empleados. */
  empleadoId: Id | null;
  /** Vendedor: su local. */
  localFijoId: Id | null;
  activo: boolean;
}

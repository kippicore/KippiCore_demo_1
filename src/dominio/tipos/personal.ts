import type {
  COP,
  Eliminable,
  FechaHoraISO,
  FechaISO,
  Fraccion,
  HoraHHmm,
  Id,
  MesISO,
  Soporte,
  Trazabilidad,
} from './comunes';

/** Personal, contratos, comisiones, turnos, asistencia y novedades (PLAN 6.9). */
export type Cargo =
  'vendedor' | 'cajero' | 'jefe_bodega' | 'auxiliar_bodega' | 'administracion' | 'sastre' | 'contenido_redes';

export interface Empleado extends Trazabilidad, Eliminable {
  id: Id;
  /** 'sebastian-cardenas' — único e inmutable (URL). */
  slug: string;
  nombres: string;
  apellidos: string;
  documento: { tipo: 'CC' | 'CE' | 'PPT'; numero: string };
  fechaNacimiento: FechaISO | null;
  cargo: Cargo;
  /** null = administración / atiende varios locales. */
  localId: Id | null;
  fechaIngreso: FechaISO;
  fechaRetiro: FechaISO | null;
  celular: string;
  correo: string;
  contactoEmergencia: { nombre: string; parentesco: string; celular: string };
  /** Nombres ficticios (seed). */
  afiliaciones: { eps: string; pension: string; cesantias: string; arl: string; caja: string };
  cuentaPago: {
    entidad: string;
    tipo: 'ahorros' | 'corriente' | 'nequi' | 'daviplata';
    numeroEnmascarado: string;
  };
  contratoVigenteId: Id;
  // derivado: antigüedad, costo para el negocio, comisiones, asistencia, horas de la semana
}

export type TipoVinculacion = 'laboral' | 'prestacion_servicios';
export interface Contrato extends Trazabilidad {
  id: Id;
  empleadoId: Id;
  tipo: TipoVinculacion;
  /** Solo laboral. */
  modalidadLaboral: 'indefinido' | 'fijo' | 'obra_labor' | null;
  inicio: FechaISO;
  fin: FechaISO | null;
  /** Laboral (mensual). */
  salarioBase: COP | null;
  /** Prestación (mensual). */
  honorarios: COP | null;
  /** ≤ jornada máxima vigente. */
  jornadaSemanalHoras: number;
  riesgoArl: 1 | 2 | 3 | 4 | 5;
  esquemaComisionId: Id | null;
  periodicidadPago: 'quincenal' | 'mensual';
  /** Prestación: por defecto el parámetro. */
  retencionFuente: Fraccion | null;
  /** Prestación. */
  verificacionesPila: { periodo: MesISO; verificada: boolean; soporte: Soporte | null }[];
}

export type ComponenteComision =
  | { tipo: 'porcentaje'; porcentaje: Fraccion }
  /** Sobre la venta del mes. */
  | { tipo: 'escalonado'; modo: 'total' | 'marginal'; tramos: { desde: COP; porcentaje: Fraccion }[] }
  /** Si el local cumple su meta. */
  | { tipo: 'bono_meta_local'; valor: COP; cumplimientoMinimo: Fraccion };
export interface EsquemaComision extends Trazabilidad, Eliminable {
  id: Id;
  /** '3 % sobre tus ventas sin IVA' */
  nombre: string;
  /** La semilla usa base_sin_iva en todos los esquemas (el IVA no es del vendedor). */
  base: 'total_con_iva' | 'base_sin_iva';
  componentes: ComponenteComision[];
}

/** valor con IVA. */
export interface MetaVentas {
  id: Id;
  localId: Id;
  mes: MesISO;
  valor: COP;
}

export type TipoTurno = 'apertura' | 'intermedio' | 'cierre' | 'completo';
export interface Turno extends Trazabilidad {
  id: Id;
  empleadoId: Id;
  localId: Id;
  fecha: FechaISO;
  tipo: TipoTurno;
  inicio: HoraHHmm;
  /** Horas BRUTAS: inicio–fin incluye el descanso. */
  fin: HoraHHmm;
  /** 60 en la plantilla: 8 h brutas = 7 h netas; las horas de jornada son netas. */
  descansoMin: number;
  /** El dueño confirmó que genera horas extra. */
  excedeJornadaAceptado: boolean;
  // derivado: horas netas programadas, horas nocturnas (desde jornadaNocturna.inicio), si es dominical/festivo, recargo estimado
}

export interface Marcacion extends Trazabilidad {
  id: Id;
  empleadoId: Id;
  localId: Id;
  ts: FechaHoraISO;
  tipo: 'entrada' | 'salida';
  medio: 'boton' | 'generada' | 'corregida';
  nota: string | null;
}

export type TipoNovedad =
  | 'incapacidad'
  | 'vacaciones'
  | 'licencia_remunerada'
  | 'licencia_no_remunerada'
  | 'permiso'
  | 'calamidad'
  | 'licencia_paternidad';
export interface Novedad extends Trazabilidad, Eliminable {
  id: Id;
  empleadoId: Id;
  tipo: TipoNovedad;
  desde: FechaISO;
  hasta: FechaISO;
  remunerada: boolean;
  soporte: Soporte | null;
  nota: string | null;
  // derivado: días hábiles afectados, efecto en la liquidación
}

/** Resultado DERIVADO de asistencia por empleado y día (no se almacena). */
export interface AsistenciaDia {
  empleadoId: Id;
  fecha: FechaISO;
  localId: Id | null;
  turnoId: Id | null;
  entrada: FechaHoraISO | null;
  salida: FechaHoraISO | null;
  estado: 'a_tiempo' | 'tarde' | 'ausente' | 'novedad' | 'sin_turno' | 'en_curso' | 'pendiente';
  minutosTarde: number;
  horasTrabajadas: number;
  horasOrdinarias: number;
  horasExtraDiurnas: number;
  horasExtraNocturnas: number;
  /** Ordinarias en franja nocturna. */
  horasRecargoNocturno: number;
  horasDominicalFestivo: number;
}

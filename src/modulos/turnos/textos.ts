import type { TipoNovedad, TipoTurno } from '@/dominio/tipos';

/** Copy de la interfaz de Turnos, asistencia y novedades (C2). Español de Colombia, lenguaje del comerciante. */

export const ETIQUETA_TIPO_TURNO: Record<TipoTurno, string> = {
  apertura: 'Apertura',
  intermedio: 'Intermedio',
  cierre: 'Cierre',
  completo: 'Completo',
};

export const AYUDA_TIPO_TURNO: Record<TipoTurno, string> = {
  apertura: 'Abre el local y lo deja listo para vender.',
  intermedio: 'Cubre las horas de más movimiento.',
  cierre: 'Cierra la caja y el local. Después de las 7 p. m. lleva recargo nocturno.',
  completo: 'Un solo turno de principio a fin (bodega o domingos).',
};

export const TIPOS_TURNO: readonly TipoTurno[] = ['apertura', 'intermedio', 'cierre', 'completo'];

export const ETIQUETA_NOVEDAD: Record<TipoNovedad, string> = {
  incapacidad: 'Incapacidad',
  vacaciones: 'Vacaciones',
  licencia_remunerada: 'Licencia remunerada',
  licencia_no_remunerada: 'Licencia no remunerada',
  permiso: 'Permiso',
  calamidad: 'Calamidad doméstica',
  licencia_paternidad: 'Licencia de paternidad',
};

export const AYUDA_NOVEDAD: Record<TipoNovedad, string> = {
  incapacidad: 'Incapacidad médica con su soporte de la EPS.',
  vacaciones: 'Días de descanso causados por el tiempo trabajado.',
  licencia_remunerada: 'Ausencia autorizada que se paga completa.',
  licencia_no_remunerada: 'Ausencia autorizada que no se paga.',
  permiso: 'Unas horas o días que se piden con anticipación.',
  calamidad: 'Un hecho grave de la familia (fallecimiento, accidente).',
  licencia_paternidad: 'Descanso por el nacimiento de un hijo.',
};

export const TIPOS_NOVEDAD: readonly TipoNovedad[] = [
  'incapacidad',
  'vacaciones',
  'licencia_remunerada',
  'licencia_no_remunerada',
  'permiso',
  'calamidad',
  'licencia_paternidad',
];

/** ¿Se paga por defecto? El formulario lo propone y el dueño lo cambia. */
export const REMUNERADA_POR_DEFECTO: Record<TipoNovedad, boolean> = {
  incapacidad: true,
  vacaciones: true,
  licencia_remunerada: true,
  licencia_no_remunerada: false,
  permiso: true,
  calamidad: true,
  licencia_paternidad: true,
};

export const TEXTOS = {
  turnos: {
    titulo: 'Turnos',
    subtitulo: 'Programa la semana de cada local sin pasarte de la jornada y mira cuánto cuesta cerrar tarde y abrir el domingo.',
    ayudaArrastrar: 'Arrastra un turno de la barra a un día, o un turno puesto a otro día o persona.',
    sinEquipoTitulo: 'Este local todavía no tiene equipo',
    sinEquipoTexto: 'Asigna personas al local desde Personal y nómina para poder programar sus turnos.',
    excesoTitulo: 'Esto pasa de la jornada máxima',
    celdaVacia: 'Libre',
    otroLocal: 'En otro local',
    copiarAnterior: 'Traer la semana anterior',
    copiarSiguiente: 'Llevar esta semana a la siguiente',
    semanaVaciaOrigen: 'La semana de origen no tiene turnos en este local.',
  },
  recargos: {
    titulo: 'Recargos estimados de la semana',
    explicacion:
      'Cada hora trabajada después de las 7 p. m. y cada hora de domingo o festivo se paga con un recargo sobre el valor de la hora. Así se reparte el de esta semana.',
    prestacion: 'Prestación de servicios: no genera recargos.',
    parametros: 'Valores con los que se calcula',
    verificar: 'Verificar',
    verificarAyuda: 'Los porcentajes dependen de la reforma laboral vigente. Valídalos con tu contador antes de usarlos como cálculo real.',
  },
  asistencia: {
    titulo: 'Asistencia',
    subtitulo: 'Quién llegó, a qué hora, cuántas horas trabajó y cuántas fueron extra. Esto alimenta la nómina.',
    vacioTitulo: 'Sin turnos en estas fechas',
    vacioTexto: 'Cambia el rango, el local o la persona para ver la asistencia.',
    alimentaNomina: 'Lo que pasa a la nómina del periodo',
  },
  novedades: {
    titulo: 'Novedades',
    subtitulo: 'Incapacidades, vacaciones, licencias y permisos del equipo, y cuántos turnos hay que cubrir.',
    vacioTitulo: 'Ninguna novedad con estos filtros',
    vacioTexto: 'Cambia los filtros o registra una novedad nueva.',
  },
  miDia: {
    nunca: 'Lo que no puedes hacer sin el dueño',
    nuncaAyuda: 'Está pensado así para cuidar la plata y el inventario del negocio. Esto es lo que haces en su lugar.',
  },
} as const;

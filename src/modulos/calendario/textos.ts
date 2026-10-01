import type { TipoEvento, TipoTurno } from '@/dominio/tipos';
import type { OrigenEvento } from './tipos';

/** Copy de la interfaz del Calendario (C3). Español de Colombia, lenguaje del comerciante. */

export const TEXTOS = {
  titulo: 'Calendario',
  subtitulo: 'Turnos, llegadas de contenedores, pagos, campañas y citas con clientes, en un solo lugar',
  nuevo: 'Nuevo evento',
  hoy: 'Hoy',
  anterior: { mes: 'Mes anterior', semana: 'Semana anterior', dia: 'Día anterior' },
  siguiente: { mes: 'Mes siguiente', semana: 'Semana siguiente', dia: 'Día siguiente' },
  vistas: { mes: 'Mes', semana: 'Semana', dia: 'Día' },
  todosLosLocales: 'Todos los locales',
  filtroLocal: 'Local',
  leyenda: 'Tipos de evento',
  leyendaAyuda: 'Toca un tipo para mostrarlo u ocultarlo. Arrastra un evento a otro día para moverlo.',
  verTodo: 'Ver todos los tipos',
  vacioDia: {
    titulo: 'Un día sin eventos',
    texto: 'Aquí aparecerán turnos, llegadas, pagos, campañas y citas. Puedes agregar uno propio.',
  },
  vacioFiltros: {
    titulo: 'Todo está oculto',
    texto: 'Quitaste todos los tipos de evento de la leyenda. Vuelve a mostrarlos para ver el calendario.',
  },
  errorTitulo: 'No pudimos mostrar el calendario',
  errorTexto: 'Algo falló al preparar los eventos. Recarga la página; tus eventos están guardados.',
  notaObligaciones: 'Las obligaciones sin cuenta por pagar muestran una fecha ilustrativa del calendario de la empresa.',
  masEventos: (n: number) => `+${n} más`,
  turnos: (n: number) => (n === 1 ? '1 turno' : `${n} turnos`),
  sinEventosDelDia: 'Sin eventos',
  todoElDia: 'Todo el día',
  conHora: 'Con hora',
  evento: 'evento',
  agregarEn: (fechaTexto: string) => `Agregar un evento el ${fechaTexto}`,
  verDia: (fechaTexto: string) => `Ver el día ${fechaTexto}`,
  noEncontrado: 'Ese evento ya no está en el calendario',
} as const;

/** `etiqueta` es el nombre completo (detalle, ayudas); `leyenda` el corto que cabe en una línea a 1366 px. */
export const TIPOS_INFO: Record<TipoEvento, { etiqueta: string; leyenda: string; modulo: string }> = {
  turno: { etiqueta: 'Turnos de empleados', leyenda: 'Turnos', modulo: 'Turnos' },
  importacion: { etiqueta: 'Llegadas de importaciones', leyenda: 'Llegadas', modulo: 'Importaciones' },
  vencimiento: { etiqueta: 'Vencimientos y obligaciones', leyenda: 'Pagos y obligaciones', modulo: 'Pagos' },
  campana: { etiqueta: 'Campañas de temporada', leyenda: 'Campañas', modulo: 'Calendario' },
  cita: { etiqueta: 'Citas con clientes', leyenda: 'Citas', modulo: 'Calendario' },
  otro: { etiqueta: 'Otros eventos', leyenda: 'Otros', modulo: 'Calendario' },
};

export const ETIQUETA_TURNO: Record<TipoTurno, string> = {
  apertura: 'Apertura',
  intermedio: 'Intermedio',
  cierre: 'Cierre',
  completo: 'Jornada completa',
};

/** De qué módulo viene un evento que no se edita aquí. */
export const ORIGENES: Record<Exclude<OrigenEvento, 'guardado'>, { modulo: string; texto: string; abrir: string; mover: string }> = {
  turno: {
    modulo: 'Turnos',
    texto: 'Este turno viene del módulo de Turnos. Aquí lo puedes mover de día; para cambiar la hora o la persona, ábrelo allá.',
    abrir: 'Abrir en Turnos',
    mover: 'Mover el turno a otro día',
  },
  importacion: {
    modulo: 'Importaciones',
    texto: 'Esta llegada sale de la fecha estimada del pedido. Si la mueves aquí, cambia también en Importaciones; si cambia allá, se actualiza sola.',
    abrir: 'Abrir la importación',
    mover: 'Cambiar la fecha estimada de llegada',
  },
  cuenta: {
    modulo: 'Pagos',
    texto: 'Este vencimiento viene de Pagos. Aquí puedes programar el pago para otro día; el pago se registra allá.',
    abrir: 'Abrir en Por pagar',
    mover: 'Programar el pago para otro día',
  },
  obligacion: {
    modulo: 'Pagos',
    texto: 'Es una obligación del calendario de la empresa; todavía no tiene una cuenta por pagar. Se ve en el flujo de caja.',
    abrir: 'Ver en el flujo de caja',
    mover: '',
  },
};

export const FORMULARIO = {
  nuevoTitulo: 'Nuevo evento',
  editarTitulo: 'Editar evento',
  nuevoDescripcion: 'Agrega una campaña, una cita con un cliente, una obligación o cualquier recordatorio.',
  editarDescripcion: 'Corrige el evento. Los cambios se ven al guardar.',
  eyebrow: 'Calendario',
  titulo: 'Título',
  tituloPlaceholder: 'Ej.: Toma de medidas, Pago de la prima, Preventa Black Friday',
  clase: 'Qué es',
  clasePlaceholder: 'Elige el tipo de evento',
  fecha: 'Fecha',
  fechaFin: 'Hasta',
  fechaFinAyuda: 'Para eventos de varios días, como una campaña.',
  todoElDia: 'Todo el día',
  horaInicio: 'Hora de inicio',
  horaFin: 'Hora de fin',
  local: 'Local',
  sinLocal: 'Sin local (toda la empresa)',
  cliente: 'Cliente',
  clientePlaceholder: 'Buscar cliente por nombre, celular o cédula',
  quitarCliente: 'Quitar cliente',
  empleado: 'Quién atiende',
  sinEmpleado: 'Sin asignar',
  recordatorio: 'Recordatorio',
  recordatorioAyuda: 'Aparece en el inicio y en la app del dueño antes del evento.',
  descripcion: 'Notas',
  descripcionPlaceholder: 'Lo que hay que recordar para ese día',
  cancelar: 'Cancelar',
  crear: 'Crear evento',
  guardar: 'Guardar cambios',
} as const;

export const ELIMINAR = {
  pregunta: (titulo: string) => `¿Eliminar «${titulo}»?`,
  accion: 'Eliminar evento',
  consecuencias: (fechaTexto: string) => `Se quita del calendario del ${fechaTexto}. Si lo necesitas de nuevo, tendrás que crearlo otra vez.`,
} as const;

export const EXCESO = {
  titulo: 'Este turno pasa de la jornada semanal',
  confirmar: 'Mover y registrar horas extra',
  cancelar: 'No mover',
} as const;

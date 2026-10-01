import type { DatosEvento, EstadoDominio, EventoCalendario } from '../tipos';
import { exigir } from '../errores';
import { idNuevo, requerir, textoObligatorio, tsValido } from './comunes';
import { crudEditar, crudEliminar } from './crud';
import { manejador, traza } from './tx';

/** Calendario (PLAN 6.13, 6.21): campañas, citas, obligaciones y eventos libres. */

const TIPOS = ['vencimiento', 'campana', 'cita', 'otro'];
const SUBTIPOS = [
  'obligacion_tributaria',
  'obligacion_laboral',
  'campana_temporada',
  'asesoria',
  'toma_medidas',
  'seguimiento',
  'otro',
];

function validarEvento(estado: EstadoDominio, d: Partial<DatosEvento>, completo: boolean): void {
  if (completo || d.titulo !== undefined)
    textoObligatorio(d.titulo, 'titulo', 'Escribe el título del evento.');
  if (completo || d.tipo !== undefined)
    exigir(TIPOS.includes(d.tipo ?? ''), 'TIPO_INVALIDO', 'Elige el tipo de evento.', 'tipo');
  if (completo || d.subtipo !== undefined)
    exigir(SUBTIPOS.includes(d.subtipo ?? ''), 'TIPO_INVALIDO', 'Elige el subtipo del evento.', 'subtipo');
  if (completo || d.inicio !== undefined) tsValido(d.inicio, 'inicio');
  if (d.fin) {
    tsValido(d.fin, 'fin');
    if (d.inicio)
      exigir(d.fin >= d.inicio, 'RANGO_INVALIDO', 'El evento no puede terminar antes de empezar.', 'fin');
  }
  if (d.localId) requerir(estado.locales, d.localId, 'el local', 'localId');
  if (d.clienteId) requerir(estado.clientes, d.clienteId, 'el cliente', 'clienteId');
  if (d.empleadoId) requerir(estado.empleados, d.empleadoId, 'el empleado', 'empleadoId');
}

export const eventoCrear = manejador<'evento.crear', EventoCalendario>({
  validar(estado, d, ctx) {
    idNuevo(estado.eventos, d.eventoId, 'eventoId');
    validarEvento(estado, d.datos, true);
    return { ...traza(ctx), ...d.datos, id: d.eventoId };
  },
  escribir(estado, e, ctx) {
    estado.eventos[e.id] = e;
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'eventos', id: e.id, accion: 'creada' });
  },
});

export const eventoEditar = crudEditar<'evento.editar', EventoCalendario>({
  coleccion: 'eventos',
  id: (d) => d.eventoId,
  nombre: 'el evento',
  cambios(estado, actual, d) {
    validarEvento(estado, { ...actual, ...d.cambios }, false);
    return { ...d.cambios };
  },
});

export const eventoEliminar = crudEliminar<'evento.eliminar', EventoCalendario>({
  coleccion: 'eventos',
  id: (d) => d.eventoId,
  nombre: 'el evento',
});

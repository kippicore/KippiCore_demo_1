import type { Cliente, MensajeSaliente, NotaCliente, Notificacion } from '../tipos';
import { exigir } from '../errores';
import { idHijo } from '../motor/ids';
import { rutasDominio } from '../reglas/rutas-dominio';
import {
  construirCliente,
  idNuevo,
  requerir,
  textoObligatorio,
  tsValido,
  validarDatosCliente,
} from './comunes';
import { crudEditar, crudEliminar } from './crud';
import { manejador, marcarEditado } from './tx';

/** Clientes y mensajes (PLAN 6.8, 6.15, 6.21). */

export const clienteCrear = manejador<
  'cliente.crear',
  { cliente: Cliente; notificacion: Notificacion | null }
>({
  validar(estado, d, ctx) {
    idNuevo(estado.clientes, d.clienteId, 'clienteId');
    validarDatosCliente(estado, d.datos, true, null);
    const cliente = construirCliente(d.clienteId, d.datos, ctx);
    const notificacion: Notificacion | null =
      d.datos.canalAlta === 'instagram' && ctx.origen === 'usuario'
        ? {
            id: idHijo(d.clienteId, 'n'),
            ts: ctx.ts,
            tipo: 'cliente_instagram',
            titulo: `Nuevo cliente desde Instagram: ${d.datos.nombres} ${d.datos.apellidos}`,
            detalle: 'Escribió por mensaje directo y quedó registrado en tus clientes.',
            severidad: 'info',
            enlace: rutasDominio.cliente(d.clienteId),
            origen: null,
          }
        : null;
    return { cliente, notificacion };
  },
  escribir(estado, plan, ctx) {
    estado.clientes[plan.cliente.id] = plan.cliente;
    ctx.emitir({ tipo: 'ClienteCreado', clienteId: plan.cliente.id, origen: plan.cliente.canalAlta });
    if (plan.notificacion) {
      estado.notificaciones[plan.notificacion.id] = plan.notificacion;
      ctx.emitir({ tipo: 'NotificacionCreada', notificacionId: plan.notificacion.id });
    }
  },
});

export const clienteEditar = crudEditar<'cliente.editar', Cliente>({
  coleccion: 'clientes',
  id: (d) => d.clienteId,
  nombre: 'el cliente',
  cambios(estado, actual, d) {
    validarDatosCliente(estado, d.cambios, false, actual.id);
    return { ...d.cambios } as Partial<Cliente>;
  },
});

export const clienteEliminar = crudEliminar<'cliente.eliminar', Cliente>({
  coleccion: 'clientes',
  id: (d) => d.clienteId,
  nombre: 'el cliente',
  motivo: (d) => d.motivo,
});

export const clienteNota = manejador<'cliente.nota', { clienteId: string; nota: NotaCliente }>({
  validar(estado, d, ctx) {
    const c = requerir(estado.clientes, d.clienteId, 'el cliente', 'clienteId');
    exigir(!c.notas.some((n) => n.id === d.notaId), 'ID_DUPLICADO', 'Esa nota ya se guardó.', 'notaId');
    const texto = textoObligatorio(d.texto, 'texto', 'Escribe la nota.');
    return { clienteId: c.id, nota: { id: d.notaId, ts: ctx.ts, autorId: ctx.usuarioId, texto } };
  },
  escribir(estado, plan, ctx) {
    const c = estado.clientes[plan.clienteId];
    if (!c) return;
    c.notas.push(plan.nota);
    marcarEditado(c, ctx);
    ctx.emitir({ tipo: 'EntidadCambiada', coleccion: 'clientes', id: c.id, accion: 'editada' });
  },
});

export const mensajeRegistrar = manejador<'mensaje.registrar', MensajeSaliente[]>({
  validar(estado, d) {
    exigir(d.mensajes.length > 0, 'SIN_MENSAJES', 'No hay mensajes para registrar.', 'mensajes');
    const existentes = new Set(estado.mensajes.map((m) => m.id));
    return d.mensajes.map((m) => {
      exigir(m.id && !existentes.has(m.id), 'ID_DUPLICADO', 'Ese mensaje ya se registró.', 'mensajes');
      existentes.add(m.id);
      tsValido(m.ts, 'mensajes');
      textoObligatorio(m.cuerpo, 'mensajes', 'El mensaje no puede ir vacío.');
      textoObligatorio(m.destinatario.nombre, 'mensajes', 'Falta el destinatario.');
      if (m.canal === 'whatsapp')
        exigir(
          m.destinatario.telefono,
          'SIN_TELEFONO',
          `${m.destinatario.nombre} no tiene WhatsApp registrado.`,
          'mensajes',
        );
      if (m.canal === 'correo')
        exigir(
          m.destinatario.correo,
          'SIN_CORREO',
          `${m.destinatario.nombre} no tiene correo registrado.`,
          'mensajes',
        );
      return {
        ...m,
        destinatario: { ...m.destinatario },
        origen: { ...m.origen },
        estado: 'enviado_simulado' as const,
      };
    });
  },
  escribir(estado, mensajes, ctx) {
    for (const m of mensajes) estado.mensajes.push(m);
    ctx.emitir({ tipo: 'MensajesRegistrados', ids: mensajes.map((m) => m.id) });
  },
});

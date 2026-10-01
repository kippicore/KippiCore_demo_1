import type { FechaHoraISO, Id, ParteFrase, RefDocumento } from './comunes';

/** Mensajería, notificaciones y alertas (PLAN 6.15). */
/** Libro (arreglo). */
export interface MensajeSaliente {
  id: Id;
  ts: FechaHoraISO;
  /** wechat: simulado, solo "Copiar para WeChat". */
  canal: 'whatsapp' | 'correo' | 'wechat';
  destinatario: {
    tipo: 'contacto' | 'cliente' | 'empleado' | 'libre';
    refId: Id | null;
    nombre: string;
    telefono: string | null;
    correo: string | null;
  };
  idioma: 'es' | 'en';
  tratamiento: 'tu' | 'usted';
  asunto: string | null;
  /** Los textos prellenados de wa.me/mailto terminan en "(mensaje de prueba desde la demo de KippiCore)". */
  cuerpo: string;
  estado: 'enviado_simulado';
  origen: {
    tipo:
      | 'importacion'
      | 'pedido_sugerido'
      | 'cobro'
      | 'cliente'
      | 'cumpleanos'
      | 'campana'
      | 'separado'
      | 'resumen_dueno';
    id: Id | null;
  };
  // derivado: enlaces wa.me y mailto: sin destinatario (lib/enlaces.ts)
}

export type TipoNotificacion =
  | 'importacion_estado'
  | 'portal_actualizacion'
  | 'venta_web'
  | 'cliente_instagram'
  | 'aprobacion_solicitada'
  | 'aprobacion_resuelta'
  | 'sistema';
export interface Notificacion {
  id: Id;
  ts: FechaHoraISO;
  tipo: TipoNotificacion;
  /** 'Carolina Mejía reportó el levante de IMP-2026-06' */
  titulo: string;
  detalle: string;
  severidad: 'info' | 'atencion' | 'urgente';
  /** Ruta interna (rutas.ts). */
  enlace: string;
  origen: RefDocumento | null;
  // derivado: leída (estado de interfaz en el store `sesion`, no en el dominio)
}

/** Alertas DERIVADAS (selector). Su id es estable para poder descartarlas (descartadas: store `sesion`). */
export type TipoAlerta =
  | 'stock_bajo'
  | 'agotado'
  | 'importacion_estado'
  | 'importacion_retrasada'
  | 'pago_por_vencer'
  | 'pago_vencido'
  | 'inasistencia'
  | 'llegada_tarde'
  | 'separado_por_vencer'
  | 'cumpleanos_vip'
  | 'mercancia_dormida'
  | 'aprobacion_pendiente'
  | 'caja_con_diferencia'
  | 'caja_sin_cerrar'
  | 'riesgo_contrato_realidad';
export interface Alerta {
  /** 'stock_bajo:<varianteId>@<localId>' · 'cxp:<id>:por_vencer' … */
  id: string;
  tipo: TipoAlerta;
  modulo: 'inventario' | 'importaciones' | 'pagos' | 'caja' | 'personal' | 'clientes' | 'ventas';
  severidad: 'info' | 'atencion' | 'urgente';
  titulo: string;
  contexto: string;
  /** Ruta construida con rutas.ts y sus parámetros (5.5.1). */
  accion: { texto: string; ruta: string };
  ts: FechaHoraISO;
  localId: Id | null;
  /** Nacida de una notificación no leída. */
  nueva: boolean;
  /** Orden en "Requiere tu atención" (2.3.3). */
  prioridad: number;
  /** El título y el contexto en trozos, con el dinero aparte en COP (si llevan dinero). */
  tituloPartes?: ParteFrase[];
  contextoPartes?: ParteFrase[];
  /** Solicitud que se puede aprobar o rechazar desde la misma alerta en el escritorio (compartidos C-D). */
  aprobacion?: { solicitudId: Id };
}

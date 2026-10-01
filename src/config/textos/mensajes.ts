import type { EstadoImportacion } from '@/dominio/tipos';

/**
 * Plantillas de mensajes de negocio (PLAN 1.5, W3, C1, C18). Los mensajes de negocio van en USTED por defecto
 * (cadena de importación, Wilson cuando el aviso es operativo, clientes VIP); los clientes no VIP se tutean;
 * a las fábricas, en inglés. Huecos con {{clave}}; los rellena `rellenarPlantilla` (dominio/reglas/texto.ts).
 * Los textos prellenados de wa.me y mailto: terminan con SUFIJO_PRUEBA y no llevan destinatario (R14).
 */
export const SUFIJO_PRUEBA = '(mensaje de prueba desde la demo de KippiCore)';

/** Quién debe actuar en cada estado de una importación (matriz de avisos de W3). */
export type DestinatarioAviso =
  'fabrica' | 'agente_carga' | 'agente_aduanas' | 'transportador' | 'bodega' | 'dueno';
export interface AvisoEstado {
  reporta: string;
  destinatarios: DestinatarioAviso[];
  /** Destinatarios opcionales (no preseleccionados). */
  opcionales: DestinatarioAviso[];
  para: string;
  /** Crea cuenta por pagar de tributos para el dueño (M8). */
  creaTributos?: boolean;
}

export const MATRIZ_AVISOS: Record<EstadoImportacion, AvisoEstado> = {
  cotizado: {
    reporta: 'Dueño',
    destinatarios: [],
    opcionales: ['fabrica'],
    para: 'Pedir precio y tiempo de producción',
  },
  pedido_confirmado: {
    reporta: 'Dueño',
    destinatarios: ['fabrica'],
    opcionales: [],
    para: 'Confirmar cantidades por talla y color y fecha de producción',
  },
  anticipo_pagado: {
    reporta: 'Dueño',
    destinatarios: ['fabrica'],
    opcionales: [],
    para: 'Avisar el giro y pedir inicio de producción',
  },
  en_produccion: {
    reporta: 'Fábrica (vía dueño)',
    destinatarios: [],
    opcionales: ['fabrica'],
    para: 'Pedir fotos de calidad (opcional)',
  },
  listo_despacho: {
    reporta: 'Fábrica (vía dueño)',
    destinatarios: ['dueno', 'agente_carga'],
    opcionales: [],
    para: 'Pagar el saldo; reservar espacio en la consolidación',
  },
  saldo_pagado: {
    reporta: 'Dueño',
    destinatarios: ['fabrica', 'agente_carga'],
    opcionales: [],
    para: 'Liberar la carga y enviar BL y lista de empaque; coordinar la reserva',
  },
  embarcado: {
    reporta: 'Agente de carga',
    destinatarios: ['agente_aduanas', 'bodega'],
    opcionales: [],
    para: 'Preaviso con documentos y fecha estimada de llegada',
  },
  en_transito: { reporta: 'Agente de carga', destinatarios: [], opcionales: [], para: '' },
  en_puerto: {
    reporta: 'Agente de carga o aduanas (portal)',
    destinatarios: ['dueno'],
    opcionales: [],
    para: 'Saber que llegó',
  },
  en_nacionalizacion: {
    reporta: 'Agente de aduanas (portal) o dueño cuando ella le avisa',
    destinatarios: ['transportador', 'bodega', 'agente_aduanas'],
    opcionales: [],
    para: 'Prepararse; girar tributos',
    creaTributos: true,
  },
  nacionalizado: {
    reporta: 'Agente de aduanas (portal)',
    destinatarios: ['transportador', 'bodega', 'dueno'],
    opcionales: [],
    para: 'Mover la mercancía',
  },
  en_transporte_bogota: {
    reporta: 'Transportador (vía dueño)',
    destinatarios: ['bodega'],
    opcionales: [],
    para: 'Hora estimada de llegada',
  },
  recibido_bodega: {
    reporta: 'Bodega',
    destinatarios: ['fabrica'],
    opcionales: [],
    para: 'Cerrar el pedido y repartir: unidades recibidas y defectos a la fábrica, distribución por local',
  },
};

/** Saludo según la hora (usted o tú, igual para ambos). */
export const SALUDOS = { manana: 'buenos días', tarde: 'buenas tardes', noche: 'buenas noches' } as const;
/** Saludo de las fábricas (inglés). */
export const SALUDO_EN = 'Hi';

/** Plantillas en español para la cadena de importación (usted). Clave: `${estado}.${destinatario}`. */
export const PLANTILLAS_IMPORTACION_ES: Record<string, string> = {
  'embarcado.agente_aduanas':
    '{{Nombre}}, {{saludo}}. El pedido {{numero}} de {{marca}} ({{contenido}}, {{carga}}) salió de {{puertoOrigen}} el {{fecha}}. Llega a {{puertoDestino}} hacia el {{llegadaPuerto}}. Le comparto la factura comercial y la lista de empaque. Quedo atento. {{marca}}',
  'embarcado.bodega':
    '{{Nombre}}, {{saludo}}. El pedido {{numero}} ya va en camino desde China. Llegaría a bodega hacia el {{llegadaBodega}}: unas {{unidades}} prendas. {{marca}}',
  'en_nacionalizacion.transportador':
    '{{Nombre}}, {{saludo}}. El pedido {{numero}} de {{marca}} ({{contenido}}, {{carga}}) entró hoy, {{fecha}}, a nacionalización en {{puertoDestino}}. Le confirmo la fecha de recogida apenas tengamos levante; calculamos el {{levanteEstimado}}. Quedo atento. {{marca}}',
  'en_nacionalizacion.bodega':
    '{{Nombre}}, {{saludo}}. Hacia el {{llegadaBodega}} llegan a bodega unas {{unidades}} prendas del {{numero}}{{detalleDestacado}}. Por favor prepare espacio y la recepción. {{marca}}',
  'en_nacionalizacion.agente_aduanas':
    '{{Nombre}}, {{saludo}}. ¿Me confirma cuándo sale el levante del {{numero}} y cuánto hay que girar de tributos? Gracias. {{marca}}',
  'nacionalizado.transportador':
    '{{Nombre}}, {{saludo}}. El {{numero}} ya tiene levante. Por favor recójalo en {{puertoDestino}} y me confirma la fecha de llegada a la bodega de Puente Aranda. {{marca}}',
  'nacionalizado.bodega':
    '{{Nombre}}, {{saludo}}. El {{numero}} ya tiene levante y sale para Bogotá. Por favor haga espacio para unas {{unidades}} prendas; llegarían hacia el {{llegadaBodega}}. {{marca}}',
  'en_transporte_bogota.bodega':
    '{{Nombre}}, {{saludo}}. El camión con el {{numero}} va en camino. Llegada estimada: {{llegadaBodega}}. {{marca}}',
  'listo_despacho.agente_carga':
    '{{Nombre}}, {{saludo}}. El pedido {{numero}} de {{proveedor}} queda listo para despacho el {{fecha}} ({{carga}}). ¿Me ayuda a reservar espacio en la próxima consolidación desde {{puertoOrigen}}? {{marca}}',
  'saldo_pagado.agente_carga':
    '{{Nombre}}, {{saludo}}. Ya pagamos el saldo del {{numero}}. La fábrica libera la carga esta semana; quedo atento a la reserva y al BL. {{marca}}',
};

/** Plantillas en inglés para las fábricas (solo cuando les toca actuar). */
export const PLANTILLAS_FABRICA_EN: Record<string, string> = {
  cotizado:
    'Hi {{nombre}}, please find below our next order for {{proveedor}}. Sizes and colours attached. Could you confirm unit price and production time? Best regards, {{marca}}',
  pedido_confirmado:
    'Hi {{nombre}}, we confirm order {{numero}}: {{unidades}} units, quantities by size and colour attached. Please confirm the production start date. Best regards, {{marca}}',
  anticipo_pagado:
    'Hi {{nombre}}, we have sent the 30% deposit for order {{numero}}. Please start production and keep us posted. Best regards, {{marca}}',
  en_produccion:
    'Hi {{nombre}}, could you share some quality photos of order {{numero}} in production? Thank you. Best regards, {{marca}}',
  saldo_pagado:
    'Hi {{nombre}}, we have paid the balance of order {{numero}}. Please release the cargo and send the BL and packing list. Best regards, {{marca}}',
  recibido_bodega:
    'Hi {{nombre}}, order {{numero}} arrived at our warehouse: {{recibidas}} units received, {{defectuosas}} with defects. Details attached. Best regards, {{marca}}',
};

/** Plantillas para clientes. Variante por tratamiento: 'tu' | 'usted'. */
export const PLANTILLAS_CLIENTE = {
  cumpleanos: {
    tu: '{{Nombre}}, ¡feliz cumpleaños! En {{marca}} te tenemos un detalle: 15 % en tu próxima compra este mes. Te esperamos en {{local}}.',
    usted:
      '{{Nombre}}, feliz cumpleaños. En {{marca}} le tenemos un detalle: 15 % en su próxima compra este mes. Será un gusto atenderlo en {{local}}.',
  },
  cobro: {
    tu: 'Hola, {{Nombre}}. Te recordamos que tu separado {{numero}} en {{marca}} tiene un saldo de {{saldo}} y vence el {{fechaLimite}}. Puedes abonar en {{local}} o por transferencia.',
    usted:
      '{{Nombre}}, {{saludo}}. Le recordamos que su separado {{numero}} en {{marca}} tiene un saldo de {{saldo}} y vence el {{fechaLimite}}. Puede abonar en {{local}} o por transferencia.',
  },
  separado: {
    tu: 'Hola, {{Nombre}}. Tu separado {{numero}} quedó registrado: abonaste {{abonado}} y te quedan {{saldo}} hasta el {{fechaLimite}}.',
    usted:
      '{{Nombre}}, {{saludo}}. Su separado {{numero}} quedó registrado: abonó {{abonado}} y le quedan {{saldo}} hasta el {{fechaLimite}}.',
  },
  seguimiento: {
    tu: 'Hola, {{Nombre}}. ¿Cómo te fue con {{producto}}? Si necesitas un ajuste, en {{local}} te ayudamos.',
    usted:
      '{{Nombre}}, {{saludo}}. ¿Cómo le fue con {{producto}}? Si necesita algún ajuste, en {{local}} con gusto le ayudamos.',
  },
  nueva_coleccion: {
    tu: 'Hola, {{Nombre}}. Llegó la nueva colección a {{marca}}: {{novedad}}. ¿Te separamos algo en tu talla?',
    usted:
      '{{Nombre}}, {{saludo}}. Llegó la nueva colección a {{marca}}: {{novedad}}. ¿Le separamos algo en su talla?',
  },
} as const;

/** Resumen diario al dueño por WhatsApp (escenario de canales). */
export const PLANTILLA_RESUMEN_DUENO =
  'Resumen de hoy en {{marca}}: {{ventas}} en {{numVentas}} ventas. Mejor local: {{mejorLocal}}. Cajas: {{cajas}}.';

import type { DefRegla, IdRegla } from './tipos';

/** Copy de Canales digitales (D5). Español de Colombia; al dueño se le habla de tú. */
export const TEXTOS = {
  etiqueta: (marca: string) => `Vista previa de lo que KippiCore puede construir para ${marca}`,
  encabezado: {
    titulo: 'Canales digitales',
    subtitulo:
      'Lo que KippiCore podría hacer por ti más allá del sistema interno: atender, avisar y vender por WhatsApp, Instagram y la web.',
  },
  pestanas: { resumen: 'Resumen', whatsapp: 'WhatsApp', instagram: 'Instagram', web: 'Página web' },
  whatsapp: {
    titulo: 'Automatización de WhatsApp',
    subtitulo: 'Elige un escenario o escríbele tú: el bot responde con tu inventario real.',
    escenarios: 'Escenarios',
    escribeTu: 'Escribe tú',
    escribeTuDescripcion: 'Pregúntale lo que quieras: disponibilidad, precios, horarios o envíos.',
    cliente: 'Cliente',
  },
  instagram: {
    titulo: 'Automatización de Instagram',
    subtitulo:
      'Respuestas automáticas a "precio?" en comentarios, catálogo por mensaje directo y clientes nuevos en tu CRM.',
    publicacion: 'Publicación',
    comentarios: 'Comentarios',
    mensajes: 'Mensajes directos',
  },
  web: {
    titulo: 'Tienda en línea',
    subtitulo:
      'La tienda web de tu negocio, armada con tu inventario. Compra en ella y la venta aparece en Ventas con canal Web.',
    escritorio: 'Escritorio',
    celular: 'Celular',
    ambos: 'Ambos',
    abrir: 'Abrir la tienda completa',
    avisoMarco:
      'La tienda de abajo es la real: lo que compres aquí descuenta inventario y aparece en Ventas.',
  },
  chat: {
    escribir: 'Escribe un mensaje',
    escribiendo: 'escribiendo…',
    enLinea: 'en línea',
    hoy: 'Hoy',
    enviar: 'Enviar mensaje',
    bloqueado: 'El bot está respondiendo…',
    pausa: (persona: string) => `${persona} tiene la conversación: el bot queda en pausa.`,
    tomo: (persona: string) => `${persona} tomó la conversación`,
    reiniciar: 'Reiniciar',
    reproducir: 'Reproducir',
    repetir: 'Repetir escenario',
    velocidad: 'Velocidad',
    normal: 'Normal',
    rapida: 'Rápida',
    cerrar: 'Escenario completo',
    paso: 'Paso',
    cliente: 'Cliente',
    instagramEscribir: 'Escribe un comentario o un mensaje',
    comentar: 'Agrega un comentario',
  },
  cerebro: {
    titulo: 'El cerebro de la automatización',
    flujo: 'Flujo',
    inventario: 'Consulta al inventario',
    inventarioAyuda: 'Existencias reales de tu inventario, ahora mismo.',
    reglas: 'Reglas de la automatización',
    registro: 'Lo que acaba de hacer',
    sinRegistro: 'Cuando el bot responda, aquí queda lo que decidió y por qué.',
    sinConsulta: 'Cuando alguien pregunte por una prenda, el bot consulta aquí tu inventario por local.',
    activa: 'Activa',
    audiencia: 'Audiencia',
    disparador: 'Se dispara cuando',
    sinExistencias: 'Sin existencias en los locales',
    enCamino: (n: number, fecha: string) =>
      `Llegan ${n} ${n === 1 ? 'unidad' : 'unidades'} hacia el ${fecha}`,
    total: 'Total',
    unidades: (n: number) => `${n} ${n === 1 ? 'unidad' : 'unidades'}`,
  },
  indicadores: {
    titulo: 'Qué lograría en un mes',
    ayuda:
      'Últimos 30 días. Las ventas atribuidas son las reales de ese canal; los mensajes y la respuesta son simulados.',
    mensajes: 'Mensajes enviados',
    respuesta: 'Tasa de respuesta',
    ventas: 'Ventas atribuidas',
    ventasNota: (n: number) => `${n} ${n === 1 ? 'venta' : 'ventas'} por este canal`,
    simulado: 'Simulado',
    real: 'Datos reales',
  },
  resumen: {
    whatsappTitulo: 'WhatsApp',
    whatsappTexto:
      'Un asistente que conoce tu inventario: contesta lo repetitivo (disponibilidad, precios, horarios, envíos), avisa de separados, colecciones y cumpleaños, y te pasa al cliente con una persona para cerrar.',
    instagramTitulo: 'Instagram',
    instagramTexto:
      'Responde "precio?" en tus comentarios, manda el catálogo por mensaje directo y deja a cada persona que escribe como cliente nuevo en tu CRM.',
    webTitulo: 'Página web',
    webTexto:
      'Una tienda armada con tu inventario: portada, catálogo con filtros, ficha con talla y color, bolsa y pago simulado. Cada compra queda en Ventas con canal Web.',
    ver: 'Ver demostración',
    queNoEs:
      'Es una vista previa: nada se envía a WhatsApp ni a Instagram de verdad, y los datos son los de tu demo.',
  },
  efectos: {
    clienteCreado: (nombre: string) => `Cliente creado en el CRM: ${nombre} · origen Instagram`,
    clienteExistente: (nombre: string) => `Ese contacto ya estaba en el CRM: ${nombre}`,
    errorCliente: (mensaje: string) => `No se pudo crear el cliente: ${mensaje}`,
    verFicha: 'Ver ficha',
  },
  errores: {
    titulo: 'No pudimos armar esta vista',
    texto: 'Recarga la página. Si sigue pasando, tus datos de la demo siguen a salvo en este navegador.',
    sinDatosTitulo: 'Todavía no hay inventario para consultar',
    sinDatosTexto: 'Cuando tengas referencias con existencias, el bot las usará para responder.',
  },
} as const;

/** Las reglas que se iluminan en el cerebro. */
export const REGLAS: Record<IdRegla, DefRegla> = {
  saludo: {
    id: 'saludo',
    nombre: 'Saludo',
    cuando: 'El cliente saluda',
    hace: 'Saluda por su nombre y pregunta qué busca',
    canal: 'ambos',
  },
  inventario: {
    id: 'inventario',
    nombre: 'Disponibilidad por talla',
    cuando: 'Preguntan por una prenda, color o talla',
    hace: 'Consulta el inventario y responde por local, con el precio',
    canal: 'ambos',
  },
  precio: {
    id: 'precio',
    nombre: 'Precio',
    cuando: 'Preguntan cuánto cuesta',
    hace: 'Responde el precio de lista con IVA incluido',
    canal: 'ambos',
  },
  catalogo: {
    id: 'catalogo',
    nombre: 'Catálogo',
    cuando: 'Piden ver qué hay',
    hace: 'Envía las novedades de la temporada con precio',
    canal: 'ambos',
  },
  horarios: {
    id: 'horarios',
    nombre: 'Horarios y ubicación',
    cuando: 'Preguntan cuándo abren o dónde quedan',
    hace: 'Responde con el horario y la dirección de cada local',
    canal: 'ambos',
  },
  envios: {
    id: 'envios',
    nombre: 'Envíos',
    cuando: 'Preguntan por domicilios',
    hace: 'Cuenta las condiciones de envío y la tienda web',
    canal: 'ambos',
  },
  separar: {
    id: 'separar',
    nombre: 'Cerrar con una persona',
    cuando: 'El cliente quiere separar',
    hace: 'Pasa la conversación a quien cierra la venta',
    canal: 'ambos',
  },
  persona: {
    id: 'persona',
    nombre: 'Pasar a una persona',
    cuando: 'Piden hablar con alguien',
    hace: 'Entrega el chat a una vendedora',
    canal: 'ambos',
  },
  sin_negociar: {
    id: 'sin_negociar',
    nombre: 'No negociar precios',
    cuando: 'Piden un descuento o rebaja',
    hace: 'No ofrece descuentos: pasa a una persona',
    canal: 'ambos',
  },
  no_entiende: {
    id: 'no_entiende',
    nombre: 'Respuesta amable',
    cuando: 'No entiende el mensaje',
    hace: 'Pide la talla y el color con amabilidad',
    canal: 'ambos',
  },
  despedida: {
    id: 'despedida',
    nombre: 'Despedida',
    cuando: 'El cliente agradece o se despide',
    hace: 'Cierra con amabilidad y deja la puerta abierta',
    canal: 'ambos',
  },
  confirmar_separado: {
    id: 'confirmar_separado',
    nombre: 'Confirmar el separado',
    cuando: 'Se registra un separado en el POS',
    hace: 'Envía abono, saldo y fecha límite',
    canal: 'whatsapp',
  },
  recordar_saldo: {
    id: 'recordar_saldo',
    nombre: 'Recordar el saldo',
    cuando: 'Se acerca el vencimiento del separado',
    hace: 'Recuerda el saldo y dónde pagarlo',
    canal: 'whatsapp',
  },
  nueva_coleccion: {
    id: 'nueva_coleccion',
    nombre: 'Aviso de colección',
    cuando: 'Llega mercancía nueva',
    hace: 'Avisa por segmento, tú o usted según cada cliente',
    canal: 'whatsapp',
  },
  cumpleanos: {
    id: 'cumpleanos',
    nombre: 'Cumpleaños con beneficio',
    cuando: 'Un cliente cumple años',
    hace: 'Saluda con un beneficio en su trato',
    canal: 'whatsapp',
  },
  resumen_dueno: {
    id: 'resumen_dueno',
    nombre: 'Resumen al dueño',
    cuando: 'Todos los días, 9:30 p. m.',
    hace: 'Cuenta las ventas del día y responde por el mes',
    canal: 'whatsapp',
  },
  comentario_precio: {
    id: 'comentario_precio',
    nombre: 'Responder "precio?"',
    cuando: 'Comentan "precio?" en una publicación',
    hace: 'Responde en público y sigue por mensaje directo',
    canal: 'instagram',
  },
  captura_contacto: {
    id: 'captura_contacto',
    nombre: 'Captura de contacto',
    cuando: 'Alguien quiere comprar por mensaje directo',
    hace: 'Pide nombre y celular y crea el cliente en el CRM',
    canal: 'instagram',
  },
};

/** Reglas que se muestran en cada canal. */
export function reglasDelCanal(canal: 'whatsapp' | 'instagram'): DefRegla[] {
  const orden: IdRegla[] =
    canal === 'whatsapp'
      ? [
          'inventario',
          'precio',
          'horarios',
          'envios',
          'separar',
          'sin_negociar',
          'persona',
          'no_entiende',
          'confirmar_separado',
          'recordar_saldo',
          'nueva_coleccion',
          'cumpleanos',
          'resumen_dueno',
        ]
      : [
          'comentario_precio',
          'precio',
          'catalogo',
          'inventario',
          'captura_contacto',
          'sin_negociar',
          'no_entiende',
        ];
  return orden.map((id) => REGLAS[id]);
}

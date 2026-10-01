import type { Categoria, EstadoImportacion, RolContacto, TipoDocumentoImportacion } from '@/dominio/tipos';

/** Copy de la interfaz de Importaciones, portal y Sugerir pedido (B1). Español de Colombia; nada de inglés de software. */

export const VISTAS_IMPORTACIONES = [
  { valor: 'tablero', etiqueta: 'Tablero por estado' },
  { valor: 'lista', etiqueta: 'Lista' },
  { valor: 'ruta', etiqueta: 'Ruta' },
] as const;
export type VistaImportaciones = (typeof VISTAS_IMPORTACIONES)[number]['valor'];

export const TEXTOS_LISTA = {
  titulo: 'Importaciones',
  subtitulo: 'Dónde viene cada pedido a China, cuánto has pagado y cuándo llega a la bodega.',
  vacioTitulo: 'Todavía no hay pedidos con este filtro',
  vacioTexto: 'Cambia el estado o la fábrica, o crea un pedido nuevo para verlo aquí.',
  sinPedidosTitulo: 'Aún no hay pedidos a China',
  sinPedidosTexto: 'Crea el primero o deja que KippiCore te sugiera cuánto pedir según lo que se vende.',
} as const;

export const COLUMNAS_TABLERO_AYUDA: Record<string, string> = {
  fabrica: 'Cotización, producción y pagos a la fábrica',
  viaje: 'Embarcado, en tránsito y en puerto',
  aduana: 'Nacionalización y levante',
  entrega: 'Camino a la bodega de Bogotá',
  bodega: 'Recibidos en los últimos 30 días',
};

/** Rótulos de los tipos de documento de una importación. */
export const ETIQUETAS_DOCUMENTO: Record<TipoDocumentoImportacion, string> = {
  proforma: 'Proforma',
  factura_comercial: 'Factura comercial',
  lista_empaque: 'Lista de empaque',
  bl: 'Conocimiento de embarque (BL)',
  guia_aerea: 'Guía aérea',
  declaracion_importacion: 'Declaración de importación',
  declaracion_cambio: 'Declaración de cambio',
  declaracion_valor: 'Declaración andina del valor',
};

export const ETIQUETAS_ESTADO_DOCUMENTO = { pendiente: 'Pendiente', recibido: 'Recibido', aprobado: 'Aprobado' } as const;

export const ETIQUETAS_ROL_CONTACTO: Record<RolContacto, string> = {
  proveedor: 'Fábrica',
  agente_carga: 'Agente de carga',
  agente_aduanas: 'Agente de aduanas',
  transportador: 'Transportador',
  otro: 'Otro',
};

export const ETIQUETAS_CANAL = { whatsapp: 'WhatsApp', correo: 'Correo', wechat: 'WeChat' } as const;
export const ETIQUETAS_CARGA = {
  consolidada: 'Carga consolidada',
  contenedor: 'Contenedor completo',
  aerea: 'Carga aérea',
} as const;

/** Plural de la categoría para frases como "Margen promedio de camisas". */
export const CATEGORIA_EN_PLURAL: Record<Categoria, string> = {
  camisas: 'camisas',
  blazers: 'blazers',
  pantalones: 'pantalones',
  polos: 'polos',
  abrigos_chaquetas: 'abrigos y chaquetas',
  punto: 'prendas de punto',
  trajes: 'trajes',
  calzado: 'calzado',
  accesorios: 'accesorios',
};

export const TEXTOS_COSTO = {
  titulo: 'Lo que de verdad te cuesta cada prenda',
  metodo: 'Costo de reposición: última importación aplicada',
  valorEjemplo: 'Valor de ejemplo · se valida con tu agente de aduanas',
  simulador: '¿Y si el dólar sube?',
  simuladorAyuda: 'Mueve la tasa y mira cómo cambian el costo, el margen y el precio que conviene.',
  ivaDescontable: 'IVA descontable (no suma al costo)',
  ivaDescontableAyuda: 'Si tu contador lo descuenta, el IVA de importación se gira pero no encarece la prenda.',
  prorrateo: 'Cómo se reparte entre las prendas',
  prorrateoValor: 'Por valor de fábrica',
  prorrateoCantidad: 'Por cantidad de prendas',
  aplicar: 'Aplicar al inventario',
  aplicarDescripcion: 'El costo de estas referencias queda como el último costo de reposición y alimenta márgenes y reportes.',
} as const;

/** Qué se le pide a la fábrica en cada etapa de "Sugerir pedido". */
export const TEXTOS_SUGERIR = {
  titulo: 'Sugerir pedido',
  subtitulo: 'Cantidades por talla y color según lo que rota, lo que tienes y lo que ya viene en camino.',
  coberturaAyuda: 'Cuántos días de venta quieres cubrir con este pedido, contados desde que llegue a la bodega.',
  borradorTitulo: 'Borrador en inglés para la fábrica',
  borradorNota: 'No se envía nada: lo copias y lo pegas en WeChat o en el correo.',
} as const;

/** Mensaje de la fábrica en inglés: cierre del borrador del pedido sugerido. */
export const CIERRE_BORRADOR_EN = 'Please confirm unit price and production time. Best regards,';

export const ESTADOS_QUE_AVISAN_AL_DUENO: readonly EstadoImportacion[] = ['listo_despacho', 'en_puerto', 'nacionalizado'];

export const TEXTOS_PORTAL = {
  tituloVacio: 'No encontramos ese pedido',
  textoVacio: 'Revisa que el enlace esté completo. Si el problema sigue, escríbele a quien te lo envió.',
  soloLectura: 'Esto es lo que ve la agencia con el enlace: el estado del pedido en tiempo real.',
  formularioTitulo: 'Actualizar el estado',
  formularioAyuda: 'Al enviar, el importador recibe el aviso al instante y el pedido avanza en su sistema.',
  enFabricaTitulo: 'Todavía no hay novedades para reportar',
  enFabricaTexto: 'El pedido sigue en fábrica. Cuando salga el barco podrá actualizarlo desde aquí.',
  sinMasTitulo: 'No quedan novedades de aduana por reportar',
  sinMasTexto: 'El pedido ya pasó la etapa de aduana. Lo que sigue lo reporta el transportador y la bodega.',
  enviado: 'Gracias, la actualización quedó registrada',
} as const;

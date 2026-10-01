/**
 * Catálogo de escenarios de WhatsApp e Instagram (PRD 7.14, W9). DUEÑO: paquete D5.
 * Aquí viven los identificadores (los usa `?escenario=` de la ruta de WhatsApp), los títulos y la descripción de
 * cada uno. Los guiones se arman en `src/modulos/canales/escenarios.ts` con los datos reales de la demo
 * (inventario, clientes, ventas del día): este archivo no lleva cifras.
 */
export type IdEscenarioCanal =
  | 'consulta-talla'
  | 'separado-saldo'
  | 'nueva-coleccion'
  | 'cumpleanos'
  | 'resumen-dueno'
  | 'paso-persona'
  | 'precio-comentario'
  | 'catalogo-dm';

export interface EscenarioCanal {
  id: IdEscenarioCanal;
  canal: 'whatsapp' | 'instagram';
  titulo: string;
  /** Una frase para la tarjeta del selector. */
  descripcion: string;
  /** Nombre del ícono de lucide que lo acompaña. */
  icono:
    | 'Shirt'
    | 'CalendarClock'
    | 'Megaphone'
    | 'Cake'
    | 'ChartNoAxesCombined'
    | 'UserRoundCheck'
    | 'MessageCircle'
    | 'LayoutGrid';
}

export const ESCENARIOS_CANALES: EscenarioCanal[] = [
  {
    id: 'consulta-talla',
    canal: 'whatsapp',
    titulo: 'Consulta de talla',
    descripcion:
      'Un cliente pregunta si hay una camisa en su talla y el bot responde con el inventario real.',
    icono: 'Shirt',
  },
  {
    id: 'separado-saldo',
    canal: 'whatsapp',
    titulo: 'Separado y saldo',
    descripcion: 'Confirma el separado y, días antes del vencimiento, recuerda el saldo.',
    icono: 'CalendarClock',
  },
  {
    id: 'nueva-coleccion',
    canal: 'whatsapp',
    titulo: 'Nueva colección',
    descripcion: 'Avisa a los clientes VIP y frecuentes lo que acaba de llegar, en el trato de cada uno.',
    icono: 'Megaphone',
  },
  {
    id: 'cumpleanos',
    canal: 'whatsapp',
    titulo: 'Cumpleaños',
    descripcion: 'Saluda con un beneficio de cumpleaños, en el tratamiento del cliente.',
    icono: 'Cake',
  },
  {
    id: 'resumen-dueno',
    canal: 'whatsapp',
    titulo: 'Resumen al dueño',
    descripcion: 'Cómo cerró el día, enviado al dueño a las 9:30 p. m., con la cifra real.',
    icono: 'ChartNoAxesCombined',
  },
  {
    id: 'paso-persona',
    canal: 'whatsapp',
    titulo: 'Paso a una persona',
    descripcion: 'El bot no negocia precios: le habla de usted a un VIP y lo pasa con Valentina.',
    icono: 'UserRoundCheck',
  },
  {
    id: 'precio-comentario',
    canal: 'instagram',
    titulo: '"Precio?" en comentarios',
    descripcion:
      'Responde en público, sigue por mensaje directo con el catálogo y crea al cliente en el CRM.',
    icono: 'MessageCircle',
  },
  {
    id: 'catalogo-dm',
    canal: 'instagram',
    titulo: 'Catálogo por mensaje directo',
    descripcion: 'Alguien escribe por mensaje directo, recibe el catálogo y deja su contacto.',
    icono: 'LayoutGrid',
  },
];

export const ESCENARIOS_WHATSAPP = ESCENARIOS_CANALES.filter((e) => e.canal === 'whatsapp');
export const ESCENARIOS_INSTAGRAM = ESCENARIOS_CANALES.filter((e) => e.canal === 'instagram');

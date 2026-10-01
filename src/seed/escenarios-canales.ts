/**
 * Guiones de WhatsApp e Instagram (PLAN 4.3 7.14, W9). DUEÑO: paquete D5, que escribe los guiones completos.
 * F2-A1 deja el catálogo de escenarios con sus identificadores (los usa `?escenario=` de rutas.ts).
 */
export interface EscenarioCanal {
  id: string;
  canal: 'whatsapp' | 'instagram';
  titulo: string;
  descripcion: string;
}

export const ESCENARIOS_CANALES: EscenarioCanal[] = [
  {
    id: 'consulta-talla',
    canal: 'whatsapp',
    titulo: 'Consulta de talla',
    descripcion:
      'Un cliente pregunta si hay una camisa en su talla y el bot responde con el inventario real.',
  },
  {
    id: 'separado-saldo',
    canal: 'whatsapp',
    titulo: 'Separado y saldo',
    descripcion: 'Un cliente pregunta cuánto le falta de su separado.',
  },
  {
    id: 'nueva-coleccion',
    canal: 'whatsapp',
    titulo: 'Nueva colección',
    descripcion: 'Mensaje a clientes frecuentes con la colección que acaba de llegar.',
  },
  {
    id: 'cumpleanos',
    canal: 'whatsapp',
    titulo: 'Cumpleaños',
    descripcion: 'Saludo con beneficio de cumpleaños, en el tratamiento del cliente.',
  },
  {
    id: 'resumen-dueno',
    canal: 'whatsapp',
    titulo: 'Resumen al dueño',
    descripcion: 'Cómo cerró el día, enviado al dueño a las 9:30 p. m.',
  },
  {
    id: 'precio-comentario',
    canal: 'instagram',
    titulo: '"Precio?" en comentarios',
    descripcion: 'Respuesta por mensaje directo con el catálogo y creación del cliente.',
  },
];

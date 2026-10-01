import type { Empresa } from '@/dominio/tipos';

/**
 * Marca del cliente de la demo (PLAN 5.4). HALDEN es una marca de ejemplo: el cliente puede escribir
 * el nombre de su negocio (store `sesion`, 2.2.1). Cambiar de cliente = cambiar este archivo.
 */
export const EMPRESA: Empresa = {
  nombre: 'HALDEN',
  descriptor: 'Moda masculina · Bogotá',
  razonSocial: 'Halden Moda Masculina S.A.S.',
  // NIT ficticio con dígito de verificación válido (módulo 11 de la DIAN).
  nit: '901.234.567-7',
  direccion: 'Calle 93B # 11A-48',
  ciudad: 'Bogotá',
  telefono: '601 745 2093',
  // Dominio reservado para ejemplos: nunca le llega un correo a nadie.
  correo: 'hola@halden.example',
  colores: {
    acento: '#A67C52',
    acentoTexto: '#7A5634',
    acentoSuave: '#F3ECE4',
    tiendaHero: '#1F2A44',
  },
  duenoNombre: 'Juan Camilo Ospina',
  responsableIva: true,
};

export const MARCA = {
  /** Texto bajo el wordmark en la entrada y en Configuración › Empresa. */
  avisoEjemplo: 'HALDEN es una marca de ejemplo.',
  /** Prefijo de referencias y SKU (7.13): HL-CAM-0142. */
  prefijoReferencia: 'HL',
  /** EAN-13: '20' (circulación interna GS1) + código de empresa + consecutivo de variante + control. */
  prefijoEan: '20',
  codigoEmpresaEan: '481',
  /** Prefijos de documentos simulados. */
  prefijoFactura: 'HAL-FE',
  prefijoDocumentoPos: 'HAL-POS',
  prefijoNotaCredito: 'HAL-NC',
  /** Firma de KippiCore (PRD 5.3). */
  firmaKippicore: 'Desarrollado por KippiCore',
  pieReportes: 'Generado con KippiCore CRM',
  sufijoTitulo: 'KippiCore CRM',
  /**
   * "Hablar con KippiCore": número de WhatsApp de Miguel con indicativo (solo dígitos, p. ej. '573001234567').
   * Si es null, la opción no aparece (2.6).
   */
  hablarConKippicore: {
    whatsapp: null as string | null,
    texto: 'Hola, vi la demo de KippiCore CRM y quiero saber cómo sería con mis datos.',
  },
} as const;

import type { EstadoFactura } from '@/dominio/tipos';
import { TEXTOS_FIJOS } from '@/config/textos/notas';

/** Copy de Facturación (D3). Español de Colombia; todo es una simulación y se dice sin ambigüedad. */

export const MARCA_AGUA = TEXTOS_FIJOS.marcaDeAgua;

export const TEXTOS = {
  lista: {
    titulo: 'Facturación',
    subtitulo:
      'Cada venta sale como factura electrónica o documento equivalente POS, sin digitar nada dos veces. Todo es una simulación: nada se envía a la DIAN.',
    emitir: 'Emitir documento',
    buscar: 'Buscar por número, cliente o venta',
    vacioTitulo: 'Ningún documento con estos filtros',
    vacioTexto: 'Cambia el periodo, el tipo o el estado, o emite un documento nuevo desde una venta.',
    limpiar: 'Limpiar filtros',
    resolucionesTitulo: 'Resoluciones de facturación (ficticias)',
    resolucionesNota:
      'Cada tipo de documento tiene su resolución, su prefijo y su rango. Estas son inventadas para la demostración.',
  },
  detalle: {
    noExisteTitulo: 'No encontramos ese documento',
    noExisteTexto: 'Pudo haberse restaurado la demostración. Vuelve a la lista de documentos para elegir otro.',
    ajenoTitulo: 'Este documento no es de una de tus ventas',
    ajenoTexto:
      'Como vendedor solo ves los documentos de las ventas que hiciste tú. Si necesitas este, pídeselo al dueño.',
    volver: 'Ir a Facturación',
    recorridoTitulo: 'Recorrido ante la DIAN',
    recorridoNota: 'Simulación: ningún dato sale de este navegador.',
    avisoPie: 'Representación gráfica de demostración. No tiene validez fiscal ni fue transmitida a la DIAN.',
    qrNota: 'El código QR no apunta a ninguna página de la DIAN.',
  },
  emitirDialogo: {
    eyebrow: 'Facturación electrónica',
    titulo: 'Emitir un documento desde una venta',
    descripcion:
      'Elige la venta que aún no tiene documento y cuál sale. Los datos salen de la venta: no se digita nada dos veces.',
    ayudaVentas: 'Los separados se facturan cuando se entregan; las anuladas no se pueden facturar.',
    sinVentas: 'No hay ventas sin documento con esa búsqueda.',
  },
  notaDialogo: {
    eyebrow: 'Facturación electrónica',
    titulo: 'Emitir nota crédito',
    descripcion:
      'Una nota crédito reduce lo facturado: nace de una devolución o de un ajuste por el saldo del documento. No se puede deshacer; si te equivocas, se corrige con otro documento.',
  },
} as const;

export const ESTADO_PASO: Record<EstadoFactura, { titulo: string; detalle: string }> = {
  generada: { titulo: 'Generada', detalle: 'El sistema armó el documento con los datos de la venta.' },
  enviada: { titulo: 'Enviada a la DIAN (simulación)', detalle: 'Se transmitió al validador de demostración.' },
  aceptada: { titulo: 'Aceptada', detalle: 'El validador de demostración la dio por buena.' },
};

export const CLASES_FILTRO = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'factura_electronica', etiqueta: 'Facturas' },
  { valor: 'documento_equivalente_pos', etiqueta: 'Documentos POS' },
  { valor: 'notas', etiqueta: 'Notas crédito' },
] as const;

export const ESTADOS_FILTRO: { valor: EstadoFactura; etiqueta: string }[] = [
  { valor: 'generada', etiqueta: 'Generada' },
  { valor: 'enviada', etiqueta: 'Enviada a la DIAN (simulación)' },
  { valor: 'aceptada', etiqueta: 'Aceptada' },
];

export const NOMBRE_CLASE = {
  factura: 'Factura electrónica',
  pos: 'Documento POS electrónico',
  nota: 'Nota crédito',
} as const;

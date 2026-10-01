import type { Canal, MedioPago } from '@/dominio/tipos';
import type { EstadoVenta } from '@/dominio/reglas/ventas';
import { MEDIOS_PAGO } from '@/config/negocio';

/** Copy de la interfaz de Ventas (A3). Español de Colombia; nada de inglés de software. */

export const CANALES: Record<Canal, string> = {
  local: 'En el local',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  web: 'Tienda web',
};

export const CANALES_CORTOS: Record<Canal, string> = {
  local: 'Local',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  web: 'Web',
};

export const etiquetaMedio = (m: MedioPago): string => MEDIOS_PAGO[m].etiqueta;
export const etiquetaMedioCorta = (m: MedioPago): string => MEDIOS_PAGO[m].corta;

export const ESTADOS_FILTRO: { valor: EstadoVenta; etiqueta: string }[] = [
  { valor: 'pagada', etiqueta: 'Pagada' },
  { valor: 'separado', etiqueta: 'Separado' },
  { valor: 'credito', etiqueta: 'Crédito' },
  { valor: 'devuelta_parcial', etiqueta: 'Devuelta en parte' },
  { valor: 'devuelta', etiqueta: 'Devuelta' },
  { valor: 'anulada', etiqueta: 'Anulada' },
];

export const TEXTOS = {
  lista: {
    titulo: 'Ventas',
    subtitulo: 'Todo lo que han vendido los tres locales, con su detalle, sus cambios y sus devoluciones.',
    subtituloVendedor:
      'Tus ventas, con su detalle. Si algo no cuadra, pide la anulación y el dueño la revisa.',
    buscar: 'Buscar venta, cliente o vendedor',
    vacioTitulo: 'Ninguna venta con estos filtros',
    vacioTexto:
      'Prueba con otro rango de fechas o quita algún filtro. Las ventas que ya registraste siguen ahí.',
    limpiar: 'Limpiar filtros',
    notaTotales:
      'Los totales no cuentan las ventas anuladas, y cada devolución resta en la fecha en que se hizo.',
  },
  totales: {
    vendido: 'Vendido',
    devoluciones: 'Devoluciones',
    netas: 'Ventas netas',
    unidades: 'Unidades netas',
    ticket: 'Ticket promedio',
    descuentos: 'Descuentos',
  },
  detalle: {
    noExisteTitulo: 'No encontramos esa venta',
    noExisteTexto:
      'Pudo haberse restaurado la demostración o el enlace está incompleto. Vuelve a la lista de ventas.',
    volver: 'Volver a ventas',
    gracias: 'Gracias por tu compra',
  },
  anular: {
    pregunta: (numero: string) => `¿Anular la venta ${numero}?`,
    accion: 'Anular venta',
  },
  devolucion: {
    titulo: 'Cambio o devolución',
    plazoVencido: (dias: number, max: number) =>
      `Pasaron ${dias} días desde la venta y el plazo de devolución es de ${max}. El sistema no deja registrarla fuera del plazo.`,
    separadoActivo:
      'Un separado activo no se devuelve: se cancela, y los abonos se reembolsan o quedan como saldo a favor.',
    anulada: 'Esta venta está anulada: ya no admite devoluciones.',
    sinDisponibles: 'Todas las prendas de esta venta ya se devolvieron.',
  },
} as const;

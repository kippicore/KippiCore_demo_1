import type { Dimension, Medida } from '@/selectores';

/** Copy de la interfaz de Análisis (D2). Todo en español de Colombia; ninguna cifra se escribe a mano aquí. */

export const TXT = {
  titulo: 'Análisis',
  migaInicio: 'Inicio',
  subtitulo: 'Qué pasa en tu negocio, contado en palabras sencillas y sin fórmulas.',
  pestanas: {
    resumen: 'Resumen',
    productos: 'Productos',
    clientes: 'Clientes',
    locales: 'Locales y vendedores',
    tabla: 'Tabla dinámica',
  },
  hallazgos: {
    titulo: 'Lo que encontramos en tus ventas',
    nota: 'Estas frases las escribe el sistema leyendo tus ventas; cambian cuando cambian tus datos.',
    vacioTitulo: 'Todavía no hay suficiente historia para sacar conclusiones',
    vacioTexto: 'Cuando haya algunas semanas de ventas, aquí aparecerán de 3 a 5 frases con lo más importante que pasa en tu negocio.',
    verMas: 'Ver el detalle',
  },
  proyeccion: {
    eyebrow: 'Cierre del mes',
    pronto: 'Todavía es muy pronto para proyectar',
    prontoTexto: 'Con el primer día completo del mes calculamos tu ritmo y te decimos cuánto cerrarías.',
    comoSeCalcula: (dias: number, diasMes: number) =>
      `Calculado con el promedio diario de los ${String(dias)} días ya cerrados (sin contar hoy), con IVA y antes de devoluciones, extendido a los ${String(diasMes)} del mes. Por eso no es la cifra de "Ventas del mes" de Inicio, que es neta de devoluciones e incluye hoy.`,
  },
  mes: {
    titulo: 'Ventas por mes, con el año anterior',
    serieActual: 'Este año',
    serieAnterior: 'Año anterior',
  },
  calor: {
    titulo: 'Qué días y a qué horas vendes más',
    subtitulo: 'Últimas 12 semanas. Entre más oscuro, más vendes en esa hora.',
  },
  semana: {
    titulo: 'Ventas por semana del año',
  },
  explorar: {
    titulo: 'Sigue explorando',
    productos: { titulo: 'Productos, tallas y colores', texto: 'Qué se vende más y menos, qué talla se agota y qué mercancía está dormida.' },
    clientes: { titulo: 'Clientes', texto: 'Quiénes compran, cuántos vuelven y cómo te pagan.' },
    locales: { titulo: 'Locales y vendedores', texto: 'Cómo le va a cada local y a cada persona del equipo.' },
    tabla: { titulo: 'Tabla dinámica', texto: 'Cruza lo que quieras, al instante, y llévatelo a Excel.' },
  },
} as const;

export const PERIODOS = [
  { id: '30d', etiqueta: '30 días', dias: 30 },
  { id: '90d', etiqueta: '90 días', dias: 90 },
  { id: '6m', etiqueta: '6 meses', dias: 180 },
  { id: '12m', etiqueta: '12 meses', dias: 365 },
] as const;
export type IdPeriodo = (typeof PERIODOS)[number]['id'];

export const NOMBRES_MEDIO: Record<string, string> = {
  efectivo: 'Efectivo',
  datafono: 'Datáfono',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  transferencia: 'Transferencia o llave Bre-B',
  qr_bre_b: 'QR Bre-B',
  bono_regalo: 'Bono de regalo',
  credito_financiera: 'Crédito con financiera aliada',
  pasarela_web: 'Pasarela web',
  saldo_a_favor: 'Saldo a favor',
  separado: 'Separado',
};

/** Medios de pago digitales (P9): no pagan comisión de datáfono. */
export const MEDIOS_DIGITALES = ['nequi', 'daviplata', 'transferencia', 'qr_bre_b'] as const;

export const NOMBRES_CANAL: Record<string, string> = { local: 'En el local', whatsapp: 'WhatsApp', instagram: 'Instagram', web: 'Tienda web' };

// ---------------------------------------------------------------------------------------------------------
// Tabla dinámica
// ---------------------------------------------------------------------------------------------------------
export const GRUPOS_DIMENSIONES: { grupo: string; dimensiones: Dimension[] }[] = [
  { grupo: 'Cuándo', dimensiones: ['mes', 'semana', 'fecha', 'diaSemana', 'hora'] },
  { grupo: 'Dónde y quién', dimensiones: ['local', 'vendedor', 'canal'] },
  { grupo: 'Qué se vende', dimensiones: ['categoria', 'linea', 'producto', 'talla', 'color'] },
  { grupo: 'Quién compra y cómo paga', dimensiones: ['segmento', 'medioPago'] },
];

export const DESCRIPCION_MEDIDA: Record<Medida, string> = {
  ventas: 'Lo que entró por las ventas, IVA incluido.',
  ventasSinIva: 'Lo que vendiste sin contar el IVA.',
  unidades: 'Cuántas prendas se vendieron.',
  numVentas: 'Cuántas ventas (recibos) hubo.',
  ticket: 'Lo que vale en promedio cada venta.',
  margen: 'Lo que te queda después del costo de la mercancía, en pesos.',
  margenPct: 'Lo que te queda de cada peso vendido (sin IVA).',
};

export interface EjemploPivote {
  id: string;
  titulo: string;
  texto: string;
  filas: Dimension[];
  columnas: Dimension[];
  medida: Medida;
}

export const EJEMPLOS_PIVOTE: EjemploPivote[] = [
  { id: 'mes-local', titulo: 'Ventas por mes y por local', texto: 'Qué local crece y cuál se queda.', filas: ['mes'], columnas: ['local'], medida: 'ventas' },
  { id: 'vendedor-local', titulo: 'Ticket de cada vendedor', texto: 'Quién vende más caro, local por local.', filas: ['vendedor'], columnas: ['local'], medida: 'ticket' },
  { id: 'categoria-talla', titulo: 'Unidades por categoría y talla', texto: 'Qué tallas pedir de cada prenda.', filas: ['categoria'], columnas: ['talla'], medida: 'unidades' },
  { id: 'dia-hora', titulo: 'Ventas por día y hora', texto: 'Cuándo reforzar el turno.', filas: ['diaSemana'], columnas: ['hora'], medida: 'ventas' },
  { id: 'categoria-margen', titulo: 'Margen por categoría y local', texto: 'Dónde ganas más por cada peso vendido.', filas: ['categoria'], columnas: ['local'], medida: 'margenPct' },
  { id: 'pago-mes', titulo: 'Cómo te pagan, mes a mes', texto: 'El avance de los pagos digitales.', filas: ['mes'], columnas: ['medioPago'], medida: 'ventas' },
];

export const PERIODOS_PIVOTE = [
  { id: 'mes', etiqueta: 'Este mes', meses: 1 },
  { id: '3m', etiqueta: '3 meses', meses: 3 },
  { id: '12m', etiqueta: '12 meses', meses: 12 },
  { id: 'todo', etiqueta: 'Todo', meses: 0 },
] as const;
export type IdPeriodoPivote = (typeof PERIODOS_PIVOTE)[number]['id'];

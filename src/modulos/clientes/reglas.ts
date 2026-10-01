import type { Categoria, Cliente, COP, FechaHoraISO, FechaISO, ParametrosSegmentacion } from '@/dominio/tipos';
import type { Segmento } from '@/dominio/reglas/segmentacion';
import { diferenciaDias } from '@/dominio/reglas/fechas';
import { rellenarPlantilla } from '@/dominio/reglas/texto';
import { PLANTILLAS_CLIENTE, SALUDOS } from '@/config/textos/mensajes';
import { dinero, MESES, plural } from '@/lib/formato';

/**
 * Reglas propias de la pantalla de clientes (A4): cómo se EXPLICA un segmento en lenguaje sencillo, cómo se
 * combinan las tallas derivadas con las declaradas, cómo se arma cada mensaje en el trato (tú/usted) del cliente
 * y las cuentas de los cumpleaños. El segmento en sí lo decide el dominio (`segmentoCliente`, 6.20.8): aquí solo
 * se cuenta POR QUÉ quedó así, con las mismas cifras que usó.
 */

// ---------------------------------------------------------------------------------------------------------
// Explicación de los segmentos
// ---------------------------------------------------------------------------------------------------------

/** Un trozo de frase: texto o una cifra en pesos (se pinta con `<Dinero>`, que respeta la moneda activa). */
export type Parte = string | { dinero: COP; corta?: boolean };

export const SEGMENTOS_ORDEN: readonly Segmento[] = ['vip', 'frecuente', 'ocasional', 'en_riesgo', 'nuevo'];

export interface MetricasParaExplicar {
  segmento: Segmento;
  /** Fecha de alta del cliente. */
  registro: FechaISO;
  /** Compras reconocidas del cliente (incluida la de hoy). */
  compras: number;
  primeraCompra: FechaISO | null;
  ultimaCompra: FechaISO | null;
  /** Última compra ANTES de hoy (la que usa el segmento). */
  ultimaAntesDeHoy: FechaISO | null;
  valor12m: COP;
  compras12m: number;
}

export interface Explicacion {
  segmento: Segmento;
  titulo: string;
  /** La frase completa de la ficha. */
  porQue: Parte[];
  /** La versión breve de la tabla. */
  corta: Parte[];
  /** Cuánto le falta para el siguiente nivel (null si no aplica). */
  progreso: { texto: Parte[]; valor: number } | null;
  /** Qué conviene hacer con este cliente. */
  sugerencia: string;
}

/** "hace 12 días" · "hoy" · "ayer". */
export function haceDias(dias: number): string {
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${plural(dias, 'día')}`;
}

/** La frase corta de cada segmento para los chips de la lista (con los umbrales vigentes). */
export function descripcionSegmento(segmento: Segmento, p: ParametrosSegmentacion): Parte[] {
  switch (segmento) {
    case 'vip':
      return ['Compra ', { dinero: p.vipValor12m, corta: true }, ' o más al año.'];
    case 'frecuente':
      return [`${p.frecuenteCompras12m} o más compras al año.`];
    case 'ocasional':
      return ['Compra de vez en cuando.'];
    case 'en_riesgo':
      return [`Lleva más de ${p.diasEnRiesgo} días sin volver.`];
    case 'nuevo':
      return [`Llegó en los últimos ${p.diasNuevo} días.`];
  }
}

export function explicarSegmento(m: MetricasParaExplicar, p: ParametrosSegmentacion, hoy: FechaISO): Explicacion {
  const primeraAntes = m.primeraCompra && m.primeraCompra < hoy ? m.primeraCompra : null;
  switch (m.segmento) {
    case 'vip':
      return {
        segmento: 'vip',
        titulo: 'Cliente VIP',
        porQue: ['Compró ', { dinero: m.valor12m }, ' en los últimos 12 meses. Desde ', { dinero: p.vipValor12m }, ' al año lo tratamos como VIP.'],
        corta: [{ dinero: m.valor12m, corta: true }, ' en 12 meses'],
        progreso: null,
        sugerencia: 'Dale prioridad: avísale primero de lo nuevo, atiéndelo con su vendedor de siempre y salúdalo en su cumpleaños.',
      };
    case 'frecuente': {
      const falta = Math.max(0, p.vipValor12m - m.valor12m);
      return {
        segmento: 'frecuente',
        titulo: 'Cliente frecuente',
        porQue: [`Hizo ${plural(m.compras12m, 'compra')} en los últimos 12 meses. Desde ${p.frecuenteCompras12m} compras al año lo consideramos frecuente.`],
        corta: [`${plural(m.compras12m, 'compra')} en 12 meses`],
        progreso:
          falta > 0
            ? { texto: ['Le faltan ', { dinero: falta }, ' en compras para llegar a VIP.'], valor: m.valor12m / p.vipValor12m }
            : { texto: ['Con la compra de hoy ya pasa de ', { dinero: p.vipValor12m }, ': mañana será VIP.'], valor: 1 },
        sugerencia: 'Mantén el ritmo: avísale cuando llegue algo en su talla y de los colores que suele comprar.',
      };
    }
    case 'ocasional': {
      if (m.compras === 0) {
        const dias = diferenciaDias(m.registro, hoy);
        return {
          segmento: 'ocasional',
          titulo: 'Cliente ocasional',
          porQue: [`Está registrado ${haceDias(dias)} y todavía no ha comprado.`],
          corta: ['Sin compras todavía'],
          progreso: null,
          sugerencia: 'Invítalo a conocer la colección en su local: el primer mensaje es el que más cuesta.',
        };
      }
      const alcanzaFrecuente = m.compras12m >= p.frecuenteCompras12m;
      const faltan = p.frecuenteCompras12m - m.compras12m;
      return {
        segmento: 'ocasional',
        titulo: 'Cliente ocasional',
        porQue: [
          `Compró ${plural(m.compras12m, 'vez', 'veces')} en los últimos 12 meses: todavía no llega a ${p.frecuenteCompras12m} compras ni a `,
          { dinero: p.vipValor12m },
          ' al año.',
        ],
        corta: [`${plural(m.compras12m, 'compra')} en 12 meses`],
        progreso: alcanzaFrecuente
          ? { texto: [`Con la compra de hoy ya suma ${p.frecuenteCompras12m} compras: mañana será frecuente.`], valor: 1 }
          : { texto: [`Con ${plural(faltan, 'compra')} más en 12 meses pasa a frecuente.`], valor: m.compras12m / p.frecuenteCompras12m },
        sugerencia: 'Un mensaje con una novedad en su talla es el empujón que suele convertir a un ocasional en frecuente.',
      };
    }
    case 'en_riesgo': {
      const ultima = m.ultimaAntesDeHoy ?? m.ultimaCompra ?? hoy;
      const dias = diferenciaDias(ultima, hoy);
      if (m.ultimaCompra === hoy)
        return {
          segmento: 'en_riesgo',
          titulo: 'Cliente en riesgo',
          porQue: [`Volvió hoy después de ${plural(dias, 'día')} sin comprar. Mañana deja de estar en riesgo.`],
          corta: [`Volvió hoy tras ${plural(dias, 'día')}`],
          progreso: null,
          sugerencia: 'Agradécele que volvió: es el mejor momento para pedirle su opinión y recordarle su talla.',
        };
      return {
        segmento: 'en_riesgo',
        titulo: 'Cliente en riesgo',
        porQue: [`No compra ${haceDias(dias)}. Pasados ${p.diasEnRiesgo} días sin volver lo marcamos en riesgo.`],
        corta: [`${plural(dias, 'día')} sin comprar`],
        progreso: null,
        sugerencia: 'Escríbele esta semana: un mensaje a tiempo, con algo nuevo en su talla, es la forma más simple de que vuelva.',
      };
    }
    case 'nuevo': {
      const desde = primeraAntes ?? m.registro;
      const dias = Math.max(0, diferenciaDias(desde, hoy));
      const cual = primeraAntes ? 'Hizo su primera compra' : 'Se registró';
      return {
        segmento: 'nuevo',
        titulo: 'Cliente nuevo',
        porQue: [`${cual} ${haceDias(dias)}. Durante sus primeros ${p.diasNuevo} días lo tratamos como nuevo, sin importar cuánto compre.`],
        corta: [primeraAntes ? `Primera compra ${haceDias(dias)}` : `Llegó ${haceDias(dias)}`],
        progreso: {
          texto: [`Le quedan ${plural(Math.max(0, p.diasNuevo - dias), 'día')} como cliente nuevo; después se clasifica según lo que compre.`],
          valor: dias / p.diasNuevo,
        },
        sugerencia: 'Dale las gracias por venir y pregúntale cómo le fue con su compra: la primera impresión se recuerda.',
      };
    }
  }
}

// ---------------------------------------------------------------------------------------------------------
// Tallas
// ---------------------------------------------------------------------------------------------------------
export type ClaveTalla = 'camisa' | 'pantalon' | 'blazer' | 'calzado';

export const TIPOS_TALLA: readonly { clave: ClaveTalla; etiqueta: string; categoria: Categoria }[] = [
  { clave: 'camisa', etiqueta: 'Camisa', categoria: 'camisas' },
  { clave: 'pantalon', etiqueta: 'Pantalón', categoria: 'pantalones' },
  { clave: 'blazer', etiqueta: 'Blazer', categoria: 'blazers' },
  { clave: 'calzado', etiqueta: 'Calzado', categoria: 'calzado' },
];

export interface FilaTalla {
  clave: ClaveTalla;
  etiqueta: string;
  /** La que más ha comprado (moda de sus compras). */
  derivada: string | null;
  /** La que dijo o anotó el equipo (editable). */
  declarada: string | null;
  /** La que se usa: la declarada manda; si no hay, la derivada. */
  efectiva: string | null;
  /** Declaró una y compra otra: vale la pena revisar. */
  difiere: boolean;
}

export function tallasPreferidas(
  derivadas: Partial<Record<Categoria, string>>,
  declaradas: Partial<Record<ClaveTalla, string>>,
): FilaTalla[] {
  return TIPOS_TALLA.map((t) => {
    const derivada = derivadas[t.categoria] ?? null;
    const declarada = declaradas[t.clave]?.trim() || null;
    return {
      clave: t.clave,
      etiqueta: t.etiqueta,
      derivada,
      declarada,
      efectiva: declarada ?? derivada,
      difiere: !!declarada && !!derivada && declarada.toUpperCase() !== derivada.toUpperCase(),
    };
  });
}

// ---------------------------------------------------------------------------------------------------------
// Mensajes (WhatsApp prellenado)
// ---------------------------------------------------------------------------------------------------------
export type TipoMensajeCliente = 'nueva_coleccion' | 'cumpleanos' | 'cobro' | 'seguimiento';

export const TIPOS_MENSAJE_CLIENTE: readonly { tipo: TipoMensajeCliente; etiqueta: string; descripcion: string }[] = [
  { tipo: 'nueva_coleccion', etiqueta: 'Llegó nueva colección', descripcion: 'Avísale de lo nuevo, en su talla.' },
  { tipo: 'cumpleanos', etiqueta: 'Feliz cumpleaños', descripcion: 'Un saludo con un detalle para su próxima compra.' },
  { tipo: 'seguimiento', etiqueta: 'Seguimiento de su compra', descripcion: 'Pregúntale cómo le fue con lo último que llevó.' },
  { tipo: 'cobro', etiqueta: 'Recordar un saldo', descripcion: 'Un recordatorio amable de su separado o crédito.' },
];

export const CATEGORIAS_EN_TEXTO: Record<Categoria, string> = {
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

export const CATEGORIAS_ETIQUETA: Record<Categoria, string> = {
  camisas: 'Camisas',
  blazers: 'Blazers',
  pantalones: 'Pantalones',
  polos: 'Polos',
  abrigos_chaquetas: 'Abrigos y chaquetas',
  punto: 'Prendas de punto',
  trajes: 'Trajes',
  calzado: 'Calzado',
  accesorios: 'Accesorios',
};

function enumerar(lista: readonly string[]): string {
  if (lista.length <= 1) return lista[0] ?? '';
  return `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;
}

/** "novedades en camisas y pantalones" a partir de lo que más compra (hasta dos categorías). */
export function textoNovedad(categoriasTop: readonly Categoria[]): string {
  const nombres = categoriasTop.slice(0, 2).map((c) => CATEGORIAS_EN_TEXTO[c]);
  return nombres.length ? `novedades en ${enumerar(nombres)}` : 'prendas nuevas de la temporada';
}

/** Saludo según la hora de Bogotá ('2026-09-30T15:30:00'): buenos días hasta el mediodía, buenas tardes hasta las 6 p. m. */
export function saludoDeHora(ahora: FechaHoraISO): string {
  const h = Number(ahora.slice(11, 13));
  if (h < 12) return SALUDOS.manana;
  if (h < 18) return SALUDOS.tarde;
  return SALUDOS.noche;
}

export function primerNombre(nombres: string): string {
  return nombres.trim().split(/\s+/)[0] ?? nombres;
}

/** "30 de octubre". */
export function diaDelMes(f: FechaISO): string {
  return `${Number(f.slice(8, 10))} de ${MESES[Number(f.slice(5, 7)) - 1]}`;
}

export interface ContextoMensaje {
  marca: string;
  local: string;
  ahora: FechaHoraISO;
  /** Nombre de lo último que compró (o null). */
  producto: string | null;
  novedad: string;
  cobro: { numero: string; saldo: COP; abonado: COP; fechaLimite: FechaISO | null } | null;
}

/**
 * El texto del mensaje con la plantilla del trato elegido (config/textos/mensajes.ts). Las cifras van siempre en
 * pesos: el mensaje es para el cliente, no depende de la moneda que esté viendo el dueño.
 */
export function armarMensaje(
  tipo: TipoMensajeCliente,
  cliente: Pick<Cliente, 'nombres'>,
  tratamiento: 'tu' | 'usted',
  ctx: ContextoMensaje,
): string {
  let plantilla: string = PLANTILLAS_CLIENTE[tipo][tratamiento];
  const cobro = ctx.cobro;
  if (tipo === 'cobro' && cobro && !cobro.fechaLimite) plantilla = plantilla.replace(' y vence el {{fechaLimite}}', '');
  const posesivo = tratamiento === 'usted' ? 'su' : 'tu';
  return rellenarPlantilla(plantilla, {
    Nombre: primerNombre(cliente.nombres),
    saludo: saludoDeHora(ctx.ahora),
    marca: ctx.marca,
    local: ctx.local,
    producto: ctx.producto ? `${posesivo} última compra (${ctx.producto})` : `${posesivo} última compra`,
    novedad: ctx.novedad,
    numero: cobro?.numero ?? '',
    saldo: cobro ? dinero(cobro.saldo) : '',
    abonado: cobro ? dinero(cobro.abonado) : '',
    fechaLimite: cobro?.fechaLimite ? diaDelMes(cobro.fechaLimite) : '',
  });
}

// ---------------------------------------------------------------------------------------------------------
// Cumpleaños
// ---------------------------------------------------------------------------------------------------------
const esBisiesto = (anio: number) => (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;

/** La fecha del cumpleaños ('MM-DD') en un año; el 29 de febrero se celebra el 28 si el año no es bisiesto. */
export function fechaCumple(mmdd: string, anio: number): FechaISO {
  const md = mmdd === '02-29' && !esBisiesto(anio) ? '02-28' : mmdd;
  return `${anio}-${md}`;
}

/** Días que faltan para el próximo cumpleaños (0 = hoy). */
export function diasParaCumple(mmdd: string, hoy: FechaISO): number {
  const anio = Number(hoy.slice(0, 4));
  const este = fechaCumple(mmdd, anio);
  if (este >= hoy) return diferenciaDias(hoy, este);
  return diferenciaDias(hoy, fechaCumple(mmdd, anio + 1));
}

export type EstadoCumple = 'hoy' | 'pasado' | 'proximo';

export function estadoCumple(fecha: FechaISO, hoy: FechaISO): EstadoCumple {
  return fecha === hoy ? 'hoy' : fecha < hoy ? 'pasado' : 'proximo';
}

/** Edad que cumple en ese año (null si no se conoce el año de nacimiento). */
export function edadQueCumple(anioNacimiento: number | null, anio: number): number | null {
  return anioNacimiento ? anio - anioNacimiento : null;
}

/** El mes ('YYYY-MM') anterior o siguiente. */
export function moverMes(mes: string, delta: number): string {
  const n = Number(mes.slice(0, 4)) * 12 + (Number(mes.slice(5, 7)) - 1) + delta;
  const anio = Math.floor(n / 12);
  return `${anio}-${String((n % 12) + 1).padStart(2, '0')}`;
}

import type { Categoria, CurvaTallas, TipoPrenda } from '@/dominio/tipos';
import type { MetodoPago, SlugSeccion } from './tipos';

/** Copy de la tienda web (D6). En español de Colombia; la marca se pone con `useMarca()`, nunca a mano. */

export const SECCIONES: readonly { slug: SlugSeccion; etiqueta: string; titulo: string; texto: string; categorias: readonly Categoria[] | null }[] = [
  { slug: 'novedades', etiqueta: 'Novedades', titulo: 'Novedades', texto: 'Lo último de la temporada, directo de la bodega.', categorias: null },
  { slug: 'sastreria', etiqueta: 'Sastrería', titulo: 'Sastrería', texto: 'Trajes, blazers y chalecos con caída de sastre.', categorias: ['blazers', 'trajes'] },
  { slug: 'camisas', etiqueta: 'Camisas', titulo: 'Camisas', texto: 'Camisas y polos en algodón, lino y popelina.', categorias: ['camisas', 'polos'] },
  { slug: 'pantalones', etiqueta: 'Pantalones', titulo: 'Pantalones', texto: 'De vestir, chinos, jeans y de sastre.', categorias: ['pantalones'] },
  { slug: 'abrigos', etiqueta: 'Abrigos', titulo: 'Abrigos', texto: 'Abrigos, chaquetas y suéteres para el frío de Bogotá.', categorias: ['abrigos_chaquetas', 'punto'] },
  { slug: 'zapatos-y-accesorios', etiqueta: 'Zapatos y accesorios', titulo: 'Zapatos y accesorios', texto: 'Zapatos de cuero, cinturones, corbatas y billeteras.', categorias: ['calzado', 'accesorios'] },
];

export const NOMBRE_CATEGORIA: Record<Categoria, string> = {
  camisas: 'Camisas',
  polos: 'Polos',
  blazers: 'Blazers y chalecos',
  trajes: 'Trajes',
  pantalones: 'Pantalones',
  abrigos_chaquetas: 'Abrigos y chaquetas',
  punto: 'Suéteres',
  calzado: 'Zapatos',
  accesorios: 'Accesorios',
};

export const ORDENES: readonly { valor: 'destacados' | 'precio_asc' | 'precio_desc' | 'nombre'; etiqueta: string }[] = [
  { valor: 'destacados', etiqueta: 'Destacados' },
  { valor: 'precio_asc', etiqueta: 'Precio: de menor a mayor' },
  { valor: 'precio_desc', etiqueta: 'Precio: de mayor a menor' },
  { valor: 'nombre', etiqueta: 'Nombre (A–Z)' },
];

export const METODOS_PAGO: readonly { valor: MetodoPago; etiqueta: string; descripcion: string; referencia: string }[] = [
  { valor: 'simulado', etiqueta: 'Pago simulado', descripcion: 'Se aprueba al instante. No se cobra nada.', referencia: 'Pago simulado' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta', descripcion: 'Débito o crédito.', referencia: 'Tarjeta (simulación)' },
  { valor: 'pse', etiqueta: 'PSE', descripcion: 'Débito desde tu cuenta bancaria.', referencia: 'PSE (simulación)' },
  { valor: 'nequi', etiqueta: 'Nequi', descripcion: 'Aprueba desde la app.', referencia: 'Nequi (simulación)' },
  { valor: 'qr_bre_b', etiqueta: 'QR Bre-B', descripcion: 'Escanea y paga con tu llave.', referencia: 'QR Bre-B (simulación)' },
];

export const CIUDADES_ENVIO = ['Bogotá', 'Chía', 'Cajicá', 'Soacha', 'Medellín', 'Cali', 'Barranquilla'] as const;

/** Datos ficticios para probar la compra sin teclear (el celular y el correo son de ejemplo: nunca le llegan a nadie). */
export const COMPRADOR_EJEMPLO = {
  nombres: 'Andrés Felipe',
  apellidos: 'Mejía Rincón',
  correo: 'andres.mejia@correo.example',
  celular: '3105550142',
  direccion: 'Carrera 11 # 93-07, apto 502',
  complemento: 'Torre B',
  barrio: 'Chicó Norte',
  ciudad: 'Bogotá',
} as const;

export const TEXTOS = {
  portada: {
    eyebrow: 'Otoño · Invierno 2026',
    titular: 'Sastrería de temporada',
    comprar: 'Comprar ahora',
    coleccion: 'Ver la colección',
    categorias: 'Compra por categoría',
    novedades: 'Novedades',
    verTodo: 'Ver todo',
    editorialEyebrow: 'Sastrería a la medida',
    editorialTitulo: 'El traje de la temporada',
    editorialTexto: 'Lana fría, hombro suave y un pantalón que no se arruga entre la oficina y la cena. Cada traje sale con ajuste de bastas en cualquiera de nuestras tiendas.',
    editorialCta: 'Ver sastrería',
  },
  franja: 'Cada compra aquí entra a KippiCore como una venta real, con canal Web, y descuenta el inventario.',
  filtros: { filtrar: 'Filtrar', ordenar: 'Ordenar', talla: 'Talla', color: 'Color', limpiar: 'Limpiar filtros' },
  ficha: {
    agregar: 'Agregar a la bolsa',
    elegirTalla: 'Elige una talla',
    agotado: 'Agotado',
    guiaTallas: 'Guía de tallas',
    verDisponibilidad: 'Ver disponibilidad en tienda',
    tambien: 'También te puede gustar',
  },
  bolsa: {
    titulo: 'Tu bolsa',
    vacioTitulo: 'Tu bolsa está vacía',
    vacioTexto: 'Agrega una prenda desde cualquier categoría y la verás aquí.',
    irAPagar: 'Ir a pagar',
    seguir: 'Seguir comprando',
  },
  pago: {
    titulo: 'Pago',
    pagar: 'Pagar (simulación)',
    nota: 'Pago simulado: no se cobra nada y no se piden datos de tarjeta.',
    pasarela: 'Te llevaríamos a la pasarela de pago. Aquí la aprobamos al instante.',
  },
} as const;

/** Medidas de referencia de la guía de tallas (demostración). */
export const GUIA_TALLAS: Record<CurvaTallas, { titulo: string; columnas: readonly string[]; filas: readonly (readonly string[])[] }> = {
  superior: {
    titulo: 'Camisas, polos y suéteres',
    columnas: ['Talla', 'Pecho (cm)', 'Cintura (cm)'],
    filas: [
      ['S', '92–96', '78–82'],
      ['M', '97–101', '83–87'],
      ['L', '102–106', '88–92'],
      ['XL', '107–112', '93–98'],
      ['XXL', '113–118', '99–104'],
    ],
  },
  pantalon: {
    titulo: 'Pantalones',
    columnas: ['Talla', 'Cintura (cm)', 'Largo (cm)'],
    filas: [
      ['28', '71', '102'],
      ['30', '76', '104'],
      ['32', '81', '106'],
      ['34', '86', '106'],
      ['36', '91', '108'],
      ['38', '97', '108'],
      ['40', '102', '110'],
    ],
  },
  sastreria: {
    titulo: 'Trajes, blazers y abrigos',
    columnas: ['Talla', 'Pecho (cm)', 'Hombros (cm)'],
    filas: [
      ['46', '92', '43'],
      ['48', '96', '44'],
      ['50', '100', '45'],
      ['52', '104', '46'],
      ['54', '108', '47'],
      ['56', '112', '48'],
    ],
  },
  calzado: {
    titulo: 'Zapatos',
    columnas: ['Talla', 'Largo del pie (cm)'],
    filas: [
      ['38', '25,0'],
      ['39', '25,7'],
      ['40', '26,3'],
      ['41', '27,0'],
      ['42', '27,6'],
      ['43', '28,3'],
      ['44', '29,0'],
    ],
  },
  unica: {
    titulo: 'Accesorios',
    columnas: ['Talla', 'Medida'],
    filas: [['Única', 'Los cinturones se ajustan en el último hueco; las corbatas miden 7 cm de ancho.']],
  },
};

/** Cuidado de la prenda según su tipo y material. */
export function cuidadoDe(tipo: TipoPrenda, material: string): string {
  const m = material.toLowerCase();
  if (tipo === 'zapato' || tipo === 'cinturon' || tipo === 'billetera') return 'Limpia con un paño seco y aplica crema para cuero cada mes. Evita mojarlos; si pasa, déjalos secar al aire, lejos del calor.';
  if (tipo === 'corbata') return 'Limpieza en seco. Cuélgala después de usarla para que recupere la forma.';
  if (/lana|cachemira|merino|franela|tweed/.test(m) || tipo === 'traje' || tipo === 'blazer' || tipo === 'abrigo' || tipo === 'chaleco')
    return 'Limpieza en seco. Cuélgala en una percha ancha y cepíllala suavemente para quitar el polvo. Plancha al vapor, sin apoyar la plancha.';
  if (tipo === 'sweater') return 'Lavado a mano en agua fría con jabón neutro. No lo tuerzas y sécalo en plano, a la sombra.';
  return 'Lavado a máquina a 30 °C con colores similares, sin blanqueador. Plancha a temperatura media por el revés.';
}

export const ENVIOS = [
  'Los pedidos web salen de nuestra tienda de despacho en Bogotá y llegan en 1 a 2 días hábiles; al resto del país, en 3 a 5.',
  'El envío es gratis durante la vista previa. Puedes recoger sin costo en cualquiera de las tiendas.',
  'Tienes 30 días para cambiar o devolver tu compra, con la etiqueta puesta, en cualquier tienda.',
] as const;

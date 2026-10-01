import type { TipoPrenda } from '@/dominio/tipos';
import { normalizar } from '@/dominio/reglas/texto';
import { MESES, entero } from '@/lib/formato';
import type {
  ColorBot,
  ConsultaInventario,
  ContextoBot,
  DatosBot,
  FilaConsulta,
  IdRegla,
  Memoria,
  Parte,
  ProductoBot,
  Respuesta,
  TarjetaProducto,
  Traza,
} from './tipos';

/**
 * El "cerebro" de la vitrina (PRD 7.14, W9): reglas simples, sin IA, que entienden producto, color y talla en
 * texto libre (con sinónimos: "clarita", "celeste", "azul cielo"), consultan las existencias REALES por local y
 * responden en el trato del cliente (tú o usted). El bot contesta lo repetitivo (disponibilidad, precio, horarios,
 * envíos) y pasa a una persona para cerrar; nunca negocia precios.
 *
 * Todo aquí es puro: recibe los datos del negocio (`DatosBot`, que arma un selector con el inventario real) y la
 * memoria de la conversación, y devuelve la respuesta, la traza para el cerebro y la memoria nueva.
 */

// ---------------------------------------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------------------------------------
const PARADAS = new Set([
  'de',
  'con',
  'la',
  'el',
  'las',
  'los',
  'en',
  'y',
  'a',
  'para',
  'un',
  'una',
  'del',
  'al',
  'me',
  'mi',
  'tienen',
  'hay',
  'tiene',
  'quiero',
  'busco',
  'talla',
  'tallas',
  'color',
  'que',
  'por',
  'favor',
  'si',
  'es',
  'lo',
  'se',
  'le',
  'te',
  'hola',
  'buenas',
  'buenos',
  'dias',
  'tardes',
  'noches',
  'como',
  'esta',
  'estan',
  'tendran',
  'alguna',
  'algun',
  'ese',
  'esa',
  'este',
  'esta',
  'vi',
  'ver',
  'saber',
  'cuanto',
  'cuesta',
  'vale',
  'precio',
  'disponible',
  'disponibles',
  'quedan',
]);

const SIN_CAMBIO = new Set([
  'jeans',
  'tenis',
  'gris',
  'pais',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'dias',
  'mas',
  'anis',
]);

/** Pasa a singular una palabra (sin tildes, en minúscula) para comparar "camisas" con "camisa". */
export function singular(p: string): string {
  if (p.length <= 3 || SIN_CAMBIO.has(p)) return p;
  if (/(ones|eres|ines|ures|ales|ores)$/.test(p)) return p.slice(0, -2);
  if (p.endsWith('s')) return p.slice(0, -1);
  return p;
}

const SINONIMOS_PRENDA: Record<string, string> = {
  saco: 'blazer',
  buzo: 'sueter',
  chompa: 'sueter',
  cinto: 'cinturon',
  correa: 'cinturon',
  jean: 'jean',
};

export function palabras(texto: string): string[] {
  return normalizar(texto)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function fichaNombre(nombre: string): string[] {
  return palabras(nombre)
    .filter((p) => p.length >= 3 && !PARADAS.has(p))
    .map(singular);
}

function unir(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

export const articulo = (tipo: TipoPrenda): 'la' | 'el' =>
  tipo === 'camisa' || tipo === 'chaqueta' || tipo === 'corbata' || tipo === 'billetera' ? 'la' : 'el';

const FEMINIZAN = new Set(['blanco', 'negro', 'medio', 'claro', 'oscuro']);

/** "Azul cielo" → "azul cielo"; con prendas femeninas, "Blanco" → "blanca". */
export function colorTexto(nombre: string, femenino: boolean): string {
  return nombre
    .toLowerCase()
    .split(' ')
    .map((w) => (femenino && FEMINIZAN.has(w) ? `${w.slice(0, -1)}a` : w))
    .join(' ');
}

/** `1 de octubre` (para textos de chat). */
export const diaYMes = (f: string) => `${Number(f.slice(8, 10))} de ${MESES[Number(f.slice(5, 7)) - 1]}`;

const truncar = (t: string, n = 64) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

// ---------------------------------------------------------------------------------------------------------
// Colores (con sinónimos de uso corriente)
// ---------------------------------------------------------------------------------------------------------
const SINONIMOS_COLOR: Record<string, string[]> = {
  'azul cielo': [
    'celeste',
    'clarito',
    'clarita',
    'azul claro',
    'azul clarito',
    'azul clarita',
    'azul bebe',
    'cielo',
  ],
  'azul medio': ['azul rey', 'azul intermedio'],
  'azul marino': ['marino', 'azul oscuro', 'azul noche', 'navy', 'azul fuerte'],
  blanco: ['blanca', 'blancos', 'blancas'],
  negro: ['negra', 'negros', 'negras'],
  'gris claro': ['gris clarito', 'gris perla'],
  carbon: ['antracita', 'gris oscuro', 'gris humo'],
  arena: ['beige', 'arenita'],
  camel: ['camello', 'caramelo', 'miel'],
  cafe: ['marron', 'chocolate', 'cafecito'],
  'verde oliva': ['oliva', 'verde militar', 'verde ejercito'],
  'verde botella': ['botella', 'verde oscuro'],
  vinotinto: ['vino', 'guinda', 'tinto', 'granate', 'bordo'],
  'rosa palo': ['rosado', 'rosada', 'rosa', 'rosa pastel'],
  mostaza: ['amarillo', 'amarillo mostaza'],
  marfil: ['crema', 'hueso', 'blanco roto'],
};

function contieneFrase(t: string, frase: string): boolean {
  return new RegExp(`(^|\\s)${frase}(?=\\s|$)`).test(t);
}

/** Los colores que el texto menciona: el puntaje más alto manda; "azul" a secas devuelve todos los azules. */
export function reconocerColores(texto: string, colores: readonly ColorBot[]): ColorBot[] {
  const t = ` ${palabras(texto).join(' ')} `.trim();
  const toks = new Set(t.split(' '));
  let mejor = 0;
  const puntos = new Map<string, number>();
  for (const c of colores) {
    const n = normalizar(c.nombre);
    let p = 0;
    if (contieneFrase(t, n)) p = 4;
    for (const s of SINONIMOS_COLOR[n] ?? []) if (contieneFrase(t, s)) p = Math.max(p, 3);
    if (p === 0) {
      for (const w of n.split(' '))
        if (w.length >= 4 && w !== 'rayas' && w !== 'cuadros' && toks.has(w)) p += 1;
      if (
        p > 0 &&
        c.patron !== 'liso' &&
        !toks.has(c.patron === 'rayas' ? 'rayas' : 'cuadros') &&
        !toks.has(c.patron === 'rayas' ? 'rayado' : 'cuadrado')
      )
        p = 0;
    }
    if (p > 0) puntos.set(c.id, p);
    mejor = Math.max(mejor, p);
  }
  if (mejor === 0) return [];
  return colores.filter((c) => puntos.get(c.id) === mejor);
}

// ---------------------------------------------------------------------------------------------------------
// Talla y local
// ---------------------------------------------------------------------------------------------------------
const TALLAS_LETRA = new Set(['s', 'm', 'l', 'xl', 'xxl']);
const TALLAS_PALABRA: Record<string, string> = {
  mediana: 'M',
  mediano: 'M',
  grande: 'L',
  pequena: 'S',
  pequeno: 'S',
  chica: 'S',
  chico: 'S',
};

/** La talla que dice el texto (sin validarla contra el producto). */
export function reconocerTalla(texto: string): string | null {
  if (/^\s*(XXL|XL|S|M|L)\s*[.?!]*\s*$/i.test(texto)) return texto.replace(/[^A-Za-z]/g, '').toUpperCase();
  const t = palabras(texto);
  for (let i = 0; i < t.length; i++) {
    const w = t[i]!;
    const prev = t[i - 1];
    const sig = t[i + 1];
    if (w === 'extra' && sig === 'grande') return 'XL';
    if (w === 'xl' || w === 'xxl') return w.toUpperCase();
    if ((w === 'talla' || w === 'tallas') && sig) {
      if (TALLAS_LETRA.has(sig)) return sig.toUpperCase();
      if (/^\d{2}$/.test(sig)) return sig;
      if (TALLAS_PALABRA[sig]) return TALLAS_PALABRA[sig]!;
    }
    if (TALLAS_LETRA.has(w) && prev && ['en', 'la', 'una', 'mi', 'de', 'y'].includes(prev))
      return w.toUpperCase();
    if (/^\d{2}$/.test(w) && Number(w) >= 28 && Number(w) <= 56 && prev !== 'parque') return w;
  }
  for (const w of t) if (TALLAS_PALABRA[w]) return TALLAS_PALABRA[w]!;
  return null;
}

/** Quita los nombres de los locales ("Zona Rosa", "Parque 93") para que no se confundan con colores o tallas. */
export function sinLocales(texto: string): string {
  return texto.replace(/zona\s+rosa|parque\s+93|usaqu[eé]n/gi, ' ');
}

const ALIAS_LOCAL: [RegExp, string][] = [
  [/(^|\s)(zona rosa|zr)(\s|$)/, 'zr'],
  [/(^|\s)(parque 93|parque|p93|93)(\s|$)/, 'p93'],
  [/(^|\s)(usaquen|usq)(\s|$)/, 'usq'],
];

export function reconocerLocal(texto: string, locales: { id: string }[]): string | null {
  const t = palabras(texto).join(' ');
  for (const [re, id] of ALIAS_LOCAL) if (re.test(t) && locales.some((l) => l.id === id)) return id;
  return null;
}

// ---------------------------------------------------------------------------------------------------------
// Producto
// ---------------------------------------------------------------------------------------------------------
export interface ResultadoProducto {
  /** Un producto claro. */
  producto: ProductoBot | null;
  /** Varios con el mismo puntaje: hay que preguntar. */
  ambiguos: ProductoBot[];
}

const PALABRAS_COLOR = new Set(
  [
    ...Object.entries(SINONIMOS_COLOR).flatMap(([k, v]) => [k, ...v]),
    'azul',
    'verde',
    'gris',
    'rosa',
    'cafe',
    'negro',
    'blanco',
    'rojo',
  ]
    .flatMap((f) => f.split(' '))
    .map(singular),
);

function tokensConsulta(t: string): string[] {
  return palabras(t)
    .filter((p) => p.length >= 3 && !PARADAS.has(p))
    .map((p) => SINONIMOS_PRENDA[p] ?? p)
    .map(singular);
}

/** Producto que el texto menciona: puntúa por palabras del nombre (las de color valen la mitad); en empate gana el más consultado. */
export function reconocerProducto(mensaje: string, d: DatosBot): ResultadoProducto {
  const consulta = new Set(tokensConsulta(mensaje));
  if (consulta.size === 0) return { producto: null, ambiguos: [] };
  let mejor = 0;
  const puntaje = new Map<string, number>();
  for (const p of d.productos) {
    let n = 0;
    for (const w of fichaNombre(p.nombre)) if (consulta.has(w)) n += PALABRAS_COLOR.has(w) ? 0.5 : 1;
    if (n > 0) puntaje.set(p.id, n);
    mejor = Math.max(mejor, n);
  }
  if (mejor === 0) return { producto: null, ambiguos: [] };
  const empatados = d.productos.filter((p) => puntaje.get(p.id) === mejor);
  if (empatados.length === 1) return { producto: empatados[0]!, ambiguos: [] };
  const critico = empatados.find((p) => p.id === d.criticoId);
  if (critico) return { producto: critico, ambiguos: [] };
  const orden = [...empatados].sort(
    (a, b) => Number(b.destacado) - Number(a.destacado) || a.nombre.localeCompare(b.nombre, 'es'),
  );
  return { producto: null, ambiguos: orden.slice(0, 3) };
}

// ---------------------------------------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------------------------------------
const clave = (talla: string, colorId: string) => `${talla}|${colorId}`;

export function filasPorLocal(p: ProductoBot, talla: string, colorId: string, d: DatosBot): FilaConsulta[] {
  const celda = p.stock[clave(talla, colorId)] ?? {};
  return d.locales
    .map((l) => ({ localId: l.id, local: l.nombre, unidades: celda[l.id] ?? 0 }))
    .filter((f) => f.unidades > 0)
    .sort((a, b) => b.unidades - a.unidades || a.local.localeCompare(b.local, 'es'));
}

export function consultarInventario(
  p: ProductoBot,
  talla: string,
  color: ColorBot,
  d: DatosBot,
): ConsultaInventario {
  const filas = filasPorLocal(p, talla, color.id, d);
  return {
    producto: p.nombre,
    variante: `${color.nombre} · talla ${talla}`,
    filas,
    total: filas.reduce((a, f) => a + f.unidades, 0),
    precio: p.precio,
    enCamino: p.enCamino[clave(talla, color.id)] ?? null,
  };
}

/** Tallas con unidades en algún local para un color. */
export function tallasConStock(
  p: ProductoBot,
  colorId: string,
  d: DatosBot,
): { talla: string; unidades: number }[] {
  return p.tallas
    .map((t) => ({ talla: t, unidades: filasPorLocal(p, t, colorId, d).reduce((a, f) => a + f.unidades, 0) }))
    .filter((x) => x.unidades > 0);
}

export function textoLocales(filas: FilaConsulta[]): string {
  return unir(filas.map((f) => `${f.local} (${f.unidades})`));
}

// ---------------------------------------------------------------------------------------------------------
// Construcción de respuestas
// ---------------------------------------------------------------------------------------------------------
const tr = (ctx: ContextoBot, tu: string, usted: string) => (ctx.tratamiento === 'usted' ? usted : tu);
const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function saludoHora(hora: number): string {
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** "Hola, Andrés. " o "Buenas tardes, Ricardo. " solo en el primer mensaje del bot. */
export function encabezado(ctx: ContextoBot, mem: Memoria): string {
  if (mem.saludado) return '';
  return `${ctx.tratamiento === 'usted' ? saludoHora(ctx.hora) : 'Hola'}, ${ctx.nombre}. `;
}

/** Los cinco nodos del flujo "entrante": recibir · entender · consultar · responder · pasar a una persona. */
function nodos(
  recibido: string,
  entender: string | null,
  consultar: string | null,
  responderA: string,
  persona: string | null,
): (string | null)[] {
  return [`“${truncar(recibido)}”`, entender, consultar, responderA, persona];
}

function respuesta(
  partes: Parte[],
  regla: IdRegla,
  traza: Omit<Traza, 'regla'>,
  memoria: Memoria,
  extra: Partial<Respuesta> = {},
): Respuesta {
  return { partes, regla, traza: { regla, ...traza }, memoria: { ...memoria, saludado: true }, ...extra };
}

const texto = (t: string): Parte => ({ tipo: 'texto', texto: t });

export function tarjetaDe(p: ProductoBot): TarjetaProducto {
  const c = p.colores[0];
  return {
    productoId: p.id,
    nombre: p.nombre,
    precio: p.precio,
    color: c?.hex ?? '#999999',
    patron: c?.patron ?? 'liso',
    tipo: p.tipo,
    detalle: `${p.colores.length} ${p.colores.length === 1 ? 'color' : 'colores'} · tallas ${p.tallas[0]} a ${p.tallas[p.tallas.length - 1]}`,
  };
}

const nombreConArticulo = (p: ProductoBot) => `${articulo(p.tipo)} ${p.nombre}`;
const quienEs = (d: DatosBot) => d.persona?.nombre ?? 'una asesora';

function textoTraspaso(
  ctx: ContextoBot,
  d: DatosBot,
  motivo: 'cerrar' | 'persona' | 'precio',
  local: string | null,
): string {
  const quien = quienEs(d);
  const enLocal = local ? ` en ${local}` : '';
  if (motivo === 'cerrar')
    return tr(
      ctx,
      `Te paso con ${quien}, ella te la separa${enLocal}.`,
      `Le paso con ${quien}, ella se la separa${enLocal}.`,
    );
  if (motivo === 'precio')
    return tr(
      ctx,
      `Los precios no los negocio yo: los define el equipo en cada local. Te paso con ${quien} para que te ayude con eso.`,
      `Yo no negocio precios: los define el equipo en cada local. Le paso con ${quien} para que le ayude con eso.`,
    );
  return tr(
    ctx,
    `Claro. Te paso con ${quien}, ella te ayuda enseguida.`,
    `Con gusto. Le paso con ${quien}, ella le ayuda enseguida.`,
  );
}

// ---------------------------------------------------------------------------------------------------------
// Intenciones
// ---------------------------------------------------------------------------------------------------------
const RE = {
  humano: /\b(asesor|asesora|persona|humano|humana|alguien|vendedor|vendedora|hablar con)\b/,
  negociar:
    /(descuento|rebaja|rebajar|rebajita|mas barat|oferta|promo|regate|negoci|ultimo precio|precio final|me lo deja|me la deja|mejor precio)/,
  afirmar:
    /^(si|sii|sip|dale|listo|ok|okay|claro|de una|perfecto|por favor|bueno|hagale|obvio|vale)\b|\b(si por favor|me la separ|separemela|separamela|apartemela|aparta)/,
  separar:
    /(separ|apart|reserv|me la llevo|me lo llevo|la quiero|lo quiero|quiero comprar|comprarla|comprarlo)/,
  negar: /^(no|nop|no gracias|nada mas)\b/,
  gracias: /(gracias|muy amable|chao|chau|hasta luego|adios|bendiciones)/,
  envios: /(envio|envian|enviar|domicilio|mandan|despacho|llega a)/,
  horarios: /(horario|a que hora|abren|cierran|hasta que hora|abierto|atienden)/,
  ubicacion: /(donde|direccion|ubicacion|ubicados|queda|sede|tienda fisica|como llego)/,
  precio: /(precio|cuanto (cuesta|vale|valen|cuestan)|valor|cuesta|cuestan|costo|pesos)/,
  catalogo:
    /(catalogo|que tienen|que venden|que ofrecen|novedades|nueva coleccion|lo nuevo|ver prendas|mostrame|muestrame|que hay)/,
};

const RE_CELULAR = /(?<!\d)(3\d{2})[\s.-]?(\d{3})[\s.-]?(\d{4})(?!\d)/;
const RELLENO = new Set([
  'me',
  'llamo',
  'mi',
  'nombre',
  'es',
  'soy',
  'cel',
  'celular',
  'numero',
  'whatsapp',
  'y',
  'el',
  'de',
  'apellido',
  'gracias',
  'hola',
  'buenas',
  'claro',
  'listo',
  'dale',
  'ok',
  'por',
  'favor',
  'telefono',
  'tel',
  'completo',
]);

/** Nombre y celular de un mensaje como "Camilo Rojas, 311 234 5678". */
export function reconocerContacto(mensaje: string): {
  nombres: string | null;
  apellidos: string | null;
  celular: string | null;
} {
  const m = mensaje.match(RE_CELULAR);
  const celular = m ? `${m[1]}${m[2]}${m[3]}` : null;
  const ws = mensaje
    .replace(RE_CELULAR, ' ')
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !RELLENO.has(normalizar(w)))
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  if (ws.length === 0) return { nombres: null, apellidos: null, celular };
  if (ws.length === 1) return { nombres: ws[0]!, apellidos: null, celular };
  const corte = ws.length >= 4 ? 2 : 1;
  return { nombres: ws.slice(0, corte).join(' '), apellidos: ws.slice(corte).join(' '), celular };
}

function pedirContacto(
  mensaje: string,
  ctx: ContextoBot,
  mem: Memoria,
  d: DatosBot,
  hola: string,
  entendido: string,
): Respuesta {
  const quien = quienEs(d);
  return respuesta(
    [
      texto(
        `${hola}${tr(
          ctx,
          `Con gusto. ${quien} te escribe por WhatsApp para cerrar: ¿me dejas tu nombre completo y tu celular? Al enviarlos autorizas a ${d.marca} a guardar tus datos para contactarte.`,
          `Con gusto. ${quien} le escribe por WhatsApp para cerrar: ¿me deja su nombre completo y su celular? Al enviarlos autoriza a ${d.marca} a guardar sus datos para contactarlo.`,
        )}`,
      ),
    ],
    'captura_contacto',
    {
      nodos: nodos(
        mensaje,
        entendido,
        null,
        'Pedir nombre y celular',
        `Después pasa a ${d.persona?.completo ?? quien}`,
      ),
    },
    { ...mem, pidioContacto: true, ofrecioSeparar: false },
  );
}

// ---------------------------------------------------------------------------------------------------------
// Responder
// ---------------------------------------------------------------------------------------------------------
/**
 * La respuesta del bot a un mensaje. Devuelve `null` cuando una persona ya tiene el chat (el bot queda en pausa).
 */
export function responder(mensaje: string, mem: Memoria, d: DatosBot, ctx: ContextoBot): Respuesta | null {
  if (mem.traspasado) return null;
  const t = palabras(mensaje).join(' ');
  if (!t) return null;
  if (ctx.rol === 'dueno') return responderDueno(mensaje, t, mem, d);

  const hola = encabezado(ctx, mem);
  const instagram = ctx.canal === 'instagram';
  // Los locales se quitan del texto para no confundir "Zona Rosa" con el color rosa.
  const limpio = sinLocales(mensaje);

  // 1. Contacto (Instagram): nombre y celular para crear el cliente.
  if (mem.pidioContacto) {
    const c = reconocerContacto(mensaje);
    const nombres = c.nombres ?? mem.contactoParcial?.nombres ?? null;
    const celular = c.celular ?? mem.contactoParcial?.celular ?? null;
    const apellidos = c.apellidos;
    if (nombres && apellidos && celular)
      return respuesta(
        [
          texto(
            tr(
              ctx,
              `Listo, ${nombres}. Quedaste registrado y ${quienEs(d)} te escribe por WhatsApp.`,
              `Listo, ${nombres}. Quedó registrado y ${quienEs(d)} le escribe por WhatsApp.`,
            ),
          ),
        ],
        'captura_contacto',
        {
          nodos: nodos(
            mensaje,
            `Nombre: ${nombres} ${apellidos} · Celular: ${celular}`,
            'Autorización de datos aceptada en el chat',
            'Confirmar al cliente',
            `Crear el cliente en el CRM (comando real) y pasar a ${d.persona?.completo ?? quienEs(d)}`,
          ),
        },
        { ...mem, pidioContacto: false, contactoParcial: null, traspasado: true },
        { accion: { tipo: 'crearCliente', nombres, apellidos, celular }, traspaso: true },
      );
    const falta = !celular ? tr(ctx, 'tu celular', 'su celular') : tr(ctx, 'tu apellido', 'su apellido');
    return respuesta(
      [
        texto(
          tr(
            ctx,
            `Gracias${nombres ? `, ${nombres}` : ''}. Me falta ${falta} para dejarte registrado.`,
            `Gracias${nombres ? `, ${nombres}` : ''}. Me falta ${falta} para dejarlo registrado.`,
          ),
        ),
      ],
      'captura_contacto',
      {
        nodos: nodos(
          mensaje,
          nombres ? `Nombre: ${nombres}${celular ? ` · Celular: ${celular}` : ''}` : 'Falta el nombre',
          null,
          'Pedir lo que falta',
          null,
        ),
      },
      { ...mem, contactoParcial: { nombres: nombres ?? undefined, celular: celular ?? undefined } },
    );
  }

  const prod = reconocerProducto(limpio, d);
  const prodMem = d.productos.find((p) => p.id === mem.productoId) ?? null;
  const talla = reconocerTalla(limpio);
  const todosColores = unicos(d.productos.flatMap((p) => p.colores));
  const mencionaColor = reconocerColores(limpio, todosColores).length > 0;
  const localElegido = reconocerLocal(mensaje, d.locales);

  // 2. Pasar a una persona.
  if (RE.negociar.test(t)) {
    const nombre = quienEs(d);
    if (instagram) return pedirContacto(mensaje, ctx, mem, d, hola, 'Pide un descuento');
    return respuesta(
      [texto(`${hola}${textoTraspaso(ctx, d, 'precio', null)}`)],
      'sin_negociar',
      {
        nodos: nodos(
          mensaje,
          'Pide un descuento',
          null,
          'Regla: el bot no negocia precios',
          `Pasa a ${nombre}`,
        ),
        nota: 'El bot nunca negocia precios.',
      },
      { ...mem, traspasado: true },
      { traspaso: true },
    );
  }
  if (RE.humano.test(t)) {
    if (instagram) return pedirContacto(mensaje, ctx, mem, d, hola, 'Pide hablar con una persona');
    return respuesta(
      [texto(`${hola}${textoTraspaso(ctx, d, 'persona', null)}`)],
      'persona',
      {
        nodos: nodos(
          mensaje,
          'Pide hablar con una persona',
          null,
          'Pasar la conversación',
          `Pasa a ${quienEs(d)}`,
        ),
      },
      { ...mem, traspasado: true },
      { traspaso: true },
    );
  }

  // 3. Confirma que quiere separar (tras la oferta) o lo pide con claridad.
  const confirma =
    mem.ofrecioSeparar &&
    !talla &&
    !mencionaColor &&
    !prod.producto &&
    (RE.afirmar.test(t) || localElegido !== null);
  const pideSeparar = RE.separar.test(t) && (!!prodMem || !!prod.producto);
  if (confirma || (pideSeparar && (talla || mem.talla))) {
    const local = localElegido ?? mem.localElegido;
    const nombreLocal = local ? (d.locales.find((l) => l.id === local)?.nombre ?? null) : null;
    const entendido = `Quiere separar${nombreLocal ? ` en ${nombreLocal}` : ''}`;
    if (instagram) return pedirContacto(mensaje, ctx, { ...mem, localElegido: local }, d, hola, entendido);
    return respuesta(
      [texto(`${hola}${textoTraspaso(ctx, d, 'cerrar', nombreLocal)}`)],
      'separar',
      {
        nodos: nodos(
          mensaje,
          entendido,
          null,
          'El bot contesta lo repetitivo y pasa a una persona para cerrar',
          `Pasa a ${d.persona?.completo ?? quienEs(d)}`,
        ),
      },
      { ...mem, localElegido: local, traspasado: true },
      { traspaso: true },
    );
  }
  if (pideSeparar) {
    const p = prod.producto ?? prodMem!;
    return respuesta(
      [
        texto(
          `${hola}${tr(ctx, `Con gusto. ¿En qué talla quieres ${nombreConArticulo(p)}?`, `Con gusto. ¿En qué talla quiere ${nombreConArticulo(p)}?`)}`,
        ),
      ],
      'inventario',
      { nodos: nodos(mensaje, `Prenda: ${p.nombre}`, null, 'Falta la talla', null) },
      { ...mem, productoId: p.id },
    );
  }

  // 4. Negación o despedida.
  if (RE.negar.test(t) && mem.ofrecioSeparar)
    return respuesta(
      [
        texto(
          `${hola}${tr(ctx, 'Listo. Si cambias de idea o quieres ver otra prenda, aquí estoy.', 'Listo. Si cambia de idea o quiere ver otra prenda, aquí estoy.')}`,
        ),
      ],
      'despedida',
      { nodos: nodos(mensaje, 'No quiere separar', null, 'Despedida amable', null) },
      { ...mem, ofrecioSeparar: false },
    );
  if (RE.gracias.test(t) && !prod.producto)
    return respuesta(
      [
        texto(
          `${hola}${tr(ctx, `Con gusto, ${ctx.nombre}. Aquí estoy para lo que necesites.`, `Con mucho gusto, ${ctx.nombre}. Aquí estoy para lo que necesite.`)}`,
        ),
      ],
      'despedida',
      { nodos: nodos(mensaje, 'Agradece', null, 'Despedida amable', null) },
      mem,
    );

  // 5. Datos del negocio: horarios, ubicación, envíos, catálogo.
  if (RE.horarios.test(t) && !prod.producto)
    return respuesta(
      [texto(`${hola}Atendemos ${d.horario}.`)],
      'horarios',
      {
        nodos: nodos(
          mensaje,
          'Pregunta por el horario',
          'Horarios de los locales',
          'Responder con el horario',
          null,
        ),
      },
      mem,
    );
  if (RE.ubicacion.test(t) && !prod.producto && !talla)
    return respuesta(
      [texto(`${hola}Estamos en ${unir(d.locales.map((l) => `${l.nombre} (${l.direccion})`))}.`)],
      'horarios',
      {
        nodos: nodos(
          mensaje,
          'Pregunta dónde estamos',
          'Direcciones de los locales',
          'Responder con las direcciones',
          null,
        ),
      },
      mem,
    );
  if (RE.envios.test(t) && !prod.producto)
    return respuesta(
      [
        texto(
          `${hola}${tr(
            ctx,
            'Sí, hacemos envíos a todo el país: en Bogotá llegan en 1 o 2 días hábiles y a otras ciudades en 2 a 4. También puedes comprar en nuestra tienda web.',
            'Sí, hacemos envíos a todo el país: en Bogotá llegan en 1 o 2 días hábiles y a otras ciudades en 2 a 4. También puede comprar en nuestra tienda web.',
          )}`,
        ),
      ],
      'envios',
      {
        nodos: nodos(
          mensaje,
          'Pregunta por envíos',
          'Condiciones de envío',
          'Responder con las condiciones',
          null,
        ),
      },
      mem,
    );
  if (RE.catalogo.test(t) && !prod.producto) {
    const novedades = d.novedadesIds
      .map((id) => d.productos.find((p) => p.id === id))
      .filter((p): p is ProductoBot => !!p)
      .slice(0, 3);
    if (novedades.length)
      return respuesta(
        [
          texto(
            `${hola}${tr(ctx, 'Te comparto algunas de las prendas que más preguntan esta temporada:', 'Le comparto algunas de las prendas que más preguntan esta temporada:')}`,
          ),
          { tipo: 'tarjetas', tarjetas: novedades.map(tarjetaDe) },
          texto(
            tr(
              ctx,
              '¿Cuál te interesa? Te cuento si hay en tu talla.',
              '¿Cuál le interesa? Le cuento si hay en su talla.',
            ),
          ),
        ],
        'catalogo',
        {
          nodos: nodos(
            mensaje,
            'Pide ver el catálogo',
            `${novedades.length} novedades de la temporada`,
            'Enviar el catálogo',
            null,
          ),
        },
        mem,
      );
  }

  // 6. Producto: ambiguo, nuevo o el de la conversación.
  if (!prod.producto && prod.ambiguos.length > 0)
    return respuesta(
      [
        texto(
          `${hola}Tengo varias opciones: ${unir(prod.ambiguos.map((p) => p.nombre))}. ${tr(ctx, '¿Cuál te interesa?', '¿Cuál le interesa?')}`,
        ),
      ],
      'no_entiende',
      { nodos: nodos(mensaje, `${prod.ambiguos.length} prendas coinciden`, null, 'Preguntar cuál', null) },
      mem,
    );
  const usaMemoria =
    !prod.producto && !!prodMem && (!!talla || mencionaColor || RE.precio.test(t) || localElegido !== null);
  const p = prod.producto ?? (usaMemoria ? prodMem : null);
  if (!p)
    return respuesta(
      [
        texto(
          `${hola}${tr(ctx, 'No logré entenderte del todo. ¿Me dices la talla y el color que buscas?', 'No logré entenderle del todo. ¿Me dice la talla y el color que busca?')}`,
        ),
      ],
      'no_entiende',
      {
        nodos: nodos(
          mensaje,
          'No reconoció prenda, talla ni color',
          null,
          'Respuesta amable: pedir más datos',
          null,
        ),
      },
      mem,
    );

  const cambio = p.id !== mem.productoId;
  const tallaPedida = talla ?? (cambio ? null : mem.talla);
  const coloresProd = reconocerColores(limpio, p.colores);
  const colorAjeno = mencionaColor && coloresProd.length === 0;
  const coloresPedidos = coloresProd.length
    ? coloresProd
    : cambio || colorAjeno
      ? []
      : p.colores.filter((c) => mem.colorIds.includes(c.id));
  const base: Memoria = {
    ...mem,
    productoId: p.id,
    talla: tallaPedida,
    colorIds: coloresPedidos.map((c) => c.id),
    localElegido: localElegido ?? (cambio ? null : mem.localElegido),
  };
  const femenino = articulo(p.tipo) === 'la';
  const lo = femenino ? 'la' : 'lo';
  const entendido = [
    `Prenda: ${p.nombre}`,
    coloresPedidos.length ? `Color: ${unir(coloresPedidos.map((c) => c.nombre))}` : null,
    tallaPedida ? `Talla: ${tallaPedida}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const articuloNombre = capitalizar(nombreConArticulo(p));

  // Solo precio.
  if (RE.precio.test(t) && !talla && coloresProd.length === 0)
    return respuesta(
      [
        texto(
          `${hola}${articuloNombre} cuesta ${d.dinero(p.precio)} (IVA incluido). ${instagram ? tr(ctx, '¿Te muestro más prendas de la temporada?', '¿Le muestro más prendas de la temporada?') : tr(ctx, '¿Te cuento si hay en tu talla?', '¿Le cuento si hay en su talla?')}`,
        ),
      ],
      'precio',
      {
        nodos: nodos(
          mensaje,
          entendido,
          `Precio de lista: ${d.dinero(p.precio)}`,
          'Responder el precio',
          null,
        ),
      },
      base,
    );

  // Color pedido que la prenda no tiene.
  if (colorAjeno)
    return respuesta(
      [
        texto(
          `${hola}${articuloNombre} no ${lo} tengo en ese color. Viene en ${unir(p.colores.map((c) => colorTexto(c.nombre, femenino)))}. ${tr(ctx, '¿Cuál te gusta?', '¿Cuál le gusta?')}`,
        ),
      ],
      'inventario',
      {
        nodos: nodos(
          mensaje,
          entendido,
          `Colores de la prenda: ${p.colores.length}`,
          'Ofrecer los colores que sí hay',
          null,
        ),
      },
      { ...base, colorIds: [] },
    );

  // Sin talla: se pregunta.
  if (!tallaPedida) {
    const conStock = p.colores.filter((c) => tallasConStock(p, c.id, d).length > 0);
    return respuesta(
      [
        texto(
          `${hola}${articuloNombre} ${lo} tengo en ${unir(conStock.map((c) => colorTexto(c.nombre, femenino)))}. ${tr(ctx, `¿En qué talla ${lo} buscas?`, `¿En qué talla ${lo} busca?`)}`,
        ),
      ],
      'inventario',
      {
        nodos: nodos(
          mensaje,
          entendido,
          `${conStock.length} de ${p.colores.length} colores con existencias`,
          'Preguntar la talla',
          null,
        ),
      },
      base,
    );
  }
  if (!p.tallas.includes(tallaPedida))
    return respuesta(
      [
        texto(
          `${hola}${articuloNombre} no viene en talla ${tallaPedida}. Las tallas son ${unir(p.tallas)}. ${tr(ctx, '¿Cuál necesitas?', '¿Cuál necesita?')}`,
        ),
      ],
      'inventario',
      {
        nodos: nodos(
          mensaje,
          entendido,
          `Tallas de la prenda: ${p.tallas.join(', ')}`,
          'Ofrecer las tallas que sí hay',
          null,
        ),
      },
      { ...base, talla: null },
    );

  // Disponibilidad real por local.
  const revisar = coloresPedidos.length ? coloresPedidos : p.colores;
  const consultas = revisar.map((c) => consultarInventario(p, tallaPedida, c, d));
  const conExistencias = consultas.map((c, i) => ({ c, col: revisar[i]! })).filter((x) => x.c.total > 0);
  const unidades = consultas.reduce((a, c) => a + c.total, 0);
  const detalleConsulta = `${revisar.length === 1 ? revisar[0]!.nombre : `${revisar.length} colores`} · talla ${tallaPedida}: ${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}`;

  if (conExistencias.length === 0) {
    const c0 = revisar[0]!;
    const otras = tallasConStock(p, c0.id, d).filter((x) => x.talla !== tallaPedida);
    const llega = consultas.find((c) => c.enCamino)?.enCamino ?? null;
    const alterna = otras.length
      ? ` Sí tengo en ${unir(otras.map((x) => `${x.talla} (${x.unidades})`))}.`
      : '';
    const camino = llega
      ? ` Llegan ${llega.unidades} ${llega.unidades === 1 ? 'unidad' : 'unidades'} hacia el ${diaYMes(llega.fecha)}.`
      : '';
    const estado = femenino ? 'agotada' : 'agotado';
    const color = revisar.length === 1 ? ` ${colorTexto(c0.nombre, femenino)}` : '';
    return respuesta(
      [
        texto(
          `${hola}Por ahora ${nombreConArticulo(p)}${color} en talla ${tallaPedida} está ${estado} en los locales.${camino}${alterna}`,
        ),
      ],
      'inventario',
      {
        nodos: nodos(
          mensaje,
          entendido,
          detalleConsulta,
          'Informar que está agotado y ofrecer alternativas',
          null,
        ),
        consultas,
      },
      { ...base, ofrecioSeparar: false },
    );
  }

  const cuerpo =
    conExistencias.length === 1
      ? `Sí: ${nombreConArticulo(p)} ${colorTexto(conExistencias[0]!.col.nombre, femenino)} en talla ${tallaPedida} está disponible en ${textoLocales(conExistencias[0]!.c.filas)}. Cuesta ${d.dinero(p.precio)}.`
      : `En talla ${tallaPedida} tengo ${nombreConArticulo(p)} en ${conExistencias.map(({ c, col }) => `${colorTexto(col.nombre, femenino)}: ${textoLocales(c.filas)}`).join('; ')}. Cuesta ${d.dinero(p.precio)}.`;
  const cierre = tr(ctx, ` ¿Te ${lo} separo en alguno?`, ` ¿Se ${lo} separo en alguno?`);
  return respuesta(
    [texto(`${hola}${cuerpo}${cierre}`)],
    'inventario',
    {
      nodos: nodos(mensaje, entendido, detalleConsulta, 'Responder disponibilidad por local y precio', null),
      consultas,
    },
    { ...base, ofrecioSeparar: true },
  );
}

function unicos(colores: ColorBot[]): ColorBot[] {
  const vistos = new Map<string, ColorBot>();
  for (const c of colores) if (!vistos.has(c.id)) vistos.set(c.id, c);
  return [...vistos.values()];
}

// ---------------------------------------------------------------------------------------------------------
// Chat con el dueño
// ---------------------------------------------------------------------------------------------------------
function responderDueno(mensaje: string, t: string, mem: Memoria, d: DatosBot): Respuesta | null {
  const r = d.resumen;
  if (!r)
    return respuesta(
      [texto('Todavía no tengo cifras para contarte.')],
      'resumen_dueno',
      { nodos: nodos(mensaje, null, null, 'Sin datos', null) },
      mem,
    );
  const f = d.dinero;
  if (RE.gracias.test(t))
    return respuesta(
      [texto('Con gusto. Mañana a las 9:30 p. m. te llega el siguiente resumen.')],
      'despedida',
      { nodos: nodos(mensaje, 'Agradece', null, 'Despedida', null) },
      mem,
    );
  if (
    /(mes|mensual|septiembre|octubre|noviembre|diciembre|enero|febrero|marzo|abril|mayo|junio|julio|agosto)/.test(
      t,
    )
  )
    return respuesta(
      [texto(`Lo que va de ${r.nombreMes}: ${f(r.mes)} en ${entero(r.numVentasMes)} ventas.`)],
      'resumen_dueno',
      {
        nodos: nodos(
          mensaje,
          'Pregunta por el mes',
          `Ventas del mes: ${r.numVentasMes}`,
          'Responder el acumulado del mes',
          null,
        ),
      },
      mem,
    );
  if (/(local|mejor|donde|cual vendio)/.test(t))
    return respuesta(
      [texto(`Hoy por local: ${unir(r.porLocal.map((l) => `${l.nombre} ${f(l.valor)}`))}.`)],
      'resumen_dueno',
      {
        nodos: nodos(
          mensaje,
          'Pregunta por los locales',
          `${r.porLocal.length} locales`,
          'Responder las ventas por local',
          null,
        ),
      },
      mem,
    );
  if (/(venta|vendimos|vendido|cuanto|hoy|resumen|dia)/.test(t))
    return respuesta(
      [texto(`Ventas de hoy: ${f(r.hoy)} en ${r.numVentasHoy} ventas. Ticket promedio: ${f(r.ticket)}.`)],
      'resumen_dueno',
      {
        nodos: nodos(
          mensaje,
          'Pregunta por el día',
          `${r.numVentasHoy} ventas hoy`,
          'Responder el resumen del día',
          null,
        ),
      },
      mem,
    );
  return respuesta(
    [texto('Puedo contarte las ventas de hoy, lo que va del mes o cómo va cada local. ¿Cuál quieres?')],
    'no_entiende',
    {
      nodos: nodos(mensaje, 'No reconoció la pregunta', null, 'Respuesta amable: ofrecer las opciones', null),
    },
    mem,
  );
}

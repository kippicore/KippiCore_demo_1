import type { COP, FechaHoraISO, FechaISO, Id, TipoPrenda } from '@/dominio/tipos';
import type { IdEscenarioCanal } from '@/seed/escenarios-canales';

/**
 * Tipos de Canales digitales (D5, PRD 7.14). Nada aquí toca el dominio: son las formas de los datos que el bot
 * de la vitrina lee del inventario real, de la conversación que se reproduce y del "cerebro" que se ilumina.
 */
export type Tratamiento = 'tu' | 'usted';
export type CanalChat = 'whatsapp' | 'instagram';

/** Reglas de la automatización que se iluminan en el cerebro. */
export type IdRegla =
  | 'saludo'
  | 'inventario'
  | 'precio'
  | 'catalogo'
  | 'horarios'
  | 'envios'
  | 'separar'
  | 'persona'
  | 'sin_negociar'
  | 'no_entiende'
  | 'despedida'
  | 'confirmar_separado'
  | 'recordar_saldo'
  | 'nueva_coleccion'
  | 'cumpleanos'
  | 'resumen_dueno'
  | 'comentario_precio'
  | 'captura_contacto';

export interface DefRegla {
  id: IdRegla;
  nombre: string;
  /** Cuándo se activa, en una frase. */
  cuando: string;
  /** Qué hace, en una frase. */
  hace: string;
  canal: CanalChat | 'ambos';
}

// ---------------------------------------------------------------------------------------------------------
// Datos del negocio que lee el bot (los arma un selector con el inventario real)
// ---------------------------------------------------------------------------------------------------------
export interface ColorBot {
  id: Id;
  nombre: string;
  hex: string;
  patron: 'liso' | 'rayas' | 'cuadros';
}

export interface EnCaminoBot {
  unidades: number;
  fecha: FechaISO;
}

export interface ProductoBot {
  id: Id;
  nombre: string;
  referencia: string;
  precio: COP;
  tipo: TipoPrenda;
  temporada: string;
  destacado: boolean;
  tallas: string[];
  colores: ColorBot[];
  /** `${talla}|${colorId}` → unidades por local que vende. */
  stock: Record<string, Record<Id, number>>;
  /** `${talla}|${colorId}` → lo que viene en camino. */
  enCamino: Record<string, EnCaminoBot>;
}

export interface LocalBot {
  id: Id;
  nombre: string;
  direccion: string;
}

export interface DatosBot {
  productos: ProductoBot[];
  /** Solo los locales que venden (la bodega no atiende clientes). */
  locales: LocalBot[];
  marca: string;
  /** Producto que más se consulta (el de la narrativa): desempata "la Oxford". */
  criticoId: Id | null;
  /** Persona a quien el bot pasa la conversación ("Valentina"). */
  persona: { nombre: string; completo: string } | null;
  /** "lunes a sábado de 10:00 a. m. a 9:00 p. m. y domingos de 11:00 a. m. a 7:00 p. m." */
  horario: string;
  /** Las novedades de la temporada, para el aviso de colección y el catálogo. */
  novedadesIds: Id[];
  /** Formatea COP en la moneda activa. */
  dinero: (cop: COP) => string;
  /** Cifras reales para el chat con el dueño. */
  resumen?: ResumenDueno;
}

export interface ContextoBot {
  /** Primer nombre de quien escribe. */
  nombre: string;
  tratamiento: Tratamiento;
  /** 0–23, para el saludo de usted. */
  hora: number;
  /** 'dueno': el bot cuenta las ventas en lugar de atender un cliente. */
  rol: 'cliente' | 'dueno';
  canal: CanalChat;
}

export interface ResumenDueno {
  hoy: COP;
  numVentasHoy: number;
  mejorLocal: { nombre: string; valor: COP } | null;
  porLocal: { nombre: string; valor: COP }[];
  mes: COP;
  numVentasMes: number;
  nombreMes: string;
  ticket: COP;
}

/** Lo que el bot recuerda de la conversación. */
export interface Memoria {
  saludado: boolean;
  productoId: Id | null;
  colorIds: Id[];
  talla: string | null;
  ofrecioSeparar: boolean;
  localElegido: Id | null;
  /** Una persona ya tiene el chat: el bot queda en pausa. */
  traspasado: boolean;
  /** Pidió el contacto y espera nombre y celular (Instagram). */
  pidioContacto: boolean;
  /** Ya tiene nombre pero falta el apellido o el celular. */
  contactoParcial: { nombres?: string; celular?: string } | null;
  /** Prendas entre las que le preguntó cuál quería ("¿cuál chino?"): la siguiente respuesta ("el elástico") elige entre ellas. */
  ambiguosIds: Id[];
  /** Preguntó el precio y todavía no se le ha dicho (se lo dice al resolver la prenda). */
  pidioPrecio: boolean;
}

export const MEMORIA_INICIAL: Memoria = {
  saludado: false,
  productoId: null,
  colorIds: [],
  talla: null,
  ofrecioSeparar: false,
  localElegido: null,
  traspasado: false,
  pidioContacto: false,
  contactoParcial: null,
  ambiguosIds: [],
  pidioPrecio: false,
};

// ---------------------------------------------------------------------------------------------------------
// Lo que aparece en el chat
// ---------------------------------------------------------------------------------------------------------
export interface TarjetaProducto {
  productoId: Id;
  nombre: string;
  precio: COP;
  color: string;
  patron: 'liso' | 'rayas' | 'cuadros';
  tipo: TipoPrenda;
  detalle: string;
}

export type Parte = { tipo: 'texto'; texto: string } | { tipo: 'tarjetas'; tarjetas: TarjetaProducto[] };

export interface FilaConsulta {
  localId: Id;
  local: string;
  unidades: number;
}

/** Una consulta al inventario real: lo que el cerebro enseña a la derecha. */
export interface ConsultaInventario {
  producto: string;
  /** "Azul cielo · talla M". */
  variante: string;
  filas: FilaConsulta[];
  total: number;
  precio: COP;
  enCamino: EnCaminoBot | null;
}

/** Qué hizo el cerebro con un mensaje: un detalle por nodo del flujo (null = no pasó por ese nodo). */
export interface Traza {
  regla: IdRegla;
  nodos: (string | null)[];
  consultas?: ConsultaInventario[];
  nota?: string;
  /** Los cinco nodos de este paso (si no se dice, los del escenario). */
  flujo?: NodoFlujo[];
}

export interface AccionCrearCliente {
  tipo: 'crearCliente';
  nombres: string;
  apellidos: string;
  celular: string;
}

export interface Respuesta {
  partes: Parte[];
  regla: IdRegla;
  traza: Traza;
  memoria: Memoria;
  /** Efecto real que la interfaz debe ejecutar (crear el cliente en el CRM). */
  accion?: AccionCrearCliente;
  /** Una persona toma el chat. */
  traspaso?: boolean;
}

export interface NodoFlujo {
  titulo: string;
  /** Texto corto de lo que hace el nodo cuando no hay detalle. */
  descripcion: string;
}

// ---------------------------------------------------------------------------------------------------------
// Guiones (escenarios jugables)
// ---------------------------------------------------------------------------------------------------------
export type Autor = 'cliente' | 'bot' | 'sistema';

export interface PasoCliente {
  tipo: 'cliente';
  texto: string;
  ts: FechaHoraISO;
}
export interface PasoBot {
  tipo: 'bot';
  partes: Parte[];
  traza: Traza;
  ts: FechaHoraISO;
  /** Una persona toma el chat tras este mensaje. */
  traspaso?: boolean;
}
export interface PasoSistema {
  tipo: 'sistema';
  texto: string;
  /** Enlace interno opcional ("Ver ficha"). */
  enlace?: { texto: string; a: string };
  traza?: Traza;
}
/** Un efecto real (crear un cliente): la interfaz lo ejecuta y devuelve el paso de sistema. */
export interface PasoEfecto {
  tipo: 'efecto';
  accion: AccionCrearCliente;
  traza: Traza;
}
/** Cambio de pantalla dentro del teléfono (Instagram: comentarios → mensajes directos). */
export interface PasoVista {
  tipo: 'vista';
  vista: 'comentarios' | 'mensajes';
}
/** Un comentario público en la publicación (Instagram). */
export interface PasoComentario {
  tipo: 'comentario';
  usuario: string;
  texto: string;
  /** Respuesta del bot a un comentario. */
  respuestaDe?: string;
  ts: FechaHoraISO;
  traza?: Traza;
}

export type PasoGuion = PasoCliente | PasoBot | PasoSistema | PasoEfecto | PasoVista | PasoComentario;

export type IdEscenario = IdEscenarioCanal | 'libre';

export interface Guion {
  id: IdEscenario;
  canal: CanalChat;
  contacto: { nombre: string; detalle: string };
  flujo: NodoFlujo[];
  /** Flujo de lo que el cliente escribe después (texto libre y respuestas del guion). */
  flujoEntrante: NodoFlujo[];
  /** Datos clave del escenario para el panel de datos del cerebro (cuando no hay consulta al inventario). */
  datos?: { titulo: string; filas: { etiqueta: string; valor: string }[] };
  /** Reglas del cerebro que este escenario enseña. */
  reglas: IdRegla[];
  pasos: PasoGuion[];
  /** Quién escribe en el chat libre cuando el guion termina. */
  contexto: ContextoBot;
  memoriaFinal: Memoria;
  /** Una línea para el cerebro: cuándo se dispara. */
  disparador: string;
  /** Audiencia, para los avisos a segmentos. */
  audiencia?: { total: number; usted: number; tu: number; segmentos: string };
}

export type Entrega = 'enviado' | 'entregado' | 'leido';

export interface MensajeChat {
  id: string;
  autor: Autor;
  partes: Parte[];
  ts: FechaHoraISO;
  /** Solo mensajes del cliente: enviado → entregado → leído. */
  entrega?: Entrega;
  enlace?: { texto: string; a: string };
  /** Mensaje escrito por la persona que prueba (no del guion). */
  libre?: boolean;
}

export interface ComentarioChat {
  id: string;
  usuario: string;
  texto: string;
  ts: FechaHoraISO;
  /** Es la marca respondiendo a `respuestaDe`. */
  respuestaDe?: string;
}

export interface EntradaRegistro {
  id: string;
  ts: FechaHoraISO;
  regla: IdRegla;
  detalle: string;
}

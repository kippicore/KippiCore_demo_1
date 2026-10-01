import type { EventoUI, FechaISO, Id, MesISO, Rol } from '@/dominio/tipos';

/**
 * CONTRATO DE RUTAS (PLAN 5.5, 5.5.1, 6.18, 2.5; dueño F2-B). Módulo PURO (sin React ni estado): lo usan el
 * router, los layouts, los módulos, `ui/conectados` y los selectores (alertas).
 *
 * - `RUTAS`: TODAS las rutas con su patrón, paquete dueño, roles, título y parámetros de consulta tipados.
 * - `rutas.<nombre>(...paramsDeRuta, query?)`: constructores tipados. Ningún paquete arma una URL a mano.
 * - `leerParamsRuta(nombre, params, search)`: parser puro; en componentes, `useParamsRuta('<nombre>')`
 *   (src/app/useParamsRuta.ts). Ningún paquete lee `location.search` directamente.
 * - `EVENTOS_UI`: catálogo de eventos de interfaz con su emisor (6.18).
 * - `PISTAS`: catálogo de anclas `<Pista id>` con su paquete y pantalla (2.5); los textos viven en
 *   config/textos/guia.ts.
 *
 * Parámetros desconocidos se ignoran; inválidos se leen como null (la pantalla se muestra sin el efecto).
 * Un parámetro, evento o pista nuevos se agregan PRIMERO aquí (F2-B o el líder) y luego los usa el paquete.
 */

// ---------------------------------------------------------------------------------------------------------
// Codecs de parámetros de consulta
// ---------------------------------------------------------------------------------------------------------
export interface Codec<T> {
  leer(v: string): T | null;
  escribir(v: T): string;
}

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_MES = /^\d{4}-\d{2}$/;

export const texto: Codec<string> = { leer: (v) => (v === '' ? null : v), escribir: (v) => v };
export const entero: Codec<number> = {
  leer: (v) => (/^-?\d+$/.test(v) ? Number(v) : null),
  escribir: (v) => String(Math.round(v)),
};
export const fecha: Codec<FechaISO> = { leer: (v) => (RE_FECHA.test(v) ? v : null), escribir: (v) => v };
export const mes: Codec<MesISO> = { leer: (v) => (RE_MES.test(v) ? v : null), escribir: (v) => v };
export function enumeracion<const T extends string>(...valores: readonly T[]): Codec<T> {
  return { leer: (v) => ((valores as readonly string[]).includes(v) ? (v as T) : null), escribir: (v) => v };
}

/** `?trasladar=<origen>,<destino>,<varianteId>,<cantidad>` (A2): abre el panel de traslado prellenado. */
export interface Trasladar {
  origen: Id;
  destino: Id;
  varianteId: Id;
  cantidad: number;
}
export const trasladar: Codec<Trasladar> = {
  leer: (v) => {
    const [origen, destino, varianteId, c] = v.split(',');
    const cantidad = Number(c);
    if (!origen || !destino || !varianteId || !Number.isInteger(cantidad) || cantidad <= 0) return null;
    return { origen, destino, varianteId, cantidad };
  },
  escribir: (t) => `${t.origen},${t.destino},${t.varianteId},${t.cantidad}`,
};

// ---------------------------------------------------------------------------------------------------------
// Definición de rutas
// ---------------------------------------------------------------------------------------------------------
export type Paquete =
  | 'F2' | 'A1' | 'A2' | 'A3' | 'A4' | 'B1' | 'B2' | 'B3' | 'B4' | 'C1' | 'C2' | 'C3'
  | 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'E1' | 'E2' | 'E3' | 'F2-C';

/** 'publico': sin rol (entrada, tienda, portal); 'app': /app (siempre el dueño). */
export type AccesoRuta = Rol | 'publico' | 'app';

type MapaCodecs = Record<string, Codec<unknown>>;

export interface DefRuta<Ps extends readonly string[] = readonly string[], Q extends MapaCodecs = MapaCodecs> {
  patron: string;
  params: Ps;
  query: Q;
  paquete: Paquete;
  acceso: readonly AccesoRuta[];
  titulo: string;
}

const D = 'dueno' as const;
const V = 'vendedor' as const;
const B = 'bodega' as const;
const PUB = ['publico'] as const;
const APP = ['app'] as const;

function ruta<const Ps extends readonly string[], const Q extends MapaCodecs = Record<never, never>>(
  patron: string,
  paquete: Paquete,
  acceso: readonly AccesoRuta[],
  titulo: string,
  params: Ps,
  query: Q = {} as Q,
): DefRuta<Ps, Q> {
  return { patron, params, query, paquete, acceso, titulo };
}

const resaltar = { resaltar: texto };
const rango = { desde: fecha, hasta: fecha };

export const PESTANAS_PRODUCTO = ['variantes', 'kardex', 'ventas', 'rentabilidad', 'editar'] as const;
export const PESTANAS_IMPORTACION = ['lineas', 'costo-aterrizado', 'pagos', 'documentos', 'contactos', 'mensajes'] as const;
export const PESTANAS_EMPLEADO = ['datos', 'contrato', 'costo', 'comisiones', 'desprendibles'] as const;

export const RUTAS = {
  // --- Entrada, guía y raíz del panel ---
  entrada: ruta('/', 'E2', PUB, 'Entrada', []),
  panel: ruta('/panel', 'F2', [D, V, B], 'Panel', []),
  comoArrancariamos: ruta('/panel/como-arrancariamos', 'E2', [D, V, B], 'Cómo arrancaríamos', []),
  // --- D1 Inicio ---
  inicio: ruta('/panel/inicio', 'D1', [D], 'Inicio', []),
  // --- A1 Punto de venta y caja ---
  // ?cliente=<clienteId>: abre la venta con ese cliente y su saldo a favor cargados (el cambio de A3).
  pos: ruta('/panel/pos', 'A1', [D, V], 'Punto de venta', [], { cliente: texto }),
  caja: ruta('/panel/pos/caja', 'A1', [D, V], 'Caja', [], { sesion: texto, ...resaltar }),
  // --- A3 Ventas ---
  ventas: ruta('/panel/ventas', 'A3', [D, V], 'Ventas', [], {
    ...rango,
    local: texto,
    vendedor: texto,
    cliente: texto,
    medio: texto,
    canal: enumeracion('local', 'whatsapp', 'instagram', 'web'),
    estado: enumeracion('pagada', 'separado', 'credito', 'devuelta', 'devuelta_parcial', 'anulada'),
    producto: texto,
    /** Búsqueda por número de venta, cliente o vendedor. */
    texto,
    ...resaltar,
  }),
  venta: ruta('/panel/ventas/:ventaId', 'A3', [D, V], 'Detalle de venta', ['ventaId']),
  devolucion: ruta('/panel/ventas/:ventaId/devolucion', 'A3', [D, V], 'Cambio o devolución', ['ventaId']),
  // --- A2 Inventario ---
  inventario: ruta('/panel/inventario', 'A2', [D, V, B], 'Inventario', [], {
    categoria: texto,
    talla: texto,
    color: texto,
    local: texto,
    proveedor: texto,
    stock: enumeracion('agotado', 'bajo', 'normal'),
    texto,
    vista: enumeracion('tabla', 'tarjetas'),
    ...resaltar,
  }),
  productoNuevo: ruta('/panel/inventario/nuevo', 'A2', [D, B], 'Crear producto', []),
  movimientos: ruta('/panel/inventario/movimientos', 'A2', [D, B], 'Movimientos de inventario', [], {
    producto: texto,
    local: texto,
    ...rango,
    ...resaltar,
  }),
  traslados: ruta('/panel/inventario/traslados', 'A2', [D, B], 'Traslados', [], {
    estado: enumeracion('solicitado', 'en_transito', 'recibido', 'cancelado'),
    ...resaltar,
  }),
  traslado: ruta('/panel/inventario/traslados/:trasladoId', 'A2', [D, B], 'Traslado', ['trasladoId']),
  conteos: ruta('/panel/inventario/conteos', 'A2', [D, B], 'Conteos físicos', [], { ...resaltar }),
  conteo: ruta('/panel/inventario/conteos/:conteoId', 'A2', [D, B], 'Conteo físico', ['conteoId']),
  recepcion: ruta('/panel/inventario/recepcion', 'A2', [D, B], 'Recepción de importación', [], { importacion: texto }),
  etiquetas: ruta('/panel/inventario/etiquetas', 'A2', [D, B], 'Etiquetas', [], { producto: texto }),
  valorizacion: ruta('/panel/inventario/valorizacion', 'A2', [D], 'Valorización', [], { local: texto }),
  producto: ruta('/panel/inventario/:referencia', 'A2', [D, V, B], 'Producto', ['referencia'], {
    trasladar,
    ...resaltar,
  }),
  productoPestana: ruta('/panel/inventario/:referencia/:pestana', 'A2', [D, V, B], 'Producto', ['referencia', 'pestana'], {
    ...resaltar,
  }),
  // --- B1 Importaciones, sugerir pedido y portal ---
  importaciones: ruta('/panel/importaciones', 'B1', [D, B], 'Importaciones', [], {
    vista: enumeracion('tablero', 'lista', 'ruta'),
    ...resaltar,
  }),
  importacionNueva: ruta('/panel/importaciones/nueva', 'B1', [D], 'Nuevo pedido', []),
  sugerirPedido: ruta('/panel/importaciones/sugerir', 'B1', [D], 'Sugerir pedido', [], {
    proveedor: texto,
    cobertura: entero,
    desde: enumeracion('analisis', 'proveedor', 'guia', 'alerta'),
  }),
  contactosCadena: ruta('/panel/importaciones/contactos', 'B1', [D], 'Contactos de la cadena', [], { ...resaltar }),
  importacion: ruta('/panel/importaciones/:numero', 'B1', [D, B], 'Importación', ['numero'], { ...resaltar }),
  importacionPestana: ruta('/panel/importaciones/:numero/:pestana', 'B1', [D], 'Importación', ['numero', 'pestana'], {
    ...resaltar,
  }),
  seguimiento: ruta('/seguimiento/:numero', 'B1', PUB, 'Seguimiento de importación', ['numero']),
  // --- B2 Proveedores ---
  proveedores: ruta('/panel/proveedores', 'B2', [D], 'Proveedores', [], {
    tipo: enumeracion('fabrica', 'local'),
    local: texto,
    ...resaltar,
  }),
  comparativoFabricas: ruta('/panel/proveedores/comparativo', 'B2', [D], 'Comparativo de fábricas', []),
  proveedor: ruta('/panel/proveedores/:proveedorId', 'B2', [D], 'Proveedor', ['proveedorId']),
  // --- B3 Pagos, datáfono y flujo ---
  pagos: ruta('/panel/pagos', 'B3', [D], 'Pagos', [], { local: texto }),
  porPagar: ruta('/panel/pagos/por-pagar', 'B3', [D], 'Por pagar', [], {
    local: texto,
    semana: fecha,
    estado: enumeracion('pendiente', 'programado', 'pago_parcial', 'pagado', 'vencido'),
    ...resaltar,
  }),
  porCobrar: ruta('/panel/pagos/por-cobrar', 'B3', [D], 'Por cobrar', [], {
    filtro: enumeracion('separados-por-vencer', 'vencidos', 'credito'),
    ...resaltar,
  }),
  cuentas: ruta('/panel/pagos/cuentas', 'B3', [D], 'Caja y bancos', [], { ...resaltar }),
  cuenta: ruta('/panel/pagos/cuentas/:cuentaId', 'B3', [D], 'Cuenta', ['cuentaId'], { ...rango, ...resaltar }),
  conciliacion: ruta('/panel/pagos/conciliacion', 'B3', [D], 'Conciliación', []),
  datafono: ruta('/panel/pagos/datafono', 'B3', [D], 'Datáfono', [], { mes, local: texto }),
  flujo: ruta('/panel/pagos/flujo', 'B3', [D], 'Flujo de caja', [], { semana: fecha, dias: enumeracion('30', '60', '90') }),
  // --- B4 Gastos y resultados ---
  gastos: ruta('/panel/gastos', 'B4', [D], 'Costos y gastos', [], { local: texto, mes, ...resaltar }),
  gastosRecurrentes: ruta('/panel/gastos/recurrentes', 'B4', [D], 'Gastos recurrentes', [], { ...resaltar }),
  estadoResultados: ruta('/panel/gastos/resultados', 'B4', [D], 'Estado de resultados', [], { local: texto, mes }),
  puntoEquilibrio: ruta('/panel/gastos/equilibrio', 'B4', [D], 'Punto de equilibrio', [], { local: texto, mes }),
  // --- C1 Personal, nómina y comisiones ---
  personal: ruta('/panel/personal', 'C1', [D], 'Personal y nómina', [], {
    riesgo: enumeracion('contrato-realidad'),
    local: texto,
    ...resaltar,
  }),
  empleadoNuevo: ruta('/panel/personal/nuevo', 'C1', [D], 'Nuevo empleado', []),
  nomina: ruta('/panel/personal/nomina', 'C1', [D], 'Nómina', [], { ...resaltar }),
  liquidacion: ruta('/panel/personal/nomina/:liquidacionId', 'C1', [D], 'Liquidación de nómina', ['liquidacionId']),
  comparativoModalidades: ruta('/panel/personal/comparativo', 'C1', [D], '¿Cuánto me cuesta en cada modalidad?', []),
  comisiones: ruta('/panel/personal/comisiones', 'C1', [D], 'Comisiones', [], { mes, empleado: texto }),
  misComisiones: ruta('/panel/mis-comisiones', 'C1', [V], 'Mis comisiones', [], { mes }),
  // --- C2 Turnos, asistencia y novedades ---
  turnos: ruta('/panel/personal/turnos', 'C2', [D], 'Turnos', [], { semana: fecha, local: texto }),
  asistencia: ruta('/panel/personal/asistencia', 'C2', [D], 'Asistencia', [], { local: texto, empleado: texto, ...rango }),
  novedades: ruta('/panel/personal/novedades', 'C2', [D], 'Novedades', [], { empleado: texto, ...resaltar }),
  miTurno: ruta('/panel/mi-turno', 'C2', [V, B], 'Mi turno', []),
  miDia: ruta('/panel/mi-dia', 'C2', [V], 'Mi día', []),
  // Las fichas de empleado van después de las subrutas estáticas (nuevo, nomina, turnos…).
  empleado: ruta('/panel/personal/:slug', 'C1', [D], 'Empleado', ['slug'], { ...resaltar }),
  empleadoPestana: ruta('/panel/personal/:slug/:pestana', 'C1', [D], 'Empleado', ['slug', 'pestana']),
  // --- A4 Clientes ---
  clientes: ruta('/panel/clientes', 'A4', [D, V], 'Clientes', [], {
    segmento: enumeracion('vip', 'frecuente', 'ocasional', 'en_riesgo', 'nuevo'),
    local: texto,
    vendedor: texto,
    texto,
    ...resaltar,
  }),
  cumpleanos: ruta('/panel/clientes/cumpleanos', 'A4', [D, V], 'Cumpleaños', [], { mes }),
  cliente: ruta('/panel/clientes/:clienteId', 'A4', [D, V], 'Cliente', ['clienteId'], {
    mensaje: enumeracion('cumpleanos', 'cobro', 'seguimiento'),
  }),
  // --- C3 Calendario ---
  calendario: ruta('/panel/calendario', 'C3', [D], 'Calendario', [], {
    vista: enumeracion('mes', 'semana', 'dia'),
    fecha,
    ...resaltar,
  }),
  // --- D2 Análisis ---
  analisis: ruta('/panel/analisis', 'D2', [D], 'Análisis', [], { vista: texto, ...resaltar }),
  tablaDinamica: ruta('/panel/analisis/tabla-dinamica', 'D2', [D], 'Tabla dinámica', [], { vista: texto }),
  analisisProductos: ruta('/panel/analisis/productos', 'D2', [D], 'Productos, tallas y colores', [], {
    vista: enumeracion('vendidos', 'tallas', 'colores', 'rotacion'),
    ...resaltar,
  }),
  analisisClientes: ruta('/panel/analisis/clientes', 'D2', [D], 'Clientes', [], { vista: texto, ...resaltar }),
  analisisLocales: ruta('/panel/analisis/locales', 'D2', [D], 'Locales y vendedores', [], { vista: texto, ...resaltar }),
  // --- D3 Facturación ---
  facturacion: ruta('/panel/facturacion', 'D3', [D], 'Facturación', [], {
    // Compartidos C-D: también 'notas' (la lista filtrada por notas crédito).
    tipo: enumeracion('factura_electronica', 'documento_equivalente_pos', 'notas'),
    ...resaltar,
  }),
  notaCredito: ruta('/panel/facturacion/notas-credito/:notaId', 'D3', [D], 'Nota crédito', ['notaId']),
  factura: ruta('/panel/facturacion/:facturaId', 'D3', [D, V], 'Factura', ['facturaId']),
  // --- D5 Canales ---
  canales: ruta('/panel/canales', 'D5', [D], 'Canales digitales', []),
  canalWhatsapp: ruta('/panel/canales/whatsapp', 'D5', [D], 'WhatsApp', [], { escenario: texto }),
  canalInstagram: ruta('/panel/canales/instagram', 'D5', [D], 'Instagram', [], { escenario: texto }),
  canalWeb: ruta('/panel/canales/web', 'D5', [D], 'Vista web', []),
  // --- D4 Reportes ---
  reportes: ruta('/panel/reportes', 'D4', [D, B], 'Reportes', [], { reporte: texto }),
  // --- E3 Configuración ---
  configuracion: ruta('/panel/configuracion', 'E3', [D], 'Configuración', []),
  configEmpresa: ruta('/panel/configuracion/empresa', 'E3', [D], 'Empresa', []),
  configLocales: ruta('/panel/configuracion/locales', 'E3', [D], 'Locales', []),
  configMonedas: ruta('/panel/configuracion/monedas', 'E3', [D], 'Monedas y tasas', []),
  configNomina: ruta('/panel/configuracion/nomina', 'E3', [D], 'Parámetros de nómina', []),
  configImpuestos: ruta('/panel/configuracion/impuestos', 'E3', [D], 'Impuestos y obligaciones', []),
  configAduanas: ruta('/panel/configuracion/aduanas', 'E3', [D], 'Aduanas', []),
  configUsuarios: ruta('/panel/configuracion/usuarios', 'E3', [D], 'Usuarios y roles', []),
  configDatos: ruta('/panel/configuracion/datos', 'E3', [D], 'Datos de la demo', []),
  // --- E1 App del dueño (/app siempre es del dueño) ---
  app: ruta('/app', 'E1', APP, 'Hoy', []),
  appVentas: ruta('/app/ventas', 'E1', APP, 'Ventas', []),
  appInventario: ruta('/app/inventario', 'E1', APP, 'Inventario', []),
  appProducto: ruta('/app/inventario/:referencia', 'E1', APP, 'Producto', ['referencia']),
  appAgenda: ruta('/app/agenda', 'E1', APP, 'Agenda', []),
  appCierres: ruta('/app/cierres', 'E1', APP, 'Cierres de caja', [], { sesion: texto }),
  appCierre: ruta('/app/cierres/:sesionId', 'E1', APP, 'Cierre de caja', ['sesionId']),
  appMas: ruta('/app/mas', 'E1', APP, 'Más', []),
  appAprobar: ruta('/app/mas/aprobar', 'E1', APP, 'Para aprobar', []),
  appImportaciones: ruta('/app/mas/importaciones', 'E1', APP, 'Importaciones', []),
  appImportacion: ruta('/app/mas/importaciones/:numero', 'E1', APP, 'Importación', ['numero']),
  appNomina: ruta('/app/mas/nomina', 'E1', APP, 'Nómina', []),
  appPagos: ruta('/app/mas/pagos', 'E1', APP, 'Pagos pendientes', []),
  appAlertas: ruta('/app/mas/alertas', 'E1', APP, 'Alertas', []),
  appMoneda: ruta('/app/mas/moneda', 'E1', APP, 'Moneda', []),
  appComoArrancariamos: ruta('/app/mas/como-arrancariamos', 'E1', APP, 'Cómo arrancaríamos', []),
  // --- D6 Tienda web ---
  tienda: ruta('/tienda', 'D6', PUB, 'Tienda', []),
  tiendaProducto: ruta('/tienda/producto/:slug', 'D6', PUB, 'Producto', ['slug'], { talla: texto, color: texto }),
  tiendaBolsa: ruta('/tienda/bolsa', 'D6', PUB, 'Bolsa', []),
  tiendaPago: ruta('/tienda/pago', 'D6', PUB, 'Pago', []),
  tiendaPedido: ruta('/tienda/pedido/:ventaId', 'D6', PUB, 'Pedido confirmado', ['ventaId']),
  tiendaCategoria: ruta('/tienda/:categoria', 'D6', PUB, 'Categoría', ['categoria'], { talla: texto, color: texto }),
  // --- F2-C (solo desarrollo) ---
  sistema: ruta('/panel/_sistema', 'F2-C', [D, V, B], 'Sistema de diseño', []),
} as const;

export type NombreRuta = keyof typeof RUTAS;

/** Parámetros globales que honran todas las rutas (5.5.1): `?hoy=` (QA) y `?marco=1` (marcos). */
export const PARAMS_GLOBALES = { hoy: texto, marco: enumeracion('1') } as const;

// ---------------------------------------------------------------------------------------------------------
// Constructores tipados
// ---------------------------------------------------------------------------------------------------------
type ValorCodec<C> = C extends Codec<infer T> ? T : never;
export type QueryDe<N extends NombreRuta> = {
  [K in keyof (typeof RUTAS)[N]['query']]?: ValorCodec<(typeof RUTAS)[N]['query'][K]> | null;
};
type Cadenas<T extends readonly unknown[]> = { -readonly [K in keyof T]: string };
type ArgsRuta<N extends NombreRuta> = [...Cadenas<(typeof RUTAS)[N]['params']>, query?: QueryDe<N>];

/** URL de una ruta: rellena los parámetros de ruta (codificados) y agrega la query (sin valores nulos). */
export function construirRuta<N extends NombreRuta>(nombre: N, ...args: ArgsRuta<N>): string {
  const def = RUTAS[nombre] as DefRuta;
  let url = def.patron;
  def.params.forEach((p, i) => {
    url = url.replace(`:${p}`, encodeURIComponent(String(args[i] ?? '')));
  });
  const query = (args[def.params.length] ?? {}) as Record<string, unknown>;
  const partes: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === null || v === undefined || v === '') continue;
    const codec = def.query[k];
    if (!codec) continue;
    partes.push(`${encodeURIComponent(k)}=${encodeURIComponent(codec.escribir(v))}`);
  }
  return partes.length ? `${url}?${partes.join('&')}` : url;
}

type Constructores = { [N in NombreRuta]: (...args: ArgsRuta<N>) => string };

/** `rutas.producto('HL-CAM-0142', { trasladar: { origen: 'zr', destino: 'usq', varianteId, cantidad: 3 } })` */
export const rutas: Constructores = Object.fromEntries(
  (Object.keys(RUTAS) as NombreRuta[]).map((n) => [n, (...args: unknown[]) => construirRuta(n, ...(args as never))]),
) as unknown as Constructores;

/** Agrega `?hoy=` a una URL que abre un contexto NUEVO (portal en otra pestaña, QR), 5.9. Sin `hoy`, la deja igual. */
export function propagarHoy(url: string, hoy: string | null): string {
  if (!hoy) return url;
  const [base, hash] = url.split('#');
  const sep = (base ?? '').includes('?') ? '&' : '?';
  return `${base}${sep}hoy=${encodeURIComponent(hoy)}${hash !== undefined ? `#${hash}` : ''}`;
}

// ---------------------------------------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------------------------------------
export type ParamsLeidos<N extends NombreRuta> = {
  [K in (typeof RUTAS)[N]['params'][number]]: string;
} & {
  [K in keyof (typeof RUTAS)[N]['query']]: ValorCodec<(typeof RUTAS)[N]['query'][K]> | null;
};

/** Lee los parámetros de una ruta (puro): de la ruta (`useParams`) y de la query (`location.search`). */
export function leerParamsRuta<N extends NombreRuta>(
  nombre: N,
  params: Readonly<Record<string, string | undefined>>,
  search: string | URLSearchParams,
): ParamsLeidos<N> {
  const def = RUTAS[nombre] as DefRuta;
  const sp = typeof search === 'string' ? new URLSearchParams(search) : search;
  const r: Record<string, unknown> = {};
  for (const p of def.params) r[p] = params[p] ?? '';
  for (const [k, codec] of Object.entries(def.query)) {
    const v = sp.get(k);
    r[k] = v === null ? null : codec.leer(v);
  }
  return r as ParamsLeidos<N>;
}

/** Ruta que corresponde a una URL (para guardas y pruebas). Prioriza las rutas estáticas sobre las dinámicas. */
export function rutaDeUrl(pathname: string): NombreRuta | null {
  const limpio = pathname.replace(/\/+$/, '') || '/';
  let mejor: { n: NombreRuta; estaticos: number } | null = null;
  for (const n of Object.keys(RUTAS) as NombreRuta[]) {
    const segP = RUTAS[n].patron.split('/');
    const segU = limpio.split('/');
    if (segP.length !== segU.length) continue;
    let estaticos = 0;
    let ok = true;
    for (let i = 0; i < segP.length; i++) {
      const s = segP[i] as string;
      if (s.startsWith(':')) continue;
      if (s !== segU[i]) {
        ok = false;
        break;
      }
      estaticos++;
    }
    if (ok && (!mejor || estaticos > mejor.estaticos)) mejor = { n, estaticos };
  }
  return mejor?.n ?? null;
}

// ---------------------------------------------------------------------------------------------------------
// Catálogo de eventos de interfaz (6.18)
// ---------------------------------------------------------------------------------------------------------
export interface DefEventoUI {
  emisor: Paquete | readonly Paquete[];
  donde: string;
  /** Datos que acompañan al evento. */
  datos?: string;
}

export const EVENTOS_UI = {
  moneda_cambiada: { emisor: 'F2-C', donde: 'Selector de moneda de la barra superior', datos: '{ a: "USD" | "CNY" | "COP" }' },
  rol_cambiado: { emisor: 'F2-C', donde: 'Selector de rol de la barra superior', datos: '{ a: "dueno" | "vendedor" | "bodega" }' },
  flujo_caja_visto: { emisor: 'B3', donde: 'Al montar /panel/pagos/flujo' },
  costo_empleador_visto: { emisor: 'C1', donde: 'Al montar la pestaña costo de un empleado o /panel/personal/comparativo', datos: '{ empleadoId?: string }' },
  pedido_sugerido_visto: { emisor: 'B1', donde: 'Al mostrarse la sugerencia calculada en /panel/importaciones/sugerir', datos: '{ proveedorId: string }' },
  whatsapp_escenario_completado: { emisor: 'D5', donde: 'Fin de un escenario de WhatsApp', datos: '{ escenario: string }' },
  whatsapp_respondido: { emisor: 'D5', donde: 'Respuesta del bot a texto libre' },
  qr_abierto: { emisor: 'E1', donde: 'Al abrir ModalAppDueno' },
  app_abierta: { emisor: 'E1', donde: 'Al montar /app sin ?marco=1' },
  tabla_dinamica_modificada: { emisor: 'D2', donde: 'Cambio de filas, columnas o medida de la tabla dinámica' },
  pdf_generado: { emisor: 'F2', donde: '<BotonExportar> (y plantillas PDF)', datos: '{ reporte: string }' },
  excel_generado: { emisor: 'F2', donde: '<BotonExportar>', datos: '{ reporte: string } ("contador" para "Exportar para tu contador")' },
  portal_enviado: { emisor: 'B1', donde: 'Envío del formulario de /seguimiento/:numero', datos: '{ numero: string }' },
  como_arrancariamos_visto: { emisor: 'E2', donde: 'Al montar la página "Cómo arrancaríamos"' },
  marca_personalizada: { emisor: ['E2', 'E3'], donde: 'Al guardar la marca del cliente' },
} as const satisfies Record<EventoUI, DefEventoUI>;

// ---------------------------------------------------------------------------------------------------------
// Catálogo de pistas contextuales (2.5): el paquete dueño coloca <Pista id> sobre el ancla
// ---------------------------------------------------------------------------------------------------------
export interface DefPista {
  paquete: Paquete;
  ruta: NombreRuta;
  ancla: string;
}

export const PISTAS = {
  'inicio.alertas': { paquete: 'D1', ruta: 'inicio', ancla: 'Lista "Requiere tu atención"' },
  'pos.escaneo': { paquete: 'A1', ruta: 'pos', ancla: 'Botón "Simular escaneo"' },
  'caja.arqueo': { paquete: 'A1', ruta: 'caja', ancla: 'Campo "Efectivo contado"' },
  'ventas.totales': { paquete: 'A3', ruta: 'ventas', ancla: 'Barra de totales del filtro' },
  'inventario.local': { paquete: 'A2', ruta: 'inventario', ancla: 'Filtro "Local" del catálogo' },
  'importaciones.estado': { paquete: 'B1', ruta: 'importacion', ancla: 'Botón de cambio de estado' },
  'importaciones.sugerir': { paquete: 'B1', ruta: 'sugerirPedido', ancla: 'Tabla de cantidades sugeridas' },
  'proveedores.moneda': { paquete: 'B2', ruta: 'proveedores', ancla: 'Selector de moneda de la barra superior' },
  'pagos.flujo': { paquete: 'B3', ruta: 'pagos', ancla: 'Pestaña "Flujo de caja"' },
  'pagos.datafono': { paquete: 'B3', ruta: 'pagos', ancla: 'Pestaña "Datáfono"' },
  'gastos.resultados': { paquete: 'B4', ruta: 'gastos', ancla: 'Pestaña "Estado de resultados"' },
  'personal.costo': { paquete: 'C1', ruta: 'personal', ancla: 'Columna "Costo para el negocio"' },
  'turnos.recargos': { paquete: 'C2', ruta: 'turnos', ancla: 'Total "Recargos estimados de la semana"' },
  'clientes.segmentos': { paquete: 'A4', ruta: 'clientes', ancla: 'Filtros de segmento' },
  'calendario.leyenda': { paquete: 'C3', ruta: 'calendario', ancla: 'Leyenda de tipos de evento' },
  'analisis.hallazgos': { paquete: 'D2', ruta: 'analisis', ancla: 'Bloque de hallazgos' },
  'facturacion.marca': { paquete: 'D3', ruta: 'factura', ancla: 'Marca de agua de la vista previa' },
  'canales.escenarios': { paquete: 'D5', ruta: 'canalWhatsapp', ancla: 'Selector de escenarios' },
  'reportes.contador': { paquete: 'D4', ruta: 'reportes', ancla: 'Tarjeta "Exportar para tu contador"' },
  'configuracion.restaurar': { paquete: 'E3', ruta: 'configDatos', ancla: 'Botón "Restaurar datos de demostración"' },
  'app.hoy': { paquete: 'E1', ruta: 'app', ancla: 'Cifra principal' },
  'tienda.franja': { paquete: 'D6', ruta: 'tienda', ancla: 'Franja superior' },
  'portal.formulario': { paquete: 'B1', ruta: 'seguimiento', ancla: 'Formulario de actualización' },
} as const satisfies Record<string, DefPista>;

export type IdPista = keyof typeof PISTAS;

/** ¿Puede este acceso ver la ruta? ('app' y 'publico' no dependen del rol). */
export function rolPuedeVer(nombre: NombreRuta, rol: Rol): boolean {
  const a = RUTAS[nombre].acceso as readonly AccesoRuta[];
  return a.includes('publico') || a.includes('app') || a.includes(rol);
}

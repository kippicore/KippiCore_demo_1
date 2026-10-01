import type { Categoria, COP, FechaHoraISO, Id, TipoPrenda } from '@/dominio/tipos';
import { calcularVenta } from '@/dominio/reglas/ventas';
import { normalizar } from '@/dominio/reglas/texto';
import type { EntradaAccion } from '@/estado';
import { METODOS_PAGO, SECCIONES } from './textos';
import type {
  CatalogoTienda,
  ColorTienda,
  DatosComprador,
  ErroresComprador,
  FiltroProductos,
  LineaBolsa,
  LineaBolsaDetalle,
  MetodoPago,
  OrdenProductos,
  ProductoTienda,
  SlugSeccion,
} from './tipos';

/**
 * Cálculos puros de la tienda web (D6): secciones, filtros, orden, bolsa, validación del comprador y armado de la
 * venta web. Ninguna regla de negocio se reimplementa: los totales salen de `calcularVenta` (V1) y el dominio
 * revalida todo al registrar la venta.
 */

// ---------------------------------------------------------------------------------------------------------
// Tallas
// ---------------------------------------------------------------------------------------------------------
const ORDEN_LETRAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

/** Letras (S M L XL XXL) en su orden, números de menor a mayor y 'Única' al final. */
export function ordenarTallas(tallas: readonly string[]): string[] {
  const rango = (t: string): [number, number] => {
    const i = ORDEN_LETRAS.indexOf(t);
    if (i >= 0) return [0, i];
    const n = Number(t);
    if (Number.isFinite(n)) return [1, n];
    return [2, 0];
  };
  return [...tallas].sort((a, b) => {
    const [ga, na] = rango(a);
    const [gb, nb] = rango(b);
    return ga !== gb ? ga - gb : na !== nb ? na - nb : a.localeCompare(b, 'es');
  });
}

// ---------------------------------------------------------------------------------------------------------
// Secciones, filtros y orden
// ---------------------------------------------------------------------------------------------------------
export function seccionPorSlug(slug: string | undefined) {
  return SECCIONES.find((s) => s.slug === slug) ?? null;
}

/** Productos de una sección de la tienda (novedades = temporada más reciente). */
export function productosDeSeccion(productos: readonly ProductoTienda[], slug: SlugSeccion): ProductoTienda[] {
  const s = seccionPorSlug(slug);
  if (!s) return [];
  if (!s.categorias) return productos.filter((p) => p.nuevo);
  const cats = s.categorias;
  return productos.filter((p) => cats.includes(p.categoria));
}

/** Sección a la que pertenece un producto (la primera que lo incluye por categoría; para las migas). */
export function seccionDeProducto(p: ProductoTienda): SlugSeccion {
  return SECCIONES.find((s) => s.categorias?.includes(p.categoria))?.slug ?? 'novedades';
}

export const FILTRO_VACIO: FiltroProductos = { tipos: [], talla: null, colorId: null, soloDisponibles: false };

export function filtrarProductos(productos: readonly ProductoTienda[], f: FiltroProductos): ProductoTienda[] {
  return productos.filter((p) => {
    if (f.tipos.length > 0 && !f.tipos.includes(p.categoria)) return false;
    if (f.soloDisponibles && p.unidades <= 0) return false;
    if (f.talla && !p.tallas.some((t) => t.talla === f.talla && t.unidades > 0)) return false;
    if (f.colorId && !p.colores.some((c) => c.id === f.colorId)) return false;
    return true;
  });
}

export function ordenarProductos(productos: readonly ProductoTienda[], orden: OrdenProductos): ProductoTienda[] {
  const lista = [...productos];
  const porReferencia = (a: ProductoTienda, b: ProductoTienda) => (a.referencia < b.referencia ? -1 : a.referencia > b.referencia ? 1 : 0);
  switch (orden) {
    case 'precio_asc':
      return lista.sort((a, b) => a.precio - b.precio || porReferencia(a, b));
    case 'precio_desc':
      return lista.sort((a, b) => b.precio - a.precio || porReferencia(a, b));
    case 'nombre':
      return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es') || porReferencia(a, b));
    default:
      return lista.sort((a, b) => Number(b.destacado) - Number(a.destacado) || Number(b.nuevo) - Number(a.nuevo) || porReferencia(a, b));
  }
}

/** Categorías presentes en una lista de productos, en el orden en que aparecen las secciones. */
export function tiposPresentes(productos: readonly ProductoTienda[]): Categoria[] {
  const orden = SECCIONES.flatMap((s) => s.categorias ?? []);
  const hay = new Set(productos.map((p) => p.categoria));
  return orden.filter((c) => hay.has(c));
}

/** Tallas con unidades en alguno de los productos. */
export function tallasDisponibles(productos: readonly ProductoTienda[]): string[] {
  const set = new Set<string>();
  for (const p of productos) for (const t of p.tallas) if (t.unidades > 0) set.add(t.talla);
  return ordenarTallas([...set]);
}

/** Colores distintos (por id) de una lista de productos. */
export function coloresPresentes(productos: readonly ProductoTienda[]): ColorTienda[] {
  const m = new Map<Id, ColorTienda>();
  for (const p of productos) for (const c of p.colores) if (!m.has(c.id)) m.set(c.id, c);
  return [...m.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** `?color=` puede traer el id (col_azn), el código (azn) o el nombre (azul marino); sin tildes ni mayúsculas. */
export function resolverColor(valor: string | null | undefined, colores: readonly ColorTienda[]): ColorTienda | null {
  if (!valor) return null;
  const v = normalizar(valor).replace(/[-_\s]+/g, ' ');
  return (
    colores.find((c) => normalizar(c.id) === normalizar(valor)) ??
    colores.find((c) => normalizar(c.codigo) === v) ??
    colores.find((c) => normalizar(c.nombre) === v) ??
    null
  );
}

/** Color que se muestra primero: el pedido, si existe; si no, el primero con existencias. */
export function colorInicial(p: ProductoTienda, pedido?: string | null): ColorTienda | null {
  return resolverColor(pedido, p.colores) ?? p.colores.find((c) => c.unidades > 0) ?? p.colores[0] ?? null;
}

/** "A, B y C". */
export function listaNatural(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

export interface NotaExistencias {
  tono: 'warning' | 'muted';
  texto: string;
}

/**
 * Nota bajo la talla (PLAN 8.6.5): lo que queda para envío en el local de despacho y dónde más hay. `stock` es null
 * mientras no se elige talla.
 */
export function notaExistencias(o: { stock: number | null; despacho: string; otros: readonly string[] }): NotaExistencias {
  const { stock, despacho, otros } = o;
  if (stock === null) {
    return {
      tono: 'muted',
      texto: otros.length > 0 ? `Sale desde ${despacho}. También en ${listaNatural(otros)}.` : `Sale desde ${despacho}.`,
    };
  }
  if (stock <= 0) {
    return {
      tono: 'warning',
      texto: otros.length > 0 ? `Agotada para envío. Puedes recogerla en ${listaNatural(otros)}.` : 'Agotada por ahora.',
    };
  }
  if (stock <= 3) {
    // Lo que queda es lo del local de despacho: si en otra tienda hay más, se dice (no parece que se agote).
    const queda = stock === 1 ? 'Queda 1 para envío' : `Quedan ${stock} para envío`;
    return { tono: 'warning', texto: otros.length > 0 ? `${queda} · disponible en otras tiendas` : queda };
  }
  return { tono: 'muted', texto: `Disponible para envío desde ${despacho}` };
}

// ---------------------------------------------------------------------------------------------------------
// Bolsa
// ---------------------------------------------------------------------------------------------------------
/** Tope por línea: lo que hay en el local de despacho (y 10 como máximo por prenda). */
export const MAXIMO_POR_LINEA = 10;

export function agregarALinea(lineas: readonly LineaBolsa[], varianteId: Id, cantidad: number, stock: number): LineaBolsa[] {
  const tope = Math.max(0, Math.min(stock, MAXIMO_POR_LINEA));
  const existente = lineas.find((l) => l.varianteId === varianteId);
  if (!existente) return tope > 0 ? [...lineas, { varianteId, cantidad: Math.min(cantidad, tope) }] : [...lineas];
  return lineas.map((l) => (l.varianteId === varianteId ? { ...l, cantidad: Math.min(l.cantidad + cantidad, tope) } : l));
}

export function fijarCantidadLinea(lineas: readonly LineaBolsa[], varianteId: Id, cantidad: number, stock: number): LineaBolsa[] {
  const tope = Math.max(0, Math.min(stock, MAXIMO_POR_LINEA));
  if (cantidad <= 0 || tope === 0) return lineas.filter((l) => l.varianteId !== varianteId);
  return lineas.map((l) => (l.varianteId === varianteId ? { ...l, cantidad: Math.min(cantidad, tope) } : l));
}

export function quitarLinea(lineas: readonly LineaBolsa[], varianteId: Id): LineaBolsa[] {
  return lineas.filter((l) => l.varianteId !== varianteId);
}

export function unidadesEnBolsa(lineas: readonly LineaBolsa[]): number {
  return lineas.reduce((a, l) => a + l.cantidad, 0);
}

/** Une la bolsa con el inventario de hoy; descarta las variantes que ya no existen. */
export function detalleBolsa(lineas: readonly LineaBolsa[], catalogo: CatalogoTienda): LineaBolsaDetalle[] {
  const porId = new Map(catalogo.productos.map((p) => [p.id, p]));
  const r: LineaBolsaDetalle[] = [];
  for (const l of lineas) {
    const variante = catalogo.variantes[l.varianteId];
    const producto = variante ? porId.get(variante.productoId) : undefined;
    const color = producto?.colores.find((c) => c.id === variante?.colorId);
    if (!variante || !producto || !color) continue;
    r.push({ varianteId: l.varianteId, cantidad: l.cantidad, producto, variante, color, precio: producto.precio, total: producto.precio * l.cantidad, stock: variante.stock });
  }
  return r;
}

export interface TotalesBolsa {
  unidades: number;
  /** Total con IVA (lo que paga el comprador). */
  total: COP;
  /** IVA incluido en el total. */
  iva: COP;
  base: COP;
}

/** Totales con la misma regla de la venta (V1): precios con IVA incluido, sin descuentos ni envío. */
export function totalesBolsa(lineas: readonly LineaBolsaDetalle[]): TotalesBolsa {
  const t = calcularVenta(
    lineas.map((l) => ({ precioLista: l.precio, cantidad: l.cantidad, descuento: null, tarifaIva: l.producto.tarifaIva })),
    null,
  );
  return { unidades: lineas.reduce((a, l) => a + l.cantidad, 0), total: t.total, iva: t.iva, base: t.base };
}

/** Líneas cuya cantidad pasa lo que hay: hay que ajustarlas antes de pagar. */
export function lineasConProblema(lineas: readonly LineaBolsaDetalle[]): LineaBolsaDetalle[] {
  return lineas.filter((l) => l.cantidad > l.stock);
}

// ---------------------------------------------------------------------------------------------------------
// Comprador y venta web
// ---------------------------------------------------------------------------------------------------------
const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_CELULAR = /^3\d{9}$/;

/** Solo dígitos: acepta "310 555 0142" y "+57 310 555 0142". */
export function normalizarCelular(texto: string): string {
  const d = texto.replace(/\D/g, '');
  return d.length === 12 && d.startsWith('57') ? d.slice(2) : d;
}

export const COMPRADOR_VACIO: DatosComprador = {
  nombres: '',
  apellidos: '',
  correo: '',
  celular: '',
  direccion: '',
  complemento: '',
  barrio: '',
  ciudad: 'Bogotá',
  autorizacion: false,
};

export function validarComprador(d: DatosComprador): ErroresComprador {
  const e: ErroresComprador = {};
  if (!d.nombres.trim()) e.nombres = 'Escribe tu nombre.';
  if (!d.apellidos.trim()) e.apellidos = 'Escribe tu apellido.';
  if (!RE_CORREO.test(d.correo.trim())) e.correo = 'Escribe un correo válido.';
  if (!RE_CELULAR.test(normalizarCelular(d.celular))) e.celular = 'Escribe un celular de 10 dígitos que empiece por 3.';
  if (!d.direccion.trim()) e.direccion = 'Escribe la dirección de entrega.';
  if (!d.barrio.trim()) e.barrio = 'Escribe el barrio.';
  if (!d.ciudad.trim()) e.ciudad = 'Elige la ciudad.';
  if (!d.autorizacion) e.autorizacion = 'Acepta el tratamiento de tus datos para continuar.';
  return e;
}

/** Nombre de pila para el saludo: "Andrés Felipe" → "Andrés". */
export function primerNombre(nombres: string): string {
  return nombres.trim().split(/\s+/)[0] ?? '';
}

export function etiquetaMetodo(m: MetodoPago): string {
  return METODOS_PAGO.find((x) => x.valor === m)?.etiqueta ?? m;
}

export interface EntradaVentaWeb {
  lineas: readonly LineaBolsa[];
  comprador: DatosComprador;
  metodo: MetodoPago;
  /** Total con IVA de `totalesBolsa`. */
  total: COP;
  localId: Id;
  vendedorId: Id;
  /** Cliente que ya existe con ese celular (la venta se suma a su historial) o null para crearlo. */
  clienteExistenteId: Id | null;
  ahora: FechaHoraISO;
}

/**
 * Datos del comando `venta.registrar` de una compra web: canal 'web', de contado, un solo pago con la pasarela
 * simulada, saliendo del local de despacho. La dirección viaja en la nota de la venta.
 */
export function armarVentaWeb(o: EntradaVentaWeb): EntradaAccion<'venta.registrar'> {
  const c = o.comprador;
  const celular = normalizarCelular(c.celular);
  const referencia = METODOS_PAGO.find((m) => m.valor === o.metodo)?.referencia ?? 'Pago simulado';
  const direccion = [c.direccion.trim(), c.complemento.trim()].filter(Boolean).join(', ');
  return {
    ts: null,
    localId: o.localId,
    vendedorId: o.vendedorId,
    canal: 'web',
    tipo: 'contado',
    clienteId: o.clienteExistenteId,
    clienteNuevo: o.clienteExistenteId
      ? null
      : {
          nombres: c.nombres.trim(),
          apellidos: c.apellidos.trim(),
          documento: null,
          celular,
          correo: c.correo.trim().toLowerCase(),
          cumpleanos: null,
          anioNacimiento: null,
          barrio: c.barrio.trim(),
          canalPreferido: 'correo',
          tratamiento: 'tu',
          autorizacionDatos: { aceptada: c.autorizacion, fecha: o.ahora, canal: 'web' },
          tallasDeclaradas: {},
          canalAlta: 'web',
          localRegistroId: o.localId,
          registradoPorId: null,
        },
    lineas: o.lineas.map((l) => ({ varianteId: l.varianteId, cantidad: l.cantidad, precioLista: null, descuento: null })),
    descuentoGlobal: null,
    aprobacionDescuentoId: null,
    pagos: [{ medio: 'pasarela_web', valor: o.total, recibido: null, referencia, sesionCajaId: null, bonoId: null }],
    fechaLimiteSeparado: null,
    ventaOrigenCambioId: null,
    facturaInmediata: null,
    nota: `Pedido de la tienda web · Entrega: ${direccion}, ${c.barrio.trim()}, ${c.ciudad}`,
  };
}

/** Productos de la misma sección para "También te puede gustar" (sin el actual, con existencias primero). */
export function productosRelacionados(productos: readonly ProductoTienda[], actual: ProductoTienda, n: number): ProductoTienda[] {
  const misma = productos.filter((p) => p.id !== actual.id && p.categoria === actual.categoria);
  const otros = productos.filter((p) => p.id !== actual.id && p.categoria !== actual.categoria && seccionDeProducto(p) === seccionDeProducto(actual));
  return ordenarProductos([...misma, ...otros].filter((p) => p.unidades > 0), 'destacados').slice(0, n);
}

/** Una prenda de un tipo para ilustrar la portada: la primera con existencias, en el color preferido si lo tiene. */
export function prendaDestacada(
  productos: readonly ProductoTienda[],
  tipo: TipoPrenda,
  coloresPreferidos: readonly Id[],
): { producto: ProductoTienda; color: ColorTienda } | null {
  const candidatos = ordenarProductos(productos.filter((p) => p.tipoPrenda === tipo && p.unidades > 0), 'destacados');
  for (const id of coloresPreferidos) {
    for (const p of candidatos) {
      const color = p.colores.find((c) => c.id === id && c.unidades > 0);
      if (color) return { producto: p, color };
    }
  }
  const p = candidatos[0];
  const color = p ? colorInicial(p) : null;
  return p && color ? { producto: p, color } : null;
}

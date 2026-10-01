import type { Categoria, COP, FechaISO, Id } from '@/dominio/tipos';
import { sumarDias } from '@/dominio/reglas/fechas';
import { NOMBRES_CATEGORIA } from '@/seed/catalogo';
import {
  crearSelector,
  hechosEnFechas,
  hechosEnRango,
  selMapaCalor,
  selMediosDePago,
  selMetricasClientes,
  selRotacion,
  selSinMovimiento,
  selTallasYColores,
  type DiasInventario,
  type SinMovimiento,
} from '@/selectores';
import { estadoRotacion, posicionNatural, type EstadoRotacion } from './calculos';

/**
 * Selectores locales de Análisis (D2). Componen los de `@/selectores` (las reglas de ventas reconocidas, segmentos,
 * días de inventario y medios de pago viven allá) y declaran TODAS las tablas que leen, directa o indirectamente
 * (verificado en `selectores.test.ts`).
 */

// ---------------------------------------------------------------------------------------------------------
// Más y menos vendidos, con filtros por categoría, talla y color
// ---------------------------------------------------------------------------------------------------------
export type MedidaVendido = 'unidades' | 'valor' | 'margen';

export interface FilaVendido {
  productoId: Id;
  referencia: string;
  nombre: string;
  categoria: Categoria;
  unidades: number;
  valor: COP;
  margen: COP;
  /** Participación en el total de la medida elegida (fracción). */
  participacion: number;
}

export interface Vendidos {
  mas: FilaVendido[];
  menos: FilaVendido[];
  /** Totales del filtro (netos: las devoluciones restan, V4). */
  total: { unidades: number; valor: COP; margen: COP };
  /** Referencias distintas con ventas en el filtro. */
  referencias: number;
}

const TABLAS_VENTAS = ['ventas', 'devoluciones', 'productos', 'variantes'] as const;

/**
 * Los productos más y menos vendidos del período, por unidades, valor o margen, con filtro opcional por categoría,
 * talla y color (talla y color son los de la variante vendida). Mismas reglas que `selTopProductos` (hechos V4).
 */
export const selVendidos = crearSelector<
  { desde: FechaISO; hasta: FechaISO; localId: Id | 'todos'; categoria: Categoria | null; talla: string | null; colorId: Id | null; medida: MedidaVendido; n: number },
  Vendidos
>('selVendidosD2', TABLAS_VENTAS, (e, { desde, hasta, localId, categoria, talla, colorId, medida, n }) => {
  const m = new Map<Id, Omit<FilaVendido, 'participacion'>>();
  const total = { unidades: 0, valor: 0, margen: 0 };
  for (const h of hechosEnRango(hechosEnFechas(e, { desde, hasta }), desde, hasta, localId)) {
    if (categoria && h.categoria !== categoria) continue;
    if (talla && h.talla !== talla) continue;
    if (colorId && h.colorId !== colorId) continue;
    let t = m.get(h.productoId);
    if (!t) {
      const p = e.productos[h.productoId];
      t = { productoId: h.productoId, referencia: p?.referencia ?? '', nombre: p?.nombre ?? '', categoria: p?.categoria ?? 'accesorios', unidades: 0, valor: 0, margen: 0 };
      m.set(h.productoId, t);
    }
    t.unidades += h.cantidad;
    t.valor += h.total;
    t.margen += h.base - h.costo;
    total.unidades += h.cantidad;
    total.valor += h.total;
    total.margen += h.base - h.costo;
  }
  const clave = medida;
  const base = total[clave] || 1;
  const lista = [...m.values()]
    .filter((x) => x.unidades > 0)
    .map((x) => ({ ...x, participacion: x[clave] / base }))
    .sort((a, b) => b[clave] - a[clave] || (a.referencia < b.referencia ? -1 : 1));
  return {
    mas: lista.slice(0, n),
    menos: lista.length > n ? [...lista].reverse().slice(0, n) : [],
    total,
    referencias: lista.length,
  };
});

// ---------------------------------------------------------------------------------------------------------
// Opciones de los filtros
// ---------------------------------------------------------------------------------------------------------
export interface OpcionesFiltroProductos {
  categorias: { valor: Categoria; etiqueta: string }[];
  tallas: string[];
  colores: { id: Id; nombre: string }[];
}

export const selOpcionesFiltroProductos = crearSelector<void, OpcionesFiltroProductos>('selOpcionesFiltroProductosD2', ['productos', 'variantes', 'colores'], (e) => {
  const categorias = new Set<Categoria>();
  const tallas = new Set<string>();
  const colores = new Set<Id>();
  for (const p of Object.values(e.productos)) if (!p.eliminadoEn) categorias.add(p.categoria);
  for (const v of Object.values(e.variantes)) {
    if (v.eliminadoEn || e.productos[v.productoId]?.eliminadoEn) continue;
    tallas.add(v.talla);
    colores.add(v.colorId);
  }
  return {
    categorias: (Object.keys(NOMBRES_CATEGORIA) as Categoria[]).filter((c) => categorias.has(c)).map((c) => ({ valor: c, etiqueta: NOMBRES_CATEGORIA[c] })),
    tallas: [...tallas].sort((a, b) => posicionNatural('talla', a) - posicionNatural('talla', b) || (a < b ? -1 : 1)),
    colores: [...colores].map((id) => ({ id, nombre: e.colores[id]?.nombre ?? id })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  };
});

/** La fábrica a la que más referencias de la categoría le compras: el destino de "Sugerir pedido". */
export const selProveedorDeCategoria = crearSelector<{ categoria: Categoria }, { id: Id; nombre: string } | null>(
  'selProveedorDeCategoriaD2',
  ['productos', 'proveedores'],
  (e, { categoria }) => {
    const n = new Map<Id, number>();
    for (const p of Object.values(e.productos)) if (!p.eliminadoEn && p.categoria === categoria) n.set(p.proveedorId, (n.get(p.proveedorId) ?? 0) + 1);
    const mejor = [...n.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
    const pr = mejor ? e.proveedores[mejor[0]] : undefined;
    return pr ? { id: pr.id, nombre: pr.nombreCorto } : null;
  },
);

// ---------------------------------------------------------------------------------------------------------
// Colores que rotan (con su tendencia de los últimos 90 días contra los 90 anteriores)
// ---------------------------------------------------------------------------------------------------------
export interface ColorRota {
  colorId: Id;
  nombre: string;
  hex: string;
  patron: 'liso' | 'rayas' | 'cuadros';
  unidades: number;
  proporcion: number;
  /** Participación en los últimos 90 días y en los 90 anteriores. */
  recienteProporcion: number;
  previaProporcion: number;
  /** Cambio en puntos de participación (0,05 = sube 5 puntos). */
  cambio: number;
}

export const selColoresQueRotan = crearSelector<{ categoria: Categoria; desde: FechaISO; hasta: FechaISO; hoy: FechaISO }, ColorRota[]>(
  'selColoresQueRotanD2',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'colores', 'meta'],
  (e, { categoria, desde, hasta, hoy }) => {
    const principal = selTallasYColores(e, { categoria, desde, hasta });
    const reciente = selTallasYColores(e, { categoria, desde: sumarDias(hoy, -89), hasta: hoy });
    const previa = selTallasYColores(e, { categoria, desde: sumarDias(hoy, -179), hasta: sumarDias(hoy, -90) });
    const prop = (r: typeof reciente, id: Id) => r.colores.find((c) => c.colorId === id)?.proporcion ?? 0;
    return principal.colores.map((c) => {
      const rec = prop(reciente, c.colorId);
      const pre = prop(previa, c.colorId);
      return {
        colorId: c.colorId,
        nombre: c.nombre,
        hex: e.colores[c.colorId]?.hex ?? '#BDBDBD',
        patron: e.colores[c.colorId]?.patron ?? 'liso',
        unidades: c.unidades,
        proporcion: c.proporcion,
        recienteProporcion: rec,
        previaProporcion: pre,
        cambio: rec - pre,
      };
    });
  },
);

// ---------------------------------------------------------------------------------------------------------
// Rotación, días de inventario y mercancía dormida
// ---------------------------------------------------------------------------------------------------------
export interface FilaRotacion extends DiasInventario {
  estado: EstadoRotacion;
}

export interface ResumenRotacion {
  tienda: DiasInventario;
  categorias: FilaRotacion[];
  dormidas: SinMovimiento[];
  dormidasACosto: COP;
}

export const selResumenRotacion = crearSelector<{ hoy: FechaISO; diasSinMovimiento: number }, ResumenRotacion>(
  'selResumenRotacionD2',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'agregados'],
  (e, { hoy, diasSinMovimiento }) => {
    const rot = selRotacion(e, { hoy });
    const dormidas = selSinMovimiento(e, { dias: diasSinMovimiento, hoy });
    return {
      tienda: rot.tienda,
      categorias: rot.categorias
        .filter((c) => c.unidades > 0 || c.vendidas90 > 0)
        .map((c) => ({ ...c, estado: estadoRotacion(c.dias, c.unidades, c.vendidas90, rot.tienda.dias) })),
      dormidas,
      dormidasACosto: dormidas.reduce((s, d) => s + d.aCosto, 0),
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Clientes: consumidor final, nuevos y recurrentes, ticket por segmento y canal
// ---------------------------------------------------------------------------------------------------------
export interface FilaSegmentoPeriodo {
  /** 'vip' | 'frecuente' | … | 'consumidor_final'. */
  id: string;
  etiqueta: string;
  clientes: number;
  ventas: number;
  valor: COP;
  ticket: COP;
  participacion: number;
}

export interface FilaCanalPeriodo {
  id: string;
  ventas: number;
  valor: COP;
  participacion: number;
}

export interface ClientesPeriodo {
  ventas: number;
  valor: COP;
  /** Ventas a consumidor final (fracción del número de ventas). */
  consumidorFinal: number;
  conCliente: number;
  ticketConCliente: COP;
  ticketConsumidorFinal: COP;
  clientes: number;
  nuevos: number;
  recurrentes: number;
  valorNuevos: COP;
  valorRecurrentes: COP;
  /** Compras promedio de los clientes que compraron en el período. */
  comprasPorCliente: number;
  segmentos: FilaSegmentoPeriodo[];
  canales: FilaCanalPeriodo[];
}

const ETIQUETA_SEGMENTO: Record<string, string> = {
  vip: 'VIP',
  frecuente: 'Frecuente',
  ocasional: 'Ocasional',
  en_riesgo: 'En riesgo',
  nuevo: 'Nuevo',
  consumidor_final: 'Consumidor final',
};

/**
 * Comportamiento de clientes del período con las mismas ventas reconocidas de todo el sistema (V4): sin anuladas ni
 * separados cancelados. "Nuevo" = su primera compra cae dentro del período; "recurrente" = ya había comprado antes.
 */
export const selClientesPeriodo = crearSelector<{ desde: FechaISO; hasta: FechaISO; hoy: FechaISO }, ClientesPeriodo>(
  'selClientesPeriodoD2',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'clientes', 'parametros'],
  (e, { desde, hasta, hoy }) => {
    const met = selMetricasClientes(e, { hoy });
    let ventas = 0;
    let valor = 0;
    let conCliente = 0;
    let valorCon = 0;
    let valorFinal = 0;
    const porCliente = new Map<Id, { n: number; valor: number }>();
    const porSeg = new Map<string, { clientes: Set<Id>; ventas: number; valor: number }>();
    const porCanal = new Map<string, { ventas: number; valor: number }>();
    for (const v of Object.values(e.ventas)) {
      if (v.anulacion || v.separado?.cerrado?.resultado === 'cancelado') continue;
      const f = v.ts.slice(0, 10);
      if (f < desde || f > hasta) continue;
      ventas += 1;
      valor += v.total;
      const canal = porCanal.get(v.canal) ?? { ventas: 0, valor: 0 };
      canal.ventas += 1;
      canal.valor += v.total;
      porCanal.set(v.canal, canal);
      const segId = v.clienteId ? (met[v.clienteId]?.segmento ?? 'nuevo') : 'consumidor_final';
      const s = porSeg.get(segId) ?? { clientes: new Set<Id>(), ventas: 0, valor: 0 };
      s.ventas += 1;
      s.valor += v.total;
      if (v.clienteId) s.clientes.add(v.clienteId);
      porSeg.set(segId, s);
      if (!v.clienteId) {
        valorFinal += v.total;
        continue;
      }
      conCliente += 1;
      valorCon += v.total;
      const c = porCliente.get(v.clienteId) ?? { n: 0, valor: 0 };
      c.n += 1;
      c.valor += v.total;
      porCliente.set(v.clienteId, c);
    }
    let nuevos = 0;
    let recurrentes = 0;
    let valorNuevos = 0;
    let valorRecurrentes = 0;
    let compras = 0;
    for (const [id, c] of porCliente) {
      const primera = met[id]?.primeraCompra ?? null;
      if (primera !== null && primera >= desde) {
        nuevos += 1;
        valorNuevos += c.valor;
      } else {
        recurrentes += 1;
        valorRecurrentes += c.valor;
      }
      compras += c.n;
    }
    const orden = ['vip', 'frecuente', 'ocasional', 'en_riesgo', 'nuevo', 'consumidor_final'];
    return {
      ventas,
      valor,
      consumidorFinal: ventas ? 1 - conCliente / ventas : 0,
      conCliente,
      ticketConCliente: conCliente ? Math.round(valorCon / conCliente) : 0,
      ticketConsumidorFinal: ventas - conCliente ? Math.round(valorFinal / (ventas - conCliente)) : 0,
      clientes: porCliente.size,
      nuevos,
      recurrentes,
      valorNuevos,
      valorRecurrentes,
      comprasPorCliente: porCliente.size ? compras / porCliente.size : 0,
      segmentos: orden
        .filter((id) => porSeg.has(id))
        .map((id) => {
          const s = porSeg.get(id);
          return {
            id,
            etiqueta: ETIQUETA_SEGMENTO[id] ?? id,
            clientes: s?.clientes.size ?? 0,
            ventas: s?.ventas ?? 0,
            valor: s?.valor ?? 0,
            ticket: s && s.ventas ? Math.round(s.valor / s.ventas) : 0,
            participacion: valor ? (s?.valor ?? 0) / valor : 0,
          };
        }),
      canales: [...porCanal.entries()]
        .map(([id, x]) => ({ id, ventas: x.ventas, valor: x.valor, participacion: valor ? x.valor / valor : 0 }))
        .sort((a, b) => b.valor - a.valor),
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Medios de pago: el último mes contra el mismo mes de hace un año (P9)
// ---------------------------------------------------------------------------------------------------------
export interface FilaMedio {
  medio: string;
  ahora: number;
  antes: number | null;
}

export interface MediosComparados {
  filas: FilaMedio[];
  /** Proporción de pagos digitales (Nequi, Daviplata, transferencia, QR). */
  digitalAhora: number;
  digitalAntes: number | null;
  hayAnterior: boolean;
}

const DIGITALES = ['nequi', 'daviplata', 'transferencia', 'qr_bre_b'];

export const selMediosComparados = crearSelector<{ hoy: FechaISO }, MediosComparados>('selMediosComparadosD2', ['ventas', 'meta'], (e, { hoy }) => {
  const desde = sumarDias(hoy, -30);
  const hasta = sumarDias(hoy, -1);
  const ahora = selMediosDePago(e, { desde, hasta });
  const antesDesde = sumarDias(desde, -365);
  const hayAnterior = antesDesde >= e.meta.inicioVentana;
  const antes = hayAnterior ? selMediosDePago(e, { desde: antesDesde, hasta: sumarDias(hasta, -365) }) : null;
  const suma = (l: { medio: string; proporcion: number }[] | null) => (l ? l.filter((x) => DIGITALES.includes(x.medio)).reduce((s, x) => s + x.proporcion, 0) : null);
  const medios = new Set([...ahora.map((x) => x.medio), ...(antes?.map((x) => x.medio) ?? [])]);
  const filas = [...medios]
    .map((medio) => ({
      medio,
      ahora: ahora.find((x) => x.medio === medio)?.proporcion ?? 0,
      antes: antes ? (antes.find((x) => x.medio === medio)?.proporcion ?? 0) : null,
    }))
    .sort((a, b) => b.ahora - a.ahora);
  return { filas, digitalAhora: suma(ahora) ?? 0, digitalAntes: suma(antes), hayAnterior };
});

// ---------------------------------------------------------------------------------------------------------
// Domingos por local (P8)
// ---------------------------------------------------------------------------------------------------------
export interface DomingoLocal {
  localId: Id;
  nombre: string;
  /** Ventas netas de los domingos del período (con IVA). */
  domingo: COP;
  /** Ventas netas de todo el período en ese local. */
  total: COP;
}

/** Ventas de los domingos de cada local que vende, para ver cuál se mueve más ese día. */
export const selDomingoPorLocal = crearSelector<{ desde: FechaISO; hasta: FechaISO }, DomingoLocal[]>(
  'selDomingoPorLocalD2',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'locales'],
  (e, { desde, hasta }) =>
    Object.values(e.locales)
      .filter((l) => l.vende && !l.eliminadoEn)
      .sort((a, b) => a.orden - b.orden)
      .map((l) => {
        const m = selMapaCalor(e, { desde, hasta, localId: l.id });
        const suma = (f: readonly number[] | undefined) => (f ?? []).reduce((a, b) => a + b, 0);
        return { localId: l.id, nombre: l.nombre, domingo: suma(m.valores[6]), total: m.valores.reduce((s, f) => s + suma(f), 0) };
      }),
);

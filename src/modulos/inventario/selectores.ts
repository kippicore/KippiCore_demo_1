import type {
  Color,
  ConteoFisico,
  EstadoDominio,
  EstadoImportacion,
  FechaISO,
  Id,
  Importacion,
  Producto,
  RefDocumento,
  Traslado,
  Variante,
} from '@/dominio/tipos';
import { llegadaABodega } from '@/dominio/reglas/importaciones';
import { ESTADOS_IMPORTACION } from '@/dominio/tipos';
import { sumarDias } from '@/dominio/reglas/fechas';
import { CURVAS_TALLAS } from '@/seed/tallas';
import {
  crearSelector,
  existencia,
  hechosEnFechas,
  selEnCaminoPorVariante,
  selKardex,
  type EnCaminoVariante,
  type FilaKardex,
  type HechoVenta,
} from '@/selectores';
import { diferenciaConteo, ordenarTallas } from './calculos';

/**
 * Selectores locales de Inventario (A2). Componen los selectores compartidos (existencias, kárdex, hechos de
 * venta, en camino) y les agregan nombres y agrupaciones para la pantalla; no reimplementan ninguna regla de
 * negocio. Cada uno declara TODAS las tablas que lee (la verificación de tablas de las pruebas lo comprueba).
 */

// ---------------------------------------------------------------------------------------------------------
// Utilidades de lectura
// ---------------------------------------------------------------------------------------------------------
function nombrePersona(e: EstadoDominio, id: Id): string {
  const emp = e.empleados[id];
  if (emp) return `${emp.nombres} ${emp.apellidos.split(' ')[0] ?? ''}`.trim();
  return e.usuarios[id]?.nombre ?? id;
}

function nombreLocal(e: EstadoDominio, id: Id): string {
  return e.locales[id]?.nombre ?? id;
}

interface VarianteVista {
  variante: Variante;
  producto: Producto;
  color: Color | null;
}

function vistaDeVariante(e: EstadoDominio, varianteId: Id): VarianteVista | null {
  const v = e.variantes[varianteId];
  const p = v ? e.productos[v.productoId] : undefined;
  if (!v || !p) return null;
  return { variante: v, producto: p, color: e.colores[v.colorId] ?? null };
}

// ---------------------------------------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------------------------------------
export const selColoresActivos = crearSelector<void, Color[]>('selColoresInventario', ['colores'], (e) =>
  Object.values(e.colores).sort((a, b) => (a.nombre < b.nombre ? -1 : 1)),
);

export const selFabricas = crearSelector<void, { id: Id; nombre: string }[]>('selFabricasInventario', ['proveedores'], (e) =>
  Object.values(e.proveedores)
    .filter((p) => p.tipo === 'fabrica' && !p.eliminadoEn)
    .map((p) => ({ id: p.id, nombre: p.nombreCorto }))
    .sort((a, b) => (a.nombre < b.nombre ? -1 : 1)),
);

const ORDEN_TALLAS = [...new Set(Object.values(CURVAS_TALLAS).flat())];

export interface OpcionesCatalogo {
  tallas: string[];
  colores: Color[];
  proveedores: { id: Id; nombre: string }[];
}

/** Las tallas y colores que de verdad existen en el catálogo, y las fábricas, para los filtros. */
export const selOpcionesCatalogo = crearSelector<void, OpcionesCatalogo>(
  'selOpcionesCatalogo',
  ['variantes', 'colores', 'proveedores'],
  (e) => {
    const tallas = new Set<string>();
    const colorIds = new Set<Id>();
    for (const v of Object.values(e.variantes)) {
      if (v.eliminadoEn) continue;
      tallas.add(v.talla);
      colorIds.add(v.colorId);
    }
    return {
      tallas: [...tallas].sort((a, b) => ORDEN_TALLAS.indexOf(a) - ORDEN_TALLAS.indexOf(b)),
      colores: [...colorIds].map((id) => e.colores[id]).filter((c): c is Color => !!c).sort((a, b) => (a.nombre < b.nombre ? -1 : 1)),
      proveedores: selFabricas(e),
    };
  },
);

/** Colores de cada referencia, en el orden en que aparecen sus variantes (las muestras de la tarjeta). */
export const selColoresPorProducto = crearSelector<void, Record<Id, Color[]>>(
  'selColoresPorProducto',
  ['variantes', 'colores'],
  (e) => {
    const r: Record<Id, Color[]> = {};
    for (const v of Object.values(e.variantes)) {
      if (v.eliminadoEn) continue;
      const c = e.colores[v.colorId];
      if (!c) continue;
      const lista = (r[v.productoId] ??= []);
      if (!lista.some((x) => x.id === c.id)) lista.push(c);
    }
    return r;
  },
);

export interface EnCaminoProducto {
  unidades: number;
  fechaEstimada: FechaISO;
  numero: string;
}

/** Unidades en camino por referencia (importaciones confirmadas y no recibidas) con la llegada más próxima. */
export const selEnCaminoPorProducto = crearSelector<void, Record<Id, EnCaminoProducto>>(
  'selEnCaminoPorProducto',
  ['importaciones', 'variantes'],
  (e) => {
    const r: Record<Id, EnCaminoProducto> = {};
    for (const [varianteId, ec] of Object.entries(selEnCaminoPorVariante(e))) {
      const pid = e.variantes[varianteId]?.productoId;
      if (!pid) continue;
      const a = r[pid];
      if (!a) r[pid] = { unidades: ec.unidades, fechaEstimada: ec.fechaEstimada, numero: ec.numero };
      else {
        a.unidades += ec.unidades;
        if (ec.fechaEstimada < a.fechaEstimada) {
          a.fechaEstimada = ec.fechaEstimada;
          a.numero = ec.numero;
        }
      }
    }
    return r;
  },
);

// ---------------------------------------------------------------------------------------------------------
// Ficha: variantes y matriz
// ---------------------------------------------------------------------------------------------------------
export interface FilaVariante {
  variante: Variante;
  color: Color;
  /** Existencias por local (incluida la bodega). */
  existencias: Record<Id, number>;
  total: number;
  enCamino: EnCaminoVariante | null;
}

/** Variantes de una referencia (por color y talla de la curva) con existencias por local y "En camino". */
export const selVariantesDetalle = crearSelector<{ productoId: Id }, FilaVariante[]>(
  'selVariantesDetalle',
  ['productos', 'variantes', 'colores', 'locales', 'agregados', 'importaciones'],
  (e, { productoId }) => {
    const p = e.productos[productoId];
    if (!p) return [];
    const locales = Object.values(e.locales).filter((l) => !l.eliminadoEn);
    const camino = selEnCaminoPorVariante(e);
    const vs = Object.values(e.variantes).filter((v) => v.productoId === productoId && !v.eliminadoEn);
    const colores: Id[] = [];
    for (const v of vs) if (!colores.includes(v.colorId)) colores.push(v.colorId);
    const tallas = ordenarTallas([...new Set(vs.map((v) => v.talla))], p.curvaTallas);
    const filas: FilaVariante[] = [];
    for (const c of colores)
      for (const t of tallas) {
        const v = vs.find((x) => x.colorId === c && x.talla === t);
        const color = e.colores[c];
        if (!v || !color) continue;
        const ex: Record<Id, number> = {};
        let total = 0;
        for (const l of locales) {
          const n = existencia(e, v.id, l.id);
          ex[l.id] = n;
          total += n;
        }
        filas.push({ variante: v, color, existencias: ex, total, enCamino: camino[v.id] ?? null });
      }
    return filas;
  },
);

/** Mercancía ya despachada o pedida hacia cada local, por variante de la referencia: clave `${varianteId}@${destinoId}`. */
export const selMovimientoPendiente = crearSelector<
  { productoId: Id },
  { enTransito: Record<string, number>; solicitadas: Record<string, number> }
>('selMovimientoPendiente', ['traslados', 'variantes'], (e, { productoId }) => {
  const enTransito: Record<string, number> = {};
  const solicitadas: Record<string, number> = {};
  for (const t of Object.values(e.traslados)) {
    if (t.estado !== 'en_transito' && t.estado !== 'solicitado') continue;
    for (const l of t.lineas) {
      if (e.variantes[l.varianteId]?.productoId !== productoId) continue;
      const k = `${l.varianteId}@${t.destinoId}`;
      const dest = t.estado === 'en_transito' ? enTransito : solicitadas;
      dest[k] = (dest[k] ?? 0) + l.cantidad;
    }
  }
  return { enTransito, solicitadas };
});

export interface TrasladoDeProducto {
  traslado: Traslado;
  origen: string;
  destino: string;
  lineas: { varianteId: Id; talla: string; color: string; cantidad: number; recibida: number | null }[];
  unidades: number;
}

/** Traslados que incluyen la referencia: los abiertos y los últimos tres cerrados. */
export const selTrasladosProducto = crearSelector<{ productoId: Id }, TrasladoDeProducto[]>(
  'selTrasladosProducto',
  ['traslados', 'variantes', 'colores', 'locales'],
  (e, { productoId }) => {
    const todos: TrasladoDeProducto[] = [];
    for (const t of Object.values(e.traslados)) {
      const lineas = t.lineas
        .filter((l) => e.variantes[l.varianteId]?.productoId === productoId)
        .map((l) => ({
          varianteId: l.varianteId,
          talla: e.variantes[l.varianteId]?.talla ?? '',
          color: e.colores[e.variantes[l.varianteId]?.colorId ?? '']?.nombre ?? '',
          cantidad: l.cantidad,
          recibida: l.recibida,
        }));
      if (lineas.length === 0) continue;
      todos.push({ traslado: t, origen: nombreLocal(e, t.origenId), destino: nombreLocal(e, t.destinoId), lineas, unidades: lineas.reduce((a, l) => a + l.cantidad, 0) });
    }
    const abiertos = todos.filter((x) => x.traslado.estado === 'solicitado' || x.traslado.estado === 'en_transito');
    const cerrados = todos
      .filter((x) => x.traslado.estado === 'recibido' || x.traslado.estado === 'cancelado')
      .sort((a, b) => (a.traslado.fechas.solicitado < b.traslado.fechas.solicitado ? 1 : -1))
      .slice(0, 3);
    abiertos.sort((a, b) => (a.traslado.fechas.solicitado < b.traslado.fechas.solicitado ? 1 : -1));
    return [...abiertos, ...cerrados];
  },
);

// ---------------------------------------------------------------------------------------------------------
// Traslados
// ---------------------------------------------------------------------------------------------------------
export interface FilaTraslado {
  traslado: Traslado;
  origen: string;
  destino: string;
  unidades: number;
  solicitante: string;
  /** Resumen de lo que se mueve: nombre de la primera referencia y cuántas más. */
  resumen: string;
}

export const selVistaTraslados = crearSelector<{ estado?: Traslado['estado']; localId?: Id | 'todos'; texto?: string }, FilaTraslado[]>(
  'selVistaTraslados',
  ['traslados', 'locales', 'empleados', 'usuarios', 'variantes', 'productos'],
  (e, { estado, localId, texto }) => {
    const q = texto?.trim().toLowerCase() ?? '';
    const filas: FilaTraslado[] = [];
    for (const t of Object.values(e.traslados)) {
      if (estado && t.estado !== estado) continue;
      if (localId && localId !== 'todos' && t.origenId !== localId && t.destinoId !== localId) continue;
      const productos: string[] = [];
      for (const l of t.lineas) {
        const nombre = e.productos[e.variantes[l.varianteId]?.productoId ?? '']?.nombre ?? '';
        if (nombre && !productos.includes(nombre)) productos.push(nombre);
      }
      const resumen = productos.length <= 1 ? (productos[0] ?? '') : `${productos[0]} y ${productos.length - 1} más`;
      const fila: FilaTraslado = {
        traslado: t,
        origen: nombreLocal(e, t.origenId),
        destino: nombreLocal(e, t.destinoId),
        unidades: t.lineas.reduce((a, l) => a + l.cantidad, 0),
        solicitante: nombrePersona(e, t.solicitadoPor),
        resumen,
      };
      if (q && !`${t.numero} ${fila.origen} ${fila.destino} ${fila.resumen} ${t.motivo ?? ''}`.toLowerCase().includes(q)) continue;
      filas.push(fila);
    }
    return filas.sort((a, b) => (a.traslado.fechas.solicitado < b.traslado.fechas.solicitado ? 1 : -1));
  },
);

export interface LineaTraslado {
  varianteId: Id;
  producto: Producto;
  talla: string;
  color: Color | null;
  sku: string;
  cantidad: number;
  recibida: number | null;
  /** Existencias hoy en el origen y en el destino. */
  enOrigen: number;
  enDestino: number;
  minimo: number;
}

export interface DetalleTraslado {
  traslado: Traslado;
  origen: { id: Id; nombre: string; vende: boolean };
  destino: { id: Id; nombre: string; vende: boolean };
  lineas: LineaTraslado[];
  unidades: number;
  solicitante: string;
  /** Solicitud de aprobación pendiente de este traslado, si la hay. */
  solicitudPendienteId: Id | null;
}

export const selDetalleTraslado = crearSelector<{ trasladoId: Id }, DetalleTraslado | null>(
  'selDetalleTraslado',
  ['traslados', 'variantes', 'productos', 'colores', 'locales', 'agregados', 'solicitudes', 'empleados', 'usuarios'],
  (e, { trasladoId }) => {
    const t = e.traslados[trasladoId];
    if (!t) return null;
    const origen = e.locales[t.origenId];
    const destino = e.locales[t.destinoId];
    if (!origen || !destino) return null;
    const lineas: LineaTraslado[] = [];
    for (const l of t.lineas) {
      const vv = vistaDeVariante(e, l.varianteId);
      if (!vv) continue;
      lineas.push({
        varianteId: l.varianteId,
        producto: vv.producto,
        talla: vv.variante.talla,
        color: vv.color,
        sku: vv.variante.sku,
        cantidad: l.cantidad,
        recibida: l.recibida,
        enOrigen: existencia(e, l.varianteId, t.origenId),
        enDestino: existencia(e, l.varianteId, t.destinoId),
        minimo: vv.producto.stockMinimo,
      });
    }
    const sol = Object.values(e.solicitudes).find((s) => s.estado === 'pendiente' && s.datos.tipo === 'traslado' && s.datos.trasladoId === t.id);
    return {
      traslado: t,
      origen: { id: origen.id, nombre: origen.nombre, vende: origen.vende },
      destino: { id: destino.id, nombre: destino.nombre, vende: destino.vende },
      lineas,
      unidades: t.lineas.reduce((a, l) => a + l.cantidad, 0),
      solicitante: nombrePersona(e, t.solicitadoPor),
      solicitudPendienteId: sol?.id ?? null,
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Conteos
// ---------------------------------------------------------------------------------------------------------
export interface FilaConteo {
  conteo: ConteoFisico;
  local: string;
  responsable: string;
  lineas: number;
  contadas: number;
  /** Diferencias contra la existencia de hoy (solo en curso) o las aplicadas (con los ajustes hechos). */
  conDiferencia: number;
}

export const selVistaConteos = crearSelector<void, FilaConteo[]>(
  'selVistaConteos',
  ['conteos', 'locales', 'empleados', 'usuarios', 'agregados'],
  (e) =>
    Object.values(e.conteos)
      .map((c) => {
        const ids = Object.keys(c.lineas);
        let contadas = 0;
        let conDif = 0;
        for (const v of ids) {
          const l = c.lineas[v];
          if (!l || l.contado === null) continue;
          contadas += 1;
          if (c.estado === 'en_curso' && diferenciaConteo(existencia(e, v, c.localId), l.contado).tipo !== 'cuadra') conDif += 1;
          if (c.estado === 'aplicado' && c.aplicado?.motivos[v]) conDif += 1;
        }
        return { conteo: c, local: nombreLocal(e, c.localId), responsable: nombrePersona(e, c.responsableId), lineas: ids.length, contadas, conDiferencia: conDif };
      })
      .sort((a, b) => (a.conteo.iniciado < b.conteo.iniciado ? 1 : -1)),
);

export interface LineaConteoVista {
  varianteId: Id;
  producto: Producto;
  talla: string;
  color: Color | null;
  sku: string;
  ean13: string;
  /** Existencias del sistema hoy (contra lo que se compara al aplicar). */
  sistema: number;
  sistemaAlIniciar: number;
  contado: number | null;
  costo: number;
}

export interface DetalleConteo {
  conteo: ConteoFisico;
  local: string;
  responsable: string;
  lineas: LineaConteoVista[];
}

export const selDetalleConteo = crearSelector<{ conteoId: Id }, DetalleConteo | null>(
  'selDetalleConteo',
  ['conteos', 'variantes', 'productos', 'colores', 'agregados', 'locales', 'empleados', 'usuarios'],
  (e, { conteoId }) => {
    const c = e.conteos[conteoId];
    if (!c) return null;
    const lineas: LineaConteoVista[] = [];
    for (const [varianteId, l] of Object.entries(c.lineas)) {
      const vv = vistaDeVariante(e, varianteId);
      if (!vv) continue;
      lineas.push({
        varianteId,
        producto: vv.producto,
        talla: vv.variante.talla,
        color: vv.color,
        sku: vv.variante.sku,
        ean13: vv.variante.ean13,
        sistema: existencia(e, varianteId, c.localId),
        sistemaAlIniciar: l.sistemaAlIniciar,
        contado: l.contado,
        costo: vv.producto.costoVigente,
      });
    }
    lineas.sort((a, b) => (a.producto.referencia === b.producto.referencia ? 0 : a.producto.referencia < b.producto.referencia ? -1 : 1) || (a.color?.nombre ?? '').localeCompare(b.color?.nombre ?? '') || ORDEN_TALLAS.indexOf(a.talla) - ORDEN_TALLAS.indexOf(b.talla));
    return { conteo: c, local: nombreLocal(e, c.localId), responsable: nombrePersona(e, c.responsableId), lineas };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Recepción de importaciones
// ---------------------------------------------------------------------------------------------------------
const IDX_NACIONALIZADO = ESTADOS_IMPORTACION.indexOf('nacionalizado');

export interface FilaRecepcion {
  importacionId: Id;
  numero: string;
  proveedor: string;
  estado: EstadoImportacion;
  unidades: number;
  llegadaEstimada: FechaISO;
  /** Ya tiene levante: se puede recibir. */
  puedeRecibir: boolean;
  recibida: boolean;
}

/** Importaciones que están por recibirse (con levante o todavía en camino) y las recibidas, para elegir. */
export const selRecepciones = crearSelector<void, FilaRecepcion[]>('selRecepciones', ['importaciones', 'proveedores'], (e) =>
  Object.values(e.importaciones)
    .filter((i) => !i.eliminadoEn && i.nota !== 'Carga inicial de existencias')
    .map((i) => ({
      importacionId: i.id,
      numero: i.numero,
      proveedor: e.proveedores[i.proveedorId]?.nombreCorto ?? '',
      estado: i.estado,
      unidades: i.lineas.reduce((a, l) => a + Object.values(l.cantidades).reduce((x, y) => x + y, 0), 0),
      llegadaEstimada: llegadaABodega(i),
      puedeRecibir: ESTADOS_IMPORTACION.indexOf(i.estado) >= IDX_NACIONALIZADO && i.estado !== 'recibido_bodega',
      recibida: i.estado === 'recibido_bodega',
    }))
    .sort((a, b) => (a.numero < b.numero ? 1 : -1)),
);

export interface LineaRecepcion {
  varianteId: Id;
  producto: Producto;
  talla: string;
  color: Color | null;
  esperadas: number;
  /** Existencias de la variante hoy, por local. */
  existencias: Record<Id, number>;
  /** Unidades vendidas en los últimos 90 días, por local que vende. */
  ventas90: Record<Id, number>;
  /** Ya recibidas y defectuosas, si la importación se recibió. */
  recibida: { recibidas: number; defectuosas: number } | null;
}

export interface DetalleRecepcion {
  importacion: Importacion;
  proveedor: string;
  bodegaId: Id;
  locales: { id: Id; nombre: string }[];
  lineas: LineaRecepcion[];
  puedeRecibir: boolean;
}

export const selDetalleRecepcion = crearSelector<{ importacionId: Id; hoy: FechaISO }, DetalleRecepcion | null>(
  'selDetalleRecepcion',
  ['importaciones', 'proveedores', 'variantes', 'productos', 'colores', 'locales', 'agregados', 'ventas', 'devoluciones'],
  (e, { importacionId, hoy }) => {
    const imp = e.importaciones[importacionId];
    if (!imp) return null;
    const bodega = Object.values(e.locales).find((l) => l.tipo === 'bodega' && !l.eliminadoEn);
    if (!bodega) return null;
    const vendedores = Object.values(e.locales).filter((l) => l.vende && !l.eliminadoEn).sort((a, b) => a.orden - b.orden);
    const esperadas = new Map<Id, number>();
    for (const l of imp.lineas) for (const [v, n] of Object.entries(l.cantidades)) esperadas.set(v, (esperadas.get(v) ?? 0) + n);
    const ventas = new Map<string, number>();
    for (const h of hechosEnFechas(e, { desde: sumarDias(hoy, -90), hasta: hoy }))
      if (h.tipo === 'venta' && esperadas.has(h.varianteId)) {
        const k = `${h.varianteId}@${h.localId}`;
        ventas.set(k, (ventas.get(k) ?? 0) + h.cantidad);
      }
    const lineas: LineaRecepcion[] = [];
    for (const [varianteId, n] of esperadas) {
      const vv = vistaDeVariante(e, varianteId);
      if (!vv) continue;
      const ex: Record<Id, number> = {};
      const v90: Record<Id, number> = {};
      for (const l of Object.values(e.locales)) ex[l.id] = existencia(e, varianteId, l.id);
      for (const l of vendedores) v90[l.id] = ventas.get(`${varianteId}@${l.id}`) ?? 0;
      lineas.push({ varianteId, producto: vv.producto, talla: vv.variante.talla, color: vv.color, esperadas: n, existencias: ex, ventas90: v90, recibida: imp.recepcion?.lineas[varianteId] ? { recibidas: imp.recepcion.lineas[varianteId].recibidas, defectuosas: imp.recepcion.lineas[varianteId].defectuosas } : null });
    }
    lineas.sort((a, b) => (a.producto.referencia === b.producto.referencia ? 0 : a.producto.referencia < b.producto.referencia ? -1 : 1) || (a.color?.nombre ?? '').localeCompare(b.color?.nombre ?? '') || ORDEN_TALLAS.indexOf(a.talla) - ORDEN_TALLAS.indexOf(b.talla));
    return {
      importacion: imp,
      proveedor: e.proveedores[imp.proveedorId]?.nombreCorto ?? '',
      bodegaId: bodega.id,
      locales: vendedores.map((l) => ({ id: l.id, nombre: l.nombre })),
      lineas,
      puedeRecibir: ESTADOS_IMPORTACION.indexOf(imp.estado) >= IDX_NACIONALIZADO && imp.estado !== 'recibido_bodega',
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Kárdex
// ---------------------------------------------------------------------------------------------------------
export interface FilaKardexVista extends FilaKardex {
  talla: string;
  color: string;
  referencia: string;
  producto: string;
  local: string;
  usuario: string;
  /** Documento que originó el movimiento, con su número legible. */
  documento: { ref: RefDocumento; numero: string };
}

function numeroDocumento(e: EstadoDominio, ref: RefDocumento): string {
  switch (ref.tipo) {
    case 'venta':
      return e.ventas[ref.id]?.numero ?? ref.id;
    case 'traslado':
      return e.traslados[ref.id]?.numero ?? ref.id;
    case 'importacion':
      return e.importaciones[ref.id]?.numero ?? ref.id;
    case 'conteo':
      return e.conteos[ref.id]?.numero ?? ref.id;
    case 'devolucion':
      return e.devoluciones[ref.id]?.numero ?? ref.id;
    case 'ajuste':
      return 'Ajuste manual';
    default:
      return ref.id;
  }
}

export interface FiltroKardex {
  productoId?: Id;
  varianteId?: Id;
  localId?: Id | 'todos';
  desde?: FechaISO;
  hasta?: FechaISO;
  tipos?: readonly string[];
}

export interface ResultadoKardexVista {
  filas: FilaKardexVista[];
  saldoInicial: number;
  saldoFinal: number;
  entradas: number;
  salidas: number;
  /** Existencias de hoy en el alcance (producto / variante / local) para verificar que el saldo cuadra. */
  existenciasActuales: number;
}

/** Kárdex con saldo en orden de aplicación, nombres y documento; se puede filtrar por tipo de movimiento. */
export const selKardexVista = crearSelector<FiltroKardex, ResultadoKardexVista>(
  'selKardexVista',
  ['movimientos', 'variantes', 'productos', 'colores', 'locales', 'ventas', 'traslados', 'importaciones', 'conteos', 'devoluciones', 'empleados', 'usuarios', 'agregados'],
  (e, f) => {
    const k = selKardex(e, { productoId: f.productoId, varianteId: f.varianteId, localId: f.localId, desde: f.desde, hasta: f.hasta });
    const tipos = f.tipos && f.tipos.length ? new Set(f.tipos) : null;
    const filas: FilaKardexVista[] = [];
    for (const fila of k.filas) {
      const m = fila.movimiento;
      if (tipos && !tipos.has(m.tipo)) continue;
      const va = e.variantes[m.varianteId];
      const p = e.productos[m.productoId];
      filas.push({
        ...fila,
        talla: va?.talla ?? '',
        color: e.colores[va?.colorId ?? '']?.nombre ?? '',
        referencia: p?.referencia ?? '',
        producto: p?.nombre ?? '',
        local: nombreLocal(e, m.localId),
        usuario: m.usuarioId === 'sistema' ? 'Sistema' : nombrePersona(e, m.usuarioId),
        documento: { ref: m.documento, numero: numeroDocumento(e, m.documento) },
      });
    }
    let actuales = 0;
    if (f.productoId || f.varianteId) {
      const ids = f.varianteId ? [f.varianteId] : Object.values(e.variantes).filter((v) => v.productoId === f.productoId).map((v) => v.id);
      const locales = Object.values(e.locales).filter((l) => !f.localId || f.localId === 'todos' || l.id === f.localId);
      for (const id of ids) for (const l of locales) actuales += existencia(e, id, l.id);
    }
    return { filas, saldoInicial: k.saldoInicial, saldoFinal: k.saldoFinal, entradas: k.entradas, salidas: k.salidas, existenciasActuales: actuales };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Ventas y rentabilidad de la referencia
// ---------------------------------------------------------------------------------------------------------
export interface LineaVentaProducto {
  hecho: HechoVenta;
  numero: string;
  local: string;
  talla: string;
  color: string;
}

export interface VentasReferencia {
  lineas: LineaVentaProducto[];
  unidades: number;
  /** Ingresos sin IVA, netos de devoluciones. */
  base: number;
  /** Costo de la mercancía vendida (con el costo vigente al momento de cada venta). */
  costo: number;
  margen: number;
  margenPct: number;
  /** Unidades netas por local. */
  porLocal: { localId: Id; nombre: string; unidades: number; base: number }[];
  /** Base y costo por mes (para el gráfico). */
  porMes: { mes: string; base: number; costo: number }[];
}

/** Hechos de venta de una referencia en un rango (V4), con totales, por local y por mes. */
export const selVentasReferencia = crearSelector<{ productoId: Id; desde: FechaISO; hasta: FechaISO }, VentasReferencia>(
  'selVentasReferencia',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'colores', 'locales'],
  (e, { productoId, desde, hasta }) => {
    const lineas: LineaVentaProducto[] = [];
    let unidades = 0;
    let base = 0;
    let costo = 0;
    const porLocal = new Map<Id, { localId: Id; nombre: string; unidades: number; base: number }>();
    const porMes = new Map<string, { mes: string; base: number; costo: number }>();
    for (const h of hechosEnFechas(e, { desde, hasta })) {
      if (h.productoId !== productoId) continue;
      const va = e.variantes[h.varianteId];
      lineas.push({ hecho: h, numero: e.ventas[h.ventaId]?.numero ?? h.ventaId, local: nombreLocal(e, h.localId), talla: va?.talla ?? h.talla, color: e.colores[va?.colorId ?? h.colorId]?.nombre ?? '' });
      unidades += h.cantidad;
      base += h.base;
      costo += h.costo;
      const l = porLocal.get(h.localId) ?? { localId: h.localId, nombre: nombreLocal(e, h.localId), unidades: 0, base: 0 };
      l.unidades += h.cantidad;
      l.base += h.base;
      porLocal.set(h.localId, l);
      const mes = h.fecha.slice(0, 7);
      const m = porMes.get(mes) ?? { mes, base: 0, costo: 0 };
      m.base += h.base;
      m.costo += h.costo;
      porMes.set(mes, m);
    }
    lineas.sort((a, b) => (a.hecho.ts < b.hecho.ts ? 1 : -1));
    const margen = base - costo;
    return {
      lineas,
      unidades,
      base,
      costo,
      margen,
      margenPct: base > 0 ? margen / base : 0,
      porLocal: [...porLocal.values()].sort((a, b) => b.base - a.base),
      porMes: [...porMes.values()].sort((a, b) => (a.mes < b.mes ? -1 : 1)),
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Variantes sueltas (líneas de un traslado, etiquetas, conteo por escaneo)
// ---------------------------------------------------------------------------------------------------------
export interface InfoVariante {
  variante: Variante;
  producto: Producto;
  color: Color | null;
  /** Existencias por local (incluida la bodega). */
  existencias: Record<Id, number>;
}

/** Datos de pantalla de un conjunto de variantes: producto, color y existencias por local. */
export const selInfoVariantes = crearSelector<{ ids: readonly Id[] }, Record<Id, InfoVariante>>(
  'selInfoVariantes',
  ['variantes', 'productos', 'colores', 'locales', 'agregados'],
  (e, { ids }) => {
    const r: Record<Id, InfoVariante> = {};
    const locales = Object.values(e.locales).filter((l) => !l.eliminadoEn);
    for (const id of ids) {
      const vv = vistaDeVariante(e, id);
      if (!vv) continue;
      const ex: Record<Id, number> = {};
      for (const l of locales) ex[l.id] = existencia(e, id, l.id);
      r[id] = { variante: vv.variante, producto: vv.producto, color: vv.color, existencias: ex };
    }
    return r;
  },
);

// ---------------------------------------------------------------------------------------------------------
// Historial de costo (rentabilidad)
// ---------------------------------------------------------------------------------------------------------
export interface FilaHistorialCosto {
  fecha: FechaISO;
  costo: number;
  motivo: 'importacion' | 'manual';
  /** Número de la importación que fijó el costo (si vino de una). */
  importacion: string | null;
}

/** Cambios del `costoVigente` de una referencia, del más reciente al más antiguo, con la importación que los fijó. */
export const selHistorialCosto = crearSelector<{ productoId: Id }, FilaHistorialCosto[]>(
  'selHistorialCosto',
  ['productos', 'importaciones'],
  (e, { productoId }) =>
    (e.productos[productoId]?.historialCosto ?? [])
      .map((h) => ({ fecha: h.fecha, costo: h.costo, motivo: h.motivo, importacion: h.importacionId ? (e.importaciones[h.importacionId]?.numero ?? null) : null }))
      .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)),
);

// ---------------------------------------------------------------------------------------------------------
// Etiquetas
// ---------------------------------------------------------------------------------------------------------
export interface GrupoVariantes {
  producto: Producto;
  variantes: { variante: Variante; color: Color | null }[];
}

/** Variantes de varias referencias (la hoja de etiquetas), cada una con su color, por color y talla de la curva. */
export const selVariantesDeProductos = crearSelector<{ productoIds: readonly Id[] }, GrupoVariantes[]>(
  'selVariantesDeProductos',
  ['productos', 'variantes', 'colores'],
  (e, { productoIds }) => {
    const grupos: GrupoVariantes[] = [];
    for (const id of productoIds) {
      const p = e.productos[id];
      if (!p || p.eliminadoEn) continue;
      const vs = Object.values(e.variantes).filter((v) => v.productoId === id && !v.eliminadoEn);
      const tallas = ordenarTallas([...new Set(vs.map((v) => v.talla))], p.curvaTallas);
      const colores: Id[] = [];
      for (const v of vs) if (!colores.includes(v.colorId)) colores.push(v.colorId);
      const lista: GrupoVariantes['variantes'] = [];
      for (const c of colores)
        for (const t of tallas) {
          const v = vs.find((x) => x.colorId === c && x.talla === t);
          if (v) lista.push({ variante: v, color: e.colores[c] ?? null });
        }
      grupos.push({ producto: p, variantes: lista });
    }
    return grupos;
  },
);

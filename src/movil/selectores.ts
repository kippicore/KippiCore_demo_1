import type { ClaveEstado } from '@/selectores';
import type { COP, EstadoDominio, FechaISO, Id, MedioPago, SolicitudAprobacion, TipoPrenda, TipoSolicitud } from '@/dominio/tipos';
import { NOMBRES_CATEGORIA } from '@/seed/catalogo';
import { diaSemana, minutosDeHora, sumarDias } from '@/dominio/reglas/fechas';
import { DIAS } from '@/lib/formato';
import {
  aperturaDelDia,
  crearSelector,
  hechosEnFechas,
  hechosEnRango,
  nombreCliente,
  nombreEmpleado,
  resumirHechos,
  selCatalogo,
  selCierresDelDia,
  selComparativoLocales,
  selExistencia,
  selLocalesQueVenden,
  selMatrizExistencias,
  selNarrativa,
  selProductoPorReferencia,
  selKpisInicio,
  selResumenSesion,
  selResumenVentas,
  selVentaDetalle,
  selVentasHoyHastaHora,
  selVentasPorDia,
  type ResumenSesion,
  type CierreDelDia,
  type DetalleVenta,
  type EstadoStock,
  type MatrizExistencias,
  type ResumenVentas,
} from '@/selectores';
import { MEDIOS_PAGO } from '@/config/negocio';
import { filasArqueo, type FilaArqueo } from './calculos';

/**
 * Selectores locales de la app del dueño (E1). Componen los compartidos (ventas por hora y por local con
 * `hechosEnFechas`, el arqueo con `selResumenSesion`, las solicitudes con `solicitudes`) y arman lo que el celular
 * necesita (textos de las tarjetas, filas del arqueo). Ninguno repite una regla de negocio; cada uno declara TODAS
 * las tablas que lee, también a través de otros selectores (`activarVerificacionDeTablas` lo comprueba).
 */
const unir = (...sels: { tablas: readonly ClaveEstado[] }[]): ClaveEstado[] => [...new Set(sels.flatMap((s) => s.tablas))];

// ---------------------------------------------------------------------------------------------------------
// Ventas por hora (Hoy y Ventas › Hoy)
// ---------------------------------------------------------------------------------------------------------
export interface VentaHora {
  hora: number;
  netas: COP;
  numVentas: number;
}

/** Ventas netas de un día por hora (de la apertura a la última hora con ventas; con `hastaHora`, hasta la hora actual). Cuadra con `selVentas`. */
export const selVentasPorHora = crearSelector<{ fecha: FechaISO; localId: Id | 'todos'; hastaHora?: number }, VentaHora[]>(
  'selVentasPorHoraApp',
  unir(hechosEnFechas),
  (e, { fecha, localId, hastaHora }) => {
    const hechos = hechosEnRango(hechosEnFechas(e, { desde: fecha, hasta: fecha }), fecha, fecha, localId);
    const porHora = new Map<number, { netas: COP; ventas: Set<Id> }>();
    for (const h of hechos) {
      const x = porHora.get(h.hora) ?? { netas: 0, ventas: new Set<Id>() };
      x.netas += h.total;
      if (h.tipo === 'venta') x.ventas.add(h.ventaId);
      porHora.set(h.hora, x);
    }
    if (porHora.size === 0) return [];
    const horas = [...porHora.keys()];
    const desde = Math.min(10, ...horas);
    const hasta = Math.max(...horas, hastaHora === undefined ? 20 : Math.min(20, hastaHora));
    const r: VentaHora[] = [];
    for (let h = desde; h <= hasta; h++) r.push({ hora: h, netas: porHora.get(h)?.netas ?? 0, numVentas: porHora.get(h)?.ventas.size ?? 0 });
    return r;
  },
);

// ---------------------------------------------------------------------------------------------------------
// Ventas por local en un rango (barra de los tres locales)
// ---------------------------------------------------------------------------------------------------------
export interface VentaLocal {
  localId: Id;
  nombre: string;
  orden: number;
  resumen: ResumenVentas;
}

export const selVentasPorLocal = crearSelector<{ desde: FechaISO; hasta: FechaISO }, VentaLocal[]>(
  'selVentasPorLocalApp',
  unir(hechosEnFechas, selLocalesQueVenden),
  (e, { desde, hasta }) => {
    const hechos = hechosEnFechas(e, { desde, hasta });
    return selLocalesQueVenden(e).map((l) => ({
      localId: l.id,
      nombre: l.nombre,
      orden: l.orden,
      resumen: resumirHechos(hechos.filter((h) => h.localId === l.id)),
    }));
  },
);

// ---------------------------------------------------------------------------------------------------------
// La cifra protagonista de Hoy (la misma que la primera tarjeta de Inicio, pero barata de calcular)
// ---------------------------------------------------------------------------------------------------------
export interface CifraHoy {
  /** Antes de que abran los locales la cifra es la de ayer (2.3.1). */
  antesDeAbrir: boolean;
  valor: COP;
  numVentas: number;
  variacion: number | null;
  comparacion: string | null;
  /** "Hoy: los locales abren a las 10:00" cuando todavía no abren. */
  detalle: string | null;
}

/**
 * Lo mismo que la tarjeta "Ventas de hoy" de `selKpisInicio` (mismo `selVentasHoyHastaHora`, misma regla de "antes de
 * abrir" con `aperturaDelDia`), sin calcular las otras cinco tarjetas: Hoy es la primera pantalla de /app y tiene un
 * presupuesto de arranque de 2,5 s con CPU ×4. La prueba compara ambas.
 */
export const selCifraHoy = crearSelector<{ ahora: string; localId: Id | 'todos' }, CifraHoy>(
  'selCifraHoyApp',
  unir(selVentasHoyHastaHora, selResumenVentas, { tablas: ['locales'] }),
  (e, { ahora, localId }) => {
    const hoy = ahora.slice(0, 10);
    const apertura = aperturaDelDia(e, hoy, localId);
    const antesDeAbrir = !apertura || minutosDeHora(ahora.slice(11, 16)) < minutosDeHora(apertura);
    if (antesDeAbrir) {
      const ayer = sumarDias(hoy, -1);
      const r = selResumenVentas(e, { desde: ayer, hasta: ayer, localId });
      return { antesDeAbrir, valor: r.netas, numVentas: r.numVentas, variacion: null, comparacion: null, detalle: apertura ? `Hoy: los locales abren a las ${apertura}` : 'Hoy los locales no abren' };
    }
    const vh = selVentasHoyHastaHora(e, { hoy, ahora, localId });
    return { antesDeAbrir, valor: vh.hoy.netas, numVentas: vh.hoy.numVentas, variacion: vh.variacion, comparacion: `vs. el ${DIAS[diaSemana(hoy)]} pasado a esta hora`, detalle: null };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Periodo de la pestaña Ventas: rango, comparación con el periodo anterior y serie de barras
// ---------------------------------------------------------------------------------------------------------
export type PeriodoApp = 'hoy' | 'semana' | 'mes';

export interface PeriodoVentasApp {
  desde: FechaISO;
  hasta: FechaISO;
  /** Variación (fracción) frente al periodo anterior; null si no hay base. */
  variacion: number | null;
  /** "vs. el miércoles pasado a esta hora" · "vs. los 7 días anteriores" · "vs. agosto a la misma fecha". */
  comparacion: string | null;
  /** Serie diaria (semana y mes); en "hoy" va vacía (la gráfica es por hora). */
  serie: { fecha: FechaISO; netas: COP; numVentas: number }[];
}

/**
 * Rango del periodo y su comparación. "Hoy" y "Mes" usan los mismos cálculos que las tarjetas de Inicio
 * (`selVentasHoyHastaHora`, `selKpisInicio`), así la variación coincide con la del escritorio; "7 días" compara con los
 * 7 días anteriores (`selResumenVentas`).
 */
export const selPeriodoVentas = crearSelector<{ periodo: PeriodoApp; ahora: string; localId: Id | 'todos' }, PeriodoVentasApp>(
  'selPeriodoVentasApp',
  unir(selVentasPorDia, selResumenVentas, selVentasHoyHastaHora, selKpisInicio),
  (e, { periodo, ahora, localId }) => {
    const hoy = ahora.slice(0, 10);
    if (periodo === 'hoy') {
      const vh = selVentasHoyHastaHora(e, { hoy, ahora, localId });
      return { desde: hoy, hasta: hoy, variacion: vh.variacion, comparacion: `vs. el ${DIAS[diaSemana(hoy)]} pasado a esta hora`, serie: [] };
    }
    if (periodo === 'semana') {
      const desde = sumarDias(hoy, -6);
      const antes = selResumenVentas(e, { desde: sumarDias(hoy, -13), hasta: sumarDias(hoy, -7), localId });
      const ahoraR = selResumenVentas(e, { desde, hasta: hoy, localId });
      return {
        desde,
        hasta: hoy,
        variacion: antes.netas > 0 ? (ahoraR.netas - antes.netas) / antes.netas : null,
        comparacion: 'vs. los 7 días anteriores',
        serie: selVentasPorDia(e, { desde, hasta: hoy, localId }).map((d) => ({ fecha: d.fecha, netas: d.netas, numVentas: d.numVentas })),
      };
    }
    const desde = `${hoy.slice(0, 7)}-01`;
    const m = selKpisInicio(e, { localId, ahora }).tarjetas.find((t) => t.id === 'ventas_mes');
    return {
      desde,
      hasta: hoy,
      variacion: m?.variacion ?? null,
      comparacion: m?.comparacion ?? null,
      serie: selVentasPorDia(e, { desde, hasta: hoy, localId }).map((d) => ({ fecha: d.fecha, netas: d.netas, numVentas: d.numVentas })),
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Meta del mes (cumplimiento del local elegido o de los tres)
// ---------------------------------------------------------------------------------------------------------
export interface MetaMes {
  netas: COP;
  meta: COP | null;
  cumplimiento: number | null;
}

export const selMetaMes = crearSelector<{ mes: string; hoy: FechaISO; localId: Id | 'todos' }, MetaMes>(
  'selMetaMesApp',
  unir(selComparativoLocales),
  (e, { mes, hoy, localId }) => {
    const filas = selComparativoLocales(e, { mes, hoy }).filter((f) => localId === 'todos' || f.localId === localId);
    const netas = filas.reduce((a, f) => a + f.resumen.netas, 0);
    const conMeta = filas.filter((f) => f.meta !== null);
    const meta = conMeta.length === filas.length && filas.length > 0 ? conMeta.reduce((a, f) => a + (f.meta ?? 0), 0) : null;
    return { netas, meta, cumplimiento: meta ? netas / meta : null };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Cierres de un día (Hoy y Cierres): `selCierresDelDia` + la hora a la que cerró cada caja
// ---------------------------------------------------------------------------------------------------------
export interface CierreApp extends CierreDelDia {
  /** Instante del cierre (null si no ha cerrado). */
  cerroEn: string | null;
  /** Quién abrió la caja ese día (cuando todavía no hay cierre se muestra a quien abrió). */
  nombreCorto: string;
}

/** "Laura Sofía Méndez Galvis" → "Laura Sofía Méndez"; "Natalia Ríos Echeverry" → "Natalia Ríos"; "Sebastián Cárdenas" igual. */
export function nombreCorto(nombre: string): string {
  const p = nombre.trim().split(/\s+/);
  return p.length >= 3 ? p.slice(0, -1).join(' ') : nombre.trim();
}

export const selCierresApp = crearSelector<{ fecha: FechaISO }, CierreApp[]>('selCierresApp', unir(selCierresDelDia, { tablas: ['sesionesCaja'] }), (e, { fecha }) =>
  selCierresDelDia(e, { fecha }).map((c) => ({
    ...c,
    cerroEn: c.sesionId ? (e.sesionesCaja[c.sesionId]?.cierre?.ts ?? null) : null,
    nombreCorto: nombreCorto(c.cajero),
  })),
);

// ---------------------------------------------------------------------------------------------------------
// Cierre de caja: detalle del arqueo (W11)
// ---------------------------------------------------------------------------------------------------------
export interface DetalleCierre {
  resumen: ResumenSesion;
  /** Fecha del día de la caja. */
  fecha: FechaISO;
  base: COP;
  /** Efectivo cobrado en el día = esperado − base + egresos (el esperado lo calcula el dominio, V8). */
  efectivoDelDia: COP;
  /** Filas del arqueo por denominación (null si no hay conteo por denominación). */
  arqueo: FilaArqueo[] | null;
  medios: { medio: MedioPago; etiqueta: string; valor: COP }[];
  egresos: { id: Id; concepto: string; valor: COP; ts: string }[];
}

export const selDetalleCierre = crearSelector<{ sesionId: Id }, DetalleCierre | null>(
  'selDetalleCierreApp',
  unir(selResumenSesion),
  (e, { sesionId }) => {
    const resumen = selResumenSesion(e, { sesionId });
    if (!resumen) return null;
    const s = resumen.sesion;
    const medios = (Object.entries(resumen.porMedio) as [MedioPago, COP][])
      .filter(([, v]) => v !== 0)
      .map(([medio, valor]) => ({ medio, etiqueta: MEDIOS_PAGO[medio]?.etiqueta ?? medio, valor }))
      .sort((a, b) => b.valor - a.valor);
    return {
      resumen,
      fecha: s.abierta.ts.slice(0, 10),
      base: s.abierta.baseInicial,
      efectivoDelDia: resumen.esperado - s.abierta.baseInicial + resumen.egresos,
      arqueo: s.cierre?.denominaciones ? filasArqueo(s.cierre.denominaciones) : null,
      medios,
      egresos: s.egresos.map((x) => ({ id: x.id, concepto: x.concepto, valor: x.valor, ts: x.ts })),
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Para aprobar (descuentos, traslados y anulaciones)
// ---------------------------------------------------------------------------------------------------------
export interface DatoSolicitud {
  etiqueta: string;
  /** Texto (o monto, si `dinero` es true). */
  valor: string;
  dinero?: COP;
}

export interface SolicitudVista {
  id: Id;
  tipo: TipoSolicitud;
  estado: SolicitudAprobacion['estado'];
  /** "Descuento del 20 %" · "Traslado de 8 unidades" · "Anular la venta V-017390". */
  titulo: string;
  /** Quién la pide y cuándo (ts). */
  solicitante: string;
  ts: string;
  /** La frase que redactó el dominio ("Sebastián Cárdenas pide 20 % de descuento · …"). */
  resumen: string;
  /** Cifra protagonista de la tarjeta (el valor final, el total anulado o las unidades). */
  principal: { dinero: COP } | { unidades: number };
  datos: DatoSolicitud[];
  /** Consecuencia de aprobar, en una frase (para anulaciones). */
  consecuencia: string | null;
  resolucion: { ts: string; por: string; nota: string | null } | null;
  /** Número de la venta (anulación) para enlazar al detalle. */
  ventaId: Id | null;
}

function nombreUsuario(e: EstadoDominio, id: Id): string {
  const u = e.usuarios[id];
  if (u?.empleadoId && e.empleados[u.empleadoId]) return nombreEmpleado(e.empleados[u.empleadoId]);
  if (e.empleados[id]) return nombreEmpleado(e.empleados[id]);
  return u?.nombre ?? '—';
}

function vistaDeSolicitud(e: EstadoDominio, s: SolicitudAprobacion): SolicitudVista {
  const base = {
    id: s.id,
    tipo: s.tipo,
    estado: s.estado,
    solicitante: nombreUsuario(e, s.solicitadoPor),
    ts: s.ts,
    resumen: s.resumen,
    resolucion: s.resolucion ? { ts: s.resolucion.ts, por: nombreUsuario(e, s.resolucion.por), nota: s.resolucion.nota } : null,
    ventaId: null as Id | null,
  };
  const d = s.datos;
  if (d.tipo === 'descuento') {
    const v = e.variantes[d.varianteIds[0] ?? ''];
    const p = v ? e.productos[v.productoId] : undefined;
    const color = v ? e.colores[v.colorId]?.nombre : undefined;
    const extra = d.varianteIds.length > 1 ? ` y ${d.varianteIds.length - 1} más` : '';
    return {
      ...base,
      titulo: `Descuento del ${Math.round(d.porcentaje * 100)} %`,
      principal: { dinero: d.valorFinal },
      datos: [
        { etiqueta: 'Prenda', valor: `${p?.nombre ?? 'Prenda'}${v ? ` · ${v.talla}${color ? ` · ${color}` : ''}` : ''}${extra}` },
        { etiqueta: 'Precio de lista', valor: '', dinero: d.valorLista },
        { etiqueta: 'Precio con descuento', valor: '', dinero: d.valorFinal },
        { etiqueta: 'Local', valor: e.locales[d.localId]?.nombre ?? d.localId },
        { etiqueta: 'Motivo', valor: d.motivo },
      ],
      consecuencia: null,
    };
  }
  if (d.tipo === 'traslado') {
    const t = e.traslados[d.trasladoId];
    const unidades = t?.lineas.reduce((a, l) => a + l.cantidad, 0) ?? 0;
    const nombres: string[] = [];
    for (const l of t?.lineas ?? []) {
      const n = e.productos[e.variantes[l.varianteId]?.productoId ?? '']?.nombre;
      if (n && !nombres.includes(n)) nombres.push(n);
    }
    return {
      ...base,
      titulo: `Traslado de ${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}`,
      principal: { unidades },
      datos: [
        { etiqueta: 'Sale de', valor: e.locales[t?.origenId ?? '']?.nombre ?? '—' },
        { etiqueta: 'Llega a', valor: e.locales[t?.destinoId ?? '']?.nombre ?? '—' },
        { etiqueta: 'Prendas', valor: nombres.length ? `${nombres.slice(0, 2).join(', ')}${nombres.length > 2 ? ` y ${nombres.length - 2} más` : ''}` : '—' },
        ...(t?.motivo ? [{ etiqueta: 'Motivo', valor: t.motivo }] : []),
      ],
      consecuencia: null,
    };
  }
  const v = e.ventas[d.ventaId];
  const medio = d.reembolso ? (MEDIOS_PAGO[d.reembolso.medio]?.etiqueta ?? d.reembolso.medio) : null;
  return {
    ...base,
    ventaId: d.ventaId,
    titulo: `Anular la venta ${v?.numero ?? ''}`.trim(),
    principal: { dinero: v?.total ?? 0 },
    datos: [
      { etiqueta: 'Venta', valor: v?.numero ?? '—' },
      { etiqueta: 'Cliente', valor: v?.clienteId ? nombreCliente(e.clientes[v.clienteId]) : 'Consumidor final' },
      { etiqueta: 'Local', valor: e.locales[v?.localId ?? '']?.nombre ?? '—' },
      { etiqueta: 'Motivo', valor: d.motivo },
      ...(medio ? [{ etiqueta: 'Se devuelve por', valor: medio }] : []),
    ],
    consecuencia: 'Al aprobar, la venta queda anulada, el inventario regresa al local y el dinero se devuelve. No se puede deshacer.',
  };
}

const TABLAS_SOLICITUDES: ClaveEstado[] = ['solicitudes', 'traslados', 'ventas', 'variantes', 'productos', 'colores', 'locales', 'clientes', 'empleados', 'usuarios'];

/** Solicitudes pendientes (más recientes primero) con todo lo que la tarjeta necesita. Mismo universo que `selSolicitudesPendientes`. */
export const selSolicitudesApp = crearSelector<{ estado: 'pendiente' | 'resueltas' }, SolicitudVista[]>(
  'selSolicitudesApp',
  TABLAS_SOLICITUDES,
  (e, { estado }) =>
    Object.values(e.solicitudes)
      .filter((s) => (estado === 'pendiente' ? s.estado === 'pendiente' : s.estado === 'aprobada' || s.estado === 'rechazada'))
      .sort((a, b) => {
        const ta = estado === 'pendiente' ? a.ts : (a.resolucion?.ts ?? a.ts);
        const tb = estado === 'pendiente' ? b.ts : (b.resolucion?.ts ?? b.ts);
        return ta < tb ? 1 : -1;
      })
      .slice(0, estado === 'pendiente' ? 50 : 8)
      .map((s) => vistaDeSolicitud(e, s)),
);

// ---------------------------------------------------------------------------------------------------------
// Detalle de una venta (hoja inferior)
// ---------------------------------------------------------------------------------------------------------
export interface DetalleVentaApp {
  id: Id;
  numero: string;
  ts: string;
  local: string;
  vendedor: string;
  cliente: string;
  estado: DetalleVenta['estado'];
  total: COP;
  descuentos: COP;
  saldo: COP;
  lineas: { id: Id; nombre: string; detalle: string; cantidad: number; total: COP }[];
  medios: { etiqueta: string; valor: COP }[];
}

const TABLAS_DETALLE: ClaveEstado[] = [...unir(selVentaDetalle), 'productos', 'variantes', 'colores', 'locales', 'clientes', 'empleados'];

/** Detalle de una venta para la hoja inferior: compone `selVentaDetalle` (estado, saldo) y le agrega los nombres. */
export const selDetalleVentaApp = crearSelector<{ ventaId: Id }, DetalleVentaApp | null>('selDetalleVentaApp', [...new Set(TABLAS_DETALLE)], (e, { ventaId }) => {
  const d = selVentaDetalle(e, { ventaId });
  if (!d) return null;
  const v = d.venta;
  const porMedio = new Map<MedioPago, COP>();
  for (const p of v.pagos) {
    if (p.tipo === 'reembolso') continue;
    porMedio.set(p.medio, (porMedio.get(p.medio) ?? 0) + p.valor);
  }
  return {
    id: v.id,
    numero: v.numero,
    ts: v.ts,
    local: e.locales[v.localId]?.nombre ?? v.localId,
    vendedor: nombreEmpleado(e.empleados[v.vendedorId]),
    cliente: v.clienteId ? nombreCliente(e.clientes[v.clienteId]) : 'Consumidor final',
    estado: d.estado,
    total: v.total,
    descuentos: v.descuentos,
    saldo: d.saldo,
    lineas: v.lineas.map((l) => {
      const va = e.variantes[l.varianteId];
      const color = va ? e.colores[va.colorId]?.nombre : undefined;
      return {
        id: l.id,
        nombre: e.productos[l.productoId]?.nombre ?? 'Prenda',
        detalle: va ? `${va.talla}${color ? ` · ${color}` : ''}` : '',
        cantidad: l.cantidad,
        total: l.totalFinal,
      };
    }),
    medios: [...porMedio.entries()].map(([m, valor]) => ({ etiqueta: MEDIOS_PAGO[m]?.corta ?? m, valor })),
  };
});

// ---------------------------------------------------------------------------------------------------------
// Inventario: búsqueda y "se está acabando" (con la "foto" de cada prenda)
// ---------------------------------------------------------------------------------------------------------
export interface PrendaVista {
  tipo: TipoPrenda;
  color: string;
  patron: 'liso' | 'rayas' | 'cuadros';
  /** "Camisa Oxford entallada, azul cielo" (texto accesible). */
  nombre: string;
}

const COLOR_NEUTRO = '#C9C9C7';

function prendaDe(e: EstadoDominio, productoId: Id): PrendaVista | null {
  const p = e.productos[productoId];
  if (!p) return null;
  const v = Object.values(e.variantes).find((x) => x.productoId === productoId && !x.eliminadoEn);
  const c = v ? e.colores[v.colorId] : undefined;
  return { tipo: p.tipoPrenda, color: c?.hex ?? COLOR_NEUTRO, patron: c?.patron ?? 'liso', nombre: `${p.nombre}${c ? `, ${c.nombre.toLowerCase()}` : ''}` };
}

export interface FilaInventarioApp {
  productoId: Id;
  referencia: string;
  nombre: string;
  categoria: string;
  prenda: PrendaVista | null;
  existencias: number;
  estadoStock: EstadoStock;
  variantesBajas: number;
  variantes: number;
}

/** Productos del catálogo filtrados (texto y local), con la foto de la prenda. `total` cuenta todos los que cumplen el filtro. */
export const selInventarioApp = crearSelector<{ texto: string; localId: Id | 'todos'; stock?: EstadoStock; limite: number }, { filas: FilaInventarioApp[]; total: number }>(
  'selInventarioApp',
  unir(selCatalogo, { tablas: ['colores'] }),
  (e, { texto, localId, stock, limite }) => {
    const todas = selCatalogo(e, { texto: texto.trim() || undefined, localId, stock });
    const ordenadas = stock
      ? [...todas].sort((a, b) => (a.estadoStock === b.estadoStock ? b.variantesBajas - a.variantesBajas : a.estadoStock === 'agotado' ? -1 : 1))
      : todas;
    return {
      total: ordenadas.length,
      filas: ordenadas.slice(0, limite).map((f) => ({
        productoId: f.producto.id,
        referencia: f.producto.referencia,
        nombre: f.producto.nombre,
        categoria: NOMBRES_CATEGORIA[f.producto.categoria] ?? '',
        prenda: prendaDe(e, f.producto.id),
        existencias: f.existencias,
        estadoStock: f.estadoStock,
        variantesBajas: f.variantesBajas,
        variantes: f.variantes,
      })),
    };
  },
);

export interface CriticoApp {
  productoId: Id;
  referencia: string;
  nombre: string;
  prenda: PrendaVista | null;
  /** "Talla M · Azul cielo" */
  variante: string;
  localId: Id;
  localNombre: string;
  existencia: number;
  /** Local que sí tiene (para sugerir de dónde mover) y cuántas unidades. */
  surtido: { nombre: string; existencia: number } | null;
}

/** La referencia que se está acabando en el guion (misma de la alerta 1 de Inicio): talla y color, en qué local y de dónde moverla. */
export const selCriticoApp = crearSelector<{ hoy: FechaISO; localId: Id | 'todos' }, CriticoApp | null>(
  'selCriticoApp',
  unir(selNarrativa, selExistencia, { tablas: ['variantes', 'productos', 'colores', 'locales'] }),
  (e, { hoy, localId }) => {
    const n = selNarrativa(e, { hoy });
    if (!n.varianteCritica || !n.localEscasez) return null;
    if (localId !== 'todos' && localId !== n.localEscasez) return null;
    const v = e.variantes[n.varianteCritica];
    const p = v ? e.productos[v.productoId] : undefined;
    if (!v || !p) return null;
    const color = e.colores[v.colorId]?.nombre ?? '';
    return {
      productoId: p.id,
      referencia: p.referencia,
      nombre: p.nombre,
      prenda: prendaDe(e, p.id),
      variante: `Talla ${v.talla}${color ? ` · ${color}` : ''}`,
      localId: n.localEscasez,
      localNombre: e.locales[n.localEscasez]?.nombre ?? n.localEscasez,
      existencia: selExistencia(e, { varianteId: v.id, localId: n.localEscasez }),
      surtido: n.localSurtido
        ? { nombre: e.locales[n.localSurtido]?.nombre ?? n.localSurtido, existencia: selExistencia(e, { varianteId: v.id, localId: n.localSurtido }) }
        : null,
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Ficha de un producto en el celular (existencias por talla, color y local; lo que viene en camino)
// ---------------------------------------------------------------------------------------------------------
export interface ProductoApp {
  productoId: Id;
  referencia: string;
  nombre: string;
  categoria: string;
  material: string;
  precio: COP;
  prenda: PrendaVista | null;
  stockMinimo: number;
  matriz: MatrizExistencias;
  /** Unidades que vienen en camino (todas las importaciones en curso) y la llegada más próxima. */
  enCamino: { unidades: number; numero: string; llegada: FechaISO } | null;
}

export const selProductoApp = crearSelector<{ referencia: string }, ProductoApp | null>(
  'selProductoApp',
  unir(selProductoPorReferencia, selMatrizExistencias, { tablas: ['colores', 'variantes'] }),
  (e, { referencia }) => {
    const p = selProductoPorReferencia(e, { referencia });
    if (!p) return null;
    const matriz = selMatrizExistencias(e, { productoId: p.id });
    if (!matriz) return null;
    let unidades = 0;
    let proxima: { numero: string; llegada: FechaISO } | null = null;
    for (const c of Object.values(matriz.enCamino)) {
      unidades += c.unidades;
      if (!proxima || c.fechaEstimada < proxima.llegada) proxima = { numero: c.numero, llegada: c.fechaEstimada };
    }
    return {
      productoId: p.id,
      referencia: p.referencia,
      nombre: p.nombre,
      categoria: NOMBRES_CATEGORIA[p.categoria] ?? '',
      material: p.material,
      precio: p.precioVenta,
      prenda: prendaDe(e, p.id),
      stockMinimo: p.stockMinimo,
      matriz,
      enCamino: proxima && unidades > 0 ? { unidades, ...proxima } : null,
    };
  },
);

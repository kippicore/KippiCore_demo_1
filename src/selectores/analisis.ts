import type { Categoria, COP, EstadoDominio, FechaISO, Id, MedioPago, MesISO } from '@/dominio/tipos';
import { diaN, diaSemana, diasDelMes, lunesDe, rangoFechas, sumarDias, sumarMesesAMes } from '@/dominio/reglas/fechas';
import type { Segmento } from '@/dominio/reglas/segmentacion';
import { NOMBRES_CATEGORIA, NOMBRES_LINEA } from '@/seed/catalogo';
import { crearSelector } from './memo';
import { hechosDeVenta, hechosEnFechas, hechosEnRango, type HechoVenta, resumirHechos, type ResumenVentas, selTopProductos, type TopProducto } from './ventas';
import { selMetricasClientes } from './clientes';
import { selDiasInventario, type DiasInventario } from './inventario';
import { nombreEmpleado } from './base';

/**
 * Análisis (PLAN 6.23 `analisis.ts`, D2): hechos con todas las dimensiones, tabla dinámica con totales NO
 * aditivos recalculados desde los hechos, series y comparativos. Las mediciones que replican patrones (P2, P7,
 * P8, P9, P18) usan las mismas definiciones que `generador/auditoria/patrones.ts`.
 */

// ---------------------------------------------------------------------------------------------------------
// Tabla dinámica: 15 dimensiones y 7 medidas
// ---------------------------------------------------------------------------------------------------------
export const DIMENSIONES = {
  mes: 'Mes',
  semana: 'Semana del año',
  fecha: 'Fecha',
  diaSemana: 'Día de la semana',
  hora: 'Hora',
  local: 'Local',
  vendedor: 'Vendedor',
  categoria: 'Categoría',
  linea: 'Línea',
  producto: 'Producto',
  talla: 'Talla',
  color: 'Color',
  medioPago: 'Medio de pago',
  canal: 'Canal',
  segmento: 'Segmento del cliente',
} as const;
export type Dimension = keyof typeof DIMENSIONES;

export const MEDIDAS = {
  ventas: 'Ventas $ (con IVA)',
  ventasSinIva: 'Ventas sin IVA',
  unidades: 'Unidades',
  numVentas: 'Número de ventas',
  ticket: 'Ticket promedio',
  margen: 'Margen $',
  margenPct: 'Margen %',
} as const;
export type Medida = keyof typeof MEDIDAS;
/** Medidas que NO se suman por filas: se recalculan en cada total desde los hechos. */
export const MEDIDAS_NO_ADITIVAS: readonly Medida[] = ['numVentas', 'ticket', 'margenPct'];

export interface HechoAnalisis {
  ventaId: Id;
  tipo: HechoVenta['tipo'];
  /** Valores de las 15 dimensiones (texto legible). */
  dim: Record<Dimension, string>;
  total: COP;
  base: COP;
  costo: COP;
  cantidad: number;
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const NOMBRE_MEDIO: Record<MedioPago, string> = {
  efectivo: 'Efectivo',
  datafono_debito: 'Datáfono débito',
  datafono_credito: 'Datáfono crédito',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  transferencia: 'Transferencia / llave Bre-B',
  qr_bre_b: 'QR Bre-B',
  bono_regalo: 'Bono de regalo',
  credito_financiera: 'Crédito con financiera aliada',
  pasarela_web: 'Pasarela web',
  saldo_a_favor: 'Saldo a favor',
};
const NOMBRE_SEGMENTO: Record<Segmento, string> = { vip: 'VIP', frecuente: 'Frecuente', ocasional: 'Ocasional', en_riesgo: 'En riesgo', nuevo: 'Nuevo' };
const NOMBRE_CANAL = { local: 'Local', whatsapp: 'WhatsApp', instagram: 'Instagram', web: 'Web' } as const;

function semanaIso(f: FechaISO): string {
  const jueves = sumarDias(lunesDe(f), 3);
  const anio = jueves.slice(0, 4);
  const semana = Math.floor((diaN(jueves) - diaN(lunesDe(`${anio}-01-04`))) / 7) + 1;
  return `${anio}-S${String(semana).padStart(2, '0')}`;
}

/**
 * Hechos de análisis: cada hecho de venta (V4) con sus 15 dimensiones. Para "medio de pago", las ventas de
 * contado con pago mixto se reparten por la proporción de cada medio línea por línea (las unidades enteras van
 * al medio de mayor proporción); separado y crédito aparecen como "Separado" y "Crédito" (P9).
 */
export const selHechosAnalisis = crearSelector<{ hoy: FechaISO }, HechoAnalisis[]>(
  'selHechosAnalisis',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'colores', 'locales', 'empleados', 'clientes', 'parametros'],
  (e, { hoy }) => {
    const seg = selMetricasClientes(e, { hoy });
    const proporciones = new Map<Id, { medio: string; p: number }[]>();
    const propDe = (ventaId: Id) => {
      let r = proporciones.get(ventaId);
      if (r) return r;
      const v = e.ventas[ventaId];
      if (!v || v.tipo !== 'contado') r = [{ medio: v?.tipo === 'credito' ? 'Crédito' : 'Separado', p: 1 }];
      else {
        const m = new Map<string, number>();
        let t = 0;
        for (const p of v.pagos) {
          if (p.tipo !== 'pago') continue;
          m.set(NOMBRE_MEDIO[p.medio], (m.get(NOMBRE_MEDIO[p.medio]) ?? 0) + p.valor);
          t += p.valor;
        }
        r = t > 0 ? [...m.entries()].map(([medio, x]) => ({ medio, p: x / t })).sort((a, b) => b.p - a.p) : [{ medio: 'Sin pago', p: 1 }];
      }
      proporciones.set(ventaId, r);
      return r;
    };
    const r: HechoAnalisis[] = [];
    for (const h of hechosDeVenta(e)) {
      const p = e.productos[h.productoId];
      const c = e.colores[h.colorId];
      const dim: Omit<Record<Dimension, string>, 'medioPago'> = {
        mes: h.fecha.slice(0, 7),
        semana: semanaIso(h.fecha),
        fecha: h.fecha,
        diaSemana: DIAS[diaSemana(h.fecha)] ?? '',
        hora: `${String(h.hora).padStart(2, '0')}:00`,
        local: e.locales[h.localId]?.nombre ?? h.localId,
        vendedor: nombreEmpleado(e.empleados[h.vendedorId]),
        categoria: h.categoria ? NOMBRES_CATEGORIA[h.categoria] : '',
        linea: h.linea ? NOMBRES_LINEA[h.linea] : '',
        producto: p ? `${p.referencia} · ${p.nombre}` : h.productoId,
        talla: h.talla,
        color: c?.nombre ?? h.colorId,
        canal: NOMBRE_CANAL[h.canal],
        segmento: h.clienteId ? NOMBRE_SEGMENTO[seg[h.clienteId]?.segmento ?? 'nuevo'] : 'Consumidor final',
      };
      const props = propDe(h.ventaId);
      props.forEach((x, i) => {
        r.push({
          ventaId: h.ventaId,
          tipo: h.tipo,
          dim: { ...dim, medioPago: x.medio },
          total: h.total * x.p,
          base: h.base * x.p,
          costo: h.costo * x.p,
          cantidad: i === 0 ? h.cantidad : 0,
        });
      });
    }
    return r;
  },
);

/** Hechos de análisis con todas las dimensiones (alias del catálogo 6.23). */
export const hechosAnalisis = (e: EstadoDominio, hoy: FechaISO) => selHechosAnalisis(e, { hoy });

interface Acum {
  total: number;
  base: number;
  costo: number;
  cantidad: number;
  brutas: number;
  ventas: Set<Id>;
}
const nuevo = (): Acum => ({ total: 0, base: 0, costo: 0, cantidad: 0, brutas: 0, ventas: new Set() });
function sumar(a: Acum, h: HechoAnalisis): void {
  a.total += h.total;
  a.base += h.base;
  a.costo += h.costo;
  a.cantidad += h.cantidad;
  if (h.tipo === 'venta') {
    a.brutas += h.total;
    a.ventas.add(h.ventaId);
  }
}
export function valorMedida(a: Acum, m: Medida): number {
  switch (m) {
    case 'ventas':
      return Math.round(a.total);
    case 'ventasSinIva':
      return Math.round(a.base);
    case 'unidades':
      return a.cantidad;
    case 'numVentas':
      return a.ventas.size;
    case 'ticket':
      return a.ventas.size ? Math.round(a.brutas / a.ventas.size) : 0;
    case 'margen':
      return Math.round(a.base - a.costo);
    case 'margenPct':
      return a.base ? (a.base - a.costo) / a.base : 0;
  }
}

export interface OpcionesPivote {
  filas: Dimension[];
  columnas: Dimension[];
  medida: Medida;
  /** Valores permitidos por dimensión (vacío o ausente = todos). */
  filtros?: Partial<Record<Dimension, string[]>>;
}

export interface ResultadoPivote {
  medida: Medida;
  /** Claves de columna (cada una, los valores de las dimensiones de columna unidos por " · "). */
  columnas: string[];
  filas: { clave: string[]; celdas: Record<string, number>; total: number }[];
  totalesColumna: Record<string, number>;
  total: number;
}

/** Tabla dinámica con totales y subtotales NO aditivos recalculados desde los hechos (6.23). */
export function pivotear(hechos: readonly HechoAnalisis[], o: OpcionesPivote): ResultadoPivote {
  const filtros = Object.entries(o.filtros ?? {}).filter(([, v]) => v && v.length > 0) as [Dimension, string[]][];
  const celdas = new Map<string, Map<string, Acum>>();
  const porFila = new Map<string, Acum>();
  const porCol = new Map<string, Acum>();
  const total = nuevo();
  const claveFila = new Map<string, string[]>();
  for (const h of hechos) {
    if (filtros.some(([d, vals]) => !vals.includes(h.dim[d]))) continue;
    const fv = o.filas.map((d) => h.dim[d]);
    const fk = fv.join(' · ');
    const ck = o.columnas.map((d) => h.dim[d]).join(' · ') || 'Total';
    claveFila.set(fk, fv);
    let fila = celdas.get(fk);
    if (!fila) celdas.set(fk, (fila = new Map()));
    let a = fila.get(ck);
    if (!a) fila.set(ck, (a = nuevo()));
    sumar(a, h);
    let f = porFila.get(fk);
    if (!f) porFila.set(fk, (f = nuevo()));
    sumar(f, h);
    let c = porCol.get(ck);
    if (!c) porCol.set(ck, (c = nuevo()));
    sumar(c, h);
    sumar(total, h);
  }
  const columnas = [...porCol.keys()].sort();
  const filas = [...celdas.entries()]
    .map(([fk, m]) => {
      const cel: Record<string, number> = {};
      for (const [ck, a] of m) cel[ck] = valorMedida(a, o.medida);
      return { clave: claveFila.get(fk) ?? [fk], celdas: cel, total: valorMedida(porFila.get(fk) ?? nuevo(), o.medida) };
    })
    .sort((a, b) => (a.clave.join('|') < b.clave.join('|') ? -1 : 1));
  const totalesColumna: Record<string, number> = {};
  for (const [ck, a] of porCol) totalesColumna[ck] = valorMedida(a, o.medida);
  return { medida: o.medida, columnas, filas, totalesColumna, total: valorMedida(total, o.medida) };
}

/** Tabla dinámica sobre los hechos de análisis (memoizada por opciones). */
export const selPivote = crearSelector<OpcionesPivote & { hoy: FechaISO }, ResultadoPivote>(
  'selPivote',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'colores', 'locales', 'empleados', 'clientes', 'parametros'],
  (e, o) => pivotear(selHechosAnalisis(e, { hoy: o.hoy }), o),
);

// ---------------------------------------------------------------------------------------------------------
// Series y comparativos
// ---------------------------------------------------------------------------------------------------------
export interface VentasMes {
  mes: MesISO;
  netas: COP;
  /** El mismo mes del año anterior (null si cae antes de la ventana). */
  anioAnterior: COP | null;
}

/** Ventas por mes de los últimos `meses` (incluido el actual a la fecha) con el año anterior. */
export const selVentasPorMes = crearSelector<{ meses: number; hoy: FechaISO; localId?: Id | 'todos' }, VentasMes[]>(
  'selVentasPorMes',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'meta'],
  (e, { meses, hoy, localId = 'todos' }) => {
    const porMes = new Map<string, number>();
    for (const h of hechosDeVenta(e)) if (localId === 'todos' || h.localId === localId) porMes.set(h.fecha.slice(0, 7), (porMes.get(h.fecha.slice(0, 7)) ?? 0) + h.total);
    const inicio = e.meta.inicioVentana.slice(0, 7);
    const r: VentasMes[] = [];
    for (let i = meses - 1; i >= 0; i--) {
      const m = sumarMesesAMes(hoy.slice(0, 7), -i);
      if (m < inicio) continue;
      const ant = sumarMesesAMes(m, -12);
      r.push({ mes: m, netas: porMes.get(m) ?? 0, anioAnterior: ant >= inicio ? (porMes.get(ant) ?? 0) : null });
    }
    return r;
  },
);

export interface MapaCalor {
  /** Lunes primero: ['Lun', …, 'Dom']. */
  dias: string[];
  horas: number[];
  /** valores[d][h] = ventas netas con IVA. */
  valores: number[][];
  numVentas: number[][];
  maximo: number;
}

/** Mapa de calor día × hora (8.9.4): ventas netas por día de la semana y hora. */
export const selMapaCalor = crearSelector<{ desde: FechaISO; hasta: FechaISO; localId: Id | 'todos' }, MapaCalor>(
  'selMapaCalor',
  ['ventas', 'devoluciones', 'productos', 'variantes'],
  (e, { desde, hasta, localId }) => {
    const horas = Array.from({ length: 13 }, (_, i) => i + 9);
    const valores = Array.from({ length: 7 }, () => horas.map(() => 0));
    const conteo = Array.from({ length: 7 }, () => horas.map(() => new Set<Id>()));
    for (const h of hechosEnRango(hechosEnFechas(e, { desde, hasta }), desde, hasta, localId)) {
      const d = (diaSemana(h.fecha) + 6) % 7;
      const i = h.hora - 9;
      if (i < 0 || i >= horas.length) continue;
      const fila = valores[d];
      if (fila) fila[i] = (fila[i] ?? 0) + h.total;
      if (h.tipo === 'venta') conteo[d]?.[i]?.add(h.ventaId);
    }
    let maximo = 0;
    for (const f of valores) for (const v of f) if (v > maximo) maximo = v;
    return { dias: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'], horas, valores, numVentas: conteo.map((f) => f.map((s) => s.size)), maximo };
  },
);

/** Ventas por semana (lunes) de las últimas `semanas`. */
export const selVentasPorSemana = crearSelector<{ semanas: number; hoy: FechaISO; localId: Id | 'todos' }, { lunes: FechaISO; netas: COP; numVentas: number }[]>(
  'selVentasPorSemana',
  ['ventas', 'devoluciones', 'productos', 'variantes'],
  (e, { semanas, hoy, localId }) => {
    const primero = sumarDias(lunesDe(hoy), -7 * (semanas - 1));
    const hechos = hechosEnRango(hechosEnFechas(e, { desde: primero, hasta: hoy }), primero, hoy, localId);
    const r: { lunes: FechaISO; netas: COP; numVentas: number }[] = [];
    for (let i = 0; i < semanas; i++) {
      const l = sumarDias(primero, 7 * i);
      const fin = sumarDias(l, 6);
      const rs = resumirHechos(hechos.filter((h) => h.fecha >= l && h.fecha <= fin));
      r.push({ lunes: l, netas: rs.netas, numVentas: rs.numVentas });
    }
    return r;
  },
);

/** Más y menos vendidos por unidades, valor o margen. */
export const selMasYMenosVendidos = crearSelector<
  { desde: FechaISO; hasta: FechaISO; localId: Id | 'todos'; medida: 'unidades' | 'valor' | 'margen'; n: number },
  { mas: TopProducto[]; menos: TopProducto[] }
>('selMasYMenosVendidos', ['ventas', 'devoluciones', 'productos', 'variantes'], (e, p) => ({
  mas: selTopProductos(e, { ...p, orden: 'mas' }),
  menos: selTopProductos(e, { ...p, orden: 'menos' }),
}));

export interface TallasYColores {
  tallas: { talla: string; unidades: number; proporcion: number; insatisfecha: number }[];
  colores: { colorId: Id; nombre: string; familia: string; unidades: number; proporcion: number }[];
}

/** Tallas y colores que más rotan en una categoría (P3, P4, P12) con la demanda insatisfecha (N16). */
export const selTallasYColores = crearSelector<{ categoria: Categoria; desde: FechaISO; hasta: FechaISO }, TallasYColores>(
  'selTallasYColores',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'colores', 'meta'],
  (e, { categoria, desde, hasta }) => {
    const tallas = new Map<string, number>();
    const colores = new Map<Id, number>();
    let total = 0;
    for (const h of hechosEnFechas(e, { desde, hasta })) {
      if (h.tipo !== 'venta' || h.categoria !== categoria) continue;
      if (e.ventas[h.ventaId]?.separado?.cerrado?.resultado === 'cancelado') continue;
      tallas.set(h.talla, (tallas.get(h.talla) ?? 0) + h.cantidad);
      colores.set(h.colorId, (colores.get(h.colorId) ?? 0) + h.cantidad);
      total += h.cantidad;
    }
    const insat = new Map<string, number>();
    for (const [k, n] of Object.entries(e.meta.demandaInsatisfecha)) {
      const v = e.variantes[k.slice(0, k.indexOf('@'))];
      const p = v ? e.productos[v.productoId] : undefined;
      if (v && p?.categoria === categoria) insat.set(v.talla, (insat.get(v.talla) ?? 0) + n);
    }
    return {
      tallas: [...tallas.entries()].map(([talla, u]) => ({ talla, unidades: u, proporcion: total ? u / total : 0, insatisfecha: insat.get(talla) ?? 0 })).sort((a, b) => b.unidades - a.unidades),
      colores: [...colores.entries()]
        .map(([colorId, u]) => ({ colorId, nombre: e.colores[colorId]?.nombre ?? colorId, familia: '', unidades: u, proporcion: total ? u / total : 0 }))
        .sort((a, b) => b.unidades - a.unidades),
    };
  },
);

/** Rotación por categoría: días de inventario (P5) y valor a costo. */
export const selRotacion = crearSelector<{ hoy: FechaISO }, { tienda: DiasInventario; categorias: DiasInventario[] }>(
  'selRotacion',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'agregados'],
  (e, { hoy }) => ({
    tienda: selDiasInventario(e, { hoy }),
    categorias: (Object.keys(NOMBRES_CATEGORIA) as Categoria[]).map((c) => selDiasInventario(e, { categoria: c, hoy })).sort((a, b) => b.dias - a.dias),
  }),
);

export interface DesempenoLocal {
  localId: Id;
  nombre: string;
  resumen: ResumenVentas;
  participacion: number;
  unidadesPorVenta: number;
}

/** Desempeño por local (P1): ventas, ticket, unidades por venta y participación. */
export const selDesempenoLocales = crearSelector<{ desde: FechaISO; hasta: FechaISO }, DesempenoLocal[]>(
  'selDesempenoLocales',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'locales'],
  (e, { desde, hasta }) => {
    const hechos = hechosEnFechas(e, { desde, hasta });
    const total = resumirHechos(hechos).netas;
    return Object.values(e.locales)
      .filter((l) => l.vende && !l.eliminadoEn)
      .sort((a, b) => a.orden - b.orden)
      .map((l) => {
        const r = resumirHechos(hechos.filter((h) => h.localId === l.id));
        const unidadesVenta = hechos.filter((h) => h.localId === l.id && h.tipo === 'venta').reduce((a, h) => a + h.cantidad, 0);
        return { localId: l.id, nombre: l.nombre, resumen: r, participacion: total ? r.netas / total : 0, unidadesPorVenta: r.numVentas ? unidadesVenta / r.numVentas : 0 };
      });
  },
);

export interface DesempenoVendedor {
  empleadoId: Id;
  nombre: string;
  localId: Id | null;
  /** Ventas reconocidas con IVA (definición de P2: sin devoluciones). */
  ventas: COP;
  numVentas: number;
  ticket: COP;
  /** % de ventas con al menos un accesorio (P2). */
  conAccesorio: number;
  /** Participación en las ventas de su local. */
  participacionLocal: number;
  /** Veces el promedio del equipo. */
  vecesPromedio: number;
}

/** Desempeño por vendedor con la definición de P2 (ventas reconocidas del rango, por valor). */
export const selDesempenoVendedores = crearSelector<{ desde: FechaISO; hasta: FechaISO }, DesempenoVendedor[]>(
  'selDesempenoVendedores',
  ['ventas', 'productos', 'empleados'],
  (e, { desde, hasta }) => {
    const m = new Map<Id, { valor: number; n: number; acc: number }>();
    const porLocal = new Map<Id, number>();
    for (const v of Object.values(e.ventas)) {
      if (v.anulacion || v.separado?.cerrado?.resultado === 'cancelado') continue;
      const f = v.ts.slice(0, 10);
      if (f < desde || f > hasta) continue;
      const a = m.get(v.vendedorId) ?? { valor: 0, n: 0, acc: 0 };
      a.valor += v.total;
      a.n += 1;
      if (v.lineas.some((l) => e.productos[l.productoId]?.categoria === 'accesorios')) a.acc += 1;
      m.set(v.vendedorId, a);
      porLocal.set(v.localId, (porLocal.get(v.localId) ?? 0) + v.total);
    }
    const promedio = [...m.values()].reduce((s, x) => s + x.valor, 0) / Math.max(1, m.size);
    return [...m.entries()]
      .map(([id, x]) => {
        const em = e.empleados[id];
        const local = em?.localId ?? null;
        return {
          empleadoId: id,
          nombre: nombreEmpleado(em),
          localId: local,
          ventas: x.valor,
          numVentas: x.n,
          ticket: x.n ? Math.round(x.valor / x.n) : 0,
          conAccesorio: x.n ? x.acc / x.n : 0,
          participacionLocal: local && porLocal.get(local) ? x.valor / (porLocal.get(local) ?? 1) : 0,
          vecesPromedio: promedio ? x.valor / promedio : 0,
        };
      })
      .sort((a, b) => b.ventas - a.ventas);
  },
);

export interface ComportamientoClientes {
  numVentas: number;
  conCliente: number;
  /** Proporción de ventas a consumidor final. */
  consumidorFinal: number;
  valorConCliente: COP;
  valorPorSegmento: Record<Segmento, COP>;
}

/** Comportamiento de clientes (P11): proporción de consumidor final y valor por segmento. */
export const selComportamientoClientes = crearSelector<{ desde: FechaISO; hasta: FechaISO; hoy: FechaISO }, ComportamientoClientes>(
  'selComportamientoClientes',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'clientes', 'parametros'],
  (e, { desde, hasta, hoy }) => {
    const seg = selMetricasClientes(e, { hoy });
    let n = 0;
    let con = 0;
    let valorCon = 0;
    const porSeg: Record<Segmento, COP> = { vip: 0, frecuente: 0, ocasional: 0, en_riesgo: 0, nuevo: 0 };
    for (const v of Object.values(e.ventas)) {
      if (v.anulacion || v.separado?.cerrado?.resultado === 'cancelado') continue;
      const f = v.ts.slice(0, 10);
      if (f < desde || f > hasta) continue;
      n += 1;
      if (!v.clienteId) continue;
      con += 1;
      valorCon += v.total;
      const s = seg[v.clienteId]?.segmento;
      if (s) porSeg[s] += v.total;
    }
    return { numVentas: n, conCliente: con, consumidorFinal: n ? 1 - con / n : 0, valorConCliente: valorCon, valorPorSegmento: porSeg };
  },
);

/**
 * Medios de pago por valor (definición de P9): pagos de tipo 'pago' de las ventas reconocidas del rango
 * (el datáfono junto); los separados cuentan aparte por su total.
 */
export const selMediosDePago = crearSelector<{ desde: FechaISO; hasta: FechaISO }, { medio: string; valor: COP; proporcion: number }[]>(
  'selMediosDePago',
  ['ventas'],
  (e, { desde, hasta }) => {
    const t = new Map<string, number>();
    let total = 0;
    for (const v of Object.values(e.ventas)) {
      if (v.anulacion || v.separado?.cerrado?.resultado === 'cancelado') continue;
      const f = v.ts.slice(0, 10);
      if (f < desde || f > hasta) continue;
      if (v.tipo === 'separado') {
        t.set('separado', (t.get('separado') ?? 0) + v.total);
        total += v.total;
        continue;
      }
      for (const p of v.pagos) {
        if (p.tipo !== 'pago') continue;
        const k = p.medio === 'datafono_debito' || p.medio === 'datafono_credito' ? 'datafono' : p.medio;
        t.set(k, (t.get(k) ?? 0) + p.valor);
        total += p.valor;
      }
    }
    return [...t.entries()].map(([medio, valor]) => ({ medio, valor, proporcion: total ? valor / total : 0 })).sort((a, b) => b.valor - a.valor);
  },
);

export interface ProyeccionMes {
  mes: MesISO;
  /** Mes a la fecha (días cerrados, sin hoy) con IVA, como P18. */
  aLaFecha: COP;
  diasTranscurridos: number;
  diasMes: number;
  /** "A este ritmo cerrarías el mes en $ X". */
  proyeccion: COP;
  /** El mismo mes del año anterior completo (null si no hay datos). */
  anioAnterior: COP | null;
  /** Mes a la fecha vs. el mismo periodo del año anterior − 1 (P18). */
  variacionMismoPeriodo: number | null;
}

/** Proyección del mes (P18): ritmo de los días cerrados del mes y comparación con el año anterior. */
export const selProyeccionMes = crearSelector<{ hoy: FechaISO }, ProyeccionMes>(
  'selProyeccionMes',
  ['ventas', 'meta'],
  (e, { hoy }) => {
    const dia = Number(hoy.slice(8, 10));
    const mes = hoy.slice(0, 7);
    const anio = Number(hoy.slice(0, 4));
    const mesAnt = `${anio - 1}-${hoy.slice(5, 7)}`;
    const reconocida = (v: { anulacion: unknown; separado: { cerrado: { resultado: string } | null } | null }) =>
      !v.anulacion && v.separado?.cerrado?.resultado !== 'cancelado';
    let mtd = 0;
    let mtdAnt = 0;
    let completoAnt = 0;
    for (const v of Object.values(e.ventas)) {
      if (!reconocida(v)) continue;
      const d = Number(v.ts.slice(8, 10));
      if (v.ts.startsWith(mes) && d < dia) mtd += v.total;
      if (v.ts.startsWith(mesAnt)) {
        completoAnt += v.total;
        if (d < dia) mtdAnt += v.total;
      }
    }
    const diasMes = diasDelMes(mes);
    const transcurridos = Math.max(0, dia - 1);
    const hayAnterior = mesAnt >= e.meta.inicioVentana.slice(0, 7);
    return {
      mes,
      aLaFecha: mtd,
      diasTranscurridos: transcurridos,
      diasMes,
      proyeccion: transcurridos ? Math.round((mtd * diasMes) / transcurridos) : 0,
      anioAnterior: hayAnterior ? completoAnt : null,
      variacionMismoPeriodo: hayAnterior && mtdAnt > 0 ? mtd / mtdAnt - 1 : null,
    };
  },
);

/** Días de un rango (utilidad para los módulos). */
export const diasDeRango = rangoFechas;

import type { Categoria, Cliente, COP, FechaISO, Id, Venta } from '@/dominio/tipos';
import { segmentoCliente, type Segmento } from '@/dominio/reglas/segmentacion';
import { diferenciaDias, sumarDias } from '@/dominio/reglas/fechas';
import { saldoVenta } from '@/dominio/reglas/ventas';
import { normalizar } from '@/dominio/reglas/texto';
import { crearSelector } from './memo';
import { selDevolucionesPorVenta } from './ventas';

/**
 * Clientes (PLAN 6.23 `clientes.ts`, 6.20.8, P11). Métricas en una pasada. El SEGMENTO usa la definición de P11:
 * compras reconocidas (sin anuladas ni separados cancelados) ANTES de hoy, valor con IVA de los últimos 12 meses.
 */
export interface MetricasCliente {
  clienteId: Id;
  /** Compras reconocidas (todas, incluido hoy). */
  compras: number;
  /** Valor histórico con IVA (bruto, sin restar devoluciones). */
  valor: COP;
  ticket: COP;
  /** Días promedio entre compras (null con menos de 2). */
  frecuenciaDias: number | null;
  primeraCompra: FechaISO | null;
  ultimaCompra: FechaISO | null;
  valor12m: COP;
  compras12m: number;
  /** Talla más comprada por tipo de prenda (moda), derivada. */
  tallas: Partial<Record<Categoria, string>>;
  /** Colores más comprados (ids, de más a menos). */
  colores: Id[];
  localHabitualId: Id | null;
  vendedorHabitualId: Id | null;
  /** Σ devoluciones y separados cancelados con saldo a favor − Σ pagos con saldo a favor (V3). */
  saldoAFavor: COP;
  /** Σ saldo de sus separados y créditos. */
  porCobrar: COP;
  segmento: Segmento;
}

const reconocida = (v: Venta) => !v.anulacion && v.separado?.cerrado?.resultado !== 'cancelado';

function moda<T extends string>(m: Map<T, number>): T | null {
  let mejor: T | null = null;
  let n = -1;
  for (const [k, v] of m) if (v > n || (v === n && mejor !== null && k < mejor)) {
    mejor = k;
    n = v;
  }
  return mejor;
}

/** Métricas de todos los clientes en una pasada (A4, segmentos, análisis de clientes). */
export const selMetricasClientes = crearSelector<{ hoy: FechaISO }, Record<Id, MetricasCliente>>(
  'selMetricasClientes',
  ['clientes', 'ventas', 'devoluciones', 'productos', 'variantes', 'parametros'],
  (e, { hoy }) => {
    const hace12 = sumarDias(hoy, -365);
    const devs = selDevolucionesPorVenta(e);
    interface Acum {
      fechas: FechaISO[];
      compras: number;
      valor: number;
      valor12: number;
      n12: number;
      primeraSeg: FechaISO | null;
      ultimaSeg: FechaISO | null;
      valor12Seg: number;
      n12Seg: number;
      tallas: Map<Categoria, Map<string, number>>;
      colores: Map<Id, number>;
      locales: Map<Id, number>;
      vendedores: Map<Id, number>;
      saldoAFavor: number;
      porCobrar: number;
    }
    const acc = new Map<Id, Acum>();
    const de = (id: Id): Acum => {
      let a = acc.get(id);
      if (!a) {
        a = {
          fechas: [],
          compras: 0,
          valor: 0,
          valor12: 0,
          n12: 0,
          primeraSeg: null,
          ultimaSeg: null,
          valor12Seg: 0,
          n12Seg: 0,
          tallas: new Map(),
          colores: new Map(),
          locales: new Map(),
          vendedores: new Map(),
          saldoAFavor: 0,
          porCobrar: 0,
        };
        acc.set(id, a);
      }
      return a;
    };
    for (const v of Object.values(e.ventas)) {
      if (!v.clienteId) continue;
      const a = de(v.clienteId);
      for (const p of v.pagos) if (p.medio === 'saldo_a_favor') a.saldoAFavor -= p.valor;
      if (v.separado?.cerrado?.resultado === 'cancelado') for (const p of v.pagos) a.saldoAFavor += p.valor;
      const ds = devs[v.id] ?? [];
      for (const d of ds) if (d.compensacion === 'saldo_favor' || d.compensacion === 'cambio') a.saldoAFavor += d.valorTotal;
      if (!reconocida(v)) continue;
      if ((v.tipo === 'separado' && !v.separado?.cerrado) || v.tipo === 'credito') a.porCobrar += saldoVenta(v, ds);
      const f = v.ts.slice(0, 10);
      a.fechas.push(f);
      a.compras += 1;
      a.valor += v.total;
      if (f >= hace12) {
        a.valor12 += v.total;
        a.n12 += 1;
      }
      if (f < hoy) {
        if (!a.primeraSeg || f < a.primeraSeg) a.primeraSeg = f;
        if (!a.ultimaSeg || f > a.ultimaSeg) a.ultimaSeg = f;
        if (f >= hace12) {
          a.valor12Seg += v.total;
          a.n12Seg += 1;
        }
      }
      a.locales.set(v.localId, (a.locales.get(v.localId) ?? 0) + 1);
      a.vendedores.set(v.vendedorId, (a.vendedores.get(v.vendedorId) ?? 0) + 1);
      for (const l of v.lineas) {
        const va = e.variantes[l.varianteId];
        const p = e.productos[l.productoId];
        if (!va || !p) continue;
        let t = a.tallas.get(p.categoria);
        if (!t) a.tallas.set(p.categoria, (t = new Map()));
        t.set(va.talla, (t.get(va.talla) ?? 0) + l.cantidad);
        a.colores.set(va.colorId, (a.colores.get(va.colorId) ?? 0) + l.cantidad);
      }
    }
    const r: Record<Id, MetricasCliente> = {};
    for (const c of Object.values(e.clientes)) {
      if (c.eliminadoEn) continue;
      const a = acc.get(c.id);
      const fechas = (a?.fechas ?? []).sort();
      const primera = fechas[0] ?? null;
      const ultima = fechas[fechas.length - 1] ?? null;
      const tallas: Partial<Record<Categoria, string>> = {};
      if (a) for (const [cat, m] of a.tallas) {
        const t = moda(m);
        if (t) tallas[cat] = t;
      }
      r[c.id] = {
        clienteId: c.id,
        compras: a?.compras ?? 0,
        valor: a?.valor ?? 0,
        ticket: a && a.compras ? Math.round(a.valor / a.compras) : 0,
        frecuenciaDias: fechas.length >= 2 && primera && ultima ? diferenciaDias(primera, ultima) / (fechas.length - 1) : null,
        primeraCompra: primera,
        ultimaCompra: ultima,
        valor12m: a?.valor12 ?? 0,
        compras12m: a?.n12 ?? 0,
        tallas,
        colores: a ? [...a.colores.entries()].sort((x, y) => y[1] - x[1]).map(([id]) => id) : [],
        localHabitualId: a ? moda(a.locales) : null,
        vendedorHabitualId: a ? moda(a.vendedores) : null,
        saldoAFavor: Math.max(0, a?.saldoAFavor ?? 0),
        porCobrar: a?.porCobrar ?? 0,
        segmento: segmentoCliente(
          {
            registro: c.creadoEn.slice(0, 10),
            primeraCompra: a?.primeraSeg ?? null,
            ultimaCompra: a?.ultimaSeg ?? null,
            valor12m: a?.valor12Seg ?? 0,
            compras12m: a?.n12Seg ?? 0,
          },
          hoy,
          e.parametros.segmentacion,
        ),
      };
    }
    return r;
  },
);

export interface FilaCliente {
  cliente: Cliente;
  metricas: MetricasCliente;
}

/** Lista de clientes con filtros; `vendedorId` = "sus clientes" del vendedor (los que más atiende). */
export const selClientes = crearSelector<
  { hoy: FechaISO; texto?: string; segmento?: Segmento; localId?: Id | 'todos'; vendedorId?: Id },
  FilaCliente[]
>('selClientes', ['clientes', 'ventas', 'devoluciones', 'productos', 'variantes', 'parametros'], (e, f) => {
  const m = selMetricasClientes(e, { hoy: f.hoy });
  const t = f.texto ? normalizar(f.texto) : '';
  const r: FilaCliente[] = [];
  for (const c of Object.values(e.clientes)) {
    const x = m[c.id];
    if (!x) continue;
    if (f.segmento && x.segmento !== f.segmento) continue;
    if (f.localId && f.localId !== 'todos' && (x.localHabitualId ?? c.localRegistroId) !== f.localId) continue;
    if (f.vendedorId && x.vendedorHabitualId !== f.vendedorId && c.registradoPorId !== f.vendedorId) continue;
    if (t && !normalizar(`${c.nombres} ${c.apellidos} ${c.celular} ${c.documento?.numero ?? ''} ${c.correo ?? ''}`).includes(t)) continue;
    r.push({ cliente: c, metricas: x });
  }
  return r.sort((a, b) => b.metricas.valor - a.metricas.valor || (a.cliente.apellidos < b.cliente.apellidos ? -1 : 1));
});

export interface FichaCliente {
  cliente: Cliente;
  metricas: MetricasCliente;
  ventas: Venta[];
}

export const selCliente = crearSelector<{ clienteId: Id; hoy: FechaISO }, FichaCliente | null>(
  'selCliente',
  ['clientes', 'ventas', 'devoluciones', 'productos', 'variantes', 'parametros'],
  (e, { clienteId, hoy }) => {
    const c = e.clientes[clienteId];
    const m = selMetricasClientes(e, { hoy })[clienteId];
    if (!c || !m) return null;
    const ventas = Object.values(e.ventas)
      .filter((v) => v.clienteId === clienteId)
      .sort((a, b) => (a.ts < b.ts ? 1 : -1));
    return { cliente: c, metricas: m, ventas };
  },
);

/** Conteo por segmento (chips de A4). */
export const selSegmentos = crearSelector<{ hoy: FechaISO }, Record<Segmento, number>>(
  'selSegmentos',
  ['clientes', 'ventas', 'devoluciones', 'productos', 'variantes', 'parametros'],
  (e, { hoy }) => {
    const r: Record<Segmento, number> = { vip: 0, frecuente: 0, ocasional: 0, en_riesgo: 0, nuevo: 0 };
    for (const m of Object.values(selMetricasClientes(e, { hoy }))) r[m.segmento] += 1;
    return r;
  },
);

export interface Cumpleanos {
  cliente: Cliente;
  dia: number;
  esHoy: boolean;
  segmento: Segmento;
  valor: COP;
}

/** Cumpleaños del mes (MM) con su segmento; los de hoy primero. */
export const selCumpleanosMes = crearSelector<{ mes: string; hoy: FechaISO }, Cumpleanos[]>(
  'selCumpleanosMes',
  ['clientes', 'ventas', 'devoluciones', 'productos', 'variantes', 'parametros'],
  (e, { mes, hoy }) => {
    const mm = mes.length > 2 ? mes.slice(5, 7) : mes;
    const m = selMetricasClientes(e, { hoy });
    return Object.values(e.clientes)
      .filter((c) => !c.eliminadoEn && c.cumpleanos?.startsWith(`${mm}-`))
      .map((c) => ({
        cliente: c,
        dia: Number(c.cumpleanos?.slice(3, 5)),
        esHoy: c.cumpleanos === hoy.slice(5, 10),
        segmento: m[c.id]?.segmento ?? 'nuevo',
        valor: m[c.id]?.valor ?? 0,
      }))
      .sort((a, b) => Number(b.esHoy) - Number(a.esHoy) || a.dia - b.dia);
  },
);

import type { CategoriaGasto, COP, CuentaDinero, FechaISO, Gasto, GastoRecurrente, Id, Local, MesISO, Proveedor } from '@/dominio/tipos';
import { sumarMesesAMes } from '@/dominio/reglas/fechas';
import {
  crearSelector,
  hechosEnFechas,
  hechosEnRango,
  selEstadoResultados,
  selGastos,
  selLocales,
  selLocalesQueVenden,
  selPuntoEquilibrio,
  selResumenGastos,
  selSaldosCuentas,
  type EstadoResultados,
} from '@/selectores';
import {
  conGeneralesRepartidos,
  diaDeEquilibrio,
  estadoRecurrenteEnMes,
  fechaPrevista,
  rangoDeMes,
  type BasePuntoEquilibrio,
  type EstadoRecurrenteMes,
} from './calculos';

/**
 * Selectores locales de Costos y gastos (B4): componen los del dominio (`selEstadoResultados`, `selPuntoEquilibrio`,
 * `selGastos`) para armar lo que pintan las pantallas. Declaran TODAS las tablas que leen (también a través de los
 * selectores que invocan) para que el caché y la verificación de tablas funcionen.
 */

const TABLAS_RESULTADOS = ['ventas', 'devoluciones', 'productos', 'variantes', 'gastos', 'parametros', 'locales'] as const;

// ---------------------------------------------------------------------------------------------------------
// Estado de resultados local por local
// ---------------------------------------------------------------------------------------------------------
export interface ResultadosPorLocal {
  locales: { local: Local; er: EstadoResultados }[];
  /** El negocio completo (incluye todos los gastos, también los generales). */
  total: EstadoResultados;
  /**
   * Gastos del negocio que los tres locales no explican: los generales y los de la bodega, si no se repartieron (con
   * el reparto, el dominio los suma a cada local y aquí solo queda el residuo del redondeo, que se ignora).
   */
  sinAsignar: COP;
}

/** El estado de resultados de cada local que vende y del negocio, en un mes. */
export const selResultadosPorLocal = crearSelector<{ mes: MesISO; prorratear: boolean }, ResultadosPorLocal>(
  'selResultadosPorLocal',
  TABLAS_RESULTADOS,
  (e, { mes, prorratear }) => {
    const { desde, hasta } = rangoDeMes(mes);
    const locales = selLocalesQueVenden(e).map((local) => ({
      local,
      er: selEstadoResultados(e, { desde, hasta, localId: local.id, prorratear }),
    }));
    const total = selEstadoResultados(e, { desde, hasta, localId: 'todos', prorratear: false });
    const asignado = locales.reduce((a, x) => a + x.er.gastosOperativos + x.er.gastosGeneralesProrrateados, 0);
    const resto = total.gastosOperativos - asignado;
    // El reparto de los generales redondea por local: unos pocos pesos de residuo no son un gasto.
    const sinAsignar = Math.abs(resto) <= locales.length ? 0 : resto;
    return { locales, total, sinAsignar };
  },
);

export type FilaSerieUtilidad = { mes: MesISO } & Record<string, string | number>;

/** Utilidad operativa mes a mes de cada local (los últimos `meses` hasta `hasta`, del más antiguo al más reciente). */
export const selSerieUtilidad = crearSelector<{ hasta: MesISO; meses: number; prorratear: boolean }, { filas: FilaSerieUtilidad[]; locales: Local[] }>(
  'selSerieUtilidad',
  TABLAS_RESULTADOS,
  (e, { hasta, meses, prorratear }) => {
    const locales = selLocalesQueVenden(e);
    const filas: FilaSerieUtilidad[] = [];
    for (let i = meses - 1; i >= 0; i--) {
      const mes = sumarMesesAMes(hasta, -i);
      const { desde, hasta: fin } = rangoDeMes(mes);
      const fila: FilaSerieUtilidad = { mes };
      for (const l of locales) fila[l.id] = selEstadoResultados(e, { desde, hasta: fin, localId: l.id, prorratear }).utilidadOperativa;
      filas.push(fila);
    }
    return { filas, locales };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Punto de equilibrio
// ---------------------------------------------------------------------------------------------------------
export interface FilaEquilibrio extends BasePuntoEquilibrio {
  /** Id del local o 'todos'. */
  id: Id | 'todos';
  nombre: string;
  /** Parte de los gastos generales sumada al local (0 si no se pidió). */
  generalesRepartidos: COP;
  /** Primer día del mes en que las ventas acumuladas cubrieron el punto de equilibrio. */
  diaEquilibrio: FechaISO | null;
}

/**
 * Punto de equilibrio de cada local y del negocio. Con `repartirGenerales`, a cada local se le suma la parte de los
 * gastos generales que le toca (la que calcula el estado de resultados) y se recalcula con el mismo método del dominio.
 */
export const selEquilibrioLocales = crearSelector<{ mes: MesISO; repartirGenerales: boolean }, FilaEquilibrio[]>(
  'selEquilibrioLocales',
  TABLAS_RESULTADOS,
  (e, { mes, repartirGenerales }) => {
    const { desde, hasta } = rangoDeMes(mes);
    const hechos = hechosEnFechas(e, { desde, hasta });
    const base = (localId: Id | 'todos') => {
      const porDia = new Map<FechaISO, number>();
      for (const h of hechosEnRango(hechos, desde, hasta, localId)) porDia.set(h.fecha, (porDia.get(h.fecha) ?? 0) + h.base);
      return [...porDia.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([fecha, b]) => ({ fecha, base: b }));
    };
    const filas: FilaEquilibrio[] = [];
    for (const l of selLocalesQueVenden(e)) {
      const p = selPuntoEquilibrio(e, { localId: l.id, mes });
      const repartido = repartirGenerales ? selEstadoResultados(e, { desde, hasta, localId: l.id, prorratear: true }).gastosGeneralesProrrateados : 0;
      const ajustado = conGeneralesRepartidos(p, repartido);
      filas.push({ id: l.id, nombre: l.nombre, ...ajustado, generalesRepartidos: repartido, diaEquilibrio: diaDeEquilibrio(base(l.id), ajustado.ventasEquilibrio) });
    }
    const t = selPuntoEquilibrio(e, { localId: 'todos', mes });
    filas.push({ id: 'todos', nombre: 'Todo el negocio', ...t, generalesRepartidos: 0, diaEquilibrio: diaDeEquilibrio(base('todos'), t.ventasEquilibrio) });
    return filas;
  },
);

// ---------------------------------------------------------------------------------------------------------
// Gastos
// ---------------------------------------------------------------------------------------------------------
export interface FilaGastosPorLocal {
  /** Id del local (o de la bodega) o null = gastos generales. */
  localId: Id | null;
  nombre: string;
  actual: COP;
  anterior: COP;
  variacion: number | null;
}

/** Cuánto gastó cada local (y lo general) en un mes frente al anterior (valores con IVA, como el resumen por categoría). */
export const selGastosPorLocal = crearSelector<{ mes: MesISO }, { filas: FilaGastosPorLocal[]; total: COP; totalAnterior: COP }>(
  'selGastosPorLocal',
  ['gastos', 'locales'],
  (e, { mes }) => {
    const act = rangoDeMes(mes);
    const ant = rangoDeMes(sumarMesesAMes(mes, -1));
    const una = (localId: Id | 'general') => ({
      actual: selGastos(e, { ...act, localId }).total,
      anterior: selGastos(e, { ...ant, localId }).total,
    });
    const filas: FilaGastosPorLocal[] = selLocales(e, { incluirBodega: true }).map((l) => ({ localId: l.id, nombre: l.nombre, ...una(l.id), variacion: null }));
    filas.push({ localId: null, nombre: 'General', ...una('general'), variacion: null });
    for (const f of filas) f.variacion = f.anterior ? (f.actual - f.anterior) / f.anterior : null;
    filas.sort((a, b) => b.actual - a.actual);
    return { filas, total: filas.reduce((s, f) => s + f.actual, 0), totalAnterior: filas.reduce((s, f) => s + f.anterior, 0) };
  },
);

export interface ResumenCategorias {
  categorias: { categoria: CategoriaGasto; actual: COP; anterior: COP; variacion: number | null }[];
  total: COP;
  totalAnterior: COP;
}

/**
 * Resumen por categoría contra el mes anterior. Para un local o todos es el del dominio (`selResumenGastos`); para
 * los gastos generales (sin local), que el dominio no resume, se arma con los mismos pasos desde `selGastos`.
 */
export const selResumenCategorias = crearSelector<{ mes: MesISO; localId: Id | 'todos' | 'general' }, ResumenCategorias>(
  'selResumenCategorias',
  ['gastos'],
  (e, { mes, localId }) => {
    if (localId !== 'general') return selResumenGastos(e, { mes, localId });
    const sumar = (m: MesISO) => {
      const r = new Map<CategoriaGasto, number>();
      for (const g of selGastos(e, { ...rangoDeMes(m), localId: 'general' }).filas) r.set(g.categoria, (r.get(g.categoria) ?? 0) + g.valor);
      return r;
    };
    const a = sumar(mes);
    const b = sumar(sumarMesesAMes(mes, -1));
    const categorias = [...new Set([...a.keys(), ...b.keys()])]
      .map((categoria) => {
        const actual = a.get(categoria) ?? 0;
        const anterior = b.get(categoria) ?? 0;
        return { categoria, actual, anterior, variacion: anterior ? (actual - anterior) / anterior : null };
      })
      .sort((x, y) => y.actual - x.actual);
    return { categorias, total: categorias.reduce((s, x) => s + x.actual, 0), totalAnterior: categorias.reduce((s, x) => s + x.anterior, 0) };
  },
);

/** Un gasto por id (el selector de dominio filtra por rango, no por id). */
export const selGastoPorId = crearSelector<{ gastoId: Id }, Gasto | null>('selGastoPorId', ['gastos'], (e, { gastoId }) => {
  const g = e.gastos[gastoId];
  return g && !g.eliminadoEn ? g : null;
});

export interface OpcionesGasto {
  /** Proveedores a quienes se les paga un gasto (arriendos, servicios...): los de mercancía no. */
  proveedores: Pick<Proveedor, 'id' | 'nombreCorto' | 'tipo'>[];
  cuentas: { cuenta: CuentaDinero; saldo: COP }[];
  locales: Pick<Local, 'id' | 'nombre'>[];
}

/** Listas para los formularios de gasto y de recurrente. */
export const selOpcionesGasto = crearSelector<void, OpcionesGasto>('selOpcionesGasto', ['proveedores', 'cuentas', 'agregados', 'locales'], (e) => ({
  proveedores: Object.values(e.proveedores)
    .filter((p) => !p.eliminadoEn && p.tipo === 'local')
    .map((p) => ({ id: p.id, nombreCorto: p.nombreCorto, tipo: p.tipo }))
    .sort((a, b) => a.nombreCorto.localeCompare(b.nombreCorto, 'es')),
  // Se pagan gastos desde cajas, bancos y billeteras; la cuenta puente del datáfono no recibe pagos.
  cuentas: selSaldosCuentas(e).cuentas.filter((c) => c.cuenta.tipo !== 'puente'),
  // También la bodega: tiene nómina y gastos propios.
  locales: selLocales(e, { incluirBodega: true }).map((l) => ({ id: l.id, nombre: l.nombre })),
}));

// ---------------------------------------------------------------------------------------------------------
// Gastos recurrentes
// ---------------------------------------------------------------------------------------------------------
export interface FilaRecurrente {
  recurrente: GastoRecurrente;
  localNombre: string;
  proveedorNombre: string | null;
  cuentaNombre: string | null;
  estado: EstadoRecurrenteMes;
  /** Fecha en que le toca causarse en el mes visto. */
  fechaPrevista: FechaISO;
  /** Gasto ya generado en ese mes. */
  gastoDelMesId: Id | null;
  /** Cuántos gastos ha generado en total. */
  generados: number;
  /** Último mes generado. */
  ultimoMes: MesISO | null;
  categoria: CategoriaGasto;
}

export interface VistaRecurrentes {
  filas: FilaRecurrente[];
  /** Lo que sumarían los activos en un mes (con IVA). */
  totalMensual: COP;
  activos: number;
  porGenerar: FilaRecurrente[];
  valorPorGenerar: COP;
}

export const selRecurrentes = crearSelector<{ mes: MesISO; hoy: FechaISO }, VistaRecurrentes>(
  'selRecurrentes',
  ['gastosRecurrentes', 'gastos', 'locales', 'proveedores', 'cuentas'],
  (e, { mes, hoy }) => {
    const generadosMes = new Map<Id, Id>();
    const total = new Map<Id, { n: number; ultimo: MesISO }>();
    for (const id in e.gastos) {
      const g = e.gastos[id];
      if (!g || g.eliminadoEn || !g.recurrenteId) continue;
      const m = g.fecha.slice(0, 7);
      if (m === mes) generadosMes.set(g.recurrenteId, g.id);
      const t = total.get(g.recurrenteId) ?? { n: 0, ultimo: m };
      t.n += 1;
      if (m > t.ultimo) t.ultimo = m;
      total.set(g.recurrenteId, t);
    }
    const filas: FilaRecurrente[] = Object.values(e.gastosRecurrentes)
      .filter((r) => !r.eliminadoEn)
      .map((r) => {
        const local = r.localId ? e.locales[r.localId] : null;
        const gastoDelMesId = generadosMes.get(r.id) ?? null;
        const t = total.get(r.id);
        return {
          recurrente: r,
          localNombre: r.localId ? (local?.nombre ?? 'Local') : 'General',
          proveedorNombre: r.proveedorId ? (e.proveedores[r.proveedorId]?.nombreCorto ?? null) : null,
          cuentaNombre: r.cuentaId ? (e.cuentas[r.cuentaId]?.nombre ?? null) : null,
          estado: estadoRecurrenteEnMes(r, mes, hoy, gastoDelMesId !== null, !!local?.eliminadoEn),
          fechaPrevista: fechaPrevista(r, mes),
          gastoDelMesId,
          generados: t?.n ?? 0,
          ultimoMes: t?.ultimo ?? null,
          categoria: r.categoria,
        };
      })
      .sort((a, b) => b.recurrente.valor - a.recurrente.valor);
    const activos = filas.filter((f) => f.recurrente.activo);
    const porGenerar = filas.filter((f) => f.estado === 'por_generar');
    return {
      filas,
      totalMensual: activos.reduce((a, f) => a + f.recurrente.valor, 0),
      activos: activos.length,
      porGenerar,
      valorPorGenerar: porGenerar.reduce((a, f) => a + f.recurrente.valor, 0),
    };
  },
);

/** Tarifa general del IVA (para sugerir el IVA de un gasto con su total). */
export const selTarifaIva = crearSelector<void, number>('selTarifaIva', ['parametros'], (e) => e.parametros.impuestos.ivaGeneral);

/** ¿El estado de resultados descuenta el IVA de los gastos? (parámetro del negocio). */
export const selIvaGastosDescontable = crearSelector<void, boolean>('selIvaGastosDescontable', ['parametros'], (e) => e.parametros.impuestos.ivaGastosDescontable);

/** Cuántos gastos generó un recurrente (para el aviso antes de eliminarlo). */
export const selGastosDeRecurrente = crearSelector<{ recurrenteId: Id }, number>('selGastosDeRecurrente', ['gastos'], (e, { recurrenteId }) => {
  let n = 0;
  for (const id in e.gastos) {
    const g = e.gastos[id];
    if (g && !g.eliminadoEn && g.recurrenteId === recurrenteId) n += 1;
  }
  return n;
});

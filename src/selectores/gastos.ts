import type { CategoriaGasto, COP, FechaISO, Gasto, Id, MesISO } from '@/dominio/tipos';
import { diasDelMes, sumarMesesAMes } from '@/dominio/reglas/fechas';
import { crearSelector } from './memo';
import { hechosEnFechas, hechosEnRango, resumirHechos } from './ventas';

/** Gastos, estado de resultados y punto de equilibrio (PLAN 6.23 `gastos.ts`, 6.20.10). */

export const selGastos = crearSelector<
  { desde?: FechaISO; hasta?: FechaISO; localId?: Id | 'todos' | 'general'; categoria?: CategoriaGasto },
  { filas: Gasto[]; total: COP; iva: COP }
>('selGastos', ['gastos'], (e, f) => {
  const filas = Object.values(e.gastos)
    .filter((g) => {
      if (g.eliminadoEn) return false;
      if (f.desde && g.fecha < f.desde) return false;
      if (f.hasta && g.fecha > f.hasta) return false;
      if (f.categoria && g.categoria !== f.categoria) return false;
      if (f.localId === 'general') return g.localId === null;
      if (f.localId && f.localId !== 'todos' && g.localId !== f.localId) return false;
      return true;
    })
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.id < b.id ? -1 : 1));
  return { filas, total: filas.reduce((a, g) => a + g.valor, 0), iva: filas.reduce((a, g) => a + g.iva, 0) };
});

const rangoMes = (mes: MesISO) => ({ desde: `${mes}-01`, hasta: `${mes}-${String(diasDelMes(mes)).padStart(2, '0')}` });

/** Resumen por categoría del mes vs. el mes anterior (con IVA; generales incluidos con "todos"). */
export const selResumenGastos = crearSelector<
  { mes: MesISO; localId: Id | 'todos' },
  { categorias: { categoria: CategoriaGasto; actual: COP; anterior: COP; variacion: number | null }[]; total: COP; totalAnterior: COP }
>('selResumenGastos', ['gastos'], (e, { mes, localId }) => {
  const sumar = (m: MesISO) => {
    const r = new Map<CategoriaGasto, number>();
    for (const g of selGastos(e, { ...rangoMes(m), localId }).filas) r.set(g.categoria, (r.get(g.categoria) ?? 0) + g.valor);
    return r;
  };
  const a = sumar(mes);
  const b = sumar(sumarMesesAMes(mes, -1));
  const cats = [...new Set([...a.keys(), ...b.keys()])];
  const categorias = cats
    .map((c) => {
      const actual = a.get(c) ?? 0;
      const anterior = b.get(c) ?? 0;
      return { categoria: c, actual, anterior, variacion: anterior ? (actual - anterior) / anterior : null };
    })
    .sort((x, y) => y.actual - x.actual);
  return { categorias, total: categorias.reduce((s, x) => s + x.actual, 0), totalAnterior: categorias.reduce((s, x) => s + x.anterior, 0) };
});

export interface EstadoResultados {
  /** Ventas netas sin IVA (base reconocida − base devuelta). */
  ventasNetas: COP;
  /** Costo de la mercancía vendida (Σ costo − costo devuelto que reingresó). */
  costoVentas: COP;
  utilidadBruta: COP;
  margenBruto: number;
  gastosOperativos: COP;
  /** Generales prorrateados (si se pidió y hay un local elegido). */
  gastosGeneralesProrrateados: COP;
  utilidadOperativa: COP;
  margenOperativo: number;
  gastosPorCategoria: Partial<Record<CategoriaGasto, COP>>;
}

/**
 * Estado de resultados (6.20.10): ventas netas sin IVA − costo de la mercancía vendida = utilidad bruta − gastos
 * operativos (sin IVA si `ivaGastosDescontable`; los generales se prorratean por participación en ventas si se
 * pide) = utilidad operativa. Las compras de mercancía no son gasto.
 */
export const selEstadoResultados = crearSelector<{ desde: FechaISO; hasta: FechaISO; localId: Id | 'todos'; prorratear: boolean }, EstadoResultados>(
  'selEstadoResultados',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'gastos', 'parametros'],
  (e, { desde, hasta, localId, prorratear }) => {
    const hechos = hechosEnFechas(e, { desde, hasta });
    const r = resumirHechos(hechosEnRango(hechos, desde, hasta, localId));
    const sinIva = e.parametros.impuestos.ivaGastosDescontable;
    const valor = (g: Gasto) => (sinIva ? g.valor - g.iva : g.valor);
    const porCat: Partial<Record<CategoriaGasto, COP>> = {};
    let gastos = 0;
    let generales = 0;
    for (const g of Object.values(e.gastos)) {
      if (g.eliminadoEn || g.fecha < desde || g.fecha > hasta) continue;
      if (localId === 'todos' || g.localId === localId) {
        gastos += valor(g);
        porCat[g.categoria] = (porCat[g.categoria] ?? 0) + valor(g);
      } else if (g.localId === null) generales += valor(g);
    }
    let prorrateo = 0;
    if (localId !== 'todos' && prorratear && generales > 0) {
      const total = resumirHechos(hechos).baseNeta;
      prorrateo = total > 0 ? Math.round((generales * r.baseNeta) / total) : 0;
    }
    const utilidadBruta = r.baseNeta - r.costo;
    const operativos = gastos + prorrateo;
    return {
      ventasNetas: r.baseNeta,
      costoVentas: r.costo,
      utilidadBruta,
      margenBruto: r.baseNeta ? utilidadBruta / r.baseNeta : 0,
      gastosOperativos: gastos,
      gastosGeneralesProrrateados: prorrateo,
      utilidadOperativa: utilidadBruta - operativos,
      margenOperativo: r.baseNeta ? (utilidadBruta - operativos) / r.baseNeta : 0,
      gastosPorCategoria: porCat,
    };
  },
);

/** Punto de equilibrio mensual de un local (6.20.10): gastos fijos del local / margen bruto %. */
export const selPuntoEquilibrio = crearSelector<
  { localId: Id | 'todos'; mes: MesISO },
  { gastosFijos: COP; margenBruto: number; ventasEquilibrio: COP | null; ventasNetasMes: COP }
>('selPuntoEquilibrio', ['ventas', 'devoluciones', 'productos', 'variantes', 'gastos', 'parametros'], (e, { localId, mes }) => {
  const rango = rangoMes(mes);
  const er = selEstadoResultados(e, { ...rango, localId, prorratear: false });
  const FIJAS: CategoriaGasto[] = ['arriendo', 'servicios', 'nomina', 'seguridad_social'];
  const gastosFijos = FIJAS.reduce((a, c) => a + (er.gastosPorCategoria[c] ?? 0), 0);
  return {
    gastosFijos,
    margenBruto: er.margenBruto,
    ventasEquilibrio: er.margenBruto > 0 ? Math.round(gastosFijos / er.margenBruto) : null,
    ventasNetasMes: er.ventasNetas,
  };
});

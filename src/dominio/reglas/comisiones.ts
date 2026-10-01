import type { COP, ComponenteComision, EsquemaComision } from '../tipos';
import { redondear } from './dinero';

/** Comisiones (PLAN 6.20.4, P1 de 6.19). */

/** Base comisionable de una venta según el esquema: sin IVA (semilla) o con IVA. */
export function baseComisionableVenta(
  esquema: Pick<EsquemaComision, 'base'>,
  venta: { total: COP; base: COP },
): COP {
  return esquema.base === 'base_sin_iva' ? venta.base : venta.total;
}

export interface EntradaComision {
  /** Base del periodo: ventas reconocidas del vendedor − devoluciones del periodo (en la base del esquema). */
  base: COP;
  /** Ventas del local en el mes (con IVA) y su meta, para el bono de meta. */
  ventasLocalMes: COP;
  metaLocalMes: COP;
}

export interface ResultadoComision {
  total: COP;
  componentes: { tipo: ComponenteComision['tipo']; valor: COP }[];
}

function valorComponente(c: ComponenteComision, e: EntradaComision): COP {
  const base = Math.max(0, e.base);
  switch (c.tipo) {
    case 'porcentaje':
      return redondear(base * c.porcentaje);
    case 'escalonado': {
      const tramos = [...c.tramos].sort((a, b) => a.desde - b.desde);
      if (c.modo === 'total') {
        let pct = 0;
        for (const t of tramos) if (base >= t.desde) pct = t.porcentaje;
        return redondear(base * pct);
      }
      let suma = 0;
      tramos.forEach((t, i) => {
        const hasta = tramos[i + 1]?.desde ?? Infinity;
        const porcion = Math.max(0, Math.min(base, hasta) - t.desde);
        suma += porcion * t.porcentaje;
      });
      return redondear(suma);
    }
    case 'bono_meta_local':
      return e.metaLocalMes > 0 && e.ventasLocalMes >= e.metaLocalMes * c.cumplimientoMinimo ? c.valor : 0;
  }
}

export function calcularComision(
  esquema: Pick<EsquemaComision, 'componentes'>,
  entrada: EntradaComision,
): ResultadoComision {
  const componentes = esquema.componentes.map((c) => ({ tipo: c.tipo, valor: valorComponente(c, entrada) }));
  return { total: componentes.reduce((a, c) => a + c.valor, 0), componentes };
}

/** Tramos crecientes y porcentajes entre 0 y 0,2 (6.21). */
export function esquemaValido(componentes: readonly ComponenteComision[]): string | null {
  if (componentes.length === 0) return 'El esquema necesita al menos un componente.';
  for (const c of componentes) {
    if (c.tipo === 'porcentaje' && (c.porcentaje < 0 || c.porcentaje > 0.2))
      return 'El porcentaje debe estar entre 0 % y 20 %.';
    if (c.tipo === 'escalonado') {
      if (c.tramos.length === 0) return 'El escalonado necesita al menos un tramo.';
      for (let i = 0; i < c.tramos.length; i++) {
        const t = c.tramos[i];
        if (!t) continue;
        if (t.porcentaje < 0 || t.porcentaje > 0.2)
          return 'Cada tramo debe tener un porcentaje entre 0 % y 20 %.';
        const prev = c.tramos[i - 1];
        if (prev && t.desde <= prev.desde) return 'Los tramos deben ir de menor a mayor.';
      }
    }
    if (c.tipo === 'bono_meta_local' && (c.valor < 0 || c.cumplimientoMinimo <= 0))
      return 'El bono debe tener valor y cumplimiento mínimo.';
  }
  return null;
}

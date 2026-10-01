import type { FechaISO, MonedaExtranjera } from '@/dominio/tipos';
import { diaN, lunesDe } from '@/dominio/reglas/fechas';
import { rngPlan } from './prng';

/**
 * Ruta suave de la tasa de cambio (PLAN 7.4, 7.9, P13): termina exactamente en la tasa de ejemplo el día del
 * ancla y sube ≈ 8 % entre el penúltimo y el último pedido de blazers. Nudos relativos al ancla (días) con
 * interpolación lineal y un ruido semanal pequeño. El CN¥ sigue al dólar con la razón de las tasas de ejemplo.
 */
const NUDOS_USD: readonly [number, number][] = [
  [-900, 0.935],
  [-600, 0.934],
  [-420, 0.952],
  [-300, 0.937],
  [-230, 0.905],
  [-180, 0.91],
  [-120, 0.978],
  [-75, 0.996],
  [0, 1],
];

export class RutaTasas {
  private readonly cache = new Map<string, number>();
  private readonly nAncla: number;

  constructor(
    private readonly semilla: string,
    private readonly ancla: FechaISO,
    private readonly ejemplo: Record<MonedaExtranjera, number>,
  ) {
    this.nAncla = diaN(ancla);
  }

  /** Factor de la ruta (1 = tasa de ejemplo) en una fecha. Desde el ancla, la tasa de ejemplo. */
  private factor(fecha: FechaISO): number {
    const d = diaN(fecha) - this.nAncla;
    if (d >= 0) return 1;
    let base = NUDOS_USD[0]?.[1] ?? 1;
    for (let i = 1; i < NUDOS_USD.length; i++) {
      const [d1, v1] = NUDOS_USD[i] as [number, number];
      const [d0, v0] = NUDOS_USD[i - 1] as [number, number];
      if (d <= d1) {
        base = d <= d0 ? v0 : v0 + ((v1 - v0) * (d - d0)) / (d1 - d0);
        break;
      }
    }
    // Ruido semanal pequeño (±0,4 %), que se apaga en las dos semanas previas al ancla.
    const lunes = lunesDe(fecha);
    const r = rngPlan(this.semilla, `tasa:${lunes}`).normal(0, 0.004);
    const atenuacion = d > -14 ? -d / 14 : 1;
    return base * (1 + r * atenuacion);
  }

  /**
   * Tasa vigente en una fecha: la del lunes de su semana (el generador registra una tasa cada lunes, la víspera
   * de la ventana y el día del ancla). Desde el ancla, la tasa de ejemplo. Dos decimales, como `tasa.registrar`.
   */
  valor(moneda: MonedaExtranjera, fecha: FechaISO): number {
    if (fecha >= this.ancla) return this.ejemplo[moneda];
    const lunes = lunesDe(fecha);
    const clave = `${moneda}|${lunes}`;
    let v = this.cache.get(clave);
    if (v === undefined) {
      v = Math.round(this.ejemplo[moneda] * this.factor(lunes) * 100) / 100;
      this.cache.set(clave, v);
    }
    return v;
  }
}

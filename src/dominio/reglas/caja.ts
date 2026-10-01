import type { COP, EgresoCaja } from '../tipos';

/** Caja (PLAN 6.19 V8). */

/** Σ denominaciones del arqueo: billetes por cantidad; 'monedas' por valor. */
export function sumaDenominaciones(denominaciones: Record<string, number>): COP {
  let s = 0;
  for (const [clave, n] of Object.entries(denominaciones)) {
    s += clave === 'monedas' ? n : Number(clave) * n;
  }
  return s;
}

/**
 * efectivoEsperado = base + Σ efectivo de la sesión (ventas, abonos, bonos; los reembolsos van negativos)
 * − Σ egresos (V8). `efectivoSesion` es el agregado materializado de la sesión.
 */
export function efectivoEsperado(
  baseInicial: COP,
  efectivoSesion: COP,
  egresos: readonly Pick<EgresoCaja, 'valor'>[],
): COP {
  let e = 0;
  for (const x of egresos) e += x.valor;
  return baseInicial + efectivoSesion - e;
}

import type { COP, Centavos } from '../tipos';

/** Dinero (PLAN 6.1, D7): COP enteros, extranjeras en centavos, redondeo único mitad lejos de cero. */

export function redondear(x: number): number {
  const r = Math.sign(x) * Math.round(Math.abs(x));
  return r === 0 ? 0 : r;
}

/** Redondea a `decimales` posiciones (para porcentajes y horas que se muestran). */
export function redondearA(x: number, decimales: number): number {
  let f = 1;
  for (let i = 0; i < decimales; i++) f *= 10;
  return redondear(x * f) / f;
}

/**
 * Reparte un total entero en proporción a los pesos con el método del mayor residuo: las partes suman
 * exactamente el total (6.20.1, M4). Si todos los pesos son 0, reparte por partes iguales.
 */
export function prorratearMayorResiduo(total: number, pesos: readonly number[]): number[] {
  const n = pesos.length;
  if (n === 0) return [];
  const signo = total < 0 ? -1 : 1;
  const abs = Math.abs(total);
  let suma = 0;
  for (const p of pesos) suma += Math.max(0, p);
  const efectivos = suma > 0 ? pesos.map((p) => Math.max(0, p)) : pesos.map(() => 1);
  const sumaEf = suma > 0 ? suma : n;
  const exactos = efectivos.map((p) => (abs * p) / sumaEf);
  const partes = exactos.map((x) => Math.floor(x));
  let resto = abs - partes.reduce((a, b) => a + b, 0);
  const orden = exactos
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => (b.frac !== a.frac ? b.frac - a.frac : a.i - b.i));
  for (let k = 0; resto > 0; k = (k + 1) % n, resto--) {
    const destino = orden[k];
    if (destino) partes[destino.i] = (partes[destino.i] ?? 0) + 1;
  }
  return partes.map((p) => (p === 0 ? 0 : p * signo));
}

/** USD/CNY en centavos → COP con la tasa (V10). */
export function copDeCentavos(centavos: Centavos, tasa: number): COP {
  return redondear((centavos / 100) * tasa);
}

/** COP → centavos de USD/CNY con la tasa. */
export function centavosDeCop(cop: COP, tasa: number): Centavos {
  return redondear((cop / tasa) * 100);
}

/** Conversión SOLO para mostrar (6.20.11): COP → moneda con la tasa vigente, sin redondear. */
export function convertirParaMostrar(cop: COP, tasa: number | null): number {
  return tasa === null ? cop : cop / tasa;
}

/** Suma segura de enteros. */
export function sumar(valores: Iterable<number>): number {
  let s = 0;
  for (const v of valores) s += v;
  return s;
}

/**
 * PRNG y utilidades aleatorias con aritmética exacta (PLAN 7.2). Solo + − × ÷, Math.sqrt, Math.floor,
 * Math.round, comparaciones y operaciones enteras de 32 bits (Math.imul, >>>, ^, |): todas dan el mismo
 * resultado en V8, JavaScriptCore y SpiderMonkey. Nada de Math.log/exp/pow/sin/cos ni `**` (ESLint lo prohíbe).
 *
 * Un flujo por propósito: `rngPlan('plan:importaciones')`, `rngIntencion('venta:2026-09-30:zr:014')`.
 */

/** cyrb128: hash de 128 bits de un texto, como 4 enteros sin signo de 32 bits (siembra de sfc32). */
export function cyrb128(texto: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < texto.length; i++) {
    const k = texto.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

const LN2 = 0.6931471805599453;

/**
 * e^(−x) para x ≥ 0 sin Math.exp: x = k·ln2 + r con r ∈ [0, ln2); e^(−x) = 2^(−k) · e^(−r), con 2^(−k) por
 * divisiones exactas entre 2 y e^(−r) por su serie de Taylor (converge rápido porque r < 0,7).
 */
export function expNeg(x: number): number {
  if (x <= 0) return 1;
  const k = Math.floor(x / LN2);
  const r = x - k * LN2;
  let termino = 1;
  let suma = 1;
  for (let n = 1; n < 30; n++) {
    termino = (termino * -r) / n;
    suma += termino;
    if (termino < 1e-18 && termino > -1e-18) break;
  }
  let escala = 1;
  for (let i = 0; i < k; i++) escala /= 2;
  return suma * escala;
}

/** Generador sfc32 (128 bits de estado) con utilidades. */
export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(semilla: string) {
    const [a, b, c, d] = cyrb128(semilla);
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    // Calentamiento: descarta los primeros valores (recomendado para sfc32).
    for (let i = 0; i < 12; i++) this.siguiente();
  }

  /** Entero sin signo de 32 bits. */
  siguiente(): number {
    this.a >>>= 0;
    this.b >>>= 0;
    this.c >>>= 0;
    this.d >>>= 0;
    let t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    return t >>> 0;
  }

  /** Uniforme en [0, 1). */
  decimal(): number {
    return this.siguiente() / 4294967296;
  }

  /** Entero uniforme en [a, b] (ambos incluidos). */
  entero(a: number, b: number): number {
    return a + Math.floor(this.decimal() * (b - a + 1));
  }

  /** Uniforme en [a, b). */
  rango(a: number, b: number): number {
    return a + this.decimal() * (b - a);
  }

  /** true con probabilidad p. */
  chance(p: number): boolean {
    return this.decimal() < p;
  }

  /** Normal aproximada: suma de 12 uniformes − 6 (sin Math.log ni Math.cos). */
  normal(media = 0, sigma = 1): number {
    let s = 0;
    for (let i = 0; i < 12; i++) s += this.decimal();
    return media + (s - 6) * sigma;
  }

  /** Poisson por el método de Knuth con e^(−λ) exacto (expNeg); para λ > 60, normal redondeada. */
  poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    if (lambda > 60) return Math.max(0, Math.round(this.normal(lambda, Math.sqrt(lambda))));
    const limite = expNeg(lambda);
    let k = 0;
    let p = 1;
    for (;;) {
      p *= this.decimal();
      if (p <= limite) return k;
      k += 1;
    }
  }

  /** Índice elegido con probabilidad proporcional a su peso (tabla acumulada + búsqueda binaria). */
  elegirPonderado(pesos: readonly number[]): number {
    const acumulada = acumular(pesos);
    return elegirAcumulada(this, acumulada);
  }

  /** Elemento al azar (uniforme). */
  elegir<T>(lista: readonly T[]): T {
    return lista[Math.floor(this.decimal() * lista.length)] as T;
  }

  /** Baraja una copia (Fisher–Yates). */
  barajar<T>(lista: readonly T[]): T[] {
    const r = [...lista];
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(this.decimal() * (i + 1));
      const t = r[i] as T;
      r[i] = r[j] as T;
      r[j] = t;
    }
    return r;
  }

  /** k elementos distintos al azar. */
  muestra<T>(lista: readonly T[], k: number): T[] {
    return this.barajar(lista).slice(0, Math.max(0, Math.min(k, lista.length)));
  }
}

/** Tabla acumulada de pesos (para elegir muchas veces con los mismos pesos). */
export function acumular(pesos: readonly number[]): number[] {
  const r: number[] = new Array<number>(pesos.length);
  let s = 0;
  for (let i = 0; i < pesos.length; i++) {
    const p = pesos[i] ?? 0;
    s += p > 0 ? p : 0;
    r[i] = s;
  }
  return r;
}

/** Elige un índice con una tabla acumulada (búsqueda binaria). Devuelve −1 si todos los pesos son 0. */
export function elegirAcumulada(rng: Rng, acumulada: readonly number[]): number {
  const total = acumulada[acumulada.length - 1] ?? 0;
  if (total <= 0) return -1;
  const x = rng.decimal() * total;
  let lo = 0;
  let hi = acumulada.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((acumulada[mid] ?? 0) > x) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

/** Flujo del plan global (no lee el estado). */
export function rngPlan(semilla: string, nombre: string): Rng {
  return new Rng(`${semilla}|plan|${nombre}`);
}

/** Flujo de una intención: su clave estable la siembra (sin efecto mariposa). */
export function rngIntencion(semilla: string, clave: string): Rng {
  return new Rng(`${semilla}|int|${clave}`);
}

/** Hash estable (64 bits en hexadecimal) de un texto: huella del estado para las pruebas de determinismo. */
export function hashTexto(texto: string): string {
  const [a, b, c, d] = cyrb128(texto);
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return `${hex(a)}${hex(b)}${hex(c)}${hex(d)}`;
}

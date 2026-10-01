import type { COP, FechaISO, MonedaExtranjera, ParteFrase } from '@/dominio/tipos';
import { diferenciaDias } from '@/dominio/reglas/fechas';
import { fechaCorta, miles, pesos, porcentajeTexto } from '@/dominio/reglas/texto';

/**
 * Textos que ARMAN los selectores (alertas, hallazgos, explicación del flujo, avisos). Los selectores no
 * importan lib/formato (capas, 5.3): usan los formateadores mínimos del dominio con las mismas convenciones
 * (espacio duro, signo menos tipográfico). Las pantallas siempre formatean con lib/formato.ts.
 */
export { fechaCorta, miles, pesos, porcentajeTexto };

const NBSP = String.fromCharCode(0xa0);
const SIMBOLO: Record<MonedaExtranjera, string> = { USD: 'US$', CNY: 'CN¥' };

/** "US$ 14.700" (centavos → unidades, sin decimales si son cero). */
export function montoExtranjero(centavos: number, moneda: MonedaExtranjera): string {
  const unidades = centavos / 100;
  const entero = miles(Math.trunc(unidades));
  const dec = Math.round((unidades - Math.trunc(unidades)) * 100);
  return `${SIMBOLO[moneda]}${NBSP}${entero}${dec ? `,${String(dec).padStart(2, '0')}` : ''}`;
}

/** "$ 58,1 millones" / "$ 850 mil" (para frases). */
export function pesosEnPalabras(cop: COP): string {
  const a = Math.abs(cop);
  const signo = cop < 0 ? String.fromCharCode(0x2212) : '';
  if (a >= 1_000_000) {
    const m = Math.round(a / 100_000) / 10;
    return `${signo}$${NBSP}${String(m).replace('.', ',')} ${m === 1 ? 'millón' : 'millones'}`;
  }
  if (a >= 1000) return `${signo}$${NBSP}${miles(Math.round(a / 1000))} mil`;
  return pesos(cop);
}

/** "hoy" · "mañana" · "ayer" · "en 12 días" · "en 2 semanas" · "hace 3 días". */
export function relativaDias(fecha: FechaISO, hoy: FechaISO): string {
  const d = diferenciaDias(hoy, fecha);
  if (d === 0) return 'hoy';
  if (d === 1) return 'mañana';
  if (d === -1) return 'ayer';
  if (d > 1) {
    if (d >= 14 && d < 60) return `en ${Math.round(d / 7)} semanas`;
    return `en ${d} días`;
  }
  return `hace ${-d} días`;
}

/** Primera letra en mayúscula. */
export function capital(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** "Juan, Pedro y María". */
export function enumerar(lista: readonly string[]): string {
  if (lista.length <= 1) return lista[0] ?? '';
  return `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;
}

// Un monto en pesos dentro de un texto ya armado: "$ 219.900", "−$ 40.000", "$ 58,1 millones", "$ 850 mil".
const RE_PESOS = /(?:[-\u2212])?\$[\u00a0 ]?\d{1,3}(?:\.\d{3})*(?:,\d+)?(?:[\u00a0 ](?:millones|millón|mil)\b)?/g;

/**
 * Parte un texto que trae montos en pesos (las notificaciones del dominio: "Nueva venta en la tienda web: $ 219.900")
 * en trozos para `<FraseConDinero>`, de modo que el dinero siga la moneda activa. `null` si no hay pesos.
 */
export function partesConPesos(texto: string): ParteFrase[] | null {
  const partes: ParteFrase[] = [];
  let desde = 0;
  let hubo = false;
  for (const m of texto.matchAll(RE_PESOS)) {
    const crudo = m[0];
    const negativo = /^[-\u2212]/.test(crudo);
    const cifra = crudo.replace(/^[-\u2212]/, '').replace(/^\$[\u00a0 ]?/, '');
    const [numero = '', sufijo] = cifra.split(/[\u00a0 ]/);
    let valor = Number(numero.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(valor)) continue;
    if (sufijo === 'mil') valor *= 1_000;
    else if (sufijo === 'millones' || sufijo === 'millón') valor *= 1_000_000;
    const inicio = m.index ?? 0;
    if (inicio > desde) partes.push({ texto: texto.slice(desde, inicio) });
    partes.push({ dinero: Math.round(negativo ? -valor : valor), corta: !!sufijo });
    desde = inicio + crudo.length;
    hubo = true;
  }
  if (!hubo) return null;
  if (desde < texto.length) partes.push({ texto: texto.slice(desde) });
  return partes;
}

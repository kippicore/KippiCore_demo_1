import type { COP, FechaISO, Id, MesISO } from '@/dominio/tipos';
import { diasDelMes } from '@/dominio/reglas/fechas';
import type { Tono } from '@/config/estados';
import type { DatosSaludo } from '@/selectores';
import { hora, plural, porcentaje, relativaDias } from '@/lib/formato';
import { TXT } from './textos';

/**
 * Cálculos propios de la pantalla de Inicio (D1): redacción del saludo, lectura del gráfico de 30 días, ritmo de la
 * meta y estado del último cierre. Funciones puras; las cifras de negocio vienen siempre de los selectores.
 */

// ---------------------------------------------------------------------------------------------------------
// Saludo y frase del día (PLAN 2.3.1)
// ---------------------------------------------------------------------------------------------------------
/** Un trozo de la frase: texto o dinero (el dinero lo pinta `<Dinero animar>` en la moneda activa). */
export type Segmento = { tipo: 'texto'; texto: string } | { tipo: 'dinero'; valor: COP };

const txt = (texto: string): Segmento => ({ tipo: 'texto', texto });
const din = (valor: COP): Segmento => ({ tipo: 'dinero', valor });

/** "Buenas tardes." o, si la persona escribió su nombre al personalizar, "Buenas tardes, Hernán." Nunca el del dueño ficticio. */
export function saludoDe(franja: DatosSaludo['franja'], persona: string | null): string {
  const base = TXT.saludos[franja];
  return persona?.trim() ? `${base}, ${persona.trim()}.` : `${base}.`;
}

const NUMERO_EN_LETRAS: Record<number, string> = { 1: 'una', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco' };

/** "14 % más que el miércoles pasado a esta hora" · "9 % menos que…" · "igual que…"; null si no hay base. */
export function frasePorComparacion(variacion: number | null, dia: string, aEstaHora: boolean): string | null {
  if (variacion === null || !Number.isFinite(variacion)) return null;
  const cola = `el ${dia} pasado${aEstaHora ? ' a esta hora' : ''}`;
  const redondeado = Math.round(Math.abs(variacion) * 100);
  if (redondeado === 0) return `igual que ${cola}`;
  return `${porcentaje(Math.abs(variacion), 0)} ${variacion > 0 ? 'más' : 'menos'} que ${cola}`;
}

/** Los cierres de anoche (solo en la franja de la mañana), ya acotados al local elegido. */
function segmentosCierres(d: DatosSaludo): Segmento[] {
  if (!d.cierres) return [];
  const cuadraron = d.localNombre ? d.cierres.cuadraron.filter((n) => n === d.localNombre) : d.cierres.cuadraron;
  const conDif = d.localNombre ? d.cierres.conDiferencia.filter((c) => c.local === d.localNombre) : d.cierres.conDiferencia;
  const total = cuadraron.length + conDif.length;
  if (total === 0) return [];
  if (conDif.length === 0) {
    if (total === 1) return [txt(` La caja de ${cuadraron[0]} cerró cuadrada.`)];
    return [txt(` ${total === 3 ? 'Las tres cajas cerraron cuadradas.' : `Las ${NUMERO_EN_LETRAS[total] ?? total} cajas cerraron cuadradas.`}`)];
  }
  const r: Segmento[] = [];
  if (total > 1) r.push(txt(` Las ${NUMERO_EN_LETRAS[total] ?? total} cajas cerraron; `));
  else r.push(txt(' La caja de '));
  conDif.forEach((c, i) => {
    const falta = c.diferencia < 0;
    const cabeza = total > 1 ? '' : `${c.local} cerró `;
    r.push(txt(`${i > 0 ? (i === conDif.length - 1 ? ' y ' : ', ') : ''}${cabeza}${total > 1 ? `${c.local} con ` : 'con '}${falta ? 'un faltante de ' : 'un sobrante de '}`));
    r.push(din(Math.abs(c.diferencia)));
  });
  r.push(txt('.'));
  return r;
}

/**
 * La frase del día (una sola, en lenguaje de comerciante): tres variantes por hora y una adaptación al local elegido.
 *  · Antes de las 11:00 a. m.: cómo cerró ayer, quién fue el mejor local, las cajas y a qué hora abren.
 *  · 11:00 a. m. – 8:00 p. m.: cuánto llevas hoy y cómo va frente al mismo día de la semana pasada a esta hora.
 *  · Después de las 8:00 p. m.: cómo cerraste hoy.
 */
export function fraseSaludo(d: DatosSaludo): Segmento[] {
  const local = d.localNombre;
  const ventasTxt = plural(d.numVentas, 'venta');
  const r: Segmento[] = [];
  if (d.franja === 'manana') {
    r.push(txt(local ? `Ayer ${local} cerró en ` : 'Ayer cerraste en '), din(d.ventas), txt(` con ${ventasTxt}`));
    if (d.numVentas === 0) {
      r.length = 0;
      r.push(txt(local ? `Ayer ${local} no registró ventas.` : 'Ayer no se registraron ventas.'));
    } else r.push(txt(d.mejorLocal ? `; ${d.mejorLocal.nombre} fue el mejor local.` : '.'));
    r.push(...segmentosCierres(d));
    r.push(txt(d.apertura ? ` ${local ? `${local} abre` : 'Los locales abren'} a las ${hora(d.apertura)}` : ` ${local ? `${local} no abre` : 'Los locales no abren'} hoy.`));
    return cerrarFrase(r);
  }
  const cmp = frasePorComparacion(d.variacion, d.diaComparacion, d.franja === 'tarde');
  if (d.numVentas === 0) return cerrarFrase([txt(`${TXT.sinVentasHoy}${d.apertura ? `; los locales abrieron a las ${hora(d.apertura)}` : ''}`)]);
  if (d.franja === 'tarde') {
    r.push(txt(local ? `Hoy ${local} lleva ` : 'Hoy llevas '), din(d.ventas), txt(` en ${ventasTxt}`));
    r.push(txt(cmp ? `, ${cmp}.` : '.'));
    if (d.mejorLocal) r.push(txt(` ${d.mejorLocal.nombre} va adelante.`));
    return r;
  }
  r.push(txt(local ? `Hoy ${local} cerró en ` : 'Hoy cerraste en '), din(d.ventas), txt(` con ${ventasTxt}`));
  r.push(txt(cmp ? `, ${cmp}.` : '.'));
  if (d.mejorLocal) r.push(txt(` ${d.mejorLocal.nombre} fue el mejor local.`));
  return r;
}

/** Cierra la frase con punto, salvo que ya termine en uno ("a. m."). */
function cerrarFrase(r: Segmento[]): Segmento[] {
  const ultimo = r[r.length - 1];
  if (ultimo?.tipo === 'texto' && !ultimo.texto.endsWith('.')) return [...r.slice(0, -1), txt(`${ultimo.texto}.`)];
  return r;
}

/** La frase como texto plano (títulos, pruebas, lectores de pantalla). */
export function textoDeSegmentos(segmentos: readonly Segmento[], formatearDinero: (cop: COP) => string): string {
  return segmentos.map((s) => (s.tipo === 'texto' ? s.texto : formatearDinero(s.valor))).join('');
}

// ---------------------------------------------------------------------------------------------------------
// Ventas de los últimos 30 días por local
// ---------------------------------------------------------------------------------------------------------
export interface DiaPorLocal {
  fecha: FechaISO;
  total: COP;
  porLocal: Record<Id, COP>;
}

export interface Lectura30Dias {
  total: COP;
  promedio: COP;
  mejorDia: { fecha: FechaISO; valor: COP } | null;
  aportes: { localId: Id; nombre: string; valor: COP; proporcion: number }[];
}

/** Total, promedio diario, mejor día y el aporte de cada local (suma de las barras del gráfico). */
export function lectura30Dias(dias: readonly DiaPorLocal[], locales: readonly { id: Id; nombre: string }[]): Lectura30Dias {
  const total = dias.reduce((a, d) => a + d.total, 0);
  let mejor: { fecha: FechaISO; valor: COP } | null = null;
  for (const d of dias) if (d.total > 0 && (!mejor || d.total > mejor.valor)) mejor = { fecha: d.fecha, valor: d.total };
  const aportes = locales
    .map((l) => {
      const valor = dias.reduce((a, d) => a + (d.porLocal[l.id] ?? 0), 0);
      return { localId: l.id, nombre: l.nombre, valor, proporcion: total > 0 ? valor / total : 0 };
    })
    .sort((a, b) => b.valor - a.valor);
  return { total, promedio: dias.length ? Math.round(total / dias.length) : 0, mejorDia: mejor, aportes };
}

// ---------------------------------------------------------------------------------------------------------
// Tus tres locales: meta y cierre de caja
// ---------------------------------------------------------------------------------------------------------
export interface RitmoMeta {
  /** Fracción de la meta lograda (puede pasar de 1). */
  cumplimiento: number;
  /** Fracción del mes transcurrida. */
  transcurrido: number;
  /** ¿Va igual o por delante del ritmo del mes? */
  alDia: boolean;
}

/** Compara lo logrado de la meta con lo que ya pasó del mes: 0,72 de la meta con 0,77 del mes = por debajo del ritmo. */
export function ritmoMeta(cumplimiento: number, hoy: FechaISO, mes: MesISO): RitmoMeta {
  const dia = hoy.startsWith(mes) ? Number(hoy.slice(8, 10)) : diasDelMes(mes);
  const transcurrido = Math.min(1, dia / diasDelMes(mes));
  return { cumplimiento, transcurrido, alDia: cumplimiento >= transcurrido - 0.005 };
}

export interface EstadoCierreLocal {
  tono: Tono;
  etiqueta: string;
  /** "ayer · cerró Natalia Ríos". */
  detalle: string;
}

/** "Cuadró" / "Faltan $ 40.000" / "Sobran $ 5.000", con el tono canónico de la caja (config/estados.ts). */
export function estadoCierre(
  cierre: { fecha: FechaISO; diferencia: COP; cajero: string; revisado: boolean } | null,
  hoy: FechaISO,
  formatearDinero: (cop: COP) => string,
): EstadoCierreLocal | null {
  if (!cierre) return null;
  const cuando = relativaDias(cierre.fecha, hoy);
  const detalle = `${cuando}${cierre.cajero ? ` · cerró ${cierre.cajero}` : ''}`;
  if (cierre.diferencia === 0) return { tono: 'success', etiqueta: 'Cuadró', detalle };
  const abs = formatearDinero(Math.abs(cierre.diferencia));
  const etiqueta = cierre.diferencia < 0 ? `Faltan ${abs}` : `Sobran ${abs}`;
  return { tono: cierre.revisado ? 'neutral' : 'danger', etiqueta, detalle: `${detalle}${cierre.revisado ? ' · revisado' : ''}` };
}

// ---------------------------------------------------------------------------------------------------------
// Hallazgo de la semana (rota en cada visita)
// ---------------------------------------------------------------------------------------------------------
/** Elige el hallazgo de la visita número `visita` (0 = el más relevante), dando la vuelta cuando se acaban. */
export function elegirPorVisita<T>(lista: readonly T[], visita: number): T | null {
  if (lista.length === 0) return null;
  return lista[((visita % lista.length) + lista.length) % lista.length] ?? null;
}

// ---------------------------------------------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------------------------------------------
export const MAX_ALERTAS_VISIBLES = 5;

/** Alertas visibles: las primeras cinco; con "ver todas", todas. */
export function alertasVisibles<T>(alertas: readonly T[], todas: boolean): { visibles: T[]; ocultas: number } {
  if (todas || alertas.length <= MAX_ALERTAS_VISIBLES) return { visibles: [...alertas], ocultas: 0 };
  return { visibles: alertas.slice(0, MAX_ALERTAS_VISIBLES), ocultas: alertas.length - MAX_ALERTAS_VISIBLES };
}

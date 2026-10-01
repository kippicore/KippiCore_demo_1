import type { FechaISO } from '@/dominio/tipos';
import { diasDelMes, sumarDias } from '@/dominio/reglas/fechas';
import type { HojaExcel, ColumnaExcel, TotalExcel, ValorCelda } from '@/lib/exportar/excel';
import { DIMENSIONES, MEDIDAS, MEDIDAS_NO_ADITIVAS, type Dimension, type Medida, type OpcionesPivote, type ResultadoPivote, type VentasMes } from '@/selectores';
import { fecha, fechaCorta, mesCorto } from '@/lib/formato';
import { PERIODOS, PERIODOS_PIVOTE, type IdPeriodo, type IdPeriodoPivote } from './textos';

/**
 * Cálculos propios de la pantalla de Análisis (D2). Las reglas de negocio (ventas reconocidas, márgenes, totales
 * no aditivos) viven en `@/selectores`; aquí solo se ordena, recorta y presenta lo que ya calcularon.
 */

// ---------------------------------------------------------------------------------------------------------
// Períodos
// ---------------------------------------------------------------------------------------------------------
export function rangoDePeriodo(hoy: FechaISO, id: IdPeriodo): { desde: FechaISO; hasta: FechaISO } {
  const dias = PERIODOS.find((p) => p.id === id)?.dias ?? 90;
  return { desde: sumarDias(hoy, -(dias - 1)), hasta: hoy };
}

/** Meses ('2026-09') de los últimos `meses` meses con el actual incluido (0 = sin límite). */
export function mesesRecientes(hoy: FechaISO, meses: number): string[] {
  if (meses <= 0) return [];
  const [a, m] = [Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7))];
  const r: string[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const idx = a * 12 + (m - 1) - i;
    r.push(`${String(Math.floor(idx / 12))}-${String((idx % 12) + 1).padStart(2, '0')}`);
  }
  return r;
}

// ---------------------------------------------------------------------------------------------------------
// Medidas y orden natural de las dimensiones
// ---------------------------------------------------------------------------------------------------------
export type TipoMedida = 'dinero' | 'entero' | 'porcentaje';

export const esAditiva = (m: Medida): boolean => !MEDIDAS_NO_ADITIVAS.includes(m);

export function tipoMedida(m: Medida): TipoMedida {
  if (m === 'unidades' || m === 'numVentas') return 'entero';
  if (m === 'margenPct') return 'porcentaje';
  return 'dinero';
}

const ORDEN_DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const ORDEN_SEGMENTOS = ['VIP', 'Frecuente', 'Ocasional', 'En riesgo', 'Nuevo', 'Consumidor final'];
const ORDEN_CANALES = ['Local', 'WhatsApp', 'Instagram', 'Web'];
const ORDEN_LETRAS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

/** Dimensiones con un orden propio (cronológico o de la curva): no se ordenan por el valor sino por su sentido. */
const NATURALES: readonly Dimension[] = ['mes', 'semana', 'fecha', 'hora', 'diaSemana', 'talla', 'segmento', 'canal'];
/** Las que avanzan con el tiempo: en el gráfico se muestran las últimas. */
const CRONOLOGICAS: readonly Dimension[] = ['mes', 'semana', 'fecha'];

export const esOrdenNatural = (d: Dimension): boolean => NATURALES.includes(d);
export const esCronologica = (d: Dimension): boolean => CRONOLOGICAS.includes(d);

/** Posición de un valor en el orden natural de su dimensión. */
export function posicionNatural(d: Dimension, valor: string): number {
  switch (d) {
    case 'diaSemana':
      return indice(ORDEN_DIAS, valor);
    case 'segmento':
      return indice(ORDEN_SEGMENTOS, valor);
    case 'canal':
      return indice(ORDEN_CANALES, valor);
    case 'talla': {
      const i = ORDEN_LETRAS.indexOf(valor);
      if (i >= 0) return i;
      const n = Number(valor);
      return Number.isFinite(n) ? 100 + n : 1000;
    }
    default:
      return 0;
  }
}
const indice = (lista: readonly string[], v: string) => {
  const i = lista.indexOf(v);
  return i < 0 ? lista.length : i;
};

/** Compara dos valores de una dimensión en su orden natural (texto para mes, semana, fecha y hora). */
export function compararNatural(d: Dimension, a: string, b: string): number {
  if (d === 'diaSemana' || d === 'segmento' || d === 'canal' || d === 'talla') return posicionNatural(d, a) - posicionNatural(d, b) || (a < b ? -1 : a > b ? 1 : 0);
  return a < b ? -1 : a > b ? 1 : 0;
}

// ---------------------------------------------------------------------------------------------------------
// Tabla dinámica: configuración elegida por el usuario
// ---------------------------------------------------------------------------------------------------------
export interface ConfigPivote {
  /** Una o dos dimensiones en las filas. */
  filas: Dimension[];
  columna: Dimension | null;
  medida: Medida;
}

export interface FiltrosPivote {
  periodo: IdPeriodoPivote;
  /** Nombre del local o 'todos'. */
  local: string;
  /** Nombre de la categoría o 'todas'. */
  categoria: string;
}

export const FILTROS_PIVOTE_INICIALES: FiltrosPivote = { periodo: 'todo', local: 'todos', categoria: 'todas' };

/** Opciones de `selPivote` a partir de lo que eligió el usuario (el período se vuelve la lista de meses). */
export function opcionesDePivote(c: ConfigPivote, f: FiltrosPivote, hoy: FechaISO): OpcionesPivote & { hoy: FechaISO } {
  const meses = PERIODOS_PIVOTE.find((p) => p.id === f.periodo)?.meses ?? 0;
  const filtros: NonNullable<OpcionesPivote['filtros']> = {};
  if (meses > 0) filtros.mes = mesesRecientes(hoy, meses);
  if (f.local !== 'todos') filtros.local = [f.local];
  if (f.categoria !== 'todas') filtros.categoria = [f.categoria];
  return { filas: c.filas, columnas: c.columna ? [c.columna] : [], medida: c.medida, filtros, hoy };
}

/** "Ventas $ (con IVA) por Mes y Local". */
export function descripcionPivote(c: ConfigPivote): string {
  const dims = [...c.filas, ...(c.columna ? [c.columna] : [])].map((d) => DIMENSIONES[d]);
  const lista = dims.length > 1 ? `${dims.slice(0, -1).join(', ')} y ${dims[dims.length - 1] ?? ''}` : (dims[0] ?? '');
  return `${MEDIDAS[c.medida]} por ${lista}`;
}

/** Texto de los filtros activos para el encabezado del Excel. */
export function textoFiltrosPivote(f: FiltrosPivote): string {
  const periodo = PERIODOS_PIVOTE.find((p) => p.id === f.periodo)?.etiqueta ?? 'Todo';
  const partes: string[] = [f.periodo === 'todo' ? 'Todo el historial' : `Período: ${periodo}`];
  partes.push(f.local === 'todos' ? 'Todos los locales' : `Local: ${f.local}`);
  if (f.categoria !== 'todas') partes.push(`Categoría: ${f.categoria}`);
  return partes.join(' · ');
}

// ---------------------------------------------------------------------------------------------------------
// Tabla dinámica: preparar el resultado para mostrar
// ---------------------------------------------------------------------------------------------------------
const NOMBRE_DIA: Record<string, string> = { Lun: 'Lunes', Mar: 'Martes', 'Mié': 'Miércoles', Jue: 'Jueves', Vie: 'Viernes', 'Sáb': 'Sábado', Dom: 'Domingo' };

/** Cómo se lee el valor de una dimensión: "sep 2026", "Lunes", "2 p. m.", "30/09/2026". */
export function etiquetaDimension(d: Dimension, valor: string): string {
  switch (d) {
    case 'mes':
      return `${mesCorto(valor)} ${valor.slice(0, 4)}`;
    case 'semana':
      return `${valor.slice(5)} · ${valor.slice(0, 4)}`;
    case 'fecha':
      return fecha(valor);
    case 'hora': {
      const h = Number(valor.slice(0, 2));
      return `${horaDe12(h)} ${h < 12 ? 'a. m.' : 'p. m.'}`;
    }
    case 'diaSemana':
      return NOMBRE_DIA[valor] ?? valor;
    default:
      return valor;
  }
}

/** Para el Excel, las fechas quedan como en los datos (ordenan bien); lo demás se lee como en pantalla. */
export function etiquetaExcel(d: Dimension, valor: string): string {
  return esCronologica(d) ? valor : etiquetaDimension(d, valor);
}

export interface FilaPivote {
  id: string;
  etiquetas: string[];
  celdas: Record<string, number>;
  total: number;
}

export interface PivotePreparado {
  filasDims: Dimension[];
  columnasDims: Dimension[];
  medida: Medida;
  /** Todas las columnas, ordenadas (el Excel las lleva todas). */
  columnas: string[];
  filas: FilaPivote[];
  totalesColumna: Record<string, number>;
  total: number;
}

/** Ordena filas y columnas del resultado del selector: orden natural donde lo hay, de mayor a menor valor donde no. */
export function prepararPivote(res: ResultadoPivote, filasDims: Dimension[], columnasDims: Dimension[]): PivotePreparado {
  const d0 = filasDims[0];
  const d1 = filasDims[1];
  const filas: FilaPivote[] = res.filas.map((f) => ({ id: f.clave.join(' · '), etiquetas: f.clave, celdas: f.celdas, total: f.total }));
  filas.sort((a, b) => {
    if (d0) {
      if (d1 || esOrdenNatural(d0)) {
        const c = compararNatural(d0, a.etiquetas[0] ?? '', b.etiquetas[0] ?? '');
        if (c !== 0) return c;
      } else if (a.total !== b.total) return b.total - a.total;
    }
    if (d1) {
      if (esOrdenNatural(d1)) {
        const c = compararNatural(d1, a.etiquetas[1] ?? '', b.etiquetas[1] ?? '');
        if (c !== 0) return c;
      } else if (a.total !== b.total) return b.total - a.total;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const c0 = columnasDims[0];
  const columnas = [...res.columnas].sort((a, b) => {
    if (c0 && columnasDims.length === 1 && esOrdenNatural(c0)) return compararNatural(c0, a, b);
    const x = res.totalesColumna[a] ?? 0;
    const y = res.totalesColumna[b] ?? 0;
    return x !== y ? y - x : a < b ? -1 : 1;
  });
  return { filasDims, columnasDims, medida: res.medida, columnas, filas, totalesColumna: res.totalesColumna, total: res.total };
}

/** Las `max` columnas con más valor (con su orden natural si lo tienen): una tabla de 500 columnas no se lee. */
export function columnasVisibles(p: PivotePreparado, max: number): { visibles: string[]; ocultas: number } {
  if (p.columnas.length <= max) return { visibles: p.columnas, ocultas: 0 };
  const top = [...p.columnas].sort((a, b) => (p.totalesColumna[b] ?? 0) - (p.totalesColumna[a] ?? 0)).slice(0, max);
  const c0 = p.columnasDims[0];
  const visibles = c0 && p.columnasDims.length === 1 && esOrdenNatural(c0) ? top.sort((a, b) => compararNatural(c0, a, b)) : top;
  return { visibles, ocultas: p.columnas.length - max };
}

export interface DatosGraficoPivote {
  datos: Record<string, string | number | null>[];
  series: { clave: string; nombre: string; color: 1 | 2 | 3 | 4 }[];
  apiladas: boolean;
  /** Líneas para series de tiempo largas (semanas, días); barras para el resto. */
  tipo: 'barras' | 'linea';
  /** Cuántas filas quedaron fuera del gráfico. */
  fueraDelGrafico: number;
  /** "Las últimas 24" o "Las 12 con más ventas". */
  criterio: 'ultimas' | 'mayores' | 'todas';
}

/**
 * Gráfico asociado a la tabla: hasta 24 filas (las últimas si son fechas, las de mayor valor si son categorías) y,
 * si la tabla tiene columnas y son pocas (hasta 4), una serie por columna; si no, solo el total.
 */
export function datosGraficoPivote(
  p: PivotePreparado,
  visibles: readonly string[],
  maxFilas = 24,
  etiquetar: (d: Dimension, valor: string) => string = (_, v) => v,
): DatosGraficoPivote {
  const nombreFila = (f: FilaPivote) => f.etiquetas.map((v, i) => etiquetar(p.filasDims[i] ?? 'mes', v)).join(' · ');
  const nombreColumna = (c: string) => (p.columnasDims.length === 1 ? etiquetar(p.columnasDims[0] ?? 'mes', c) : c);
  const d0 = p.filasDims[0];
  let filas = p.filas;
  let criterio: DatosGraficoPivote['criterio'] = 'todas';
  if (filas.length > maxFilas) {
    if (d0 && esCronologica(d0) && p.filasDims.length === 1) {
      filas = filas.slice(-maxFilas);
      criterio = 'ultimas';
    } else {
      const tope = Math.min(maxFilas, 12);
      const mejores = new Set([...filas].sort((a, b) => b.total - a.total).slice(0, tope).map((f) => f.id));
      filas = filas.filter((f) => mejores.has(f.id));
      criterio = 'mayores';
    }
  }
  const porColumnas = p.columnasDims.length > 0 && visibles.length >= 1 && visibles.length <= 4;
  const series = porColumnas
    ? visibles.map((c, i) => ({ clave: `c${String(i)}`, nombre: nombreColumna(c), color: ((i % 4) + 1) as 1 | 2 | 3 | 4 }))
    : [{ clave: 'total', nombre: p.columnasDims.length > 0 ? 'Total' : '', color: 1 as const }];
  const datos = filas.map((f) => {
    const r: Record<string, string | number | null> = { x: nombreFila(f) };
    if (porColumnas) visibles.forEach((c, i) => (r[`c${String(i)}`] = f.celdas[c] ?? 0));
    else r.total = f.total;
    return r;
  });
  return {
    datos,
    series,
    apiladas: porColumnas && esAditiva(p.medida) && series.length > 1,
    tipo: d0 && (d0 === 'fecha' || d0 === 'semana') && p.filasDims.length === 1 ? 'linea' : 'barras',
    fueraDelGrafico: p.filas.length - filas.length,
    criterio,
  };
}

/** Hoja de Excel de la tabla dinámica (completa: todas las filas y columnas). `convertir` pasa COP a la moneda activa. */
export function hojaPivote(
  p: PivotePreparado,
  nombresDims: string[],
  nombreMedida: string,
  convertir: (cop: number) => number,
  etiquetar: (d: Dimension, valor: string) => string = (_, v) => v,
): HojaExcel {
  const tipo = tipoMedida(p.medida);
  const conv = (v: number): number => (tipo === 'dinero' ? convertir(v) : v);
  const columnasDim: ColumnaExcel[] = p.filasDims.map((_, i) => ({ clave: `d${String(i)}`, titulo: nombresDims[i] ?? `Fila ${String(i + 1)}`, tipo: 'texto' }));
  const tipoCelda = tipo === 'dinero' ? 'moneda' : tipo === 'porcentaje' ? 'porcentaje' : 'entero';
  const conColumnas = p.columnasDims.length > 0;
  const columnasValor: ColumnaExcel[] = conColumnas ? p.columnas.map((c, i) => ({ clave: `c${String(i)}`, titulo: p.columnasDims.length === 1 ? etiquetar(p.columnasDims[0] ?? 'mes', c) : c, tipo: tipoCelda })) : [];
  const columnas: ColumnaExcel[] = [...columnasDim, ...columnasValor, { clave: 'total', titulo: conColumnas ? 'Total' : nombreMedida, tipo: tipoCelda }];
  const filas = p.filas.map((f) => {
    const r: Record<string, ValorCelda> = {};
    p.filasDims.forEach((d, i) => (r[`d${String(i)}`] = etiquetar(d, f.etiquetas[i] ?? '')));
    if (conColumnas) p.columnas.forEach((c, i) => (r[`c${String(i)}`] = f.celdas[c] === undefined ? null : conv(f.celdas[c])));
    r.total = conv(f.total);
    return r;
  });
  const aditiva = esAditiva(p.medida);
  const totales: Record<string, TotalExcel> = { d0: 'Total' };
  if (conColumnas) p.columnas.forEach((c, i) => (totales[`c${String(i)}`] = aditiva ? 'suma' : conv(p.totalesColumna[c] ?? 0)));
  totales.total = aditiva ? 'suma' : conv(p.total);
  return {
    nombre: 'Tabla dinámica',
    columnas,
    filas,
    totales,
    nota: aditiva ? undefined : `${nombreMedida} no se suma: cada total se calcula de nuevo con todas las ventas de su fila o columna.`,
  };
}

// ---------------------------------------------------------------------------------------------------------
// Mapa de calor
// ---------------------------------------------------------------------------------------------------------
const DIAS_PLURAL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados', 'Domingos'];

export function horaDe12(h: number): string {
  return String(h % 12 === 0 ? 12 : h % 12);
}

/** "de 3 a 7 p. m." · "de 11 a. m. a 2 p. m.". */
export function textoFranjaHoras(desde: number, hasta: number): string {
  const sufijo = (h: number) => (h < 12 || h === 24 ? 'a. m.' : 'p. m.');
  return sufijo(desde) === sufijo(hasta) ? `de ${horaDe12(desde)} a ${horaDe12(hasta)} ${sufijo(hasta)}` : `de ${horaDe12(desde)} ${sufijo(desde)} a ${horaDe12(hasta)} ${sufijo(hasta)}`;
}

export interface FranjaFuerte {
  /** 0 = lunes. */
  fila: number;
  /** Columnas del mapa (0 = 10 a. m.). */
  desde: number;
  hasta: number;
  horaDesde: number;
  horaHasta: number;
  /** Fracción de las ventas de la semana que caen en esa franja. */
  participacion: number;
  /** "Sábados" (plural, para la nota). */
  dia: string;
}

/** La franja de `ancho` horas seguidas de un mismo día con más ventas de la semana (7 × 12, la primera columna son las 10 a. m.). */
export function franjaMasFuerte(valores: readonly (readonly number[])[], ancho = 4, primeraHora = 10): FranjaFuerte | null {
  const total = valores.reduce((s, f) => s + f.reduce((a, b) => a + b, 0), 0);
  if (total <= 0) return null;
  let fila = -1;
  let desde = 0;
  let suma = -1;
  valores.forEach((f, i) => {
    for (let c = 0; c + ancho <= f.length; c++) {
      let s = 0;
      for (let k = 0; k < ancho; k++) s += f[c + k] ?? 0;
      if (s > suma) {
        suma = s;
        fila = i;
        desde = c;
      }
    }
  });
  if (fila < 0) return null;
  const horaDesde = primeraHora + desde;
  return { fila, desde, hasta: desde + ancho - 1, horaDesde, horaHasta: horaDesde + ancho, participacion: suma / total, dia: DIAS_PLURAL[fila] ?? '' };
}

const DIAS_SINGULAR = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export interface ResumenCalor {
  mejorDia: { fila: number; nombre: string; participacion: number };
  peorDia: { fila: number; nombre: string; participacion: number };
  mejorHora: { hora: number; texto: string; participacion: number };
}

/** Día más fuerte, día más flojo (entre los que vendieron) y hora más fuerte de la semana. */
export function resumenCalor(valores: readonly (readonly number[])[], primeraHora = 10): ResumenCalor | null {
  const total = valores.reduce((s, f) => s + f.reduce((a, b) => a + b, 0), 0);
  if (total <= 0) return null;
  const dias = valores.map((f, fila) => ({ fila, suma: f.reduce((a, b) => a + b, 0) })).filter((d) => d.suma > 0);
  const mejor = dias.reduce((a, d) => (d.suma > a.suma ? d : a));
  const peor = dias.reduce((a, d) => (d.suma < a.suma ? d : a));
  const columnas = (valores[0] ?? []).map((_, c) => ({ c, suma: valores.reduce((s, f) => s + (f[c] ?? 0), 0) }));
  const hora = columnas.reduce((a, d) => (d.suma > a.suma ? d : a));
  const h = primeraHora + hora.c;
  return {
    mejorDia: { fila: mejor.fila, nombre: DIAS_SINGULAR[mejor.fila] ?? '', participacion: mejor.suma / total },
    peorDia: { fila: peor.fila, nombre: DIAS_SINGULAR[peor.fila] ?? '', participacion: peor.suma / total },
    mejorHora: { hora: h, texto: textoFranjaHoras(h, h + 1).replace(/^de /, ''), participacion: hora.suma / total },
  };
}

/** "Sábados de 3 a 7 p. m.: 11 % de tus ventas". */
export function notaFranja(f: FranjaFuerte, porcentajeTexto: string): string {
  return `${f.dia} ${textoFranjaHoras(f.horaDesde, f.horaHasta)}: ${porcentajeTexto} de tus ventas`;
}

// ---------------------------------------------------------------------------------------------------------
// Series por mes y por semana
// ---------------------------------------------------------------------------------------------------------
export interface ResumenMeses {
  /** Mejor mes completo de la serie. */
  mejor: VentasMes | null;
  /** Meses completos con año anterior para comparar. */
  comparables: number;
  /** Ventas de esos meses frente a los mismos meses del año anterior (fracción) o null. */
  variacion: number | null;
  /** El mes en curso va incompleto (hoy no es su último día). */
  mesEnCursoIncompleto: boolean;
}

export function resumenMeses(serie: readonly VentasMes[], hoy: FechaISO): ResumenMeses {
  const mesActual = hoy.slice(0, 7);
  const incompleto = Number(hoy.slice(8, 10)) < diasDelMes(mesActual);
  const completos = serie.filter((m) => !(incompleto && m.mes === mesActual));
  const mejor = completos.reduce<VentasMes | null>((a, m) => (!a || m.netas > a.netas ? m : a), null);
  const comparables = completos.filter((m) => m.anioAnterior !== null && m.anioAnterior > 0);
  const actual = comparables.reduce((s, m) => s + m.netas, 0);
  const previo = comparables.reduce((s, m) => s + (m.anioAnterior ?? 0), 0);
  return { mejor, comparables: comparables.length, variacion: previo > 0 ? actual / previo - 1 : null, mesEnCursoIncompleto: incompleto };
}

/** "S39 · 28 sep": número de semana ISO y el lunes con el que empieza. */
export function etiquetaSemana(lunes: FechaISO, semana: number): string {
  return `S${String(semana).padStart(2, '0')} · ${fechaCorta(lunes)}`;
}

// ---------------------------------------------------------------------------------------------------------
// Rotación de inventario
// ---------------------------------------------------------------------------------------------------------
export type EstadoRotacion = 'dormida' | 'normal' | 'agil' | 'sin_ventas';

/** Veces que se vende el inventario al año; null si no hay ventas con qué calcularlo. */
export function rotacionAnual(dias: number): number | null {
  return Number.isFinite(dias) && dias > 0 ? 365 / dias : null;
}

/** Dormida: más de 1,3 veces los días de inventario de la tienda (como el hallazgo P5); ágil: menos de 0,7 veces. */
export function estadoRotacion(dias: number, unidades: number, vendidas90: number, diasTienda: number): EstadoRotacion {
  if (unidades > 0 && vendidas90 === 0) return 'sin_ventas';
  if (!Number.isFinite(dias)) return 'sin_ventas';
  if (dias > 1.3 * diasTienda) return 'dormida';
  if (dias < 0.7 * diasTienda) return 'agil';
  return 'normal';
}

/** Meses que tardarías en vender lo que hay (con el ritmo de los últimos 90 días). */
export function mesesParaVender(dias: number): number | null {
  return Number.isFinite(dias) ? Math.max(1, Math.round(dias / 30)) : null;
}

// ---------------------------------------------------------------------------------------------------------
// Frases de lectura (los números los pone cada componente con <Dinero>/formatos)
// ---------------------------------------------------------------------------------------------------------
export interface VendedorBase {
  nombre: string;
  numVentas: number;
  conAccesorio: number;
  vecesPromedio: number;
}

export interface Estrella {
  nombre: string;
  /** 0,4 = 40 % más que el promedio del equipo. */
  porcentajeMas: number;
  conAccesorio: number;
  /** % de ventas con accesorio del resto del equipo (ponderado por ventas). */
  accesorioResto: number;
  destacaAccesorio: boolean;
}

/** La vendedora que se destaca: vende al menos 15 % más que el promedio del equipo (P2). */
export function encontrarEstrella(vendedores: readonly VendedorBase[]): Estrella | null {
  const orden = [...vendedores].sort((a, b) => b.vecesPromedio - a.vecesPromedio);
  const top = orden[0];
  if (!top || vendedores.length < 3 || top.vecesPromedio < 1.15) return null;
  const resto = vendedores.filter((v) => v !== top);
  const ventasResto = resto.reduce((s, v) => s + v.numVentas, 0);
  const accResto = ventasResto ? resto.reduce((s, v) => s + v.conAccesorio * v.numVentas, 0) / ventasResto : 0;
  return {
    nombre: top.nombre,
    porcentajeMas: top.vecesPromedio - 1,
    conAccesorio: top.conAccesorio,
    accesorioResto: accResto,
    destacaAccesorio: top.conAccesorio >= 0.3 && top.conAccesorio >= 1.5 * accResto,
  };
}

export interface LocalBase {
  nombre: string;
  numVentas: number;
  ticket: number;
}

/** Un local con menos ventas pero con cada venta más cara que el de más volumen (P1). */
export function ticketVsVolumen(locales: readonly LocalBase[]): { localTicket: string; localVolumen: string; veces: number } | null {
  if (locales.length < 2) return null;
  const porTicket = [...locales].sort((a, b) => b.ticket - a.ticket)[0];
  const porVolumen = [...locales].sort((a, b) => b.numVentas - a.numVentas)[0];
  if (!porTicket || !porVolumen || porTicket.nombre === porVolumen.nombre || porTicket.numVentas >= porVolumen.numVentas || porVolumen.ticket <= 0) return null;
  return { localTicket: porTicket.nombre, localVolumen: porVolumen.nombre, veces: porTicket.ticket / porVolumen.ticket };
}

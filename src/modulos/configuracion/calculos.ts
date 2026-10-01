import type {
  COP,
  CostosImportacion,
  EntradaRegistro,
  FechaISO,
  FranjaHorario,
  HorarioSemanal,
  ParametrosAduanas,
  ParametrosNomina,
  TasaCambio,
} from '@/dominio/tipos';
import { calcularCostoAterrizado, type ResultadoCosteo } from '@/dominio/reglas/costeo';
import { diferenciaDias } from '@/dominio/reglas/fechas';
import { liquidarLaboral, insumosPactado, horasMes } from '@/dominio/reglas/nomina';
import { ESPACIO_DURO, numero } from '@/lib/formato';

/**
 * Cálculos propios de Configuración (E3). Todo es puro: recibe los valores y devuelve resultados. Las reglas de
 * negocio (nómina, costo aterrizado) se reutilizan del dominio; aquí solo se arman los ejemplos de vista previa
 * con los valores en borrador.
 */

// ---------------------------------------------------------------------------------------------------------
// NIT
// ---------------------------------------------------------------------------------------------------------
const PESOS_NIT = [71, 67, 59, 53, 47, 43, 41, 37, 29, 23, 19, 17, 13, 7, 3] as const;

/** Dígito de verificación de un NIT (módulo 11, pesos de la DIAN). */
export function digitoVerificacionNit(base: string): number {
  const d = base.replace(/\D/g, '');
  let suma = 0;
  for (let i = 0; i < d.length; i++) {
    const peso = PESOS_NIT[PESOS_NIT.length - d.length + i] ?? 0;
    suma += Number(d[i]) * peso;
  }
  const r = suma % 11;
  return r > 1 ? 11 - r : r;
}

/** Da formato `901.234.567-7` a nueve cifras más el dígito. */
export function formatoNit(base: string, dv: number): string {
  const d = base.replace(/\D/g, '');
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${dv}`;
}

export type ResultadoNit = { ok: true; nit: string; calculado: boolean } | { ok: false; error: string };

/**
 * Acepta 9 cifras (calcula el dígito de verificación) o 10 (lo comprueba). Cualquier otra cosa es un error en
 * lenguaje sencillo.
 */
export function normalizarNit(texto: string): ResultadoNit {
  const d = texto.replace(/\D/g, '');
  if (d.length === 0) return { ok: false, error: 'Escribe el NIT del negocio.' };
  if (d.length === 9) return { ok: true, nit: formatoNit(d, digitoVerificacionNit(d)), calculado: true };
  if (d.length === 10) {
    const base = d.slice(0, 9);
    const dv = Number(d[9]);
    const esperado = digitoVerificacionNit(base);
    if (dv !== esperado) return { ok: false, error: `El dígito de verificación debería ser ${esperado}.` };
    return { ok: true, nit: formatoNit(base, dv), calculado: false };
  }
  return { ok: false, error: 'El NIT tiene 9 cifras y un dígito de verificación (ej.: 901.234.567-7).' };
}

// ---------------------------------------------------------------------------------------------------------
// Colores
// ---------------------------------------------------------------------------------------------------------
const RE_HEX = /^#[0-9A-Fa-f]{6}$/;

export function hexValido(h: string): boolean {
  return RE_HEX.test(h);
}

/** `#abc` y `abc` → `#AABBCC`; devuelve null si no es un color. */
export function normalizarHex(texto: string): string | null {
  let t = texto.trim().replace(/^#/, '');
  if (/^[0-9A-Fa-f]{3}$/.test(t)) t = t.replace(/./g, (c) => c + c);
  return /^[0-9A-Fa-f]{6}$/.test(t) ? `#${t.toUpperCase()}` : null;
}

function rgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

function aHex(c: readonly [number, number, number]): string {
  return `#${c.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** Mezcla `a` con `b`: t = 0 → a, t = 1 → b. */
export function mezclar(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return aHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

function luminancia(h: string): number {
  const [r, g, b] = rgb(h).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste entre dos colores (1 a 21). */
export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Color de texto y fondo suave a partir del color principal (la receta de la marca de ejemplo). */
export function derivarTonos(acento: string): { acentoTexto: string; acentoSuave: string } {
  return { acentoTexto: mezclar(acento, '#000000', 0.32), acentoSuave: mezclar(acento, '#FFFFFF', 0.88) };
}

/** Texto negro o blanco, el que mejor se lee sobre `fondo`. */
export function textoSobre(fondo: string): '#000000' | '#FFFFFF' {
  return contraste(fondo, '#FFFFFF') >= contraste(fondo, '#000000') ? '#FFFFFF' : '#000000';
}

// ---------------------------------------------------------------------------------------------------------
// Borradores de parámetros
// ---------------------------------------------------------------------------------------------------------
type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => typeof v === 'object' && v !== null && !Array.isArray(v);

export function leerEn(o: unknown, ruta: string): unknown {
  let actual: unknown = o;
  for (const clave of ruta.split('.')) {
    if (!esObjeto(actual)) return undefined;
    actual = actual[clave];
  }
  return actual;
}

/** Copia con `ruta` ('recargos.nocturno') puesta en `valor`, sin tocar el original. */
export function establecerEn<T extends object>(o: T, ruta: string, valor: unknown): T {
  const claves = ruta.split('.');
  const [primera, ...resto] = claves;
  if (primera === undefined) return o;
  const copia = { ...(o as Objeto) };
  copia[primera] = resto.length === 0 ? valor : establecerEn((esObjeto(copia[primera]) ? copia[primera] : {}) as Objeto, resto.join('.'), valor);
  return copia as T;
}

/** Lo que cambió entre `base` y `nuevo`, con la misma forma anidada (las listas se reemplazan enteras). null si nada. */
export function diferencia(base: unknown, nuevo: unknown): unknown | null {
  if (esObjeto(base) && esObjeto(nuevo)) {
    const r: Objeto = {};
    for (const k of Object.keys(nuevo)) {
      const d = diferencia(base[k], nuevo[k]);
      if (d !== null) r[k] = d;
    }
    return Object.keys(r).length > 0 ? r : null;
  }
  return JSON.stringify(base) === JSON.stringify(nuevo) ? null : nuevo;
}

/** Cuántos valores distintos hay en una diferencia (una lista cuenta como uno). */
export function contarCambios(dif: unknown): number {
  if (dif === null || dif === undefined) return 0;
  if (esObjeto(dif)) return Object.values(dif).reduce<number>((n, v) => n + contarCambios(v), 0);
  return 1;
}

/** Fracción ↔ texto de porcentaje: 0.085 ↔ '8,5'. */
export function fraccionATexto(f: number, decimales = 2): string {
  return numero(Math.round(f * 100 * 10 ** decimales) / 10 ** decimales, decimales);
}

export function textoAFraccion(texto: string): number | null {
  const limpio = texto.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  if (limpio === '' || !/^\d*\.?\d+$/.test(limpio)) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? Math.round((n / 100) * 1e8) / 1e8 : null;
}

export function horaValida(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

// ---------------------------------------------------------------------------------------------------------
// Monedas y tasas
// ---------------------------------------------------------------------------------------------------------
export interface FilaTasa {
  tasa: TasaCambio;
  /** Cambio frente a la tasa anterior de la misma moneda (fracción); null en la primera. */
  variacion: number | null;
  /** Es la que usa el sistema hoy. */
  vigente: boolean;
}

/** Historial de una moneda, de la más reciente a la más antigua, con su variación y la marca de "en uso". */
export function historialTasas(tasas: readonly TasaCambio[], moneda: TasaCambio['moneda'] | 'todas', hoy: FechaISO): FilaTasa[] {
  const monedas = moneda === 'todas' ? (['USD', 'CNY'] as const) : ([moneda] as const);
  const filas: FilaTasa[] = [];
  for (const m of monedas) {
    const lista = tasas.filter((t) => t.moneda === m).sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
    const vigente = [...lista].reverse().find((t) => t.fecha <= hoy);
    lista.forEach((t, i) => {
      const previa = lista[i - 1];
      filas.push({ tasa: t, variacion: previa && previa.valor > 0 ? t.valor / previa.valor - 1 : null, vigente: t.id === vigente?.id });
    });
  }
  return filas.sort((a, b) => (a.tasa.fecha === b.tasa.fecha ? (a.tasa.moneda < b.tasa.moneda ? -1 : 1) : a.tasa.fecha < b.tasa.fecha ? 1 : -1));
}

export function tasaVigenteDe(tasas: readonly TasaCambio[], moneda: TasaCambio['moneda'], hoy: FechaISO): TasaCambio | null {
  let mejor: TasaCambio | null = null;
  for (const t of tasas) if (t.moneda === moneda && t.fecha <= hoy && (!mejor || t.fecha > mejor.fecha)) mejor = t;
  return mejor;
}

/** Cuánto vale `cop` en una moneda extranjera con `tasa` (COP por unidad); null si la tasa no sirve. */
export function aMonedaExtranjera(cop: COP, tasa: number | null): number | null {
  if (!tasa || tasa <= 0) return null;
  return Math.round((cop / tasa) * 100) / 100;
}

/** Una tasa en pesos con hasta dos decimales: `$ 3.950` · `$ 548,25`. */
export function pesos(valor: number): string {
  return `$${ESPACIO_DURO}${numero(valor, 2)}`;
}

/** Igual que `pesos` pero siempre con dos decimales (columnas de una tabla): `$ 3.950,00`. */
export function pesosFijos(valor: number): string {
  return `$${ESPACIO_DURO}${numero(valor, 2, 2)}`;
}

export type ErroresTasa = Partial<Record<'valor' | 'fecha', string>>;

export function validarTasa(valor: number | null, fecha: FechaISO | null, hoy: FechaISO): ErroresTasa {
  const e: ErroresTasa = {};
  if (valor === null || valor <= 0) e.valor = 'Escribe cuántos pesos vale una unidad (mayor que cero).';
  if (!fecha) e.fecha = 'Elige la fecha de la tasa.';
  else if (fecha > hoy) e.fecha = 'La tasa no puede ser de una fecha futura.';
  return e;
}

// ---------------------------------------------------------------------------------------------------------
// Nómina: vista previa
// ---------------------------------------------------------------------------------------------------------
export interface EjemploNomina {
  salario: COP;
  auxilio: COP;
  totalDevengado: COP;
  neto: COP;
  aportes: COP;
  provisiones: COP;
  costo: COP;
  valorHora: number;
  divisor: number;
  exonerado: boolean;
}

/** Lo que cuesta un empleado de salario fijo todo el mes con estos parámetros (el mismo cálculo de la nómina). */
export function ejemploNomina(p: ParametrosNomina, salario: COP, exoneracion: boolean, fecha: FechaISO): EjemploNomina {
  const r = liquidarLaboral({
    contrato: { salarioBase: salario, riesgoArl: 1 },
    insumos: insumosPactado(30),
    parametros: p,
    exoneracion,
    comisiones: 0,
    bonos: 0,
    fecha,
  });
  return {
    salario,
    auxilio: r.desglose.devengados.auxilioTransporte,
    totalDevengado: r.desglose.totalDevengado,
    neto: r.neto,
    aportes: r.desglose.totalAportes,
    provisiones: r.desglose.totalProvisiones,
    costo: r.costoEmpleador,
    valorHora: r.valorHora,
    divisor: horasMes(p, fecha),
    exonerado: r.desglose.exonerado114,
  };
}

// ---------------------------------------------------------------------------------------------------------
// Aduanas: pedido de ejemplo
// ---------------------------------------------------------------------------------------------------------
export interface EntradaPedidoEjemplo {
  unidades: number;
  /** FOB por prenda en dólares (no centavos). */
  fobUnitarioUsd: number;
  fleteUsd: number;
  honorarios: COP;
  bodegaje: COP;
  transporte: COP;
  tasaUsd: number;
}

/** El mismo costo aterrizado de las importaciones, pero con los parámetros aduaneros en borrador. */
export function pedidoEjemplo(p: ParametrosAduanas, e: EntradaPedidoEjemplo): ResultadoCosteo {
  const fobCentavos = Math.round(e.unidades * e.fobUnitarioUsd * 100);
  const costos: CostosImportacion = {
    flete: { moneda: 'USD', valor: Math.round(e.fleteUsd * 100) },
    seguro: { moneda: 'USD', valor: Math.round(fobCentavos * p.seguroPctSobreFOB) },
    honorariosAgente: e.honorarios,
    bodegajePuerto: e.bodegaje,
    transporteInterno: e.transporte,
    otros: 0,
    otrosTributosAduaneros: Math.round(p.otrosTributosPorUnidad * e.unidades),
    arancelPct: p.arancelPct,
    ivaImportacionPct: p.ivaImportacionPct,
    ivaSumaAlCosto: p.ivaImportacionSumaAlCosto,
  };
  return calcularCostoAterrizado({
    lineas: [{ id: 'ejemplo', productoId: 'ejemplo', cantidades: { ejemplo: Math.max(0, Math.round(e.unidades)) }, costoUnitarioOrigen: Math.round(e.fobUnitarioUsd * 100) }],
    costos,
    moneda: 'USD',
    metodoProrrateo: 'valor',
    tasaCosteo: e.tasaUsd,
  });
}

/** Promedio entero de una lista (0 si está vacía). */
export function promedio(valores: readonly number[]): number {
  if (valores.length === 0) return 0;
  return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
}

// ---------------------------------------------------------------------------------------------------------
// Datos de la demo
// ---------------------------------------------------------------------------------------------------------
const CATEGORIA_COMANDO: Record<string, string> = {
  venta: 'Ventas',
  separado: 'Ventas',
  devolucion: 'Ventas',
  bono: 'Ventas',
  aprobacion: 'Aprobaciones',
  caja: 'Caja',
  pago: 'Caja',
  datafono: 'Caja',
  producto: 'Inventario',
  variante: 'Inventario',
  color: 'Inventario',
  inventario: 'Inventario',
  traslado: 'Inventario',
  conteo: 'Inventario',
  cliente: 'Clientes',
  mensaje: 'Clientes',
  proveedor: 'Proveedores',
  contacto: 'Proveedores',
  importacion: 'Importaciones',
  cxp: 'Pagos y cuentas',
  cuenta: 'Pagos y cuentas',
  gasto: 'Gastos',
  gastoRecurrente: 'Gastos',
  empleado: 'Personal',
  contrato: 'Personal',
  esquemaComision: 'Personal',
  meta: 'Personal',
  turno: 'Turnos y asistencia',
  marcacion: 'Turnos y asistencia',
  novedad: 'Turnos y asistencia',
  pila: 'Nómina',
  nomina: 'Nómina',
  evento: 'Calendario',
  factura: 'Facturación',
  notaCredito: 'Facturación',
  empresa: 'Configuración',
  local: 'Configuración',
  tasa: 'Configuración',
  parametros: 'Configuración',
  resolucion: 'Configuración',
  usuario: 'Configuración',
};

export function categoriaDeCambio(tipo: string): string {
  return CATEGORIA_COMANDO[tipo.split('.')[0] ?? ''] ?? 'Otros';
}

export interface ResumenCambios {
  total: number;
  porCategoria: { categoria: string; cantidad: number }[];
}

/** Lo que el visitante cambió, agrupado por área (para "Lo que has cambiado"). Las entradas del sistema no cuentan. */
export function resumirRegistro(registro: readonly EntradaRegistro[]): ResumenCambios {
  const cuenta = new Map<string, number>();
  let total = 0;
  for (const e of registro) {
    if (e.origen !== 'usuario') continue;
    total++;
    const c = categoriaDeCambio(e.comando.tipo);
    cuenta.set(c, (cuenta.get(c) ?? 0) + 1);
  }
  return {
    total,
    porCategoria: [...cuenta.entries()].map(([categoria, cantidad]) => ({ categoria, cantidad })).sort((a, b) => b.cantidad - a.cantidad || a.categoria.localeCompare(b.categoria)),
  };
}

/** Tamaño legible: 842 B · 12,4 KB · 1,2 MB. */
export function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${numero(bytes)} B`;
  if (bytes < 1024 * 1024) return `${numero(bytes / 1024, 1)} KB`;
  return `${numero(bytes / (1024 * 1024), 1)} MB`;
}

/** Días que pasaron desde el ancla de los datos hasta hoy. */
export function diasDeAntiguedad(ancla: FechaISO, hoy: FechaISO): number {
  if (!ancla) return 0;
  return Math.max(0, diferenciaDias(ancla, hoy));
}

export const DIAS_PARA_DATOS_FRESCOS = 7;

/** Se sugiere traer datos frescos cuando hay cambios guardados y los datos tienen 7 días o más. */
export function sugerirDatosFrescos(cambios: number, antiguedadDias: number): boolean {
  return cambios > 0 && antiguedadDias >= DIAS_PARA_DATOS_FRESCOS;
}

// ---------------------------------------------------------------------------------------------------------
// Locales: horario resumido y validación
// ---------------------------------------------------------------------------------------------------------
export interface HorarioResumido {
  /** Lunes a viernes (se toma el lunes); null = cerrado. */
  semana: FranjaHorario | null;
  sabado: FranjaHorario | null;
  domingo: FranjaHorario | null;
}

export function resumirHorario(h: HorarioSemanal): HorarioResumido {
  return { semana: h[1], sabado: h[6], domingo: h[0] };
}

/** Arma los siete días a partir de las tres franjas del formulario. */
export function armarHorario(r: HorarioResumido): HorarioSemanal {
  return { 0: r.domingo, 1: r.semana, 2: r.semana, 3: r.semana, 4: r.semana, 5: r.semana, 6: r.sabado };
}

const franja = (f: FranjaHorario | null) => (f ? `${f.abre} a ${f.cierra}` : 'Cerrado');

/** "Lun–vie 10:00 a 20:00 · Sáb 10:00 a 20:00 · Dom 11:00 a 19:00". */
export function textoHorario(h: HorarioSemanal): string {
  const r = resumirHorario(h);
  return `Lun–vie ${franja(r.semana)} · Sáb ${franja(r.sabado)} · Dom ${franja(r.domingo)}`;
}

/** Versión corta para tablas: "Lun–sáb 10:00–20:00 · Dom 11:00–19:00". */
export function textoHorarioCorto(h: HorarioSemanal): string {
  const r = resumirHorario(h);
  const f = (x: FranjaHorario | null) => (x ? `${x.abre}–${x.cierra}` : 'cerrado');
  const iguales = JSON.stringify(r.semana) === JSON.stringify(r.sabado);
  return iguales ? `Lun–sáb ${f(r.semana)} · Dom ${f(r.domingo)}` : `Lun–vie ${f(r.semana)} · Sáb ${f(r.sabado)} · Dom ${f(r.domingo)}`;
}

export type CampoLocal = 'nombre' | 'codigo' | 'direccion' | 'arriendo' | 'area' | 'semana' | 'sabado' | 'domingo';

export interface BorradorLocal {
  nombre: string;
  codigo: string;
  direccion: string;
  arriendo: number | null;
  area: number | null;
  horario: HorarioResumido;
}

function validarFranja(f: FranjaHorario | null): string | null {
  if (!f) return null;
  if (!horaValida(f.abre) || !horaValida(f.cierra)) return 'Escribe las horas como 10:00 y 20:00.';
  if (f.abre >= f.cierra) return 'La hora de cierre debe ser después de la de apertura.';
  return null;
}

export function validarBorradorLocal(b: BorradorLocal, codigosOcupados: readonly string[]): Partial<Record<CampoLocal, string>> {
  const e: Partial<Record<CampoLocal, string>> = {};
  if (!b.nombre.trim()) e.nombre = 'Escribe el nombre del local.';
  const codigo = b.codigo.trim().toUpperCase();
  if (!codigo) e.codigo = 'Escribe un código corto, por ejemplo P93.';
  else if (!/^[A-Z0-9]{2,5}$/.test(codigo)) e.codigo = 'El código lleva de 2 a 5 letras o números, sin espacios.';
  else if (codigosOcupados.includes(codigo)) e.codigo = 'Ya hay un local con ese código.';
  if (!b.direccion.trim()) e.direccion = 'Escribe la dirección.';
  if (b.arriendo === null || b.arriendo < 0) e.arriendo = 'Escribe el arriendo mensual (puede ser cero).';
  if (b.area === null || b.area <= 0) e.area = 'Escribe el área en metros cuadrados.';
  const s = validarFranja(b.horario.semana);
  if (s) e.semana = s;
  const sa = validarFranja(b.horario.sabado);
  if (sa) e.sabado = sa;
  const d = validarFranja(b.horario.domingo);
  if (d) e.domingo = d;
  return e;
}

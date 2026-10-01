import type {
  Cargo,
  ComponenteComision,
  COP,
  DesgloseLaboral,
  DesglosePrestacion,
  EsquemaComision,
  FechaISO,
  Id,
  MesISO,
  ParametrosNomina,
  TipoVinculacion,
} from '@/dominio/tipos';
import { esquemaValido } from '@/dominio/reglas/comisiones';
import { diferenciaDias, sumarMesesAMes } from '@/dominio/reglas/fechas';
import { jornadaMaximaVigente } from '@/dominio/reglas/jornada';
import { SLUGS_RESERVADOS } from '@/config/nomina';
import { numero, plural, porcentaje } from '@/lib/formato';

/**
 * Cálculos PROPIOS de la interfaz de Personal, nómina y comisiones (C1). Ninguno reimplementa una regla de nómina:
 * `selCostoEmpleado`, `selVistaPreviaNomina`, `selComisiones`… siguen siendo quienes calculan (PLAN 6.20.4–6.20.6).
 * Aquí solo se ordena lo que ya está calculado para mostrarlo (barra apilada, desglose, reparto del detalle) y se
 * validan los formularios con las mismas reglas del dominio para avisar junto a cada campo.
 */

// ---------------------------------------------------------------------------------------------------------
// Frases con cifras
// ---------------------------------------------------------------------------------------------------------
/** Pedazos de una frase: texto, dinero (se pinta con `<Dinero>`, respeta la moneda) o énfasis. */
export type Frase = readonly (string | { dinero: COP } | { enfasis: string })[];

// ---------------------------------------------------------------------------------------------------------
// Barra apilada del costo (W6)
// ---------------------------------------------------------------------------------------------------------
export type IdSegmento = 'salario' | 'comisiones' | 'recargos' | 'auxilio' | 'aportes' | 'prestaciones';

export interface BarrasCosto {
  salario: COP;
  comisiones: COP;
  recargos: COP;
  auxilio: COP;
  aportes: COP;
  prestaciones: COP;
}

export interface SegmentoCosto {
  id: IdSegmento;
  etiqueta: string;
  valor: COP;
  /** Parte del costo total (0–1). */
  fraccion: number;
  /** Clase de fondo: solo tokens (los grises son lo fijo; los cálidos, lo variable). */
  clase: string;
  /** `visible` = lo que ve la persona en su desprendible; `oculto` = lo que no está en el contrato. */
  grupo: 'visible' | 'oculto';
  descripcion: string;
}

const DEFINICION_SEGMENTO: Record<IdSegmento, Omit<SegmentoCosto, 'id' | 'valor' | 'fraccion'>> = {
  salario: { etiqueta: 'Salario', clase: 'bg-chart-1', grupo: 'visible', descripcion: 'Lo que dice el contrato.' },
  comisiones: { etiqueta: 'Comisiones', clase: 'bg-accent', grupo: 'visible', descripcion: 'También cuentan como salario: generan aportes y prestaciones.' },
  recargos: { etiqueta: 'Recargos y horas extra', clase: 'bg-accent-ink', grupo: 'visible', descripcion: 'Cierres nocturnos, domingos, festivos y horas extra.' },
  auxilio: { etiqueta: 'Auxilio de transporte', clase: 'bg-chart-2', grupo: 'visible', descripcion: 'Se paga a quienes ganan hasta el tope parametrizado.' },
  aportes: { etiqueta: 'Aportes del empleador', clase: 'bg-chart-3', grupo: 'oculto', descripcion: 'Salud, pensión, riesgos laborales, caja de compensación, ICBF y SENA.' },
  prestaciones: { etiqueta: 'Prestaciones', clase: 'bg-chart-4', grupo: 'oculto', descripcion: 'Prima, cesantías, intereses y vacaciones: se provisionan cada mes.' },
};

const ORDEN_SEGMENTOS: readonly IdSegmento[] = ['salario', 'comisiones', 'recargos', 'auxilio', 'aportes', 'prestaciones'];

/** Segmentos de la barra apilada con su parte del costo. Los de valor cero no se pintan (pero la leyenda los puede listar). */
export function segmentosCosto(barras: BarrasCosto, tipo: TipoVinculacion = 'laboral'): SegmentoCosto[] {
  const total = ORDEN_SEGMENTOS.reduce((a, id) => a + Math.max(0, barras[id]), 0);
  return ORDEN_SEGMENTOS.map((id) => {
    const base = DEFINICION_SEGMENTO[id];
    const etiqueta = tipo === 'prestacion_servicios' && id === 'salario' ? 'Honorarios' : base.etiqueta;
    const valor = Math.max(0, barras[id]);
    return { id, ...base, etiqueta, valor, fraccion: total > 0 ? valor / total : 0 };
  });
}

/** Cuántas veces el costo supera lo que dice el contrato (1,53 = por cada $ 100 de salario el negocio paga $ 153). */
export function vecesDelContrato(costo: COP, valorContrato: COP): number | null {
  return valorContrato > 0 ? costo / valorContrato : null;
}

/** Lo que el negocio paga y no está en el contrato: aportes y prestaciones (laboral) o nada (prestación). */
export function costoOculto(barras: BarrasCosto): COP {
  return Math.max(0, barras.aportes) + Math.max(0, barras.prestaciones);
}

/** Lo que cuesta de más tener el mismo valor como salario (laboral) que como honorarios, en pesos por año. */
export function aAnio(mensual: COP): COP {
  return mensual * 12;
}

// ---------------------------------------------------------------------------------------------------------
// Desglose
// ---------------------------------------------------------------------------------------------------------
export interface FilaDesglose {
  id: string;
  etiqueta: string;
  valor: COP;
  /** Lo que lo explica: porcentaje, horas, base… */
  nota?: string;
  /** Aporte que la exoneración elimina (se pinta tachado con la etiqueta "Exonerado"). */
  exonerado?: boolean;
  /** Fila de total del grupo. */
  total?: boolean;
}

export type IdGrupo = 'devengados' | 'deducciones' | 'aportes' | 'provisiones';

export interface GrupoDesglose {
  id: IdGrupo;
  titulo: string;
  ayuda: string;
  filas: FilaDesglose[];
  total: COP;
}

const pct = (f: number, decimales = 1) => porcentaje(f, decimales);

/** Desglose de una liquidación laboral en sus cuatro grupos. Los porcentajes salen de los parámetros usados. */
export function composicionLaboral(d: DesgloseLaboral, p: ParametrosNomina): GrupoDesglose[] {
  const dv = d.devengados;
  const siHay = (id: string, etiqueta: string, valor: COP, nota?: string): FilaDesglose[] => (valor > 0 ? [{ id, etiqueta, valor, nota }] : []);
  const devengados: FilaDesglose[] = [
    { id: 'salario', etiqueta: 'Salario', valor: dv.salario },
    {
      id: 'auxilio',
      etiqueta: 'Auxilio de transporte',
      valor: dv.auxilioTransporte,
      nota: dv.auxilioTransporte > 0 ? 'No suma al salario para aportes' : 'No aplica con este devengado',
    },
    ...siHay('incapacidad', 'Incapacidad', dv.incapacidad),
    ...siHay('vacaciones', 'Vacaciones disfrutadas', dv.vacaciones),
    ...siHay('extra-diurna', 'Horas extra diurnas', dv.horasExtraDiurnas),
    ...siHay('extra-nocturna', 'Horas extra nocturnas', dv.horasExtraNocturnas),
    ...siHay('recargo-nocturno', 'Recargo nocturno', dv.recargoNocturno),
    ...siHay('recargo-dominical', 'Recargo dominical y festivo', dv.recargoDominicalFestivo),
    ...siHay('comisiones', 'Comisiones', dv.comisiones, 'Sobre la venta sin IVA'),
    ...siHay('bonos', 'Bonos', dv.bonos),
  ];
  const base = d.ibc > 0 ? d.ibc : 1;
  const arlPct = d.aportesEmpleador.arl / base;
  const exo = d.exonerado114;
  return [
    {
      id: 'devengados',
      titulo: 'Lo que gana',
      ayuda: 'Devengados: todo lo que se le reconoce a la persona en el mes.',
      filas: devengados,
      total: d.totalDevengado,
    },
    {
      id: 'deducciones',
      titulo: 'Lo que se le descuenta',
      ayuda: 'Deducciones del trabajador: salen de su pago y las traslada el negocio.',
      filas: [
        { id: 'salud-t', etiqueta: 'Salud', valor: d.deducciones.salud, nota: pct(p.trabajador.salud) },
        { id: 'pension-t', etiqueta: 'Pensión', valor: d.deducciones.pension, nota: pct(p.trabajador.pension) },
        ...siHay('solidaridad', 'Fondo de solidaridad pensional', d.deducciones.fondoSolidaridad, 'Solo con ingresos altos'),
      ],
      total: d.totalDeducciones,
    },
    {
      id: 'aportes',
      titulo: 'Aportes del negocio',
      ayuda: 'Los paga el empleador además del salario. Se calculan sobre el salario sin auxilio de transporte.',
      filas: [
        { id: 'salud-e', etiqueta: 'Salud', valor: d.aportesEmpleador.salud, nota: pct(p.empleador.salud), exonerado: exo },
        { id: 'pension-e', etiqueta: 'Pensión', valor: d.aportesEmpleador.pension, nota: pct(p.empleador.pension) },
        { id: 'arl', etiqueta: 'Riesgos laborales (ARL)', valor: d.aportesEmpleador.arl, nota: pct(arlPct, 3) },
        { id: 'caja', etiqueta: 'Caja de compensación', valor: d.aportesEmpleador.caja, nota: pct(p.empleador.caja) },
        { id: 'icbf', etiqueta: 'ICBF', valor: d.aportesEmpleador.icbf, nota: pct(p.empleador.icbf), exonerado: exo },
        { id: 'sena', etiqueta: 'SENA', valor: d.aportesEmpleador.sena, nota: pct(p.empleador.sena), exonerado: exo },
      ],
      total: d.totalAportes,
    },
    {
      id: 'provisiones',
      titulo: 'Lo que debes guardar cada mes',
      ayuda: 'Provisiones: dinero que el negocio ya debe aunque todavía no lo pague (prima, cesantías, intereses y vacaciones).',
      filas: [
        { id: 'cesantias', etiqueta: 'Cesantías', valor: d.provisiones.cesantias, nota: pct(p.provisiones.cesantias, 2) },
        { id: 'intereses', etiqueta: 'Intereses a las cesantías', valor: d.provisiones.interesesCesantias, nota: `${pct(p.provisiones.interesesCesantiasAnual, 0)} anual sobre las cesantías` },
        { id: 'prima', etiqueta: 'Prima de servicios', valor: d.provisiones.prima, nota: pct(p.provisiones.prima, 2) },
        { id: 'vacaciones', etiqueta: 'Vacaciones', valor: d.provisiones.vacaciones, nota: pct(p.provisiones.vacaciones, 2) },
      ],
      total: d.totalProvisiones,
    },
  ];
}

/** Desglose de una liquidación por prestación de servicios. */
export function composicionPrestacion(d: DesglosePrestacion): FilaDesglose[] {
  return [
    { id: 'honorarios', etiqueta: 'Honorarios del periodo', valor: d.honorarios },
    ...(d.comisiones > 0 ? [{ id: 'comisiones', etiqueta: 'Comisiones', valor: d.comisiones, nota: 'Sobre la venta sin IVA' }] : []),
    { id: 'bruto', etiqueta: 'Total bruto', valor: d.totalBruto, total: true },
    {
      id: 'retencion',
      etiqueta: 'Retención en la fuente',
      valor: d.retencionFuente,
      nota: d.totalBruto > 0 ? pct(d.retencionFuente / d.totalBruto) : undefined,
    },
  ];
}

/** ¿Cuánto cambia el costo si se activa o no la exoneración? Nunca negativo. */
export function ahorroExoneracion(conExoneracion: COP, sinExoneracion: COP): COP {
  return Math.max(0, sinExoneracion - conExoneracion);
}

// ---------------------------------------------------------------------------------------------------------
// Reparto proporcional (detalle de comisiones)
// ---------------------------------------------------------------------------------------------------------
/**
 * Reparte `total` entre `valores` de forma proporcional y en pesos enteros, de modo que la suma de las partes sea
 * EXACTAMENTE `total` (método del mayor resto). Con total de valores cero reparte cero.
 */
export function repartirProporcional(valores: readonly number[], total: COP): COP[] {
  const suma = valores.reduce((a, v) => a + v, 0);
  if (suma === 0 || valores.length === 0) return valores.map(() => 0);
  const exactas = valores.map((v) => (v / suma) * total);
  const base = exactas.map((x) => Math.trunc(x));
  let resto = total - base.reduce((a, b) => a + b, 0);
  const orden = exactas
    .map((x, i) => ({ i, f: Math.abs(x - Math.trunc(x)) }))
    .sort((a, b) => b.f - a.f || a.i - b.i);
  const paso = resto > 0 ? 1 : -1;
  for (let k = 0; resto !== 0 && k < orden.length * 2; k++) {
    const j = orden[k % orden.length]?.i ?? 0;
    base[j] = (base[j] ?? 0) + paso;
    resto -= paso;
  }
  return base;
}

// ---------------------------------------------------------------------------------------------------------
// Esquemas de comisión
// ---------------------------------------------------------------------------------------------------------
/** El esquema en lenguaje del vendedor, una frase por componente. */
export function frasesEsquema(esquema: Pick<EsquemaComision, 'base' | 'componentes'>): Frase[] {
  const sobre = esquema.base === 'base_sin_iva' ? 'sin IVA' : 'con IVA';
  return esquema.componentes.map((c): Frase => {
    if (c.tipo === 'porcentaje') return [{ enfasis: porcentaje(c.porcentaje, 2) }, ` de tus ventas ${sobre}`];
    if (c.tipo === 'bono_meta_local')
      return ['Bono de ', { dinero: c.valor }, ` si el local llega al ${porcentaje(c.cumplimientoMinimo, 0)} de su meta del mes`];
    const tramos = [...c.tramos].sort((a, b) => a.desde - b.desde);
    const partes: (string | { dinero: COP } | { enfasis: string })[] = [
      c.modo === 'total'
        ? `Según lo que vendas en el mes (${sobre}), el porcentaje del tramo alcanzado se aplica a todas tus ventas: `
        : `Cada porcentaje se aplica solo a la parte de tus ventas ${sobre} que cae en su tramo: `,
    ];
    tramos.forEach((t, i) => {
      if (i > 0) partes.push(' · ');
      partes.push({ enfasis: porcentaje(t.porcentaje, 2) }, ' desde ', { dinero: t.desde });
    });
    return partes;
  });
}

export const ETIQUETA_COMPONENTE: Record<ComponenteComision['tipo'], string> = {
  porcentaje: 'Porcentaje sobre ventas',
  escalonado: 'Escalonado por meta de ventas',
  bono_meta_local: 'Bono por meta del local',
};

export type CampoEsquema = 'nombre' | 'componentes' | 'base';

/** Valida un esquema con la misma regla del dominio (`esquemaValido`) y avisa junto al campo. */
export function validarEsquema(b: { nombre: string; componentes: readonly ComponenteComision[] }): Partial<Record<CampoEsquema, string>> {
  const e: Partial<Record<CampoEsquema, string>> = {};
  if (!b.nombre.trim()) e.nombre = 'Escribe el nombre del esquema.';
  const dominio = esquemaValido(b.componentes);
  if (dominio) e.componentes = dominio;
  return e;
}

// ---------------------------------------------------------------------------------------------------------
// Meses
// ---------------------------------------------------------------------------------------------------------
const RE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Los últimos `n` meses hasta el de `hoy`, del más reciente al más antiguo. */
export function mesesRecientes(hoy: FechaISO, n = 19): MesISO[] {
  const actual = hoy.slice(0, 7);
  return Array.from({ length: n }, (_, i) => sumarMesesAMes(actual, -i));
}

/** `?mes=` válido y no futuro; si no, el mes de `hoy`. */
export function mesEfectivo(param: string | null, hoy: FechaISO): MesISO {
  const actual = hoy.slice(0, 7);
  return param && RE_MES.test(param) && param <= actual ? param : actual;
}

/** Último día del mes (para rangos de exportes). */
export function ultimoDiaDelMes(mes: MesISO): FechaISO {
  const [a, m] = mes.split('-').map(Number) as [number, number];
  const dias = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return `${mes}-${String(dias).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------------------------------------
// Antigüedad
// ---------------------------------------------------------------------------------------------------------
/** "2 años y 3 meses", "5 meses", "12 días". */
export function antiguedad(ingreso: FechaISO, hasta: FechaISO): string {
  if (hasta < ingreso) return 'Aún no ingresa';
  const [a1, m1, d1] = ingreso.split('-').map(Number) as [number, number, number];
  const [a2, m2, d2] = hasta.split('-').map(Number) as [number, number, number];
  const meses = (a2 - a1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
  if (meses < 1) return plural(diferenciaDias(ingreso, hasta), 'día');
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  if (anios === 0) return plural(meses, 'mes', 'meses');
  const a = plural(anios, 'año');
  return resto === 0 ? a : `${a} y ${plural(resto, 'mes', 'meses')}`;
}

// ---------------------------------------------------------------------------------------------------------
// Formulario de empleado
// ---------------------------------------------------------------------------------------------------------
export interface BorradorEmpleado {
  nombres: string;
  apellidos: string;
  tipoDocumento: 'CC' | 'CE' | 'PPT';
  numeroDocumento: string;
  fechaNacimiento: FechaISO | null;
  cargo: Cargo | null;
  localId: Id | null;
  fechaIngreso: FechaISO | null;
  celular: string;
  correo: string;
  contactoNombre: string;
  contactoParentesco: string;
  contactoCelular: string;
  eps: string;
  pension: string;
  cesantias: string;
  arl: string;
  caja: string;
  cuentaEntidad: string;
  cuentaTipo: 'ahorros' | 'corriente' | 'nequi' | 'daviplata';
  cuentaNumero: string;
}

export type CampoEmpleado = Exclude<keyof BorradorEmpleado, 'tipoDocumento' | 'localId' | 'cuentaTipo'>;

const RE_CELULAR = /^3\d{9}$/;
const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mismas reglas del dominio (`empleado.crear`), para marcar el campo antes de enviar. */
export function validarEmpleado(b: BorradorEmpleado, hoy: FechaISO): Partial<Record<CampoEmpleado, string>> {
  const e: Partial<Record<CampoEmpleado, string>> = {};
  if (!b.nombres.trim()) e.nombres = 'Escribe los nombres.';
  if (!b.apellidos.trim()) e.apellidos = 'Escribe los apellidos.';
  if (!b.numeroDocumento.trim()) e.numeroDocumento = 'Escribe el número de documento.';
  else if (!/^[0-9A-Za-z]{5,15}$/.test(b.numeroDocumento.trim())) e.numeroDocumento = 'El documento debe tener entre 5 y 15 caracteres, sin puntos ni espacios.';
  if (b.fechaNacimiento && b.fechaNacimiento >= hoy) e.fechaNacimiento = 'La fecha de nacimiento debe ser anterior a hoy.';
  if (!b.cargo) e.cargo = 'Elige el cargo.';
  if (!b.fechaIngreso) e.fechaIngreso = 'Elige la fecha de ingreso.';
  if (!RE_CELULAR.test(b.celular.replace(/\s/g, ''))) e.celular = 'Escribe un celular de 10 dígitos que empiece por 3.';
  if (!RE_CORREO.test(b.correo.trim())) e.correo = 'Escribe un correo válido.';
  if (!b.contactoNombre.trim()) e.contactoNombre = 'Escribe a quién avisar en una emergencia.';
  if (!b.contactoParentesco.trim()) e.contactoParentesco = 'Escribe el parentesco (madre, pareja, amigo…).';
  if (!RE_CELULAR.test(b.contactoCelular.replace(/\s/g, ''))) e.contactoCelular = 'Escribe el celular de 10 dígitos de esa persona.';
  if (!b.eps.trim()) e.eps = 'Escribe la EPS.';
  if (!b.pension.trim()) e.pension = 'Escribe el fondo de pensión.';
  if (!b.cesantias.trim()) e.cesantias = 'Escribe el fondo de cesantías.';
  if (!b.arl.trim()) e.arl = 'Escribe la ARL.';
  if (!b.caja.trim()) e.caja = 'Escribe la caja de compensación.';
  if (!b.cuentaEntidad.trim()) e.cuentaEntidad = 'Escribe el banco o la billetera.';
  if (!b.cuentaNumero.trim()) e.cuentaNumero = 'Escribe los últimos dígitos de la cuenta.';
  return e;
}

/** Cuenta enmascarada para guardar: solo los últimos cuatro dígitos. */
export function enmascararCuenta(entrada: string): string {
  const digitos = entrada.replace(/\D/g, '');
  if (digitos.length === 0) return entrada.trim();
  return `•••• ${digitos.slice(-4).padStart(4, '0')}`;
}

/** Slug único (minúsculas, guiones, sin tildes) a partir del nombre: `sebastian-cardenas`. */
export function slugDe(nombres: string, apellidos: string, existentes: ReadonlySet<string>): string {
  const limpio = (t: string) =>
    t
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  const n = limpio(nombres);
  const a = limpio(apellidos);
  const candidatos = [[n[0], a[0]], [n[0], n[1], a[0]], [n[0], a[0], a[1]]].map((p) => p.filter(Boolean).join('-')).filter((s) => s.length > 0);
  const reservados = new Set<string>(SLUGS_RESERVADOS);
  const libre = (s: string) => !existentes.has(s) && !reservados.has(s);
  for (const c of candidatos) if (libre(c)) return c;
  const base = candidatos[0] ?? 'empleado';
  for (let i = 2; i < 100; i++) if (libre(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${existentes.size + 1}`;
}

// ---------------------------------------------------------------------------------------------------------
// Formulario de contrato
// ---------------------------------------------------------------------------------------------------------
export interface BorradorContrato {
  tipo: TipoVinculacion;
  modalidadLaboral: 'indefinido' | 'fijo' | 'obra_labor';
  inicio: FechaISO | null;
  fin: FechaISO | null;
  salarioBase: number | null;
  honorarios: number | null;
  jornadaSemanalHoras: number | null;
  riesgoArl: 1 | 2 | 3 | 4 | 5;
  esquemaComisionId: Id | null;
  periodicidadPago: 'quincenal' | 'mensual';
  /** Fracción (0,1 = 10 %); null = el parámetro. */
  retencionFuente: number | null;
}

export type CampoContrato = 'inicio' | 'fin' | 'salarioBase' | 'honorarios' | 'jornadaSemanalHoras' | 'retencionFuente';

/** Mismas reglas del dominio (`validarContrato`): salario mínimo, jornada máxima y fechas. */
export function validarContrato(
  b: BorradorContrato,
  p: Pick<ParametrosNomina, 'smmlv' | 'jornadaMaximaSemanal'>,
  minimoInicio: FechaISO | null,
  hoy: FechaISO,
): Partial<Record<CampoContrato, string>> {
  const e: Partial<Record<CampoContrato, string>> = {};
  if (!b.inicio) e.inicio = 'Elige la fecha de inicio.';
  else if (minimoInicio && b.inicio < minimoInicio) e.inicio = 'El contrato empieza en la fecha de ingreso o después.';
  if (b.fin && b.inicio && b.fin < b.inicio) e.fin = 'La fecha final no puede ser anterior al inicio.';
  if (b.tipo === 'laboral') {
    if (b.salarioBase === null || !Number.isFinite(b.salarioBase)) e.salarioBase = 'Escribe el salario mensual.';
    else if (b.salarioBase < p.smmlv) e.salarioBase = 'El salario no puede ser menor que el salario mínimo.';
  } else if (b.honorarios === null || b.honorarios <= 0) e.honorarios = 'Escribe los honorarios mensuales.';
  const max = jornadaMaximaVigente(p, b.inicio ?? hoy);
  if (b.jornadaSemanalHoras === null || b.jornadaSemanalHoras <= 0) e.jornadaSemanalHoras = 'Escribe las horas de la semana.';
  else if (b.jornadaSemanalHoras > max) e.jornadaSemanalHoras = `La jornada no puede pasar de ${numero(max)} horas semanales.`;
  if (b.retencionFuente !== null && (b.retencionFuente < 0 || b.retencionFuente > 1)) e.retencionFuente = 'La retención va entre 0 % y 100 %.';
  return e;
}

// ---------------------------------------------------------------------------------------------------------
// Retiro
// ---------------------------------------------------------------------------------------------------------
export type CampoRetiro = 'fecha' | 'motivo';

export function validarRetiro(b: { fecha: FechaISO | null; motivo: string }, ingreso: FechaISO): Partial<Record<CampoRetiro, string>> {
  const e: Partial<Record<CampoRetiro, string>> = {};
  if (!b.fecha) e.fecha = 'Elige la fecha del retiro.';
  else if (b.fecha < ingreso) e.fecha = 'El retiro no puede ser antes del ingreso.';
  if (!b.motivo.trim()) e.motivo = 'Escribe el motivo del retiro.';
  return e;
}

// ---------------------------------------------------------------------------------------------------------
// Aprobación y pago de nómina
// ---------------------------------------------------------------------------------------------------------
export type CampoPago = 'fecha' | 'cuentaId';

export function validarPagoNomina(b: { fecha: FechaISO | null; cuentaId: Id | null }): Partial<Record<CampoPago, string>> {
  const e: Partial<Record<CampoPago, string>> = {};
  if (!b.fecha) e.fecha = 'Elige la fecha del pago.';
  if (!b.cuentaId) e.cuentaId = 'Elige de qué cuenta sale la plata.';
  return e;
}

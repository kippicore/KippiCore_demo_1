import type { COP, FechaISO, GastoRecurrente, Id, MesISO } from '@/dominio/tipos';
import { diasDelMes, sumarMesesAMes } from '@/dominio/reglas/fechas';
import type { EstadoResultados } from '@/selectores';

/**
 * Cálculos PROPIOS de la pantalla de Costos y gastos (B4): lo que arma la explicación en lenguaje sencillo, los pasos
 * del gráfico de cascada, el análisis del punto de equilibrio y el estado de un gasto recurrente en un mes.
 * Las reglas de negocio (utilidades, gastos fijos, margen) vienen de los selectores del dominio; aquí solo se
 * componen, se redactan y se ordenan. Puro: sin React, sin estado.
 */

// ---------------------------------------------------------------------------------------------------------
// Frases: texto con cifras que la interfaz pinta con <Dinero> y <Cifra>
// ---------------------------------------------------------------------------------------------------------
export type Segmento = string | { dinero: number } | { enfasis: string } | { dinero: number; enfasis: true };
export type Frase = readonly Segmento[];

/** "36 de cada 100": cuántos de cada 100 vendidos quedan (entero, sin signo de moneda). */
export function porCada100(fraccion: number): number {
  return Math.round(fraccion * 100);
}

// ---------------------------------------------------------------------------------------------------------
// Estado de resultados
// ---------------------------------------------------------------------------------------------------------
export interface PasoCascadaB4 {
  etiqueta: string;
  valor: COP;
  total?: boolean;
}

/** Pasos de la cascada: ventas → costo de la mercancía → utilidad bruta → gastos → utilidad operativa. */
export function pasosCascada(er: EstadoResultados, esTodos: boolean): PasoCascadaB4[] {
  const pasos: PasoCascadaB4[] = [
    { etiqueta: 'Ventas sin IVA', valor: er.ventasNetas, total: true },
    { etiqueta: 'Costo de la mercancía', valor: -er.costoVentas },
    { etiqueta: 'Queda después de vender', valor: er.utilidadBruta, total: true },
    { etiqueta: esTodos ? 'Gastos del negocio' : 'Gastos del local', valor: -er.gastosOperativos },
  ];
  if (er.gastosGeneralesProrrateados > 0)
    pasos.push({ etiqueta: 'Gastos generales repartidos', valor: -er.gastosGeneralesProrrateados });
  pasos.push({ etiqueta: 'Queda al final', valor: er.utilidadOperativa, total: true });
  return pasos;
}

/** Cuánto cambió la utilidad frente al mes anterior (sobre el valor absoluto del anterior); null si no hay base. */
export function variacionUtilidad(actual: COP, anterior: COP): number | null {
  if (anterior === 0) return null;
  return (actual - anterior) / Math.abs(anterior);
}

/**
 * La historia del mes en cuatro frases sencillas: lo que vendiste, lo que costó la mercancía, lo que pagaste de
 * gastos y lo que te quedó. `sujeto` es "el local" o "el negocio" para no repetir el nombre.
 */
export function explicarResultados(er: EstadoResultados, opciones: { sujeto: 'local' | 'negocio'; nombre?: string }): Frase[] {
  const de = opciones.sujeto === 'local' ? (opciones.nombre ? `en ${opciones.nombre}` : 'en el local') : 'en el negocio';
  if (er.ventasNetas <= 0 && er.gastosOperativos <= 0) return [[`Todavía no hay ventas ni gastos ${de} en este mes.`]];
  const frases: Frase[] = [];
  frases.push(['Vendiste ', { dinero: er.ventasNetas, enfasis: true }, ' sin contar el IVA, que no es tuyo: es de la DIAN.']);
  if (er.ventasNetas > 0) {
    const bruto = porCada100(er.margenBruto);
    frases.push([
      'La mercancía que vendiste te costó ',
      { dinero: er.costoVentas },
      '. Por eso, apenas vendes, ya te quedan ',
      { dinero: er.utilidadBruta, enfasis: true },
      bruto >= 0 ? `: ${bruto} de cada 100 que vendiste.` : `: pierdes ${Math.abs(bruto)} de cada 100 solo con la mercancía.`,
    ]);
  }
  const gastos = er.gastosOperativos + er.gastosGeneralesProrrateados;
  frases.push(
    er.gastosGeneralesProrrateados > 0
      ? [
          'De ahí salen arriendo, nómina, servicios y demás: ',
          { dinero: er.gastosOperativos },
          ' propios del local y ',
          { dinero: er.gastosGeneralesProrrateados },
          ' que le tocan de los gastos generales y de la bodega.',
        ]
      : ['De ahí salen arriendo, nómina, servicios y demás: ', { dinero: gastos }, '.'],
  );
  const op = porCada100(er.margenOperativo);
  if (er.utilidadOperativa >= 0)
    frases.push([
      'Al final del mes te quedan ',
      { dinero: er.utilidadOperativa, enfasis: true },
      er.ventasNetas > 0 ? `: ${op} de cada 100 que vendiste.` : '.',
    ]);
  else
    frases.push([
      'Al final del mes pierdes ',
      { dinero: Math.abs(er.utilidadOperativa), enfasis: true },
      ': los gastos fueron más grandes que lo que dejó vender.',
    ]);
  return frases;
}

export interface FilaLocalResultado {
  id: Id;
  nombre: string;
  er: EstadoResultados;
}

export interface ComparacionLocales {
  mejor: FilaLocalResultado | null;
  peor: FilaLocalResultado | null;
  enPerdida: FilaLocalResultado[];
  frase: Frase;
}

/** Ordena los locales por lo que le dejaron al dueño y redacta quién fue el mejor, el peor y quién perdió. */
export function compararLocales(filas: readonly FilaLocalResultado[]): ComparacionLocales {
  const conVentas = filas.filter((f) => f.er.ventasNetas > 0);
  if (conVentas.length === 0) return { mejor: null, peor: null, enPerdida: [], frase: ['Todavía no hay ventas en este mes para comparar los locales.'] };
  const orden = [...conVentas].sort((a, b) => b.er.utilidadOperativa - a.er.utilidadOperativa);
  const mejor = orden[0] ?? null;
  const peor = orden.length > 1 ? (orden[orden.length - 1] ?? null) : null;
  const enPerdida = orden.filter((f) => f.er.utilidadOperativa < 0);
  if (!mejor) return { mejor: null, peor: null, enPerdida: [], frase: [] };
  const frase: Segmento[] = [
    { enfasis: mejor.nombre },
    mejor.er.utilidadOperativa >= 0 ? ' es el local que más plata te deja: ' : ' perdió menos que los demás: ',
    { dinero: mejor.er.utilidadOperativa, enfasis: true },
    `, ${porCada100(mejor.er.margenOperativo)} de cada 100 que vendió.`,
  ];
  if (peor && peor.id !== mejor.id) {
    frase.push(' ', { enfasis: peor.nombre }, peor.er.utilidadOperativa >= 0 ? ' es el que menos te deja: ' : ' cerró en pérdida: ', { dinero: peor.er.utilidadOperativa });
    frase.push('.');
  }
  return { mejor, peor, enPerdida, frase };
}

// ---------------------------------------------------------------------------------------------------------
// Punto de equilibrio
// ---------------------------------------------------------------------------------------------------------
export interface BasePuntoEquilibrio {
  gastosFijos: COP;
  margenBruto: number;
  ventasEquilibrio: COP | null;
  ventasNetasMes: COP;
}

/** Suma al local la parte de los gastos generales que le toca y recalcula cuánto debe vender (mismo método del dominio). */
export function conGeneralesRepartidos(p: BasePuntoEquilibrio, repartido: COP): BasePuntoEquilibrio {
  if (repartido <= 0) return p;
  const gastosFijos = p.gastosFijos + repartido;
  return { ...p, gastosFijos, ventasEquilibrio: p.margenBruto > 0 ? Math.round(gastosFijos / p.margenBruto) : null };
}

export type SituacionEquilibrio = 'sin_margen' | 'sin_ventas' | 'por_debajo' | 'por_encima';

export interface AnalisisEquilibrio {
  situacion: SituacionEquilibrio;
  /** Lo que debe vender cada día del mes para no perder. */
  ventasPorDia: COP | null;
  /** Cuántas veces cubre las ventas el mínimo (1,0 = justo en el punto). */
  cobertura: number | null;
  /** Cuánto podrían caer las ventas sin perder: (ventas − mínimo) / ventas. Negativo si ya está por debajo. */
  colchon: number | null;
  /** Lo que le falta vender para llegar al mínimo (0 si ya lo superó). */
  falta: COP;
  /** Lo que vendió por encima del mínimo (0 si no lo ha alcanzado). */
  excedente: COP;
}

export function analizarEquilibrio(p: BasePuntoEquilibrio, diasMes: number): AnalisisEquilibrio {
  if (p.ventasEquilibrio === null)
    return { situacion: 'sin_margen', ventasPorDia: null, cobertura: null, colchon: null, falta: 0, excedente: 0 };
  const minimo = p.ventasEquilibrio;
  const ventasPorDia = diasMes > 0 ? Math.round(minimo / diasMes) : null;
  if (p.ventasNetasMes <= 0)
    return { situacion: 'sin_ventas', ventasPorDia, cobertura: 0, colchon: null, falta: minimo, excedente: 0 };
  const cobertura = minimo > 0 ? p.ventasNetasMes / minimo : null;
  return {
    situacion: p.ventasNetasMes >= minimo ? 'por_encima' : 'por_debajo',
    ventasPorDia,
    cobertura,
    colchon: (p.ventasNetasMes - minimo) / p.ventasNetasMes,
    falta: Math.max(0, minimo - p.ventasNetasMes),
    excedente: Math.max(0, p.ventasNetasMes - minimo),
  };
}

/** Lo que habría que vender cada día que le queda al mes para llegar al mínimo; null si ya no quedan días. */
export function ritmoNecesario(falta: COP, diasRestantes: number): COP | null {
  if (falta <= 0 || diasRestantes <= 0) return null;
  return Math.ceil(falta / diasRestantes);
}

/** El primer día del mes en que las ventas acumuladas (sin IVA) alcanzaron el punto de equilibrio, o null. */
export function diaDeEquilibrio(baseDiaria: readonly { fecha: FechaISO; base: COP }[], ventasEquilibrio: COP | null): FechaISO | null {
  if (ventasEquilibrio === null || ventasEquilibrio <= 0) return null;
  let acumulado = 0;
  for (const d of baseDiaria) {
    acumulado += d.base;
    if (acumulado >= ventasEquilibrio) return d.fecha;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------
// Meses
// ---------------------------------------------------------------------------------------------------------
/** Los últimos `cantidad` meses hasta el mes de `hoy`, del más reciente al más antiguo. */
export function mesesHasta(hoy: FechaISO, cantidad: number): MesISO[] {
  const actual = hoy.slice(0, 7);
  return Array.from({ length: cantidad }, (_, i) => sumarMesesAMes(actual, -i));
}

/** Meses desde `adelante` meses después de `hoy` hasta `atras` meses antes, del más futuro al más antiguo. */
export function mesesAlrededor(hoy: FechaISO, atras: number, adelante: number): MesISO[] {
  const actual = hoy.slice(0, 7);
  return Array.from({ length: atras + adelante + 1 }, (_, i) => sumarMesesAMes(actual, adelante - i));
}

/** `?mes=` válido y no futuro; si no, el mes de `hoy`. */
export function mesEfectivo(param: string | null, hoy: FechaISO): MesISO {
  const actual = hoy.slice(0, 7);
  return param && /^\d{4}-\d{2}$/.test(param) && param <= actual ? param : actual;
}

export function rangoDeMes(mes: MesISO): { desde: FechaISO; hasta: FechaISO } {
  return { desde: `${mes}-01`, hasta: `${mes}-${String(diasDelMes(mes)).padStart(2, '0')}` };
}

// ---------------------------------------------------------------------------------------------------------
// Gastos recurrentes
// ---------------------------------------------------------------------------------------------------------
export type EstadoRecurrenteMes = 'generado' | 'por_generar' | 'proximo' | 'pausado' | 'fuera_de_vigencia';

/** Fecha en que le toca causarse en ese mes (el día va de 1 a 28; nunca se sale del mes). */
export function fechaPrevista(r: Pick<GastoRecurrente, 'diaDelMes'>, mes: MesISO): FechaISO {
  const dia = Math.min(r.diaDelMes, diasDelMes(mes));
  return `${mes}-${String(dia).padStart(2, '0')}`;
}

/**
 * Qué pasa con un recurrente en un mes, con las mismas reglas con las que "Generar este mes" decide (el dominio no
 * causa gastos de meses sin llegar ni repite uno ya generado).
 */
export function estadoRecurrenteEnMes(
  r: Pick<GastoRecurrente, 'activo' | 'desde' | 'hasta' | 'diaDelMes'>,
  mes: MesISO,
  hoy: FechaISO,
  generado: boolean,
  localCerrado = false,
): EstadoRecurrenteMes {
  if (!r.activo) return 'pausado';
  if (localCerrado || mes < r.desde || (r.hasta !== null && mes > r.hasta)) return 'fuera_de_vigencia';
  if (generado) return 'generado';
  return fechaPrevista(r, mes) > hoy ? 'proximo' : 'por_generar';
}

// ---------------------------------------------------------------------------------------------------------
// Formularios
// ---------------------------------------------------------------------------------------------------------
export type CampoGasto = 'fecha' | 'concepto' | 'categoria' | 'valor' | 'iva' | 'cuentaId' | 'vence';

export interface BorradorGasto {
  fecha: FechaISO | null;
  concepto: string;
  categoria: string | null;
  valor: COP | null;
  iva: COP | null;
  /** Al registrar: ya se pagó o queda por pagar. Al editar no aplica. */
  pago: 'ya' | 'debo' | null;
  cuentaId: string | null;
  vence: FechaISO | null;
}

/** Valida el formulario de gasto con las mismas reglas del dominio (al perder el foco y al enviar). */
export function validarBorradorGasto(b: BorradorGasto, edicion: boolean): Partial<Record<CampoGasto, string>> {
  const e: Partial<Record<CampoGasto, string>> = {};
  if (!b.fecha) e.fecha = 'Elige la fecha del gasto.';
  if (!b.concepto.trim()) e.concepto = 'Escribe el concepto del gasto.';
  if (!b.categoria) e.categoria = 'Elige la categoría del gasto.';
  if (b.valor === null || b.valor <= 0) e.valor = 'El valor del gasto debe ser mayor que cero.';
  if (b.iva !== null && b.iva < 0) e.iva = 'El IVA no puede ser negativo.';
  else if (b.iva !== null && b.valor !== null && b.iva > b.valor) e.iva = 'El IVA no puede ser mayor que el valor.';
  if (!edicion) {
    if (b.pago === 'ya' && !b.cuentaId) e.cuentaId = 'Elige de dónde sale la plata.';
    if (b.pago === 'debo') {
      if (!b.vence) e.vence = 'Elige hasta cuándo tienes para pagarlo.';
      else if (b.fecha && b.vence < b.fecha) e.vence = 'El vencimiento no puede ser antes del gasto.';
    }
  }
  return e;
}

export type CampoRecurrente = 'nombre' | 'categoria' | 'valor' | 'iva' | 'diaDelMes' | 'desde' | 'hasta' | 'cuentaId' | 'diasPlazo';

export interface BorradorRecurrente {
  nombre: string;
  categoria: string | null;
  valor: COP | null;
  iva: COP | null;
  diaDelMes: number | null;
  desde: MesISO | null;
  hasta: MesISO | null;
  formaPago: 'cuenta_por_pagar' | 'debito_automatico';
  cuentaId: string | null;
  diasPlazo: number | null;
}

export function validarBorradorRecurrente(b: BorradorRecurrente): Partial<Record<CampoRecurrente, string>> {
  const e: Partial<Record<CampoRecurrente, string>> = {};
  if (!b.nombre.trim()) e.nombre = 'Escribe el nombre del gasto.';
  if (!b.categoria) e.categoria = 'Elige la categoría.';
  if (b.valor === null || b.valor <= 0) e.valor = 'El valor debe ser mayor que cero.';
  if (b.iva !== null && b.iva < 0) e.iva = 'El IVA no puede ser negativo.';
  else if (b.iva !== null && b.valor !== null && b.iva > b.valor) e.iva = 'El IVA no puede ser mayor que el valor.';
  if (b.diaDelMes === null || !Number.isInteger(b.diaDelMes) || b.diaDelMes < 1 || b.diaDelMes > 28) e.diaDelMes = 'El día del mes va de 1 a 28.';
  if (!b.desde) e.desde = 'Elige el mes en que empieza.';
  if (b.desde && b.hasta && b.hasta < b.desde) e.hasta = 'El mes final no puede ser antes del inicial.';
  if (b.formaPago === 'debito_automatico' && !b.cuentaId) e.cuentaId = 'Elige la cuenta del débito.';
  if (b.formaPago === 'cuenta_por_pagar' && (b.diasPlazo === null || b.diasPlazo < 0)) e.diasPlazo = 'El plazo no puede ser negativo.';
  return e;
}

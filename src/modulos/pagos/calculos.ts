import type { CategoriaCxP, COP, FechaISO, MesISO } from '@/dominio/tipos';
import type { MovimientoFlujo, PuntoFlujo } from '@/dominio/reglas/flujo';
import { diaSemana, diferenciaDias, lunesDe, sumarDias, sumarMesesAMes } from '@/dominio/reglas/fechas';
import { DIAS_CORTOS, MESES_CORTOS } from '@/lib/formato';

/**
 * Cálculos PROPIOS de la pantalla de Pagos (B3). Puros: sin React ni estado. Las reglas de negocio (flujo,
 * datáfono, saldos) siguen en `dominio/reglas`; aquí solo se agrupa, se ordena y se redacta lo que se muestra.
 */

// ---------------------------------------------------------------------------------------------------------
// Semanas
// ---------------------------------------------------------------------------------------------------------
export interface SemanaFlujo {
  /** Lunes de la semana. */
  lunes: FechaISO;
  /** Domingo de la semana. */
  domingo: FechaISO;
  ingresos: COP;
  egresos: COP;
  /** Saldo al cierre del último día proyectado de la semana. */
  saldoCierre: COP;
  /** Saldo más bajo de la semana. */
  saldoMinimo: COP;
  /** La semana donde cae el punto más bajo de la ventana. */
  esPuntoBajo: boolean;
  /** Semana que no tiene los siete días dentro de la ventana (la primera y la última). */
  parcial: boolean;
}

/** Agrupa la serie diaria del flujo por semana (lunes a domingo). */
export function semanasDeFlujo(serie: readonly PuntoFlujo[], fechaPuntoBajo: FechaISO): SemanaFlujo[] {
  const semanas = new Map<FechaISO, SemanaFlujo & { dias: number }>();
  for (const p of serie) {
    const lunes = lunesDe(p.fecha);
    let s = semanas.get(lunes);
    if (!s) {
      s = {
        lunes,
        domingo: sumarDias(lunes, 6),
        ingresos: 0,
        egresos: 0,
        saldoCierre: p.saldo,
        saldoMinimo: p.saldo,
        esPuntoBajo: false,
        parcial: false,
        dias: 0,
      };
      semanas.set(lunes, s);
    }
    s.ingresos += p.ingresos;
    s.egresos += p.egresos;
    s.saldoCierre = p.saldo;
    s.saldoMinimo = Math.min(s.saldoMinimo, p.saldo);
    s.dias += 1;
  }
  const lunesBajo = lunesDe(fechaPuntoBajo);
  return [...semanas.values()].map(({ dias, ...s }) => ({ ...s, esPuntoBajo: s.lunes === lunesBajo, parcial: dias < 7 }));
}

/** "12 – 18 oct" · "28 sep – 4 oct". */
export function textoSemana(lunes: FechaISO): string {
  const domingo = sumarDias(lunes, 6);
  const dia = (f: FechaISO) => Number(f.slice(8, 10));
  const mes = (f: FechaISO) => MESES_CORTOS[Number(f.slice(5, 7)) - 1] ?? '';
  const mismoMes = lunes.slice(5, 7) === domingo.slice(5, 7);
  return mismoMes ? `${dia(lunes)} – ${dia(domingo)} ${mes(domingo)}` : `${dia(lunes)} ${mes(lunes)} – ${dia(domingo)} ${mes(domingo)}`;
}

/** "mié 14 oct". */
export function diaCorto(f: FechaISO): string {
  return `${DIAS_CORTOS[diaSemana(f)] ?? ''} ${Number(f.slice(8, 10))} ${MESES_CORTOS[Number(f.slice(5, 7)) - 1] ?? ''}`;
}

/** "14 oct" (ejes de los gráficos). */
export function diaMesCorto(f: FechaISO): string {
  return `${Number(f.slice(8, 10))} ${MESES_CORTOS[Number(f.slice(5, 7)) - 1] ?? ''}`;
}

/** "12 de octubre" (para frases). */
export function diaYMes(f: FechaISO): string {
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${Number(f.slice(8, 10))} de ${meses[Number(f.slice(5, 7)) - 1] ?? ''}`;
}

// ---------------------------------------------------------------------------------------------------------
// Movimientos del flujo
// ---------------------------------------------------------------------------------------------------------
/** El flujo carga lo vencido (fecha ≤ hoy) en el día siguiente: esa es la fecha en la que de verdad cuenta. */
export function fechaEfectiva(m: Pick<MovimientoFlujo, 'fecha'>, hoy: FechaISO): FechaISO {
  return m.fecha <= hoy ? sumarDias(hoy, 1) : m.fecha;
}

export type ClaseMovimiento =
  /** Cuenta por pagar real: se puede reprogramar. */
  | 'cxp'
  /** Pago de una importación que todavía no tiene cuenta por pagar: se registra al reprogramarlo. */
  | 'importacion'
  /** Nómina, seguridad social, prima, impuestos y gastos recurrentes: fechas fijas. */
  | 'fija'
  | 'ingreso';

const CATEGORIA_IMPORTACION: readonly { prefijo: string; categoria: CategoriaCxP; tercero: string }[] = [
  { prefijo: 'Tributos aduaneros', categoria: 'tributos_aduaneros', tercero: 'Tributos aduaneros' },
  { prefijo: 'Flete internacional', categoria: 'agente_carga', tercero: 'Agente de carga' },
  { prefijo: 'Agente de aduanas', categoria: 'agente_aduanas', tercero: 'Agente de aduanas' },
  { prefijo: 'Transporte a Bogotá', categoria: 'transporte', tercero: 'Transportador a Bogotá' },
];

/** Categoría y tercero con los que se registra el pago estimado de una importación (al reprogramarlo). */
export function categoriaDeImportacion(concepto: string): { categoria: CategoriaCxP; tercero: string } | null {
  const c = CATEGORIA_IMPORTACION.find((x) => concepto.startsWith(x.prefijo));
  return c ? { categoria: c.categoria, tercero: c.tercero } : null;
}

export function clasificarMovimiento(m: MovimientoFlujo, esCxp: (id: string) => boolean, esImportacion: (id: string) => boolean): ClaseMovimiento {
  if (m.valor >= 0) return 'ingreso';
  if (m.tipo === 'cuenta_por_pagar' && m.refId) {
    if (esCxp(m.refId)) return 'cxp';
    if (esImportacion(m.refId) && categoriaDeImportacion(m.concepto)) return 'importacion';
  }
  return 'fija';
}

/** Movimientos que caen en la semana (por su fecha efectiva), primero lo que sale y de mayor a menor. */
export function movimientosDeSemana<M extends MovimientoFlujo>(movs: readonly M[], lunes: FechaISO, hoy: FechaISO, dias: number): M[] {
  const domingo = sumarDias(lunes, 6);
  const hasta = sumarDias(hoy, dias);
  return movs
    .filter((m) => {
      const f = fechaEfectiva(m, hoy);
      return f >= lunes && f <= domingo && f <= hasta;
    })
    .sort((a, b) => {
      const ea = a.valor < 0 ? 0 : 1;
      const eb = b.valor < 0 ? 0 : 1;
      if (ea !== eb) return ea - eb;
      return a.valor - b.valor;
    });
}

// ---------------------------------------------------------------------------------------------------------
// Serie real (hacia atrás) y filas del gráfico
// ---------------------------------------------------------------------------------------------------------
export interface PuntoSaldo {
  fecha: FechaISO;
  saldo: COP;
}

/**
 * Saldo de cada día desde `hoy − dias` hasta `hoy`, reconstruido hacia atrás desde el saldo de hoy: el de un día
 * es el de hoy menos todo lo que se movió después de ese día. Hoy queda exactamente en `saldoHoy`.
 */
export function saldoRealDiario(e: { saldoHoy: COP; hoy: FechaISO; dias: number; movimientos: readonly { fecha: FechaISO; valor: COP }[] }): PuntoSaldo[] {
  const desde = sumarDias(e.hoy, -e.dias);
  const porDia = new Map<FechaISO, number>();
  for (const m of e.movimientos) {
    if (m.fecha <= desde || m.fecha > e.hoy) continue;
    porDia.set(m.fecha, (porDia.get(m.fecha) ?? 0) + m.valor);
  }
  const puntos: PuntoSaldo[] = [];
  let saldo = e.saldoHoy;
  for (let i = 0; i <= e.dias; i++) {
    const fecha = sumarDias(e.hoy, -i);
    puntos.push({ fecha, saldo });
    saldo -= porDia.get(fecha) ?? 0;
  }
  return puntos.reverse();
}

export interface FilaGraficoFlujo {
  fecha: FechaISO;
  real: number | null;
  proyectado: number | null;
  [clave: string]: string | number | null;
}

/** Real continuo hasta hoy; proyectado desde hoy (mismo punto, así la línea no se corta) en adelante. */
export function filasGraficoFlujo(real: readonly PuntoSaldo[], proyectada: readonly PuntoFlujo[], hoy: FechaISO): FilaGraficoFlujo[] {
  const filas: FilaGraficoFlujo[] = real.map((p) => ({ fecha: p.fecha, real: p.saldo, proyectado: p.fecha === hoy ? p.saldo : null }));
  for (const p of proyectada) filas.push({ fecha: p.fecha, real: null, proyectado: p.saldo });
  return filas;
}

export interface ResumenVentana {
  entra: COP;
  sale: COP;
  saldoFinal: COP;
  saldoMinimo: COP;
}

export function resumenVentana(serie: readonly PuntoFlujo[], saldoInicial: COP): ResumenVentana {
  let entra = 0;
  let sale = 0;
  let saldoMinimo = saldoInicial;
  for (const p of serie) {
    entra += p.ingresos;
    sale += p.egresos;
    saldoMinimo = Math.min(saldoMinimo, p.saldo);
  }
  return { entra, sale, saldoFinal: serie.length ? (serie[serie.length - 1]?.saldo ?? saldoInicial) : saldoInicial, saldoMinimo };
}

// ---------------------------------------------------------------------------------------------------------
// Datáfono
// ---------------------------------------------------------------------------------------------------------
export interface PasoDatafono {
  etiqueta: string;
  valor: COP;
  total?: boolean;
}

/** De lo vendido con tarjeta a lo consignado: la comisión, cada retención y lo que aún no se abona. */
export function pasosDatafono(c: {
  vendido: COP;
  abonado: { comision: COP; retenciones: { fuente: COP; iva: COP; ica: COP }; neto: COP };
  pendientePorAbonar: COP;
}): PasoDatafono[] {
  const pasos: PasoDatafono[] = [{ etiqueta: 'Vendido con tarjeta', valor: c.vendido, total: true }];
  const descuentos: [string, COP][] = [
    ['Comisión del datáfono', c.abonado.comision],
    ['Retención en la fuente', c.abonado.retenciones.fuente],
    ['Retención de IVA', c.abonado.retenciones.iva],
    ['Retención de ICA', c.abonado.retenciones.ica],
    ['Aún sin abonar', c.pendientePorAbonar],
  ];
  for (const [etiqueta, valor] of descuentos) if (valor > 0) pasos.push({ etiqueta, valor: -valor });
  pasos.push({ etiqueta: 'Te consignaron', valor: c.abonado.neto, total: true });
  return pasos;
}

/** Retenciones totales de un abono o de un mes. */
export function totalRetenciones(r: { fuente: COP; iva: COP; ica: COP }): COP {
  return r.fuente + r.iva + r.ica;
}

/** Comisión efectiva sobre lo cobrado (fracción), o null si no hubo cobros. */
export function comisionEfectiva(comision: COP, bruto: COP): number | null {
  return bruto > 0 ? comision / bruto : null;
}

/** Los últimos `n` meses terminando en `mes` (el más antiguo primero). */
export function mesesHasta(mes: MesISO, n: number): MesISO[] {
  return Array.from({ length: n }, (_, i) => sumarMesesAMes(mes, i - (n - 1)));
}

// ---------------------------------------------------------------------------------------------------------
// Por pagar
// ---------------------------------------------------------------------------------------------------------
/** Lunes de la semana en la que cae una fecha (para `?semana=`). */
export function lunesDeSemana(f: FechaISO): FechaISO {
  return lunesDe(f);
}

/** ¿Cae `fecha` en la semana que empieza el `lunes`? */
export function estaEnSemana(fecha: FechaISO, lunes: FechaISO): boolean {
  const d = diferenciaDias(lunes, fecha);
  return d >= 0 && d <= 6;
}

/** Valor sugerido para un pago: todo el saldo, o la mitad (redondeada a mil) para un abono. */
export function mitadRedondeada(saldo: number, paso = 1000): number {
  if (saldo <= paso) return saldo;
  return Math.max(paso, Math.round(saldo / 2 / paso) * paso);
}

// ---------------------------------------------------------------------------------------------------------
// Conciliación
// ---------------------------------------------------------------------------------------------------------
export interface PendienteBasico {
  cuentaId: string;
  ts: string;
  valor: COP;
  descripcion: string;
}

export interface FiltroConciliacion {
  cuentaId: string | null;
  desde: FechaISO | null;
  hasta: FechaISO | null;
  texto: string;
}

export function filtrarPendientes<P extends PendienteBasico>(pendientes: readonly P[], f: FiltroConciliacion): P[] {
  const q = f.texto.trim().toLowerCase();
  return pendientes.filter((p) => {
    if (f.cuentaId && p.cuentaId !== f.cuentaId) return false;
    const dia = p.ts.slice(0, 10);
    if (f.desde && dia < f.desde) return false;
    if (f.hasta && dia > f.hasta) return false;
    if (q && !p.descripcion.toLowerCase().includes(q)) return false;
    return true;
  });
}

/** Cuenta y suma lo pendiente por cuenta. */
export function pendientesPorCuenta<P extends PendienteBasico>(pendientes: readonly P[]): Map<string, { n: number; entra: COP; sale: COP }> {
  const r = new Map<string, { n: number; entra: COP; sale: COP }>();
  for (const p of pendientes) {
    const x = r.get(p.cuentaId) ?? { n: 0, entra: 0, sale: 0 };
    x.n += 1;
    if (p.valor >= 0) x.entra += p.valor;
    else x.sale += -p.valor;
    r.set(p.cuentaId, x);
  }
  return r;
}

// ---------------------------------------------------------------------------------------------------------
// Mensaje de cobro
// ---------------------------------------------------------------------------------------------------------
export function saludoDeLaHora(hora: number): 'manana' | 'tarde' | 'noche' {
  return hora < 12 ? 'manana' : hora < 19 ? 'tarde' : 'noche';
}

/**
 * Vista por defecto del flujo (W5): la más corta (30, 60 o 90 días) que incluye el punto más bajo de los próximos
 * 90 días, para que se vea en una escala donde se distingue.
 */
export function vistaPorDefecto(hoy: FechaISO, puntoBajo: FechaISO): '30' | '60' | '90' {
  const n = diferenciaDias(hoy, puntoBajo);
  return n <= 30 ? '30' : n <= 60 ? '60' : '90';
}

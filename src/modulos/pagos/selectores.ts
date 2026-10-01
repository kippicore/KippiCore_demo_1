import type { CategoriaCxP, COP, CuentaPorCobrar, FechaISO, Id, MesISO, Moneda } from '@/dominio/tipos';
import { calcularAbonoDatafono } from '@/dominio/reglas/datafono';
import { conjuntoFestivos } from '@/dominio/reglas/festivos';
import { siguienteDiaHabil, sumarDias } from '@/dominio/reglas/fechas';
import { saldoCxP } from '@/dominio/reglas/cuentas';
import type { MovimientoFlujo } from '@/dominio/reglas/flujo';
import {
  crearSelector,
  selConciliacionDatafono,
  selCuentasPorCobrar,
  selCuentasPorPagar,
  selFlujoProyectado,
  selLocalesQueVenden,
  selSaldosCuentas,
  type FlujoProyectado,
} from '@/selectores';
import {
  categoriaDeImportacion,
  clasificarMovimiento,
  fechaEfectiva,
  filasGraficoFlujo,
  mesesHasta,
  resumenVentana,
  saldoRealDiario,
  semanasDeFlujo,
  type ClaseMovimiento,
  type FilaGraficoFlujo,
  type PuntoSaldo,
  type ResumenVentana,
  type SemanaFlujo,
} from './calculos';

/**
 * Selectores locales de Pagos (B3): componen los compartidos (`selFlujoProyectado`, `selConciliacionDatafono`,
 * `selCuentasPorPagar`…) sin repetir ninguna regla de negocio. Cada uno declara TODAS las tablas que lee.
 */

// ---------------------------------------------------------------------------------------------------------
// Saldo real de los últimos días (la parte continua de la línea del flujo)
// ---------------------------------------------------------------------------------------------------------
export const selSaldoReal = crearSelector<{ hoy: FechaISO; dias: number }, PuntoSaldo[]>(
  'pagos.selSaldoReal',
  ['cuentas', 'movimientosCuenta', 'ventas', 'agregados'],
  (e, { hoy, dias }) => {
    const vigentes = new Set<Id>();
    let saldoHoy = 0;
    for (const c of Object.values(e.cuentas)) {
      if (c.eliminadoEn) continue;
      vigentes.add(c.id);
      saldoHoy += e.agregados.saldosCuentas[c.id] ?? 0;
    }
    const desde = sumarDias(hoy, -dias);
    const movimientos: { fecha: FechaISO; valor: COP }[] = [];
    for (const m of Object.values(e.movimientosCuenta)) {
      const fecha = m.ts.slice(0, 10);
      if (fecha > desde && vigentes.has(m.cuentaId)) movimientos.push({ fecha, valor: m.valor });
    }
    for (const v of Object.values(e.ventas))
      for (const p of v.pagos) {
        const fecha = p.ts.slice(0, 10);
        if (fecha > desde && p.cuentaId && vigentes.has(p.cuentaId)) movimientos.push({ fecha, valor: p.valor });
      }
    return saldoRealDiario({ saldoHoy, hoy, dias, movimientos });
  },
);

// ---------------------------------------------------------------------------------------------------------
// Flujo de caja con todo lo que la pantalla necesita (W5)
// ---------------------------------------------------------------------------------------------------------
export interface MovimientoVista extends MovimientoFlujo {
  /** Día en el que de verdad cuenta (lo vencido se carga mañana). */
  fechaEfectiva: FechaISO;
  clase: ClaseMovimiento;
  cxp: { id: Id; numero: string; moneda: Moneda; fechaVencimiento: FechaISO; programadaPara: FechaISO | null; saldoOrigen: number } | null;
  importacion: { id: Id; numero: string; categoria: CategoriaCxP; tercero: string } | null;
}

export interface FlujoDetalle {
  flujo: FlujoProyectado;
  semanas: SemanaFlujo[];
  movimientos: MovimientoVista[];
  real: PuntoSaldo[];
  filas: FilaGraficoFlujo[];
  resumen: ResumenVentana;
  semanaBajo: SemanaFlujo | null;
}

const TABLAS_FLUJO = [
  'cuentas',
  'agregados',
  'ventas',
  'cuentasPorPagar',
  'gastosRecurrentes',
  'gastos',
  'liquidaciones',
  'empleados',
  'contratos',
  'importaciones',
  'tasas',
  'parametros',
  'locales',
  'devoluciones',
  'movimientosCuenta',
  'proveedores',
] as const;

export const selFlujoDetalle = crearSelector<{ dias: number; hoy: FechaISO; hora: string }, FlujoDetalle>(
  'pagos.selFlujoDetalle',
  TABLAS_FLUJO,
  (e, { dias, hoy, hora }) => {
    const flujo = selFlujoProyectado(e, { dias, hoy, hora });
    const hasta = sumarDias(hoy, dias);
    const movimientos: MovimientoVista[] = [];
    for (const m of flujo.movimientos) {
      const fe = fechaEfectiva(m, hoy);
      if (fe > hasta) continue;
      const cxpReal = m.refId ? e.cuentasPorPagar[m.refId] : undefined;
      const imp = m.refId ? e.importaciones[m.refId] : undefined;
      const clase = clasificarMovimiento(m, () => !!cxpReal && !cxpReal.eliminadoEn, () => !!imp);
      const cat = imp ? categoriaDeImportacion(m.concepto) : null;
      movimientos.push({
        ...m,
        fechaEfectiva: fe,
        clase,
        cxp:
          clase === 'cxp' && cxpReal
            ? {
                id: cxpReal.id,
                numero: cxpReal.numero,
                moneda: cxpReal.moneda,
                fechaVencimiento: cxpReal.fechaVencimiento,
                programadaPara: cxpReal.programadaPara,
                saldoOrigen: saldoCxP(cxpReal),
              }
            : null,
        importacion: clase === 'importacion' && imp && cat ? { id: imp.id, numero: imp.numero, categoria: cat.categoria, tercero: `${cat.tercero} · ${imp.numero}` } : null,
      });
    }
    const real = selSaldoReal(e, { hoy, dias: 30 });
    const semanas = semanasDeFlujo(flujo.serie, flujo.puntoBajo.fecha);
    return {
      flujo,
      semanas,
      movimientos,
      real,
      filas: filasGraficoFlujo(real, flujo.serie, hoy),
      resumen: resumenVentana(flujo.serie, flujo.saldoInicial),
      semanaBajo: semanas.find((s) => s.esPuntoBajo) ?? null,
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Resumen "Lo que debo y me deben", por local
// ---------------------------------------------------------------------------------------------------------
export interface ResumenLocalPagos {
  /** null = el negocio en general (banco, billeteras e importaciones). */
  localId: Id | null;
  nombre: string;
  orden: number;
  disponible: COP;
  porCobrar: COP;
  nPorCobrar: number;
  porPagar: COP;
  vencido: COP;
  nPorPagar: number;
  tarjetaMes: COP;
  consignadoMes: COP;
  comisionMes: COP;
}

export interface ResumenPagos {
  filas: ResumenLocalPagos[];
  total: Omit<ResumenLocalPagos, 'localId' | 'nombre' | 'orden'>;
  separadosPorVencer: number;
  nVencidosPorCobrar: number;
  pendientesPorPagarGenerales: number;
}

export const selResumenPagos = crearSelector<{ hoy: FechaISO }, ResumenPagos>(
  'pagos.selResumenPagos',
  ['locales', 'cuentas', 'agregados', 'ventas', 'devoluciones', 'cuentasPorPagar', 'tasas', 'abonosDatafono', 'parametros'],
  (e, { hoy }) => {
    const mes = hoy.slice(0, 7);
    const saldos = selSaldosCuentas(e);
    const cobrar = selCuentasPorCobrar(e, { hoy });
    const pagar = selCuentasPorPagar(e, { hoy, estado: 'pendientes' });
    const locales = selLocalesQueVenden(e);
    const mk = (localId: Id | null, nombre: string, orden: number): ResumenLocalPagos => {
      const disponible = saldos.cuentas.filter((s) => s.cuenta.localId === localId && s.cuenta.tipo !== 'puente').reduce((a, s) => a + s.saldo, 0);
      const porCobrarFilas = cobrar.filas.filter((f) => f.localId === localId);
      const porPagarFilas = pagar.filas.filter((f) => f.cxp.localId === localId);
      const dat = localId ? selConciliacionDatafono(e, { mes, localId }) : null;
      return {
        localId,
        nombre,
        orden,
        disponible,
        porCobrar: porCobrarFilas.reduce((a, f) => a + f.saldo, 0),
        nPorCobrar: porCobrarFilas.length,
        porPagar: porPagarFilas.reduce((a, f) => a + f.saldoCop, 0),
        vencido: porPagarFilas.filter((f) => f.estado === 'vencido').reduce((a, f) => a + f.saldoCop, 0),
        nPorPagar: porPagarFilas.length,
        tarjetaMes: dat?.vendido ?? 0,
        consignadoMes: dat?.abonado.neto ?? 0,
        comisionMes: dat?.abonado.comision ?? 0,
      };
    };
    const filas = [...locales.map((l) => mk(l.id, l.nombre, l.orden)), mk(null, 'Banco, billeteras y generales', 99)];
    const puente = saldos.cuentas.filter((s) => s.cuenta.tipo === 'puente').reduce((a, s) => a + s.saldo, 0);
    // El dinero "por abonar" del datáfono sigue siendo tuyo: se suma a lo disponible del negocio en general.
    const general = filas[filas.length - 1];
    if (general) general.disponible += puente;
    const total = filas.reduce(
      (t, f) => ({
        disponible: t.disponible + f.disponible,
        porCobrar: t.porCobrar + f.porCobrar,
        nPorCobrar: t.nPorCobrar + f.nPorCobrar,
        porPagar: t.porPagar + f.porPagar,
        vencido: t.vencido + f.vencido,
        nPorPagar: t.nPorPagar + f.nPorPagar,
        tarjetaMes: t.tarjetaMes + f.tarjetaMes,
        consignadoMes: t.consignadoMes + f.consignadoMes,
        comisionMes: t.comisionMes + f.comisionMes,
      }),
      { disponible: 0, porCobrar: 0, nPorCobrar: 0, porPagar: 0, vencido: 0, nPorPagar: 0, tarjetaMes: 0, consignadoMes: 0, comisionMes: 0 },
    );
    return {
      filas,
      total,
      separadosPorVencer: selCuentasPorCobrar(e, { hoy, filtro: 'separados-por-vencer' }).filas.length,
      nVencidosPorCobrar: selCuentasPorCobrar(e, { hoy, filtro: 'vencidos' }).filas.length,
      pendientesPorPagarGenerales: pagar.filas.filter((f) => f.cxp.localId === null).length,
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Datáfono: meses y abonos pendientes
// ---------------------------------------------------------------------------------------------------------
export interface MesDatafono {
  mes: MesISO;
  vendido: COP;
  consignado: COP;
  comision: COP;
  retenciones: COP;
  pendiente: COP;
  /** Lo cobrado con tarjeta que ya se abonó (bruto). */
  abonadoBruto: COP;
}

export const selDatafonoMeses = crearSelector<{ mes: MesISO; localId: Id | 'todos'; n: number }, MesDatafono[]>(
  'pagos.selDatafonoMeses',
  ['agregados', 'abonosDatafono', 'parametros'],
  (e, { mes, localId, n }) =>
    mesesHasta(mes, n).map((m) => {
      const c = selConciliacionDatafono(e, { mes: m, localId });
      return {
        mes: m,
        vendido: c.vendido,
        consignado: c.abonado.neto,
        comision: c.abonado.comision,
        retenciones: c.abonado.retenciones.fuente + c.abonado.retenciones.iva + c.abonado.retenciones.ica,
        pendiente: c.pendientePorAbonar,
        abonadoBruto: c.abonado.bruto,
      };
    }),
);

export interface AbonoPendiente {
  clave: string;
  localId: Id;
  /** Día de las ventas con tarjeta. */
  ventasDe: FechaISO;
  debito: COP;
  credito: COP;
  bruto: COP;
  /** Día hábil siguiente: cuando debería llegar el abono. */
  llegaEl: FechaISO;
  /** Ya debería haber llegado. */
  vencido: boolean;
  estimado: { comision: COP; retenciones: COP; neto: COP };
}

export const selAbonosPendientes = crearSelector<{ hoy: FechaISO; mes: MesISO; localId: Id | 'todos' }, AbonoPendiente[]>(
  'pagos.selAbonosPendientes',
  ['agregados', 'parametros'],
  (e, { hoy, mes, localId }) => {
    const anio = Number(hoy.slice(0, 4));
    const festivos = conjuntoFestivos([anio - 1, anio, anio + 1]);
    const r: AbonoPendiente[] = [];
    for (const [clave, x] of Object.entries(e.agregados.datafonoDia)) {
      if (e.agregados.abonosDatafonoDia[clave]) continue;
      const [l, f] = clave.split('@') as [Id, FechaISO];
      if (!f.startsWith(mes) || (localId !== 'todos' && l !== localId)) continue;
      if (x.debito + x.credito <= 0) continue;
      const calc = calcularAbonoDatafono(x, e.parametros.datafono, e.parametros.impuestos.ivaGeneral);
      const llegaEl = siguienteDiaHabil(f, festivos);
      r.push({
        clave,
        localId: l,
        ventasDe: f,
        debito: x.debito,
        credito: x.credito,
        bruto: calc.bruto,
        llegaEl,
        vencido: llegaEl <= hoy,
        estimado: { comision: calc.comision, retenciones: calc.retenciones.fuente + calc.retenciones.iva + calc.retenciones.ica, neto: calc.neto },
      });
    }
    return r.sort((a, b) => (a.ventasDe < b.ventasDe ? 1 : a.ventasDe > b.ventasDe ? -1 : a.localId < b.localId ? -1 : 1));
  },
);

// ---------------------------------------------------------------------------------------------------------
// Plata que me deben, con el cliente de cada saldo
// ---------------------------------------------------------------------------------------------------------
export interface FilaCobro extends CuentaPorCobrar {
  cliente: { id: Id; nombre: string; celular: string; tratamiento: 'tu' | 'usted'; correo: string | null } | null;
  localNombre: string;
}

export interface CobrosVista {
  filas: FilaCobro[];
  saldo: COP;
  /** Del total sin filtro (para la franja de cifras). */
  resumen: { saldo: COP; porVencer: COP; vencido: COP; nSeparados: number; nCredito: number; nPorVencer: number; nVencidos: number };
}

export const selCobros = crearSelector<{ hoy: FechaISO; filtro?: 'separados-por-vencer' | 'vencidos' | 'credito'; localId?: Id | 'todos' }, CobrosVista>(
  'pagos.selCobros',
  ['ventas', 'devoluciones', 'clientes', 'locales'],
  (e, { hoy, filtro, localId }) => {
    const todos = selCuentasPorCobrar(e, { hoy, localId });
    const lista = filtro ? selCuentasPorCobrar(e, { hoy, localId, filtro }) : todos;
    const resumen = { saldo: todos.saldo, porVencer: 0, vencido: 0, nSeparados: 0, nCredito: 0, nPorVencer: 0, nVencidos: 0 };
    for (const f of todos.filas) {
      if (f.tipo === 'separado') resumen.nSeparados += 1;
      else resumen.nCredito += 1;
      if (f.estado === 'por_vencer') {
        resumen.porVencer += f.saldo;
        resumen.nPorVencer += 1;
      }
      if (f.estado === 'vencido') {
        resumen.vencido += f.saldo;
        resumen.nVencidos += 1;
      }
    }
    const filas = lista.filas.map((f) => {
      const c = f.clienteId ? e.clientes[f.clienteId] : undefined;
      return {
        ...f,
        cliente: c ? { id: c.id, nombre: `${c.nombres} ${c.apellidos}`, celular: c.celular, tratamiento: c.tratamiento, correo: c.correo } : null,
        localNombre: e.locales[f.localId]?.nombre ?? f.localId,
      };
    });
    return { filas, saldo: lista.saldo, resumen };
  },
);

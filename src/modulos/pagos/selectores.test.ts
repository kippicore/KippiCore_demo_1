import { activarVerificacionDeTablas, selConciliacionDatafono, selCuentasPorCobrar, selCuentasPorPagar, selFlujoProyectado, selSaldosCuentas } from '@/selectores';
import { AHORA, estadoDe, HOY } from '@/selectores/pruebas/construir';
import { pasosDatafono } from './calculos';
import { selAbonosPendientes, selDatafonoMeses, selFlujoDetalle, selResumenPagos, selSaldoReal } from './selectores';

const e = estadoDe();
const HORA = AHORA.slice(11, 16);

beforeAll(() => activarVerificacionDeTablas(true));
afterAll(() => activarVerificacionDeTablas(false));

describe('selSaldoReal', () => {
  const real = selSaldoReal(e, { hoy: HOY, dias: 30 });
  it('trae 31 días y termina en el saldo de hoy de todas las cuentas', () => {
    expect(real).toHaveLength(31);
    expect(real.at(-1)?.fecha).toBe(HOY);
    expect(real.at(-1)?.saldo).toBe(selSaldosCuentas(e).total);
  });
  it('es continua: ningún día salta a cero ni a negativo', () => {
    expect(real.every((p) => p.saldo > 0)).toBe(true);
  });
});

describe('selFlujoDetalle (W5)', () => {
  const d90 = selFlujoDetalle(e, { dias: 90, hoy: HOY, hora: HORA });
  it('usa el mismo flujo que calibra el generador: el punto bajo es el del selector compartido', () => {
    const base = selFlujoProyectado(e, { dias: 90, hoy: HOY, hora: HORA });
    expect(d90.flujo.puntoBajo).toEqual(base.puntoBajo);
    expect(d90.flujo.explicacion).toBe(base.explicacion);
    expect(d90.flujo.puntoBajo.saldo).toBeGreaterThan(0);
  });
  it('las semanas cuadran con la serie: entra − sale = cambio de saldo', () => {
    const entra = d90.semanas.reduce((a, s) => a + s.ingresos, 0);
    const sale = d90.semanas.reduce((a, s) => a + s.egresos, 0);
    expect(d90.flujo.saldoInicial + entra - sale).toBe(d90.resumen.saldoFinal);
    expect(d90.resumen.entra).toBe(entra);
    expect(d90.resumen.sale).toBe(sale);
  });
  it('la semana del punto bajo contiene la fecha del punto bajo', () => {
    const s = d90.semanaBajo;
    expect(s).not.toBeNull();
    expect(d90.flujo.puntoBajo.fecha >= (s?.lunes ?? '')).toBe(true);
    expect(d90.flujo.puntoBajo.fecha <= (s?.domingo ?? '')).toBe(true);
  });
  it('las filas del gráfico empalman lo real con lo proyectado en hoy', () => {
    const hoyFila = d90.filas.find((f) => f.fecha === HOY);
    expect(hoyFila?.real).toBe(hoyFila?.proyectado);
    expect(d90.filas.at(-1)?.real).toBeNull();
    expect(d90.filas[0]?.proyectado).toBeNull();
  });
  it('los 30 días terminan antes o igual que los 90 y comparten el principio de la serie', () => {
    const d30 = selFlujoDetalle(e, { dias: 30, hoy: HOY, hora: HORA });
    expect(d30.flujo.serie).toHaveLength(30);
    expect(d30.flujo.serie[0]).toEqual(d90.flujo.serie[0]);
    expect(d30.resumen.sale).toBeLessThanOrEqual(d90.resumen.sale);
  });
  it('las cuentas por pagar reales se pueden reprogramar y traen su número', () => {
    const cxp = d90.movimientos.filter((m) => m.clase === 'cxp');
    expect(cxp.length).toBeGreaterThan(0);
    expect(cxp.every((m) => m.cxp && /^CP-\d+$/.test(m.cxp.numero))).toBe(true);
  });
  it('los pagos de importaciones sin cuenta por pagar se ofrecen con su categoría', () => {
    const imp = d90.movimientos.filter((m) => m.clase === 'importacion');
    for (const m of imp) {
      expect(m.importacion?.categoria).toBeTruthy();
      expect(m.valor).toBeLessThan(0);
    }
  });
});

describe('selResumenPagos', () => {
  const r = selResumenPagos(e, { hoy: HOY });
  it('el total por cobrar y por pagar es el de los selectores compartidos', () => {
    expect(r.total.porCobrar).toBe(selCuentasPorCobrar(e, { hoy: HOY }).saldo);
    expect(r.total.porPagar).toBe(selCuentasPorPagar(e, { hoy: HOY, estado: 'pendientes' }).totalCop);
    expect(r.total.vencido).toBe(selCuentasPorPagar(e, { hoy: HOY, estado: 'pendientes' }).vencidoCop);
  });
  it('lo disponible suma todas las cuentas, incluido el datáfono por abonar', () => {
    expect(r.total.disponible).toBe(selSaldosCuentas(e).total);
  });
  it('trae los tres locales y el negocio en general', () => {
    expect(r.filas.map((f) => f.nombre).slice(0, 3)).toEqual(['Parque 93', 'Usaquén', 'Zona Rosa']);
    expect(r.filas.at(-1)?.localId).toBeNull();
  });
  it('lo vendido con tarjeta del mes suma el de los tres locales', () => {
    expect(r.total.tarjetaMes).toBe(selConciliacionDatafono(e, { mes: HOY.slice(0, 7), localId: 'todos' }).vendido);
  });
});

describe('datáfono por mes y abonos pendientes', () => {
  const meses = selDatafonoMeses(e, { mes: HOY.slice(0, 7), localId: 'todos', n: 6 });
  it('trae 6 meses y el último es el mes de la conciliación', () => {
    expect(meses).toHaveLength(6);
    const c = selConciliacionDatafono(e, { mes: HOY.slice(0, 7), localId: 'todos' });
    expect(meses.at(-1)).toMatchObject({ mes: HOY.slice(0, 7), vendido: c.vendido, consignado: c.abonado.neto });
  });
  it('en cada mes vendido = consignado + comisión + retenciones + pendiente', () => {
    for (const m of meses) expect(m.vendido).toBe(m.consignado + m.comision + m.retenciones + m.pendiente);
  });
  it('la cascada del mes cuadra de lo vendido a lo consignado', () => {
    const c = selConciliacionDatafono(e, { mes: HOY.slice(0, 7), localId: 'todos' });
    const pasos = pasosDatafono(c);
    expect(pasos.reduce((a, p) => (p.total ? p.valor : a + p.valor), 0)).toBe(c.abonado.neto);
  });
  it('lo pendiente por abonar por día suma lo pendiente del mes', () => {
    const c = selConciliacionDatafono(e, { mes: HOY.slice(0, 7), localId: 'todos' });
    const pendientes = selAbonosPendientes(e, { hoy: HOY, mes: HOY.slice(0, 7), localId: 'todos' });
    expect(pendientes.reduce((a, p) => a + p.bruto, 0)).toBe(c.pendientePorAbonar);
    expect(pendientes.every((p) => p.llegaEl > p.ventasDe)).toBe(true);
  });
});

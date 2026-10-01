import type { PuntoFlujo, MovimientoFlujo } from '@/dominio/reglas/flujo';
import {
  categoriaDeImportacion,
  clasificarMovimiento,
  comisionEfectiva,
  fechaEfectiva,
  filasGraficoFlujo,
  filtrarPendientes,
  mesesHasta,
  mitadRedondeada,
  movimientosDeSemana,
  pasosDatafono,
  pendientesPorCuenta,
  resumenVentana,
  saldoRealDiario,
  semanasDeFlujo,
  textoSemana,
  vistaPorDefecto,
} from './calculos';

const punto = (fecha: string, ingresos: number, egresos: number, saldo: number): PuntoFlujo => ({ fecha, ingresos, egresos, saldo });
const mov = (fecha: string, valor: number, concepto = 'x', tipo: MovimientoFlujo['tipo'] = 'recurrente', refId: string | null = null): MovimientoFlujo => ({ fecha, valor, concepto, tipo, refId });

describe('semanasDeFlujo', () => {
  // 2026-10-01 es jueves: la primera semana es parcial (jue a dom) y la última también.
  const serie = [
    punto('2026-10-01', 10, 0, 110),
    punto('2026-10-02', 0, 50, 60),
    punto('2026-10-03', 5, 0, 65),
    punto('2026-10-04', 0, 0, 65),
    punto('2026-10-05', 0, 40, 25),
    punto('2026-10-06', 30, 0, 55),
  ];
  const semanas = semanasDeFlujo(serie, '2026-10-05');
  it('agrupa por semana de lunes a domingo y suma lo que entra y lo que sale', () => {
    expect(semanas).toHaveLength(2);
    expect(semanas[0]).toMatchObject({ lunes: '2026-09-28', domingo: '2026-10-04', ingresos: 15, egresos: 50, saldoCierre: 65, saldoMinimo: 60, parcial: true });
    expect(semanas[1]).toMatchObject({ lunes: '2026-10-05', ingresos: 30, egresos: 40, saldoCierre: 55, saldoMinimo: 25, parcial: true });
  });
  it('marca la semana del punto más bajo', () => {
    expect(semanas.map((s) => s.esPuntoBajo)).toEqual([false, true]);
  });
  it('lo que entra menos lo que sale cuadra con el cambio de saldo', () => {
    const entra = semanas.reduce((a, s) => a + s.ingresos, 0);
    const sale = semanas.reduce((a, s) => a + s.egresos, 0);
    expect(100 + entra - sale).toBe(semanas[1]?.saldoCierre); // saldo inicial 100
  });
});

describe('textos de fecha', () => {
  it('escribe la semana en el mismo mes y entre meses', () => {
    expect(textoSemana('2026-10-12')).toBe('12 – 18 oct');
    expect(textoSemana('2026-09-28')).toBe('28 sep – 4 oct');
  });
});

describe('movimientosDeSemana', () => {
  const hoy = '2026-09-30';
  const movs = [
    mov('2026-09-25', -100, 'Vencido'), // vencido: cuenta mañana (1 de octubre)
    mov('2026-10-14', -50, 'Pequeño'),
    mov('2026-10-14', -500, 'Grande'),
    mov('2026-10-14', 300, 'Entra', 'ventas'),
    mov('2026-10-20', -10, 'Otra semana'),
  ];
  it('carga lo vencido en el día siguiente a hoy', () => {
    expect(fechaEfectiva(movs[0]!, hoy)).toBe('2026-10-01');
    expect(movimientosDeSemana(movs, '2026-09-28', hoy, 90).map((m) => m.concepto)).toEqual(['Vencido']);
  });
  it('ordena primero lo que sale, de mayor a menor, y deja fuera otras semanas', () => {
    expect(movimientosDeSemana(movs, '2026-10-12', hoy, 90).map((m) => m.concepto)).toEqual(['Grande', 'Pequeño', 'Entra']);
  });
  it('no incluye lo que queda más allá de la ventana', () => {
    expect(movimientosDeSemana(movs, '2026-10-19', hoy, 14)).toEqual([]);
  });
});

describe('clasificarMovimiento', () => {
  const esCxp = (id: string) => id === 'cp_1';
  const esImp = (id: string) => id === 'im_1';
  it('distingue cuenta por pagar real, pago de importación estimado y obligación fija', () => {
    expect(clasificarMovimiento(mov('2026-10-14', -5, 'Saldo', 'cuenta_por_pagar', 'cp_1'), esCxp, esImp)).toBe('cxp');
    expect(clasificarMovimiento(mov('2026-10-12', -5, 'Tributos aduaneros IMP-2026-08', 'cuenta_por_pagar', 'im_1'), esCxp, esImp)).toBe('importacion');
    expect(clasificarMovimiento(mov('2026-10-15', -5, 'Nómina · 1.ª quincena', 'nomina_neto'), esCxp, esImp)).toBe('fija');
    expect(clasificarMovimiento(mov('2026-10-15', 5, 'Ventas', 'ventas'), esCxp, esImp)).toBe('ingreso');
  });
  it('traduce el concepto de una importación a la categoría de su cuenta por pagar', () => {
    expect(categoriaDeImportacion('Tributos aduaneros IMP-2026-08')?.categoria).toBe('tributos_aduaneros');
    expect(categoriaDeImportacion('Flete internacional IMP-2026-08')?.categoria).toBe('agente_carga');
    expect(categoriaDeImportacion('Agente de aduanas y bodegaje IMP-2026-08')?.categoria).toBe('agente_aduanas');
    expect(categoriaDeImportacion('Transporte a Bogotá IMP-2026-08')?.categoria).toBe('transporte');
    expect(categoriaDeImportacion('Otra cosa')).toBeNull();
  });
});

describe('saldoRealDiario', () => {
  const movimientos = [
    { fecha: '2026-09-30', valor: 100 },
    { fecha: '2026-09-29', valor: -40 },
    { fecha: '2026-09-27', valor: 10 },
    { fecha: '2026-09-20', valor: 999 }, // fuera de la ventana
  ];
  const real = saldoRealDiario({ saldoHoy: 1000, hoy: '2026-09-30', dias: 5, movimientos });
  it('termina exactamente en el saldo de hoy y trae dias + 1 puntos', () => {
    expect(real).toHaveLength(6);
    expect(real.at(-1)).toEqual({ fecha: '2026-09-30', saldo: 1000 });
    expect(real[0]?.fecha).toBe('2026-09-25');
  });
  it('reconstruye hacia atrás restando lo que se movió después de cada día', () => {
    const porFecha = Object.fromEntries(real.map((p) => [p.fecha, p.saldo]));
    expect(porFecha['2026-09-29']).toBe(900); // hoy entraron 100
    expect(porFecha['2026-09-28']).toBe(940); // el 29 salieron 40
    expect(porFecha['2026-09-27']).toBe(940);
    expect(porFecha['2026-09-26']).toBe(930); // el 27 entraron 10
  });
});

describe('filasGraficoFlujo y resumenVentana', () => {
  const real = [
    { fecha: '2026-09-29', saldo: 90 },
    { fecha: '2026-09-30', saldo: 100 },
  ];
  const proy = [punto('2026-10-01', 10, 30, 80), punto('2026-10-02', 0, 20, 60)];
  it('el real es continuo hasta hoy y el proyectado arranca en hoy, sin cortar la línea', () => {
    const filas = filasGraficoFlujo(real, proy, '2026-09-30');
    expect(filas.map((f) => [f.real, f.proyectado])).toEqual([
      [90, null],
      [100, 100],
      [null, 80],
      [null, 60],
    ]);
  });
  it('resume lo que entra, lo que sale, el saldo final y el más bajo', () => {
    expect(resumenVentana(proy, 100)).toEqual({ entra: 10, sale: 50, saldoFinal: 60, saldoMinimo: 60 });
  });
});

describe('datáfono', () => {
  const c = {
    vendido: 1000,
    abonado: { comision: 25, retenciones: { fuente: 8, iva: 4, ica: 3 }, neto: 940 },
    pendientePorAbonar: 20,
  };
  it('la cascada parte de lo vendido y termina en lo consignado, y los pasos cuadran', () => {
    const pasos = pasosDatafono(c);
    expect(pasos[0]).toMatchObject({ etiqueta: 'Vendido con tarjeta', valor: 1000, total: true });
    expect(pasos.at(-1)).toMatchObject({ etiqueta: 'Te consignaron', valor: 940, total: true });
    const medio = pasos.slice(1, -1).reduce((a, p) => a + p.valor, 0);
    expect(1000 + medio).toBe(940);
  });
  it('omite los descuentos en cero', () => {
    const pasos = pasosDatafono({ ...c, pendientePorAbonar: 0 });
    expect(pasos.map((p) => p.etiqueta)).not.toContain('Aún sin abonar');
  });
  it('la comisión efectiva es la fracción de lo cobrado', () => {
    expect(comisionEfectiva(25, 1000)).toBe(0.025);
    expect(comisionEfectiva(0, 0)).toBeNull();
  });
  it('los últimos meses terminan en el mes pedido', () => {
    expect(mesesHasta('2026-09', 3)).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(mesesHasta('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });
});

describe('pagos parciales y conciliación', () => {
  it('la mitad de un saldo se redondea a mil y nunca excede el saldo', () => {
    expect(mitadRedondeada(1_469_874)).toBe(735_000);
    expect(mitadRedondeada(900)).toBe(900);
  });
  const pendientes = [
    { cuentaId: 'a', ts: '2026-09-30T10:00:00', valor: 100, descripcion: 'Venta V-001' },
    { cuentaId: 'a', ts: '2026-09-20T10:00:00', valor: -30, descripcion: 'Gasto luz' },
    { cuentaId: 'b', ts: '2026-09-29T10:00:00', valor: 50, descripcion: 'Venta V-002' },
  ];
  it('filtra por cuenta, fechas y texto', () => {
    expect(filtrarPendientes(pendientes, { cuentaId: 'a', desde: null, hasta: null, texto: '' })).toHaveLength(2);
    expect(filtrarPendientes(pendientes, { cuentaId: null, desde: '2026-09-25', hasta: '2026-09-30', texto: '' })).toHaveLength(2);
    expect(filtrarPendientes(pendientes, { cuentaId: null, desde: null, hasta: null, texto: 'v-002' })).toHaveLength(1);
  });
  it('cuenta y suma lo pendiente por cuenta', () => {
    const r = pendientesPorCuenta(pendientes);
    expect(r.get('a')).toEqual({ n: 2, entra: 100, sale: 30 });
    expect(r.get('b')).toEqual({ n: 1, entra: 50, sale: 0 });
  });
});

describe('vistaPorDefecto', () => {
  it('elige la vista más corta que contiene el punto bajo de los 90 días', () => {
    expect(vistaPorDefecto('2026-09-30', '2026-10-15')).toBe('30');
    expect(vistaPorDefecto('2026-09-30', '2026-10-30')).toBe('30');
    expect(vistaPorDefecto('2026-09-30', '2026-10-31')).toBe('60');
    expect(vistaPorDefecto('2027-06-14', '2027-08-15')).toBe('90');
    expect(vistaPorDefecto('2027-01-20', '2027-01-20')).toBe('30');
  });
});

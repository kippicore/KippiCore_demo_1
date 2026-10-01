import { describe, expect, it } from 'vitest';
import type { EstadoResultados } from '@/selectores';
import {
  analizarEquilibrio,
  compararLocales,
  conGeneralesRepartidos,
  diaDeEquilibrio,
  estadoRecurrenteEnMes,
  explicarResultados,
  fechaPrevista,
  mesEfectivo,
  mesesAlrededor,
  mesesHasta,
  pasosCascada,
  porCada100,
  rangoDeMes,
  ritmoNecesario,
  validarBorradorGasto,
  validarBorradorRecurrente,
  variacionUtilidad,
  type Frase,
} from './calculos';

function er(ventas: number, costo: number, gastos: number, prorrateo = 0): EstadoResultados {
  const bruta = ventas - costo;
  const op = bruta - gastos - prorrateo;
  return {
    ventasNetas: ventas,
    costoVentas: costo,
    utilidadBruta: bruta,
    margenBruto: ventas ? bruta / ventas : 0,
    gastosOperativos: gastos,
    gastosGeneralesProrrateados: prorrateo,
    utilidadOperativa: op,
    margenOperativo: ventas ? op / ventas : 0,
    gastosPorCategoria: {},
  };
}

const texto = (f: Frase) => f.map((s) => (typeof s === 'string' ? s : 'dinero' in s ? `[${s.dinero}]` : s.enfasis)).join('');

describe('estado de resultados: cascada y explicación', () => {
  it('los pasos de la cascada cuadran: ventas − costo = bruta, bruta − gastos = al final', () => {
    const e = er(1_000_000, 380_000, 250_000);
    const pasos = pasosCascada(e, false);
    expect(pasos.map((p) => p.etiqueta)).toEqual(['Ventas sin IVA', 'Costo de la mercancía', 'Queda después de vender', 'Gastos del local', 'Queda al final']);
    expect(pasos[0]!.valor + pasos[1]!.valor).toBe(pasos[2]!.valor);
    expect(pasos[2]!.valor + pasos[3]!.valor).toBe(pasos[4]!.valor);
    expect(pasos.filter((p) => p.total).map((p) => p.valor)).toEqual([1_000_000, 620_000, 370_000]);
  });

  it('agrega los gastos generales repartidos y nombra "del negocio" cuando se ve todo', () => {
    const e = er(1_000_000, 400_000, 200_000, 50_000);
    const pasos = pasosCascada(e, true);
    expect(pasos.map((p) => p.etiqueta)).toContain('Gastos generales repartidos');
    expect(pasos.find((p) => p.etiqueta === 'Gastos del negocio')?.valor).toBe(-200_000);
    const suma = pasos.filter((p) => !p.total).reduce((a, p) => a + p.valor, 0);
    expect(suma + e.ventasNetas).toBe(e.utilidadOperativa);
  });

  it('porCada100 redondea a entero', () => {
    expect(porCada100(0.3601)).toBe(36);
    expect(porCada100(0.625)).toBe(63);
    expect(porCada100(-0.054)).toBe(-5);
  });

  it('explica en cuatro frases con los números del mes', () => {
    const frases = explicarResultados(er(322_000_000, 123_000_000, 83_000_000), { sujeto: 'negocio' }).map(texto);
    expect(frases).toHaveLength(4);
    expect(frases[0]).toContain('[322000000]');
    expect(frases[0]).toContain('sin contar el IVA');
    expect(frases[1]).toContain('[123000000]');
    expect(frases[1]).toContain('62 de cada 100');
    expect(frases[2]).toContain('[83000000]');
    expect(frases[3]).toContain('[116000000]');
    expect(frases[3]).toContain('36 de cada 100');
  });

  it('cuando hay pérdida lo dice con otras palabras y en positivo', () => {
    const frases = explicarResultados(er(10_000_000, 4_000_000, 9_000_000), { sujeto: 'local', nombre: 'Usaquén' }).map(texto);
    expect(frases.at(-1)).toContain('pierdes');
    expect(frases.at(-1)).toContain('[3000000]');
  });

  it('con gastos generales repartidos separa los propios de los generales', () => {
    const frases = explicarResultados(er(10_000_000, 4_000_000, 2_000_000, 500_000), { sujeto: 'local' }).map(texto);
    expect(frases[2]).toContain('[2000000]');
    expect(frases[2]).toContain('[500000]');
  });

  it('un mes sin ventas ni gastos no inventa cifras', () => {
    const frases = explicarResultados(er(0, 0, 0), { sujeto: 'local', nombre: 'Zona Rosa' }).map(texto);
    expect(frases).toEqual(['Todavía no hay ventas ni gastos en Zona Rosa en este mes.']);
  });

  it('variacionUtilidad usa el valor absoluto del mes anterior', () => {
    expect(variacionUtilidad(120, 100)).toBeCloseTo(0.2);
    expect(variacionUtilidad(-50, -100)).toBeCloseTo(0.5);
    expect(variacionUtilidad(10, 0)).toBeNull();
  });
});

describe('comparación de locales', () => {
  const filas = [
    { id: 'p93', nombre: 'Parque 93', er: er(129_000_000, 50_000_000, 28_000_000) },
    { id: 'usq', nombre: 'Usaquén', er: er(58_000_000, 22_000_000, 40_000_000) },
    { id: 'zr', nombre: 'Zona Rosa', er: er(133_000_000, 50_000_000, 22_000_000) },
  ];

  it('elige el mejor y el peor por lo que le dejan al dueño', () => {
    const c = compararLocales(filas);
    expect(c.mejor?.id).toBe('zr');
    expect(c.peor?.id).toBe('usq');
    expect(c.enPerdida.map((x) => x.id)).toEqual(['usq']);
    const t = texto(c.frase);
    expect(t).toContain('Zona Rosa es el local que más plata te deja');
    expect(t).toContain('Usaquén cerró en pérdida');
  });

  it('con un solo local con ventas no inventa un "peor"', () => {
    const c = compararLocales([filas[0]!, { id: 'zr', nombre: 'Zona Rosa', er: er(0, 0, 0) }]);
    expect(c.mejor?.id).toBe('p93');
    expect(c.peor).toBeNull();
  });

  it('sin ventas en ningún local lo dice', () => {
    const c = compararLocales([{ id: 'p93', nombre: 'Parque 93', er: er(0, 0, 5) }]);
    expect(c.mejor).toBeNull();
    expect(texto(c.frase)).toContain('Todavía no hay ventas');
  });
});

describe('punto de equilibrio', () => {
  const base = { gastosFijos: 26_500_000, margenBruto: 0.614, ventasEquilibrio: 43_160_000, ventasNetasMes: 129_600_000 };

  it('por encima: cobertura, colchón y excedente', () => {
    const a = analizarEquilibrio(base, 30);
    expect(a.situacion).toBe('por_encima');
    expect(a.ventasPorDia).toBe(Math.round(43_160_000 / 30));
    expect(a.cobertura).toBeCloseTo(3.0, 1);
    expect(a.colchon).toBeCloseTo((129_600_000 - 43_160_000) / 129_600_000);
    expect(a.falta).toBe(0);
    expect(a.excedente).toBe(129_600_000 - 43_160_000);
  });

  it('por debajo: dice cuánto le falta', () => {
    const a = analizarEquilibrio({ ...base, ventasNetasMes: 30_000_000 }, 30);
    expect(a.situacion).toBe('por_debajo');
    expect(a.falta).toBe(13_160_000);
    expect(a.colchon).toBeLessThan(0);
  });

  it('sin margen no hay punto de equilibrio y sin ventas todo falta', () => {
    expect(analizarEquilibrio({ ...base, margenBruto: -0.1, ventasEquilibrio: null }, 30).situacion).toBe('sin_margen');
    const s = analizarEquilibrio({ ...base, ventasNetasMes: 0 }, 30);
    expect(s.situacion).toBe('sin_ventas');
    expect(s.falta).toBe(43_160_000);
    expect(s.colchon).toBeNull();
  });

  it('repartir generales suma a los gastos fijos y recalcula con el mismo método (gastos ÷ margen)', () => {
    const r = conGeneralesRepartidos(base, 5_000_000);
    expect(r.gastosFijos).toBe(31_500_000);
    expect(r.ventasEquilibrio).toBe(Math.round(31_500_000 / 0.614));
    expect(conGeneralesRepartidos(base, 0)).toBe(base);
    expect(conGeneralesRepartidos({ ...base, margenBruto: 0, ventasEquilibrio: null }, 1_000).ventasEquilibrio).toBeNull();
  });

  it('el día de equilibrio es el primero en que lo acumulado alcanza el mínimo', () => {
    const dias = [
      { fecha: '2026-09-01', base: 10 },
      { fecha: '2026-09-02', base: 20 },
      { fecha: '2026-09-03', base: 30 },
      { fecha: '2026-09-04', base: 40 },
    ];
    expect(diaDeEquilibrio(dias, 60)).toBe('2026-09-03');
    expect(diaDeEquilibrio(dias, 61)).toBe('2026-09-04');
    expect(diaDeEquilibrio(dias, 101)).toBeNull();
    expect(diaDeEquilibrio(dias, null)).toBeNull();
    expect(diaDeEquilibrio(dias, 0)).toBeNull();
  });

  it('el ritmo necesario redondea hacia arriba y calla cuando ya no quedan días', () => {
    expect(ritmoNecesario(1_000, 3)).toBe(334);
    expect(ritmoNecesario(1_000, 0)).toBeNull();
    expect(ritmoNecesario(0, 5)).toBeNull();
  });
});

describe('meses', () => {
  it('mesesHasta va del mes en curso hacia atrás', () => {
    expect(mesesHasta('2026-09-30', 4)).toEqual(['2026-09', '2026-08', '2026-07', '2026-06']);
    expect(mesesHasta('2026-01-15', 3)).toEqual(['2026-01', '2025-12', '2025-11']);
  });

  it('mesesAlrededor incluye futuros y pasados', () => {
    expect(mesesAlrededor('2026-09-30', 2, 2)).toEqual(['2026-11', '2026-10', '2026-09', '2026-08', '2026-07']);
  });

  it('mesEfectivo rechaza basura y meses futuros', () => {
    expect(mesEfectivo('2026-07', '2026-09-30')).toBe('2026-07');
    expect(mesEfectivo('2027-01', '2026-09-30')).toBe('2026-09');
    expect(mesEfectivo('julio', '2026-09-30')).toBe('2026-09');
    expect(mesEfectivo(null, '2026-09-30')).toBe('2026-09');
  });

  it('rangoDeMes cubre el mes completo, también febrero', () => {
    expect(rangoDeMes('2026-02')).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
    expect(rangoDeMes('2028-02').hasta).toBe('2028-02-29');
    expect(rangoDeMes('2026-09').hasta).toBe('2026-09-30');
  });
});

describe('gastos recurrentes', () => {
  const r = { activo: true, desde: '2026-03', hasta: null, diaDelMes: 15 };

  it('la fecha prevista nunca se sale del mes', () => {
    expect(fechaPrevista({ diaDelMes: 28 }, '2026-02')).toBe('2026-02-28');
    expect(fechaPrevista({ diaDelMes: 5 }, '2026-09')).toBe('2026-09-05');
  });

  it('estado en el mes: generado, por generar, aún no toca, pausado, fuera de vigencia', () => {
    expect(estadoRecurrenteEnMes(r, '2026-09', '2026-09-30', true)).toBe('generado');
    expect(estadoRecurrenteEnMes(r, '2026-09', '2026-09-30', false)).toBe('por_generar');
    expect(estadoRecurrenteEnMes(r, '2026-09', '2026-09-10', false)).toBe('proximo');
    expect(estadoRecurrenteEnMes(r, '2026-09', '2026-09-15', false)).toBe('por_generar');
    expect(estadoRecurrenteEnMes({ ...r, activo: false }, '2026-09', '2026-09-30', false)).toBe('pausado');
    expect(estadoRecurrenteEnMes(r, '2026-02', '2026-09-30', false)).toBe('fuera_de_vigencia');
    expect(estadoRecurrenteEnMes({ ...r, hasta: '2026-06' }, '2026-09', '2026-09-30', false)).toBe('fuera_de_vigencia');
    expect(estadoRecurrenteEnMes(r, '2026-09', '2026-09-30', false, true)).toBe('fuera_de_vigencia');
  });
});

describe('validación de formularios (mismas reglas del dominio)', () => {
  const ok = { fecha: '2026-09-30', concepto: 'Arriendo', categoria: 'arriendo', valor: 100, iva: 0, pago: 'ya' as const, cuentaId: 'cta_corriente', vence: null };

  it('un gasto completo no tiene errores', () => {
    expect(validarBorradorGasto(ok, false)).toEqual({});
  });

  it('marca cada campo faltante con el mensaje del dominio', () => {
    const e = validarBorradorGasto({ ...ok, concepto: '  ', categoria: null, valor: null, cuentaId: null }, false);
    expect(e.concepto).toBe('Escribe el concepto del gasto.');
    expect(e.categoria).toBe('Elige la categoría del gasto.');
    expect(e.valor).toBe('El valor del gasto debe ser mayor que cero.');
    expect(e.cuentaId).toBe('Elige de dónde sale la plata.');
  });

  it('el IVA no puede ser mayor que el valor', () => {
    expect(validarBorradorGasto({ ...ok, valor: 100, iva: 101 }, false).iva).toBe('El IVA no puede ser mayor que el valor.');
    expect(validarBorradorGasto({ ...ok, iva: -1 }, false).iva).toBe('El IVA no puede ser negativo.');
  });

  it('por pagar exige vencimiento, y no antes del gasto; al editar no se exige el pago', () => {
    const d = { ...ok, pago: 'debo' as const, cuentaId: null };
    expect(validarBorradorGasto({ ...d, vence: null }, false).vence).toBe('Elige hasta cuándo tienes para pagarlo.');
    expect(validarBorradorGasto({ ...d, vence: '2026-09-01' }, false).vence).toBe('El vencimiento no puede ser antes del gasto.');
    expect(validarBorradorGasto({ ...d, vence: '2026-10-15' }, false)).toEqual({});
    expect(validarBorradorGasto({ ...d, vence: null }, true)).toEqual({});
  });

  const rec = { nombre: 'Internet', categoria: 'servicios', valor: 714_000, iva: 114_000, diaDelMes: 5, desde: '2026-09', hasta: null, formaPago: 'debito_automatico' as const, cuentaId: 'cta_corriente', diasPlazo: null };

  it('un recurrente completo es válido; el día va de 1 a 28', () => {
    expect(validarBorradorRecurrente(rec)).toEqual({});
    expect(validarBorradorRecurrente({ ...rec, diaDelMes: 29 }).diaDelMes).toBe('El día del mes va de 1 a 28.');
    expect(validarBorradorRecurrente({ ...rec, diaDelMes: 0 }).diaDelMes).toBe('El día del mes va de 1 a 28.');
    expect(validarBorradorRecurrente({ ...rec, diaDelMes: null }).diaDelMes).toBe('El día del mes va de 1 a 28.');
  });

  it('el débito automático exige cuenta y el pago por pagar no admite plazo negativo', () => {
    expect(validarBorradorRecurrente({ ...rec, cuentaId: null }).cuentaId).toBe('Elige la cuenta del débito.');
    expect(validarBorradorRecurrente({ ...rec, formaPago: 'cuenta_por_pagar', cuentaId: null, diasPlazo: -2 }).diasPlazo).toBe('El plazo no puede ser negativo.');
    expect(validarBorradorRecurrente({ ...rec, desde: '2026-09', hasta: '2026-08' }).hasta).toBe('El mes final no puede ser antes del inicial.');
  });
});

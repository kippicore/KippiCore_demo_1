import { describe, expect, it } from 'vitest';
import type { EntradaRegistro, TasaCambio } from '@/dominio/tipos';
import { PARAMETROS_ADUANAS } from '@/config/aduanas';
import { PARAMETROS_NOMINA } from '@/config/nomina';
import {
  armarHorario,
  categoriaDeCambio,
  contarCambios,
  contraste,
  derivarTonos,
  diasDeAntiguedad,
  diferencia,
  digitoVerificacionNit,
  ejemploNomina,
  establecerEn,
  fraccionATexto,
  historialTasas,
  normalizarHex,
  normalizarNit,
  pedidoEjemplo,
  resumirHorario,
  resumirRegistro,
  sugerirDatosFrescos,
  tamanoLegible,
  textoAFraccion,
  textoHorarioCorto,
  validarBorradorLocal,
  validarTasa,
} from './calculos';

describe('NIT', () => {
  it('calcula el dígito de verificación del NIT de ejemplo', () => {
    expect(digitoVerificacionNit('901234567')).toBe(7);
  });
  it('con nueve cifras agrega el dígito y da formato', () => {
    expect(normalizarNit('901234567')).toEqual({ ok: true, nit: '901.234.567-7', calculado: true });
  });
  it('con diez cifras comprueba el dígito', () => {
    expect(normalizarNit('901.234.567-7')).toMatchObject({ ok: true, nit: '901.234.567-7', calculado: false });
    expect(normalizarNit('901234567-3')).toEqual({ ok: false, error: 'El dígito de verificación debería ser 7.' });
  });
  it('rechaza lo que no tiene el largo de un NIT', () => {
    expect(normalizarNit('')).toMatchObject({ ok: false });
    expect(normalizarNit('12345')).toMatchObject({ ok: false });
  });
});

describe('colores', () => {
  it('normaliza códigos cortos y rechaza lo inválido', () => {
    expect(normalizarHex('#abc')).toBe('#AABBCC');
    expect(normalizarHex('a67c52')).toBe('#A67C52');
    expect(normalizarHex('#zzz')).toBeNull();
  });
  it('el contraste del negro sobre blanco es 21 y el de un color sobre sí mismo, 1', () => {
    expect(Math.round(contraste('#000000', '#FFFFFF'))).toBe(21);
    expect(contraste('#A67C52', '#A67C52')).toBe(1);
  });
  it('los tonos derivados de la marca de ejemplo se leen bien', () => {
    const t = derivarTonos('#A67C52');
    expect(contraste(t.acentoTexto, t.acentoSuave)).toBeGreaterThan(4.5);
  });
});

describe('borradores de parámetros', () => {
  const base = { a: { b: 1, c: [1, 2] }, d: 'x' };
  it('establecerEn no modifica el original', () => {
    const n = establecerEn(base, 'a.b', 5);
    expect(n.a.b).toBe(5);
    expect(base.a.b).toBe(1);
    expect(n.a.c).toEqual([1, 2]);
  });
  it('diferencia devuelve solo lo que cambió, con la misma forma', () => {
    expect(diferencia(base, establecerEn(base, 'a.b', 5))).toEqual({ a: { b: 5 } });
    expect(diferencia(base, base)).toBeNull();
    expect(diferencia(base, { ...base, a: { ...base.a, c: [1, 3] } })).toEqual({ a: { c: [1, 3] } });
  });
  it('contarCambios cuenta valores, no objetos', () => {
    expect(contarCambios({ a: { b: 5, c: [1] }, d: 'y' })).toBe(3);
    expect(contarCambios(null)).toBe(0);
  });
  it('los porcentajes van y vienen entre texto y fracción', () => {
    expect(textoAFraccion('8,5')).toBe(0.085);
    expect(textoAFraccion('0,522')).toBe(0.00522);
    expect(textoAFraccion('')).toBeNull();
    expect(textoAFraccion('abc')).toBeNull();
    expect(fraccionATexto(0.085)).toBe('8,5');
    expect(fraccionATexto(0.00522, 3)).toBe('0,522');
  });
});

describe('tasas', () => {
  const t = (id: string, moneda: 'USD' | 'CNY', fecha: string, valor: number): TasaCambio => ({ id, moneda, fecha, valor, fuente: 'ejemplo' });
  const tasas = [t('1', 'USD', '2026-09-01', 3900), t('2', 'USD', '2026-09-15', 3939), t('3', 'USD', '2026-10-30', 4100), t('4', 'CNY', '2026-09-15', 540)];

  it('el historial va de la más reciente a la más antigua y marca la vigente', () => {
    const h = historialTasas(tasas, 'USD', '2026-09-30');
    expect(h.map((f) => f.tasa.id)).toEqual(['3', '2', '1']);
    expect(h.find((f) => f.vigente)?.tasa.id).toBe('2');
    expect(h.find((f) => f.tasa.id === '2')?.variacion).toBeCloseTo(0.01, 4);
    expect(h.find((f) => f.tasa.id === '1')?.variacion).toBeNull();
  });
  it('"ambas" mezcla las monedas por fecha', () => {
    expect(historialTasas(tasas, 'todas', '2026-09-30').filter((f) => f.vigente).map((f) => f.tasa.moneda).sort()).toEqual(['CNY', 'USD']);
  });
  it('valida valor y fecha', () => {
    expect(validarTasa(null, '2026-09-01', '2026-09-30').valor).toBeTruthy();
    expect(validarTasa(0, '2026-09-01', '2026-09-30').valor).toBeTruthy();
    expect(validarTasa(3950, '2026-10-01', '2026-09-30').fecha).toBe('La tasa no puede ser de una fecha futura.');
    expect(validarTasa(3950, '2026-09-30', '2026-09-30')).toEqual({});
  });
});

describe('ejemplo de nómina con parámetros en borrador', () => {
  it('el salario mínimo con exoneración cuesta lo mismo que la nómina real (W6)', () => {
    const e = ejemploNomina(PARAMETROS_NOMINA, 1_750_905, true, '2026-09-30');
    expect(e.exonerado).toBe(true);
    expect(e.divisor).toBe(210);
    expect(e.costo).toBe(e.totalDevengado + e.aportes + e.provisiones);
  });
  it('subir el salario mínimo o un aporte cambia el costo', () => {
    const antes = ejemploNomina(PARAMETROS_NOMINA, 1_750_905, true, '2026-09-30');
    const masCaja = ejemploNomina({ ...PARAMETROS_NOMINA, empleador: { ...PARAMETROS_NOMINA.empleador, caja: 0.06 } }, 1_750_905, true, '2026-09-30');
    expect(masCaja.costo).toBeGreaterThan(antes.costo);
  });
  it('el divisor manual cambia el valor de la hora', () => {
    const a = ejemploNomina(PARAMETROS_NOMINA, 2_100_000, true, '2026-09-30');
    const b = ejemploNomina({ ...PARAMETROS_NOMINA, divisorHorasMes: 200 }, 2_100_000, true, '2026-09-30');
    expect(a.valorHora).toBe(10_000);
    expect(b.valorHora).toBe(10_500);
  });
});

describe('pedido de ejemplo de aduanas', () => {
  const e = { unidades: 100, fobUnitarioUsd: 10, fleteUsd: 500, honorarios: 1_000_000, bodegaje: 200_000, transporte: 300_000, tasaUsd: 4000 };
  it('el arancel es el porcentaje del CIF y el IVA se calcula sobre CIF + arancel', () => {
    const r = pedidoEjemplo(PARAMETROS_ADUANAS, e);
    expect(r.fobCop).toBe(4_000_000);
    expect(r.arancel).toBe(Math.round(r.cif * 0.15));
    expect(r.ivaImportacion).toBe(Math.round((r.cif + r.arancel) * 0.19));
    expect(r.total).toBe(r.cif + r.arancel + 1_000_000 + 200_000 + 300_000);
  });
  it('subir el arancel o sumar el IVA al costo encarece el pedido', () => {
    const base = pedidoEjemplo(PARAMETROS_ADUANAS, e).total;
    expect(pedidoEjemplo({ ...PARAMETROS_ADUANAS, arancelPct: 0.2 }, e).total).toBeGreaterThan(base);
    expect(pedidoEjemplo({ ...PARAMETROS_ADUANAS, ivaImportacionSumaAlCosto: true }, e).total).toBeGreaterThan(base);
  });
  it('otros tributos se multiplican por las unidades', () => {
    expect(pedidoEjemplo({ ...PARAMETROS_ADUANAS, otrosTributosPorUnidad: 500 }, e).otrosTributos).toBe(50_000);
  });
});

describe('locales', () => {
  const horario = armarHorario({ semana: { abre: '10:00', cierra: '20:00' }, sabado: { abre: '10:00', cierra: '20:00' }, domingo: { abre: '11:00', cierra: '19:00' } });
  it('arma los siete días y los resume de vuelta', () => {
    expect(horario[3]).toEqual({ abre: '10:00', cierra: '20:00' });
    expect(resumirHorario(horario).domingo).toEqual({ abre: '11:00', cierra: '19:00' });
    expect(textoHorarioCorto(horario)).toBe('Lun–sáb 10:00–20:00 · Dom 11:00–19:00');
  });
  const ok = { nombre: 'Andino', codigo: 'and', direccion: 'Cra 11', arriendo: 0, area: 80, horario: resumirHorario(horario) };
  it('valida lo obligatorio y el código repetido', () => {
    expect(validarBorradorLocal(ok, ['P93'])).toEqual({});
    expect(validarBorradorLocal({ ...ok, nombre: ' ' }, []).nombre).toBeTruthy();
    expect(validarBorradorLocal({ ...ok, codigo: 'P93' }, ['P93']).codigo).toBe('Ya hay un local con ese código.');
    expect(validarBorradorLocal({ ...ok, area: null }, []).area).toBeTruthy();
    expect(validarBorradorLocal({ ...ok, horario: { ...ok.horario, semana: { abre: '20:00', cierra: '10:00' } } }, []).semana).toBeTruthy();
  });
});

describe('datos de la demo', () => {
  const entrada = (tipo: string, origen: 'usuario' | 'generado' = 'usuario'): EntradaRegistro =>
    ({ id: tipo, ts: '2026-09-30T10:00:00', marcaAgua: '', usuarioId: 'u', rol: 'dueno', origen, seq: 1, comando: { tipo, datos: {} } }) as unknown as EntradaRegistro;
  it('agrupa lo que cambió el visitante por área y deja fuera lo del sistema', () => {
    const r = resumirRegistro([entrada('venta.registrar'), entrada('venta.anular'), entrada('traslado.solicitar'), entrada('venta.registrar', 'generado')]);
    expect(r.total).toBe(3);
    expect(r.porCategoria).toEqual([
      { categoria: 'Ventas', cantidad: 2 },
      { categoria: 'Inventario', cantidad: 1 },
    ]);
    expect(categoriaDeCambio('tasa.editar')).toBe('Configuración');
    expect(categoriaDeCambio('inventado.algo')).toBe('Otros');
  });
  it('sugiere datos frescos con cambios y 7 días o más', () => {
    expect(sugerirDatosFrescos(2, 7)).toBe(true);
    expect(sugerirDatosFrescos(2, 6)).toBe(false);
    expect(sugerirDatosFrescos(0, 30)).toBe(false);
    expect(diasDeAntiguedad('2026-09-20', '2026-09-30')).toBe(10);
  });
  it('el tamaño se escribe legible', () => {
    expect(tamanoLegible(512)).toBe('512 B');
    expect(tamanoLegible(2048)).toBe('2 KB');
    expect(tamanoLegible(1_572_864)).toBe('1,5 MB');
  });
});

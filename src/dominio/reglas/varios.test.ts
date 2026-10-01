import { describe, expect, it } from 'vitest';
import { PARAMETROS_DATAFONO } from '@/config/negocio';
import { PARAMETROS_SEGMENTACION } from '@/config/segmentacion';
import type { AbonoCxP } from '../tipos';
import { efectivoEsperado, sumaDenominaciones } from './caja';
import { calcularAbonoDatafono } from './datafono';
import { estadoCxC, estadoCxP, saldoCxP, saldoCxPCop } from './cuentas';
import { segmentoCliente } from './segmentacion';
import { codificarEan13, digitoControlEan13, esEan13Valido, generarEan13 } from './ean13';
import { codigoUnicoSimulado, hashHex } from './cufe';
import { coincideBusqueda, iniciales, pesos, rellenarPlantilla, slug } from './texto';

describe('datáfono (6.20.12, P10)', () => {
  it('neto = bruto − comisión − retenciones; ≈ 2,5 % de comisión y ≈ 1,6 % de retenciones', () => {
    const r = calcularAbonoDatafono({ debito: 87_000_000, credito: 58_000_000 }, PARAMETROS_DATAFONO, 0.19);
    expect(r.bruto).toBe(145_000_000);
    expect(r.neto).toBe(r.bruto - r.comision - r.retenciones.fuente - r.retenciones.iva - r.retenciones.ica);
    expect(r.comision).toBe(Math.round(87_000_000 * 0.022 + 58_000_000 * 0.029));
    const ret = r.retenciones.fuente + r.retenciones.iva + r.retenciones.ica;
    expect(ret / r.bruto).toBeGreaterThan(0.014);
    expect(ret / r.bruto).toBeLessThan(0.018);
  });
});

describe('caja (V8)', () => {
  it('arqueo por denominación y efectivo esperado', () => {
    expect(sumaDenominaciones({ '100000': 3, '50000': 7, '2000': 4, monedas: 3_400 })).toBe(
      300_000 + 350_000 + 8_000 + 3_400,
    );
    expect(efectivoEsperado(300_000, 1_250_000, [{ valor: 40_000 }, { valor: 15_000 }])).toBe(1_495_000);
  });
});

describe('cuentas por pagar y por cobrar (V9)', () => {
  const abono = (valorCOP: number, centavos: number | null): AbonoCxP => ({
    id: 'a',
    ts: '2026-09-01T10:00:00',
    valorCOP,
    montoOrigen:
      centavos === null
        ? null
        : { moneda: 'USD', centavos, tasa: 3900, fechaTasa: '2026-09-01', cop: valorCOP },
    diferenciaCambio: null,
    cuentaId: 'c',
    medio: 'transferencia',
    movimientoCuentaId: 'm',
    soporte: null,
  });
  it('estados derivados', () => {
    const base = {
      moneda: 'COP' as const,
      valor: 1_000_000,
      abonos: [],
      fechaVencimiento: '2026-10-05',
      programadaPara: null,
    };
    expect(estadoCxP(base, '2026-09-30')).toBe('pendiente');
    expect(estadoCxP({ ...base, programadaPara: '2026-10-04' }, '2026-09-30')).toBe('programado');
    expect(estadoCxP({ ...base, abonos: [abono(400_000, null)] }, '2026-09-30')).toBe('pago_parcial');
    expect(estadoCxP(base, '2026-10-06')).toBe('vencido');
    expect(estadoCxP({ ...base, abonos: [abono(1_000_000, null)] }, '2026-10-06')).toBe('pagado');
  });
  it('saldo en USD en centavos y en COP a la tasa vigente', () => {
    const usd = { moneda: 'USD' as const, valor: 1_470_000, abonos: [abono(1_716_000, 440_000)] };
    expect(saldoCxP(usd)).toBe(1_030_000);
    expect(saldoCxPCop(usd, 3950)).toBe(40_685_000);
  });
  it('por cobrar: por vencer dentro de 7 días', () => {
    expect(estadoCxC(100, '2026-10-05', '2026-09-30')).toBe('por_vencer');
    expect(estadoCxC(100, '2026-10-20', '2026-09-30')).toBe('al_dia');
    expect(estadoCxC(100, '2026-09-29', '2026-09-30')).toBe('vencido');
    expect(estadoCxC(0, '2026-09-29', '2026-09-30')).toBe('cobrado');
  });
});

describe('segmentación (6.20.8)', () => {
  const P = PARAMETROS_SEGMENTACION;
  const hoy = '2026-09-30';
  it('aplica el orden nuevo → en riesgo → VIP → frecuente → ocasional', () => {
    expect(
      segmentoCliente(
        {
          registro: '2026-09-01',
          primeraCompra: '2026-09-01',
          ultimaCompra: '2026-09-01',
          valor12m: 5_000_000,
          compras12m: 5,
        },
        hoy,
        P,
      ),
    ).toBe('nuevo');
    expect(
      segmentoCliente(
        {
          registro: '2025-01-01',
          primeraCompra: '2025-01-01',
          ultimaCompra: '2026-05-01',
          valor12m: 5_000_000,
          compras12m: 5,
        },
        hoy,
        P,
      ),
    ).toBe('en_riesgo');
    expect(
      segmentoCliente(
        {
          registro: '2025-01-01',
          primeraCompra: '2025-01-01',
          ultimaCompra: '2026-09-01',
          valor12m: 3_000_000,
          compras12m: 2,
        },
        hoy,
        P,
      ),
    ).toBe('vip');
    expect(
      segmentoCliente(
        {
          registro: '2025-01-01',
          primeraCompra: '2025-01-01',
          ultimaCompra: '2026-09-01',
          valor12m: 900_000,
          compras12m: 3,
        },
        hoy,
        P,
      ),
    ).toBe('frecuente');
    expect(
      segmentoCliente(
        {
          registro: '2025-01-01',
          primeraCompra: '2025-01-01',
          ultimaCompra: '2026-09-01',
          valor12m: 300_000,
          compras12m: 1,
        },
        hoy,
        P,
      ),
    ).toBe('ocasional');
  });
});

describe('EAN-13 (7.13)', () => {
  it('dígito de control con un valor conocido', () => {
    expect(digitoControlEan13('400638133393')).toBe(1);
    expect(esEan13Valido('4006381333931')).toBe(true);
    expect(esEan13Valido('4006381333932')).toBe(false);
  });
  it('genera códigos internos 20481… válidos y únicos', () => {
    const a = generarEan13('20', '481', 1);
    const b = generarEan13('20', '481', 2);
    expect(a.startsWith('20481')).toBe(true);
    expect(esEan13Valido(a) && esEan13Valido(b)).toBe(true);
    expect(a).not.toBe(b);
  });
  it('codifica en 95 módulos (referencia independiente)', () => {
    expect(codificarEan13('4006381333931')).toBe(
      '10100011010100111010111101111010001001011001101010100001010000101000010111010010000101100110101',
    );
    expect(codificarEan13(generarEan13('20', '481', 42))).toHaveLength(95);
  });
});

describe('CUFE simulado y texto', () => {
  it('96 hexadecimales deterministas', () => {
    const c = codigoUnicoSimulado({
      numero: 'HAL-FE-1043',
      ts: '2026-09-30T15:42:10',
      total: 199_900,
      iva: 31_917,
      nitEmisor: '901234567',
      adquirente: 'Consumidor final',
    });
    expect(c).toMatch(/^[0-9a-f]{96}$/);
    expect(
      codigoUnicoSimulado({
        numero: 'HAL-FE-1043',
        ts: '2026-09-30T15:42:10',
        total: 199_900,
        iva: 31_917,
        nitEmisor: '901234567',
        adquirente: 'Consumidor final',
      }),
    ).toBe(c);
    expect(hashHex('a')).not.toBe(hashHex('b'));
  });
  it('slug, iniciales, búsqueda sin tildes, plantillas y pesos', () => {
    expect(slug('Camisa Oxford entallada')).toBe('camisa-oxford-entallada');
    expect(slug('Sebastián Cárdenas')).toBe('sebastian-cardenas');
    expect(iniciales('Juan Camilo Ospina')).toBe('JO');
    expect(coincideBusqueda('Pantalón chino elástico', 'pantalon CHINO')).toBe(true);
    expect(
      rellenarPlantilla('{{Nombre}}, {{saludo}}.', { Nombre: 'Carolina', saludo: 'buenas tardes' }),
    ).toBe('Carolina, buenas tardes.');
    expect(pesos(789_900)).toBe('$ 789.900');
    expect(pesos(-40_000)).toBe('−$ 40.000');
  });
});

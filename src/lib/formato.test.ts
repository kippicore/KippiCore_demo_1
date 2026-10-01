import { describe, expect, it } from 'vitest';
import {
  cedula,
  celular,
  cifraCorta,
  consecutivo,
  dinero,
  fecha,
  fechaCorta,
  fechaLarga,
  hora,
  nit,
  numero,
  porcentaje,
  relativa,
  relativaDias,
  unidades,
  variacion,
} from './formato';
import { convertirParaMostrar, dineroEn, textoTasas } from './moneda';
import { conSufijo, enlaceCorreo, enlaceWhatsapp } from './enlaces';
import { nombreArchivo } from './descargar';
import { aDate, deDate, semanaIso } from './fechas';

/** Formatos colombianos con los ejemplos de la tabla 8.11.3 y 8.9.3. */
const NBSP = String.fromCharCode(0xa0);
const MENOS = String.fromCharCode(0x2212);
/** Espacio duro solo donde va (entre símbolo y cifra, y antes de %). */
const sp = (t: string) => t.replace(/(\$|US\$|CN¥) (?=\d)/g, `$1${NBSP}`).replace(/(\d) %/g, `$1${NBSP}%`);

describe('formatos (8.11.3)', () => {
  it('dinero COP, USD, CNY y negativos', () => {
    expect(dinero(1_250_000)).toBe(sp('$ 1.250.000'));
    expect(dinero(12_400.5, 'USD')).toBe(sp('US$ 12.400,50'));
    expect(dinero(8200, 'CNY')).toBe(sp('CN¥ 8.200,00'));
    expect(dinero(-45_000)).toBe(`${MENOS}${sp('$ 45.000')}`);
    expect(dinero(0)).toBe(sp('$ 0'));
    expect(dinero(1250)).toBe(sp('$ 1.250'));
  });

  it('cifra corta (8.9.3)', () => {
    expect(cifraCorta(12_438_900)).toBe(sp('$ 12,4 M'));
    expect(cifraCorta(850_000)).toBe(sp('$ 850 mil'));
    expect(cifraCorta(1_200_000_000)).toBe(sp('$ 1,2 mil M'));
    expect(cifraCorta(850)).toBe(sp('$ 850'));
    expect(cifraCorta(12_400, 'USD')).toBe(sp('US$ 12,4 mil'));
    expect(cifraCorta(1_200_000, 'CNY')).toBe(sp('CN¥ 1,2 M'));
    expect(cifraCorta(-45_000)).toBe(`${MENOS}${sp('$ 45 mil')}`);
    expect(cifraCorta(999_600)).toBe(sp('$ 1 M'));
  });

  it('porcentajes, variación y unidades', () => {
    expect(porcentaje(0.124)).toBe(sp('12,4 %'));
    expect(porcentaje(0.12)).toBe(sp('12 %'));
    expect(variacion(0.124)).toBe(sp('+12,4 %'));
    expect(variacion(-0.031)).toBe(`${MENOS}${sp('3,1 %')}`);
    expect(variacion(0)).toBe('Sin cambio');
    expect(unidades(1248)).toBe('1.248 uds.');
    expect(unidades(1)).toBe('1 ud.');
    expect(numero(1234567.5, 1)).toBe('1.234.567,5');
  });

  it('fechas y horas', () => {
    expect(fecha('2026-09-30')).toBe('30/09/2026');
    expect(fechaCorta('2026-09-30')).toBe('30 sep');
    expect(fechaLarga('2026-09-30')).toBe('Miércoles 30 de septiembre de 2026');
    expect(hora('15:45')).toBe('3:45 p. m.');
    expect(hora('2026-09-30T09:05:00')).toBe('9:05 a. m.');
    expect(hora('00:10')).toBe('12:10 a. m.');
    expect(hora('12:00')).toBe('12:00 p. m.');
    expect(relativa('2026-09-30T15:40:00', '2026-09-30T15:45:00')).toBe('hace 5 min');
    expect(relativa('2026-09-29T15:45:00', '2026-09-30T10:00:00')).toBe('ayer, 3:45 p. m.');
    expect(relativaDias('2026-10-12', '2026-09-30')).toBe('en 12 días');
    expect(relativaDias('2026-10-14', '2026-09-30')).toBe('en 2 semanas');
    expect(relativaDias('2026-09-29', '2026-09-30')).toBe('ayer');
  });

  it('documentos y consecutivos', () => {
    expect(celular('3001234567')).toBe('300 123 4567');
    expect(cedula('1020456789')).toBe('1.020.456.789');
    expect(nit('9012345678')).toBe('901.234.567-8');
    expect(nit('901.234.567-7')).toBe('901.234.567-7');
    expect(consecutivo('V', 482)).toBe('V-000482');
  });
});

describe('moneda, enlaces, archivos y fechas', () => {
  it('conversión para mostrar con la tasa vigente (6.20.11)', () => {
    expect(convertirParaMostrar(3_950_000, 'USD', 3950)).toBe(1000);
    expect(convertirParaMostrar(1000, 'COP', null)).toBe(1000);
    expect(dineroEn(3_950_000, 'USD', 3950)).toBe(sp('US$ 1.000,00'));
    expect(textoTasas()).toBe(sp('Tasa de ejemplo: US$ 1 = $ 3.950 · CN¥ 1 = $ 548'));
  });

  it('wa.me y mailto SIN destinatario y con el sufijo de prueba (R14)', () => {
    const w = enlaceWhatsapp('Hola, Ricardo');
    expect(w.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(w)).toContain('(mensaje de prueba desde la demo de KippiCore)');
    const m = enlaceCorreo('Pedido IMP-2026-07', 'Buenas tardes');
    expect(m.startsWith('mailto:?subject=')).toBe(true);
    expect(decodeURIComponent(m)).toContain('(mensaje de prueba desde la demo de KippiCore)');
    expect(conSufijo(conSufijo('x'))).toBe(conSufijo('x'));
  });

  it('nombres de archivo y fechas a mediodía UTC', () => {
    expect(nombreArchivo('Ventas detalladas · Usaquén', '2026-09-30', 'pdf')).toBe('ventas-detalladas-usaquen-2026-09-30.pdf');
    expect(deDate(aDate('2026-02-28'))).toBe('2026-02-28');
    expect(semanaIso('2026-09-30')).toEqual({ anio: 2026, semana: 40 });
    expect(semanaIso('2027-01-01')).toEqual({ anio: 2026, semana: 53 });
  });
});

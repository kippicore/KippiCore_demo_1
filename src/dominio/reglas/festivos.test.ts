import { describe, expect, it } from 'vitest';
import { domingoDePascua, esFestivo, festivosColombia } from './festivos';

describe('festivos de Colombia', () => {
  it('Pascua', () => {
    expect(domingoDePascua(2025)).toBe('2025-04-20');
    expect(domingoDePascua(2026)).toBe('2026-04-05');
    expect(domingoDePascua(2027)).toBe('2027-03-28');
  });

  it('2026 completo (Ley Emiliani y Semana Santa)', () => {
    expect(festivosColombia(2026).map((f) => f.fecha)).toEqual([
      '2026-01-01',
      '2026-01-12',
      '2026-03-23',
      '2026-04-02',
      '2026-04-03',
      '2026-05-01',
      '2026-05-18',
      '2026-06-08',
      '2026-06-15',
      '2026-06-29',
      '2026-07-20',
      '2026-08-07',
      '2026-08-17',
      '2026-10-12',
      '2026-11-02',
      '2026-11-16',
      '2026-12-08',
      '2026-12-25',
    ]);
  });

  it('2025 y 2027: fechas trasladadas', () => {
    const f25 = festivosColombia(2025).map((f) => f.fecha);
    expect(f25).toEqual(
      expect.arrayContaining([
        '2025-01-06',
        '2025-03-24',
        '2025-04-17',
        '2025-04-18',
        '2025-06-02',
        '2025-06-23',
        '2025-06-30',
        '2025-08-18',
        '2025-10-13',
        '2025-11-03',
        '2025-11-17',
      ]),
    );
    const f27 = festivosColombia(2027).map((f) => f.fecha);
    expect(f27).toEqual(
      expect.arrayContaining([
        '2027-01-11',
        '2027-03-22',
        '2027-03-25',
        '2027-03-26',
        '2027-05-10',
        '2027-05-31',
        '2027-06-07',
        '2027-07-05',
        '2027-08-16',
        '2027-10-18',
        '2027-11-01',
        '2027-11-15',
      ]),
    );
    expect(esFestivo('2026-12-25')).toBe(true);
    expect(esFestivo('2026-09-30')).toBe(false);
  });
});

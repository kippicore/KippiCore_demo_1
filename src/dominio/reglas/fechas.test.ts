import { describe, expect, it } from 'vitest';
import {
  diaHabilDelMes,
  diaSemana,
  diferenciaDias,
  diferenciaMinutos,
  esFinDeMes,
  finMes,
  inicioVentana,
  lunesDe,
  sumarDias,
  sumarMeses,
  sumarMinutosTs,
  siguienteDiaHabil,
} from './fechas';
import { conjuntoFestivos } from './festivos';

describe('fechas', () => {
  it('día de la semana y aritmética de días', () => {
    expect(diaSemana('2026-09-30')).toBe(3);
    expect(diaSemana('2026-10-04')).toBe(0);
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2028-03-01', -1)).toBe('2028-02-29');
    expect(diferenciaDias('2026-09-30', '2026-10-12')).toBe(12);
  });

  it('ventana de 18 meses desde el día 1 del mes', () => {
    expect(inicioVentana('2026-09-30', 18)).toBe('2025-03-01');
    expect(inicioVentana('2027-01-20', 18)).toBe('2025-07-01');
  });

  it('meses, lunes y fin de mes', () => {
    expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(lunesDe('2026-09-30')).toBe('2026-09-28');
    expect(lunesDe('2026-10-04')).toBe('2026-09-28');
    expect(finMes('2026-02')).toBe('2026-02-28');
    expect(esFinDeMes('2026-09-30')).toBe(true);
  });

  it('minutos con cruce de medianoche', () => {
    expect(sumarMinutosTs('2026-09-30T23:50:00', 20)).toBe('2026-10-01T00:10:00');
    expect(diferenciaMinutos('2026-09-30T10:00:00', '2026-09-30T10:25:00')).toBe(25);
  });

  it('días hábiles con festivos de Colombia', () => {
    const festivos = conjuntoFestivos([2026]);
    // Octubre de 2026: el lunes 12 es festivo; el décimo día hábil es el jueves 15.
    expect(diaHabilDelMes('2026-10', 10, festivos)).toBe('2026-10-15');
    expect(siguienteDiaHabil('2026-10-09', festivos)).toBe('2026-10-13');
  });
});

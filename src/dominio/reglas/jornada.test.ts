import { describe, expect, it } from 'vitest';
import { PARAMETROS_NOMINA } from '@/config/nomina';
import { horasNetasTurno, horasNocturnasTurno, jornadaMaximaVigente, seSolapan } from './jornada';

describe('jornada (P2, 6.20.14)', () => {
  it('8 h brutas con 1 h de descanso = 7 h netas', () => {
    expect(horasNetasTurno({ inicio: '10:00', fin: '18:00', descansoMin: 60 })).toBe(7);
    expect(horasNetasTurno({ inicio: '22:00', fin: '06:00', descansoMin: 60 })).toBe(7);
  });
  it('jornada vigente: 44 h antes del 15/07/2026 y 42 h después', () => {
    expect(jornadaMaximaVigente(PARAMETROS_NOMINA, '2026-07-14')).toBe(44);
    expect(jornadaMaximaVigente(PARAMETROS_NOMINA, '2026-07-15')).toBe(42);
  });
  it('solapes y horas nocturnas de un cierre', () => {
    expect(seSolapan({ inicio: '10:00', fin: '18:00' }, { inicio: '17:00', fin: '21:00' })).toBe(true);
    expect(seSolapan({ inicio: '10:00', fin: '18:00' }, { inicio: '18:00', fin: '21:00' })).toBe(false);
    expect(horasNocturnasTurno({ inicio: '13:00', fin: '21:00' }, PARAMETROS_NOMINA.jornadaNocturna)).toBe(2);
    expect(horasNocturnasTurno({ inicio: '10:00', fin: '18:00' }, PARAMETROS_NOMINA.jornadaNocturna)).toBe(0);
  });
});

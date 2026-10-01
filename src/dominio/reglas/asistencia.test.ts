import { describe, expect, it } from 'vitest';
import { PARAMETROS_NOMINA } from '@/config/nomina';
import type { Marcacion, Turno } from '../tipos';
import { asistenciaDia, sumarHoras } from './asistencia';

const traza = { creadoEn: '2026-09-01T00:00:00', creadoPor: 'sistema', origen: 'generado' as const };
const apertura: Turno = {
  ...traza,
  id: 't1',
  empleadoId: 'e',
  localId: 'zr',
  fecha: '2026-09-30',
  tipo: 'apertura',
  inicio: '10:00',
  fin: '18:00',
  descansoMin: 60,
  excedeJornadaAceptado: false,
};
const cierre: Turno = { ...apertura, id: 't2', tipo: 'cierre', inicio: '12:00', fin: '20:00' };
const m = (id: string, tipo: 'entrada' | 'salida', hora: string, fecha = '2026-09-30'): Marcacion => ({
  ...traza,
  id,
  empleadoId: 'e',
  localId: 'zr',
  ts: `${fecha}T${hora}:00`,
  tipo,
  medio: 'generada',
  nota: null,
});
const base = {
  empleadoId: 'e',
  fecha: '2026-09-30',
  novedad: null,
  parametros: PARAMETROS_NOMINA,
  dominicalOFestivo: false,
};

describe('asistencia (6.20.7)', () => {
  it('Mateo marca a las 10:25 en un turno de 10:00: 25 minutos tarde (N6)', () => {
    const r = asistenciaDia({
      ...base,
      turno: apertura,
      marcaciones: [m('a', 'entrada', '10:25')],
      ahora: '2026-09-30T15:30:00',
    });
    expect(r.estado).toBe('tarde');
    expect(r.minutosTarde).toBe(25);
  });

  it('dentro de la tolerancia es a tiempo', () => {
    const r = asistenciaDia({
      ...base,
      turno: apertura,
      marcaciones: [m('a', 'entrada', '10:08'), m('b', 'salida', '18:02')],
      ahora: '2026-09-30T21:00:00',
    });
    expect(r.estado).toBe('a_tiempo');
    expect(r.minutosTarde).toBe(0);
    expect(r.horasOrdinarias).toBe(6.9);
  });

  it('sin entrada: pendiente mientras dura el turno, ausente cuando termina', () => {
    expect(
      asistenciaDia({ ...base, turno: apertura, marcaciones: [], ahora: '2026-09-30T10:20:00' }).estado,
    ).toBe('pendiente');
    expect(
      asistenciaDia({ ...base, turno: apertura, marcaciones: [], ahora: '2026-09-30T18:30:00' }).estado,
    ).toBe('ausente');
    expect(
      asistenciaDia({
        ...base,
        turno: apertura,
        marcaciones: [],
        novedad: { id: 'n' } as never,
        ahora: '2026-09-30T18:30:00',
      }).estado,
    ).toBe('novedad');
  });

  it('cierre hasta las 8:40 p. m.: recargo nocturno desde las 7 p. m. y extra nocturna', () => {
    const r = asistenciaDia({
      ...base,
      turno: cierre,
      marcaciones: [m('a', 'entrada', '12:00'), m('b', 'salida', '20:40')],
      ahora: '2026-09-30T22:00:00',
    });
    expect(r.horasTrabajadas).toBeCloseTo(7.67, 2);
    expect(r.horasOrdinarias).toBe(7);
    expect(r.horasExtraNocturnas).toBeCloseTo(0.67, 2);
    expect(r.horasExtraDiurnas).toBe(0);
    expect(r.horasRecargoNocturno).toBe(1);
  });

  it('domingo: las horas ordinarias son dominicales', () => {
    const r = asistenciaDia({
      ...base,
      dominicalOFestivo: true,
      turno: apertura,
      marcaciones: [m('a', 'entrada', '10:00'), m('b', 'salida', '18:00')],
      ahora: '2026-09-30T20:00:00',
    });
    expect(r.horasDominicalFestivo).toBe(7);
    expect(sumarHoras([r, r]).horasDominicalFestivo).toBe(14);
  });

  it('olvidó marcar la salida: se toma el fin del turno', () => {
    const r = asistenciaDia({
      ...base,
      turno: apertura,
      marcaciones: [m('a', 'entrada', '10:00')],
      ahora: '2026-09-30T23:00:00',
    });
    expect(r.salida).toBe('2026-09-30T18:00:00');
    expect(r.horasOrdinarias).toBe(7);
  });
});

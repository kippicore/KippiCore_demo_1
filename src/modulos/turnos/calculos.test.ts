import { describe, expect, it } from 'vitest';
import type { Novedad, Turno } from '@/dominio/tipos';
import { ESPACIO_DURO as D } from '@/lib/formato';
import {
  diasDeNovedad,
  efectoEnNomina,
  estadoDeNovedad,
  estadoHoras,
  etiquetaSemana,
  evaluarTurno,
  fechaEnFrase,
  fraseExceso,
  lunesDeParametro,
  nombreCorto,
  plantillaTurno,
  propuestaDeArrastre,
  puntualidad,
  rangoCompacto,
  rangoHoras,
  repartirRecargo,
  textoHoras,
  textoMinutos,
  validarBorradorNovedad,
  validarBorradorTurno,
} from './calculos';

const turno = (id: string, fecha: string, inicio: string, fin: string, extra: Partial<Turno> = {}): Turno =>
  ({
    id,
    empleadoId: 'e1',
    localId: 'usq',
    fecha,
    tipo: 'apertura',
    inicio,
    fin,
    descansoMin: 60,
    excedeJornadaAceptado: false,
    ...extra,
  }) as Turno;

const nov = (desde: string, hasta: string): Novedad =>
  ({
    id: 'n1',
    empleadoId: 'e1',
    tipo: 'vacaciones',
    desde,
    hasta,
    remunerada: true,
    soporte: null,
    nota: null,
  }) as Novedad;

describe('plantillas y formato de horas', () => {
  it('el cierre de Zona Rosa es de 1 a 9 p. m. y el de los demás locales de 12 m. a 8 p. m.', () => {
    expect(plantillaTurno('cierre', 'zr')).toMatchObject({ inicio: '13:00', fin: '21:00', descansoMin: 60 });
    expect(plantillaTurno('cierre', 'usq')).toMatchObject({ inicio: '12:00', fin: '20:00' });
    expect(plantillaTurno('apertura', 'p93')).toMatchObject({ inicio: '10:00', fin: '18:00' });
    expect(plantillaTurno('completo', 'bod')).toMatchObject({ inicio: '08:00', fin: '16:00' });
  });

  it('formatea rangos y horas sin cifras sueltas', () => {
    expect(rangoCompacto('10:00', '18:00')).toBe('10:00–18:00');
    expect(rangoHoras('10:00', '18:00')).toBe('10 a. m. – 6 p. m.');
    expect(rangoHoras('10:30', '19:30')).toBe('10:30 a. m. – 7:30 p. m.');
    expect(textoHoras(7)).toBe('7 h');
    expect(textoHoras(7.5)).toBe('7,5 h');
    expect(textoHoras(1862.5)).toBe('1.862,5 h');
    expect(textoMinutos(25)).toBe('25 min');
    expect(textoMinutos(90)).toBe('1 h 30 min');
    expect(textoMinutos(120)).toBe('2 h');
    expect(nombreCorto('Camilo Andrés', 'Suárez Lozano')).toBe('Camilo Suárez');
    expect(fechaEnFrase('2026-10-04')).toBe('domingo 4 de octubre de 2026');
  });
});

describe('semana', () => {
  it('cualquier día de la semana lleva a su lunes y sin parámetro se usa la de hoy', () => {
    expect(lunesDeParametro('2026-10-03', '2026-09-30')).toBe('2026-09-28');
    expect(lunesDeParametro(null, '2026-09-30')).toBe('2026-09-28');
    expect(lunesDeParametro('2026-09-28', '2026-12-01')).toBe('2026-09-28');
  });

  it('etiqueta la semana con su número y sus fechas', () => {
    expect(etiquetaSemana('2026-09-28')).toBe('Semana 40 · 28 sep – 4 oct de 2026');
  });
});

describe('jornada semanal en vivo', () => {
  it('clasifica las horas contra el máximo', () => {
    expect(estadoHoras(35, 42)).toBe('ok');
    expect(estadoHoras(42, 42)).toBe('limite');
    expect(estadoHoras(42.5, 42)).toBe('exceso');
  });

  const semana = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'].map(
    (f, i) => turno(`t${i}`, f, '10:00', '18:00'),
  );
  const base = { empleadoId: 'e1', inicio: '10:00', fin: '18:00', descansoMin: 60 };

  it('42 h exactas no son exceso: seis turnos de 7 h netas caben', () => {
    const e = evaluarTurno({ ...base, fecha: '2026-10-04', excluirId: 't0' }, semana, [], 42);
    expect(e).toEqual({ resultado: 'ok', horas: 42, maximo: 42 });
  });

  it('un séptimo turno de 7 h pasa de 42 h y dice cuántas horas son extra', () => {
    const e = evaluarTurno({ ...base, fecha: '2026-10-04' }, semana, [], 42);
    expect(e).toEqual({ resultado: 'exceso', horas: 49, maximo: 42, exceso: 7 });
    expect(fraseExceso('Mateo', 49, 42)).toBe(
      'Con este turno, Mateo quedaría con 49 h esta semana (máximo 42 h): 7 h serían horas extra.',
    );
  });

  it('un turno que se cruza con otro del mismo día se rechaza antes que el exceso', () => {
    const e = evaluarTurno({ ...base, fecha: '2026-09-28', inicio: '12:00', fin: '20:00' }, semana, [], 42);
    expect(e.resultado).toBe('solapa');
  });

  it('mover un turno no cuenta contra sí mismo', () => {
    const e = evaluarTurno({ ...base, fecha: '2026-10-04', excluirId: 't1' }, semana, [], 42);
    expect(e).toEqual({ resultado: 'ok', horas: 42, maximo: 42 });
  });

  it('quien está de vacaciones o incapacitado ese día no se programa', () => {
    const e = evaluarTurno({ ...base, fecha: '2026-10-05' }, [], [nov('2026-10-05', '2026-10-09')], 42);
    expect(e.resultado).toBe('novedad');
    expect(
      evaluarTurno({ ...base, fecha: '2026-10-10' }, [], [nov('2026-10-05', '2026-10-09')], 42).resultado,
    ).toBe('ok');
  });

  it('un turno eliminado de la novedad no la hace valer', () => {
    const n = { ...nov('2026-10-05', '2026-10-09'), eliminadoEn: '2026-10-01T10:00:00' } as Novedad;
    expect(evaluarTurno({ ...base, fecha: '2026-10-05' }, [], [n], 42).resultado).toBe('ok');
  });
});

describe('arrastrar y soltar', () => {
  it('soltar una plantilla propone un turno nuevo con el horario del local', () => {
    const p = propuestaDeArrastre(
      { clase: 'plantilla', tipo: 'cierre' },
      { empleadoId: 'e2', fecha: '2026-09-30' },
      'zr',
    );
    expect(p).toMatchObject({
      empleadoId: 'e2',
      fecha: '2026-09-30',
      tipo: 'cierre',
      inicio: '13:00',
      fin: '21:00',
      descansoMin: 60,
      excluirId: null,
    });
  });

  it('mover un turno conserva su horario y se excluye a sí mismo; soltarlo donde estaba no hace nada', () => {
    const t = turno('t9', '2026-09-30', '12:00', '20:00', { tipo: 'cierre' });
    const p = propuestaDeArrastre(
      { clase: 'turno', turno: t },
      { empleadoId: 'e2', fecha: '2026-10-01' },
      'usq',
    );
    expect(p).toMatchObject({
      empleadoId: 'e2',
      fecha: '2026-10-01',
      tipo: 'cierre',
      inicio: '12:00',
      fin: '20:00',
      excluirId: 't9',
    });
    expect(
      propuestaDeArrastre({ clase: 'turno', turno: t }, { empleadoId: 'e1', fecha: '2026-09-30' }, 'usq'),
    ).toBeNull();
  });
});

describe('borradores', () => {
  it('el turno pide persona, día, tipo, horas válidas y un descanso menor que el turno', () => {
    const e = validarBorradorTurno({
      empleadoId: null,
      fecha: null,
      tipo: null,
      inicio: '9',
      fin: '',
      descansoMin: null,
    });
    expect(Object.keys(e).sort()).toEqual(['descansoMin', 'empleadoId', 'fecha', 'fin', 'inicio', 'tipo']);
    expect(
      validarBorradorTurno({
        empleadoId: 'e1',
        fecha: '2026-09-30',
        tipo: 'apertura',
        inicio: '10:00',
        fin: '18:00',
        descansoMin: 480,
      }).descansoMin,
    ).toBe('El descanso debe ser menor que el turno.');
    expect(
      validarBorradorTurno({
        empleadoId: 'e1',
        fecha: '2026-09-30',
        tipo: 'apertura',
        inicio: '10:00',
        fin: '18:00',
        descansoMin: 60,
      }),
    ).toEqual({});
    // Un turno que cruza la medianoche también es válido.
    expect(
      validarBorradorTurno({
        empleadoId: 'e1',
        fecha: '2026-09-30',
        tipo: 'cierre',
        inicio: '18:00',
        fin: '02:00',
        descansoMin: 60,
      }),
    ).toEqual({});
  });

  it('la novedad pide persona, tipo, fechas y que la final no sea anterior a la inicial', () => {
    expect(
      Object.keys(validarBorradorNovedad({ empleadoId: null, tipo: null, desde: null, hasta: null })).sort(),
    ).toEqual(['desde', 'empleadoId', 'hasta', 'tipo']);
    expect(
      validarBorradorNovedad({ empleadoId: 'e1', tipo: 'permiso', desde: '2026-10-05', hasta: '2026-10-04' })
        .hasta,
    ).toBe('La fecha final no puede ser antes de la inicial.');
    expect(
      validarBorradorNovedad({ empleadoId: 'e1', tipo: 'permiso', desde: '2026-10-05', hasta: '2026-10-05' }),
    ).toEqual({});
  });
});

describe('novedades', () => {
  it('cuenta los días de calendario con ambos extremos y su estado frente a hoy', () => {
    expect(diasDeNovedad('2026-08-03', '2026-08-12')).toBe(10);
    expect(diasDeNovedad('2026-09-15', '2026-09-15')).toBe(1);
    expect(estadoDeNovedad({ desde: '2026-08-03', hasta: '2026-08-12' }, '2026-09-30')).toBe('pasada');
    expect(estadoDeNovedad({ desde: '2026-09-30', hasta: '2026-10-02' }, '2026-09-30')).toBe('vigente');
    expect(estadoDeNovedad({ desde: '2026-10-01', hasta: '2026-10-02' }, '2026-09-30')).toBe('proxima');
  });

  it('explica el efecto en la nómina según el tipo, sin cifras de dinero', () => {
    const p = { porcentajePago: 0.6667, diasACargoEmpleador: 2 };
    expect(efectoEnNomina('incapacidad', true, 1, p)).toBe(
      `1 día a cargo del negocio, pagado al 66,67${D}%.`,
    );
    expect(efectoEnNomina('incapacidad', true, 5, p)).toBe(
      `Los 2 primeros días los paga el negocio y los 3 siguientes los cubre la EPS; todos al 66,67${D}%.`,
    );
    expect(efectoEnNomina('vacaciones', true, 10, p)).toBe(
      'Se pagan como vacaciones y no cuentan como ausencia.',
    );
    expect(efectoEnNomina('licencia_no_remunerada', false, 3, p)).toBe(
      'No se paga: se descuentan estos días del salario.',
    );
    expect(efectoEnNomina('permiso', true, 1, p)).toBe('Se paga completa y no cuenta como ausencia.');
  });
});

describe('recargos', () => {
  const rec = { nocturno: 0.35, dominicalFestivo: 0.9 };

  it('reparte el recargo en proporción a horas × porcentaje y la suma da exactamente el valor del dominio', () => {
    const r = repartirRecargo({ horasNocturnas: 3, horasDominicalFestivo: 7, valor: 68_250 }, rec);
    expect(r.nocturno + r.dominical).toBe(68_250);
    // 3 × 0,35 = 1,05 frente a 7 × 0,90 = 6,30: el domingo pesa 6 veces más que cerrar tarde.
    expect(r.nocturno).toBe(Math.round((68_250 * 1.05) / 7.35));
    expect(r.dominical).toBeGreaterThan(r.nocturno * 5);
  });

  it('sin horas con recargo o sin valor (prestación de servicios) no reparte nada', () => {
    expect(repartirRecargo({ horasNocturnas: 2, horasDominicalFestivo: 7, valor: 0 }, rec)).toEqual({
      nocturno: 0,
      dominical: 0,
    });
    expect(repartirRecargo({ horasNocturnas: 0, horasDominicalFestivo: 0, valor: 0 }, rec)).toEqual({
      nocturno: 0,
      dominical: 0,
    });
    expect(repartirRecargo({ horasNocturnas: 6, horasDominicalFestivo: 0, valor: 18_000 }, rec)).toEqual({
      nocturno: 18_000,
      dominical: 0,
    });
  });
});

describe('puntualidad', () => {
  it('es la fracción de días con entrada que fueron a tiempo; sin entradas no hay cifra', () => {
    expect(puntualidad(24, 1)).toBeCloseTo(0.96, 5);
    expect(puntualidad(0, 0)).toBeNull();
    expect(puntualidad(0, 3)).toBe(0);
  });
});

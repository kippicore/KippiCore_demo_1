import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  activarVerificacionDeTablas,
  selAsistencia,
  selHorasSemana,
  selRecargosTurnos,
  selTurnosSemana,
} from '@/selectores';
import { AHORA, estadoDe, HOY } from '@/selectores/pruebas/construir';
import {
  selAsistenciaVista,
  selMarcacionesDia,
  selNovedadesDe,
  selNovedadesVista,
  selParametrosTurnos,
  selPersonas,
  selRecargosDetallados,
  selSemanaLocal,
  selTurnosEnRango,
} from './selectores';

/** Los selectores locales de C2 componen los del dominio: aquí se comprueba que sus cifras cuadran con ellos. */
const LUNES = '2026-09-28';
const e = estadoDe();

beforeAll(() => activarVerificacionDeTablas(true));
afterAll(() => activarVerificacionDeTablas(false));

describe('selSemanaLocal', () => {
  it('la cuadrícula de cada local sale de selTurnosSemana y las horas de cada persona de selHorasSemana', () => {
    for (const localId of ['usq', 'p93', 'zr', 'bod']) {
      const v = selSemanaLocal(e, { localId, lunes: LUNES });
      const base = selTurnosSemana(e, { localId, lunes: LUNES });
      expect(v.dias).toEqual(base.dias);
      expect(v.filas.map((f) => f.empleadoId)).toEqual(base.empleados.map((x) => x.empleadoId));
      for (const f of v.filas) {
        const h = selHorasSemana(e, { empleadoId: f.empleadoId, lunes: LUNES });
        expect(f.horas).toBeCloseTo(h.horas, 9);
        expect(f.maximo).toBe(h.maximo);
        expect(f.exceso).toBeCloseTo(h.exceso, 9);
        expect(f.turnos.length).toBe(h.turnos.length);
      }
    }
  });

  it('las horas del local son la suma de las de sus turnos y la cobertura por día cuadra con ellas', () => {
    const v = selSemanaLocal(e, { localId: 'zr', lunes: LUNES });
    const delLocal = v.filas.flatMap((f) => f.turnos).filter((t) => t.localId === 'zr');
    expect(v.turnosLocal).toBe(delLocal.length);
    expect(Object.values(v.cobertura).reduce((a, c) => a + c.horas, 0)).toBeCloseTo(v.horasLocal, 9);
    expect(v.conExceso).toBe(v.filas.filter((f) => f.exceso > 1e-9).length);
  });

  it('quien tiene vinculación de prestación de servicios se identifica y tiene nombre corto', () => {
    const v = selSemanaLocal(e, { localId: 'usq', lunes: LUNES });
    const daniela = v.filas.find((f) => f.empleadoId === 'em_dmoreno');
    expect(daniela?.vinculacion).toBe('prestacion_servicios');
    expect(daniela?.corto).toBe('Daniela Moreno');
  });

  it('una semana sin turnos programados deja las horas en cero para todos', () => {
    const v = selSemanaLocal(e, { localId: 'usq', lunes: '2027-03-01' });
    expect(v.horasLocal).toBe(0);
    expect(v.filas.every((f) => f.horas === 0 && f.exceso === 0)).toBe(true);
  });
});

describe('selRecargosDetallados', () => {
  it('el total y cada persona son los de selRecargosTurnos, y el reparto suma exactamente el valor', () => {
    for (const localId of ['usq', 'p93', 'zr']) {
      const v = selRecargosDetallados(e, { localId, lunes: LUNES });
      const base = selRecargosTurnos(e, { localId, lunes: LUNES });
      expect(v.total).toBe(base.total);
      expect(v.empleados.map((x) => x.empleadoId)).toEqual(base.empleados.map((x) => x.empleadoId));
      for (const x of v.empleados) expect(x.valorNocturno + x.valorDominical).toBe(x.valor);
      expect(v.valorNocturno + v.valorDominical).toBe(v.total);
    }
  });

  it('quien presta servicios no genera recargo y la bodega no tiene turnos nocturnos ni dominicales', () => {
    const usq = selRecargosDetallados(e, { localId: 'usq', lunes: LUNES });
    expect(usq.empleados.find((x) => x.empleadoId === 'em_dmoreno')).toMatchObject({
      vinculacion: 'prestacion_servicios',
      valor: 0,
    });
    expect(selRecargosDetallados(e, { localId: 'bod', lunes: LUNES }).total).toBe(0);
  });
});

describe('selParametrosTurnos', () => {
  it('trae los parámetros del dominio y cuáles están por verificar', () => {
    const p = selParametrosTurnos(e);
    expect(p.recargos).toEqual(e.parametros.nomina.recargos);
    expect(p.jornadaMaximaHoras).toBe(42);
    expect(p.porVerificar).toContain('recargos');
  });
});

describe('selAsistenciaVista', () => {
  it('es selAsistencia con el turno y el nombre de cada día', () => {
    const p = { desde: '2026-09-01', hasta: HOY, ahora: AHORA };
    const v = selAsistenciaVista(e, p);
    const base = selAsistencia(e, p);
    expect(v.filas.map((f) => f.dia)).toEqual(base.dias);
    expect(v.resumen.map((r) => r.empleadoId)).toEqual(base.resumen.map((r) => r.empleadoId));
    for (const f of v.filas) {
      expect(f.turno?.id ?? null).toBe(f.dia.turnoId);
      expect(f.nombre.length).toBeGreaterThan(0);
    }
  });

  it('filtra por persona y por local', () => {
    const p = { desde: '2026-09-01', hasta: HOY, ahora: AHORA };
    const una = selAsistenciaVista(e, { ...p, empleadoId: 'em_mherrera' });
    expect(new Set(una.filas.map((f) => f.dia.empleadoId))).toEqual(new Set(['em_mherrera']));
    const local = selAsistenciaVista(e, { ...p, localId: 'bod' });
    expect(new Set(local.resumen.map((r) => r.empleadoId))).toEqual(new Set(['em_wdiaz', 'em_jtorres']));
  });

  it('hoy Mateo llegó 25 minutos tarde (la alerta de llegadas tarde sale de aquí)', () => {
    const v = selAsistenciaVista(e, { desde: HOY, hasta: HOY, ahora: AHORA, empleadoId: 'em_mherrera' });
    expect(v.filas).toHaveLength(1);
    expect(v.filas[0]?.dia).toMatchObject({ estado: 'tarde', minutosTarde: 25 });
  });
});

describe('marcaciones, turnos por rango y personas', () => {
  it('las marcaciones del día salen en orden', () => {
    const m = selMarcacionesDia(e, { empleadoId: 'em_scardenas', fecha: HOY });
    expect(m.map((x) => x.tipo)).toEqual(['entrada']);
    expect(selMarcacionesDia(e, { empleadoId: 'em_scardenas', fecha: '2027-01-01' })).toEqual([]);
  });

  it('los turnos de un rango son los de selHorasSemana de esa semana', () => {
    const r = selTurnosEnRango(e, { empleadoId: 'em_scardenas', desde: LUNES, hasta: '2026-10-04' });
    expect(r.map((t) => t.id).sort()).toEqual(
      selHorasSemana(e, { empleadoId: 'em_scardenas', lunes: LUNES })
        .turnos.map((t) => t.id)
        .sort(),
    );
    expect(selTurnosEnRango(e, { empleadoId: 'em_scardenas', desde: '2026-10-04', hasta: LUNES })).toEqual(
      [],
    );
  });

  it('nombra a todas las personas no eliminadas', () => {
    const p = selPersonas(e);
    expect(p['em_scardenas']).toMatchObject({
      nombre: 'Sebastián Cárdenas Ruiz',
      slug: 'sebastian-cardenas',
      localId: 'usq',
    });
    expect(Object.keys(p).length).toBe(Object.values(e.empleados).filter((x) => !x.eliminadoEn).length);
  });
});

describe('selNovedadesVista', () => {
  it('lista las novedades con sus días, su estado frente a hoy y los turnos que dejan por cubrir', () => {
    const v = selNovedadesVista(e, { hoy: HOY });
    expect(v.length).toBe(Object.values(e.novedades).filter((n) => !n.eliminadoEn).length);
    const vac = v.find((x) => x.novedad.empleadoId === 'em_casuarez');
    expect(vac).toMatchObject({ dias: 10, estado: 'pasada' });
    // Los días de la novedad son los de calendario; los turnos por cubrir salen del índice de turnos.
    expect(vac?.turnosPorCubrir).toBe(
      selTurnosEnRango(e, { empleadoId: 'em_casuarez', desde: vac!.novedad.desde, hasta: vac!.novedad.hasta })
        .length,
    );
  });

  it('las novedades de una persona son las suyas', () => {
    const r = selNovedadesDe(e, { empleadoId: 'em_nrios' });
    expect(r).toHaveLength(1);
    expect(r[0]?.tipo).toBe('incapacidad');
  });
});

import { describe, expect, it } from 'vitest';
import { sumarDias } from '@/dominio/reglas/fechas';
import { saldoCxP } from '@/dominio/reglas/cuentas';
import { idHijo } from '@/dominio/motor/ids';
import { auditarCoherencia } from '../auditoria/coherencia';
import { auditarNarrativa } from '../auditoria/narrativa';
import { construida, olvidar, planDe } from './utilidades';

/**
 * narrativa.test.ts (PLAN 7.11): N1–N16 el día del ancla, en distintos días de la semana y horas (antes de
 * abrir, mediodía, de noche), y la historia sigue viva a ancla + 3 y ancla + 10.
 */
describe('narrativa N1–N16 al ancla (7.11)', () => {
  it.each([
    { ancla: '2026-09-30', hora: '15:30' },
    { ancla: '2026-09-30', hora: '08:30' },
    { ancla: '2026-09-30', hora: '21:30' },
    { ancla: '2026-10-04', hora: '13:00' },
    { ancla: '2026-10-05', hora: '10:15' },
  ])('ancla $ancla a las $hora', ({ ancla, hora }) => {
    const e = construida(ancla, hora);
    expect(auditarNarrativa(e, ancla, `${ancla}T${hora}:00`, planDe(ancla))).toEqual([]);
    olvidar();
  });

  it.each([3, 10])('la historia sigue a ancla + %i días: invariantes y entidades narrativas válidas', (dias) => {
    const A = '2026-09-30';
    const ahora = `${sumarDias(A, dias)}T15:30:00`;
    const e = construida(A, '15:30', { ahora });
    const malas = auditarCoherencia(e, ahora).filter((x) => x.violaciones > 0);
    expect(malas.map((x) => `${x.regla} ${x.ejemplo}`)).toEqual([]);
    const nar = e.meta.narrativa;
    for (const [k, v] of Object.entries(nar)) if (k !== 'contratistasRiesgo') expect(v, k).not.toBe('');
    // La importación en puerto avanzó a nacionalización en su fecha.
    const puerto = e.importaciones[nar.importacionEnPuerto];
    expect(['en_nacionalizacion', 'nacionalizado', 'en_transporte_bogota', 'recibido_bodega']).toContain(puerto?.estado);
    // El saldo grande se paga al quedar listo (≈ 2 semanas): a +3 sigue pendiente.
    const saldo = e.cuentasPorPagar[idHijo(nar.importacionEnProduccion, 'cxp-saldo')];
    if (dias === 3) expect(saldo && saldoCxP(saldo)).toBeGreaterThan(0);
    olvidar();
  });

  // Resuelto en F2-B: selNarrativa a ancla + 3 y + 10 en src/selectores/fechas.test.ts.
});

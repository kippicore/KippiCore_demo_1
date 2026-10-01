import { afterEach, describe, expect, it } from 'vitest';
import type { EstadoDominio } from '@/dominio/tipos';
import { ESTADOS_IMPORTACION } from '@/dominio/tipos';
import { saldoCxP } from '@/dominio/reglas/cuentas';
import { sumarDias } from '@/dominio/reglas/fechas';
import { generarEstado } from '@/generador';
import { activarVerificacionDeTablas } from './memo';
import { selHallazgos } from './hallazgos';
import { selNarrativa } from './narrativa';
import { selAlertas } from './alertas';

/**
 * Selectores en las cuatro fechas de prueba (7.12) y la historia viva a ancla + 3 y + 10 (R24): resuelve los
 * `it.todo` que F2-A2 dejó para F2-B en patrones.test.ts y narrativa.test.ts.
 */
const FECHAS = ['2026-09-30', '2026-12-19', '2027-01-20', '2027-06-14'];
let e: EstadoDominio | null = null;
afterEach(() => {
  e = null;
});

describe('hallazgos en las cuatro fechas de prueba', () => {
  it.each(FECHAS)('%s: selHallazgos produce al menos 4 frases', (fecha) => {
    activarVerificacionDeTablas(true);
    e = generarEstado({ ancla: fecha, ahora: `${fecha}T15:30:00` });
    const h = selHallazgos(e, { hoy: fecha });
    expect(h.length, h.map((x) => x.id).join(', ')).toBeGreaterThanOrEqual(4);
    expect(new Set(h.map((x) => x.id)).size).toBe(h.length);
    expect(selAlertas(e, { localId: 'todos', ahora: `${fecha}T15:30:00` }).length).toBeGreaterThanOrEqual(6);
  });
});

describe('narrativa dinámica a ancla + 3 y + 10 (R24)', () => {
  it.each([3, 10])('ancla + %i días: selNarrativa devuelve entidades equivalentes y vigentes', (dias) => {
    const A = '2026-09-30';
    const hoy = sumarDias(A, dias);
    e = generarEstado({ ancla: A, ahora: `${hoy}T15:30:00` });
    const n = selNarrativa(e, { hoy });
    const est = e;
    const idx = (s: string) => ESTADOS_IMPORTACION.indexOf(s as (typeof ESTADOS_IMPORTACION)[number]);
    // Cada entidad devuelta existe y cumple su papel HOY (o es null si no hay equivalente).
    if (n.importacionEnPuerto) {
      const i = est.importaciones[n.importacionEnPuerto];
      expect(i && idx(i.estado) >= idx('en_puerto') && i.estado !== 'recibido_bodega').toBe(true);
    }
    if (n.importacionEnTransito) expect(['embarcado', 'en_transito']).toContain(est.importaciones[n.importacionEnTransito]?.estado);
    if (n.cxpGrande) expect(saldoCxP(est.cuentasPorPagar[n.cxpGrande] as never)).toBeGreaterThan(0);
    if (n.sesionCajaFaltante) expect(est.sesionesCaja[n.sesionCajaFaltante]?.revision).toBeNull();
    for (const k of ['solicitudDescuento', 'solicitudTraslado', 'solicitudAnulacion'] as const)
      if (n[k]) expect(est.solicitudes[n[k] as string]?.estado).toBe('pendiente');
    if (n.clienteCumpleanos) expect(est.clientes[n.clienteCumpleanos]?.cumpleanos).toBe(hoy.slice(5, 10));
    // La importación que estaba en puerto el día del ancla avanzó; la "de hoy" en puerto no es esa.
    const guion = est.importaciones[est.meta.narrativa.importacionEnPuerto];
    expect(guion?.estado).not.toBe('en_puerto');
    // El saldo grande sigue pendiente a +3 (vence al quedar listo, ≈ 2 semanas).
    if (dias === 3) expect(n.cxpGrande).toBe(est.meta.narrativa.cxpSaldoGrande);
    // Las alertas se arman sin entidades guionadas viejas.
    const alertas = selAlertas(est, { localId: 'todos', ahora: `${hoy}T15:30:00` });
    expect(alertas.length).toBeGreaterThan(3);
    for (const a of alertas) expect(a.accion.ruta.startsWith('/')).toBe(true);
  });
});

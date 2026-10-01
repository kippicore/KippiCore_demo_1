import { describe, expect, it } from 'vitest';
import type { EstadoDominio } from '@/dominio/tipos';
import { diaSemana, minutosDeHora } from '@/dominio/reglas/fechas';
import { masDias } from '../calendario';
import { construida, planDe } from './utilidades';

/**
 * rango.test.ts (PLAN 7.5, 7.14): 15–60 ventas (× escala) por día abierto completo, incluidos los primeros
 * días de la ventana; el primer mes del gráfico completo; diciembre el mes más alto, enero y febrero los más
 * bajos; el sábado el mejor día; ninguna venta fuera de horario ni en el futuro.
 */
const A = '2026-09-30';
const RE_INTENCION = /^vt_g_(\d{8})_(p93|usq|zr)_\d{3}$/;

function porDia(e: EstadoDominio): Map<string, number> {
  const r = new Map<string, number>();
  for (const v of Object.values(e.ventas)) {
    const m = RE_INTENCION.exec(v.id);
    if (!m) continue;
    const f = v.ts.slice(0, 10);
    r.set(f, (r.get(f) ?? 0) + 1);
  }
  return r;
}

describe('rango y forma de las ventas', () => {
  it.each([0.5, 1, 1.5])('escala %s: 15–60 × escala ventas por día abierto completo (incluidos los primeros días)', (escala) => {
    const e = construida(A, '21:30', { escala });
    const plan = planDe(A, escala);
    const conteo = porDia(e);
    const min = Math.round(15 * escala);
    const max = Math.round(60 * escala);
    let dias = 0;
    for (let f = plan.inicio; f < A; f = masDias(f, 1)) {
      const abiertos = plan.localesVenta.filter((l) => plan.calendario.horario(l, f)).length;
      if (abiertos < plan.localesVenta.length) continue;
      dias += 1;
      const n = conteo.get(f) ?? 0;
      // Una venta planeada solo se pierde si no hubo ninguna prenda en el local (rarísimo): margen de 1.
      expect(n, f).toBeGreaterThanOrEqual(min - 1);
      expect(n, f).toBeLessThanOrEqual(max);
    }
    expect(dias).toBeGreaterThan(500);
    for (let k = 0; k < 7; k++) expect(conteo.get(masDias(plan.inicio, k)) ?? 0).toBeGreaterThanOrEqual(min - 1);
  });

  it('el primer mes está completo; diciembre es el más alto; enero y febrero los más bajos; el sábado el mejor día', () => {
    const e = construida(A, '21:30');
    const plan = planDe(A);
    const conteo = porDia(e);
    for (let f = plan.inicio; f < masDias(plan.inicio, 28); f = masDias(f, 1))
      if (plan.localesVenta.some((l) => plan.calendario.horario(l, f))) expect(conteo.get(f) ?? 0, f).toBeGreaterThan(0);
    const meses = new Map<string, number>();
    const dias = new Map<number, number>();
    for (const v of Object.values(e.ventas)) {
      if (v.anulacion) continue;
      const mes = v.ts.slice(0, 7);
      if (mes >= A.slice(0, 7)) continue;
      meses.set(mes, (meses.get(mes) ?? 0) + v.total);
      const ds = diaSemana(v.ts.slice(0, 10));
      dias.set(ds, (dias.get(ds) ?? 0) + v.total);
    }
    // Los últimos 12 meses completos.
    const ultimos = [...meses.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-12);
    const orden = [...ultimos].sort((a, b) => b[1] - a[1]);
    expect(orden[0]?.[0].slice(5)).toBe('12');
    expect(orden.slice(-2).map(([m]) => m.slice(5)).sort()).toEqual(['01', '02']);
    const mejor = [...dias.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    expect(mejor).toBe(6);
  });

  it('ninguna venta fuera del horario del local ni después de ahora', () => {
    const ahora = `${A}T21:30:00`;
    const e = construida(A, '21:30');
    const plan = planDe(A);
    for (const v of Object.values(e.ventas)) {
      expect(v.ts <= ahora, v.id).toBe(true);
      const local = plan.local(v.localId);
      const h = local ? plan.calendario.horario(local, v.ts.slice(0, 10)) : null;
      expect(h, v.id).not.toBeNull();
      const m = minutosDeHora(v.ts.slice(11, 16));
      expect(m >= minutosDeHora(h?.abre ?? '00:00') && m < minutosDeHora(h?.cierra ?? '23:59'), `${v.id} ${v.ts}`).toBe(true);
    }
  });
});

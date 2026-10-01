import { describe, expect, it } from 'vitest';
import { ESTADOS_IMPORTACION } from '@/dominio/tipos';
import { diferenciaDias, sumarDias } from '@/dominio/reglas/fechas';
import { AHORA, estadoDe, HOY } from './pruebas/construir';
import { selCatalogo, selNotificaciones, selPendientesConciliar } from './index';

/** Cifras que un cliente escéptico no puede ver como exageradas (docs/qa/cliente.md, puntos 5, 7 y 9). */
const e = estadoDe();

describe('alertas y pendientes creíbles', () => {
  it('las notificaciones sin leer son pocas: las históricas nacen leídas', () => {
    const sinLeer = selNotificaciones(e, { hoy: HOY }).filter((n) => !n.leida);
    expect(sinLeer.length).toBeGreaterThan(0);
    expect(sinLeer.length).toBeLessThanOrEqual(10);
    for (const n of sinLeer) expect(diferenciaDias(n.notificacion.ts.slice(0, 10), HOY)).toBeLessThanOrEqual(7);
  });

  it('la conciliación solo deja pendiente lo de las últimas dos semanas', () => {
    const corte = sumarDias(AHORA.slice(0, 10), -14);
    const pendientes = selPendientesConciliar(e);
    expect(pendientes.length).toBeGreaterThan(0);
    expect(pendientes.length).toBeLessThan(1500);
    for (const p of pendientes) expect(p.ts.slice(0, 10) >= corte, p.ts).toBe(true);
  });

  it('en octubre ninguna referencia de abrigos y chaquetas está agotada del todo en Usaquén', () => {
    const abrigos = selCatalogo(e, { localId: 'usq' }).filter((f) => f.producto.categoria === 'abrigos_chaquetas');
    expect(abrigos.length).toBeGreaterThan(0);
    for (const f of abrigos) expect(f.existencias, f.producto.nombre).toBeGreaterThan(0);
  });
});

describe('línea de tiempo de las importaciones en curso', () => {
  it('los pasos alcanzados traen desfases verosímiles entre la estimada y la real (no todos iguales)', () => {
    const enCurso = Object.values(e.importaciones).filter((i) => i.estado !== 'recibido_bodega' && i.nota !== 'Carga inicial de existencias');
    expect(enCurso.length).toBe(4);
    for (const imp of enCurso) {
      const desfases = ESTADOS_IMPORTACION.filter((s) => imp.hitos[s].real !== null && s !== 'cotizado').map((s) => diferenciaDias(imp.hitos[s].estimada, imp.hitos[s].real as string));
      // Nunca adelantados (con China nada llega antes) ni de más de una semana, y no todos en cero.
      for (const d of desfases) expect(d).toBeGreaterThanOrEqual(0);
      for (const d of desfases) expect(d).toBeLessThanOrEqual(7);
      if (desfases.length >= 4) expect(desfases.some((d) => d > 0)).toBe(true);
    }
  });
});

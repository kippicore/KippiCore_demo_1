import { describe, expect, it } from 'vitest';
import { auditarCoherencia } from '../auditoria/coherencia';
import { construida, ESCALAS_PRUEBA, FECHAS_PRUEBA, HORAS_PRUEBA, olvidar } from './utilidades';

/**
 * coherencia.test.ts (PLAN 7.14): invariantes de 6.19 sobre el estado de la semilla por defecto en las 4 fechas
 * y las 3 horas del día, recorriendo las escalas 0,5, 1 y 1,5 (cada fecha con las tres horas; la escala rota
 * para cubrir las tres en cada fecha y hora sin construir 36 veces). Los cinco agregados de F2-A1 y los cinco de
 * F2-A2 se verifican contra los hechos; 0 comandos generados omitidos; kardex ≥ 0 en orden de aplicación.
 */
const casos = FECHAS_PRUEBA.flatMap((fecha, i) =>
  HORAS_PRUEBA.map((hora, j) => ({ fecha, hora, escala: ESCALAS_PRUEBA[(i + j) % 3] as number })),
);

describe('coherencia del estado generado (6.19)', () => {
  it.each(casos)('$fecha $hora · escala $escala: todos los invariantes en verde', ({ fecha, hora, escala }) => {
    const e = construida(fecha, hora, { escala });
    const ahora = `${fecha}T${hora}:00`;
    const filas = auditarCoherencia(e, ahora);
    const malas = filas.filter((f) => f.violaciones > 0).map((f) => `${f.regla}: ${f.violaciones} (${f.ejemplo})`);
    expect(malas).toEqual([]);
    expect(e.meta.omitidosGenerador).toBe(0);
    // Cada regla revisó algo (no hay invariantes vacíos por error).
    for (const f of filas) expect(f.revisados, f.regla).toBeGreaterThan(0);
    olvidar();
  });

  // Resuelto en F2-B: "comisiones del selector = recálculo" y "KPI de Inicio = suma directa de ventas" viven en
  // src/selectores/selectores.test.ts (el generador no importa selectores, 5.3).
});

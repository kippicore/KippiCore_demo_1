import { describe, expect, it } from 'vitest';
import { PENDIENTES_CALIBRACION } from '../auditoria/calibracion';
import { medirPatrones, type Medicion } from '../auditoria/patrones';
import { construida, FECHAS_PRUEBA, olvidar, planDe } from './utilidades';

/**
 * patrones.test.ts (PLAN 4.7, 7.12, 7.14): P1–P22 con la semilla por defecto en las 4 fechas de prueba, con su
 * tolerancia (±15 % o una condición). Lo ya calibrado se exige; lo pendiente para la pista de calibración queda
 * como `it.todo` explícito con su desviación medida (docs/informes/F2-A2.md). Nada se omite en silencio: cada
 * corrida imprime la tabla completa de desviaciones.
 */

function fila(x: Medicion): string {
  const estado = x.ok ? 'ok   ' : PENDIENTES_CALIBRACION[x.id] ? 'pend.' : 'FUERA';
  return `${estado} ${x.id.padEnd(20)} ${String(x.valor).padStart(12)} ${String(x.objetivo ?? x.rango).padStart(12)} ${x.detalle}`;
}

describe('patrones descubribles P1–P22 (4.7)', () => {
  it.each(FECHAS_PRUEBA)('%s: lo calibrado dentro de tolerancia (y la tabla de desviaciones)', (fecha) => {
    const e = construida(fecha, '15:30');
    const medidas = medirPatrones(e, fecha, planDe(fecha), '15:30');
    // Tabla completa para la pista de calibración (vitest la muestra con --reporter=verbose o en el informe).
    console.info(`Patrones al ${fecha}\n${medidas.map(fila).join('\n')}`);
    const fuera = medidas.filter((x) => !x.ok && !PENDIENTES_CALIBRACION[x.id]).map(fila);
    expect(fuera).toEqual([]);
    expect(medidas.length).toBeGreaterThan(60);
    olvidar();
  });

  for (const [id, desviacion] of Object.entries(PENDIENTES_CALIBRACION))
    it.todo(`${id} pendiente para la pista de calibración: ${desviacion}`);
  // Resuelto en F2-B: "selHallazgos produce al menos 4 frases en cada fecha" en src/selectores/fechas.test.ts.
});

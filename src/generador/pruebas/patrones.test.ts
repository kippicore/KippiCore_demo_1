import { beforeAll, describe, expect, it } from 'vitest';
import { PENDIENTES_CALIBRACION } from '../auditoria/calibracion';
import { medirPatrones, type Medicion } from '../auditoria/patrones';
import { construida, FECHAS_PRUEBA, olvidar, planDe } from './utilidades';

/**
 * patrones.test.ts (PLAN 4.7, 7.12, 7.14): P1–P22 con la semilla por defecto en las 4 fechas de prueba, con su
 * tolerancia (±15 % o una condición). Desde la pista de calibración no queda nada pendiente: cada patrón se exige
 * en las 4 fechas, con una prueba por grupo (así un fallo dice qué patrón y en qué fecha). Cada corrida imprime la
 * tabla completa de desviaciones.
 */

function fila(x: Medicion): string {
  const estado = x.ok ? 'ok   ' : 'FUERA';
  return `${estado} ${x.id.padEnd(20)} ${String(x.valor).padStart(12)} ${String(x.objetivo ?? x.rango).padStart(12)} ${x.detalle}`;
}

const medidas = new Map<string, Medicion[]>();

/** Mediciones fuera de tolerancia de un grupo (prefijo de id) en una fecha. */
function fuera(fecha: string, ...prefijos: string[]): string[] {
  return (medidas.get(fecha) ?? []).filter((x) => prefijos.some((p) => x.id === p || x.id.startsWith(`${p}.`)) && !x.ok).map(fila);
}

function presentes(fecha: string, ...prefijos: string[]): number {
  return (medidas.get(fecha) ?? []).filter((x) => prefijos.some((p) => x.id === p || x.id.startsWith(`${p}.`))).length;
}

describe('patrones descubribles P1–P22 (4.7)', () => {
  beforeAll(() => {
    for (const fecha of FECHAS_PRUEBA) {
      const e = construida(fecha, '15:30');
      const m = medirPatrones(e, fecha, planDe(fecha), '15:30');
      medidas.set(fecha, m);
      console.info(`Patrones al ${fecha}\n${m.map(fila).join('\n')}`);
      olvidar();
    }
  }, 240_000);

  it('no queda nada pendiente para la pista de calibración', () => {
    expect(PENDIENTES_CALIBRACION).toEqual({});
  });

  const grupos: [string, string[]][] = [
    ['escala del negocio (mes típico ≈ $ 330 M)', ['ESC']],
    ['P1 local de ticket alto vs. local de volumen', ['P1']],
    ['P2 vendedora estrella', ['P2']],
    ['P3 y P4 tallas, y la Oxford M que se agota (con N1)', ['P3', 'P4', 'N1']],
    ['P5 calzado dormido frente a la tienda', ['P5']],
    ['P6 exactamente las 5 sin movimiento', ['P6']],
    ['P7 sábado por la tarde (corregido por el tope diario)', ['P7']],
    ['P8 domingo distinto por local', ['P8']],
    ['P9 pagos digitales en ascenso', ['P9']],
    ['P10 comisión del datáfono', ['P10']],
    ['P11 clientes: segmentos, VIP en riesgo y concentración', ['P11']],
    ['P12 colores', ['P12']],
    ['P13 el dólar se come el margen', ['P13']],
    ['P14 fábrica incumplida y comparativo de fábricas', ['P14']],
    ['P15 nómina por local (mes típico)', ['P15']],
    ['P16 llegadas tarde', ['P16']],
    ['P17 separados', ['P17']],
    ['P18 proyección del mes', ['P18']],
    ['P19 punto bajo del flujo', ['P19']],
    ['P20 top 5 del mes', ['P20']],
    ['P21 cierres de caja', ['P21']],
    ['P22 contrato realidad', ['P22']],
  ];

  for (const [nombre, prefijos] of grupos)
    it.each(FECHAS_PRUEBA)(`${nombre} · %s`, (fecha) => {
      expect(presentes(fecha, ...prefijos)).toBeGreaterThan(0);
      expect(fuera(fecha, ...prefijos)).toEqual([]);
    });

  it.each(FECHAS_PRUEBA)('%s: ninguna medición fuera de tolerancia (tabla completa)', (fecha) => {
    const m = medidas.get(fecha) ?? [];
    expect(m.length).toBeGreaterThan(70);
    expect(m.filter((x) => !x.ok).map(fila)).toEqual([]);
  });
  // Resuelto en F2-B: "selHallazgos produce al menos 4 frases en cada fecha" en src/selectores/fechas.test.ts.
});

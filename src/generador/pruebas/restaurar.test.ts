import { describe, expect, it } from 'vitest';
import { generarEstado } from '../fuente';
import { comandosVariados, ejecutar } from './comandos-usuario';
import { huella } from './utilidades';

/**
 * restaurar.test.ts (PLAN 5.6.9, 7.14): restaurar = construcción limpia. Lo que el usuario hizo vive solo en el
 * registro: construir sin registro devuelve exactamente la base, aunque antes se haya construido con cambios.
 */
const A = '2026-09-30';
const AHORA = `${A}T15:30:00`;

describe('restaurar', () => {
  it('construir sin registro después de usar la demo da la construcción limpia', () => {
    const limpia = generarEstado({ ancla: A, ahora: AHORA });
    const conCambios = ejecutar(limpia, comandosVariados(A).slice(0, 8), { inicio: `${A}T15:31:00`, marcaAgua: AHORA });
    expect(conCambios.registro.length).toBe(8);
    const reconstruida = generarEstado({ ancla: A, ahora: AHORA, registro: conCambios.registro });
    expect(huella(reconstruida)).not.toBe(huella(limpia));
    expect(huella(generarEstado({ ancla: A, ahora: AHORA, registro: [] }))).toBe(huella(limpia));
  });

  it.todo('useDatos.restaurar() borra el registro y el ancla y reconstruye con ancla = hoy (F2-B: estado/restaurar)');
});

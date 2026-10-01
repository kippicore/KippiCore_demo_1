import { describe, expect, it } from 'vitest';
import type { EntradaRegistro, EstadoDominio, FechaISO, SobreComando } from '../tipos';
import { aplicarConstruccion } from '../motor/aplicar';
import { aplicarEnVivo } from '../motor/vivo';
import {
  construirSincrono,
  type FuenteGenerada,
  type Intencion,
  marcaAguaNueva,
  ordenarRegistro,
  fusionarRegistros,
} from '../motor/construir';
import { existencia } from '../comandos/tx';
import { abastecer, CHINO_ARENA_32, datosVenta, huella, nuevoEstado, pago, sobre } from './fixtures';

/** Fuente generada mínima para probar el motor sin el generador (F2-A2). */
function fuente(dias: FechaISO[], unidadesVentaMala = 0): FuenteGenerada {
  return {
    dias,
    planificarDia(dia) {
      const r: Intencion[] = [];
      if (dia === dias[0]) r.push({ clave: `abastecer:${dia}`, ts: `${dia}T08:00:00` });
      r.push(
        { clave: `venta:${dia}:1`, ts: `${dia}T10:00:00` },
        { clave: `venta:${dia}:2`, ts: `${dia}T16:00:00` },
      );
      return r;
    },
    *materializar(i): Iterable<SobreComando> {
      const gen = (s: SobreComando): SobreComando => ({
        ...s,
        id: `g:${i.clave}`,
        ts: i.ts,
        marcaAgua: i.ts,
      });
      if (i.clave.startsWith('abastecer')) {
        yield gen(
          sobre(
            'inventario.ajustar',
            {
              movimientoId: 'mv_g_carga',
              varianteId: CHINO_ARENA_32,
              localId: 'usq',
              nuevaCantidad: 50,
              motivo: 'hallazgo',
              nota: null,
            },
            { rol: 'sistema', ts: i.ts },
          ),
        );
        return;
      }
      const id = `vt_g_${i.clave.replace(/[:-]/g, '_')}`;
      const cantidad = unidadesVentaMala && i.clave.endsWith(':2') ? unidadesVentaMala : 1;
      yield gen(
        sobre(
          'venta.registrar',
          datosVenta(id, {
            ts: i.ts,
            lineas: [{ varianteId: CHINO_ARENA_32, cantidad, precioLista: null, descuento: null }],
            pagos: [pago('nequi', 199_900 * cantidad)],
          }),
          { rol: 'sistema', ts: i.ts },
        ),
      );
    },
  };
}

const DIAS = ['2026-09-28', '2026-09-29', '2026-09-30'];

function entrada(id: string, seq: number, marcaAgua: string, ts: string, s: SobreComando): EntradaRegistro {
  return { ...s, id, seq, marcaAgua, ts };
}

describe('motor en vivo con Immer (D11)', () => {
  it('copia estructural: solo cambian las tablas tocadas y el estado anterior queda igual', () => {
    const antes = nuevoEstado();
    abastecer(antes, CHINO_ARENA_32, 'usq', 3);
    const huellaAntes = huella(antes);
    const r = aplicarEnVivo(
      antes,
      sobre('venta.registrar', datosVenta('vt_1', { pagos: [pago('nequi', 199_900)] })),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(huella(antes)).toBe(huellaAntes);
    expect(r.despues).not.toBe(antes);
    expect(r.despues.ventas).not.toBe(antes.ventas);
    expect(r.despues.empleados).toBe(antes.empleados);
    expect(r.despues.productos).toBe(antes.productos);
    expect(existencia(r.despues, CHINO_ARENA_32, 'usq')).toBe(2);
    expect(r.eventos.map((e) => e.tipo)).toContain('VentaRegistrada');
    const malo = aplicarEnVivo(r.despues, sobre('venta.registrar', datosVenta('vt_1')));
    expect(malo).toMatchObject({ ok: false, error: { codigo: 'ID_DUPLICADO' } });
  });

  it('el mismo comando da el mismo estado en modo construcción y en vivo', () => {
    const a = nuevoEstado();
    abastecer(a, CHINO_ARENA_32, 'usq', 3);
    const b: EstadoDominio = structuredClone(a);
    const s = sobre(
      'venta.registrar',
      datosVenta('vt_1', { clienteId: 'cl_andres_gutierrez', pagos: [pago('transferencia', 199_900)] }),
    );
    expect(aplicarConstruccion(a, s).ok).toBe(true);
    const r = aplicarEnVivo(b, s);
    expect(r.ok && huella(r.despues)).toBe(huella(a));
  });
});

describe('construcción con marca de agua (5.6.4)', () => {
  it('intercala los comandos del usuario por marca de agua en el orden total', () => {
    const usuario = sobre(
      'venta.registrar',
      datosVenta('vt_usuario', { ts: null, pagos: [pago('nequi', 199_900)] }),
    );
    const registro = [entrada('en_1', 1, '2026-09-29T12:00:00', '2026-09-29T17:30:00', usuario)];
    const e = construirSincrono({
      estado: nuevoEstado(),
      fuente: fuente(DIAS),
      ahora: '2026-09-30T12:00:00',
      registro,
    });
    expect(e.meta.omitidosGenerador).toBe(0);
    expect(e.meta.omitidosUsuario).toEqual([]);
    // 28: 10:00 y 16:00 → V1, V2; 29: 10:00 → V3; usuario (marca 12:00) → V4; 16:00 → V5; 30: 10:00 → V6; 16:00 aún no ocurre.
    expect(e.ventas.vt_usuario?.numero).toBe('V-000004');
    expect(e.ventas.vt_g_venta_2026_09_29_2?.numero).toBe('V-000005');
    expect(e.ventas.vt_g_venta_2026_09_30_2).toBeUndefined();
    expect(Object.keys(e.ventas)).toHaveLength(6);
    expect(e.meta.generadoHasta).toBe('2026-09-30T12:00:00');
    expect(existencia(e, CHINO_ARENA_32, 'usq')).toBe(44);
  });

  it('es determinista y reaplica exacto lo que el usuario hizo en vivo', () => {
    const ahora = '2026-09-30T12:00:00';
    const base = construirSincrono({ estado: nuevoEstado(), fuente: fuente(DIAS), ahora, registro: [] });
    const otra = construirSincrono({ estado: nuevoEstado(), fuente: fuente(DIAS), ahora, registro: [] });
    expect(huella(otra)).toBe(huella(base));
    const s = sobre('venta.registrar', datosVenta('vt_vivo', { pagos: [pago('nequi', 199_900)] }), {
      ts: '2026-09-30T12:05:00',
    });
    const en: EntradaRegistro = { ...s, marcaAgua: marcaAguaNueva(base.meta.generadoHasta, []), seq: 1 };
    const vivo = aplicarEnVivo(base, en);
    expect(vivo.ok).toBe(true);
    if (!vivo.ok) return;
    const reconstruido = construirSincrono({
      estado: nuevoEstado(),
      fuente: fuente(DIAS),
      ahora,
      registro: [en],
    });
    expect(huella(reconstruido)).toBe(huella(vivo.despues));
  });

  it('cuenta los omitidos del generador y del usuario sin dejar estados a medias', () => {
    const malo = sobre(
      'venta.registrar',
      datosVenta('vt_malo', {
        lineas: [{ varianteId: CHINO_ARENA_32, cantidad: 999, precioLista: null, descuento: null }],
        pagos: [pago('nequi', 199_900 * 999)],
      }),
    );
    const e = construirSincrono({
      estado: nuevoEstado(),
      fuente: fuente(DIAS, 500),
      ahora: '2026-09-30T23:00:00',
      registro: [entrada('en_malo', 1, '2026-09-29T00:00:00', '2026-09-29T00:00:00', malo)],
    });
    expect(e.meta.omitidosGenerador).toBe(3);
    expect(e.meta.omitidosUsuario).toEqual([
      { entradaId: 'en_malo', motivo: expect.stringContaining('supera') },
    ]);
    let suma = 0;
    for (const m of e.movimientos)
      if (m.varianteId === CHINO_ARENA_32 && m.localId === 'usq') suma += m.cantidad;
    expect(existencia(e, CHINO_ARENA_32, 'usq')).toBe(suma);
  });

  it('orden total (marcaAgua, ts, seq, id), marca de agua monótona y fusión por id', () => {
    const s = sobre('cliente.nota', { notaId: 'n', clienteId: 'cl_andres_gutierrez', texto: 'x' });
    const a = entrada('b', 2, '2026-09-30T10:00:00', '2026-09-30T11:00:00', s);
    const b = entrada('a', 1, '2026-09-30T10:00:00', '2026-09-30T11:00:00', s);
    const c = entrada('c', 9, '2026-09-30T09:00:00', '2026-09-30T18:00:00', s);
    expect(ordenarRegistro([a, b, c]).map((x) => x.id)).toEqual(['c', 'a', 'b']);
    expect(marcaAguaNueva('2026-09-30T08:00:00', [a, c])).toBe('2026-09-30T10:00:00');
    expect(marcaAguaNueva('2026-09-30T15:00:00', [a, c])).toBe('2026-09-30T15:00:00');
    expect(fusionarRegistros([a, c], [b, a]).map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });
});

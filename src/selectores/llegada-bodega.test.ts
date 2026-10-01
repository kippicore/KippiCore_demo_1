import { describe, expect, it } from 'vitest';
import { hitosAlCambiarEstado, llegadaABodega } from '@/dominio/reglas/importaciones';
import { fechaCorta } from './texto';
import { estadoDe, HOY } from './pruebas/construir';
import { selAvisosEstado, selEnCaminoPorVariante, selEventosCalendario, selImportaciones } from './index';

/** La llegada de IMP-2026-07 a bodega sale de una sola función: todas las pantallas dicen la misma fecha. */
const e = estadoDe();
const imp = Object.values(e.importaciones).find((i) => i.numero === 'IMP-2026-07')!;
const L = llegadaABodega(imp);

describe('una sola fecha de llegada a bodega', () => {
  it('ficha, tablero, "En camino" y calendario coinciden', () => {
    const fila = selImportaciones(e, { hoy: HOY }).find((f) => f.importacion.id === imp.id)!;
    expect(fila.llegadaEstimada).toBe(L);
    const camino = Object.values(selEnCaminoPorVariante(e)).filter((c) => c.numero === imp.numero);
    expect(camino.length).toBeGreaterThan(0);
    for (const c of camino) expect(c.fechaEstimada).toBe(L);
    const evs = selEventosCalendario(e, { desde: HOY, hasta: '2026-12-31' });
    const ev = evs.find((x) => x.id === `imp:${imp.id}`);
    expect(ev?.inicio.slice(0, 10)).toBe(L);
  });

  it('el aviso a bodega dice la fecha que quedará guardada al cambiar el estado (no la de antes del cambio)', () => {
    const antes = llegadaABodega(imp);
    const fecha = '2026-09-28';
    const proyectada = llegadaABodega({ hitos: hitosAlCambiarEstado(imp, 'en_nacionalizacion', fecha) });
    expect(proyectada).not.toBe(antes);
    const av = selAvisosEstado(e, { importacionId: imp.id, estado: 'en_nacionalizacion', marca: 'HALDEN', fecha });
    const bodega = av?.destinatarios.find((d) => d.tipo === 'bodega');
    expect(bodega?.texto).toContain(fechaCorta(proyectada));
    expect(bodega?.texto).not.toContain(fechaCorta(antes));
  });
});

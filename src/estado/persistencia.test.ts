import { beforeEach, describe, expect, it } from 'vitest';
import type { EntradaRegistro } from '@/dominio/tipos';
import { DEMO } from '@/config/demo';
import { reiniciarAlmacenParaPruebas } from './almacen';
import { cargar, guardarRegistro, leerRegistro } from './persistencia';
import { fijarOverrideParaPruebas } from './reloj';

/** Ancla y registro (5.6.3, 5.6.5): primera visita, renovación a los 7 días sin cambios, fusión por id, QA aparte. */
class AlmacenFalso {
  datos = new Map<string, string>();
  getItem(k: string) {
    return this.datos.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.datos.set(k, v);
  }
  removeItem(k: string) {
    this.datos.delete(k);
  }
}

const entrada = (id: string, marcaAgua: string, seq: number): EntradaRegistro => ({
  id,
  ts: marcaAgua,
  marcaAgua,
  usuarioId: 'u_dueno',
  rol: 'dueno',
  origen: 'usuario',
  seq,
  comando: { tipo: 'cliente.nota', datos: { notaId: `nc_${id}`, clienteId: 'cl_andres_gutierrez', texto: 'Hola' } },
});

let ls: AlmacenFalso;
beforeEach(() => {
  ls = new AlmacenFalso();
  (globalThis as unknown as { localStorage: AlmacenFalso }).localStorage = ls;
  reiniciarAlmacenParaPruebas();
});

describe('persistencia', () => {
  it('QA (?hoy=): ancla = fecha de ?hoy= y claves kc:halden:v1:qa:*', () => {
    fijarOverrideParaPruebas('2026-12-19T16:30');
    const c = cargar();
    expect(c.ancla).toBe('2026-12-19');
    expect([...ls.datos.keys()]).toContain(`kc:${DEMO.claveAlmacenamiento}:v1:qa:ancla`);
    guardarRegistro(c.ancla, [entrada('a', '2026-12-19T16:30:00', 1)]);
    // Otra pestaña agregó una entrada: guardar fusiona por id.
    const otra = guardarRegistro(c.ancla, [entrada('b', '2026-12-19T16:31:00', 1)]);
    expect(otra.map((x) => x.id).sort()).toEqual(['a', 'b']);
    expect(leerRegistro(c.ancla).length).toBe(2);
  });

  it('sin ?hoy=: el ancla se fija en la primera visita y se renueva sola tras 7 días si no hay registro', () => {
    fijarOverrideParaPruebas(null);
    const primera = cargar();
    expect(primera.ancla).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Simular un ancla vieja sin registro.
    ls.setItem(`kc:${DEMO.claveAlmacenamiento}:v1:ancla`, JSON.stringify({ ancla: '2020-01-01', fijadaEn: '2020-01-01' }));
    reiniciarAlmacenParaPruebas();
    const renovada = cargar();
    expect(renovada.renovada).toBe(true);
    expect(renovada.ancla).not.toBe('2020-01-01');
    // Con registro se conserva.
    ls.setItem(`kc:${DEMO.claveAlmacenamiento}:v1:ancla`, JSON.stringify({ ancla: '2020-01-01', fijadaEn: '2020-01-01' }));
    ls.setItem(
      `kc:${DEMO.claveAlmacenamiento}:v1:registro`,
      JSON.stringify({ version: DEMO.versionRegistro, versionGenerador: DEMO.versionGenerador, semilla: DEMO.semilla, ancla: '2020-01-01', entradas: [entrada('x', '2020-01-01T12:00:00', 1)] }),
    );
    reiniciarAlmacenParaPruebas();
    const conservada = cargar();
    expect(conservada.ancla).toBe('2020-01-01');
    expect(conservada.entradas.length).toBe(1);
  });

  it('un cambio de versión del generador descarta solo las entradas que tocan entidades generadas', () => {
    fijarOverrideParaPruebas('2026-09-30T15:30');
    const propia = entrada('p', '2026-09-30T15:30:00', 1);
    const sobreGenerada: EntradaRegistro = { ...entrada('g', '2026-09-30T15:30:00', 2), comando: { tipo: 'venta.anular', datos: { ventaId: 'vt_g_20260930_usq_001', motivo: 'x', reembolso: null, notaCreditoId: null, solicitudId: null } } };
    ls.setItem(
      `kc:${DEMO.claveAlmacenamiento}:v1:qa:registro`,
      JSON.stringify({ version: DEMO.versionRegistro, versionGenerador: DEMO.versionGenerador + 1, semilla: DEMO.semilla, ancla: '2026-09-30', entradas: [propia, sobreGenerada] }),
    );
    const c = cargar();
    expect(c.entradas.map((x) => x.id)).toEqual(['p']);
    expect(c.avisos[0]).toContain('1 cambio');
  });

  it('localStorage bloqueado: modo memoria sin errores', () => {
    (globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    };
    reiniciarAlmacenParaPruebas();
    fijarOverrideParaPruebas('2026-09-30T15:30');
    const c = cargar();
    expect(c.ancla).toBe('2026-09-30');
    guardarRegistro(c.ancla, [entrada('m', '2026-09-30T15:30:00', 1)]);
    expect(leerRegistro(c.ancla).map((x) => x.id)).toEqual(['m']);
  });
});

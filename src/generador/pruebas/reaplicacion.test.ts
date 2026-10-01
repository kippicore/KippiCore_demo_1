import { describe, expect, it } from 'vitest';
import { marcaAguaNueva, fusionarRegistros } from '@/dominio/motor/construir';
import { sumarDias } from '@/dominio/reglas/fechas';
import { auditarCoherencia } from '../auditoria/coherencia';
import { generarEstado } from '../fuente';
import { comandosVariados, datosCliente, ejecutar, paso } from './comandos-usuario';
import { huella, idPrueba } from './utilidades';

/**
 * reaplicacion.test.ts (PLAN 5.6.4, 7.14): construir → 30 comandos en vivo (Immer) → reconstruir desde el
 * registro ⇒ estado idéntico. Más tarde el mismo día y al día siguiente, todos los comandos del usuario siguen
 * aplicados y los invariantes se mantienen. Dos pestañas con distinto `generadoHasta`: marca de agua monótona y
 * reconstrucción idéntica a lo que vio la última pestaña.
 */
const A = '2026-09-30';
const AHORA = `${A}T15:30:00`;

describe('reaplicación del registro', () => {
  const base = generarEstado({ ancla: A, ahora: AHORA });
  const vivo = ejecutar(base, comandosVariados(A), { inicio: `${A}T15:31:00`, marcaAgua: AHORA });

  it('los 30 comandos variados se aplican en vivo sin errores', () => {
    expect(vivo.errores).toEqual([]);
    expect(vivo.registro).toHaveLength(30);
    expect(new Set(vivo.registro.map((r) => r.comando.tipo)).size).toBeGreaterThanOrEqual(20);
  });

  it('reconstruir con el registro a la misma hora da el mismo estado', () => {
    const reconstruido = generarEstado({ ancla: A, ahora: AHORA, registro: vivo.registro });
    expect(reconstruido.meta.omitidosUsuario).toEqual([]);
    expect(huella(reconstruido)).toBe(huella(vivo.estado));
  });

  it.each([
    ['más tarde el mismo día', `${A}T21:30:00`],
    ['al día siguiente', `${sumarDias(A, 1)}T15:30:00`],
  ])('%s: los comandos del usuario siguen aplicados y los invariantes en verde', (_, ahora) => {
    const e = generarEstado({ ancla: A, ahora, registro: vivo.registro });
    expect(e.meta.omitidosUsuario).toEqual([]);
    expect(e.meta.omitidosGenerador).toBe(0);
    for (const r of vivo.registro) {
      if (r.comando.tipo === 'venta.registrar') expect(e.ventas[r.comando.datos.ventaId]).toBeDefined();
      if (r.comando.tipo === 'cliente.crear') expect(e.clientes[r.comando.datos.clienteId]).toBeDefined();
    }
    const malas = auditarCoherencia(e, ahora).filter((x) => x.violaciones > 0);
    expect(malas.map((x) => `${x.regla} ${x.ejemplo}`)).toEqual([]);
  });

  it('dos pestañas: la marca de agua es monótona y la reconstrucción coincide con la pestaña que escribió último', () => {
    // Pestaña A abierta a las 10:00: registra un cliente.
    const tA = `${A}T10:00:00`;
    const estadoA = generarEstado({ ancla: A, ahora: tA });
    const mA = marcaAguaNueva(tA, []);
    const clienteA = idPrueba('cl');
    const a = ejecutar(estadoA, [() => paso('cliente.crear', { clienteId: clienteA, datos: datosCliente('Tomás', '3009997766', `${A}T10:05:00`) })], {
      inicio: `${A}T10:05:00`,
      marcaAgua: mA,
    });
    expect(a.errores).toEqual([]);
    // Pestaña B (el portal) abierta a las 15:00 con el registro de A: registra un gasto. Su marca es ≥ la de A.
    const tB = `${A}T15:00:00`;
    const estadoB = generarEstado({ ancla: A, ahora: tB, registro: a.registro });
    const mB = marcaAguaNueva(tB, a.registro);
    expect(mB >= mA).toBe(true);
    const b = ejecutar(
      estadoB,
      [() => paso('gasto.registrar', { gastoId: idPrueba('gs'), datos: { fecha: A, localId: 'p93', categoria: 'otros', concepto: 'Tinto para clientes', valor: 45_000, iva: 0, proveedorId: null, soporte: null, documento: null }, pago: { tipo: 'inmediato', cuentaId: 'cta_corriente', medio: 'transferencia' } })],
      { inicio: `${A}T15:05:00`, marcaAgua: mB, seq: 1 },
    );
    expect(b.errores).toEqual([]);
    // Pestaña A vuelve a escribir con su generadoHasta viejo: la marca no retrocede.
    const mA2 = marcaAguaNueva(tA, [...a.registro, ...b.registro]);
    expect(mA2).toBe(mB);
    // Reconstrucción con el registro fusionado (en cualquier orden) = lo que ve la pestaña B.
    const fusionado = fusionarRegistros(b.registro, a.registro);
    const reconstruido = generarEstado({ ancla: A, ahora: tB, registro: fusionado });
    expect(reconstruido.meta.omitidosUsuario).toEqual([]);
    expect(huella(reconstruido)).toBe(huella(b.estado));
    expect(huella(generarEstado({ ancla: A, ahora: tB, registro: fusionarRegistros(a.registro, b.registro) }))).toBe(huella(reconstruido));
  });
});

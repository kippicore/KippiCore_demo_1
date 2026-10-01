import { describe, expect, it } from 'vitest';
import { esEan13Valido } from '../reglas/ean13';
import { nuevoEstado } from './fixtures';

describe('estado inicial (7.4)', () => {
  const e = nuevoEstado();
  it('ventana de 18 meses y víspera como generadoHasta', () => {
    expect(e.meta.inicioVentana).toBe('2025-03-01');
    expect(e.meta.generadoHasta).toBe('2025-02-28T00:00:00');
  });
  it('catálogo completo con SKU y EAN-13 válidos y únicos', () => {
    const variantes = Object.values(e.variantes);
    expect(Object.keys(e.productos)).toHaveLength(85);
    expect(variantes).toHaveLength(883);
    expect(new Set(variantes.map((v) => v.ean13)).size).toBe(883);
    expect(new Set(variantes.map((v) => v.sku)).size).toBe(883);
    for (const v of variantes) expect(esEan13Valido(v.ean13)).toBe(true);
    expect(e.variantes.va_cam_0142_azc_m?.sku).toBe('HL-CAM-0142-AZC-M');
    expect(e.meta.consecutivos.variante).toBe(883);
  });
  it('elenco, cuentas con saldo inicial y sin inventario (I5)', () => {
    expect(Object.keys(e.empleados)).toHaveLength(14);
    expect(e.empleados.em_srojas?.fechaIngreso).toBe('2026-04-02');
    expect(e.agregados.saldosCuentas.cta_corriente).toBe(95_000_000);
    expect(e.movimientos).toHaveLength(0);
    expect(Object.keys(e.agregados.existencias)).toHaveLength(0);
    expect(e.proveedores.pr_huameng?.contactoIds).toEqual(['co_lily_chen']);
  });
  it('clientes con guion, campañas y la cita del sábado', () => {
    expect(e.clientes.cl_ricardo_penuela?.cumpleanos).toBe('09-30');
    expect(e.eventos.ev_cita_medidas_penuela?.inicio).toBe('2026-10-03T11:00:00');
    expect(e.eventos['ev_campana_black-friday_2026']?.inicio).toBe('2026-11-27T00:00:00');
    expect(e.eventos['ev_campana_preventa-bf_2026']?.inicio).toBe('2026-11-11T00:00:00');
    expect(e.eventos['ev_campana_amor-amistad_2026']).toBeDefined();
  });
  it('es plano y serializable', () => {
    expect(JSON.parse(JSON.stringify(e))).toEqual(e);
  });
});

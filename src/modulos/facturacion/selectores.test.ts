import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { activarVerificacionDeTablas } from '@/selectores';
import { estadoDe, HOY } from '@/selectores/pruebas/construir';
import { resumirDocumentos } from './calculos';
import { selDocumentos, selResoluciones, selVentasSinDocumento, selVistaFactura, selVistaNota } from './selectores';

beforeAll(() => activarVerificacionDeTablas(true));
afterAll(() => activarVerificacionDeTablas(false));

describe('selectores de Facturación (estado de 18 meses)', () => {
  it('lista todas las facturas y notas crédito, la más reciente primero', () => {
    const e = estadoDe();
    const filas = selDocumentos(e);
    expect(filas).toHaveLength(Object.keys(e.facturas).length + Object.keys(e.notasCredito).length);
    for (let i = 1; i < filas.length; i++) expect(filas[i - 1]!.ts >= filas[i]!.ts).toBe(true);
    expect(filas.some((f) => f.clase === 'factura')).toBe(true);
    expect(filas.some((f) => f.clase === 'pos')).toBe(true);
    expect(filas.some((f) => f.clase === 'nota')).toBe(true);
  });

  it('el resumen cuadra con las tablas del dominio', () => {
    const e = estadoDe();
    const r = resumirDocumentos(selDocumentos(e));
    const facturado = Object.values(e.facturas).reduce((s, f) => s + f.total, 0);
    const acreditado = Object.values(e.notasCredito).reduce((s, n) => s + n.valor, 0);
    expect(r.facturado).toBe(facturado);
    expect(r.acreditado).toBe(acreditado);
    expect(r.neto).toBe(facturado - acreditado);
  });

  it('cada nota apunta a su factura y cada fila de factura sabe cuánto se acreditó', () => {
    const e = estadoDe();
    const filas = selDocumentos(e);
    const nota = filas.find((f) => f.clase === 'nota')!;
    expect(nota.afecta?.id).toBeTruthy();
    const original = filas.find((f) => f.id === nota.afecta!.id)!;
    expect(original.acreditado).toBeGreaterThanOrEqual(nota.total);
  });

  it('la vista de una factura trae líneas que suman el total, resolución y empresa', () => {
    const e = estadoDe();
    const f = Object.values(e.facturas).find((x) => x.tipo === 'factura_electronica')!;
    const v = selVistaFactura(e, { facturaId: f.id })!;
    expect(v.factura.id).toBe(f.id);
    expect(v.resolucion?.prefijo).toBe('HAL-FE');
    expect(v.lineas.reduce((s, l) => s + l.total, 0)).toBe(f.total);
    expect(v.saldo).toBe(f.total - v.acreditado);
    expect(v.empresa.nit).toBeTruthy();
    expect(selVistaFactura(e, { facturaId: 'no-existe' })).toBeNull();
  });

  it('la vista de una nota trae el documento que afecta y las prendas devueltas', () => {
    const e = estadoDe();
    const n = Object.values(e.notasCredito).find((x) => x.devolucionId)!;
    const v = selVistaNota(e, { notaId: n.id })!;
    expect(v.factura?.id).toBe(n.facturaId);
    expect(v.lineas.length).toBeGreaterThan(0);
    expect(v.lineas.reduce((s, l) => s + l.total, 0)).toBe(n.valor);
    expect(selVistaNota(e, { notaId: 'no-existe' })).toBeNull();
  });

  it('las resoluciones traen su siguiente consecutivo', () => {
    const e = estadoDe();
    const usos = selResoluciones(e, { hoy: HOY });
    expect(usos.map((u) => u.resolucion.prefijo)).toEqual(['HAL-FE', 'HAL-POS']);
    for (const u of usos) {
      expect(u.vigente).toBe(true);
      expect(u.siguiente).toBeGreaterThan(u.ultimo);
      expect(u.restantes).toBeGreaterThan(0);
    }
  });

  it('las ventas sin documento no incluyen anuladas ni ventas con factura, y se buscan por número', () => {
    const e = estadoDe();
    const { filas, total } = selVentasSinDocumento(e, { limite: 5 });
    expect(filas.length).toBeLessThanOrEqual(5);
    expect(total).toBeGreaterThanOrEqual(filas.length);
    for (const f of filas) {
      const v = e.ventas[f.id]!;
      expect(v.facturaId).toBeNull();
      expect(v.anulacion).toBeNull();
    }
    const una = filas[0]!;
    const buscada = selVentasSinDocumento(e, { texto: una.numero.toLowerCase() });
    expect(buscada.filas.map((x) => x.id)).toContain(una.id);
  });

  it('el vendedor solo ve las ventas sin documento que hizo él', () => {
    const e = estadoDe();
    const vendedorId = e.ventas[selVentasSinDocumento(e, { limite: 1 }).filas[0]!.id]!.vendedorId;
    const { filas } = selVentasSinDocumento(e, { vendedorId, limite: 20 });
    expect(filas.length).toBeGreaterThan(0);
    for (const f of filas) expect(e.ventas[f.id]!.vendedorId).toBe(vendedorId);
  });
});

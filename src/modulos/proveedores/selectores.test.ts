import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { activarVerificacionDeTablas, selComparativoFabricas, selFichaProveedor, selProveedores } from '@/selectores';
import { estadoDe, HOY } from '@/selectores/pruebas/construir';
import { hallazgosComparativo, resumenEntregas } from './calculos';
import { selComparativo, selContactosProveedor, selDirectorio, selEntregas, selPagosProveedor, selVistaPorLocal } from './selectores';

beforeAll(() => activarVerificacionDeTablas(true));
afterAll(() => activarVerificacionDeTablas(false));

describe('selectores de Proveedores (estado de 18 meses)', () => {
  const e = estadoDe();

  it('el directorio trae a las 5 fábricas y a los 10 proveedores locales con el saldo de selProveedores', () => {
    const filas = selDirectorio(e, { hoy: HOY });
    expect(filas.filter((f) => f.proveedor.tipo === 'fabrica')).toHaveLength(5);
    expect(filas.filter((f) => f.proveedor.tipo === 'local')).toHaveLength(10);
    const base = selProveedores(e, { hoy: HOY });
    for (const f of filas) {
      const b = base.find((x) => x.proveedor.id === f.proveedor.id);
      expect(f.saldoCop).toBe(b?.saldoCop);
      expect(f.pedidos).toBe(b?.pedidos);
      expect(f.totalComprado).toBe(selFichaProveedor(e, { proveedorId: f.proveedor.id, hoy: HOY })?.totalComprado);
      expect(f.vencidoCop).toBeLessThanOrEqual(f.saldoCop);
    }
  });

  it('las entregas por pedido reproducen el comparativo de P14 (retraso, a tiempo, defectos, pedidos)', () => {
    for (const c of selComparativoFabricas(e, { hoy: HOY })) {
      const r = resumenEntregas(selEntregas(e, { proveedorId: c.proveedorId }));
      expect(r.pedidos).toBe(c.pedidosRecibidos);
      expect(r.retrasoPromedio ?? null).toBeCloseTo(c.retrasoPromedio ?? 0, 9);
      expect(r.aTiempo ?? null).toBeCloseTo(c.aTiempo ?? 0, 9);
      expect(r.defectos ?? null).toBeCloseTo(c.defectos ?? 0, 9);
    }
  });

  it('el comparativo enriquecido conserva las cifras del selector compartido y agrega veredicto', () => {
    const filas = selComparativo(e, { hoy: HOY });
    const base = selComparativoFabricas(e, { hoy: HOY });
    expect(filas.map((f) => f.proveedorId)).toEqual(base.map((b) => b.proveedorId));
    for (const f of filas) {
      const b = base.find((x) => x.proveedorId === f.proveedorId);
      expect(f.costoPromedioUnidad).toBe(b?.costoPromedioUnidad);
      expect(f.entregas).toHaveLength(f.pedidosRecibidos);
      expect(['confiable', 'reservas', 'incumple', 'sin_datos']).toContain(f.veredicto);
    }
  });

  it('el comparativo revela un patrón: al menos una fábrica llega tarde y el hallazgo la nombra', () => {
    const filas = selComparativo(e, { hoy: HOY });
    const h = hallazgosComparativo(filas);
    expect(h.masTarde).not.toBeNull();
    expect(h.titular).toContain(h.masTarde?.nombre ?? '#');
  });

  it('la vista por local trae a los tres locales, cada uno con su arrendador y su arriendo', () => {
    const v = selVistaPorLocal(e, { hoy: HOY });
    expect(v.map((x) => x.local.id)).toEqual(['p93', 'usq', 'zr']);
    for (const x of v) {
      expect(x.arrendadores).toHaveLength(1);
      expect(x.canon ?? 0).toBeGreaterThan(0);
      expect(x.arriendo12m).toBeGreaterThan(0);
      expect(x.estadoArriendo).not.toBeNull();
    }
  });

  it('contactos y pagos de un proveedor', () => {
    expect(selContactosProveedor(e, { proveedorId: 'pr_weiye' }).map((c) => c.nombre)).toEqual(['Kevin Wang']);
    expect(selContactosProveedor(e, { proveedorId: 'pr_arr_usq' })).toEqual([]);
    const p = selPagosProveedor(e, { proveedorId: 'pr_arr_usq', limite: 5 });
    expect(p.filas).toHaveLength(5);
    expect(p.cantidad).toBeGreaterThan(5);
    expect(p.total).toBe(selFichaProveedor(e, { proveedorId: 'pr_arr_usq', hoy: HOY })?.totalComprado);
    expect(p.ultimo).toBe(p.filas[0]?.fecha);
  });
});

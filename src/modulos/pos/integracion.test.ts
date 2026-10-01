import { beforeAll, describe, expect, it } from 'vitest';
import type { EstadoDominio, Id } from '@/dominio/tipos';
import { aplicarEnVivo } from '@/dominio/motor/vivo';
import { CHINO_ARENA_32, datosVenta, pago, sobre } from '@/dominio/pruebas/fixtures';
import {
  activarVerificacionDeTablas,
  existencia,
  selBonos,
  selNarrativa,
  selResumenSesion,
  selSesionAbierta,
} from '@/selectores';
import { AHORA, estadoDe, HOY } from '@/selectores/pruebas/construir';
import { totalesCarrito } from './calculos';
import { efectosPos } from './efectos';
import { selBonoPorCodigo, selCierresRecientes, selDestacadosPos, selSolicitudesDescuento, selVendedoresPos } from './selectores';

/**
 * A1 sobre el estado de 18 meses (ancla de QA): W1 exacto (los efectos de una venta son antes → después medidos con
 * los mismos selectores), W11 (cierres) y los selectores locales con la verificación de tablas activa.
 */
let e: EstadoDominio;
const AHORA_VENTA = '2026-09-30T15:30:00';

beforeAll(() => {
  activarVerificacionDeTablas(true);
  e = estadoDe();
});

function registrarW1(rol: 'dueno' | 'vendedor') {
  const n = selNarrativa(e, { hoy: HOY });
  const datos = datosVenta('vt_a1_w1', {
    clienteId: n.clienteFrecuente,
    pagos: [pago('efectivo', 100_000, { recibido: 100_000 }), pago('nequi', 99_900)],
  });
  const r = aplicarEnVivo(e, sobre('venta.registrar', datos, { rol, ts: AHORA_VENTA }));
  if (!r.ok) throw new Error(r.error.mensaje);
  return r;
}

describe('W1: lo que acaba de pasar', () => {
  it('el dueño ve cinco efectos exactos: inventario, ventas de hoy, comisión, cliente y caja', () => {
    const r = registrarW1('dueno');
    const efectos = efectosPos(r.antes, r.despues, 'vt_a1_w1', { soloLocal: false });
    const por = (c: string) => efectos.find((x) => x.clave === c);

    const inv = por('inventario');
    expect(inv?.antes).toBe(existencia(e, CHINO_ARENA_32, 'usq'));
    expect(inv?.despues).toBe((inv?.antes ?? 0) - 1);

    const ventas = por('ventas_hoy');
    expect((ventas?.despues ?? 0) - (ventas?.antes ?? 0)).toBe(199_900);
    expect(ventas?.enlace).toContain('resaltar=vt_a1_w1');

    const comision = por('comision');
    expect(comision?.despues).toBeGreaterThan(comision?.antes ?? 0);
    expect(comision?.detalle).toBe('sobre la venta sin IVA');

    const cliente = por('cliente');
    expect((cliente?.despues ?? 0) - (cliente?.antes ?? 0)).toBe(1);

    const caja = por('caja');
    expect(caja?.porMedio).toEqual([
      { medio: 'efectivo', valor: 100_000 },
      { medio: 'nequi', valor: 99_900 },
    ]);
    expect((caja?.despues ?? 0) - (caja?.antes ?? 0)).toBe(100_000);
    expect(caja?.mostrarAntesDespues).toBe(true);
    expect(caja?.enlace).toContain('/panel/pos/caja');
  });

  it('el vendedor ve solo lo de su local y nunca el efectivo esperado de la caja (arqueo ciego)', () => {
    const r = registrarW1('vendedor');
    const efectos = efectosPos(r.antes, r.despues, 'vt_a1_w1', { soloLocal: true });
    expect(efectos.some((x) => x.clave === 'ventas_hoy')).toBe(false);
    expect(efectos.some((x) => x.clave === 'ventas_hoy_local')).toBe(true);
    const caja = efectos.find((x) => x.clave === 'caja');
    expect(caja?.mostrarAntesDespues).toBe(false);
    expect(caja?.porMedio?.map((m) => m.medio)).toEqual(['efectivo', 'nequi']);
  });

  it('los totales del carrito son idénticos a los que guarda el motor (V1)', () => {
    const r = registrarW1('dueno');
    const v = r.despues.ventas.vt_a1_w1!;
    const t = totalesCarrito([{ clave: 'l1', varianteId: CHINO_ARENA_32, cantidad: 1, precioLista: 199_900, tarifaIva: r.despues.productos[v.lineas[0]!.productoId]!.tarifaIva, descuento: null }], null);
    expect({ total: t.total, base: t.base, iva: t.iva }).toEqual({ total: v.total, base: v.base, iva: v.iva });
    expect(r.eventos.map((x) => x.tipo)).toContain('VentaRegistrada');
  });
});

describe('selectores locales', () => {
  it('vendedor de turno: el de turno ahora va por defecto y la lista se agrupa por turno', () => {
    const r = selVendedoresPos(e, { localId: 'usq', fecha: HOY, hhmm: '15:30' });
    expect(r.porDefecto).toBe('em_scardenas');
    expect(r.vendedores[0]).toMatchObject({ empleadoId: 'em_scardenas', enTurno: true });
    expect(r.vendedores[0]?.turno).toEqual({ inicio: '12:00', fin: '20:00' });
    expect(r.vendedores.every((v) => ['em_scardenas', 'em_dmoreno'].includes(v.empleadoId) || e.empleados[v.empleadoId]?.cargo === 'vendedor')).toBe(true);
    // Antes de abrir, sigue siendo el más cercano.
    expect(selVendedoresPos(e, { localId: 'usq', fecha: HOY, hhmm: '08:00' }).porDefecto).toBe('em_scardenas');
  });

  it('más vendidos del local: solo con existencias y de mayor a menor', () => {
    const r = selDestacadosPos(e, { localId: 'usq', hoy: HOY, n: 8 });
    expect(r).toHaveLength(8);
    expect(r.every((x) => x.disponibles > 0)).toBe(true);
    expect(r.map((x) => x.unidadesVendidas)).toEqual([...r.map((x) => x.unidadesVendidas)].sort((a, b) => b - a));
  });

  it('cierres de la última semana: anoche Zona Rosa tiene el faltante sembrado (W11)', () => {
    const r = selCierresRecientes(e, { hoy: HOY, dias: 7 });
    expect(r).toHaveLength(7);
    expect(r[0]?.fecha).toBe(HOY);
    expect(r[0]?.filas.map((f) => f.estado)).toEqual(['abierta', 'abierta', 'abierta']);
    const zr = r[1]?.filas.find((f) => f.localId === 'zr');
    // Las cifras absolutas dependen de la calibración del generador; el faltante sembrado no.
    expect(zr).toMatchObject({ estado: 'cerrada', diferencia: -40_000, ciego: true });
    expect((zr?.contado ?? 0) - (zr?.esperado ?? 0)).toBe(-40_000);
    expect(r[1]?.filas.filter((f) => f.diferencia === 0)).toHaveLength(2);
  });

  it('esperado de la caja de hoy = base + efectivo − egresos, y cambia al vender en efectivo', () => {
    const sesionId = selSesionAbierta(e, { localId: 'usq' })?.id ?? '';
    const antes = selResumenSesion(e, { sesionId });
    expect(antes?.esperado).toBe((antes?.sesion.abierta.baseInicial ?? 0) + (e.agregados.efectivoSesion[sesionId] ?? 0) - (antes?.egresos ?? 0));
    const r = registrarW1('dueno');
    expect(selResumenSesion(r.despues, { sesionId })?.esperado).toBe((antes?.esperado ?? 0) + 100_000);
  });

  it('bono por código: sin importar mayúsculas ni espacios; inexistente → null', () => {
    const activo = selBonos(e, { hoy: HOY, estado: 'activo' })[0];
    if (activo) {
      const encontrado = selBonoPorCodigo(e, { codigo: `  ${activo.codigo.toLowerCase()} `, hoy: HOY });
      expect(encontrado?.id).toBe(activo.id);
      expect(encontrado?.saldo).toBe(activo.saldo);
    }
    expect(selBonoPorCodigo(e, { codigo: 'BR-999999', hoy: HOY })).toBeNull();
    expect(selBonoPorCodigo(e, { codigo: '   ', hoy: HOY })).toBeNull();
  });

  it('solicitudes de descuento del vendedor: la pendiente de la narrativa (20 %) aparece y la de otro no', () => {
    const n = selNarrativa(e, { hoy: HOY });
    const mias = selSolicitudesDescuento(e, { vendedorId: n.vendedorPersona as Id });
    expect(mias.map((s) => s.id)).toContain(n.solicitudDescuento);
    expect(mias.find((s) => s.id === n.solicitudDescuento)).toMatchObject({ estado: 'pendiente', datos: { porcentaje: 0.2 } });
    expect(selSolicitudesDescuento(e, { vendedorId: 'em_nrios' })).toHaveLength(0);
  });

  it('el reloj de QA es el de la prueba', () => {
    expect(AHORA).toBe(AHORA_VENTA);
  });
});

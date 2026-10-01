import { describe, expect, it } from 'vitest';
import { saldoCuenta } from '../comandos/tx';
import {
  abastecer,
  abrirCaja,
  CHINO_ARENA_32,
  datosVenta,
  hacer,
  intentar,
  nuevoEstado,
  pago,
} from './fixtures';

describe('caja con arqueo ciego (W11, V8)', () => {
  it('el vendedor cierra sin ver el esperado; el faltante queda como ajuste y el dueño revisa', () => {
    const e = nuevoEstado();
    abastecer(e, CHINO_ARENA_32, 'usq', 3);
    abrirCaja(e, 'usq');
    expect(
      intentar(e, 'caja.abrir', { sesionId: 'sc_2', localId: 'usq', baseInicial: 300_000, por: null }),
    ).toMatchObject({ ok: false, error: { codigo: 'CAJA_ABIERTA' } });
    hacer(
      e,
      'venta.registrar',
      datosVenta('vt_1', { pagos: [pago('efectivo', 199_900, { recibido: 200_000 })] }),
    );
    expect(e.ventas.vt_1!.pagos[0]).toMatchObject({ recibido: 200_000, cambio: 100 });
    hacer(e, 'caja.egreso', {
      egresoId: 'eg_1',
      sesionId: 'sc_usq',
      concepto: 'Domicilio de un arreglo',
      valor: 15_000,
      categoria: 'transporte',
    });
    expect(
      intentar(e, 'caja.egreso', {
        egresoId: 'eg_2',
        sesionId: 'sc_usq',
        concepto: 'Exceso',
        valor: 10_000_000,
        categoria: 'otros',
      }),
    ).toMatchObject({ ok: false, error: { codigo: 'EFECTIVO_INSUFICIENTE' } });
    const esperado = 300_000 + 199_900 - 15_000;
    expect(
      intentar(
        e,
        'caja.cerrar',
        {
          sesionId: 'sc_usq',
          denominaciones: { '50000': 9 },
          efectivoContado: 444_900,
          observacion: null,
          por: null,
        },
        { rol: 'vendedor' },
      ),
    ).toMatchObject({
      ok: false,
      error: { codigo: 'CONTEO_DESCUADRADO' },
    });
    hacer(
      e,
      'caja.cerrar',
      {
        sesionId: 'sc_usq',
        denominaciones: { '50000': 8, '20000': 2, monedas: 4_900 },
        efectivoContado: 444_900,
        observacion: null,
        por: null,
      },
      { rol: 'vendedor', ts: '2026-09-30T20:12:00' },
    );
    const cierre = e.sesionesCaja.sc_usq!.cierre!;
    expect(cierre).toMatchObject({
      ciego: true,
      por: 'em_scardenas',
      efectivoEsperado: esperado,
      diferencia: 444_900 - esperado,
    });
    expect(saldoCuenta(e, 'cta_caja_usq')).toBe(444_900);
    expect(
      intentar(e, 'caja.revisarCierre', { sesionId: 'sc_usq', nota: null }, { rol: 'vendedor' }),
    ).toMatchObject({ ok: false, error: { codigo: 'SIN_PERMISO' } });
    hacer(e, 'caja.revisarCierre', { sesionId: 'sc_usq', nota: 'Hablé con Sebastián' });
    expect(e.sesionesCaja.sc_usq!.revision?.nota).toBe('Hablé con Sebastián');
    expect(e.gastos['eg_1-g']).toMatchObject({
      estadoPago: 'pagado',
      localId: 'usq',
      documento: { tipo: 'sesion_caja', id: 'sc_usq' },
    });
  });
});

describe('datáfono (V11, 6.20.12)', () => {
  it('liquida el bruto del día desde la cuenta puente y abona el neto al banco, una sola vez', () => {
    const e = nuevoEstado();
    abastecer(e, CHINO_ARENA_32, 'usq', 3);
    hacer(e, 'venta.registrar', datosVenta('vt_1', { pagos: [pago('datafono_debito', 199_900)] }));
    hacer(e, 'venta.registrar', datosVenta('vt_2', { pagos: [pago('datafono_credito', 199_900)] }));
    expect(saldoCuenta(e, 'cta_puente')).toBe(399_800);
    const banco = saldoCuenta(e, 'cta_corriente');
    hacer(
      e,
      'datafono.registrarAbono',
      {
        abonoId: 'ad_1',
        localId: 'usq',
        ventasDe: '2026-09-30',
        fecha: '2026-10-01',
        cuentaDestinoId: 'cta_corriente',
      },
      { ts: '2026-10-01T07:00:00' },
    );
    const a = e.abonosDatafono.ad_1!;
    expect(a.bruto).toBe(399_800);
    expect(a.neto).toBe(a.bruto - a.comision - a.retenciones.fuente - a.retenciones.iva - a.retenciones.ica);
    expect(saldoCuenta(e, 'cta_puente')).toBe(0);
    expect(saldoCuenta(e, 'cta_corriente') - banco).toBe(a.neto);
    expect(e.gastos['ad_1-g']).toMatchObject({ categoria: 'comisiones_datafono', valor: a.comision });
    expect(
      intentar(e, 'datafono.registrarAbono', {
        abonoId: 'ad_2',
        localId: 'usq',
        ventasDe: '2026-09-30',
        fecha: '2026-10-01',
        cuentaDestinoId: 'cta_corriente',
      }),
    ).toMatchObject({
      ok: false,
      error: { codigo: 'ABONO_DUPLICADO' },
    });
  });
});

describe('gastos y cuentas por pagar', () => {
  it('gasto inmediato baja la cuenta; por pagar crea la CxP y queda pagado al pagarla', () => {
    const e = nuevoEstado();
    const banco = saldoCuenta(e, 'cta_corriente');
    hacer(e, 'gasto.registrar', {
      gastoId: 'gs_1',
      datos: {
        fecha: '2026-09-30',
        localId: 'p93',
        categoria: 'mantenimiento',
        concepto: 'Arreglo de la vitrina',
        valor: 476_000,
        iva: 76_000,
        proveedorId: null,
        soporte: null,
        documento: null,
      },
      pago: { tipo: 'inmediato', cuentaId: 'cta_corriente', medio: 'transferencia' },
    });
    expect(saldoCuenta(e, 'cta_corriente')).toBe(banco - 476_000);
    hacer(e, 'gasto.registrar', {
      gastoId: 'gs_2',
      datos: {
        fecha: '2026-09-30',
        localId: null,
        categoria: 'empaques',
        concepto: 'Bolsas de papel',
        valor: 4_165_000,
        iva: 665_000,
        proveedorId: 'pr_empaques',
        soporte: null,
        documento: null,
      },
      pago: { tipo: 'por_pagar', vence: '2026-10-30', cxpId: 'cp_1' },
    });
    expect(e.cuentasPorPagar.cp_1).toMatchObject({
      numero: 'CP-000001',
      categoria: 'proveedor_local',
      valor: 4_165_000,
    });
    expect(e.gastos.gs_2?.estadoPago).toBe('por_pagar');
    hacer(e, 'cxp.pagar', {
      cxpId: 'cp_1',
      abonoId: 'ab_1',
      fecha: '2026-09-30',
      valorCOP: 4_165_000,
      centavos: null,
      tasa: null,
      cuentaId: 'cta_corriente',
      medio: 'transferencia',
      soporte: null,
    });
    expect(e.gastos.gs_2?.estadoPago).toBe('pagado');
    expect(intentar(e, 'gasto.eliminar', { gastoId: 'gs_2', motivo: null })).toMatchObject({
      ok: false,
      error: { codigo: 'CON_ABONOS' },
    });
    hacer(e, 'gasto.eliminar', { gastoId: 'gs_1', motivo: 'Duplicado' });
    expect(saldoCuenta(e, 'cta_corriente')).toBe(banco - 4_165_000);
  });

  it('los recurrentes se generan una vez por mes', () => {
    const e = nuevoEstado();
    hacer(e, 'gastoRecurrente.generarMes', { mes: '2026-10' }, { rol: 'sistema' });
    const arriendo = e.gastos['gr_arriendo_p93-2026-10'];
    expect(arriendo).toMatchObject({ fecha: '2026-10-01', estadoPago: 'por_pagar' });
    expect(e.cuentasPorPagar['gr_arriendo_p93-2026-10-cxp']?.fechaVencimiento).toBe('2026-10-05');
    const n = Object.keys(e.gastos).length;
    hacer(e, 'gastoRecurrente.generarMes', { mes: '2026-10' }, { rol: 'sistema' });
    expect(Object.keys(e.gastos).length).toBe(n);
  });

  it('el generador no deja cuentas en negativo; al usuario no se le bloquea', () => {
    const e = nuevoEstado();
    const d = {
      transferenciaId: 'tf_1',
      origenId: 'cta_nequi',
      destinoId: 'cta_corriente',
      valor: 1_000,
      fecha: '2026-09-30',
      descripcion: 'Traslado',
    };
    expect(intentar(e, 'cuenta.transferir', d, { rol: 'sistema' })).toMatchObject({
      ok: false,
      error: { codigo: 'SALDO_INSUFICIENTE' },
    });
    hacer(e, 'cuenta.transferir', d);
    expect(saldoCuenta(e, 'cta_nequi')).toBe(-1_000);
  });
});

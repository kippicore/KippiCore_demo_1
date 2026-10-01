import { describe, expect, it } from 'vitest';
import { existencia, saldoCuenta } from '../comandos/tx';
import { saldoAFavorCliente, saldoBono } from '../comandos/comunes';
import {
  abastecer,
  abrirCaja,
  BLAZER_AZN_50,
  CHINO_ARENA_32,
  datosVenta,
  hacer,
  huella,
  intentar,
  nuevoEstado,
  pago,
} from './fixtures';

function preparar() {
  const e = nuevoEstado();
  abastecer(e, CHINO_ARENA_32, 'usq', 5);
  abastecer(e, BLAZER_AZN_50, 'usq', 3);
  abrirCaja(e, 'usq');
  return e;
}

describe('venta.registrar (W1, V1–V2)', () => {
  it('contado mixto: efectivo + Nequi mueve inventario, caja, Nequi y el cliente', () => {
    const e = preparar();
    const nequiAntes = saldoCuenta(e, 'cta_nequi');
    const eventos = hacer(
      e,
      'venta.registrar',
      datosVenta('vt_w1', {
        clienteId: 'cl_andres_gutierrez',
        pagos: [pago('efectivo', 100_000, { recibido: 100_000 }), pago('nequi', 99_900)],
      }),
    );
    const v = e.ventas.vt_w1!;
    expect(v.numero).toBe('V-000001');
    expect(v.total).toBe(199_900);
    expect(v.base).toBe(167_983);
    expect(v.iva).toBe(31_917);
    expect(v.lineas[0]?.descripcion).toBe('Pantalón chino elástico · Arena · 32');
    expect(existencia(e, CHINO_ARENA_32, 'usq')).toBe(4);
    expect(e.agregados.efectivoSesion.sc_usq).toBe(100_000);
    expect(saldoCuenta(e, 'cta_caja_usq')).toBe(300_000 + 100_000);
    expect(saldoCuenta(e, 'cta_nequi') - nequiAntes).toBe(99_900);
    expect(eventos.map((x) => x.tipo)).toEqual(
      expect.arrayContaining(['VentaRegistrada', 'InventarioMovido']),
    );
  });

  it('valida pagos, existencias y caja abierta sin tocar el estado', () => {
    const e = preparar();
    const antes = huella(e);
    expect(
      intentar(e, 'venta.registrar', datosVenta('vt_x', { pagos: [pago('nequi', 100_000)] })),
    ).toMatchObject({ ok: false, error: { codigo: 'PAGO_INCOMPLETO' } });
    expect(
      intentar(
        e,
        'venta.registrar',
        datosVenta('vt_x', {
          lineas: [{ varianteId: CHINO_ARENA_32, cantidad: 6, precioLista: null, descuento: null }],
        }),
      ),
    ).toMatchObject({ ok: false, error: { codigo: 'SIN_EXISTENCIAS' } });
    const sinCaja = nuevoEstado();
    abastecer(sinCaja, CHINO_ARENA_32, 'usq', 1);
    expect(
      intentar(sinCaja, 'venta.registrar', datosVenta('vt_x', { pagos: [pago('efectivo', 199_900)] })),
    ).toMatchObject({ ok: false, error: { codigo: 'CAJA_CERRADA' } });
    expect(huella(e)).toBe(antes);
  });

  it('separado: abono mínimo del 20 %, sale del disponible y se completa con abonos', () => {
    const e = preparar();
    expect(
      intentar(
        e,
        'venta.registrar',
        datosVenta('vt_s', {
          tipo: 'separado',
          pagos: [pago('nequi', 50_000)],
          fechaLimiteSeparado: '2026-10-20',
        }),
      ),
    ).toMatchObject({
      ok: false,
      error: { codigo: 'CLIENTE_REQUERIDO' },
    });
    expect(
      intentar(
        e,
        'venta.registrar',
        datosVenta('vt_s', {
          tipo: 'separado',
          clienteId: 'cl_andres_gutierrez',
          pagos: [pago('nequi', 30_000)],
          fechaLimiteSeparado: '2026-10-20',
        }),
      ),
    ).toMatchObject({ ok: false, error: { codigo: 'ABONO_INSUFICIENTE' } });
    hacer(
      e,
      'venta.registrar',
      datosVenta('vt_s', {
        tipo: 'separado',
        clienteId: 'cl_andres_gutierrez',
        pagos: [pago('nequi', 50_000)],
        fechaLimiteSeparado: '2026-10-20',
      }),
    );
    expect(e.movimientos.at(-1)?.tipo).toBe('salida_separado');
    hacer(e, 'venta.abonar', { ventaId: 'vt_s', pago: pago('transferencia', 100_000) });
    expect(e.ventas.vt_s!.separado?.cerrado).toBeNull();
    expect(
      intentar(e, 'venta.abonar', { ventaId: 'vt_s', pago: pago('transferencia', 60_000) }),
    ).toMatchObject({ ok: false, error: { codigo: 'ABONO_EXCEDE' } });
    const ev = hacer(e, 'venta.abonar', { ventaId: 'vt_s', pago: pago('efectivo', 49_900) });
    expect(e.ventas.vt_s!.separado?.cerrado?.resultado).toBe('completado');
    expect(ev.map((x) => x.tipo)).toContain('SeparadoCerrado');
  });

  it('crédito: exige cliente y queda con saldo', () => {
    const e = preparar();
    hacer(
      e,
      'venta.registrar',
      datosVenta('vt_c', { tipo: 'credito', clienteId: 'cl_ricardo_penuela', pagos: [] }),
    );
    hacer(e, 'venta.abonar', { ventaId: 'vt_c', pago: pago('transferencia', 99_900) });
    expect(e.ventas.vt_c!.pagos).toHaveLength(1);
  });

  it('bono de regalo: se vende como plata anticipada y se redime con saldo y vigencia (V12)', () => {
    const e = preparar();
    hacer(e, 'bono.vender', {
      bonoId: 'bo_1',
      codigo: null,
      valor: 300_000,
      localId: 'usq',
      pago: pago('efectivo', 300_000),
      vence: '2026-12-31',
    });
    expect(e.bonos.bo_1?.codigo).toBe('BR-000001');
    expect(e.agregados.efectivoSesion.sc_usq).toBe(300_000);
    expect(saldoCuenta(e, 'cta_caja_usq')).toBe(600_000);
    hacer(
      e,
      'venta.registrar',
      datosVenta('vt_b', { pagos: [pago('bono_regalo', 199_900, { bonoId: 'bo_1' })] }),
    );
    expect(saldoBono(e, 'bo_1')).toBe(100_100);
    expect(
      intentar(
        e,
        'venta.registrar',
        datosVenta('vt_b2', { pagos: [pago('bono_regalo', 199_900, { bonoId: 'bo_1' })] }),
      ),
    ).toMatchObject({ ok: false, error: { codigo: 'BONO_SIN_SALDO' } });
    expect(
      intentar(
        e,
        'venta.registrar',
        datosVenta('vt_b3', {
          pagos: [pago('bono_regalo', 100, { bonoId: 'bo_1' }), pago('nequi', 199_800)],
        }),
        { ts: '2027-01-02T10:00:00' },
      ),
    ).toMatchObject({
      ok: false,
      error: { codigo: 'BONO_VENCIDO' },
    });
  });

  it('descuento por encima del 15 %: el vendedor necesita aprobación, se usa una sola vez; el dueño no', () => {
    const e = preparar();
    const ventaBlazer = (id: string, extra = {}) =>
      datosVenta(id, {
        lineas: [{ varianteId: BLAZER_AZN_50, cantidad: 1, precioLista: null, descuento: null }],
        descuentoGlobal: { tipo: 'porcentaje', valor: 0.2 },
        pagos: [pago('datafono_credito', 631_920)],
        ...extra,
      });
    expect(intentar(e, 'venta.registrar', ventaBlazer('vt_d1'), { rol: 'vendedor' })).toMatchObject({
      ok: false,
      error: { codigo: 'DESCUENTO_REQUIERE_APROBACION' },
    });
    hacer(
      e,
      'aprobacion.solicitar',
      {
        solicitudId: 'so_d',
        datos: {
          tipo: 'descuento',
          localId: 'usq',
          vendedorId: 'em_scardenas',
          varianteIds: [BLAZER_AZN_50],
          valorLista: 789_900,
          porcentaje: 0.2,
          valorFinal: 631_920,
          motivo: 'Cliente frecuente',
        },
      },
      { rol: 'vendedor' },
    );
    expect(e.solicitudes.so_d?.resumen).toBe(
      'Sebastián Cárdenas pide 20 % de descuento · Blazer de lana fría · $ 789.900 → $ 631.920',
    );
    expect(
      intentar(
        e,
        'aprobacion.resolver',
        { solicitudId: 'so_d', decision: 'aprobada', nota: null },
        { rol: 'vendedor' },
      ),
    ).toMatchObject({ ok: false, error: { codigo: 'SIN_PERMISO' } });
    hacer(e, 'aprobacion.resolver', { solicitudId: 'so_d', decision: 'aprobada', nota: null });
    hacer(e, 'venta.registrar', ventaBlazer('vt_d2', { aprobacionDescuentoId: 'so_d' }), { rol: 'vendedor' });
    expect(e.ventas.vt_d2!.total).toBe(631_920);
    expect(e.solicitudes.so_d?.usadaEnVentaId).toBe('vt_d2');
    expect(
      intentar(e, 'venta.registrar', ventaBlazer('vt_d3', { aprobacionDescuentoId: 'so_d' }), {
        rol: 'vendedor',
      }),
    ).toMatchObject({ ok: false, error: { codigo: 'APROBACION_USADA' } });
    hacer(e, 'venta.registrar', ventaBlazer('vt_d4'));
  });

  it('el dueño elige el vendedor; el vendedor solo vende a su nombre y en su local', () => {
    const e = preparar();
    hacer(e, 'venta.registrar', datosVenta('vt_v', { vendedorId: 'em_dmoreno' }));
    expect(e.ventas.vt_v!.vendedorId).toBe('em_dmoreno');
    expect(
      intentar(e, 'venta.registrar', datosVenta('vt_v2', { vendedorId: 'em_dmoreno' }), { rol: 'vendedor' }),
    ).toMatchObject({ ok: false, error: { codigo: 'OTRO_VENDEDOR' } });
    expect(intentar(e, 'venta.registrar', datosVenta('vt_v3', { vendedorId: 'em_lsmendez' }))).toMatchObject({
      ok: false,
      error: { codigo: 'NO_ES_VENDEDOR' },
    });
  });

  it('factura electrónica inmediata o documento POS (simulados)', () => {
    const e = preparar();
    hacer(
      e,
      'venta.registrar',
      datosVenta('vt_f', {
        facturaInmediata: {
          facturaId: 'fa_1',
          tipo: 'factura_electronica',
          adquirente: {
            tipo: 'consumidor_final',
            clienteId: null,
            nombre: 'Consumidor final',
            documento: null,
            correo: null,
          },
        },
      }),
    );
    hacer(
      e,
      'venta.registrar',
      datosVenta('vt_p', {
        facturaInmediata: {
          facturaId: 'fa_2',
          tipo: 'documento_equivalente_pos',
          adquirente: {
            tipo: 'consumidor_final',
            clienteId: null,
            nombre: 'Consumidor final',
            documento: null,
            correo: null,
          },
        },
      }),
    );
    expect(e.facturas.fa_1?.numero).toBe('HAL-FE-1');
    expect(e.facturas.fa_2?.numero).toBe('HAL-POS-1');
    expect(e.facturas.fa_1?.cufe).toMatch(/^[0-9a-f]{96}$/);
    expect(e.facturas.fa_1?.estado).toBe('generada');
    hacer(e, 'factura.avanzarEstado', { facturaId: 'fa_1', estado: 'enviada' });
    expect(intentar(e, 'factura.avanzarEstado', { facturaId: 'fa_2', estado: 'aceptada' })).toMatchObject({
      ok: false,
    });
    hacer(e, 'factura.avanzarEstado', { facturaId: 'fa_1', estado: 'aceptada' });
    expect(e.facturas.fa_1?.historial.map((h) => h.estado)).toEqual(['generada', 'enviada', 'aceptada']);
  });
});

describe('devoluciones (V3, 6.20.2)', () => {
  it('con cliente: saldo a favor que paga la venta del cambio', () => {
    const e = preparar();
    hacer(e, 'venta.registrar', datosVenta('vt_1', { clienteId: 'cl_andres_gutierrez' }));
    hacer(e, 'devolucion.registrar', {
      devolucionId: 'dv_1',
      ventaId: 'vt_1',
      lineas: [{ lineaId: 'vt_1-l1', cantidad: 1, reingresa: true }],
      motivo: 'Talla',
      compensacion: 'cambio',
      reembolso: null,
      notaCreditoId: null,
      clienteNuevo: null,
    });
    expect(e.devoluciones.dv_1?.numero).toBe('DV-000001');
    expect(existencia(e, CHINO_ARENA_32, 'usq')).toBe(5);
    expect(saldoAFavorCliente(e, 'cl_andres_gutierrez')).toBe(199_900);
    hacer(
      e,
      'venta.registrar',
      datosVenta('vt_2', {
        clienteId: 'cl_andres_gutierrez',
        ventaOrigenCambioId: 'vt_1',
        pagos: [pago('saldo_a_favor', 199_900)],
      }),
    );
    expect(saldoAFavorCliente(e, 'cl_andres_gutierrez')).toBe(0);
    expect(e.devoluciones.dv_1?.ventaCambioId).toBe('vt_2');
  });

  it('a consumidor final solo se reembolsa; se puede crear el cliente en el paso', () => {
    const e = preparar();
    hacer(e, 'venta.registrar', datosVenta('vt_1', { pagos: [pago('efectivo', 199_900)] }));
    const base = {
      devolucionId: 'dv_1',
      ventaId: 'vt_1',
      lineas: [{ lineaId: 'vt_1-l1', cantidad: 1, reingresa: false }],
      motivo: 'Defecto',
      reembolso: null,
      notaCreditoId: null,
      clienteNuevo: null,
    };
    expect(intentar(e, 'devolucion.registrar', { ...base, compensacion: 'saldo_favor' })).toMatchObject({
      ok: false,
      error: { codigo: 'CLIENTE_REQUERIDO' },
    });
    hacer(e, 'devolucion.registrar', {
      ...base,
      compensacion: 'reembolso',
      reembolso: { medio: 'efectivo', sesionCajaId: null },
    });
    expect(e.agregados.efectivoSesion.sc_usq).toBe(0);
    expect(existencia(e, CHINO_ARENA_32, 'usq')).toBe(4);
    hacer(e, 'venta.registrar', datosVenta('vt_3', { pagos: [pago('nequi', 199_900)] }));
    hacer(e, 'devolucion.registrar', {
      ...base,
      devolucionId: 'dv_2',
      ventaId: 'vt_3',
      lineas: [{ lineaId: 'vt_3-l1', cantidad: 1, reingresa: true }],
      compensacion: 'saldo_favor',
      clienteNuevo: {
        clienteId: 'cl_nuevo',
        nombres: 'Camilo',
        apellidos: 'Restrepo',
        documento: null,
        celular: '3001112233',
        correo: null,
        cumpleanos: null,
        anioNacimiento: null,
        barrio: null,
        canalPreferido: 'whatsapp',
        tratamiento: 'tu',
        autorizacionDatos: { aceptada: true, fecha: '2026-09-30T15:30:00', canal: 'pos' },
        tallasDeclaradas: {},
        canalAlta: 'pos',
        localRegistroId: 'usq',
        registradoPorId: null,
      },
    });
    expect(e.ventas.vt_3!.clienteId).toBe('cl_nuevo');
    expect(saldoAFavorCliente(e, 'cl_nuevo')).toBe(199_900);
  });

  it('con factura exige nota crédito', () => {
    const e = preparar();
    hacer(
      e,
      'venta.registrar',
      datosVenta('vt_1', {
        facturaInmediata: {
          facturaId: 'fa_1',
          tipo: 'factura_electronica',
          adquirente: {
            tipo: 'consumidor_final',
            clienteId: null,
            nombre: 'Consumidor final',
            documento: null,
            correo: null,
          },
        },
      }),
    );
    const d = {
      devolucionId: 'dv_1',
      ventaId: 'vt_1',
      lineas: [{ lineaId: 'vt_1-l1', cantidad: 1, reingresa: true }],
      motivo: 'Talla',
      compensacion: 'reembolso' as const,
      reembolso: { medio: 'datafono_debito' as const, sesionCajaId: null },
      clienteNuevo: null,
    };
    expect(intentar(e, 'devolucion.registrar', { ...d, notaCreditoId: null })).toMatchObject({
      ok: false,
      error: { codigo: 'NOTA_CREDITO_REQUERIDA' },
    });
    hacer(e, 'devolucion.registrar', { ...d, notaCreditoId: 'ncr_1' });
    expect(e.notasCredito.ncr_1).toMatchObject({ numero: 'HAL-NC-0001', valor: 199_900, base: 167_983 });
  });
});

describe('anulación (G1, W11)', () => {
  it('directa por el dueño: reingresa inventario y reembolsa; el vendedor no puede', () => {
    const e = preparar();
    hacer(e, 'venta.registrar', datosVenta('vt_1', { pagos: [pago('nequi', 199_900)] }));
    expect(
      intentar(
        e,
        'venta.anular',
        {
          ventaId: 'vt_1',
          motivo: 'Error',
          reembolso: { medio: 'nequi', sesionCajaId: null },
          notaCreditoId: null,
          solicitudId: null,
        },
        { rol: 'vendedor' },
      ),
    ).toMatchObject({
      ok: false,
      error: { codigo: 'SIN_PERMISO' },
    });
    expect(
      intentar(e, 'venta.anular', {
        ventaId: 'vt_1',
        motivo: 'Error',
        reembolso: null,
        notaCreditoId: null,
        solicitudId: null,
      }),
    ).toMatchObject({ ok: false, error: { codigo: 'REEMBOLSO_REQUERIDO' } });
    hacer(e, 'venta.anular', {
      ventaId: 'vt_1',
      motivo: 'Error de digitación',
      reembolso: { medio: 'nequi', sesionCajaId: null },
      notaCreditoId: null,
      solicitudId: null,
    });
    expect(e.ventas.vt_1!.anulacion?.motivo).toBe('Error de digitación');
    expect(existencia(e, CHINO_ARENA_32, 'usq')).toBe(5);
    expect(e.ventas.vt_1!.pagos.reduce((a, p) => a + p.valor, 0)).toBe(0);
  });

  it('por solicitud: el vendedor la pide y el dueño la aprueba', () => {
    const e = preparar();
    hacer(
      e,
      'venta.registrar',
      datosVenta('vt_1', {
        facturaInmediata: {
          facturaId: 'fa_1',
          tipo: 'documento_equivalente_pos',
          adquirente: {
            tipo: 'consumidor_final',
            clienteId: null,
            nombre: 'Consumidor final',
            documento: null,
            correo: null,
          },
        },
      }),
      { rol: 'vendedor' },
    );
    hacer(
      e,
      'aprobacion.solicitar',
      {
        solicitudId: 'so_a',
        datos: {
          tipo: 'anulacion',
          ventaId: 'vt_1',
          motivo: 'cobro duplicado',
          reembolso: { medio: 'datafono_debito', sesionCajaId: null },
        },
      },
      { rol: 'vendedor' },
    );
    expect(e.solicitudes.so_a?.resumen).toBe(
      'Sebastián Cárdenas pide anular la venta V-000001 · motivo: cobro duplicado',
    );
    hacer(e, 'aprobacion.resolver', { solicitudId: 'so_a', decision: 'aprobada', nota: 'Revisado' });
    expect(e.ventas.vt_1!.anulacion?.solicitudId).toBe('so_a');
    expect(e.notasCredito['so_a-nc']?.valor).toBe(199_900);
    expect(e.solicitudes.so_a?.estado).toBe('aprobada');
  });
});

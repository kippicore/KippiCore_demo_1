import { describe, expect, it } from 'vitest';
import { saldoCuenta } from '../comandos/tx';
import { hacer, intentar, nuevoEstado } from './fixtures';

function turno(id: string, fecha: string, extra: Record<string, unknown> = {}) {
  return {
    turnoId: id,
    empleadoId: 'em_scardenas',
    localId: 'usq',
    fecha,
    tipo: 'apertura' as const,
    inicio: '10:00',
    fin: '18:00',
    descansoMin: 60,
    aceptarExceso: false,
    ...extra,
  };
}

describe('turnos y marcaciones (P2, P3)', () => {
  it('un séptimo turno de 7 h supera las 42 h y exige confirmar horas extra', () => {
    const e = nuevoEstado();
    const dias = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'];
    dias.forEach((f, i) => hacer(e, 'turno.asignar', turno(`tu_${i}`, f)));
    expect(intentar(e, 'turno.asignar', turno('tu_7', '2026-10-04'))).toMatchObject({
      ok: false,
      error: { codigo: 'JORNADA_EXCEDIDA' },
    });
    hacer(e, 'turno.asignar', turno('tu_7', '2026-10-04', { aceptarExceso: true }));
    expect(e.turnos.tu_7?.excedeJornadaAceptado).toBe(true);
    expect(
      intentar(
        e,
        'turno.asignar',
        turno('tu_8', '2026-10-04', { inicio: '17:00', fin: '20:00', descansoMin: 0, aceptarExceso: true }),
      ),
    ).toMatchObject({ ok: false, error: { codigo: 'TURNO_SOLAPADO' } });
    hacer(e, 'turno.copiarSemana', {
      localId: 'usq',
      lunesOrigen: '2026-09-28',
      lunesDestino: '2026-10-05',
      aceptarExceso: true,
    });
    expect(e.turnos['tu_0>2026-10-05']?.fecha).toBe('2026-10-05');
  });

  it('marcación: necesita turno, alterna entrada/salida y la corrige solo el dueño', () => {
    const e = nuevoEstado();
    expect(
      intentar(
        e,
        'marcacion.registrar',
        {
          marcacionId: 'ma_0',
          empleadoId: 'em_scardenas',
          localId: 'usq',
          tipo: 'entrada',
          ts: '2026-09-30T09:58:00',
        },
        { rol: 'vendedor' },
      ),
    ).toMatchObject({
      ok: false,
      error: { codigo: 'SIN_TURNO' },
    });
    hacer(e, 'turno.asignar', turno('tu_1', '2026-09-30'));
    expect(
      intentar(
        e,
        'marcacion.registrar',
        {
          marcacionId: 'ma_0',
          empleadoId: 'em_scardenas',
          localId: 'usq',
          tipo: 'salida',
          ts: '2026-09-30T09:58:00',
        },
        { rol: 'vendedor' },
      ),
    ).toMatchObject({
      ok: false,
      error: { codigo: 'MARCACION_FUERA_DE_ORDEN' },
    });
    const ev = hacer(
      e,
      'marcacion.registrar',
      {
        marcacionId: 'ma_1',
        empleadoId: 'em_scardenas',
        localId: 'usq',
        tipo: 'entrada',
        ts: '2026-09-30T09:58:00',
      },
      { rol: 'vendedor' },
    );
    expect(ev[0]).toMatchObject({ tipo: 'MarcacionRegistrada', tipoMarcacion: 'entrada' });
    expect(
      intentar(
        e,
        'marcacion.registrar',
        {
          marcacionId: 'ma_x',
          empleadoId: 'em_mherrera',
          localId: 'zr',
          tipo: 'entrada',
          ts: '2026-09-30T09:58:00',
        },
        { rol: 'vendedor' },
      ),
    ).toMatchObject({
      ok: false,
      error: { codigo: 'OTRA_PERSONA' },
    });
    hacer(
      e,
      'marcacion.registrar',
      {
        marcacionId: 'ma_2',
        empleadoId: 'em_scardenas',
        localId: 'usq',
        tipo: 'salida',
        ts: '2026-09-30T18:05:00',
      },
      { rol: 'vendedor' },
    );
    expect(e.agregados.marcacionesDia['em_scardenas@2026-09-30']).toEqual(['ma_1', 'ma_2']);
    expect(
      intentar(
        e,
        'marcacion.corregir',
        { marcacionId: 'ma_1', ts: '2026-09-30T10:00:00', nota: 'Llegó a las 10' },
        { rol: 'vendedor' },
      ),
    ).toMatchObject({ ok: false, error: { codigo: 'SIN_PERMISO' } });
    hacer(e, 'marcacion.corregir', {
      marcacionId: 'ma_1',
      ts: '2026-09-30T10:00:00',
      nota: 'Llegó a las 10',
    });
    expect(e.marcaciones.ma_1).toMatchObject({ medio: 'corregida', ts: '2026-09-30T10:00:00' });
    expect(intentar(e, 'marcacion.eliminar', { marcacionId: 'ma_1', nota: 'Error' })).toMatchObject({
      ok: false,
      error: { codigo: 'MARCACION_FUERA_DE_ORDEN' },
    });
  });
});

describe('nómina (6.20.5, P4)', () => {
  it('aprueba la quincena con instantánea, cuentas por pagar, PILA y gastos por local; luego la paga', () => {
    const e = nuevoEstado();
    const periodo = {
      inicio: '2026-09-16',
      fin: '2026-09-30',
      tipo: 'quincenal' as const,
      etiqueta: '2.ª quincena de septiembre de 2026',
    };
    hacer(e, 'nomina.aprobar', { liquidacionId: 'lq_1', periodo, exoneracion114: true, insumos: null });
    const l = e.liquidaciones.lq_1!;
    expect(l.numero).toBe('NOM-2026-01');
    expect(l.lineas.every((x) => x.tipo === 'laboral')).toBe(true);
    const sebastian = l.lineas.find((x) => x.empleadoId === 'em_scardenas')!;
    expect(sebastian.laboral?.devengados.salario).toBe(975_000);
    expect(sebastian.insumos.diasLaborados).toBe(15);
    expect(l.nominaElectronica?.estado).toBe('transmitida_simulada');
    expect(e.cuentasPorPagar['lq_1-pila']?.fechaVencimiento).toBe('2026-10-15');
    expect(e.cuentasPorPagar['lq_1-neto-em_scardenas']?.valor).toBe(sebastian.netoAPagar);
    expect(l.gastoIds).toEqual(expect.arrayContaining(['lq_1-g-usq', 'lq_1-ss-usq', 'lq_1-g-p93']));
    expect(
      intentar(e, 'nomina.aprobar', { liquidacionId: 'lq_2', periodo, exoneracion114: true, insumos: null }),
    ).toMatchObject({ ok: false, error: { codigo: 'PERIODO_LIQUIDADO' } });
    // Una edición posterior de parámetros no cambia la liquidación aprobada (P4).
    hacer(e, 'parametros.editar', { seccion: 'nomina', cambios: { smmlv: 1_900_000 } });
    expect(e.liquidaciones.lq_1!.parametros.smmlv).toBe(1_750_905);
    const banco = saldoCuenta(e, 'cta_corriente');
    hacer(e, 'nomina.pagar', { liquidacionId: 'lq_1', fecha: '2026-09-30', cuentaId: 'cta_corriente' });
    expect(e.liquidaciones.lq_1!.estado).toBe('pagada');
    expect(banco - saldoCuenta(e, 'cta_corriente')).toBe(l.totales.neto);
    expect(intentar(e, 'nomina.anularAprobacion', { liquidacionId: 'lq_1' })).toMatchObject({
      ok: false,
      error: { codigo: 'YA_PAGADA' },
    });
  });

  it('mensual: contratistas con retención y anular la aprobación borra lo que creó', () => {
    const e = nuevoEstado();
    hacer(e, 'nomina.aprobar', {
      liquidacionId: 'lq_m',
      periodo: { inicio: '2026-09-01', fin: '2026-09-30', tipo: 'mensual', etiqueta: 'Septiembre de 2026' },
      exoneracion114: true,
      insumos: null,
    });
    const daniela = e.liquidaciones.lq_m!.lineas.find((x) => x.empleadoId === 'em_dmoreno')!;
    expect(daniela.prestacion).toMatchObject({
      honorarios: 1_900_000,
      retencionFuente: 190_000,
      pilaVerificada: false,
    });
    const creadas = [...e.liquidaciones.lq_m!.cuentasPorPagarIds, ...e.liquidaciones.lq_m!.gastoIds];
    hacer(e, 'nomina.anularAprobacion', { liquidacionId: 'lq_m' });
    expect(e.liquidaciones.lq_m).toBeUndefined();
    for (const id of creadas) expect(e.cuentasPorPagar[id] ?? e.gastos[id]).toBeUndefined();
  });
});

describe('configuración', () => {
  it('tasa: registrar reemplaza la del mismo día, no admite futuras, editar y eliminar', () => {
    const e = nuevoEstado();
    hacer(e, 'tasa.registrar', { tasaId: 'tasa_1', moneda: 'USD', fecha: '2026-09-30', valor: 3_950 });
    hacer(e, 'tasa.registrar', { tasaId: 'tasa_2', moneda: 'USD', fecha: '2026-09-30', valor: 4_010.456 });
    expect(e.tasas.tasa_1).toBeUndefined();
    expect(e.tasas.tasa_2).toMatchObject({ valor: 4_010.46, fuente: 'usuario' });
    expect(
      intentar(e, 'tasa.registrar', { tasaId: 'tasa_3', moneda: 'USD', fecha: '2026-10-05', valor: 4_000 }),
    ).toMatchObject({ ok: false, error: { codigo: 'FECHA_FUTURA' } });
    hacer(e, 'tasa.editar', { tasaId: 'tasa_2', valor: 3_990, fecha: '2026-09-29' });
    expect(e.tasas.tasa_2).toMatchObject({ valor: 3_990, fecha: '2026-09-29' });
    hacer(e, 'tasa.eliminar', { tasaId: 'tasa_2' });
    expect(intentar(e, 'tasa.eliminar', { tasaId: 'tasa_usd_inicial' })).toMatchObject({
      ok: false,
      error: { codigo: 'ULTIMA_TASA' },
    });
  });

  it('parámetros: valida la forma, los porcentajes y fusiona por sección', () => {
    const e = nuevoEstado();
    expect(
      intentar(e, 'parametros.editar', { seccion: 'nomina', cambios: { recargos: { nocturno: 1.5 } } }),
    ).toMatchObject({ ok: false });
    expect(intentar(e, 'parametros.editar', { seccion: 'nomina', cambios: { inventado: 3 } })).toMatchObject({
      ok: false,
      error: { codigo: 'CLAVE_DESCONOCIDA' },
    });
    hacer(e, 'parametros.editar', {
      seccion: 'nomina',
      cambios: { recargos: { dominicalFestivo: 0.8 }, divisorHorasMes: 220 },
    });
    expect(e.parametros.nomina.recargos).toMatchObject({ dominicalFestivo: 0.8, nocturno: 0.35 });
    expect(e.parametros.nomina.divisorHorasMes).toBe(220);
  });

  it('local: no se elimina con existencias (G4)', () => {
    const e = nuevoEstado();
    hacer(e, 'inventario.ajustar', {
      movimientoId: 'mv_1',
      varianteId: 'va_cam_0142_azc_m',
      localId: 'zr',
      nuevaCantidad: 2,
      motivo: 'hallazgo',
      nota: null,
    });
    expect(intentar(e, 'local.eliminar', { localId: 'zr', motivo: null })).toMatchObject({
      ok: false,
      error: { codigo: 'CON_EXISTENCIAS' },
    });
  });
});

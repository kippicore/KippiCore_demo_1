import { describe, expect, it } from 'vitest';
import type { EstadoDominio, Id } from '@/dominio/tipos';
import { saldoCxP } from '@/dominio/reglas/cuentas';
import { sumarDias } from '@/dominio/reglas/fechas';
import { periodosDelMes } from '@/dominio/reglas/nomina';
import { idGenerado } from '@/dominio/motor/ids';
import { auditarCoherencia } from '../auditoria/coherencia';
import { idSesion } from '../contexto';
import { generarEstado } from '../fuente';
import { cxpPendiente, ejecutar, paso, type Paso } from './comandos-usuario';
import { idPrueba } from './utilidades';

/**
 * guardas.test.ts (PLAN 7.4, 7.14): comandos "hostiles" del usuario (eliminar producto, cliente, local y
 * proveedor; retirar empleado; cerrar cajas a mano; pagar y reprogramar cuentas; aprobar nómina; editar la tasa;
 * mover importaciones; turnos movidos y eliminados; traslados en curso; separados cancelados) y construcción al
 * día siguiente y a los 10 días: invariantes en verde, 0 omitidos del generador y cada guarda respetada.
 */
const A = '2026-09-30';
const AHORA = `${A}T16:00:00`;
const CINTURON = 'pd_acc_0907';

function hostiles(e0: EstadoDominio): Paso[] {
  const pasos: Paso[] = [];
  // 1–n. Dejar sin existencias el Cinturón reversible y eliminarlo (G4).
  for (const [k, q] of Object.entries(e0.agregados.existencias)) {
    const [v, l] = k.split('@') as [Id, Id];
    if (q <= 0 || e0.variantes[v]?.productoId !== CINTURON) continue;
    pasos.push(() => paso('inventario.ajustar', { movimientoId: idPrueba('mv'), varianteId: v, localId: l, nuevaCantidad: 0, motivo: 'perdida', nota: 'Saldo de la referencia' }));
  }
  pasos.push(() => paso('producto.eliminar', { productoId: CINTURON, motivo: 'Se descontinúa' }));
  // Clientes eliminados (un VIP generado y uno ocasional).
  const vip = Object.values(e0.clientes).filter((c) => c.id.startsWith('cl_g_')).sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const c of vip.slice(0, 2)) pasos.push(() => paso('cliente.eliminar', { clienteId: c.id, motivo: 'Pidió borrar sus datos' }));
  // Cerrar a mano las cajas de Usaquén y Zona Rosa.
  for (const l of ['usq', 'zr'])
    pasos.push((e) => {
      const s = e.sesionesCaja[idSesion(A, l)];
      const esperado = (s?.abierta.baseInicial ?? 0) + (e.agregados.efectivoSesion[idSesion(A, l)] ?? 0);
      return paso('caja.cerrar', { sesionId: idSesion(A, l), denominaciones: null, efectivoContado: esperado, observacion: 'Cierre anticipado', por: null });
    });
  // Vaciar Usaquén hacia la bodega y eliminar el local.
  const traslado = idPrueba('tr');
  pasos.push((e) => {
    const lineas = Object.entries(e.agregados.existencias)
      .filter(([k, q]) => k.endsWith('@usq') && q > 0)
      .map(([k, q]) => ({ varianteId: k.split('@')[0] as Id, cantidad: q }));
    return paso('traslado.solicitar', { trasladoId: traslado, origenId: 'usq', destinoId: 'bod', lineas, motivo: 'Cierre del local', requiereAprobacion: false, solicitudId: null });
  });
  pasos.push(() => paso('traslado.despachar', { trasladoId: traslado }));
  pasos.push(() => paso('traslado.recibir', { trasladoId: traslado, recibidas: null, nota: null }));
  pasos.push(() => paso('local.eliminar', { localId: 'usq', motivo: 'Cierre del local' }));
  // Retirar a Camilo Suárez desde mañana.
  pasos.push(() => paso('empleado.retirar', { empleadoId: 'em_casuarez', fecha: sumarDias(A, 1), motivo: 'Renuncia' }));
  // Pagar una cuenta por pagar y reprogramar otras dos.
  pasos.push((e) => {
    const id = cxpPendiente(e, ['servicios', 'publicidad', 'agente_aduanas', 'agente_carga', 'proveedor_local', 'otro']);
    const c = e.cuentasPorPagar[id];
    return paso('cxp.pagar', { cxpId: id, abonoId: idPrueba('ab'), fecha: A, valorCOP: c ? saldoCxP(c) : 1, centavos: null, tasa: null, cuentaId: 'cta_corriente', medio: 'transferencia', soporte: null });
  });
  const cxpUsuario = idPrueba('cp');
  pasos.push(() => paso('gasto.registrar', { gastoId: idPrueba('gs'), datos: { fecha: A, localId: 'p93', categoria: 'mantenimiento', concepto: 'Pintura de la fachada', valor: 2_380_000, iva: 380_000, proveedorId: null, soporte: null, documento: null }, pago: { tipo: 'por_pagar', vence: sumarDias(A, 5), cxpId: cxpUsuario } }));
  pasos.push(() => paso('cxp.programar', { cxpId: cxpUsuario, fecha: sumarDias(A, 12) }));
  // El saldo a la fábrica que vence en ≈ 2 semanas se programa para después: el pedido espera ese pago.
  pasos.push((e) => paso('cxp.programar', { cxpId: cxpPendiente(e, 'proveedor_importacion', 'USD'), fecha: sumarDias(A, 20) }));
  // Aprobar a mano la nómina de la 2.ª quincena y la mensual (el generador solo debe pagarlas).
  const [, q2] = periodosDelMes(A.slice(0, 7), 'quincenal');
  const [m] = periodosDelMes(A.slice(0, 7), 'mensual');
  if (q2) pasos.push(() => paso('nomina.aprobar', { liquidacionId: idPrueba('lq'), periodo: q2, exoneracion114: true, insumos: null }));
  if (m) pasos.push(() => paso('nomina.aprobar', { liquidacionId: idPrueba('lq'), periodo: m, exoneracion114: true, insumos: null }));
  // Editar la tasa de hoy.
  pasos.push(() => paso('tasa.editar', { tasaId: idGenerado('tasa', 'usd', A), valor: 4_050, fecha: A }));
  // Mover importaciones: Yuefeng adelantada a puerto; Huameng un paso atrás (corrección con nota).
  pasos.push((e) => paso('importacion.cambiarEstado', { importacionId: e.meta.narrativa.importacionEnTransito, estado: 'en_puerto', fecha: A, nota: null, origen: 'panel', autor: null }));
  pasos.push((e) => paso('importacion.cambiarEstado', { importacionId: e.meta.narrativa.importacionEnPuerto, estado: 'en_transito', fecha: A, nota: 'Se reportó por error', origen: 'panel', autor: null }));
  pasos.push((e) => {
    const imp = e.importaciones[e.meta.narrativa.importacionEnProduccion];
    return paso('importacion.actualizarHitos', { importacionId: imp?.id ?? '', estimadas: { listo_despacho: sumarDias(A, 21), saldo_pagado: sumarDias(A, 23), embarcado: sumarDias(A, 28), en_transito: sumarDias(A, 29), en_puerto: sumarDias(A, 60), en_nacionalizacion: sumarDias(A, 63), nacionalizado: sumarDias(A, 70), en_transporte_bogota: sumarDias(A, 72), recibido_bodega: sumarDias(A, 74) } });
  });
  // Turnos: eliminar el de Natalia de mañana y mover el de Valentina.
  pasos.push((e) => {
    const id = e.agregados.turnosDia[`em_nrios@${sumarDias(A, 1)}`]?.[0] ?? e.agregados.turnosDia[`em_nrios@${sumarDias(A, 2)}`]?.[0] ?? '';
    return paso('turno.eliminar', { turnoId: id });
  });
  pasos.push((e) => {
    const f = [1, 2, 3].map((k) => sumarDias(A, k)).find((x) => e.agregados.turnosDia[`em_vgomez@${x}`]?.length) ?? A;
    const t = e.turnos[e.agregados.turnosDia[`em_vgomez@${f}`]?.[0] ?? ''];
    return paso('turno.mover', { turnoId: t?.id ?? '', fecha: f, empleadoId: 'em_vgomez', localId: 'zr', tipo: 'intermedio', inicio: '12:00', fin: '20:00', aceptarExceso: true });
  });
  // Traslado del usuario en curso (despachado, sin recibir) de la bodega a Parque 93.
  const enCurso = idPrueba('tr');
  pasos.push((e) => {
    const v = Object.entries(e.agregados.existencias).find(([k, q]) => k.endsWith('@bod') && q >= 4 && e.variantes[k.split('@')[0] ?? '']?.productoId === 'pd_cam_0131')?.[0].split('@')[0] ?? '';
    return paso('traslado.solicitar', { trasladoId: enCurso, origenId: 'bod', destinoId: 'p93', lineas: [{ varianteId: v, cantidad: 3 }], motivo: 'Vitrina nueva', requiereAprobacion: false, solicitudId: null });
  });
  pasos.push(() => paso('traslado.despachar', { trasladoId: enCurso }));
  // Cancelar un separado guionado y anular la venta de Mateo aprobando la solicitud.
  pasos.push((e) => {
    const s = Object.values(e.ventas).find((v) => v.tipo === 'separado' && v.separado && !v.separado.cerrado && v.localId !== 'usq');
    return paso('separado.cancelar', { ventaId: s?.id ?? '', destinoAbonos: 'saldo_favor', reembolso: null });
  });
  pasos.push((e) => paso('aprobacion.resolver', { solicitudId: e.meta.narrativa.solicitudAnulacion, decision: 'aprobada', nota: 'Revisado con el banco' }));
  // Eliminar el arriendo de la bodega, a Wenzhou Ruifeng (sin pedidos en curso), al transportador y a Carolina.
  pasos.push(() => paso('gastoRecurrente.eliminar', { recurrenteId: 'gr_arriendo_bod' }));
  pasos.push(() => paso('proveedor.eliminar', { proveedorId: 'pr_ruifeng', motivo: 'Cambio de fábrica' }));
  pasos.push(() => paso('proveedor.eliminar', { proveedorId: 'pr_transporte', motivo: 'Cambio de transportador' }));
  pasos.push(() => paso('contacto.eliminar', { contactoId: 'co_carolina_mejia' }));
  return pasos;
}

describe('matriz de guardas (7.4)', () => {
  const base = generarEstado({ ancla: A, ahora: AHORA });
  const r = ejecutar(base, hostiles(base), { inicio: `${A}T16:01:00`, marcaAgua: AHORA });

  it('los comandos hostiles (≥ 30) se aplican', () => {
    expect(r.errores).toEqual([]);
    expect(r.registro.length).toBeGreaterThanOrEqual(30);
  });

  it.each([
    ['al día siguiente', `${sumarDias(A, 1)}T21:30:00`],
    ['a los 10 días', `${sumarDias(A, 10)}T21:30:00`],
  ])('%s: invariantes en verde, 0 omitidos y guardas respetadas', (_, ahora) => {
    const e = generarEstado({ ancla: A, ahora, registro: r.registro });
    expect(e.meta.omitidosUsuario).toEqual([]);
    expect(e.meta.omitidosGenerador).toBe(0);
    const malas = auditarCoherencia(e, ahora).filter((x) => x.violaciones > 0);
    expect(malas.map((x) => `${x.regla} ${x.ejemplo}`)).toEqual([]);
    const despues = (ts: string) => ts > `${A}T16:30:00`;
    // Local eliminado: sin ventas, cajas ni turnos nuevos en Usaquén.
    expect(Object.values(e.ventas).filter((v) => v.localId === 'usq' && despues(v.ts))).toEqual([]);
    expect(Object.values(e.sesionesCaja).filter((s) => s.localId === 'usq' && despues(s.abierta.ts))).toEqual([]);
    // Producto eliminado: no se vuelve a vender.
    expect(Object.values(e.ventas).filter((v) => despues(v.ts) && v.lineas.some((l) => l.productoId === CINTURON))).toEqual([]);
    // Clientes eliminados: no vuelven a comprar.
    const eliminados = new Set(Object.values(e.clientes).filter((c) => c.eliminadoEn).map((c) => c.id));
    expect(Object.values(e.ventas).filter((v) => despues(v.ts) && v.clienteId && eliminados.has(v.clienteId))).toEqual([]);
    // Empleado retirado: sin ventas, turnos ni marcaciones después de su retiro.
    const retiro = sumarDias(A, 1);
    expect(Object.values(e.ventas).filter((v) => v.vendedorId === 'em_casuarez' && v.ts.slice(0, 10) > retiro)).toEqual([]);
    expect(Object.values(e.turnos).filter((t) => t.empleadoId === 'em_casuarez' && t.fecha > retiro)).toEqual([]);
    expect(Object.values(e.marcaciones).filter((x) => x.empleadoId === 'em_casuarez' && x.ts.slice(0, 10) > retiro)).toEqual([]);
    // Caja cerrada a mano: no se reabre el mismo día y no se cierra dos veces.
    const zr = e.sesionesCaja[idSesion(A, 'zr')];
    expect(zr?.cierre?.observacion).toBe('Cierre anticipado');
    expect(Object.values(e.sesionesCaja).filter((s) => s.localId === 'zr' && s.abierta.ts.startsWith(A))).toHaveLength(1);
    // Nómina aprobada a mano: el generador no la duplica (una sola por periodo) y la paga.
    const sept = Object.values(e.liquidaciones).filter((l) => l.periodo.fin === `${A.slice(0, 7)}-30`);
    expect(sept).toHaveLength(2);
    expect(sept.every((l) => l.estado === 'pagada')).toBe(true);
    // Importación movida a mano: no avanza antes de controlManualHasta.
    const yue = e.importaciones[e.meta.narrativa.importacionEnTransito || ''] ?? Object.values(e.importaciones).find((i) => i.proveedorId === 'pr_yuefeng' && i.fechaPedido > sumarDias(A, -100));
    expect(yue).toBeDefined();
    // Pago a la fábrica programado para ancla + 20: no se paga antes y el pedido espera.
    const lanxin = e.importaciones[e.meta.narrativa.importacionEnProduccion];
    const saldo = e.cuentasPorPagar[`${lanxin?.id ?? ''}-cxp-saldo`];
    expect(saldo && saldoCxP(saldo)).toBeGreaterThan(0);
    expect(['en_produccion', 'listo_despacho']).toContain(lanxin?.estado);
    // Proveedor eliminado: no se le crean pedidos nuevos.
    expect(Object.values(e.importaciones).filter((i) => i.proveedorId === 'pr_ruifeng' && i.creadoEn > AHORA)).toEqual([]);
  });
});

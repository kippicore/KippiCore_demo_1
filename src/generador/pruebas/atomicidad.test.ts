import { describe, expect, it } from 'vitest';
import type { EstadoDominio, MapaComandos, TipoComando } from '@/dominio/tipos';
import { aplicarConstruccion } from '@/dominio/motor/aplicar';
import { sumarDias } from '@/dominio/reglas/fechas';
import { periodosDelMes } from '@/dominio/reglas/nomina';
import { idGenerado } from '@/dominio/motor/ids';
import { idSesion } from '../contexto';
import { generarEstado } from '../fuente';
import { datosCliente } from './comandos-usuario';
import { huella, idPrueba, sobreUsuario, varianteConStock } from './utilidades';

/**
 * atomicidad.test.ts (PLAN 5.6.4, 7.14): sobre el estado generado (18 meses), cada comando con datos inválidos
 * falla y deja el estado idéntico en profundidad en modo construcción (validar → plan → escribir).
 */
const A = '2026-09-30';
const AHORA = `${A}T15:30:00`;

type Invalido = { tipo: TipoComando; datos: unknown };
const inv = <K extends TipoComando>(tipo: K, datos: MapaComandos[K]): Invalido => ({ tipo, datos });

function invalidos(e: EstadoDominio): Invalido[] {
  const v = varianteConStock(e, 'zr', 1);
  const hay = e.agregados.existencias[`${v}@zr`] ?? 0;
  const base = {
    ts: null,
    canal: 'local' as const,
    tipo: 'contado' as const,
    clienteId: null,
    clienteNuevo: null,
    descuentoGlobal: null,
    aprobacionDescuentoId: null,
    fechaLimiteSeparado: null,
    ventaOrigenCambioId: null,
    facturaInmediata: null,
    nota: null,
  };
  const pago = (medio: 'datafono_debito' | 'efectivo', valor: number, sesionCajaId: string | null = null) => ({
    medio,
    valor,
    recibido: null,
    referencia: null,
    sesionCajaId,
    bonoId: null,
  });
  const precio = e.productos[e.variantes[v]?.productoId ?? '']?.precioVenta ?? 100_000;
  const venta = Object.values(e.ventas).find((x) => x.tipo === 'contado' && x.ts.startsWith(A) && !x.anulacion && x.facturaId === null);
  const separado = Object.values(e.ventas).find((x) => x.tipo === 'separado' && x.separado && !x.separado.cerrado);
  const recibido = Object.values(e.traslados).find((t) => t.estado === 'recibido');
  const lanxin = e.meta.narrativa.importacionEnProduccion;
  const [q1] = periodosDelMes(A.slice(0, 7), 'quincenal');
  const pagada = Object.values(e.liquidaciones).find((l) => l.estado === 'pagada');
  const turnoHoy = e.turnos[e.agregados.turnosDia[`em_nrios@${A}`]?.[0] ?? ''] ?? Object.values(e.turnos).find((t) => t.fecha === A);
  const clienteExistente = Object.values(e.clientes)[0];
  return [
    inv('venta.registrar', { ...base, ventaId: idPrueba('vt'), localId: 'zr', vendedorId: 'em_nrios', lineas: [{ varianteId: v, cantidad: hay + 1, precioLista: null, descuento: null }], pagos: [pago('datafono_debito', precio * (hay + 1))] }),
    inv('venta.registrar', { ...base, ventaId: idPrueba('vt'), localId: 'zr', vendedorId: 'em_nrios', lineas: [{ varianteId: v, cantidad: 1, precioLista: null, descuento: null }], pagos: [pago('efectivo', precio, idSesion(sumarDias(A, -1), 'zr'))] }),
    inv('venta.registrar', { ...base, ventaId: idPrueba('vt'), localId: 'zr', vendedorId: 'em_nrios', tipo: 'separado', lineas: [{ varianteId: v, cantidad: 1, precioLista: null, descuento: null }], pagos: [pago('datafono_debito', Math.round(precio / 2))], fechaLimiteSeparado: sumarDias(A, 10) }),
    inv('venta.registrar', { ...base, ventaId: idPrueba('vt'), localId: 'zr', vendedorId: 'em_nrios', lineas: [{ varianteId: v, cantidad: 1, precioLista: null, descuento: null }], pagos: [pago('datafono_debito', precio - 1)] }),
    inv('venta.registrar', { ...base, ventaId: idPrueba('vt'), localId: 'bod', vendedorId: 'em_nrios', lineas: [{ varianteId: v, cantidad: 1, precioLista: null, descuento: null }], pagos: [pago('datafono_debito', precio)] }),
    inv('venta.abonar', { ventaId: separado?.id ?? 'x', pago: pago('datafono_debito', 999_999_999) }),
    inv('devolucion.registrar', { devolucionId: idPrueba('dv'), ventaId: venta?.id ?? 'x', lineas: [{ lineaId: venta?.lineas[0]?.id ?? 'x', cantidad: 99, reingresa: true }], motivo: 'Prueba', compensacion: 'reembolso', reembolso: { medio: 'datafono_debito', sesionCajaId: null }, notaCreditoId: null, clienteNuevo: null }),
    inv('separado.cancelar', { ventaId: venta?.id ?? 'x', destinoAbonos: 'reembolso', reembolso: null }),
    inv('traslado.solicitar', { trasladoId: idPrueba('tr'), origenId: 'zr', destinoId: 'p93', lineas: [{ varianteId: v, cantidad: hay + 5 }], motivo: null, requiereAprobacion: false, solicitudId: null }),
    inv('traslado.despachar', { trasladoId: recibido?.id ?? 'x' }),
    inv('importacion.recibir', { importacionId: lanxin, fecha: A, lineas: {}, nota: null, distribucion: [] }),
    inv('importacion.cambiarEstado', { importacionId: lanxin, estado: 'recibido_bodega', fecha: A, nota: null, origen: 'panel', autor: null }),
    inv('importacion.registrarPago', { importacionId: lanxin, cxpId: `${lanxin}-cxp-saldo`, abonoId: idPrueba('ab'), centavos: 100, tasa: 0, fecha: A, cuentaId: 'cta_corriente' }),
    inv('cxp.pagar', { cxpId: `${lanxin}-cxp-saldo`, abonoId: idPrueba('ab'), fecha: A, valorCOP: null, centavos: 999_999_999, tasa: 3950, cuentaId: 'cta_corriente', medio: 'giro_internacional', soporte: null }),
    inv('caja.cerrar', { sesionId: idSesion(sumarDias(A, -1), 'p93'), denominaciones: null, efectivoContado: 0, observacion: null, por: null }),
    inv('caja.abrir', { sesionId: idPrueba('sc'), localId: 'p93', baseInicial: 300_000, por: null }),
    inv('datafono.registrarAbono', { abonoId: idPrueba('ad'), localId: 'p93', ventasDe: sumarDias(A, -1), fecha: A, cuentaDestinoId: 'cta_corriente' }),
    inv('cuenta.transferir', { transferenciaId: idPrueba('tf'), origenId: 'cta_corriente', destinoId: 'cta_corriente', valor: 1000, fecha: A, descripcion: 'Prueba' }),
    inv('gasto.registrar', { gastoId: idPrueba('gs'), datos: { fecha: A, localId: null, categoria: 'otros', concepto: 'Prueba', valor: -5, iva: 0, proveedorId: null, soporte: null, documento: null }, pago: { tipo: 'inmediato', cuentaId: 'cta_corriente', medio: 'transferencia' } }),
    inv('nomina.aprobar', { liquidacionId: idPrueba('lq'), periodo: q1 ?? { inicio: A, fin: A, tipo: 'quincenal', etiqueta: '' }, exoneracion114: true, insumos: null }),
    inv('nomina.pagar', { liquidacionId: pagada?.id ?? 'x', fecha: A, cuentaId: 'cta_corriente' }),
    inv('turno.asignar', { turnoId: idPrueba('tu'), empleadoId: turnoHoy?.empleadoId ?? 'em_nrios', localId: turnoHoy?.localId ?? 'zr', fecha: A, tipo: 'completo', inicio: turnoHoy?.inicio ?? '10:00', fin: turnoHoy?.fin ?? '18:00', descansoMin: 60, aceptarExceso: true }),
    inv('marcacion.registrar', { marcacionId: idPrueba('ma'), empleadoId: 'em_wdiaz', localId: 'bod', tipo: 'entrada', ts: `${sumarDias(A, 30)}T08:00:00` }),
    inv('producto.eliminar', { productoId: 'pd_cam_0142', motivo: null }),
    inv('local.eliminar', { localId: 'zr', motivo: null }),
    inv('cliente.crear', { clienteId: idPrueba('cl'), datos: datosCliente('Otro', clienteExistente?.celular ?? '3000000000', AHORA) }),
    inv('tasa.registrar', { tasaId: idPrueba('tasa'), moneda: 'USD', fecha: sumarDias(A, 5), valor: 4000 }),
    inv('bono.vender', { bonoId: idPrueba('bo'), codigo: null, valor: 100_000, localId: 'zr', pago: pago('datafono_debito', 90_000), vence: sumarDias(A, 365) }),
    inv('conteo.aplicar', { conteoId: 'cf_no_existe', motivos: {} }),
    inv('aprobacion.resolver', { solicitudId: e.meta.narrativa.solicitudDescuento, decision: 'otra' as 'aprobada', nota: null }),
    inv('meta.fijar', { metaId: idGenerado('mt', 'zr', 'x'), localId: 'bod', mes: A.slice(0, 7), valor: 1 }),
  ];
}

describe('atomicidad sobre el estado generado', () => {
  it('cada comando inválido falla sin tocar el estado', () => {
    const e = generarEstado({ ancla: A, ahora: AHORA });
    const antes = huella(e);
    const lista = invalidos(e);
    expect(lista.length).toBeGreaterThanOrEqual(30);
    let seq = 0;
    for (const x of lista) {
      seq += 1;
      const r = aplicarConstruccion(e, sobreUsuario(x.tipo, x.datos as never, { ts: `${A}T15:40:00`, marcaAgua: AHORA, seq }));
      expect(r.ok, x.tipo).toBe(false);
    }
    expect(huella(e) === antes).toBe(true);
  });
});

import type {
  DatosCliente,
  DatosRegistrarVenta,
  EntradaRegistro,
  EstadoDominio,
  FechaHoraISO,
  FechaISO,
  Id,
  MapaComandos,
  TipoComando,
} from '@/dominio/tipos';
import type { Actor } from '@/config/permisos';
import { aplicarEnVivo, configurarCongelado } from '@/dominio/motor/vivo';
import { saldoCxP } from '@/dominio/reglas/cuentas';
import { sumarDias, sumarMinutosTs } from '@/dominio/reglas/fechas';
import { idHijo } from '@/dominio/motor/ids';
import { idSesion } from '../contexto';
import { idPrueba, sobreUsuario, varianteConStock } from './utilidades';

/**
 * Comandos del usuario para las pruebas de reaplicación y guardas (PLAN 7.14). Cada paso se arma contra el
 * estado del momento (como lo haría la interfaz) y se aplica en vivo con Immer; el resultado es el registro.
 */
export type Paso = (e: EstadoDominio) => { tipo: TipoComando; datos: unknown; rol?: Actor; usuarioId?: Id } | null;

export function paso<K extends TipoComando>(
  tipo: K,
  datos: MapaComandos[K],
  rol: Actor = 'dueno',
  usuarioId?: Id,
): { tipo: K; datos: MapaComandos[K]; rol: Actor; usuarioId?: Id } {
  return usuarioId ? { tipo, datos, rol, usuarioId } : { tipo, datos, rol };
}

/** Aplica los pasos en vivo desde `inicio`, un minuto entre cada uno, con la marca de agua dada. */
export function ejecutar(
  estado: EstadoDominio,
  pasos: readonly Paso[],
  o: { inicio: FechaHoraISO; marcaAgua: FechaHoraISO; seq?: number },
): { estado: EstadoDominio; registro: EntradaRegistro[]; errores: string[] } {
  configurarCongelado(false);
  let e = estado;
  const registro: EntradaRegistro[] = [];
  const errores: string[] = [];
  let ts = o.inicio;
  let seq = o.seq ?? 0;
  for (const p of pasos) {
    const c = p(e);
    if (!c) {
      errores.push('paso sin datos');
      continue;
    }
    seq += 1;
    const entrada = sobreUsuario(c.tipo, c.datos as never, { ts, marcaAgua: o.marcaAgua, rol: c.rol, seq, usuarioId: c.usuarioId });
    const r = aplicarEnVivo(e, entrada);
    if (r.ok) {
      e = r.despues;
      registro.push(entrada);
    } else errores.push(`${c.tipo}: ${r.error.codigo} · ${r.error.mensaje}`);
    ts = sumarMinutosTs(ts, 1);
  }
  return { estado: e, registro, errores };
}

function venta(o: Partial<DatosRegistrarVenta> & Pick<DatosRegistrarVenta, 'ventaId' | 'localId' | 'vendedorId' | 'lineas' | 'pagos'>): DatosRegistrarVenta {
  return {
    ts: null,
    canal: 'local',
    tipo: 'contado',
    clienteId: null,
    clienteNuevo: null,
    descuentoGlobal: null,
    aprobacionDescuentoId: null,
    fechaLimiteSeparado: null,
    ventaOrigenCambioId: null,
    facturaInmediata: null,
    nota: null,
    ...o,
  };
}

function precio(e: EstadoDominio, varianteId: Id): number {
  return e.productos[e.variantes[varianteId]?.productoId ?? '']?.precioVenta ?? 0;
}

const pago = (medio: MapaComandos['venta.registrar']['pagos'][number]['medio'], valor: number, extra = {}) => ({
  medio,
  valor,
  recibido: null,
  referencia: null,
  sesionCajaId: null,
  bonoId: null,
  ...extra,
});

export function datosCliente(nombre: string, celular: string, ts: FechaHoraISO): DatosCliente {
  return {
    nombres: nombre,
    apellidos: 'Prueba Demo',
    documento: null,
    celular,
    correo: null,
    cumpleanos: null,
    anioNacimiento: null,
    barrio: 'Chicó',
    canalPreferido: 'whatsapp',
    tratamiento: 'tu',
    autorizacionDatos: { aceptada: true, fecha: ts, canal: 'pos' },
    tallasDeclaradas: {},
    canalAlta: 'pos',
    localRegistroId: 'usq',
    registradoPorId: 'em_scardenas',
  };
}

/** 30 comandos variados del usuario, el día del ancla por la tarde (reaplicacion.test.ts). */
export function comandosVariados(A: FechaISO): Paso[] {
  const v1 = idPrueba('vt');
  const v2 = idPrueba('vt');
  const c1 = idPrueba('cl');
  const v3 = idPrueba('vt');
  const t1 = idPrueba('tr');
  const g2 = idPrueba('gs');
  const cxp2 = idPrueba('cp');
  const b1 = idPrueba('bo');
  const ev = idPrueba('ev');
  const ts = `${A}T16:00:00`;
  const usados = new Set<Id>();
  const conStock = (e: EstadoDominio, l: Id) => {
    const v = varianteConStock(e, l, 3, usados);
    usados.add(v);
    return v;
  };
  return [
    (e) => {
      const v = conStock(e, 'usq');
      return paso('venta.registrar', venta({ ventaId: v1, localId: 'usq', vendedorId: 'em_scardenas', lineas: [{ varianteId: v, cantidad: 1, precioLista: null, descuento: null }], pagos: [pago('datafono_debito', precio(e, v))] }));
    },
    (e) => {
      const v = conStock(e, 'usq');
      return paso(
        'venta.registrar',
        venta({ ventaId: v2, localId: 'usq', vendedorId: 'em_scardenas', lineas: [{ varianteId: v, cantidad: 1, precioLista: null, descuento: null }], pagos: [pago('efectivo', precio(e, v), { sesionCajaId: idSesion(A, 'usq'), recibido: Math.ceil(precio(e, v) / 50_000) * 50_000 })] }),
        'vendedor',
      );
    },
    () => paso('cliente.crear', { clienteId: c1, datos: datosCliente('Lucía', '3009998877', ts) }),
    (e) => {
      const v = conStock(e, 'p93');
      const total = precio(e, v);
      return paso('venta.registrar', venta({ ventaId: v3, localId: 'p93', vendedorId: 'em_vgomez', tipo: 'separado', clienteId: c1, lineas: [{ varianteId: v, cantidad: 1, precioLista: null, descuento: null }], pagos: [pago('nequi', Math.ceil(total * 0.3))], fechaLimiteSeparado: sumarDias(A, 20) }));
    },
    () => paso('venta.abonar', { ventaId: v3, pago: pago('datafono_credito', 20_000) }),
    (e) => paso('traslado.solicitar', { trasladoId: t1, origenId: 'bod', destinoId: 'zr', lineas: [{ varianteId: conStock(e, 'bod'), cantidad: 2 }], motivo: 'Vitrina', requiereAprobacion: false, solicitudId: null }),
    () => paso('traslado.despachar', { trasladoId: t1 }),
    () => paso('traslado.recibir', { trasladoId: t1, recibidas: null, nota: null }),
    (e) => {
      const v = conStock(e, 'bod');
      return paso('inventario.ajustar', { movimientoId: idPrueba('mv'), varianteId: v, localId: 'bod', nuevaCantidad: (e.agregados.existencias[`${v}@bod`] ?? 0) + 1, motivo: 'hallazgo', nota: 'Apareció en la estantería' });
    },
    () => paso('gasto.registrar', { gastoId: idPrueba('gs'), datos: { fecha: A, localId: 'zr', categoria: 'mantenimiento', concepto: 'Bombillos de la vitrina', valor: 85_000, iva: 0, proveedorId: null, soporte: null, documento: null }, pago: { tipo: 'inmediato', cuentaId: 'cta_corriente', medio: 'transferencia' } }),
    () => paso('gasto.registrar', { gastoId: g2, datos: { fecha: A, localId: null, categoria: 'publicidad', concepto: 'Fotos de la colección', valor: 1_190_000, iva: 190_000, proveedorId: 'pr_publicidad', soporte: null, documento: null }, pago: { tipo: 'por_pagar', vence: sumarDias(A, 15), cxpId: cxp2 } }),
    () => paso('cxp.programar', { cxpId: cxp2, fecha: sumarDias(A, 10) }),
    () => paso('cxp.pagar', { cxpId: cxp2, abonoId: idPrueba('ab'), fecha: A, valorCOP: 500_000, centavos: null, tasa: null, cuentaId: 'cta_corriente', medio: 'transferencia', soporte: null }),
    () => paso('cuenta.transferir', { transferenciaId: idPrueba('tf'), origenId: 'cta_corriente', destinoId: 'cta_nequi', valor: 200_000, fecha: A, descripcion: 'Fondo para devoluciones' }),
    () => paso('cuenta.movimiento', { movimientoId: idPrueba('mc'), cuentaId: 'cta_corriente', valor: 5_000_000, tipo: 'aporte_socio', fecha: A, descripcion: 'Aporte del socio' }),
    () => paso('tasa.registrar', { tasaId: idPrueba('tasa'), moneda: 'USD', fecha: A, valor: 3_980 }),
    (e) => paso('importacion.cambiarEstado', { importacionId: e.meta.narrativa.importacionEnPuerto, estado: 'en_nacionalizacion', fecha: A, nota: null, origen: 'panel', autor: null }),
    (e) => paso('importacion.cambiarEstado', { importacionId: e.meta.narrativa.importacionRetrasada, estado: 'nacionalizado', fecha: A, nota: 'Levante autorizado', origen: 'portal', autor: 'Carolina Mejía' }, 'portal'),
    () => paso('evento.crear', { eventoId: ev, datos: { tipo: 'cita', subtipo: 'asesoria', titulo: 'Asesoría de novio', inicio: `${sumarDias(A, 2)}T15:00:00`, fin: `${sumarDias(A, 2)}T16:00:00`, todoElDia: false, localId: 'p93', clienteId: c1, empleadoId: 'em_vgomez', descripcion: null, recordatorioMin: 60 } }),
    () => paso('producto.editar', { productoId: 'pd_pol_0203', cambios: { precioVenta: 189_900 } }),
    () => paso('cliente.editar', { clienteId: c1, cambios: { barrio: 'Rosales' } }),
    () => paso('cliente.nota', { notaId: idPrueba('nc'), clienteId: c1, texto: 'Prefiere camisas entalladas' }),
    () => paso('meta.fijar', { metaId: idPrueba('mt'), localId: 'zr', mes: A.slice(0, 7), valor: 150_000_000 }),
    (e) => {
      const id = e.agregados.turnosDia[`em_mherrera@${sumarDias(A, 1)}`]?.[0];
      const t = id ? e.turnos[id] : undefined;
      if (!t) return paso('novedad.registrar', { novedadId: idPrueba('nv'), datos: { empleadoId: 'em_mherrera', tipo: 'permiso', desde: sumarDias(A, 1), hasta: sumarDias(A, 1), remunerada: true, soporte: null, nota: null } });
      return paso('turno.mover', { turnoId: t.id, fecha: t.fecha, empleadoId: t.empleadoId, localId: t.localId, tipo: t.tipo, inicio: '11:00', fin: '19:00', aceptarExceso: true });
    },
    () => paso('novedad.registrar', { novedadId: idPrueba('nv'), datos: { empleadoId: 'em_srojas', tipo: 'permiso', desde: sumarDias(A, 2), hasta: sumarDias(A, 2), remunerada: true, soporte: null, nota: 'Diligencia personal' } }),
    (e) => paso('aprobacion.resolver', { solicitudId: e.meta.narrativa.solicitudDescuento, decision: 'aprobada', nota: null }),
    (e) => paso('aprobacion.resolver', { solicitudId: e.meta.narrativa.solicitudTraslado, decision: 'rechazada', nota: 'Mejor desde la bodega' }),
    (e) => {
      const venta1 = e.ventas[v1];
      const linea = venta1?.lineas[0];
      return linea
        ? paso('devolucion.registrar', { devolucionId: idPrueba('dv'), ventaId: v1, lineas: [{ lineaId: linea.id, cantidad: 1, reingresa: true }], motivo: 'No le quedó', compensacion: 'reembolso', reembolso: { medio: 'datafono_debito', sesionCajaId: null }, notaCreditoId: null, clienteNuevo: null })
        : null;
    },
    () => paso('bono.vender', { bonoId: b1, codigo: null, valor: 200_000, localId: 'zr', pago: pago('datafono_credito', 200_000), vence: sumarDias(A, 365) }),
    (e) => paso('caja.revisarCierre', { sesionId: e.meta.narrativa.sesionCajaFaltante, nota: 'Se habló con Natalia' }),
  ];
}

/** Cuenta por pagar pendiente en COP (para pagar o reprogramar en las pruebas). */
export function cxpPendiente(e: EstadoDominio, categorias: string | readonly string[], moneda: 'COP' | 'USD' | 'CNY' = 'COP'): Id {
  const lista = typeof categorias === 'string' ? [categorias] : categorias;
  const c = Object.values(e.cuentasPorPagar)
    .filter((x) => !x.eliminadoEn && lista.includes(x.categoria) && x.moneda === moneda && saldoCxP(x) > 0 && !x.programadaPara)
    .sort((a, b) => (a.fechaVencimiento < b.fechaVencimiento ? -1 : a.id < b.id ? -1 : 1))[0];
  if (!c) throw new Error(`Sin cuentas por pagar de ${lista.join(', ')}`);
  return c.id;
}

export { idHijo };

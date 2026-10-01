import type { EstadoDominio, FechaHoraISO, Id } from '@/dominio/tipos';
import { calcularCostoAterrizado } from '@/dominio/reglas/costeo';
import { baseSinIva } from '@/dominio/reglas/ventas';
import { indiceEstado } from '@/dominio/reglas/importaciones';

/**
 * Invariantes de 6.19 verificados contra los hechos (PLAN 7.14 `coherencia.test.ts`, `informe-coherencia.ts`).
 * Recorridos directos de las tablas: es la prueba de que los cinco agregados (y los cuatro de F2-A2) y los
 * hechos dicen lo mismo. Devuelve una fila por regla con el número de violaciones y un ejemplo.
 */
export interface ResultadoRegla {
  regla: string;
  descripcion: string;
  revisados: number;
  violaciones: number;
  ejemplo: string | null;
}

class Registro {
  readonly filas: ResultadoRegla[] = [];
  regla(regla: string, descripcion: string): (ok: boolean, ejemplo?: () => string) => void {
    const fila: ResultadoRegla = { regla, descripcion, revisados: 0, violaciones: 0, ejemplo: null };
    this.filas.push(fila);
    return (ok, ejemplo) => {
      fila.revisados += 1;
      if (!ok) {
        fila.violaciones += 1;
        if (!fila.ejemplo && ejemplo) fila.ejemplo = ejemplo();
      }
    };
  }
}

const SALDO_NO_NEGATIVO = new Set(['caja', 'banco', 'puente', 'billetera']);

export function auditarCoherencia(estado: EstadoDominio, ahora: FechaHoraISO): ResultadoRegla[] {
  const r = new Registro();
  const ag = estado.agregados;

  // I1 e I2: existencias = Σ movimientos; kardex ≥ 0 en todo punto (orden del libro).
  const i1 = r.regla('I1', 'existencias = Σ movimientos por variante y local');
  const i2 = r.regla('I2', 'kardex ≥ 0 en todo punto, en orden de aplicación');
  const saldo = new Map<string, number>();
  for (const m of estado.movimientos) {
    const k = `${m.varianteId}@${m.localId}`;
    const s = (saldo.get(k) ?? 0) + m.cantidad;
    saldo.set(k, s);
    i2(s >= 0, () => `${k} queda en ${s} con ${m.id}`);
  }
  const claves = new Set<string>([...saldo.keys(), ...Object.keys(ag.existencias)]);
  for (const k of claves) {
    const a = ag.existencias[k as `${string}@${string}`] ?? 0;
    const b = saldo.get(k) ?? 0;
    i1(a === b, () => `${k}: agregado ${a}, movimientos ${b}`);
  }

  // I3: cada línea de venta tiene su salida; anulaciones su reingreso; devoluciones que reingresan, su entrada.
  const i3 = r.regla('I3', 'líneas de venta, anulaciones y devoluciones con su movimiento');
  const porDocumento = new Map<string, number>();
  for (const m of estado.movimientos) {
    const k = `${m.documento.id}|${m.varianteId}|${m.tipo}`;
    porDocumento.set(k, (porDocumento.get(k) ?? 0) + m.cantidad);
  }
  for (const v of Object.values(estado.ventas)) {
    const tipoSalida = v.tipo === 'separado' ? 'salida_separado' : 'salida_venta';
    const esperado = new Map<Id, number>();
    for (const l of v.lineas) esperado.set(l.varianteId, (esperado.get(l.varianteId) ?? 0) + l.cantidad);
    for (const [vid, q] of esperado) {
      const mov = -(porDocumento.get(`${v.id}|${vid}|${tipoSalida}`) ?? 0);
      i3(mov === q, () => `${v.numero} ${vid}: ${mov} de ${q}`);
    }
  }
  for (const d of Object.values(estado.devoluciones)) {
    for (const l of d.lineas) {
      if (!l.reingresa) continue;
      const mov = porDocumento.get(`${d.id}|${l.varianteId}|devolucion_cliente`) ?? 0;
      i3(mov >= l.cantidad, () => `${d.numero}: reingreso ${mov} de ${l.cantidad}`);
    }
  }

  // I4: traslados.
  const i4 = r.regla('I4', 'traslados en tránsito y recibidos con sus movimientos');
  for (const t of Object.values(estado.traslados)) {
    for (const l of t.lineas) {
      const salida = -(porDocumento.get(`${t.id}|${l.varianteId}|traslado_salida`) ?? 0);
      const entrada = porDocumento.get(`${t.id}|${l.varianteId}|traslado_entrada`) ?? 0;
      if (t.estado === 'en_transito') i4(salida >= l.cantidad && entrada === 0, () => `${t.numero} ${l.varianteId}`);
      if (t.estado === 'recibido') i4(salida >= l.cantidad && entrada >= l.cantidad, () => `${t.numero} ${l.varianteId}`);
      if (t.estado === 'solicitado') i4(salida === 0 && entrada === 0, () => `${t.numero} ${l.varianteId}`);
    }
  }

  // I5: toda entrada viene de una importación recibida, un traslado, una devolución o un ajuste con documento.
  const i5 = r.regla('I5', 'toda entrada tiene documento (importación, traslado, devolución, ajuste)');
  for (const m of estado.movimientos) {
    if (m.cantidad <= 0) continue;
    if (m.tipo === 'entrada_importacion') {
      const imp = estado.importaciones[m.documento.id];
      i5(!!imp && imp.estado === 'recibido_bodega', () => `${m.id} sin importación recibida`);
    } else i5(!!m.documento.id, () => `${m.id} sin documento`);
  }

  // I6: la bodega no vende; las ventas web salen del local de despacho.
  const i6 = r.regla('I6', 'la bodega no vende; la web sale del local de despacho');
  for (const v of Object.values(estado.ventas)) {
    i6(estado.locales[v.localId]?.vende !== false, () => v.numero);
    if (v.canal === 'web') i6(v.localId === estado.parametros.ventas.localDespachoWebId, () => v.numero);
  }

  // V1 y V2: totales de línea y venta; pagos de contado.
  const v1 = r.regla('V1', 'totales por línea y por venta (IVA por línea)');
  const v2 = r.regla('V2', 'pagos de contado = total; efectivo: recibido ≥ valor; separado ≥ abono mínimo');
  for (const v of Object.values(estado.ventas)) {
    let total = 0;
    let base = 0;
    let iva = 0;
    let desc = 0;
    let subtotal = 0;
    for (const l of v.lineas) {
      const tasa = estado.productos[l.productoId]?.tarifaIva ?? 0.19;
      v1(
        l.totalFinal === l.precioLista * l.cantidad - l.descuentoAsignado &&
          l.base === baseSinIva(l.totalFinal, tasa) &&
          l.iva === l.totalFinal - l.base,
        () => `${v.numero} ${l.id}`,
      );
      total += l.totalFinal;
      base += l.base;
      iva += l.iva;
      desc += l.descuentoAsignado;
      subtotal += l.precioLista * l.cantidad;
    }
    v1(v.total === total && v.base === base && v.iva === iva && v.descuentos === desc && v.subtotal === subtotal, () => v.numero);
    const pagos = v.pagos.filter((p) => p.tipo === 'pago');
    const pagado = pagos.reduce((a, p) => a + p.valor, 0);
    if (v.tipo === 'contado') v2(pagado === v.total, () => `${v.numero}: ${pagado} de ${v.total}`);
    if (v.tipo === 'separado')
      v2(pagado >= Math.ceil(v.total * estado.parametros.ventas.abonoMinimoSeparado) && !!v.clienteId, () => v.numero);
    if (v.tipo === 'credito') v2(!!v.clienteId, () => v.numero);
    for (const p of pagos) if (p.medio === 'efectivo') v2((p.recibido ?? 0) >= p.valor && p.cambio === (p.recibido ?? 0) - p.valor, () => v.numero);
  }

  // V3: saldo a favor solo con cliente.
  const v3 = r.regla('V3', 'saldo a favor y cambio solo con cliente');
  for (const d of Object.values(estado.devoluciones))
    if (d.compensacion !== 'reembolso') v3(!!estado.ventas[d.ventaId]?.clienteId, () => d.numero);

  // V7: saldos = saldo inicial + pagos de venta + movimientos; nunca negativos.
  const v7 = r.regla('V7', 'saldos de cuenta = inicial + pagos + movimientos; cajas, banco y puente ≥ 0');
  const calc = new Map<Id, number>();
  for (const c of Object.values(estado.cuentas)) calc.set(c.id, c.saldoInicial);
  for (const v of Object.values(estado.ventas))
    for (const p of v.pagos) if (p.cuentaId) calc.set(p.cuentaId, (calc.get(p.cuentaId) ?? 0) + p.valor);
  for (const m of Object.values(estado.movimientosCuenta)) calc.set(m.cuentaId, (calc.get(m.cuentaId) ?? 0) + m.valor);
  for (const c of Object.values(estado.cuentas)) {
    const a = ag.saldosCuentas[c.id] ?? 0;
    const b = calc.get(c.id) ?? 0;
    v7(a === b, () => `${c.nombre}: agregado ${a}, hechos ${b}`);
    if (SALDO_NO_NEGATIVO.has(c.tipo)) v7(a >= 0, () => `${c.nombre} en ${a}`);
  }

  // V8: efectivo de cada sesión.
  const v8 = r.regla('V8', 'efectivo de la sesión = Σ pagos en efectivo + bonos en efectivo');
  const efectivo = new Map<Id, number>();
  for (const v of Object.values(estado.ventas))
    for (const p of v.pagos)
      if (p.medio === 'efectivo' && p.sesionCajaId) efectivo.set(p.sesionCajaId, (efectivo.get(p.sesionCajaId) ?? 0) + p.valor);
  for (const b of Object.values(estado.bonos))
    if (b.pago.medio === 'efectivo' && b.pago.sesionCajaId)
      efectivo.set(b.pago.sesionCajaId, (efectivo.get(b.pago.sesionCajaId) ?? 0) + b.valor);
  for (const s of Object.values(estado.sesionesCaja)) {
    const a = ag.efectivoSesion[s.id] ?? 0;
    const b = efectivo.get(s.id) ?? 0;
    v8(a === b, () => `${s.id}: agregado ${a}, hechos ${b}`);
    if (s.cierre) v8(s.cierre.diferencia === s.cierre.efectivoContado - s.cierre.efectivoEsperado, () => s.id);
  }

  // V11: datáfono por local y día.
  const v11 = r.regla('V11', 'datáfono por local y día = Σ cobros con datáfono (ventas, reembolsos y bonos)');
  const dat = new Map<string, number>();
  const sumarDat = (localId: Id, ts: string, valor: number) => {
    const k = `${localId}@${ts.slice(0, 10)}`;
    dat.set(k, (dat.get(k) ?? 0) + valor);
  };
  for (const v of Object.values(estado.ventas))
    for (const p of v.pagos) if (p.medio === 'datafono_debito' || p.medio === 'datafono_credito') sumarDat(v.localId, p.ts, p.valor);
  for (const b of Object.values(estado.bonos))
    if (b.pago.medio === 'datafono_debito' || b.pago.medio === 'datafono_credito') sumarDat(b.localId, b.vendidoEn, b.valor);
  for (const k of new Set([...dat.keys(), ...Object.keys(ag.datafonoDia)])) {
    const a = ag.datafonoDia[k];
    const b = dat.get(k) ?? 0;
    v11((a ? a.debito + a.credito : 0) === b, () => `${k}: agregado ${a ? a.debito + a.credito : 0}, hechos ${b}`);
  }
  for (const a of Object.values(estado.abonosDatafono))
    v11(ag.abonosDatafonoDia[`${a.localId}@${a.ventasDe}`] === a.id, () => `abonosDatafonoDia ${a.id}`);
  v11(Object.keys(ag.abonosDatafonoDia).length === Object.keys(estado.abonosDatafono).length, () => 'abonosDatafonoDia sobrantes');
  for (const a of Object.values(estado.abonosDatafono)) v11(a.neto === a.bruto - a.comision - a.retenciones.fuente - a.retenciones.iva - a.retenciones.ica, () => a.id);

  // V12: bonos.
  const v12 = r.regla('V12', 'bonos: redimido = Σ pagos con el bono ≤ valor');
  const redimido = new Map<Id, number>();
  for (const v of Object.values(estado.ventas))
    for (const p of v.pagos) if (p.bonoId && p.medio === 'bono_regalo') redimido.set(p.bonoId, (redimido.get(p.bonoId) ?? 0) + p.valor);
  for (const b of Object.values(estado.bonos)) {
    const a = ag.bonosRedimidos[b.id] ?? 0;
    const x = redimido.get(b.id) ?? 0;
    v12(a === x && x <= b.valor, () => `${b.codigo}: agregado ${a}, hechos ${x}, valor ${b.valor}`);
  }

  // Agregados de personas y caja (F2-A1 y F2-A2).
  const ag1 = r.regla('AG', 'marcacionesDia, turnosDia, cajaAbierta y cajaDia coinciden con los hechos');
  const marc = new Map<string, { id: Id; ts: string }[]>();
  for (const m of Object.values(estado.marcaciones)) {
    const k = `${m.empleadoId}@${m.ts.slice(0, 10)}`;
    const l = marc.get(k) ?? [];
    l.push({ id: m.id, ts: m.ts });
    marc.set(k, l);
  }
  for (const k of new Set([...marc.keys(), ...Object.keys(ag.marcacionesDia)])) {
    const esperado = (marc.get(k) ?? [])
      .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : a.id < b.id ? -1 : 1))
      .map((x) => x.id)
      .join(',');
    ag1((ag.marcacionesDia[k] ?? []).join(',') === esperado, () => `marcaciones ${k}`);
  }
  const tur = new Map<string, Id[]>();
  for (const t of Object.values(estado.turnos)) {
    const k = `${t.empleadoId}@${t.fecha}`;
    tur.set(k, [...(tur.get(k) ?? []), t.id]);
  }
  for (const k of new Set([...tur.keys(), ...Object.keys(ag.turnosDia)]))
    ag1([...(ag.turnosDia[k] ?? [])].sort().join(',') === [...(tur.get(k) ?? [])].sort().join(','), () => `turnos ${k}`);
  for (const s of Object.values(estado.sesionesCaja)) {
    ag1(ag.cajaDia[`${s.localId}@${s.abierta.ts.slice(0, 10)}`] === s.id, () => `cajaDia ${s.id}`);
    if (s.cierre === null) ag1(ag.cajaAbierta[s.localId] === s.id, () => `cajaAbierta ${s.id}`);
  }
  for (const [l, id] of Object.entries(ag.cajaAbierta)) ag1(estado.sesionesCaja[id]?.cierre === null && estado.sesionesCaja[id]?.localId === l, () => `cajaAbierta ${l}`);
  // ventasCliente (fase 4): cada venta con cliente está una vez en la lista de su cliente, y nada más.
  const porCliente = new Map<Id, Id[]>();
  for (const v of Object.values(estado.ventas)) if (v.clienteId) porCliente.set(v.clienteId, [...(porCliente.get(v.clienteId) ?? []), v.id]);
  for (const k of new Set([...porCliente.keys(), ...Object.keys(ag.ventasCliente)]))
    ag1([...(ag.ventasCliente[k] ?? [])].sort().join(',') === [...(porCliente.get(k) ?? [])].sort().join(','), () => `ventasCliente ${k}`);

  // M1, M4, M6: importaciones.
  const m1 = r.regla('M1-M6', 'hitos reales en orden; Σ costos prorrateados = total; anticipo y saldo al confirmar');
  for (const imp of Object.values(estado.importaciones)) {
    let previa = '';
    for (const e of Object.keys(imp.hitos) as (keyof typeof imp.hitos)[]) {
      const real = imp.hitos[e].real;
      if (indiceEstado(e) > indiceEstado(imp.estado)) continue;
      m1(!!real && real >= previa, () => `${imp.numero} ${e}`);
      if (real) previa = real;
    }
    const c = calcularCostoAterrizado({
      lineas: imp.lineas,
      costos: imp.costos,
      moneda: imp.moneda,
      metodoProrrateo: imp.metodoProrrateo,
      tasaCosteo: imp.costosAplicados?.tasaCosteo ?? imp.tasaPedido,
    });
    m1(c.porLinea.reduce((a, l) => a + l.costoLinea, 0) === c.total, () => imp.numero);
    if (indiceEstado(imp.estado) >= indiceEstado('pedido_confirmado'))
      m1(imp.cuentaPorPagarIds.some((x) => x.endsWith('cxp-anticipo')) && imp.cuentaPorPagarIds.some((x) => x.endsWith('cxp-saldo')), () => imp.numero);
  }

  // P3: marcaciones alternan entrada/salida.
  const p3 = r.regla('P3', 'marcaciones alternan entrada y salida, empiezan por entrada');
  for (const ids of Object.values(ag.marcacionesDia))
    ids.forEach((id, i) => p3(estado.marcaciones[id]?.tipo === (i % 2 === 0 ? 'entrada' : 'salida'), () => id));

  // G2: nada generado después de ahora.
  const g2 = r.regla('G2', 'ningún registro generado con ts posterior a ahora');
  for (const v of Object.values(estado.ventas)) g2(v.ts <= ahora, () => v.numero);
  for (const m of estado.movimientos) g2(m.ts <= ahora, () => m.id);
  for (const m of Object.values(estado.movimientosCuenta)) g2(m.ts <= ahora, () => m.id);
  for (const m of Object.values(estado.marcaciones)) g2(m.ts <= ahora, () => m.id);
  for (const g of Object.values(estado.gastos)) g2(g.fecha <= ahora.slice(0, 10), () => g.id);

  // Generador: ningún comando omitido.
  const om = r.regla('OMIT', 'comandos generados omitidos = 0');
  om(estado.meta.omitidosGenerador === 0, () => `${estado.meta.omitidosGenerador} omitidos`);

  return r.filas;
}

import type { EstadoDominio, FechaISO, Id, SobreComando } from '@/dominio/tipos';
import { DIAS_CERRADOS } from '@/config/locales';
import { BANDAS_SALDO } from '@/seed/cuentas';
import { HISTORIA_IMPORTACIONES } from '@/seed/importaciones';
import { INDICE_MES } from '@/seed/estacionalidad';
import { diferenciaDias, fechaDe } from '@/dominio/reglas/fechas';
import { proyeccionFlujoEstado } from '@/dominio/reglas/flujo-estado';
import { idGenerado, idHijo } from '@/dominio/motor/ids';
import { masDias } from '../calendario';
import { CUENTA_CORRIENTE, existencias, type Gen, localVivo, varianteVendible } from '../contexto';
import type { IntencionGen } from '../tipos';
import { construirPagos, vendedorPara } from './ventas';

/**
 * Cierres narrativos al día del ancla (PLAN 7.11). Los textos de las alertas no se escriben aquí: los arma
 * `selAlertas` con las cifras reales. Aquí solo se garantizan las situaciones con comandos del catálogo.
 */

type Emitir = ReturnType<Gen['emisor']>;

export const PERSONAS_NARRATIVA = {
  vendedorPersona: 'em_scardenas',
  bodegaPersona: 'em_wdiaz',
  vendedoraEstrella: 'em_vgomez',
  empleadoLlegadasTarde: 'em_mherrera',
  contratistasRiesgo: ['em_dmoreno', 'em_jvargas'],
  clienteFrecuente: 'cl_andres_gutierrez',
  clienteVip: 'cl_ricardo_penuela',
  varianteChinoArena32: 'va_pan_0305_are_32',
  productoOxford: 'pd_cam_0142',
  proveedorSugerencia: 'pr_huameng',
} as const;

export function idsSolicitudes(ancla: FechaISO): { descuento: Id; traslado: Id; anulacion: Id; trasladoId: Id } {
  return {
    descuento: idGenerado('so', 'descuento', ancla),
    traslado: idGenerado('so', 'traslado', ancla),
    anulacion: idGenerado('so', 'anulacion', ancla),
    trasladoId: idGenerado('tr', 'narrativa', ancla),
  };
}

export function* materializarNarrativa(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const emitir = g.emisor(it);
  switch (it.datos.caso) {
    case 'conteo':
      yield* conteoZonaRosa(g, emitir, estado, fechaDe(it.ts));
      break;
    case 'flujo':
      yield* calibrarFlujo(g, emitir, estado, fechaDe(it.ts));
      break;
    case 'solicitudes':
      yield* solicitudes(g, emitir, estado, it);
      break;
    case 'existencias':
      yield* existenciasDirigidas(g, emitir, estado, it);
      break;
  }
}

/** P21: un conteo físico con diferencias en Zona Rosa hace 3 semanas (accesorios). */
function* conteoZonaRosa(g: Gen, emitir: Emitir, estado: EstadoDominio, fecha: FechaISO): Generator<SobreComando> {
  if (!localVivo(estado, 'zr')) return;
  const conteoId = idGenerado('cf', fecha, 'zr');
  if (Object.values(estado.conteos).some((c) => c.localId === 'zr' && c.estado === 'en_curso')) return;
  yield emitir('conteo.iniciar', { conteoId, localId: 'zr', categorias: ['accesorios'] }, { usuarioId: 'u_bodega' });
  const c = estado.conteos[conteoId];
  if (!c) return;
  const rng = g.rng(`conteo:${fecha}`);
  const conStock = Object.keys(c.lineas).filter((v) => existencias(estado, v, 'zr') > 1).sort();
  const faltantes = new Set(rng.muestra(conStock, 3));
  const cantidades: Record<Id, number> = {};
  const motivos: Record<Id, 'perdida' | 'error'> = {};
  for (const v of Object.keys(c.lineas)) {
    const hay = existencias(estado, v, 'zr');
    cantidades[v] = faltantes.has(v) ? hay - 1 : hay;
    if (faltantes.has(v)) motivos[v] = rng.chance(0.7) ? 'perdida' : 'error';
  }
  yield emitir('conteo.guardar', { conteoId, cantidades }, { usuarioId: 'u_bodega' });
  yield emitir('conteo.aplicar', { conteoId, motivos }, { usuarioId: 'u_bodega' });
}

/**
 * N13, P19: la proyección de 90 días (la misma función que usa el selector) debe tener su punto más bajo en
 * ≈ $ 18 millones (rango 10–30). Se ajusta con un retiro o un aporte del socio.
 */
function* calibrarFlujo(g: Gen, emitir: Emitir, estado: EstadoDominio, fecha: FechaISO): Generator<SobreComando> {
  const A = g.plan.ancla;
  const dias = 90 + Math.max(0, diferenciaDias(fecha, A));
  const f = proyeccionFlujoEstado(estado, {
    hoy: fecha,
    dias,
    indiceMes: INDICE_MES,
    diasCerrados: DIAS_CERRADOS,
    festivos: g.plan.calendario.festivos,
  });
  let minimo = Infinity;
  for (const p of f.serie) if (p.fecha >= A && p.saldo < minimo) minimo = p.saldo;
  if (!Number.isFinite(minimo)) return;
  // Se calibra la víspera a las 10:00 p. m.; el día del ancla, la tarde aún no vendida baja ≈ $ 5 M el punto,
  // por eso el objetivo de la víspera es el de la semilla + 3 M (queda en ≈ 18 M al ancla).
  const delta = Math.round((minimo - (BANDAS_SALDO.objetivoPuntoBajo + 3_000_000)) / 100_000) * 100_000;
  if (delta === 0) return;
  const saldo = estado.agregados.saldosCuentas[CUENTA_CORRIENTE] ?? 0;
  if (delta > 0) {
    const valor = Math.min(delta, Math.max(0, saldo - 5_000_000));
    if (valor <= 0) return;
    yield emitir('cuenta.movimiento', {
      movimientoId: idGenerado('mc', 'calibracion', fecha),
      cuentaId: CUENTA_CORRIENTE,
      valor,
      tipo: 'retiro_socio',
      fecha,
      descripcion: 'Retiro del socio',
    });
  } else {
    yield emitir('cuenta.movimiento', {
      movimientoId: idGenerado('mc', 'calibracion', fecha),
      cuentaId: CUENTA_CORRIENTE,
      valor: -delta,
      tipo: 'aporte_socio',
      fecha,
      descripcion: 'Aporte del socio',
    });
  }
}

/** N10: descuento de Sebastián, traslado pedido por Wilson y anulación de una venta de Mateo, pendientes. */
function* solicitudes(g: Gen, emitir: Emitir, estado: EstadoDominio, it: IntencionGen): Generator<SobreComando> {
  const fecha = fechaDe(it.ts);
  const ids = idsSolicitudes(g.plan.ancla);
  // Descuento del 20 % sobre el Blazer de lana fría ($ 789.900 → $ 631.920).
  const blazer = g.plan.productoPorId.get('pd_blz_0401');
  const varianteBlazer = blazer
    ? (['50', '52', '48'].map((t) => blazer.variantes[`${t}|col_azn`]).find((v) => varianteVendible(estado, v)) ?? null)
    : null;
  if (varianteBlazer && !estado.solicitudes[ids.descuento] && estado.empleados.em_scardenas) {
    const lista = estado.productos.pd_blz_0401?.precioVenta ?? 789_900;
    yield emitir(
      'aprobacion.solicitar',
      {
        solicitudId: ids.descuento,
        datos: {
          tipo: 'descuento',
          localId: 'usq',
          vendedorId: 'em_scardenas',
          varianteIds: [varianteBlazer],
          valorLista: lista,
          porcentaje: 0.2,
          valorFinal: Math.round(lista * 0.8),
          motivo: 'Cliente frecuente que se lleva el blazer para un matrimonio',
        },
      },
      { usuarioId: 'u_vendedor' },
    );
  }
  // Traslado de 8 unidades de Parque 93 a Zona Rosa (lo pide Wilson Díaz; requiere aprobación).
  if (localVivo(estado, 'p93') && localVivo(estado, 'zr') && !estado.traslados[ids.trasladoId]) {
    const polo = g.plan.productoPorId.get('pd_pol_0201');
    const lineas: { varianteId: Id; cantidad: number }[] = [];
    let faltan = 8;
    for (const v of Object.values(polo?.variantes ?? {}).sort()) {
      if (faltan <= 0) break;
      const hay = existencias(estado, v, 'p93');
      if (hay < 3 || !varianteVendible(estado, v)) continue;
      const q = Math.min(faltan, hay - 2);
      lineas.push({ varianteId: v, cantidad: q });
      faltan -= q;
    }
    if (faltan === 0) {
      yield emitir(
        'traslado.solicitar',
        {
          trasladoId: ids.trasladoId,
          origenId: 'p93',
          destinoId: 'zr',
          lineas,
          motivo: 'Zona Rosa se quedó corta de polos para el fin de semana',
          requiereAprobacion: true,
          solicitudId: ids.traslado,
        },
        { usuarioId: 'u_bodega' },
      );
    }
  }
  // Anulación de una venta de Mateo Herrera por cobro duplicado.
  let ventaId: Id | undefined;
  for (let k = 0; k < 14 && !ventaId; k++) {
    const id = g.idx.ultimaVentaVendedor.get(`em_mherrera@${masDias(fecha, -k)}`);
    const v = id ? estado.ventas[id] : undefined;
    if (v && !v.anulacion && v.tipo === 'contado') ventaId = id;
  }
  const venta = ventaId ? estado.ventas[ventaId] : undefined;
  if (venta && !estado.solicitudes[ids.anulacion]) {
    const medio = venta.pagos.find((p) => p.tipo === 'pago')?.medio ?? 'datafono_debito';
    const reembolsable = ['datafono_debito', 'datafono_credito', 'nequi', 'daviplata', 'transferencia', 'qr_bre_b'];
    yield emitir(
      'aprobacion.solicitar',
      {
        solicitudId: ids.anulacion,
        datos: {
          tipo: 'anulacion',
          ventaId: venta.id,
          motivo: 'Cobro duplicado',
          reembolso: { medio: reembolsable.includes(medio) ? medio : 'transferencia', sesionCajaId: null },
        },
      },
      { usuarioId: 'em_mherrera' },
    );
  }
}

/**
 * N1 y N12: la Oxford azul cielo M queda en Usaquén 1, Parque 93 2, Zona Rosa 6 y bodega 0; el Pantalón chino
 * elástico arena 32 queda con 5 en Usaquén. Se llega con traslados y ventas mínimos desde lo que haya; solo
 * si no alcanza, con un ajuste documentado (hallazgo).
 */
function* existenciasDirigidas(g: Gen, emitir: Emitir, estado: EstadoDominio, it: IntencionGen): Generator<SobreComando> {
  const fecha = fechaDe(it.ts);
  const [p, t, c] = HISTORIA_IMPORTACIONES.oxfordM.clave.split('|');
  const oxford = g.plan.productoPorId.get(p ?? '')?.variantes[`${t}|${c}`];
  if (oxford) yield* dirigir(g, emitir, estado, it, fecha, oxford, { usq: 1, p93: 2, zr: 6, bod: 0 }, 'ox');
  yield* dirigir(g, emitir, estado, it, fecha, PERSONAS_NARRATIVA.varianteChinoArena32, { usq: 5 }, 'ch');
}

function* dirigir(
  g: Gen,
  emitir: Emitir,
  estado: EstadoDominio,
  it: IntencionGen,
  fecha: FechaISO,
  varianteId: Id,
  objetivo: Record<Id, number>,
  sufijo: string,
): Generator<SobreComando> {
  if (!varianteVendible(estado, varianteId)) return;
  const lugares = Object.keys(objetivo).filter((l) => localVivo(estado, l));
  const otros = ['bod', 'p93', 'zr', 'usq'].filter((l) => !lugares.includes(l) && localVivo(estado, l));
  const hay = (l: Id) => existencias(estado, varianteId, l);
  let n = 0;
  const trasladar = function* (origen: Id, destino: Id, cantidad: number) {
    n += 1;
    const trasladoId = idHijo(idGenerado('tr', 'narrativa', fecha, sufijo), String(n));
    yield emitir('traslado.solicitar', {
      trasladoId,
      origenId: origen,
      destinoId: destino,
      lineas: [{ varianteId, cantidad }],
      motivo: 'Reacomodo de existencias',
      requiereAprobacion: false,
      solicitudId: null,
    });
    if (!estado.traslados[trasladoId]) return;
    yield emitir('traslado.despachar', { trasladoId });
    yield emitir('traslado.recibir', { trasladoId, recibidas: null, nota: null });
  };
  // 1. Excedentes hacia los faltantes (y desde lugares sin objetivo).
  for (const destino of lugares) {
    let falta = (objetivo[destino] ?? 0) - hay(destino);
    for (const origen of [...lugares.filter((l) => l !== destino), ...otros]) {
      if (falta <= 0) break;
      const sobra = lugares.includes(origen) ? hay(origen) - (objetivo[origen] ?? 0) : hay(origen);
      const q = Math.min(falta, sobra);
      if (q <= 0) continue;
      yield* trasladar(origen, destino, q);
      falta = (objetivo[destino] ?? 0) - hay(destino);
    }
  }
  // 2. La bodega no vende: su excedente pasa a un local con objetivo.
  if (objetivo.bod !== undefined && hay('bod') > (objetivo.bod ?? 0)) {
    const destino = lugares.find((l) => l !== 'bod') ?? 'zr';
    yield* trasladar('bod', destino, hay('bod') - (objetivo.bod ?? 0));
  }
  // 3. Excedentes que quedan en los locales: ventas de una unidad a consumidor final.
  let k = 0;
  for (const l of lugares) {
    if (l === 'bod') continue;
    let sobra = hay(l) - (objetivo[l] ?? 0);
    while (sobra > 0 && k < 30) {
      k += 1;
      const rng = g.rng(`${it.clave}:${sufijo}:${k}`);
      const vendedorId = vendedorPara(g, estado, l, it.ts, rng);
      const precio = estado.productos[estado.variantes[varianteId]?.productoId ?? '']?.precioVenta ?? 0;
      if (!vendedorId || precio <= 0) break;
      const ventaId = idGenerado('vt', 'narrativa', fecha, sufijo, String(k));
      yield emitir('venta.registrar', {
        ventaId,
        ts: it.ts,
        localId: l,
        vendedorId,
        canal: 'local',
        tipo: 'contado',
        clienteId: null,
        clienteNuevo: null,
        lineas: [{ varianteId, cantidad: 1, precioLista: null, descuento: null }],
        descuentoGlobal: null,
        aprobacionDescuentoId: null,
        pagos: construirPagos(g, estado, rng, l, fecha, precio, false),
        fechaLimiteSeparado: null,
        ventaOrigenCambioId: null,
        facturaInmediata: null,
        nota: null,
      });
      if (!estado.ventas[ventaId]) break;
      sobra = hay(l) - (objetivo[l] ?? 0);
    }
  }
  // 4. Si no alcanzó (nunca debería), ajuste documentado.
  for (const l of lugares) {
    const falta = (objetivo[l] ?? 0) - hay(l);
    if (falta <= 0) continue;
    yield emitir('inventario.ajustar', {
      movimientoId: idGenerado('mv', 'narrativa', fecha, sufijo, l),
      varianteId,
      localId: l,
      nuevaCantidad: objetivo[l] ?? 0,
      motivo: 'hallazgo',
      nota: 'Prendas encontradas en el reacomodo de la bodega del local',
    });
  }
}

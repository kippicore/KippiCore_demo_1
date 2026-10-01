import type {
  EstadoDominio,
  EstadoImportacion,
  FechaISO,
  Id,
  Importacion,
  MapaComandos,
  SobreComando,
} from '@/dominio/tipos';
import { ESTADOS_IMPORTACION } from '@/dominio/tipos';
import { tasaVigente } from '@/dominio/comandos/comunes';
import { saldoCxP } from '@/dominio/reglas/cuentas';
import { copDeCentavos } from '@/dominio/reglas/dinero';
import { fechaDe } from '@/dominio/reglas/fechas';
import { idHijo } from '@/dominio/motor/ids';
import { masDias } from '../calendario';
import { CUENTA_CORRIENTE, existencias, type Gen, localVivo, varianteVendible } from '../contexto';
import { FRACCION_DISTRIBUIDA } from '../plan-importaciones';
import type { IntencionGen, ImportacionPlan } from '../tipos';
import { asegurarSaldo, pagarCxP } from './pagos';

/**
 * Importaciones (PLAN 7.9, M1–M8, N2–N5): creación, hitos con su fecha real, pagos de anticipo y saldo con la
 * tasa vigente de su fecha, cuentas por pagar de la cadena (M8), aforo, documentos, recepción con defectuosas
 * y distribución a los locales. Guardas: `controlManualHasta`, productos eliminados y estados movidos a mano.
 */

const DOCUMENTOS: Partial<Record<EstadoImportacion, MapaComandos['importacion.documento']['documento']['tipo']>> = {
  pedido_confirmado: 'proforma',
  listo_despacho: 'factura_comercial',
  embarcado: 'bl',
  nacionalizado: 'declaracion_importacion',
};

function indice(e: EstadoImportacion): number {
  return ESTADOS_IMPORTACION.indexOf(e);
}

export function* materializarImportacion(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const plan = g.plan.importacionPorId.get(String(it.datos.impId));
  if (!plan) return;
  yield* avanzarImportacion(g, it, estado, plan, fechaDe(it.ts));
}

/** Reintenta las importaciones que quedaron detenidas por `controlManualHasta`. */
export function* materializarImportacionesDiferidas(
  g: Gen,
  it: IntencionGen,
  estado: EstadoDominio,
): Generator<SobreComando> {
  const fecha = fechaDe(it.ts);
  for (const id of [...g.idx.importacionesDiferidas].sort()) {
    const plan = g.plan.importacionPorId.get(id);
    if (!plan) continue;
    g.idx.importacionesDiferidas.delete(id);
    yield* avanzarImportacion(g, { ...it, clave: `${it.clave}:${id}` }, estado, plan, fecha);
  }
}

function* avanzarImportacion(
  g: Gen,
  it: IntencionGen,
  estado: EstadoDominio,
  plan: ImportacionPlan,
  hoy: FechaISO,
): Generator<SobreComando> {
  const emitir = g.emisor(it);
  const rng = g.rng(it.clave);
  let imp: Importacion | undefined = estado.importaciones[plan.id];
  if (!imp) {
    if (hoy !== plan.creacion) return;
    // Guarda: líneas de productos o variantes eliminados se quitan; si queda vacía, no se crea.
    const lineas = plan.lineas
      .map((l) => {
        if (estado.productos[l.productoId]?.eliminadoEn) return null;
        const cantidades: Record<Id, number> = {};
        for (const [v, n] of Object.entries(l.cantidades)) if (varianteVendible(estado, v) && n > 0) cantidades[v] = n;
        return Object.keys(cantidades).length ? { ...l, cantidades } : null;
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);
    if (!lineas.length || estado.proveedores[plan.proveedorId]?.eliminadoEn) return;
    yield emitir('importacion.crear', {
      importacionId: plan.id,
      proveedorId: plan.proveedorId,
      moneda: plan.moneda,
      tasaPedido: g.plan.tasas.valor(plan.moneda, plan.fechaPedido),
      fechaPedido: plan.fechaPedido,
      carga: plan.carga,
      puertoOrigen: plan.puertoOrigen,
      puertoDestino: 'Buenaventura',
      lineas,
      contactoIds: plan.contactoIds.filter((c) => estado.contactos[c] && !estado.contactos[c]?.eliminadoEn),
      costos: plan.costos,
      metodoProrrateo: 'valor',
      origenSugerencia: null,
      nota: plan.cargaInicial ? 'Carga inicial de existencias' : null,
      numero: null,
    });
    imp = estado.importaciones[plan.id];
    if (!imp) return;
  }
  if (imp.eliminadoEn) return;
  for (let i = indice(imp.estado) + 1; i < ESTADOS_IMPORTACION.length; i++) {
    const e = ESTADOS_IMPORTACION[i] as EstadoImportacion;
    const f = plan.fechas[e];
    if (!f || f > hoy) break;
    const actual: Importacion | undefined = estado.importaciones[plan.id];
    if (!actual || actual.eliminadoEn) return;
    if (indice(actual.estado) >= i) continue;
    if (actual.controlManualHasta && actual.controlManualHasta > hoy) {
      g.idx.importacionesDiferidas.add(plan.id);
      break;
    }
    // Hoy (o la fecha planeada, si fue antes de la ventana).
    const fecha = f < g.plan.vispera ? f : hoy;
    if (e === 'anticipo_pagado') yield* pagarFabrica(g, emitir, estado, plan, 'cxp-anticipo', fecha);
    if (e === 'saldo_pagado') yield* pagarFabrica(g, emitir, estado, plan, 'cxp-saldo', fecha);
    if (e === 'recibido_bodega') {
      yield* recibir(g, emitir, estado, plan, fecha, rng);
      break;
    }
    const portal = plan.portal && plan.portal.estado === e;
    yield emitir(
      'importacion.cambiarEstado',
      {
        importacionId: plan.id,
        estado: e,
        fecha,
        nota: portal ? 'Llegó a Buenaventura. Inicia el proceso de nacionalización.' : null,
        origen: portal ? 'portal' : 'sistema',
        autor: portal ? (plan.portal?.autor ?? null) : null,
      },
      portal ? { usuarioId: 'portal-aduanas' } : {},
    );
    const tras = estado.importaciones[plan.id];
    if (!tras || indice(tras.estado) < i) break;
    // Los tributos se giran al presentar la declaración, al iniciar la nacionalización (M8).
    if (e === 'en_nacionalizacion') yield* pagarCxP(g, emitir, estado, idHijo(plan.id, 'cxp-tributos'), fecha);
    if (e === 'en_nacionalizacion' && plan.aforo)
      yield emitir('importacion.editar', { importacionId: plan.id, cambios: { aforo: { ...plan.aforo } } });
    const doc = DOCUMENTOS[e];
    if (doc)
      yield emitir('importacion.documento', {
        importacionId: plan.id,
        documento: {
          tipo: doc,
          numero: `${doc.slice(0, 2).toUpperCase()}-${tras.numero.slice(4)}`,
          nombreArchivo: `${doc}_${tras.numero}.pdf`,
          estado: 'recibido',
          fecha,
        },
      });
    for (const s of plan.servicios) {
      if (s.estado !== e) continue;
      const cxpId = idHijo(plan.id, s.sufijo);
      if (estado.cuentasPorPagar[cxpId]) continue;
      const vence = masDias(fecha, s.diasPlazo);
      yield emitir('cxp.crear', {
        cxpId,
        datos: {
          categoria: s.categoria,
          terceroNombre: s.tercero,
          proveedorId: s.proveedorId && estado.proveedores[s.proveedorId] ? s.proveedorId : null,
          empleadoId: null,
          concepto: `${s.concepto} ${tras.numero}`,
          localId: null,
          moneda: s.moneda,
          valor: s.valor,
          fechaEmision: fecha,
          fechaVencimiento: vence,
          documento: { tipo: 'importacion', id: plan.id },
          soporte: null,
          nota: null,
        },
      });
      if (!estado.cuentasPorPagar[cxpId]) continue;
      if (vence < g.plan.vispera) yield* pagarCxP(g, emitir, estado, cxpId, vence);
      else g.idx.agregar(g.idx.cxpPorFecha, vence < g.plan.inicio ? g.plan.inicio : vence, cxpId);
    }
  }
  // Fechas estimadas que fija la narrativa (N2–N5), después de los hitos del día.
  const est = plan.estimadasNarrativa;
  if (est && est.fecha === hoy && estado.importaciones[plan.id] && !estado.importaciones[plan.id]?.eliminadoEn) {
    yield emitir('importacion.actualizarHitos', { importacionId: plan.id, estimadas: { ...est.estimadas } });
  }
}

/** Paga a la fábrica (anticipo o saldo) en su moneda con la tasa de la fecha (diferencia en cambio, V10). */
function* pagarFabrica(
  g: Gen,
  emitir: ReturnType<Gen['emisor']>,
  estado: EstadoDominio,
  plan: ImportacionPlan,
  sufijo: string,
  fecha: FechaISO,
): Generator<SobreComando> {
  const cxpId = idHijo(plan.id, sufijo);
  const c = estado.cuentasPorPagar[cxpId];
  if (!c || c.eliminadoEn) return;
  const saldo = saldoCxP(c);
  if (saldo <= 0) return;
  const tasa =
    fecha < g.plan.vispera
      ? g.plan.tasas.valor(plan.moneda, fecha)
      : (tasaVigente(estado, plan.moneda, fecha) ?? g.plan.tasas.valor(plan.moneda, fecha));
  yield* asegurarSaldo(g, emitir, estado, CUENTA_CORRIENTE, copDeCentavos(saldo, tasa), fecha);
  yield emitir('importacion.registrarPago', {
    importacionId: plan.id,
    cxpId,
    abonoId: idHijo(cxpId, 'pago'),
    centavos: saldo,
    tasa,
    fecha,
    cuentaId: CUENTA_CORRIENTE,
  });
}

/** Recepción con defectuosas (P14) y distribución a los locales (≈ 80 %, el resto de reserva en bodega). */
function* recibir(
  g: Gen,
  emitir: ReturnType<Gen['emisor']>,
  estado: EstadoDominio,
  plan: ImportacionPlan,
  fecha: FechaISO,
  rng: ReturnType<Gen['rng']>,
): Generator<SobreComando> {
  let imp = estado.importaciones[plan.id];
  if (!imp || imp.estado === 'recibido_bodega') return;
  if (indice(imp.estado) < indice('nacionalizado')) {
    yield emitir('importacion.cambiarEstado', {
      importacionId: plan.id,
      estado: 'en_transporte_bogota',
      fecha,
      nota: null,
      origen: 'sistema',
      autor: null,
    });
    imp = estado.importaciones[plan.id];
    if (!imp || indice(imp.estado) < indice('nacionalizado')) return;
  }
  if (!localVivo(estado, 'bod')) return;
  const lineas: Record<Id, { recibidas: number; defectuosas: number }> = {};
  const buenas: Record<Id, number> = {};
  for (const l of imp.lineas) {
    for (const [v, n] of Object.entries(l.cantidades)) {
      let def = 0;
      for (let k = 0; k < n; k++) if (rng.chance(plan.defectos)) def += 1;
      lineas[v] = { recibidas: n, defectuosas: def };
      buenas[v] = (buenas[v] ?? 0) + n - def;
    }
  }
  // Distribución: participación del local × afinidad de la categoría (7.9).
  const d = g.plan.demanda;
  const locales = g.plan.localesVenta.filter((l) => localVivo(estado, l.id));
  const distribucion: MapaComandos['importacion.recibir']['distribucion'] = [];
  const porLocal = new Map<Id, { varianteId: Id; cantidad: number }[]>();
  for (const [v, n] of Object.entries(buenas)) {
    if (n <= 0) continue;
    const p = g.plan.productoDeVariante.get(v);
    if (!p) continue;
    const pesos = locales.map(
      (l) => (l.perfil?.participacionDistribucion ?? 0.3) * d.participacion(l.id, fecha, p.categoria),
    );
    const total = pesos.reduce((a, x) => a + x, 0) || 1;
    const repartible = Math.floor(n * FRACCION_DISTRIBUIDA);
    let asignado = 0;
    locales.forEach((l, i) => {
      const q = Math.min(repartible - asignado, Math.round((repartible * (pesos[i] ?? 0)) / total));
      if (q <= 0) return;
      asignado += q;
      const lista = porLocal.get(l.id) ?? [];
      lista.push({ varianteId: v, cantidad: q });
      porLocal.set(l.id, lista);
    });
  }
  for (const l of locales) {
    const lista = porLocal.get(l.id);
    if (lista?.length) distribucion.push({ trasladoId: idHijo(plan.id, `tr-${l.id}`), destinoId: l.id, lineas: lista });
  }
  yield emitir('importacion.recibir', { importacionId: plan.id, fecha, lineas, nota: null, distribucion });
  if (estado.importaciones[plan.id]?.estado !== 'recibido_bodega') return;
  const llegada = fecha < g.plan.inicio ? g.plan.inicio : masDias(fecha, 1);
  for (const x of distribucion) g.idx.agregar(g.idx.trasladosPorRecibir, llegada, x.trasladoId);
  void existencias;
}

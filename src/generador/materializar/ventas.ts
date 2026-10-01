import type {
  Categoria,
  DatosPago,
  DatosRegistrarVenta,
  Descuento,
  EstadoDominio,
  FechaISO,
  Id,
  MedioPago,
  SobreComando,
} from '@/dominio/tipos';
import type { ConfigLocal } from '@/config/locales';
import { calcularVenta, totalPagado } from '@/dominio/reglas/ventas';
import { saldoBono } from '@/dominio/comandos/comunes';
import { efectivoEsperado } from '@/dominio/reglas/caja';
import { diaN, fechaDe, minutosDeHora } from '@/dominio/reglas/fechas';
import { idGenerado, idHijo } from '@/dominio/motor/ids';
import {
  BONOS,
  CANALES,
  DESCUENTOS,
  DEVOLUCIONES,
  DOCUMENTOS,
  EVENTOS_DEMANDA,
  MEDIOS_PAGO_EVOLUCION,
  SEPARADOS,
  TIPOS_VENTA,
  VENDEDORA_ESTRELLA,
} from '@/seed/estacionalidad';
import { masDias } from '../calendario';
import { AJUSTE_ESTRELLA } from '../demanda';
import {
  clienteVivo,
  empleadoActivo,
  existencias,
  type Gen,
  localVivo,
  sesionParaEfectivo,
  varianteVendible,
} from '../contexto';
import { acumular, elegirAcumulada, type Rng } from '../prng';
import type { ClientePlan, IntencionGen, ProductoPlan } from '../tipos';

/**
 * Ventas (PLAN 7.6, 7.7, 7.8): vendedor de turno, cliente (≈ 15 %), líneas con guardas de existencias, medios
 * de pago interpolados, descuentos, separados, crédito VIP, documentos y devoluciones. Cada venta es un
 * `venta.registrar` del mismo manejador que usa el POS.
 */


interface LineaElegida {
  varianteId: Id;
  productoId: Id;
  cantidad: number;
}

const ORDEN_TALLAS: Record<string, readonly string[]> = {
  superior: ['S', 'M', 'L', 'XL', 'XXL'],
  pantalon: ['28', '30', '32', '34', '36', '38', '40'],
  calzado: ['38', '39', '40', '41', '42', '43', '44'],
  sastreria: ['46', '48', '50', '52', '54', '56'],
  unica: ['Única'],
};


/** Vendedor de turno del local a esa hora (7.8): plantilla + guarda de retirados; Valentina pesa × 1,3. */
export function vendedorPara(g: Gen, estado: EstadoDominio, localId: Id, ts: string, rng: Rng): Id | null {
  const fecha = fechaDe(ts);
  const minuto = minutosDeHora(ts.slice(11, 16));
  const plantilla = g.plan.plantillaDe(localId, fecha);
  const esVendedor = (id: Id) => estado.empleados[id]?.cargo === 'vendedor' && empleadoActivo(estado, id, fecha);
  const deTurno = plantilla.filter(
    (t) => esVendedor(t.empleadoId) && minutosDeHora(t.inicio) <= minuto && minuto < minutosDeHora(t.fin),
  );
  let candidatos = deTurno.map((t) => t.empleadoId);
  if (!candidatos.length) {
    // El de turno más cercano en el tiempo del mismo local.
    let mejor: { id: Id; d: number } | null = null;
    for (const t of plantilla) {
      if (!esVendedor(t.empleadoId)) continue;
      const d = Math.min(Math.abs(minutosDeHora(t.inicio) - minuto), Math.abs(minutosDeHora(t.fin) - minuto));
      if (!mejor || d < mejor.d) mejor = { id: t.empleadoId, d };
    }
    if (mejor) candidatos = [mejor.id];
  }
  if (!candidatos.length) {
    // Cualquier vendedor activo del local según la plantilla de la semana.
    const ids = new Set(g.plan.plantilla.filter((t) => t.localId === localId).map((t) => t.empleadoId));
    candidatos = [...ids].filter(esVendedor);
  }
  if (!candidatos.length) return null;
  const pesos = candidatos.map((id) => (id === VENDEDORA_ESTRELLA.empleadoId ? VENDEDORA_ESTRELLA.pesoAsignacion : 1));
  return candidatos[rng.elegirPonderado(pesos)] ?? null;
}

/** Cliente de la venta (7.7): ≈ 15 % identificado; peso = frecuencia latente × activo × 1,8 si es su local. */
export function elegirCliente(
  g: Gen,
  estado: EstadoDominio,
  rng: Rng,
  localId: Id,
  fecha: FechaISO,
  forzar: boolean,
  filtro: ((c: ClientePlan) => boolean) | null = null,
): ClientePlan | null {
  // Separados y créditos llevan cliente siempre (≈ 2,5 % de las ventas): el resto se descuenta del 15 % (P11).
  if (!forzar && !rng.chance(g.plan.config.clientes.proporcionVentasConCliente - 0.022)) return null;
  const candidatos: ClientePlan[] = [];
  const pesos: number[] = [];
  for (const c of g.plan.clientes) {
    if (c.activoDesde > fecha || (c.activoHasta !== null && c.activoHasta < fecha)) continue;
    if (c.alta.slice(0, 10) > fecha) continue;
    if (filtro && !filtro(c)) continue;
    candidatos.push(c);
    pesos.push(c.tasa * (c.localHabitual === localId ? 1.8 : 1));
  }
  for (let intento = 0; intento < 3 && candidatos.length; intento++) {
    const c = candidatos[rng.elegirPonderado(pesos)];
    if (c && clienteVivo(estado, c.id)) return c;
  }
  return null;
}

function tallaDeCliente(c: ClientePlan, curva: ProductoPlan['curva']): string | null {
  if (curva === 'unica') return 'Única';
  return c.tallas[curva];
}

/** Elige una variante con existencias con las guardas de 7.6 (otro color, talla vecina, otra referencia). */
function elegirVariante(
  g: Gen,
  estado: EstadoDominio,
  rng: Rng,
  localId: Id,
  fecha: FechaISO,
  categoria: Categoria,
  cliente: ClientePlan | null,
  usadas: Map<Id, number>,
  registrar: boolean,
): LineaElegida | null {
  const d = g.plan.demanda;
  const disponible = (v: Id | undefined): v is Id =>
    !!v && varianteVendible(estado, v) && existencias(estado, v, localId) - (usadas.get(v) ?? 0) > 0;
  const p = d.elegirProducto(rng, categoria, fecha);
  if (!p || estado.productos[p.id]?.eliminadoEn) return null;
  const talla = (cliente ? tallaDeCliente(cliente, p.curva) : null) ?? d.elegirTalla(rng, p);
  const color = d.elegirColor(rng, p, fecha);
  const v = p.variantes[`${talla}|${color}`];
  const linea = (varianteId: Id, prod: ProductoPlan): LineaElegida => ({
    varianteId,
    productoId: prod.id,
    cantidad: 1,
  });
  if (disponible(v)) return linea(v, p);
  if (registrar && v) g.idx.insatisfecha.push({ fecha, clave: `${v}@${localId}` });
  // (1) Otro color, misma talla.
  const inicio = Math.floor(rng.decimal() * p.colores.length);
  for (let k = 0; k < p.colores.length; k++) {
    const c = p.colores[(inicio + k) % p.colores.length] as Id;
    const v2 = p.variantes[`${talla}|${c}`];
    if (disponible(v2)) return linea(v2, p);
  }
  // (2) Talla vecina si el cliente es flexible (60 %).
  if (rng.chance(0.6)) {
    const orden = ORDEN_TALLAS[p.curva] ?? [];
    const i = orden.indexOf(talla);
    for (const t of [orden[i + 1], orden[i - 1]]) {
      if (!t) continue;
      for (const c of p.colores) {
        const v3 = p.variantes[`${t}|${c}`];
        if (disponible(v3)) return linea(v3, p);
      }
    }
  }
  // (3) Otra referencia de la misma categoría.
  for (let k = 0; k < 3; k++) {
    const q = d.elegirProducto(rng, categoria, fecha);
    if (!q || q.id === p.id || estado.productos[q.id]?.eliminadoEn) continue;
    const t = (cliente ? tallaDeCliente(cliente, q.curva) : null) ?? (q.curva === p.curva ? talla : d.elegirTalla(rng, q));
    for (const c of q.colores) {
      const v4 = q.variantes[`${t}|${c}`];
      if (disponible(v4)) return linea(v4, q);
    }
  }
  return null;
}

export interface OpcionesLineas {
  n: number;
  cliente: ClientePlan | null;
  ajuste: Partial<Record<Categoria, number>> | null;
  /** Categorías fijas (separados guionados). */
  categorias?: Categoria[];
  /** Agregar un accesorio con esta probabilidad si no hay (P2). */
  accesorio?: number;
}

export function elegirLineas(
  g: Gen,
  estado: EstadoDominio,
  rng: Rng,
  localId: Id,
  fecha: FechaISO,
  o: OpcionesLineas,
): LineaElegida[] {
  const usadas = new Map<Id, number>();
  const r: LineaElegida[] = [];
  const d = g.plan.demanda;
  for (let i = 0; i < o.n; i++) {
    const intentos = r.length === 0 ? 3 : 1;
    for (let k = 0; k < intentos; k++) {
      const cat = o.categorias?.[i] ?? d.elegirCategoria(rng, localId, fecha, o.ajuste);
      const l = elegirVariante(g, estado, rng, localId, fecha, cat, o.cliente, usadas, k === 0);
      if (!l) continue;
      const p = g.plan.productoPorId.get(l.productoId);
      // Corbatas: a veces dos (7.6).
      if (p?.categoria === 'accesorios' && estado.productos[p.id]?.tipoPrenda === 'corbata' && rng.chance(0.1)) {
        if (existencias(estado, l.varianteId, localId) - (usadas.get(l.varianteId) ?? 0) >= 2) l.cantidad = 2;
      }
      const previa = r.find((x) => x.varianteId === l.varianteId);
      if (previa) previa.cantidad += l.cantidad;
      else r.push(l);
      usadas.set(l.varianteId, (usadas.get(l.varianteId) ?? 0) + l.cantidad);
      break;
    }
  }
  if (o.accesorio && r.length && !r.some((x) => g.plan.productoPorId.get(x.productoId)?.categoria === 'accesorios')) {
    if (rng.chance(o.accesorio)) {
      const l = elegirVariante(g, estado, rng, localId, fecha, 'accesorios', o.cliente, usadas, false);
      if (l) r.push(l);
    }
  }
  return r;
}

/** Pesos de los medios de pago interpolados entre "hace 12 meses" y "mes actual" (P9). */
function pesosMedios(g: Gen, fecha: FechaISO): { medios: MedioPago[]; acumulada: number[] } {
  const desde = masDias(g.plan.ancla, -365);
  const t = fecha <= desde ? 0 : fecha >= g.plan.ancla ? 1 : (diaN(fecha) - diaN(desde)) / 365;
  const lista = MEDIOS_PAGO_EVOLUCION.filter((m) => m.medio !== 'bono_regalo');
  return {
    medios: lista.map((m) => m.medio),
    acumulada: acumular(lista.map((m) => m.hace12Meses + (m.mesActual - m.hace12Meses) * t)),
  };
}

const cacheMedios = new WeakMap<Gen, Map<FechaISO, { medios: MedioPago[]; acumulada: number[] }>>();
function medios(g: Gen, fecha: FechaISO) {
  let m = cacheMedios.get(g);
  if (!m) {
    m = new Map();
    cacheMedios.set(g, m);
  }
  let x = m.get(fecha);
  if (!x) {
    x = pesosMedios(g, fecha);
    m.set(fecha, x);
  }
  return x;
}

function pago(medio: MedioPago, valor: number, extra: Partial<DatosPago> = {}): DatosPago {
  return { medio, valor, recibido: null, referencia: null, sesionCajaId: null, bonoId: null, ...extra };
}

/** Efectivo recibido: a veces exacto, a veces redondeado al billete siguiente. */
function recibidoEfectivo(rng: Rng, valor: number): number {
  if (rng.chance(0.45)) return valor;
  const billete = rng.chance(0.5) ? 50_000 : 10_000;
  return Math.ceil(valor / billete) * billete;
}

/** Pagos de una venta de contado por `valor` (P9, pagos mixtos 8 %). */
export function construirPagos(
  g: Gen,
  estado: EstadoDominio,
  rng: Rng,
  localId: Id,
  fecha: FechaISO,
  valor: number,
  permitirMixto = true,
): DatosPago[] {
  const sesion = sesionParaEfectivo(estado, localId, fecha);
  const m = medios(g, fecha);
  let medio = m.medios[elegirAcumulada(rng, m.acumulada)] ?? 'datafono_debito';
  if (medio === 'efectivo' && !sesion) medio = 'datafono_debito';
  if (permitirMixto && sesion && valor >= 40_000 && rng.chance(TIPOS_VENTA.pagoMixto)) {
    const efectivo = Math.max(10_000, Math.round((valor * rng.rango(0.3, 0.6)) / 10_000) * 10_000);
    if (efectivo < valor) {
      return [
        pago('efectivo', efectivo, { sesionCajaId: sesion, recibido: recibidoEfectivo(rng, efectivo) }),
        pago(rng.chance(0.5) ? 'nequi' : 'datafono_debito', valor - efectivo),
      ];
    }
  }
  if (medio === 'efectivo') return [pago('efectivo', valor, { sesionCajaId: sesion, recibido: recibidoEfectivo(rng, valor) })];
  return [pago(medio, valor, medio.startsWith('datafono') ? { referencia: String(rng.entero(100000, 999999)) } : {})];
}

function descuentoDeVenta(g: Gen, rng: Rng, fecha: FechaISO): Descuento | null {
  if (g.plan.calendario.esBlackFriday(fecha) && rng.chance(EVENTOS_DEMANDA.blackFriday.proporcionConDescuento)) {
    const v = rng.rango(EVENTOS_DEMANDA.blackFriday.descuentoMin, EVENTOS_DEMANDA.blackFriday.descuentoMax);
    return { tipo: 'porcentaje', valor: Math.round(v * 100) / 100 };
  }
  if (fecha.slice(5, 7) === '01' && rng.chance(0.5))
    return { tipo: 'porcentaje', valor: EVENTOS_DEMANDA.liquidacionEnero.descuento };
  if (rng.chance(DESCUENTOS.proporcion)) {
    const v = rng.rango(DESCUENTOS.minimo, DESCUENTOS.maximo);
    return { tipo: 'porcentaje', valor: Math.round(v * 100) / 100 };
  }
  return null;
}

/** Documento electrónico (7.6): solo en los últimos 90 días; ≈ 55 % factura electrónica. */
function documentoDe(
  g: Gen,
  rng: Rng,
  ventaId: Id,
  fecha: FechaISO,
  cliente: ClientePlan | null,
): DatosRegistrarVenta['facturaInmediata'] {
  if (fecha < masDias(g.plan.ancla, -DOCUMENTOS.diasConDocumento)) return null;
  const fe = rng.chance(DOCUMENTOS.proporcionFacturaElectronica);
  return {
    facturaId: idHijo(ventaId, 'doc'),
    tipo: fe ? 'factura_electronica' : 'documento_equivalente_pos',
    adquirente:
      cliente && fe
        ? {
            tipo: 'identificado',
            clienteId: cliente.id,
            nombre: `${cliente.datos.nombres} ${cliente.datos.apellidos}`,
            documento: cliente.datos.documento?.numero ?? null,
            correo: cliente.datos.correo,
          }
        : { tipo: 'consumidor_final', clienteId: null, nombre: 'Consumidor final', documento: null, correo: null },
  };
}

interface VentaArmada {
  datos: DatosRegistrarVenta;
  total: number;
  iva: number;
  base: number;
}

function armarVenta(
  estado: EstadoDominio,
  ventaId: Id,
  ts: string,
  localId: Id,
  vendedorId: Id,
  cliente: ClientePlan | null,
  lineas: LineaElegida[],
  descuento: Descuento | null,
): VentaArmada {
  const totales = calcularVenta(
    lineas.map((l) => {
      const p = estado.productos[l.productoId];
      return { precioLista: p?.precioVenta ?? 0, cantidad: l.cantidad, descuento: null, tarifaIva: p?.tarifaIva ?? 0.19 };
    }),
    descuento,
  );
  return {
    total: totales.total,
    iva: totales.iva,
    base: totales.base,
    datos: {
      ventaId,
      ts,
      localId,
      vendedorId,
      canal: 'local',
      tipo: 'contado',
      clienteId: cliente?.id ?? null,
      clienteNuevo: null,
      lineas: lineas.map((l) => ({ varianteId: l.varianteId, cantidad: l.cantidad, precioLista: null, descuento: null })),
      descuentoGlobal: descuento,
      aprobacionDescuentoId: null,
      pagos: [],
      fechaLimiteSeparado: null,
      ventaOrigenCambioId: null,
      facturaInmediata: null,
      nota: null,
    },
  };
}

/** Programa abonos o cancelación de un separado (7.6, P17). */
function programarSeparado(g: Gen, rng: Rng, ventaId: Id, localId: Id, fecha: FechaISO, limite: FechaISO, narrativo: boolean): void {
  const A = g.plan.ancla;
  const k = rng.entero(...SEPARADOS.abonos);
  const completa = narrativo || rng.chance(SEPARADOS.completados);
  // Fuera de la narrativa, los separados de las 5 semanas previas al ancla se cierran antes del ancla (N7: 14).
  let ultimo = limite;
  if (!narrativo && fecha >= masDias(A, -35) && fecha < A && limite >= A) ultimo = masDias(A, -1);
  let primero = masDias(fecha, 1);
  if (narrativo) primero = masDias(A, 1);
  if (ultimo < primero) ultimo = primero;
  const span = Math.max(0, diaN(ultimo) - diaN(primero));
  if (!completa) {
    const f = masDias(limite, rng.entero(1, 5));
    g.idx.agregar(g.idx.separados, `${f}|${localId}`, { ventaId, localId, accion: 'cancelar', fraccion: 0 });
    return;
  }
  for (let i = 1; i <= k; i++) {
    const f = masDias(primero, Math.round((span * i) / k));
    g.idx.agregar(g.idx.separados, `${f}|${localId}`, {
      ventaId,
      localId,
      accion: 'abono',
      fraccion: i === k ? 1 : 1 / (k - i + 1),
    });
  }
}

const SEPARADOS_ALTO = TIPOS_VENTA.separado * 1.7;

/** Venta de una intención 'venta' (o guionada). */
export function* materializarVenta(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const emitir = g.emisor(it);
  const rng = g.rng(it.clave);
  const localId = String(it.datos.localId);
  const fecha = fechaDe(it.ts);
  if (!localVivo(estado, localId)) return;
  const local = g.plan.local(localId) as ConfigLocal;
  const vendedorId = vendedorPara(g, estado, localId, it.ts, rng);
  if (!vendedorId) return;
  const narrativo = g.plan.separadosNarrativos.get(it.clave);
  const A = g.plan.ancla;
  // Tipo de venta.
  const fueraVentanaSeparados = fecha >= masDias(A, -21) && fecha < A;
  const pSeparado =
    (Number(fecha.slice(5, 7)) >= 11 ? SEPARADOS_ALTO : TIPOS_VENTA.separado) * (fueraVentanaSeparados ? 0 : 1);
  let tipo: 'contado' | 'separado' | 'credito' = 'contado';
  if (narrativo || rng.chance(pSeparado)) tipo = 'separado';
  else if (rng.chance(TIPOS_VENTA.creditoVip)) tipo = 'credito';
  const cliente = elegirCliente(g, estado, rng, localId, fecha, tipo !== 'contado', tipo === 'credito' ? (c) => c.tipo === 'vip' : null);
  if (tipo !== 'contado' && !cliente) tipo = 'contado';
  // Líneas.
  const estrella = vendedorId === VENDEDORA_ESTRELLA.empleadoId;
  const upv = local.perfil?.unidadesPorVenta ?? 1.4;
  const n = Math.min(4, 1 + rng.poisson(Math.max(0.05, upv - (estrella ? 1.25 : 1.05))));
  const lineas = elegirLineas(g, estado, rng, localId, fecha, {
    n: narrativo ? 1 : n,
    cliente,
    ajuste: estrella ? AJUSTE_ESTRELLA : null,
    categorias: narrativo ? [narrativo.porVencer ? 'blazers' : (['blazers', 'abrigos_chaquetas', 'trajes'] as Categoria[])[narrativo.indice % 3] ?? 'blazers'] : undefined,
    accesorio: estrella ? VENDEDORA_ESTRELLA.accesorio - 0.12 : 0,
  });
  if (!lineas.length) return;
  const ventaId = idGenerado('vt', fecha, localId, String(Number(it.datos.indice ?? 0)).padStart(3, '0'));
  const descuento = tipo === 'contado' ? descuentoDeVenta(g, rng, fecha) : null;
  const v = armarVenta(estado, ventaId, it.ts, localId, vendedorId, cliente, lineas, descuento);
  // Canal (web solo en los últimos 6 meses y desde el local de despacho).
  const r = rng.decimal();
  const webDesde = masDias(A, -30 * CANALES.mesesWeb);
  if (localId === estado.parametros.ventas.localDespachoWebId && fecha >= webDesde && tipo === 'contado' && r < 0.05)
    v.datos.canal = 'web';
  else if (r > 1 - CANALES.whatsapp) v.datos.canal = 'whatsapp';
  else if (r > 1 - CANALES.whatsapp - CANALES.instagram) v.datos.canal = 'instagram';
  // Pagos.
  v.datos.tipo = tipo;
  let financiera = 0;
  if (tipo === 'separado') {
    const fraccion = narrativo ? rng.rango(0.25, 0.4) : rng.rango(...SEPARADOS.abonoInicial);
    const minimo = Math.ceil(v.total * estado.parametros.ventas.abonoMinimoSeparado);
    let abono = Math.max(minimo, Math.round((v.total * fraccion) / 1000) * 1000);
    if (abono >= v.total) abono = minimo;
    v.datos.pagos = construirPagos(g, estado, rng, localId, fecha, abono, false);
    const limite = narrativo
      ? narrativo.fechaLimite
      : masDias(fecha, rng.entero(...SEPARADOS.plazoDias));
    v.datos.fechaLimiteSeparado = limite;
  } else if (tipo === 'credito') {
    v.datos.pagos = [];
  } else {
    const bono = redencionPendiente(g, estado, localId, fecha);
    if (bono && v.datos.canal !== 'web') {
      const usar = Math.min(bono.saldo, v.total);
      v.datos.pagos = [pago('bono_regalo', usar, { bonoId: bono.id })];
      if (usar < v.total) v.datos.pagos.push(pago('datafono_debito', v.total - usar));
    } else if (v.datos.canal === 'web') v.datos.pagos = [pago('pasarela_web', v.total)];
    else v.datos.pagos = construirPagos(g, estado, rng, localId, fecha, v.total);
    for (const p of v.datos.pagos) if (p.medio === 'credito_financiera') financiera += p.valor;
  }
  v.datos.facturaInmediata = documentoDe(g, rng, ventaId, fecha, cliente);
  yield emitir('venta.registrar', v.datos);
  const venta = estado.ventas[ventaId];
  if (!venta) return;
  g.idx.sumarVenta(fecha.slice(0, 7), venta.iva, venta.base, financiera);
  g.idx.ultimaVentaVendedor.set(`${vendedorId}@${fecha}`, ventaId);
  if (tipo === 'separado' && v.datos.fechaLimiteSeparado)
    programarSeparado(g, rng, ventaId, localId, fecha, v.datos.fechaLimiteSeparado, !!narrativo);
  else if (tipo === 'contado' && rng.chance(DEVOLUCIONES.proporcion)) {
    const f = masDias(fecha, rng.entero(...DEVOLUCIONES.diasDespues));
    g.idx.agregar(g.idx.devoluciones, `${f}|${localId}`, { ventaId, localId });
  } else if (tipo === 'credito') {
    // Crédito propio VIP: se abona en 1–2 pagos dentro del mes.
    const f = masDias(fecha, rng.entero(10, 30));
    g.idx.agregar(g.idx.separados, `${f}|${localId}`, { ventaId, localId, accion: 'abono', fraccion: 1 });
  }
}

/** Bono pendiente de redimir en el local (7.6: ≈ 85 % se redimen en 2–8 semanas). */
function redencionPendiente(g: Gen, estado: EstadoDominio, localId: Id, fecha: FechaISO): { id: Id; saldo: number } | null {
  const cola = g.idx.redenciones.get(localId);
  if (!cola?.length) return null;
  const primero = cola[0];
  if (!primero || primero.desde > fecha) return null;
  cola.shift();
  const bono = estado.bonos[primero.bonoId];
  if (!bono || bono.vence < fecha) return null;
  const saldo = saldoBono(estado, bono.id);
  return saldo > 0 ? { id: bono.id, saldo } : null;
}

/** Compra guionada de Andrés Gutiérrez o Ricardo Peñuela (N8, N12). */
export function* materializarVentaGuion(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const guion = g.plan.narrativa.comprasGuion.find((x) => x.clave === it.clave);
  if (!guion) return;
  const emitir = g.emisor(it);
  const rng = g.rng(it.clave);
  const fecha = fechaDe(it.ts);
  if (!localVivo(estado, guion.localId) || !clienteVivo(estado, guion.clienteId)) return;
  let vendedorId: Id | null = guion.vendedorId;
  if (!empleadoActivo(estado, vendedorId, fecha)) vendedorId = vendedorPara(g, estado, guion.localId, it.ts, rng);
  if (!vendedorId) return;
  const lineas: LineaElegida[] = [];
  const usadas = new Map<Id, number>();
  for (const l of guion.lineas) {
    const p = g.plan.productoPorId.get(l.productoId);
    if (!p) continue;
    let v = p.variantes[`${l.talla}|${l.colorId}`];
    const ok = (x: Id | undefined): x is Id =>
      !!x && varianteVendible(estado, x) && existencias(estado, x, guion.localId) - (usadas.get(x) ?? 0) > 0;
    if (!ok(v)) v = p.colores.map((c) => p.variantes[`${l.talla}|${c}`]).find(ok);
    if (!ok(v)) {
      // La prenda guionada no está en el local: llega por traslado desde la bodega u otro local.
      const origen = ['bod', 'p93', 'zr', 'usq'].find(
        (o) => o !== guion.localId && localVivo(estado, o) && existencias(estado, p.variantes[`${l.talla}|${l.colorId}`] ?? '', o) > 0,
      );
      const objetivo = p.variantes[`${l.talla}|${l.colorId}`];
      if (origen && objetivo && varianteVendible(estado, objetivo)) {
        const trasladoId = idHijo(idGenerado('tr', 'guion', fecha, guion.clienteId.slice(3)), `${lineas.length + 1}`);
        yield emitir('traslado.solicitar', {
          trasladoId,
          origenId: origen,
          destinoId: guion.localId,
          lineas: [{ varianteId: objetivo, cantidad: 1 }],
          motivo: 'Pedido para un cliente',
          requiereAprobacion: false,
          solicitudId: null,
        });
        if (estado.traslados[trasladoId]) {
          yield emitir('traslado.despachar', { trasladoId });
          yield emitir('traslado.recibir', { trasladoId, recibidas: null, nota: null });
        }
        v = objetivo;
      }
    }
    if (!ok(v)) continue;
    lineas.push({ varianteId: v, productoId: p.id, cantidad: 1 });
    usadas.set(v, (usadas.get(v) ?? 0) + 1);
  }
  if (!lineas.length) return;
  const ventaId = idGenerado('vt', 'guion', fecha, guion.clienteId.slice(3));
  const cliente = g.plan.clientePorId.get(guion.clienteId) ?? null;
  const v = armarVenta(estado, ventaId, it.ts, guion.localId, vendedorId, cliente, lineas, null);
  v.datos.clienteId = guion.clienteId;
  v.datos.pagos = construirPagos(g, estado, rng, guion.localId, fecha, v.total, false);
  v.datos.facturaInmediata = documentoDe(g, rng, ventaId, fecha, null);
  yield emitir('venta.registrar', v.datos);
  const venta = estado.ventas[ventaId];
  if (venta) g.idx.sumarVenta(fecha.slice(0, 7), venta.iva, venta.base, 0);
}

/** Venta de un bono de regalo en temporada (7.6) y su redención programada. */
export function* materializarBono(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const emitir = g.emisor(it);
  const rng = g.rng(it.clave);
  const localId = String(it.datos.localId);
  const fecha = fechaDe(it.ts);
  if (!localVivo(estado, localId)) return;
  const valor = Math.round(rng.rango(BONOS.valores[0], BONOS.valores[1]) / 50_000) * 50_000;
  const bonoId = idGenerado('bo', fecha, String(it.datos.k));
  const [p] = construirPagos(g, estado, rng, localId, fecha, valor, false);
  if (!p) return;
  if (p.medio === 'credito_financiera' || p.medio === 'transferencia' || p.medio === 'qr_bre_b') p.medio = 'datafono_credito';
  yield emitir('bono.vender', { bonoId, codigo: null, valor, localId, pago: p, vence: masDias(fecha, 365) });
  if (!estado.bonos[bonoId] || !rng.chance(BONOS.redimidos)) return;
  const desde = masDias(fecha, 7 * rng.entero(...BONOS.semanasRedencion));
  const destino = rng.chance(0.8) ? localId : (['p93', 'zr', 'usq'][rng.entero(0, 2)] ?? localId);
  const cola = g.idx.redenciones.get(destino) ?? [];
  cola.push({ bonoId, desde });
  cola.sort((a, b) => (a.desde < b.desde ? -1 : a.desde > b.desde ? 1 : a.bonoId < b.bonoId ? -1 : 1));
  g.idx.redenciones.set(destino, cola);
}

/** Revisión diaria por local: abonos y cancelaciones de separados, devoluciones y cambios (7.6). */
export function* materializarRevision(g: Gen, it: IntencionGen, estado: EstadoDominio): Generator<SobreComando> {
  const emitir = g.emisor(it);
  const localId = String(it.datos.localId);
  const fecha = fechaDe(it.ts);
  if (!localVivo(estado, localId)) return;
  if (it.datos.franja === 'separados') {
    const eventos = g.idx.pendientes(g.idx.separados, localId, 'separados', fecha, g.plan.inicio);
    for (const ev of eventos) {
      const venta = estado.ventas[ev.ventaId];
      if (!venta || venta.anulacion || venta.separado?.cerrado) continue;
      if (venta.tipo !== 'separado' && venta.tipo !== 'credito') continue;
      const rng = g.rng(`${it.clave}:${ev.ventaId}`);
      const saldo = venta.total - totalPagado(venta);
      if (saldo <= 0) continue;
      if (ev.accion === 'cancelar') {
        if (!venta.clienteId) continue;
        yield emitir('separado.cancelar', { ventaId: venta.id, destinoAbonos: 'saldo_favor', reembolso: null });
        continue;
      }
      let valor = ev.fraccion >= 1 ? saldo : Math.round((saldo * ev.fraccion) / 1000) * 1000;
      if (valor <= 0 || valor > saldo) valor = saldo;
      const [p] = construirPagos(g, estado, rng, localId, fecha, valor, false);
      if (!p) continue;
      yield emitir('venta.abonar', { ventaId: venta.id, pago: p });
    }
    return;
  }
  // Devoluciones (≈ 3 %), 1–15 días después: cambio, saldo a favor o reembolso.
  const eventos = g.idx.pendientes(g.idx.devoluciones, localId, 'devoluciones', fecha, g.plan.inicio);
  for (const [k, ev] of eventos.entries()) {
    const venta = estado.ventas[ev.ventaId];
    if (!venta || venta.anulacion || venta.tipo === 'separado') continue;
    if (Object.values(estado.devoluciones).some((d) => d.ventaId === venta.id)) continue;
    const rng = g.rng(`${it.clave}:${ev.ventaId}`);
    const linea = venta.lineas[rng.entero(0, venta.lineas.length - 1)];
    if (!linea) continue;
    const conCliente = !!venta.clienteId && clienteVivo(estado, venta.clienteId);
    let compensacion: 'reembolso' | 'saldo_favor' | 'cambio' = 'reembolso';
    if (conCliente) {
      const x = rng.decimal();
      compensacion = x < DEVOLUCIONES.conCliente.cambio ? 'cambio' : x < DEVOLUCIONES.conCliente.cambio + DEVOLUCIONES.conCliente.saldoFavor ? 'saldo_favor' : 'reembolso';
    }
    const devolucionId = idGenerado('dv', fecha, localId, String(k + 1));
    let reembolso: { medio: MedioPago; sesionCajaId: Id | null } | null = null;
    if (compensacion === 'reembolso') {
      const valorAprox = linea.totalFinal / Math.max(1, linea.cantidad);
      const original = venta.pagos.find((p) => p.tipo === 'pago')?.medio ?? 'transferencia';
      const sesion = sesionParaEfectivo(estado, localId, fecha);
      const s = sesion ? estado.sesionesCaja[sesion] : undefined;
      const hayEfectivo = s ? efectivoEsperado(s.abierta.baseInicial, estado.agregados.efectivoSesion[s.id] ?? 0, s.egresos) >= valorAprox : false;
      if (original === 'efectivo' && hayEfectivo) reembolso = { medio: 'efectivo', sesionCajaId: sesion };
      else if (original === 'datafono_debito' || original === 'datafono_credito') {
        // El datáfono solo devuelve si el local ya cobró con datáfono hoy al menos ese valor (el abono del día
        // nunca queda negativo); si no, se devuelve por transferencia.
        const hoy = estado.agregados.datafonoDia[`${localId}@${fecha}`];
        reembolso =
          hoy && hoy.debito + hoy.credito >= valorAprox
            ? { medio: original, sesionCajaId: null }
            : { medio: 'transferencia', sesionCajaId: null };
      } else if (['nequi', 'daviplata', 'qr_bre_b'].includes(original)) reembolso = { medio: original, sesionCajaId: null };
      else reembolso = { medio: 'transferencia', sesionCajaId: null };
      if (totalPagado(venta) < valorAprox) continue;
    }
    yield emitir('devolucion.registrar', {
      devolucionId,
      ventaId: venta.id,
      lineas: [{ lineaId: linea.id, cantidad: 1, reingresa: !rng.chance(DEVOLUCIONES.noReingresa) }],
      motivo: compensacion === 'cambio' ? 'Cambio de talla' : rng.chance(0.5) ? 'No le quedó bien' : 'Cambió de opinión',
      compensacion,
      reembolso,
      notaCreditoId: venta.facturaId ? idHijo(devolucionId, 'nc') : null,
      clienteNuevo: null,
    });
    const dev = estado.devoluciones[devolucionId];
    if (!dev || compensacion !== 'cambio' || !venta.clienteId) continue;
    // Cambio: la misma referencia en otra talla (o color) pagada con el saldo a favor.
    const p = g.plan.productoDeVariante.get(linea.varianteId);
    if (!p) continue;
    const vOriginal = estado.variantes[linea.varianteId];
    const candidatos = Object.entries(p.variantes)
      .filter(([k2, id]) => id !== linea.varianteId && (k2.split('|')[0] !== vOriginal?.talla || rng.chance(0.3)))
      .map(([, id]) => id)
      .filter((id) => varianteVendible(estado, id) && existencias(estado, id, localId) > 0);
    const nueva = candidatos.length ? candidatos[rng.entero(0, candidatos.length - 1)] : undefined;
    if (!nueva) continue;
    const ventaId = idHijo(devolucionId, 'cambio');
    const cliente = g.plan.clientePorId.get(venta.clienteId) ?? null;
    const v = armarVenta(estado, ventaId, it.ts, localId, venta.vendedorId, cliente, [{ varianteId: nueva, productoId: p.id, cantidad: 1 }], null);
    if (!empleadoActivo(estado, venta.vendedorId, fecha)) {
      const otro = vendedorPara(g, estado, localId, it.ts, rng);
      if (!otro) continue;
      v.datos.vendedorId = otro;
    }
    v.datos.clienteId = venta.clienteId;
    v.datos.ventaOrigenCambioId = venta.id;
    const usar = Math.min(dev.valorTotal, v.total);
    v.datos.pagos = [pago('saldo_a_favor', usar)];
    if (usar < v.total) v.datos.pagos.push(pago('datafono_debito', v.total - usar));
    v.datos.facturaInmediata = venta.facturaId ? documentoDe(g, rng, ventaId, fecha, null) : null;
    yield emitir('venta.registrar', v.datos);
    const nuevaVenta = estado.ventas[ventaId];
    if (nuevaVenta) g.idx.sumarVenta(fecha.slice(0, 7), nuevaVenta.iva, nuevaVenta.base, 0);
  }
}

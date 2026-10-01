import type {
  CargaImportacion,
  Categoria,
  CostosImportacion,
  EstadoImportacion,
  FechaISO,
  Id,
  LineaImportacion,
  ParametrosAduanas,
} from '@/dominio/tipos';
import { ESTADOS_IMPORTACION } from '@/dominio/tipos';
import type { ProveedorSeed } from '@/seed/proveedores';
import { CADENA_IMPORTACION, CONTACTO_FABRICA } from '@/seed/proveedores';
import {
  COSTOS_EJEMPLO,
  HISTORIA_IMPORTACIONES,
  IMPORTACIONES_EN_CURSO,
  type ImportacionEnCurso,
} from '@/seed/importaciones';
import { CURVA_PEDIDO, DEMANDA_TALLAS } from '@/seed/tallas';
import { diaN, diferenciaDias } from '@/dominio/reglas/fechas';
import { idGenerado } from '@/dominio/motor/ids';
import { type Calendario, masDias } from './calendario';
import type { Demanda } from './demanda';
import { rngPlan, type Rng } from './prng';
import type { RutaTasas } from './tasas';
import type { CxPServicioPlan, ImportacionPlan, ProductoPlan } from './tipos';

/**
 * Plan de importaciones (PLAN 7.9, 7.11 N2–N5, P5, P13, P14). Puro: no lee el estado. Cada fábrica tiene su
 * cadencia; las cuatro importaciones en curso al ancla tienen fechas fijas relativas al ancla; las anteriores
 * se encadenan hacia atrás y las siguientes hacia adelante. Las cantidades salen de la demanda esperada del
 * mismo modelo (valor esperado, sin simular) entre esta llegada y la siguiente de la misma fábrica + 30 días.
 */

const VOLUMEN_POR_UNIDAD: Record<Categoria, number> = {
  camisas: 0.003,
  polos: 0.0025,
  pantalones: 0.0035,
  blazers: 0.008,
  trajes: 0.012,
  punto: 0.004,
  abrigos_chaquetas: 0.01,
  calzado: 0.009,
  accesorios: 0.001,
};

/** Componente específico del arancel ("Otros tributos aduaneros"), como fracción del FOB en pesos (ejemplo). */
const OTROS_TRIBUTOS_SOBRE_FOB = 0.25;
/**
 * Días de demanda esperada de calzado que deja el pedido grande al ancla. Con la demanda real (agotados de
 * tallas y colores) da ≈ 160 días de inventario (P5).
 */
const DIAS_CALZADO_DORMIDO = 125;
/** Fracción que se distribuye a los locales al recibir (el resto queda de reserva en bodega, 7.9). */
export const FRACCION_DISTRIBUIDA = 0.8;
/** Horizonte del plan después del ancla. */
const HORIZONTE_DIAS = 420;

export interface EntradaPlanImportaciones {
  semilla: string;
  ancla: FechaISO;
  inicio: FechaISO;
  vispera: FechaISO;
  escala: number;
  demanda: Demanda;
  calendario: Calendario;
  productos: readonly ProductoPlan[];
  proveedores: readonly ProveedorSeed[];
  aduanas: ParametrosAduanas;
  tasas: RutaTasas;
}

type Fechas = Partial<Record<EstadoImportacion, FechaISO>>;

interface Pedido {
  proveedorId: Id;
  pedido: FechaISO;
  fechas: Fechas;
  narrativa: ImportacionEnCurso | null;
  cargaInicial: boolean;
  dormido: boolean;
  aforo: ImportacionPlan['aforo'];
  estimadas: ImportacionPlan['estimadasNarrativa'];
}

function indice(e: EstadoImportacion): number {
  return ESTADOS_IMPORTACION.indexOf(e);
}

/** Fechas reales de todos los estados a partir del pedido, con el ruido y los retrasos de la fábrica (P14). */
function fechasRegulares(
  rng: Rng,
  pedido: FechaISO,
  dias: ParametrosAduanas['diasEstimadosEntreEstados'],
  retraso: number,
  aforoDias: number,
): Fechas {
  const total = Math.max(0, Math.round(rng.normal(retraso, retraso * 0.45 + 0.6)));
  const r: Fechas = { cotizado: pedido };
  let f = pedido;
  for (let i = 1; i < ESTADOS_IMPORTACION.length; i++) {
    const e = ESTADOS_IMPORTACION[i] as EstadoImportacion;
    let d = dias[e];
    if (e === 'listo_despacho') d += Math.round(total * 0.6) + rng.entero(-2, 2);
    else if (e === 'en_puerto') d += Math.round(total * 0.2) + rng.entero(-2, 3);
    else if (e === 'nacionalizado') d += total - Math.round(total * 0.6) - Math.round(total * 0.2) + aforoDias;
    else if (e !== 'en_transito') d += rng.entero(0, 1);
    f = masDias(f, Math.max(1, d));
    r[e] = f;
  }
  return r;
}

/** Fechas hacia atrás desde un estado fijo con los días por defecto. */
function haciaAtras(
  fechas: Fechas,
  desde: EstadoImportacion,
  dias: ParametrosAduanas['diasEstimadosEntreEstados'],
): void {
  let f = fechas[desde] as FechaISO;
  for (let i = indice(desde); i > 0; i--) {
    const e = ESTADOS_IMPORTACION[i] as EstadoImportacion;
    const previo = ESTADOS_IMPORTACION[i - 1] as EstadoImportacion;
    f = masDias(f, -Math.max(1, dias[e]));
    if (!fechas[previo]) fechas[previo] = f;
    else f = fechas[previo] as FechaISO;
  }
}

/** Fechas hacia adelante (días por defecto) desde el último estado fijado. */
function haciaAdelante(fechas: Fechas, dias: ParametrosAduanas['diasEstimadosEntreEstados']): void {
  let f = fechas.cotizado as FechaISO;
  for (let i = 1; i < ESTADOS_IMPORTACION.length; i++) {
    const e = ESTADOS_IMPORTACION[i] as EstadoImportacion;
    if (fechas[e]) f = fechas[e] as FechaISO;
    else {
      f = masDias(f, Math.max(1, dias[e]));
      fechas[e] = f;
    }
  }
}

/** Fechas de un pedido narrativo en curso al ancla (N2–N5). */
function fechasNarrativas(
  n: ImportacionEnCurso,
  ancla: FechaISO,
  dias: ParametrosAduanas['diasEstimadosEntreEstados'],
  calendario: Calendario,
): { fechas: Fechas; estimadas: Fechas } {
  const a = (k: number) => masDias(ancla, k);
  const f: Fechas = {};
  const est: Fechas = {};
  switch (n.clave) {
    case 'en_produccion': {
      // Listo para despacho en ≈ 2 semanas (día hábil); el saldo vence ese día (N5, M6).
      const listo = calendario.habilDesde(a(n.estimadas.listo_despacho ?? 14));
      f.en_produccion = masDias(listo, -dias.listo_despacho);
      f.listo_despacho = listo;
      f.saldo_pagado = masDias(listo, 4);
      est.listo_despacho = listo;
      break;
    }
    case 'en_transito': {
      f.embarcado = a(n.estimadas.embarcado ?? -24);
      f.en_transito = a(n.estadoRealDesfase);
      f.en_puerto = a((n.estimadas.en_puerto ?? 8) + 1);
      est.en_puerto = a(n.estimadas.en_puerto ?? 8);
      break;
    }
    case 'en_puerto': {
      f.en_puerto = a(n.estadoRealDesfase);
      f.en_nacionalizacion = a(n.estimadas.en_nacionalizacion ?? 2);
      f.recibido_bodega = a(n.estimadas.recibido_bodega ?? 12);
      f.nacionalizado = masDias(f.recibido_bodega, -3);
      f.en_transporte_bogota = masDias(f.recibido_bodega, -2);
      est.en_nacionalizacion = f.en_nacionalizacion;
      est.nacionalizado = f.nacionalizado;
      est.en_transporte_bogota = f.en_transporte_bogota;
      est.recibido_bodega = f.recibido_bodega;
      break;
    }
    case 'en_nacionalizacion': {
      // Nacionalizado estimado hace 6 días sin fecha real (N3); nueva llegada a bodega en 9 días.
      f.en_nacionalizacion = a(n.estadoRealDesfase);
      f.recibido_bodega = a(n.estimadas.recibido_bodega ?? 9);
      f.nacionalizado = masDias(f.recibido_bodega, -4);
      f.en_transporte_bogota = masDias(f.recibido_bodega, -2);
      est.nacionalizado = a(n.estimadas.nacionalizado ?? -6);
      est.en_transporte_bogota = masDias(f.recibido_bodega, -2);
      est.recibido_bodega = f.recibido_bodega;
      break;
    }
  }
  const primero = ESTADOS_IMPORTACION.find((e) => f[e]) as EstadoImportacion;
  haciaAtras(f, primero, dias);
  haciaAdelante(f, dias);
  return { fechas: f, estimadas: est };
}

/**
 * Estimadas de los 13 estados que fija la narrativa (importacion.actualizarHitos), justo después del último
 * estado alcanzado antes del ancla: los alcanzados con su fecha real, los narrativos con la suya y el resto con
 * la planeada; siempre en orden (la guarda `hitosEnOrden`).
 */
function estimadasCompletas(fechas: Fechas, narrativas: Fechas, ancla: FechaISO): ImportacionPlan['estimadasNarrativa'] {
  let aplicar = fechas.cotizado as FechaISO;
  for (const e of ESTADOS_IMPORTACION) {
    const f = fechas[e];
    if (f && f <= ancla && f > aplicar) aplicar = f;
  }
  const r: Fechas = {};
  let previa = '';
  for (const e of ESTADOS_IMPORTACION) {
    const real = fechas[e] as FechaISO;
    let f = real <= aplicar ? real : (narrativas[e] ?? real);
    if (f < previa) f = previa;
    r[e] = f;
    previa = f;
  }
  return { fecha: aplicar, estimadas: r };
}

/** Unidades esperadas de un producto entre dos fechas (sumas acumuladas de la demanda esperada). */
function esperado(
  acum: ReturnType<Demanda['acumuladoEsperado']>,
  productoId: Id,
  desde: FechaISO,
  hasta: FechaISO,
): number {
  const arr = acum.sumas.get(productoId);
  if (!arr) return 0;
  const i0 = Math.max(0, Math.min(arr.length - 1, diaN(desde) - acum.desde));
  const i1 = Math.max(0, Math.min(arr.length - 1, diaN(hasta) - acum.desde));
  return Math.max(0, (arr[i1] ?? 0) - (arr[i0] ?? 0));
}

export interface PlanImportaciones {
  importaciones: ImportacionPlan[];
  /** Por fecha de llegada (recibido_bodega) de cada fábrica, en orden. */
  llegadas: Map<Id, FechaISO[]>;
}

export function planImportaciones(e: EntradaPlanImportaciones): PlanImportaciones {
  const dias = e.aduanas.diasEstimadosEntreEstados;
  const fabricas = e.proveedores.filter((p) => p.perfil !== null && p.datos.tipo === 'fabrica');
  const pedidos: Pedido[] = [];
  const horizonte = masDias(e.ancla, HORIZONTE_DIAS);
  const enCurso = new Map(IMPORTACIONES_EN_CURSO.map((n) => [n.proveedorId, n]));
  const dorm = HISTORIA_IMPORTACIONES.calzadoDormido;

  for (const fab of fabricas) {
    const perfil = fab.perfil as NonNullable<ProveedorSeed['perfil']>;
    const cadencia = perfil.cadencia === 'semestral' ? 182 : perfil.cadencia;
    const regular = (pedido: FechaISO): Pedido => {
      const rng = rngPlan(e.semilla, `imp:${fab.id}:${pedido}`);
      const conAforo = rng.chance(HISTORIA_IMPORTACIONES.probabilidadAforo);
      const aforoDias = conAforo ? rng.entero(...HISTORIA_IMPORTACIONES.diasAforo) : 0;
      return {
        proveedorId: fab.id,
        pedido,
        fechas: fechasRegulares(rng, pedido, dias, perfil.retrasoPromedioDias, aforoDias),
        narrativa: null,
        cargaInicial: false,
        dormido: false,
        aforo: conAforo
          ? rng.chance(0.6)
            ? { tipo: 'documental', motivo: 'Revisión documental de la declaración' }
            : { tipo: 'fisico', motivo: 'Revisión de etiquetado' }
          : null,
        estimadas: null,
      };
    };
    let ancla0: Pedido;
    const n = enCurso.get(fab.id);
    if (n) {
      const { fechas, estimadas } = fechasNarrativas(n, e.ancla, dias, e.calendario);
      ancla0 = {
        proveedorId: fab.id,
        pedido: fechas.cotizado as FechaISO,
        fechas,
        narrativa: n,
        cargaInicial: false,
        dormido: false,
        aforo: n.aforo,
        estimadas: estimadasCompletas(fechas, estimadas, e.ancla),
      };
    } else {
      // Wenzhou Ruifeng: el pedido grande de calzado recibido hace ≈ 7 meses (P5).
      const recibido = masDias(e.ancla, -Math.round(dorm.mesesAtras * 30));
      const pedido = masDias(recibido, -102);
      ancla0 = { ...regular(pedido), dormido: true, aforo: null };
    }
    pedidos.push(ancla0);
    // Hacia atrás: pedidos que llegan dentro de la ventana.
    for (let k = 1; k < 20; k++) {
      const p = regular(masDias(ancla0.pedido, -cadencia * k));
      if ((p.fechas.recibido_bodega as FechaISO) < e.inicio) break;
      pedidos.push(p);
    }
    // Hacia adelante. Tras el pedido grande, Ruifeng repone antes (cinturones y billeteras; el calzado sobra) y
    // ese pedido llega antes del ancla, así al ancla solo hay cuatro importaciones en curso (N2–N5).
    const primero = n ? masDias(ancla0.pedido, cadencia) : masDias(ancla0.pedido, 200);
    for (let p = primero; p <= horizonte; p = masDias(p, cadencia)) pedidos.push(regular(p));
  }

  // Carga inicial por fábrica (recibida la víspera de la ventana, I5).
  for (const fab of fabricas) {
    const fechas: Fechas = { recibido_bodega: e.vispera };
    haciaAtras(fechas, 'recibido_bodega', dias);
    pedidos.push({
      proveedorId: fab.id,
      pedido: fechas.cotizado as FechaISO,
      fechas,
      narrativa: null,
      cargaInicial: true,
      dormido: false,
      aforo: null,
      estimadas: null,
    });
  }

  pedidos.sort((a, b) => (a.pedido < b.pedido ? -1 : a.pedido > b.pedido ? 1 : a.proveedorId < b.proveedorId ? -1 : 1));

  // Llegadas por fábrica.
  const llegadas = new Map<Id, FechaISO[]>();
  for (const p of pedidos) {
    const l = llegadas.get(p.proveedorId) ?? [];
    l.push(p.fechas.recibido_bodega as FechaISO);
    llegadas.set(p.proveedorId, l);
  }
  for (const l of llegadas.values()) l.sort();

  const acum = e.demanda.acumuladoEsperado(masDias(e.inicio, -5), masDias(horizonte, 400));
  const porProveedor = new Map<Id, ProductoPlan[]>();
  for (const p of e.productos) {
    const l = porProveedor.get(p.proveedorId) ?? [];
    l.push(p);
    porProveedor.set(p.proveedorId, l);
  }
  const oxfordM = HISTORIA_IMPORTACIONES.oxfordM.clave.split('|') as [Id, string, Id];

  // Cantidades con política "pedir hasta" (7.9): objetivo = demanda esperada de esta llegada a la siguiente
  // + 30 días, × 1,15, con la curva de pedido casi pareja; se pide el objetivo menos lo que se espera que quede
  // del pedido anterior (consumo con la curva de demanda). Así la M se queda corta (P3) y nada se acumula.
  const cantidadesPorPedido = new Map<Pedido, Map<Id, Record<Id, number>>>();
  const infoVariante = new Map<Id, { p: ProductoPlan; talla: string; color: Id }>();
  for (const p of e.productos)
    for (const [k, v] of Object.entries(p.variantes)) {
      const [talla, color] = k.split('|') as [string, Id];
      infoVariante.set(v, { p, talla, color });
    }
  const consumo = (p: ProductoPlan, talla: string, color: Id, d1: FechaISO, d2: FechaISO) =>
    d2 <= d1 ? 0 : esperado(acum, p.id, d1, d2) * (DEMANDA_TALLAS[p.curva][talla] ?? 0) * e.demanda.fraccionColor(p, color, d1);
  for (const fab of fabricas) {
    const propios = pedidos
      .filter((p) => p.proveedorId === fab.id)
      .sort((a, b) => ((a.fechas.recibido_bodega as FechaISO) < (b.fechas.recibido_bodega as FechaISO) ? -1 : 1));
    const stock = new Map<Id, number>();
    let anterior: FechaISO | null = null;
    // Después del pedido grande de calzado, los siguientes de Ruifeng no traen calzado hasta pasar el ancla (P5).
    const dormido = (propios.find((p) => p.dormido)?.fechas.recibido_bodega as FechaISO | undefined) ?? null;
    const lista = llegadas.get(fab.id) ?? [];
    for (const ped of propios) {
      const llegada = ped.fechas.recibido_bodega as FechaISO;
      if (anterior) {
        for (const [v, q] of stock) {
          const x = infoVariante.get(v);
          if (x) stock.set(v, Math.max(0, q - consumo(x.p, x.talla, x.color, anterior, llegada)));
        }
      }
      const siguiente = lista.find((x) => x > llegada) ?? masDias(llegada, 200);
      const desde = ped.cargaInicial ? e.inicio : llegada;
      const hasta = masDias(siguiente, HISTORIA_IMPORTACIONES.coberturaExtraDias);
      const referencias = ped.narrativa ? ped.narrativa.referencias : (porProveedor.get(fab.id) ?? []).map((p) => p.id);
      const porProducto = new Map<Id, Record<Id, number>>();
      for (const refId of referencias) {
        const p = e.productos.find((x) => x.id === refId);
        if (!p) continue;
        const demanda = esperado(acum, p.id, desde, hasta) * HISTORIA_IMPORTACIONES.margenSeguridad;
        const curva = CURVA_PEDIDO[p.curva];
        const cantidades: Record<Id, number> = {};
        for (const talla of p.tallas) {
          for (const color of p.colores) {
            const v = p.variantes[`${talla}|${color}`];
            if (!v) continue;
            let objetivo = demanda * (curva[talla] ?? 0) * e.demanda.fraccionColor(p, color, llegada);
            const esOxfordM = p.id === oxfordM[0] && talla === oxfordM[1] && color === oxfordM[2];
            if (esOxfordM) {
              // P3: se agota ≈ 3 veces en 6 meses. El pedido que llega antes del ancla trae lo justo para N1.
              const antesDelAncla = llegada <= e.ancla && llegada > masDias(e.ancla, -120);
              if (antesDelAncla && !ped.narrativa) objetivo = consumo(p, talla, color, llegada, e.ancla) + 12;
              else objetivo *= HISTORIA_IMPORTACIONES.oxfordM.factor;
            }
            if (p.sinMovimiento && llegada < e.demanda.limiteSinMovimiento) objetivo += 2;
            if (!ped.dormido && p.categoria === 'calzado' && dormido && llegada > dormido && llegada <= masDias(e.ancla, 60))
              objetivo = 0;
            if (ped.dormido && p.categoria === 'calzado') {
              // P5: el pedido grande de temporada deja ≈ 160 días de inventario de calzado al ancla.
              objetivo = consumo(p, talla, color, llegada, e.ancla) + consumo(p, talla, color, e.ancla, masDias(e.ancla, DIAS_CALZADO_DORMIDO));
            }
            const forzada = ped.narrativa?.unidadesForzadas[`${p.id}|${talla}|${color}`];
            const q = forzada ?? Math.max(0, Math.round(objetivo - (stock.get(v) ?? 0)));
            if (q > 0) cantidades[v] = q;
            stock.set(v, (stock.get(v) ?? 0) + q);
          }
        }
        if (Object.keys(cantidades).length) porProducto.set(p.id, cantidades);
      }
      cantidadesPorPedido.set(ped, porProducto);
      anterior = llegada;
    }
  }

  const importaciones: ImportacionPlan[] = [];
  for (const ped of pedidos) {
    const fab = fabricas.find((f) => f.id === ped.proveedorId) as ProveedorSeed;
    const perfil = fab.perfil as NonNullable<ProveedorSeed['perfil']>;
    const moneda = fab.datos.moneda === 'CNY' ? 'CNY' : 'USD';
    const rng = rngPlan(e.semilla, `imp-detalle:${fab.id}:${ped.pedido}:${ped.cargaInicial ? 'i' : 'r'}`);
    const id = ped.cargaInicial
      ? idGenerado('im', 'inicial', fab.id.slice(3))
      : idGenerado('im', fab.id.slice(3), ped.pedido);
    const lineas: LineaImportacion[] = [];
    let volumen = 0;
    for (const [productoId, cantidades] of cantidadesPorPedido.get(ped) ?? []) {
      const p = e.productos.find((x) => x.id === productoId);
      if (!p) continue;
      let unidades = 0;
      for (const q of Object.values(cantidades)) unidades += q;
      if (unidades <= 0) continue;
      lineas.push({ id: `${id}-l${lineas.length + 1}`, productoId: p.id, cantidades, costoUnitarioOrigen: p.fob.centavos });
      volumen += unidades * VOLUMEN_POR_UNIDAD[p.categoria];
    }
    if (!lineas.length) continue;
    // N5: el saldo del pedido de Lanxin en producción es ≈ US$ 14.700 (FOB ≈ US$ 21.000).
    if (ped.narrativa?.saldoCentavos) {
      const objetivo = Math.round(ped.narrativa.saldoCentavos / 0.7);
      let fob = 0;
      for (const l of lineas) for (const q of Object.values(l.cantidades)) fob += q * l.costoUnitarioOrigen;
      const f = fob > 0 ? objetivo / fob : 1;
      fob = 0;
      for (const l of lineas) {
        for (const v of Object.keys(l.cantidades)) {
          l.cantidades[v] = Math.max(1, Math.round((l.cantidades[v] ?? 0) * f));
          fob += (l.cantidades[v] ?? 0) * l.costoUnitarioOrigen;
        }
      }
      // Ajuste fino con la línea más barata para quedar lo más cerca posible del objetivo.
      const barata = [...lineas].sort((a, b) => a.costoUnitarioOrigen - b.costoUnitarioOrigen)[0];
      if (barata) {
        const v = Object.keys(barata.cantidades)[0] as Id;
        const delta = Math.round((objetivo - fob) / barata.costoUnitarioOrigen);
        barata.cantidades[v] = Math.max(1, (barata.cantidades[v] ?? 0) + delta);
      }
    }
    const carga: CargaImportacion = ped.narrativa
      ? { ...ped.narrativa.carga }
      : ped.dormido
        ? { tipo: 'contenedor', pies: 20 }
        : { tipo: 'consolidada', m3: Math.max(1.2, Math.round(volumen * 10) / 10) };
    const tasaPedido = e.tasas.valor(moneda, ped.pedido);
    const usdAOrigen = moneda === 'USD' ? 1 : e.tasas.valor('USD', ped.pedido) / tasaPedido;
    const m3 = carga.tipo === 'consolidada' ? carga.m3 : 28;
    const fleteUsd =
      carga.tipo === 'contenedor'
        ? rng.rango(...COSTOS_EJEMPLO.fleteContenedor20Usd)
        : m3 * rng.rango(...COSTOS_EJEMPLO.fleteConsolidadoUsdPorM3) + rng.rango(...COSTOS_EJEMPLO.gastosOrigenUsd);
    let fobCentavos = 0;
    for (const l of lineas) for (const q of Object.values(l.cantidades)) fobCentavos += q * l.costoUnitarioOrigen;
    const fobCop = Math.round((fobCentavos / 100) * tasaPedido);
    const mil = (x: number) => Math.round(x / 1000) * 1000;
    const costos: CostosImportacion = {
      flete: { moneda, valor: Math.round(fleteUsd * usdAOrigen * 100) },
      seguro: { moneda, valor: Math.round(fobCentavos * e.aduanas.seguroPctSobreFOB) },
      honorariosAgente: mil(rng.rango(...COSTOS_EJEMPLO.honorariosAgente)),
      bodegajePuerto: mil(rng.rango(...COSTOS_EJEMPLO.bodegajePuerto)),
      transporteInterno: mil(
        Math.min(COSTOS_EJEMPLO.transporteBogota[1], COSTOS_EJEMPLO.transporteBogota[0] + m3 * 260_000),
      ),
      otros: 0,
      otrosTributosAduaneros: mil(fobCop * OTROS_TRIBUTOS_SOBRE_FOB),
      arancelPct: e.aduanas.arancelPct,
      ivaImportacionPct: e.aduanas.ivaImportacionPct,
      ivaSumaAlCosto: e.aduanas.ivaImportacionSumaAlCosto,
    };
    const servicios: CxPServicioPlan[] = [
      {
        sufijo: 'cxp-flete',
        estado: 'embarcado',
        categoria: 'agente_carga',
        proveedorId: 'pr_carga',
        tercero: 'Cordillera Carga',
        concepto: 'Flete internacional',
        moneda,
        valor: costos.flete.valor,
        diasPlazo: 15,
      },
      {
        sufijo: 'cxp-agente',
        estado: 'nacionalizado',
        categoria: 'agente_aduanas',
        proveedorId: 'pr_aduanas',
        tercero: 'Agencia de Aduanas Litoral',
        concepto: 'Honorarios de agenciamiento y bodegaje en puerto',
        moneda: 'COP',
        valor: costos.honorariosAgente + costos.bodegajePuerto,
        diasPlazo: 10,
      },
      {
        sufijo: 'cxp-transporte',
        estado: 'en_transporte_bogota',
        categoria: 'transporte',
        proveedorId: 'pr_transporte',
        tercero: 'Transportes Sabana Carga',
        concepto: 'Transporte Buenaventura → Bogotá',
        moneda: 'COP',
        valor: costos.transporteInterno,
        diasPlazo: 15,
      },
    ];
    importaciones.push({
      id,
      proveedorId: fab.id,
      moneda,
      fechaPedido: ped.pedido,
      creacion: ped.pedido < e.vispera ? e.vispera : ped.pedido,
      carga,
      puertoOrigen: perfil.puertoOrigen,
      lineas,
      costos,
      fechas: ped.fechas,
      cargaInicial: ped.cargaInicial,
      narrativa: ped.narrativa?.clave ?? null,
      estimadasNarrativa: ped.estimadas,
      portal: ped.narrativa?.reportadoPortal
        ? { estado: ped.narrativa.estadoAlAncla, autor: ped.narrativa.reportadoPortal.autor }
        : null,
      aforo: ped.aforo,
      defectos: Math.max(0.002, perfil.defectos * rng.rango(0.7, 1.3)),
      servicios,
      contactoIds: [CONTACTO_FABRICA[fab.id], ...CADENA_IMPORTACION].filter((x): x is Id => !!x),
    });
  }
  return { importaciones, llegadas };
}

/** Días entre el pedido y la llegada (para pruebas y medición). */
export function diasPedidoALlegada(imp: ImportacionPlan): number {
  return diferenciaDias(imp.fechaPedido, imp.fechas.recibido_bodega as FechaISO);
}

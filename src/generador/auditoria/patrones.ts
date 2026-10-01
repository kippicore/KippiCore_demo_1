import type { EstadoDominio, FechaISO, Id, Venta } from '@/dominio/tipos';
import { DIAS_CERRADOS } from '@/config/locales';
import { FAMILIA_COLOR } from '@/seed/colores';
import { INDICE_MES } from '@/seed/estacionalidad';
import { calcularCostoAterrizado } from '@/dominio/reglas/costeo';
import { diaSemana, diferenciaDias, hitosInicialesFecha, minutosDeHora, sumarMesesAMes } from './fechas';
import { proyeccionFlujoEstado } from '@/dominio/reglas/flujo-estado';
import { segmentoCliente } from '@/dominio/reglas/segmentacion';
import { masDias } from '../calendario';
import type { Plan } from '../plan';

/**
 * Medición de los patrones descubribles P1–P22 (PLAN 4.7, 7.12) con definiciones simples y explícitas. Es la
 * referencia para la pista de calibración y para los selectores de F2-B (que deben dar las mismas cifras).
 * Cada medición trae su objetivo, su tolerancia (±15 % o una condición de orden) y si está dentro.
 */
export interface Medicion {
  id: string;
  nombre: string;
  valor: number;
  objetivo: number | null;
  /** 'relativa' = ±tolerancia sobre el objetivo; 'minimo'/'maximo'/'rango'/'exacto' = condición. */
  criterio: 'relativa' | 'minimo' | 'maximo' | 'rango' | 'exacto';
  tolerancia: number;
  rango?: [number, number];
  ok: boolean;
  detalle: string;
}

const TOL = 0.15;

function m(
  id: string,
  nombre: string,
  valor: number,
  objetivo: number | null,
  criterio: Medicion['criterio'] = 'relativa',
  extra: { tolerancia?: number; rango?: [number, number]; detalle?: string } = {},
): Medicion {
  const tolerancia = extra.tolerancia ?? TOL;
  let ok = false;
  if (criterio === 'relativa' && objetivo !== null) ok = Math.abs(valor - objetivo) <= Math.abs(objetivo) * tolerancia;
  else if (criterio === 'minimo' && objetivo !== null) ok = valor >= objetivo;
  else if (criterio === 'maximo' && objetivo !== null) ok = valor <= objetivo;
  else if (criterio === 'rango' && extra.rango) ok = valor >= extra.rango[0] && valor <= extra.rango[1];
  else if (criterio === 'exacto') ok = valor === objetivo;
  const r: Medicion = { id, nombre, valor, objetivo, criterio, tolerancia, ok, detalle: extra.detalle ?? '' };
  if (extra.rango) r.rango = extra.rango;
  return r;
}

const fechaVenta = (v: Venta) => v.ts.slice(0, 10);
const reconocida = (v: Venta) => !v.anulacion && v.separado?.cerrado?.resultado !== 'cancelado';

export function medirPatrones(estado: EstadoDominio, hoy: FechaISO, plan: Plan, hora = '15:30'): Medicion[] {
  const r: Medicion[] = [];
  const ventas = Object.values(estado.ventas).filter(reconocida);
  const desde30 = masDias(hoy, -30);
  const ult30 = ventas.filter((v) => fechaVenta(v) >= desde30 && fechaVenta(v) < hoy);
  const unidades = (v: Venta) => v.lineas.reduce((a, l) => a + l.cantidad, 0);
  const categoria = (pid: Id) => estado.productos[pid]?.categoria;

  // Escala del negocio: mes completo anterior.
  const mesAnt = sumarMesesAMes(hoy.slice(0, 7), -1);
  const totalMes = (mes: string) => ventas.filter((v) => v.ts.startsWith(mes)).reduce((a, v) => a + v.total, 0);
  const indice = INDICE_MES[Number(mesAnt.slice(5, 7))] ?? 1;
  r.push(
    m('ESC', 'Ventas de un mes típico (normalizado a índice 1,00)', Math.round(totalMes(mesAnt) / indice / plan.escala), 330_000_000, 'relativa', {
      detalle: `${mesAnt}: $ ${totalMes(mesAnt).toLocaleString('es-CO')} (índice ${indice})`,
    }),
  );

  // P1: por local, últimos 30 días.
  const valorTotal30 = ult30.reduce((a, v) => a + v.total, 0);
  const objetivosP1: Record<Id, { ventasDia: number; ticket: number; upv: number; part: number }> = {
    p93: { ventasDia: 9, ticket: 520_000, upv: 1.6, part: 0.41 },
    zr: { ventasDia: 14, ticket: 315_000, upv: 1.3, part: 0.39 },
    usq: { ventasDia: 6, ticket: 365_000, upv: 1.4, part: 0.2 },
  };
  for (const [l, o] of Object.entries(objetivosP1)) {
    const vs = ult30.filter((v) => v.localId === l && !v.ventaOrigenCambioId);
    const local = plan.local(l);
    let factor = 0;
    for (let k = 1; k <= 30; k++) if (local) factor += plan.demanda.lambdaEsperado(local, masDias(hoy, -k));
    factor = factor / ((local?.perfil?.ventasDiaBase ?? 1) * 30);
    const ticket = vs.length ? vs.reduce((a, v) => a + v.total, 0) / vs.length : 0;
    r.push(m(`P1.${l}.ventas`, `P1 ${l}: ventas por día (índice 1,00)`, Math.round((vs.length / 30 / (factor || 1)) * 10) / 10, o.ventasDia));
    r.push(m(`P1.${l}.ticket`, `P1 ${l}: ticket promedio`, Math.round(ticket), o.ticket));
    r.push(m(`P1.${l}.upv`, `P1 ${l}: unidades por venta`, Math.round((vs.reduce((a, v) => a + unidades(v), 0) / Math.max(1, vs.length)) * 100) / 100, o.upv));
    r.push(m(`P1.${l}.part`, `P1 ${l}: participación en $`, Math.round((vs.reduce((a, v) => a + v.total, 0) / Math.max(1, valorTotal30)) * 1000) / 1000, o.part));
  }

  // P2: vendedora estrella (últimos 30 días).
  const porVendedor = new Map<Id, { valor: number; n: number; acc: number }>();
  for (const v of ult30) {
    const a = porVendedor.get(v.vendedorId) ?? { valor: 0, n: 0, acc: 0 };
    a.valor += v.total;
    a.n += 1;
    if (v.lineas.some((l) => categoria(l.productoId) === 'accesorios')) a.acc += 1;
    porVendedor.set(v.vendedorId, a);
  }
  const vg = porVendedor.get('em_vgomez') ?? { valor: 0, n: 1, acc: 0 };
  const p93 = ult30.filter((v) => v.localId === 'p93').reduce((a, v) => a + v.total, 0);
  const vendedores = [...porVendedor.values()];
  const promedio = vendedores.reduce((a, x) => a + x.valor, 0) / Math.max(1, vendedores.length);
  let accResto = 0;
  let nResto = 0;
  for (const [id, x] of porVendedor) if (id !== 'em_vgomez') {
    accResto += x.acc;
    nResto += x.n;
  }
  r.push(m('P2.participacion', 'P2 Valentina: % de las ventas de Parque 93', Math.round((vg.valor / Math.max(1, p93)) * 1000) / 1000, 0.43, 'rango', { rango: [0.38, 0.48] }));
  r.push(m('P2.sobrePromedio', 'P2 Valentina: veces el promedio del equipo', Math.round((vg.valor / Math.max(1, promedio)) * 100) / 100, 1.4));
  r.push(m('P2.ticket', 'P2 Valentina: ticket', Math.round(vg.valor / Math.max(1, vg.n)), 640_000));
  r.push(m('P2.accesorio', 'P2 Valentina: % de ventas con accesorio', Math.round((vg.acc / Math.max(1, vg.n)) * 100) / 100, 0.46));
  r.push(m('P2.accesorioResto', 'P2 resto: % de ventas con accesorio', Math.round((accResto / Math.max(1, nResto)) * 100) / 100, 0.17, 'relativa', { tolerancia: 0.3 }));

  // P3 y P4: tallas (últimos 180 días, unidades).
  const desde180 = masDias(hoy, -180);
  const tallas = new Map<string, number>();
  const pant = new Map<string, number>();
  let camisas = 0;
  let pantalones = 0;
  let azules = 0;
  for (const v of ventas) {
    if (fechaVenta(v) < desde180 || fechaVenta(v) >= hoy) continue;
    for (const l of v.lineas) {
      const va = estado.variantes[l.varianteId];
      if (!va) continue;
      const c = categoria(l.productoId);
      if (c === 'camisas') {
        camisas += l.cantidad;
        tallas.set(va.talla, (tallas.get(va.talla) ?? 0) + l.cantidad);
        if (FAMILIA_COLOR[va.colorId] === 'azul') azules += l.cantidad;
      }
      if (c === 'pantalones') {
        pantalones += l.cantidad;
        pant.set(va.talla, (pant.get(va.talla) ?? 0) + l.cantidad);
      }
    }
  }
  for (const [t, o] of [['M', 0.38], ['L', 0.29], ['XL', 0.15], ['S', 0.13]] as const)
    r.push(m(`P3.${t}`, `P3 camisas talla ${t}`, Math.round(((tallas.get(t) ?? 0) / Math.max(1, camisas)) * 1000) / 1000, o));
  r.push(m('P4', 'P4 pantalones 32 + 34', Math.round((((pant.get('32') ?? 0) + (pant.get('34') ?? 0)) / Math.max(1, pantalones)) * 1000) / 1000, 0.54));
  const ox = estado.meta.narrativa.varianteOxfordM;
  if (ox) {
    const ex = (l: Id) => estado.agregados.existencias[`${ox}@${l}`] ?? 0;
    r.push(m('N1.usq', 'N1 Oxford azul cielo M en Usaquén (≤ 1)', ex('usq'), 1, 'maximo'));
    r.push(m('N1.zr', 'N1 Oxford azul cielo M en Zona Rosa (≥ 4)', ex('zr'), 4, 'minimo'));
    r.push(m('N1.bod', 'N1 Oxford azul cielo M en bodega (0)', ex('bod'), 0, 'exacto'));
    r.push(m('P3.agotada', 'P3 veces que se agotó la Oxford azul cielo M en Usaquén (6 meses)', episodiosAgotada(estado, ox, 'usq', desde180, hoy), 3, 'rango', { rango: [2, 5] }));
  }

  // P5: calzado dormido.
  const desde90 = masDias(hoy, -90);
  const vendidas90 = new Map<string, number>();
  for (const v of ventas) {
    if (fechaVenta(v) < desde90 || fechaVenta(v) >= hoy) continue;
    for (const l of v.lineas) {
      const c = categoria(l.productoId) ?? '';
      vendidas90.set(c, (vendidas90.get(c) ?? 0) + l.cantidad);
      vendidas90.set('*', (vendidas90.get('*') ?? 0) + l.cantidad);
    }
  }
  const stock = new Map<string, { u: number; costo: number }>();
  for (const [k, n] of Object.entries(estado.agregados.existencias)) {
    if (n <= 0) continue;
    const va = estado.variantes[k.split('@')[0] ?? ''];
    const p = va ? estado.productos[va.productoId] : undefined;
    if (!p) continue;
    for (const c of [p.categoria, '*']) {
      const a = stock.get(c) ?? { u: 0, costo: 0 };
      a.u += n;
      a.costo += n * p.costoVigente;
      stock.set(c, a);
    }
  }
  const dias = (c: string) => (stock.get(c)?.u ?? 0) / Math.max(0.01, (vendidas90.get(c) ?? 0) / 90);
  r.push(m('P5.dias', 'P5 días de inventario de calzado', Math.round(dias('calzado')), 160));
  r.push(m('P5.tienda', 'P5 días de inventario de la tienda', Math.round(dias('*')), 55, 'relativa', { tolerancia: 0.3 }));
  r.push(m('P5.costo', 'P5 calzado a costo', Math.round(stock.get('calzado')?.costo ?? 0), 40_000_000));

  // P6: sin movimiento en 60 días (con existencias).
  const desde60 = masDias(hoy, -60);
  const vendidos60 = new Set<Id>();
  for (const v of ventas) if (fechaVenta(v) >= desde60) for (const l of v.lineas) vendidos60.add(l.productoId);
  const conStock = new Set<Id>();
  for (const [k, n] of Object.entries(estado.agregados.existencias)) if (n > 0) {
    const va = estado.variantes[k.split('@')[0] ?? ''];
    if (va) conStock.add(va.productoId);
  }
  const quietos = [...conStock].filter((p) => !vendidos60.has(p) && !estado.productos[p]?.eliminadoEn).sort();
  const esperados = plan.productos.filter((p) => p.sinMovimiento).map((p) => p.id).sort();
  r.push(m('P6', 'P6 referencias sin movimiento en 60 días = las 5 de la narrativa', quietos.join(',') === esperados.join(',') ? 1 : 0, 1, 'exacto', { detalle: quietos.join(', ') }));

  // P7 y P8: días y horas (últimas 12 semanas, por valor).
  const desde84 = masDias(hoy, -84);
  let semana = 0;
  let sabado = 0;
  let sabadoTarde = 0;
  const conteoDia = new Map<string, number>();
  for (const v of ventas) {
    const f = fechaVenta(v);
    if (f < desde84 || f >= hoy) continue;
    semana += v.total;
    const ds = diaSemana(f);
    if (ds === 6) {
      sabado += v.total;
      const h = minutosDeHora(v.ts.slice(11, 16));
      if (h >= 15 * 60 && h < 19 * 60) sabadoTarde += v.total;
    }
    conteoDia.set(`${v.localId}|${ds}`, (conteoDia.get(`${v.localId}|${ds}`) ?? 0) + v.total);
  }
  r.push(m('P7.sabado', 'P7 sábado / semana', Math.round((sabado / Math.max(1, semana)) * 1000) / 1000, 0.23));
  r.push(m('P7.tarde', 'P7 sábado 3–7 p. m. / semana', Math.round((sabadoTarde / Math.max(1, semana)) * 1000) / 1000, 0.11));
  const dom = (l: Id) => conteoDia.get(`${l}|0`) ?? 0;
  r.push(m('P8.zr_p93', 'P8 domingo: Zona Rosa / Parque 93 (valor)', Math.round((dom('zr') / Math.max(1, dom('p93'))) * 100) / 100, 1.8, 'relativa', { tolerancia: 0.25 }));
  for (const [l, o] of [['zr', 1.45], ['usq', 1.35], ['p93', 0.8]] as const) {
    let entre = 0;
    for (let d = 1; d <= 6; d++) entre += conteoDia.get(`${l}|${d}`) ?? 0;
    // Índice del domingo frente al promedio de lunes a sábado (cuya media de índices es 0,983).
    r.push(m(`P8.${l}`, `P8 índice del domingo en ${l} (valor)`, Math.round(((dom(l) / Math.max(1, entre / 6)) * 0.983) * 100) / 100, o, 'relativa', { tolerancia: 0.2 }));
  }

  // P9: medios de pago por valor, mes actual vs hace 12 meses (ventanas de 30 días).
  const medios = (desde: FechaISO, hasta: FechaISO) => {
    const t = new Map<string, number>();
    let total = 0;
    for (const v of ventas) {
      const f = fechaVenta(v);
      if (f < desde || f >= hasta) continue;
      if (v.tipo === 'separado') {
        t.set('separado', (t.get('separado') ?? 0) + v.total);
        total += v.total;
        continue;
      }
      for (const p of v.pagos) {
        if (p.tipo !== 'pago') continue;
        const k = p.medio === 'datafono_debito' || p.medio === 'datafono_credito' ? 'datafono' : p.medio;
        t.set(k, (t.get(k) ?? 0) + p.valor);
        total += p.valor;
      }
    }
    return (k: string) => (t.get(k) ?? 0) / Math.max(1, total);
  };
  const ahoraM = medios(desde30, hoy);
  const antes = medios(masDias(desde30, -365), masDias(hoy, -365));
  for (const [k, o] of [['datafono', 0.44], ['efectivo', 0.18], ['nequi', 0.13], ['transferencia', 0.07], ['qr_bre_b', 0.04]] as const)
    r.push(m(`P9.${k}`, `P9 ${k} (mes actual)`, Math.round(ahoraM(k) * 1000) / 1000, o, 'relativa', { tolerancia: 0.3 }));
  const digitales = (f: (k: string) => number) => f('nequi') + f('daviplata') + f('transferencia') + f('qr_bre_b');
  r.push(m('P9.digitales', 'P9 billeteras + transferencias + QR: hace 12 meses → hoy (sube)', Math.round((digitales(ahoraM) - digitales(antes)) * 1000) / 1000, 0.1, 'minimo', { detalle: `${Math.round(digitales(antes) * 100)} % → ${Math.round(digitales(ahoraM) * 100)} %` }));

  // P10: datáfono del mes anterior.
  let bruto = 0;
  let comision = 0;
  for (const a of Object.values(estado.abonosDatafono)) if (a.ventasDe.startsWith(mesAnt)) {
    bruto += a.bruto;
    comision += a.comision;
  }
  r.push(m('P10.comision', 'P10 comisión del datáfono del mes anterior (índice 1,00)', Math.round(comision / indice / plan.escala), 3_800_000, 'relativa', { tolerancia: 0.3, detalle: `bruto $ ${bruto.toLocaleString('es-CO')}` }));

  // P11: clientes.
  const metricas = new Map<Id, { primera: FechaISO; ultima: FechaISO; valor12: number; n12: number; n: number; valor: number }>();
  const hace12 = masDias(hoy, -365);
  let conCliente = 0;
  let total = 0;
  for (const v of ventas) {
    if (fechaVenta(v) >= hoy) continue;
    total += 1;
    if (!v.clienteId) continue;
    conCliente += 1;
    const f = fechaVenta(v);
    const a = metricas.get(v.clienteId) ?? { primera: f, ultima: f, valor12: 0, n12: 0, n: 0, valor: 0 };
    if (f < a.primera) a.primera = f;
    if (f > a.ultima) a.ultima = f;
    if (f >= hace12) {
      a.valor12 += v.total;
      a.n12 += 1;
    }
    a.n += 1;
    a.valor += v.total;
    metricas.set(v.clienteId, a);
  }
  const segmentos = new Map<string, number>();
  let vipRiesgo = 0;
  let recurrentes = 0;
  for (const c of Object.values(estado.clientes)) {
    if (c.eliminadoEn) continue;
    const x = metricas.get(c.id);
    const s = segmentoCliente(
      { registro: c.creadoEn.slice(0, 10), primeraCompra: x?.primera ?? null, ultimaCompra: x?.ultima ?? null, valor12m: x?.valor12 ?? 0, compras12m: x?.n12 ?? 0 },
      hoy,
      estado.parametros.segmentacion,
    );
    segmentos.set(s, (segmentos.get(s) ?? 0) + 1);
    if (x && x.valor >= 3_000_000 && diferenciaDias(x.ultima, hoy) > 90) vipRiesgo += 1;
    if (x && x.n >= 2) recurrentes += x.n;
  }
  const nClientes = Object.values(estado.clientes).filter((c) => !c.eliminadoEn).length;
  r.push(m('P11.clientes', 'P11 clientes registrados', nClientes, Math.round(450 * plan.escala)));
  r.push(m('P11.conCliente', 'P11 % de ventas con cliente', Math.round((conCliente / Math.max(1, total)) * 1000) / 1000, 0.15));
  r.push(m('P11.recurrentes', 'P11 % de ventas con cliente que van a recurrentes', Math.round((recurrentes / Math.max(1, conCliente)) * 1000) / 1000, 0.7));
  r.push(m('P11.vipRiesgo', 'P11 clientes de más de $ 3 M sin comprar en 90 días', vipRiesgo, 31, 'relativa', { tolerancia: 0.3 }));
  for (const [s, o] of [['vip', 0.08], ['frecuente', 0.22], ['ocasional', 0.35], ['en_riesgo', 0.25], ['nuevo', 0.1]] as const)
    r.push(m(`P11.${s}`, `P11 segmento ${s}`, Math.round(((segmentos.get(s) ?? 0) / Math.max(1, nClientes)) * 1000) / 1000, o, 'relativa', { tolerancia: 0.35 }));

  // P12: colores.
  r.push(m('P12.azul', 'P12 azul / camisas (6 meses)', Math.round((azules / Math.max(1, camisas)) * 1000) / 1000, 0.34));

  // P13: margen del blazer de lana fría en los dos últimos pedidos de Ningbo Weiye.
  const weiye = Object.values(estado.importaciones)
    .filter((i) => i.proveedorId === 'pr_weiye' && i.lineas.some((l) => l.productoId === 'pd_blz_0401'))
    .sort((a, b) => (a.fechaPedido < b.fechaPedido ? -1 : 1))
    .slice(-2);
  const margenes = weiye.map((imp) => {
    const tasa = imp.costosAplicados?.tasaCosteo ?? tasaPonderadaPagos(estado, imp.id, imp.moneda, hoy);
    const c = calcularCostoAterrizado({ lineas: imp.lineas, costos: imp.costos, moneda: imp.moneda, metodoProrrateo: imp.metodoProrrateo, tasaCosteo: tasa });
    const costo = c.porProducto.pd_blz_0401?.costoUnitario ?? 0;
    const base = (estado.productos.pd_blz_0401?.precioVenta ?? 789_900) / 1.19;
    return 1 - costo / base;
  });
  if (margenes.length === 2) {
    r.push(m('P13.anterior', 'P13 margen del blazer en el penúltimo pedido', Math.round((margenes[0] ?? 0) * 1000) / 1000, 0.57, 'relativa', { tolerancia: 0.1 }));
    r.push(m('P13.ultimo', 'P13 margen del blazer en el último pedido', Math.round((margenes[1] ?? 0) * 1000) / 1000, 0.51, 'relativa', { tolerancia: 0.1 }));
    r.push(m('P13.caida', 'P13 puntos de margen que se come el dólar', Math.round(((margenes[0] ?? 0) - (margenes[1] ?? 0)) * 1000) / 10, 6, 'relativa', { tolerancia: 0.5 }));
  }

  // P14: fábricas (retraso contra la estimada original y defectos de las recepciones).
  const fabrica = (prov: Id) => {
    let retraso = 0;
    let n = 0;
    let recibidas = 0;
    let defectuosas = 0;
    for (const imp of Object.values(estado.importaciones)) {
      if (imp.proveedorId !== prov || !imp.recepcion || imp.nota === 'Carga inicial de existencias') continue;
      retraso += diferenciaDias(hitosInicialesFecha(imp.fechaPedido, estado.parametros.aduanas.diasEstimadosEntreEstados), imp.recepcion.fecha);
      n += 1;
      for (const l of Object.values(imp.recepcion.lineas)) {
        recibidas += l.recibidas;
        defectuosas += l.defectuosas;
      }
    }
    return { retraso: retraso / Math.max(1, n), defectos: defectuosas / Math.max(1, recibidas) };
  };
  const w = fabrica('pr_weiye');
  const h = fabrica('pr_huameng');
  r.push(m('P14.retraso', 'P14 retraso promedio de Ningbo Weiye (días)', Math.round(w.retraso * 10) / 10, 12, 'relativa', { tolerancia: 0.35 }));
  r.push(m('P14.defectosWeiye', 'P14 defectos de Ningbo Weiye', Math.round(w.defectos * 1000) / 1000, 0.048, 'relativa', { tolerancia: 0.3 }));
  r.push(m('P14.defectosHuameng', 'P14 defectos de Guangzhou Huameng', Math.round(h.defectos * 1000) / 1000, 0.011, 'relativa', { tolerancia: 0.4 }));

  // P15: nómina por local (mes anterior, costo empleador / ventas del local).
  const costoLocal = new Map<string, number>();
  let costoTotal = 0;
  for (const l of Object.values(estado.liquidaciones)) {
    if (!l.periodo.fin.startsWith(mesAnt)) continue;
    for (const x of l.lineas) {
      costoLocal.set(x.localId ?? 'general', (costoLocal.get(x.localId ?? 'general') ?? 0) + x.costoEmpleador);
      costoTotal += x.costoEmpleador;
    }
  }
  r.push(m('P15.total', 'P15 costo mensual de la nómina', Math.round(costoTotal), 48_000_000));
  for (const [l, o] of [['usq', 0.14], ['p93', 0.1], ['zr', 0.08]] as const) {
    const ventasLocal = ventas.filter((v) => v.localId === l && v.ts.startsWith(mesAnt)).reduce((a, v) => a + v.total, 0);
    r.push(m(`P15.${l}`, `P15 nómina / ventas de ${l}`, Math.round(((costoLocal.get(l) ?? 0) / Math.max(1, ventasLocal)) * 1000) / 1000, o, 'relativa', { tolerancia: 0.3 }));
  }

  // P16: llegadas tarde de Mateo (30 días, incluido hoy).
  let tarde = 0;
  for (const t of Object.values(estado.turnos)) {
    if (t.empleadoId !== 'em_mherrera' || t.fecha < masDias(hoy, -29) || t.fecha > hoy) continue;
    const ids = estado.agregados.marcacionesDia[`em_mherrera@${t.fecha}`] ?? [];
    const entrada = ids.map((id) => estado.marcaciones[id]).find((x) => x?.tipo === 'entrada');
    if (entrada && minutosDeHora(entrada.ts.slice(11, 16)) - minutosDeHora(t.inicio) > estado.parametros.nomina.toleranciaLlegadaTardeMin) tarde += 1;
  }
  r.push(m('P16', 'P16 llegadas tarde de Mateo Herrera (30 días)', tarde, 4, 'rango', { rango: [3, 6] }));

  // P17: separados activos.
  let activos = 0;
  let saldo = 0;
  let semanaN = 0;
  let semanaSaldo = 0;
  const finSemana = masDias(hoy, 6);
  for (const v of Object.values(estado.ventas)) {
    if (v.tipo !== 'separado' || !v.separado || v.separado.cerrado || v.anulacion) continue;
    const s = v.total - v.pagos.reduce((a, p) => a + p.valor, 0);
    if (s <= 0) continue;
    activos += 1;
    saldo += s;
    if (v.separado.fechaLimite >= hoy && v.separado.fechaLimite <= finSemana) {
      semanaN += 1;
      semanaSaldo += s;
    }
  }
  r.push(m('P17.activos', 'P17 separados activos', activos, 14, 'relativa', { tolerancia: 0.15 }));
  r.push(m('P17.saldo', 'P17 saldo de los separados activos', saldo, 6_200_000, 'relativa', { tolerancia: 0.25 }));
  r.push(m('P17.semana', 'P17 separados que vencen en 7 días', semanaN, 3, 'rango', { rango: [2, 5], detalle: `$ ${semanaSaldo.toLocaleString('es-CO')}` }));

  // P18: proyección del mes (mes a la fecha vs el mismo periodo del año anterior).
  const dia = Number(hoy.slice(8, 10));
  const mtd = (anio: number) => {
    const mes = `${anio}-${hoy.slice(5, 7)}`;
    return ventas.filter((v) => v.ts.startsWith(mes) && Number(v.ts.slice(8, 10)) < dia).reduce((a, v) => a + v.total, 0);
  };
  const anio = Number(hoy.slice(0, 4));
  if (dia > 3) r.push(m('P18', 'P18 mes a la fecha / año anterior − 1', Math.round((mtd(anio) / Math.max(1, mtd(anio - 1)) - 1) * 1000) / 1000, 0.08, 'rango', { rango: [0.0, 0.2] }));

  // P19: punto bajo del flujo de 90 días.
  const flujo = proyeccionFlujoEstado(estado, { hoy, hora, dias: 90, indiceMes: INDICE_MES, diasCerrados: DIAS_CERRADOS, festivos: plan.calendario.festivos });
  r.push(m('P19', 'P19 punto bajo del flujo de 90 días', flujo.puntoBajo.saldo, 18_000_000, 'rango', { rango: [10_000_000, 30_000_000], detalle: flujo.puntoBajo.fecha }));

  // P20: top 5 del mes (unidades, últimos 30 días).
  const porProducto = new Map<Id, number>();
  for (const v of ult30) for (const l of v.lineas) porProducto.set(l.productoId, (porProducto.get(l.productoId) ?? 0) + l.cantidad);
  const top = [...porProducto.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id).sort();
  const top5 = ['pd_blz_0401', 'pd_cam_0142', 'pd_pan_0305', 'pd_pol_0201', 'pd_pun_0601'];
  const coinciden = top.filter((x) => top5.includes(x)).length;
  r.push(m('P20', 'P20 referencias del top 5 del mes que coinciden', coinciden, 4, 'minimo', { detalle: top.join(', ') }));

  // P21: cierres de caja.
  let cierres = 0;
  let cuadran = 0;
  for (const s of Object.values(estado.sesionesCaja)) {
    if (!s.cierre) continue;
    cierres += 1;
    if (s.cierre.diferencia === 0) cuadran += 1;
  }
  r.push(m('P21.cuadran', 'P21 % de cierres que cuadran', Math.round((cuadran / Math.max(1, cierres)) * 1000) / 1000, 0.85, 'relativa', { tolerancia: 0.06 }));
  const anoche = masDias(hoy, -1);
  const zr = estado.sesionesCaja[`sc_g_${anoche.replace(/-/g, '')}_zr`];
  if (hoy === plan.ancla) r.push(m('P21.anoche', 'P21 faltante de Zona Rosa anoche', zr?.cierre?.diferencia ?? 0, -40_000, 'exacto'));

  // P22: contrato realidad.
  const contratistas = ['em_dmoreno', 'em_jvargas'].filter((id) => {
    let semanas = 0;
    for (let s = 0; s < 4; s++) {
      let turnos = 0;
      for (let d = 0; d < 7; d++) {
        const f = masDias(hoy, -(s * 7 + d) - 1);
        if ((estado.agregados.turnosDia[`${id}@${f}`]?.length ?? 0) > 0) turnos += 1;
      }
      if (turnos >= estado.parametros.nomina.riesgoContratoRealidad.minimoTurnosPorSemana) semanas += 1;
    }
    const marca = Object.keys(estado.agregados.marcacionesDia).some((k) => k.startsWith(`${id}@`));
    return semanas >= 4 && marca;
  });
  r.push(m('P22', 'P22 contratistas con turnos fijos y marcaciones', contratistas.length, 2, 'exacto'));
  return r;
}

/** Episodios (rachas de días) en que una variante no tuvo existencias en un local. */
function episodiosAgotada(estado: EstadoDominio, varianteId: Id, localId: Id, desde: FechaISO, hasta: FechaISO): number {
  const porDia = new Map<FechaISO, number>();
  let total = 0;
  for (const mv of estado.movimientos) {
    if (mv.varianteId !== varianteId || mv.localId !== localId) continue;
    total += mv.cantidad;
    porDia.set(mv.ts.slice(0, 10), total);
  }
  let episodios = 0;
  let enCero = false;
  let actual = 0;
  const fechas = [...porDia.keys()].sort();
  let i = 0;
  for (let f = masDias(desde, -400); f < hasta; f = masDias(f, 1)) {
    while (i < fechas.length && (fechas[i] as string) <= f) actual = porDia.get(fechas[i++] as string) ?? actual;
    if (f < desde) continue;
    if (actual <= 0 && !enCero) episodios += 1;
    enCero = actual <= 0;
  }
  return episodios;
}

/** Tasa de costeo ponderada por lo pagado a la fábrica (6.20.3), para importaciones sin costos aplicados. */
function tasaPonderadaPagos(estado: EstadoDominio, impId: Id, moneda: 'USD' | 'CNY', hoy: FechaISO): number {
  let pagados = 0;
  let suma = 0;
  let total = 0;
  for (const c of Object.values(estado.cuentasPorPagar)) {
    if (c.documento?.id !== impId || c.categoria !== 'proveedor_importacion') continue;
    total += c.valor;
    for (const a of c.abonos) if (a.montoOrigen) {
      pagados += a.montoOrigen.centavos;
      suma += a.montoOrigen.centavos * a.montoOrigen.tasa;
    }
  }
  let vigente = 0;
  let fv = '';
  for (const t of Object.values(estado.tasas)) if (t.moneda === moneda && t.fecha <= hoy && t.fecha > fv) {
    fv = t.fecha;
    vigente = t.valor;
  }
  const pendiente = Math.max(0, total - pagados);
  return total > 0 ? (suma + pendiente * vigente) / total : vigente;
}

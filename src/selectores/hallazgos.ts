import type { Categoria, COP, FechaISO, Id, ParteFrase } from '@/dominio/tipos';
import { diaSemana, diferenciaDias, sumarDias, sumarMesesAMes } from '@/dominio/reglas/fechas';
import { margenBruto } from '@/dominio/reglas/costeo';
import { rellenarPlantilla } from '@/dominio/reglas/texto';
import { HALLAZGOS, FRASE_ACCESORIO } from '@/config/textos/hallazgos';
import { FAMILIA_COLOR } from '@/seed/colores';
import { NOMBRES_CATEGORIA } from '@/seed/catalogo';
import { crearSelector } from './memo';
import { selDesempenoVendedores, selMediosDePago, selProyeccionMes, selRotacion } from './analisis';
import { selComparativoFabricas } from './proveedores';
import { selCostoNominaPorLocal } from './nomina';
import { selCostoAterrizado } from './importaciones';
import { selConciliacionDatafono } from './finanzas';
import { selNarrativa } from './narrativa';
import { pesosEnPalabras } from './texto';

/**
 * Hallazgos automáticos (PLAN 6.23 `hallazgos.ts`, 4.7, R18): 3–5 frases con su cifra, su enlace y su relevancia,
 * redactadas con las plantillas de `config/textos/hallazgos.ts` y medidas con las definiciones de referencia de
 * los patrones (`generador/auditoria/patrones.ts`). Si un patrón no aplica en la fecha, se elige otro.
 */
export interface Hallazgo {
  id: string;
  patron: string;
  /** La frase en pesos (para exportar o leer en texto plano). */
  frase: string;
  /** La misma frase en trozos, con el dinero aparte para convertirlo a la moneda activa (compartidos C-D). */
  partes: ParteFrase[];
  /** Cifras de dinero de la frase, en COP, por nombre del hueco de la plantilla. */
  cifras: Record<string, COP>;
  /** Cifra protagonista (en la unidad del hallazgo). */
  cifra: number;
  enlace: string;
  /** Mayor = más interesante (ordena y rota la tarjeta de Inicio). */
  relevancia: number;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

/**
 * Peso de cada patrón en la relevancia (compartidos C-D): los protagonistas del guion (la vendedora estrella, la
 * talla que se agota y el calzado dormido) no deben quedar fuera de los cinco que se muestran por una cifra de
 * otra escala; la comparación de domingos (P8) habla del local más flojo y pesa menos.
 */
const PESO_GUION: Record<string, number> = { P2: 2, P3: 1.2, P5: 1.2, P8: 0.6 };

/**
 * Trozos de una plantilla: los huecos con dinero (`cifras`) quedan aparte para `<Dinero>`; el resto se rellena como
 * la frase. Sin espacios sobrantes al final (huecos opcionales vacíos).
 */
export function partesDe(plantilla: string, datos: Record<string, string | number>, cifras: Record<string, COP>): ParteFrase[] {
  const r: ParteFrase[] = [];
  const texto = (t: string) => {
    if (!t) return;
    const ultima = r[r.length - 1];
    if (ultima && 'texto' in ultima) ultima.texto += t;
    else r.push({ texto: t });
  };
  let i = 0;
  for (const m of plantilla.matchAll(/\{\{(\w+)\}\}/g)) {
    texto(plantilla.slice(i, m.index));
    const clave = m[1] ?? '';
    const valor = cifras[clave];
    if (valor !== undefined) r.push({ dinero: valor, corta: true });
    else texto(String(datos[clave] ?? ''));
    i = (m.index ?? 0) + m[0].length;
  }
  texto(plantilla.slice(i));
  const ultima = r[r.length - 1];
  if (ultima && 'texto' in ultima) ultima.texto = ultima.texto.trimEnd();
  const primera = r[0];
  if (primera && 'texto' in primera) primera.texto = primera.texto.trimStart();
  return r.filter((x) => !('texto' in x) || x.texto !== '');
}
const pct = (x: number) => `${String(Math.round(x * 100))} %`;
/** 0,54 → "5 de cada 10"; 0,34 → "1 de cada 3". */
function deCadaN(p: number): string {
  for (const n of [2, 3, 4, 5]) {
    const k = Math.round(p * n);
    if (k >= 1 && Math.abs(k / n - p) < 0.03) return `${k} de cada ${n}`;
  }
  return `${Math.round(p * 10)} de cada 10`;
}
const plantilla = (id: string) => HALLAZGOS.find((h) => h.id === id);

const TABLAS = [
  'ventas',
  'devoluciones',
  'productos',
  'variantes',
  'locales',
  'empleados',
  'agregados',
  'meta',
  'importaciones',
  'cuentasPorPagar',
  'tasas',
  'proveedores',
  'parametros',
  'liquidaciones',
  'clientes',
  'abonosDatafono',
  'sesionesCaja',
  'solicitudes',
  'contratos',
  'colores',
] as const;

export const selHallazgos = crearSelector<{ hoy: FechaISO; localId?: Id | 'todos'; maximo?: number }, Hallazgo[]>(
  'selHallazgos',
  TABLAS,
  (e, { hoy, maximo = 5 }) => {
    const c: Hallazgo[] = [];
    const agregar = (id: string, datos: Record<string, string | number>, cifra: number, relevanciaBase: number, cifras: Record<string, COP> = {}) => {
      const p = plantilla(id);
      const relevancia = relevanciaBase * (PESO_GUION[p?.patron ?? ''] ?? 1);
      if (!p || !Number.isFinite(relevancia) || relevancia <= 0) return;
      c.push({ id, patron: p.patron, frase: rellenarPlantilla(p.plantilla, datos).trim(), partes: partesDe(p.plantilla, datos, cifras), cifras, cifra, enlace: p.enlace, relevancia });
    };
    const reconocida = (v: { anulacion: unknown; separado: { cerrado: { resultado: string } | null } | null }) =>
      !v.anulacion && v.separado?.cerrado?.resultado !== 'cancelado';
    const ventas = Object.values(e.ventas).filter(reconocida);
    const desde30 = sumarDias(hoy, -30);

    // P1: ticket vs volumen (últimos 30 días, sin las ventas nuevas de un cambio).
    const porLocal = new Map<Id, { n: number; valor: number }>();
    for (const v of ventas) {
      const f = v.ts.slice(0, 10);
      if (f < desde30 || f >= hoy || v.ventaOrigenCambioId) continue;
      const a = porLocal.get(v.localId) ?? { n: 0, valor: 0 };
      a.n += 1;
      a.valor += v.total;
      porLocal.set(v.localId, a);
    }
    const locales = [...porLocal.entries()].map(([id, x]) => ({ id, n: x.n, ticket: x.n ? x.valor / x.n : 0 }));
    const porTicket = [...locales].sort((a, b) => b.ticket - a.ticket)[0];
    const porVolumen = [...locales].sort((a, b) => b.n - a.n)[0];
    if (porTicket && porVolumen && porTicket.id !== porVolumen.id && porTicket.n < porVolumen.n) {
      const veces = porTicket.ticket / Math.max(1, porVolumen.ticket);
      agregar(
        'ticket-vs-volumen',
        { localTicket: e.locales[porTicket.id]?.nombre ?? '', localVolumen: e.locales[porVolumen.id]?.nombre ?? '', veces: String(r1(veces)).replace('.', ',') },
        r1(veces),
        veces - 1,
      );
    }

    // P2: vendedora estrella.
    const vend = selDesempenoVendedores(e, { desde: desde30, hasta: sumarDias(hoy, -1) });
    const estrella = vend[0];
    if (estrella && estrella.vecesPromedio > 1.2)
      agregar(
        'vendedora-estrella',
        { vendedor: estrella.nombre, porcentaje: pct(estrella.vecesPromedio - 1), fraseAccesorio: estrella.conAccesorio >= 0.4 ? FRASE_ACCESORIO : '' },
        r1(estrella.vecesPromedio),
        estrella.vecesPromedio - 1,
      );

    // P3: talla que se agota (demanda insatisfecha de la variante crítica, N16).
    const nar = selNarrativa(e, { hoy });
    const ox = e.meta.narrativa.varianteOxfordM;
    const vOx = ox ? e.variantes[ox] : undefined;
    if (vOx) {
      let insat = 0;
      for (const [k, n] of Object.entries(e.meta.demandaInsatisfecha)) if (k.startsWith(`${ox}@`)) insat += n;
      let vendidas = 0;
      const d84 = sumarDias(hoy, -84);
      for (const v of ventas) if (v.ts.slice(0, 10) >= d84) for (const l of v.lineas) if (l.varianteId === ox) vendidas += l.cantidad;
      if (insat > 0) {
        const extra = Math.max(0.05, Math.round((insat / Math.max(1, vendidas)) * 20) / 20);
        agregar(
          'talla-agotada',
          { talla: vOx.talla, color: e.colores[vOx.colorId]?.nombre.toLowerCase() ?? '', porcentaje: pct(extra) },
          insat,
          0.6 + (nar.varianteCritica ? 0.3 : 0),
        );
      }
    }

    // P4 y P12: tallas de pantalón y familia de color de camisas (180 días).
    const d180 = sumarDias(hoy, -180);
    const pant = new Map<string, number>();
    let nPant = 0;
    let camisas = 0;
    const familias = new Map<string, number>();
    for (const v of ventas) {
      const f = v.ts.slice(0, 10);
      if (f < d180 || f >= hoy) continue;
      for (const l of v.lineas) {
        const va = e.variantes[l.varianteId];
        const cat = e.productos[l.productoId]?.categoria;
        if (!va) continue;
        if (cat === 'pantalones') {
          pant.set(va.talla, (pant.get(va.talla) ?? 0) + l.cantidad);
          nPant += l.cantidad;
        }
        if (cat === 'camisas') {
          camisas += l.cantidad;
          const fam = FAMILIA_COLOR[va.colorId] ?? 'otro';
          familias.set(fam, (familias.get(fam) ?? 0) + l.cantidad);
        }
      }
    }
    const [t1, t2] = [...pant.entries()].sort((a, b) => b[1] - a[1]);
    if (t1 && t2 && nPant > 0) {
      const p = (t1[1] + t2[1]) / nPant;
      const [a, b] = [t1[0], t2[0]].sort();
      agregar('tallas-pantalon', { proporcion: deCadaN(p), tallaA: a ?? '', tallaB: b ?? '' }, r1(p), p - 0.3);
    }
    const [fam] = [...familias.entries()].sort((a, b) => b[1] - a[1]);
    if (fam && camisas > 0) {
      const p = fam[1] / camisas;
      agregar('colores', { color: fam[0], proporcion: `${deCadaN(p).replace(/^1 de cada/, 'una de cada')}` }, r1(p), p - 0.15);
    }

    // P5: categoría dormida.
    const rot = selRotacion(e, { hoy });
    const dormida = rot.categorias.find((x) => x.unidades > 0 && x.dias > 1.3 * rot.tienda.dias);
    if (dormida?.categoria)
      agregar(
        'categoria-dormida',
        { valor: pesosEnPalabras(dormida.aCosto), categoria: NOMBRES_CATEGORIA[dormida.categoria as Categoria].toLowerCase(), meses: Math.floor(dormida.dias / 30) },
        Math.round(dormida.dias),
        dormida.dias / Math.max(1, rot.tienda.dias) - 1,
        { valor: dormida.aCosto },
      );

    // P7 y P8: sábados en la tarde y domingos por local (últimas 12 semanas, por valor).
    const d84 = sumarDias(hoy, -84);
    let semana = 0;
    let sabTarde = 0;
    const domingo = new Map<Id, number>();
    for (const v of ventas) {
      const f = v.ts.slice(0, 10);
      if (f < d84 || f >= hoy) continue;
      semana += v.total;
      const ds = diaSemana(f);
      const h = Number(v.ts.slice(11, 13));
      if (ds === 6 && h >= 15 && h < 19) sabTarde += v.total;
      if (ds === 0) domingo.set(v.localId, (domingo.get(v.localId) ?? 0) + v.total);
    }
    if (semana > 0 && sabTarde > 0) {
      let horasSemana = 0;
      let nLocales = 0;
      for (const l of Object.values(e.locales)) {
        if (!l.vende || l.eliminadoEn) continue;
        nLocales += 1;
        for (const franja of Object.values(l.horario)) if (franja) horasSemana += (Number(franja.cierra.slice(0, 2)) - Number(franja.abre.slice(0, 2)));
      }
      const pHoras = (4 * nLocales) / Math.max(1, horasSemana);
      const pVentas = sabTarde / semana;
      agregar('sabado-tarde', { porcentajeHoras: pct(Math.ceil(pHoras * 100) / 100), porcentajeVentas: pct(pVentas) }, r1(pVentas * 100), pVentas / pHoras - 1);
    }
    const doms = [...domingo.entries()].sort((a, b) => b[1] - a[1]);
    const fuerte = doms[0];
    const debil = doms[doms.length - 1];
    if (fuerte && debil && fuerte[0] !== debil[0] && debil[1] > 0) {
      const x = fuerte[1] / debil[1] - 1;
      agregar('domingo-por-local', { localFuerte: e.locales[fuerte[0]]?.nombre ?? '', localDebil: e.locales[debil[0]]?.nombre ?? '', porcentaje: pct(x) }, r1(x), x * 0.8);
    }

    // P9: pagos digitales hace 12 meses vs. ahora (ventanas de 30 días).
    const digital = (m: { medio: string; proporcion: number }[]) =>
      m.filter((x) => ['nequi', 'daviplata', 'transferencia', 'qr_bre_b'].includes(x.medio)).reduce((a, x) => a + x.proporcion, 0);
    const antesDesde = sumarDias(desde30, -365);
    if (antesDesde >= e.meta.inicioVentana) {
      const ahoraM = digital(selMediosDePago(e, { desde: desde30, hasta: sumarDias(hoy, -1) }));
      const antes = digital(selMediosDePago(e, { desde: antesDesde, hasta: sumarDias(hoy, -366) }));
      if (ahoraM - antes > 0.05) agregar('pagos-digitales', { antes: pct(antes), ahora: pct(ahoraM) }, r1(ahoraM * 100), (ahoraM - antes) * 4);
    }

    // P10: datáfono del mes anterior.
    const mesAnt = sumarMesesAMes(hoy.slice(0, 7), -1);
    const dat = selConciliacionDatafono(e, { mes: mesAnt, localId: 'todos' });
    if (dat.abonado.bruto > 0) {
      const ret = dat.abonado.retenciones.fuente + dat.abonado.retenciones.iva + dat.abonado.retenciones.ica;
      agregar(
        'datafono',
        { vendido: pesosEnPalabras(dat.abonado.bruto), consignado: pesosEnPalabras(dat.abonado.neto), comision: pesosEnPalabras(dat.abonado.comision), retenciones: pesosEnPalabras(ret) },
        dat.abonado.comision,
        0.5,
        { vendido: dat.abonado.bruto, consignado: dat.abonado.neto, comision: dat.abonado.comision, retenciones: ret },
      );
    }

    // P11: clientes de más de $ 3 M sin comprar en 90 días (valor histórico, compras antes de hoy).
    const m = new Map<Id, { valor: number; ultima: string }>();
    for (const v of ventas) {
      if (!v.clienteId || v.ts.slice(0, 10) >= hoy) continue;
      const a = m.get(v.clienteId) ?? { valor: 0, ultima: '' };
      a.valor += v.total;
      if (v.ts.slice(0, 10) > a.ultima) a.ultima = v.ts.slice(0, 10);
      m.set(v.clienteId, a);
    }
    let vipRiesgo = 0;
    for (const [id, x] of m) if (!e.clientes[id]?.eliminadoEn && x.valor >= 3_000_000 && diferenciaDias(x.ultima, hoy) > 90) vipRiesgo += 1;
    if (vipRiesgo > 0) agregar('vip-en-riesgo', { cantidad: vipRiesgo, umbral: '$ 3 millones' }, vipRiesgo, Math.min(1.5, vipRiesgo / 20));

    // P13: margen que se come el dólar en los dos últimos pedidos de un producto.
    let caida: { categoria: Categoria; puntos: number } | null = null;
    const porProducto = new Map<Id, { importacionId: Id; fecha: string }[]>();
    for (const i of Object.values(e.importaciones)) {
      if (i.eliminadoEn || !i.costosAplicados || i.nota === 'Carga inicial de existencias') continue;
      for (const l of i.lineas) {
        const lista = porProducto.get(l.productoId) ?? [];
        lista.push({ importacionId: i.id, fecha: i.fechaPedido });
        porProducto.set(l.productoId, lista);
      }
    }
    for (const [pid, lista] of porProducto) {
      if (lista.length < 2) continue;
      const [a, b] = lista.sort((x, y) => (x.fecha < y.fecha ? -1 : 1)).slice(-2);
      const p = e.productos[pid];
      if (!a || !b || !p) continue;
      const ca = selCostoAterrizado(e, { importacionId: a.importacionId, hoy })?.porProducto[pid]?.costoUnitario;
      const cb = selCostoAterrizado(e, { importacionId: b.importacionId, hoy })?.porProducto[pid]?.costoUnitario;
      if (!ca || !cb) continue;
      const puntos = (margenBruto(p.precioVenta, p.tarifaIva, ca) - margenBruto(p.precioVenta, p.tarifaIva, cb)) * 100;
      if (puntos >= 3 && (!caida || puntos > caida.puntos)) caida = { categoria: p.categoria, puntos };
    }
    if (caida) agregar('dolar-margen', { categoria: NOMBRES_CATEGORIA[caida.categoria].toLowerCase(), puntos: Math.round(caida.puntos) }, Math.round(caida.puntos), caida.puntos / 6);

    // P14: la fábrica que más se retrasa y la de menos defectos.
    const fab = selComparativoFabricas(e, { hoy }).filter((x) => x.retrasoPromedio !== null && x.defectos !== null);
    const tarde = [...fab].sort((a, b) => (b.retrasoPromedio ?? 0) - (a.retrasoPromedio ?? 0))[0];
    const mejor = [...fab].filter((x) => (x.defectos ?? 0) > 0).sort((a, b) => (a.defectos ?? 0) - (b.defectos ?? 0))[0];
    if (tarde && mejor && tarde.proveedorId !== mejor.proveedorId && (tarde.retrasoPromedio ?? 0) > 3) {
      const veces = (tarde.defectos ?? 0) / Math.max(0.0001, mejor.defectos ?? 0);
      agregar('fabrica-incumplida', { fabrica: tarde.nombre, dias: Math.round(tarde.retrasoPromedio ?? 0), veces: String(r1(veces)).replace('.', ','), mejorFabrica: mejor.nombre }, Math.round(tarde.retrasoPromedio ?? 0), (tarde.retrasoPromedio ?? 0) / 10);
    }

    // P15: nómina sobre ventas por local (mes anterior).
    const nom = selCostoNominaPorLocal(e, { mes: mesAnt }).locales.filter((x) => x.porcentaje !== null);
    const alto = [...nom].sort((a, b) => (b.porcentaje ?? 0) - (a.porcentaje ?? 0))[0];
    const bajo = [...nom].sort((a, b) => (a.porcentaje ?? 0) - (b.porcentaje ?? 0))[0];
    if (alto && bajo && alto.localId !== bajo.localId)
      agregar('nomina-por-local', { localAlto: alto.nombre, pctAlto: pct(alto.porcentaje ?? 0), localBajo: bajo.nombre, pctBajo: pct(bajo.porcentaje ?? 0) }, r1((alto.porcentaje ?? 0) * 100), ((alto.porcentaje ?? 0) - (bajo.porcentaje ?? 0)) * 8);

    // P18: proyección del mes.
    const pr = selProyeccionMes(e, { hoy });
    if (pr.diasTranscurridos >= 3 && pr.anioAnterior && pr.anioAnterior > 0) {
      const v = pr.proyeccion / pr.anioAnterior - 1;
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      agregar('proyeccion-mes', { mes: meses[Number(hoy.slice(5, 7)) - 1] ?? '', proyeccion: pesosEnPalabras(pr.proyeccion), variacion: `${pct(Math.abs(v))} ${v >= 0 ? 'más' : 'menos'}` }, pr.proyeccion, 0.4 + Math.abs(v), {
        proyeccion: pr.proyeccion,
      });
    }

    return c.sort((a, b) => b.relevancia - a.relevancia || (a.id < b.id ? -1 : 1)).slice(0, Math.max(3, maximo));
  },
);

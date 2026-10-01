import type { Categoria, FechaISO, FranjaHorario, Id } from '@/dominio/tipos';
import type { ConfigLocal } from '@/config/locales';
import {
  INDICE_DIA,
  INDICE_MES,
  MEZCLA_CATEGORIAS,
  MEZCLA_POR_MES,
  PESO_FRANJA,
  PESO_FRANJA_USQ_DOMINGO,
  RANGO_VENTAS_DIA,
  RUIDO_SEMANAL_SIGMA,
  TENDENCIA_MENSUAL,
} from '@/seed/estacionalidad';
import { DEMANDA_TALLAS } from '@/seed/tallas';
import { FAMILIA_COLOR } from '@/seed/colores';
import { diaN, diaSemana, lunesDe, minutosDeHora } from '@/dominio/reglas/fechas';
import { type Calendario, masDias } from './calendario';
import { acumular, elegirAcumulada, type Rng, rngPlan } from './prng';
import type { ProductoPlan } from './tipos';

/** Modelo de demanda (PLAN 7.5, 7.6): λ por local y día, mezcla, tallas, colores y hora de cada venta. */

export const CATEGORIAS: readonly Categoria[] = [
  'camisas',
  'polos',
  'pantalones',
  'blazers',
  'trajes',
  'punto',
  'abrigos_chaquetas',
  'calzado',
  'accesorios',
];

/** Mezcla de la vendedora estrella (P2): más sastrería y abrigos, menos polos. */
export const AJUSTE_ESTRELLA: Partial<Record<Categoria, number>> = {
  blazers: 2.4,
  trajes: 2.6,
  abrigos_chaquetas: 1.6,
  polos: 0.6,
  accesorios: 0.6,
};
export const LOCAL_ESTRELLA = 'p93';
/** Fracción esperada de las ventas de Parque 93 que hace la vendedora estrella. */
const PARTE_ESTRELLA = 0.42;

/** Días antes del ancla desde los que las 5 referencias de P6 dejan de venderse. */
export const DIAS_SIN_MOVIMIENTO = 75;
/** Meses antes del ancla en que el beige y el camel empiezan a subir en suéteres (P12). */
const DIAS_TENDENCIA_BEIGE = 90;

function mesIndice(fecha: FechaISO): number {
  return Number(fecha.slice(0, 4)) * 12 + Number(fecha.slice(5, 7)) - 1;
}

export interface EntradaDemanda {
  semilla: string;
  ancla: FechaISO;
  inicio: FechaISO;
  escala: number;
  locales: readonly ConfigLocal[];
  calendario: Calendario;
  productos: readonly ProductoPlan[];
}

export class Demanda {
  readonly e: EntradaDemanda;
  private readonly ruido = new Map<FechaISO, number>();
  private readonly lambdas = new Map<string, number>();
  private readonly mezclas = new Map<string, { cats: Categoria[]; acumulada: number[] }>();
  private readonly productosCat = new Map<string, { productos: ProductoPlan[]; acumulada: number[] }>();
  private readonly coloresCache = new Map<string, { colores: Id[]; acumulada: number[] }>();
  private readonly tallasCache = new Map<string, { tallas: string[]; acumulada: number[] }>();
  private readonly horas = new Map<string, { segmentos: [number, number][]; acumulada: number[] }>();
  private readonly kAncla: number;
  private readonly kInicio: number;
  readonly porCategoria = new Map<Categoria, ProductoPlan[]>();
  readonly limiteSinMovimiento: FechaISO;
  readonly inicioTendenciaBeige: FechaISO;

  constructor(e: EntradaDemanda) {
    this.e = e;
    this.kInicio = mesIndice(e.inicio);
    this.kAncla = mesIndice(e.ancla) - this.kInicio;
    for (const c of CATEGORIAS) this.porCategoria.set(c, []);
    for (const p of e.productos) this.porCategoria.get(p.categoria)?.push(p);
    this.limiteSinMovimiento = masDias(e.ancla, -DIAS_SIN_MOVIMIENTO);
    this.inicioTendenciaBeige = masDias(e.ancla, -DIAS_TENDENCIA_BEIGE);
  }

  /** Tendencia anual (+10 %), normalizada para valer 1 en el mes del ancla (tabla precalculada, sin Math.pow). */
  tendencia(fecha: FechaISO): number {
    const t = TENDENCIA_MENSUAL;
    const k = Math.max(0, Math.min(t.length - 1, mesIndice(fecha) - this.kInicio));
    const ka = Math.max(0, Math.min(t.length - 1, this.kAncla));
    return (t[k] ?? 1) / (t[ka] ?? 1);
  }

  /** Ruido semanal normal (σ = 6 %), uno por semana, sembrado por su lunes. */
  ruidoSemana(fecha: FechaISO): number {
    const lunes = lunesDe(fecha);
    let r = this.ruido.get(lunes);
    if (r === undefined) {
      r = Math.max(0.8, Math.min(1.2, rngPlan(this.e.semilla, `ruido:${lunes}`).normal(1, RUIDO_SEMANAL_SIGMA)));
      this.ruido.set(lunes, r);
    }
    return r;
  }

  /** Índice del día de la semana con el domingo por local (P8). */
  indiceDia(local: ConfigLocal, fecha: FechaISO): number {
    const ds = diaSemana(fecha);
    if (ds === 0) return local.perfil?.indiceDomingo ?? INDICE_DIA[0] ?? 1;
    return INDICE_DIA[ds] ?? 1;
  }

  /** λ esperado (sin ruido) de ventas de un local en un día; 0 si no abre. */
  lambdaEsperado(local: ConfigLocal, fecha: FechaISO): number {
    const clave = `${local.id}@${fecha}`;
    const guardado = this.lambdas.get(clave);
    if (guardado !== undefined) return guardado;
    const perfil = local.perfil;
    let l = 0;
    if (perfil && this.e.calendario.horario(local, fecha)) {
      l =
        perfil.ventasDiaBase *
        (INDICE_MES[Number(fecha.slice(5, 7))] ?? 1) *
        this.indiceDia(local, fecha) *
        this.e.calendario.factorEventos(fecha) *
        (this.e.calendario.esFestivo(fecha) ? perfil.indiceFestivo : 1) *
        this.tendencia(fecha) *
        this.e.escala;
    }
    this.lambdas.set(clave, l);
    return l;
  }

  lambda(local: ConfigLocal, fecha: FechaISO): number {
    return this.lambdaEsperado(local, fecha) * this.ruidoSemana(fecha);
  }

  /** Número de ventas por local en un día, con la regla de rango [15, 60] × escala (7.5). */
  ventasDelDia(fecha: FechaISO): { localId: Id; n: number }[] {
    const locales = this.e.locales.filter((l) => l.perfil && this.e.calendario.horario(l, fecha));
    if (locales.length === 0) return [];
    const rng = rngPlan(this.e.semilla, `ventas:${fecha}`);
    const r = locales.map((l) => ({ localId: l.id, n: rng.poisson(this.lambda(l, fecha)), l }));
    const min = Math.round(RANGO_VENTAS_DIA.minimo * this.e.escala);
    const max = Math.round(RANGO_VENTAS_DIA.maximo * this.e.escala);
    let total = r.reduce((a, x) => a + x.n, 0);
    // Días abiertos completos (los tres locales abren): el total se acota al rango.
    if (locales.length === this.e.locales.filter((l) => l.perfil).length) {
      if (total < min) {
        const fuerte = r.reduce((a, x) => (this.lambda(x.l, fecha) > this.lambda(a.l, fecha) ? x : a));
        fuerte.n += min - total;
        total = min;
      }
      while (total > max) {
        const mayor = r.reduce((a, x) => (x.n > a.n ? x : a));
        mayor.n -= 1;
        total -= 1;
      }
    }
    return r.map((x) => ({ localId: x.localId, n: x.n }));
  }

  /** Mezcla de categorías de un local en un mes (P1, 7.6), como tabla acumulada. */
  mezcla(localId: Id, fecha: FechaISO, ajuste: Partial<Record<Categoria, number>> | null = null) {
    const mes = Number(fecha.slice(5, 7));
    const clave = `${localId}|${mes}|${ajuste ? JSON.stringify(ajuste) : ''}`;
    let m = this.mezclas.get(clave);
    if (!m) {
      const base = MEZCLA_CATEGORIAS[localId] ?? MEZCLA_CATEGORIAS.zr;
      const porMes = MEZCLA_POR_MES[mes] ?? {};
      const cats = [...CATEGORIAS];
      const pesos = cats.map((c) => (base?.[c] ?? 0) * (porMes[c] ?? 1) * (ajuste?.[c] ?? 1));
      m = { cats, acumulada: acumular(pesos) };
      this.mezclas.set(clave, m);
    }
    return m;
  }

  /** Participación de una categoría en las unidades de un local y mes (normalizada). */
  participacion(localId: Id, fecha: FechaISO, categoria: Categoria): number {
    const m = this.mezcla(localId, fecha);
    const total = m.acumulada[m.acumulada.length - 1] ?? 1;
    const i = m.cats.indexOf(categoria);
    const previo = i > 0 ? (m.acumulada[i - 1] ?? 0) : 0;
    return ((m.acumulada[i] ?? 0) - previo) / total;
  }

  /**
   * Participación efectiva de una categoría en las unidades de un local: en Parque 93 mezcla la de Valentina
   * (≈ 42 % de las ventas, con más sastrería, P2) con la del resto. La usan las cantidades de los pedidos, la
   * distribución y la reposición, para que la mercancía esté donde se vende.
   */
  participacionEfectiva(localId: Id, fecha: FechaISO, categoria: Categoria): number {
    const base = this.participacion(localId, fecha, categoria);
    if (localId !== LOCAL_ESTRELLA) return base;
    const m = this.mezcla(localId, fecha, AJUSTE_ESTRELLA);
    const total = m.acumulada[m.acumulada.length - 1] ?? 1;
    const i = m.cats.indexOf(categoria);
    const estrella = ((m.acumulada[i] ?? 0) - (i > 0 ? (m.acumulada[i - 1] ?? 0) : 0)) / total;
    // El accesorio que agrega la estrella en ≈ 34 % de sus ventas (≈ 0,09 de las unidades de Parque 93).
    const accesorio = categoria === 'accesorios' ? 0.09 : 0;
    return (1 - PARTE_ESTRELLA) * base + PARTE_ESTRELLA * estrella + accesorio;
  }

  /** Unidades esperadas por día de una categoría en un local, en un mes típico del local (afinidad, 7.9). */
  unidadesLocalCategoria(local: ConfigLocal, fecha: FechaISO, categoria: Categoria): number {
    const p = local.perfil;
    if (!p) return 0;
    return p.ventasDiaBase * p.unidadesPorVenta * this.participacionEfectiva(local.id, fecha, categoria);
  }

  /** ¿La referencia se vende en esa fecha? (P6: las 5 sin movimiento dejan de venderse). */
  seVende(p: ProductoPlan, fecha: FechaISO): boolean {
    return !(p.sinMovimiento && fecha >= this.limiteSinMovimiento);
  }

  /** Productos de una categoría con sus pesos de demanda en una fecha. */
  productosDe(categoria: Categoria, fecha: FechaISO) {
    const periodo = fecha >= this.limiteSinMovimiento ? 'b' : 'a';
    const clave = `${categoria}|${periodo}`;
    let t = this.productosCat.get(clave);
    if (!t) {
      const productos = this.porCategoria.get(categoria) ?? [];
      t = {
        productos,
        acumulada: acumular(productos.map((p) => (this.seVende(p, fecha) ? p.pesoDemanda : 0))),
      };
      this.productosCat.set(clave, t);
    }
    return t;
  }

  /** Peso de cada color de una referencia (P12: azul en camisas; beige y camel subiendo en suéteres). */
  pesoColor(p: ProductoPlan, colorId: Id, fecha: FechaISO): number {
    const familia = FAMILIA_COLOR[colorId];
    if (p.categoria === 'camisas' && familia === 'azul')
      // La Oxford azul cielo es la combinación estrella (N1, P3); el resto del azul pesa menos para que el azul
      // sea ≈ 1 de cada 3 camisas (P12).
      return p.id === 'pd_cam_0142' && colorId === 'col_azc' ? 1.2 : 0.2;
    if (p.categoria === 'punto' && (familia === 'beige' || familia === 'camel'))
      return fecha >= this.inicioTendenciaBeige ? 1.8 : 0.9;
    return 1;
  }

  colores(p: ProductoPlan, fecha: FechaISO) {
    const clave = `${p.id}|${p.categoria === 'punto' && fecha >= this.inicioTendenciaBeige ? 'b' : 'a'}`;
    let t = this.coloresCache.get(clave);
    if (!t) {
      t = { colores: p.colores, acumulada: acumular(p.colores.map((c) => this.pesoColor(p, c, fecha))) };
      this.coloresCache.set(clave, t);
    }
    return t;
  }

  /** Fracción esperada de un color en las ventas de la referencia. */
  fraccionColor(p: ProductoPlan, colorId: Id, fecha: FechaISO): number {
    const t = this.colores(p, fecha);
    const total = t.acumulada[t.acumulada.length - 1] ?? 1;
    return this.pesoColor(p, colorId, fecha) / total;
  }

  tallas(p: ProductoPlan) {
    let t = this.tallasCache.get(p.curva);
    if (!t) {
      const d = DEMANDA_TALLAS[p.curva];
      t = { tallas: p.tallas, acumulada: acumular(p.tallas.map((x) => d[x] ?? 0)) };
      this.tallasCache.set(p.curva, t);
    }
    return t;
  }

  elegirCategoria(rng: Rng, localId: Id, fecha: FechaISO, ajuste: Partial<Record<Categoria, number>> | null) {
    const m = this.mezcla(localId, fecha, ajuste);
    return m.cats[elegirAcumulada(rng, m.acumulada)] ?? 'camisas';
  }

  elegirProducto(rng: Rng, categoria: Categoria, fecha: FechaISO): ProductoPlan | null {
    const t = this.productosDe(categoria, fecha);
    const i = elegirAcumulada(rng, t.acumulada);
    return i >= 0 ? (t.productos[i] ?? null) : null;
  }

  elegirTalla(rng: Rng, p: ProductoPlan): string {
    const t = this.tallas(p);
    return t.tallas[elegirAcumulada(rng, t.acumulada)] ?? p.tallas[0] ?? 'Única';
  }

  elegirColor(rng: Rng, p: ProductoPlan, fecha: FechaISO): Id {
    const t = this.colores(p, fecha);
    return t.colores[elegirAcumulada(rng, t.acumulada)] ?? p.colores[0] ?? '';
  }

  /** Tabla de franjas de un local en un día: segmentos [desde, hasta) en minutos con su peso. */
  private tablaHoras(local: ConfigLocal, fecha: FechaISO, franja: FranjaHorario) {
    const usqDomingo = local.id === 'usq' && diaSemana(fecha) === 0;
    const clave = `${local.id}|${franja.abre}|${franja.cierra}|${usqDomingo ? 'd' : ''}`;
    let t = this.horas.get(clave);
    if (!t) {
      const abre = minutosDeHora(franja.abre);
      const cierra = minutosDeHora(franja.cierra) - 5;
      const pesos = usqDomingo ? PESO_FRANJA_USQ_DOMINGO : PESO_FRANJA;
      const segmentos: [number, number][] = [];
      const w: number[] = [];
      for (const p of pesos) {
        const desde = Math.max(abre, p.desde * 60);
        const hasta = Math.min(cierra, p.hasta * 60);
        if (hasta > desde) {
          segmentos.push([desde, hasta]);
          w.push(p.peso * (hasta - desde));
        }
      }
      if (segmentos.length === 0) {
        segmentos.push([abre, Math.max(abre + 1, cierra)]);
        w.push(1);
      }
      t = { segmentos, acumulada: acumular(w) };
      this.horas.set(clave, t);
    }
    return t;
  }

  /** Segundo del día (desde medianoche) de una venta, ponderado por franja (P7). */
  segundoVenta(rng: Rng, local: ConfigLocal, fecha: FechaISO, franja: FranjaHorario): number {
    const t = this.tablaHoras(local, fecha, franja);
    const seg = t.segmentos[elegirAcumulada(rng, t.acumulada)] ?? t.segmentos[0] ?? [600, 1200];
    const minuto = seg[0] + Math.floor(rng.decimal() * (seg[1] - seg[0]));
    return minuto * 60 + Math.floor(rng.decimal() * 60);
  }

  /**
   * Unidades esperadas por día de cada referencia, sumadas sobre los locales (para las cantidades de los pedidos,
   * 7.9: valor esperado del mismo modelo, sin simular). Devuelve sumas acumuladas por producto desde `desde`.
   */
  acumuladoEsperado(desde: FechaISO, hasta: FechaISO): {
    desde: number;
    sumas: Map<Id, Float64Array>;
  } {
    const n0 = diaN(desde);
    const dias = diaN(hasta) - n0 + 1;
    const sumas = new Map<Id, Float64Array>();
    for (const p of this.e.productos) sumas.set(p.id, new Float64Array(dias + 1));
    const vendedores = this.e.locales.filter((l) => l.perfil);
    let fecha = desde;
    for (let i = 0; i < dias; i++) {
      for (const p of this.e.productos) {
        const arr = sumas.get(p.id) as Float64Array;
        arr[i + 1] = arr[i] ?? 0;
      }
      for (const l of vendedores) {
        const lam = this.lambdaEsperado(l, fecha);
        if (lam <= 0) continue;
        const unidades = lam * (l.perfil?.unidadesPorVenta ?? 1.4);
        for (const c of CATEGORIAS) {
          const part = this.participacionEfectiva(l.id, fecha, c);
          if (part <= 0) continue;
          const t = this.productosDe(c, fecha);
          const total = t.acumulada[t.acumulada.length - 1] ?? 0;
          if (total <= 0) continue;
          for (const p of t.productos) {
            if (!this.seVende(p, fecha)) continue;
            const arr = sumas.get(p.id) as Float64Array;
            arr[i + 1] = (arr[i + 1] ?? 0) + (unidades * part * p.pesoDemanda) / total;
          }
        }
      }
      fecha = masDias(fecha, 1);
    }
    return { desde: n0, sumas };
  }
}

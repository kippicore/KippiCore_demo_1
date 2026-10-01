import type {
  DiaSemana,
  Empleado,
  EstadoDominio,
  EstadoImportacion,
  FechaHoraISO,
  FechaISO,
  HoraHHmm,
  Id,
  TipoTurno,
} from '@/dominio/tipos';
import { ESTADOS_IMPORTACION } from '@/dominio/tipos';
import { CONFIG, type Config } from '@/config';
import { SEED, type Seed } from '@/seed';
import type { ConfigLocal } from '@/config/locales';
import type { TurnoPlantilla } from '@/config/turnos';
import { SEMANAS_TURNOS } from '@/config/turnos';
import { diaSemana, inicioVentana, lunesDe, minutosDeHora } from '@/dominio/reglas/fechas';
import { idGenerado } from '@/dominio/motor/ids';
import { Calendario, masDias } from './calendario';
import { Demanda } from './demanda';
import { planClientes } from './personas';
import { planImportaciones } from './plan-importaciones';
import { rngPlan } from './prng';
import { RutaTasas } from './tasas';
import type { ClientePlan, ImportacionPlan, PlanNarrativo, ProductoPlan } from './tipos';

/**
 * Plan global (PLAN 7.4): puro, sin leer el estado (solo los maestros del estado inicial, que no dependen de
 * hechos). Ventas esperadas por local y día, clientes latentes, importaciones con fechas y cantidades,
 * plantilla de turnos, calendario de nómina y obligaciones y plan narrativo relativo al ancla.
 */
export interface EntradaPlan {
  semilla: string;
  ancla: FechaISO;
  escala: number;
  /** Estado inicial (solo maestros). */
  base: EstadoDominio;
  config?: Config;
  seed?: Seed;
}

export interface TurnoDia {
  id: Id;
  empleadoId: Id;
  localId: Id;
  fecha: FechaISO;
  tipo: TipoTurno;
  inicio: HoraHHmm;
  fin: HoraHHmm;
  descansoMin: number;
}

export interface MarcacionPlan {
  clave: string;
  ts: FechaHoraISO;
  turnoId: Id;
  empleadoId: Id;
  localId: Id;
  tipo: 'entrada' | 'salida';
}

export interface EventoImportacion {
  impId: Id;
  fecha: FechaISO;
  /** Orden dentro del día. */
  orden: number;
}

const dos = (n: number) => (n < 10 ? `0${n}` : String(n));
export function hhmm(minutos: number): HoraHHmm {
  return `${dos(Math.floor(minutos / 60))}:${dos(minutos % 60)}`;
}

export class Plan {
  readonly semilla: string;
  readonly ancla: FechaISO;
  readonly escala: number;
  readonly inicio: FechaISO;
  readonly vispera: FechaISO;
  readonly config: Config;
  readonly seed: Seed;
  readonly calendario: Calendario;
  readonly demanda: Demanda;
  readonly tasas: RutaTasas;
  readonly productos: ProductoPlan[];
  readonly productoPorId: Map<Id, ProductoPlan>;
  readonly productoDeVariante: Map<Id, ProductoPlan>;
  readonly clientes: ClientePlan[];
  readonly clientePorId: Map<Id, ClientePlan>;
  readonly importaciones: ImportacionPlan[];
  readonly importacionPorId: Map<Id, ImportacionPlan>;
  readonly eventosImportacion = new Map<FechaISO, Id[]>();
  readonly locales: ConfigLocal[];
  readonly localesVenta: ConfigLocal[];
  readonly empleados: Map<Id, Empleado>;
  readonly plantilla: readonly TurnoPlantilla[];
  /** Plantilla por día de la semana y local. */
  readonly plantillaDia = new Map<string, TurnoPlantilla[]>();
  /** Primer lunes con turnos almacenados (13 semanas antes del ancla). */
  readonly lunesTurnos: FechaISO;
  readonly narrativa: PlanNarrativo;
  /** Claves de venta que la narrativa convierte en separados (N7). */
  readonly separadosNarrativos = new Map<string, PlanNarrativo['separados'][number]>();
  private readonly ventasDia = new Map<FechaISO, { localId: Id; n: number }[]>();

  constructor(e: EntradaPlan) {
    this.semilla = e.semilla;
    this.ancla = e.ancla;
    this.escala = e.escala;
    this.config = e.config ?? CONFIG;
    this.seed = e.seed ?? SEED;
    this.inicio = inicioVentana(e.ancla, this.config.demo.mesesHistoria);
    this.vispera = masDias(this.inicio, -1);
    const anio = Number(e.ancla.slice(0, 4));
    this.calendario = new Calendario([anio - 3, anio - 2, anio - 1, anio, anio + 1, anio + 2]);
    this.locales = this.config.locales;
    this.localesVenta = this.locales.filter((l) => l.perfil !== null);
    this.tasas = new RutaTasas(e.semilla, e.ancla, this.config.tasaEjemplo.valores);

    // Productos (maestros del estado inicial + pesos de la semilla).
    this.productos = [];
    this.productoPorId = new Map();
    this.productoDeVariante = new Map();
    const porProducto = new Map<Id, Record<string, Id>>();
    for (const v of Object.values(e.base.variantes)) {
      const m = porProducto.get(v.productoId) ?? {};
      m[`${v.talla}|${v.colorId}`] = v.id;
      porProducto.set(v.productoId, m);
    }
    for (const r of this.seed.catalogo) {
      const p: ProductoPlan = {
        id: r.id,
        categoria: r.categoria,
        curva: r.curvaTallas,
        proveedorId: r.proveedorId,
        precio: r.precioVenta,
        pesoDemanda: r.pesoDemanda,
        sinMovimiento: r.narrativa === 'sin_movimiento',
        colores: [...r.colorIds],
        tallas: [...this.seed.curvasTallas[r.curvaTallas]],
        variantes: porProducto.get(r.id) ?? {},
        fob: { ...r.fob },
      };
      this.productos.push(p);
      this.productoPorId.set(p.id, p);
      for (const v of Object.values(p.variantes)) this.productoDeVariante.set(v, p);
    }

    this.demanda = new Demanda({
      semilla: e.semilla,
      ancla: e.ancla,
      inicio: this.inicio,
      escala: e.escala,
      locales: this.locales,
      calendario: this.calendario,
      productos: this.productos,
    });

    this.empleados = new Map(Object.values(e.base.empleados).map((x) => [x.id, x]));
    this.plantilla = this.config.plantillaTurnos;
    for (const t of this.plantilla) {
      const k = `${t.dia}|${t.localId}`;
      const l = this.plantillaDia.get(k) ?? [];
      l.push(t);
      this.plantillaDia.set(k, l);
    }
    this.lunesTurnos = masDias(lunesDe(e.ancla), -7 * SEMANAS_TURNOS.atras);

    this.clientes = planClientes({
      semilla: e.semilla,
      ancla: e.ancla,
      inicio: this.inicio,
      escala: e.escala,
      plantilla: this.plantilla,
    });
    this.clientePorId = new Map(this.clientes.map((c) => [c.id, c]));

    const pi = planImportaciones({
      semilla: e.semilla,
      ancla: e.ancla,
      inicio: this.inicio,
      vispera: this.vispera,
      escala: e.escala,
      demanda: this.demanda,
      calendario: this.calendario,
      productos: this.productos,
      proveedores: this.seed.proveedores,
      aduanas: this.config.parametros.aduanas,
      tasas: this.tasas,
    });
    this.importaciones = pi.importaciones;
    this.importacionPorId = new Map(this.importaciones.map((i) => [i.id, i]));
    for (const imp of this.importaciones) {
      const fechas = new Set<FechaISO>([imp.creacion]);
      for (const e2 of ESTADOS_IMPORTACION) {
        const f = imp.fechas[e2];
        if (f) fechas.add(f < this.vispera ? this.vispera : f);
      }
      if (imp.estimadasNarrativa) fechas.add(imp.estimadasNarrativa.fecha);
      for (const f of fechas) {
        const l = this.eventosImportacion.get(f) ?? [];
        l.push(imp.id);
        this.eventosImportacion.set(f, l);
      }
    }

    this.narrativa = this.planNarrativo();
    for (const s of this.narrativa.separados) this.separadosNarrativos.set(claveVenta(s.dia, s.localId, s.indice), s);
  }

  ventasDelDia(fecha: FechaISO): { localId: Id; n: number }[] {
    let v = this.ventasDia.get(fecha);
    if (!v) {
      v = this.demanda.ventasDelDia(fecha);
      this.ventasDia.set(fecha, v);
    }
    return v;
  }

  local(id: Id): ConfigLocal | undefined {
    return this.locales.find((l) => l.id === id);
  }

  /** Plantilla de turnos de un local un día (sin ajustes). */
  plantillaDe(localId: Id, fecha: FechaISO): TurnoPlantilla[] {
    return this.plantillaDia.get(`${diaSemana(fecha)}|${localId}`) ?? [];
  }

  /** ¿Está activo el empleado (según los maestros) en la fecha? */
  activoPlan(empleadoId: Id, fecha: FechaISO): boolean {
    const e = this.empleados.get(empleadoId);
    return !!e && e.fechaIngreso <= fecha && (e.fechaRetiro === null || e.fechaRetiro >= fecha);
  }

  /** ¿La fecha tiene turnos almacenados (13 semanas antes del ancla y 3 después, ventana móvil)? */
  conTurnos(fecha: FechaISO): boolean {
    return fecha >= this.lunesTurnos;
  }

  /**
   * Turnos almacenados de un día (7.8): la plantilla con exceso aceptado en diciembre (+1 h) y los domingos de
   * Zona Rosa (P16), y el turno de apertura de Mateo Herrera el día del ancla (N6).
   */
  turnosDelDia(fecha: FechaISO): TurnoDia[] {
    if (!this.conTurnos(fecha)) return [];
    const r: TurnoDia[] = [];
    const ds = diaSemana(fecha) as DiaSemana;
    const diciembre = fecha.slice(5, 7) === '12';
    for (const t of this.plantilla) {
      if (t.dia !== ds) continue;
      if (!this.activoPlan(t.empleadoId, fecha)) continue;
      let inicio = t.inicio;
      let fin = t.fin;
      if (t.localId === 'zr' && ds === 0) {
        inicio = '10:30';
        fin = '19:30';
      }
      if (diciembre && t.localId !== 'bod') fin = hhmm(Math.min(minutosDeHora(fin) + 60, 22 * 60));
      if (fecha === this.ancla && t.empleadoId === 'em_mherrera') continue;
      r.push({
        id: idGenerado('tu', fecha, t.empleadoId),
        empleadoId: t.empleadoId,
        localId: t.localId,
        fecha,
        tipo: t.tipo,
        inicio,
        fin,
        descansoMin: t.descansoMin,
      });
    }
    if (fecha === this.ancla && this.activoPlan('em_mherrera', fecha)) {
      r.push({
        id: idGenerado('tu', fecha, 'em_mherrera'),
        empleadoId: 'em_mherrera',
        localId: 'zr',
        fecha,
        tipo: 'apertura',
        inicio: '10:00',
        fin: diciembre ? '19:00' : '18:00',
        descansoMin: 60,
      });
    }
    return r;
  }

  /** Marcaciones planeadas de un día (7.8): entrada ≈ inicio − 4 min, salida ≈ fin + 6 min, con su ruido. */
  marcacionesDelDia(fecha: FechaISO): MarcacionPlan[] {
    const turnos = this.turnosDelDia(fecha);
    if (!turnos.length || fecha > masDias(this.ancla, 400)) return [];
    const r: MarcacionPlan[] = [];
    const tarde = new Map(this.narrativa.tardanzas.map((t) => [t.fecha, t.minutos]));
    const ausentes = new Set(this.narrativa.ausencias.map((a) => `${a.fecha}|${a.empleadoId}`));
    for (const t of turnos) {
      if (ausentes.has(`${fecha}|${t.empleadoId}`)) continue;
      if (this.narrativa.novedades.some((n) => n.empleadoId === t.empleadoId && fecha >= n.desde && fecha <= n.hasta))
        continue;
      const rng = rngPlan(this.semilla, `marc:${fecha}:${t.empleadoId}`);
      const ini = minutosDeHora(t.inicio);
      const fin = minutosDeHora(t.fin);
      let entrada = ini + Math.round(rng.normal(-4, 5));
      if (t.empleadoId === 'em_mherrera' && tarde.has(fecha)) entrada = ini + (tarde.get(fecha) ?? 20);
      const salida = Math.max(entrada + 60, fin + Math.round(rng.normal(6, 8)));
      const ts = (m: number) => `${fecha}T${hhmm(Math.max(0, Math.min(m, 23 * 60 + 58)))}:00`;
      r.push({
        clave: `marc:${fecha}:${t.empleadoId}:e`,
        ts: ts(entrada),
        turnoId: t.id,
        empleadoId: t.empleadoId,
        localId: t.localId,
        tipo: 'entrada',
      });
      r.push({
        clave: `marc:${fecha}:${t.empleadoId}:s`,
        ts: ts(salida),
        turnoId: t.id,
        empleadoId: t.empleadoId,
        localId: t.localId,
        tipo: 'salida',
      });
    }
    return r;
  }

  /** Fecha real planeada del estado de una importación (o null). */
  fechaEstado(imp: ImportacionPlan, e: EstadoImportacion): FechaISO | null {
    return imp.fechas[e] ?? null;
  }

  private planNarrativo(): PlanNarrativo {
    const A = this.ancla;
    const rng = rngPlan(this.semilla, 'plan:narrativa');
    // N7: 14 separados creados en las últimas 3 semanas; 3 vencen esta semana.
    const separados: PlanNarrativo['separados'] = [];
    const dias: FechaISO[] = [];
    for (let k = 21; k >= 1; k--) dias.push(masDias(A, -k));
    const elegidos = dias.filter((_, i) => i % 3 !== 2).slice(0, 14);
    const locales = ['p93', 'zr', 'usq'];
    elegidos.forEach((dia, i) => {
      const ventas = this.ventasDelDia(dia);
      let localId = locales[i % 3] as Id;
      let v = ventas.find((x) => x.localId === localId && x.n > 0);
      if (!v) {
        v = ventas.find((x) => x.n > 0);
        localId = v?.localId ?? localId;
      }
      if (!v) return;
      const porVencer = i >= 11;
      const limiteMax = masDias(dia, this.config.parametros.ventas.diasMaximoSeparado);
      let fechaLimite = porVencer ? masDias(A, [1, 3, 4][i - 11] ?? 2) : masDias(A, 7 + ((i * 3) % 18));
      if (fechaLimite > limiteMax) fechaLimite = limiteMax;
      separados.push({ dia, localId, indice: Math.floor(v.n / 2), fechaLimite, porVencer });
    });
    // N6: tardanzas de Mateo (≈ 4 por mes en los días de apertura con turno almacenado; 3 en los 30 días previos).
    const tardanzas: PlanNarrativo['tardanzas'] = [{ fecha: A, minutos: 25 }];
    const apertura = (f: FechaISO) =>
      this.plantillaDe('zr', f).some((t) => t.empleadoId === 'em_mherrera' && t.tipo === 'apertura');
    const ultimos: FechaISO[] = [];
    for (let k = 1; k <= 28; k++) {
      const f = masDias(A, -k);
      if (apertura(f) && f >= this.lunesTurnos) ultimos.push(f);
    }
    for (const f of rng.muestra(ultimos, 3)) tardanzas.push({ fecha: f, minutos: rng.entero(15, 35) });
    for (let bloque = 1; bloque <= 3; bloque++) {
      const candidatos: FechaISO[] = [];
      for (let k = 1 + bloque * 28; k <= 28 + bloque * 28; k++) {
        const f = masDias(A, -k);
        if (apertura(f) && f >= this.lunesTurnos) candidatos.push(f);
      }
      for (const f of rng.muestra(candidatos, 4)) tardanzas.push({ fecha: f, minutos: rng.entero(15, 35) });
    }
    // Ausencias sin novedad: una cada ≈ 2 meses en otro empleado.
    const ausencias: PlanNarrativo['ausencias'] = [];
    for (const [k, emp] of [
      [74, 'em_casuarez'],
      [33, 'em_nrios'],
    ] as const) {
      let f = masDias(A, -k);
      for (let i = 0; i < 7 && !this.plantilla.some((t) => t.empleadoId === emp && t.dia === diaSemana(f)); i++)
        f = masDias(f, 1);
      if (f >= this.lunesTurnos) ausencias.push({ fecha: f, empleadoId: emp });
    }
    const novedades: PlanNarrativo['novedades'] = [
      {
        id: idGenerado('nv', 'vacaciones', 'em_casuarez'),
        empleadoId: 'em_casuarez',
        tipo: 'vacaciones',
        desde: masDias(A, -58),
        hasta: masDias(A, -49),
        remunerada: true,
      },
      {
        id: idGenerado('nv', 'incapacidad', 'em_nrios'),
        empleadoId: 'em_nrios',
        tipo: 'incapacidad',
        desde: masDias(A, -40),
        hasta: masDias(A, -38),
        remunerada: true,
      },
      {
        id: idGenerado('nv', 'permiso', 'em_scardenas'),
        empleadoId: 'em_scardenas',
        tipo: 'permiso',
        desde: masDias(A, -15),
        hasta: masDias(A, -15),
        remunerada: true,
      },
    ];
    // Compras guionadas: Andrés (frecuente de Usaquén, 6 compras en 6 meses, N12) y Ricardo (VIP de Parque 93, N8).
    const comprasGuion: PlanNarrativo['comprasGuion'] = [];
    const andres: [number, { productoId: Id; talla: string; colorId: Id }[]][] = [
      [168, [{ productoId: 'pd_pan_0305', talla: '32', colorId: 'col_are' }]],
      [139, [{ productoId: 'pd_cam_0131', talla: 'M', colorId: 'col_bla' }]],
      [104, [{ productoId: 'pd_pol_0201', talla: 'M', colorId: 'col_azn' }, { productoId: 'pd_acc_0905', talla: 'Única', colorId: 'col_caf' }]],
      [71, [{ productoId: 'pd_pan_0302', talla: '32', colorId: 'col_azn' }]],
      [37, [{ productoId: 'pd_pun_0601', talla: 'M', colorId: 'col_azn' }]],
      [12, [{ productoId: 'pd_cam_0136', talla: 'M', colorId: 'col_bla' }]],
    ];
    const ricardo: [number, { productoId: Id; talla: string; colorId: Id }[]][] = [
      [505, [{ productoId: 'pd_trj_0501', talla: '52', colorId: 'col_azn' }]],
      [452, [{ productoId: 'pd_cam_0133', talla: 'L', colorId: 'col_bla' }, { productoId: 'pd_acc_0901', talla: 'Única', colorId: 'col_vin' }]],
      [398, [{ productoId: 'pd_blz_0401', talla: '52', colorId: 'col_car' }, { productoId: 'pd_pan_0301', talla: '34', colorId: 'col_car' }]],
      [331, [{ productoId: 'pd_cal_0803', talla: '42', colorId: 'col_neg' }]],
      [270, [{ productoId: 'pd_cam_0143', talla: 'L', colorId: 'col_bla' }, { productoId: 'pd_acc_0905', talla: 'Única', colorId: 'col_neg' }]],
      [204, [{ productoId: 'pd_abr_0701', talla: 'L', colorId: 'col_cml' }]],
      [151, [{ productoId: 'pd_pun_0603', talla: 'L', colorId: 'col_grc' }]],
      [96, [{ productoId: 'pd_blz_0401', talla: '52', colorId: 'col_azn' }]],
      [52, [{ productoId: 'pd_cam_0142', talla: 'L', colorId: 'col_bla' }, { productoId: 'pd_pan_0301', talla: '34', colorId: 'col_azn' }]],
      [18, [{ productoId: 'pd_pol_0202', talla: 'L', colorId: 'col_azn' }]],
    ];
    const agregar = (clienteId: Id, localId: Id, vendedorId: Id, lista: typeof andres, hora: string) => {
      for (const [k, lineas] of lista) {
        let dia = masDias(A, -k);
        const local = this.local(localId) as ConfigLocal;
        while (!this.calendario.horario(local, dia)) dia = masDias(dia, 1);
        if (dia < this.inicio) continue;
        comprasGuion.push({
          clave: `guion:${clienteId}:${dia}`,
          ts: `${dia}T${hora}:00`,
          clienteId,
          localId,
          vendedorId,
          lineas,
        });
      }
    };
    agregar('cl_andres_gutierrez', 'usq', 'em_scardenas', andres, '17:40');
    agregar('cl_ricardo_penuela', 'p93', 'em_vgomez', ricardo, '16:20');
    return { ancla: A, separados, tardanzas, ausencias, novedades, comprasGuion };
  }
}

export function claveVenta(dia: FechaISO, localId: Id, indice: number): string {
  return `venta:${dia}:${localId}:${String(indice).padStart(3, '0')}`;
}

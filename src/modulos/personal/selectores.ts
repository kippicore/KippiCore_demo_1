import type {
  COP,
  Contrato,
  Empleado,
  EsquemaComision,
  FechaHoraISO,
  FechaISO,
  Id,
  LiquidacionEmpleado,
  LiquidacionNomina,
  Local,
  MesISO,
  MetaVentas,
  ParametrosNomina,
  PeriodoNomina,
  TipoVinculacion,
} from '@/dominio/tipos';
import { mesDe } from '@/dominio/reglas/fechas';
import {
  crearSelector,
  hechosEnFechas,
  nombreEmpleado,
  selComparativoModalidades,
  selCostoEmpleado,
  selRiesgosContratacion,
  type CostoEmpleado,
  type ModoCosto,
  selVistaPreviaNomina,
  type RiesgoContratacion,
  type VistaPreviaNomina,
} from '@/selectores';
import { ultimoDiaDelMes } from './calculos';

/**
 * Selectores locales de Personal, nómina y comisiones (C1): componen los del dominio (`selCostoEmpleado`,
 * `selRiesgosContratacion`, `selComisiones`, `selVistaPreviaNomina`…) para armar lo que pintan las pantallas. Declaran
 * TODAS las tablas que leen (también a través de los selectores que invocan): así el caché y la verificación de
 * tablas funcionan. Ninguno reimplementa una regla de nómina.
 */

/** Las tablas que lee `selCostoEmpleado` (src/selectores/nomina.ts). */
const TABLAS_COSTO = [
  'empleados',
  'contratos',
  'esquemasComision',
  'metas',
  'ventas',
  'devoluciones',
  'turnos',
  'marcaciones',
  'novedades',
  'liquidaciones',
  'parametros',
  'agregados',
] as const;

/** Parámetros de nómina vigentes (los porcentajes que se muestran salen de aquí, nunca de números escritos a mano). */
export const selParametrosNomina = crearSelector<void, ParametrosNomina>('c1.parametros', ['parametros'], (e) => e.parametros.nomina);

// ---------------------------------------------------------------------------------------------------------
// Lista del equipo
// ---------------------------------------------------------------------------------------------------------
export interface FilaPersonal {
  empleado: Empleado;
  contrato: Contrato | null;
  nombre: string;
  localId: Id | null;
  localNombre: string;
  tipo: TipoVinculacion | null;
  /** Salario base (laboral) u honorarios (prestación), mensuales. */
  valorBase: COP;
  /** Costo mensual para el negocio en el modo pedido (null si no tiene contrato). */
  costo: COP | null;
  /** Lo que recibe la persona (neto) en ese mismo modo. */
  neto: COP | null;
  /** Veces que el costo supera lo que dice el contrato. */
  veces: number | null;
  riesgo: RiesgoContratacion | null;
  retirado: boolean;
}

const nombreLocal = (locales: readonly Local[], id: Id | null): string => (id ? (locales.find((l) => l.id === id)?.nombre ?? id) : 'Administración');

/** Cada persona con su costo para el negocio (W6) en el modo pedido, con o sin exoneración. */
export const selFilasPersonal = crearSelector<
  { hoy: FechaISO; ahora: FechaHoraISO; modo: ModoCosto; exoneracion: boolean; incluirRetirados?: boolean },
  FilaPersonal[]
>('c1.filasPersonal', [...TABLAS_COSTO, 'locales'], (e, { hoy, ahora, modo, exoneracion, incluirRetirados }) => {
  const locales = Object.values(e.locales);
  const riesgos = new Map(selRiesgosContratacion(e, { hoy }).map((r) => [r.empleadoId, r]));
  const filas: FilaPersonal[] = [];
  for (const em of Object.values(e.empleados)) {
    if (em.eliminadoEn) continue;
    const retirado = em.fechaRetiro !== null && em.fechaRetiro <= hoy;
    if (retirado && !incluirRetirados) continue;
    const contrato = e.contratos[em.contratoVigenteId] ?? null;
    const costo: CostoEmpleado | null = retirado ? null : selCostoEmpleado(e, { empleadoId: em.id, modo, exoneracion, hoy, ahora });
    const valorBase = contrato?.tipo === 'laboral' ? (contrato.salarioBase ?? 0) : (contrato?.honorarios ?? 0);
    filas.push({
      empleado: em,
      contrato,
      nombre: nombreEmpleado(em),
      localId: em.localId,
      localNombre: nombreLocal(locales, em.localId),
      tipo: contrato?.tipo ?? null,
      valorBase,
      costo: costo?.costo ?? null,
      neto: costo?.neto ?? null,
      veces: costo && valorBase > 0 ? costo.costo / valorBase : null,
      riesgo: riesgos.get(em.id) ?? null,
      retirado,
    });
  }
  return filas.sort((a, b) => Number(a.retirado) - Number(b.retirado) || (b.costo ?? 0) - (a.costo ?? 0) || (a.nombre < b.nombre ? -1 : 1));
});

// ---------------------------------------------------------------------------------------------------------
// Ficha
// ---------------------------------------------------------------------------------------------------------
export interface FichaEmpleado {
  empleado: Empleado;
  contrato: Contrato | null;
  /** Todos los contratos de la persona, el más reciente primero. */
  contratos: Contrato[];
  esquema: EsquemaComision | null;
  localNombre: string;
  riesgo: RiesgoContratacion | null;
  retirado: boolean;
}

export const selFichaEmpleado = crearSelector<{ slug: string; hoy: FechaISO }, FichaEmpleado | null>(
  'c1.fichaEmpleado',
  ['empleados', 'contratos', 'esquemasComision', 'locales', 'parametros', 'agregados'],
  (e, { slug, hoy }) => {
    const empleado = Object.values(e.empleados).find((x) => x.slug === slug);
    if (!empleado || empleado.eliminadoEn) return null;
    const contrato = e.contratos[empleado.contratoVigenteId] ?? null;
    const contratos = Object.values(e.contratos)
      .filter((c) => c.empleadoId === empleado.id)
      .sort((a, b) => (a.inicio < b.inicio ? 1 : -1));
    return {
      empleado,
      contrato,
      contratos,
      esquema: contrato?.esquemaComisionId ? (e.esquemasComision[contrato.esquemaComisionId] ?? null) : null,
      localNombre: nombreLocal(Object.values(e.locales), empleado.localId),
      riesgo: selRiesgosContratacion(e, { hoy }).find((r) => r.empleadoId === empleado.id) ?? null,
      retirado: empleado.fechaRetiro !== null && empleado.fechaRetiro <= hoy,
    };
  },
);

/** Costo del empleado en un modo (envoltura para tener la misma verificación de tablas en las pantallas). */
export const selCostoFicha = crearSelector<
  { empleadoId: Id; modo: ModoCosto; exoneracion: boolean; hoy: FechaISO; ahora: FechaHoraISO },
  { costo: CostoEmpleado | null; sinExoneracion: COP | null; conExoneracion: COP | null }
>('c1.costoFicha', TABLAS_COSTO, (e, { empleadoId, modo, exoneracion, hoy, ahora }) => {
  const costo = selCostoEmpleado(e, { empleadoId, modo, exoneracion, hoy, ahora });
  // Para mostrar cuánto ahorra la exoneración se calculan los dos extremos con el mismo modo.
  const con = selCostoEmpleado(e, { empleadoId, modo, exoneracion: true, hoy, ahora })?.costo ?? null;
  const sin = selCostoEmpleado(e, { empleadoId, modo, exoneracion: false, hoy, ahora })?.costo ?? null;
  return { costo, conExoneracion: con, sinExoneracion: sin };
});

export interface Desprendible {
  liquidacion: LiquidacionNomina;
  linea: LiquidacionEmpleado;
}

/** Las liquidaciones en las que aparece la persona, la más reciente primero. */
export const selDesprendibles = crearSelector<{ empleadoId: Id }, Desprendible[]>('c1.desprendibles', ['liquidaciones'], (e, { empleadoId }) => {
  const r: Desprendible[] = [];
  for (const liquidacion of Object.values(e.liquidaciones)) {
    const linea = liquidacion.lineas.find((l) => l.empleadoId === empleadoId);
    if (linea) r.push({ liquidacion, linea });
  }
  return r.sort((a, b) => (a.liquidacion.periodo.fin < b.liquidacion.periodo.fin ? 1 : a.liquidacion.periodo.fin > b.liquidacion.periodo.fin ? -1 : a.liquidacion.periodo.tipo < b.liquidacion.periodo.tipo ? -1 : 1));
});

// ---------------------------------------------------------------------------------------------------------
// Opciones para los formularios
// ---------------------------------------------------------------------------------------------------------
export interface OpcionesPersonal {
  locales: { id: Id; nombre: string; vende: boolean }[];
  esquemas: EsquemaComision[];
  /** Cuántas personas con contrato vigente usan cada esquema. */
  usoEsquemas: Record<Id, number>;
  /** Nombres usados hoy por el equipo, para sugerir en los campos de afiliación y cuenta. */
  sugerencias: { eps: string[]; pension: string[]; cesantias: string[]; arl: string[]; caja: string[]; entidades: string[] };
  slugs: string[];
}

const unicos = (xs: string[]) => [...new Set(xs.filter((x) => x && x !== 'No aplica'))].sort();

export const selOpcionesPersonal = crearSelector<void, OpcionesPersonal>(
  'c1.opciones',
  ['locales', 'esquemasComision', 'empleados', 'contratos'],
  (e) => {
    const empleados = Object.values(e.empleados).filter((x) => !x.eliminadoEn);
    const usoEsquemas: Record<Id, number> = {};
    for (const em of empleados) {
      if (em.fechaRetiro) continue;
      const id = e.contratos[em.contratoVigenteId]?.esquemaComisionId;
      if (id) usoEsquemas[id] = (usoEsquemas[id] ?? 0) + 1;
    }
    return {
      locales: Object.values(e.locales)
        .filter((l) => !l.eliminadoEn)
        .sort((a, b) => a.orden - b.orden)
        .map((l) => ({ id: l.id, nombre: l.nombre, vende: l.vende })),
      esquemas: Object.values(e.esquemasComision)
        .filter((x) => !x.eliminadoEn)
        .sort((a, b) => (a.nombre < b.nombre ? -1 : 1)),
      usoEsquemas,
      sugerencias: {
        eps: unicos(empleados.map((x) => x.afiliaciones.eps)),
        pension: unicos(empleados.map((x) => x.afiliaciones.pension)),
        cesantias: unicos(empleados.map((x) => x.afiliaciones.cesantias)),
        arl: unicos(empleados.map((x) => x.afiliaciones.arl)),
        caja: unicos(empleados.map((x) => x.afiliaciones.caja)),
        entidades: unicos(empleados.map((x) => x.cuentaPago.entidad)),
      },
      slugs: Object.values(e.empleados).map((x) => x.slug),
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Riesgo de contrato realidad
// ---------------------------------------------------------------------------------------------------------
export interface ExposicionContratista {
  riesgo: RiesgoContratacion;
  slug: string;
  localNombre: string;
  honorarios: COP;
  /** Lo que cuesta hoy (honorarios + comisiones). */
  costoActual: COP;
  /** Lo que costaría el mismo valor como contrato laboral. */
  costoLaboral: COP;
  diferencia: COP;
}

/**
 * "El riesgo que no veía": para cada contratista con señales de relación laboral, cuánto costaría el mismo valor
 * como salario (con la exoneración pedida). Usa `selComparativoModalidades`.
 */
export const selExposicionContratistas = crearSelector<{ hoy: FechaISO; exoneracion: boolean }, { filas: ExposicionContratista[]; diferencia: COP }>(
  'c1.exposicion',
  ['empleados', 'contratos', 'parametros', 'agregados', 'locales'],
  (e, { hoy, exoneracion }) => {
    const locales = Object.values(e.locales);
    const filas: ExposicionContratista[] = [];
    for (const riesgo of selRiesgosContratacion(e, { hoy })) {
      const em = e.empleados[riesgo.empleadoId];
      const c = e.contratos[riesgo.contratoId];
      if (!em || !c) continue;
      const honorarios = c.honorarios ?? 0;
      const cmp = selComparativoModalidades(e, { valorMensual: honorarios, exoneracion, fecha: hoy, riesgoArl: c.riesgoArl });
      filas.push({
        riesgo,
        slug: em.slug,
        localNombre: nombreLocal(locales, em.localId),
        honorarios,
        costoActual: cmp.prestacion.costoEmpleador,
        costoLaboral: cmp.laboral.costoEmpleador,
        diferencia: cmp.diferenciaCosto,
      });
    }
    return { filas, diferencia: filas.reduce((a, f) => a + f.diferencia, 0) };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Metas de ventas por local
// ---------------------------------------------------------------------------------------------------------
export interface MetaLocal {
  local: Local;
  meta: MetaVentas | null;
  /** Ventas del local en el mes a la fecha (con IVA): lo que se compara con la meta. */
  ventas: COP;
  /** ventas / meta (puede pasar de 1). */
  cumplimiento: number | null;
}

export const selMetasLocales = crearSelector<{ mes: MesISO; hoy: FechaISO }, MetaLocal[]>(
  'c1.metas',
  ['metas', 'locales', 'ventas', 'devoluciones', 'productos', 'variantes'],
  (e, { mes, hoy }) => {
    const fin = ultimoDiaDelMes(mes);
    const hasta = hoy < fin ? hoy : fin;
    const ventas = new Map<Id, number>();
    for (const h of hechosEnFechas(e, { desde: `${mes}-01`, hasta })) ventas.set(h.localId, (ventas.get(h.localId) ?? 0) + h.total);
    return Object.values(e.locales)
      .filter((l) => l.vende && !l.eliminadoEn)
      .sort((a, b) => a.orden - b.orden)
      .map((local) => {
        const meta = Object.values(e.metas).find((m) => m.localId === local.id && m.mes === mes) ?? null;
        const v = ventas.get(local.id) ?? 0;
        return { local, meta, ventas: v, cumplimiento: meta && meta.valor > 0 ? v / meta.valor : null };
      });
  },
);

// ---------------------------------------------------------------------------------------------------------
// Esquemas en uso
// ---------------------------------------------------------------------------------------------------------
export interface EsquemaConUso {
  esquema: EsquemaComision;
  /** Personas con contrato vigente que lo usan. */
  personas: { id: Id; nombre: string }[];
}

export const selEsquemasConUso = crearSelector<void, EsquemaConUso[]>('c1.esquemasConUso', ['esquemasComision', 'empleados', 'contratos'], (e) => {
  const porEsquema = new Map<Id, { id: Id; nombre: string }[]>();
  for (const em of Object.values(e.empleados)) {
    if (em.eliminadoEn || em.fechaRetiro) continue;
    const id = e.contratos[em.contratoVigenteId]?.esquemaComisionId;
    if (!id) continue;
    const lista = porEsquema.get(id) ?? [];
    lista.push({ id: em.id, nombre: nombreEmpleado(em) });
    porEsquema.set(id, lista);
  }
  return Object.values(e.esquemasComision)
    .filter((x) => !x.eliminadoEn)
    .sort((a, b) => (a.nombre < b.nombre ? -1 : 1))
    .map((esquema) => ({ esquema, personas: porEsquema.get(esquema.id) ?? [] }));
});

// ---------------------------------------------------------------------------------------------------------
// Liquidación
// ---------------------------------------------------------------------------------------------------------
export interface LineaConPersona {
  linea: LiquidacionEmpleado;
  nombre: string;
  slug: string | null;
  localNombre: string;
}

/** Una liquidación con el nombre, el slug y el local de cada línea. */
export const selLineasLiquidacion = crearSelector<{ liquidacionId: Id }, { liquidacion: LiquidacionNomina; lineas: LineaConPersona[] } | null>(
  'c1.lineasLiquidacion',
  ['liquidaciones', 'empleados', 'locales'],
  (e, { liquidacionId }) => {
    const liquidacion = e.liquidaciones[liquidacionId];
    if (!liquidacion) return null;
    const locales = Object.values(e.locales);
    return {
      liquidacion,
      lineas: liquidacion.lineas.map((linea) => {
        const em = e.empleados[linea.empleadoId];
        return { linea, nombre: nombreEmpleado(em), slug: em?.slug ?? null, localNombre: nombreLocal(locales, linea.localId) };
      }),
    };
  },
);

/** Mes (AAAA-MM) al que corresponde la verificación de PILA de un periodo. */
export const mesDelPeriodo = (fin: FechaISO): MesISO => mesDe(fin);

/** Lo que `empleado.retirar` borra o desactiva, para avisarlo antes de confirmar. */
export const selConsecuenciasRetiro = crearSelector<{ empleadoId: Id; fecha: FechaISO }, { turnosFuturos: number; usuarios: number }>(
  'c1.consecuenciasRetiro',
  ['turnos', 'usuarios'],
  (e, { empleadoId, fecha }) => ({
    turnosFuturos: Object.values(e.turnos).filter((t) => t.empleadoId === empleadoId && t.fecha > fecha).length,
    usuarios: Object.values(e.usuarios).filter((u) => u.empleadoId === empleadoId && u.activo).length,
  }),
);

/** Las tablas que lee `selVistaPreviaNomina` (src/selectores/nomina.ts): las de la nómina más lo que escribiría al aprobar. */
const TABLAS_VISTA_PREVIA = [...TABLAS_COSTO, 'cuentasPorPagar', 'gastos', 'meta', 'locales', 'proveedores', 'usuarios', 'empresa', 'cuentas'] as const;

export interface VistaPreviaConPersonas {
  /** La liquidación que se aprobaría, con el nombre y el local de cada línea. */
  liquidacion: LiquidacionNomina | null;
  lineas: LineaConPersona[];
  error: string | null;
}

/** Vista previa del periodo (la misma que escribiría `nomina.aprobar`) con el nombre, el slug y el local de cada línea. */
export const selVistaPreviaConPersonas = crearSelector<{ periodo: PeriodoNomina; exoneracion: boolean; ahora: FechaHoraISO }, VistaPreviaConPersonas>(
  'c1.vistaPrevia',
  TABLAS_VISTA_PREVIA,
  (e, p) => {
    const v: VistaPreviaNomina = selVistaPreviaNomina(e, p);
    const locales = Object.values(e.locales);
    return {
      liquidacion: v.liquidacion,
      error: v.error,
      lineas: (v.liquidacion?.lineas ?? []).map((linea) => {
        const em = e.empleados[linea.empleadoId];
        return { linea, nombre: nombreEmpleado(em), slug: em?.slug ?? null, localNombre: nombreLocal(locales, linea.localId) };
      }),
    };
  },
);

/** Un contrato por su id (para verificar la PILA desde la nómina). */
export const selContratoDeLinea = crearSelector<{ contratoId: Id }, Contrato | null>('c1.contrato', ['contratos'], (e, { contratoId }) => e.contratos[contratoId] ?? null);

export interface PresetComparativo {
  empleadoId: Id;
  nombre: string;
  cargo: Empleado['cargo'];
  tipo: TipoVinculacion;
  valor: COP;
  riesgoArl: 1 | 2 | 3 | 4 | 5;
}

/** Las personas activas con su valor mensual, para llenar el comparativo "con el caso de…". */
export const selPresetsComparativo = crearSelector<{ hoy: FechaISO }, PresetComparativo[]>('c1.presets', ['empleados', 'contratos'], (e, { hoy }) => {
  const r: PresetComparativo[] = [];
  for (const em of Object.values(e.empleados)) {
    if (em.eliminadoEn || (em.fechaRetiro !== null && em.fechaRetiro <= hoy)) continue;
    const c = e.contratos[em.contratoVigenteId];
    const valor = c?.tipo === 'laboral' ? c.salarioBase : c?.honorarios;
    if (!c || !valor) continue;
    r.push({ empleadoId: em.id, nombre: nombreEmpleado(em), cargo: em.cargo, tipo: c.tipo, valor, riesgoArl: c.riesgoArl });
  }
  return r.sort((a, b) => (a.nombre < b.nombre ? -1 : 1));
});

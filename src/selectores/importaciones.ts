import type {
  Centavos,
  COP,
  CuentaPorPagar,
  EstadoDominio,
  EstadoImportacion,
  FechaISO,
  Id,
  Importacion,
  MonedaExtranjera,
} from '@/dominio/tipos';
import { ESTADOS_IMPORTACION } from '@/dominio/tipos';
import { calcularCostoAterrizado, fobImportacion, margenBruto, precioSugerido, type ResultadoCosteo, tasaCosteoPonderada, unidadesLinea } from '@/dominio/reglas/costeo';
import { avanceRuta, indiceEstado, retrasoDias, sugerirPedido, type ResultadoSugerencia, type SugerenciaVariante } from '@/dominio/reglas/importaciones';
import { saldoCxP } from '@/dominio/reglas/cuentas';
import { copDeCentavos } from '@/dominio/reglas/dinero';
import { rellenarPlantilla } from '@/dominio/reglas/texto';
import { sumarDias } from '@/dominio/reglas/fechas';
import { MATRIZ_AVISOS, PLANTILLAS_FABRICA_EN, PLANTILLAS_IMPORTACION_ES, SALUDOS, type DestinatarioAviso } from '@/config/textos/mensajes';
import { INDICE_MES } from '@/seed/estacionalidad';
import { crearSelector } from './memo';
import { selTasaVigente } from './base';
import { existencia, selEnCaminoPorVariante, vendidasPorVariante } from './inventario';
import { fechaCorta, miles } from './texto';

/** Importaciones (PLAN 6.23 `importaciones.ts`, 6.20.3, 6.20.13, W3, W4, W12, M3). */

/** Fases de la línea de tiempo (5 fases de los 13 estados). */
export const FASES_IMPORTACION: { fase: string; estados: EstadoImportacion[] }[] = [
  { fase: 'Pedido', estados: ['cotizado', 'pedido_confirmado', 'anticipo_pagado'] },
  { fase: 'Producción', estados: ['en_produccion', 'listo_despacho', 'saldo_pagado'] },
  { fase: 'Viaje', estados: ['embarcado', 'en_transito', 'en_puerto'] },
  { fase: 'Aduana', estados: ['en_nacionalizacion', 'nacionalizado'] },
  { fase: 'Llegada', estados: ['en_transporte_bogota', 'recibido_bodega'] },
];

export function faseDe(estado: EstadoImportacion): string {
  return FASES_IMPORTACION.find((f) => f.estados.includes(estado))?.fase ?? '';
}

export interface FilaImportacion {
  importacion: Importacion;
  proveedorNombre: string;
  fase: string;
  unidades: number;
  fobOrigen: Centavos;
  /** FOB en COP a la tasa vigente (para mostrar). */
  fobCop: COP;
  /** Pagado a la fábrica (centavos de la moneda del pedido). */
  pagadoOrigen: Centavos;
  saldoOrigen: Centavos;
  retrasoDias: number;
  /** 0–1 entre embarque y puerto. */
  avance: number;
  llegadaEstimada: FechaISO;
  esCargaInicial: boolean;
}

function cxpsFabrica(e: EstadoDominio, imp: Importacion): CuentaPorPagar[] {
  return imp.cuentaPorPagarIds.map((id) => e.cuentasPorPagar[id]).filter((c): c is CuentaPorPagar => !!c && c.categoria === 'proveedor_importacion');
}

/** Lista de importaciones con estado, retraso, posición en la ruta y saldo (B1, tablero y lista). */
export const selImportaciones = crearSelector<
  { hoy: FechaISO; estado?: EstadoImportacion; proveedorId?: Id; incluirRecibidas?: boolean },
  FilaImportacion[]
>('selImportaciones', ['importaciones', 'proveedores', 'cuentasPorPagar', 'tasas'], (e, f) => {
  const r: FilaImportacion[] = [];
  for (const imp of Object.values(e.importaciones)) {
    if (imp.eliminadoEn) continue;
    if (f.estado && imp.estado !== f.estado) continue;
    if (f.proveedorId && imp.proveedorId !== f.proveedorId) continue;
    if (f.incluirRecibidas === false && imp.estado === 'recibido_bodega') continue;
    const fob = fobImportacion(imp.lineas);
    let pagado = 0;
    let total = 0;
    for (const c of cxpsFabrica(e, imp)) {
      total += c.valor;
      pagado += c.valor - saldoCxP(c);
    }
    const tasa = selTasaVigente(e, { moneda: imp.moneda, fecha: f.hoy });
    r.push({
      importacion: imp,
      proveedorNombre: e.proveedores[imp.proveedorId]?.nombreCorto ?? '',
      fase: faseDe(imp.estado),
      unidades: imp.lineas.reduce((a, l) => a + unidadesLinea(l), 0),
      fobOrigen: fob,
      fobCop: copDeCentavos(fob, tasa),
      pagadoOrigen: pagado,
      saldoOrigen: Math.max(0, (total || fob) - pagado),
      retrasoDias: imp.estado === 'recibido_bodega' ? 0 : retrasoDias(imp, f.hoy),
      avance: avanceRuta(imp, f.hoy),
      llegadaEstimada: imp.hitos.recibido_bodega.real ?? imp.hitos.recibido_bodega.estimada,
      esCargaInicial: imp.nota === 'Carga inicial de existencias',
    });
  }
  return r.sort((a, b) => (a.importacion.fechaPedido < b.importacion.fechaPedido ? 1 : -1));
});

export const selImportacionPorNumero = crearSelector<{ numero: string }, Importacion | null>(
  'selImportacionPorNumero',
  ['importaciones'],
  (e, { numero }) => Object.values(e.importaciones).find((i) => i.numero === numero && !i.eliminadoEn) ?? null,
);

/** Tasa de costeo (6.20.3): la de los costos aplicados o la ponderada por lo pagado + vigente para lo no pagado. */
export function tasaCosteoDe(e: EstadoDominio, imp: Importacion, hoy: FechaISO): number {
  if (imp.costosAplicados) return imp.costosAplicados.tasaCosteo;
  const abonos: { centavos: Centavos; tasa: number }[] = [];
  let total = 0;
  for (const c of cxpsFabrica(e, imp)) {
    total += c.valor;
    for (const a of c.abonos) if (a.montoOrigen) abonos.push({ centavos: a.montoOrigen.centavos, tasa: a.montoOrigen.tasa });
  }
  return tasaCosteoPonderada(abonos, total || fobImportacion(imp.lineas), selTasaVigente(e, { moneda: imp.moneda, fecha: hoy }));
}

export interface CostoAterrizadoVista extends ResultadoCosteo {
  tasaCosteo: number;
  porProductoDetalle: {
    productoId: Id;
    referencia: string;
    nombre: string;
    unidades: number;
    costoUnitario: COP;
    precioVenta: COP;
    margenProyectado: number;
    /** Margen con el costo vigente antes de esta importación. */
    margenActual: number;
    /** Precio sugerido para conservar el margen actual (redondeado a ,900). */
    precioSugerido: COP;
  }[];
  metodo: 'Costo de reposición: última importación aplicada';
}

/** Costo aterrizado con cascada, por línea y por prenda, margen proyectado y precio sugerido (W4, 6.20.3). */
export const selCostoAterrizado = crearSelector<{ importacionId: Id; hoy: FechaISO; tasaSimulada?: number | null }, CostoAterrizadoVista | null>(
  'selCostoAterrizado',
  ['importaciones', 'cuentasPorPagar', 'tasas', 'productos'],
  (e, { importacionId, hoy, tasaSimulada }) => {
    const imp = e.importaciones[importacionId];
    if (!imp) return null;
    const tasaCosteo = tasaSimulada ?? tasaCosteoDe(e, imp, hoy);
    const r = calcularCostoAterrizado({
      lineas: imp.lineas,
      costos: imp.costos,
      moneda: imp.moneda,
      metodoProrrateo: imp.metodoProrrateo,
      tasaCosteo,
      tasasOtras: {
        USD: selTasaVigente(e, { moneda: 'USD', fecha: hoy }),
        CNY: selTasaVigente(e, { moneda: 'CNY', fecha: hoy }),
      },
    });
    const porProductoDetalle = Object.entries(r.porProducto).map(([productoId, x]) => {
      const p = e.productos[productoId];
      const precio = p?.precioVenta ?? 0;
      const iva = p?.tarifaIva ?? 0.19;
      // Margen actual: con el costo vigente previo a esta importación (si ya se aplicó, el del historial anterior).
      const hist = p?.historialCosto ?? [];
      const previo = imp.costosAplicados ? (hist.filter((h) => h.importacionId !== imp.id).slice(-1)[0]?.costo ?? p?.costoVigente ?? 0) : (p?.costoVigente ?? 0);
      const margenActual = previo > 0 ? margenBruto(precio, iva, previo) : margenBruto(precio, iva, x.costoUnitario);
      return {
        productoId,
        referencia: p?.referencia ?? '',
        nombre: p?.nombre ?? '',
        unidades: x.unidades,
        costoUnitario: x.costoUnitario,
        precioVenta: precio,
        margenProyectado: margenBruto(precio, iva, x.costoUnitario),
        margenActual,
        precioSugerido: precioSugerido(x.costoUnitario, margenActual, iva),
      };
    });
    return { ...r, tasaCosteo, porProductoDetalle, metodo: 'Costo de reposición: última importación aplicada' };
  },
);

export interface LlegadaProxima {
  importacionId: Id;
  numero: string;
  proveedorNombre: string;
  estado: EstadoImportacion;
  fecha: FechaISO;
  unidades: number;
}

/** Llegadas a bodega en los próximos `dias` días (Inicio, calendario, app). */
export const selLlegadasProximas = crearSelector<{ hoy: FechaISO; dias: number }, LlegadaProxima[]>(
  'selLlegadasProximas',
  ['importaciones', 'proveedores'],
  (e, { hoy, dias }) => {
    const hasta = sumarDias(hoy, dias);
    return Object.values(e.importaciones)
      .filter((i) => !i.eliminadoEn && i.estado !== 'recibido_bodega' && indiceEstado(i.estado) >= indiceEstado('pedido_confirmado'))
      .map((i) => ({
        importacionId: i.id,
        numero: i.numero,
        proveedorNombre: e.proveedores[i.proveedorId]?.nombreCorto ?? '',
        estado: i.estado,
        fecha: i.hitos.recibido_bodega.estimada,
        unidades: i.lineas.reduce((a, l) => a + unidadesLinea(l), 0),
      }))
      .filter((x) => x.fecha >= hoy && x.fecha <= hasta)
      .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  },
);

export { selEnCaminoPorVariante };

export interface SugerenciaFila extends SugerenciaVariante {
  referencia: string;
  nombre: string;
  talla: string;
  colorId: Id;
  vendidas12s: number;
  insatisfecha12s: number;
  existencias: number;
  enCamino: number;
  costoUnitarioOrigen: Centavos;
}

export interface SugerenciaPedido extends Omit<ResultadoSugerencia, 'variantes'> {
  proveedorId: Id;
  moneda: MonedaExtranjera;
  coberturaDias: number;
  llegadaEstimada: FechaISO;
  semanasCobertura: number;
  /** De hoy a la llegada estimada: lo que se vende mientras llega el pedido también se descuenta. */
  semanasEspera: number;
  /** Índice estacional de [hoy, llegada + cobertura] / índice de las últimas 12 semanas. */
  factorEstacional: number;
  tasaVigente: number;
  variantes: SugerenciaFila[];
}

function indicePeriodo(desde: FechaISO, dias: number): number {
  let s = 0;
  for (let i = 0; i < dias; i++) s += INDICE_MES[Number(sumarDias(desde, i).slice(5, 7))] ?? 1;
  return s / Math.max(1, dias);
}

/**
 * Sugerencia de pedido a una fábrica (6.20.13, W12): rotación de 12 semanas + demanda insatisfecha × (espera hasta
 * la llegada estimada + cobertura) × estacionalidad de ese periodo − existencias − lo que viene en camino; FOB del
 * último pedido y margen esperado. La espera cuenta porque lo que se vende mientras llega el pedido sale de las
 * existencias y de lo que viene en camino (sin ella, la sugerencia restaba esas unidades dos veces).
 */
export const selSugerenciaPedido = crearSelector<{ proveedorId: Id; coberturaDias: number; hoy: FechaISO }, SugerenciaPedido | null>(
  'selSugerenciaPedido',
  ['proveedores', 'productos', 'variantes', 'ventas', 'devoluciones', 'agregados', 'importaciones', 'tasas', 'parametros', 'meta', 'locales'],
  (e, { proveedorId, coberturaDias, hoy }) => {
    const prov = e.proveedores[proveedorId];
    if (!prov || prov.tipo !== 'fabrica') return null;
    const moneda: MonedaExtranjera = prov.moneda === 'CNY' ? 'CNY' : 'USD';
    const desde = sumarDias(hoy, -84);
    const vendidas = vendidasPorVariante(e, { desde, hasta: sumarDias(hoy, -1) });
    const insat = new Map<Id, number>();
    for (const [k, n] of Object.entries(e.meta.demandaInsatisfecha)) {
      const v = k.slice(0, k.indexOf('@'));
      insat.set(v, (insat.get(v) ?? 0) + n);
    }
    const enCamino = selEnCaminoPorVariante(e);
    // FOB unitario del último pedido de cada producto a esta fábrica.
    const ultimoFob = new Map<Id, Centavos>();
    const pedidos = Object.values(e.importaciones)
      .filter((i) => i.proveedorId === proveedorId && !i.eliminadoEn)
      .sort((a, b) => (a.fechaPedido < b.fechaPedido ? -1 : 1));
    for (const i of pedidos) for (const l of i.lineas) ultimoFob.set(l.productoId, l.costoUnitarioOrigen);
    const dias = e.parametros.aduanas.diasEstimadosEntreEstados;
    let espera = 0;
    for (const est of ESTADOS_IMPORTACION) if (est !== 'cotizado') espera += dias[est];
    const llegada = sumarDias(hoy, espera);
    const factor = indicePeriodo(hoy, espera + coberturaDias) / indicePeriodo(desde, 84);
    const locales = Object.values(e.locales).filter((l) => !l.eliminadoEn);
    const entrada = [];
    const extra = new Map<Id, Omit<SugerenciaFila, keyof SugerenciaVariante>>();
    for (const p of Object.values(e.productos)) {
      if (p.eliminadoEn || p.proveedorId !== proveedorId) continue;
      for (const v of Object.values(e.variantes)) {
        if (v.productoId !== p.id || v.eliminadoEn) continue;
        const ex = locales.reduce((a, l) => a + existencia(e, v.id, l.id), 0);
        const fila = {
          varianteId: v.id,
          productoId: p.id,
          vendidas12s: vendidas.get(v.id) ?? 0,
          insatisfecha12s: insat.get(v.id) ?? 0,
          existencias: ex,
          enCamino: enCamino[v.id]?.unidades ?? 0,
          costoUnitarioOrigen: ultimoFob.get(p.id) ?? 0,
          costoAterrizado: p.costoVigente,
          precioVenta: p.precioVenta,
          tarifaIva: p.tarifaIva,
        };
        entrada.push(fila);
        extra.set(v.id, {
          referencia: p.referencia,
          nombre: p.nombre,
          talla: v.talla,
          colorId: v.colorId,
          vendidas12s: fila.vendidas12s,
          insatisfecha12s: fila.insatisfecha12s,
          existencias: ex,
          enCamino: fila.enCamino,
          costoUnitarioOrigen: fila.costoUnitarioOrigen,
        });
      }
    }
    const tasa = selTasaVigente(e, { moneda, fecha: hoy });
    const r = sugerirPedido({ variantes: entrada, semanasCobertura: coberturaDias / 7, semanasEspera: espera / 7, factorEstacional: factor, tasaVigente: tasa });
    return {
      ...r,
      proveedorId,
      moneda,
      coberturaDias,
      llegadaEstimada: llegada,
      semanasCobertura: coberturaDias / 7,
      semanasEspera: espera / 7,
      factorEstacional: factor,
      tasaVigente: tasa,
      variantes: r.variantes.map((x) => ({ ...x, ...(extra.get(x.varianteId) as Omit<SugerenciaFila, keyof SugerenciaVariante>) })),
    };
  },
);

export interface DestinatarioAvisoVista {
  tipo: DestinatarioAviso;
  /** Contacto de la cadena (fábrica, agentes, transportador) o empleado (bodega). */
  contactoId: Id | null;
  empleadoId: Id | null;
  nombre: string;
  empresa: string;
  idioma: 'es' | 'en';
  tratamiento: 'tu' | 'usted';
  canal: 'whatsapp' | 'correo' | 'wechat' | 'app';
  telefono: string | null;
  correo: string | null;
  wechat: string | null;
  asunto: string | null;
  /** Mensaje redactado (sin el sufijo de prueba: lo agrega lib/enlaces.ts). null para el dueño (aviso en la app). */
  texto: string | null;
  preseleccionado: boolean;
}

export interface AvisosEstado {
  estado: EstadoImportacion;
  reporta: string;
  para: string;
  creaTributos: boolean;
  destinatarios: DestinatarioAvisoVista[];
}

const ROL_CONTACTO: Partial<Record<DestinatarioAviso, 'proveedor' | 'agente_carga' | 'agente_aduanas' | 'transportador'>> = {
  fabrica: 'proveedor',
  agente_carga: 'agente_carga',
  agente_aduanas: 'agente_aduanas',
  transportador: 'transportador',
};

/**
 * Destinatarios y mensajes del panel "Notificar a" según la matriz de W3 (`config/textos/mensajes.ts`): en usted,
 * en inglés para la fábrica, y nunca a la fábrica por la nacionalización.
 */
export const selAvisosEstado = crearSelector<
  { importacionId: Id; estado: EstadoImportacion; marca: string; hora?: string; fecha: FechaISO },
  AvisosEstado | null
>('selAvisosEstado', ['importaciones', 'contactos', 'proveedores', 'empleados', 'meta', 'productos'], (e, { importacionId, estado, marca, hora, fecha }) => {
  const imp = e.importaciones[importacionId];
  if (!imp) return null;
  const m = MATRIZ_AVISOS[estado];
  const prov = e.proveedores[imp.proveedorId];
  const unidades = imp.lineas.reduce((a, l) => a + unidadesLinea(l), 0);
  const categorias = [...new Set(imp.lineas.map((l) => e.productos[l.productoId]?.categoria).filter(Boolean))];
  const carga =
    imp.carga.tipo === 'consolidada'
      ? `carga consolidada de ${String(imp.carga.m3).replace('.', ',')} m³`
      : imp.carga.tipo === 'contenedor'
        ? `contenedor de ${imp.carga.pies} pies`
        : `carga aérea de ${miles(imp.carga.kg)} kg`;
  const h = hora ?? '12:00';
  const saludo = h < '12:00' ? SALUDOS.manana : h < '19:00' ? SALUDOS.tarde : SALUDOS.noche;
  const datosBase: Record<string, string | number> = {
    numero: imp.numero,
    marca,
    contenido: `${categorias.join(', ')}, ${miles(unidades)} prendas`,
    carga,
    puertoOrigen: imp.puertoOrigen,
    puertoDestino: imp.puertoDestino,
    fecha: fechaCorta(fecha),
    llegadaPuerto: fechaCorta(imp.hitos.en_puerto.estimada),
    llegadaBodega: fechaCorta(imp.hitos.recibido_bodega.estimada),
    levanteEstimado: fechaCorta(imp.hitos.nacionalizado.estimada),
    unidades: miles(unidades),
    detalleDestacado: '',
    proveedor: prov?.nombreCorto ?? '',
    saludo,
    recibidas: miles(Object.values(imp.recepcion?.lineas ?? {}).reduce((a, l) => a + l.recibidas, 0)),
    defectuosas: miles(Object.values(imp.recepcion?.lineas ?? {}).reduce((a, l) => a + l.defectuosas, 0)),
  };
  const destinatarios: DestinatarioAvisoVista[] = [];
  const agregar = (tipo: DestinatarioAviso, preseleccionado: boolean) => {
    if (tipo === 'dueno') {
      destinatarios.push({ tipo, contactoId: null, empleadoId: null, nombre: 'Dueño', empresa: marca, idioma: 'es', tratamiento: 'tu', canal: 'app', telefono: null, correo: null, wechat: null, asunto: null, texto: null, preseleccionado });
      return;
    }
    if (tipo === 'bodega') {
      const id = e.meta.narrativa.bodegaPersona || 'em_wdiaz';
      const w = e.empleados[id];
      const nombre = w ? `${w.nombres} ${w.apellidos}` : 'Bodega';
      const plantilla = PLANTILLAS_IMPORTACION_ES[`${estado}.bodega`];
      destinatarios.push({
        tipo,
        contactoId: null,
        empleadoId: w?.id ?? null,
        nombre,
        empresa: marca,
        idioma: 'es',
        tratamiento: 'usted',
        canal: 'whatsapp',
        telefono: w?.celular ?? null,
        correo: w?.correo ?? null,
        wechat: null,
        asunto: `${imp.numero} · ${marca}`,
        texto: plantilla ? rellenarPlantilla(plantilla, { ...datosBase, Nombre: w?.nombres ?? 'Wilson' }) : null,
        preseleccionado,
      });
      return;
    }
    const rol = ROL_CONTACTO[tipo];
    const candidatos = Object.values(e.contactos).filter((c) => !c.eliminadoEn && c.rol === rol && (tipo !== 'fabrica' || c.proveedorId === imp.proveedorId));
    const c = candidatos.find((x) => imp.contactoIds.includes(x.id)) ?? candidatos[0];
    if (!c) return;
    const nombre1 = c.nombre.split(' ')[0] ?? c.nombre;
    const plantilla = tipo === 'fabrica' ? PLANTILLAS_FABRICA_EN[estado] : PLANTILLAS_IMPORTACION_ES[`${estado}.${tipo}`];
    destinatarios.push({
      tipo,
      contactoId: c.id,
      empleadoId: null,
      nombre: c.nombre,
      empresa: c.empresa,
      idioma: tipo === 'fabrica' ? 'en' : c.idioma,
      tratamiento: c.tratamiento,
      canal: c.canalPreferido,
      telefono: c.whatsapp,
      correo: c.correo,
      wechat: c.wechat,
      asunto: tipo === 'fabrica' ? `Order ${imp.numero} · ${marca}` : `${imp.numero} · ${marca}`,
      texto: plantilla ? rellenarPlantilla(plantilla, { ...datosBase, Nombre: nombre1, nombre: nombre1 }) : null,
      preseleccionado,
    });
  };
  for (const t of m.destinatarios) agregar(t, true);
  for (const t of m.opcionales) agregar(t, false);
  return { estado, reporta: m.reporta, para: m.para, creaTributos: !!m.creaTributos, destinatarios };
});

import type {
  Centavos,
  COP,
  EstadoImportacion,
  FechaISO,
  Id,
  Importacion,
  LineaImportacion,
} from '@/dominio/tipos';
import { ESTADOS_IMPORTACION } from '@/dominio/tipos';
import { FASES_IMPORTACION } from '@/config/aduanas';
import { PLANTILLAS_FABRICA_EN } from '@/config/textos/mensajes';
import { fobLinea, unidadesLinea, type ResultadoCosteo } from '@/dominio/reglas/costeo';
import { copDeCentavos, redondear } from '@/dominio/reglas/dinero';
import { diferenciaDias } from '@/dominio/reglas/fechas';
import { avanceRuta, indiceEstado, validarCambioEstado, llegadaABodega } from '@/dominio/reglas/importaciones';
import { rellenarPlantilla } from '@/dominio/reglas/texto';
import type { EntradaAccion } from '@/estado';
import type { DestinatarioAvisoVista } from '@/selectores';
import { numero } from '@/lib/formato';
import { CIERRE_BORRADOR_EN, ETIQUETAS_CARGA } from './textos';

/**
 * Cálculos de PRESENTACIÓN de Importaciones (B1). Ninguno reimplementa una regla de negocio: componen las reglas
 * y los selectores compartidos (posición del barco sobre la ruta, retraso por hito, desglose por prenda de la
 * cascada, totales de lo que el usuario edita en "Sugerir pedido", mensajes de los avisos).
 */

/** "Carga consolidada · 6,2 m³", "Contenedor completo · 20 pies" o "Carga aérea · 180 kg". */
export function textoCarga(carga: Importacion['carga']): string {
  if (carga.tipo === 'consolidada') return `${ETIQUETAS_CARGA.consolidada} · ${numero(carga.m3, 1)} m³`;
  if (carga.tipo === 'contenedor') return `${ETIQUETAS_CARGA.contenedor} · ${carga.pies} pies`;
  return `${ETIQUETAS_CARGA.aerea} · ${numero(carga.kg)} kg`;
}

/** Versión corta para tarjetas: "Consolidada · 6,2 m³". */
export function textoCargaCorta(carga: Importacion['carga']): string {
  if (carga.tipo === 'consolidada') return `Consolidada · ${numero(carga.m3, 1)} m³`;
  if (carga.tipo === 'contenedor') return `Contenedor · ${carga.pies} pies`;
  return `Aérea · ${numero(carga.kg)} kg`;
}

// ---------------------------------------------------------------------------------------------------------
// Fases y ruta
// ---------------------------------------------------------------------------------------------------------
export type FaseId = (typeof FASES_IMPORTACION)[number]['id'];

export function faseDeEstado(estado: EstadoImportacion): FaseId {
  return (FASES_IMPORTACION.find((f) => (f.estados as readonly string[]).includes(estado))?.id ??
    'fabrica') as FaseId;
}

export function indiceFase(fase: FaseId): number {
  return FASES_IMPORTACION.findIndex((f) => f.id === fase);
}

export function estadosDeFase(fase: FaseId): EstadoImportacion[] {
  return [...(FASES_IMPORTACION.find((f) => f.id === fase)?.estados ?? [])] as EstadoImportacion[];
}

/** Posición del puerto colombiano sobre la línea de la ruta (0 = fábrica, 1 = bodega). */
export const PROGRESO_PUERTO = 0.72;

export type TramoRuta = 'fabrica' | 'mar' | 'puerto' | 'tierra' | 'bodega';

export interface PosicionRuta {
  /** 0–1 sobre toda la ruta China → puerto → Bogotá. */
  progreso: number;
  tramo: TramoRuta;
}

/**
 * Dónde está el pedido sobre la ruta: quieto en el origen mientras está en fábrica, avanza en el mar entre el
 * embarque y la llegada estimada al puerto (proporcional a las fechas), queda en el puerto durante la aduana y
 * avanza por tierra entre el levante y la llegada estimada a la bodega.
 */
export function posicionRuta(imp: Pick<Importacion, 'estado' | 'hitos'>, hoy: FechaISO): PosicionRuta {
  const i = indiceEstado(imp.estado);
  if (imp.estado === 'recibido_bodega') return { progreso: 1, tramo: 'bodega' };
  if (i < indiceEstado('embarcado')) return { progreso: 0, tramo: 'fabrica' };
  if (i < indiceEstado('en_puerto'))
    return { progreso: avanceRuta(imp, hoy) * PROGRESO_PUERTO, tramo: 'mar' };
  if (i < indiceEstado('en_transporte_bogota')) return { progreso: PROGRESO_PUERTO, tramo: 'puerto' };
  const salida =
    imp.hitos.en_transporte_bogota.real ??
    imp.hitos.nacionalizado.real ??
    imp.hitos.en_transporte_bogota.estimada;
  const llegada = llegadaABodega(imp);
  const total = diferenciaDias(salida, llegada);
  const f = total <= 0 ? 0.5 : Math.min(0.9, Math.max(0.1, diferenciaDias(salida, hoy) / total));
  return { progreso: PROGRESO_PUERTO + f * (1 - PROGRESO_PUERTO), tramo: 'tierra' };
}

// ---------------------------------------------------------------------------------------------------------
// Línea de tiempo: estimado vs real
// ---------------------------------------------------------------------------------------------------------
export interface DetalleHito {
  estado: EstadoImportacion;
  estimada: FechaISO;
  real: FechaISO | null;
  /** 'hecho' con fecha real, 'actual' el último alcanzado, 'pendiente' el resto. */
  situacion: 'hecho' | 'actual' | 'pendiente';
  /** Días de más (+) o de menos (−) entre la fecha real y la estimada de un hito ya alcanzado. */
  desviacion: number | null;
  /** Días que lleva vencido un hito pendiente (su fecha estimada ya pasó). */
  vencidoDias: number;
  nota: string | null;
  actualizadoPor: string | null;
}

export function detalleHitos(imp: Pick<Importacion, 'estado' | 'hitos'>, hoy: FechaISO): DetalleHito[] {
  const actual = indiceEstado(imp.estado);
  return ESTADOS_IMPORTACION.map((e, i) => {
    const h = imp.hitos[e];
    const alcanzado = i <= actual;
    return {
      estado: e,
      estimada: h.estimada,
      real: alcanzado ? (h.real ?? h.estimada) : null,
      situacion: i < actual ? 'hecho' : i === actual ? 'actual' : 'pendiente',
      desviacion: alcanzado && h.real ? diferenciaDias(h.estimada, h.real) : null,
      vencidoDias: !alcanzado ? Math.max(0, diferenciaDias(h.estimada, hoy)) : 0,
      nota: h.nota,
      actualizadoPor: h.actualizadoPor,
    };
  });
}

// ---------------------------------------------------------------------------------------------------------
// Cambio de estado
// ---------------------------------------------------------------------------------------------------------
export interface OpcionEstado {
  estado: EstadoImportacion;
  /** Volver un paso atrás (solo el dueño y con nota). */
  correccion: boolean;
}

/** Estados a los que se puede pasar desde el actual (la recepción en bodega se registra en Inventario). */
export function estadosDisponibles(actual: EstadoImportacion, esDueno: boolean): OpcionEstado[] {
  const r: OpcionEstado[] = [];
  for (const e of ESTADOS_IMPORTACION) {
    if (validarCambioEstado(actual, e, { esDueno, nota: 'corrección' }) !== null) continue;
    r.push({ estado: e, correccion: indiceEstado(e) < indiceEstado(actual) });
  }
  return r;
}

/** Estados que la agente de aduanas y el agente de carga pueden reportar desde el portal (solo hacia adelante). */
export const ESTADOS_PORTAL: readonly EstadoImportacion[] = [
  'embarcado',
  'en_transito',
  'en_puerto',
  'en_nacionalizacion',
  'nacionalizado',
];

export function estadosParaPortal(actual: EstadoImportacion): EstadoImportacion[] {
  // Mientras el pedido sigue en fábrica (antes de pagar el saldo) no hay nada que la cadena de carga pueda reportar.
  if (indiceEstado(actual) < indiceEstado('saldo_pagado')) return [];
  return ESTADOS_PORTAL.filter((e) => indiceEstado(e) > indiceEstado(actual));
}

// ---------------------------------------------------------------------------------------------------------
// Costo aterrizado por prenda y resumen al aplicar
// ---------------------------------------------------------------------------------------------------------
export interface PasoPrenda {
  concepto: string;
  etiqueta: string;
  valor: COP;
}

/**
 * Desglose por prenda de una línea: cada componente de la cascada total se reparte con el MISMO peso con que la
 * regla (6.20.3) reparte el total (valor de fábrica o cantidad). La suma coincide con el costo unitario de la
 * línea salvo el redondeo del peso.
 */
export function cascadaPorPrenda(
  res: Pick<ResultadoCosteo, 'cascada' | 'porLinea'>,
  lineas: readonly LineaImportacion[],
  metodo: 'valor' | 'cantidad',
  lineaId: Id,
): { pasos: PasoPrenda[]; costoUnitario: COP; unidades: number } | null {
  const linea = lineas.find((l) => l.id === lineaId);
  const costo = res.porLinea.find((l) => l.lineaId === lineaId);
  if (!linea || !costo) return null;
  const unidades = unidadesLinea(linea);
  const peso = (l: LineaImportacion) => (metodo === 'valor' ? fobLinea(l) : unidadesLinea(l));
  const suma = lineas.reduce((a, l) => a + peso(l), 0);
  const parte = suma > 0 ? peso(linea) / suma : 1 / Math.max(1, lineas.length);
  const pasos = res.cascada
    .map((p) => ({
      concepto: p.concepto as string,
      etiqueta: p.etiqueta,
      valor: unidades > 0 ? redondear((p.valor * parte) / unidades) : 0,
    }))
    .filter((p) => p.valor !== 0 || p.concepto === 'fob');
  return { pasos, costoUnitario: costo.costoUnitario, unidades };
}

/** Tasa de costeo con la variación del simulador "¿Y si el dólar sube?" (−10 % … +10 %). */
export function tasaSimulada(base: number, porcentaje: number): number {
  return Math.round(base * (1 + porcentaje / 100) * 1000) / 1000;
}

export interface FilaMargen {
  unidades: number;
  margenActual: number;
  margenProyectado: number;
  categoria: string;
}

/** Margen promedio ponderado por unidades, por categoría: "Margen promedio de camisas: 62 % → 61 %". */
export function margenPromedioPorCategoria(
  filas: readonly FilaMargen[],
): { categoria: string; antes: number; despues: number; unidades: number }[] {
  const grupos = new Map<string, { u: number; a: number; d: number }>();
  for (const f of filas) {
    const g = grupos.get(f.categoria) ?? { u: 0, a: 0, d: 0 };
    g.u += f.unidades;
    g.a += f.margenActual * f.unidades;
    g.d += f.margenProyectado * f.unidades;
    grupos.set(f.categoria, g);
  }
  return [...grupos.entries()]
    .map(([categoria, g]) => ({
      categoria,
      unidades: g.u,
      antes: g.u > 0 ? g.a / g.u : 0,
      despues: g.u > 0 ? g.d / g.u : 0,
    }))
    .sort((a, b) => b.unidades - a.unidades);
}

// ---------------------------------------------------------------------------------------------------------
// Sugerir pedido: lo que el usuario edita
// ---------------------------------------------------------------------------------------------------------
export interface LineaSugerida {
  varianteId: Id;
  cantidad: number;
  /** FOB unitario del último pedido (centavos de la moneda de la fábrica). */
  costoUnitarioOrigen: Centavos;
  precioVenta: COP;
  tarifaIva: number;
  /** Último costo aterrizado por unidad (COP). */
  costoAterrizado: COP;
}

export interface TotalesPedido {
  unidades: number;
  totalOrigen: Centavos;
  totalCop: COP;
  /** (venta sin IVA − costo) / venta sin IVA con el último costo aterrizado. */
  margenEsperado: number;
}

/** Totales del pedido con las cantidades ya editadas (misma fórmula que `sugerirPedido`, 6.20.13). */
export function totalesPedido(lineas: readonly LineaSugerida[], tasa: number): TotalesPedido {
  let unidades = 0;
  let totalOrigen = 0;
  let venta = 0;
  let costo = 0;
  for (const l of lineas) {
    unidades += l.cantidad;
    totalOrigen += l.cantidad * l.costoUnitarioOrigen;
    venta += (l.cantidad * l.precioVenta) / (1 + l.tarifaIva);
    costo += l.cantidad * l.costoAterrizado;
  }
  return {
    unidades,
    totalOrigen,
    totalCop: copDeCentavos(totalOrigen, tasa),
    margenEsperado: venta > 0 ? (venta - costo) / venta : 0,
  };
}

/** Cantidad vigente de una variante: lo editado por el usuario o, si no hay edición, lo sugerido. */
export function cantidadVigente(sugerida: number, editada: number | undefined): number {
  return editada === undefined ? sugerida : Math.max(0, Math.round(editada));
}

export interface ReferenciaDelPedido {
  referencia: string;
  nombre: string;
  total: number;
  tallas: { talla: string; unidades: number }[];
  colores: { nombre: string; codigo: string; unidades: number }[];
}

/** Resume por referencia las cantidades (para el borrador y para el encabezado de cada matriz). */
export function resumenReferencia(
  celdas: readonly { talla: string; colorNombre: string; colorCodigo: string; cantidad: number }[],
  referencia: string,
  nombre: string,
): ReferenciaDelPedido {
  const tallas = new Map<string, number>();
  const colores = new Map<string, { codigo: string; unidades: number }>();
  let total = 0;
  for (const c of celdas) {
    if (c.cantidad <= 0) continue;
    total += c.cantidad;
    tallas.set(c.talla, (tallas.get(c.talla) ?? 0) + c.cantidad);
    const k = colores.get(c.colorNombre) ?? { codigo: c.colorCodigo, unidades: 0 };
    k.unidades += c.cantidad;
    colores.set(c.colorNombre, k);
  }
  return {
    referencia,
    nombre,
    total,
    tallas: [...tallas.entries()].map(([talla, unidades]) => ({ talla, unidades })),
    colores: [...colores.entries()]
      .map(([n, k]) => ({ nombre: n, codigo: k.codigo, unidades: k.unidades }))
      .sort((a, b) => b.unidades - a.unidades),
  };
}

/**
 * Borrador en inglés para la fábrica (W12): parte de la plantilla de `config/textos/mensajes.ts`, agrega el
 * detalle por referencia, talla y color, y se cierra pidiendo precio y tiempo de producción. Nada se envía.
 */
export function borradorPedidoEn(o: {
  nombreContacto: string;
  proveedor: string;
  marca: string;
  referencias: readonly ReferenciaDelPedido[];
}): string {
  const plantilla = rellenarPlantilla(PLANTILLAS_FABRICA_EN.cotizado ?? '', {
    nombre: o.nombreContacto,
    proveedor: o.proveedor,
    marca: o.marca,
  });
  const [encabezado = plantilla] = plantilla.split(' Sizes and colours attached.');
  const total = o.referencias.reduce((a, r) => a + r.total, 0);
  const lineas = o.referencias
    .filter((r) => r.total > 0)
    .map((r, i) => {
      const tallas = r.tallas.map((t) => `${t.talla} ${t.unidades}`).join(' · ');
      const colores = r.colores
        .slice(0, 6)
        .map((c) => `${c.nombre} (${c.codigo}) ${c.unidades}`)
        .join(' · ');
      return `${i + 1}. ${r.referencia} · ${r.nombre}: ${r.total} units\n   Sizes: ${tallas}\n   Colours: ${colores}`;
    });
  return [
    `${encabezado.trim()}`,
    '',
    ...lineas,
    '',
    `Total: ${total} units.`,
    '',
    CIERRE_BORRADOR_EN,
    o.marca,
  ].join('\n');
}

// ---------------------------------------------------------------------------------------------------------
// Avisos de cambio de estado ("Notificar a")
// ---------------------------------------------------------------------------------------------------------
export type CanalAviso = 'whatsapp' | 'correo' | 'wechat';

export interface EleccionAviso {
  incluir: boolean;
  canal: CanalAviso;
  texto: string;
}

/** Canales con los que se puede avisar a un destinatario según los datos que tiene. */
export function canalesDisponibles(
  d: Pick<DestinatarioAvisoVista, 'telefono' | 'correo' | 'wechat' | 'tipo'>,
): CanalAviso[] {
  const r: CanalAviso[] = [];
  if (d.telefono) r.push('whatsapp');
  if (d.correo) r.push('correo');
  if (d.wechat || d.tipo === 'fabrica') r.push('wechat');
  return r;
}

export function eleccionInicial(d: DestinatarioAvisoVista): EleccionAviso | null {
  if (d.tipo === 'dueno' || d.texto === null) return null;
  const disponibles = canalesDisponibles(d);
  const canal = disponibles.includes(d.canal as CanalAviso)
    ? (d.canal as CanalAviso)
    : (disponibles[0] ?? 'whatsapp');
  return { incluir: d.preseleccionado, canal, texto: d.texto };
}

type MensajeNuevo = EntradaAccion<'mensaje.registrar'>['mensajes'][number];

/** Mensajes para `registrarMensajes` a partir de lo que el dueño dejó marcado en el panel. */
export function mensajesDeAvisos(
  importacionId: Id,
  destinatarios: readonly DestinatarioAvisoVista[],
  elecciones: Readonly<Record<string, EleccionAviso | null | undefined>>,
): MensajeNuevo[] {
  const r: MensajeNuevo[] = [];
  for (const d of destinatarios) {
    const e = elecciones[d.tipo];
    if (!e || !e.incluir || e.texto.trim() === '') continue;
    r.push({
      canal: e.canal,
      destinatario: {
        tipo: d.tipo === 'bodega' ? 'empleado' : 'contacto',
        refId: d.contactoId ?? d.empleadoId,
        nombre: d.nombre,
        telefono: d.telefono,
        correo: d.correo,
      },
      idioma: d.idioma,
      tratamiento: d.tratamiento,
      asunto: d.asunto,
      cuerpo: e.texto.trim(),
      origen: { tipo: 'importacion', id: importacionId },
    });
  }
  return r;
}

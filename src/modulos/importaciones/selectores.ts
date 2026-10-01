import type {
  Categoria,
  Centavos,
  COP,
  Contacto,
  CostosImportacion,
  EstadoImportacion,
  FechaISO,
  FechaHoraISO,
  Id,
  Importacion,
  MensajeSaliente,
  MonedaExtranjera,
  Notificacion,
  TipoPrenda,
} from '@/dominio/tipos';
import { estadoCxP, saldoCxP, saldoCxPCop, type EstadoCxP } from '@/dominio/reglas/cuentas';
import { fobImportacion, unidadesLinea } from '@/dominio/reglas/costeo';
import { copDeCentavos } from '@/dominio/reglas/dinero';
import {
  crearSelector,
  selCostoAterrizado,
  selEnCaminoPorVariante,
  selSugerenciaPedido,
  selTasaVigente,
  type CostoAterrizadoVista,
  type SugerenciaPedido,
} from '@/selectores';

/**
 * Selectores LOCALES de Importaciones (B1): componen los compartidos y leen tablas que ningún selector expone
 * (mensajes, notificaciones, pagos de la cadena, catálogo para armar un pedido). Declaran todas las tablas que
 * leen (la prueba `activarVerificacionDeTablas` lo exige).
 */

// ---------------------------------------------------------------------------------------------------------
// Bandeja de salida
// ---------------------------------------------------------------------------------------------------------
export const selMensajesImportacion = crearSelector<{ importacionId: Id }, MensajeSaliente[]>(
  'selMensajesImportacion',
  ['mensajes'],
  (e, { importacionId }) =>
    e.mensajes
      .filter(
        (m) =>
          m.origen.id === importacionId &&
          (m.origen.tipo === 'importacion' || m.origen.tipo === 'pedido_sugerido'),
      )
      .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0)),
);

/**
 * Avisos que quedaron listos porque la agente reportó desde el portal (W3): la última notificación del portal de
 * esta importación, mientras no se haya enviado ningún aviso después de ella.
 */
export const selAvisosPendientes = crearSelector<
  { importacionId: Id },
  { notificacion: Notificacion; estado: EstadoImportacion } | null
>('selAvisosPendientes', ['notificaciones', 'mensajes', 'importaciones'], (e, { importacionId }) => {
  const imp = e.importaciones[importacionId];
  if (!imp) return null;
  const ultima = Object.values(e.notificaciones)
    .filter((n) => n.tipo === 'portal_actualizacion' && n.origen?.id === importacionId)
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))[0];
  if (!ultima) return null;
  const yaAvisado = e.mensajes.some(
    (m) => m.origen.tipo === 'importacion' && m.origen.id === importacionId && m.ts >= ultima.ts,
  );
  return yaAvisado ? null : { notificacion: ultima, estado: imp.estado };
});

// ---------------------------------------------------------------------------------------------------------
// Pagos a la fábrica y a la cadena
// ---------------------------------------------------------------------------------------------------------
export interface AbonoVista {
  id: Id;
  ts: FechaHoraISO;
  valorCOP: COP;
  montoOrigen: { centavos: Centavos; tasa: number } | null;
  diferenciaCambio: COP | null;
  cuentaNombre: string;
  medio: string;
}

export interface CuentaPagoVista {
  id: Id;
  numero: string;
  concepto: string;
  categoria: string;
  moneda: 'COP' | MonedaExtranjera;
  /** En la moneda de la cuenta (COP: pesos; USD/CNY: centavos). */
  valor: number;
  saldo: number;
  saldoCop: COP;
  vence: FechaISO;
  estado: EstadoCxP;
  esFabrica: boolean;
  abonos: AbonoVista[];
}

export interface PagosImportacion {
  moneda: MonedaExtranjera;
  cuentas: CuentaPagoVista[];
  fobOrigen: Centavos;
  /** Pagado a la fábrica (centavos de la moneda del pedido). */
  pagadoOrigen: Centavos;
  saldoOrigen: Centavos;
  pagadoCop: COP;
  diferenciaCambioCop: COP;
  tasaPedido: number;
  tasaVigente: number;
}

export const selPagosImportacion = crearSelector<
  { importacionId: Id; hoy: FechaISO },
  PagosImportacion | null
>(
  'selPagosImportacion',
  ['importaciones', 'cuentasPorPagar', 'cuentas', 'tasas'],
  (e, { importacionId, hoy }) => {
    const imp = e.importaciones[importacionId];
    if (!imp) return null;
    const tasaVigente = selTasaVigente(e, { moneda: imp.moneda, fecha: hoy });
    let pagadoOrigen = 0;
    let totalFabrica = 0;
    let pagadoCop = 0;
    let dif = 0;
    const cuentas: CuentaPagoVista[] = [];
    for (const id of imp.cuentaPorPagarIds) {
      const c = e.cuentasPorPagar[id];
      if (!c || c.eliminadoEn) continue;
      const esFabrica = c.categoria === 'proveedor_importacion';
      const saldo = saldoCxP(c);
      const tasa = c.moneda === 'COP' ? null : selTasaVigente(e, { moneda: c.moneda, fecha: hoy });
      if (esFabrica) {
        totalFabrica += c.valor;
        pagadoOrigen += c.valor - saldo;
        for (const a of c.abonos) {
          pagadoCop += a.valorCOP;
          dif += a.diferenciaCambio ?? 0;
        }
      }
      cuentas.push({
        id: c.id,
        numero: c.numero,
        concepto: c.concepto,
        categoria: c.categoria,
        moneda: c.moneda as CuentaPagoVista['moneda'],
        valor: c.valor,
        saldo,
        saldoCop: saldoCxPCop(c, tasa),
        vence: c.fechaVencimiento,
        estado: estadoCxP(c, hoy),
        esFabrica,
        abonos: c.abonos.map((a) => ({
          id: a.id,
          ts: a.ts,
          valorCOP: a.valorCOP,
          montoOrigen: a.montoOrigen ? { centavos: a.montoOrigen.centavos, tasa: a.montoOrigen.tasa } : null,
          diferenciaCambio: a.diferenciaCambio,
          cuentaNombre: e.cuentas[a.cuentaId]?.nombre ?? 'Cuenta',
          medio: a.medio,
        })),
      });
    }
    const fob = fobImportacion(imp.lineas);
    return {
      moneda: imp.moneda,
      cuentas: cuentas.sort((a, b) => (a.vence < b.vence ? -1 : 1)),
      fobOrigen: fob,
      pagadoOrigen,
      saldoOrigen: Math.max(0, (totalFabrica || fob) - pagadoOrigen),
      pagadoCop,
      diferenciaCambioCop: dif,
      tasaPedido: imp.tasaPedido,
      tasaVigente,
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Contactos de la cadena
// ---------------------------------------------------------------------------------------------------------
export interface FilaContacto {
  contacto: Contacto;
  proveedorNombre: string | null;
  /** Importaciones (vigentes) donde aparece como parte de la cadena. */
  importaciones: { id: Id; numero: string; estado: EstadoImportacion }[];
}

export const selContactosCadena = crearSelector<void, FilaContacto[]>(
  'selContactosCadena',
  ['contactos', 'importaciones', 'proveedores'],
  (e) => {
    const por = new Map<Id, FilaContacto['importaciones']>();
    for (const i of Object.values(e.importaciones)) {
      if (i.eliminadoEn) continue;
      for (const c of i.contactoIds)
        por.set(c, [...(por.get(c) ?? []), { id: i.id, numero: i.numero, estado: i.estado }]);
    }
    const orden = { proveedor: 0, agente_carga: 1, agente_aduanas: 2, transportador: 3, otro: 4 } as const;
    return Object.values(e.contactos)
      .filter((c) => !c.eliminadoEn)
      .map((c) => ({
        contacto: c,
        proveedorNombre: c.proveedorId ? (e.proveedores[c.proveedorId]?.nombreCorto ?? null) : null,
        importaciones: (por.get(c.id) ?? []).sort((a, b) => (a.numero < b.numero ? 1 : -1)),
      }))
      .sort(
        (a, b) =>
          orden[a.contacto.rol] - orden[b.contacto.rol] || (a.contacto.nombre < b.contacto.nombre ? -1 : 1),
      );
  },
);

// ---------------------------------------------------------------------------------------------------------
// Catálogo y valores por defecto para armar un pedido
// ---------------------------------------------------------------------------------------------------------
export interface ColorPedido {
  id: Id;
  nombre: string;
  codigo: string;
  hex: string;
  patron: 'liso' | 'rayas' | 'cuadros';
}

export interface ProductoPedido {
  productoId: Id;
  referencia: string;
  nombre: string;
  categoria: Categoria;
  tipoPrenda: TipoPrenda;
  tallas: string[];
  colores: ColorPedido[];
  /** `${talla}|${colorId}` → varianteId. */
  variantes: Record<string, Id>;
  /** FOB del último pedido de esta referencia (centavos de la moneda de la fábrica), o null. */
  fobUltimo: Centavos | null;
}

export const selCatalogoPedido = crearSelector<{ proveedorId: Id | null }, ProductoPedido[]>(
  'selCatalogoPedido',
  ['productos', 'variantes', 'colores', 'importaciones'],
  (e, { proveedorId }) => {
    const ultimoFob = new Map<Id, Centavos>();
    const pedidos = Object.values(e.importaciones)
      .filter((i) => !i.eliminadoEn && (!proveedorId || i.proveedorId === proveedorId))
      .sort((a, b) => (a.fechaPedido < b.fechaPedido ? -1 : 1));
    for (const i of pedidos) for (const l of i.lineas) ultimoFob.set(l.productoId, l.costoUnitarioOrigen);
    const porProducto = new Map<Id, ProductoPedido>();
    for (const p of Object.values(e.productos)) {
      if (p.eliminadoEn || (proveedorId && p.proveedorId !== proveedorId)) continue;
      porProducto.set(p.id, {
        productoId: p.id,
        referencia: p.referencia,
        nombre: p.nombre,
        categoria: p.categoria,
        tipoPrenda: p.tipoPrenda,
        tallas: [],
        colores: [],
        variantes: {},
        fobUltimo: ultimoFob.get(p.id) ?? null,
      });
    }
    for (const v of Object.values(e.variantes)) {
      if (v.eliminadoEn) continue;
      const p = porProducto.get(v.productoId);
      if (!p) continue;
      if (!p.tallas.includes(v.talla)) p.tallas.push(v.talla);
      if (!p.colores.some((c) => c.id === v.colorId)) {
        const c = e.colores[v.colorId];
        p.colores.push({
          id: v.colorId,
          nombre: c?.nombre ?? v.colorId,
          codigo: c?.codigo ?? '',
          hex: c?.hex ?? '#999999',
          patron: c?.patron ?? 'liso',
        });
      }
      p.variantes[`${v.talla}|${v.colorId}`] = v.id;
    }
    return [...porProducto.values()]
      .filter((p) => p.tallas.length > 0)
      .sort((a, b) => (a.referencia < b.referencia ? -1 : 1));
  },
);

export interface DefectosPedido {
  moneda: MonedaExtranjera;
  contactoIds: Id[];
  puertoOrigen: string;
  puertoDestino: Importacion['puertoDestino'];
  costos: CostosImportacion;
  metodoProrrateo: 'valor' | 'cantidad';
  /** m³ por prenda del último pedido (para estimar la carga de uno nuevo). */
  m3PorPrenda: number | null;
  ultimoNumero: string | null;
}

/** Valores de partida para un pedido nuevo a una fábrica: los del último pedido, o los parámetros de aduanas. */
export const selDefectosPedido = crearSelector<{ proveedorId: Id }, DefectosPedido>(
  'selDefectosPedido',
  ['importaciones', 'proveedores', 'contactos', 'parametros'],
  (e, { proveedorId }) => {
    const prov = e.proveedores[proveedorId];
    const ultimo = Object.values(e.importaciones)
      .filter((i) => !i.eliminadoEn && i.proveedorId === proveedorId)
      .sort((a, b) => (a.fechaPedido < b.fechaPedido ? 1 : -1))[0];
    const moneda: MonedaExtranjera = prov?.moneda === 'CNY' ? 'CNY' : 'USD';
    if (ultimo) {
      const unidades = ultimo.lineas.reduce((a, l) => a + unidadesLinea(l), 0);
      return {
        moneda: ultimo.moneda,
        contactoIds: [...ultimo.contactoIds],
        puertoOrigen: ultimo.puertoOrigen,
        puertoDestino: ultimo.puertoDestino,
        costos: { ...ultimo.costos, flete: { ...ultimo.costos.flete }, seguro: { ...ultimo.costos.seguro } },
        metodoProrrateo: ultimo.metodoProrrateo,
        m3PorPrenda: ultimo.carga.tipo === 'consolidada' && unidades > 0 ? ultimo.carga.m3 / unidades : null,
        ultimoNumero: ultimo.numero,
      };
    }
    const a = e.parametros.aduanas;
    const cadena = Object.values(e.contactos)
      .filter(
        (c) =>
          !c.eliminadoEn &&
          (c.proveedorId === proveedorId ||
            c.rol === 'agente_carga' ||
            c.rol === 'agente_aduanas' ||
            c.rol === 'transportador'),
      )
      .map((c) => c.id);
    return {
      moneda,
      contactoIds: cadena,
      puertoOrigen: prov?.ciudad ?? 'Shenzhen (Yantian)',
      puertoDestino: 'Buenaventura',
      costos: {
        flete: { moneda: 'USD', valor: 0 },
        seguro: { moneda: 'USD', valor: 0 },
        honorariosAgente: 0,
        bodegajePuerto: 0,
        transporteInterno: 0,
        otros: 0,
        otrosTributosAduaneros: 0,
        arancelPct: a.arancelPct,
        ivaImportacionPct: a.ivaImportacionPct,
        ivaSumaAlCosto: a.ivaImportacionSumaAlCosto,
      },
      metodoProrrateo: 'valor',
      m3PorPrenda: null,
      ultimoNumero: null,
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Costo aterrizado con categoría y variantes por referencia (W4)
// ---------------------------------------------------------------------------------------------------------
export interface ProductoCostoVista {
  productoId: Id;
  referencia: string;
  nombre: string;
  categoria: Categoria;
  tipoPrenda: TipoPrenda;
  /** Líneas del pedido de esta referencia (para elegir el desglose por prenda). */
  lineaId: Id | null;
  unidades: number;
  costoUnitario: COP;
  precioVenta: COP;
  margenProyectado: number;
  margenActual: number;
  precioSugerido: COP;
  /** Variantes de la referencia que se actualizan al aplicar. */
  variantes: number;
  /** Costo vigente hoy en el catálogo. */
  costoVigente: COP;
}

export interface VistaCosto {
  imp: Importacion;
  /** Con la tasa simulada (o la de costeo si no hay simulación). */
  costo: CostoAterrizadoVista;
  /** La tasa de costeo real, sin simulación. */
  tasaBase: number;
  productos: ProductoCostoVista[];
  variantesAfectadas: number;
}

export const selVistaCosto = crearSelector<
  { importacionId: Id; hoy: FechaISO; tasaSimulada: number | null },
  VistaCosto | null
>(
  'selVistaCosto',
  ['importaciones', 'cuentasPorPagar', 'tasas', 'productos', 'variantes'],
  (e, { importacionId, hoy, tasaSimulada }) => {
    const imp = e.importaciones[importacionId];
    if (!imp) return null;
    const base = selCostoAterrizado(e, { importacionId, hoy });
    const costo = tasaSimulada ? selCostoAterrizado(e, { importacionId, hoy, tasaSimulada }) : base;
    if (!base || !costo) return null;
    const variantes = new Map<Id, number>();
    for (const v of Object.values(e.variantes))
      if (!v.eliminadoEn) variantes.set(v.productoId, (variantes.get(v.productoId) ?? 0) + 1);
    const productos = costo.porProductoDetalle.map((d) => {
      const p = e.productos[d.productoId];
      return {
        productoId: d.productoId,
        referencia: d.referencia,
        nombre: d.nombre,
        categoria: (p?.categoria ?? 'camisas') as Categoria,
        tipoPrenda: (p?.tipoPrenda ?? 'camisa') as TipoPrenda,
        lineaId: imp.lineas.find((l) => l.productoId === d.productoId)?.id ?? null,
        unidades: d.unidades,
        costoUnitario: d.costoUnitario,
        precioVenta: d.precioVenta,
        margenProyectado: d.margenProyectado,
        margenActual: d.margenActual,
        precioSugerido: d.precioSugerido,
        variantes: variantes.get(d.productoId) ?? 0,
        costoVigente: p?.costoVigente ?? 0,
      };
    });
    return {
      imp,
      costo,
      tasaBase: base.tasaCosteo,
      productos,
      variantesAfectadas: productos.reduce((a, p) => a + p.variantes, 0),
    };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Sugerir pedido (W12)
// ---------------------------------------------------------------------------------------------------------
export interface CeldaSugerida {
  varianteId: Id;
  talla: string;
  colorId: Id;
  sugerida: number;
  rotacionSemanal: number;
  existencias: number;
  enCamino: number;
}

export interface ProductoSugerido {
  productoId: Id;
  referencia: string;
  nombre: string;
  categoria: Categoria;
  tipoPrenda: TipoPrenda;
  precioVenta: COP;
  tarifaIva: number;
  costoVigente: COP;
  costoUnitarioOrigen: Centavos;
  tallas: string[];
  colores: ColorPedido[];
  /** `${talla}|${colorId}` → celda. */
  celdas: Record<string, CeldaSugerida>;
  sugeridas: number;
  rotacionSemanal: number;
  existencias: number;
  enCamino: number;
  /** "ya vienen 48 en IMP-2026-07". */
  enCaminoPorPedido: { numero: string; unidades: number }[];
}

export interface SugerenciaCompleta {
  base: SugerenciaPedido;
  proveedor: {
    id: Id;
    nombre: string;
    nombreCorto: string;
    moneda: MonedaExtranjera;
    condicionesPago: string;
  };
  productos: ProductoSugerido[];
}

export const selSugerenciaCompleta = crearSelector<
  { proveedorId: Id; coberturaDias: number; hoy: FechaISO },
  SugerenciaCompleta | null
>(
  'selSugerenciaCompleta',
  [
    'proveedores',
    'productos',
    'variantes',
    'ventas',
    'devoluciones',
    'agregados',
    'importaciones',
    'tasas',
    'parametros',
    'meta',
    'locales',
    'colores',
  ],
  (e, params) => {
    const base = selSugerenciaPedido(e, params);
    if (!base) return null;
    const prov = e.proveedores[params.proveedorId];
    if (!prov) return null;
    const caminos = selEnCaminoPorVariante(e);
    const por = new Map<Id, ProductoSugerido>();
    for (const f of base.variantes) {
      const p = e.productos[f.productoId];
      if (!p) continue;
      let ps = por.get(p.id);
      if (!ps) {
        ps = {
          productoId: p.id,
          referencia: p.referencia,
          nombre: p.nombre,
          categoria: p.categoria,
          tipoPrenda: p.tipoPrenda,
          precioVenta: p.precioVenta,
          tarifaIva: p.tarifaIva,
          costoVigente: p.costoVigente,
          costoUnitarioOrigen: f.costoUnitarioOrigen,
          tallas: [],
          colores: [],
          celdas: {},
          sugeridas: 0,
          rotacionSemanal: 0,
          existencias: 0,
          enCamino: 0,
          enCaminoPorPedido: [],
        };
        por.set(p.id, ps);
      }
      if (!ps.tallas.includes(f.talla)) ps.tallas.push(f.talla);
      if (!ps.colores.some((c) => c.id === f.colorId)) {
        const c = e.colores[f.colorId];
        ps.colores.push({
          id: f.colorId,
          nombre: c?.nombre ?? f.colorId,
          codigo: c?.codigo ?? '',
          hex: c?.hex ?? '#999999',
          patron: c?.patron ?? 'liso',
        });
      }
      ps.celdas[`${f.talla}|${f.colorId}`] = {
        varianteId: f.varianteId,
        talla: f.talla,
        colorId: f.colorId,
        sugerida: f.sugerida,
        rotacionSemanal: f.rotacionSemanal,
        existencias: f.existencias,
        enCamino: f.enCamino,
      };
      ps.sugeridas += f.sugerida;
      ps.rotacionSemanal += f.rotacionSemanal;
      ps.existencias += f.existencias;
      ps.enCamino += f.enCamino;
      const c = caminos[f.varianteId];
      if (c && f.enCamino > 0) {
        const x = ps.enCaminoPorPedido.find((k) => k.numero === c.numero);
        if (x) x.unidades += f.enCamino;
        else ps.enCaminoPorPedido.push({ numero: c.numero, unidades: f.enCamino });
      }
    }
    const productos = [...por.values()].sort(
      (a, b) => b.sugeridas - a.sugeridas || (a.referencia < b.referencia ? -1 : 1),
    );
    return {
      base,
      proveedor: {
        id: prov.id,
        nombre: prov.nombre,
        nombreCorto: prov.nombreCorto,
        moneda: base.moneda,
        condicionesPago: prov.condicionesPago,
      },
      productos,
    };
  },
);

/** Valor de una importación en COP a la tasa vigente (para la lista y los totales). */
export function fobEnCop(imp: Importacion, tasa: number): COP {
  return copDeCentavos(fobImportacion(imp.lineas), tasa);
}

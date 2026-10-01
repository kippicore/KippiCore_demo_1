import type {
  Adquirente,
  Cliente,
  COP,
  Devolucion,
  Empresa,
  Factura,
  FechaHoraISO,
  Id,
  MedioPago,
  NotaCredito,
  ResolucionFacturacion,
  Venta,
} from '@/dominio/tipos';
import { crearSelector, nombreCliente, nombreEmpleado } from '@/selectores';
import {
  adquirenteDeCliente,
  saldoAcreditable,
  usoDeResolucion,
  type FilaDocumento,
  type UsoResolucion,
} from './calculos';

/**
 * Selectores locales de Facturación (D3): componen las tablas de documentos y de ventas. Declaran TODAS las
 * tablas que leen (la verificación de pruebas falla si no).
 */

/** Todos los documentos (facturas, documentos POS y notas crédito), el más reciente primero. */
export const selDocumentos = crearSelector<void, FilaDocumento[]>(
  'selDocumentosElectronicos',
  ['facturas', 'notasCredito', 'ventas'],
  (e) => {
    const acreditadoPor = new Map<Id, COP>();
    for (const n of Object.values(e.notasCredito))
      acreditadoPor.set(n.facturaId, (acreditadoPor.get(n.facturaId) ?? 0) + n.valor);
    const filas: FilaDocumento[] = [];
    for (const f of Object.values(e.facturas)) {
      const v = e.ventas[f.ventaId];
      filas.push({
        id: f.id,
        clase: f.tipo === 'factura_electronica' ? 'factura' : 'pos',
        numero: f.numero,
        ts: f.ts,
        ventaId: f.ventaId,
        ventaNumero: v?.numero ?? '',
        localId: v?.localId ?? '',
        adquirente: f.adquirente.nombre,
        documento: f.adquirente.documento,
        base: f.base,
        iva: f.iva,
        total: f.total,
        estado: f.estado,
        afecta: null,
        acreditado: acreditadoPor.get(f.id) ?? 0,
      });
    }
    for (const n of Object.values(e.notasCredito)) {
      const f = e.facturas[n.facturaId];
      const v = f ? e.ventas[f.ventaId] : undefined;
      filas.push({
        id: n.id,
        clase: 'nota',
        numero: n.numero,
        ts: n.ts,
        ventaId: f?.ventaId ?? '',
        ventaNumero: v?.numero ?? '',
        localId: v?.localId ?? '',
        adquirente: f?.adquirente.nombre ?? '',
        documento: f?.adquirente.documento ?? null,
        base: n.base,
        iva: n.iva,
        total: n.valor,
        estado: n.estado,
        afecta: f ? { id: f.id, numero: f.numero } : null,
        acreditado: 0,
      });
    }
    return filas.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : a.numero < b.numero ? 1 : -1));
  },
);

/** Una línea del documento (instantánea de la línea de venta). */
export interface LineaDocumento {
  id: Id;
  descripcion: string;
  cantidad: number;
  precioLista: COP;
  descuento: COP;
  base: COP;
  iva: COP;
  total: COP;
}

export interface DevolucionPorAcreditar {
  id: Id;
  numero: string;
  ts: FechaHoraISO;
  motivo: string;
  valor: COP;
}

export interface VistaFactura {
  factura: Factura;
  venta: Venta | null;
  resolucion: ResolucionFacturacion | null;
  empresa: Empresa;
  ivaGeneral: number;
  localNombre: string;
  vendedorNombre: string;
  cliente: Cliente | null;
  medios: MedioPago[];
  lineas: LineaDocumento[];
  notas: NotaCredito[];
  acreditado: COP;
  saldo: COP;
  devolucionesPorAcreditar: DevolucionPorAcreditar[];
}

export const selVistaFactura = crearSelector<{ facturaId: Id }, VistaFactura | null>(
  'selVistaFactura',
  ['facturas', 'ventas', 'resoluciones', 'empresa', 'parametros', 'locales', 'empleados', 'clientes', 'notasCredito', 'devoluciones'],
  (e, { facturaId }) => {
    const factura = e.facturas[facturaId];
    if (!factura) return null;
    const venta = e.ventas[factura.ventaId] ?? null;
    const notas = Object.values(e.notasCredito)
      .filter((n) => n.facturaId === factura.id)
      .sort((a, b) => (a.ts < b.ts ? -1 : 1));
    const acreditado = notas.reduce((s, n) => s + n.valor, 0);
    const devolucionesPorAcreditar: DevolucionPorAcreditar[] = venta
      ? Object.values(e.devoluciones)
          .filter((d: Devolucion) => d.ventaId === venta.id && d.notaCreditoId === null)
          .map((d) => ({ id: d.id, numero: d.numero, ts: d.ts, motivo: d.motivo, valor: d.valorTotal }))
      : [];
    const medios: MedioPago[] = [];
    for (const p of venta?.pagos ?? []) if (p.tipo !== 'reembolso' && !medios.includes(p.medio)) medios.push(p.medio);
    return {
      factura,
      venta,
      resolucion: e.resoluciones[factura.resolucionId] ?? null,
      empresa: e.empresa,
      ivaGeneral: e.parametros.impuestos.ivaGeneral,
      localNombre: venta ? (e.locales[venta.localId]?.nombre ?? '') : '',
      vendedorNombre: venta ? nombreEmpleado(e.empleados[venta.vendedorId]) : '',
      cliente: factura.adquirente.clienteId ? (e.clientes[factura.adquirente.clienteId] ?? null) : null,
      medios,
      lineas: (venta?.lineas ?? []).map((l) => ({
        id: l.id,
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        precioLista: l.precioLista,
        descuento: l.descuentoAsignado,
        base: l.base,
        iva: l.iva,
        total: l.totalFinal,
      })),
      notas,
      acreditado,
      saldo: saldoAcreditable(factura.total, notas),
      devolucionesPorAcreditar,
    };
  },
);

export interface VistaNota {
  nota: NotaCredito;
  factura: Factura | null;
  venta: Venta | null;
  devolucion: Devolucion | null;
  empresa: Empresa;
  ivaGeneral: number;
  localNombre: string;
  /** Prendas devueltas (si nace de una devolución); vacío si es un ajuste por saldo. */
  lineas: LineaDocumento[];
}

export const selVistaNota = crearSelector<{ notaId: Id }, VistaNota | null>(
  'selVistaNota',
  ['notasCredito', 'facturas', 'ventas', 'devoluciones', 'empresa', 'parametros', 'locales'],
  (e, { notaId }) => {
    const nota = e.notasCredito[notaId];
    if (!nota) return null;
    const factura = e.facturas[nota.facturaId] ?? null;
    const venta = factura ? (e.ventas[factura.ventaId] ?? null) : null;
    const devolucion = nota.devolucionId ? (e.devoluciones[nota.devolucionId] ?? null) : null;
    const lineas: LineaDocumento[] = (devolucion?.lineas ?? []).map((l) => {
      const original = venta?.lineas.find((x) => x.id === l.lineaId);
      return {
        id: l.lineaId,
        descripcion: original?.descripcion ?? 'Prenda devuelta',
        cantidad: l.cantidad,
        precioLista: original?.precioLista ?? 0,
        descuento: Math.max(0, (original?.precioLista ?? 0) * l.cantidad - l.valor),
        base: l.base,
        iva: l.iva,
        total: l.valor,
      };
    });
    return {
      nota,
      factura,
      venta,
      devolucion,
      empresa: e.empresa,
      ivaGeneral: e.parametros.impuestos.ivaGeneral,
      localNombre: venta ? (e.locales[venta.localId]?.nombre ?? '') : '',
      lineas,
    };
  },
);

/** Las dos resoluciones con su uso y su siguiente consecutivo. */
export const selResoluciones = crearSelector<{ hoy: string }, UsoResolucion[]>(
  'selResolucionesFacturacion',
  ['resoluciones', 'facturas'],
  (e, { hoy }) => {
    const numeros = new Map<Id, string[]>();
    for (const f of Object.values(e.facturas)) {
      const l = numeros.get(f.resolucionId);
      if (l) l.push(f.numero);
      else numeros.set(f.resolucionId, [f.numero]);
    }
    return Object.values(e.resoluciones)
      .sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'factura_electronica' ? -1 : 1))
      .map((r) => usoDeResolucion(r, numeros.get(r.id) ?? [], hoy));
  },
);

export interface VentaSinDocumento {
  id: Id;
  numero: string;
  ts: FechaHoraISO;
  localId: Id;
  total: COP;
  iva: COP;
  unidades: number;
  /** El cliente de la venta como adquirente identificado (null = consumidor final). */
  adquirente: Adquirente | null;
  clienteNombre: string;
}

const sinTildes = (t: string) =>
  t
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

/** Ventas que aún no tienen documento electrónico (recientes primero), con búsqueda por número o cliente. */
export const selVentasSinDocumento = crearSelector<
  { texto?: string; vendedorId?: Id | null; limite?: number },
  { filas: VentaSinDocumento[]; total: number }
>('selVentasSinDocumento', ['ventas', 'clientes'], (e, { texto = '', vendedorId = null, limite = 8 }) => {
  const q = sinTildes(texto.trim());
  const candidatas: Venta[] = [];
  for (const v of Object.values(e.ventas)) {
    if (v.facturaId || v.anulacion) continue;
    if (v.separado && (!v.separado.cerrado || v.separado.cerrado.resultado === 'cancelado')) continue;
    if (vendedorId && v.vendedorId !== vendedorId) continue;
    if (q) {
      const c = v.clienteId ? e.clientes[v.clienteId] : undefined;
      const pajar = sinTildes(`${v.numero} ${c ? nombreCliente(c) : 'consumidor final'}`);
      if (!pajar.includes(q)) continue;
    }
    candidatas.push(v);
  }
  candidatas.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
  const filas = candidatas.slice(0, limite).map((v) => {
    const c = v.clienteId ? e.clientes[v.clienteId] : undefined;
    return {
      id: v.id,
      numero: v.numero,
      ts: v.ts,
      localId: v.localId,
      total: v.total,
      iva: v.iva,
      unidades: v.lineas.reduce((s, l) => s + l.cantidad, 0),
      adquirente: c ? adquirenteDeCliente(c) : null,
      clienteNombre: c ? nombreCliente(c) : 'Consumidor final',
    };
  });
  return { filas, total: candidatas.length };
});

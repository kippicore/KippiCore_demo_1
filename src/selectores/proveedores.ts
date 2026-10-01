import type { COP, FechaISO, Id, Importacion, Proveedor } from '@/dominio/tipos';
import { hitosIniciales } from '@/dominio/reglas/importaciones';
import { diferenciaDias } from '@/dominio/reglas/fechas';
import { saldoCxPCop } from '@/dominio/reglas/cuentas';
import { copDeCentavos } from '@/dominio/reglas/dinero';
import { fobImportacion, unidadesLinea } from '@/dominio/reglas/costeo';
import { normalizar } from '@/dominio/reglas/texto';
import { crearSelector } from './memo';
import { selTasaVigente } from './base';

/** Proveedores (PLAN 6.23 `proveedores.ts`, P14). */

export interface FilaProveedor {
  proveedor: Proveedor;
  /** Saldo pendiente en COP (tasa vigente para USD/CNY). */
  saldoCop: COP;
  pedidos: number;
}

export const selProveedores = crearSelector<
  { hoy: FechaISO; tipo?: Proveedor['tipo']; localId?: Id | 'todos'; texto?: string },
  FilaProveedor[]
>('selProveedores', ['proveedores', 'cuentasPorPagar', 'importaciones', 'tasas'], (e, f) => {
  const t = f.texto ? normalizar(f.texto) : '';
  const saldo = new Map<Id, number>();
  for (const c of Object.values(e.cuentasPorPagar)) {
    if (!c.proveedorId || c.eliminadoEn) continue;
    const tasa = c.moneda === 'COP' ? null : selTasaVigente(e, { moneda: c.moneda, fecha: f.hoy });
    saldo.set(c.proveedorId, (saldo.get(c.proveedorId) ?? 0) + saldoCxPCop(c, tasa));
  }
  const pedidos = new Map<Id, number>();
  for (const i of Object.values(e.importaciones)) if (!i.eliminadoEn) pedidos.set(i.proveedorId, (pedidos.get(i.proveedorId) ?? 0) + 1);
  return Object.values(e.proveedores)
    .filter((p) => !p.eliminadoEn && (!f.tipo || p.tipo === f.tipo) && (!f.localId || f.localId === 'todos' || p.localId === f.localId))
    .filter((p) => !t || normalizar(`${p.nombre} ${p.nombreCorto} ${p.ciudad} ${p.pais}`).includes(t))
    .map((p) => ({ proveedor: p, saldoCop: saldo.get(p.id) ?? 0, pedidos: pedidos.get(p.id) ?? 0 }))
    .sort((a, b) => (a.proveedor.tipo === b.proveedor.tipo ? (a.proveedor.nombreCorto < b.proveedor.nombreCorto ? -1 : 1) : a.proveedor.tipo === 'fabrica' ? -1 : 1));
});

export interface FichaProveedor {
  proveedor: Proveedor;
  importaciones: Importacion[];
  /** Total comprado: FOB de las importaciones (COP a la tasa vigente) o gastos del proveedor local. */
  totalComprado: COP;
  saldoCop: COP;
  /** Días promedio del pedido a la recepción. */
  entregaPromedio: number | null;
  /** % de pedidos recibidos a más tardar en la fecha estimada original. */
  cumplimiento: number | null;
  retrasoPromedio: number | null;
  defectos: number | null;
  /** Detalle por pedido recibido (P14), del más antiguo al más reciente: de aquí salen los promedios de arriba. */
  entregas: EntregaProveedor[];
}

/** Un pedido ya recibido de una fábrica, con la definición de P14 (retraso contra la estimada ORIGINAL). */
export interface EntregaProveedor {
  importacionId: Id;
  numero: string;
  fechaPedido: FechaISO;
  /** Llegada a bodega estimada al hacer el pedido (sin reprogramaciones). */
  estimadaOriginal: FechaISO;
  recibida: FechaISO;
  /** Días de retraso (negativo: llegó antes). */
  retraso: number;
  aTiempo: boolean;
  /** Días del pedido a la recepción. */
  diasEntrega: number;
  recibidas: number;
  defectuosas: number;
}

interface Desempeno {
  entrega: number | null;
  cumplimiento: number | null;
  retraso: number | null;
  defectos: number | null;
  costoPromedioUnidad: COP | null;
  recibidas: number;
  entregas: EntregaProveedor[];
}

/**
 * Desempeño de una fábrica con la definición de P14: retraso contra la estimada ORIGINAL de llegada a bodega. Solo
 * pedidos recibidos y no eliminados (la carga inicial de existencias no es un pedido).
 */
function desempeno(e: Parameters<typeof selProveedores>[0], proveedorId: Id, hoy: FechaISO): Desempeno {
  let entrega = 0;
  let retraso = 0;
  let aTiempo = 0;
  let recibidas = 0;
  let defectuosas = 0;
  let costo = 0;
  let unidades = 0;
  const entregas: EntregaProveedor[] = [];
  for (const imp of Object.values(e.importaciones)) {
    if (imp.proveedorId !== proveedorId || !imp.recepcion || imp.eliminadoEn || imp.nota === 'Carga inicial de existencias') continue;
    const original = hitosIniciales(imp.fechaPedido, e.parametros.aduanas.diasEstimadosEntreEstados).recibido_bodega.estimada;
    const r = diferenciaDias(original, imp.recepcion.fecha);
    const dias = diferenciaDias(imp.fechaPedido, imp.recepcion.fecha);
    retraso += r;
    if (r <= 0) aTiempo += 1;
    entrega += dias;
    let rec = 0;
    let def = 0;
    for (const l of Object.values(imp.recepcion.lineas)) {
      rec += l.recibidas;
      def += l.defectuosas;
    }
    recibidas += rec;
    defectuosas += def;
    entregas.push({
      importacionId: imp.id,
      numero: imp.numero,
      fechaPedido: imp.fechaPedido,
      estimadaOriginal: original,
      recibida: imp.recepcion.fecha,
      retraso: r,
      aTiempo: r <= 0,
      diasEntrega: dias,
      recibidas: rec,
      defectuosas: def,
    });
    const tasa = imp.costosAplicados?.tasaCosteo ?? selTasaVigente(e, { moneda: imp.moneda, fecha: hoy });
    costo += copDeCentavos(fobImportacion(imp.lineas), tasa);
    unidades += imp.lineas.reduce((a, l) => a + unidadesLinea(l), 0);
  }
  const n = entregas.length;
  entregas.sort((a, b) => (a.fechaPedido < b.fechaPedido ? -1 : a.fechaPedido > b.fechaPedido ? 1 : a.numero < b.numero ? -1 : 1));
  return {
    entrega: n ? entrega / n : null,
    cumplimiento: n ? aTiempo / n : null,
    retraso: n ? retraso / n : null,
    defectos: recibidas ? defectuosas / recibidas : null,
    costoPromedioUnidad: unidades ? Math.round(costo / unidades) : null,
    recibidas,
    entregas,
  };
}

export const selFichaProveedor = crearSelector<{ proveedorId: Id; hoy: FechaISO }, FichaProveedor | null>(
  'selFichaProveedor',
  ['proveedores', 'importaciones', 'cuentasPorPagar', 'gastos', 'tasas', 'parametros'],
  (e, { proveedorId, hoy }) => {
    const p = e.proveedores[proveedorId];
    if (!p) return null;
    const importaciones = Object.values(e.importaciones)
      .filter((i) => i.proveedorId === proveedorId && !i.eliminadoEn)
      .sort((a, b) => (a.fechaPedido < b.fechaPedido ? 1 : -1));
    let totalComprado = 0;
    if (p.tipo === 'fabrica')
      for (const i of importaciones) totalComprado += copDeCentavos(fobImportacion(i.lineas), i.costosAplicados?.tasaCosteo ?? i.tasaPedido);
    else for (const g of Object.values(e.gastos)) if (g.proveedorId === proveedorId && !g.eliminadoEn) totalComprado += g.valor;
    let saldoCop = 0;
    for (const c of Object.values(e.cuentasPorPagar))
      if (c.proveedorId === proveedorId && !c.eliminadoEn)
        saldoCop += saldoCxPCop(c, c.moneda === 'COP' ? null : selTasaVigente(e, { moneda: c.moneda, fecha: hoy }));
    const d = desempeno(e, proveedorId, hoy);
    return {
      proveedor: p,
      importaciones,
      totalComprado,
      saldoCop,
      entregaPromedio: d.entrega,
      cumplimiento: d.cumplimiento,
      retrasoPromedio: d.retraso,
      defectos: d.defectos,
      entregas: d.entregas,
    };
  },
);

export interface FilaComparativoFabrica {
  proveedorId: Id;
  nombre: string;
  costoPromedioUnidad: COP | null;
  /** % de pedidos a tiempo. */
  aTiempo: number | null;
  retrasoPromedio: number | null;
  defectos: number | null;
  pedidosRecibidos: number;
}

/** Comparativo de fábricas (B2): debe revelar P14 (Ningbo Weiye llega tarde y con más defectos). */
export const selComparativoFabricas = crearSelector<{ hoy: FechaISO }, FilaComparativoFabrica[]>(
  'selComparativoFabricas',
  ['proveedores', 'importaciones', 'tasas', 'parametros'],
  (e, { hoy }) =>
    Object.values(e.proveedores)
      .filter((p) => p.tipo === 'fabrica' && !p.eliminadoEn)
      .map((p) => {
        const d = desempeno(e, p.id, hoy);
        return {
          proveedorId: p.id,
          nombre: p.nombreCorto,
          costoPromedioUnidad: d.costoPromedioUnidad,
          aTiempo: d.cumplimiento,
          retrasoPromedio: d.retraso,
          defectos: d.defectos,
          pedidosRecibidos: d.entregas.length,
        };
      })
      .sort((a, b) => (a.nombre < b.nombre ? -1 : 1)),
);

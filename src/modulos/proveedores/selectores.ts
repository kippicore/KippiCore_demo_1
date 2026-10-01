import type { Categoria, COP, Contacto, FechaISO, Gasto, Id, Local, Proveedor } from '@/dominio/tipos';
import type { EstadoCxP } from '@/dominio/reglas/cuentas';
import {
  crearSelector,
  selComparativoFabricas,
  selCuentasPorPagar,
  selFichaProveedor,
  selGastos,
  selLocalesQueVenden,
  selProveedores,
  type FilaComparativoFabrica,
} from '@/selectores';
import { sumarDias } from '@/lib/fechas';
import { entregaDe, resumenEntregas, veredictoFabrica, type EntregaPedido, type VeredictoFabrica } from './calculos';
import { CATEGORIAS_LOCAL, CATEGORIAS_PRODUCTO } from './textos';

/**
 * Selectores locales de Proveedores (B2). Componen los de `@/selectores` (las reglas de P14, saldos y costos viven
 * allá) y declaran TODAS las tablas que leen, directa o indirectamente (verificado en `selectores.test.ts`).
 */

// ---------------------------------------------------------------------------------------------------------
// Entregas por pedido
// ---------------------------------------------------------------------------------------------------------
/** Pedidos ya recibidos de una fábrica (o de todas), del más antiguo al más reciente, con su retraso y defectos. */
export const selEntregas = crearSelector<{ proveedorId?: Id }, EntregaPedido[]>('selEntregasB2', ['importaciones', 'parametros'], (e, f) => {
  const dias = e.parametros.aduanas.diasEstimadosEntreEstados;
  const r: EntregaPedido[] = [];
  for (const imp of Object.values(e.importaciones)) {
    if (f.proveedorId && imp.proveedorId !== f.proveedorId) continue;
    const x = entregaDe(imp, dias);
    if (x) r.push(x);
  }
  return r.sort((a, b) => (a.fechaPedido < b.fechaPedido ? -1 : a.fechaPedido > b.fechaPedido ? 1 : a.numero < b.numero ? -1 : 1));
});

// ---------------------------------------------------------------------------------------------------------
// Directorio
// ---------------------------------------------------------------------------------------------------------
export interface FilaDirectorio {
  proveedor: Proveedor;
  /** Nombre del local asociado (arrendadores). */
  nombreLocal: string | null;
  /** "Camisas, polos" (fábricas) o "Arriendo" (locales): también se usa para buscar. */
  categoriaTexto: string;
  pedidos: number;
  enCurso: number;
  /** FOB de los pedidos (fábricas) o gastos registrados con el proveedor (locales), en COP. */
  totalComprado: COP;
  saldoCop: COP;
  vencidoCop: COP;
  pedidosRecibidos: number;
  retrasoPromedio: number | null;
  aTiempo: number | null;
  defectos: number | null;
}

const TABLAS_DIRECTORIO = ['proveedores', 'importaciones', 'cuentasPorPagar', 'gastos', 'tasas', 'parametros', 'locales'] as const;

export function categoriaTextoDe(p: Proveedor): string {
  if (p.tipo === 'fabrica') return p.categoriasProducto.map((c: Categoria) => CATEGORIAS_PRODUCTO[c]).join(', ');
  return p.categoriaLocal ? CATEGORIAS_LOCAL[p.categoriaLocal] : 'Proveedor local';
}

export const selDirectorio = crearSelector<{ hoy: FechaISO }, FilaDirectorio[]>('selDirectorioB2', TABLAS_DIRECTORIO, (e, { hoy }) => {
  const base = selProveedores(e, { hoy });
  const vencidos = new Map<Id, number>();
  for (const f of selCuentasPorPagar(e, { hoy, estado: 'vencido' }).filas)
    if (f.cxp.proveedorId) vencidos.set(f.cxp.proveedorId, (vencidos.get(f.cxp.proveedorId) ?? 0) + f.saldoCop);
  const recibidos = new Map<Id, number>(selComparativoFabricas(e, { hoy }).map((c) => [c.proveedorId, c.pedidosRecibidos]));
  return base.map(({ proveedor, saldoCop, pedidos }) => {
    const ficha = selFichaProveedor(e, { proveedorId: proveedor.id, hoy });
    return {
      proveedor,
      nombreLocal: proveedor.localId ? (e.locales[proveedor.localId]?.nombre ?? null) : null,
      categoriaTexto: categoriaTextoDe(proveedor),
      pedidos,
      enCurso: ficha?.importaciones.filter((i) => i.estado !== 'recibido_bodega').length ?? 0,
      totalComprado: ficha?.totalComprado ?? 0,
      saldoCop,
      vencidoCop: vencidos.get(proveedor.id) ?? 0,
      pedidosRecibidos: recibidos.get(proveedor.id) ?? 0,
      retrasoPromedio: ficha?.retrasoPromedio ?? null,
      aTiempo: ficha?.cumplimiento ?? null,
      defectos: ficha?.defectos ?? null,
    };
  });
});

// ---------------------------------------------------------------------------------------------------------
// Comparativo de fábricas
// ---------------------------------------------------------------------------------------------------------
export interface FilaComparativo extends FilaComparativoFabrica {
  proveedor: Proveedor;
  categorias: string;
  /** Días promedio del pedido a la recepción. */
  entregaPromedio: number | null;
  totalComprado: COP;
  saldoCop: COP;
  veredicto: VeredictoFabrica;
  motivos: string[];
  entregas: EntregaPedido[];
}

export const selComparativo = crearSelector<{ hoy: FechaISO }, FilaComparativo[]>('selComparativoB2', TABLAS_DIRECTORIO, (e, { hoy }) => {
  const entregas = selEntregas(e, {});
  return selComparativoFabricas(e, { hoy }).flatMap((c) => {
    const proveedor = e.proveedores[c.proveedorId];
    if (!proveedor) return [];
    const ficha = selFichaProveedor(e, { proveedorId: c.proveedorId, hoy });
    const propias = entregas.filter((x) => x.proveedorId === c.proveedorId);
    const { veredicto, motivos } = veredictoFabrica(c);
    return [
      {
        ...c,
        proveedor,
        categorias: categoriaTextoDe(proveedor),
        entregaPromedio: resumenEntregas(propias).diasEntregaPromedio,
        totalComprado: ficha?.totalComprado ?? 0,
        saldoCop: ficha?.saldoCop ?? 0,
        veredicto,
        motivos,
        entregas: propias,
      },
    ];
  });
});

// ---------------------------------------------------------------------------------------------------------
// Vista por local: arrendadores y servicios de cada local
// ---------------------------------------------------------------------------------------------------------
export interface VistaLocal {
  local: Local;
  arrendadores: Proveedor[];
  /** Arriendo mensual vigente (última cuenta de arriendo del local). */
  canon: COP | null;
  /** Estado de la última cuenta de arriendo y su vencimiento. */
  estadoArriendo: EstadoCxP | null;
  vencimientoArriendo: FechaISO | null;
  cxpArriendoId: Id | null;
  saldoCop: COP;
  arriendo12m: COP;
  servicios90d: COP;
  mantenimiento90d: COP;
}

export const selVistaPorLocal = crearSelector<{ hoy: FechaISO }, VistaLocal[]>(
  'selVistaPorLocalB2',
  ['locales', 'proveedores', 'cuentasPorPagar', 'gastos', 'tasas'],
  (e, { hoy }) => {
    const hace90 = sumarDias(hoy, -89);
    const hace12m = sumarDias(hoy, -364);
    return selLocalesQueVenden(e).map((local) => {
      const arriendos = selCuentasPorPagar(e, { hoy, categoria: 'arriendo', localId: local.id }).filas;
      const ultima = arriendos.at(-1) ?? null;
      const pendientes = arriendos.filter((f) => f.estado !== 'pagado');
      return {
        local,
        arrendadores: Object.values(e.proveedores)
          .filter((p) => !p.eliminadoEn && p.localId === local.id)
          .sort((a, b) => (a.nombreCorto < b.nombreCorto ? -1 : 1)),
        canon: ultima?.cxp.valor ?? null,
        estadoArriendo: ultima?.estado ?? null,
        vencimientoArriendo: ultima?.cxp.fechaVencimiento ?? null,
        cxpArriendoId: ultima?.cxp.id ?? null,
        saldoCop: pendientes.reduce((a, f) => a + f.saldoCop, 0),
        arriendo12m: selGastos(e, { desde: hace12m, hasta: hoy, localId: local.id, categoria: 'arriendo' }).total,
        servicios90d: selGastos(e, { desde: hace90, hasta: hoy, localId: local.id, categoria: 'servicios' }).total,
        mantenimiento90d: selGastos(e, { desde: hace90, hasta: hoy, localId: local.id, categoria: 'mantenimiento' }).total,
      };
    });
  },
);

// ---------------------------------------------------------------------------------------------------------
// Ficha: contactos y pagos recientes
// ---------------------------------------------------------------------------------------------------------
/** Contactos vigentes de un proveedor (por el campo `proveedorId` del contacto, no por la lista del proveedor). */
export const selContactosProveedor = crearSelector<{ proveedorId: Id }, Contacto[]>('selContactosProveedorB2', ['contactos'], (e, { proveedorId }) =>
  Object.values(e.contactos)
    .filter((c) => c.proveedorId === proveedorId && !c.eliminadoEn)
    .sort((a, b) => (a.rol === b.rol ? (a.nombre < b.nombre ? -1 : 1) : a.rol === 'proveedor' ? -1 : b.rol === 'proveedor' ? 1 : a.rol < b.rol ? -1 : 1)),
);

/** Gastos registrados con un proveedor local, del más reciente al más antiguo. */
export const selPagosProveedor = crearSelector<{ proveedorId: Id; limite?: number }, { filas: Gasto[]; total: COP; cantidad: number; ultimo: FechaISO | null }>(
  'selPagosProveedorB2',
  ['gastos'],
  (e, { proveedorId, limite = 12 }) => {
    const todos = Object.values(e.gastos)
      .filter((g) => g.proveedorId === proveedorId && !g.eliminadoEn)
      .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.id < b.id ? -1 : 1));
    return { filas: todos.slice(0, limite), total: todos.reduce((a, g) => a + g.valor, 0), cantidad: todos.length, ultimo: todos[0]?.fecha ?? null };
  },
);

import type {
  Cliente,
  Empleado,
  FechaISO,
  Id,
  Local,
  Moneda,
  Producto,
  Rol,
  UsuarioDemo,
  Variante,
} from '@/dominio/tipos';
import { PERSONAS_ROL } from '@/config/permisos';
import { crearSelector } from './memo';

/** Listas activas, mapas por id e índices (PLAN 6.23 `base.ts`). */

export const selLocales = crearSelector<{ incluirBodega?: boolean } | void, Local[]>(
  'selLocales',
  ['locales'],
  (e, p) =>
    Object.values(e.locales)
      .filter((l) => !l.eliminadoEn && (p?.incluirBodega || l.vende))
      .sort((a, b) => a.orden - b.orden),
);

export const selLocalesQueVenden = crearSelector<void, Local[]>('selLocalesQueVenden', ['locales'], (e) =>
  Object.values(e.locales)
    .filter((l) => !l.eliminadoEn && l.vende)
    .sort((a, b) => a.orden - b.orden),
);

export const selProductosActivos = crearSelector<void, Producto[]>('selProductosActivos', ['productos'], (e) =>
  Object.values(e.productos)
    .filter((p) => !p.eliminadoEn)
    .sort((a, b) => (a.referencia < b.referencia ? -1 : 1)),
);

/** Variantes activas por producto, ordenadas por color y talla de la curva. */
export const selVariantesPorProducto = crearSelector<void, Record<Id, Variante[]>>(
  'selVariantesPorProducto',
  ['variantes'],
  (e) => {
    const r: Record<Id, Variante[]> = {};
    for (const v of Object.values(e.variantes)) {
      if (v.eliminadoEn) continue;
      (r[v.productoId] ??= []).push(v);
    }
    return r;
  },
);

export const selEmpleadosActivos = crearSelector<{ fecha: FechaISO }, Empleado[]>(
  'selEmpleadosActivos',
  ['empleados'],
  (e, { fecha }) =>
    Object.values(e.empleados)
      .filter((x) => !x.eliminadoEn && x.fechaIngreso <= fecha && (!x.fechaRetiro || x.fechaRetiro >= fecha))
      .sort((a, b) => (`${a.nombres} ${a.apellidos}` < `${b.nombres} ${b.apellidos}` ? -1 : 1)),
);

export const selClientesActivos = crearSelector<void, Cliente[]>('selClientesActivos', ['clientes'], (e) =>
  Object.values(e.clientes).filter((c) => !c.eliminadoEn),
);

function indice(campo: 'clienteId' | 'vendedorId' | 'dia') {
  return (e: Parameters<typeof selLocales>[0]) => {
    const r: Record<string, Id[]> = {};
    for (const v of Object.values(e.ventas)) {
      const k = campo === 'dia' ? v.ts.slice(0, 10) : v[campo];
      if (!k) continue;
      (r[k] ??= []).push(v.id);
    }
    return r;
  };
}

/** Ventas (ids) por cliente (incluye anuladas: el consumidor filtra). */
export const selIndiceVentasPorCliente = crearSelector<void, Record<Id, Id[]>>(
  'selIndiceVentasPorCliente',
  ['ventas'],
  indice('clienteId'),
);
export const selIndiceVentasPorVendedor = crearSelector<void, Record<Id, Id[]>>(
  'selIndiceVentasPorVendedor',
  ['ventas'],
  indice('vendedorId'),
);
export const selIndiceVentasPorDia = crearSelector<void, Record<FechaISO, Id[]>>(
  'selIndiceVentasPorDia',
  ['ventas'],
  indice('dia'),
);

/** Tasa vigente (COP por unidad) de una moneda en una fecha: la más reciente con fecha ≤ `fecha`. COP = 1. */
export const selTasaVigente = crearSelector<{ moneda: Moneda; fecha: FechaISO }, number>(
  'selTasaVigente',
  ['tasas'],
  (e, { moneda, fecha }) => {
    if (moneda === 'COP') return 1;
    let mejor: { fecha: string; valor: number } | null = null;
    for (const t of Object.values(e.tasas))
      if (t.moneda === moneda && t.fecha <= fecha && (!mejor || t.fecha > mejor.fecha)) mejor = t;
    return mejor?.valor ?? 0;
  },
);

/** Usuario de la demo de un rol (persona del rol, 1.5). */
export const selUsuario = crearSelector<{ rol: Rol }, UsuarioDemo | null>('selUsuario', ['usuarios'], (e, { rol }) => {
  return e.usuarios[PERSONAS_ROL[rol].usuarioId] ?? null;
});

/** Nombre completo de un empleado ('Sebastián Cárdenas'). */
export function nombreEmpleado(x: Pick<Empleado, 'nombres' | 'apellidos'> | undefined | null): string {
  return x ? `${x.nombres} ${x.apellidos}` : '—';
}
export function nombreCliente(x: Pick<Cliente, 'nombres' | 'apellidos'> | undefined | null): string {
  return x ? `${x.nombres} ${x.apellidos}` : 'Consumidor final';
}

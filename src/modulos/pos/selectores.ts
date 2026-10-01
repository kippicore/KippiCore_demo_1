import type { BonoRegalo, COP, EstadoDominio, FechaISO, Id, Producto, SolicitudAprobacion } from '@/dominio/tipos';
import { lunesDe, sumarDias } from '@/dominio/reglas/fechas';
import {
  crearSelector,
  nombreEmpleado,
  selBonos,
  selCierresDelDia,
  selMatrizExistencias,
  selTopProductos,
  selTurnosSemana,
  type CierreDelDia,
} from '@/selectores';
import { ordenarPorCercania } from './calculos';

/**
 * Selectores locales del punto de venta y la caja (A1). Componen los compartidos (nunca reimplementan una regla)
 * y declaran TODAS las tablas que leen (la verificación `activarVerificacionDeTablas` lo comprueba en las pruebas).
 */

// ---------------------------------------------------------------------------------------------------------
// Vendedores del local, por turno (W1: "por defecto, el de turno más cercano")
// ---------------------------------------------------------------------------------------------------------
export interface VendedorPos {
  empleadoId: Id;
  nombre: string;
  turno: { inicio: string; fin: string } | null;
  /** Está en turno a la hora dada. */
  enTurno: boolean;
}

export interface VendedoresPos {
  vendedores: VendedorPos[];
  /** El de turno ahora o, si ninguno, el de turno más cercano a la hora; sin turnos, el primero. */
  porDefecto: Id | null;
}

export const selVendedoresPos = crearSelector<{ localId: Id; fecha: FechaISO; hhmm: string }, VendedoresPos>(
  'selVendedoresPos',
  ['turnos', 'empleados', 'parametros'],
  (e, { localId, fecha, hhmm }) => {
    const semana = selTurnosSemana(e, { localId, lunes: lunesDe(fecha) });
    const lista = semana.empleados
      .filter((x) => e.empleados[x.empleadoId]?.cargo === 'vendedor')
      .map((x) => {
        const t = (x.porDia[fecha] ?? [])[0];
        return { empleadoId: x.empleadoId, nombre: x.nombre || nombreEmpleado(e.empleados[x.empleadoId]), inicio: t?.inicio ?? null, fin: t?.fin ?? null };
      });
    const conTurno = ordenarPorCercania(
      lista.filter((x): x is typeof x & { inicio: string; fin: string } => !!x.inicio && !!x.fin),
      hhmm,
    );
    const sinTurno = lista.filter((x) => !x.inicio);
    const vendedores: VendedorPos[] = [
      ...conTurno.map((x) => ({ empleadoId: x.empleadoId, nombre: x.nombre, turno: { inicio: x.inicio, fin: x.fin }, enTurno: x.inicio <= hhmm && hhmm <= x.fin })),
      ...sinTurno.map((x) => ({ empleadoId: x.empleadoId, nombre: x.nombre, turno: null, enTurno: false })),
    ];
    return { vendedores, porDefecto: vendedores[0]?.empleadoId ?? null };
  },
);

// ---------------------------------------------------------------------------------------------------------
// Más vendidos con existencias en el local (atajo cuando todavía no se ha buscado nada)
// ---------------------------------------------------------------------------------------------------------
export interface DestacadoPos {
  producto: Producto;
  unidadesVendidas: number;
  /** Unidades en el local. */
  disponibles: number;
  /** Color (con existencias en el local) que se pinta en la ficha. */
  colorHex: string;
  patron: 'liso' | 'rayas' | 'cuadros';
}

export const selDestacadosPos = crearSelector<{ localId: Id; hoy: FechaISO; n: number }, DestacadoPos[]>(
  'selDestacadosPos',
  ['ventas', 'devoluciones', 'productos', 'variantes', 'colores', 'locales', 'agregados', 'importaciones'],
  (e, { localId, hoy, n }) => {
    const top = selTopProductos(e, { desde: sumarDias(hoy, -30), hasta: hoy, localId, n: n * 3, medida: 'unidades' });
    const r: DestacadoPos[] = [];
    for (const t of top) {
      const producto = e.productos[t.productoId];
      const m = selMatrizExistencias(e, { productoId: t.productoId });
      if (!producto || !m || producto.eliminadoEn) continue;
      const disponibles = m.totalPorLocal[localId] ?? 0;
      if (disponibles <= 0) continue;
      const color = m.colores.find((c) => m.tallas.some((tl) => (m.celdas[`${tl}|${c.id}`]?.[localId] ?? 0) > 0)) ?? m.colores[0];
      r.push({ producto, unidadesVendidas: t.unidades, disponibles, colorHex: color?.hex ?? '#C9C9C7', patron: (color && e.colores[color.id]?.patron) || 'liso' });
      if (r.length >= n) break;
    }
    return r;
  },
);

// ---------------------------------------------------------------------------------------------------------
// Cierres de varios días (vista del dueño)
// ---------------------------------------------------------------------------------------------------------
export interface CierresDeUnDia {
  fecha: FechaISO;
  filas: CierreDelDia[];
}

/** Los cierres de los tres locales de los últimos `dias` días (el más reciente primero), con `hoy` incluido. */
export const selCierresRecientes = crearSelector<{ hoy: FechaISO; dias: number }, CierresDeUnDia[]>(
  'selCierresRecientes',
  ['sesionesCaja', 'locales', 'agregados', 'empleados', 'usuarios'],
  (e, { hoy, dias }) =>
    Array.from({ length: dias }, (_, i) => {
      const fecha = sumarDias(hoy, -i);
      return { fecha, filas: selCierresDelDia(e, { fecha }) };
    }),
);

// ---------------------------------------------------------------------------------------------------------
// Bono de regalo por código
// ---------------------------------------------------------------------------------------------------------
/** Bono activo por su código ("BR-000214"), sin importar mayúsculas ni espacios; null si no existe. */
export const selBonoPorCodigo = crearSelector<{ codigo: string; hoy: FechaISO }, (BonoRegalo & { saldo: COP; estado: 'activo' | 'usado' | 'vencido' }) | null>(
  'selBonoPorCodigo',
  ['bonos', 'agregados'],
  (e, { codigo, hoy }) => {
    const c = codigo.trim().toUpperCase();
    if (!c) return null;
    return selBonos(e, { hoy, localId: 'todos' }).find((b) => b.codigo.toUpperCase() === c) ?? null;
  },
);

// ---------------------------------------------------------------------------------------------------------
// Aprobaciones de descuento del vendedor
// ---------------------------------------------------------------------------------------------------------
export type SolicitudDescuento = SolicitudAprobacion & { datos: Extract<SolicitudAprobacion['datos'], { tipo: 'descuento' }> };

/** Solicitudes de descuento de un vendedor que siguen vivas (pendientes, o aprobadas sin usar), la más reciente primero. */
export const selSolicitudesDescuento = crearSelector<{ vendedorId: Id }, SolicitudDescuento[]>(
  'selSolicitudesDescuento',
  ['solicitudes'],
  (e: EstadoDominio, { vendedorId }) =>
    Object.values(e.solicitudes)
      .filter(
        (s): s is SolicitudDescuento =>
          s.datos.tipo === 'descuento' &&
          s.datos.vendedorId === vendedorId &&
          (s.estado === 'pendiente' || (s.estado === 'aprobada' && s.usadaEnVentaId === null)),
      )
      .sort((a, b) => (a.ts < b.ts ? 1 : -1)),
);

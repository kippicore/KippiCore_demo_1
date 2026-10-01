import type { ClaveExistencia, FechaISO, Id, MesISO } from '@/dominio/tipos';

/**
 * Índices incrementales del generador (PLAN 7.1, 7.4). Son candidatos, no la verdad: cada intención diaria de
 * revisión los consulta y luego verifica contra el estado (matriz de guardas), así nunca recorre tablas
 * completas (16.000 ventas × 548 días sería cuadrático) y respeta lo que cambió el usuario.
 * Viven solo durante una construcción; se rehacen igual en cada una (deterministas).
 */
export interface EventoSeparado {
  ventaId: Id;
  localId: Id;
  /** 'abono' paga esta fracción del saldo (1 = completa); 'cancelar' cancela con saldo a favor. */
  accion: 'abono' | 'cancelar';
  fraccion: number;
}

export interface EventoDevolucion {
  ventaId: Id;
  localId: Id;
}

export interface EventoRedencion {
  bonoId: Id;
  /** Desde cuándo se puede redimir. */
  desde: FechaISO;
}

export class Indices {
  readonly separados = new Map<FechaISO, EventoSeparado[]>();
  readonly devoluciones = new Map<FechaISO, EventoDevolucion[]>();
  /** Cola por local de bonos por redimir, ordenada por fecha. */
  readonly redenciones = new Map<Id, EventoRedencion[]>();
  readonly trasladosPorRecibir = new Map<FechaISO, Id[]>();
  readonly cxpPorFecha = new Map<FechaISO, Id[]>();
  /** Importaciones con un evento bloqueado (controlManualHasta) que se reintenta cada día. */
  readonly importacionesDiferidas = new Set<Id>();
  /** IVA, base y crédito con financiera de las ventas generadas, por mes (obligaciones ilustrativas). */
  readonly ventasMes = new Map<MesISO, { iva: number; base: number; financiera: number; ventas: number }>();
  /** Demanda que no se pudo atender como se pidió (fecha y clave variante@local). */
  readonly insatisfecha: { fecha: FechaISO; clave: ClaveExistencia }[] = [];
  /** Última venta de cada vendedor por día (N10: la venta de Mateo con "cobro duplicado"). */
  readonly ultimaVentaVendedor = new Map<string, Id>();
  /** Separados activos generados (para la calibración del flujo). */
  readonly separadosActivos = new Set<Id>();

  agregar<T>(mapa: Map<FechaISO, T[]>, fecha: FechaISO, x: T): void {
    const l = mapa.get(fecha);
    if (l) l.push(x);
    else mapa.set(fecha, [x]);
  }

  tomar<T>(mapa: Map<FechaISO, T[]>, fecha: FechaISO): T[] {
    const l = mapa.get(fecha) ?? [];
    mapa.delete(fecha);
    return l;
  }

  sumarVenta(mes: MesISO, iva: number, base: number, financiera: number): void {
    const a = this.ventasMes.get(mes) ?? { iva: 0, base: 0, financiera: 0, ventas: 0 };
    a.iva += iva;
    a.base += base;
    a.financiera += financiera;
    a.ventas += 1;
    this.ventasMes.set(mes, a);
  }
}

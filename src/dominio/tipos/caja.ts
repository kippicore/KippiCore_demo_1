import type { COP, FechaHoraISO, Id, Trazabilidad } from './comunes';
import type { CategoriaGasto } from './finanzas';

/** Caja (PLAN 6.7). */
export interface EgresoCaja {
  id: Id;
  ts: FechaHoraISO;
  concepto: string;
  valor: COP;
  categoria: CategoriaGasto;
  gastoId: Id;
}

/** Una sesión por local y día (no hay turnos de caja). */
export interface SesionCaja extends Trazabilidad {
  id: Id;
  localId: Id;
  /** Caja del local. */
  cuentaId: Id;
  /** `por`: empleadoId de quien abrió (o usuarioId si no es empleado, p. ej. el dueño). */
  abierta: { ts: FechaHoraISO; por: Id; baseInicial: COP };
  egresos: EgresoCaja[];
  cierre: {
    ts: FechaHoraISO;
    /** empleadoId de quien cerró (o usuarioId si no es empleado). */
    por: Id;
    /** true: quien cerró contó sin ver el esperado (siempre true para vendedor y cajera). */
    ciego: boolean;
    /** '100000' → 3, '50000' → 7, … ('monedas' → valor) */
    denominaciones: Record<string, number> | null;
    /** = Σ denominaciones si las hay. */
    efectivoContado: COP;
    /** Instantánea al cerrar (auditoría). */
    efectivoEsperado: COP;
    /** contado − esperado (negativo = faltante). */
    diferencia: COP;
    observacion: string | null;
  } | null;
  /** El dueño marca el cierre como revisado (W11). */
  revision: { ts: FechaHoraISO; por: Id; nota: string | null } | null;
  // derivado (mientras está abierta): ventas por medio de pago, efectivo esperado
}

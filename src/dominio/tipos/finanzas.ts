import type {
  COP,
  Eliminable,
  FechaHoraISO,
  FechaISO,
  Id,
  MesISO,
  Moneda,
  MontoConvertido,
  RefDocumento,
  Soporte,
  Trazabilidad,
} from './comunes';

/** Plata: cuentas, movimientos, por pagar, por cobrar y gastos (PLAN 6.12). */
export type TipoCuenta = 'caja' | 'banco' | 'billetera' | 'puente';
export interface CuentaDinero extends Trazabilidad, Eliminable {
  id: Id;
  /** 'Caja Usaquén' · 'Cuenta corriente' · 'Nequi' · 'Daviplata' */
  nombre: string;
  tipo: TipoCuenta;
  localId: Id | null;
  /** Banco ficticio genérico. */
  entidad: string | null;
  numeroEnmascarado: string | null;
  saldoInicial: COP;
  /** Inicio de la ventana. */
  fechaSaldoInicial: FechaISO;
  orden: number;
  // derivado: saldo, libro (pagos de ventas + movimientos), pendientes de conciliar
}

export type TipoMovimientoCuenta =
  | 'gasto'
  | 'pago_cuenta_por_pagar'
  | 'nomina'
  | 'transferencia_salida'
  | 'transferencia_entrada'
  | 'consignacion'
  | 'abono_datafono'
  | 'venta_bono'
  | 'aporte_socio'
  | 'retiro_socio'
  | 'otro_ingreso'
  | 'otro_egreso'
  | 'ajuste';
export interface MovimientoCuenta extends Trazabilidad {
  id: Id;
  cuentaId: Id;
  ts: FechaHoraISO;
  /** Con signo. */
  valor: COP;
  tipo: TipoMovimientoCuenta;
  descripcion: string;
  documento: RefDocumento | null;
  contraparte: string | null;
  /** Pagos en USD/CNY. */
  montoOrigen: MontoConvertido | null;
  /** Enlaza las dos patas de una transferencia. */
  transferenciaId: Id | null;
  conciliado: boolean;
}

export type CategoriaCxP =
  | 'proveedor_importacion'
  | 'tributos_aduaneros'
  | 'proveedor_local'
  | 'arriendo'
  | 'servicios'
  | 'nomina'
  /** PILA. */
  | 'seguridad_social'
  /** Prima, cesantías, intereses (fechas de config/obligaciones.ts). */
  | 'prestaciones'
  /** IVA bimestral, retención mensual, ICA (ilustrativos). */
  | 'impuestos'
  | 'agente_aduanas'
  | 'agente_carga'
  | 'transporte'
  | 'publicidad'
  | 'otro';
export interface AbonoCxP {
  id: Id;
  ts: FechaHoraISO;
  valorCOP: COP;
  /** Si la deuda está en USD/CNY: centavos pagados, tasa del día. */
  montoOrigen: MontoConvertido | null;
  /** COP pagados − COP a la tasa del pedido. */
  diferenciaCambio: COP | null;
  cuentaId: Id;
  medio: 'transferencia' | 'efectivo' | 'pse' | 'giro_internacional' | 'debito_automatico';
  movimientoCuentaId: Id;
  soporte: Soporte | null;
}
export interface CuentaPorPagar extends Trazabilidad, Eliminable {
  id: Id;
  /** 'CP-000214' */
  numero: string;
  categoria: CategoriaCxP;
  terceroNombre: string;
  proveedorId: Id | null;
  empleadoId: Id | null;
  /** 'Saldo 70 % IMP-2026-10 · Hangzhou Lanxin' */
  concepto: string;
  localId: Id | null;
  moneda: Moneda;
  /** COP: pesos; USD/CNY: centavos. */
  valor: number;
  fechaEmision: FechaISO;
  fechaVencimiento: FechaISO;
  programadaPara: FechaISO | null;
  abonos: AbonoCxP[];
  /** Importación, gasto, liquidación… */
  documento: RefDocumento | null;
  soporte: Soporte | null;
  nota: string | null;
  // derivado: saldo (en su moneda y en COP a la tasa vigente), estado (pendiente | programado |
  //           pago_parcial | pagado | vencido), días para vencer
}

/** Abono del datáfono: lo cobrado con tarjeta sale de la cuenta puente y llega neto al banco (C16). */
export interface AbonoDatafono extends Trazabilidad {
  id: Id;
  /** Día hábil siguiente a las ventas que liquida. */
  fecha: FechaISO;
  localId: Id;
  /** Fecha de las ventas liquidadas. */
  ventasDe: FechaISO;
  /** Σ pagos con datáfono de ese local y día (ventas y bonos). */
  bruto: COP;
  comision: COP;
  /** Ilustrativas; "descontables". */
  retenciones: { fuente: COP; iva: COP; ica: COP };
  /** bruto − comisión − retenciones. */
  neto: COP;
  /** Cuenta corriente. */
  cuentaDestinoId: Id;
  /** Salida de la puente, entrada al banco. */
  movimientoIds: Id[];
  /** Gasto 'comisiones_datafono'. */
  gastoComisionId: Id;
}

/** Por cobrar es 100 % DERIVADO de ventas (separados y crédito). Este tipo es la forma del selector. */
export interface CuentaPorCobrar {
  ventaId: Id;
  numeroVenta: string;
  clienteId: Id | null;
  localId: Id;
  tipo: 'separado' | 'credito';
  total: COP;
  abonado: COP;
  saldo: COP;
  fechaVenta: FechaISO;
  fechaLimite: FechaISO | null;
  estado: 'al_dia' | 'por_vencer' | 'vencido' | 'cobrado';
  diasParaVencer: number | null;
}

export type CategoriaGasto =
  | 'arriendo'
  | 'servicios'
  | 'nomina'
  | 'seguridad_social'
  | 'publicidad'
  | 'transporte'
  | 'mantenimiento'
  | 'empaques'
  | 'comisiones_datafono'
  | 'impuestos'
  | 'otros';
export interface Gasto extends Trazabilidad, Eliminable {
  id: Id;
  fecha: FechaISO;
  /** null = general. */
  localId: Id | null;
  categoria: CategoriaGasto;
  concepto: string;
  /** Total con IVA. */
  valor: COP;
  iva: COP;
  proveedorId: Id | null;
  estadoPago: 'pagado' | 'por_pagar';
  medio: string | null;
  cuentaId: Id | null;
  movimientoCuentaId: Id | null;
  cuentaPorPagarId: Id | null;
  recurrenteId: Id | null;
  /** Liquidación, sesión de caja, abono de datáfono. */
  documento: RefDocumento | null;
  soporte: Soporte | null;
}
export interface GastoRecurrente extends Trazabilidad, Eliminable {
  id: Id;
  /** 'Arriendo Zona Rosa' */
  nombre: string;
  categoria: CategoriaGasto;
  localId: Id | null;
  valor: COP;
  iva: COP;
  /** 1–28 */
  diaDelMes: number;
  proveedorId: Id | null;
  formaPago: 'cuenta_por_pagar' | 'debito_automatico';
  diasPlazo: number;
  /** Débito automático. */
  cuentaId: Id | null;
  desde: MesISO;
  hasta: MesISO | null;
  activo: boolean;
}

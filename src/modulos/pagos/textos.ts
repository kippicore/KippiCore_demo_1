import type { CategoriaCxP, TipoMovimientoCuenta, TipoCuenta } from '@/dominio/tipos';
import type { TipoMovimientoFlujo } from '@/dominio/reglas/flujo';
import type { AbonoCxP } from '@/dominio/tipos';
import { ETIQUETA_CATEGORIA_CXP } from '@/config/textos/categorias';

/** Copy de la interfaz de Pagos (B3). Español de Colombia, lenguaje del comerciante (PLAN 8.11.4). */

/** Etiquetas compartidas (también las usa el reporte `cuentas`). */
export const CATEGORIAS_CXP: Record<CategoriaCxP, string> = ETIQUETA_CATEGORIA_CXP;

export const ORDEN_CATEGORIAS_CXP: readonly CategoriaCxP[] = [
  'proveedor_importacion',
  'tributos_aduaneros',
  'agente_aduanas',
  'agente_carga',
  'transporte',
  'proveedor_local',
  'arriendo',
  'servicios',
  'nomina',
  'seguridad_social',
  'prestaciones',
  'impuestos',
  'publicidad',
  'otro',
];

export const MEDIOS_PAGO_CXP: Record<AbonoCxP['medio'], string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  pse: 'PSE',
  giro_internacional: 'Giro internacional',
  debito_automatico: 'Débito automático',
};

export const TIPOS_CUENTA: Record<TipoCuenta, string> = {
  caja: 'Caja de un local',
  banco: 'Cuenta bancaria',
  billetera: 'Billetera digital',
  puente: 'Datáfono por abonar',
};

export const TIPOS_MOVIMIENTO_CUENTA: Record<TipoMovimientoCuenta | 'pago_venta', string> = {
  pago_venta: 'Pago de una venta',
  gasto: 'Gasto',
  pago_cuenta_por_pagar: 'Pago a un proveedor',
  nomina: 'Nómina',
  transferencia_salida: 'Transferencia enviada',
  transferencia_entrada: 'Transferencia recibida',
  consignacion: 'Consignación',
  abono_datafono: 'Abono del datáfono',
  venta_bono: 'Venta de bono de regalo',
  aporte_socio: 'Aporte del dueño',
  retiro_socio: 'Retiro del dueño',
  otro_ingreso: 'Otro ingreso',
  otro_egreso: 'Otro egreso',
  ajuste: 'Ajuste',
};

export const TIPOS_FLUJO: Record<TipoMovimientoFlujo, string> = {
  ventas: 'Ventas de contado',
  datafono: 'Abonos del datáfono',
  separados: 'Cobro de separados',
  cuenta_por_pagar: 'Cuentas por pagar',
  recurrente: 'Gastos de cada mes',
  nomina_neto: 'Nómina',
  pila: 'Seguridad social',
  prima: 'Prima de servicios',
  cesantias: 'Cesantías',
  intereses: 'Intereses de cesantías',
  iva: 'IVA',
  retencion: 'Retención en la fuente',
  ica: 'ICA',
  pedidos: 'Pedidos a fábricas (estimados)',
  otros_gastos: 'Otros gastos (promedio)',
  retiro_socio: 'Retiro del socio (estimado)',
};

/** Motivo por el que un pago previsto no se puede reprogramar desde el flujo. */
export const MOTIVO_NO_REPROGRAMABLE: Partial<Record<TipoMovimientoFlujo, string>> = {
  nomina_neto: 'La nómina se paga en su fecha.',
  pila: 'La seguridad social vence en su fecha legal.',
  prima: 'La prima se paga en su fecha legal.',
  cesantias: 'Las cesantías se consignan en su fecha legal.',
  intereses: 'Los intereses de cesantías se pagan en su fecha legal.',
  iva: 'Los impuestos vencen en su fecha legal.',
  retencion: 'Los impuestos vencen en su fecha legal.',
  ica: 'Los impuestos vencen en su fecha legal.',
  recurrente: 'Es un gasto que se genera cada mes; cámbiale el día en Costos y gastos.',
  pedidos: 'Es un pedido que todavía no has hecho: se estima con el ritmo y el tamaño de tus pedidos a esa fábrica. Cuando lo crees en Importaciones, sus pagos se podrán mover.',
  otros_gastos: 'Es el promedio de tus gastos sueltos de los últimos meses, no un pago puntual.',
  retiro_socio: 'Es lo que sueles retirar cuando sobra plata; regístralo en Caja y bancos cuando lo hagas.',
};

export const TXT = {
  pagos: {
    titulo: 'Pagos',
    subtitulo: 'Cuánto debes, cuánto te deben y cuánta plata tienes, local por local, sin cuadrar a mano.',
    migaInicio: 'Inicio',
  },
  pestanas: {
    resumen: 'Resumen',
    flujo: 'Flujo de caja',
    porPagar: 'Lo que debo',
    porCobrar: 'Plata que me deben',
    cuentas: 'Caja y bancos',
    datafono: 'Datáfono',
    conciliacion: 'Conciliación',
  },
  generales: {
    soloDueno: 'Solo el dueño ve los pagos.',
    todosLosLocales: 'Todos los locales',
    negocioEnGeneral: 'Negocio en general',
    nota: 'Valores y fechas ilustrativos · se validan con tu contador.',
    sinLocalNota: (n: number) => `No incluye ${n} ${n === 1 ? 'cuenta' : 'cuentas'} generales del negocio (nómina, importaciones, impuestos).`,
  },
  porPagar: {
    titulo: 'Cuentas por pagar',
    subtitulo: 'Proveedores, arriendos, servicios, nómina, seguridad social, impuestos y agentes, con su estado y su fecha.',
    nueva: 'Registrar cuenta por pagar',
    vacioTitulo: 'Ninguna cuenta con estos filtros',
    vacioTexto: 'Cambia el estado, la categoría o la semana para ver otras cuentas, o registra una nueva.',
    previstoTitulo: 'Lo que viene en los próximos 30 días',
    previstoTexto: 'Pagos que todavía no tienen cuenta por pagar, calculados con tus contratos, nómina y obligaciones.',
  },
  porCobrar: {
    subtitulo: 'Separados, ventas a crédito y saldos de clientes, con el recordatorio de cobro por WhatsApp ya escrito.',
    vacioTitulo: 'Nadie te debe plata con este filtro',
    vacioTexto: 'Cuando un cliente separe una prenda o compre a crédito, su saldo aparece aquí.',
  },
  cuentas: {
    subtitulo: 'Lo que hay en las cajas de cada local, el banco y las billeteras, con su libro de movimientos.',
  },
  datafono: {
    subtitulo: 'Lo que vendiste con tarjeta contra lo que te consignaron: comisión y retenciones, mes a mes.',
  },
  conciliacion: {
    subtitulo: 'Marca como conciliado lo que ya viste en tu extracto. Los pendientes se cuentan por cuenta.',
  },
  flujo: {
    subtitulo: 'Si te alcanza la plata: lo que vas a recibir menos lo que tienes que pagar, semana a semana.',
  },
} as const;

/** Glosario de términos dobles (PLAN 8.11.4): en títulos y menús, el del comerciante; el técnico acompaña. */
export interface TerminoDoble {
  comun: string;
  tecnico: string;
  definicion: string;
}

export const GLOSARIO: Record<string, TerminoDoble> = {
  porCobrar: {
    comun: 'Plata que me deben',
    tecnico: 'Cuentas por cobrar',
    definicion: 'Saldos de separados y ventas a crédito que todavía no te han pagado.',
  },
  porPagar: {
    comun: 'Lo que debo',
    tecnico: 'Cuentas por pagar',
    definicion: 'Facturas de proveedores, arriendos, nómina e impuestos pendientes de pago.',
  },
  cajaYBancos: {
    comun: 'Plata disponible',
    tecnico: 'Caja y bancos',
    definicion: 'Lo que hay hoy en las cajas de los locales, el banco y las billeteras.',
  },
  utilidadBruta: {
    comun: 'Lo que me queda después de vender',
    tecnico: 'Utilidad bruta',
    definicion: 'Ventas sin IVA menos lo que te costó la mercancía vendida.',
  },
  utilidadOperativa: {
    comun: 'Lo que me queda al final del mes',
    tecnico: 'Utilidad operativa',
    definicion: 'Utilidad bruta menos arriendos, nómina, servicios y demás gastos.',
  },
  costoAterrizado: {
    comun: 'Costo real por prenda',
    tecnico: 'Costo aterrizado',
    definicion: 'Precio de fábrica más flete, seguro, tributos, agente, puerto y transporte, por prenda.',
  },
  sinRotacion: {
    comun: 'Ropa que no se mueve',
    tecnico: 'Mercancía sin rotación',
    definicion: 'Referencias con existencias que no se han vendido en los últimos 60 días.',
  },
  diasInventario: {
    comun: 'Días que dura la mercancía',
    tecnico: 'Días de inventario',
    definicion: 'Existencias divididas por lo que vendes al día en los últimos 90 días.',
  },
  kardex: {
    comun: 'Historial de movimientos',
    tecnico: 'Kárdex',
    definicion: 'Cada entrada y salida de una prenda, con su saldo.',
  },
  separado: {
    comun: 'Plan de abonos',
    tecnico: 'Separado',
    definicion: 'El cliente aparta la prenda con un abono y paga el resto antes de la fecha límite.',
  },
  costoEmpleador: {
    comun: 'Lo que cuesta un empleado de verdad',
    tecnico: 'Costo total para el empleador',
    definicion: 'Salario, auxilio, aportes y prestaciones de un mes.',
  },
  puntoEquilibrio: {
    comun: 'Lo que vendo para no perder',
    tecnico: 'Punto de equilibrio',
    definicion: 'Ventas del mes con las que cubres los gastos fijos del local.',
  },
  fob: {
    comun: 'Valor de la mercancía en fábrica',
    tecnico: 'FOB',
    definicion: 'Precio de la mercancía puesta en el puerto de origen, antes del flete.',
  },
  nacionalizacion: {
    comun: 'Trámite de aduana',
    tecnico: 'Nacionalización',
    definicion: 'Declarar la mercancía, pagar los tributos y obtener el levante.',
  },
  arqueo: {
    comun: 'Cuadre de caja',
    tecnico: 'Arqueo / cierre de caja',
    definicion: 'Contar el efectivo al cerrar y compararlo con lo que debería haber.',
  },
  mapaCalor: {
    comun: 'Ventas por hora y día',
    tecnico: 'Mapa de calor',
    definicion: 'Qué días y a qué horas vendes más.',
  },
};

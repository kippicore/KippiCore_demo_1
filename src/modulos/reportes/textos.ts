import type { IdReporte } from '@/reportes';

/** Copy de la interfaz del centro de reportes (D4). Todo en español de Colombia, en lenguaje de dueño, no de contador. */

export interface GrupoReportes {
  id: string;
  titulo: string;
  ids: readonly IdReporte[];
}

/** Los 12 reportes de PRD 7.15 agrupados por la pregunta que el dueño se hace. "Exportar para tu contador" va aparte. */
export const GRUPOS: readonly GrupoReportes[] = [
  { id: 'vender', titulo: 'Ventas y clientes', ids: ['ventas', 'cierre-caja', 'clientes'] },
  { id: 'mercancia', titulo: 'Mercancía y compras', ids: ['inventario', 'kardex', 'importaciones'] },
  { id: 'plata', titulo: 'Plata y resultados', ids: ['cuentas', 'gastos', 'resultados'] },
  { id: 'equipo', titulo: 'Tu equipo', ids: ['nomina', 'asistencia', 'comisiones'] },
];

export interface TextoReporte {
  /** Lo que trae, dicho sencillo. */
  sencillo: string;
  /** "Te sirve para…" */
  sirvePara: string;
}

export const TEXTOS_REPORTE: Record<IdReporte, TextoReporte> = {
  ventas: {
    sencillo: 'Todo lo que vendiste: cada venta del periodo y el resumen por día y por local, con las devoluciones en su fecha.',
    sirvePara: 'Cuadrar las ventas del mes con tu contador o ver cómo va cada local.',
  },
  'cierre-caja': {
    sencillo: 'Cómo cerró cada caja: cuánto efectivo se esperaba, cuánto se contó y cuánta diferencia hubo.',
    sirvePara: 'Revisar los faltantes y sobrantes de caja sin abrir cada cierre.',
  },
  clientes: {
    sencillo: 'Quién te compra: cuánto ha comprado cada cliente, hace cuánto y en qué segmento está.',
    sirvePara: 'Armar una lista para escribirles o para una campaña.',
  },
  inventario: {
    sencillo: 'Cuántas prendas tienes en cada local, por talla y color, y cuánto vale la mercancía a costo y a precio de venta.',
    sirvePara: 'Hacer el inventario de fin de mes o contar lo que hay en el estante.',
  },
  kardex: {
    sencillo: 'La historia de una referencia: lo que entró, lo que salió y lo que quedó, movimiento por movimiento.',
    sirvePara: 'Averiguar por qué una referencia no cuadra o a dónde se fue.',
  },
  importaciones: {
    sencillo: 'Tus pedidos a las fábricas: en qué estado van y cuánto cuesta de verdad cada prenda cuando llega.',
    sirvePara: 'Revisar con tu agente de aduanas y poner bien los precios.',
  },
  cuentas: {
    sencillo: 'Lo que debes a proveedores y lo que te deben tus clientes, al día de hoy.',
    sirvePara: 'Planear los pagos de la semana y cobrar lo que está pendiente.',
  },
  gastos: {
    sencillo: 'En qué se fue la plata: los gastos del periodo por categoría y uno por uno.',
    sirvePara: 'Ver qué gasto creció y entregarle el detalle a tu contador.',
  },
  resultados: {
    sencillo: 'Cuánto ganaste: lo que vendiste, lo que costó la mercancía, los gastos y lo que queda al final en cada local.',
    sirvePara: 'Saber qué local te deja más y mostrarle el resultado a tu socio.',
  },
  nomina: {
    sencillo: 'Lo que cuesta tu equipo: devengado, descuentos, neto a pagar, aportes y costo total para el negocio.',
    sirvePara: 'Pasarle la nómina a tu contador y entregar los desprendibles.',
  },
  asistencia: {
    sencillo: 'Quién llegó, quién llegó tarde, quién faltó y cuántas horas trabajó cada persona.',
    sirvePara: 'Revisar turnos y novedades antes de liquidar la nómina.',
  },
  comisiones: {
    sencillo: 'Cuánto le toca de comisión a cada vendedor, con la base sin IVA y el detalle venta por venta.',
    sirvePara: 'Mostrarle a cada vendedor de dónde sale su comisión.',
  },
  contador: {
    sencillo: 'Un solo Excel con ventas, compras e importaciones, gastos, nómina e IVA del periodo.',
    sirvePara: 'Entregarle a tu contador todo junto al cerrar el mes.',
  },
};

export const HOJAS_CONTADOR = ['Ventas', 'Compras e importaciones', 'Gastos', 'Nómina', 'IVA generado y descontable'] as const;

export const TEXTOS = {
  titulo: 'Reportes',
  subtitulo: 'Descarga cualquier reporte del negocio en PDF o Excel, filtrado por fechas y local.',
  filtrosTitulo: 'Filtros para todos los reportes',
  contador: {
    eyebrow: 'Para tu contador',
    titulo: 'Exportar para tu contador',
    boton: 'Descargar el Excel del contador',
    verQueTrae: 'Ver qué trae',
    hojas: 'Trae, en hojas separadas:',
  },
  lista: { titulo: 'Elige un reporte', abierto: 'Reporte abierto' },
  panel: {
    sinFechas: 'Este reporte es una foto de hoy: no depende de las fechas.',
    sinLocal: 'Este reporte trae los tres locales juntos.',
    vistaPrevia: 'Así saldrá el archivo',
    sirvePara: 'Te sirve para',
    vacioTitulo: 'Este reporte sale vacío con estos filtros',
    vacioTexto: 'Prueba con otro rango de fechas o con todos los locales para que el archivo traiga algo.',
    vacioAccion: 'Ver los últimos 90 días',
    errorTitulo: 'No pudimos armar la vista previa',
    errorTexto: 'Los archivos se pueden descargar igual. Intenta de nuevo si quieres ver las primeras filas.',
    reintentar: 'Reintentar',
  },
  documentos: {
    titulo: 'Documentos listos para imprimir',
    subtitulo: 'Los formatos que el sistema genera con la marca de tu negocio. Estos son de muestra, armados con tus datos.',
  },
  avisos: {
    desconocido: 'Ese reporte ya no existe. Te mostramos el primero de la lista.',
    sinPermiso: 'Ese reporte no está disponible para tu rol.',
  },
} as const;

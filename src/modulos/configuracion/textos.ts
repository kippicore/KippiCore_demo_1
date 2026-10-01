import { Banknote, Building2, Coins, Database, Percent, Ship, ShieldCheck, Store, type LucideIcon } from 'lucide-react';
import { rutas } from '@/app/rutas';
import type { Rol } from '@/dominio/tipos';
import type { Permiso } from '@/config/permisos';

/** Copy de Configuración (E3). Español de Colombia, lenguaje sencillo, sin normas citadas como hecho. */

export type SeccionId = 'empresa' | 'locales' | 'monedas' | 'nomina' | 'impuestos' | 'aduanas' | 'usuarios' | 'datos';

export interface DefSeccion {
  id: SeccionId;
  titulo: string;
  corto: string;
  descripcion: string;
  icono: LucideIcon;
  a: string;
}

export const SECCIONES: readonly DefSeccion[] = [
  {
    id: 'empresa',
    titulo: 'Empresa',
    corto: 'Empresa y marca',
    descripcion: 'El nombre del negocio, el NIT, los colores y cómo se ve la marca en todo el sistema.',
    icono: Building2,
    a: rutas.configEmpresa(),
  },
  {
    id: 'locales',
    titulo: 'Locales',
    corto: 'Locales',
    descripcion: 'Crea, cambia o cierra un local: dirección, horario, arriendo y caja.',
    icono: Store,
    a: rutas.configLocales(),
  },
  {
    id: 'monedas',
    titulo: 'Monedas y tasas',
    corto: 'Monedas y tasas',
    descripcion: 'Cuántos pesos vale un dólar y un yuan hoy, con su historial.',
    icono: Coins,
    a: rutas.configMonedas(),
  },
  {
    id: 'nomina',
    titulo: 'Parámetros de nómina',
    corto: 'Nómina',
    descripcion: 'Salario mínimo, auxilio, aportes, recargos y provisiones que usa el cálculo.',
    icono: Banknote,
    a: rutas.configNomina(),
  },
  {
    id: 'impuestos',
    titulo: 'Impuestos y obligaciones',
    corto: 'Impuestos',
    descripcion: 'IVA, retenciones, comisiones del datáfono y las fechas de lo que hay que pagar.',
    icono: Percent,
    a: rutas.configImpuestos(),
  },
  {
    id: 'aduanas',
    titulo: 'Aduanas',
    corto: 'Aduanas',
    descripcion: 'Arancel, IVA de importación, seguro y los días entre cada estado de un pedido.',
    icono: Ship,
    a: rutas.configAduanas(),
  },
  {
    id: 'usuarios',
    titulo: 'Usuarios y roles',
    corto: 'Usuarios y roles',
    descripcion: 'Quién entra al sistema y qué ve cada rol.',
    icono: ShieldCheck,
    a: rutas.configUsuarios(),
  },
  {
    id: 'datos',
    titulo: 'Datos de la demo',
    corto: 'Datos de la demo',
    descripcion: 'Lo que has cambiado y el botón para volver al punto de partida.',
    icono: Database,
    a: rutas.configDatos(),
  },
];

export const TEXTOS = {
  hub: {
    titulo: 'Configuración',
    subtitulo: 'Todo lo que ves en este sistema se ajusta a tu negocio. Cambia un valor aquí y las cifras de todas las pantallas se recalculan.',
    plantillaTitulo: 'Una plantilla que se adapta a ti',
    plantillaTexto:
      'La marca, los locales, las tasas, la nómina y los impuestos son valores que tú controlas. Para otro negocio se cambian estos mismos valores y el resto del sistema sigue funcionando igual.',
    restaurarTitulo: '¿Quieres empezar de nuevo?',
    restaurarTexto: 'Con un clic vuelves a los datos de ejemplo originales. Todo lo que cambiaste aquí y en las demás pantallas se borra.',
  },
  empresa: {
    subtitulo: 'Pon el nombre de tu negocio y mira cómo cambia el sistema entero: la barra lateral, las facturas y los reportes.',
    avisoEjemplo: '{{marca}} es una marca de ejemplo.',
    avisoPropia: 'Estás viendo el sistema con tu marca. Los datos de las ventas siguen siendo de ejemplo.',
    volver: 'Volver a {{marca}}',
    guardar: 'Guardar marca',
    exito: 'Marca guardada',
    nombreAyuda: 'Es el nombre que aparece en la barra lateral, la entrada, los reportes y las facturas de ejemplo.',
    personaAyuda: 'Así te saludamos en el inicio. Si lo dejas vacío, no usamos ningún nombre.',
    coloresTitulo: 'Colores de la marca',
    coloresTexto: 'El color principal marca lo importante: puntos de pista, detalles y estados. Aplica a todo el sistema apenas guardas.',
    derivar: 'Calcular los otros tonos',
    derivarAyuda: 'Saca el color del texto y el fondo suave a partir del color principal.',
    vistaPrevia: 'Vista previa',
    vistaPreviaTexto: 'Así se vería tu marca. Los cambios se aplican en todo el sistema al guardar.',
    legalTitulo: 'Datos del negocio',
    legalTexto: 'Aparecen en las facturas, los desprendibles y los reportes de ejemplo.',
    reglasTitulo: 'Reglas de venta y de inventario',
    reglasTexto: 'Los límites que el sistema aplica al vender: separados, descuentos, devoluciones y alertas de inventario.',
  },
  locales: {
    subtitulo: 'Los locales de tu negocio y la bodega. Lo que cambies aquí se refleja en el selector de local de la barra superior.',
    nuevo: 'Nuevo local',
    vacioTitulo: 'Todavía no hay locales',
    vacioTexto: 'Crea el primer local para empezar a vender.',
    noSePuedeTitulo: (nombre: string) => `${nombre} todavía no se puede eliminar`,
    noSePuedeTexto: 'Resuelve esto y vuelve a intentarlo:',
  },
  monedas: {
    subtitulo: 'Cuántos pesos vale una unidad de cada moneda. Al guardar una tasa, todas las cifras en dólares y yuanes se recalculan.',
    etiquetaEjemplo: 'Tasa de ejemplo',
    etiquetaPropia: 'Tu tasa',
    nota: 'Las importaciones se registran en su moneda de origen y se convierten con la tasa del día del pago. Cambiar la tasa de hoy no altera lo que ya se pagó.',
    notaEjemplo: 'Las tasas precargadas son de ejemplo. Antes de operar con tus datos, pon la del día.',
  },
  nomina: {
    subtitulo: 'Los valores con los que se calcula lo que le cuesta cada persona al negocio. Cámbialos y la vista previa se actualiza al instante.',
    guardar: 'Guardar parámetros',
  },
  impuestos: {
    subtitulo: 'Los porcentajes y fechas con los que el sistema calcula el IVA, las retenciones y lo que hay que pagar cada mes.',
  },
  aduanas: {
    subtitulo: 'Lo que cuesta traer un pedido desde China: arancel, IVA de importación, seguro y los tiempos entre cada estado.',
    nota: 'Estos valores se usan al crear pedidos nuevos. Los pedidos que ya están en curso conservan los suyos.',
  },
  usuarios: {
    subtitulo: 'Quién entra al sistema y qué ve cada rol. Aquí es una simulación: en la versión real, cada persona entra con su usuario y contraseña.',
    nuevo: 'Nuevo usuario',
    simulado: 'Simulado',
  },
  datos: {
    subtitulo: 'Tu sesión de prueba, lo que has cambiado y el botón para volver a empezar.',
    restaurar: 'Restaurar datos de demostración',
    restaurarPregunta: '¿Restaurar los datos de demostración?',
    restaurarConsecuencias:
      'Se borran las ventas, traslados, ajustes de configuración y todo lo que hiciste en este navegador. La demo vuelve a sus datos de ejemplo originales, con la fecha de hoy.',
    restaurarNota: 'Tu marca personalizada y el progreso de la guía se conservan.',
    restaurarListo: 'Datos de demostración restaurados',
  },
} as const;

// ---------------------------------------------------------------------------------------------------------
// Roles y qué ve cada uno
// ---------------------------------------------------------------------------------------------------------
export const ROLES: readonly { id: Rol; etiqueta: string; descripcion: string }[] = [
  { id: 'dueno', etiqueta: 'Dueño', descripcion: 'Ve y decide todo el negocio.' },
  { id: 'vendedor', etiqueta: 'Vendedor', descripcion: 'Vende y atiende clientes en su local.' },
  { id: 'bodega', etiqueta: 'Bodega', descripcion: 'Recibe mercancía y mueve inventario.' },
];

export interface FilaPermiso {
  permiso: Permiso;
  etiqueta: string;
  detalle: string;
}

export interface GrupoPermisos {
  titulo: string;
  filas: readonly FilaPermiso[];
}

/** La tabla de "qué ve cada rol": cada fila lee la matriz real de `config/permisos.ts`. */
export const GRUPOS_PERMISOS: readonly GrupoPermisos[] = [
  {
    titulo: 'Vender',
    filas: [
      { permiso: 'venta.registrar', etiqueta: 'Registrar ventas', detalle: 'Cobrar en el punto de venta' },
      { permiso: 'caja.cerrar', etiqueta: 'Abrir y cerrar caja', detalle: 'Contar el efectivo del turno' },
      { permiso: 'aprobacion.solicitar', etiqueta: 'Pedir aprobación de un descuento o anulación', detalle: 'El vendedor pide, el dueño decide' },
      { permiso: 'descuento.sinAprobacion', etiqueta: 'Dar descuentos grandes sin aprobación', detalle: 'Por encima del límite del vendedor' },
      { permiso: 'venta.anular', etiqueta: 'Anular ventas', detalle: 'Devolver el inventario y restar la venta' },
      { permiso: 'caja.revisarCierre', etiqueta: 'Revisar los cierres de caja', detalle: 'Ver faltantes y sobrantes' },
    ],
  },
  {
    titulo: 'Inventario y compras',
    filas: [
      { permiso: 'inventario.ajustar', etiqueta: 'Ajustar inventario', detalle: 'Corregir existencias' },
      { permiso: 'importacion.recibir', etiqueta: 'Recibir importaciones en bodega', detalle: 'Contar lo que llegó' },
      { permiso: 'importacion.crear', etiqueta: 'Crear y seguir importaciones', detalle: 'Pedidos a las fábricas' },
      { permiso: 'ver.todosLosLocales', etiqueta: 'Ver todos los locales', detalle: 'Existencias y movimientos de cada uno' },
    ],
  },
  {
    titulo: 'Plata y personal',
    filas: [
      { permiso: 'ver.costos', etiqueta: 'Ver costos y márgenes', detalle: 'Cuánto cuesta y cuánto deja cada prenda' },
      { permiso: 'ver.gastos', etiqueta: 'Ver gastos y pagos', detalle: 'Cuentas por pagar, flujo de caja' },
      { permiso: 'ver.salarios', etiqueta: 'Ver salarios', detalle: 'Lo que gana cada persona' },
      { permiso: 'nomina.aprobar', etiqueta: 'Aprobar la nómina', detalle: 'Liquidar y pagar al equipo' },
      { permiso: 'marcacion.registrar', etiqueta: 'Marcar su propia asistencia', detalle: 'Entrada y salida del turno' },
    ],
  },
  {
    titulo: 'Sistema',
    filas: [
      { permiso: 'configuracion', etiqueta: 'Entrar a Configuración', detalle: 'Esta sección' },
      { permiso: 'restaurar', etiqueta: 'Restaurar los datos de demostración', detalle: 'Desde el menú de ayuda' },
    ],
  },
];

/** Etiquetas de tipo de local. */
export const TIPOS_LOCAL = [
  { valor: 'tienda_calle', etiqueta: 'Tienda a la calle' },
  { valor: 'centro_comercial', etiqueta: 'Centro comercial' },
  { valor: 'bodega', etiqueta: 'Bodega' },
] as const;

export const ETIQUETA_TIPO_LOCAL: Record<string, string> = Object.fromEntries(TIPOS_LOCAL.map((t) => [t.valor, t.etiqueta]));

export const MESES_OPCIONES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
].map((m, i) => ({ valor: String(i + 1).padStart(2, '0'), etiqueta: m.charAt(0).toUpperCase() + m.slice(1) }));

import type { Rol } from '@/dominio/tipos';

/**
 * Menú lateral del escritorio (PRD 6.4, PLAN 5.5) y pestañas de la app (PRD 6.5). Los íconos son nombres de
 * lucide-react (8.13). Las rutas son las de 5.5; los enlaces con parámetros se arman con src/app/rutas.ts (F2-B).
 */
export type GrupoMenu = 'inicio' | 'vender' | 'mercancia' | 'plata' | 'equipo' | 'entender' | 'crecer' | 'sistema';

export interface ItemMenu {
  id: string;
  etiqueta: string;
  /** Término técnico que acompaña en muted (8.11.4), si aplica. */
  tecnico?: string;
  /** Nombre del ícono de lucide-react (8.4.2). */
  icono: string;
  ruta: string;
  roles: readonly Rol[];
  grupo: GrupoMenu;
}

/** Grupos de la barra lateral en orden (8.4.2); el primero no lleva título. */
export const GRUPOS_MENU: { id: GrupoMenu; titulo: string | null }[] = [
  { id: 'inicio', titulo: null },
  { id: 'vender', titulo: 'Vender' },
  { id: 'mercancia', titulo: 'Mercancía' },
  { id: 'plata', titulo: 'Plata' },
  { id: 'equipo', titulo: 'Equipo y agenda' },
  { id: 'entender', titulo: 'Entender el negocio' },
  { id: 'crecer', titulo: 'Crecer' },
  { id: 'sistema', titulo: 'Sistema' },
];

/** Los 16 módulos del dueño (PRD 6.4, PLAN 8.4.2) y las vistas propias del vendedor y la bodega. */
export const MENU_ESCRITORIO: ItemMenu[] = [
  { id: 'inicio', etiqueta: 'Inicio', icono: 'House', ruta: '/panel/inicio', roles: ['dueno'], grupo: 'inicio' },
  { id: 'mi-dia', etiqueta: 'Mi día', icono: 'House', ruta: '/panel/mi-dia', roles: ['vendedor'], grupo: 'inicio' },
  { id: 'pos', etiqueta: 'Punto de venta', icono: 'ScanBarcode', ruta: '/panel/pos', roles: ['dueno', 'vendedor'], grupo: 'vender' },
  { id: 'ventas', etiqueta: 'Ventas', icono: 'ReceiptText', ruta: '/panel/ventas', roles: ['dueno', 'vendedor'], grupo: 'vender' },
  { id: 'clientes', etiqueta: 'Clientes', icono: 'Contact', ruta: '/panel/clientes', roles: ['dueno', 'vendedor'], grupo: 'vender' },
  { id: 'inventario', etiqueta: 'Inventario', icono: 'Shirt', ruta: '/panel/inventario', roles: ['dueno', 'vendedor', 'bodega'], grupo: 'mercancia' },
  { id: 'importaciones', etiqueta: 'Importaciones', icono: 'Ship', ruta: '/panel/importaciones', roles: ['dueno', 'bodega'], grupo: 'mercancia' },
  { id: 'proveedores', etiqueta: 'Proveedores', icono: 'Factory', ruta: '/panel/proveedores', roles: ['dueno'], grupo: 'mercancia' },
  { id: 'pagos', etiqueta: 'Pagos', tecnico: 'Por pagar, por cobrar y caja', icono: 'Wallet', ruta: '/panel/pagos', roles: ['dueno'], grupo: 'plata' },
  { id: 'gastos', etiqueta: 'Costos y gastos', icono: 'HandCoins', ruta: '/panel/gastos', roles: ['dueno'], grupo: 'plata' },
  { id: 'facturacion', etiqueta: 'Facturación', icono: 'FileText', ruta: '/panel/facturacion', roles: ['dueno'], grupo: 'plata' },
  { id: 'personal', etiqueta: 'Personal y nómina', icono: 'Users', ruta: '/panel/personal', roles: ['dueno'], grupo: 'equipo' },
  { id: 'mis-comisiones', etiqueta: 'Mis comisiones', icono: 'BadgePercent', ruta: '/panel/mis-comisiones', roles: ['vendedor'], grupo: 'equipo' },
  { id: 'mi-turno', etiqueta: 'Mi turno', icono: 'Clock', ruta: '/panel/mi-turno', roles: ['vendedor', 'bodega'], grupo: 'equipo' },
  { id: 'calendario', etiqueta: 'Calendario', icono: 'CalendarDays', ruta: '/panel/calendario', roles: ['dueno'], grupo: 'equipo' },
  { id: 'analisis', etiqueta: 'Análisis', icono: 'ChartColumn', ruta: '/panel/analisis', roles: ['dueno'], grupo: 'entender' },
  { id: 'reportes', etiqueta: 'Reportes', icono: 'FileDown', ruta: '/panel/reportes', roles: ['dueno', 'bodega'], grupo: 'entender' },
  { id: 'canales', etiqueta: 'Canales digitales', icono: 'MessagesSquare', ruta: '/panel/canales', roles: ['dueno'], grupo: 'crecer' },
  { id: 'configuracion', etiqueta: 'Configuración', icono: 'Settings2', ruta: '/panel/configuracion', roles: ['dueno'], grupo: 'sistema' },
];

/** Inicio de cada rol (5.5). */
export const INICIO_POR_ROL: Record<Rol, string> = {
  dueno: '/panel/inicio',
  vendedor: '/panel/mi-dia',
  bodega: '/panel/inventario',
};

/** Pestañas de la app del dueño (PRD 6.5). */
export const PESTANAS_APP = [
  { id: 'hoy', etiqueta: 'Hoy', icono: 'Sun', ruta: '/app' },
  { id: 'ventas', etiqueta: 'Ventas', icono: 'ReceiptText', ruta: '/app/ventas' },
  { id: 'inventario', etiqueta: 'Inventario', icono: 'Shirt', ruta: '/app/inventario' },
  { id: 'agenda', etiqueta: 'Agenda', icono: 'CalendarDays', ruta: '/app/agenda' },
  { id: 'mas', etiqueta: 'Más', icono: 'Ellipsis', ruta: '/app/mas' },
] as const;

/** Opciones de "Más" en la app (PRD 6.5, PLAN 2.6). */
export const MAS_APP = [
  { id: 'aprobar', etiqueta: 'Para aprobar', ruta: '/app/mas/aprobar' },
  { id: 'importaciones', etiqueta: 'Importaciones', ruta: '/app/mas/importaciones' },
  { id: 'nomina', etiqueta: 'Nómina', ruta: '/app/mas/nomina' },
  { id: 'pagos', etiqueta: 'Pagos pendientes', ruta: '/app/mas/pagos' },
  { id: 'alertas', etiqueta: 'Alertas', ruta: '/app/mas/alertas' },
  { id: 'moneda', etiqueta: 'Moneda', ruta: '/app/mas/moneda' },
  { id: 'como-arrancariamos', etiqueta: 'Cómo arrancaríamos', ruta: '/app/mas/como-arrancariamos' },
] as const;

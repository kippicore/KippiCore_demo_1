import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { INICIO_POR_ROL } from '@/config/navegacion';
import { useRolActivo } from '@/estado';
import { LayoutEscritorio } from '@/layouts/escritorio/LayoutEscritorio';
import { LayoutMovil } from '@/layouts/movil/LayoutMovil';
import { LayoutTienda } from '@/layouts/tienda/LayoutTienda';
import { LayoutPortal } from '@/layouts/portal/LayoutPortal';
import ErrorRuta from './ErrorRuta';
import NoEncontrada from './NoEncontrada';
import { GuardaRol } from './Guardas';
import { type CargadorPagina, lazyConReintento } from './lazy';
import { type NombreRuta, RUTAS } from './rutas';

/**
 * Router (PLAN 5.5, 5.15): TODAS las rutas de `rutas.ts`, cada página en su propio chunk (`lazy` con reintento),
 * con la guarda de rol del escritorio. Cada página vive en la carpeta del paquete dueño (9.4); en F2 es un
 * esqueleto que el paquete reemplaza sin tocar este archivo. `satisfies` obliga a que toda ruta tenga página.
 */
export const PAGINAS = {
  entrada: () => import('@/modulos/entrada/paginas/Entrada'),
  comoArrancariamos: () => import('@/modulos/guia/paginas/ComoArrancariamos'),
  inicio: () => import('@/modulos/inicio/paginas/Inicio'),
  pos: () => import('@/modulos/pos/paginas/PuntoDeVenta'),
  caja: () => import('@/modulos/pos/paginas/Caja'),
  ventas: () => import('@/modulos/ventas/paginas/Ventas'),
  venta: () => import('@/modulos/ventas/paginas/DetalleVenta'),
  devolucion: () => import('@/modulos/ventas/paginas/Devolucion'),
  inventario: () => import('@/modulos/inventario/paginas/Catalogo'),
  productoNuevo: () => import('@/modulos/inventario/paginas/ProductoNuevo'),
  movimientos: () => import('@/modulos/inventario/paginas/Movimientos'),
  traslados: () => import('@/modulos/inventario/paginas/Traslados'),
  traslado: () => import('@/modulos/inventario/paginas/Traslado'),
  conteos: () => import('@/modulos/inventario/paginas/Conteos'),
  conteo: () => import('@/modulos/inventario/paginas/Conteo'),
  recepcion: () => import('@/modulos/inventario/paginas/Recepcion'),
  etiquetas: () => import('@/modulos/inventario/paginas/Etiquetas'),
  valorizacion: () => import('@/modulos/inventario/paginas/Valorizacion'),
  producto: () => import('@/modulos/inventario/paginas/Producto'),
  productoPestana: () => import('@/modulos/inventario/paginas/Producto'),
  importaciones: () => import('@/modulos/importaciones/paginas/Importaciones'),
  importacionNueva: () => import('@/modulos/importaciones/paginas/ImportacionNueva'),
  sugerirPedido: () => import('@/modulos/importaciones/paginas/SugerirPedido'),
  contactosCadena: () => import('@/modulos/importaciones/paginas/ContactosCadena'),
  importacion: () => import('@/modulos/importaciones/paginas/Importacion'),
  importacionPestana: () => import('@/modulos/importaciones/paginas/Importacion'),
  seguimiento: () => import('@/seguimiento/paginas/Seguimiento'),
  proveedores: () => import('@/modulos/proveedores/paginas/Proveedores'),
  comparativoFabricas: () => import('@/modulos/proveedores/paginas/ComparativoFabricas'),
  proveedor: () => import('@/modulos/proveedores/paginas/Proveedor'),
  pagos: () => import('@/modulos/pagos/paginas/Resumen'),
  porPagar: () => import('@/modulos/pagos/paginas/PorPagar'),
  porCobrar: () => import('@/modulos/pagos/paginas/PorCobrar'),
  cuentas: () => import('@/modulos/pagos/paginas/Cuentas'),
  cuenta: () => import('@/modulos/pagos/paginas/Cuenta'),
  conciliacion: () => import('@/modulos/pagos/paginas/Conciliacion'),
  datafono: () => import('@/modulos/pagos/paginas/Datafono'),
  flujo: () => import('@/modulos/pagos/paginas/Flujo'),
  gastos: () => import('@/modulos/gastos/paginas/Gastos'),
  gastosRecurrentes: () => import('@/modulos/gastos/paginas/Recurrentes'),
  estadoResultados: () => import('@/modulos/gastos/paginas/Resultados'),
  puntoEquilibrio: () => import('@/modulos/gastos/paginas/Equilibrio'),
  personal: () => import('@/modulos/personal/paginas/Personal'),
  empleadoNuevo: () => import('@/modulos/personal/paginas/EmpleadoNuevo'),
  nomina: () => import('@/modulos/personal/paginas/Nomina'),
  liquidacion: () => import('@/modulos/personal/paginas/Liquidacion'),
  comparativoModalidades: () => import('@/modulos/personal/paginas/Comparativo'),
  comisiones: () => import('@/modulos/personal/paginas/Comisiones'),
  misComisiones: () => import('@/modulos/personal/paginas/MisComisiones'),
  turnos: () => import('@/modulos/turnos/paginas/Turnos'),
  asistencia: () => import('@/modulos/turnos/paginas/Asistencia'),
  novedades: () => import('@/modulos/turnos/paginas/Novedades'),
  miTurno: () => import('@/modulos/turnos/paginas/MiTurno'),
  miDia: () => import('@/modulos/turnos/paginas/MiDia'),
  empleado: () => import('@/modulos/personal/paginas/Empleado'),
  empleadoPestana: () => import('@/modulos/personal/paginas/Empleado'),
  clientes: () => import('@/modulos/clientes/paginas/Clientes'),
  cumpleanos: () => import('@/modulos/clientes/paginas/Cumpleanos'),
  cliente: () => import('@/modulos/clientes/paginas/Cliente'),
  calendario: () => import('@/modulos/calendario/paginas/Calendario'),
  analisis: () => import('@/modulos/analisis/paginas/Tablero'),
  tablaDinamica: () => import('@/modulos/analisis/paginas/TablaDinamica'),
  analisisProductos: () => import('@/modulos/analisis/paginas/Productos'),
  analisisClientes: () => import('@/modulos/analisis/paginas/Clientes'),
  analisisLocales: () => import('@/modulos/analisis/paginas/Locales'),
  facturacion: () => import('@/modulos/facturacion/paginas/Facturas'),
  notaCredito: () => import('@/modulos/facturacion/paginas/NotaCredito'),
  factura: () => import('@/modulos/facturacion/paginas/Factura'),
  canales: () => import('@/modulos/canales/paginas/Canales'),
  canalWhatsapp: () => import('@/modulos/canales/paginas/Whatsapp'),
  canalInstagram: () => import('@/modulos/canales/paginas/Instagram'),
  canalWeb: () => import('@/modulos/canales/paginas/Web'),
  reportes: () => import('@/modulos/reportes/paginas/Reportes'),
  configuracion: () => import('@/modulos/configuracion/paginas/Configuracion'),
  configEmpresa: () => import('@/modulos/configuracion/paginas/Empresa'),
  configLocales: () => import('@/modulos/configuracion/paginas/Locales'),
  configMonedas: () => import('@/modulos/configuracion/paginas/Monedas'),
  configNomina: () => import('@/modulos/configuracion/paginas/Nomina'),
  configImpuestos: () => import('@/modulos/configuracion/paginas/Impuestos'),
  configAduanas: () => import('@/modulos/configuracion/paginas/Aduanas'),
  configUsuarios: () => import('@/modulos/configuracion/paginas/Usuarios'),
  configDatos: () => import('@/modulos/configuracion/paginas/Datos'),
  app: () => import('@/movil/paginas/Hoy'),
  appVentas: () => import('@/movil/paginas/Ventas'),
  appInventario: () => import('@/movil/paginas/Inventario'),
  appProducto: () => import('@/movil/paginas/Producto'),
  appAgenda: () => import('@/movil/paginas/Agenda'),
  appCierres: () => import('@/movil/paginas/Cierres'),
  appCierre: () => import('@/movil/paginas/Cierre'),
  appMas: () => import('@/movil/paginas/Mas'),
  appAprobar: () => import('@/movil/paginas/Aprobar'),
  appImportaciones: () => import('@/movil/paginas/Importaciones'),
  appImportacion: () => import('@/movil/paginas/Importacion'),
  appNomina: () => import('@/movil/paginas/Nomina'),
  appPagos: () => import('@/movil/paginas/Pagos'),
  appAlertas: () => import('@/movil/paginas/Alertas'),
  appMoneda: () => import('@/movil/paginas/Moneda'),
  appComoArrancariamos: () => import('@/movil/paginas/ComoArrancariamos'),
  tienda: () => import('@/tienda/paginas/Portada'),
  tiendaProducto: () => import('@/tienda/paginas/Producto'),
  tiendaBolsa: () => import('@/tienda/paginas/Bolsa'),
  tiendaPago: () => import('@/tienda/paginas/Pago'),
  tiendaPedido: () => import('@/tienda/paginas/Pedido'),
  tiendaCategoria: () => import('@/tienda/paginas/Categoria'),
  sistema: () => import('@/ui/sistema/PaginaSistema'),
} satisfies Record<Exclude<NombreRuta, 'panel'>, CargadorPagina>;

type ConPagina = Exclude<NombreRuta, 'panel'>;

function hija(nombre: ConPagina, conGuarda: boolean, indice = false): RouteObject {
  const cargar = lazyConReintento(PAGINAS[nombre]);
  const destino = indice ? { index: true as const } : { path: RUTAS[nombre].patron };
  return {
    ...destino,
    lazy: conGuarda
      ? async () => {
          const { Component: Pagina } = await cargar();
          return {
            Component: () => (
              <GuardaRol ruta={nombre}>
                <Pagina />
              </GuardaRol>
            ),
          };
        }
      : cargar,
  };
}

/** `/panel` redirige al inicio del rol (D → /panel/inicio, V → /panel/mi-dia, B → /panel/inventario). */
function InicioDelRol() {
  const rol = useRolActivo();
  return <Navigate to={INICIO_POR_ROL[rol]} replace />;
}

const nombres = (Object.keys(RUTAS) as NombreRuta[]).filter((n): n is ConPagina => n !== 'panel');
const de = (prefijo: string, excluir: ConPagina[] = []) =>
  nombres.filter((n) => !excluir.includes(n) && (RUTAS[n].patron === prefijo || RUTAS[n].patron.startsWith(`${prefijo}/`)));

const panel = de('/panel', ['sistema']);
const app = de('/app');
const tienda = de('/tienda');

export const RUTAS_ROUTER: RouteObject[] = [
  { ...hija('entrada', false), errorElement: <ErrorRuta /> },
  {
    path: '/panel',
    element: <LayoutEscritorio />,
    errorElement: <ErrorRuta />,
    children: [
      { index: true, element: <InicioDelRol /> },
      ...panel.map((n) => hija(n, true)),
      ...(import.meta.env.DEV ? [hija('sistema', false)] : []),
      { path: '*', element: <NoEncontrada /> },
    ],
  },
  {
    path: '/app',
    element: <LayoutMovil />,
    errorElement: <ErrorRuta />,
    children: [...app.map((n) => hija(n, false, n === 'app')), { path: '*', element: <NoEncontrada /> }],
  },
  {
    path: '/tienda',
    element: <LayoutTienda />,
    errorElement: <ErrorRuta />,
    children: tienda.map((n) => hija(n, false, n === 'tienda')),
  },
  {
    element: <LayoutPortal />,
    errorElement: <ErrorRuta />,
    children: [hija('seguimiento', false)],
  },
  { path: '*', element: <NoEncontrada /> },
];

export function crearRouter() {
  return createBrowserRouter(RUTAS_ROUTER);
}

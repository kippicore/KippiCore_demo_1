/**
 * Rutas internas que el dominio escribe en las notificaciones (Notificacion.enlace). Deben coincidir con
 * src/app/rutas.ts (F2-B, 5.5); F2-B puede reutilizar estas funciones.
 */
export const rutasDominio = {
  importacion: (numero: string) => `/panel/importaciones/${numero}`,
  venta: (ventaId: string) => `/panel/ventas/${ventaId}`,
  cliente: (clienteId: string) => `/panel/clientes/${clienteId}`,
  aprobaciones: () => '/app/mas/aprobar',
  traslado: (trasladoId: string) => `/panel/inventario/traslados/${trasladoId}`,
} as const;

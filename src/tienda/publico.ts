/**
 * Lo que otras capas pueden leer de la tienda (D6). El layout de la tienda pinta el contador de la bolsa con
 * `useCantidadBolsa()`, los íconos del encabezado con `AccionesEncabezadoTienda` y conserva `?marco=1` con
 * `conMarco` (compartidos C-D).
 */
export { useCantidadBolsa } from './bolsa';
export { conMarco } from './enlaces';
export { AccionesEncabezadoTienda } from './componentes/AccionesEncabezado';

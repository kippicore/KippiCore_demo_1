/**
 * Lo que otros paquetes pueden importar de Importaciones (CONTRATOS 5.3): el portal de seguimiento
 * (`src/seguimiento`) y la app del dueño (`src/movil`) pintan la misma ruta y la misma línea de tiempo que el escritorio.
 */
export { RutaChina, type BarcoRuta, type PropsRutaChina } from './componentes/RutaChina';
export { LineaTiempoImportacion } from './componentes/LineaTiempoImportacion';
export { InsigniaEstado, InsigniaRetraso, InsigniaAforo, MontoOrigen } from './componentes/Montos';
export { detalleHitos, estadosParaPortal, ESTADOS_PORTAL, posicionRuta, PROGRESO_PUERTO, textoCarga, textoCargaCorta, type DetalleHito, type PosicionRuta } from './calculos';

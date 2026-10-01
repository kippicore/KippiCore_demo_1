/**
 * Piezas del sistema de diseño SIN Radix, cmdk, Recharts, dnd-kit ni qrcode (PLAN 5.15, 5.6.12). Úsalas en la app
 * del dueño (`/app`) y en todo lo que va en el arranque: la primera pantalla de `/app` tiene un presupuesto de 2,5 s
 * con CPU ×4 y cada KB que se evalúa mientras se construye el estado lo retrasa. Para lo demás, `@/ui`.
 */
export { cn, prefiereMenosMovimiento } from './cn';
export { Icono, type TamanoIcono } from './primitivos/Icono';
export { Button, BotonEnlace, clasesBoton, type VarianteBoton, type TamanoBoton } from './primitivos/Button';
export { Badge, BadgeEstado, PuntoEstado } from './primitivos/Badge';
export { EmptyState, Skeleton, FilasEsqueleto, Retrasado } from './primitivos/Estados';
export { Avatar, GrupoAvatares, MuestraColor, CajaTalla, ChipFiltro, BarraProgreso, Stepper, ListaQueCambio, MarcaAguaDocumento, iniciales } from './primitivos/Piezas';
export { Segmentado } from './primitivos/Segmentado';
export { Timeline, TimelineCompacta, pasosImportacion } from './primitivos/Timeline';
export { Toaster, avisar, quitarAviso, type TipoAviso } from './primitivos/Toast';
export { Input, InputNumero, Textarea, Campo } from './primitivos/Input';
export { Cifra } from './texto/Cifra';
export { NotaLegal } from './texto/NotaLegal';
export { Sparkline } from './graficos/Sparkline';
export { Prenda, MiniaturaPrenda } from './prenda/Prenda';
export { Dinero, Fecha } from './conectados/Cifras';
export { Marca } from './conectados/Marca';
export { Pista, RequiereRol, SoloRol, ResaltarFila, useResaltar, AvisoNavegadorInterno, esNavegadorInterno, esIos } from './conectados/Guia';

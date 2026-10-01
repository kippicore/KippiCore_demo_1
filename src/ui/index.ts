/**
 * Sistema de diseño HALDEN (PLAN 8). Catálogo, props y ejemplos en docs/CONTRATOS.md § "Componentes de interfaz".
 * En `/app` y en piezas del arranque importa de `@/ui/ligero` (sin Radix ni librerías pesadas).
 */
export * from './ligero';
export { Tooltip, ProveedorTooltips } from './primitivos/Tooltip';
export { BotonIcono } from './primitivos/BotonIcono';
export { Popover, CerrarPopover, Menu, ItemMenu, ItemMenuEnlace, SeparadorMenu, TituloGrupoMenu } from './primitivos/Popover';
export { Dialog, CerrarDialog, type AnchoDialog } from './primitivos/Dialog';
export { Drawer, ParesDatos, type AccionCajon } from './primitivos/Drawer';
export { HojaInferior } from './primitivos/HojaInferior';
export { ConfirmarEliminacion } from './primitivos/ConfirmarEliminacion';
export { Checkbox, Switch, GrupoRadio, type OpcionRadio } from './primitivos/Controles';
export { Select, type OpcionSelect } from './primitivos/Select';
export { Tabs, PanelTab, PestanasEnlace, type Pestana } from './primitivos/Tabs';
export { Card, Kpi, Variacion, EncabezadoSeccion, EnlaceVerTodo, type VariacionKpi } from './primitivos/Card';
export { Table, FranjaResumen, BotonAccionesFila, useDensidadTabla, type ColumnaTabla, type Densidad } from './primitivos/Table';
export { Toolbar, GrupoPildora, BotonPildora, BotonFiltros, SelectorDensidad, type ChipActivo } from './primitivos/Toolbar';
export { SelectorFecha, SelectorRango, atajosRango, textoRango, type RangoFechas } from './primitivos/DatePicker';
export { Combobox, Resaltado, type GrupoCombobox, type ItemCombobox } from './primitivos/Combobox';
export { Kanban, TarjetaTablero, type ColumnaKanban, type TarjetaKanban } from './primitivos/Kanban';
export { Acordeon, type SeccionAcordeon } from './primitivos/Acordeon';
export { Termino } from './texto/Termino';
export { GraficoBase, GraficoBarras, GraficoLineas, GraficoArea, colorDeLocal, type SerieGrafico } from './graficos/GraficoBase';
export { MapaCalor, GraficoCascada, type PasoCascada } from './graficos/MapaCalor';
export { CodigoBarras } from './codigos/CodigoBarras';
export { CodigoQR, truncarAlCentro } from './codigos/CodigoQR';
export { MarcoTelefono, MarcoNavegador } from './marcos/Marcos';
export { GraficoDinero } from './conectados/GraficoDinero';
export { SelectorLocal, SelectorMoneda, SelectorRol, FranjaMoneda, useCambiarRol, useCambiarMoneda, usePersonasRol, useNombreLocal } from './conectados/Contexto';
export { MatrizExistencias } from './conectados/MatrizExistencias';
export { BuscadorProducto, BuscadorCliente } from './conectados/Buscadores';
export { ImportarExcelSimulado } from './conectados/ImportarExcelSimulado';
export { BotonExportar } from './conectados/BotonExportar';
export { BotonDocumentoPdf, type DocumentoPdf } from './conectados/BotonDocumentoPdf';

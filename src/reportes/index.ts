/** Reportes (PLAN 5.12): definiciones únicas, exportación y plantillas PDF. Ver docs/CONTRATOS.md. */
export { REPORTES, IDS_REPORTES, rangoPorDefecto, rangoDeMes } from './definiciones';
export { exportarReporte, hojasParaExportar, type ArchivoReporte } from './exportar';
export { pdfFactura, pdfDocumentoPos, pdfNotaCredito, pdfDesprendible, pdfEtiquetas, type ContextoPlantilla } from './plantillas-pdf';
export type { ColumnaReporte, ContextoExportacion, DefinicionReporte, FiltroReporte, FiltrosReporte, HojaReporte, IdReporte } from './tipos';

import { useState } from 'react';
import type { Id } from '@/dominio/tipos';
import { emitirUI, useAhora, useEstadoDominio, useMarca } from '@/estado';
import { descargarBlob } from '@/lib/descargar';

/**
 * `<BotonDocumentoPdf documento={…} />` (PLAN 5.12): descarga un documento con las PLANTILLAS PDF ÚNICAS de
 * src/reportes/plantillas-pdf.ts (factura, documento POS de 80 mm, nota crédito, desprendible de nómina,
 * hoja de etiquetas) con la marca activa, y emite `pdf_generado` con `{ reporte: <tipo> }` (6.18).
 * Complementa a `<BotonExportar reporte>` (que exporta las definiciones de reportes). Implementación funcional
 * de F2-B; F2-C le da el diseño (8.7.1). jsPDF se carga solo al hacer clic.
 *
 *   <BotonDocumentoPdf documento={{ tipo: 'desprendible', liquidacionId, empleadoId }} />   (C1)
 *   <BotonDocumentoPdf documento={{ tipo: 'factura', facturaId }} />                         (D3)
 *   <BotonDocumentoPdf documento={{ tipo: 'pos', facturaId }} />                             (A1, D3)
 *   <BotonDocumentoPdf documento={{ tipo: 'nota-credito', notaId }} />                       (D3)
 *   <BotonDocumentoPdf documento={{ tipo: 'etiquetas', varianteIds, copias: 2 }} />          (A2)
 */
export type DocumentoPdf =
  | { tipo: 'factura'; facturaId: Id }
  | { tipo: 'pos'; facturaId: Id }
  | { tipo: 'nota-credito'; notaId: Id }
  | { tipo: 'desprendible'; liquidacionId: Id; empleadoId: Id }
  | { tipo: 'etiquetas'; varianteIds: readonly Id[]; copias?: number };

export interface PropsBotonDocumentoPdf {
  documento: DocumentoPdf;
  /** Texto del botón (por defecto "Descargar PDF"). */
  etiqueta?: string;
}

export function BotonDocumentoPdf({ documento, etiqueta = 'Descargar PDF' }: PropsBotonDocumentoPdf) {
  const estado = useEstadoDominio();
  const marca = useMarca();
  const ahora = useAhora();
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const descargar = async () => {
    setPreparando(true);
    setError(null);
    try {
      const p = await import('@/reportes/plantillas-pdf');
      const ctx = { marca: marca.nombre, descriptor: marca.descriptor, ahora };
      const d = documento;
      const archivo =
        d.tipo === 'factura'
          ? await p.pdfFactura(estado, d.facturaId, ctx)
          : d.tipo === 'pos'
            ? await p.pdfDocumentoPos(estado, d.facturaId, ctx)
            : d.tipo === 'nota-credito'
              ? await p.pdfNotaCredito(estado, d.notaId, ctx)
              : d.tipo === 'desprendible'
                ? await p.pdfDesprendible(estado, d.liquidacionId, d.empleadoId, ctx)
                : await p.pdfEtiquetas(estado, d.varianteIds, ctx, d.copias ?? 1);
      descargarBlob(new Blob([archivo.datos], { type: archivo.tipo }), archivo.nombre);
      emitirUI('pdf_generado', { reporte: d.tipo });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo preparar el archivo. Intenta de nuevo.');
    } finally {
      setPreparando(false);
    }
  };

  return (
    <span data-testid={`documento-${documento.tipo}`} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <button type="button" disabled={preparando} onClick={() => void descargar()} data-formato="pdf">
        {preparando ? 'Preparando el archivo…' : etiqueta}
      </button>
      {error && (
        <span role="alert" style={{ color: '#9b2c2c', fontSize: 13 }}>
          {error}
        </span>
      )}
    </span>
  );
}

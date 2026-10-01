import { BotonDocumentoPdf, type DocumentoPdf } from '@/ui';
import { useEstadoDominio } from '@/estado';
import { TEXTOS } from '../textos';

interface Muestra {
  tipo: DocumentoPdf['tipo'];
  titulo: string;
  texto: string;
  documento: DocumentoPdf;
}

/**
 * Los formatos de documentos que el sistema imprime con la marca del negocio (plantillas PDF únicas), armados con
 * datos reales de muestra. Solo para el dueño. Lo que no existe todavía en los datos simplemente no aparece.
 */
export function Documentos() {
  const e = useEstadoDominio();
  const liq = Object.values(e.liquidaciones).find((l) => l.lineas.length > 0);
  const factura = Object.values(e.facturas).find((x) => x.tipo === 'factura_electronica');
  const pos = Object.values(e.facturas).find((x) => x.tipo === 'documento_equivalente_pos');
  const nota = Object.values(e.notasCredito)[0];
  const variantes = Object.keys(e.variantes).slice(0, 6);
  const muestras: Muestra[] = [];
  if (liq?.lineas[0]) muestras.push({ tipo: 'desprendible', titulo: 'Desprendible de nómina', texto: `El de ${liq.periodo.etiqueta}, con el detalle de lo que se paga y se descuenta.`, documento: { tipo: 'desprendible', liquidacionId: liq.id, empleadoId: liq.lineas[0].empleadoId } });
  if (factura) muestras.push({ tipo: 'factura', titulo: 'Factura electrónica', texto: 'Con los datos del negocio, el cliente, el IVA y el código de control.', documento: { tipo: 'factura', facturaId: factura.id } });
  if (pos) muestras.push({ tipo: 'pos', titulo: 'Documento equivalente POS', texto: 'El recibo de la caja, en formato de tirilla de 80 mm.', documento: { tipo: 'pos', facturaId: pos.id } });
  if (nota) muestras.push({ tipo: 'nota-credito', titulo: 'Nota crédito', texto: 'El documento que acompaña una devolución o un ajuste.', documento: { tipo: 'nota-credito', notaId: nota.id } });
  if (variantes.length) muestras.push({ tipo: 'etiquetas', titulo: 'Etiquetas con código de barras', texto: 'Una hoja de etiquetas lista para imprimir y pegar en la prenda.', documento: { tipo: 'etiquetas', varianteIds: variantes } });
  if (muestras.length === 0) return null;
  return (
    <section aria-labelledby="documentos-titulo" data-testid="reportes-documentos">
      <h2 id="documentos-titulo" className="t-h2 text-ink">
        {TEXTOS.documentos.titulo}
      </h2>
      <p className="mt-2 max-w-[72ch] t-body text-muted">{TEXTOS.documentos.subtitulo}</p>
      <ul data-testid="lista-plantillas" className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 wide:grid-cols-3">
        {muestras.map((m) => (
          <li key={m.tipo} data-plantilla={m.tipo} className="flex items-start justify-between gap-4 border border-line bg-surface p-4">
            <div className="min-w-0">
              <p className="t-label font-bold text-ink">{m.titulo}</p>
              <p className="mt-1 t-small text-muted">{m.texto}</p>
            </div>
            <BotonDocumentoPdf documento={m.documento} etiqueta="PDF" />
          </li>
        ))}
      </ul>
    </section>
  );
}

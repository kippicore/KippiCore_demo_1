import { REPORTES, IDS_REPORTES } from '@/reportes/definiciones';
import { BotonExportar } from '@/ui/conectados/BotonExportar';
import { BotonDocumentoPdf, type DocumentoPdf } from '@/ui/conectados/BotonDocumentoPdf';
import { EsqueletoPagina } from '@/ui/conectados/EsqueletoPagina';
import { useEstadoDominio, useRolActivo } from '@/estado';

/**
 * Esqueleto de F2-B (PLAN 9.1.6): D4 reemplaza esta página. Lista las definiciones únicas con sus botones de
 * exportación y, solo para el dueño, una muestra de cada plantilla PDF (prueba de humo en el navegador).
 */
export default function Reportes() {
  const rol = useRolActivo();
  const e = useEstadoDominio();
  const liq = Object.values(e.liquidaciones).find((l) => l.lineas.length > 0);
  const factura = Object.values(e.facturas).find((f) => f.tipo === 'factura_electronica');
  const pos = Object.values(e.facturas).find((f) => f.tipo === 'documento_equivalente_pos');
  const nota = Object.values(e.notasCredito)[0];
  const variantes = Object.keys(e.variantes).slice(0, 6);
  const muestras: DocumentoPdf[] = [];
  if (liq?.lineas[0]) muestras.push({ tipo: 'desprendible', liquidacionId: liq.id, empleadoId: liq.lineas[0].empleadoId });
  if (factura) muestras.push({ tipo: 'factura', facturaId: factura.id });
  if (pos) muestras.push({ tipo: 'pos', facturaId: pos.id });
  if (nota) muestras.push({ tipo: 'nota-credito', notaId: nota.id });
  if (variantes.length) muestras.push({ tipo: 'etiquetas', varianteIds: variantes });
  return (
    <>
      <EsqueletoPagina titulo="Reportes" paquete="D4" />
      <ul data-testid="lista-reportes" style={{ padding: 24, display: 'grid', gap: 12 }}>
        {IDS_REPORTES.filter((id) => REPORTES[id].roles.includes(rol)).map((id) => (
          <li key={id} data-reporte={id}>
            <strong>{REPORTES[id].titulo}</strong> · {REPORTES[id].descripcion} <BotonExportar reporte={id} />
          </li>
        ))}
      </ul>
      {rol === 'dueno' && (
        <ul data-testid="lista-plantillas" style={{ padding: 24, display: 'grid', gap: 12 }}>
          {muestras.map((d) => (
            <li key={d.tipo} data-plantilla={d.tipo}>
              <strong>Plantilla {d.tipo}</strong> <BotonDocumentoPdf documento={d} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

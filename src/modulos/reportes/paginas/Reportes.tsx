import { REPORTES, IDS_REPORTES } from '@/reportes/definiciones';
import { BotonExportar } from '@/ui/conectados/BotonExportar';
import { EsqueletoPagina } from '@/ui/conectados/EsqueletoPagina';
import { useRolActivo } from '@/estado';

/**
 * Esqueleto de F2-B (PLAN 9.1.6): D4 reemplaza esta página. Lista las definiciones únicas con sus botones de
 * exportación (prueba de humo de PDF y Excel en el navegador).
 */
export default function Reportes() {
  const rol = useRolActivo();
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
    </>
  );
}

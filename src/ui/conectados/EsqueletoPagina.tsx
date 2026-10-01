import { useLocation, useParams } from 'react-router';
import { leerParamsRuta, rutaDeUrl } from '@/app/rutas';
import { useDatos, useFiltroLocal, useRolActivo } from '@/estado';

/**
 * Página esqueleto de F2-B (PLAN 9.2 F2-B.5): título de la sección y datos crudos mínimos, SOLO para desarrollo.
 * Cada paquete reemplaza su página (src/<carpeta>/paginas/*.tsx) y deja de usar este componente.
 */
export function EsqueletoPagina({ titulo, paquete }: { titulo: string; paquete: string }) {
  const { pathname, search } = useLocation();
  const params = useParams();
  const nombre = rutaDeUrl(pathname);
  const leidos = nombre ? leerParamsRuta(nombre, params, search) : {};
  const estado = useDatos((s) => s.estado);
  const rol = useRolActivo();
  const local = useFiltroLocal();
  const conteos = estado
    ? {
        ventas: Object.keys(estado.ventas).length,
        productos: Object.keys(estado.productos).length,
        clientes: Object.keys(estado.clientes).length,
        importaciones: Object.keys(estado.importaciones).length,
        generadoHasta: estado.meta.generadoHasta,
      }
    : null;
  return (
    <section data-testid="pagina-esqueleto" data-ruta={nombre ?? ''} style={{ padding: 24 }}>
      <p style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6e6e6e' }}>
        Paquete {paquete} · ruta {nombre ?? '—'}
      </p>
      <h1 style={{ fontWeight: 900, textTransform: 'uppercase', margin: '8px 0 16px' }}>{titulo}</h1>
      <pre style={{ fontSize: 12, background: '#f4f4f4', padding: 12, whiteSpace: 'pre-wrap' }}>
        {JSON.stringify({ rol, local, parametros: leidos, datos: conteos }, null, 2)}
      </pre>
    </section>
  );
}

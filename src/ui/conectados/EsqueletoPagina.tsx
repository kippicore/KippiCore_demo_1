import { useLocation, useParams } from 'react-router';
import { leerParamsRuta, rutaDeUrl, rutas } from '@/app/rutas';
import { useDatos, useFiltroLocal, useMarca, useRolActivo } from '@/estado';
import { entero, fecha } from '@/lib/formato';
import { cn } from '../cn';
import { EncabezadoPagina } from '../primitivos/EncabezadoPagina';

/**
 * Página esqueleto (PLAN 9.2 F2-B.5): título de la sección y los datos de contexto de la ruta, SOLO mientras el
 * paquete dueño no reemplace su página. Desde F2-C usa el encabezado y las tarjetas del sistema de diseño en las
 * tres superficies (escritorio, app y tienda). Conserva `data-testid="pagina-esqueleto"`.
 */
export function EsqueletoPagina({ titulo, paquete }: { titulo: string; paquete: string }) {
  const { pathname, search } = useLocation();
  const params = useParams();
  const nombre = rutaDeUrl(pathname);
  const leidos = nombre ? leerParamsRuta(nombre, params, search) : {};
  const estado = useDatos((s) => s.estado);
  const rol = useRolActivo();
  const local = useFiltroLocal();
  const marca = useMarca();
  const superficie = pathname.startsWith('/app') ? 'app' : pathname.startsWith('/tienda') ? 'tienda' : pathname.startsWith('/seguimiento') ? 'portal' : 'panel';
  const parametros = Object.entries(leidos as Record<string, unknown>).filter(([, v]) => v !== null && v !== '');
  const pares: [string, string][] = [
    ['Paquete dueño', paquete],
    ['Rol activo', rol === 'dueno' ? 'Dueño' : rol === 'vendedor' ? 'Vendedor' : 'Bodega'],
    ['Local', local === 'todos' ? 'Todos los locales' : (estado?.locales[local]?.nombre ?? local)],
    ...(estado
      ? ([
          ['Ventas en la historia', entero(Object.keys(estado.ventas).length)],
          ['Referencias', entero(Object.keys(estado.productos).length)],
          ['Clientes', entero(Object.keys(estado.clientes).length)],
          ['Datos hasta', fecha(estado.meta.generadoHasta)],
        ] as [string, string][])
      : []),
    ...parametros.map(([k, v]) => [`Parámetro «${k}»`, typeof v === 'object' ? JSON.stringify(v) : String(v)] as [string, string]),
  ];
  return (
    <section
      data-testid="pagina-esqueleto"
      data-ruta={nombre ?? ''}
      className={cn(superficie === 'app' ? 'px-4 pt-11' : superficie === 'tienda' ? 'mx-auto max-w-[1440px] px-6 pt-28 md:px-12' : superficie === 'portal' ? 'pt-10' : '')}
    >
      {superficie === 'app' ? (
        <h1 className="t-h1-app text-ink">{titulo}</h1>
      ) : (
        <EncabezadoPagina
          migas={superficie === 'panel' ? [{ texto: 'Inicio', a: rutas.inicio() }, { texto: titulo }] : [{ texto: marca.nombre }, { texto: titulo }]}
          titulo={titulo}
          subtitulo={`Vista de desarrollo de la ruta ${nombre ?? pathname}: el paquete ${paquete} la reemplaza con su pantalla.`}
          className={superficie === 'panel' ? '' : 'pt-0'}
        />
      )}
      <dl className={cn('grid gap-px border border-line bg-line', superficie === 'app' ? 'mt-6 grid-cols-2' : 'mt-8 grid-cols-2 md:grid-cols-4')}>
        {pares.map(([k, v]) => (
          <div key={k} className="min-w-0 bg-surface px-5 py-4">
            <dt className="t-eyebrow text-ink-2">{k}</dt>
            <dd className="mt-2 truncate t-body num text-ink" title={v}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

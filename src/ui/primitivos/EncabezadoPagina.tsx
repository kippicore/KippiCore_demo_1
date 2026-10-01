import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '../cn';

/**
 * Encabezado de página del escritorio (PLAN 8.4.5): migas t-small separadas por " | " (máx. 4 niveles; la última en
 * ink sin enlace), título t-h1 (uno por pantalla; en detalles, el identificador con su insignia a la derecha),
 * subtítulo t-body muted de una frase (máx. 72 ch), acciones a la derecha alineadas con la base del título (menú
 * "Más" · secundarios · UN primario; máx. 3) y pestañas del módulo debajo. No es fijo: lo fijo es la barra superior.
 *
 *   <EncabezadoPagina migas={[{ texto: 'Inicio', a: rutas.inicio() }, { texto: 'Ventas' }]} titulo="Ventas"
 *     subtitulo="Todo lo que han vendido los tres locales, con su detalle"
 *     acciones={<><BotonExportar reporte="ventas" menu /><BotonEnlace to={rutas.pos()} icono={Plus}>Registrar venta</BotonEnlace></>}
 *     pestanas={<PestanasEnlace pestanas={…} />} />
 */
export interface Miga {
  texto: string;
  a?: string;
}

export interface PropsEncabezadoPagina {
  titulo: ReactNode;
  migas?: readonly Miga[];
  subtitulo?: ReactNode;
  /** Insignia de estado junto al título (detalles). */
  insignia?: ReactNode;
  /** Sobretítulo opcional encima del título (tipo de documento). */
  eyebrow?: ReactNode;
  acciones?: ReactNode;
  pestanas?: ReactNode;
  className?: string;
}

export function Migas({ migas }: { migas: readonly Miga[] }) {
  const visibles = migas.length > 4 ? [migas[0]!, { texto: '…' }, ...migas.slice(-2)] : migas;
  return (
    <nav aria-label="Migas de pan">
      <ol className="flex flex-wrap items-center t-small text-muted">
        {visibles.map((m, i) => {
          const ultima = i === visibles.length - 1;
          return (
            <li key={`${m.texto}-${i}`} className="inline-flex items-center">
              {i > 0 && (
                <span aria-hidden className="px-2 text-line-strong">
                  |
                </span>
              )}
              {ultima ? (
                <span aria-current="page" className="text-ink">
                  {m.texto}
                </span>
              ) : m.a ? (
                <Link to={m.a} className="hover:text-ink hover:underline hover:underline-offset-4">
                  {m.texto}
                </Link>
              ) : (
                <span title={m.texto === '…' ? migas.slice(1, -2).map((x) => x.texto).join(' | ') : undefined}>{m.texto}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function EncabezadoPagina({ titulo, migas, subtitulo, insignia, eyebrow, acciones, pestanas, className }: PropsEncabezadoPagina) {
  return (
    <header className={cn('pt-6', className)} data-testid="encabezado-pagina">
      {migas && migas.length > 0 && <Migas migas={migas} />}
      <div className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-3', migas?.length ? 'mt-2' : '')}>
        <div className="min-w-0">
          {eyebrow && <p className="mb-1.5 t-eyebrow text-ink-2">{eyebrow}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="t-h1 text-ink">{titulo}</h1>
            {insignia}
          </div>
        </div>
        {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
      </div>
      {subtitulo && <p className="mt-2 max-w-[72ch] t-body text-muted">{subtitulo}</p>}
      {pestanas && <div className="mt-6">{pestanas}</div>}
    </header>
  );
}

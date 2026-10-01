import type { ReactNode } from 'react';
import { rutas } from '@/app/rutas';
import { EncabezadoPagina, PestanasEnlace } from '@/ui';
import { TXT } from '../textos';

/**
 * Encabezado común de las cinco pantallas de Análisis: migas, título, subtítulo, acciones y las pestañas del
 * módulo (Resumen · Productos · Clientes · Locales y vendedores · Tabla dinámica).
 */
export function EncabezadoAnalisis({
  titulo,
  subtitulo,
  migaActual,
  acciones,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  /** Nombre de la pantalla en las migas (el Resumen no lo lleva). */
  migaActual?: string;
  acciones?: ReactNode;
}) {
  const migas = migaActual
    ? [{ texto: TXT.migaInicio, a: rutas.inicio() }, { texto: TXT.titulo, a: rutas.analisis() }, { texto: migaActual }]
    : [{ texto: TXT.migaInicio, a: rutas.inicio() }, { texto: TXT.titulo }];
  return (
    <EncabezadoPagina
      migas={migas}
      titulo={titulo}
      subtitulo={subtitulo}
      acciones={acciones}
      pestanas={
        <PestanasEnlace
          etiqueta="Secciones de Análisis"
          pestanas={[
            { a: rutas.analisis(), etiqueta: TXT.pestanas.resumen, fin: true },
            { a: rutas.analisisProductos(), etiqueta: TXT.pestanas.productos },
            { a: rutas.analisisClientes(), etiqueta: TXT.pestanas.clientes },
            { a: rutas.analisisLocales(), etiqueta: TXT.pestanas.locales },
            { a: rutas.tablaDinamica(), etiqueta: TXT.pestanas.tabla },
          ]}
        />
      }
    />
  );
}

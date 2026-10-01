import { rutas } from '@/app/rutas';
import { PestanasEnlace } from '@/ui';

/** Pestañas del módulo (Pedidos · Contactos de la cadena), debajo del encabezado de las dos listas. */
export function PestanasModulo({ conContactos }: { conContactos: boolean }) {
  return (
    <PestanasEnlace
      etiqueta="Importaciones"
      pestanas={[
        { a: rutas.importaciones(), etiqueta: 'Pedidos', fin: true },
        ...(conContactos ? [{ a: rutas.contactosCadena(), etiqueta: 'Contactos de la cadena', fin: true }] : []),
      ]}
    />
  );
}

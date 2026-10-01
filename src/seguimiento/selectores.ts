import type { Id } from '@/dominio/tipos';
import { crearSelector } from '@/selectores';

/** Selectores propios del portal de seguimiento (B1): la agente de aduanas que sigue el pedido. */
export interface AgenteDelPedido {
  nombre: string;
  empresa: string;
}

/** Quién reporta desde el portal: el agente de aduanas de la cadena del pedido (o, si no hay, el de carga). */
export const selAgenteDelPedido = crearSelector<{ importacionId: Id }, AgenteDelPedido | null>(
  'selAgenteDelPedido',
  ['importaciones', 'contactos'],
  (e, { importacionId }) => {
    const imp = e.importaciones[importacionId];
    if (!imp) return null;
    const cadena = imp.contactoIds
      .map((id) => e.contactos[id])
      .filter((c): c is NonNullable<typeof c> => !!c && !c.eliminadoEn);
    const c =
      cadena.find((x) => x.rol === 'agente_aduanas') ??
      cadena.find((x) => x.rol === 'agente_carga') ??
      Object.values(e.contactos).find((x) => !x.eliminadoEn && x.rol === 'agente_aduanas') ??
      null;
    return c ? { nombre: c.nombre, empresa: c.empresa } : null;
  },
);

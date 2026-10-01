import { rutas } from '@/app/rutas';
import { useSel } from '@/estado';
import { selSolicitudesPendientes } from '@/selectores';
import { Pantalla } from '../componentes/Pantalla';
import { ListaResueltas, ListaSolicitudes } from '../componentes/Solicitudes';
import { TXT } from '../textos';

/**
 * Para aprobar (W10, W11): los descuentos por encima del 15 %, los traslados y las anulaciones que esperan al dueño.
 * Aprobar o rechazar con un toque o deslizando; la decisión se registra con `resolverAprobacion` y aparece en el
 * escritorio. Debajo, lo que ya se resolvió.
 */
export default function Aprobar() {
  const n = useSel(selSolicitudesPendientes).length;
  return (
    <Pantalla testid="app-aprobar-pagina" titulo={TXT.aprobar.titulo} volver={{ a: rutas.appMas(), texto: 'Más' }} fecha={n > 0 ? `${n} esperando tu respuesta` : undefined}>
      <ListaSolicitudes />
      <ListaResueltas />
    </Pantalla>
  );
}

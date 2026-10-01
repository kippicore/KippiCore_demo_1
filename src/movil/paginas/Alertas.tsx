import { BellOff } from 'lucide-react';
import { rutas } from '@/app/rutas';
import { useAhora, useFiltroLocal, useSel, useSesion } from '@/estado';
import { selAlertas } from '@/selectores';
import { EmptyState } from '@/ui/ligero';
import { FilaAlerta } from '../componentes/FilaAlerta';
import { Pantalla } from '../componentes/Pantalla';
import { Lista, Tarjeta } from '../componentes/Tarjeta';
import { TXT } from '../textos';

/**
 * Alertas: las mismas de "Requiere tu atención" del escritorio (`selAlertas`, con el local activo y lo que ya
 * descartaste). Cada una abre su pantalla equivalente de la app cuando existe y, si no, dice que se resuelve en el
 * computador. Descartar es estado de interfaz (no toca los datos).
 */
export default function Alertas() {
  const ahora = useAhora();
  const local = useFiltroLocal();
  const descartadas = useSesion((s) => s.alertasDescartadas);
  const leidas = useSesion((s) => s.notificacionesLeidas);
  const descartar = useSesion((s) => s.descartarAlerta);
  const alertas = useSel(selAlertas, { localId: local, ahora, descartadas, leidas });
  return (
    <Pantalla testid="app-alertas" titulo={TXT.alertas.titulo} volver={{ a: rutas.appMas(), texto: 'Más' }} fecha={alertas.length > 0 ? `${alertas.length} por mirar` : undefined}>
      {alertas.length === 0 ? (
        <Tarjeta>
          <EmptyState tamano="compacto" icono={BellOff} titulo={TXT.alertas.vacio} texto={TXT.alertas.vacioTexto} />
        </Tarjeta>
      ) : (
        <Tarjeta>
          <Lista data-testid="app-lista-alertas">
            {alertas.map((a) => (
              <FilaAlerta key={a.id} a={a} alDescartar={descartar} />
            ))}
          </Lista>
        </Tarjeta>
      )}
    </Pantalla>
  );
}

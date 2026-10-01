import { rutas } from '@/app/rutas';
import { useAhora, useFiltroLocal, useMoneda, useSel, useTasasVigentes } from '@/estado';
import { dinero } from '@/lib/formato';
import { textoTasas } from '@/lib/moneda';
import { selVentas } from '@/selectores';
import { Dinero } from '@/ui/ligero';
import { OpcionesMoneda } from '../componentes/Controles';
import { Pantalla } from '../componentes/Pantalla';
import { Tarjeta } from '../componentes/Tarjeta';
import { TXT } from '../textos';

/**
 * Moneda de visualización (PRD 8): COP, USD o CNY. Cambia cómo se ven TODAS las cifras de la app (y del escritorio:
 * es el mismo estado) con la tasa vigente; los datos siguen guardados en pesos. Emite `moneda_cambiada`. La
 * muestra de abajo es la cifra de hoy convertida.
 */
export default function Moneda() {
  const hoy = useAhora().slice(0, 10);
  const local = useFiltroLocal();
  const { moneda, tasa } = useMoneda();
  const tasas = useTasasVigentes();
  const { totales } = useSel(selVentas, { desde: hoy, hasta: hoy, localId: local });
  return (
    <Pantalla testid="app-moneda-pagina" titulo={TXT.moneda.titulo} volver={{ a: rutas.appMas(), texto: 'Más' }} fecha={TXT.moneda.texto}>
      <Tarjeta data-testid="app-opciones-moneda" className="px-4">
        <OpcionesMoneda />
      </Tarjeta>
      <Tarjeta className="p-4" data-testid="app-moneda-muestra">
        <p className="t-eyebrow text-ink-2">Así se ve lo vendido hoy</p>
        <p className="mt-2">
          <Dinero valor={totales.netas} conMoneda className="t-kpi text-ink" />
        </p>
        <p className="mt-2 t-small text-muted">{moneda === 'COP' ? 'En pesos colombianos, la moneda de tus datos.' : `Convertido con la tasa vigente: 1 ${moneda} = ${dinero(tasa)}.`}</p>
      </Tarjeta>
      <p className="px-1 t-small text-muted">{textoTasas(tasas)}. La tasa se cambia en Configuración, desde el computador.</p>
    </Pantalla>
  );
}

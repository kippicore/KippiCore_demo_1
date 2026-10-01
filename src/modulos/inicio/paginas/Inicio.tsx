import { EsqueletoPagina } from '@/ui/conectados/EsqueletoPagina';
import { useAhora, useDinero, useFiltroLocal, useSel } from '@/estado';
import { selKpisInicio } from '@/selectores';

/** Esqueleto de F2-B (PLAN 9.1.6): el paquete D1 reemplaza esta página. Muestra las seis cifras en crudo. */
export default function Inicio() {
  const localId = useFiltroLocal();
  const ahora = useAhora();
  const kpis = useSel(selKpisInicio, { localId, ahora });
  const dinero = useDinero();
  return (
    <>
      <ul data-testid="kpis-inicio" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, padding: 24, listStyle: 'none' }}>
        {kpis.tarjetas.map((k) => (
          <li key={k.id} data-kpi={k.id}>
            <span style={{ display: 'block', fontSize: 12, color: '#6e6e6e' }}>{k.etiqueta}</span>
            <strong>{k.formato === 'dinero' ? dinero(k.valor) : k.valor.toLocaleString('es-CO')}</strong>
          </li>
        ))}
      </ul>
      <EsqueletoPagina titulo="Inicio" paquete="D1" />
    </>
  );
}

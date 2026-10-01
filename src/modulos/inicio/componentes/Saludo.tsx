import { useAhora, useFiltroLocal, useMarca, useSel } from '@/estado';
import { selSaludo } from '@/selectores';
import { fechaLarga, hora } from '@/lib/formato';
import { Dinero, EncabezadoPagina } from '@/ui';
import { fraseSaludo, saludoDe } from '../calculos';

/**
 * Saludo y frase del día (PLAN 2.3.1): una persona hablándole de su negocio. Tres variantes por hora; con un local
 * elegido la frase se adapta; las cifras de la frase ruedan (`<Dinero animar>`) cuando entra una venta. Si el
 * cliente escribió su nombre al personalizar, el saludo lo incluye; nunca el nombre del dueño ficticio.
 */
export function Saludo() {
  const localId = useFiltroLocal();
  const ahora = useAhora();
  const marca = useMarca();
  const datos = useSel(selSaludo, { localId, ahora });
  const frase = fraseSaludo(datos);
  return (
    <EncabezadoPagina
      titulo={saludoDe(datos.franja, marca.persona)}
      acciones={
        <p className="text-right t-small text-muted" data-testid="inicio-fecha">
          <span className="block text-ink">{fechaLarga(ahora)}</span>
          <span className="block num">
            {hora(ahora)} · {marca.nombre}
          </span>
        </p>
      }
      subtitulo={
        <span className="t-body-lg text-ink-2" data-testid="inicio-frase">
          {frase.map((s, i) => (s.tipo === 'texto' ? <span key={i}>{s.texto}</span> : <Dinero key={i} valor={s.valor} animar className="font-bold text-ink" />))}
        </span>
      }
    />
  );
}

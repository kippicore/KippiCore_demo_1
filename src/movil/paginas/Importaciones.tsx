import { Ship } from 'lucide-react';
import { rutas } from '@/app/rutas';
import { useAhora, useSel } from '@/estado';
import { plural } from '@/lib/formato';
import { selImportaciones } from '@/selectores';
import { EmptyState } from '@/ui/ligero';
import { Pantalla } from '../componentes/Pantalla';
import { Tarjeta } from '../componentes/Tarjeta';
import { TarjetaImportacion } from '../componentes/TarjetaImportacion';
import { TXT } from '../textos';

/**
 * Importaciones (PRD 6.5, PLAN 4.4): los pedidos en camino desde China con su mini línea de tiempo, cuándo llegan a
 * bodega y si van retrasados. Es la misma lista y el mismo retraso del escritorio (`selImportaciones`). Cada tarjeta
 * abre el detalle con la línea de tiempo completa.
 */
export default function Importaciones() {
  const hoy = useAhora().slice(0, 10);
  const todas = useSel(selImportaciones, { hoy });
  const enCurso = todas.filter((f) => f.importacion.estado !== 'recibido_bodega').sort((a, b) => (a.llegadaEstimada < b.llegadaEstimada ? -1 : 1));
  const recibidas = todas.filter((f) => f.importacion.estado === 'recibido_bodega' && !f.esCargaInicial).slice(0, 3);
  return (
    <Pantalla
      testid="app-importaciones"
      titulo={TXT.importaciones.titulo}
      volver={{ a: rutas.appMas(), texto: 'Más' }}
      fecha={enCurso.length > 0 ? `${plural(enCurso.length, 'pedido', 'pedidos')} en camino` : undefined}
    >
      {enCurso.length === 0 ? (
        <Tarjeta>
          <EmptyState tamano="compacto" icono={Ship} titulo={TXT.importaciones.vacio} texto={TXT.importaciones.vacioTexto} />
        </Tarjeta>
      ) : (
        enCurso.map((f) => <TarjetaImportacion key={f.importacion.id} f={f} hoy={hoy} />)
      )}
      {recibidas.length > 0 && (
        <>
          <h2 className="mt-3 flex min-h-11 items-end pb-1 t-eyebrow text-ink-2">{TXT.importaciones.recibidas}</h2>
          {recibidas.map((f) => (
            <TarjetaImportacion key={f.importacion.id} f={f} hoy={hoy} />
          ))}
        </>
      )}
    </Pantalla>
  );
}

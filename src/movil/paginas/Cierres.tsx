import { useState } from 'react';
import { Navigate } from 'react-router';
import { rutas } from '@/app/rutas';
import { useParamsRuta } from '@/app/useParamsRuta';
import { sumarDias } from '@/dominio/reglas/fechas';
import { useAhora, useEstadoDominio, useSel } from '@/estado';
import { DIAS_CORTOS, fechaLarga, plural } from '@/lib/formato';
import { cn } from '@/ui/ligero';
import { diaSemana } from '@/dominio/reglas/fechas';
import { FilaCierre } from '../componentes/FilaCierre';
import { Pantalla } from '../componentes/Pantalla';
import { Lista, Tarjeta } from '../componentes/Tarjeta';
import { selCierresApp } from '../selectores';
import { TXT } from '../textos';

/**
 * Cierres de caja de los tres locales (W11): por defecto los de anoche; una fila de siete días permite mirar los
 * anteriores. Cada fila lleva al detalle del arqueo. `?sesion=<id>` (el enlace de la alerta y de A1) abre directo
 * ese cierre.
 */
export default function Cierres() {
  const { sesion } = useParamsRuta('appCierres');
  const e = useEstadoDominio();
  if (sesion && e.sesionesCaja[sesion]) return <Navigate to={rutas.appCierre(sesion)} replace />;
  return <ListaDeCierres />;
}

function ListaDeCierres() {
  const hoy = useAhora().slice(0, 10);
  const [fecha, setFecha] = useState(sumarDias(hoy, -1));
  const cierres = useSel(selCierresApp, { fecha });
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, -(i + 1)));
  const conDiferencia = cierres.filter((c) => c.diferencia !== null && c.diferencia !== 0).length;
  const sinRevisar = cierres.filter((c) => c.estado === 'cerrada').length;
  return (
    <Pantalla testid="app-cierres-pagina" titulo={TXT.cierres.titulo} volver={{ a: rutas.app(), texto: 'Hoy' }} fecha={fechaLarga(fecha).replace(/ de \d{4}$/, '')}>
      <div role="radiogroup" aria-label="Día" className="grid grid-cols-7 gap-1">
        {dias.map((d) => {
          const activo = d === fecha;
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={activo}
              data-testid={`app-dia-${d}`}
              onClick={() => setFecha(d)}
              className={cn('flex h-14 flex-col items-center justify-center border t-label transition-colors', activo ? 'border-ink bg-ink text-inverse' : 'border-line bg-surface text-ink active:bg-surface-2')}
            >
              <span className="t-micro">{d === sumarDias(hoy, -1) ? 'Ayer' : DIAS_CORTOS[diaSemana(d)]}</span>
              <span className="num">{Number(d.slice(8, 10))}</span>
            </button>
          );
        })}
      </div>
      <Tarjeta>
        <Lista data-testid="app-lista-cierres">
          {cierres.map((c) => (
            <FilaCierre key={c.localId} c={c} />
          ))}
        </Lista>
      </Tarjeta>
      <p className="px-1 t-small text-muted" data-testid="app-cierres-resumen">
        {conDiferencia === 0 ? 'Las tres cajas cuadraron.' : `${plural(conDiferencia, 'caja cerró', 'cajas cerraron')} con diferencia.`}{' '}
        {sinRevisar > 0 ? `${plural(sinRevisar, 'cierre falta', 'cierres faltan')} por revisar.` : 'Todo revisado.'}
      </p>
    </Pantalla>
  );
}

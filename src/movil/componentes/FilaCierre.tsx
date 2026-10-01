import { Check } from 'lucide-react';
import { rutas } from '@/app/rutas';
import { hora } from '@/lib/formato';
import { Dinero, Icono, PuntoEstado } from '@/ui/ligero';
import type { CierreApp } from '../selectores';
import { TXT } from '../textos';
import { FilaLista } from './Tarjeta';

/**
 * Estado de una caja en palabras Y con punto de color (el color nunca es la única señal, 8.7.10): "Cuadró" con punto
 * `success`, "Faltan $ 40.000" con punto `danger`, "Sin cierre" neutro. Si el dueño ya lo revisó, lo dice debajo.
 */
export function EstadoCierre({ c }: { c: CierreApp }) {
  if (c.estado === 'sin_abrir')
    return (
      <PuntoEstado tono="neutral" className="t-small text-muted">
        Sin abrir
      </PuntoEstado>
    );
  if (c.estado === 'abierta')
    return (
      <PuntoEstado tono="neutral" className="t-small text-muted">
        Abierta
      </PuntoEstado>
    );
  if (c.diferencia === 0)
    return (
      <PuntoEstado tono="success" className="t-small text-ink">
        {TXT.cierres.cuadro}
      </PuntoEstado>
    );
  return (
    <PuntoEstado tono="danger" className="t-small text-ink">
      <span>
        {(c.diferencia ?? 0) < 0 ? 'Faltan' : 'Sobran'} <Dinero valor={Math.abs(c.diferencia ?? 0)} />
      </span>
    </PuntoEstado>
  );
}

/** Fila de una caja: local, quién cerró y a qué hora, estado a la derecha y, si ya lo revisó el dueño, "Revisado". */
export function FilaCierre({ c, resaltada }: { c: CierreApp; resaltada?: boolean }) {
  const quien = c.estado === 'sin_abrir' ? 'No abrió ese día' : c.cerroEn ? `${c.nombreCorto} · ${hora(c.cerroEn)}` : `Abrió ${c.nombreCorto}`;
  return (
    <FilaLista
      data-testid="app-cierre"
      data-sesion={c.sesionId ?? undefined}
      a={c.sesionId ? rutas.appCierre(c.sesionId) : undefined}
      principal={c.localNombre}
      secundaria={quien}
      resaltada={resaltada}
      derecha={
        <span className="flex flex-col items-end gap-0.5">
          <EstadoCierre c={c} />
          {c.revisado && (
            <span className="inline-flex items-center gap-1 t-small text-muted">
              <Icono icono={Check} tamano={12} /> {TXT.cierres.revisado}
            </span>
          )}
        </span>
      }
    />
  );
}

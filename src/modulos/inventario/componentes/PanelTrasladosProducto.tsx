import { ArrowRight, PackageCheck, Send } from 'lucide-react';
import { Link } from 'react-router';
import type { Id } from '@/dominio/tipos';
import { useAcciones, usePuede, useSel } from '@/estado';
import { rutas } from '@/app/rutas';
import { entero, plural } from '@/lib/formato';
import { avisar, Button, Fecha } from '@/ui';
import { accionesTraslado } from '../calculos';
import { selTrasladosProducto } from '../selectores';
import { BadgeTraslado } from './comun';

/**
 * Traslados de la referencia: los abiertos y los últimos cerrados. Desde aquí se despacha y se recibe sin salir
 * de la ficha, y la matriz de arriba se mueve en vivo (sale del origen al despachar, entra al destino al recibir).
 */
export function PanelTrasladosProducto({ productoId }: { productoId: Id }) {
  const lista = useSel(selTrasladosProducto, { productoId });
  const acciones = useAcciones();
  const puede = usePuede();
  if (lista.length === 0) return null;

  const despachar = (id: Id, numero: string) => {
    const r = acciones.despacharTraslado({ trasladoId: id });
    if (!r.ok) return avisar({ tipo: 'error', texto: r.error.mensaje });
    avisar({ tipo: 'exito', texto: `${numero} va en tránsito`, detalle: 'Las existencias ya salieron del origen; llegan al destino cuando se reciba.' });
  };
  const recibir = (id: Id, numero: string) => {
    const r = acciones.recibirTraslado({ trasladoId: id, recibidas: null, nota: null });
    if (!r.ok) return avisar({ tipo: 'error', texto: r.error.mensaje });
    avisar({ tipo: 'exito', texto: `${numero} recibido`, detalle: 'Las existencias ya están en el destino.' });
  };

  return (
    <section aria-labelledby="t-traslados" data-testid="traslados-producto">
      <h2 id="t-traslados" className="t-h2 text-ink">
        Traslados de esta referencia
      </h2>
      <ul className="mt-4 divide-y divide-line-soft border border-line bg-surface">
        {lista.map(({ traslado: t, origen, destino, lineas, unidades }) => {
          const a = accionesTraslado(t);
          return (
            <li key={t.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4" data-testid={`traslado-${t.numero}`} data-estado={t.estado}>
              <Link to={rutas.traslado(t.id)} className="t-ref font-bold text-ink underline-offset-4 hover:underline">
                {t.numero}
              </Link>
              <span className="inline-flex items-center gap-2 t-body text-ink">
                {origen}
                <ArrowRight size={14} aria-hidden className="text-ink-2" />
                {destino}
              </span>
              <span className="min-w-0 flex-1 t-small text-muted num">
                {plural(unidades, 'unidad', 'unidades')} · {lineas.map((l) => `${l.color} ${l.talla} × ${entero(l.cantidad)}`).join(', ')}
              </span>
              <span className="t-small text-muted">
                <Fecha valor={t.fechas.solicitado} formato="relativa" />
              </span>
              <BadgeTraslado estado={t.estado} />
              {t.aprobacion === 'pendiente' && t.estado === 'solicitado' && <span className="t-small text-ink-2">Espera la aprobación del dueño</span>}
              {puede('traslado.despachar') && a.despachar && (
                <Button tamano="sm" variante="secondary" icono={Send} onClick={() => despachar(t.id, t.numero)} data-testid={`despachar-${t.numero}`}>
                  Despachar
                </Button>
              )}
              {puede('traslado.recibir') && a.recibir && (
                <Button tamano="sm" icono={PackageCheck} onClick={() => recibir(t.id, t.numero)} data-testid={`recibir-${t.numero}`}>
                  Marcar recibido
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

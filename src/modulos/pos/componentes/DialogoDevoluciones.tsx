import { ArrowRight, Receipt } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Id } from '@/dominio/tipos';
import { sumarDias } from '@/dominio/reglas/fechas';
import { rutas } from '@/app/rutas';
import { ESTADOS_VENTA } from '@/config/estados';
import { useEstadoDominio, useHoy, useSel } from '@/estado';
import { selVentas, nombreCliente } from '@/selectores';
import { fechaCorta, hora } from '@/lib/formato';
import { BadgeEstado, Button, Dialog, Dinero, EmptyState, Input, Retrasado, Skeleton } from '@/ui';

/**
 * Entrada a "Cambios y devoluciones" (PRD 7.2): se busca la venta por su número ("V-000482") o por el cliente y se
 * abre su pantalla de devolución (`/panel/ventas/:id/devolucion`, de Ventas). Solo ventas del plazo de devolución.
 */
export interface PropsDialogoDevoluciones {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  localId: Id;
}

export function DialogoDevoluciones({ abierto, alCambiar, localId }: PropsDialogoDevoluciones) {
  const [texto, setTexto] = useState('');
  return (
    <Dialog
      abierto={abierto}
      alCambiar={(a) => {
        if (!a) setTexto('');
        alCambiar(a);
      }}
      eyebrow="Punto de venta"
      titulo="Cambios y devoluciones"
      descripcion="Busca la venta por su número o por el nombre del cliente. Se pueden devolver prendas dentro del plazo de la tienda."
      ancho="md"
      data-testid="pos-dialogo-devoluciones"
    >
      {abierto && <Buscador texto={texto} alTexto={setTexto} localId={localId} alElegir={() => alCambiar(false)} />}
    </Dialog>
  );
}

function Buscador({ texto, alTexto, localId, alElegir }: { texto: string; alTexto: (t: string) => void; localId: Id; alElegir: () => void }) {
  const e = useEstadoDominio();
  const hoy = useHoy();
  const navegar = useNavigate();
  const diferido = useDeferredValue(texto.trim());
  const plazo = e.parametros.ventas.diasMaximoDevolucion;
  const { filas } = useSel(selVentas, { desde: sumarDias(hoy, -plazo), hasta: hoy, localId, ...(diferido ? { texto: diferido } : {}) });
  const visibles = filas.slice(0, 7);
  const buscando = diferido !== texto.trim();
  return (
    <div className="flex flex-col gap-3">
      <Input buscar etiqueta="Número de venta o cliente" etiquetaOculta placeholder="V-000482 o nombre del cliente" value={texto} onChange={(ev) => alTexto(ev.target.value)} data-testid="pos-devolucion-buscar" />
      <div aria-live="polite" className="min-h-[200px]">
        {buscando ? (
          <Retrasado>
            <div className="flex flex-col gap-2" role="status" aria-label="Buscando">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </Retrasado>
        ) : visibles.length === 0 ? (
          <EmptyState tamano="compacto" icono={Receipt} titulo="No encontramos esa venta" texto={`Revisa el número o el nombre. Solo se muestran las ventas de este local de los últimos ${plazo} días.`} />
        ) : (
          <ul className="divide-y divide-line-soft border-y border-line-soft" data-testid="pos-devolucion-resultados">
            {!diferido && <li className="py-2 t-eyebrow text-ink-2">Las más recientes de este local</li>}
            {visibles.map((f) => {
              const puede = f.estado !== 'anulada' && f.estado !== 'devuelta';
              return (
                <li key={f.id} className="flex items-center gap-3 py-2" data-testid="pos-devolucion-fila">
                  <div className="min-w-0 flex-1">
                    <p className="truncate t-label text-ink">
                      <span className="num">{f.numero}</span> · {nombreCliente(f.clienteId ? e.clientes[f.clienteId] : null)}
                    </p>
                    <p className="t-small num text-muted">
                      {f.ts.slice(0, 10) === hoy ? 'Hoy' : fechaCorta(f.ts)} · {hora(f.ts)} · {f.unidades} {f.unidades === 1 ? 'prenda' : 'prendas'}
                    </p>
                  </div>
                  <BadgeEstado estado={ESTADOS_VENTA[f.estado]} tamano="sm" />
                  <span className="w-24 text-right t-label num text-ink">
                    <Dinero valor={f.total} />
                  </span>
                  <Button
                    variante="secondary"
                    tamano="sm"
                    iconoDerecha={ArrowRight}
                    disabled={!puede}
                    motivo={f.estado === 'anulada' ? 'La venta está anulada' : 'Ya se devolvió completa'}
                    onClick={() => {
                      alElegir();
                      navegar(rutas.devolucion(f.id));
                    }}
                    data-testid="pos-devolucion-abrir"
                  >
                    Devolver
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

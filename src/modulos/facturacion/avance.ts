import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { EstadoFactura, FechaHoraISO, Id } from '@/dominio/tipos';
import { useAcciones, useAhora } from '@/estado';
import { estadoMostradoNota, ORDEN_ESTADOS, RETRASO_AVANCE_MS, siguienteEstado } from './calculos';

/**
 * Transición automática corta (PRD 7.13): una factura recién emitida pasa sola de "generada" a "enviada a la DIAN
 * (simulación)" y luego a "aceptada", con el comando real `factura.avanzarEstado` (queda en el registro y en el
 * historial del documento). Si la persona se va de la pantalla, el avance se detiene y sigue en su próxima visita.
 */
export function useAvanceSimulado(documentos: readonly { id: Id; estado: EstadoFactura }[]): void {
  const acciones = useAcciones();
  const ref = useRef(acciones);
  ref.current = acciones;
  const pendientes = documentos.filter((d) => d.estado === 'generada' || d.estado === 'enviada');
  const pendientesRef = useRef(pendientes);
  pendientesRef.current = pendientes;
  const clave = JSON.stringify(pendientes.map((d) => [d.id, d.estado]));
  useEffect(() => {
    const temporizadores = pendientesRef.current.map((d) => {
      const siguiente = siguienteEstado(d.estado);
      const espera = d.estado === 'generada' ? RETRASO_AVANCE_MS.generada : RETRASO_AVANCE_MS.enviada;
      return setTimeout(() => {
        if (siguiente) ref.current.avanzarEstadoFactura({ facturaId: d.id, estado: siguiente });
      }, espera);
    });
    return () => temporizadores.forEach(clearTimeout);
  }, [clave]);
}

// ---------------------------------------------------------------------------------------------------------
// Notas crédito: el dominio no tiene un comando para avanzar su estado (solo `factura.avanzarEstado`), así que el
// avance de una nota recién emitida es de presentación: se guarda en este módulo mientras la pestaña vive y se
// combina con el reloj de la app (`estadoMostradoNota`). Tras recargar, manda el reloj.
// ---------------------------------------------------------------------------------------------------------
const avanceNotas = new Map<Id, EstadoFactura>();
const oyentes = new Set<() => void>();
let version = 0;

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function fijarAvanceNota(id: Id, estado: EstadoFactura): void {
  const actual = avanceNotas.get(id);
  if (actual && ORDEN_ESTADOS.indexOf(actual) >= ORDEN_ESTADOS.indexOf(estado)) return;
  avanceNotas.set(id, estado);
  version += 1;
  oyentes.forEach((o) => o());
}

type NotaMin = { id: Id; estado: EstadoFactura; ts: FechaHoraISO };

/** Estado visible de una nota: el mayor entre el del reloj y el del avance de esta sesión. */
export function useEstadoNota(): (n: NotaMin) => EstadoFactura {
  const v = useSyncExternalStore(suscribir, () => version);
  const ahora = useAhora();
  // La función cambia solo cuando avanza una nota o pasa un minuto: los `useMemo` que la usan no se recalculan de más.
  return useMemo(
    () => (n: NotaMin) => {
      const reloj = estadoMostradoNota(n, ahora);
      const local = v >= 0 ? avanceNotas.get(n.id) : undefined;
      return local && ORDEN_ESTADOS.indexOf(local) > ORDEN_ESTADOS.indexOf(reloj) ? local : reloj;
    },
    [v, ahora],
  );
}

/** Avanza solo las notas emitidas por la persona (nacen "generada"), con los mismos tiempos que las facturas. */
export function useAvanceNotas(notas: readonly NotaMin[]): void {
  const visible = useEstadoNota();
  const pendientes = notas
    .filter((n) => n.estado === 'generada')
    .map((n) => ({ id: n.id, estado: visible(n) }))
    .filter((n) => n.estado !== 'aceptada');
  const ref = useRef(pendientes);
  ref.current = pendientes;
  const clave = JSON.stringify(pendientes.map((n) => [n.id, n.estado]));
  useEffect(() => {
    const temporizadores = ref.current.map((n) => {
      const siguiente = siguienteEstado(n.estado);
      const espera = n.estado === 'generada' ? RETRASO_AVANCE_MS.generada : RETRASO_AVANCE_MS.enviada;
      return setTimeout(() => {
        if (siguiente) fijarAvanceNota(n.id, siguiente);
      }, espera);
    });
    return () => temporizadores.forEach(clearTimeout);
  }, [clave]);
}

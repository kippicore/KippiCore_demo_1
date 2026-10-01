import { useEffect, useRef } from 'react';
import type { EstadoFactura, Id } from '@/dominio/tipos';
import { useAcciones } from '@/estado';
import { RETRASO_AVANCE_MS, siguienteEstado } from './calculos';

/**
 * Transición automática corta (PRD 7.13): un documento recién emitido pasa solo de "generada" a "enviada a la DIAN
 * (simulación)" y luego a "aceptada", con el comando real (`factura.avanzarEstado` o, desde compartidos C-D,
 * `notaCredito.avanzarEstado`): queda en el registro y en el documento. Si la persona se va de la pantalla, el
 * avance se detiene y sigue en su próxima visita.
 */
export function useAvanceSimulado(documentos: readonly { id: Id; estado: EstadoFactura }[], tipo: 'factura' | 'nota' = 'factura'): void {
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
        if (!siguiente) return;
        if (tipo === 'nota') ref.current.avanzarEstadoNotaCredito({ notaId: d.id, estado: siguiente });
        else ref.current.avanzarEstadoFactura({ facturaId: d.id, estado: siguiente });
      }, espera);
    });
    return () => temporizadores.forEach(clearTimeout);
  }, [clave, tipo]);
}

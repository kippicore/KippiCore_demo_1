/// <reference lib="webworker" />
import { construirEstado } from '@/generador';
import type { MensajeAlWorker, MensajeDelWorker } from './protocolo';

/**
 * Worker del motor (PLAN 5.6.12): construye los 18 meses con el generador y entrega el estado al hilo principal.
 * Se termina tras entregar (lo hace el cliente con `terminate()`): no retiene ≈ 50 MB de memoria.
 */
declare const self: DedicatedWorkerGlobalScope;

function enviar(m: MensajeDelWorker, transferibles: Transferable[] = []): void {
  self.postMessage(m, transferibles);
}

/** Espera activa: simula una CPU más lenta (solo medición). */
function frenar(desde: number, lentitud: number): void {
  if (lentitud <= 1) return;
  const hasta = performance.now() + (performance.now() - desde) * (lentitud - 1);
  while (performance.now() < hasta) {
    // espera activa
  }
}

self.onmessage = (ev: MessageEvent<MensajeAlWorker>) => {
  const { id, entrada } = ev.data;
  const lentitud = entrada.lentitud ?? 1;
  try {
    const t0 = performance.now();
    const g = construirEstado({
      ancla: entrada.ancla,
      ahora: entrada.ahora,
      semilla: entrada.semilla,
      escala: entrada.escala,
      registro: entrada.registro,
    });
    let ultimo = -1;
    let tPaso = performance.now();
    let paso = g.next();
    frenar(tPaso, lentitud);
    while (!paso.done) {
      const p = paso.value.porcentaje;
      if (p >= ultimo + 4) {
        ultimo = p;
        enviar({ tipo: 'progreso', id, porcentaje: p });
      }
      tPaso = performance.now();
      paso = g.next();
      frenar(tPaso, lentitud);
    }
    const estado = paso.value;
    const msConstruccion = performance.now() - t0;
    if (entrada.transferencia === 'json') {
      const t1 = performance.now();
      const buffer = new TextEncoder().encode(JSON.stringify(estado)).buffer as ArrayBuffer;
      frenar(t1, lentitud);
      enviar({ tipo: 'listo-json', id, buffer, msConstruccion, msSerializacion: performance.now() - t1 }, [buffer]);
    } else {
      enviar({ tipo: 'listo', id, estado, msConstruccion });
    }
  } catch (e) {
    enviar({ tipo: 'error', id, mensaje: e instanceof Error ? e.message : String(e) });
  }
};

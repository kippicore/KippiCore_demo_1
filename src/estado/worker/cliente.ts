import type { EstadoDominio } from '@/dominio/tipos';
import { ahoraMs } from '../reloj';
import type { EntradaWorker, MensajeAlWorker, MensajeDelWorker } from './protocolo';

/**
 * Cliente del motor (PLAN 5.6.12). Estrategias medidas en F2-B (docs/informes/F2-B.md, DECISIONES):
 * - 'hilo' (POR DEFECTO): construye en el hilo principal por tramos de ≈ 12 ms, cediendo el control entre
 *   tramos. Con CPU ×4 llega antes al primer render útil y su tarea más larga es ≈ 4 veces menor que la del worker.
 * - 'worker': construye en un Web Worker y entrega el objeto por clonación estructurada (≈ 0,7 s de tarea larga
 *   en el hilo principal con CPU ×4 al deserializar ≈ 50 MB).
 * - 'json': construye en el worker y entrega texto UTF-8 transferido que el hilo principal parsea (más lento).
 * La estrategia se puede forzar para medir con `?motor=worker|json|hilo`.
 */
export type Estrategia = 'worker' | 'json' | 'hilo';

export interface Medicion {
  estrategia: Estrategia;
  /** Construcción (en el worker o en el hilo). */
  msConstruccion: number;
  /** Serialización en el worker (solo 'json'). */
  msSerializacion: number;
  /** Desde que llega el mensaje hasta tener el objeto en el hilo principal (clonación o JSON.parse). */
  msTransferencia: number;
  /** De la solicitud al estado disponible. */
  msTotal: number;
  /** Momento de la solicitud, en ms desde el inicio de la navegación (`performance.now()`). */
  msInicio: number;
}

/** ms desde el inicio de la navegación (solo para la medición del arranque). */
function desdeNavegacion(): number {
  return typeof performance !== 'undefined' ? performance.now() : 0;
}

export interface ResultadoMotor {
  estado: EstadoDominio;
  medicion: Medicion;
}

export function estrategiaPedida(): Estrategia {
  try {
    const m = new URLSearchParams(globalThis.location?.search ?? '').get('motor');
    if (m === 'worker' || m === 'json' || m === 'hilo') return m;
  } catch {
    // sin location
  }
  // Medido en F2-B (CPU ×4): el hilo principal por tramos llega antes al primer render útil y no congela la
  // interfaz (sin la clonación de ≈ 50 MB). El worker queda como alternativa medible (docs/informes/F2-B.md).
  return 'hilo';
}

/** Solo medición: lentitud simulada del worker (`?lentitudWorker=4`). */
function lentitudPedida(): number {
  try {
    const n = Number(new URLSearchParams(globalThis.location?.search ?? '').get('lentitudWorker'));
    return Number.isFinite(n) && n > 1 ? n : 1;
  } catch {
    return 1;
  }
}

let siguienteId = 1;

function enWorker(
  entrada: Omit<EntradaWorker, 'transferencia'>,
  transferencia: 'clon' | 'json',
  alProgreso: (p: number) => void,
): Promise<ResultadoMotor> {
  const t0 = ahoraMs();
  const msInicio = desdeNavegacion();
  return new Promise((resolver, rechazar) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./motor.worker.ts', import.meta.url), { type: 'module', name: 'motor' });
    } catch (e) {
      rechazar(e);
      return;
    }
    const id = siguienteId++;
    worker.onmessage = (ev: MessageEvent<MensajeDelWorker>) => {
      const m = ev.data;
      if (m.id !== id) return;
      if (m.tipo === 'progreso') {
        alProgreso(m.porcentaje);
        return;
      }
      const llegada = ahoraMs();
      worker.terminate();
      if (m.tipo === 'error') {
        rechazar(new Error(m.mensaje));
        return;
      }
      if (m.tipo === 'listo-json') {
        const estado = JSON.parse(new TextDecoder().decode(m.buffer)) as EstadoDominio;
        const fin = ahoraMs();
        resolver({
          estado,
          medicion: {
            estrategia: 'json',
            msConstruccion: m.msConstruccion,
            msSerializacion: m.msSerializacion,
            msTransferencia: fin - llegada,
            msTotal: fin - t0,
            msInicio,
          },
        });
        return;
      }
      // La clonación estructurada ocurre al leer ev.data (antes de este punto); se mide aparte con
      // performance (el evento 'message' bloquea el hilo mientras deserializa).
      const fin = ahoraMs();
      resolver({
        estado: m.estado,
        medicion: {
          estrategia: 'worker',
          msConstruccion: m.msConstruccion,
          msSerializacion: 0,
          msTransferencia: Math.max(0, fin - t0 - m.msConstruccion),
          msTotal: fin - t0,
          msInicio,
        },
      });
    };
    worker.onerror = (ev) => {
      worker.terminate();
      rechazar(new Error(ev.message || 'El worker del motor falló'));
    };
    const msg: MensajeAlWorker = {
      tipo: 'construir',
      id,
      entrada: { ...entrada, transferencia, lentitud: lentitudPedida() },
    };
    worker.postMessage(msg);
  });
}

/** Cede el control al navegador (entre tramos de la construcción en el hilo principal). */
function ceder(): Promise<void> {
  const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (s?.yield) return s.yield();
  return new Promise((r) => {
    const c = new MessageChannel();
    c.port1.onmessage = () => r();
    c.port2.postMessage(null);
  });
}

const TRAMO_MS = 30;
const PROGRESO_MS = 150;

async function enHilo(
  entrada: Omit<EntradaWorker, 'transferencia'>,
  alProgreso: (p: number) => void,
): Promise<ResultadoMotor> {
  const t0 = ahoraMs();
  const msInicio = desdeNavegacion();
  // Carga diferida: el generador solo entra al hilo principal si hace falta el respaldo.
  const { construirEstado } = await import('@/generador');
  const g = construirEstado({
    ancla: entrada.ancla,
    ahora: entrada.ahora,
    semilla: entrada.semilla,
    escala: entrada.escala,
    registro: entrada.registro,
  });
  // Tramos de ≈ TRAMO_MS (bajo el umbral de 50 ms de una tarea larga) y progreso a la interfaz cada
  // ≈ PROGRESO_MS: cada aviso re-renderiza la pantalla de carga y, con la CPU lenta, eso se nota.
  let tramo = ahoraMs();
  let avisado = tramo;
  let paso = g.next();
  while (!paso.done) {
    const t = ahoraMs();
    if (t - tramo > TRAMO_MS) {
      if (t - avisado > PROGRESO_MS) {
        alProgreso(paso.value.porcentaje);
        avisado = t;
      }
      await ceder();
      tramo = ahoraMs();
    }
    paso = g.next();
  }
  const ms = ahoraMs() - t0;
  return {
    estado: paso.value,
    medicion: { estrategia: 'hilo', msConstruccion: ms, msSerializacion: 0, msTransferencia: 0, msTotal: ms, msInicio },
  };
}

/** Construye el estado con la estrategia pedida; si el worker falla, cae al hilo principal por tramos. */
export async function construirConMotor(
  entrada: Omit<EntradaWorker, 'transferencia'>,
  alProgreso: (p: number) => void,
  estrategia: Estrategia = estrategiaPedida(),
): Promise<ResultadoMotor> {
  if (estrategia === 'hilo') return enHilo(entrada, alProgreso);
  try {
    return await enWorker(entrada, estrategia === 'json' ? 'json' : 'clon', alProgreso);
  } catch {
    return enHilo(entrada, alProgreso);
  }
}

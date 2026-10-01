/**
 * `beforeinstallprompt` (Android/Chrome) llega temprano, antes de que el cliente abra "Más". Este módulo diminuto lo
 * escucha desde la primera pantalla de /app y lo guarda para que "Instalar app" funcione después. Sin dependencias.
 */
export interface EventoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let guardado: EventoInstalacion | null = null;
const oyentes = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    guardado = e as EventoInstalacion;
    oyentes.forEach((f) => f());
  });
  window.addEventListener('appinstalled', () => {
    guardado = null;
    oyentes.forEach((f) => f());
  });
}

export const eventoInstalacion = (): EventoInstalacion | null => guardado;
export function olvidarEventoInstalacion(): void {
  guardado = null;
  oyentes.forEach((f) => f());
}
export function suscribirInstalacion(f: () => void): () => void {
  oyentes.add(f);
  return () => {
    oyentes.delete(f);
  };
}

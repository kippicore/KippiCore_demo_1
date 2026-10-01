import type { EntradaRegistro, FechaISO } from '@/dominio/tipos';
import { DEMO } from '@/config/demo';
import { clave } from './almacen';
import { esModoQa } from './reloj';

/**
 * Sincronización entre pestañas (PLAN 5.6.8): `BroadcastChannel('kc:halden')` como canal principal (funciona
 * aunque localStorage falle); el evento `storage` solo como respaldo. La pestaña que recibe una entrada la
 * fusiona y SIEMPRE reconstruye (nunca aplica en vivo una entrada remota).
 */
export type MensajeSincronizacion =
  | { tipo: 'entrada'; pestana: string; ancla: FechaISO; entrada: EntradaRegistro }
  | { tipo: 'restaurar'; pestana: string; ancla: FechaISO };

export interface ManejadorSincronizacion {
  alRecibirEntrada: (ancla: FechaISO, entrada: EntradaRegistro) => void;
  alRestaurar: (ancla: FechaISO) => void;
  /** Respaldo sin BroadcastChannel: el registro guardado cambió. */
  alCambiarRegistroGuardado: () => void;
}

export const ID_PESTANA = `p${Math.floor(Math.random() * 1e9).toString(36)}`;

let canal: BroadcastChannel | null = null;

function nombreCanal(): string {
  return `kc:${DEMO.claveAlmacenamiento}${esModoQa() ? ':qa' : ''}`;
}

export function iniciarSincronizacion(m: ManejadorSincronizacion): () => void {
  const limpiar: (() => void)[] = [];
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      canal = new BroadcastChannel(nombreCanal());
      canal.onmessage = (ev: MessageEvent<MensajeSincronizacion>) => {
        const d = ev.data;
        if (!d || d.pestana === ID_PESTANA) return;
        if (d.tipo === 'entrada') m.alRecibirEntrada(d.ancla, d.entrada);
        else if (d.tipo === 'restaurar') m.alRestaurar(d.ancla);
      };
      limpiar.push(() => canal?.close());
    } catch {
      canal = null;
    }
  }
  if (!canal && typeof window !== 'undefined') {
    const oyente = (ev: StorageEvent) => {
      if (ev.key === clave('registro')) m.alCambiarRegistroGuardado();
    };
    window.addEventListener('storage', oyente);
    limpiar.push(() => window.removeEventListener('storage', oyente));
  }
  return () => limpiar.forEach((f) => f());
}

type SinPestana<T> = T extends unknown ? Omit<T, 'pestana'> : never;

export function difundir(m: SinPestana<MensajeSincronizacion>): void {
  try {
    canal?.postMessage({ ...m, pestana: ID_PESTANA });
  } catch {
    // sin canal: el evento storage hace de respaldo
  }
}

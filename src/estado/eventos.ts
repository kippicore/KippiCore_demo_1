import type {
  EntradaRegistro,
  EventoDominio,
  EventoUI,
  Id,
  Origen,
  SobreComando,
  TipoEventoDominio,
} from '@/dominio/tipos';

/**
 * Bus de eventos (PLAN 6.18, 5.7). Entrega cada evento de dominio con el `origen`, el `usuarioId` y el `rol` del
 * sobre que lo produjo, para distinguir las acciones del usuario de las del generador. Los eventos de interfaz
 * (`EventoUI`) los emiten los paquetes con `emitirUI` (catálogo EVENTOS_UI en src/app/rutas.ts).
 * Los marcos (`?marco=1`) adoptan el bus de la pestaña padre (5.6.8).
 */
export interface ContextoEvento {
  origen: Origen;
  usuarioId: Id;
  rol: SobreComando['rol'];
  /** Id de la entrada del registro que lo produjo. */
  entradaId: Id;
}

export type EventoDominioConContexto<T extends TipoEventoDominio = TipoEventoDominio> = Extract<
  EventoDominio,
  { tipo: T }
> & { contexto: ContextoEvento };

export interface EventoUIEmitido {
  tipo: EventoUI;
  /** Datos opcionales (p. ej. `{ reporte: 'contador' }` en excel_generado, `{ a: 'vendedor' }` en rol_cambiado). */
  datos: Record<string, string | number | boolean | null>;
}

/** Una entrada que llegó de otra pestaña (o del QR) y provocó una reconstrucción (toast remoto de W3). */
export interface EntradaRemota {
  entrada: EntradaRegistro;
  /** Frase lista para el toast ("Carolina Mejía reportó el levante de IMP-2026-06"). */
  texto: string;
}

type Oyente<T> = (x: T) => void;

export interface Bus {
  dominio: Set<Oyente<EventoDominioConContexto>>;
  ui: Set<Oyente<EventoUIEmitido>>;
  remotas: Set<Oyente<EntradaRemota>>;
  /** Últimos eventos de interfaz (para la guía, si se monta tarde). */
  historialUI: EventoUIEmitido[];
}

function crearBus(): Bus {
  return { dominio: new Set(), ui: new Set(), remotas: new Set(), historialUI: [] };
}

function busDelPadre(): Bus | null {
  try {
    const w = globalThis as unknown as { parent?: { __kcBus?: Bus }; location?: Location };
    const enMarco = w.parent && w.parent !== (globalThis as unknown) && new URLSearchParams(w.location?.search ?? '').get('marco') === '1';
    return enMarco ? (w.parent?.__kcBus ?? null) : null;
  } catch {
    return null;
  }
}

export const bus: Bus = busDelPadre() ?? crearBus();
(globalThis as unknown as { __kcBus?: Bus }).__kcBus = bus;

export function emitirDominio(eventos: readonly EventoDominio[], sobre: SobreComando): void {
  const contexto: ContextoEvento = {
    origen: sobre.origen,
    usuarioId: sobre.usuarioId,
    rol: sobre.rol,
    entradaId: sobre.id,
  };
  for (const e of eventos) {
    const conCtx = { ...e, contexto } as EventoDominioConContexto;
    for (const o of [...bus.dominio]) o(conCtx);
  }
}

/** Emite un evento de interfaz para la guía (6.18). */
export function emitirUI(tipo: EventoUI, datos: EventoUIEmitido['datos'] = {}): void {
  const e: EventoUIEmitido = { tipo, datos };
  bus.historialUI.push(e);
  if (bus.historialUI.length > 50) bus.historialUI.shift();
  for (const o of [...bus.ui]) o(e);
}

export function emitirRemota(r: EntradaRemota): void {
  for (const o of [...bus.remotas]) o(r);
}

export function suscribirDominio<T extends TipoEventoDominio>(
  tipo: T | '*',
  oyente: Oyente<EventoDominioConContexto<T>>,
): () => void {
  const f: Oyente<EventoDominioConContexto> = (e) => {
    if (tipo === '*' || e.tipo === tipo) oyente(e as EventoDominioConContexto<T>);
  };
  bus.dominio.add(f);
  return () => bus.dominio.delete(f);
}

export function suscribirUI(oyente: Oyente<EventoUIEmitido>): () => void {
  bus.ui.add(oyente);
  return () => bus.ui.delete(oyente);
}

export function suscribirRemotas(oyente: Oyente<EntradaRemota>): () => void {
  bus.remotas.add(oyente);
  return () => bus.remotas.delete(oyente);
}

import type { TipoEvento } from '@/dominio/tipos';

/**
 * Colores por tipo de evento (PLAN 8.1.3): barra izquierda de 3 px + fondo suave + texto `ink`. Nunca bloques de
 * color saturado; todo sale de los tokens (la leyenda y las fichas comparten esta tabla).
 */
export const ESTILO_TIPO: Record<TipoEvento, { barra: string; fondo: string; fondoSuave: string }> = {
  turno: { barra: 'bg-chart-2', fondo: 'bg-surface-2', fondoSuave: 'bg-surface-2' },
  importacion: { barra: 'bg-ink', fondo: 'bg-selected', fondoSuave: 'bg-selected' },
  vencimiento: { barra: 'bg-danger', fondo: 'bg-danger-soft', fondoSuave: 'bg-danger-soft' },
  campana: { barra: 'bg-accent', fondo: 'bg-accent-soft', fondoSuave: 'bg-accent-soft' },
  cita: { barra: 'bg-success', fondo: 'bg-success-soft', fondoSuave: 'bg-success-soft' },
  otro: { barra: 'bg-control', fondo: 'bg-surface', fondoSuave: 'bg-surface' },
};

/** Marca de un evento resaltado con `?resaltar=` (destello camel y aro). */
export const CLASE_RESALTADO = 'animate-flash outline outline-2 -outline-offset-1 outline-accent';

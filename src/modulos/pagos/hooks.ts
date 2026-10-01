import type { Id } from '@/dominio/tipos';
import { useAcciones, useFiltroLocal, useSel } from '@/estado';
import { selLocalesQueVenden } from '@/selectores';
import { plural } from '@/lib/formato';
import { avisar } from '@/ui';

/**
 * Local con el que se calcula una pantalla de Pagos: el de `?local=` si es válido (enlace profundo) y, si no, el
 * de la barra superior (el vendedor siempre el suyo, aunque Pagos es solo del dueño).
 */
export function useLocalEfectivo(param: string | null): Id | 'todos' {
  const global = useFiltroLocal();
  const locales = useSel(selLocalesQueVenden);
  if (param === 'todos') return 'todos';
  if (param && locales.some((l) => l.id === param)) return param;
  return global;
}

/** Nombre de cada local que vende, por id. */
export function useNombresLocales(): Record<Id, string> {
  const locales = useSel(selLocalesQueVenden);
  return Object.fromEntries(locales.map((l) => [l.id, l.nombre]));
}

export interface RefConciliable {
  tipo: 'pago_venta' | 'movimiento';
  id: string;
  ventaId: string | null;
}

/** Marca o desmarca como conciliado un grupo de pagos y movimientos (un solo comando). Devuelve true si salió bien. */
export function useConciliar(): (refs: readonly RefConciliable[], conciliado: boolean) => boolean {
  const acciones = useAcciones();
  return (refs, conciliado) => {
    if (!refs.length) return false;
    const r = acciones.conciliarPagos({
      refs: refs.map((x) => (x.tipo === 'pago_venta' && x.ventaId ? { tipo: 'pago_venta' as const, ventaId: x.ventaId, pagoId: x.id } : { tipo: 'movimiento' as const, movimientoId: x.id })),
      conciliado,
    });
    if (!r.ok) {
      avisar({ tipo: 'error', texto: r.error.mensaje });
      return false;
    }
    avisar({
      tipo: 'exito',
      texto: conciliado ? `${plural(refs.length, 'movimiento conciliado', 'movimientos conciliados')}` : `${plural(refs.length, 'movimiento vuelve', 'movimientos vuelven')} a pendientes`,
    });
    return true;
  };
}

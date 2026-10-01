import { useEffect, useMemo } from 'react';
import { useSel } from '@/estado';
import { avisar } from '@/ui/ligero';
import { useBolsa } from './bolsa';
import { detalleBolsa, lineasConProblema, totalesBolsa } from './calculos';
import { selCatalogoTienda } from './selectores';

/** La bolsa unida al inventario de hoy: líneas con su producto, color, existencias y los totales de la venta (V1). */
export function useBolsaDetalle() {
  const catalogo = useSel(selCatalogoTienda);
  const lineas = useBolsa((s) => s.lineas);
  const detalle = useMemo(() => detalleBolsa(lineas, catalogo), [lineas, catalogo]);
  const totales = useMemo(() => totalesBolsa(detalle), [detalle]);
  return { catalogo, detalle, totales };
}

/**
 * Si alguien más compró y ya no alcanzan las unidades de una línea, la bolsa se ajusta a lo que hay y se avisa
 * (una línea sin existencias se quita). Así nunca se intenta pagar más de lo que hay.
 */
export function useAjustarBolsaAExistencias(): void {
  const { detalle } = useBolsaDetalle();
  const fijar = useBolsa((s) => s.fijarCantidad);
  useEffect(() => {
    const problemas = lineasConProblema(detalle);
    if (problemas.length === 0) return;
    for (const l of problemas) fijar(l.varianteId, l.stock, l.stock);
    avisar({
      tipo: 'alerta',
      texto: 'Ajustamos tu bolsa a las unidades que quedan',
      detalle: problemas.map((l) => `${l.producto.nombre} (${l.variante.talla}): ${l.stock > 0 ? `quedan ${l.stock}` : 'agotada'}`).join(' · '),
    });
  }, [detalle, fijar]);
}

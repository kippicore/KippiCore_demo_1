import { useEffect, useMemo, useState } from 'react';
import type { FechaISO, Id } from '@/dominio/tipos';
import { useAhora, useEstadoDominio, useFiltroLocal, useHoy, useMoneda, useRolActivo, useSel } from '@/estado';
import { hojasParaExportar, rangoPorDefecto, REPORTES, type FiltrosReporte, type IdReporte } from '@/reportes';
import { selLocales } from '@/selectores';
import { armarFiltros, opcionesLocal, resolverLocal, resumirHojas, totalFilas, type OpcionLocalReporte, type VistaHoja } from './calculos';

export interface RangoReporte {
  desde: FechaISO;
  hasta: FechaISO;
}

export interface FiltrosPantalla {
  hoy: FechaISO;
  rango: RangoReporte;
  cambiarRango: (r: RangoReporte) => void;
  opcionesLocal: OpcionLocalReporte[];
  localId: Id | 'todos';
  cambiarLocal: (id: string) => void;
  productoId: Id;
  cambiarProducto: (id: Id) => void;
  liquidacionId: Id | 'todas';
  cambiarLiquidacion: (id: Id | 'todas') => void;
  /** Lo que reciben las definiciones del reporte abierto. */
  filtros: FiltrosReporte;
  /** Los filtros de otro reporte con las mismas fechas y el mismo local (p. ej. la tarjeta del contador). */
  filtrosDe: (id: IdReporte) => FiltrosReporte;
}

/**
 * Filtros de la pantalla: rango (por defecto, el mes en curso), local (el de la barra superior mientras no se elija
 * otro aquí; si el reporte no lo ofrece, todos), referencia del kárdex y periodo de nómina.
 */
export function useFiltrosPantalla(id: IdReporte): FiltrosPantalla {
  const hoy = useHoy();
  const ahora = useAhora();
  const rol = useRolActivo();
  const global = useFiltroLocal();
  const e = useEstadoDominio();
  const locales = useSel(selLocales, { incluirBodega: true });
  const [rango, setRango] = useState<RangoReporte>(() => rangoPorDefecto(hoy));
  // El local elegido aquí vale mientras el de la barra superior no cambie (se deriva, sin efectos).
  const [elegido, setElegido] = useState<{ valor: string; global: string } | null>(null);
  const [productoId, setProductoId] = useState<Id>(e.meta.narrativa.productoOxford);
  const [liquidacionId, setLiquidacionId] = useState<Id | 'todas'>('todas');

  const opciones = useMemo(() => opcionesLocal(id, locales), [id, locales]);
  const elegidoVigente = elegido && elegido.global === global ? elegido.valor : null;
  const localId = resolverLocal(opciones, elegidoVigente, global);
  const filtrosDe = useMemo(
    () => (otro: IdReporte) =>
      armarFiltros(otro, { rango, localId: resolverLocal(opcionesLocal(otro, locales), elegidoVigente, global), hoy, ahora, rol, productoId, liquidacionId }),
    [rango, locales, elegidoVigente, global, hoy, ahora, rol, productoId, liquidacionId],
  );
  const filtros = useMemo(() => filtrosDe(id), [filtrosDe, id]);
  return {
    hoy,
    rango,
    cambiarRango: setRango,
    opcionesLocal: opciones,
    localId,
    cambiarLocal: (valor) => setElegido({ valor, global }),
    productoId,
    cambiarProducto: setProductoId,
    liquidacionId,
    cambiarLiquidacion: setLiquidacionId,
    filtros,
    filtrosDe,
  };
}

export type VistaPrevia =
  | { estado: 'cargando'; hojas: VistaHoja[]; total: number }
  | { estado: 'listo'; hojas: VistaHoja[]; total: number }
  | { estado: 'error'; hojas: VistaHoja[]; total: number; mensaje: string; reintentar: () => void };

interface Resultado {
  id: IdReporte;
  clave: string;
  hojas: VistaHoja[];
  error: string | null;
}

/**
 * Vista previa de un reporte: llama a la definición única con los mismos filtros y la misma conversión de moneda
 * que el archivo (`hojasParaExportar`) y recorta a las primeras filas. El cálculo corre fuera del render (el
 * contador y los 18 meses de ventas pueden tardar): mientras tanto la pantalla muestra el estado de carga.
 */
export function useVistaPrevia(id: IdReporte, filtros: FiltrosReporte): VistaPrevia {
  const estado = useEstadoDominio();
  const { moneda, tasa } = useMoneda();
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const clave = `${id}|${JSON.stringify(filtros)}|${moneda}|${tasa}|${intento}`;

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const hojas = resumirHojas(hojasParaExportar(id, estado, filtros, { moneda, tasa }), moneda);
        setResultado({ id, clave, hojas, error: null });
      } catch (x) {
        setResultado({ id, clave, hojas: [], error: x instanceof Error ? x.message : 'Error desconocido' });
      }
    }, 0);
    return () => clearTimeout(t);
    // `clave` resume id, filtros, moneda y tasa; el estado de dominio se vuelve a leer cuando cambia.
  }, [clave, estado]);

  if (!resultado || resultado.clave !== clave) {
    // Mientras calcula, se conserva la vista anterior de este mismo reporte (no parpadea) y se marca como cargando.
    const previas = resultado?.id === id ? resultado.hojas : [];
    return { estado: 'cargando', hojas: previas, total: totalFilas(previas) };
  }
  if (resultado.error) return { estado: 'error', hojas: [], total: 0, mensaje: resultado.error, reintentar: () => setIntento((n) => n + 1) };
  return { estado: 'listo', hojas: resultado.hojas, total: totalFilas(resultado.hojas) };
}

/** ¿El reporte usa este filtro? */
export const usaFiltro = (id: IdReporte, f: 'rango' | 'local' | 'producto' | 'liquidacion') => REPORTES[id].filtros.includes(f);

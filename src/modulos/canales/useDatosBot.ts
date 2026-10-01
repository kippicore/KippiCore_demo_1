import { useEffect, useMemo, useState } from 'react';
import { useAhora, useDinero, useHoy, useMarca, useSel } from '@/estado';
import { selContextoEscenarios, selDatosBot } from './selectores';
import type { EntradaGuion } from './escenarios';
import type { DatosBot } from './tipos';

/** Todo lo que el bot de la vitrina lee del negocio real, ya con la marca y la moneda activas. */
export function useDatosBot(): { datos: DatosBot; entrada: EntradaGuion } {
  const hoy = useHoy();
  const ahora = useAhora();
  const marca = useMarca();
  const dinero = useDinero();
  const base = useSel(selDatosBot, { hoy });
  const contexto = useSel(selContextoEscenarios, { hoy, ahora });
  return useMemo(() => {
    const datos: DatosBot = { ...base, marca: marca.nombre, dinero, resumen: contexto.resumen };
    return { datos, entrada: { datos, contexto, ahora } };
  }, [base, marca.nombre, dinero, contexto, ahora]);
}

/** Escala del marco de teléfono según el alto de la ventana: grande si cabe entero, mediana si no. */
export function useEscalaTelefono(): { escala: number; fijo: boolean } {
  const [alto, setAlto] = useState(() => (typeof window === 'undefined' ? 900 : window.innerHeight));
  useEffect(() => {
    const medir = () => setAlto(window.innerHeight);
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);
  return alto >= 880 ? { escala: 0.85, fijo: true } : { escala: 0.72, fijo: false };
}

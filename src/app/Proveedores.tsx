import { type ReactNode, useEffect } from 'react';
import { useDatos, useSesion } from '@/estado';

/**
 * Proveedores globales (PLAN 5.4): tema y colores de la marca → variables CSS. F2-C agrega los proveedores de
 * Tooltip y Toast (Radix) y el tema definitivo.
 */
export function Proveedores({ children }: { children: ReactNode }) {
  const tema = useSesion((s) => s.tema);
  const colores = useDatos((s) => s.estado?.empresa.colores ?? null);
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.tema = tema;
    if (colores) {
      raiz.style.setProperty('--marca-acento', colores.acento);
      raiz.style.setProperty('--marca-acento-texto', colores.acentoTexto);
      raiz.style.setProperty('--marca-acento-suave', colores.acentoSuave);
      raiz.style.setProperty('--marca-tienda-hero', colores.tiendaHero);
    }
  }, [tema, colores]);
  return <>{children}</>;
}

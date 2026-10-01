import type { ReactNode } from 'react';
import { Prenda } from '@/ui/ligero';
import { cn } from '@/ui/cn';
import { TEXTOS_ENTRADA } from '../textos';

/**
 * Cartel de la entrada: composición de campaña con las ilustraciones propias de prenda (PLAN 8.8), sin fotos de
 * terceros. Láminas 3:4 sobre el gris `product`, desfasadas como un lookbook, con su rótulo en MAYÚSCULAS.
 * Los hex son colores de PRODUCTO (paleta de 8.1.4: Carbón, Azul cielo, Azul marino), no de la interfaz.
 */
const CARBON = '#3B3B3B';
const AZUL_CIELO = '#B9CBE0';
const AZUL_MARINO = '#1F2A44';

function Lamina({ rotulo, className, children }: { rotulo?: string; className?: string; children: ReactNode }) {
  return (
    <figure className={cn('m-0', className)}>
      <div className="overflow-hidden border border-line-strong bg-product">{children}</div>
      {rotulo && <figcaption className="mt-2 t-eyebrow text-ink-2">{rotulo}</figcaption>}
    </figure>
  );
}

/** Versión de computador: dos láminas grandes desfasadas y un detalle de tejido que las une. */
export function CartelComputador() {
  return (
    <div aria-hidden className="relative mx-auto h-[392px] w-full max-w-[460px] [@media(max-height:760px)]:h-[300px] [@media(max-height:760px)]:max-w-[330px]" data-testid="entrada-cartel">
      <Lamina rotulo={TEXTOS_ENTRADA.cartel.camisa} className="absolute bottom-0 left-0 w-[47%]">
        <Prenda tipo="camisa" color={AZUL_CIELO} tamano="hero" />
      </Lamina>
      <Lamina rotulo={TEXTOS_ENTRADA.cartel.blazer} className="absolute right-0 top-0 w-[47%]">
        <Prenda tipo="blazer" color={CARBON} tamano="hero" />
      </Lamina>
      <Lamina className="absolute left-[3%] top-[2%] w-[19%]">
        <Prenda tipo="corbata" color={AZUL_MARINO} patron="rayas" vista="detalle" tamano="tarjeta" />
      </Lamina>
    </div>
  );
}

/** Versión de celular: tira de tres láminas, compacta. */
export function CartelCelular() {
  return (
    <div aria-hidden className="grid grid-cols-3 gap-2">
      <Lamina>
        <Prenda tipo="blazer" color={CARBON} tamano="tarjeta" />
      </Lamina>
      <Lamina>
        <Prenda tipo="camisa" color={AZUL_CIELO} tamano="tarjeta" />
      </Lamina>
      <Lamina>
        <Prenda tipo="corbata" color={AZUL_MARINO} patron="rayas" tamano="tarjeta" />
      </Lamina>
    </div>
  );
}

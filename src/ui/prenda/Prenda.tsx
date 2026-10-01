import { memo, useId } from 'react';
import type { TipoPrenda } from '@/dominio/tipos';
import { cn } from '../cn';
import { coloresPrenda, mezcla, TINTAS_PRENDA } from './colores';
import { DIBUJOS, MATERIAL_POR_TIPO, transformador, VISTA_DETALLE, type MaterialPrenda } from './dibujos';

/**
 * `<Prenda>` (PLAN 8.8): ilustración de producto en estilo de dibujo técnico de moda, sobre el gris `product` en 3:4,
 * coloreada con el hex de la variante. Es la "foto" de catálogo de toda la demo (tienda, inventario, POS, tablas).
 *
 *   <Prenda tipo="camisa" color="#B9CBE0" nombre="Camisa Oxford entallada, azul cielo" />
 *   <Prenda tipo="corbata" color="#1F2A44" patron="rayas" vista="detalle" tamano="hero" />
 *   <Prenda tipo="blazer" color={hex} vista="tejido" />
 *
 * El contenedor fija el tamaño (`className="w-[72px]"`); el SVG mantiene 3:4. Miniaturas: tablas 30 × 40, combobox
 * 32 × 43, bolsa 72 × 96. Nunca como decoración de estados vacíos.
 */
export type VistaPrenda = 'frente' | 'detalle' | 'tejido';
export type TamanoPrenda = 'miniatura' | 'tarjeta' | 'hero';

export interface PropsPrenda {
  tipo: TipoPrenda;
  /** Hex del color del PRODUCTO (seed/colores.ts). */
  color: string;
  patron?: 'liso' | 'rayas' | 'cuadros';
  vista?: VistaPrenda;
  tamano?: TamanoPrenda;
  /** Nombre y color para `aria-label` ("Camisa Oxford entallada, azul cielo"). Sin nombre, es decorativa. */
  nombre?: string;
  material?: MaterialPrenda;
  className?: string;
}

const TRAZO: Record<TamanoPrenda, number> = { miniatura: 1, tarjeta: 1.25, hero: 1.5 };

function PrendaBase({ tipo, color, patron = 'liso', vista = 'frente', tamano = 'tarjeta', nombre, material, className }: PropsPrenda) {
  const base = useId().replace(/:/g, '');
  const c = coloresPrenda(color);
  const idPatron = patron === 'liso' ? null : `${base}-p`;
  const idPunto = `${base}-k`;
  const k = { c, t: TRAZO[tamano], patron: idPatron, punto: idPunto, ...transformador(tipo) };
  const viewBox = vista === 'detalle' ? VISTA_DETALLE[tipo] : '0 0 300 400';
  const corbata = tipo === 'corbata';
  const mat = material ?? MATERIAL_POR_TIPO[tipo];
  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid slice"
      role={nombre ? 'img' : undefined}
      aria-label={nombre}
      aria-hidden={nombre ? undefined : true}
      className={cn('prenda block aspect-[3/4] h-auto w-full', className)}
      strokeLinejoin="round"
      strokeLinecap="round"
      data-prenda={tipo}
    >
      <defs>
        {patron === 'rayas' && (
          <pattern id={`${base}-p`} width={corbata ? 14 : 6} height={corbata ? 14 : 6} patternUnits="userSpaceOnUse" patternTransform={corbata ? 'rotate(45)' : undefined}>
            <rect x={corbata ? 5.5 : 2.4} y={0} width={corbata ? 3 : 1.2} height={corbata ? 14 : 6} fill={c.patron} />
          </pattern>
        )}
        {patron === 'cuadros' && (
          <pattern id={`${base}-p`} width={10} height={10} patternUnits="userSpaceOnUse">
            <rect x={4} y={0} width={1.6} height={10} fill={c.patron} fillOpacity={0.35} />
            <rect x={0} y={4} width={10} height={1.6} fill={c.patron} fillOpacity={0.35} />
            <rect x={8.6} y={0} width={0.6} height={10} fill={c.patron} fillOpacity={0.25} />
            <rect x={0} y={8.6} width={10} height={0.6} fill={c.patron} fillOpacity={0.25} />
          </pattern>
        )}
        <pattern id={idPunto} width={4} height={4} patternUnits="userSpaceOnUse">
          <rect x={1.7} y={0} width={0.6} height={4} fill={c.S} fillOpacity={0.5} />
        </pattern>
      </defs>
      <rect x={0} y={0} width={300} height={400} fill="var(--c-product)" />
      {vista === 'tejido' ? <Tejido material={mat} color={color} idPatron={idPatron} /> : DIBUJOS[tipo](k)}
    </svg>
  );
}

/** Lienzo completo con la textura del material (8.8.5). */
function Tejido({ material, color, idPatron }: { material: MaterialPrenda; color: string; idPatron: string | null }) {
  const id = useId().replace(/:/g, '');
  const oscuro = coloresPrenda(color).oscuro;
  const tinta = oscuro ? TINTAS_PRENDA.blanco : TINTAS_PRENDA.negro;
  return (
    <>
      <defs>
        {material === 'algodon' && (
          <pattern id={id} width={4} height={4} patternUnits="userSpaceOnUse">
            <circle cx={2} cy={2} r={0.5} fill={tinta} fillOpacity={0.08} />
          </pattern>
        )}
        {material === 'lana' && (
          <pattern id={id} width={3} height={3} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect x={0} y={0} width={0.8} height={3} fill={tinta} fillOpacity={0.05} />
          </pattern>
        )}
        {material === 'punto' && (
          <pattern id={id} width={4} height={4} patternUnits="userSpaceOnUse">
            <rect x={1.7} y={0} width={0.6} height={4} fill={tinta} fillOpacity={0.08} />
          </pattern>
        )}
      </defs>
      <rect x={0} y={0} width={300} height={400} fill={color} />
      {idPatron && <rect x={0} y={0} width={300} height={400} fill={`url(#${idPatron})`} />}
      {material === 'cuero' ? (
        <path d="M-20 120 Q150 60 320 160" fill="none" stroke={mezcla(color, TINTAS_PRENDA.blanco, 0.6)} strokeOpacity={0.06} strokeWidth={60} />
      ) : (
        <rect x={0} y={0} width={300} height={400} fill={`url(#${id})`} />
      )}
    </>
  );
}

export const Prenda = memo(PrendaBase);

/** Miniatura de tabla (30 × 40) o de combobox (32 × 43). */
export function MiniaturaPrenda({ tamano = 'tabla', ...p }: Omit<PropsPrenda, 'tamano'> & { tamano?: 'tabla' | 'buscador' | 'bolsa' }) {
  const ancho = tamano === 'tabla' ? 'w-[30px]' : tamano === 'buscador' ? 'w-8' : 'w-[72px]';
  return (
    <span className={cn('block shrink-0', ancho, p.className)}>
      <Prenda {...p} className={undefined} tamano="miniatura" />
    </span>
  );
}

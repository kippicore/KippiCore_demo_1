import { Copy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { barrasEan13 } from '@/lib/codigos/barras';
import { cn } from '../cn';
import { Icono } from '../primitivos/Icono';

/**
 * Código de barras EAN-13 (PLAN 8.7.27): vectorial (los mismos 95 módulos que el PDF, `lib/codigos/barras`), alto 48,
 * números de 12 px en Figtree, contenedor blanco con 10 px de zona de silencio (también en tema oscuro). Siempre
 * negro sobre blanco. Botón "Copiar código" al lado (opcional).
 *
 *   <CodigoBarras ean="2048100014237" copiable />
 *
 * Desviación: no usa JsBarcode (una sola implementación para pantalla y PDF; ver DECISIONES).
 */
export function CodigoBarras({ ean, alto = 48, ancho = 1.6, copiable, className }: { ean: string; alto?: number; ancho?: number; copiable?: boolean; className?: string }) {
  const [copiado, setCopiado] = useState(false);
  const barras = useMemo(() => {
    try {
      return barrasEan13(ean);
    } catch {
      return null;
    }
  }, [ean]);
  if (!barras) return <span className="t-small text-danger">EAN-13 inválido: {ean}</span>;
  const margen = 7;
  const w = 95 + margen * 2;
  const hTexto = 14;
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="inline-block bg-white px-2.5 py-2">
        <svg viewBox={`0 0 ${w} ${alto + hTexto}`} width={w * ancho} height={alto + hTexto} role="img" aria-label={`Código de barras ${ean}`} shapeRendering="crispEdges" preserveAspectRatio="none">
          {barras.map((b) => (
            <rect key={b.x} x={b.x + margen} y={0} width={b.ancho} height={b.guarda ? alto + 5 : alto} fill="black" />
          ))}
        </svg>
        <span aria-hidden className="relative -mt-3.5 flex justify-between px-0 font-sans text-[0.75rem] font-medium leading-none tracking-[0.08em] text-black num" style={{ width: w * ancho }}>
          <span className="w-[6%] text-left">{ean[0]}</span>
          <span className="w-[44%] bg-white text-center">{ean.slice(1, 7)}</span>
          <span className="w-[44%] bg-white text-center">{ean.slice(7)}</span>
          <span className="w-[4%]" />
        </span>
      </span>
      {copiable && (
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(ean).then(() => {
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1600);
            });
          }}
          className="inline-flex h-8 items-center gap-1.5 px-3 t-nav text-ink hover:bg-surface-2"
        >
          <Icono icono={Copy} tamano={14} />
          {copiado ? 'Copiado' : 'Copiar código'}
        </button>
      )}
    </span>
  );
}

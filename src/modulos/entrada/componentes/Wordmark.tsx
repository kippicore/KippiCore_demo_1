import { cn } from '@/ui/cn';

/**
 * Wordmark de la entrada (PLAN 2.2, 8.2): el nombre de la marca activa en 900, MAYÚSCULAS, tracking 0,18 em. Se
 * achica solo para caber cuando el cliente escribe un nombre largo (el contenedor mide su propio ancho con `cqw`;
 * cada letra ocupa ≈ 0,86 em con su tracking). HALDEN queda siempre a 64 px (44 px en celular). Los nombres de más
 * de 12 letras pueden partirse en dos renglones por palabras, para no quedar diminutos.
 */
const ANCHO_POR_LETRA = 0.9;
const LETRAS_EN_UN_RENGLON = 12;

/** Letras que caben en el renglón más ancho: todo el nombre si es corto; si no, la mitad (o la palabra más larga). */
export function letrasPorRenglon(nombre: string): number {
  const letras = Math.max(1, nombre.length);
  if (letras <= LETRAS_EN_UN_RENGLON) return letras;
  const masLarga = Math.max(...nombre.split(/\s+/).map((p) => p.length));
  return Math.max(masLarga, Math.ceil(letras / 2) + 2);
}

export function Wordmark({ nombre, className }: { nombre: string; className?: string }) {
  const porRenglon = letrasPorRenglon(nombre);
  return (
    <div className={cn('w-full [container-type:inline-size]', className)}>
      <h1
        data-testid="entrada-wordmark"
        className={cn('t-wordmark-entrada text-ink [--wm:2.75rem] md:[--wm:4rem]', nombre.length > LETRAS_EN_UN_RENGLON ? 'text-balance [overflow-wrap:anywhere]' : 'whitespace-nowrap')}
        style={{ fontSize: `min(var(--wm), calc(100cqw / ${(porRenglon * ANCHO_POR_LETRA).toFixed(2)}))`, ...(nombre.length > LETRAS_EN_UN_RENGLON ? { lineHeight: 1.1 } : {}) }}
      >
        {nombre}
      </h1>
    </div>
  );
}

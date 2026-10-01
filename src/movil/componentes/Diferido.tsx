import { useEffect, useState, type ReactNode } from 'react';
import { cn, Skeleton } from '@/ui/ligero';

/**
 * Pinta `children` DESPUÉS del primer pintado (cuando el navegador queda libre). La primera pantalla de /app tiene
 * un presupuesto de 2,5 s con CPU ×4 y solo ≈ 200 ms de margen (F2-C): lo que no es la cifra protagonista, los
 * cierres y lo que hay que aprobar espera a que el navegador respire. Mientras tanto reserva el alto exacto con un
 * esqueleto, para que nada se corra al aparecer.
 */
export function Diferido({ children, alto, className, testid }: { children: ReactNode; alto: number; className?: string; testid?: string }) {
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const g = globalThis as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (n: number) => void };
    if (g.requestIdleCallback && g.cancelIdleCallback) {
      const id = g.requestIdleCallback(() => setListo(true), { timeout: 400 });
      return () => g.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setListo(true), 60);
    return () => clearTimeout(t);
  }, []);
  if (!listo) return <Skeleton className={className} style={{ height: alto }} />;
  return (
    <div data-testid={testid} className={cn('animate-fade-in', className)}>
      {children}
    </div>
  );
}

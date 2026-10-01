import { cn } from '../cn';

/**
 * Micrográfico (PLAN 8.7.11): línea de 1,5 px `chart-3`, último punto de 3 px `ink`, sin ejes, alto 32. SVG propio
 * (no Recharts): va en cada KPI y no debe pesar.
 *
 *   <Sparkline valores={[12, 18, 9, 22, 30]} />
 */
export function Sparkline({ valores, alto = 32, className, destacarUltimo = true }: { valores: readonly number[]; alto?: number; className?: string; destacarUltimo?: boolean }) {
  if (valores.length < 2) return <div style={{ height: alto }} className={className} aria-hidden />;
  const ancho = 100;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const pad = 3;
  const pts = valores.map((v, i) => {
    const x = (i / (valores.length - 1)) * ancho;
    const y = pad + (1 - (v - min) / rango) * (alto - pad * 2);
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const ultimo = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none" className={cn('block w-full overflow-visible', className)} style={{ height: alto }} aria-hidden>
      <path d={d} fill="none" stroke="var(--c-chart-3)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      {destacarUltimo && ultimo && (
        <line x1={ultimo[0]} y1={ultimo[1]} x2={ultimo[0]} y2={ultimo[1]} stroke="var(--c-ink)" strokeWidth={6} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  );
}

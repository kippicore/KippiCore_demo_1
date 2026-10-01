import { useEffect, useRef, useState, type ElementType } from 'react';
import { cn, prefiereMenosMovimiento } from '../cn';

/**
 * `<Cifra>` (AnimatedNumber, PLAN 8.10.2): cuando un valor visible cambia, la cifra NO salta: interpola del valor
 * anterior al nuevo en 900 ms (ease-enter, requestAnimationFrame) con el MISMO formateador (los dígitos no bailan
 * gracias a `num`). A la vez, un subrayado camel de 1 px crece desde la izquierda y se desvanece; si el cambio es
 * un incremento por una acción del usuario (`incremento`), sube una etiqueta "+$ 389.800" que se desvanece.
 * En la primera carga NO anima, salvo `contarDesdeCero` (la cifra protagonista de Hoy, una vez por sesión).
 * Con movimiento reducido: cambio de golpe y destello `accent-soft` de 600 ms.
 *
 *   const dinero = useDinero();
 *   <Cifra valor={ventasHoy} formatear={dinero} className="t-kpi" />
 *   <Cifra valor={total} formatear={dinero} contarDesdeCero claveSesion="hoy-vendido" incremento={dinero} className="t-kpi-xl" />
 *
 * Para dinero en la moneda activa usa el conectado `<Dinero valor={cop} animar />` (ui/conectados).
 */
export interface PropsCifra {
  valor: number;
  formatear: (n: number) => string;
  /** Cuenta desde 0 al montar (una vez por sesión si hay `claveSesion`). */
  contarDesdeCero?: boolean;
  claveSesion?: string;
  /** Formateador del incremento flotante; si no se da, no aparece la etiqueta. */
  incremento?: (delta: number) => string;
  /** Desactiva toda animación (tablas). */
  estatica?: boolean;
  className?: string;
  como?: ElementType;
  title?: string;
  'data-testid'?: string;
}

const DURACION = 900;
// ease-enter cubic-bezier(.16, 1, .3, 1) aproximada por una exponencial suave.
function curva(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

const contadasEnSesion = new Set<string>();
function yaContada(clave?: string): boolean {
  if (!clave) return false;
  if (contadasEnSesion.has(clave)) return true;
  try {
    return sessionStorage.getItem(`kc:cifra:${clave}`) === '1';
  } catch {
    return false;
  }
}
function marcarContada(clave?: string) {
  if (!clave) return;
  contadasEnSesion.add(clave);
  try {
    sessionStorage.setItem(`kc:cifra:${clave}`, '1');
  } catch {
    /* sin almacenamiento: basta con la memoria */
  }
}

export function Cifra({ valor, formatear, contarDesdeCero, claveSesion, incremento, estatica, className, como: Como = 'span', title, ...resto }: PropsCifra) {
  // Se decide una sola vez al montar (si cambiara, el efecto se reiniciaría y cortaría la animación).
  const [desdeCero] = useState(() => !estatica && !!contarDesdeCero && !yaContada(claveSesion) && !prefiereMenosMovimiento());
  const [mostrado, setMostrado] = useState(desdeCero ? 0 : valor);
  const [efecto, setEfecto] = useState<{ n: number; delta: number; reducido: boolean } | null>(null);
  const anterior = useRef(desdeCero ? 0 : valor);
  const raf = useRef<number | null>(null);
  const primera = useRef(true);

  useEffect(() => {
    const desde = anterior.current;
    const esPrimera = primera.current;
    primera.current = false;
    if (desde === valor) return;
    anterior.current = valor;
    if (estatica) {
      setMostrado(valor);
      return;
    }
    if (esPrimera && desdeCero) marcarContada(claveSesion);
    const reducido = prefiereMenosMovimiento();
    if (!esPrimera) setEfecto((e) => ({ n: (e?.n ?? 0) + 1, delta: valor - desde, reducido }));
    if (reducido) {
      setMostrado(valor);
      return;
    }
    const inicio = performance.now();
    const paso = (t: number) => {
      const p = Math.min(1, (t - inicio) / DURACION);
      setMostrado(desde + (valor - desde) * curva(p));
      if (p < 1) raf.current = requestAnimationFrame(paso);
    };
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(paso);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [valor, estatica, desdeCero, claveSesion]);

  // Redondeo al formatear cada cuadro: las cifras enteras no muestran decimales intermedios.
  const texto = formatear(Number.isInteger(valor) ? Math.round(mostrado) : mostrado);
  return (
    <Como
      className={cn('relative inline-block num', efecto?.reducido && 'animate-flash', className)}
      key={efecto?.reducido ? `f${efecto.n}` : undefined}
      title={title}
      data-testid={resto['data-testid']}
      data-valor={valor}
    >
      <span aria-hidden={mostrado !== valor || undefined}>{texto}</span>
      {mostrado !== valor && <span className="sr-only">{formatear(valor)}</span>}
      {efecto && !efecto.reducido && (
        <span
          key={`s${efecto.n}`}
          aria-hidden
          className="pointer-events-none absolute -bottom-0.5 left-0 h-px w-full origin-left bg-accent animate-underline"
        />
      )}
      {efecto && !efecto.reducido && incremento && efecto.delta > 0 && (
        <span
          key={`i${efecto.n}`}
          aria-hidden
          className="pointer-events-none absolute -top-5 left-0 whitespace-nowrap t-small font-semibold num text-accent-ink animate-float-up"
        >
          +{incremento(efecto.delta)}
        </span>
      )}
    </Como>
  );
}

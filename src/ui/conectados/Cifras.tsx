import type { COP, FechaHoraISO, FechaISO, ParteFrase } from '@/dominio/tipos';
import { useAhora, useDinero, useHoy } from '@/estado';
import { cifraCorta, dinero as formatoDinero, fecha, fechaCorta, fechaHora, fechaLarga, hora, relativa, relativaDias } from '@/lib/formato';
import { cn } from '../cn';
import { Cifra } from '../texto/Cifra';

/**
 * Cifras y fechas conectadas al contexto (PLAN 8.11.3, 5.8). Ningún módulo formatea a mano.
 *
 *   <Dinero valor={cop} />                  → "$ 1.250.000" o "US$ 316,46" según la moneda activa
 *   <Dinero valor={cop} corta />            → "$ 12,4 M" (título con la cifra completa)
 *   <Dinero valor={cop} animar incremento /> → contador de 900 ms al cambiar (+ etiqueta flotante)
 *   <Dinero valor={cop} conMoneda />        → chip "USD" junto a la cifra cuando no es COP (8.11.3)
 *   <Fecha valor="2026-09-30" />            → "30/09/2026"; formato: corta · larga · hora · fechaHora · relativa · relativaDias
 */
export interface PropsDinero {
  valor: COP;
  corta?: boolean;
  animar?: boolean;
  /** Etiqueta flotante "+$ 389.800" al subir (acciones del usuario). */
  incremento?: boolean;
  /** Cuenta desde 0 una vez por sesión (cifra protagonista de Hoy). */
  contarDesdeCero?: boolean;
  claveSesion?: string;
  conMoneda?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function Dinero({ valor, corta, animar, incremento, contarDesdeCero, claveSesion, conMoneda, className, ...resto }: PropsDinero) {
  const d = useDinero();
  const convertido = d.convertir(valor);
  const formatear = (n: number) => (corta ? cifraCorta(n, d.moneda) : formatoDinero(n, d.moneda));
  const chip = conMoneda && d.moneda !== 'COP' ? <span className="ml-1.5 align-middle t-micro font-semibold text-ink-2">{d.moneda}</span> : null;
  if (animar || contarDesdeCero)
    return (
      <span className={cn('num whitespace-nowrap', className)} data-testid={resto['data-testid']}>
        <Cifra
          valor={convertido}
          formatear={formatear}
          incremento={incremento ? (n) => formatoDinero(n, d.moneda) : undefined}
          contarDesdeCero={contarDesdeCero}
          claveSesion={claveSesion}
          title={corta ? d(valor) : undefined}
        />
        {chip}
      </span>
    );
  return (
    <span className={cn('num whitespace-nowrap', className)} title={corta ? d(valor) : undefined} data-testid={resto['data-testid']} data-valor={valor}>
      {corta ? d.corta(valor) : d(valor)}
      {chip}
    </span>
  );
}

/**
 * Diferencia de caja (faltante o sobrante): el efectivo se cuenta en pesos. En otra moneda se muestra convertida (como
 * todo el sistema) y el título dice los pesos contados ("$ 40.000 en efectivo"), para que un faltante de US$ 10,13 no
 * parezca un error.
 */
export function DineroCaja({ valor, className }: { valor: COP; className?: string }) {
  const d = useDinero();
  if (d.moneda === 'COP') return <Dinero valor={valor} className={className} />;
  return (
    <span className={cn('num whitespace-nowrap', className)} title={`${formatoDinero(valor, 'COP')} en efectivo`} data-valor={valor}>
      {d(valor)}
    </span>
  );
}

/** Trozo de una frase armada por un selector (`Hallazgo.partes`, `Alerta.tituloPartes`). */
export type ParteConDinero = ParteFrase;

/**
 * Frase con cifras de dinero que siguen la moneda activa (compartidos C-D): los selectores entregan los trozos y el
 * dinero en COP; cada cifra se pinta con `<Dinero>` (`corta`: "$ 53,2 M", "US$ 13,5 mil").
 */
export function FraseConDinero({ partes }: { partes: readonly ParteConDinero[] }) {
  return (
    <>
      {partes.map((p, i) => ('dinero' in p ? <Dinero key={i} valor={p.dinero} corta={p.corta} /> : <span key={i}>{p.texto}</span>))}
    </>
  );
}

export type FormatoFecha = 'fecha' | 'corta' | 'larga' | 'hora' | 'fechaHora' | 'relativa' | 'relativaDias';

export function Fecha({ valor, formato = 'fecha', className }: { valor: FechaISO | FechaHoraISO; formato?: FormatoFecha; className?: string }) {
  const ahora = useAhora();
  const hoy = useHoy();
  const texto =
    formato === 'corta'
      ? fechaCorta(valor)
      : formato === 'larga'
        ? fechaLarga(valor)
        : formato === 'hora'
          ? hora(valor)
          : formato === 'fechaHora'
            ? fechaHora(valor)
            : formato === 'relativa'
              ? relativa(valor, ahora)
              : formato === 'relativaDias'
                ? relativaDias(valor.slice(0, 10), hoy)
                : fecha(valor);
  return (
    <time dateTime={valor} className={cn('num', className)} title={formato === 'relativa' || formato === 'relativaDias' ? (valor.length > 10 ? fechaHora(valor) : fecha(valor)) : undefined}>
      {texto}
    </time>
  );
}

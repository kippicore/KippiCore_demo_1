import { GLOSARIO } from '@/config/textos/glosario';
import { cn } from '../cn';
import { Tooltip } from '../primitivos/Tooltip';

/**
 * Término doble (PLAN 8.7.32, 8.11.4): lenguaje del comerciante + término técnico en muted 400, con la definición
 * en un tooltip. En títulos y menús va el del comerciante; en tablas y exportes, el técnico.
 *
 *   <Termino id="porCobrar" />                                   → "Plata que me deben · Cuentas por cobrar"
 *   <Termino comun="Costo real por prenda" tecnico="Costo aterrizado" sinTecnico />
 */
export type IdTermino = keyof typeof GLOSARIO;

export interface PropsTermino {
  id?: IdTermino;
  comun?: string;
  tecnico?: string;
  definicion?: string;
  /** Oculta el técnico en línea (queda en el tooltip). */
  sinTecnico?: boolean;
  /** Sin tooltip (superficies móviles). */
  sinDefinicion?: boolean;
  className?: string;
}

export function Termino({ id, comun, tecnico, definicion, sinTecnico, sinDefinicion, className }: PropsTermino) {
  const g = id ? GLOSARIO[id] : undefined;
  const c = comun ?? g?.comun ?? '';
  const t = tecnico ?? g?.tecnico;
  const d = definicion ?? g?.definicion;
  const contenido = (
    <span className={cn('inline', className)}>
      {c}
      {t && !sinTecnico && <span className="font-normal normal-case tracking-normal text-muted"> · {t}</span>}
    </span>
  );
  if (!d || sinDefinicion) return contenido;
  return (
    <Tooltip
      texto={
        <>
          {sinTecnico && t && <strong className="block font-bold">{t}</strong>}
          {d}
        </>
      }
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <span tabIndex={0} className="cursor-help underline decoration-line-strong decoration-dotted underline-offset-4">
        {contenido}
      </span>
    </Tooltip>
  );
}

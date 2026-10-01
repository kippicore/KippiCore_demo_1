import type { ReactNode } from 'react';
import type { Centavos, COP, EstadoImportacion, MonedaExtranjera } from '@/dominio/tipos';
import { ETIQUETAS_ESTADO_IMPORTACION } from '@/config/aduanas';
import { INDICADORES_IMPORTACION, TONO_ESTADO_IMPORTACION } from '@/config/estados';
import { plural } from '@/lib/formato';
import { dineroOrigen } from '@/lib/moneda';
import { Badge, BadgeEstado, Dinero } from '@/ui';

/** Piezas pequeñas compartidas por las pantallas de Importaciones: montos de origen e insignias de estado. */

/** Monto en la moneda de la fábrica (US$ 14.700,00) con su equivalente en la moneda activa. */
export function MontoOrigen({ centavos, moneda, cop, corta = true, apilado }: { centavos: Centavos; moneda: MonedaExtranjera; cop?: COP; corta?: boolean; apilado?: boolean }) {
  return (
    <span className={apilado ? 'flex flex-col items-end' : 'inline-flex flex-wrap items-baseline gap-x-2'}>
      <span className="num whitespace-nowrap">{dineroOrigen(centavos, moneda)}</span>
      {cop !== undefined && (
        <span className="t-small text-muted">
          <Dinero valor={cop} corta={corta} />
        </span>
      )}
    </span>
  );
}

export function InsigniaEstado({ estado, tamano }: { estado: EstadoImportacion; tamano?: 'sm' | 'md' }) {
  return (
    <Badge tono={TONO_ESTADO_IMPORTACION[estado]} tamano={tamano}>
      {ETIQUETAS_ESTADO_IMPORTACION[estado]}
    </Badge>
  );
}

export function InsigniaRetraso({ dias, tamano = 'md' }: { dias: number; tamano?: 'sm' | 'md' }) {
  if (dias <= 0) return null;
  return (
    <Badge tono={INDICADORES_IMPORTACION.retraso.tono} tamano={tamano}>
      Retraso de {plural(dias, 'día', 'días')}
    </Badge>
  );
}

export function InsigniaAforo({ tipo, tamano = 'md' }: { tipo: 'automatico' | 'documental' | 'fisico'; tamano?: 'sm' | 'md' }) {
  if (tipo === 'automatico') return null;
  return <BadgeEstado estado={tipo === 'fisico' ? INDICADORES_IMPORTACION.aforoFisico : INDICADORES_IMPORTACION.aforoDocumental} tamano={tamano} />;
}

/** Texto "Etiqueta · valor" en una línea de apoyo. */
export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <p className="t-small text-muted">
      {etiqueta}: <span className="text-ink">{children}</span>
    </p>
  );
}

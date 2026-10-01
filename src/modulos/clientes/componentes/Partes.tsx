import { Fragment } from 'react';
import { ESTADOS_CLIENTE } from '@/config/estados';
import type { Segmento } from '@/dominio/reglas/segmentacion';
import { BadgeEstado, Dinero } from '@/ui';
import type { Parte } from '../reglas';

/** Pinta una frase armada con `Parte[]`: el texto tal cual y las cifras con `<Dinero>` (respeta la moneda activa). */
export function Partes({ partes }: { partes: readonly Parte[] }) {
  return (
    <>
      {partes.map((p, i) =>
        typeof p === 'string' ? <Fragment key={i}>{p}</Fragment> : <Dinero key={i} valor={p.dinero} corta={p.corta} />,
      )}
    </>
  );
}

/** Insignia del segmento con el tono del mapa canónico. */
export function InsigniaSegmento({ segmento, tamano }: { segmento: Segmento; tamano?: 'sm' | 'md' }) {
  return <BadgeEstado estado={ESTADOS_CLIENTE[segmento]} tamano={tamano} />;
}

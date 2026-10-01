import type { ReactNode } from 'react';
import { rutas } from '@/app/rutas';
import type { IdPista } from '@/app/rutas';
import { useHoy, useSel } from '@/estado';
import { EncabezadoPagina, Pista, PestanasEnlace, Termino } from '@/ui';
import { selResumenPagos } from '../selectores';
import { TXT } from '../textos';

/**
 * Encabezado común de todas las pantallas de Pagos: migas, título, subtítulo, acciones y las siete pestañas del
 * módulo. Las pistas `pagos.flujo` y `pagos.datafono` viven sobre sus pestañas (CONTRATOS §10).
 */
export interface PropsEncabezadoPagos {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  /** Nombre de la pantalla en las migas (Resumen no lo lleva). */
  migaActual?: string;
  acciones?: ReactNode;
  insignia?: ReactNode;
  eyebrow?: ReactNode;
  /** Migas intermedias (ficha de una cuenta: Pagos | Caja y bancos | Cuenta). */
  migasExtra?: { texto: string; a?: string }[];
}

/** Etiqueta de pestaña con una pista: el clic en el punto no navega, el clic en el texto sí. */
function EtiquetaConPista({ id, children }: { id: IdPista; children: ReactNode }) {
  return (
    <span
      role="presentation"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-testid^="pista-"], [role="dialog"]')) e.preventDefault();
      }}
    >
      <Pista id={id} alinear="inicio">
        {children}
      </Pista>
    </span>
  );
}

export function EncabezadoPagos({ titulo, subtitulo, migaActual, acciones, insignia, eyebrow, migasExtra }: PropsEncabezadoPagos) {
  const hoy = useHoy();
  const resumen = useSel(selResumenPagos, { hoy });
  const migas = migaActual
    ? [{ texto: TXT.pagos.migaInicio, a: rutas.inicio() }, { texto: TXT.pagos.titulo, a: rutas.pagos() }, ...(migasExtra ?? []), { texto: migaActual }]
    : [{ texto: TXT.pagos.migaInicio, a: rutas.inicio() }, { texto: TXT.pagos.titulo }];
  return (
    <EncabezadoPagina
      migas={migas}
      titulo={titulo}
      subtitulo={subtitulo}
      insignia={insignia}
      eyebrow={eyebrow}
      acciones={acciones}
      pestanas={
        <PestanasEnlace
          etiqueta="Secciones de Pagos"
          pestanas={[
            { a: rutas.pagos(), etiqueta: TXT.pestanas.resumen, fin: true },
            { a: rutas.flujo(), etiqueta: <EtiquetaConPista id="pagos.flujo">{TXT.pestanas.flujo}</EtiquetaConPista> },
            { a: rutas.porPagar(), etiqueta: <Termino id="porPagar" sinTecnico sinDefinicion />, contador: resumen.total.nPorPagar },
            { a: rutas.porCobrar(), etiqueta: <Termino id="porCobrar" sinTecnico sinDefinicion />, contador: resumen.total.nPorCobrar },
            { a: rutas.cuentas(), etiqueta: TXT.pestanas.cuentas },
            { a: rutas.datafono(), etiqueta: <EtiquetaConPista id="pagos.datafono">{TXT.pestanas.datafono}</EtiquetaConPista> },
            { a: rutas.conciliacion(), etiqueta: TXT.pestanas.conciliacion },
          ]}
        />
      }
    />
  );
}

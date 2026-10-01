import { Badge, Dinero, cn } from '@/ui';
import type { LiquidacionEmpleado, ParametrosNomina } from '@/dominio/tipos';
import { composicionLaboral, composicionPrestacion, type FilaDesglose, type GrupoDesglose } from '../calculos';

/**
 * Desglose de una liquidación (W6): lo que gana, lo que se le descuenta, los aportes del negocio y lo que hay que
 * provisionar. Los porcentajes salen de los parámetros usados en la liquidación; las cifras, del dominio.
 */
function Fila({ fila, animar }: { fila: FilaDesglose; animar?: boolean }) {
  return (
    <li
      className={cn('flex items-baseline justify-between gap-4 py-2', fila.total ? 'border-t border-line-strong font-semibold' : 'border-b border-line-soft last:border-b-0')}
      data-testid={`personal-fila-${fila.id}`}
      data-valor={fila.valor}
    >
      <span className="min-w-0">
        <span className={cn('t-body', fila.exonerado ? 'text-muted' : 'text-ink')}>{fila.etiqueta}</span>
        {fila.nota && <span className="ml-2 t-small text-muted num">{fila.nota}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {fila.exonerado && <Badge tono="accent" tamano="sm">Exonerado</Badge>}
        <Dinero valor={fila.valor} animar={animar} className={cn('t-body', fila.exonerado && 'text-muted')} />
      </span>
    </li>
  );
}

export function GrupoDesgloseVista({ grupo, animar, destacado }: { grupo: GrupoDesglose; animar?: boolean; destacado?: boolean }) {
  return (
    <section className={cn('border bg-surface p-5', destacado ? 'border-ink' : 'border-line')} aria-label={grupo.titulo} data-testid={`personal-grupo-${grupo.id}`} data-total={grupo.total}>
      <h3 className="t-h3 text-ink">{grupo.titulo}</h3>
      <p className="mt-1 t-small text-muted">{grupo.ayuda}</p>
      <ul className="mt-3">
        {grupo.filas.map((f) => (
          <Fila key={f.id} fila={f} animar={animar} />
        ))}
        <Fila fila={{ id: `${grupo.id}-total`, etiqueta: 'Total', valor: grupo.total, total: true }} animar={animar} />
      </ul>
    </section>
  );
}

/** Los cuatro grupos de un contrato laboral en una rejilla de dos columnas. */
export function DesgloseLaboral({ linea, parametros, animar }: { linea: Pick<LiquidacionEmpleado, 'laboral'>; parametros: ParametrosNomina; animar?: boolean }) {
  if (!linea.laboral) return null;
  const grupos = composicionLaboral(linea.laboral, parametros);
  return (
    <div className="grid grid-cols-1 gap-4 desk:grid-cols-2" data-testid="personal-desglose-laboral">
      {grupos.map((g) => (
        <GrupoDesgloseVista key={g.id} grupo={g} animar={animar && (g.id === 'aportes' || g.id === 'devengados')} />
      ))}
    </div>
  );
}

/** Honorarios, retención y neto de una prestación de servicios. */
export function DesglosePrestacionVista({ linea }: { linea: Pick<LiquidacionEmpleado, 'prestacion' | 'netoAPagar'> }) {
  const d = linea.prestacion;
  if (!d) return null;
  const filas: FilaDesglose[] = [...composicionPrestacion(d), { id: 'neto', etiqueta: 'Neto a pagar', valor: linea.netoAPagar, total: true }];
  return (
    <section className="border border-line bg-surface p-5" aria-label="Honorarios" data-testid="personal-desglose-prestacion">
      <h3 className="t-h3 text-ink">Honorarios</h3>
      <p className="mt-1 t-small text-muted">Por prestación de servicios el negocio no paga aportes ni prestaciones: la persona cotiza por su cuenta.</p>
      <ul className="mt-3">
        {filas.map((f) => (
          <Fila key={f.id} fila={f} />
        ))}
      </ul>
    </section>
  );
}

/** Detalle de una línea de liquidación (laboral o prestación), para cajones y páginas. */
export function DetalleLinea({ linea, parametros }: { linea: LiquidacionEmpleado; parametros: ParametrosNomina }) {
  return linea.laboral ? <DesgloseLaboral linea={linea} parametros={parametros} /> : <DesglosePrestacionVista linea={linea} />;
}

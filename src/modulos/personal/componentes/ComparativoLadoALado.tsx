import type { ReactNode } from 'react';
import { Badge, Dinero, NotaLegal, cn } from '@/ui';
import { porcentaje } from '@/lib/formato';
import type { ComparativoModalidades } from '@/selectores';
import { aAnio } from '../calculos';
import { TEXTOS } from '../textos';
import { NotaNomina } from './Piezas';

/**
 * Comparativo lado a lado (W6): el mismo valor mensual como contrato laboral y como prestación de servicios, con lo
 * que le cuesta al negocio, lo que recibe la persona y lo que le queda después de su propia seguridad social. Cierra
 * con la nota prudente del contrato realidad. Las cifras salen de `selComparativoModalidades`.
 */
function Fila({ etiqueta, ayuda, laboral, prestacion, fuerte, id }: { etiqueta: string; ayuda?: string; laboral: ReactNode; prestacion: ReactNode; fuerte?: boolean; id: string }) {
  return (
    <div className={cn('grid grid-cols-[1.3fr_1fr_1fr] items-baseline gap-4 py-3', fuerte ? 'border-y border-ink' : 'border-b border-line-soft')} data-testid={`personal-cmp-${id}`}>
      <div className="min-w-0">
        <p className={cn('t-body', fuerte ? 'font-bold text-ink' : 'text-ink')}>{etiqueta}</p>
        {ayuda && <p className="t-small text-muted">{ayuda}</p>}
      </div>
      <div className={cn('text-right t-body num', fuerte ? 'font-bold text-ink' : 'text-ink')}>{laboral}</div>
      <div className={cn('text-right t-body num', fuerte ? 'font-bold text-ink' : 'text-ink')}>{prestacion}</div>
    </div>
  );
}

const NADA = <span className="text-muted">—</span>;

function BarraComparada({ etiqueta, valor, maximo, destacada, id }: { etiqueta: string; valor: number; maximo: number; destacada?: boolean; id: string }) {
  return (
    <div data-testid={`personal-cmp-barra-${id}`}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="t-label text-ink">{etiqueta}</span>
        <Dinero valor={valor} animar className="t-body font-bold text-ink" />
      </div>
      <div className="h-3 w-full bg-line-soft">
        <div className={cn('h-full transition-[width] duration-(--dur-slower) ease-standard', destacada ? 'bg-ink' : 'bg-chart-2')} style={{ width: `${maximo > 0 ? (valor / maximo) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

export interface PropsComparativo {
  cmp: ComparativoModalidades;
  /** Cargo o persona de la que se habla ("este cargo"). */
  sujeto?: string;
  /** La pestaña de costo ya trae su nota legal al final. */
  sinNota?: boolean;
}

export function ComparativoLadoALado({ cmp, sujeto = 'este cargo', sinNota }: PropsComparativo) {
  const l = cmp.laboral;
  const d = l.desglose;
  const p = cmp.prestacion;
  const maximo = Math.max(l.costoEmpleador, p.costoEmpleador);
  const queDeMas = cmp.quedaLaboral - cmp.quedaPrestacion;
  const retencion = p.desglose.totalBruto > 0 ? p.desglose.retencionFuente / p.desglose.totalBruto : 0;
  return (
    <section aria-label="Comparativo de modalidades" data-testid="personal-comparativo" className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 desk:grid-cols-[1.4fr_1fr]">
        <div className="border border-line bg-surface p-6">
          <div className="grid grid-cols-[1.3fr_1fr_1fr] items-end gap-4 border-b border-ink pb-3">
            <p className="t-eyebrow text-ink-2">Por cada mes</p>
            <p className="text-right t-h3 text-ink">Contrato laboral</p>
            <p className="text-right t-h3 text-ink">Prestación de servicios</p>
          </div>
          <Fila id="valor" etiqueta="Salario u honorarios" laboral={<Dinero valor={d.devengados.salario} />} prestacion={<Dinero valor={p.desglose.honorarios} />} />
          <Fila id="auxilio" etiqueta="Auxilio de transporte" laboral={d.devengados.auxilioTransporte > 0 ? <Dinero valor={d.devengados.auxilioTransporte} /> : NADA} prestacion={NADA} />
          <Fila
            id="aportes"
            etiqueta="Aportes del negocio"
            ayuda={d.exonerado114 ? 'Con exoneración de salud, ICBF y SENA' : 'Salud, pensión, riesgos, caja, ICBF y SENA'}
            laboral={<Dinero valor={d.totalAportes} />}
            prestacion={NADA}
          />
          <Fila id="prestaciones" etiqueta="Prestaciones que debes provisionar" ayuda="Prima, cesantías, intereses y vacaciones" laboral={<Dinero valor={d.totalProvisiones} />} prestacion={NADA} />
          <Fila id="costo" etiqueta="Le cuesta al negocio" fuerte laboral={<Dinero valor={l.costoEmpleador} animar />} prestacion={<Dinero valor={p.costoEmpleador} animar />} />
          <Fila id="retencion" etiqueta="Retención en la fuente" ayuda="Se descuenta del pago a la persona" laboral={NADA} prestacion={<span>−<Dinero valor={p.desglose.retencionFuente} /> <span className="t-small text-muted">({porcentaje(retencion, 0)})</span></span>} />
          <Fila id="recibe" etiqueta="Recibe en su pago" ayuda="Después de sus descuentos" laboral={<Dinero valor={cmp.laboral.neto} />} prestacion={<Dinero valor={p.neto} />} />
          <Fila
            id="queda"
            etiqueta="Le queda a la persona"
            ayuda="Después de pagar ella misma su seguridad social"
            laboral={<Dinero valor={cmp.quedaLaboral} />}
            prestacion={<Dinero valor={cmp.quedaPrestacion} />}
            fuerte
          />
          <Fila id="derechos" etiqueta="Prima, cesantías y vacaciones" laboral={<Badge tono="success" tamano="sm">Sí tiene</Badge>} prestacion={<Badge tono="neutral" tamano="sm">No tiene</Badge>} />
        </div>

        <div className="flex flex-col gap-6">
          <div className="border border-line bg-surface p-6" data-testid="personal-cmp-resumen">
            <p className="t-eyebrow text-ink-2">Lo que cambia para el negocio</p>
            <div className="mt-4 flex flex-col gap-4">
              <BarraComparada id="laboral" etiqueta="Contrato laboral" valor={l.costoEmpleador} maximo={maximo} destacada />
              <BarraComparada id="prestacion" etiqueta="Prestación de servicios" valor={p.costoEmpleador} maximo={maximo} />
            </div>
            <p className="mt-5 t-body text-ink-2" data-testid="personal-cmp-diferencia" data-valor={cmp.diferenciaCosto}>
              En el papel, {sujeto} cuesta{' '}
              <strong className="font-bold text-ink">
                <Dinero valor={cmp.diferenciaCosto} />
              </strong>{' '}
              menos cada mes por prestación de servicios, unos{' '}
              <strong className="font-bold text-ink">
                <Dinero valor={aAnio(cmp.diferenciaCosto)} corta />
              </strong>{' '}
              al año.
            </p>
            <p className="mt-3 t-body text-ink-2">
              A la persona, en cambio, le queda <Dinero valor={Math.abs(queDeMas)} className="font-bold text-ink" /> {queDeMas >= 0 ? 'más' : 'menos'} con contrato laboral y además conserva sus prestaciones y la cobertura de seguridad social.
            </p>
          </div>

          <div className="border border-line border-l-2 border-l-accent bg-surface p-6" data-testid="personal-cmp-nota-prudente">
            <p className="t-h3 text-ink">Antes de elegir la prestación de servicios</p>
            <p className="mt-2 t-body text-ink-2">{TEXTOS.comparativo.leccion}</p>
            <div className="mt-3">
              <NotaLegal tipo="contrato_realidad" />
            </div>
          </div>
        </div>
      </div>
      {!sinNota && <NotaNomina />}
    </section>
  );
}

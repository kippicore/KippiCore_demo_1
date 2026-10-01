import { TriangleAlert } from 'lucide-react';
import { Badge, BotonEnlace, Button, Dinero, Icono, NotaLegal } from '@/ui';
import type { ParametrosNomina } from '@/dominio/tipos';
import { plural } from '@/lib/formato';
import { rutas } from '@/app/rutas';
import type { ExposicionContratista } from '../selectores';
import { aAnio } from '../calculos';
import { TEXTOS } from '../textos';

/**
 * Alerta de riesgo de contrato realidad (PRD 7.9, PLAN 9.4 C1): en la lista, en la ficha de cada contratista afectado y
 * en el panel que abre `?riesgo=contrato-realidad`. Siempre con la nota prudente y sin citar normas.
 */
export interface ResumenExposicion {
  filas: ExposicionContratista[];
  diferencia: number;
}

/** Franja de la lista cuando hay contratistas con señales de relación laboral. */
export function AvisoRiesgoLista({ exposicion }: { exposicion: ResumenExposicion }) {
  const n = exposicion.filas.length;
  if (n === 0) return null;
  return (
    <section className="flex flex-wrap items-center gap-x-6 gap-y-3 border border-line border-l-2 border-l-warning bg-surface p-5" data-testid="personal-aviso-riesgo" aria-label={TEXTOS.riesgo.titulo}>
      <Icono icono={TriangleAlert} tamano={20} className="text-warning" />
      <div className="min-w-0 flex-1">
        <p className="t-h3 text-ink">{TEXTOS.riesgo.resumen(n)}</p>
        <p className="mt-1 t-body text-ink-2">
          Si fueran empleadas, tu nómina costaría <Dinero valor={exposicion.diferencia} className="font-bold text-ink" /> más al mes.
        </p>
      </div>
      <BotonEnlace to={rutas.personal({ riesgo: 'contrato-realidad' })} variante="secondary" data-testid="personal-ver-riesgo">
        Ver quiénes
      </BotonEnlace>
    </section>
  );
}

/** Panel que se abre con `?riesgo=contrato-realidad`: quiénes, por qué y cuánto cambiaría el costo. */
export function PanelRiesgo({ exposicion, parametros, alQuitar }: { exposicion: ResumenExposicion; parametros: ParametrosNomina; alQuitar: () => void }) {
  const n = exposicion.filas.length;
  const { semanasRevisadas, minimoTurnosPorSemana } = parametros.riesgoContratoRealidad;
  return (
    <section className="border border-ink bg-surface p-6" data-testid="personal-panel-riesgo" aria-label={TEXTOS.riesgo.titulo}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-[72ch]">
          <p className="flex items-center gap-2 t-eyebrow text-ink-2">
            <Icono icono={TriangleAlert} tamano={16} className="text-warning" />
            {TEXTOS.riesgo.titulo}
          </p>
          <h2 className="mt-2 t-h2 text-ink">{n === 0 ? 'Ningún contratista muestra señales de relación laboral' : TEXTOS.riesgo.resumen(n)}</h2>
          <p className="mt-3 t-body text-ink-2">
            {n === 0
              ? `Revisamos si alguien por prestación de servicios tiene turnos fijos (${minimoTurnosPorSemana} o más días por semana durante ${plural(semanasRevisadas, 'semana')} seguidas) y marcación de entrada y salida. Por ahora nadie cumple esas señales.`
              : TEXTOS.riesgo.explicacion}
          </p>
        </div>
        <Button variante="secondary" onClick={alQuitar} data-testid="personal-quitar-riesgo">
          {TEXTOS.riesgo.quitarFiltro}
        </Button>
      </div>

      {n > 0 && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 desk:grid-cols-3">
            <div className="border border-line p-4">
              <p className="t-eyebrow text-ink-2">Personas con señales</p>
              <p className="mt-2 t-kpi-sm text-ink">{n}</p>
              <p className="mt-1 t-small text-muted">
                Turnos de {minimoTurnosPorSemana} o más días por semana en las últimas {plural(semanasRevisadas, 'semana')} y marcación de entrada y salida.
              </p>
            </div>
            <div className="border border-line p-4" data-testid="personal-exposicion-mes">
              <p className="t-eyebrow text-ink-2">{TEXTOS.riesgo.exposicion}</p>
              <p className="mt-2 t-kpi-sm text-ink">
                <Dinero valor={exposicion.diferencia} animar />
              </p>
              <p className="mt-1 t-small text-muted">Cada mes, sumando a todas, si pasaran a contrato laboral.</p>
            </div>
            <div className="border border-line p-4">
              <p className="t-eyebrow text-ink-2">En un año</p>
              <p className="mt-2 t-kpi-sm text-ink">
                <Dinero valor={aAnio(exposicion.diferencia)} corta />
              </p>
              <p className="mt-1 t-small text-muted">Es lo que hoy no se paga en prestaciones y aportes.</p>
            </div>
          </div>
          <ul className="mt-6 divide-y divide-line-soft border-y border-line-soft">
            {exposicion.filas.map((f) => (
              <li key={f.riesgo.empleadoId} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3" data-testid={`personal-riesgo-${f.riesgo.empleadoId}`}>
                <div className="min-w-0">
                  <p className="t-body font-semibold text-ink">{f.riesgo.nombre}</p>
                  <p className="t-small text-muted">
                    {f.localNombre} · {plural(f.riesgo.semanasConTurnos, 'semana')} seguidas con turnos · {plural(f.riesgo.marcaciones, 'marcación', 'marcaciones')}
                  </p>
                </div>
                <p className="t-body text-ink-2">
                  <Dinero valor={f.costoActual} /> hoy → <Dinero valor={f.costoLaboral} className="font-bold text-ink" /> con contrato laboral
                </p>
                <BotonEnlace to={rutas.empleadoPestana(f.slug, 'costo')} variante="ghost" tamano="sm">
                  {TEXTOS.riesgo.verCosto}
                </BotonEnlace>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <NotaLegal tipo="contrato_realidad" />
            <BotonEnlace to={rutas.comparativoModalidades()} data-testid="personal-riesgo-comparar">
              {TEXTOS.riesgo.cta}
            </BotonEnlace>
          </div>
        </>
      )}
    </section>
  );
}

/** Aviso en la ficha de un contratista con señales de relación laboral. */
export function AvisoRiesgoFicha({ fila, parametros, enlace }: { fila: ExposicionContratista; parametros: ParametrosNomina; enlace?: { a: string; texto: string } }) {
  const { semanasRevisadas, minimoTurnosPorSemana } = parametros.riesgoContratoRealidad;
  return (
    <section className="flex flex-col gap-3 border border-line border-l-2 border-l-warning bg-surface p-5" data-testid="personal-riesgo-ficha" aria-label={TEXTOS.riesgo.titulo}>
      <div className="flex flex-wrap items-center gap-3">
        <Icono icono={TriangleAlert} tamano={20} className="text-warning" />
        <p className="t-h3 text-ink">{TEXTOS.riesgo.titulo}</p>
        <Badge tono="warning" tamano="sm">
          Por prestación de servicios
        </Badge>
      </div>
      <p className="max-w-[80ch] t-body text-ink-2">
        En cada una de las últimas {plural(semanasRevisadas, 'semana')} tuvo turno al menos {minimoTurnosPorSemana} días y suma {plural(fila.riesgo.marcaciones, 'marcación', 'marcaciones')} de entrada y salida. Si tuviera contrato laboral, el negocio pagaría{' '}
        <strong className="font-bold text-ink">
          <Dinero valor={fila.diferencia} />
        </strong>{' '}
        más al mes (<Dinero valor={fila.costoActual} /> hoy contra <Dinero valor={fila.costoLaboral} />).
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NotaLegal tipo="contrato_realidad" />
        {enlace && (
          <BotonEnlace to={enlace.a} variante="secondary" tamano="sm">
            {enlace.texto}
          </BotonEnlace>
        )}
      </div>
    </section>
  );
}

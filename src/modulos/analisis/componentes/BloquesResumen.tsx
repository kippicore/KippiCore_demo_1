import { ArrowRight, Lightbulb, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useDinero, useHoy, useSel } from '@/estado';
import { semanaIso } from '@/lib/fechas';
import { fechaCorta, MESES, mesCorto, porcentaje } from '@/lib/formato';
import { selHallazgos, selMapaCalor, selProyeccionMes, selVentasPorMes, selVentasPorSemana } from '@/selectores';
import { BarraProgreso, Card, cn, Dinero, EmptyState, GraficoDinero, Icono, MapaCalor, Pista, Variacion } from '@/ui';
import { diasDelMes } from '@/dominio/reglas/fechas';
import { etiquetaSemana, franjaMasFuerte, notaFranja, resumenCalor, resumenMeses } from '../calculos';
import { TXT } from '../textos';
import { DatoApoyo } from './Piezas';

const nombreMes = (m: string) => MESES[Number(m.slice(5, 7)) - 1] ?? '';
const textoLocal = (localId: string, nombre: string) => (localId === 'todos' ? 'Todos los locales' : `Local: ${nombre}`);

// ---------------------------------------------------------------------------------------------------------
// Hallazgos automáticos (selHallazgos): 3 a 5 frases con enlace
// ---------------------------------------------------------------------------------------------------------
export function BloqueHallazgos({ resaltar }: { resaltar: string | null }) {
  const hoy = useHoy();
  const hallazgos = useSel(selHallazgos, { hoy, maximo: 5 });
  return (
    <Pista id="analisis.hallazgos" alinear="fin">
      <section className="border border-ink bg-surface p-6" aria-labelledby="titulo-hallazgos" data-testid="hallazgos">
        <div className="flex items-start gap-3">
          <Icono icono={Lightbulb} tamano={20} className="mt-0.5 shrink-0 text-ink" />
          <div>
            <h2 id="titulo-hallazgos" className="t-h2 text-ink">
              {TXT.hallazgos.titulo}
            </h2>
            <p className="mt-1 max-w-[72ch] t-small text-muted">{TXT.hallazgos.nota}</p>
          </div>
        </div>
        {hallazgos.length === 0 ? (
          <EmptyState tamano="tabla" icono={Lightbulb} titulo={TXT.hallazgos.vacioTitulo} texto={TXT.hallazgos.vacioTexto} />
        ) : (
          <ol className="mt-5 divide-y divide-line-soft border-t border-line-soft">
            {hallazgos.map((h, i) => (
              <li
                key={h.id}
                data-testid="hallazgo"
                data-id={h.id}
                data-resaltado={resaltar === h.id || undefined}
                className={cn('flex flex-wrap items-center gap-x-6 gap-y-2 py-4 pl-3', resaltar === h.id && 'border-l-2 border-accent bg-accent-soft')}
              >
                <span aria-hidden className="w-6 shrink-0 t-label font-bold num text-ink-2">
                  {i + 1}
                </span>
                <p className="min-w-0 flex-1 basis-[420px] t-h3 text-ink" data-testid="hallazgo-frase">
                  {h.frase}
                </p>
                <Link to={h.enlace} className="inline-flex shrink-0 items-center gap-1.5 t-label font-bold text-ink underline-offset-4 hover:underline" data-testid="hallazgo-enlace">
                  {TXT.hallazgos.verMas}
                  <Icono icono={ArrowRight} tamano={14} />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </Pista>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Proyección del mes: "A este ritmo, cerrarías septiembre en $ X"
// ---------------------------------------------------------------------------------------------------------
export function BloqueProyeccion() {
  const hoy = useHoy();
  const p = useSel(selProyeccionMes, { hoy });
  const mes = nombreMes(p.mes);
  const avance = p.proyeccion > 0 ? Math.min(1, p.aLaFecha / p.proyeccion) : 0;
  return (
    <section className="border border-line bg-surface p-6" aria-labelledby="titulo-proyeccion" data-testid="proyeccion" data-proyeccion={p.proyeccion}>
      <p className="flex items-center gap-2 t-eyebrow text-ink-2">
        <Icono icono={TrendingUp} tamano={14} />
        {TXT.proyeccion.eyebrow}
      </p>
      {p.diasTranscurridos < 1 || p.proyeccion <= 0 ? (
        <EmptyState tamano="compacto" icono={TrendingUp} titulo={TXT.proyeccion.pronto} texto={TXT.proyeccion.prontoTexto} />
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-8 desk:grid-cols-12">
          <div className="desk:col-span-7">
            <h2 id="titulo-proyeccion" className="t-h2 text-ink">
              A este ritmo, cerrarías {mes} en
            </h2>
            <p className="mt-2 t-kpi-xl text-ink" data-testid="proyeccion-cifra">
              <Dinero valor={p.proyeccion} />
            </p>
            {p.anioAnterior !== null && p.anioAnterior > 0 && (
              <p className="mt-3 flex flex-wrap items-center gap-x-2 t-body text-ink-2" data-testid="proyeccion-anio">
                {p.proyeccion >= p.anioAnterior ? 'Es' : 'Serían'}{' '}
                <strong className="num text-ink">{porcentaje(Math.abs(p.proyeccion / p.anioAnterior - 1), 0)}</strong> {p.proyeccion >= p.anioAnterior ? 'más' : 'menos'} que {mes} del año pasado (
                <Dinero valor={p.anioAnterior} corta />).
              </p>
            )}
            <p className="mt-2 t-small text-muted">{TXT.proyeccion.comoSeCalcula(p.diasTranscurridos, diasDelMes(p.mes))}</p>
          </div>
          <div className="space-y-5 desk:col-span-5">
            <BarraProgreso
              valor={avance}
              etiqueta={
                <span>
                  Llevas <Dinero valor={p.aLaFecha} corta /> de los <Dinero valor={p.proyeccion} corta /> proyectados
                </span>
              }
              detalle={`Han pasado ${String(p.diasTranscurridos)} de ${String(diasDelMes(p.mes))} días`}
              alto={4}
            />
            {p.variacionMismoPeriodo !== null && (
              <div>
                <p className="t-eyebrow text-ink-2">Contra el mismo punto del año pasado</p>
                <p className="mt-1">
                  <Variacion v={{ valor: p.variacionMismoPeriodo, comparado: `en los mismos ${String(p.diasTranscurridos)} días de ${mes}` }} />
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Ventas por mes, 18 meses, con el año anterior
// ---------------------------------------------------------------------------------------------------------
export function GraficoMeses({ localId, nombreLocal, resaltarMes }: { localId: string; nombreLocal: string; resaltarMes: string | null }) {
  const hoy = useHoy();
  const serie = useSel(selVentasPorMes, { meses: 18, hoy, localId });
  const r = useMemo(() => resumenMeses(serie, hoy), [serie, hoy]);
  const datos = useMemo(() => serie.map((m) => ({ mes: m.mes, netas: m.netas, anterior: m.anioAnterior })), [serie]);
  const destacar = resaltarMes && serie.some((m) => m.mes === resaltarMes) ? resaltarMes : (r.mejor?.mes ?? null);
  const lectura = (
    <span data-testid="meses-lectura">
      {r.mejor && (
        <>
          {nombreMes(r.mejor.mes).replace(/^./, (c) => c.toUpperCase())} es tu mejor mes: <Dinero valor={r.mejor.netas} corta />.{' '}
        </>
      )}
      {r.variacion !== null && r.comparables > 0 && (
        <>
          En los {r.comparables} meses que podemos comparar con el año pasado vendes <strong className="num">{porcentaje(Math.abs(r.variacion), 0)}</strong> {r.variacion >= 0 ? 'más' : 'menos'}.{' '}
        </>
      )}
      {r.mesEnCursoIncompleto && 'El mes en curso va a la fecha. '}
      {textoLocal(localId, nombreLocal)}.
    </span>
  );
  return (
    <Card padding="normal" data-testid="grafico-meses">
      <GraficoDinero
        tipo="barras"
        titulo={TXT.mes.titulo}
        lectura={lectura}
        datos={datos}
        x="mes"
        series={[
          { clave: 'netas', nombre: TXT.mes.serieActual, color: 1 },
          { clave: 'anterior', nombre: TXT.mes.serieAnterior, tipo: 'linea', punteada: true },
        ]}
        formatoX={(m) => `${mesCorto(m)}-${m.slice(2, 4)}`}
        destacarX={destacar}
        etiquetasDirectas={false}
        alto={300}
        data-testid="grafico-meses-svg"
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Mapa de calor día × hora
// ---------------------------------------------------------------------------------------------------------
export function MapaDiaHora({ localId, nombreLocal, desde, hasta }: { localId: string; nombreLocal: string; desde: string; hasta: string }) {
  const d = useDinero();
  const mapa = useSel(selMapaCalor, { desde, hasta, localId });
  // El selector trae de 9 a. m. a 9 p. m.; el mapa de la interfaz va de 10 a. m. a 9 p. m. (12 columnas).
  const valores = useMemo(() => mapa.valores.map((f) => f.slice(1)), [mapa]);
  const franja = useMemo(() => franjaMasFuerte(valores, 4, 10), [valores]);
  const resumen = useMemo(() => resumenCalor(valores, 10), [valores]);
  const vacio = mapa.maximo <= 0;
  return (
    <Card padding="normal" data-testid="mapa-calor" data-franja={franja ? `${String(franja.fila)}-${String(franja.horaDesde)}` : undefined}>
      <h2 className="t-h3 text-ink">{TXT.calor.titulo}</h2>
      <p className="mt-1 mb-4 max-w-[72ch] t-small text-muted">
        {TXT.calor.subtitulo} {textoLocal(localId, nombreLocal)}.
      </p>
      {vacio ? (
        <EmptyState tamano="tabla" icono={TrendingUp} titulo="Sin ventas en este período" texto="Cuando haya ventas en este local, verás en qué días y horas se concentran." />
      ) : (
        <>
          <MapaCalor
            valores={valores}
            formatoValor={d.corta}
            hallazgo={franja ? { fila: franja.fila, desde: franja.desde, hasta: franja.hasta, nota: notaFranja(franja, porcentaje(franja.participacion, 0)) } : null}
          />
          {resumen && (
            <div className="mt-6 grid grid-cols-1 gap-6 border-t border-line-soft pt-5 sm:grid-cols-3" data-testid="calor-resumen">
              <DatoApoyo etiqueta="Tu día más fuerte" nota={`${porcentaje(resumen.mejorDia.participacion, 0)} de las ventas de la semana`} testid="calor-mejor-dia">
                {resumen.mejorDia.nombre}
              </DatoApoyo>
              <DatoApoyo etiqueta="Tu hora más fuerte" nota={`${porcentaje(resumen.mejorHora.participacion, 0)} de las ventas de la semana`} testid="calor-mejor-hora">
                {resumen.mejorHora.texto}
              </DatoApoyo>
              <DatoApoyo etiqueta="Tu día más flojo" nota={`${porcentaje(resumen.peorDia.participacion, 0)} de las ventas de la semana`} testid="calor-peor-dia">
                {resumen.peorDia.nombre}
              </DatoApoyo>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Ventas por semana del año
// ---------------------------------------------------------------------------------------------------------
export function GraficoSemanas({ localId, nombreLocal }: { localId: string; nombreLocal: string }) {
  const hoy = useHoy();
  const serie = useSel(selVentasPorSemana, { semanas: 52, hoy, localId });
  const datos = useMemo(() => serie.map((s) => ({ lunes: s.lunes, netas: s.netas })), [serie]);
  // La semana en curso va incompleta (hasta el domingo): no compite por "la más fuerte".
  const completas = useMemo(() => (serie.length > 0 ? serie.slice(0, -1) : serie), [serie]);
  const fuerte = completas.reduce<(typeof serie)[number] | null>((a, s) => (!a || s.netas > a.netas ? s : a), null);
  const floja = completas.filter((s) => s.netas > 0).reduce<(typeof serie)[number] | null>((a, s) => (!a || s.netas < a.netas ? s : a), null);
  const etiqueta = (l: string) => `${etiquetaSemana(l, semanaIso(l).semana)}`;
  const lectura = (
    <span data-testid="semanas-lectura">
      {fuerte && (
        <>
          Tu semana más fuerte fue la del {fechaCorta(fuerte.lunes)} (<Dinero valor={fuerte.netas} corta />)
          {floja && floja.lunes !== fuerte.lunes && (
            <>
              ; la más floja, la del {fechaCorta(floja.lunes)} (<Dinero valor={floja.netas} corta />)
            </>
          )}
          .{' '}
        </>
      )}
      La última barra es la semana en curso. {textoLocal(localId, nombreLocal)}.
    </span>
  );
  return (
    <Card padding="normal" data-testid="grafico-semanas">
      <GraficoDinero
        tipo="barras"
        titulo={TXT.semana.titulo}
        lectura={lectura}
        datos={datos}
        x="lunes"
        series={[{ clave: 'netas', nombre: 'Ventas de la semana', color: 1 }]}
        formatoX={(l) => etiqueta(l)}
        destacarX={fuerte?.lunes ?? null}
        alto={260}
        data-testid="grafico-semanas-svg"
      />
    </Card>
  );
}

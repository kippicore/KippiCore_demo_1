import { Store } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParamsRuta } from '@/app/useParamsRuta';
import { sumarDias } from '@/dominio/reglas/fechas';
import { useDinero, useHoy, usePuede, useSel } from '@/estado';
import { entero, numero, porcentaje } from '@/lib/formato';
import { selDesempenoLocales, selDesempenoVendedores, selMapaCalor } from '@/selectores';
import { Badge, Card, cn, Dinero, EmptyState, MapaCalor, Segmentado } from '@/ui';
import { encontrarEstrella, franjaMasFuerte, notaFranja, rangoDePeriodo, ticketVsVolumen } from '../calculos';
import { EncabezadoAnalisis } from '../componentes/EncabezadoAnalisis';
import { BarrasHorizontales, CabezaSeccion, LimiteErrores, SelectorPeriodo, type FilaBarra } from '../componentes/Piezas';
import { selDomingoPorLocal } from '../selectores';
import type { IdPeriodo } from '../textos';

/**
 * Análisis · Locales y vendedores (PRD 7.12, P1, P2, P8): cómo le va a cada local (cuántas ventas, cuánto vale cada
 * una), cómo se mueve cada local durante la semana y quién se destaca en el equipo.
 */
export default function Locales() {
  const { resaltar } = useParamsRuta('analisisLocales');
  const hoy = useHoy();
  const d = useDinero();
  const verMargen = usePuede()('ver.margenes');
  const [periodo, setPeriodo] = useState<IdPeriodo>('90d');
  const rango = rangoDePeriodo(hoy, periodo);
  const locales = useSel(selDesempenoLocales, rango);
  const vendedores = useSel(selDesempenoVendedores, rango);
  const ventana = { desde: sumarDias(hoy, -83), hasta: hoy };
  const domingos = useSel(selDomingoPorLocal, ventana);
  const [localCalor, setLocalCalor] = useState('todos');
  const mapa = useSel(selMapaCalor, { ...ventana, localId: localCalor });

  const contraste = useMemo(() => ticketVsVolumen(locales.map((l) => ({ nombre: l.nombre, numVentas: l.resumen.numVentas, ticket: l.resumen.ticket }))), [locales]);
  const estrella = useMemo(() => encontrarEstrella(vendedores), [vendedores]);
  const valores = useMemo(() => mapa.valores.map((f) => f.slice(1)), [mapa]);
  const franja = useMemo(() => franjaMasFuerte(valores, 4, 10), [valores]);
  const promedioEquipo = vendedores.length ? vendedores.reduce((s, v) => s + v.ventas, 0) / vendedores.length : 0;
  const nombreLocal = (id: string | null) => locales.find((l) => l.localId === id)?.nombre ?? null;

  const filasVentas: FilaBarra[] = locales.map((l) => ({
    id: `v-${l.localId}`,
    etiqueta: l.nombre,
    valor: l.resumen.numVentas,
    texto: `${entero(l.resumen.numVentas)} ventas`,
    tono: contraste && l.nombre === contraste.localVolumen ? 'destacado' : 'normal',
  }));
  const filasTicket: FilaBarra[] = locales.map((l) => ({
    id: `t-${l.localId}`,
    etiqueta: l.nombre,
    valor: l.resumen.ticket,
    texto: <Dinero valor={l.resumen.ticket} corta />,
    tono: contraste && l.nombre === contraste.localTicket ? 'destacado' : 'normal',
  }));

  const dom = [...domingos].filter((x) => x.domingo > 0).sort((a, b) => b.domingo - a.domingo);
  const fuerte = dom[0];
  const debil = dom[dom.length - 1];
  const filasDomingo: FilaBarra[] = domingos.map((x) => ({
    id: `d-${x.localId}`,
    etiqueta: x.nombre,
    valor: x.domingo,
    texto: <Dinero valor={x.domingo} corta />,
    nota: x.total > 0 ? `${porcentaje(x.domingo / x.total, 0)} de lo que vende el local` : undefined,
    tono: fuerte && x.localId === fuerte.localId && dom.length > 1 ? 'destacado' : 'normal',
  }));

  const filasVendedores: FilaBarra[] = vendedores.map((v) => ({
    id: v.empleadoId,
    etiqueta: v.nombre,
    valor: v.ventas,
    texto: <Dinero valor={v.ventas} corta />,
    nota: (
      <span>
        {nombreLocal(v.localId) ?? 'Sin local'} · {entero(v.numVentas)} ventas · ticket <Dinero valor={v.ticket} corta /> · {porcentaje(v.conAccesorio, 0)} con accesorio
      </span>
    ),
    tono: estrella && v.nombre === estrella.nombre ? 'destacado' : v.empleadoId === resaltar ? 'destacado' : 'normal',
    insignia:
      estrella && v.nombre === estrella.nombre ? (
        <Badge tono="accent" tamano="sm">
          Estrella
        </Badge>
      ) : undefined,
  }));

  return (
    <>
      <EncabezadoAnalisis
        titulo="Locales y vendedores"
        subtitulo="Cómo le va a cada local, cómo se mueve durante la semana y quién se destaca en tu equipo."
        migaActual="Locales y vendedores"
        acciones={<SelectorPeriodo valor={periodo} alCambiar={setPeriodo} etiqueta="Período de los locales y vendedores" testid="locales-periodo" />}
      />

      <div className="mt-8 flex flex-col gap-10">
        {/* Cada local */}
        <section aria-labelledby="titulo-locales" data-testid="locales-seccion">
          <CabezaSeccion id="titulo-locales" titulo="Cómo le va a cada local" texto="Ventas netas de devoluciones y con IVA, en el período elegido." />
          {locales.length === 0 ? (
            <Card padding="ninguno">
              <EmptyState icono={Store} titulo="Sin ventas en el período" texto="Elige un período más largo para comparar tus locales." />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 desk:grid-cols-3">
              {locales.map((l) => (
                <Card key={l.localId} padding="normal" className={cn(resaltar === l.localId && 'border-ink')} data-testid={`local-${l.localId}`} data-valor={l.resumen.netas}>
                  <p className="t-eyebrow text-ink-2">{l.nombre}</p>
                  <p className="mt-2 t-kpi text-ink">
                    <Dinero valor={l.resumen.netas} corta />
                  </p>
                  <div className="mt-3">
                    <div className="h-1 bg-selected" aria-hidden>
                      <div className="h-full bg-ink" style={{ width: `${String(Math.round(l.participacion * 100))}%` }} />
                    </div>
                    <p className="mt-1.5 t-small text-muted">{porcentaje(l.participacion, 0)} de las ventas de los locales</p>
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line-soft pt-4">
                    <div>
                      <dt className="t-micro text-ink-2">Ventas</dt>
                      <dd className="t-body font-semibold num text-ink">{entero(l.resumen.numVentas)}</dd>
                    </div>
                    <div>
                      <dt className="t-micro text-ink-2">Ticket promedio</dt>
                      <dd className="t-body font-semibold num text-ink">
                        <Dinero valor={l.resumen.ticket} corta />
                      </dd>
                    </div>
                    <div>
                      <dt className="t-micro text-ink-2">Prendas por venta</dt>
                      <dd className="t-body font-semibold num text-ink">{numero(l.unidadesPorVenta, 1)}</dd>
                    </div>
                    {verMargen && (
                      <div>
                        <dt className="t-micro text-ink-2">Margen</dt>
                        <dd className="t-body font-semibold num text-ink">{porcentaje(l.resumen.margenPct, 0)}</dd>
                      </div>
                    )}
                  </dl>
                </Card>
              ))}
            </div>
          )}
          {contraste && (
            <p className="mt-5 max-w-[72ch] border-l-2 border-accent pl-3 t-h3 text-ink" data-testid="locales-contraste">
              {contraste.localTicket} hace menos ventas que {contraste.localVolumen}, pero cada una vale {numero(contraste.veces, 1)} veces más.
            </p>
          )}
          {locales.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-6 desk:grid-cols-2">
              <Card padding="normal">
                <h3 className="t-h3 text-ink">Cuántas ventas hace cada local</h3>
                <BarrasHorizontales filas={filasVentas} className="mt-3" anchoEtiqueta={130} anchoTexto={120} testid="barras-ventas-local" />
              </Card>
              <Card padding="normal">
                <h3 className="t-h3 text-ink">Cuánto vale cada venta</h3>
                <BarrasHorizontales filas={filasTicket} className="mt-3" anchoEtiqueta={130} anchoTexto={120} testid="barras-ticket-local" />
              </Card>
            </div>
          )}
        </section>

        {/* Cómo se mueve cada local */}
        <section aria-labelledby="titulo-semana-local" data-testid="locales-calor">
          <CabezaSeccion
            id="titulo-semana-local"
            titulo="Cómo se mueve cada local en la semana"
            texto="Últimas 12 semanas. Sirve para decidir en qué días y horas reforzar el turno."
            derecha={
              <Segmentado
                etiqueta="Local del mapa de calor"
                valor={localCalor}
                alCambiar={setLocalCalor}
                data-testid="calor-local"
                opciones={[{ valor: 'todos', etiqueta: 'Todos', 'data-testid': 'calor-local-todos' }, ...locales.map((l) => ({ valor: l.localId, etiqueta: l.nombre, 'data-testid': `calor-local-${l.localId}` }))]}
              />
            }
          />
          <LimiteErrores titulo="No pudimos armar el mapa de calor">
            <Card padding="normal">
              {mapa.maximo <= 0 ? (
                <EmptyState tamano="tabla" icono={Store} titulo="Sin ventas en este local" texto="Cuando haya ventas, verás en qué días y horas se concentran." />
              ) : (
                <MapaCalor valores={valores} formatoValor={d.corta} hallazgo={franja ? { fila: franja.fila, desde: franja.desde, hasta: franja.hasta, nota: notaFranja(franja, porcentaje(franja.participacion, 0)) } : null} />
              )}
              {fuerte && debil && fuerte.localId !== debil.localId && (
                <div className="mt-6 border-t border-line-soft pt-5" data-testid="locales-domingos">
                  <h3 className="t-h3 text-ink">Los domingos no se parecen entre locales</h3>
                  <p className="mt-1 max-w-[72ch] border-l-2 border-accent pl-3 t-body text-ink" data-testid="domingos-lectura">
                    Los domingos, {fuerte.nombre} vende {porcentaje(fuerte.domingo / debil.domingo - 1, 0)} más que {debil.nombre}. Vale la pena reforzar el turno ese día.
                  </p>
                  <BarrasHorizontales filas={filasDomingo} className="mt-3" anchoEtiqueta={130} anchoTexto={120} testid="barras-domingo" />
                </div>
              )}
            </Card>
          </LimiteErrores>
        </section>

        {/* Equipo */}
        <section aria-labelledby="titulo-equipo" data-testid="locales-equipo">
          <CabezaSeccion id="titulo-equipo" titulo="Tu equipo de ventas" texto="Lo que vendió cada persona en el período (ventas con IVA). La línea marca el promedio del equipo." />
          <Card padding="normal">
            {vendedores.length === 0 ? (
              <EmptyState tamano="tabla" icono={Store} titulo="Sin ventas en el período" texto="Elige un período más largo para ver quién vende más." />
            ) : (
              <>
                {estrella && (
                  <p className="mb-5 max-w-[72ch] border-l-2 border-accent pl-3 t-h3 text-ink" data-testid="equipo-estrella">
                    {estrella.nombre} vende {porcentaje(estrella.porcentajeMas, 0)} más que el promedio del equipo.
                    {estrella.destacaAccesorio && ` El ${porcentaje(estrella.conAccesorio, 0)} de sus ventas incluye un accesorio, frente al ${porcentaje(estrella.accesorioResto, 0)} del resto.`}
                  </p>
                )}
                <BarrasHorizontales
                  filas={filasVendedores}
                  marca={promedioEquipo > 0 ? { valor: promedioEquipo, etiqueta: 'Promedio del equipo' } : null}
                  anchoEtiqueta={330}
                  anchoTexto={110}
                  testid="barras-vendedores"
                />
              </>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}

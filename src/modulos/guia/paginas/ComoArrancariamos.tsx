import { ArrowRight, FileSpreadsheet, Handshake, Monitor, ShieldCheck, Smartphone, Tablet, WifiOff, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { rolPuedeVer, rutas, type NombreRuta } from '@/app/rutas';
import { COMO_ARRANCARIAMOS as T } from '@/config/textos/guia';
import { emitirUI, useRolActivo } from '@/estado';
import { cn } from '@/ui/cn';
import { ImportarExcelSimulado } from '@/ui/conectados/ImportarExcelSimulado';
import { clasesBoton } from '@/ui/primitivos/Button';
import { EncabezadoPagina } from '@/ui/primitivos/EncabezadoPagina';
import { Icono } from '@/ui/primitivos/Icono';
import { enlaceHablar } from '../enlaces';
import { TEXTOS_ARRANCAR } from '../textos';

/**
 * Página "Cómo arrancaríamos" `/panel/como-arrancariamos` (PLAN 2.8): desactiva "esto debe costar una fortuna",
 * "pasar mis Excel" y "mi gente no va a poder", y provoca la pregunta "¿y cuánto vale?" sin hablar de precio ni
 * prometer cifras técnicas. Etapas con semanas aproximadas, "cargamos tus Excel nosotros", dónde funciona, qué pasa
 * si se cae el internet (capacidad que se diseña en la implementación), datos tuyos, convive con tu facturador y
 * tu contador, y "Hablar con KippiCore" (`wa.me`, sin destinatario si no hay número configurado).
 * Emite `como_arrancariamos_visto` al montar. `data-testid`: `arrancar`, `arrancar-etapa-<n>`, `arrancar-hablar`.
 */
const SEMANAS = Array.from({ length: 12 }, (_, i) => i + 1);
const DEMO_POR_ETAPA: readonly NombreRuta[] = ['pos', 'importaciones', 'nomina'];
const COLORES_ETAPA = ['bg-chart-1 text-inverse', 'bg-chart-2 text-inverse', 'bg-chart-3 text-ink'] as const;

export default function ComoArrancariamos() {
  const rol = useRolActivo();
  const navegar = useNavigate();
  useEffect(() => {
    emitirUI('como_arrancariamos_visto');
  }, []);
  const inicioDelRol = rol === 'dueno' ? rutas.inicio() : rol === 'vendedor' ? rutas.miDia() : rutas.inventario();

  return (
    <div data-testid="arrancar" className="pb-10">
      <EncabezadoPagina titulo={T.titulo} subtitulo={TEXTOS_ARRANCAR.subtitulo} />

      {/* 1. Por etapas */}
      <section className="mt-10" aria-labelledby="arrancar-etapas">
        <h2 id="arrancar-etapas" className="t-h2">
          {T.etapas.titulo}
        </h2>
        <Cronograma />
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {T.etapas.items.map((etapa, i) => {
            const detalle = TEXTOS_ARRANCAR.etapasDetalle[i];
            const destino = DEMO_POR_ETAPA[i];
            return (
              <article key={etapa.etapa} data-testid={`arrancar-etapa-${i + 1}`} className="flex flex-col border border-line bg-surface p-6">
                <p className="t-eyebrow text-ink-2">
                  {etapa.etapa} · {etapa.semanas}
                </p>
                <h3 className="mt-3 t-h3">{etapa.titulo}</h3>
                <ul className="mt-4 flex flex-1 flex-col gap-2">
                  {detalle?.incluye.map((x) => (
                    <li key={x} className="flex items-start gap-3 t-body-lg text-ink-2">
                      <span aria-hidden className="mt-2.5 block h-px w-3 shrink-0 bg-ink" />
                      {x}
                    </li>
                  ))}
                </ul>
                {destino && rolPuedeVer(destino, rol) && (
                  <Link to={rutas[destino]()} className="mt-5 inline-flex items-center gap-2 t-nav text-ink underline-offset-4 hover:underline">
                    {TEXTOS_ARRANCAR.verEnDemo}
                    <Icono icono={ArrowRight} tamano={14} />
                  </Link>
                )}
              </article>
            );
          })}
        </div>
        <p className="mt-4 t-small text-muted">{T.etapas.nota}</p>
      </section>

      {/* 2 a 6. Lo que desactiva las objeciones */}
      <section className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-6" aria-label="Lo que tienes que saber">
        <Tarjeta icono={FileSpreadsheet} titulo={T.excel.titulo} testid="arrancar-excel" className="lg:col-span-3">
          <p className="t-body-lg text-ink-2">{T.excel.texto}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {TEXTOS_ARRANCAR.excelItems.map((x) => (
              <li key={x} className="border border-line-strong bg-canvas px-3 py-1.5 t-label text-ink">
                {x}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <ImportarExcelSimulado que="tus referencias y existencias" />
          </div>
        </Tarjeta>

        <Tarjeta icono={Monitor} titulo={T.dispositivos.titulo} testid="arrancar-dispositivos" className="lg:col-span-3">
          <p className="t-body-lg text-ink-2">{T.dispositivos.texto}</p>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {TEXTOS_ARRANCAR.dispositivos.map((d, i) => (
              <li key={d.titulo} className="border border-line bg-canvas p-3">
                <Icono icono={[Monitor, Tablet, Smartphone][i] ?? Monitor} tamano={20} className="text-ink" />
                <p className="mt-2 t-label text-ink">{d.titulo}</p>
                <p className="mt-1 t-small text-muted">{d.texto}</p>
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta icono={WifiOff} titulo={T.internet.titulo} testid="arrancar-internet" className="lg:col-span-2">
          <p className="t-body-lg text-ink-2">{T.internet.texto}</p>
          <p className="mt-3 t-small text-muted">{TEXTOS_ARRANCAR.internetNota}</p>
        </Tarjeta>

        <Tarjeta icono={ShieldCheck} titulo={T.datos.titulo} testid="arrancar-datos" className="lg:col-span-2">
          <p className="t-body-lg text-ink-2">{T.datos.texto}</p>
        </Tarjeta>
        <Tarjeta icono={Handshake} titulo={T.contador.titulo} testid="arrancar-contador" className="lg:col-span-2">
          <p className="t-body-lg text-ink-2">{T.contador.texto}</p>
        </Tarjeta>
      </section>

      {/* 7. CTA */}
      <section className="sobre-ink mt-12 flex flex-col gap-8 bg-ink p-8 text-inverse md:flex-row md:items-center md:justify-between md:p-10" aria-label="Hablar con KippiCore">
        <div className="max-w-[52ch]">
          <p className="t-eyebrow text-inverse/80">{T.cta.hablar}</p>
          <h2 className="mt-3 text-[2rem] font-black uppercase leading-[1.1] text-inverse">{T.cta.subtitulo}</h2>
          <p className="mt-3 t-body-lg text-inverse/80">{TEXTOS_ARRANCAR.cierre}</p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-4 md:items-end">
          <a href={enlaceHablar()} target="_blank" rel="noopener noreferrer" data-testid="arrancar-hablar" className={clasesBoton({ variante: 'inverse', tamano: 'lg' })}>
            {T.cta.hablar}
          </a>
          <button type="button" onClick={() => navegar(inicioDelRol)} className="t-nav text-inverse underline underline-offset-4 hover:no-underline" data-testid="arrancar-seguir">
            {T.cta.seguir}
          </button>
        </div>
      </section>
    </div>
  );
}

/** Cronograma de 12 semanas: tres barras de cuatro semanas, con la numeración debajo. */
function Cronograma() {
  return (
    <div className="mt-6" role="img" aria-label="Cronograma aproximado: etapa 1 semanas 1 a 4, etapa 2 semanas 5 a 8, etapa 3 semanas 9 a 12">
      <div className="grid grid-cols-12 gap-1">
        {T.etapas.items.map((etapa, i) => (
          <div key={etapa.etapa} className={cn('col-span-4 flex h-12 items-center px-4 t-label font-bold uppercase', COLORES_ETAPA[i])}>
            {etapa.etapa} · {etapa.semanas}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-12 gap-1" aria-hidden>
        {SEMANAS.map((s) => (
          <span key={s} className="t-small num text-muted">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function Tarjeta({ icono, titulo, testid, className, children }: { icono: LucideIcon; titulo: string; testid: string; className?: string; children: ReactNode }) {
  return (
    <article data-testid={testid} className={cn('flex flex-col border border-line bg-surface p-6', className)}>
      <Icono icono={icono} tamano={24} className="text-ink" />
      <h3 className="mt-4 t-h3">{titulo}</h3>
      <div className="mt-3">{children}</div>
    </article>
  );
}

import { ArrowRight, Copy, Share2 } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { rutas, rutaDeUrl, RUTAS } from '@/app/rutas';
import { ENTRADA } from '@/config/textos/guia';
import { MARCA } from '@/config/marca';
import { PERSONAS_ROL } from '@/config/permisos';
import { emitirUI, useDatos, useGuia, useHoy, useMarca, useSesion } from '@/estado';
import { fechaLarga } from '@/lib/formato';
import { AvisoNavegadorInterno } from '@/ui/conectados/Guia';
import { Button } from '@/ui/primitivos/Button';
import { Icono } from '@/ui/primitivos/Icono';
import { Input } from '@/ui/primitivos/Input';
import { Skeleton } from '@/ui/primitivos/Estados';

const QrEntrada = lazy(() => import('../componentes/QrEntrada'));

/**
 * Pantalla de entrada `/` (PLAN 2.2, 8.4.7) con el diseño de F2-C; el paquete E2 la completa (personalización con
 * Configuración, "Prueba esto"). Dos puertas: el sistema completo (panel negro) y la app del dueño (QR). No espera
 * los datos: el motor construye mientras se lee. Conserva `data-testid`: `entrada`, `progreso-entrada`.
 */
export default function Entrada() {
  const marca = useMarca();
  const hoy = useHoy();
  const progreso = useDatos((s) => s.progreso);
  const listo = useDatos((s) => s.estado !== null);
  const localVendedor = useDatos((s) => s.estado?.usuarios[PERSONAS_ROL.vendedor.usuarioId]?.localFijoId ?? null);
  const ultimaRuta = useSesion((s) => s.ultimaRuta);
  const cambiarRol = useSesion((s) => s.cambiarRol);
  const personalizar = useSesion((s) => s.personalizarMarca);
  const actual = useSesion((s) => s.marcaPersonalizada);
  const visitas = useGuia((s) => s.visitas);
  const contarVisita = useGuia((s) => s.contarVisita);
  const navegar = useNavigate();
  const [panel, setPanel] = useState(false);
  const [negocio, setNegocio] = useState(actual.nombreNegocio ?? '');
  const [persona, setPersona] = useState(actual.nombrePersona ?? '');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
    document.title = `${marca.nombre} · Así se vería tu negocio en un solo lugar`;
  }, [marca.nombre]);
  useEffect(() => {
    contarVisita();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const repetida = visitas > 1 && !!ultimaRuta && ultimaRuta.startsWith('/panel');
  const ibasEn = repetida && ultimaRuta ? rutaDeUrl(ultimaRuta) : null;
  const datosAl = ENTRADA.datosAl.replace('{{fechaLarga}}', fechaLarga(hoy).replace(/^./, (c) => c.toLowerCase()));
  const firma = ENTRADA.firma.replace('{{marca}}', marca.nombre.toUpperCase());

  const entrarComoVendedor = () => {
    cambiarRol('vendedor', localVendedor);
    emitirUI('rol_cambiado', { a: 'vendedor' });
    navegar(rutas.miDia());
  };
  const copiar = () => {
    void navigator.clipboard?.writeText(window.location.origin).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };
  const compartir = () => {
    if (navigator.share) void navigator.share({ title: `${marca.nombre} · KippiCore`, url: window.location.origin }).catch(() => undefined);
    else copiar();
  };

  return (
    <main data-testid="entrada" className="min-h-dvh bg-canvas text-ink">
      <AvisoNavegadorInterno />
      <div className="mx-auto flex min-h-dvh max-w-[960px] flex-col px-6 py-8 animate-fade-in-slow md:py-10">
        <div className="flex items-baseline justify-between gap-4">
          <p className="t-eyebrow text-ink-2">{firma}</p>
          <p className="hidden t-small text-ink-2 md:block">{datosAl}</p>
        </div>

        <section className="mt-16 flex flex-col items-center text-center md:mt-20">
          <h1 className="t-wordmark-entrada max-md:text-[2.75rem]">{marca.nombre}</h1>
          <p className="mt-4 t-eyebrow text-ink-2">{marca.descriptor}</p>
          <p className="mt-4 t-small text-muted">
            {marca.esEjemplo ? MARCA.avisoEjemplo : `Demo personalizada para ${marca.nombre}.`}{' '}
            <button type="button" onClick={() => setPanel((p) => !p)} className="font-semibold text-ink underline underline-offset-4 hover:no-underline">
              <span className="hidden md:inline">{ENTRADA.personalizar}</span>
              <span className="md:hidden">{ENTRADA.personalizarCorto}</span>
            </button>
          </p>
          {panel && (
            <form
              className="mt-6 grid w-full max-w-[560px] grid-cols-1 gap-4 border border-line bg-surface p-6 text-left md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                personalizar({ nombreNegocio: negocio.trim() || null, nombrePersona: persona.trim() || null });
                emitirUI('marca_personalizada');
                setPanel(false);
              }}
            >
              <Input etiqueta={ENTRADA.campoNegocio} opcional value={negocio} onChange={(e) => setNegocio(e.target.value)} maxLength={28} />
              <Input etiqueta={ENTRADA.campoPersona} opcional value={persona} onChange={(e) => setPersona(e.target.value)} maxLength={28} />
              <div className="flex items-center justify-end gap-3 md:col-span-2">
                {!marca.esEjemplo && (
                  <Button
                    variante="ghost"
                    onClick={() => {
                      personalizar({ nombreNegocio: null, nombrePersona: null });
                      setNegocio('');
                      setPersona('');
                      setPanel(false);
                    }}
                  >
                    {ENTRADA.volverAHalden.replace('{{marcaOriginal}}', 'HALDEN')}
                  </Button>
                )}
                <Button type="submit">Guardar nombre</Button>
              </div>
            </form>
          )}
          <p className="mt-10 max-w-[56ch] t-body-lg text-muted">
            <span className="hidden md:inline">{ENTRADA.frase}</span>
            <span className="md:hidden">{ENTRADA.fraseCelular}</span>
          </p>
        </section>

        {/* Computador y tableta: dos puertas */}
        <section className="mt-12 hidden grid-cols-1 gap-4 md:grid lg:grid-cols-2">
          <div className="sobre-ink flex flex-col border border-ink bg-ink p-8 text-inverse">
            <p className="t-eyebrow text-inverse/80">{ENTRADA.puertaComputador.ceja}</p>
            <h2 className="mt-3 t-h2">{ENTRADA.puertaComputador.titulo}</h2>
            <p className="mt-3 max-w-[40ch] t-body text-inverse/80">{ENTRADA.puertaComputador.texto}</p>
            <div className="mt-auto pt-10">
              <Button variante="inverse" tamano="lg" iconoDerecha={ArrowRight} onClick={() => navegar(repetida && ultimaRuta ? ultimaRuta : rutas.inicio())} data-testid="entrar-dueno">
                {repetida ? ENTRADA.puertaComputador.botonVisitaRepetida : ENTRADA.puertaComputador.boton}
              </Button>
              {ibasEn && <p className="mt-3 t-small text-inverse/80">{ENTRADA.puertaComputador.ibasEn.replace('{{modulo}}', RUTAS[ibasEn].titulo)}</p>}
              <button type="button" onClick={entrarComoVendedor} className="mt-5 block t-small text-inverse underline underline-offset-4 hover:no-underline">
                {ENTRADA.puertaComputador.vendedor}
              </button>
            </div>
          </div>
          <div className="flex flex-col border border-line bg-surface p-8 transition-colors duration-(--dur-instant) hover:border-ink">
            <p className="t-eyebrow text-ink-2">{ENTRADA.puertaCelular.ceja}</p>
            <h2 className="mt-3 t-h2">{ENTRADA.puertaCelular.titulo}</h2>
            <p className="mt-3 max-w-[40ch] t-body text-muted">{ENTRADA.puertaCelular.texto}</p>
            <div className="mt-6 flex items-end justify-between gap-6">
              <div className="border border-line p-2">
                <Suspense fallback={<Skeleton className="size-40" />}>
                  <QrEntrada />
                </Suspense>
              </div>
            </div>
            <Link to={rutas.app()} className="mt-5 t-small text-ink underline underline-offset-4 hover:no-underline">
              {ENTRADA.puertaCelular.marco}
            </Link>
          </div>
        </section>

        {/* Celular */}
        <section className="mt-10 flex flex-col gap-6 md:hidden">
          <Button tamano="lg" anchoCompleto iconoDerecha={ArrowRight} onClick={() => navegar(rutas.app())} data-testid="abrir-app">
            {ENTRADA.puertaCelular.boton}
          </Button>
          <div className="border border-line bg-surface p-5">
            <h2 className="t-h3">{ENTRADA.sistemaCompletoCelular.titulo}</h2>
            <p className="mt-1 t-body text-muted">{ENTRADA.sistemaCompletoCelular.texto}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variante="secondary" icono={Share2} onClick={compartir}>
                {ENTRADA.sistemaCompletoCelular.compartir}
              </Button>
              <button type="button" onClick={copiar} className="inline-flex h-10 items-center gap-2 px-2 t-nav text-ink">
                <Icono icono={Copy} tamano={16} />
                {copiado ? ENTRADA.sistemaCompletoCelular.copiado : ENTRADA.sistemaCompletoCelular.copiar}
              </button>
            </div>
          </div>
        </section>

        <div className="min-h-12 flex-1" />
        <footer className="flex flex-col gap-3 border-t border-line pt-6 t-small text-muted md:flex-row md:items-start md:justify-between">
          <p className="max-w-[64ch]">{ENTRADA.pie}</p>
          <p className="shrink-0 text-ink-2">{MARCA.firmaKippicore}</p>
        </footer>
        <p data-testid="progreso-entrada" className="sr-only" aria-live="polite">
          {listo ? 'Datos listos' : `Preparando los datos… ${Math.round(progreso)} %`}
        </p>
      </div>
    </main>
  );
}

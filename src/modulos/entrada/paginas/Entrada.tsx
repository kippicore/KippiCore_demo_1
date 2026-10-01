import { ArrowRight, Check, Copy, Share2 } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { rutaDeUrl, rutas, rolPuedeVer, RUTAS } from '@/app/rutas';
import { MARCA } from '@/config/marca';
import { ENTRADA } from '@/config/textos/guia';
import { almacenGuia, almacenSesion, emitirUI, useDatos, useHoy, useMarca, useSel, useSesion } from '@/estado';
import { fechaLarga, plural } from '@/lib/formato';
import { selClientesActivos, selLocalesQueVenden, selProductosActivos } from '@/selectores';
import { AvisoNavegadorInterno } from '@/ui/conectados/Guia';
import { Button } from '@/ui/primitivos/Button';
import { Icono } from '@/ui/primitivos/Icono';
import { Skeleton } from '@/ui/primitivos/Estados';
import { BarraProgreso } from '@/ui/primitivos/Piezas';
import { PanelPersonalizar } from '../componentes/PanelPersonalizar';
import { Wordmark } from '../componentes/Wordmark';
import { TEXTOS_ENTRADA } from '../textos';

const QrEntrada = lazy(() => import('../componentes/QrEntrada'));
// Lo que no hace falta para el primer pintado se carga aparte (la entrada se abre casi siempre desde un celular):
// las ilustraciones del cartel y el modal de "ver la app" (con Radix), que solo se pide al pulsar el enlace.
const CartelComputador = lazy(() => import('../componentes/Cartel').then((m) => ({ default: m.CartelComputador })));
const CartelCelular = lazy(() => import('../componentes/Cartel').then((m) => ({ default: m.CartelCelular })));
const ModalAppDuenoDiferido = lazy(() => import('@/movil/publico').then((m) => ({ default: m.ModalAppDueno })));

/**
 * Pantalla de entrada `/` (PLAN 2.2, PRD 10): lo primero que ve el cliente, en computador y en celular. Se pinta sin
 * esperar los datos (todo su contenido es estático; el motor construye los 18 meses mientras se lee y la franja
 * inferior lo cuenta). Dos puertas: el sistema completo (panel negro; con enlace secundario al vendedor) y la app
 * del dueño (QR real hacia `origen/app`; en celular, botón a `/app`). "HALDEN es una marca de ejemplo" +
 * "Personalizar con el nombre de mi negocio". Visita repetida: "Continuar como dueño · Ibas en: …".
 * `data-testid`: `entrada`, `entrada-wordmark`, `entrar-dueno`, `entrar-vendedor`, `abrir-app`, `progreso-entrada`.
 */
export default function Entrada() {
  const marca = useMarca();
  const hoy = useHoy();
  const ultimaRuta = useSesion((s) => s.ultimaRuta);
  const cambiarRol = useSesion((s) => s.cambiarRol);
  const navegar = useNavigate();
  const [panel, setPanel] = useState(false);
  const [previa, setPrevia] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [marcoPedido, setMarcoPedido] = useState(false);
  // ¿Ya había venido (a la entrada o al panel)? Se lee UNA vez al montar: contar esta visita no debe cambiar el botón.
  const [yaVisito] = useState(() => almacenGuia.getState().visitas >= 1 || !!almacenSesion.getState().ultimaRuta?.startsWith('/panel'));

  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
    document.title = `${marca.nombre} · Así se vería tu negocio en un solo lugar`;
  }, [marca.nombre]);
  useEffect(() => {
    almacenGuia.getState().contarVisita();
  }, []);

  const nombreMostrado = previa ?? marca.nombre;
  // A dónde lo lleva "Continuar": el último módulo del panel que el dueño puede ver (nunca una pantalla del vendedor).
  const nombreUltima = ultimaRuta?.startsWith('/panel') ? rutaDeUrl(ultimaRuta.split('?')[0] ?? ultimaRuta) : null;
  const destinoContinuar = yaVisito && ultimaRuta && nombreUltima && nombreUltima !== 'comoArrancariamos' && rolPuedeVer(nombreUltima, 'dueno') ? ultimaRuta : null;
  const datosAl = ENTRADA.datosAl.replace('{{fechaLarga}}', fechaLarga(hoy).replace(/^./, (c) => c.toLowerCase()));
  const firma = ENTRADA.firma.replace('{{marca}}', marca.nombre.toUpperCase());

  const entrarComoDueno = () => {
    if (almacenSesion.getState().rol !== 'dueno') {
      cambiarRol('dueno', null);
      emitirUI('rol_cambiado', { a: 'dueno' });
    }
    navegar(destinoContinuar ?? rutas.inicio());
  };
  const entrarComoVendedor = () => {
    cambiarRol('vendedor', null);
    emitirUI('rol_cambiado', { a: 'vendedor' });
    navegar(rutas.miDia());
  };
  const copiar = () => {
    void navigator.clipboard?.writeText(window.location.origin).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };
  /** "o ábrela aquí en un marco de celular": carga el modal de la app (chunk aparte) y lo abre. */
  const abrirMarcoCelular = () => {
    void import('@/movil/publico').then((m) => {
      setMarcoPedido(true);
      m.abrirAppDueno();
    });
  };
  const compartir = () => {
    if (navigator.share) void navigator.share({ title: `${marca.nombre} · KippiCore`, url: window.location.origin }).catch(() => undefined);
    else copiar();
  };

  return (
    <main data-testid="entrada" className="min-h-dvh bg-canvas text-ink">
      <AvisoNavegadorInterno />
      <div className="mx-auto flex min-h-dvh max-w-[1120px] flex-col px-6 pb-8 pt-6 animate-fade-in-slow md:pt-8">
        <header className="flex items-baseline justify-between gap-4">
          <p className="t-eyebrow text-ink-2">{firma}</p>
          <p className="hidden t-small text-ink-2 md:block">{datosAl}</p>
        </header>

        {/* Hero: marca y titular a la izquierda, cartel de prendas a la derecha (solo computador) */}
        <section className="mt-9 grid gap-8 md:mt-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14 [@media(max-height:760px)]:lg:mt-5">
          <div className="min-w-0">
            <Wordmark nombre={nombreMostrado} />
            <p className="mt-3 t-eyebrow text-ink-2">{marca.descriptor}</p>
            <p className="mt-3 t-small text-muted">
              {marca.esEjemplo ? MARCA.avisoEjemplo : `Demo personalizada para ${marca.nombre}.`}{' '}
              <button
                type="button"
                data-testid="entrada-personalizar-abrir"
                aria-expanded={panel}
                onClick={() => setPanel((p) => !p)}
                className="font-semibold text-ink underline underline-offset-4 hover:no-underline"
              >
                <span className="hidden md:inline">{ENTRADA.personalizar}</span>
                <span className="md:hidden">{ENTRADA.personalizarCorto}</span>
              </button>
            </p>
            {panel && <PanelPersonalizar alVistaPrevia={setPrevia} alCerrar={() => setPanel(false)} />}

            <h2 className="mt-8 hidden max-w-[16ch] text-[2.75rem] font-black uppercase leading-[1.04] tracking-[-0.01em] text-ink md:block [@media(max-height:760px)]:mt-4 [@media(max-height:760px)]:text-[2rem]">
              {TEXTOS_ENTRADA.titular}
            </h2>
            <h2 className="mt-7 text-[1.625rem] font-black uppercase leading-[1.1] tracking-[-0.005em] text-ink md:hidden">{ENTRADA.fraseCelular}</h2>
            <p className="mt-4 hidden max-w-[44ch] t-body-lg text-muted md:block [@media(max-height:760px)]:mt-2">{TEXTOS_ENTRADA.frase}</p>
            <div className="mt-6 md:hidden">
              <Suspense fallback={<div aria-hidden className="grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => <div key={i} className="aspect-[3/4] border border-line-strong bg-product" />)}</div>}>
                <CartelCelular />
              </Suspense>
            </div>
          </div>
          <div className="hidden self-start lg:block">
            <Suspense fallback={<div aria-hidden className="mx-auto h-[392px] w-full max-w-[460px] [@media(max-height:760px)]:h-[300px]" />}>
              <CartelComputador />
            </Suspense>
          </div>
        </section>

        {/* Computador y tableta: dos puertas */}
        <section className="mt-10 hidden grid-cols-1 gap-4 md:grid lg:grid-cols-2 [@media(max-height:760px)]:lg:mt-5" aria-label="Elige cómo entrar">
          <div className="sobre-ink flex flex-col border border-ink bg-ink p-7 text-inverse [@media(max-height:760px)]:p-6">
            <p className="t-eyebrow text-inverse/80">{ENTRADA.puertaComputador.ceja}</p>
            <h3 className="mt-2 t-h2">{ENTRADA.puertaComputador.titulo}</h3>
            <p className="mt-3 max-w-[48ch] t-body text-inverse/80">{ENTRADA.puertaComputador.texto}</p>
            <div className="mt-auto pt-6">
              <Button variante="inverse" tamano="lg" iconoDerecha={ArrowRight} onClick={entrarComoDueno} data-testid="entrar-dueno">
                {yaVisito ? ENTRADA.puertaComputador.botonVisitaRepetida : ENTRADA.puertaComputador.boton}
              </Button>
              {destinoContinuar && nombreUltima && (
                <p className="mt-3 t-small text-inverse/80" data-testid="entrada-ibas-en">
                  {ENTRADA.puertaComputador.ibasEn.replace('{{modulo}}', RUTAS[nombreUltima].titulo)}
                </p>
              )}
              <button
                type="button"
                onClick={entrarComoVendedor}
                data-testid="entrar-vendedor"
                className="mt-4 block t-small text-inverse underline underline-offset-4 hover:no-underline"
              >
                {ENTRADA.puertaComputador.vendedor}
              </button>
            </div>
          </div>
          <div className="flex flex-col border border-line bg-surface p-7 [@media(max-height:760px)]:p-6 transition-colors duration-(--dur-instant) hover:border-ink">
            <div className="flex flex-1 items-start justify-between gap-6">
              <div className="min-w-0">
                <p className="t-eyebrow text-ink-2">{ENTRADA.puertaCelular.ceja}</p>
                <h3 className="mt-2 t-h2">{ENTRADA.puertaCelular.titulo}</h3>
                <p className="mt-3 max-w-[34ch] t-body text-muted">{ENTRADA.puertaCelular.texto}</p>
              </div>
              <div className="shrink-0 border border-line bg-surface p-2" data-testid="entrada-qr">
                <Suspense fallback={<Skeleton className="size-40" />}>
                  <QrEntrada />
                </Suspense>
              </div>
            </div>
            <button
              type="button"
              onClick={abrirMarcoCelular}
              data-testid="entrada-marco-celular"
              className="mt-5 self-start t-small text-ink underline underline-offset-4 hover:no-underline"
            >
              {TEXTOS_ENTRADA.marcoCelular}
            </button>
          </div>
        </section>

        {/* Celular */}
        <section className="mt-8 flex flex-col gap-6 md:hidden">
          <Button tamano="lg" anchoCompleto iconoDerecha={ArrowRight} onClick={() => navegar(rutas.app())} data-testid="abrir-app">
            {ENTRADA.puertaCelular.boton}
          </Button>
          <div className="border border-line bg-surface p-5">
            <h3 className="t-h3">{ENTRADA.sistemaCompletoCelular.titulo}</h3>
            <p className="mt-1 t-body text-muted">{ENTRADA.sistemaCompletoCelular.texto}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variante="secondary" icono={Share2} onClick={compartir} data-testid="entrada-compartir">
                {ENTRADA.sistemaCompletoCelular.compartir}
              </Button>
              <button type="button" onClick={copiar} className="inline-flex h-10 items-center gap-2 px-2 t-nav text-ink" data-testid="entrada-copiar">
                <Icono icono={Copy} tamano={16} />
                {copiado ? ENTRADA.sistemaCompletoCelular.copiado : ENTRADA.sistemaCompletoCelular.copiar}
              </button>
            </div>
          </div>
        </section>

        <div className="min-h-8 flex-1" />
        <FranjaDatos nombre={marca.nombre} />
        <footer className="mt-4 flex flex-col gap-3 border-t border-line pt-4 t-small text-muted md:flex-row md:items-start md:justify-between">
          <p className="max-w-[64ch]">{ENTRADA.pie}</p>
          <p className="shrink-0 text-ink-2">{MARCA.firmaKippicore}</p>
        </footer>
      </div>
      {marcoPedido && (
        <Suspense fallback={null}>
          <ModalAppDuenoDiferido />
        </Suspense>
      )}
    </main>
  );
}

/**
 * Franja de progreso (PLAN 2.2, "contenido útil mientras se generan los datos"): mientras el motor construye los 18
 * meses cuenta cuánto va; cuando termina dice con qué datos de ejemplo se encontrará el cliente.
 */
function FranjaDatos({ nombre }: { nombre: string }) {
  const fase = useDatos((s) => s.fase);
  const progreso = useDatos((s) => s.progreso);
  const listo = useDatos((s) => s.estado !== null);
  return (
    <div data-testid="progreso-entrada" data-listo={listo || undefined} aria-live="polite">
      {listo ? (
        <ResumenListo />
      ) : fase === 'error' ? (
        <p role="alert" className="t-small text-danger">
          {TEXTOS_ENTRADA.error}
        </p>
      ) : (
        <BarraProgreso valor={progreso / 100} etiqueta={TEXTOS_ENTRADA.progreso.replace('{{marca}}', nombre)} alto={2} />
      )}
    </div>
  );
}

function ResumenListo() {
  const locales = useSel(selLocalesQueVenden);
  const productos = useSel(selProductosActivos);
  const clientes = useSel(selClientesActivos);
  const texto = TEXTOS_ENTRADA.listo
    .replace('{{locales}}', plural(locales.length, 'local', 'locales'))
    .replace('{{referencias}}', plural(productos.length, 'referencia'))
    .replace('{{clientes}}', plural(clientes.length, 'cliente'));
  return (
    <p className="inline-flex items-center gap-2 t-small text-ink-2">
      <Icono icono={Check} tamano={14} className="text-success" />
      {texto}
    </p>
  );
}

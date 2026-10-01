import { ArrowRight, ChevronDown, ListChecks, Minus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { rutaDeUrl, rutas, type NombreRuta } from '@/app/rutas';
import { PRUEBA_ESTO, type ItemPruebaEsto } from '@/config/textos/guia';
import { almacenGuia, almacenSesion, useGuia, useRolActivo } from '@/estado';
import { cn } from '@/ui/cn';
import { BotonIcono } from '@/ui/primitivos/BotonIcono';
import { Button, clasesBoton } from '@/ui/primitivos/Button';
import { Icono } from '@/ui/primitivos/Icono';
import { BarraProgreso } from '@/ui/primitivos/Piezas';
import { useDestinos, type Destino } from '../destinos';
import { enlaceHablar } from '../enlaces';
import { almacenPanelLocal, useAbiertoEnRol } from '../panelLocal';
import { contarExtras, contarPrincipales, IDS_EXTRA, TOTAL_PRINCIPALES } from '../progreso';
import { TEXTOS_GUIA } from '../textos';
import { useDeteccion } from '../useDeteccion';

/** Retraso con que aparece el panel la primera vez (PLAN 2.4). */
const APARECE_EN_MS = 1200;
/** A partir de cuántos ítems principales aparece "Hablar con KippiCore" y se despliega "Para ir más lejos". */
const ITEMS_PARA_HABLAR = 3;
const ITEMS_PARA_IR_MAS_LEJOS = 5;
/** Alto mínimo de la ventana para que la primera vez salga desplegado: en pantallas más bajas arranca como píldora. */
const ALTO_MINIMO_DESPLEGADO = 800;

/**
 * Panel flotante "Prueba esto" (PLAN 2.4): abajo a la derecha, 320 px, minimizable a una píldora "Prueba esto · 3/8".
 * Aparece desplegado 1,2 s después de la primera llegada a Inicio, solo si la ventana mide al menos 800 px de alto
 * (en otra pantalla o en una ventana baja, como píldora). Al navegar fuera de Inicio pasa solo a píldora, para no
 * tapar KPI, botones ni columnas de tablas. Su alto está limitado (≈ 60 % de la ventana) y la lista se desplaza dentro.
 * No oscurece ni bloquea nada; en el POS se oculta del todo (taparía "Confirmar venta") y en la vista de un rol que no es el dueño
 * arranca como píldora. Cada ítem lleva al lugar exacto; los ítems se marcan solos (`useDeteccion`).
 * `data-testid`: `guia-panel`, `guia-pildora`, `guia-contador`, `guia-item-<id>`, `guia-cierre`, `guia-hablar`.
 */
export function GuiaFlotante() {
  useDeteccion();
  const { pathname } = useLocation();
  const nombreRuta = rutaDeUrl(pathname);
  const rol = useRolActivo();
  const completados = useGuia((s) => s.completados);
  const minimizado = useGuia((s) => s.panelMinimizado);
  const bienvenida = useGuia((s) => s.bienvenidaVista);
  const abiertoEnRol = useAbiertoEnRol();
  const [pasado, setPasado] = useState(false);
  const listo = bienvenida || pasado;
  // Dónde está la persona cuando se cumple el 1,2 s (el efecto del temporizador no se rehace al navegar).
  const ahoraEn = useRef<NombreRuta | null>(nombreRuta);
  useEffect(() => {
    ahoraEn.current = nombreRuta;
  }, [nombreRuta]);

  // Primera vez: aparece 1,2 s después (desplegado si está en Inicio como dueño; si no, como píldora).
  useEffect(() => {
    if (almacenGuia.getState().bienvenidaVista) return;
    const t = setTimeout(() => {
      const g = almacenGuia.getState();
      const enInicio = ahoraEn.current === 'inicio' && almacenSesion.getState().rol === 'dueno';
      const cabe = window.innerHeight >= ALTO_MINIMO_DESPLEGADO;
      g.minimizarPanel(!(enInicio && cabe));
      g.marcarBienvenida();
      setPasado(true);
    }, APARECE_EN_MS);
    return () => clearTimeout(t);
  }, []);
  // Al navegar fuera de Inicio el panel pasa a píldora (se puede volver a abrir a mano con la píldora o desde el menú "?").
  useEffect(() => {
    if (nombreRuta === 'inicio' || !almacenGuia.getState().bienvenidaVista) return;
    almacenGuia.getState().minimizarPanel(true);
    almacenPanelLocal.setState({ abiertoEnRol: false });
  }, [nombreRuta]);
  // En otro rol el panel vuelve a ser píldora.
  useEffect(() => {
    almacenPanelLocal.setState({ abiertoEnRol: false });
  }, [rol]);

  // El POS tiene "Confirmar venta" abajo a la derecha: el panel se oculta del todo ahí (se vuelve a ver al salir).
  if (!listo || nombreRuta === 'pos' || nombreRuta === 'caja') return null;

  const hechos = contarPrincipales(completados);
  const extra = rol !== 'dueno' && !abiertoEnRol;
  const expandido = !minimizado && !extra;

  const minimizar = () => {
    almacenGuia.getState().minimizarPanel(true);
    almacenPanelLocal.setState({ abiertoEnRol: false });
  };
  const abrir = () => {
    almacenGuia.getState().minimizarPanel(false);
    almacenPanelLocal.setState({ abiertoEnRol: true });
  };

  if (!expandido) {
    return (
      <button
        type="button"
        onClick={abrir}
        data-testid="guia-pildora"
        aria-label={`${TEXTOS_GUIA.abrir}: ${hechos} de ${TOTAL_PRINCIPALES}`}
        className="sobre-ink fixed bottom-6 right-6 z-(--z-tryit) inline-flex h-10 items-center gap-2 rounded-chrome bg-ink px-4 t-button-sm text-inverse shadow-float transition-colors duration-(--dur-instant) hover:bg-ink/85 animate-pop-in"
      >
        <Icono icono={ListChecks} tamano={16} />
        {PRUEBA_ESTO.pildora.replace('{{hechos}}', String(hechos))}
      </button>
    );
  }
  return <PanelPruebaEsto hechos={hechos} completados={completados} alMinimizar={minimizar} />;
}

function PanelPruebaEsto({ hechos, completados, alMinimizar }: { hechos: number; completados: readonly string[]; alMinimizar: () => void }) {
  const destinos = useDestinos();
  const navegar = useNavigate();
  const [extrasManual, setExtrasManual] = useState<boolean | null>(null);
  const [verLista, setVerLista] = useState(false);
  const completo = hechos === TOTAL_PRINCIPALES;
  const extrasAbierto = extrasManual ?? hechos >= ITEMS_PARA_IR_MAS_LEJOS;

  const elegir = (id: string) => {
    destinos[id]?.ir();
    alMinimizar();
  };

  return (
    <aside
      aria-label={PRUEBA_ESTO.titulo}
      data-testid="guia-panel"
      className="fixed bottom-6 right-6 z-(--z-tryit) flex max-h-[min(60dvh,calc(100dvh-7rem))] w-[320px] flex-col overflow-hidden border border-line bg-surface text-ink shadow-float"
    >
      {completo && !verLista ? (
        <TarjetaCierre alSeguir={alMinimizar} alVerLista={() => setVerLista(true)} alComoArrancariamos={() => navegar(rutas.comoArrancariamos())} />
      ) : (
        <>
          <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
            <div className="min-w-0">
              <p className="t-eyebrow text-ink">{PRUEBA_ESTO.titulo}</p>
              <p className="mt-1 t-small text-muted">{PRUEBA_ESTO.subtitulo}</p>
            </div>
            <div className="-mr-2 -mt-1 flex shrink-0 items-center gap-1">
              <span className="t-label num text-ink-2" data-testid="guia-contador">
                {PRUEBA_ESTO.contador.replace('{{hechos}}', String(hechos))}
              </span>
              <BotonIcono icono={Minus} etiqueta={TEXTOS_GUIA.minimizar} tamano="sm" onClick={alMinimizar} data-testid="guia-minimizar" />
            </div>
          </header>
          <div className="px-4 pb-2">
            <BarraProgreso valor={hechos / TOTAL_PRINCIPALES} alto={2} meta />
          </div>
          <div className="min-h-0 overflow-y-auto">
            <ol className="border-t border-line-soft">
              {PRUEBA_ESTO.items.map((item) => (
                <Fila key={item.id} item={item} hecho={completados.includes(item.id)} destino={destinos[item.id]} alElegir={() => elegir(item.id)} />
              ))}
            </ol>
            <MasLejos completados={completados} abierto={extrasAbierto} alAlternar={() => setExtrasManual(!extrasAbierto)} destinos={destinos} alElegir={elegir} />
          </div>
          {hechos >= ITEMS_PARA_HABLAR && !completo && (
            <footer className="border-t border-line px-4 py-3 t-small text-ink-2" data-testid="guia-linea-kippicore">
              <p>{PRUEBA_ESTO.lineaKippicore}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2">
                <button type="button" onClick={() => navegar(rutas.comoArrancariamos())} className="font-bold text-ink underline underline-offset-4 hover:no-underline" data-testid="guia-como-arrancariamos">
                  {TEXTOS_GUIA.linea.comoArrancariamos}
                </button>
                <span aria-hidden>·</span>
                <a href={enlaceHablar()} target="_blank" rel="noopener noreferrer" className="font-bold text-ink underline underline-offset-4 hover:no-underline" data-testid="guia-hablar">
                  {TEXTOS_GUIA.linea.hablar}
                </a>
              </p>
            </footer>
          )}
          {completo && (
            <footer className="border-t border-line px-4 py-3">
              <button type="button" onClick={() => setVerLista(false)} className="t-small font-bold text-ink underline underline-offset-4 hover:no-underline">
                Volver a la tarjeta final
              </button>
            </footer>
          )}
        </>
      )}
    </aside>
  );
}

function Fila({ item, hecho, destino, alElegir }: { item: ItemPruebaEsto; hecho: boolean; destino: Destino | undefined; alElegir: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={alElegir}
        disabled={!destino}
        data-testid={`guia-item-${item.id}`}
        data-hecho={hecho ? 'si' : 'no'}
        className="group flex min-h-11 w-full items-start gap-3 px-4 py-2.5 text-left transition-colors duration-(--dur-instant) hover:bg-surface-2"
      >
        <Marca hecho={hecho} />
        <span className={cn('min-w-0 flex-1 t-small', hecho ? 'text-muted' : 'text-ink')}>
          {item.texto}
          {hecho && <span className="sr-only"> ({TEXTOS_GUIA.hechoEtiqueta})</span>}
        </span>
        <Icono icono={ArrowRight} tamano={14} className="mt-1 shrink-0 text-subtle opacity-0 transition-opacity duration-(--dur-instant) group-hover:opacity-100 group-focus-visible:opacity-100" />
      </button>
    </li>
  );
}

/** Círculo del ítem: al completarse se rellena en camel y la marca se dibuja en 250 ms (PLAN 2.4). */
function Marca({ hecho }: { hecho: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
        hecho ? 'border-accent bg-accent text-inverse' : 'border-line-strong bg-surface',
      )}
    >
      {hecho && (
        <svg viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5.5 10.5l3 3 6-6.5" pathLength={1} strokeDasharray={1} className="animate-draw" style={{ animationDuration: '250ms' }} />
        </svg>
      )}
    </span>
  );
}

function MasLejos({
  completados,
  abierto,
  alAlternar,
  destinos,
  alElegir,
}: {
  completados: readonly string[];
  abierto: boolean;
  alAlternar: () => void;
  destinos: Record<string, Destino>;
  alElegir: (id: string) => void;
}) {
  const hechos = contarExtras(completados);
  return (
    <section className="border-t border-line">
      <button
        type="button"
        onClick={alAlternar}
        aria-expanded={abierto}
        data-testid="guia-mas-lejos"
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors duration-(--dur-instant) hover:bg-surface-2"
      >
        <span className="t-label text-ink">{PRUEBA_ESTO.paraIrMasLejos.titulo}</span>
        <span className="inline-flex items-center gap-2 t-small num text-muted">
          {TEXTOS_GUIA.masLejosContador.replace('{{hechos}}', String(hechos)).replace('{{total}}', String(IDS_EXTRA.length))}
          <Icono icono={ChevronDown} tamano={14} className={cn('transition-transform duration-(--dur-fast)', abierto && 'rotate-180')} />
        </span>
      </button>
      {abierto && (
        <ol className="border-t border-line-soft">
          {PRUEBA_ESTO.paraIrMasLejos.items.map((item) => (
            <Fila key={item.id} item={item} hecho={completados.includes(item.id)} destino={destinos[item.id]} alElegir={() => alElegir(item.id)} />
          ))}
        </ol>
      )}
    </section>
  );
}

/** Al completar 8 de 8 el panel se transforma en la tarjeta de cierre (PLAN 2.4). */
function TarjetaCierre({ alSeguir, alVerLista, alComoArrancariamos }: { alSeguir: () => void; alVerLista: () => void; alComoArrancariamos: () => void }) {
  const c = PRUEBA_ESTO.cierre;
  return (
    <div className="p-5" data-testid="guia-cierre">
      <span aria-hidden className="block h-0.5 w-10 bg-accent" />
      <h2 className="mt-4 t-h2">{c.titulo}</h2>
      <p className="mt-3 t-body text-muted">{c.texto}</p>
      <div className="mt-5 flex flex-col gap-3">
        <Button tamano="lg" anchoCompleto onClick={alComoArrancariamos} data-testid="guia-cierre-arrancar">
          {c.comoArrancariamos}
        </Button>
        <a
          href={enlaceHablar()}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="guia-cierre-hablar"
          className={clasesBoton({ variante: 'secondary', tamano: 'lg', anchoCompleto: true })}
        >
          {c.hablar}
        </a>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" onClick={alSeguir} className="t-small font-bold text-ink underline underline-offset-4 hover:no-underline" data-testid="guia-cierre-seguir">
          {c.seguir}
        </button>
        <button type="button" onClick={alVerLista} className="t-small text-muted underline underline-offset-4 hover:text-ink hover:no-underline">
          Ver la lista
        </button>
      </div>
    </div>
  );
}

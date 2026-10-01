import { Copy, Download, MonitorSmartphone, Share2, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { APP } from '@/config/textos/guia';
import { avisar, Button, Icono } from '@/ui/ligero';
import { TXT } from '../textos';
import { enlaceParaCompartir, esIosNavegador, esNavegadorInternoApp, esPwaInstalada } from './entorno';
import { eventoInstalacion, olvidarEventoInstalacion, suscribirInstalacion } from './eventoInstalacion';
import { Tarjeta } from './Tarjeta';

/**
 * Instalación como PWA (PLAN 5.11, 4.4) y "Abre el sistema completo en tu computador" (PLAN 2.1, recorrido alterno).
 *
 * - `beforeinstallprompt` (Android/Chrome) lo guarda `eventoInstalacion.ts` desde la primera pantalla de /app.
 * - En un navegador interno (WhatsApp, Instagram, Facebook) no se puede instalar: el texto dice primero "Ábrela en
 *   Safari o Chrome".
 * - En iPhone no hay evento: se explica Compartir → Agregar a inicio.
 * - Los enlaces fuera del alcance de la app instalada (`/panel`) abren Safari: por eso la tarjeta del computador solo
 *   comparte o copia; NUNCA navega.
 */
function usePuedeInstalar(): boolean {
  const [, forzar] = useState(0);
  useEffect(() => suscribirInstalacion(() => forzar((n) => n + 1)), []);
  return eventoInstalacion() !== null;
}

async function copiarEnlace(): Promise<void> {
  const url = enlaceParaCompartir();
  try {
    await navigator.clipboard.writeText(url);
    avisar({ tipo: 'exito', texto: TXT.abrirEnComputador.copiado });
  } catch {
    avisar({ tipo: 'alerta', texto: 'No pudimos copiar el enlace desde este navegador.', detalle: url });
  }
}

export function TarjetaInstalar() {
  const puedeInstalar = usePuedeInstalar();
  const instalada = esPwaInstalada();
  const interno = esNavegadorInternoApp();
  const ios = esIosNavegador();
  const [texto, accion] = instalada
    ? [TXT.instalar.instaladaTexto, null]
    : interno
      ? [TXT.instalar.interno, 'copiar' as const]
      : puedeInstalar
        ? [TXT.instalar.android, 'instalar' as const]
        : ios
          ? [TXT.instalar.ios, null]
          : [TXT.instalar.androidManual, null];
  return (
    <Tarjeta className="p-4" data-testid="app-instalar">
      <div className="flex items-start gap-3">
        <Icono icono={Smartphone} tamano={22} className="mt-0.5 shrink-0 text-ink-2" />
        <div className="min-w-0 flex-1">
          <h2 className="t-h3 text-ink">{instalada ? TXT.instalar.instalada : TXT.instalar.titulo}</h2>
          <p className="mt-1 t-small text-muted">{texto}</p>
          {instalada && ios && <p className="mt-2 t-small text-muted">{APP.explicacionPwaIos}</p>}
        </div>
      </div>
      {accion === 'instalar' && (
        <Button
          className="mt-3"
          tamano="lg"
          anchoCompleto
          icono={Download}
          data-testid="app-instalar-boton"
          onClick={() => {
            const e = eventoInstalacion();
            if (!e) return;
            void e
              .prompt()
              .then(() => e.userChoice)
              .then(olvidarEventoInstalacion);
          }}
        >
          {TXT.instalar.boton}
        </Button>
      )}
      {accion === 'copiar' && (
        <Button className="mt-3" tamano="lg" variante="secondary" anchoCompleto icono={Copy} onClick={() => void copiarEnlace()}>
          {TXT.instalar.copiar}
        </Button>
      )}
    </Tarjeta>
  );
}

/** "Abre el sistema completo en tu computador": compartir (menú nativo) o copiar el enlace. Nunca navega. */
export function TarjetaAbrirEnComputador() {
  const puedeCompartir = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  return (
    <Tarjeta className="p-4" data-testid="app-abrir-computador">
      <div className="flex items-start gap-3">
        <Icono icono={MonitorSmartphone} tamano={22} className="mt-0.5 shrink-0 text-ink-2" />
        <div className="min-w-0 flex-1">
          <h2 className="t-h3 text-ink">{TXT.abrirEnComputador.titulo}</h2>
          <p className="mt-1 t-small text-muted">{TXT.abrirEnComputador.texto}</p>
        </div>
      </div>
      <div className={puedeCompartir ? 'mt-3 grid grid-cols-2 gap-3' : 'mt-3'}>
        {puedeCompartir && (
          <Button
            tamano="lg"
            icono={Share2}
            data-testid="app-compartir"
            onClick={() => {
              void navigator.share({ title: 'KippiCore CRM', text: TXT.abrirEnComputador.titulo, url: enlaceParaCompartir() }).catch(() => undefined);
            }}
          >
            {TXT.abrirEnComputador.compartir}
          </Button>
        )}
        <Button tamano="lg" variante={puedeCompartir ? 'secondary' : 'primary'} anchoCompleto icono={Copy} data-testid="app-copiar-enlace" onClick={() => void copiarEnlace()}>
          {TXT.abrirEnComputador.copiar}
        </Button>
      </div>
    </Tarjeta>
  );
}

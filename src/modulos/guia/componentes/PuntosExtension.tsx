import { CircleHelp, Eye, EyeOff, ListChecks, MessageCircle, Rocket, RotateCcw, Smartphone, DoorOpen } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { rutaDeUrl, rutas } from '@/app/rutas';
import { MENU_AYUDA } from '@/config/textos/guia';
import { almacenDatos, useGuia, useRolActivo } from '@/estado';
import { enlaceHablarConKippicore } from '@/lib/enlaces';
import { abrirAppDueno } from '@/movil/publico';
import { ConfirmarEliminacion } from '@/ui/primitivos/ConfirmarEliminacion';
import { ItemMenu, Menu, SeparadorMenu } from '@/ui/primitivos/Popover';
import { Icono } from '@/ui/primitivos/Icono';
import { avisar } from '@/ui/primitivos/Toast';
import { almacenPanelLocal } from '../panelLocal';
import { contarPrincipales } from '../progreso';

/**
 * Menú "?" de la barra superior (PLAN 2.6, ÚNICA definición): reabre la entrada, el panel "Prueba esto" (con su
 * conteo), la app en el celular y "Cómo arrancaríamos"; apaga o enciende las pistas; restaura los datos; y, si hay
 * número configurado, "Hablar con KippiCore". El panel flotante vive en `GuiaFlotante.tsx`; ambos se exportan por
 * `publico.ts` (PLAN 9.1.6).
 */
export function MenuAyuda() {
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const rol = useRolActivo();
  const completados = useGuia((s) => s.completados);
  const ocultas = useGuia((s) => s.pistasOcultas);
  const ocultarPistas = useGuia((s) => s.ocultarPistas);
  const minimizar = useGuia((s) => s.minimizarPanel);
  const [restaurando, setRestaurando] = useState(false);
  const hechos = contarPrincipales(completados);
  /** "Mostrar Prueba esto": el panel se oculta en el POS, así que desde allí primero sale a la pantalla de inicio del rol. */
  const mostrarPrueba = () => {
    minimizar(false);
    almacenPanelLocal.setState({ abiertoEnRol: true });
    const n = rutaDeUrl(pathname);
    if (n === 'pos' || n === 'caja') navegar(rol === 'dueno' ? rutas.inicio() : rutas.miDia());
  };
  const hablar = enlaceHablarConKippicore();
  return (
    <>
      <Menu
        etiqueta="Ayuda"
        ancho={300}
        disparador={
          <button
            type="button"
            aria-label="Ayuda"
            title="Ayuda"
            data-testid="menu-ayuda"
            className="inline-flex size-9 items-center justify-center text-ink transition-colors duration-(--dur-instant) hover:bg-surface/70 data-[state=open]:bg-surface"
          >
            <Icono icono={CircleHelp} tamano={18} />
          </button>
        }
      >
        <ItemMenu icono={DoorOpen} onSelect={() => navegar(rutas.entrada())}>
          {MENU_AYUDA.verEntrada}
        </ItemMenu>
        <ItemMenu icono={ListChecks} onSelect={mostrarPrueba}>
          {MENU_AYUDA.mostrarPruebaEsto.replace('{{hechos}}', String(hechos))}
        </ItemMenu>
        <ItemMenu icono={Smartphone} onSelect={abrirAppDueno}>
          {MENU_AYUDA.verApp}
        </ItemMenu>
        <ItemMenu icono={Rocket} onSelect={() => navegar(rutas.comoArrancariamos())}>
          {MENU_AYUDA.comoArrancariamos}
        </ItemMenu>
        <ItemMenu icono={ocultas ? Eye : EyeOff} onSelect={() => ocultarPistas(!ocultas)}>
          {ocultas ? MENU_AYUDA.mostrarPistas : MENU_AYUDA.ocultarPistas}
        </ItemMenu>
        <ItemMenu icono={RotateCcw} onSelect={() => setRestaurando(true)}>
          {MENU_AYUDA.restaurar}
        </ItemMenu>
        {hablar && (
          <>
            <SeparadorMenu />
            <ItemMenu icono={MessageCircle} onSelect={() => window.open(hablar, '_blank', 'noopener')}>
              <span className="font-semibold">{MENU_AYUDA.hablar}</span>
            </ItemMenu>
          </>
        )}
      </Menu>
      <ConfirmarEliminacion
        abierto={restaurando}
        alCambiar={setRestaurando}
        pregunta="¿Restaurar los datos de la demo?"
        consecuencias="Se borran las ventas, traslados y cambios que hiciste en este navegador y la demo vuelve a sus datos de ejemplo de hoy. Tu marca personalizada se conserva."
        nota={null}
        palabraClave="RESTAURAR"
        accion="Restaurar datos"
        alConfirmar={() => {
          void almacenDatos
            .getState()
            .restaurar()
            .then(() => avisar({ tipo: 'exito', texto: 'Datos de la demo restaurados' }));
        }}
      />
    </>
  );
}

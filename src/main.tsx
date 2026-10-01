import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import './styles/global.css';
import { almacenDatos, datosAdoptados, esModoQa } from '@/estado';
import { Proveedores } from '@/app/Proveedores';
import { crearRouter } from '@/app/router';

/**
 * Punto de entrada (PLAN 5.4, 5.6.12, 5.11). El motor arranca EN CUANTO carga la app (también en la entrada `/`),
 * así el cliente lee la portada mientras se generan los 18 meses. Los marcos (`?marco=1`) adoptan el store de la
 * pestaña padre y no construyen. El service worker se registra DESPUÉS de construir el estado.
 */
if (!datosAdoptados) void almacenDatos.getState().iniciar();

function quiereKc(): boolean {
  try {
    return import.meta.env.DEV || esModoQa() || new URLSearchParams(location.search).has('kc');
  } catch {
    return false;
  }
}
/** Estado de la instalación de `window.__kc` (diagnóstico de los e2e: e2e/kc.ts lo muestra si no aparece). */
function marcarKc(estado: string): void {
  (globalThis as unknown as { __kcInstalacion?: string }).__kcInstalacion = estado;
}
if (quiereKc()) {
  marcarKc('importando');
  import('@/estado/kc')
    .then((m) => {
      m.instalarKc();
      marcarKc('instalado');
    })
    .catch((e: unknown) => {
      marcarKc(`error: ${e instanceof Error ? e.message : String(e)}`);
      console.error('No se pudo instalar window.__kc', e);
    });
}

function registrarServiceWorkerAlTerminar(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  const registrar = () => {
    void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
  };
  if (almacenDatos.getState().fase === 'listo') registrar();
  else {
    const quitar = almacenDatos.subscribe((s) => {
      if (s.fase === 'listo') {
        quitar();
        registrar();
      }
    });
  }
}
registrarServiceWorkerAlTerminar();

const router = crearRouter();
const raiz = document.getElementById('root');
if (raiz) {
  createRoot(raiz).render(
    <StrictMode>
      <Proveedores>
        <RouterProvider router={router} />
      </Proveedores>
    </StrictMode>,
  );
}

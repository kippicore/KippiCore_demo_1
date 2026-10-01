import { Smartphone } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { createStore, useStore } from 'zustand';
import { emitirUI } from '@/estado';
import { Button } from '@/ui/primitivos/Button';
import { Dialog } from '@/ui/primitivos/Dialog';
import { Skeleton } from '@/ui/primitivos/Estados';

/**
 * "Ver app del dueño" (PLAN 8.4.3, 2.4 ítem 8, punto de extensión de E1). Modal `lg` con dos columnas: el QR de
 * 160 px hacia `/app` (con las últimas 1–3 acciones en el hash, 5.6.8) y la vista previa de `/app` en el marco de
 * teléfono (que adopta el estado de esta pestaña). Emite `qr_abierto`. Se abre desde la barra superior, el menú "?"
 * y "Prueba esto" con `abrirAppDueno()`. El contenido (QR y marco) se carga diferido.
 * Conserva `data-testid`: `ver-app-dueno`, `modal-app-dueno`, `url-app`.
 */
const almacen = createStore<{ abierto: boolean }>()(() => ({ abierto: false }));

export function abrirAppDueno(): void {
  almacen.setState({ abierto: true });
  emitirUI('qr_abierto');
}

const Contenido = lazy(() => import('./ContenidoModalApp'));

export function ModalAppDueno({ abierto, alCerrar }: { abierto?: boolean; alCerrar?: () => void } = {}) {
  const abiertoGlobal = useStore(almacen, (s) => s.abierto);
  const visible = abierto ?? abiertoGlobal;
  const cerrar = () => {
    almacen.setState({ abierto: false });
    alCerrar?.();
  };
  return (
    <Dialog abierto={visible} alCambiar={(v) => !v && cerrar()} ancho="lg" eyebrow="App del dueño" titulo="Tu negocio en el bolsillo" data-testid="modal-app-dueno">
      <Suspense
        fallback={
          <div className="grid grid-cols-[1fr_auto] gap-8">
            <Skeleton className="size-40" />
            <Skeleton className="h-[460px] w-[230px]" />
          </div>
        }
      >
        <Contenido />
      </Suspense>
    </Dialog>
  );
}

/** Botón "Ver app del dueño" de la barra superior (secundario sm con `Smartphone`). */
export function BotonAppDueno() {
  return (
    <>
      <Button variante="secondary" tamano="sm" icono={Smartphone} data-testid="ver-app-dueno" onClick={abrirAppDueno}>
        <span className="max-wide:hidden">Ver app del dueño</span>
        <span className="wide:hidden">App del dueño</span>
      </Button>
      <ModalAppDueno />
    </>
  );
}

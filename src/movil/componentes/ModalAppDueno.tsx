import { useEffect, useState } from 'react';
import { codificarQr, emitirUI, overrideHoy, urlAppConAcciones, useDatos } from '@/estado';

/**
 * Punto de extensión (PLAN 9.1.6) con implementación mínima: E1 lo reemplaza con el modal del QR de 160 px y la
 * vista previa enmarcada (`<iframe src="/app?marco=1">`). Aquí solo arma el enlace con las últimas acciones.
 */
export function ModalAppDueno({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const ancla = useDatos((s) => s.ancla);
  const registro = useDatos((s) => s.registro);
  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    void codificarQr(ancla, registro).then((d) => {
      if (vigente) setUrl(urlAppConAcciones(window.location.origin, d, overrideHoy()));
    });
    return () => {
      vigente = false;
    };
  }, [abierto, ancla, registro]);
  if (!abierto) return null;
  return (
    <div role="dialog" aria-label="App del dueño" data-testid="modal-app-dueno" style={{ position: 'fixed', inset: 0, background: '#0008', display: 'grid', placeItems: 'center', zIndex: 60 }}>
      <div style={{ background: '#fff', padding: 24, maxWidth: 420 }}>
        <p>Abre la app del dueño en tu celular:</p>
        <p data-testid="url-app" style={{ wordBreak: 'break-all', fontSize: 12 }}>
          {url ?? 'Preparando el enlace…'}
        </p>
        <button type="button" onClick={alCerrar}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

/** Botón "Ver app del dueño" de la barra superior. */
export function BotonAppDueno() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        data-testid="ver-app-dueno"
        onClick={() => {
          setAbierto(true);
          emitirUI('qr_abierto');
        }}
      >
        Ver app del dueño
      </button>
      <ModalAppDueno abierto={abierto} alCerrar={() => setAbierto(false)} />
    </>
  );
}

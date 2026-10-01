import { overrideHoy, urlAppConAcciones } from '@/estado';
import { CodigoQR } from '@/ui/codigos/CodigoQR';

/** QR hacia /app (sin acciones) para el aviso de pantalla pequeña; diferido porque carga `qrcode`. */
export default function QrApp() {
  return (
    <div className="inline-block border border-line bg-surface p-3">
      <CodigoQR valor={urlAppConAcciones(window.location.origin, null, overrideHoy())} tamano={160} etiqueta="Código QR para abrir la app del dueño" />
    </div>
  );
}

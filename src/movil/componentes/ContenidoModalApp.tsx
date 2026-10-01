import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { codificarQr, overrideHoy, urlAppConAcciones, useDatos } from '@/estado';
import { APP } from '@/config/textos/guia';
import { CodigoQR } from '@/ui/codigos/CodigoQR';
import { MarcoTelefono } from '@/ui/marcos/Marcos';
import { Icono } from '@/ui/primitivos/Icono';
import { Skeleton } from '@/ui/primitivos/Estados';

/** Contenido diferido del modal "Ver app del dueño": QR + enlace + vista previa enmarcada (qrcode se carga aquí). */
export default function ContenidoModalApp() {
  const [url, setUrl] = useState<string | null>(null);
  const ancla = useDatos((s) => s.ancla);
  const registro = useDatos((s) => s.registro);
  const [escala] = useState(() => (typeof window !== 'undefined' && window.innerHeight < 860 ? 0.6 : 0.72));
  useEffect(() => {
    let vigente = true;
    void codificarQr(ancla, registro).then((d) => {
      if (vigente) setUrl(urlAppConAcciones(window.location.origin, d, overrideHoy()));
    });
    return () => {
      vigente = false;
    };
  }, [ancla, registro]);
  return (
    <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[1fr_auto]">
      <div className="flex flex-col">
        <p className="t-body-lg text-ink">Escanéalo con la cámara de tu celular.</p>
        <p className="mt-1 max-w-[40ch] t-body text-muted">Cómo va el día y cómo cerraron las cajas de los tres locales, desde donde estés.</p>
        <div className="mt-6 self-start border border-line p-3">{url ? <CodigoQR valor={url} tamano={160} etiqueta="Código QR para abrir la app del dueño" /> : <Skeleton className="size-40" />}</div>
        <p data-testid="url-app" className="mt-3 max-w-[360px] break-all t-small text-muted">
          {url ? url.split('#')[0] : 'Preparando el enlace…'}
        </p>
        <p className="mt-6 flex max-w-[44ch] items-start gap-2 border-t border-line-soft pt-4 t-small text-muted">
          <Icono icono={Info} tamano={14} className="mt-0.5" />
          <span>{APP.explicacionChip}</span>
        </p>
      </div>
      <div className="justify-self-center">
        <MarcoTelefono src="/app?marco=1" escala={escala} titulo="Vista previa de la app del dueño" />
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { codificarQr, overrideHoy, urlAppConAcciones, useDatos } from '@/estado';
import { CodigoQR } from '@/ui/codigos/CodigoQR';
import { Skeleton } from '@/ui/primitivos/Estados';

/** QR de 160 px hacia /app con las últimas acciones (5.6.8); diferido porque carga `qrcode`. */
export default function QrEntrada() {
  const ancla = useDatos((s) => s.ancla);
  const registro = useDatos((s) => s.registro);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vigente = true;
    void codificarQr(ancla, registro).then((d) => vigente && setUrl(urlAppConAcciones(window.location.origin, d, overrideHoy())));
    return () => {
      vigente = false;
    };
  }, [ancla, registro]);
  return url ? <CodigoQR valor={url} tamano={160} etiqueta="Código QR para abrir la app del dueño" /> : <Skeleton className="size-40" />;
}

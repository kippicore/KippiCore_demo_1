import { RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DEMO } from '@/config/demo';
import { useDatos } from '@/estado';
import { avisar, Button, Icono } from '@/ui/ligero';
import { TXT } from '../textos';

/**
 * "Actualizar a la hora actual" (PLAN 5.6.11): no hay "pulso en vivo", así que si el cliente deja la app abierta y
 * vuelve tras más de 30 minutos, se le ofrece reconstruir los datos a la hora de ahora (una reconstrucción: el
 * estado anterior sigue visible mientras tanto). Usa la visibilidad de la pestaña; con `?hoy=` fijo no cambia nada.
 */
export function AvisoActualizar() {
  const reconstruir = useDatos((s) => s.reconstruir);
  const reconstruyendo = useDatos((s) => s.reconstruyendo);
  const [visible, setVisible] = useState(false);
  const oculto = useRef<number | null>(null);

  useEffect(() => {
    const f = () => {
      if (document.visibilityState === 'hidden') oculto.current = performance.now();
      else if (oculto.current !== null) {
        const minutos = (performance.now() - oculto.current) / 60_000;
        oculto.current = null;
        if (minutos >= DEMO.minutosOfrecerActualizar) setVisible(true);
      }
    };
    document.addEventListener('visibilitychange', f);
    return () => document.removeEventListener('visibilitychange', f);
  }, []);

  if (!visible) return null;
  return (
    <article data-testid="app-actualizar" role="status" className="border border-line bg-surface p-4 animate-stack-in">
      <div className="flex items-start gap-3">
        <Icono icono={RefreshCw} tamano={20} className="mt-0.5 shrink-0 text-ink-2" />
        <div className="min-w-0 flex-1">
          <p className="t-label text-ink">{TXT.actualizar.titulo}</p>
          <p className="t-small text-muted">{TXT.actualizar.texto}</p>
        </div>
      </div>
      <Button
        variante="secondary"
        tamano="lg"
        anchoCompleto
        className="mt-3"
        cargando={reconstruyendo}
        onClick={() => {
          void reconstruir().then(() => {
            setVisible(false);
            avisar({ tipo: 'exito', texto: TXT.actualizar.listo });
          });
        }}
      >
        {TXT.actualizar.boton}
      </Button>
    </article>
  );
}

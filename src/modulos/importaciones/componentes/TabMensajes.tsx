import { BellRing } from 'lucide-react';
import type { Importacion } from '@/dominio/tipos';
import { ETIQUETAS_ESTADO_IMPORTACION } from '@/config/aduanas';
import { usePuede, useSel } from '@/estado';
import { Button } from '@/ui';
import { selMensajesImportacion } from '../selectores';
import { BandejaSalida } from './BandejaSalida';

/** Bandeja de salida del pedido: todos los avisos redactados, con su canal y su estado simulado. */
export function TabMensajes({ imp, alRedactar }: { imp: Importacion; alRedactar: () => void }) {
  const mensajes = useSel(selMensajesImportacion, { importacionId: imp.id });
  const puede = usePuede();
  return (
    <div className="space-y-4" data-testid="tab-mensajes">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-[64ch] t-body text-muted">
          Cada vez que cambia el estado, KippiCore redacta el aviso para quien le toca actuar. Aquí quedan
          todos, como “Enviado (simulación)”.
        </p>
        {puede('mensaje.registrar') && imp.estado !== 'recibido_bodega' && (
          <Button variante="secondary" icono={BellRing} onClick={alRedactar} data-testid="redactar-aviso">
            Avisos de “{ETIQUETAS_ESTADO_IMPORTACION[imp.estado]}”
          </Button>
        )}
      </div>
      <BandejaSalida mensajes={mensajes} />
    </div>
  );
}

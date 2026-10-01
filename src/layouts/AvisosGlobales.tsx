import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useEntradaRemota } from '@/estado';
import { avisar, Toaster } from '@/ui/primitivos/Toast';

/**
 * Avisos globales de todos los layouts (PLAN 8.7.16, 5.6.8): el escuchador del toast de una entrada remota (lo que
 * llega de otra pestaña o del portal, W3) y el aviso de una guarda de rol (estado de la navegación). Ambos van al
 * `<Toaster>` del sistema de diseño (contenedor `data-testid="avisos"`).
 */
export function AvisosGlobales({ inferior }: { inferior?: string }) {
  const location = useLocation();
  useEntradaRemota((r) => avisar({ tipo: 'info', texto: r.texto }));
  const aviso = (location.state as { aviso?: string } | null)?.aviso;
  useEffect(() => {
    if (!aviso) return;
    // Diferido: el aviso llega con la navegación (estado de la ruta), no del render.
    const t = setTimeout(() => avisar({ tipo: 'alerta', texto: aviso }), 0);
    return () => clearTimeout(t);
  }, [aviso, location.key]);
  return <Toaster inferior={inferior} />;
}
